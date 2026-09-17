package factorycontroller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func controllerFixture(t *testing.T) ControllerConfig {
	t.Helper()
	base := contextFixture(t)
	repo, _ := filepath.Abs("../../..")
	for _, p := range []string{"factory/coordinator.md", "factory/prompts/endpoint.md", "factory/prompts/reconcile.md", "factory/prompts/finalize-research.md", "factory/prompts/writer.md", "factory/scripts/write-report.sh", "factory/scripts/validate-report.sh", "factory/scripts/inspect-guide-artifacts.sh"} {
		b, e := os.ReadFile(filepath.Join(repo, p))
		if e != nil {
			t.Fatal(e)
		}
		contextWrite(t, base.Workspace, p, string(b))
	}
	if e := os.Mkdir(filepath.Join(base.Workspace, ".factory"), 0700); e != nil {
		t.Fatal(e)
	}
	for _, p := range []string{"go/go.mod", "go/published_server_refs.txt"} {
		contextWrite(t, base.Workspace, p, "fixture\n")
	}
	c := ControllerConfig{Workspace: base.Workspace, InputRoot: base.InputRoot, ControlDir: filepath.Join(base.Workspace, ".factory"), RunID: strings.Repeat("a", 32)}
	c.BeginBinary = filepath.Join(c.Workspace, "begin")
	c.LintBinary = filepath.Join(c.Workspace, "lint")
	c.GenerateBinary = filepath.Join(c.Workspace, "generate")
	validationWrite(t, c.BeginBinary, "#!/bin/sh\ntest -s .factory/research/dossier.md || exit 1\ntouch begin-ran\n", 0700)
	validationWrite(t, c.LintBinary, "#!/bin/sh\nprintf '[]\\n'\n", 0700)
	validationWrite(t, c.GenerateBinary, "#!/bin/sh\nmkdir generated\necho content > generated/result.md\necho package guides > index_gen.go\n", 0700)
	return c
}
func TestControllerReports(t *testing.T) {
	for _, mode := range []string{"converged", "context-blocked", "endpoint-blocked", "malformed", "research-failed", "validation-failed", "questions", "repair"} {
		t.Run(mode, func(t *testing.T) {
			c := controllerFixture(t)
			var mu sync.Mutex
			calls, writes := 0, 0
			if mode == "repair" {
				validationWrite(t, c.GenerateBinary, "#!/bin/sh\nif [ ! -f "+filepath.Join(c.Workspace, "repair-marker")+" ]; then touch "+filepath.Join(c.Workspace, "repair-marker")+"; exit 1; fi\nmkdir generated\necho content > generated/result.md\necho package guides > index_gen.go\n", 0700)
			}
			if mode == "validation-failed" {
				validationWrite(t, c.LintBinary, "#!/bin/sh\nexit 1\n", 0700)
			}
			c.Turn = func(ctx context.Context, id, p string) (TurnResult, error) {
				mu.Lock()
				defer mu.Unlock()
				calls++
				deadline, ok := ctx.Deadline()
				if !ok || time.Until(deadline) > 2700*time.Second {
					t.Fatal("missing fixed deadline")
				}
				answer := "report"
				session := id
				if session == "" {
					session = fmt.Sprintf("session-%d", calls)
				}
				switch {
				case calls == 1:
					answer = contextValidAnswer
					if mode == "context-blocked" {
						answer = `{"provider":null,"slug":null,"persona":null,"mcp_server":null,"documentation_urls":[],"blockers":["ambiguous"]}`
					}
				case strings.Contains(p, "# Extract the established endpoint"):
					if !strings.Contains(p, `"researched_at"`) || !strings.Contains(p, `"provider":"Example"`) {
						t.Fatal("host context missing")
					}
					answer = endpointJSON
					if mode == "endpoint-blocked" {
						answer = `{"established":false,"endpoint":"","sources":[],"blockers":["missing"]}`
					}
					if mode == "malformed" {
						answer = "not JSON"
					}
				case strings.Contains(p, "ResearchSnapshot JSON"):
					answer = `{"authentication":"token","actions":[{"description":"Configure","sources":["reference"]}],"follow_ups":[],"blockers":[],"dossier":"draft"}`
					if strings.Contains(p, "Return exactly dossier") {
						answer = `{"dossier":"Final dossier","blockers":[]}`
					}
				case strings.Contains(p, "Before writing"):
					writes++
					answer = `{"completed":true,"open_questions":[]}`
					if mode == "questions" {
						answer = `{"completed":false,"open_questions":["Which tenant?"]}`
					}
					for _, name := range validationNames {
						contextWrite(t, c.Workspace, "guides/example/"+name, "content\n")
					}
				default:
					if mode == "research-failed" {
						return TurnResult{}, errors.New("PRIVATE ERROR")
					}
				}
				return TurnResult{SessionID: session, Answer: answer}, nil
			}
			if err := RunController(context.Background(), c); err != nil {
				t.Fatal(err)
			}
			data, e := os.ReadFile(filepath.Join(c.Workspace, ".factory/run-report.json"))
			if e != nil {
				t.Fatal(e)
			}
			var r controllerReport
			if e = json.Unmarshal(data, &r); e != nil {
				t.Fatal(e)
			}
			want := "converged"
			switch mode {
			case "context-blocked", "endpoint-blocked":
				want = "blocked"
			case "malformed", "research-failed", "validation-failed":
				want = "failed"
			case "questions":
				want = "awaiting_scope"
			}
			if r.Outcome != want {
				t.Fatalf("%s: %s", mode, data)
			}
			if strings.Contains(string(data), "PRIVATE ERROR") {
				t.Fatal("raw error leaked")
			}
			if mode == "repair" && writes != 2 {
				t.Fatal("missing same-session repair", writes)
			}
			if want == "converged" && len(r.Artifacts) != 4 {
				t.Fatal(r)
			}
			if want != "converged" && len(r.Artifacts) != 0 {
				t.Fatal(r)
			}
			if mode == "context-blocked" && (r.Provider != nil || r.Slug != nil || r.Persona != nil || calls != 1) {
				t.Fatal(r, calls)
			}
			if mode == "endpoint-blocked" && writes != 0 {
				t.Fatal("writer after blocker")
			}
		})
	}
}
func TestControllerReportFailure(t *testing.T) {
	c := controllerFixture(t)
	c.Turn = func(context.Context, string, string) (TurnResult, error) { return TurnResult{}, errors.New("private") }
	os.Remove(filepath.Join(c.Workspace, "factory/scripts/write-report.sh"))
	if err := RunController(context.Background(), c); err == nil || err.Error() != "report_failed" {
		t.Fatal(err)
	}
}

func TestControllerCancelledReport(t *testing.T) {
	c := controllerFixture(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	c.Turn = func(context.Context, string, string) (TurnResult, error) {
		t.Fatal("turn after cancellation")
		return TurnResult{}, nil
	}
	if err := RunController(ctx, c); err == nil || err.Error() != "report_failed" {
		t.Fatalf("report ignored cancellation: %v", err)
	}
	if _, err := os.Stat(filepath.Join(c.Workspace, ".factory/run-report.json")); !os.IsNotExist(err) {
		t.Fatal("report launched after cancellation", err)
	}
}
