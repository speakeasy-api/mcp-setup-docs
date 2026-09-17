package factorycontroller

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
)

func evidenceFixture(t *testing.T) (*Evidence, string) {
	t.Helper()
	dir, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err = os.Mkdir(filepath.Join(dir, ".factory"), 0700); err != nil {
		t.Fatal(err)
	}
	e, err := OpenEvidence(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { e.Close() })
	return e, filepath.Join(dir, ".factory", "research")
}
func TestEvidenceRoundTrip(t *testing.T) {
	e, dir := evidenceFixture(t)
	for i := 0; i < 3; i++ {
		if err := e.SavePrompt(1, i, []byte("{ raw }\n"), []byte("\x00prompt\r\n")); err != nil {
			t.Fatal(err)
		}
		if err := e.SaveTurn(1, i, TurnResult{SessionID: "abc_12-x", Answer: "\x00answer\r\n"}); err != nil {
			t.Fatal(err)
		}
		if id, err := e.Session(1, i); err != nil || id != "abc_12-x" {
			t.Fatalf("%q %v", id, err)
		}
	}
	for suffix, want := range map[string]string{"input.json": "{ raw }\n", "prompt.md": "\x00prompt\r\n", "report.md": "\x00answer\r\n", "session.json": `{"version":1,"topic":1,"index":0,"session_id":"abc_12-x"}`} {
		p := filepath.Join(dir, "topic-1-0."+suffix)
		b, err := os.ReadFile(p)
		if err != nil || string(b) != want {
			t.Fatalf("%s: %q %v", suffix, b, err)
		}
		st, _ := os.Stat(p)
		if st.Mode().Perm() != 0600 {
			t.Fatal(st.Mode())
		}
	}
	if e.SavePrompt(1, 0, nil, nil) == nil {
		t.Fatal("overwrite")
	}
	if e.SaveTurn(1, 0, TurnResult{SessionID: "abc_12-x"}) == nil {
		t.Fatal("replay")
	}
}
func TestEvidenceRejectsInvalidContinuation(t *testing.T) {
	e, _ := evidenceFixture(t)
	for _, p := range [][2]int{{0, 0}, {6, 0}, {1, -1}, {1, 3}, {1, 1}, {2, 2}} {
		if e.SavePrompt(p[0], p[1], nil, nil) == nil {
			t.Fatal(p)
		}
	}
	if e.SavePrompt(1, 0, make([]byte, (1<<20)+1), nil) == nil {
		t.Fatal("cap")
	}
	if err := e.SavePrompt(1, 0, nil, nil); err != nil {
		t.Fatal(err)
	}
	if e.SaveTurn(1, 0, TurnResult{SessionID: "bad id"}) == nil {
		t.Fatal("identity")
	}
	if e.SaveTurn(1, 0, TurnResult{SessionID: "abc", Answer: strings.Repeat("x", (1<<20)+1)}) == nil {
		t.Fatal("cap")
	}
	if err := e.SaveTurn(1, 0, TurnResult{SessionID: "abc", Answer: "report"}); err != nil {
		t.Fatal(err)
	}
	if err := e.SavePrompt(1, 1, nil, nil); err != nil {
		t.Fatal(err)
	}
	if e.SaveTurn(1, 1, TurnResult{SessionID: "other"}) == nil {
		t.Fatal("mismatch")
	}
}
func TestEvidenceUnsafeRecords(t *testing.T) {
	for _, kind := range []string{"symlink", "hardlink", "directory", "permissions", "oversize", "duplicate", "extra", "topic", "index", "version", "session", "missing-report"} {
		t.Run(kind, func(t *testing.T) {
			e, dir := evidenceFixture(t)
			if err := e.SavePrompt(1, 0, nil, nil); err != nil {
				t.Fatal(err)
			}
			if err := e.SaveTurn(1, 0, TurnResult{SessionID: "abc", Answer: "report"}); err != nil {
				t.Fatal(err)
			}
			p := filepath.Join(dir, "topic-1-0.session.json")
			switch kind {
			case "symlink":
				os.Rename(p, p+".old")
				os.Symlink(p+".old", p)
			case "hardlink":
				os.Link(p, p+".link")
			case "directory":
				os.Remove(p)
				os.Mkdir(p, 0700)
			case "permissions":
				os.Chmod(p, 0644)
			case "oversize":
				os.WriteFile(p, make([]byte, (1<<20)+1), 0600)
			case "missing-report":
				os.Remove(filepath.Join(dir, "topic-1-0.report.md"))
			default:
				s := `{"version":1,"topic":1,"index":0,"session_id":"abc"}`
				switch kind {
				case "duplicate":
					s = strings.Replace(s, `"version":1`, `"version":1,"version":1`, 1)
				case "extra":
					s = strings.Replace(s, `"version":1`, `"version":1,"extra":0`, 1)
				case "topic":
					s = strings.Replace(s, `"topic":1`, `"topic":2`, 1)
				case "index":
					s = strings.Replace(s, `"index":0`, `"index":1`, 1)
				case "version":
					s = strings.Replace(s, `"version":1`, `"version":2`, 1)
				case "session":
					s = strings.Replace(s, `"abc"`, `"bad id"`, 1)
				}
				os.WriteFile(p, []byte(s), 0600)
			}
			if _, err := e.Session(1, 0); err == nil {
				t.Fatal("accepted unsafe record")
			}
		})
	}
}
func TestEvidenceDirectories(t *testing.T) {
	for _, kind := range []string{"missing", "permissions", "symlink", "research-link"} {
		t.Run(kind, func(t *testing.T) {
			dir, _ := filepath.EvalSymlinks(t.TempDir())
			p := filepath.Join(dir, ".factory")
			switch kind {
			case "permissions":
				os.Mkdir(p, 0755)
			case "symlink":
				os.Mkdir(p+"real", 0700)
				os.Symlink(p+"real", p)
			case "research-link":
				os.Mkdir(p, 0700)
				os.Mkdir(filepath.Join(dir, "other"), 0700)
				os.Symlink(filepath.Join(dir, "other"), filepath.Join(p, "research"))
			}
			if e, err := OpenEvidence(dir); err == nil {
				e.Close()
				t.Fatal("accepted unsafe directory")
			}
		})
	}
}

