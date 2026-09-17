package factorycontroller

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"
)

// Transport runs one pinned Kit CLI process per turn. Configure before use;
// do not mutate or copy it after use. Args are trusted provider/model flags.
// Workspace must be the controller-owned absolute physical workspace path.
// Environment inheritance relies on the isolated container environment; only
// HOME is overridden here. Args must not override root or other lifecycle flags.
// Process-group cleanup requires a Unix host. Descendants must not detach.
type Transport struct {
	KitPath        string
	Workspace      string
	Home           string
	Args           []string
	MaxOutputBytes int
	TermGrace      time.Duration
	sessions       sync.Map
}

type TurnResult struct {
	SessionID string
	Answer    string
}

// maximumPromptBytes is the supported single-argv prompt bound, below Linux
// MAX_ARG_STRLEN on 4 KiB-page systems (including its terminating NUL).
// This is an execution bound, not permission to relax content limits.
const maximumPromptBytes = 120 << 10

var sessionIdentity = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,255}$`)

// Turn never retries an ambiguous turn or returns an identity from failed output.
// Error messages deliberately omit prompts, argv, output, and filesystem paths.
func (t *Transport) Turn(ctx context.Context, sessionID, prompt string) (TurnResult, error) {
	failure := func(message string) (TurnResult, error) { return TurnResult{}, errors.New(message) }
	if len(prompt) > maximumPromptBytes || strings.ContainsRune(prompt, 0) {
		return failure("invalid transport prompt")
	}
	if sessionID != "" && !sessionIdentity.MatchString(sessionID) {
		return failure("invalid session identity")
	}
	if t.KitPath == "" || t.Workspace == "" || t.Home == "" {
		return failure("invalid transport configuration")
	}
	if sessionID != "" {
		value, _ := t.sessions.LoadOrStore(sessionID, make(chan struct{}, 1))
		lock := value.(chan struct{})
		select {
		case lock <- struct{}{}:
			defer func() { <-lock }()
		case <-ctx.Done():
			return TurnResult{}, ctx.Err()
		}
	}
	if err := ctx.Err(); err != nil {
		return TurnResult{}, err
	}
	limit := t.MaxOutputBytes
	if limit <= 0 {
		limit = 8 << 20
	}
	grace := t.TermGrace
	if grace <= 0 {
		grace = 250 * time.Millisecond
	}
	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	capture := &turnCapture{limit: limit, cancel: cancel}
	args := append([]string{"prompt"}, t.Args...)
	if sessionID != "" {
		args = append(args, "--resume", sessionID)
	}
	args = append(args, "--root", t.Workspace, "--", prompt)
	cmd := exec.Command(t.KitPath, args...)
	cmd.Dir = t.Workspace
	cmd.Env = append(os.Environ(), "HOME="+t.Home)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdout = capture
	cmd.Stderr = stderrCapture{capture}
	// Bound inherited pipe lifetimes even if the direct process exits first.
	cmd.WaitDelay = grace
	if err := cmd.Start(); err != nil {
		return failure("kit process start failed")
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	terminate := func() {
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM)
		// Do not end the grace period when only the group leader exits.
		time.Sleep(grace)
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
	var waitErr error
	select {
	case <-runCtx.Done():
		terminate()
		waitErr = <-done
	case waitErr = <-done:
		if runCtx.Err() != nil || waitErr != nil {
			terminate()
		} else {
			_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		}
	}
	if err := ctx.Err(); err != nil {
		return TurnResult{}, err
	}
	if capture.exceeded {
		return failure("kit output limit exceeded")
	}
	if waitErr != nil {
		return failure("kit process failed")
	}
	raw := capture.stdout.String()
	if !strings.HasSuffix(raw, "\n") {
		return failure("invalid kit terminal identity")
	}
	end := len(raw) - 1
	start := strings.LastIndex(raw[:end], "\n")
	if start < 0 || !strings.HasPrefix(raw[start+1:end], "session_id: ") {
		return failure("invalid kit terminal identity")
	}
	id := strings.TrimPrefix(raw[start+1:end], "session_id: ")
	if !sessionIdentity.MatchString(id) {
		return failure("invalid kit terminal identity")
	}
	if sessionID != "" && sessionID != id {
		return failure("kit session identity mismatch")
	}
	return TurnResult{SessionID: id, Answer: raw[:start]}, nil
}

// Both streams share a bounded byte budget; stderr is never retained.
type turnCapture struct {
	mu          sync.Mutex
	stdout      bytes.Buffer
	limit, used int
	exceeded    bool
	cancel      context.CancelFunc
}

func (b *turnCapture) write(p []byte, stdout bool) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(p) > b.limit-b.used {
		b.exceeded = true
		b.cancel()
		return 0, io.ErrShortWrite
	}
	b.used += len(p)
	if stdout {
		return b.stdout.Write(p)
	}
	return len(p), nil
}
func (b *turnCapture) Write(p []byte) (int, error) { return b.write(p, true) }

type stderrCapture struct{ b *turnCapture }

func (s stderrCapture) Write(p []byte) (int, error) { return s.b.write(p, false) }
