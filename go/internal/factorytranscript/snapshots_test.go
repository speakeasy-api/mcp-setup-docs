package factorytranscript

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func candidateReport(outcome string) []byte {
	artifacts := []string{}
	if outcome == "converged" {
		artifacts = []string{"research.md", "meta.yaml", "external.md", "speakeasy.md"}
	}
	b, _ := json.Marshal(map[string]any{"schema_version": 1, "outcome": outcome, "provider": "Example", "slug": "example", "persona": "admin", "summary": "Public outcome synthetic-report-secret", "open_questions": []string{}, "blockers": []string{}, "nits": []string{}, "review_rounds": 0, "artifacts": artifacts})
	return b
}
func writeCandidate(t *testing.T, work, outcome string) {
	t.Helper()
	if err := os.MkdirAll(work+"/.factory", 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(work+"/.factory/run-report.json", candidateReport(outcome), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(work+"/guides/example", 0700); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"research.md", "meta.yaml", "external.md", "speakeasy.md"} {
		if err := os.WriteFile(work+"/guides/example/"+name, []byte("Public draft synthetic-report-secret"), 0600); err != nil {
			t.Fatal(err)
		}
	}
}
func TestGuideSnapshots(t *testing.T) {
	for _, outcome := range []string{"converged", "failed", "blocked"} {
		t.Run(outcome, func(t *testing.T) {
			home, work, out := exportFixture(t)
			writeCandidate(t, work, outcome)
			if err := Export(home, work, out, []string{"synthetic-report-secret"}); err != nil {
				t.Fatal(err)
			}
			b, err := os.ReadFile(out)
			if err != nil {
				t.Fatal(err)
			}
			if bytes.Contains(b, []byte("synthetic-report-secret")) || !bytes.Contains(b, []byte("guide/research.md")) {
				t.Fatal("missing or unsanitized snapshot")
			}
			var artifact readableArtifact
			if json.Unmarshal(b, &artifact) != nil {
				t.Fatal("invalid artifact")
			}
			for _, f := range artifact.Files {
				if f.Name == "run-report.json" {
					var r map[string]any
					if json.Unmarshal([]byte(f.Text), &r) != nil {
						t.Fatal("invalid report snapshot")
					}
					if outcome != "converged" && len(r["artifacts"].([]any)) != 0 {
						t.Fatal("nonconverged artifact claims")
					}
				}
			}
			if _, err := os.Stat(work + "/guide"); !os.IsNotExist(err) {
				t.Fatal("installed a guide")
			}
		})
	}
}
func TestUnsafeGuideSnapshot(t *testing.T) {
	for _, kind := range []string{"symlink", "hardlink", "invalid-report", "unknown-report-field", "report-symlink"} {
		t.Run(kind, func(t *testing.T) {
			home, work, out := exportFixture(t)
			writeCandidate(t, work, "converged")
			switch kind {
			case "symlink":
				os.Remove(work + "/guides/example/meta.yaml")
				os.Symlink("/etc/passwd", work+"/guides/example/meta.yaml")
			case "hardlink":
				os.Link(work+"/guides/example/meta.yaml", work+"/alias")
			case "invalid-report":
				os.WriteFile(work+"/.factory/run-report.json", []byte(`{"slug":"../../outside"}`), 0600)
			case "unknown-report-field":
				b := candidateReport("converged")
				b = append([]byte(`{"unknown":"private",`), b[1:]...)
				os.WriteFile(work+"/.factory/run-report.json", b, 0600)
			case "report-symlink":
				os.Remove(work + "/.factory/run-report.json")
				os.Symlink("/etc/passwd", work+"/.factory/run-report.json")
			}
			if err := Export(home, work, out, nil); err == nil {
				t.Fatal("unsafe snapshot accepted")
			}
			if _, err := os.Lstat(out); !os.IsNotExist(err) {
				t.Fatal("unsafe output")
			}
		})
	}
}
func TestConfidentialTextOmission(t *testing.T) {
	for _, text := range []string{`{"tenant":"private-tenant","observed_at":"now","servers":[{"name":"PRIVATE-CATALOG"}]}`, "HOME=/private\nPATH=/private\nPRIVATE_VALUE=PRIVATE-ENV", `{"access_token":"PRIVATE-TOKEN","refresh_token":"PRIVATE-REFRESH","token_type":"Bearer"}`} {
		home, work, out := exportFixture(t)
		part, _ := json.Marshal(map[string]any{"Text": map[string]any{"text": text, "metadata": map[string]any{}}})
		os.WriteFile(home+"/.kit/sessions/w-test/private.jsonl", fixtureRecord(string(part)), 0600)
		if err := Export(home, work, out, nil); err != nil {
			t.Fatal(err)
		}
		b, _ := os.ReadFile(out)
		if bytes.Contains(b, []byte("PRIVATE-")) {
			t.Fatal("private noncredential content leaked")
		}
		if !bytes.Contains(b, []byte("confidential_content")) {
			t.Fatal("dishonest omission")
		}
	}
}

func TestCandidateSchemaParity(t *testing.T) {
	// Compare accepted reports with the existing repository validator, rather than
	// treating the exporter's stricter path-selection guard as a new schema owner.
	for _, outcome := range []string{"converged", "failed", "blocked"} {
		b := candidateReport(outcome)
		if _, err := decodeReport(b); err != nil {
			t.Fatal(err)
		}
		path := filepath.Join(t.TempDir(), "report.json")
		if err := os.WriteFile(path, b, 0600); err != nil {
			t.Fatal(err)
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		err := exec.CommandContext(ctx, "bash", "../../../factory/scripts/validate-report.sh", path).Run()
		cancel()
		if err != nil {
			t.Fatal("existing validator disagrees", err)
		}
	}
}
func TestSnapshotMutationAndOutputContamination(t *testing.T) {
	for _, kind := range []string{"report", "guide", "guide-parent", "output-alias"} {
		t.Run(kind, func(t *testing.T) {
			home, work, out := exportFixture(t)
			writeCandidate(t, work, "converged")
			factory := func(known []string) (*Sanitizer, error) {
				switch kind {
				case "report":
					os.WriteFile(work+"/.factory/run-report.json", candidateReport("failed"), 0600)
				case "guide":
					os.WriteFile(work+"/guides/example/meta.yaml", []byte("changed content"), 0600)
				case "guide-parent":
					os.Rename(work+"/guides/example", work+"/guides/displaced")
					os.Symlink("displaced", work+"/guides/example")
				case "output-alias":
					if err := os.Link(work+"/guides/example/meta.yaml", out); err != nil {
						t.Fatal(err)
					}
				}
				return NewSanitizer(known)
			}
			if err := exportWithSanitizer(home, work, out, nil, factory); err == nil {
				t.Fatal("mutation accepted")
			}
			if kind != "output-alias" {
				if _, err := os.Lstat(out); !os.IsNotExist(err) {
					t.Fatal("unsafe output emitted")
				}
			}
		})
	}
}
