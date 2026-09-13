package main

import (
	"context"
	"encoding/json"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryrun"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"
)

func fixture(t *testing.T, mode string) (options, settings, string) {
	t.Helper()
	dir, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"control", "host"} {
		if err := os.Mkdir(filepath.Join(dir, name), 0700); err != nil {
			t.Fatal(err)
		}
	}
	script := `#!/bin/sh
printf '%s\n' "$*" >> "$TRACE"
case "$1" in
 inspect) printf '%s\n' "$OWNER" ;;
 start) if [ "$MODE" = start-hang ]; then exec sleep 20; fi ;;
 wait) case "$MODE" in timeout|cancel|start-hang) exec sleep 20 ;; provider) echo 7 ;; *) echo 0 ;; esac ;;
 logs) printf 'PRIVATE-RAW-SECRET\n'; printf 'PRIVATE-STDERR\n' >&2 ;;
 rm) if [ "$MODE" = cleanup-fail ]; then exit 1; fi ;;
 ps) if [ "$MODE" = remains ]; then printf '%s\n' "$CONTAINER"; fi ;;
 *) exit 2 ;;
esac
`
	docker := filepath.Join(dir, "docker")
	if err := os.WriteFile(docker, []byte(script), 0700); err != nil {
		t.Fatal(err)
	}
	id := strings.Repeat("a", 32)
	t.Setenv("TRACE", filepath.Join(dir, "trace"))
	t.Setenv("OWNER", id)
	t.Setenv("MODE", mode)
	t.Setenv("CONTAINER", strings.Repeat("b", 64))
	return options{containerID: strings.Repeat("b", 64), controlDir: filepath.Join(dir, "control"), runID: id, result: filepath.Join(dir, "host", "result.json")}, settings{docker: docker, commandLimit: 2 * time.Second, research: 3 * time.Second, writing: time.Second, outer: 5 * time.Second, poll: 5 * time.Millisecond}, dir
}
func readResult(t *testing.T, path string) result {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var r result
	if json.Unmarshal(data, &r) != nil {
		t.Fatal("invalid result")
	}
	return r
}
func TestLifecycle(t *testing.T) {
	for mode, want := range map[string]string{"normal": "completed", "provider": "provider_exit", "timeout": "research_timeout", "start-hang": "lifecycle_invalid", "cleanup-fail": "cleanup_failed", "remains": "cleanup_failed"} {
		t.Run(mode, func(t *testing.T) {
			o, s, dir := fixture(t, mode)
			started := time.Now()
			code := supervise(context.Background(), o, s)
			if time.Since(started) > 8*time.Second {
				t.Fatal("unbounded command")
			}
			r := readResult(t, o.result)
			if r.Termination != want || r.ContainerRemoved != (want != "cleanup_failed") || (code == 0) != (want == "completed") {
				t.Fatal(code, r)
			}
			trace, _ := os.ReadFile(filepath.Join(dir, "trace"))
			text := string(trace)
			if !strings.Contains(text, "rm --force "+o.containerID) || !strings.Contains(text, "ps --all") {
				t.Fatal("no owned cleanup", text)
			}
			data, _ := os.ReadFile(o.result)
			if strings.Contains(string(data), "PRIVATE") {
				t.Fatal("raw leak")
			}
		})
	}
}
func TestCancellation(t *testing.T) {
	o, s, _ := fixture(t, "cancel")
	ctx, cancel := context.WithCancel(context.Background())
	timer := time.AfterFunc(300*time.Millisecond, cancel)
	defer timer.Stop()
	if supervise(ctx, o, s) == 0 {
		t.Fatal("cancel succeeded")
	}
	r := readResult(t, o.result)
	if r.Termination != "lifecycle_invalid" || !r.ContainerRemoved {
		t.Fatal(r)
	}
}
func TestForeignOwnership(t *testing.T) {
	o, s, dir := fixture(t, "normal")
	t.Setenv("OWNER", strings.Repeat("c", 32))
	if supervise(context.Background(), o, s) == 0 {
		t.Fatal("foreign accepted")
	}
	trace, _ := os.ReadFile(filepath.Join(dir, "trace"))
	if strings.Contains(string(trace), "start ") || strings.Contains(string(trace), "rm ") {
		t.Fatal("touched foreign container")
	}
}
func TestUnsafeResultAndControl(t *testing.T) {
	t.Run("result symlink", func(t *testing.T) {
		o, s, dir := fixture(t, "normal")
		target := filepath.Join(dir, "target")
		os.WriteFile(target, []byte("keep"), 0600)
		os.Symlink(target, o.result)
		if supervise(context.Background(), o, s) == 0 {
			t.Fatal("accepted result symlink")
		}
		data, _ := os.ReadFile(target)
		if string(data) != "keep" {
			t.Fatal("modified target")
		}
	})
	t.Run("control symlink cleanup", func(t *testing.T) {
		o, s, _ := fixture(t, "normal")
		real := o.controlDir
		o.controlDir += "-link"
		os.Symlink(real, o.controlDir)
		if supervise(context.Background(), o, s) == 0 {
			t.Fatal("accepted control symlink")
		}
		r := readResult(t, o.result)
		if r.Termination != "lifecycle_invalid" || !r.ContainerRemoved {
			t.Fatal(r)
		}
	})
	t.Run("stale result", func(t *testing.T) {
		o, s, _ := fixture(t, "timeout")
		os.WriteFile(o.result, []byte(`{"termination":"completed"}`), 0600)
		supervise(context.Background(), o, s)
		if readResult(t, o.result).Termination != "research_timeout" {
			t.Fatal("stale success")
		}
	})
}
func TestFakeDockerExecutable(t *testing.T) {
	o, s, _ := fixture(t, "normal")
	got, err := command(context.Background(), s, 2*time.Second, "inspect", o.containerID)
	if err != nil || got != o.runID {
		t.Fatalf("fake executable: got %q err %v", got, err)
	}
}

