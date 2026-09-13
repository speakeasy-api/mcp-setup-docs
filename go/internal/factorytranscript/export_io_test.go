package factorytranscript

import (
	"bytes"
	"errors"
	"github.com/praetorian-inc/titus/pkg/types"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
)

func exportFixture(t *testing.T) (string, string, string) {
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
				os.WriteFile(file, []byte(strings.Repeat("x", (1<<20)+1)), 0600)
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
	if err := exportWithSanitizer(home, work, out, nil, factory); err == nil {
		t.Fatal("source replacement accepted")
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
			if err := exportWithSanitizer(home, work, out, nil, factory); err == nil {
				t.Fatal("scanner failure accepted")
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
