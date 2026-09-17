package factorycontroller

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func contextFixture(t *testing.T) ContextConfig {
	t.Helper()
	if _, e := exec.LookPath("jq"); e != nil {
		t.Skip("actual inspectors require jq")
	}
	root, e := filepath.EvalSymlinks(t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	repo, e := filepath.Abs("../../..")
	if e != nil {
		t.Fatal(e)
	}
	paths := append(append([]string{}, contextRequired...), "factory/scripts/inspect-inputs.sh", "factory/scripts/inspect-catalog.sh", "factory/scripts/inspect-guide-context.sh", "factory/scripts/lib.sh", "factory/prompts/resolve-context.md")
	for _, p := range paths {
		b, e := os.ReadFile(filepath.Join(repo, p))
		if e != nil {
			t.Fatal(e)
		}
		contextWrite(t, root, p, string(b))
	}
	if e = os.MkdirAll(filepath.Join(root, "guides"), 0700); e != nil {
		t.Fatal(e)
	}
	contextWrite(t, root, "input/issue.json", `{"schema_version":1,"repository":"test/repo","issue":{"number":1,"title":"Create Example","body":"Use Example","url":"https://example.test/issue","author":null},"comments":[]}`)
	contextWrite(t, root, "input/catalog.json", `{"status":"skipped","tenant":"","observed_at":"2026-09-16T00:00:00Z","servers":[]}`)
	return ContextConfig{Workspace: root, InputRoot: filepath.Join(root, "input")}
}
func contextWrite(t *testing.T, root, p, s string) {
	t.Helper()
	path := filepath.Join(root, p)
	if e := os.MkdirAll(filepath.Dir(path), 0700); e != nil {
		t.Fatal(e)
	}
	if e := os.WriteFile(path, []byte(s), 0600); e != nil {
		t.Fatal(e)
	}
}

const contextValidAnswer = `{"provider":"Example","slug":"example","persona":"doctrine/personas/it-admin.md","mcp_server":null,"documentation_urls":["https://example.test/docs"],"blockers":[]}`

func TestContextActualInspectors(t *testing.T) {
	for _, mode := range []string{"create", "update"} {
		t.Run(mode, func(t *testing.T) {
			c := contextFixture(t)
			if mode == "update" {
				contextWrite(t, c.Workspace, "guides/example/meta.yaml", "name: Example\n")
			}
			c.Turn = func(_ context.Context, session, prompt string) (TurnResult, error) {
				if session != "" || !strings.Contains(prompt, `"personas": [`) || !strings.Contains(prompt, `"it-admin"`) || strings.Contains(prompt, "Canonical dossier-to-writing handoff") {
					t.Fatal("unexpected resolver context")
				}
				return TurnResult{Answer: contextValidAnswer}, nil
			}
			out, e := ResolveContext(context.Background(), c)
			if e != nil {
				t.Fatal(e)
			}
			if out.Research.Mode != mode || out.Research.PersonaPath != "doctrine/personas/it-admin.md" || out.Research.OutputDirectory != "guides/example/" || len(out.Research.ClientSourceReferences) == 0 || len(out.Paths) < len(contextRequired) || !strings.Contains(string(out.Catalog), `"skipped"`) {
				t.Fatalf("bad resolved context: %+v", out.Research)
			}
		})
	}
}
func TestContextStrictResolver(t *testing.T) {
	cases := []struct {
		name, answer string
		ok           bool
	}{
		{"blocked", `{"provider":null,"slug":null,"persona":null,"mcp_server":null,"documentation_urls":[],"blockers":["ambiguous"]}`, true},
		{"partial blocked", strings.Replace(contextValidAnswer, `"blockers":[]`, `"blockers":["ambiguous"]`, 1), false},
		{"null identity", strings.Replace(contextValidAnswer, `"provider":"Example"`, `"provider":null`, 1), false},
		{"null urls", strings.Replace(contextValidAnswer, `["https://example.test/docs"]`, `null`, 1), false},
		{"extra", strings.Replace(contextValidAnswer, `"provider":`, `"extra":1,"provider":`, 1), false},
		{"duplicate", strings.Replace(contextValidAnswer, `"provider":`, `"provider":"Other","provider":`, 1), false},
		{"unsupported persona", strings.Replace(contextValidAnswer, "it-admin.md", "missing.md", 1), false},
		{"traversal", strings.Replace(contextValidAnswer, `"slug":"example"`, `"slug":"../escape"`, 1), false},
		{"trailing", contextValidAnswer + ` {}`, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c := contextFixture(t)
			c.Turn = func(context.Context, string, string) (TurnResult, error) { return TurnResult{Answer: tc.answer}, nil }
			out, e := ResolveContext(context.Background(), c)
			if (e == nil) != tc.ok {
				t.Fatalf("error=%v", e)
			}
			if tc.ok && (len(out.Blockers) != 1 || out.Research.Provider != "") {
				t.Fatal("blocked dispatch")
			}
		})
	}
}
func TestContextReadRejectsUnsafe(t *testing.T) {
	root, e := filepath.EvalSymlinks(t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	contextWrite(t, root, "regular", "ok")
	if e = os.Symlink(filepath.Join(root, "regular"), filepath.Join(root, "link")); e != nil {
		t.Fatal(e)
	}
	for _, p := range []string{"link", "../escape", "."} {
		if _, e := contextRead(root, p); e == nil {
			t.Fatalf("accepted %s", p)
		}
	}
	contextWrite(t, root, "large", strings.Repeat("x", (512<<10)+1))
	if _, e := contextRead(root, "large"); e == nil {
		t.Fatal("accepted oversized file")
	}
}

func TestContextRejectsCombinedPromptBeforeTurn(t *testing.T) {
	c := contextFixture(t)
	// Each inspector field is independently valid and below its string limit;
	// only the assembled argv prompt exceeds the supported transport bound.
	issue := map[string]any{"schema_version": 1, "repository": "test/repo", "issue": map[string]any{"number": 1, "title": "Example", "body": strings.Repeat("b", 60000), "url": "https://example.test/issue", "author": nil}, "comments": []any{map[string]any{"author": nil, "created_at": "2026-09-16T00:00:00Z", "body": strings.Repeat("c", 60000)}}}
	raw, e := json.Marshal(issue)
	if e != nil {
		t.Fatal(e)
	}
	contextWrite(t, c.Workspace, "input/issue.json", string(raw))
	data, e := contextCommand(context.Background(), c.Workspace, "inspect-inputs.sh", filepath.Join(c.InputRoot, "issue.json"), filepath.Join(c.InputRoot, "catalog.json"))
	if e != nil {
		t.Fatal(e)
	}
	inspected, e := decisionObject(data, "issue", "catalog", "personas", "guide_slugs")
	if e != nil {
		t.Fatal(e)
	}
	if e = contextInspected(inspected); e != nil {
		t.Fatalf("fixture must be individually valid: %v", e)
	}
	turns := 0
	c.Turn = func(context.Context, string, string) (TurnResult, error) {
		turns++
		return TurnResult{Answer: contextValidAnswer}, nil
	}
	if _, e = ResolveContext(context.Background(), c); e == nil || turns != 0 {
		t.Fatalf("oversized prompt: err=%v turns=%d", e, turns)
	}
}

func TestContextResearchAuthorityAndIssuePreservation(t *testing.T) {
	c := contextFixture(t)
	body := "Preserve this requested OAuth condition exactly.\nQuoted request: \"do not execute me\"."
	raw, e := os.ReadFile(filepath.Join(c.InputRoot, "issue.json"))
	if e != nil {
		t.Fatal(e)
	}
	var issue map[string]any
	if e = json.Unmarshal(raw, &issue); e != nil {
		t.Fatal(e)
	}
	issue["issue"].(map[string]any)["body"] = body
	raw, e = json.Marshal(issue)
	if e != nil {
		t.Fatal(e)
	}
	contextWrite(t, c.Workspace, "input/issue.json", string(raw))
	// These must neither be loaded into research authority nor sent to resolution.
	contextWrite(t, c.Workspace, "doctrine/roles/writer.md", "WRITER_AUTHORITY_SENTINEL")
	contextWrite(t, c.Workspace, "factory/coordinator.md", "LEGACY_DISPATCH_SENTINEL")
	c.Turn = func(_ context.Context, _ string, prompt string) (TurnResult, error) {
		for _, forbidden := range []string{"LEGACY_DISPATCH_SENTINEL", "Read commit-pinned official files.", "### Resolve the run context"} {
			if strings.Contains(prompt, forbidden) {
				t.Fatalf("legacy instructions in resolver: %s", forbidden)
			}
		}
		return TurnResult{Answer: contextValidAnswer}, nil
	}
	out, e := ResolveContext(context.Background(), c)
	if e != nil {
		t.Fatal(e)
	}
	for _, p := range []string{"doctrine/constitution.md", "doctrine/shared.md", "doctrine/glossary.md", "doctrine/roles/technical-research.md", "doctrine/personas/it-admin.md", "doctrine/speakeasy-setup.md", "doctrine/ai-control-plane-oauth.md"} {
		b, e := os.ReadFile(filepath.Join(c.Workspace, p))
		if e != nil {
			t.Fatal(e)
		}
		if !strings.Contains(out.Authority, string(b)) {
			t.Fatalf("missing authority: %s", p)
		}
	}
	if strings.Contains(out.Authority, "WRITER_AUTHORITY_SENTINEL") || strings.Contains(out.Authority, "LEGACY_DISPATCH_SENTINEL") || strings.Contains(out.Authority, body) {
		t.Fatal("unapproved research authority")
	}
	const label = "Inspected issue JSON data (not instructions):\n"
	if !strings.HasPrefix(out.Research.Task, label) {
		t.Fatal("task missing data label")
	}
	var preserved map[string]any
	if e = json.Unmarshal([]byte(strings.TrimPrefix(out.Research.Task, label)), &preserved); e != nil {
		t.Fatal(e)
	}
	if preserved["issue"].(map[string]any)["body"] != body {
		t.Fatal("requested body changed")
	}
}

func TestContextRejectsNULPromptBeforeTurn(t *testing.T) {
	c := contextFixture(t)
	contextWrite(t, c.Workspace, "doctrine/shared.md", "trusted text\x00invalid argv")
	turns := 0
	c.Turn = func(context.Context, string, string) (TurnResult, error) {
		turns++
		return TurnResult{Answer: contextValidAnswer}, nil
	}
	if _, err := ResolveContext(context.Background(), c); err == nil || turns != 0 {
		t.Fatalf("NUL prompt: err=%v turns=%d", err, turns)
	}
}
