package factoryresearch

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryprompt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"
)

func init() {
	if os.Getenv("RESEARCH_FAKE") == "1" {
		b, _ := json.Marshal(os.Args[1:])
		os.WriteFile(os.Getenv("ARGV_PATH"), b, 0600)
		switch os.Getenv("FAKE_MODE") {
		case "separate-tool":
			exe, _ := os.Executable()
			c := exec.Command(exe)
			c.Env = append(os.Environ(), "FAKE_MODE=tool-canary")
			c.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
			c.Stdout = os.Stdout
			c.Stderr = os.Stderr
			if c.Start() != nil {
				os.Exit(8)
			}
			os.WriteFile(os.Getenv("ARGV_PATH")+".tool-pid", []byte(fmt.Sprint(c.Process.Pid)), 0600)
			c.Wait() // Ordinary Kit-style parent waits for its separate-group tool.
		case "tool-canary":
			time.Sleep(700 * time.Millisecond)
			os.WriteFile(os.Getenv("ARGV_PATH")+".canary", []byte("escaped"), 0600)
		case "orphan", "descendant":
			c := exec.Command("/bin/sh", "-c", `trap "" TERM; sleep 0.5; echo escaped > "$ARGV_PATH.canary"`)
			c.Stdout = os.Stdout
			c.Stderr = os.Stderr
			if c.Start() != nil {
				os.Exit(8)
			}
			if os.Getenv("FAKE_MODE") == "descendant" {
				time.Sleep(time.Minute)
			}
			fmt.Print("canary\nsession_id: s-fake-topic-1\n")
		case "missing":
			fmt.Print("SECRET no marker")
		case "mismatch":
			fmt.Print("canary\nsession_id: s-other\n")
		case "hang":
			time.Sleep(time.Minute)
		case "stderr-flood":
			fmt.Fprint(os.Stderr, strings.Repeat("S", 2<<20))
		case "flood":
			fmt.Print(strings.Repeat("S", 2<<20))
		case "fail":
			fmt.Print("SECRET")
			os.Exit(7)
		default:
			fmt.Print("canary\nsession_id: s-fake-topic-1\n")
		}
		os.Exit(0)
	}
}
func setup(t *testing.T) (Options, []byte) {
	t.Helper()
	w := t.TempDir()
	w, _ = filepath.EvalSymlinks(w)
	if _, e := Init(w); e != nil {
		t.Fatal(e)
	}
	d, e := os.ReadFile("../../../docs/research-prompt-draft.md")
	if e != nil {
		t.Fatal(e)
	}
	os.WriteFile(w+"/document.md", d, 0600)
	os.MkdirAll(w+"/factory/mcp", 0700)
	os.WriteFile(w+"/factory/mcp/exa.json", []byte("{}"), 0600)
	in, _ := os.ReadFile("../../../factory/tests/fixtures/research/topic-1.input.json")
	in = []byte(strings.ReplaceAll(string(in), "900", "1"))
	os.WriteFile(w+"/.factory/research/assignment.input.json", in, 0600)
	exe, _ := os.Executable()
	t.Setenv("FACTORY_RESEARCH_KIT", exe)
	t.Setenv("RESEARCH_FAKE", "1")
	t.Setenv("GORACE", "atexit_sleep_ms=0")
	t.Setenv("ARGV_PATH", w+"/argv.json")
	t.Setenv("KIT_MODEL", "configured-model")
	t.Setenv("KIT_REASONING_EFFORT", "high")
	return Options{Workspace: w, Document: w + "/document.md", SHA256: fmt.Sprintf("%x", sha256.Sum256(d)), Kind: "initial", Input: w + "/.factory/research/assignment.input.json", Timeout: time.Minute}, d
}
func TestExactAndResume(t *testing.T) {
	o, d := setup(t)
	r, e := Run(context.Background(), o)
	if e != nil || r.Status != "complete" {
		t.Fatalf("%+v %v", r, e)
	}
	in, _ := os.ReadFile(o.Input)
	p, _ := factoryprompt.Assemble(d, o.SHA256, o.Kind, in)
	var argv []string
	b, _ := os.ReadFile(o.Workspace + "/argv.json")
	json.Unmarshal(b, &argv)
	want := []string{"prompt", "--root", o.Workspace, "--provider", "openrouter", "--model", "configured-model", "--reasoning-effort", "high", "--mcp-config", o.Workspace + "/factory/mcp/exa.json", string(p)}
	if fmt.Sprint(argv) != fmt.Sprint(want) {
		t.Fatal("argv mismatch")
	}
	b, _ = os.ReadFile(o.Workspace + "/" + r.ReportPath)
	if string(b) != "canary\n" {
		t.Fatalf("report %q", b)
	}
	if _, e = Run(context.Background(), o); e == nil {
		t.Fatal("duplicate accepted")
	}
	in, _ = os.ReadFile("../../../factory/tests/fixtures/research/follow-up-1.input.json")
	in = []byte(strings.ReplaceAll(strings.ReplaceAll(string(in), "60", "1"), `"topic_id": 5`, `"topic_id": 1`))
	os.WriteFile(o.Input, in, 0600)
	o.Kind = "follow-up"
	r, e = Run(context.Background(), o)
	if e != nil || r.Status != "complete" {
		t.Fatalf("resume %+v %v", r, e)
	}
	b, _ = os.ReadFile(o.Workspace + "/argv.json")
	json.Unmarshal(b, &argv)
	if argv[len(argv)-3] != "--resume" || argv[len(argv)-2] != "s-fake-topic-1" {
		t.Fatal("resume argv")
	}
}
func TestClockAndUnsafe(t *testing.T) {
	o, _ := setup(t)
	if _, e := Init(o.Workspace); e == nil {
		t.Fatal("clock reset")
	}
	os.Remove(o.Input)
	os.Symlink(o.Document, o.Input)
	if _, e := Run(context.Background(), o); e == nil {
		t.Fatal("symlink accepted")
	}
}
func TestFailureAndBounds(t *testing.T) {
	for _, mode := range []string{"fail", "flood", "stderr-flood", "hang"} {
		t.Run(mode, func(t *testing.T) {
			o, _ := setup(t)
			t.Setenv("FAKE_MODE", mode)
			ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
			defer cancel()
			r, e := Run(ctx, o)
			if e != nil || r.Status == "complete" {
				t.Fatalf("%+v %v", r, e)
			}
			b, _ := json.Marshal(r)
			if strings.Contains(string(b), "SECRET") {
				t.Fatal("leak")
			}
			if (mode == "flood" || mode == "stderr-flood") && !r.OutputLimited {
				t.Fatal("not limited")
			}
			for _, s := range []string{"stdout", "stderr"} {
				st, e := os.Stat(o.Workspace + "/.factory/research/topic-1-initial." + s + ".txt")
				if e != nil || st.Size() > 1<<20 {
					t.Fatal("stream bound", e)
				}
			}
		})
	}
}

