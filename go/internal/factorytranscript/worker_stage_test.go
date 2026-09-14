package factorytranscript

import (
	"errors"
	"fmt"
	"os"
	"testing"
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
