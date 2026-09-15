package main

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

func TestRealWorkerLimitPersistence(t *testing.T) {
	for _, mode := range []string{"normal", "timeout"} {
		t.Run(mode, func(t *testing.T) {
			binary := t.TempDir() + "/finalize-factory"
			if data, err := exec.Command("go", "build", "-o", binary, "../finalize-factory").CombinedOutput(); err != nil {
				t.Fatalf("build: %v %s", err, data)
			}
			o, s, dir := fixture(t, mode)
			s.finalization = 5 * time.Second
			if mode == "timeout" {
				s.research = 50 * time.Millisecond
			}
			o.finalizer = dir + "/host/finalize-factory"
			o.exportDir = dir + "/export"
			for _, p := range []string{o.exportDir, dir + "/workspace", dir + "/home/.kit/sessions/w-test"} {
				if err := os.MkdirAll(p, 0700); err != nil {
					t.Fatal(err)
				}
			}
			data, _ := os.ReadFile(binary)
			if err := os.WriteFile(o.finalizer, data, 0700); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(dir+"/home/.kit/sessions/w-test/RAW_CANARY.jsonl", []byte(strings.Repeat("x", 1<<20+1)), 0600); err != nil {
				t.Fatal(err)
			}
			if supervise(context.Background(), o, s) != 1 {
				t.Fatal("failure accepted")
			}
			data, err := os.ReadFile(dir + "/host/host-reason.json")
			if err != nil {
				t.Fatal(err)
			}
			var got struct {
				Timings     map[string]int64 `json:"timings"`
				Termination string           `json:"termination"`
				RunID       string           `json:"run_id"`
				HostReason  string           `json:"host_reason"`
				Limit       struct {
					Category string `json:"category"`
					Observed int64  `json:"observed"`
					Allowed  int64  `json:"allowed"`
				} `json:"limit"`
			}
			if json.Unmarshal(data, &got) != nil || got.RunID != o.runID || got.HostReason != "worker_limits_failed" || got.Limit.Category != "source_bytes" || got.Limit.Observed != 1<<20+1 || got.Limit.Allowed != 1<<20 {
				t.Fatalf("missing bound evidence: %s", data)
			}
			if got.Timings["research_ms"] <= 0 || got.Timings["finalization_ms"] <= 0 {
				t.Fatalf("missing host durations: %s", data)
			}
			if mode == "timeout" && got.Termination != "research_timeout" {
				t.Fatalf("timeout overwritten: %s", data)
			}
			for _, p := range []string{"home", "workspace", "host/worker-limit.json"} {
				if _, err := os.Lstat(dir + "/" + p); !os.IsNotExist(err) {
					t.Fatalf("not cleaned: %s", p)
				}
			}
			if strings.Contains(string(data), "RAW_CANARY") {
				t.Fatal("leak")
			}
			if _, err := os.Stat(o.exportDir + "/guide"); !os.IsNotExist(err) {
				t.Fatal("publication")
			}

		})
	}
}