func followup(t *testing.T, o Options, index int) Options {
	t.Helper()
	b, e := os.ReadFile("../../../factory/tests/fixtures/research/follow-up-1.input.json")
	if e != nil {
		t.Fatal(e)
	}
	s := strings.ReplaceAll(string(b), `"topic_id": 5`, `"topic_id": 1`)
	s = strings.ReplaceAll(s, `"follow_up_index": 1`, fmt.Sprintf(`"follow_up_index": %d`, index))
	s = strings.ReplaceAll(s, `"research_budget_seconds": 60`, `"research_budget_seconds": 1`)
	if e = os.WriteFile(o.Input, []byte(s), 0600); e != nil {
		t.Fatal(e)
	}
	o.Kind = "follow-up"
	return o
}
func TestRejectInputsAndStates(t *testing.T) {
	for _, mode := range []string{"hash", "malformed", "missing-state", "order", "third", "expired", "budget", "locked", "missing-marker"} {
		t.Run(mode, func(t *testing.T) {
			o, _ := setup(t)
			switch mode {
			case "hash":
				o.SHA256 = strings.Repeat("0", 64)
			case "malformed":
				os.WriteFile(o.Input, []byte("SECRET"), 0600)
			case "missing-state":
				o = followup(t, o, 1)
			case "order", "third":
				if _, e := Run(context.Background(), o); e != nil {
					t.Fatal(e)
				}
				index := 2
				if mode == "third" {
					index = 3
				}
				o = followup(t, o, index)
			case "expired":
				c := Clock{Version: 1, StartedAt: time.Now().Add(-time.Hour), Deadline: time.Now().Add(-30 * time.Minute)}
				c.Deadline = c.StartedAt.Add(1800 * time.Second)
				b, _ := json.Marshal(c)
				os.WriteFile(o.Workspace+"/"+private+"run.json", b, 0600)
			case "budget":
				o.Timeout = time.Millisecond
			case "locked":
				os.WriteFile(o.Workspace+"/"+private+"topic-1.lock", nil, 0600)
			case "missing-marker":
				t.Setenv("FAKE_MODE", "missing")
			}
			r, e := Run(context.Background(), o)
			if mode == "missing-marker" {
				if e != nil || r.Status != "failed" {
					t.Fatal("marker accepted", e)
				}
			} else if e == nil {
				t.Fatal("invalid accepted", mode)
			}
			if e != nil && strings.Contains(e.Error(), "SECRET") {
				t.Fatal("secret leak")
			}
		})
	}
}
func TestTimeoutPreservesReport(t *testing.T) {
	o, _ := setup(t)
	first, e := Run(context.Background(), o)
	if e != nil {
		t.Fatal(e)
	}
	o = followup(t, o, 1)
	t.Setenv("FAKE_MODE", "hang")
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	r, e := Run(ctx, o)
	if e != nil || r.Status != "timeout" {
		t.Fatal(r, e)
	}
	b, e := os.ReadFile(o.Workspace + "/" + first.ReportPath)
	if e != nil || string(b) != "canary\n" {
		t.Fatal("previous report lost")
	}
	if _, e = Run(context.Background(), o); e == nil {
		t.Fatal("failed path resumed")
	}
}
func TestDescendantCleanup(t *testing.T) {
	for _, mode := range []string{"orphan", "descendant"} {
		t.Run(mode, func(t *testing.T) {
			o, _ := setup(t)
			t.Setenv("FAKE_MODE", mode)
			ctx, cancel := context.WithTimeout(context.Background(), 150*time.Millisecond)
			defer cancel()
			_, e := Run(ctx, o)
			if e != nil {
				t.Fatal(e)
			}
			time.Sleep(600 * time.Millisecond)
			if _, e = os.Stat(o.Workspace + "/argv.json.canary"); !os.IsNotExist(e) {
				t.Fatal("descendant survived")
			}
		})
	}
}
func TestSharedClock(t *testing.T) {
	o, _ := setup(t)
	c := Clock{Version: 1, StartedAt: time.Now().Add(-1798 * time.Second)}
	c.Deadline = c.StartedAt.Add(1800 * time.Second)
	b, _ := json.Marshal(c)
	os.WriteFile(o.Workspace+"/"+private+"run.json", b, 0600)
	t.Setenv("FAKE_MODE", "hang")
	start := time.Now()
	r, e := Run(context.Background(), o)
	if e != nil || r.Status != "timeout" || !r.Deadline.Equal(c.Deadline) || time.Since(start) > 3*time.Second {
		t.Fatal("shared deadline", r, e)
	}
}
func TestConcurrentTopics(t *testing.T) {
	o, _ := setup(t)
	t.Setenv("FAKE_MODE", "hang")
	o2 := o
	b, _ := os.ReadFile(o.Input)
	o2.Input = o.Workspace + "/" + private + "second.input.json"
	b = []byte(strings.ReplaceAll(string(b), `"topic_id": 1`, `"topic_id": 2`))
	os.WriteFile(o2.Input, b, 0600)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 2)
	go func() { _, e := Run(ctx, o); done <- e }()
	go func() { _, e := Run(ctx, o2); done <- e }()
	defer cancel()
	until := time.Now().Add(time.Second)
	for {
		_, a := os.Stat(o.Workspace + "/" + private + "topic-1.state.json")
		_, b := os.Stat(o.Workspace + "/" + private + "topic-2.state.json")
		if a == nil && b == nil {
			break
		}
		if time.Now().After(until) {
			t.Fatal("topics did not run concurrently")
		}
		time.Sleep(5 * time.Millisecond)
	}
	if _, e := Run(ctx, o); e == nil {
		t.Fatal("same topic concurrent run accepted")
	}
	cancel()
	for range 2 {
		if e := <-done; e != nil {
			t.Fatal(e)
		}
	}
}
func TestMismatchedSession(t *testing.T) {
	o, _ := setup(t)
	if _, e := Run(context.Background(), o); e != nil {
		t.Fatal(e)
	}
	o = followup(t, o, 1)
	t.Setenv("FAKE_MODE", "mismatch")
	r, e := Run(context.Background(), o)
	if e != nil || r.Status != "failed" || r.SessionID != "s-fake-topic-1" {
		t.Fatal("mismatch accepted", r, e)
	}
}

