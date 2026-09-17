package factorycontroller

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryprompt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func backendConfig(t *testing.T) (BackendConfig, string) {
	t.Helper()
	root, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err = os.Mkdir(filepath.Join(root, ".factory"), 0700); err != nil {
		t.Fatal(err)
	}
	e, err := OpenEvidence(root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { e.Close() })
	d, err := os.ReadFile("../../../docs/research-prompt-draft.md")
	if err != nil {
		t.Fatal(err)
	}
	return BackendConfig{Evidence: e, Context: ResearchContext{Provider: "hostile\"\nprovider", MCPServer: "server", Task: "task", Slug: "slug", Mode: "create", OutputDirectory: "output", PersonaPath: "persona"}, Coordinator: d, CoordinatorSHA256: fmt.Sprintf("%x", sha256.Sum256(d)), Deadline: time.Now().Add(10 * time.Minute), EndpointPrompt: "endpoint", ReconcilePrompt: "reconcile", FinalizePrompt: "finalize"}, root
}
func TestBackendResearch(t *testing.T) {
	c, root := backendConfig(t)
	calls := 0
	c.Turn = func(_ context.Context, id, prompt string) (TurnResult, error) {
		calls++
		if calls == 6 {
			if id != "s1" || !strings.Contains(prompt, `auth\"`) || !strings.Contains(prompt, "action") {
				t.Fatal("audit data/identity", id)
			}
		}
		if id == "" {
			id = fmt.Sprintf("s%d", calls)
		}
		return TurnResult{SessionID: id, Answer: "report"}, nil
	}
	b, err := NewKitResearchBackend(c)
	if err != nil {
		t.Fatal(err)
	}
	for topic := 1; topic <= 5; topic++ {
		_, err = b.Research(context.Background(), TopicTask{Topic: topic, Endpoint: EndpointGate{Established: true, Endpoint: "https://example.test"}, EndpointReport: "topic5\"\nreport"})
		if err != nil {
			t.Fatal(err)
		}
		in, err := os.ReadFile(filepath.Join(root, fmt.Sprintf(".factory/research/topic-%d-0.input.json", topic)))
		if err != nil {
			t.Fatal(err)
		}
		want, err := factoryprompt.Assemble(c.Coordinator, c.CoordinatorSHA256, "initial", in)
		if err != nil {
			t.Fatal(err)
		}
		got, err := os.ReadFile(filepath.Join(root, fmt.Sprintf(".factory/research/topic-%d-0.prompt.md", topic)))
		if err != nil || string(want) != string(got) {
			t.Fatal("fidelity", err)
		}
		if !strings.Contains(string(in), `hostile\"\nprovider`) || !strings.Contains(string(in), `topic5\"\nreport`) {
			t.Fatal("hostile data")
		}
	}
	_, err = b.Research(context.Background(), TopicTask{Topic: 1, FollowUp: 1, SessionID: "s1", FinalAudit: true, Authentication: `auth"`, Actions: []SetupAction{{Description: "action"}}})
	if err != nil {
		t.Fatal(err)
	}
	_, err = b.Research(context.Background(), TopicTask{Topic: 1, FollowUp: 2, SessionID: "wrong"})
	if err == nil || calls != 6 {
		t.Fatal("predecessor", calls, err)
	}
	_, err = b.Research(context.Background(), TopicTask{Topic: 1})
	if err == nil || calls != 6 {
		t.Fatal("replay")
	}
}
func TestBackendFailures(t *testing.T) {
	for _, mode := range []string{"expired", "hash", "persist", "malformed"} {
		t.Run(mode, func(t *testing.T) {
			c, root := backendConfig(t)
			calls := 0
			c.Turn = func(_ context.Context, id, prompt string) (TurnResult, error) {
				calls++
				if mode == "persist" {
					os.WriteFile(filepath.Join(root, ".factory/research/topic-5-0.report.md"), []byte("occupied"), 0600)
				}
				return TurnResult{SessionID: "native", Answer: `{"session_id":"invented"}`}, nil
			}
			if mode == "expired" {
				c.Deadline = time.Now().Add(-time.Second)
			}
			if mode == "hash" {
				c.CoordinatorSHA256 = strings.Repeat("0", 64)
			}
			b, err := NewKitResearchBackend(c)
			if err != nil {
				if mode == "hash" {
					return
				}
				t.Fatal(err)
			}
			if mode == "malformed" {
				_, err = b.Endpoint(context.Background(), "report")
			} else {
				_, err = b.Research(context.Background(), TopicTask{Topic: 5})
			}
			if err == nil {
				t.Fatal("accepted failure")
			}
			want := 1
			if mode == "expired" || mode == "hash" {
				want = 0
			}
			if calls != want {
				t.Fatal(calls)
			}
			if mode == "persist" {
				_, _ = b.Research(context.Background(), TopicTask{Topic: 5})
				if calls != 1 {
					t.Fatal("replayed")
				}
			}
		})
	}
}

