// Package factoryrun implements host-owned whole-job deadlines and the bounded
// begin-writing protocol. It has no research-topic or publication authority.
package factoryrun

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

type Deadlines struct {
	started, begunAt         time.Time
	Research, Writing, Outer time.Time
	Begun, Failed            bool
	failure                  string
}

func Start(now time.Time) Deadlines {
	return Deadlines{started: now, Research: now.Add(1800 * time.Second), Outer: now.Add(2700 * time.Second)}
}
func (d *Deadlines) Check(now time.Time) string {
	if d.Failed {
		return d.failure
	}
	deadline, reason := d.Research, "research_timeout"
	if d.Begun {
		deadline, reason = d.Writing, "writing_timeout"
	}
	if !now.Before(deadline) || !now.Before(d.Outer) {
		d.Failed = true
		d.failure = reason
	}
	return d.failure
}
func (d *Deadlines) Begin(now time.Time) string {
	if failure := d.Check(now); failure != "" {
		return failure
	}
	if !d.Begun {
		d.Begun = true
		d.begunAt = now
		d.Writing = now.Add(900 * time.Second)
		if d.Writing.After(d.Outer) {
			d.Writing = d.Outer
		}
	}
	return ""
}
func (d *Deadlines) Reject(now time.Time) string {
	if failure := d.Check(now); failure != "" {
		return failure
	}
	d.Failed = true
	d.failure = "lifecycle_invalid"
	return d.failure
}
func (d *Deadlines) Complete(now time.Time, code int) string {
	if failure := d.Check(now); failure != "" {
		return failure
	}
	if code != 0 {
		d.Failed = true
		d.failure = "provider_exit"
		return d.failure
	}
	return "completed"
}

var ErrSignal = errors.New("invalid lifecycle control")

// NewRunID is called only by the host. The model receives, but never chooses it.
func NewRunID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}
func validRunID(id string) bool {
	if len(id) != 32 || id != strings.ToLower(id) {
		return false
	}
	_, err := hex.DecodeString(id)
	return err == nil
}

type Control struct {
	root  *os.Root
	runID string
	seen  os.FileInfo
}

// OpenControl anchors each non-symlink directory by its verified identity, as
// the existing research runner does. Subsequent operations use this handle,
// never a re-resolved agent-writable absolute path. No generic sandbox is added.
func OpenControl(path, runID string) (*Control, error) {
	if !validRunID(runID) || !filepath.IsAbs(path) || filepath.Clean(path) != path || path == "/" {
		return nil, ErrSignal
	}
	root, err := os.OpenRoot("/")
	if err != nil {
		return nil, err
	}
	for _, part := range strings.Split(strings.TrimPrefix(path, "/"), "/") {
		expected, e := root.Lstat(part)
		if e != nil || !expected.IsDir() || expected.Mode()&os.ModeSymlink != 0 {
			root.Close()
			return nil, ErrSignal
		}
		child, e := root.OpenRoot(part)
		root.Close()
		if e != nil {
			return nil, ErrSignal
		}
		actual, e := child.Stat(".")
		if e != nil || !os.SameFile(expected, actual) {
			child.Close()
			return nil, ErrSignal
		}
		root = child
	}
	st, err := root.Stat(".")
	if err != nil || st.Mode().Perm() != 0700 {
		root.Close()
		return nil, ErrSignal
	}
	return &Control{root: root, runID: runID}, nil
}
func (c *Control) Close() error { return c.root.Close() }

type phase struct {
	Version int    `json:"version"`
	RunID   string `json:"run_id"`
	Phase   string `json:"phase"`
}