// The verified handle must retain its directory identity even while an ancestor
// repeatedly becomes a symlink to another directory INSIDE the workspace.
func TestPrivateRootReplacementRace(t *testing.T) {
	for _, component := range []string{".factory", ".factory/research"} {
		t.Run(component, func(t *testing.T) {
			o, _ := setup(t)
			w, e := openWorkspace(o.Workspace)
			if e != nil {
				t.Fatal(e)
			}
			defer w.Close()
			root, e := openResearch(w, false)
			if e != nil {
				t.Fatal(e)
			}
			defer root.Close()
			if e = write(root, "probe", []byte("private")); e != nil {
				t.Fatal(e)
			}
			target := o.Workspace + "/sentinel"
			os.MkdirAll(target+"/research", 0700)
			for _, dir := range []string{target, target + "/research"} {
				os.WriteFile(dir+"/probe", []byte("SENTINEL"), 0600)
				os.WriteFile(dir+"/record", []byte("DO NOT TRUNCATE"), 0600)
			}
			path := o.Workspace + "/" + component
			held := path + "-held"
			stop := make(chan struct{})
			done := make(chan error, 1)
			go func() {
				for {
					select {
					case <-stop:
						done <- nil
						return
					default:
					}
					if e := os.Rename(path, held); e != nil {
						done <- e
						return
					}
					if e := os.Symlink(target, path); e != nil {
						done <- e
						return
					}
					time.Sleep(time.Microsecond)
					if e := os.Remove(path); e != nil {
						done <- e
						return
					}
					if e := os.Rename(held, path); e != nil {
						done <- e
						return
					}
				}
			}()
			for range 100 {
				// Also race acquisition itself: an accepted root must have the
				// observed directory identity, never the symlink destination.
				fresh, err := openResearch(w, false)
				if err == nil {
					data, err := read(fresh, "probe")
					fresh.Close()
					if err != nil || string(data) != "private" {
						t.Errorf("redirected acquisition: %q %v", data, err)
						break
					}
				}
				b, e := read(root, "probe")
				if e != nil || string(b) != "private" {
					t.Errorf("redirected read: %q %v", b, e)
					break
				}
				if e = write(root, "record", []byte("private record")); e != nil {
					t.Error(e)
					break
				}
				unlock, e := lock(root, "probe.lock")
				if e != nil {
					t.Error(e)
					break
				}
				unlock()
			}
			close(stop)
			if e = <-done; e != nil {
				t.Fatal(e)
			}
			for _, dir := range []string{target, target + "/research"} {
				b, e := os.ReadFile(dir + "/record")
				if e != nil || string(b) != "DO NOT TRUNCATE" {
					t.Fatal("sentinel modified", e)
				}
				entries, _ := os.ReadDir(dir)
				for _, entry := range entries {
					if entry.Name() != "probe" && entry.Name() != "record" && entry.Name() != "research" {
						t.Fatal("redirected write", entry.Name())
					}
				}
			}
		})
	}
}
func TestTerminalSymlinkRefused(t *testing.T) {
	o, _ := setup(t)
	w, e := openWorkspace(o.Workspace)
	if e != nil {
		t.Fatal(e)
	}
	defer w.Close()
	r, e := openResearch(w, false)
	if e != nil {
		t.Fatal(e)
	}
	defer r.Close()
	os.WriteFile(o.Workspace+"/"+private+"sentinel", []byte("SECRET"), 0600)
	os.Symlink("sentinel", o.Workspace+"/"+private+"linked")
	if _, e = read(r, "linked"); e == nil {
		t.Fatal("terminal link followed")
	}
	if e = write(r, "linked", []byte("bad")); e == nil {
		t.Fatal("terminal link accepted")
	}
}

