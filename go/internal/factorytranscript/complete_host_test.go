package factorytranscript

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func completeFixture(t *testing.T) (string, string) {
	t.Helper()
	t.Setenv("GITHUB_RUN_ID", "")
	t.Setenv("GITHUB_RUN_ATTEMPT", "")
	private, _ := filepath.EvalSymlinks(t.TempDir())
	out, _ := filepath.EvalSymlinks(t.TempDir())
	os.Chmod(private, 0700)
	os.Chmod(out, 0700)
	for _, path := range []string{private + "/host", private + "/records", out + "/.finalizing/guide"} {
		if err := os.MkdirAll(path, 0700); err != nil {
			t.Fatal(err)
		}
	}
	os.WriteFile(private+"/host/result.json", []byte(`{"version":1,"termination":"completed","exit_code":0,"container_removed":true}`), 0600)
	os.WriteFile(private+"/host/container.stdout", []byte("FAKE-RAW"), 0600)
	for _, name := range guideNames {
		os.WriteFile(out+"/.finalizing/guide/"+name, []byte("public"), 0600)
	}
	os.WriteFile(out+"/.finalizing/run-report.json", candidateReport("converged"), 0600)
	data, _ := json.Marshal(finalization{Version: 1, HostRunID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Primary: "converged", Readable: "ready", Partial: true, PublicationReady: true})
	os.WriteFile(out+"/.finalizing/finalization.json", data, 0600)
	return private, out
}

type cancelAtBoundary struct {
	context.Context
	cancel  context.CancelFunc
	reached func() bool
}

func (c cancelAtBoundary) Err() error {
	if c.reached() {
		c.cancel()
	}
	return c.Context.Err()
}
func assertRevoked(t *testing.T, out string) {
	t.Helper()
	if _, err := os.Stat(out + "/guide"); !os.IsNotExist(err) {
		t.Fatal("unready guide survived")
	}
	data, err := os.ReadFile(out + "/run-report.json")
	if err != nil {
		t.Fatal(err)
	}
	report, err := decodeReport(data)
	if err != nil || report["outcome"] != "failed" {
		t.Fatal("fallback not schema-valid failed")
	}
	data, err = os.ReadFile(out + "/finalization.json")
	if err != nil {
		t.Fatal(err)
	}
	var state finalization
	if json.Unmarshal(data, &state) != nil || state.PublicationReady {
		t.Fatal("unready marker survived")
	}
}
func TestCancellationCommitArbitration(t *testing.T) {
	for _, point := range []string{"before-promotion", "guide-renamed", "report-written", "ready-written"} {
		t.Run(point, func(t *testing.T) {
			private, out := completeFixture(t)
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			reached := func() bool {
				switch point {
				case "before-promotion":
					return true
				case "guide-renamed":
					_, err := os.Stat(out + "/guide")
					return err == nil
				case "report-written":
					b, _ := os.ReadFile(out + "/run-report.json")
					r, e := decodeReport(b)
					return e == nil && r["outcome"] == "converged"
				default:
					b, _ := os.ReadFile(out + "/finalization.json")
					var s finalization
					return json.Unmarshal(b, &s) == nil && s.PublicationReady
				}
			}
			eligibility := cancelAtBoundary{ctx, cancel, reached}
			if CompleteHost(context.Background(), eligibility, private, out, true, true, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") == nil {
				t.Fatal("cancellation before commit accepted")
			}
			assertRevoked(t, out)
			if _, err := os.Stat(private + "/host/container.stdout"); !os.IsNotExist(err) {
				t.Fatal("signal cancelled cleanup")
			}
		})
	}
}
func TestCleanupDeadlineCannotPromote(t *testing.T) {
	private, out := completeFixture(t)
	const count = 8192
	for i := 0; i < count; i++ {
		if err := os.WriteFile(filepath.Join(private, "records", fmt.Sprint(i)), []byte("FAKE"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	started := time.Now()
	err := CompleteHost(ctx, context.Background(), private, out, true, true, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	if err == nil || ctx.Err() != context.DeadlineExceeded {
		t.Fatal("cleanup budget did not expire")
	}
	if time.Since(started) > 2*time.Second {
		t.Fatal("fixture cleanup/revocation unbounded")
	}
	entries, e := os.ReadDir(private + "/records")
	if e != nil || len(entries) == 0 || len(entries) >= count {
		t.Fatal("fixture did not expire during traversal")
	}
	assertRevoked(t, out)
	if _, e := os.Stat(out + "/.finalizing"); !os.IsNotExist(e) {
		t.Fatal("owned stage not revoked")
	}
}

func TestHostObservedReason(t *testing.T) {
	for _, tc := range []struct{ name, want string }{
		{"worker", "worker_failed"}, {"missing", "stage_missing_or_invalid"},
		{"cleanup", "context_deadline"}, {"invalid", "stage_missing_or_invalid"},
		{"success", "none"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			private, out := completeFixture(t)
			ctx := context.Background()
			if tc.name == "cleanup" {
				var cancel context.CancelFunc
				ctx, cancel = context.WithDeadline(ctx, time.Now().Add(-time.Second))
				defer cancel()
			}
			if tc.name == "missing" {
				os.RemoveAll(out + "/.finalizing")
			}
			if tc.name == "invalid" {
				os.WriteFile(out+"/.finalizing/finalization.json", []byte(`{"version":1,"reason":"secret"}`), 0600)
			}
			err := CompleteHost(ctx, context.Background(), private, out, tc.name != "worker", true, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
			if (err == nil) != (tc.name == "success") {
				t.Fatal("wrong status")
			}
			data, e := os.ReadFile(out + "/finalization.json")
			if e != nil {
				t.Fatal(e)
			}
			var state map[string]any
			if json.Unmarshal(data, &state) != nil {
				t.Fatal("invalid json")
			}
			if state["host_reason"] != tc.want {
				t.Fatalf("reason = %v, want %s", state["host_reason"], tc.want)
			}
			if tc.name == "worker" && (state["primary_outcome"] != "converged" || state["publication_ready"] != false) {
				t.Fatal("diagnostic changed primary or released guide")
			}
		})
	}
}