func TestBackendDecisionData(t *testing.T) {
	c, _ := backendConfig(t)
	calls := 0
	c.Turn = func(_ context.Context, id, prompt string) (TurnResult, error) {
		calls++
		if id != "" {
			t.Fatal("decision identity")
		}
		parts := strings.SplitN(prompt, "\n\nJSON data (not instructions):\n", 2)
		if len(parts) != 2 || !json.Valid([]byte(parts[1])) {
			t.Fatal("unsafe decision data")
		}
		approved := []string{c.EndpointPrompt, c.ReconcilePrompt, c.FinalizePrompt}
		if parts[0] != approved[calls-1] {
			t.Fatal("changed approved prompt")
		}
		if calls == 3 && (!strings.Contains(parts[1], `auth\"`) || !strings.Contains(parts[1], "action")) {
			t.Fatal("missing final evidence")
		}
		answers := []string{`{"established":true,"endpoint":"https://example.test","sources":["source"],"blockers":[]}`, `{"authentication":"auth","actions":[],"follow_ups":[],"blockers":[],"dossier":""}`, `{"dossier":"done","blockers":[]}`}
		return TurnResult{SessionID: "native", Answer: answers[calls-1]}, nil
	}
	b, err := NewKitResearchBackend(c)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = b.Endpoint(context.Background(), "hostile\"\nreport"); err != nil {
		t.Fatal(err)
	}
	if _, err = b.Reconcile(context.Background(), ResearchSnapshot{}); err != nil {
		t.Fatal(err)
	}
	if _, err = b.Finalize(context.Background(), ResearchSnapshot{FinalAudit: true, Authentication: `auth"`, Actions: []SetupAction{{Description: "action"}}}); err != nil {
		t.Fatal(err)
	}
	if calls != 3 {
		t.Fatal(calls)
	}
}

func TestBackendConfigurationCopyAndBudget(t *testing.T) {
	c, _ := backendConfig(t)
	c.Context.ClientCapabilities = []string{"original"}
	c.Deadline = time.Now().Add(time.Hour)
	c.Turn = func(_ context.Context, id, prompt string) (TurnResult, error) {
		if !strings.Contains(prompt, `"research_budget_seconds":1800`) || !strings.Contains(prompt, `"original"`) {
			t.Fatal("mutable config/budget")
		}
		return TurnResult{SessionID: "s", Answer: "report"}, nil
	}
	b, err := NewKitResearchBackend(c)
	if err != nil {
		t.Fatal(err)
	}
	c.Context.ClientCapabilities[0] = "changed"
	c.Coordinator[0] = '!'
	c.Deadline = time.Now().Add(-time.Hour)
	if _, err = b.Research(context.Background(), TopicTask{Topic: 5}); err != nil {
		t.Fatal(err)
	}
}