func TestTerminalReadReplacementRace(t *testing.T) {
	o, _ := setup(t)
	w, e := openWorkspace(o.Workspace)
	if e != nil {
		t.Fatal(e)
	}
	defer w.Close()
	r, e := openResearch(w, false)
	if e != nil {
		t.Fatal(e)
	}
	defer r.Close()
	path := o.Workspace + "/" + private + "probe"
	os.WriteFile(path, []byte("private"), 0600)
	sentinel := o.Workspace + "/" + private + "sentinel"
	os.WriteFile(sentinel, []byte("SECRET"), 0600)
	done := make(chan error, 1)
	go func() {
		for range 200 {
			if e := os.Rename(path, path+"-held"); e != nil {
				done <- e
				return
			}
			if e := os.Symlink("sentinel", path); e != nil {
				done <- e
				return
			}
			time.Sleep(time.Microsecond)
			if e := os.Remove(path); e != nil {
				done <- e
				return
			}
			if e := os.Rename(path+"-held", path); e != nil {
				done <- e
				return
			}
		}
		done <- nil
	}()
	for range 1000 {
		b, e := read(r, "probe")
		if e == nil && string(b) != "private" {
			t.Errorf("terminal redirected read: %q", b)
			break
		}
	}
	if e = <-done; e != nil {
		t.Fatal(e)
	}
	b, e := os.ReadFile(sentinel)
	if e != nil || string(b) != "SECRET" {
		t.Fatal("sentinel modified", e)
	}
}

