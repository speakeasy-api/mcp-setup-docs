// supervise-factory owns one host-created, run-labelled Docker container.
// Completion is a lifecycle fact, never a publication or report-validation gate.
package main

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryrun"
)

type options struct{ containerID, controlDir, runID, result, finalizer, exportDir string }

// Unexported settings are injected only by in-package tests. CLI/env have no
// deadline knobs and production constructs these constants unconditionally.
type settings struct {
	docker                                                     string
	commandLimit, research, writing, outer, poll, finalization time.Duration
}

func production() settings {
	return settings{"docker", 10 * time.Second, 1800 * time.Second, 900 * time.Second, 2700 * time.Second, 100 * time.Millisecond, 300 * time.Second}
}

type result struct {
	Version          int    `json:"version"`
	RunID            string `json:"run_id"`
	Termination      string `json:"termination"`
	ExitCode         int    `json:"exit_code"`
	ContainerRemoved bool   `json:"container_removed"`
	ModelTermination string `json:"model_termination"`
	ModelExitCode    int    `json:"model_exit_code"`
}
type limitedBuffer struct{ bytes.Buffer }

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if b.Len()+len(p) > 4096 {
		return 0, errors.New("docker response too large")
	}
	return b.Buffer.Write(p)
}
func command(ctx context.Context, s settings, limit time.Duration, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()
	cmd := exec.CommandContext(ctx, s.docker, args...)
	cmd.WaitDelay = 50 * time.Millisecond
	var out limitedBuffer
	cmd.Stdout = &out
	cmd.Stderr = io.Discard
	err := cmd.Run()
	return strings.TrimSpace(out.String()), err
}
func validHex(s string, n int) bool {
	_, err := hex.DecodeString(s)
	return err == nil && len(s) == n && strings.ToLower(s) == s
}

