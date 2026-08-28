package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/speakeasy-api/mcp-setup-docs/tools/lint-guide/internal/guidecheck"
)

type cliResult struct {
	code   int
	stdout string
	stderr string
}

type jsonGuideResult struct {
	Guide    string               `json:"guide"`
	Findings []guidecheck.Finding `json:"findings"`
}

func TestUsageAndHelp(t *testing.T) {
	repo, cwd := newTempRepo(t)
	for _, tc := range []struct {
		name string
		args []string
	}{
		{name: "no arguments"},
		{name: "long help", args: []string{"--help"}},
		{name: "short help", args: []string{"-h"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := runCLI(tc.args, cwd, repo)
			if got.code != 2 {
				t.Fatalf("exit = %d, want 2", got.code)
			}
			if got.stdout != "" {
				t.Fatalf("stdout = %q, want empty", got.stdout)
			}
			if got.stderr != "Usage: mise run lint-guide -- [--json] [--meta-only] <slug|guides/<slug>|path>…\n" {
				t.Fatalf("stderr = %q", got.stderr)
			}
		})
	}
}

func TestMetaOnlyValidatesMetadataWithoutPublishedMarkdown(t *testing.T) {
	repo, cwd := newTempRepo(t)
	guideDir := filepath.Join(repo, "guides", "sample")
	if err := os.Remove(filepath.Join(guideDir, "external.md")); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(filepath.Join(guideDir, "speakeasy.md")); err != nil {
		t.Fatal(err)
	}

	got := runCLI([]string{"--meta-only", "sample"}, cwd, repo)
	if got.code != 0 || got.stdout != "sample: ok\n" || got.stderr != "" {
		t.Fatalf("exit = %d, stdout = %q, stderr = %q", got.code, got.stdout, got.stderr)
	}
}

func TestTargetResolutionPriorityAndOrder(t *testing.T) {
	repo, cwd := newTempRepo(t)
	copyDir(t, filepath.Join(repo, "guides", "sample"), filepath.Join(repo, "guides", "second"))
	copyDir(t, filepath.Join(repo, "guides", "sample"), filepath.Join(cwd, "sample"))

	got := runCLI([]string{"--json", "second", "guides/sample", "sample"}, cwd, repo)
	if got.code != 0 || got.stderr != "" {
		t.Fatalf("exit = %d, stderr = %q", got.code, got.stderr)
	}
	results := decodeResults(t, got.stdout)
	want := []string{
		filepath.Join(repo, "guides", "second"),
		filepath.Join(repo, "guides", "sample"),
		filepath.Join(cwd, "sample"),
	}
	if len(results) != len(want) {
		t.Fatalf("got %d results, want %d", len(results), len(want))
	}
	for i := range want {
		if results[i].Guide != want[i] {
			t.Errorf("result %d guide = %q, want %q", i, results[i].Guide, want[i])
		}
	}
}

func TestBadTargetSuppressesPartialOutput(t *testing.T) {
	repo, cwd := newTempRepo(t)
	got := runCLI([]string{"sample", "missing"}, cwd, repo)
	if got.code != 2 {
		t.Fatalf("exit = %d, want 2", got.code)
	}
	if got.stdout != "" {
		t.Fatalf("stdout = %q, want empty", got.stdout)
	}
	if got.stderr != "No guide directory for \"missing\"\n" {
		t.Fatalf("stderr = %q", got.stderr)
	}
}

func TestHumanOutput(t *testing.T) {
	repo, cwd := newTempRepo(t)
	t.Run("clean", func(t *testing.T) {
		got := runCLI([]string{"sample"}, cwd, repo)
		if got.code != 0 || got.stdout != "sample: ok\n" || got.stderr != "" {
			t.Fatalf("exit = %d, stdout = %q, stderr = %q", got.code, got.stdout, got.stderr)
		}
	})

	t.Run("finding", func(t *testing.T) {
		appendFile(t, filepath.Join(repo, "guides", "sample", "speakeasy.md"), "\nVisit https://example.com for details.\n")
		got := runCLI([]string{"sample"}, cwd, repo)
		if got.code != 1 || got.stderr != "" {
			t.Fatalf("exit = %d, stderr = %q", got.code, got.stderr)
		}
		for _, want := range []string{
			"sample: 1 finding(s)\n",
			"  [blocker/url-placement] speakeasy ",
			": URL is not in a Markdown link or fenced code block: https://example.com\n",
			"    → URLs should either be Markdown links or appear in fenced code blocks. Use a link when the reader should open the URL; use a fenced code block when the reader should copy it.\n",
		} {
			if !strings.Contains(got.stdout, want) {
				t.Errorf("stdout missing %q:\n%s", want, got.stdout)
			}
		}
	})
}

