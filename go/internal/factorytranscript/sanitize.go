// Package factorytranscript sanitizes decoded transcript text without credential validation.
package factorytranscript

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/url"
	"sync"
	"sync/atomic"

	"github.com/praetorian-inc/titus/pkg/matcher"
	"github.com/praetorian-inc/titus/pkg/rule"
	"github.com/praetorian-inc/titus/pkg/types"
)

const maxInputBytes = 2 << 20
const maxValueBytes = 4 << 20
const maxValues = 4096
const redacted = "[REDACTED]"

var errUnsafe = errors.New("transcript sanitization incomplete; output withheld")
var builtinRules = sync.OnceValues(func() ([]*types.Rule, error) { return rule.NewLoader().LoadBuiltinRules() })

// Sanitizer retains captured values for the lifetime of one export. Do not copy it.
// Calls are serialized; Close releases the matcher and retained values.
type Sanitizer struct {
	mu      sync.Mutex
	scanner interface {
		Match([]byte) ([]*types.Match, error)
		Close() error
	}
	warned     atomic.Bool
	values     map[string]struct{}
	valueBytes int
}

// NewSanitizer loads pinned bundled rules once, with no networking or validation.
func NewSanitizer(knownSecrets []string) (*Sanitizer, error) {
	rules, err := builtinRules()
	if err != nil {
		return nil, errUnsafe
	}
	return newSanitizer(knownSecrets, matcher.Config{Rules: rules})
}

func newSanitizer(known []string, config matcher.Config) (*Sanitizer, error) {
	s := &Sanitizer{values: make(map[string]struct{})}
	for _, v := range known {
		if !s.remember(v) {
			return nil, errUnsafe
		}
	}
	// Titus may warn concurrently, including during compilation. Never log its arguments.
	config.WarnFunc = func(string, ...any) { s.warned.Store(true) }
	m, err := matcher.New(config)
	if err != nil || s.warned.Load() {
		if m != nil {
			_ = m.Close()
		}
		return nil, errUnsafe
	}
	s.scanner = m
	return s, nil
}

func (s *Sanitizer) remember(v string) bool {
	if v == "" {
		return true
	}
	if len(v) > maxInputBytes {
		return false
	}
	j, _ := json.Marshal(v)
	plainJSON := bytes.NewBuffer(nil)
	encoder := json.NewEncoder(plainJSON)
	encoder.SetEscapeHTML(false)
	if encoder.Encode(v) != nil {
		return false
	}
	p := plainJSON.Bytes()
	variants := []string{v, string(j[1 : len(j)-1]), string(p[1 : len(p)-2]), url.QueryEscape(v), url.PathEscape(v), base64.StdEncoding.EncodeToString([]byte(v)), base64.RawStdEncoding.EncodeToString([]byte(v)), base64.URLEncoding.EncodeToString([]byte(v)), base64.RawURLEncoding.EncodeToString([]byte(v))}
	for _, value := range variants {
		if _, ok := s.values[value]; ok {
			continue
		}
		if len(s.values) >= maxValues || s.valueBytes+len(value) > maxValueBytes {
			return false
		}
		s.values[value] = struct{}{}
		s.valueBytes += len(value)
	}
	return true
}

// Sanitize accepts decoded text or an entire serialized export, at most 2 MiB
// of input and output per call. The exporter owns the 1 MiB per-source/decoded-
// field limits. It must decode fields first and run the final assembled export
// through this same instance in one call after all fields, so later discoveries
// redact earlier occurrences.
// Bounds and per-rule timeouts do not replace an outer process deadline.
// Any incomplete scan poisons the instance; no raw content is returned on error.
func (s *Sanitizer) Sanitize(text []byte) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	unsafe := func() ([]byte, error) { s.warned.Store(true); return nil, errUnsafe }
	if s.scanner == nil || s.warned.Load() || len(text) > maxInputBytes {
		return unsafe()
	}
	matches, err := s.scanner.Match(text)
	if err != nil || s.warned.Load() {
		return unsafe()
	}
	// A byte mask forms the union of overlapping ranges without shifting offsets.
	mask := make([]bool, len(text))
	for _, m := range matches {
		if m == nil {
			return unsafe()
		}
		lo, hi := m.Location.Offset.Start, m.Location.Offset.End
		if lo < 0 || hi <= lo || hi > int64(len(text)) {
			return unsafe()
		}
		for i := lo; i < hi; i++ {
			mask[i] = true
		}
		for _, group := range m.Groups {
			if !s.remember(string(group)) {
				return unsafe()
			}
		}
	}
	for value := range s.values {
		for start := 0; start < len(text); {
			relative := bytes.Index(text[start:], []byte(value))
			if relative < 0 {
				break
			}
			at := start + relative
			for i := at; i < at+len(value); i++ {
				mask[i] = true
			}
			start = at + 1
		}
	}
	out := make([]byte, 0, len(text))
	for i := 0; i < len(text); {
		if !mask[i] {
			out = append(out, text[i])
			i++
			continue
		}
		out = append(out, redacted...)
		for i < len(text) && mask[i] {
			i++
		}
	}
	if len(out) > maxInputBytes {
		return unsafe()
	}
	remaining, err := s.scanner.Match(out)
	if err != nil || s.warned.Load() || len(remaining) != 0 {
		return unsafe()
	}
	for value := range s.values {
		if bytes.Contains(out, []byte(value)) {
			return unsafe()
		}
	}
	return out, nil
}

// Close is idempotent. Matcher errors are never exposed because they may contain text.
func (s *Sanitizer) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.values = nil
	s.valueBytes = 0
	if s.scanner == nil {
		return nil
	}
	err := s.scanner.Close()
	s.scanner = nil
	if err != nil {
		return errUnsafe
	}
	return nil
}
