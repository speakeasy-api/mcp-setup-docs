// Package factoryresearch supervises bounded, resumable research processes.
// It is process control, not a filesystem sandbox.
package factoryresearch

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryprompt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync/atomic"
	"time"
)

const private = ".factory/research/"

var ErrInvalid = errors.New("invalid_research_request")
var ErrStorage = errors.New("research_storage_failed")
var sessionPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`)

type Options struct {
	Workspace, Document, SHA256, Kind, Input string
	Timeout                                  time.Duration
}
type Clock struct {
	Version          int       `json:"version"`
	StartedAt        time.Time `json:"started_at"`
	Deadline         time.Time `json:"deadline"`
	RemainingSeconds int64     `json:"remaining_seconds"`
}
type Result struct {
	Status           string    `json:"status"`
	TopicID          int       `json:"topic_id"`
	FollowUpIndex    int       `json:"follow_up_index"`
	SessionID        string    `json:"session_id,omitempty"`
	ReportPath       string    `json:"report_path,omitempty"`
	ExecutionPath    string    `json:"execution_path"`
	StartedAt        time.Time `json:"started_at"`
	FinishedAt       time.Time `json:"finished_at"`
	Deadline         time.Time `json:"deadline"`
	RemainingSeconds int64     `json:"remaining_seconds"`
	OutputLimited    bool      `json:"output_limited"`
}
type state struct {
	SessionID     string `json:"session_id"`
	LastCompleted int    `json:"last_completed_index"`
	Status        string `json:"status"`
}

// checked rejects static symlinks, special files and traversal. Private storage
// additionally uses an identity-verified root and no-follow terminal reads.
func checked(r *os.Root, name string, missing bool) error {
	if !filepath.IsLocal(name) {
		return ErrInvalid
	}
	parts := strings.Split(filepath.ToSlash(name), "/")
	for i := range parts {
		p := strings.Join(parts[:i+1], "/")
		st, e := r.Lstat(p)
		if os.IsNotExist(e) && missing && i == len(parts)-1 {
			return nil
		}
		if e != nil || st.Mode()&os.ModeSymlink != 0 {
			return ErrInvalid
		}
		if i < len(parts)-1 {
			if !st.IsDir() {
				return ErrInvalid
			}
		} else if !st.IsDir() && !st.Mode().IsRegular() {
			return ErrInvalid
		}
	}
	return nil
}
func openWorkspace(w string) (*os.Root, error) {
	if noFollow == 0 || !filepath.IsAbs(w) || filepath.Clean(w) != w {
		return nil, ErrInvalid
	}
	// Start at the filesystem root and retain each verified directory identity;
	// never validate a textual absolute path and then resolve it again.
	root, e := os.OpenRoot("/")
	if e != nil {
		return nil, ErrInvalid
	}
	if w == "/" {
		return root, nil
	}
	for _, part := range strings.Split(strings.TrimPrefix(w, "/"), "/") {
		child, e := openDirectory(root, part, false)
		root.Close()
		if e != nil {
			return nil, e
		}
		root = child
	}
	return root, nil
}

// openDirectory anchors a single non-symlink component, verifying that OpenRoot
// opened the exact directory observed by Lstat rather than a raced replacement.
// No child read/write takes place before this identity check succeeds.
func openDirectory(parent *os.Root, name string, create bool) (*os.Root, error) {
	if !filepath.IsLocal(name) || filepath.Base(name) != name {
		return nil, ErrInvalid
	}
	if create {
		if e := parent.Mkdir(name, 0700); e != nil && !os.IsExist(e) {
			return nil, ErrStorage
		}
	}
	expected, e := parent.Lstat(name)
	if e != nil || !expected.IsDir() || expected.Mode()&os.ModeSymlink != 0 {
		return nil, ErrInvalid
	}
	child, e := parent.OpenRoot(name)
	if e != nil {
		return nil, ErrInvalid
	}
	actual, e := child.Stat(".")
	if e != nil || !os.SameFile(expected, actual) {
		child.Close()
		return nil, ErrInvalid
	}
	return child, nil
}
func openResearch(workspace *os.Root, create bool) (*os.Root, error) {
	if noFollow == 0 {
		return nil, ErrInvalid
	}
	factory, e := openDirectory(workspace, ".factory", create)
	if e != nil {
		return nil, e
	}
	defer factory.Close()
	return openDirectory(factory, "research", create)
}
func read(r *os.Root, n string) ([]byte, error) {
	if !filepath.IsLocal(n) {
		return nil, ErrInvalid
	}
	// Anchor every input/document parent before opening the terminal file. Private
	// records use basenames, so they never resolve workspace ancestors again.
	parts := strings.Split(filepath.ToSlash(n), "/")
	for _, part := range parts[:len(parts)-1] {
		child, e := openDirectory(r, part, false)
		if e != nil {
			return nil, e
		}
		defer child.Close()
		r = child
	}
	n = parts[len(parts)-1]
	if checked(r, n, false) != nil {
		return nil, ErrInvalid
	}
	f, e := r.OpenFile(n, os.O_RDONLY|noFollow, 0)
	if e != nil {
		return nil, ErrStorage
	}
	defer f.Close()
	st, e := f.Stat()
	if e != nil || !st.Mode().IsRegular() || st.Size() > 4<<20 {
		return nil, ErrInvalid
	}
	b, e := io.ReadAll(io.LimitReader(f, (4<<20)+1))
	if e != nil || len(b) > 4<<20 {
		return nil, ErrStorage
	}
	return b, nil
}
func write(r *os.Root, n string, b []byte) error {
	if filepath.Base(n) != n || checked(r, n, true) != nil {
		return ErrInvalid
	}
	tmp := n + ".tmp"
	f, e := r.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if e != nil {
		return ErrStorage
	}
	defer r.Remove(tmp)
	_, e = f.Write(b)
	if e == nil {
		e = f.Sync()
	}
	ce := f.Close()
	if e != nil || ce != nil {
		return ErrStorage
	}
	if r.Rename(tmp, n) != nil {
		return ErrStorage
	}
	return nil
}
func writeJSON(r *os.Root, n string, v any) error {
	b, e := json.Marshal(v)
	if e != nil {
		return ErrStorage
	}
	return write(r, n, b)
}
func remaining(d time.Time) int64 {
	n := int64(time.Until(d) / time.Second)
	if n < 0 {
		return 0
	}
	return n
}
func lock(r *os.Root, n string) (func(), error) {
	if filepath.Base(n) != n || checked(r, n, true) != nil {
		return nil, ErrInvalid
	}
	f, e := r.OpenFile(n, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if e != nil {
		return nil, ErrInvalid
	}
	f.Close()
	return func() { r.Remove(n) }, nil
}

// Init creates a non-resettable shared thirty-minute clock.
func Init(workspace string) (Clock, error) {
	var c Clock
	w, e := openWorkspace(workspace)
	if e != nil {
		return c, e
	}
	defer w.Close()
	r, e := openResearch(w, true)
	if e != nil {
		return c, e
	}
	defer r.Close()
	unlock, e := lock(r, "init.lock")
	if e != nil {
		return c, e
	}
	defer unlock()
	if _, e = r.Lstat("run.json"); !os.IsNotExist(e) {
		return c, ErrInvalid
	}
	now := time.Now().UTC()
	c = Clock{1, now, now.Add(1800 * time.Second), 1800}
	e = writeJSON(r, "run.json", c)
	return c, e
}

// Run returns nil error for handled process failures: consumers MUST inspect Status.
func Run(parent context.Context, o Options) (Result, error) {
	var out Result
	if o.Timeout <= 0 {
		return out, ErrInvalid
	}
	w, e := openWorkspace(o.Workspace)
	if e != nil {
		return out, e
	}
	defer w.Close()
	r, e := openResearch(w, false)
	if e != nil {
		return out, e
	}
	defer r.Close()
	b, e := read(r, "run.json")
	var clock Clock
	if e != nil || json.Unmarshal(b, &clock) != nil || clock.Version != 1 || clock.StartedAt.IsZero() || clock.StartedAt.After(time.Now()) || clock.Deadline.Sub(clock.StartedAt) != 1800*time.Second || !clock.Deadline.After(time.Now()) {
		return out, ErrInvalid
	}
	rel := func(p string) (string, error) {
		if !filepath.IsAbs(p) {
			return "", ErrInvalid
		}
		n, e := filepath.Rel(o.Workspace, p)
		if e != nil || !filepath.IsLocal(n) {
			return "", ErrInvalid
		}
		return n, nil
	}
	dn, e := rel(o.Document)
	if e != nil {
		return out, e
	}
	in, e := rel(o.Input)
	if e != nil || !strings.HasPrefix(filepath.ToSlash(in), private) {
		return out, ErrInvalid
	}
	d, e := read(w, dn)
	if e != nil {
		return out, e
	}
	b, e = read(r, strings.TrimPrefix(filepath.ToSlash(in), private))
	if e != nil {
		return out, e
	}
	prompt, e := factoryprompt.Assemble(d, o.SHA256, o.Kind, b)
	if e != nil {
		return out, e
	}
	var input struct {
		Topic  int `json:"topic_id"`
		Index  int `json:"follow_up_index"`
		Budget int `json:"research_budget_seconds"`
	}
	if json.Unmarshal(b, &input) != nil {
		return out, ErrInvalid
	}
	allowance := min(o.Timeout, time.Until(clock.Deadline))
	deadline := time.Now().Add(allowance)
	if clock.Deadline.Before(deadline) {
		deadline = clock.Deadline
	}
	if time.Duration(input.Budget)*time.Second > allowance || parent.Err() != nil {
		return out, ErrInvalid
	}
	topic := fmt.Sprintf("topic-%d", input.Topic)
	unlock, e := lock(r, topic+".lock")
	if e != nil {
		return out, e
	}
	defer unlock()
	sn := topic + ".state.json"
	var s state
	sb, se := read(r, sn)
	if o.Kind == "initial" {
		if _, e := r.Lstat(sn); !os.IsNotExist(e) {
			return out, ErrInvalid
		}
	} else {
		if se != nil || json.Unmarshal(sb, &s) != nil || s.Status != "complete" || s.LastCompleted+1 != input.Index || !sessionPattern.MatchString(s.SessionID) {
			return out, ErrInvalid
		}
	}
	model, effort := os.Getenv("KIT_MODEL"), os.Getenv("KIT_REASONING_EFFORT")
	if model == "" || effort == "" || len(model) > 256 || len(effort) > 64 || checked(w, "factory/mcp/exa.json", false) != nil {
		return out, ErrInvalid
	}
	args := []string{"prompt", "--root", o.Workspace, "--provider", "openrouter", "--model", model, "--reasoning-effort", effort, "--mcp-config", filepath.Join(o.Workspace, "factory/mcp/exa.json")}
	if o.Kind == "follow-up" {
		args = append(args, "--resume", s.SessionID)
	}
	identity := append([]string(nil), args...)
	args = append(args, string(prompt))
	base := topic + "-initial"
	if o.Kind == "follow-up" {
		base = fmt.Sprintf("%s-followup-%d", topic, input.Index)
	}
	for _, v := range []struct {
		suffix string
		data   []byte
	}{{".prompt.md", prompt}, {".input.json", b}} {
		if e = write(r, base+v.suffix, v.data); e != nil {
			return out, e
		}
	}
	s.Status = "running"
	if e = writeJSON(r, sn, s); e != nil {
		return out, e
	}
	out = Result{Status: "failed", TopicID: input.Topic, FollowUpIndex: input.Index, SessionID: s.SessionID, ExecutionPath: private + base + ".execution.json", StartedAt: time.Now().UTC(), Deadline: clock.Deadline}
	ctx, cancel := context.WithDeadline(parent, deadline)
	defer cancel()
	var limited atomic.Bool
	stdout := &bounded{cancel: cancel, limited: &limited}
	stderr := &bounded{cancel: cancel, limited: &limited}
	exe := os.Getenv("FACTORY_RESEARCH_KIT")
	if exe == "" {
		exe = "kit"
	}
	cmd := exec.Command(exe, args...)
	cmd.Dir = o.Workspace
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	exitCode := supervise(ctx, cmd)
	out.OutputLimited = limited.Load()
	if ctx.Err() != nil && !out.OutputLimited {
		out.Status = "timeout"
	}
	if exitCode == 0 && ctx.Err() == nil && !out.OutputLimited {
		raw := stdout.buf.String()
		trimmed := strings.TrimSuffix(raw, "\n")
		i := strings.LastIndex(trimmed, "\n")
		marker := trimmed[i+1:]
		id := strings.TrimPrefix(marker, "session_id: ")
		if strings.HasPrefix(marker, "session_id: ") && sessionPattern.MatchString(id) && (s.SessionID == "" || s.SessionID == id) {
			out.Status = "complete"
			out.SessionID = id
			out.ReportPath = private + base + ".report.md"
			if e = write(r, strings.TrimPrefix(out.ReportPath, private), []byte(trimmed[:i+1])); e != nil {
				return out, e
			}
			s.SessionID = id
			s.LastCompleted = input.Index
		}
	}
	out.FinishedAt = time.Now().UTC()
	out.RemainingSeconds = remaining(clock.Deadline)
	s.Status = out.Status
	for _, v := range []struct {
		suffix string
		data   []byte
	}{{".stdout.txt", stdout.buf.Bytes()}, {".stderr.txt", stderr.buf.Bytes()}} {
		if e = write(r, base+v.suffix, v.data); e != nil {
			return out, e
		}
	}
	record := struct {
		Result
		DocumentSHA256 string   `json:"document_sha256"`
		PromptSHA256   string   `json:"prompt_sha256"`
		Argv           []string `json:"argv"`
		ExitCode       int      `json:"exit_code"`
	}{out, fmt.Sprintf("%x", sha256.Sum256(d)), fmt.Sprintf("%x", sha256.Sum256(prompt)), identity, exitCode}
	if e = writeJSON(r, strings.TrimPrefix(out.ExecutionPath, private), record); e != nil {
		return out, e
	}
	if e = writeJSON(r, sn, s); e != nil {
		return out, e
	}
	return out, nil
}

type bounded struct {
	buf     bytes.Buffer
	cancel  context.CancelFunc
	limited *atomic.Bool
}

func (b *bounded) Write(p []byte) (int, error) {
	n := len(p)
	left := (1 << 20) - b.buf.Len()
	if n > left {
		b.buf.Write(p[:left])
		b.limited.Store(true)
		b.cancel()
		return n, nil
	}
	b.buf.Write(p)
	return n, nil
}
