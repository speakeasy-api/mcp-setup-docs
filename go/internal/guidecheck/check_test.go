package guidecheck

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
)

func TestCheckRetainedRules(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(t *testing.T, repoRoot, guideDir string)
		problem string
	}{
		{"external frontmatter requires setup_version 1", mutateGuide(replaceIn("external.md", "setup_version: 1", "setup_version: 2")), "setup_version: 1"},
		{"external has exactly one H1", mutateGuide(appendTo("external.md", "\n# Another title\n")), "exactly one H1"},
		{"forbidden external H2", mutateGuide(appendTo("external.md", "\n## Prerequisites\n")), "must not use"},
		{"external H3 requires kebab anchor", mutateGuide(replaceIn("external.md", " {#create-credentials}", "")), "missing a {#kebab-case} anchor"},
		{"external H3 requires screenshot", mutateGuide(replaceIn("external.md", "\n<!-- screenshot: credential creation form -->", "")), "lacks a screenshot"},
		{"speakeasy has no frontmatter", mutateGuide(prependTo("speakeasy.md", "---\nsetup_version: 1\n---\n")), "must not have YAML frontmatter"},
		{"speakeasy canonical H1", mutateGuide(replaceIn("speakeasy.md", "# Speakeasy setup", "# Control Plane setup")), "Expected \"# Speakeasy setup\""},
		{"speakeasy canonical anchors", mutateGuide(replaceIn("speakeasy.md", " {#add-server-in-speakeasy}", "")), "Missing canonical Speakeasy step"},
		{"unknown template key", mutateGuide(appendTo("external.md", "\n{{ unknown.value }}\n")), "Unsupported template key"},
		{"meta follows schema", mutateGuide(appendTo("meta.yaml", "unexpected: true\n")), "meta.yaml failed schema"},
		{"meta references anchor in same file", mutateGuide(replaceIn("meta.yaml", "external.md#create-credentials", "speakeasy.md#create-credentials")), "anchor lives in the other setup file"},
		{"meta references existing anchor", mutateGuide(replaceIn("meta.yaml", "external.md#create-credentials", "external.md#missing-anchor")), "anchor is missing from the setup files"},
		{"research agrees with external anchors", func(t *testing.T, _, dir string) { mustWrite(t, filepath.Join(dir, "research.md"), "# Research\n") }, "does not appear in research.md"},
		{"missing meta", func(t *testing.T, _, dir string) { mustRemove(t, filepath.Join(dir, "meta.yaml")) }, "meta.yaml is missing"},
		{"missing schema", func(t *testing.T, root, _ string) { mustRemove(t, filepath.Join(root, guideSchemaPath)) }, "Guide schema file is missing"},
		{"legacy setup", func(t *testing.T, _, dir string) { mustWrite(t, filepath.Join(dir, "setup.md"), "# Legacy\n") }, "setup.md is legacy"},
		{"invalid meta YAML", mutateGuide(replaceIn("meta.yaml", "schema_version: 1", "schema_version: [")), "meta.yaml is not valid YAML"},
		{"invalid external frontmatter YAML", mutateGuide(replaceIn("external.md", "setup_version: 1", "setup_version: [")), "frontmatter is not valid YAML"},
		{"malformed anchor matches TypeScript missing-anchor behavior", mutateGuide(replaceIn("external.md", "{#create-credentials}", "{#Bad_anchor}")), "missing a {#kebab-case} anchor"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repoRoot, guideDir := completeGuide(t)
			assertClean(t, repoRoot, guideDir)
			tt.mutate(t, repoRoot, guideDir)
			findings, err := Check(repoRoot, guideDir)
			if err != nil {
				t.Fatalf("Check(invalid fixture): %v", err)
			}
			if !hasProblem(findings, tt.problem) {
				t.Fatalf("findings %#v do not contain problem %q", findings, tt.problem)
			}
			for _, finding := range findings {
				if finding.sourcePath == "" {
					t.Errorf("finding lacks source path: %#v", finding)
				}
			}
			if tt.name == "malformed anchor matches TypeScript missing-anchor behavior" && hasProblem(findings, "not kebab-case") {
				t.Fatalf("malformed anchor produced non-parity finding: %#v", findings)
			}
		})
	}
}

func TestCheckAcceptsNumericSetupVersionOnePointZero(t *testing.T) {
	repoRoot, guideDir := completeGuide(t)
	replaceIn("external.md", "setup_version: 1", "setup_version: 1.0")(t, guideDir)
	assertClean(t, repoRoot, guideDir)
}