func (c *Control) Read() (bool, error) {
	expected, err := c.root.Lstat("phase.json")
	if os.IsNotExist(err) && c.seen == nil {
		return false, nil
	}
	if err != nil || !expected.Mode().IsRegular() || expected.Size() > 256 {
		return false, ErrSignal
	}
	// Nonblocking/no-follow avoids a raced FIFO or symlink before fstat.
	f, err := c.root.OpenFile("phase.json", os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return false, ErrSignal
	}
	defer f.Close()
	actual, err := f.Stat()
	if err != nil || !actual.Mode().IsRegular() || !os.SameFile(expected, actual) || (c.seen != nil && !os.SameFile(c.seen, actual)) {
		return false, ErrSignal
	}
	data, err := io.ReadAll(io.LimitReader(f, 257))
	if err != nil || len(data) > 256 {
		return false, ErrSignal
	}
	// Reject duplicate keys as well as unknown fields and trailing JSON.
	dec := json.NewDecoder(bytes.NewReader(data))
	token, err := dec.Token()
	if err != nil || token != json.Delim('{') {
		return false, ErrSignal
	}
	fields := map[string]json.RawMessage{}
	for dec.More() {
		key, err := dec.Token()
		if err != nil {
			return false, ErrSignal
		}
		name, ok := key.(string)
		if !ok {
			return false, ErrSignal
		}
		if _, ok := fields[name]; ok {
			return false, ErrSignal
		}
		var value json.RawMessage
		if dec.Decode(&value) != nil {
			return false, ErrSignal
		}
		fields[name] = value
	}
	if _, err := dec.Token(); err != nil {
		return false, ErrSignal
	}
	if _, err := dec.Token(); err != io.EOF {
		return false, ErrSignal
	}
	var p phase
	dec = json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if dec.Decode(&p) != nil || len(fields) != 3 || p.Version != 1 || p.RunID != c.runID || p.Phase != "writing" {
		return false, ErrSignal
	}
	// Check the name still refers to the validated object before accepting it.
	final, err := c.root.Lstat("phase.json")
	if err != nil || !os.SameFile(actual, final) {
		return false, ErrSignal
	}
	c.seen = actual
	return true, nil
}

// Publish installs a fully written regular file via atomic no-replace hard link.
// An existing valid signal is idempotent; malformed state is never overwritten.
func (c *Control) Publish() error {
	// Use a separate reader: publishing must not change the host's seen identity.
	reader := Control{root: c.root, runID: c.runID}
	if yes, err := reader.Read(); err != nil || yes {
		return err
	}
	id, err := NewRunID()
	if err != nil {
		return err
	}
	name := ".phase-" + id
	f, err := c.root.OpenFile(name, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	defer c.root.Remove(name)
	data, _ := json.Marshal(phase{1, c.runID, "writing"})
	_, err = f.Write(data)
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
	if err = c.root.Link(name, "phase.json"); err != nil && !os.IsExist(err) {
		return err
	}
	yes, err := reader.Read()
	if err != nil {
		return err
	}
	if !yes {
		return ErrSignal
	}
	return nil
}

// ObservedMilliseconds accepts only host monotonic observations. Zero is an
// omission sentinel, never serialized as a measured duration. The one-hour
// diagnostic ceiling does not participate in any lifecycle deadline.
func ObservedMilliseconds(start, end time.Time) int64 {
	if start.IsZero() || end.IsZero() || start == start.Round(0) || end == end.Round(0) {
		return 0
	}
	elapsed := end.Sub(start)
	if elapsed < time.Millisecond || elapsed > time.Hour {
		return 0
	}
	return elapsed.Milliseconds()
}

// Durations observes without altering arbitration or extending a timer.
func (d *Deadlines) Durations(end time.Time) map[string]int64 {
	out := map[string]int64{}
	researchEnd := end
	if d.Begun {
		if d.begunAt.After(end) {
			return out
		}
		researchEnd = d.begunAt
		if ms := ObservedMilliseconds(d.begunAt, end); ms > 0 {
			out["writing_ms"] = ms
		}
	}
	if ms := ObservedMilliseconds(d.started, researchEnd); ms > 0 {
		out["research_ms"] = ms
	}
	return out
}