func TestPhaseAndCancellationFailure(t *testing.T) {
	for _, phase := range []string{"writing", "malformed", "cancel-cleanup"} {
		t.Run(phase, func(t *testing.T) {
			o, s, _ := fixture(t, "timeout")
			want := "writing_timeout"
			ctx := context.Background()
			if phase == "writing" {
				data := `{"version":1,"run_id":"` + o.runID + `","phase":"writing"}`
				if err := os.WriteFile(filepath.Join(o.controlDir, "phase.json"), []byte(data), 0600); err != nil {
					t.Fatal(err)
				}
			} else if phase == "malformed" {
				os.WriteFile(filepath.Join(o.controlDir, "phase.json"), []byte("bad"), 0600)
				want = "lifecycle_invalid"
			} else {
				t.Setenv("MODE", "cleanup-fail")
				cancelled, cancel := context.WithCancel(ctx)
				cancel()
				ctx = cancelled
				want = "cleanup_failed"
			}
			if supervise(ctx, o, s) == 0 || readResult(t, o.result).Termination != want {
				t.Fatal("wrong terminal outcome", readResult(t, o.result))
			}
		})
	}
}
func TestCLIRejectsDeadlineKnobs(t *testing.T) {
	if run(context.Background(), []string{"--research-seconds", "1"}) != 2 {
		t.Fatal("production deadline knob accepted")
	}
	p := production()
	if p.research != 1800*time.Second || p.writing != 900*time.Second || p.outer != 2700*time.Second || p.poll != 100*time.Millisecond {
		t.Fatal(p)
	}
}

// This is preliminary real supervisor evidence, NOT the required run-kit
// replacement acceptance. Docker/image absence is a failure, never a skip.
func TestDockerSupervisorBoundary(t *testing.T) {
	image := os.Getenv("FACTORY_BOUNDARY_IMAGE")
	if image == "" {
		image = "mcp-setup-docs-kit:0.1.134"
	}
	s := production()
	s.research = 2 * time.Second
	s.outer = 3 * time.Second
	if _, err := command(context.Background(), s, 5*time.Second, "image", "inspect", "--format", "{{.Id}}", image); err != nil {
		t.Fatal("Docker fixture image required", err)
	}
	for _, mode := range []string{"timeout", "normal"} {
		t.Run(mode, func(t *testing.T) {
			dir, err := filepath.EvalSymlinks(t.TempDir())
			if err != nil {
				t.Fatal(err)
			}
			for _, n := range []string{"control", "host", "workspace", "export"} {
				if err := os.Mkdir(filepath.Join(dir, n), 0700); err != nil {
					t.Fatal(err)
				}
			}
			runID, err := factoryrun.NewRunID()
			if err != nil {
				t.Fatal(err)
			}
			script := `#!/bin/bash
set -eu
read -r pid comm state ppid parent_group rest < /proc/$$/stat
export parent_group
setsid /bin/bash -c 'read -r pid comm state ppid group session rest < /proc/$$/stat; printf "%s %s %s\n" "$parent_group" "$group" "$session" > /workspace/groups; sleep 4; echo escaped > /workspace/canary' &
for ((i=0;i<100;i++)); do [[ -s /workspace/groups ]] && break; sleep .01; done
printf '{"status":"success"}\n' > /workspace/candidate.json
if [[ "$1" == timeout ]]; then sleep 30; fi
`
			fixture := filepath.Join(dir, "fake-kit")
			if err := os.WriteFile(fixture, []byte(script), 0700); err != nil {
				t.Fatal(err)
			}
			id, err := command(context.Background(), s, 10*time.Second, "create", "--platform", "linux/amd64", "--label", "factory.run-id="+runID, "--mount", "type=bind,src="+fixture+",dst=/fake-kit,readonly", "--mount", "type=bind,src="+filepath.Join(dir, "workspace")+",dst=/workspace", "--entrypoint", "/bin/bash", image, "/fake-kit", mode)
			if err != nil {
				t.Fatal("create failed", err)
			}
			t.Cleanup(func() {
				if !cleanup(s, id) { // Already removed is expected; separately prove absence.
					remaining, err := command(context.Background(), s, s.commandLimit, "ps", "--all", "--no-trunc", "--filter", "id="+id, "--format", "{{.ID}}")
					if err != nil || remaining != "" {
						t.Error("fixture cleanup failed")
					}
				}
			})
			o := options{containerID: id, controlDir: filepath.Join(dir, "control"), runID: runID, result: filepath.Join(dir, "host", "result.json")}
			code := supervise(context.Background(), o, s)
			r := readResult(t, o.result)
			want := "completed"
			if mode == "timeout" {
				want = "research_timeout"
			}
			if r.Termination != want || !r.ContainerRemoved || (code == 0) != (mode == "normal") {
				t.Fatal(code, r)
			}
			data, err := os.ReadFile(filepath.Join(dir, "workspace", "groups"))
			if err != nil {
				t.Fatal("separate group not established", err)
			}
			fields := strings.Fields(string(data))
			if len(fields) != 3 || fields[0] == fields[1] || fields[1] != fields[2] {
				t.Fatal("setsid proof invalid", string(data))
			}
			time.Sleep(4500 * time.Millisecond)
			if _, err := os.Stat(filepath.Join(dir, "workspace", "canary")); !os.IsNotExist(err) {
				t.Fatal("delayed writer survived", err)
			}
			exports, err := os.ReadDir(filepath.Join(dir, "export"))
			if err != nil || len(exports) != 0 {
				t.Fatal("installable output produced")
			}
		})
	}
}