func TestEvidenceFailedIdentityRetainsReport(t *testing.T) {
	e, dir := evidenceFixture(t)
	if err := e.SavePrompt(5, 0, nil, nil); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "topic-5-0.session.json")
	if err := os.Mkdir(path, 0700); err != nil {
		t.Fatal(err)
	}
	if e.SaveTurn(5, 0, TurnResult{SessionID: "abc", Answer: "first\r\n"}) == nil {
		t.Fatal("accepted existing identity")
	}
	got, err := os.ReadFile(filepath.Join(dir, "topic-5-0.report.md"))
	if err != nil || string(got) != "first\r\n" {
		t.Fatalf("report lost: %q %v", got, err)
	}
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	if e.SaveTurn(5, 0, TurnResult{SessionID: "abc", Answer: "replacement"}) == nil {
		t.Fatal("replayed failed persistence")
	}
	if e.SavePrompt(5, 1, nil, nil) == nil {
		t.Fatal("continued incomplete turn")
	}
}
func TestEvidenceExclusiveWritesAndCap(t *testing.T) {
	for _, kind := range []string{"file", "directory", "symlink", "hardlink", "fifo"} {
		t.Run(kind, func(t *testing.T) {
			e, dir := evidenceFixture(t)
			p := filepath.Join(dir, "topic-1-0.input.json")
			target := filepath.Join(dir, "target")
			if err := os.WriteFile(target, []byte("unchanged"), 0600); err != nil {
				t.Fatal(err)
			}
			var err error
			switch kind {
			case "file":
				err = os.WriteFile(p, []byte("existing"), 0600)
			case "directory":
				err = os.Mkdir(p, 0700)
			case "symlink":
				err = os.Symlink(target, p)
			case "hardlink":
				err = os.Link(target, p)
			case "fifo":
				err = syscall.Mkfifo(p, 0600)
			}
			if err != nil {
				t.Fatal(err)
			}
			if e.SavePrompt(1, 0, nil, nil) == nil {
				t.Fatal("overwrote existing entry")
			}
			got, err := os.ReadFile(target)
			if err != nil || string(got) != "unchanged" {
				t.Fatal("target changed")
			}
		})
	}
	e, dir := evidenceFixture(t)
	if err := e.SavePrompt(1, 0, make([]byte, 1<<20), make([]byte, 1<<20)); err != nil {
		t.Fatal(err)
	}
	if err := e.SaveTurn(1, 0, TurnResult{SessionID: "a", Answer: strings.Repeat("x", 1<<20)}); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Session(1, 0); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(dir, 0755); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Session(1, 0); err == nil {
		t.Fatal("accepted changed permissions")
	}
}

func TestEvidenceRejectsBlankAnswer(t *testing.T) {
	for _, answer := range []string{"", " \t\r\n", "\u00a0\u2003"} {
		t.Run(fmt.Sprintf("%q", answer), func(t *testing.T) {
			e, dir := evidenceFixture(t)
			if err := e.SavePrompt(1, 0, []byte("assignment\n"), []byte("prompt\r\n")); err != nil {
				t.Fatal(err)
			}
			if err := e.SaveTurn(1, 0, TurnResult{SessionID: "abc", Answer: answer}); err == nil {
				t.Fatal("accepted blank answer")
			}
			for _, suffix := range []string{"report.md", "session.json"} {
				if _, err := os.Lstat(filepath.Join(dir, "topic-1-0."+suffix)); !os.IsNotExist(err) {
					t.Fatalf("%s exists or stat failed: %v", suffix, err)
				}
			}
			if id, err := e.Session(1, 0); err == nil || id != "" {
				t.Fatalf("failed turn resumable: %q %v", id, err)
			}
			if e.SavePrompt(1, 1, nil, nil) == nil {
				t.Fatal("continued failed turn")
			}
			if e.SavePrompt(1, 0, []byte("replacement"), []byte("replacement")) == nil {
				t.Fatal("replayed prompt")
			}
			for suffix, want := range map[string]string{"input.json": "assignment\n", "prompt.md": "prompt\r\n"} {
				got, err := os.ReadFile(filepath.Join(dir, "topic-1-0."+suffix))
				if err != nil || string(got) != want {
					t.Fatalf("changed %s: %q %v", suffix, got, err)
				}
			}
		})
	}
}
