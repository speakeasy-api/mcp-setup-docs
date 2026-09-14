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

// Inject context errors at synchronous host boundaries without clock races.
type errorAtBoundary struct {
	context.Context
	reached func() bool
	err     error
}

func (c errorAtBoundary) Err() error {
	if c.reached() {
		return c.err
	}
	return nil
}

func TestLateContextReason(t *testing.T) {
	for _, point := range []string{"before-promotion", "guide-renamed", "report-written", "ready-written"} {
		for _, cause := range []error{context.Canceled, context.DeadlineExceeded} {
			t.Run(point+"/"+cause.Error(), func(t *testing.T) {
				private, out := completeFixture(t)
				calls := 0
				reached := func() bool {
					switch point {
					case "before-promotion":
						calls++
						return calls >= 2
					case "guide-renamed":
						_, e := os.Stat(out + "/guide")
						return e == nil
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
				eligibility := errorAtBoundary{context.Background(), reached, cause}
				if CompleteHost(context.Background(), eligibility, private, out, true, true, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") == nil {
					t.Fatal("late context accepted")
				}
				assertRevoked(t, out)
				b, _ := os.ReadFile(out + "/finalization.json")
				var s finalization
				json.Unmarshal(b, &s)
				want := "context_cancelled"
				if cause == context.DeadlineExceeded {
					want = "context_deadline"
				}
				if s.HostReason != want {
					t.Fatalf("reason %s, want %s", s.HostReason, want)
				}
				if s.Primary != "converged" {
					t.Fatal("primary changed")
				}
			})
		}
	}
}

func TestEarlierFailureSurvivesLateContext(t *testing.T) {
	for _, worker := range []bool{false, true} {
		t.Run(fmt.Sprint(worker), func(t *testing.T) {
			private, out := completeFixture(t)
			want := "worker_failed"
			if worker {
				os.WriteFile(out+"/.finalizing/run-report.json", []byte("invalid"), 0600)
				want = "export_validation_failed"
			}
			eligibility := errorAtBoundary{context.Background(), func() bool { return true }, context.DeadlineExceeded}
			if CompleteHost(context.Background(), eligibility, private, out, worker, true, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") == nil {
				t.Fatal("failure accepted")
			}
			b, _ := os.ReadFile(out + "/finalization.json")
			var s finalization
			json.Unmarshal(b, &s)
			if s.HostReason != want {
				t.Fatalf("reason %s, want %s", s.HostReason, want)
			}
		})
	}
}

func TestLateCleanupContextReason(t *testing.T) {
	for _, point := range []string{"before-promotion", "guide-renamed"} {
		for _, cause := range []error{context.Canceled, context.DeadlineExceeded} {
			t.Run(point+"/"+cause.Error(), func(t *testing.T) {
				private, out := completeFixture(t)
				if e := os.WriteFile(out+"/.finalizing/session-transcript.json", []byte(`{}`), 0600); e != nil {
					t.Fatal(e)
				}
				reached := func() bool {
					name := "session-transcript.json"
					if point == "guide-renamed" {
						name = "guide"
					}
					_, e := os.Stat(out + "/" + name)
					return e == nil
				}
				ctx := errorAtBoundary{context.Background(), reached, cause}
				if CompleteHost(ctx, context.Background(), private, out, true, true, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") == nil {
					t.Fatal("late context accepted")
				}
				assertRevoked(t, out)
				b, _ := os.ReadFile(out + "/finalization.json")
				var s finalization
				json.Unmarshal(b, &s)
				want := "context_cancelled"
				if cause == context.DeadlineExceeded {
					want = "context_deadline"
				}
				if s.HostReason != want {
					t.Fatalf("reason %s, want %s", s.HostReason, want)
				}
			})
		}
	}
}
