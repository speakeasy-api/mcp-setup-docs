package factorycontroller

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"syscall"
)

const evidenceLimit = 1 << 20

var errEvidence = errors.New("invalid or unavailable private evidence")

// Evidence anchors private records to physical directories. Like the existing
// private reader, it does not sandbox a concurrently malicious same-UID process.
// Failed writes are retained, never overwritten or automatically retried.
type Evidence struct {
	mu                           sync.Mutex
	workspace, factory, research *os.Root
}

func evidencePrivate(st os.FileInfo, dir bool) bool {
	if st == nil {
		return false
	}
	s, ok := st.Sys().(*syscall.Stat_t)
	if !ok || s.Uid != uint32(os.Getuid()) {
		return false
	}
	if dir {
		return st.IsDir() && st.Mode() == os.ModeDir|0700
	}
	return st.Mode() == 0600 && s.Nlink == 1 && st.Size() <= evidenceLimit
}
func evidenceDir(parent *os.Root, name string) (*os.Root, error) {
	before, err := parent.Lstat(name)
	if err != nil || !evidencePrivate(before, true) {
		return nil, errEvidence
	}
	child, err := parent.OpenRoot(name)
	if err != nil {
		return nil, errEvidence
	}
	actual, err := child.Stat(".")
	if err != nil || !os.SameFile(before, actual) || !evidencePrivate(actual, true) {
		child.Close()
		return nil, errEvidence
	}
	return child, nil
}
func OpenEvidence(workspace string) (*Evidence, error) {
	st, err := os.Lstat(workspace)
	if err != nil || !st.IsDir() {
		return nil, errEvidence
	}
	root, err := os.OpenRoot(workspace)
	if err != nil {
		return nil, errEvidence
	}
	e := &Evidence{workspace: root}
	actual, err := root.Stat(".")
	if err != nil || !os.SameFile(st, actual) {
		e.Close()
		return nil, errEvidence
	}
	e.factory, err = evidenceDir(root, ".factory")
	if err != nil {
		e.Close()
		return nil, errEvidence
	}
	if err = e.factory.Mkdir("research", 0700); err != nil && !errors.Is(err, os.ErrExist) {
		e.Close()
		return nil, errEvidence
	}
	e.research, err = evidenceDir(e.factory, "research")
	if err != nil {
		e.Close()
		return nil, errEvidence
	}
	return e, nil
}
func (e *Evidence) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	var result error
	for _, r := range []*os.Root{e.research, e.factory, e.workspace} {
		if r != nil && r.Close() != nil {
			result = errEvidence
		}
	}
	e.research = nil
	e.factory = nil
	e.workspace = nil
	return result
}
func (e *Evidence) valid() bool {
	if e.research == nil || e.factory == nil || e.workspace == nil {
		return false
	}
	for _, p := range []struct {
		parent, child *os.Root
		name          string
	}{{e.workspace, e.factory, ".factory"}, {e.factory, e.research, "research"}} {
		a, err := p.parent.Lstat(p.name)
		if err != nil || !evidencePrivate(a, true) {
			return false
		}
		b, err := p.child.Stat(".")
		if err != nil || !evidencePrivate(b, true) || !os.SameFile(a, b) {
			return false
		}
	}
	return true
}
func evidenceName(topic, index int, suffix string) string {
	return fmt.Sprintf("topic-%d-%d.%s", topic, index, suffix)
}
func evidenceIndex(topic, index int) bool {
	return topic >= 1 && topic <= 5 && index >= 0 && index <= 2
}
func (e *Evidence) read(name string) ([]byte, error) {
	if !e.valid() {
		return nil, errEvidence
	}
	before, err := e.research.Lstat(name)
	if err != nil || !evidencePrivate(before, false) {
		return nil, errEvidence
	}
	f, err := e.research.OpenFile(name, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, errEvidence
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil || !evidencePrivate(st, false) || !os.SameFile(before, st) {
		return nil, errEvidence
	}
	b, err := io.ReadAll(io.LimitReader(f, evidenceLimit+1))
	if err != nil || len(b) > evidenceLimit {
		return nil, errEvidence
	}
	after, err := f.Stat()
	if err != nil || !evidencePrivate(after, false) || st.Size() != after.Size() || !st.ModTime().Equal(after.ModTime()) {
		return nil, errEvidence
	}
	named, err := e.research.Lstat(name)
	if err != nil || !evidencePrivate(named, false) || !os.SameFile(after, named) || !e.valid() {
		return nil, errEvidence
	}
	return b, nil
}
func (e *Evidence) write(name string, b []byte) error {
	if len(b) > evidenceLimit || !e.valid() {
		return errEvidence
	}
	f, err := e.research.OpenFile(name, os.O_WRONLY|os.O_CREATE|os.O_EXCL|syscall.O_NOFOLLOW, 0600)
	if err != nil {
		return errEvidence
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil || !evidencePrivate(st, false) {
		return errEvidence
	}
	n, err := f.Write(b)
	if err != nil || n != len(b) || f.Sync() != nil {
		return errEvidence
	}
	after, err := e.research.Lstat(name)
	if err != nil || !evidencePrivate(after, false) || !os.SameFile(st, after) || !e.valid() {
		return errEvidence
	}
	if f.Close() != nil {
		return errEvidence
	}
	return nil
}
func (e *Evidence) SavePrompt(topic, index int, assignment, prompt []byte) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if !evidenceIndex(topic, index) || len(assignment) > evidenceLimit || len(prompt) > evidenceLimit {
		return errEvidence
	}
	if index > 0 {
		if _, err := e.session(topic, index-1); err != nil {
			return errEvidence
		}
	}
	if err := e.write(evidenceName(topic, index, "input.json"), assignment); err != nil {
		return err
	}
	return e.write(evidenceName(topic, index, "prompt.md"), prompt)
}
func (e *Evidence) SaveTurn(topic, index int, turn TurnResult) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if !evidenceIndex(topic, index) || !sessionIdentity.MatchString(turn.SessionID) || len(turn.Answer) > evidenceLimit || strings.TrimSpace(turn.Answer) == "" {
		return errEvidence
	}
	if index > 0 {
		id, err := e.session(topic, index-1)
		if err != nil || id != turn.SessionID {
			return errEvidence
		}
	}
	for _, suffix := range []string{"input.json", "prompt.md"} {
		if _, err := e.read(evidenceName(topic, index, suffix)); err != nil {
			return errEvidence
		}
	}
	if err := e.write(evidenceName(topic, index, "report.md"), []byte(turn.Answer)); err != nil {
		return err
	}
	record := struct {
		Version   int    `json:"version"`
		Topic     int    `json:"topic"`
		Index     int    `json:"index"`
		SessionID string `json:"session_id"`
	}{1, topic, index, turn.SessionID}
	b, _ := json.Marshal(record)
	return e.write(evidenceName(topic, index, "session.json"), b)
}
func (e *Evidence) Session(topic, index int) (string, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.session(topic, index)
}
func (e *Evidence) session(topic, index int) (string, error) {
	if !evidenceIndex(topic, index) {
		return "", errEvidence
	}
	for _, suffix := range []string{"input.json", "prompt.md", "report.md"} {
		if _, err := e.read(evidenceName(topic, index, suffix)); err != nil {
			return "", errEvidence
		}
	}
	b, err := e.read(evidenceName(topic, index, "session.json"))
	if err != nil {
		return "", errEvidence
	}
	fields, err := decisionObject(b, "version", "topic", "index", "session_id")
	if err != nil {
		return "", errEvidence
	}
	for key, want := range map[string]int{"version": 1, "topic": topic, "index": index} {
		var got int
		if json.Unmarshal(fields[key], &got) != nil || got != want || string(fields[key]) == "null" {
			return "", errEvidence
		}
	}
	id, err := decisionString(fields["session_id"], 256, true)
	if err != nil || !sessionIdentity.MatchString(id) {
		return "", errEvidence
	}
	if index > 0 {
		previous, err := e.session(topic, index-1)
		if err != nil || previous != id {
			return "", errEvidence
		}
	}
	return id, nil
}
