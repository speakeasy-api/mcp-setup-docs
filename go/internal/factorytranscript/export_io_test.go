package factorytranscript

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/praetorian-inc/titus/pkg/types"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
)

func exportFixture(t *testing.T) (string, string, string) {
	t.Setenv("FACTORY_HOST_RUN_ID", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	t.Setenv("GITHUB_RUN_ID", "")
	t.Setenv("GITHUB_RUN_ATTEMPT", "")
	t.Helper()
	base, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	home, work, out := base+"/home", base+"/workspace", base+"/export/transcript.json"
	for _, p := range []string{home + "/.kit/sessions/w-test", work, filepath.Dir(out)} {
		if err := os.MkdirAll(p, 0700); err != nil {
			t.Fatal(err)
		}
	}
	b, err := os.ReadFile("../../../factory/tests/fixtures/kit-v0.1.134/session.jsonl")
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(home+"/.kit/sessions/w-test/child.jsonl", b, 0600); err != nil {
		t.Fatal(err)
	}
	return home, work, out
}
func TestExport(t *testing.T) {
	home, work, out := exportFixture(t)
	secret := "synthetic-key-never-real"
	data := fixtureRecord(`{"Text":{"text":"public finding synthetic-key-never-real"}}`)
	os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", data, 0600)
	if err := Export(home, work, out, []string{secret}); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(b, []byte(secret)) || !bytes.Contains(b, []byte("public finding")) || !bytes.Contains(b, []byte("guide_factory_readable_transcript")) {
		t.Fatal("unsafe or unreadable export")
	}
	if err := Export(home, work, out, nil); err == nil {
		t.Fatal("existing output accepted")
	}
}
func TestExportUnsafePaths(t *testing.T) {
	for _, kind := range []string{"symlink", "hardlink", "oversize", "output-alias", "directory", "root-link", "huge-directory", "fifo"} {
		t.Run(kind, func(t *testing.T) {
			home, work, out := exportFixture(t)
			file := home + "/.kit/sessions/w-test/child.jsonl"
			switch kind {
			case "fifo":
				os.Remove(file)
				if err := syscall.Mkfifo(file, 0600); err != nil {
					t.Fatal(err)
				}
			case "symlink":
				os.Remove(file)
				os.Symlink("/etc/passwd", file)
			case "hardlink":
				os.Link(file, work+"/alias")
			case "oversize":
				os.WriteFile(file, []byte(strings.Repeat("x", (16<<20)+1)), 0600)
			case "output-alias":
				os.Link(file, out)
			case "directory":
				os.Remove(file)
				os.Mkdir(file, 0700)
			case "root-link":
				os.Symlink(home, work+"/link")
				home = work + "/link"
			case "huge-directory":
				for i := 0; i < 4097; i++ {
					f, err := os.CreateTemp(home+"/.kit/sessions/w-test", "ignored-")
					if err != nil {
						t.Fatal(err)
					}
					f.Close()
				}
			}
			if err := Export(home, work, out, nil); err == nil {
				t.Fatal("unsafe source accepted")
			}
			if kind != "output-alias" {
				if _, err := os.Lstat(out); !os.IsNotExist(err) {
					t.Fatal("failure emitted output")
				}
			}
		})
	}
}

func TestExportCrossFieldAndNestedSecrets(t *testing.T) {
	home, work, out := exportFixture(t)
	secret := "ghp_" + "aB3dE6gH9jK2mN5pQ8sT1vW4yZ7cD0fG3hJ6"
	source := fixtureRecord(`{"Text":{"text":"` + secret + `"}}`)
	os.WriteFile(home+"/.kit/sessions/w-test/a.jsonl", source, 0600)
	os.MkdirAll(work+"/.factory/research", 0700)
	os.WriteFile(work+"/.factory/research/dossier.md", []byte(`{"outer":"{\"text\":\"ghp_`+strings.TrimPrefix(secret, "ghp_")+`\"}"}`), 0600)
	if err := Export(home, work, out, nil); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(b, []byte(secret)) || !bytes.Contains(b, []byte("[REDACTED]")) {
		t.Fatal("secret survived nested/cross-field scan")
	}
}

func TestExportMutationWithholds(t *testing.T) {
	home, work, out := exportFixture(t)
	factory := func(known []string) (*Sanitizer, error) {
		file := home + "/.kit/sessions/w-test/child.jsonl"
		if err := os.Rename(file, file+".old"); err != nil {
			t.Fatal(err)
		}
		os.WriteFile(file, fixtureRecord(`{"Text":{"text":"replaced"}}`), 0600)
		return NewSanitizer(known)
	}
	if err := exportWithSanitizer(home, work, out, nil, factory); WorkerExitCode(err) != 53 {
		t.Fatal("source replacement classification")
	}
	if _, err := os.Lstat(out); !os.IsNotExist(err) {
		t.Fatal("output after replacement")
	}
}

type closeFailureScanner struct {
	inner interface {
		Match([]byte) ([]*types.Match, error)
		Close() error
	}
	warning func()
}

func (s closeFailureScanner) Match(b []byte) ([]*types.Match, error) { return s.inner.Match(b) }
func (s closeFailureScanner) Close() error {
	_ = s.inner.Close()
	if s.warning != nil {
		s.warning()
		return nil
	}
	return errors.New("synthetic secret-bearing failure")
}
func TestExportScannerFailures(t *testing.T) {
	for _, kind := range []string{"close", "close-warning", "scan-warning"} {
		t.Run(kind, func(t *testing.T) {
			home, work, out := exportFixture(t)
			factory := func(known []string) (*Sanitizer, error) {
				s, err := NewSanitizer(known)
				if err != nil {
					return nil, err
				}
				switch kind {
				case "close":
					s.scanner = closeFailureScanner{inner: s.scanner}
				case "close-warning":
					s.scanner = closeFailureScanner{inner: s.scanner, warning: func() { s.warned.Store(true) }}
				case "scan-warning":
					s.warned.Store(true)
				}
				return s, nil
			}
			want := 52
			if kind == "scan-warning" {
				want = 50
			}
			if err := exportWithSanitizer(home, work, out, nil, factory); WorkerExitCode(err) != want {
				t.Fatal("scanner failure classification")
			}
			if _, err := os.Lstat(out); !os.IsNotExist(err) {
				t.Fatal("scanner failure emitted output")
			}
		})
	}
}

func TestExportFinalSizeLimit(t *testing.T) {
	home, work, out := exportFixture(t)
	os.MkdirAll(work+"/.factory/research", 0700)
	text := bytes.Repeat([]byte("Public finding. "), 60000)
	for _, name := range []string{"topic-1-0.report.md", "topic-2-0.report.md", "topic-3-0.report.md"} {
		if err := os.WriteFile(work+"/.factory/research/"+name, text, 0600); err != nil {
			t.Fatal(err)
		}
	}
	if err := Export(home, work, out, nil); err == nil {
		t.Fatal("oversized final artifact accepted")
	}
	if _, err := os.Lstat(out); !os.IsNotExist(err) {
		t.Fatal("oversized output exists")
	}
}

func TestExportWholeSessionSourceCap(t *testing.T) {
	for _, size := range []int{1522551, 2 << 20, 16 << 20} {
		t.Run(fmt.Sprint(size), func(t *testing.T) {
			home, work, out := exportFixture(t)
			source := sizedNativeSession(size)
			if len(source) != size {
				t.Fatal("incorrect source size")
			}
			if err := os.WriteFile(home+"/.kit/sessions/w-test/child.jsonl", source, 0600); err != nil {
				t.Fatal(err)
			}
			// Export constructs the real Titus sanitizer; no scanner stub.
			if err := Export(home, work, out, []string{"synthetic-key-never-real"}); err != nil {
				t.Fatal(err)
			}
			artifact, err := os.ReadFile(out)
			if err != nil {
				t.Fatal(err)
			}
			if !json.Valid(artifact) || len(artifact) >= 2<<20 || !bytes.Contains(artifact, []byte("public finding")) || bytes.Contains(artifact, []byte("synthetic-key-never-real")) {
				t.Fatal("unsafe or oversized assembled export")
			}
		})
	}
}

func TestExportDecodedFieldCapUnchanged(t *testing.T) {
	home, work, out := exportFixture(t)
	text := strings.Repeat("x", (1<<20)+1)
	source := fixtureRecord(`{"Text":{"text":"` + text + `"}}`)
	if len(source) >= 2<<20 {
		t.Fatal("fixture exceeds whole-source limit")
	}
	if err := os.WriteFile(home+"/.kit/sessions/w-test/child.jsonl", source, 0600); err != nil {
		t.Fatal(err)
	}
	if err := Export(home, work, out, nil); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(out)
	if err != nil || !json.Valid(b) || !bytes.Contains(b, []byte(omittedText)) || bytes.Contains(b, []byte(strings.Repeat("x", 100))) {
		t.Fatal("oversized field not omitted", err)
	}
	if got, err := projectToolText(text, 0); err != nil || len(got) != 1 || got[0] != omittedText {
		t.Fatal("oversized tool text was not omitted")
	}
}

// A synthetic scanner distinguishes assembled-document scanning from fields.
// The changed case returns one match, then a clean rescan: Sanitize succeeds
// with changed bytes, which Export must still reject.
type exportDiagnosticScanner struct {
	mode    string
	changed bool
}

func (s *exportDiagnosticScanner) Match(b []byte) ([]*types.Match, error) {
	final := bytes.Contains(b, []byte(`"kind": "guide_factory_readable_transcript"`))
	if s.mode == "field" || (s.mode == "final-error" && final) {
		return nil, errors.New("synthetic private scanner failure")
	}
	if s.mode == "final-changed" && final && !s.changed {
		s.changed = true
		at := bytes.Index(b, []byte("guide_factory_readable_transcript"))
		return []*types.Match{{Location: types.Location{Offset: types.OffsetSpan{Start: int64(at), End: int64(at + len("guide_factory_readable_transcript"))}}}}, nil
	}
	return nil, nil
}

func (s *exportDiagnosticScanner) Close() error {
	if s.mode == "close" {
		return errors.New("synthetic private close failure")
	}
	return nil
}

func TestExportDiagnosticStages(t *testing.T) {
	for _, tc := range []struct {
		mode string
		code int
	}{
		{"init", 49}, {"field", 50}, {"final-error", 51}, {"final-changed", 51}, {"close", 52}, {"limit", 48},
	} {
		t.Run(tc.mode, func(t *testing.T) {
			home, work, out := exportFixture(t)
			scanner := &exportDiagnosticScanner{mode: tc.mode}
			factory := func([]string) (*Sanitizer, error) {
				if tc.mode == "init" {
					return nil, errors.New("synthetic private init failure")
				}
				if tc.mode == "limit" {
					return nil, limitError("assembled_bytes", 3, 2)
				}
				return &Sanitizer{scanner: scanner, values: map[string]struct{}{}}, nil
			}
			err := exportWithSanitizer(home, work, out, nil, factory)
			if WorkerExitCode(err) != tc.code || err.Error() != WorkerHostReason(tc.code) {
				t.Fatalf("classification: got %d, want %d", WorkerExitCode(err), tc.code)
			}
			if tc.mode == "final-changed" && !scanner.changed {
				t.Fatal("changed-byte branch not exercised")
			}
			if _, err := os.Lstat(out); !os.IsNotExist(err) {
				t.Fatal("failure emitted output")
			}
		})
	}
}

func TestExportDiagnosticChangedScanSucceeds(t *testing.T) {
	s := &Sanitizer{scanner: &exportDiagnosticScanner{mode: "final-changed"}, values: map[string]struct{}{}}
	defer s.Close()
	data := []byte(`{"kind": "guide_factory_readable_transcript"}`)
	clean, err := s.Sanitize(data)
	if err != nil || bytes.Equal(clean, data) || !json.Valid(clean) {
		t.Fatal("synthetic changed-byte scan must succeed with changed valid JSON")
	}
}