func TestWorkspaceReplacementRace(t *testing.T) {
	for _, ancestor := range []bool{false, true} {
		t.Run(fmt.Sprint(ancestor), func(t *testing.T) {
			base, _ := filepath.EvalSymlinks(t.TempDir())
			workspace := base + "/parent/workspace"
			target := base + "/sentinel"
			os.MkdirAll(workspace, 0700)
			os.MkdirAll(target+"/workspace", 0700)
			os.WriteFile(workspace+"/probe", []byte("private"), 0600)
			for _, d := range []string{target, target + "/workspace"} {
				os.WriteFile(d+"/probe", []byte("SENTINEL"), 0600)
				os.WriteFile(d+"/record", []byte("UNCHANGED"), 0600)
			}
			path := workspace
			if ancestor {
				path = base + "/parent"
			}
			stop := make(chan struct{})
			done := make(chan error, 1)
			go func() {
				for {
					select {
					case <-stop:
						done <- nil
						return
					default:
					}
					if e := os.Rename(path, path+"-held"); e != nil {
						done <- e
						return
					}
					if e := os.Symlink(target, path); e != nil {
						done <- e
						return
					}
					time.Sleep(time.Microsecond)
					if e := os.Remove(path); e != nil {
						done <- e
						return
					}
					if e := os.Rename(path+"-held", path); e != nil {
						done <- e
						return
					}
					time.Sleep(time.Microsecond)
				}
			}()
			for range 4000 {
				r, e := openWorkspace(workspace)
				if e != nil {
					continue
				}
				b, e := read(r, "probe")
				if e == nil && string(b) != "private" {
					t.Error("accepted redirected workspace read")
					r.Close()
					break
				}
				if e = write(r, "record", []byte("private")); e != nil {
					t.Error(e)
				}
				r.Close()
			}
			close(stop)
			if e := <-done; e != nil {
				t.Fatal(e)
			}
			for _, d := range []string{target, target + "/workspace"} {
				b, e := os.ReadFile(d + "/record")
				if e != nil || string(b) != "UNCHANGED" {
					t.Fatal("sentinel write/truncation")
				}
			}
		})
	}
}

// BLOCKER: Kit v0.1.130 normally gives shell tools their own process groups.
// This regression intentionally remains failing until real descendant cleanup
// is implemented. The fake tool exits by itself after its delayed canary.
func TestSeparateGroupToolCleanup(t *testing.T) {
	o, _ := setup(t)
	t.Setenv("FAKE_MODE", "separate-tool")
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()
	done := make(chan struct {
		r Result
		e error
	}, 1)
	go func() {
		r, e := Run(ctx, o)
		done <- struct {
			r Result
			e error
		}{r, e}
	}()
	deadline := time.Now().Add(2 * time.Second)
	var pid int
	for {
		b, e := os.ReadFile(o.Workspace + "/argv.json.tool-pid")
		if e == nil {
			fmt.Sscan(string(b), &pid)
			break
		}
		if time.Now().After(deadline) {
			cancel()
			<-done
			t.Fatal("fake tool did not start")
		}
		time.Sleep(time.Millisecond)
	}
	// Confirm the reproducer is live and in a genuinely separate process group.
	group, e := syscall.Getpgid(pid)
	if e != nil || group != pid {
		cancel()
		<-done
		t.Fatal("tool group not established", e)
	}
	result := <-done
	if result.e != nil || result.r.Status != "timeout" {
		t.Fatal(result.r, result.e)
	}
	inspect, stop := context.WithTimeout(context.Background(), time.Second)
	snapshot, err := exec.CommandContext(inspect, "/bin/ps", "-p", fmt.Sprint(pid), "-o", "pid=,ppid=,pgid=").Output()
	stop()
	if err == nil {
		t.Logf("surviving tool pid/ppid/pgid: %s", strings.TrimSpace(string(snapshot)))
	}
	time.Sleep(800 * time.Millisecond)
	if _, e := os.Stat(o.Workspace + "/argv.json.canary"); e == nil {
		t.Fatal("normal separate-group tool survived cancellation and wrote delayed canary")
	}
}