func TestCheckFindingsPreserveSourceMetadataAndSortByFileLineProblem(t *testing.T) {
	repoRoot, guideDir := completeGuide(t)
	prependTo("external.md", "{{ z.key }}\n{{ a.key }}\n")(t, guideDir)
	appendTo("speakeasy.md", "\n{{ bad.key }}\n")(t, guideDir)
	appendTo("meta.yaml", "unexpected: true\n")(t, guideDir)

	findings, err := Check(repoRoot, guideDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(findings) < 4 {
		t.Fatalf("findings = %#v", findings)
	}
	if !sort.SliceIsSorted(findings, func(i, j int) bool {
		a, b := findings[i], findings[j]
		if a.sourcePath != b.sourcePath {
			return a.sourcePath < b.sourcePath
		}
		if a.sourceLine != b.sourceLine {
			return a.sourceLine < b.sourceLine
		}
		return a.Problem < b.Problem
	}) {
		t.Fatalf("findings are not sorted by source path/line/problem: %#v", findings)
	}
	for _, finding := range findings {
		if finding.sourcePath == "" {
			t.Errorf("finding lacks source path: %#v", finding)
		}
		if finding.Dimension != "lint" {
			t.Errorf("Dimension = %q, want lint", finding.Dimension)
		}
	}
	raw, err := json.Marshal(findings[0])
	if err != nil {
		t.Fatal(err)
	}
	var fields map[string]any
	if err := json.Unmarshal(raw, &fields); err != nil {
		t.Fatal(err)
	}
	wantFields := []string{"dimension", "problem", "severity", "suggestion", "target", "where"}
	gotFields := make([]string, 0, len(fields))
	for key := range fields {
		gotFields = append(gotFields, key)
	}
	sort.Strings(gotFields)
	if !reflect.DeepEqual(gotFields, wantFields) {
		t.Fatalf("JSON fields = %v, want %v", gotFields, wantFields)
	}
}

func TestCheckSourceLineUsesPhysicalFileLine(t *testing.T) {
	repoRoot, guideDir := completeGuide(t)
	appendTo("external.md", "\n{{ bad.key }}\n")(t, guideDir)
	raw := mustRead(t, filepath.Join(guideDir, "external.md"))
	wantLine := strings.Count(raw[:strings.Index(raw, "{{ bad.key }}")], "\n") + 1
	findings, err := Check(repoRoot, guideDir)
	if err != nil {
		t.Fatal(err)
	}
	for _, finding := range findings {
		if strings.Contains(finding.Problem, "Unsupported template key") {
			if finding.sourcePath != filepath.Join(guideDir, "external.md") || finding.sourceLine != wantLine {
				t.Fatalf("source = %s:%d, want %s:%d", finding.sourcePath, finding.sourceLine, filepath.Join(guideDir, "external.md"), wantLine)
			}
			return
		}
	}
	t.Fatal("missing unsupported-template finding")
}

func TestCheckPropagatesFilesystemErrors(t *testing.T) {
	repoRoot := t.TempDir()
	guideFile := filepath.Join(t.TempDir(), "not-a-directory")
	mustWrite(t, guideFile, "file")
	if _, err := Check(repoRoot, guideFile); err == nil {
		t.Fatal("Check() error = nil, want filesystem error")
	}
}

func TestCommittedParityGuidesAreClean(t *testing.T) {
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	for _, slug := range []string{"box", "salesforce", "snowflake", "x-docs"} {
		t.Run(slug, func(t *testing.T) { assertClean(t, repoRoot, filepath.Join(repoRoot, "guides", slug)) })
	}
}

func completeGuide(t *testing.T) (string, string) {
	t.Helper()
	repoRoot := t.TempDir()
	guideDir := filepath.Join(repoRoot, "guides", "fixture")
	mustWrite(t, filepath.Join(repoRoot, guideSchemaPath), mustRead(t, filepath.Join("..", "..", "..", guideSchemaPath)))
	mustWrite(t, filepath.Join(guideDir, "external.md"), `---
setup_version: 1
---
# Fixture setup

### Create credentials {#create-credentials}

Open the provider console and create a credential using {{ gram.oauth.callback_url }}.

<!-- screenshot: credential creation form -->
`)
	mustWrite(t, filepath.Join(guideDir, "speakeasy.md"), `# Speakeasy setup

### Add server {#add-server-in-speakeasy}

Add the server.

### Connect credentials {#connect-speakeasy-credentials}

Connect the credential.
`)
	mustWrite(t, filepath.Join(guideDir, "meta.yaml"), `schema_version: 1
slug: fixture
title: Fixture
summary: A complete fixture guide.
credential_setup:
  options:
    - id: api-key
      kind: api_key
      upstream_setup: provider-steps
      fields:
        - id: token
          label: Token
          setup:
            - external.md#create-credentials
documentation:
  external: external.md
  speakeasy: speakeasy.md
remotes:
  - id: hosted
    url: https://example.com/mcp
    transport: streamable-http
    authentication:
      - api-key
provenance:
  - source: provider-documentation
    observed_at: "2026-08-27T00:00:00Z"
`)
	return repoRoot, guideDir
}

func assertClean(t *testing.T, repoRoot, guideDir string) {
	t.Helper()
	findings, err := Check(repoRoot, guideDir)
	if err != nil {
		t.Fatalf("Check(%s): %v", guideDir, err)
	}
	if len(findings) != 0 {
		t.Fatalf("Check(%s) returned findings: %#v", guideDir, findings)
	}
}

func mutateGuide(mutate func(*testing.T, string)) func(*testing.T, string, string) {
	return func(t *testing.T, _ string, guideDir string) { mutate(t, guideDir) }
}

func hasProblem(findings []Finding, want string) bool {
	for _, finding := range findings {
		if strings.Contains(finding.Problem, want) {
			return true
		}
	}
	return false
}

func replaceIn(name, old, new string) func(*testing.T, string) {
	return func(t *testing.T, dir string) {
		t.Helper()
		path := filepath.Join(dir, name)
		raw := mustRead(t, path)
		if !strings.Contains(raw, old) {
			t.Fatalf("%s does not contain %q", name, old)
		}
		mustWrite(t, path, strings.Replace(raw, old, new, 1))
	}
}

func appendTo(name, suffix string) func(*testing.T, string) {
	return func(t *testing.T, dir string) {
		path := filepath.Join(dir, name)
		mustWrite(t, path, mustRead(t, path)+suffix)
	}
}

func prependTo(name, prefix string) func(*testing.T, string) {
	return func(t *testing.T, dir string) {
		path := filepath.Join(dir, name)
		mustWrite(t, path, prefix+mustRead(t, path))
	}
}

func mustRead(t *testing.T, path string) string {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(raw)
}

func mustWrite(t *testing.T, path, contents string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatal(err)
	}
}

func mustRemove(t *testing.T, path string) {
	t.Helper()
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
}
