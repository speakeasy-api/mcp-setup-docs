package factorytranscript

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const fatalFixture = `{"schema_version":2,"event_id":"e-1-2-3","occurred_at_ms":1,"kit_version":"0.2.2","session_id":"s-test","surface":"prompt","kind":"provider","code":"retry_exhausted","message":"RAW_CANARY","diagnostics":{"response_request_id":"RAW_CANARY"},"span_context":{"secret":"RAW_CANARY"}}`

func TestNativeFatalFailClosed(t *testing.T) {
	for _, mode := range []string{"valid", "missing", "ambiguous", "malformed", "symlink", "oversize", "surface", "code", "duplicate", "version", "directory-link"} {
		t.Run(mode, func(t *testing.T) {
			private := t.TempDir()
			dir := private + "/home/.kit/errors/s-test"
			if err := os.MkdirAll(dir, 0700); err != nil {
				t.Fatal(err)
			}
			data := fatalFixture
			switch mode {
			case "malformed":
				data = "{"
			case "surface":
				data = strings.Replace(data, `"prompt"`, `"acp"`, 1)
			case "code":
				data = strings.Replace(data, `"retry_exhausted"`, `"RAW_CANARY"`, 1)
			case "duplicate":
				data = strings.Replace(data, `"schema_version":2`, `"schema_version":2,"schema_version":2`, 1)
			case "version":
				data = strings.Replace(data, `"schema_version":2`, `"schema_version":3`, 1)
			case "oversize":
				data = strings.Repeat("x", (1<<20)+1)
			}
			path := dir + "/e-1-2-3.json"
			if mode != "missing" {
				if err := os.WriteFile(path, []byte(data), 0600); err != nil {
					t.Fatal(err)
				}
			}
			if mode == "ambiguous" {
				os.WriteFile(dir+"/second.json", []byte(data), 0600)
			}
			if mode == "symlink" {
				os.Remove(path)
				os.Symlink("/etc/passwd", path)
			}
			if mode == "directory-link" {
				os.Rename(dir, dir+"-real")
				os.Symlink(dir+"-real", dir)
			}
			root, err := os.OpenRoot(private)
			if err != nil {
				t.Fatal(err)
			}
			defer root.Close()
			got := collectNativeFatal(root)
			if mode == "valid" {
				if got.Status != "classified" || got.Code != "retry_exhausted" || got.Evidence != "native_reported" {
					t.Fatalf("%+v", got)
				}
			} else if got.Status != "unavailable" {
				t.Fatalf("accepted %s", mode)
			}
			encoded, _ := json.Marshal(got)
			if strings.Contains(string(encoded), "RAW_CANARY") || strings.Contains(string(encoded), "s-test") {
				t.Fatal("leak")
			}
		})
	}
}

func TestNativeFatalBeforeFailedExport(t *testing.T) {
	home, _, out := exportFixture(t)
	private := filepath.Dir(home)
	os.Chmod(private, 0700)
	os.Mkdir(private+"/host", 0700)
	dir := home + "/.kit/errors/s-test"
	os.MkdirAll(dir, 0700)
	os.WriteFile(dir+"/e-1-2-3.json", []byte(fatalFixture), 0600)
	// Invalid source forces the main export to fail after fatal evidence capture.
	os.WriteFile(home+"/.kit/sessions/w-test/child.jsonl", []byte("invalid\n"), 0600)
	result := private + "/host/result.json"
	os.WriteFile(result, []byte(`{"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","termination":"provider_exit","exit_code":1,"container_removed":true}`), 0600)
	if Finalize(private, result, filepath.Dir(out), nil) == nil {
		t.Fatal("export must fail")
	}
	host, err := os.OpenRoot(private + "/host")
	if err != nil {
		t.Fatal(err)
	}
	defer host.Close()
	got := ReadFatalDiagnostic(host, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	if got.Status != "classified" || got.Code != "retry_exhausted" {
		t.Fatalf("lost evidence: %+v", got)
	}
	if _, err := os.Stat(home); !os.IsNotExist(err) {
		t.Fatal("home not cleaned")
	}
	if ReadFatalDiagnostic(host, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb").Status != "unavailable" {
		t.Fatal("identity")
	}
}