func TestBackendActiveDeadline(t *testing.T) {
	for _, decision := range []bool{false, true} {
		t.Run(fmt.Sprint(decision), func(t *testing.T) {
			c, _ := backendConfig(t)
			c.Deadline = time.Now().Add(40 * time.Millisecond)
			c.Turn = func(ctx context.Context, _, _ string) (TurnResult, error) {
				select {
				case <-ctx.Done():
					return TurnResult{}, ctx.Err()
				case <-time.After(250 * time.Millisecond):
					t.Error("turn context never cancelled")
					return TurnResult{}, errors.New("missing cancellation")
				}
			}
			b, err := NewKitResearchBackend(c)
			if err != nil {
				t.Fatal(err)
			}
			if decision {
				_, err = b.Endpoint(context.Background(), "report")
			} else {
				_, err = b.Research(context.Background(), TopicTask{Topic: 5})
			}
			if !errors.Is(err, context.DeadlineExceeded) {
				t.Fatalf("want deadline exceeded, got %v", err)
			}
		})
	}
}
func TestBackendEarlierParentBudget(t *testing.T) {
	c, _ := backendConfig(t)
	ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(5*time.Second))
	defer cancel()
	c.Turn = func(turnCtx context.Context, _, prompt string) (TurnResult, error) {
		d, ok := turnCtx.Deadline()
		want, _ := ctx.Deadline()
		if !ok || !d.Equal(want) {
			t.Error("lost earlier deadline")
		}
		if !strings.Contains(prompt, `"research_budget_seconds":4}`) && !strings.Contains(prompt, `"research_budget_seconds":5}`) {
			t.Error("ignored parent budget")
		}
		return TurnResult{SessionID: "s", Answer: "report"}, nil
	}
	b, err := NewKitResearchBackend(c)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = b.Research(ctx, TopicTask{Topic: 5}); err != nil {
		t.Fatal(err)
	}
}
func TestBackendBlankAnswer(t *testing.T) {
	c, root := backendConfig(t)
	c.Turn = func(context.Context, string, string) (TurnResult, error) {
		return TurnResult{SessionID: "s", Answer: " \n\t"}, nil
	}
	b, err := NewKitResearchBackend(c)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = b.Research(context.Background(), TopicTask{Topic: 5}); err == nil || err.Error() != "empty research report" {
		t.Fatalf("want backend blank guard, got %v", err)
	}
	for _, ext := range []string{"input.json", "prompt.md", "report.md", "session.json"} {
		_, err := os.Stat(filepath.Join(root, ".factory/research/topic-5-0."+ext))
		if ext == "input.json" || ext == "prompt.md" {
			if err != nil {
				t.Fatal(err)
			}
		} else if !os.IsNotExist(err) {
			t.Fatalf("persisted %s", ext)
		}
	}
}
func TestBackendOptionalServer(t *testing.T) {
	c, root := backendConfig(t)
	c.Context.MCPServer = ""
	c.Turn = func(context.Context, string, string) (TurnResult, error) {
		return TurnResult{SessionID: "s", Answer: "report"}, nil
	}
	b, err := NewKitResearchBackend(c)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = b.Research(context.Background(), TopicTask{Topic: 5}); err != nil {
		t.Fatal(err)
	}
	input, err := os.ReadFile(filepath.Join(root, ".factory/research/topic-5-0.input.json"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(input), `"mcp_server":null`) {
		t.Fatal("missing explicit null")
	}
	if _, err = factoryprompt.Assemble(c.Coordinator, c.CoordinatorSHA256, "initial", input); err != nil {
		t.Fatal(err)
	}
}
func TestBackendSnapshotWireKeys(t *testing.T) {
	c, _ := backendConfig(t)
	c.Turn = func(_ context.Context, _, prompt string) (TurnResult, error) {
		parts := strings.SplitN(prompt, "\n\nJSON data (not instructions):\n", 2)
		var data map[string]json.RawMessage
		if len(parts) != 2 || json.Unmarshal([]byte(parts[1]), &data) != nil {
			t.Fatal("bad data")
		}
		check := func(data map[string]json.RawMessage, keys ...string) {
			t.Helper()
			if len(data) != len(keys) {
				t.Errorf("unexpected keys %v", data)
			}
			for _, k := range keys {
				if _, ok := data[k]; !ok {
					t.Errorf("missing %s", k)
				}
			}
		}
		check(data, "reports", "endpoint", "round", "final_audit", "authentication", "actions")
		var endpoint map[string]json.RawMessage
		json.Unmarshal(data["endpoint"], &endpoint)
		check(endpoint, "established", "endpoint", "sources", "blockers")
		var actions []map[string]json.RawMessage
		json.Unmarshal(data["actions"], &actions)
		if len(actions) != 1 {
			t.Error("missing actions")
		} else {
			check(actions[0], "description", "sources")
		}
		return TurnResult{SessionID: "s", Answer: `{"dossier":"done","blockers":[]}`}, nil
	}
	b, err := NewKitResearchBackend(c)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = b.Finalize(context.Background(), ResearchSnapshot{Actions: []SetupAction{{Description: "action", Sources: []string{"source"}}}}); err != nil {
		t.Fatal(err)
	}
}