func TestJSONOutputAndExitCodes(t *testing.T) {
	repo, cwd := newTempRepo(t)
	t.Run("clean", func(t *testing.T) {
		got := runCLI([]string{"--json", "sample"}, cwd, repo)
		if got.code != 0 || got.stderr != "" {
			t.Fatalf("exit = %d, stderr = %q", got.code, got.stderr)
		}
		results := decodeResults(t, got.stdout)
		if len(results) != 1 || results[0].Guide != filepath.Join(repo, "guides", "sample") || len(results[0].Findings) != 0 {
			t.Fatalf("results = %#v", results)
		}
	})

	t.Run("findings", func(t *testing.T) {
		if err := os.Remove(filepath.Join(repo, "guides", "sample", "external.md")); err != nil {
			t.Fatal(err)
		}
		got := runCLI([]string{"sample", "--json"}, cwd, repo)
		if got.code != 1 || got.stderr != "" {
			t.Fatalf("exit = %d, stderr = %q", got.code, got.stderr)
		}
		results := decodeResults(t, got.stdout)
		if len(results) != 1 || results[0].Guide != filepath.Join(repo, "guides", "sample") || len(results[0].Findings) == 0 {
			t.Fatalf("results = %#v", results)
		}
	})
}

func TestUnknownOptionIsATarget(t *testing.T) {
	repo, cwd := newTempRepo(t)
	got := runCLI([]string{"--unknown"}, cwd, repo)
	if got.code != 2 || got.stdout != "" || got.stderr != "No guide directory for \"--unknown\"\n" {
		t.Fatalf("exit = %d, stdout = %q, stderr = %q", got.code, got.stdout, got.stderr)
	}
}

func TestTerminalUsageBeforeRepoDiscovery(t *testing.T) {
	cwd := t.TempDir()
	for _, tc := range []struct {
		name string
		args []string
	}{
		{name: "no arguments"},
		{name: "long help", args: []string{"--help"}},
		{name: "short help", args: []string{"-h"}},
		{name: "json only", args: []string{"--json"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var stdout, stderr bytes.Buffer
			code := execute(tc.args, cwd, &stdout, &stderr)
			if code != 2 || stdout.String() != "" || stderr.String() != usageText+"\n" {
				t.Fatalf("exit = %d, stdout = %q, stderr = %q", code, stdout.String(), stderr.String())
			}
		})
	}
}

func TestStdoutWriteFailure(t *testing.T) {
	repo, cwd := newTempRepo(t)
	broken := errors.New("broken stdout")

	for _, tc := range []struct {
		name string
		args []string
	}{
		{name: "clean JSON", args: []string{"--json", "sample"}},
		{name: "clean human", args: []string{"sample"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var stderr bytes.Buffer
			code := run(tc.args, cwd, repo, failingWriter{err: broken}, &stderr)
			if code != 2 || stderr.String() != "write output: broken stdout\n" {
				t.Fatalf("exit = %d, stderr = %q", code, stderr.String())
			}
		})
	}

	t.Run("findings human", func(t *testing.T) {
		if err := os.Remove(filepath.Join(repo, "guides", "sample", "external.md")); err != nil {
			t.Fatal(err)
		}
		var stderr bytes.Buffer
		code := run([]string{"sample"}, cwd, repo, failingWriter{err: broken}, &stderr)
		if code != 2 || stderr.String() != "write output: broken stdout\n" {
			t.Fatalf("exit = %d, stderr = %q", code, stderr.String())
		}
	})
}

type failingWriter struct {
	err error
}

func (w failingWriter) Write([]byte) (int, error) {
	return 0, w.err
}

func runCLI(args []string, cwd, repoRoot string) cliResult {
	var stdout, stderr bytes.Buffer
	code := run(args, cwd, repoRoot, &stdout, &stderr)
	return cliResult{code: code, stdout: stdout.String(), stderr: stderr.String()}
}

func decodeResults(t *testing.T, raw string) []jsonGuideResult {
	t.Helper()
	var results []jsonGuideResult
	if err := json.Unmarshal([]byte(raw), &results); err != nil {
		t.Fatalf("invalid JSON %q: %v", raw, err)
	}
	return results
}

func newTempRepo(t *testing.T) (repoRoot, cwd string) {
	t.Helper()
	repoRoot = t.TempDir()
	cwd = filepath.Join(repoRoot, "work")
	if err := os.MkdirAll(cwd, 0o755); err != nil {
		t.Fatal(err)
	}
	fixture := filepath.Join("..", "..", "internal", "guidecheck", "testdata", "valid")
	copyDir(t, filepath.Join(fixture, "schema"), filepath.Join(repoRoot, "schema"))
	copyDir(t, filepath.Join(fixture, "guides", "sample"), filepath.Join(repoRoot, "guides", "sample"))
	return repoRoot, cwd
}

func copyDir(t *testing.T, src, dst string) {
	t.Helper()
	if err := filepath.WalkDir(src, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if entry.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.Create(target)
		if err != nil {
			return err
		}
		if _, err = io.Copy(out, in); err != nil {
			out.Close()
			return err
		}
		return out.Close()
	}); err != nil {
		t.Fatal(err)
	}
}

func appendFile(t *testing.T, path, text string) {
	t.Helper()
	f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if _, err := f.WriteString(text); err != nil {
		t.Fatal(err)
	}
}
