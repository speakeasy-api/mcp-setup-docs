package factorycontroller

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDecisionFileTransport(t *testing.T) {
	for _, mode := range []string{"large", "tampered", "replaced", "collision", "too-large"} {
		t.Run(mode, func(t *testing.T) {
			c, root := backendConfig(t)
			calls := 0
			text := strings.Repeat("evidence ", 16000)
			if mode == "too-large" {
				text = strings.Repeat("x", evidenceLimit+1)
			}
			path := filepath.Join(root, ".factory/research/decision-reconcile-0.input.json")
			if mode == "collision" {
				if e := os.WriteFile(path, []byte("existing"), 0600); e != nil {
					t.Fatal(e)
				}
			}
			c.Turn = func(_ context.Context, id, p string) (TurnResult, error) {
				calls++
				if len(p) > maximumPromptBytes {
					t.Fatal("oversize argv")
				}
				if !strings.Contains(p, ".factory/research/decision-reconcile-0.input.json") {
					t.Fatal("missing file reference")
				}
				data, e := os.ReadFile(path)
				if e != nil || !strings.Contains(string(data), text) {
					t.Fatal("incomplete saved evidence")
				}
				if mode == "tampered" {
					os.WriteFile(path, []byte("changed"), 0600)
				}
				if mode == "replaced" {
					os.Rename(path, path+".old")
					os.WriteFile(path, data, 0600)
				}
				return TurnResult{SessionID: "decision-1", Answer: `{"authentication":"token","actions":[{"description":"action","sources":["source"]}],"follow_ups":[],"blockers":[],"dossier":""}`}, nil
			}
			b, e := NewKitResearchBackend(c)
			if e != nil {
				t.Fatal(e)
			}
			_, e = b.Reconcile(context.Background(), ResearchSnapshot{Reports: map[int]string{1: text}})
			if (e == nil) != (mode == "large") {
				t.Fatalf("mode %s error=%v", mode, e)
			}
			if (mode == "too-large" || mode == "collision") && calls != 0 {
				t.Fatal("invalid evidence launched turn")
			}
		})
	}
}
