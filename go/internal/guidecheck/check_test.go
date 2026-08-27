package guidecheck

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCheckRetainedRules(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(t *testing.T, dir string)
		problem string
	}{
		{"external frontmatter requires setup_version 1", replaceIn("external.md", "setup_version: 1", "setup_version: 2"), "setup_version: 1"},
		{"external has exactly one H1", appendTo("external.md", "\n# Another title\n"), "exactly one H1"},
		{"forbidden external H2", appendTo("external.md", "\n## Prerequisites\n"), "must not use"},
		{"external H3 requires kebab anchor", replaceIn("external.md", " {#create-credentials}", ""), "missing a {#kebab-case} anchor"},
		{"external H3 needs numbered actions", replaceIn("external.md", "1. Open the provider console.\n2. Create a credential using {{ gram.oauth.callback_url }}.", "Open the provider console and create a credential using {{ gram.oauth.callback_url }}."), "numbered action list"},
		{"speakeasy has no frontmatter", prependTo("speakeasy.md", "---\nsetup_version: 1\n---\n"), "must not have YAML frontmatter"},
		{"speakeasy canonical H1", replaceIn("speakeasy.md", "# Speakeasy setup", "# Control Plane setup"), "Expected \"# Speakeasy setup\""},
		{"speakeasy canonical anchors", replaceIn("speakeasy.md", " {#add-server-in-speakeasy}", ""), "Missing canonical Speakeasy step"},
		{"unknown template key", appendTo("external.md", "\n{{ unknown.value }}\n"), "Unsupported template key"},
		{"meta follows schema", appendTo("meta.yaml", "unexpected: true\n"), "meta.yaml failed schema"},
		{"meta references existing same-file anchors", replaceIn("meta.yaml", "external.md#create-credentials", "speakeasy.md#create-credentials"), "anchor lives in the other setup file"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repoRoot, guideDir := completeGuide(t)
			findings, err := Check(repoRoot, guideDir)
			if err != nil {
				t.Fatalf("Check(valid fixture): %v", err)
			}
			if len(findings) != 0 {
				t.Fatalf("valid fixture returned findings: %#v", findings)
			}

			tt.mutate(t, guideDir)
			findings, err = Check(repoRoot, guideDir)
			if err != nil {
				t.Fatalf("Check(invalid fixture): %v", err)
			}
			if !hasProblem(findings, tt.problem) {
				t.Fatalf("findings %#v do not contain problem %q", findings, tt.problem)
			}
			for _, finding := range findings {
				if finding.Dimension != "lint" {
					t.Errorf("Dimension = %q, want lint", finding.Dimension)
				}
			}
		})
	}
}

func completeGuide(t *testing.T) (string, string) {
	t.Helper()
	repoRoot := t.TempDir()
	guideDir := filepath.Join(repoRoot, "guides", "fixture")
	mustWrite(t, filepath.Join(repoRoot, "schema", "guide.v1.schema.json"), mustRead(t, filepath.Join("..", "..", "..", "schema", "guide.v1.schema.json")))
	mustWrite(t, filepath.Join(guideDir, "external.md"), `---
setup_version: 1
---
# Fixture setup

### Create credentials {#create-credentials}

1. Open the provider console.
2. Create a credential using {{ gram.oauth.callback_url }}.

<!-- screenshot: credential creation form -->
`)
	mustWrite(t, filepath.Join(guideDir, "speakeasy.md"), `# Speakeasy setup

### Add server {#add-server-in-speakeasy}

1. Add the server.

### Connect credentials {#connect-speakeasy-credentials}

1. Connect the credential.
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
		t.Helper()
		path := filepath.Join(dir, name)
		mustWrite(t, path, mustRead(t, path)+suffix)
	}
}

func prependTo(name, prefix string) func(*testing.T, string) {
	return func(t *testing.T, dir string) {
		t.Helper()
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
