package factorytranscript

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestWorkerStageCodes(t *testing.T) {
	reasons := []string{"worker_input_failed", "worker_store_failed", "worker_decode_failed", "worker_export_failed", "worker_guide_failed", "worker_metadata_failed", "worker_cleanup_failed", "worker_state_failed", "worker_limits_failed"}
	for i, reason := range reasons {
		code := 40 + i
		original := errors.New("private original")
		err := fmt.Errorf("wrapped: %w", stageError(code, original))
		if WorkerExitCode(err) != code || WorkerHostReason(code) != reason || !errors.Is(err, original) {
			t.Fatalf("mapping %d", code)
		}
		if WorkerExitCode(stageError(47, err)) != code {
			t.Fatal("first failure overwritten")
		}
	}
	for _, code := range []int{-1, 0, 1, 2, 7, 39, 49, 127, 130, 255} {
		if WorkerHostReason(code) != "worker_failed" {
			t.Fatalf("unknown %d", code)
		}
	}
	if WorkerExitCode(nil) != 0 || WorkerExitCode(errors.New("unknown")) != 1 {
		t.Fatal("compatibility")
	}
}

func TestWorkerObservedDecodeAndLimits(t *testing.T) {
	for _, tc := range []struct {
		name string
		data []byte
		code int
	}{
		{"decode", []byte("malformed\n"), 42},
		{"limit", make([]byte, (1<<20)+1), 48},
	} {
		t.Run(tc.name, func(t *testing.T) {
			home, work, out := exportFixture(t)
			if err := os.WriteFile(home+"/.kit/sessions/w-test/child.jsonl", tc.data, 0600); err != nil {
				t.Fatal(err)
			}
			err := Export(home, work, out, nil)
			if WorkerExitCode(err) != tc.code {
				t.Fatalf("code %d want %d", WorkerExitCode(err), tc.code)
			}
			if _, err := os.Stat(out); !os.IsNotExist(err) {
				t.Fatal("unsafe output")
			}
		})
	}
}

// Exercise selected-file callers, not merely the exit-code mapping. The worker
// CLI must preserve the same bounded reason after its deferred cleanup runs.
func TestWorkerSelectedFileLimits(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	binary := filepath.Join(t.TempDir(), "finalize-factory")
	if data, err := exec.CommandContext(ctx, "go", "build", "-o", binary, "../../cmd/finalize-factory").CombinedOutput(); err != nil {
		t.Fatalf("build worker: %v %s", err, data)
	}
	for _, mode := range []string{"export", "cli"} {
		for _, selected := range []string{"research", "report", "guide", "unsafe"} {
			t.Run(mode+"/"+selected, func(t *testing.T) {
				home, work, out := exportFixture(t)
				writeCandidate(t, work, "converged")
				path := work + "/guides/example/research.md"
				want := 48
				switch selected {
				case "research":
					path = work + "/.factory/research/dossier.md"
					if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
						t.Fatal(err)
					}
				case "report":
					path = work + "/.factory/run-report.json"
				case "unsafe":
					want = 41
					if err := os.Link(path, work+"/alias"); err != nil {
						t.Fatal(err)
					}
				}
				if selected != "unsafe" {
					if err := os.WriteFile(path, bytes.Repeat([]byte("x"), (1<<20)+1), 0600); err != nil {
						t.Fatal(err)
					}
				}
				if mode == "export" {
					err := Export(home, work, out, nil)
					if WorkerExitCode(err) != want || !errors.Is(err, errUnsafe) {
						t.Fatalf("code %d want %d; unsafe identity %v", WorkerExitCode(err), want, errors.Is(err, errUnsafe))
					}
					if err.Error() != WorkerHostReason(want) {
						t.Fatal("non-enum error text")
					}
				} else {
					private := filepath.Dir(home)
					if err := os.Chmod(private, 0700); err != nil {
						t.Fatal(err)
					}
					if err := os.Mkdir(private+"/host", 0700); err != nil {
						t.Fatal(err)
					}
					result := private + "/host/result.json"
					lifecycle := []byte(`{"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","termination":"completed","exit_code":0,"container_removed":true}`)
					if err := os.WriteFile(result, lifecycle, 0600); err != nil {
						t.Fatal(err)
					}
					output, err := exec.CommandContext(ctx, binary, private, result, filepath.Dir(out)).CombinedOutput()
					var exit *exec.ExitError
					if !errors.As(err, &exit) || exit.ExitCode() != want {
						t.Fatalf("worker exit %v want %d", err, want)
					}
					if string(output) != "factory finalization: incomplete\n" {
						t.Fatal("non-generic CLI diagnostic")
					}
					out = filepath.Join(filepath.Dir(out), "session-transcript.json")
				}
				if _, err := os.Lstat(out); !os.IsNotExist(err) {
					t.Fatal("unsafe output published")
				}
			})
		}
	}
}