// Only the compiled test binary recognizes this host fixture mode. Production
// CLI and environment cannot select shorter deadlines.
func TestMain(m *testing.M) {
	if len(os.Args) > 1 && os.Args[1] == "--factory-test-supervisor" {
		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer stop()
		s := production()
		s.research = 2 * time.Second
		s.outer = 3 * time.Second
		os.Exit(runWithSettings(ctx, os.Args[2:], s))
	}
	os.Exit(m.Run())
}

func TestSharedFinalizationDeadline(t *testing.T) {
	o, s, dir := fixture(t, "normal")
	s.finalization = 150 * time.Millisecond
	// Removal consumes most of the SAME finalization budget, not a fresh child one.
	docker, _ := os.ReadFile(s.docker)
	docker = []byte(strings.Replace(string(docker), "rm) if", "rm) sleep 0.10; if", 1))
	if err := os.WriteFile(s.docker, docker, 0700); err != nil {
		t.Fatal(err)
	}
	o.finalizer = dir + "/host/finalize-factory"
	o.exportDir = dir + "/export"
	os.Mkdir(o.exportDir, 0700)
	os.WriteFile(o.finalizer, []byte("#!/bin/sh\nsleep 0.10\nprintf wrong > \"$3/incorrect-success\"\n"), 0700)
	started := time.Now()
	code := supervise(context.Background(), o, s)
	if code == 0 {
		t.Fatal("finalizer got a fresh budget")
	}
	if time.Since(started) > time.Second {
		t.Fatal("finalizer unbounded")
	}
	if _, err := os.Stat(o.exportDir + "/incorrect-success"); !os.IsNotExist(err) {
		t.Fatal("late success")
	}
}
func TestFinalizerFailurePreservesLifecycle(t *testing.T) {
	o, s, dir := fixture(t, "normal")
	s.finalization = time.Second
	o.finalizer = dir + "/host/finalize-factory"
	o.exportDir = dir + "/export"
	os.Mkdir(o.exportDir, 0700)
	os.WriteFile(o.finalizer, []byte("#!/bin/sh\nexit 7\n"), 0700)
	if supervise(context.Background(), o, s) == 0 {
		t.Fatal("finalizer failure accepted")
	}
	r := readResult(t, o.result)
	if r.Termination != "completed" || !r.ContainerRemoved {
		t.Fatal("diagnostic failure replaced primary lifecycle")
	}
}

func TestFinalizerInterruptionLeavesSafeReport(t *testing.T) {
	o, s, dir := fixture(t, "normal")
	s.finalization = time.Second
	o.finalizer = dir + "/host/finalize-factory"
	o.exportDir = dir + "/export"
	os.Mkdir(o.exportDir, 0700)
	report := `{"schema_version":1,"outcome":"failed","provider":null,"slug":null,"persona":null,"summary":"Factory model execution failed.","open_questions":[],"blockers":["Factory model execution failed."],"nits":[],"review_rounds":0,"artifacts":[]}`
	script := "#!/bin/sh\nprintf '%s' '" + report + "' > \"$3/run-report.json\"\nsleep 5\nmkdir \"$3/guide\"\n"
	os.WriteFile(o.finalizer, []byte(script), 0700)
	if supervise(context.Background(), o, s) == 0 {
		t.Fatal("interrupted finalizer accepted")
	}
	data, err := os.ReadFile(o.exportDir + "/run-report.json")
	if err != nil {
		t.Fatal(err)
	}
	var parsed map[string]any
	if json.Unmarshal(data, &parsed) != nil || parsed["outcome"] != "failed" {
		t.Fatal("interruption lost safe fallback")
	}
	if _, err := os.Stat(o.exportDir + "/guide"); !os.IsNotExist(err) {
		t.Fatal("partial installable output")
	}
}
