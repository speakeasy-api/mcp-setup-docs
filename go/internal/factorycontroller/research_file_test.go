package factorycontroller

import (
	"context"
	"encoding/json"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryprompt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestResearchLargeTaskFileTransport(t *testing.T) {
	for _, mode := range []string{"large", "tampered", "replaced", "collision", "too-large"} {
		t.Run(mode, func(t *testing.T) {
			c, root := backendConfig(t)
			c.Context.Task = strings.Repeat("retained Speakeasy fact 日本語\n", 6000)
			if mode == "too-large" {
				c.Context.Task = strings.Repeat("x", evidenceLimit+1)
			}
			path := filepath.Join(root, ".factory/research/topic-5-0.transport.json")
			if mode == "collision" {
				if err := os.WriteFile(path, []byte("existing"), 0600); err != nil {
					t.Fatal(err)
				}
			}
			calls := 0
			c.Turn = func(_ context.Context, _, prompt string) (TurnResult, error) {
				calls++
				if len(prompt) > maximumPromptBytes {
					t.Fatal("oversize research argv")
				}
				if !strings.Contains(prompt, "topic-5-0.transport.json") || !strings.Contains(prompt, evidenceReadInstructions) {
					t.Fatal("missing bounded evidence reference")
				}
				data, err := os.ReadFile(path)
				var task initialResearchInput
				if err != nil || json.Unmarshal(data, &task) != nil || task.Task != c.Context.Task {
					t.Fatal("retained evidence truncated or changed")
				}
				original, err := factoryprompt.Assemble(c.Coordinator, c.CoordinatorSHA256, "initial", data)
				if err != nil {
					t.Fatal(err)
				}
				authority := strings.TrimSuffix(string(original), string(data)+"\n")
				if authority == string(original) || !strings.HasPrefix(prompt, authority) {
					t.Fatal("pinned authority changed during file transport")
				}
				if mode == "tampered" {
					if err := os.WriteFile(path, []byte("changed"), 0600); err != nil {
						t.Fatal(err)
					}
				}
				if mode == "replaced" {
					if err := os.Rename(path, path+".old"); err != nil {
						t.Fatal(err)
					}
					if err := os.WriteFile(path, data, 0600); err != nil {
						t.Fatal(err)
					}
				}
				return TurnResult{SessionID: "s5", Answer: "report"}, nil
			}
			b, err := NewKitResearchBackend(c)
			if err != nil {
				t.Fatal(err)
			}
			_, err = b.Research(context.Background(), TopicTask{Topic: 5})
			if (err == nil) != (mode == "large") {
				t.Fatalf("mode %s: %v", mode, err)
			}
			if (mode == "collision" || mode == "too-large") && calls != 0 {
				t.Fatal("invalid evidence launched model")
			}
			if mode == "tampered" || mode == "replaced" {
				if _, err := os.Stat(filepath.Join(root, ".factory/research/topic-5-0.report.md")); !os.IsNotExist(err) {
					t.Fatal("accepted report after evidence changed")
				}
			}
		})
	}
}
