package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/speakeasy-api/mcp-setup-docs/go/internal/guidecheck"
)

func TestRunRequiresGuidePathAndRejectsUnknownOptions(t *testing.T) {
	for _, args := range [][]string{nil, {"--wat"}} {
		var stdout, stderr bytes.Buffer
		if code := run(args, repoRootForTest(t), &stdout, &stderr); code != 1 {
			t.Fatalf("run(%v) exit = %d, want 1", args, code)
		}
		if !strings.Contains(stderr.String(), "usage:") {
			t.Fatalf("stderr = %q, want usage", stderr.String())
		}
	}
}

func TestRunCleanExit(t *testing.T) {
	var stdout, stderr bytes.Buffer
	root := repoRootForTest(t)
	if code := run([]string{filepath.Join(root, "guides", "box")}, root, &stdout, &stderr); code != 0 {
		t.Fatalf("run exit = %d, want 0; stdout=%q stderr=%q", code, stdout.String(), stderr.String())
	}
}

func TestRunMetaOnlyValidatesPartialGuide(t *testing.T) {
	root := repoRootForTest(t)
	dir := t.TempDir()
	raw, err := os.ReadFile(filepath.Join(root, "guides", "github", "meta.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "meta.yaml"), raw, 0o644); err != nil {
		t.Fatal(err)
	}
	var stdout, stderr bytes.Buffer
	if code := run([]string{"--meta-only", dir}, root, &stdout, &stderr); code != 0 {
		t.Fatalf("valid partial metadata exit = %d, want 0; stdout=%q stderr=%q", code, stdout.String(), stderr.String())
	}
	if err := os.WriteFile(filepath.Join(dir, "meta.yaml"), []byte("schema_version: [\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	stdout.Reset()
	stderr.Reset()
	if code := run([]string{"--meta-only", dir}, root, &stdout, &stderr); code != 2 {
		t.Fatalf("invalid partial metadata exit = %d, want 2; stdout=%q stderr=%q", code, stdout.String(), stderr.String())
	}
}

func TestRunMultipleGuidesDeterministicIndependentOfArgumentOrder(t *testing.T) {
	root := repoRootForTest(t)
	base := t.TempDir()
	a := filepath.Join(base, "a-guide")
	z := filepath.Join(base, "z-guide")
	if err := os.MkdirAll(a, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(z, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(z, "setup.md"), []byte("# Legacy\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	invoke := func(args []string) (int, string, string) {
		var stdout, stderr bytes.Buffer
		code := run(args, root, &stdout, &stderr)
		return code, stdout.String(), stderr.String()
	}
	code1, out1, err1 := invoke([]string{z, a})
	code2, out2, err2 := invoke([]string{a, z})
	if code1 != 2 || code2 != 2 {
		t.Fatalf("exit codes = %d, %d; want 2", code1, code2)
	}
	if out1 != out2 || err1 != err2 {
		t.Fatalf("argument order changed output:\nfirst: %q / %q\nsecond: %q / %q", out1, err1, out2, err2)
	}
}

func TestRunJSONEmitsOneArrayAndAggregatesBlockers(t *testing.T) {
	root := repoRootForTest(t)
	clean := filepath.Join(root, "guides", "box")
	missing := filepath.Join(t.TempDir(), "missing")
	var stdout, stderr bytes.Buffer
	if code := run([]string{clean, "--json", missing}, root, &stdout, &stderr); code != 2 {
		t.Fatalf("run exit = %d, want 2; stderr: %s", code, stderr.String())
	}
	var findings []guidecheck.Finding
	if err := json.Unmarshal(stdout.Bytes(), &findings); err != nil {
		t.Fatalf("JSON output %q: %v", stdout.String(), err)
	}
	if len(findings) != 2 {
		t.Fatalf("len(findings) = %d, want 2", len(findings))
	}
}

func TestRunCheckIOFailureReturnsOne(t *testing.T) {
	root := repoRootForTest(t)
	guideFile := filepath.Join(t.TempDir(), "not-a-directory")
	if err := os.WriteFile(guideFile, []byte("file"), 0o644); err != nil {
		t.Fatal(err)
	}
	var stdout, stderr bytes.Buffer
	if code := run([]string{guideFile}, root, &stdout, &stderr); code != 1 {
		t.Fatalf("run exit = %d, want 1; stdout=%q stderr=%q", code, stdout.String(), stderr.String())
	}
}

func TestRunHumanWriterFailureReturnsOne(t *testing.T) {
	root := repoRootForTest(t)
	missing := filepath.Join(t.TempDir(), "missing")
	var stderr bytes.Buffer
	if code := run([]string{missing}, root, failWriter{}, &stderr); code != 1 {
		t.Fatalf("run exit = %d, want 1; stderr=%q", code, stderr.String())
	}
}

func TestRunJSONWriterFailureReturnsOne(t *testing.T) {
	root := repoRootForTest(t)
	var stderr bytes.Buffer
	if code := run([]string{"--json", filepath.Join(root, "guides", "box")}, root, failWriter{}, &stderr); code != 1 {
		t.Fatalf("run exit = %d, want 1; stderr=%q", code, stderr.String())
	}
}

type failWriter struct{}

func (failWriter) Write([]byte) (int, error) { return 0, errors.New("write failed") }

func repoRootForTest(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	return root
}