// Result/raw output lives in a host-only private directory, never /control.
// Verify the parent identity before using the retained handle. Do not follow
// symlink ancestors or reopen this textual path for any subsequent write.
func resultRoot(o options) (*os.Root, string, error) {
	if !filepath.IsAbs(o.result) || filepath.Clean(o.result) != o.result {
		return nil, "", errors.New("unsafe result")
	}
	parent := filepath.Dir(o.result)
	resolved, err := filepath.EvalSymlinks(parent)
	if err != nil || resolved != parent || parent == o.controlDir || strings.HasPrefix(parent, o.controlDir+string(os.PathSeparator)) {
		return nil, "", errors.New("unsafe result parent")
	}
	expected, err := os.Lstat(parent)
	if err != nil || !expected.IsDir() || expected.Mode().Perm() != 0700 {
		return nil, "", errors.New("private result parent required")
	}
	root, err := os.OpenRoot(parent)
	if err != nil {
		return nil, "", err
	}
	actual, err := root.Stat(".")
	if err != nil || !os.SameFile(expected, actual) {
		root.Close()
		return nil, "", errors.New("result parent replaced")
	}
	name := filepath.Base(o.result)
	old, err := root.Lstat(name)
	if err == nil {
		if !old.Mode().IsRegular() {
			root.Close()
			return nil, "", errors.New("unsafe old result")
		}
		err = root.Remove(name)
	}
	if err != nil && !os.IsNotExist(err) {
		root.Close()
		return nil, "", err
	}
	return root, name, nil
}
func saveResult(root *os.Root, name string, r result) error {
	id, err := factoryrun.NewRunID()
	if err != nil {
		return err
	}
	temp := ".result-" + id
	f, err := root.OpenFile(temp, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	defer root.Remove(temp)
	err = json.NewEncoder(f).Encode(r)
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	// Name was cleared before execution; no-replace refuses unexpected writers.
	return root.Link(temp, name)
}
func cleanup(s settings, id string) bool { return cleanupUntil(context.Background(), s, id) }
func cleanupUntil(ctx context.Context, s settings, id string) bool {
	// Model cancellation does not cancel cleanup, but the original finalization
	// deadline caps both removal and confirmation.
	_, removeErr := command(ctx, s, s.commandLimit, "rm", "--force", id)
	remaining, confirmErr := command(ctx, s, s.commandLimit, "ps", "--all", "--no-trunc", "--filter", "id="+id, "--format", "{{.ID}}")
	return removeErr == nil && confirmErr == nil && remaining == ""
}
func supervise(ctx context.Context, o options, s settings) int {
	if !validHex(o.containerID, 64) || !validHex(o.runID, 32) {
		return 2
	}
	root, name, pathErr := resultRoot(o)
	if root != nil {
		defer root.Close()
	}
	r := result{Version: 1, RunID: o.runID, Termination: "lifecycle_invalid", ExitCode: 1}
	owner, err := command(context.Background(), s, s.commandLimit, "inspect", "--format", `{{index .Config.Labels "factory.run-id"}}`, o.containerID)
	if err != nil || owner != o.runID {
		r.Termination = "cleanup_failed" // ownership unproven: never remove this container
		if root != nil {
			_ = saveResult(root, name, r)
		}
		return 1
	}
	// Every path after ownership verification removes this exact immutable ID.
	budget := s.finalization
	if budget == 0 {
		budget = 300 * time.Second
	}
	deadline := time.Time{}
	ended := func(at time.Time) {
		if deadline.IsZero() {
			deadline = at.Add(budget)
		}
	}
	if pathErr == nil {
		r.Termination, r.ExitCode = runContainerEnded(ctx, o, s, root, ended)
	}
	ended(time.Now()) // only for failure before model startup
	finalContext, cancelFinal := context.WithDeadline(context.Background(), deadline)
	defer cancelFinal()
	r.ModelTermination, r.ModelExitCode = r.Termination, r.ExitCode
	r.ContainerRemoved = cleanupUntil(finalContext, s, o.containerID)
	if !r.ContainerRemoved {
		r.Termination = "cleanup_failed"
		r.ExitCode = 1
	}
	if root == nil || saveResult(root, name, r) != nil {
		return 1
	}
	if o.finalizer != "" {
		if !r.ContainerRemoved || finalContext.Err() != nil {
			return 1
		}
		// Host-created executable beside the trusted result, never model argv.
		if o.finalizer != filepath.Join(filepath.Dir(o.result), "finalize-factory") || !filepath.IsAbs(o.exportDir) {
			return 1
		}
		info, e := root.Lstat("finalize-factory")
		if e != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0022 != 0 {
			return 1
		}
		st, ok := info.Sys().(*syscall.Stat_t)
		if !ok || st.Nlink != 1 || st.Uid != uint32(os.Geteuid()) {
			return 1
		}
		cmd := exec.CommandContext(finalContext, o.finalizer, filepath.Dir(filepath.Dir(o.result)), o.result, o.exportDir)
		// Host validators are trusted non-detaching subprocesses. Kill their
		// group on this same deadline; model cleanup remains container removal.
		cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
		cmd.Cancel = func() error { return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL) }

		cmd.Env = []string{"OPENROUTER_API_KEY=" + os.Getenv("OPENROUTER_API_KEY")}
		cmd.Stdout, cmd.Stderr = io.Discard, io.Discard
		cmd.WaitDelay = 50 * time.Millisecond
		if cmd.Run() != nil || finalContext.Err() != nil {
			return 1
		}
	}
	if r.Termination == "completed" && r.ContainerRemoved {
		return 0
	}
	return 1
}
func runContainer(ctx context.Context, o options, s settings, root *os.Root) (string, int) {
	return runContainerEnded(ctx, o, s, root, func(time.Time) {})
}
func runContainerEnded(ctx context.Context, o options, s settings, root *os.Root, ended func(time.Time)) (string, int) {
	var phases *factoryrun.Deadlines
	var terminalObserved time.Time
	finish := func(reason string, code int) (string, int) {
		at := time.Now()
		if !terminalObserved.IsZero() {
			at = terminalObserved
		}
		if phases != nil && (reason == "research_timeout" || reason == "writing_timeout") {
			at = phases.Research
			if phases.Begun {
				at = phases.Writing
			}
			if phases.Outer.Before(at) {
				at = phases.Outer
			}
		}
		ended(at) // MUST happen before any deferred log/wait/descriptor teardown.
		return reason, code
	}
	control, err := factoryrun.OpenControl(o.controlDir, o.runID)
	if err != nil {
		return finish("lifecycle_invalid", 1)
	}
	defer control.Close()
	stdout, err := root.OpenFile("container.stdout", os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return finish("lifecycle_invalid", 1)
	}
	defer stdout.Close()
	stderr, err := root.OpenFile("container.stderr", os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return finish("lifecycle_invalid", 1)
	}
	defer stderr.Close()
	now := time.Now()
	d := factoryrun.Start(now)
	phases = &d
	d.Research = now.Add(s.research)
	d.Outer = now.Add(s.outer)
	if _, err := command(ctx, s, s.commandLimit, "start", o.containerID); err != nil {
		if failure := d.Check(time.Now()); failure != "" {
			return finish(failure, 1)
		}
		return finish("lifecycle_invalid", 1)
	}
	work, cancel := context.WithCancel(ctx)
	defer cancel()
	// No raw bytes ever reach the supervisor's stdout/stderr or trusted result.
	logs := exec.CommandContext(work, s.docker, "logs", "--follow", o.containerID)
	logs.Stdout = stdout
	logs.Stderr = stderr
	logs.WaitDelay = 50 * time.Millisecond
	if logs.Start() != nil {
		return finish("lifecycle_invalid", 1)
	}
	logsDone := make(chan error, 1)
	go func() { logsDone <- logs.Wait() }()
	defer func() { cancel(); <-logsDone }()
	type waited struct {
		text string
		err  error
	}
	done := make(chan waited, 1)
	go func() {
		text, err := command(work, s, s.outer+s.commandLimit, "wait", o.containerID)
		done <- waited{text, err}
	}()
	waitReceived := false
	defer func() {
		cancel()
		if !waitReceived {
			<-done
		}
	}()
	ticker := time.NewTicker(s.poll)
	defer ticker.Stop()
	for {
		var finished *waited
		select {
		case <-ctx.Done():
			return finish("lifecycle_invalid", 1)
		case w := <-done:
			terminalObserved = time.Now()
			waitReceived = true
			finished = &w
		case <-ticker.C:
		}
		// Host receipt time, not file timestamps or Docker wall time, arbitrates.
		now = time.Now()
		if failure := d.Check(now); failure != "" {
			return finish(failure, 1)
		}
		yes, err := control.Read()
		now = time.Now()
		if err != nil {
			return finish(d.Reject(now), 1)
		}
		if yes && !d.Begun {
			if failure := d.Begin(now); failure != "" {
				return finish(failure, 1)
			}
			d.Writing = now.Add(s.writing)
			if d.Writing.After(d.Outer) {
				d.Writing = d.Outer
			}
		}
		if finished != nil {
			if finished.err != nil {
				return finish(d.Reject(time.Now()), 1)
			}
			code, err := strconv.Atoi(finished.text)
			if err != nil || code < 0 || code > 255 {
				return finish(d.Reject(time.Now()), 1)
			}
			termination := d.Complete(time.Now(), code)
			if termination != "completed" && code == 0 {
				code = 1
			}
			return finish(termination, code)
		}
	}
}
func run(ctx context.Context, args []string) int { return runWithSettings(ctx, args, production()) }
func runWithSettings(ctx context.Context, args []string, s settings) int {
	fs := flag.NewFlagSet("supervise-factory", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var o options
	fs.StringVar(&o.containerID, "container-id", "", "owned full container ID")
	fs.StringVar(&o.controlDir, "control-dir", "", "private control mount")
	fs.StringVar(&o.runID, "run-id", "", "host run ID")
	fs.StringVar(&o.result, "result", "", "host-only result file")
	fs.StringVar(&o.finalizer, "finalizer", "", "trusted host finalizer beside result")
	fs.StringVar(&o.exportDir, "export-dir", "", "host-only export directory")
	if fs.Parse(args) != nil || fs.NArg() != 0 {
		return 2
	}
	return supervise(ctx, o, s)
}
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	os.Exit(run(ctx, os.Args[1:]))
}
