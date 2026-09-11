package factorytranscript

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/praetorian-inc/titus/pkg/matcher"
	"github.com/praetorian-inc/titus/pkg/types"
)

func TestSanitizeBuiltin(t *testing.T) {
	s, err := NewSanitizer(nil)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	fake := "ghp_" + "aB3dE6gH9jK2mN5pQ8sT1vW4yZ7cD0fG3hJ6"
	other := "ghp_" + "bC4eF7hI0kL3nO6qR9tU2wX5zA8dE1gH4iK7"
	var decoded string
	if err := json.Unmarshal([]byte(`"`+strings.ReplaceAll(fake, "_", `\u005f`)+`"`), &decoded); err != nil {
		t.Fatal(err)
	}
	for _, in := range []string{"Evidence ✓\n" + fake + "\nAgain: " + fake, fake + " " + other, decoded, strings.Repeat("Public documentation example.\n", 8000)} {
		out, err := s.Sanitize([]byte(in))
		if err != nil {
			t.Fatalf("input bytes=%d warning=%v: %v", len(in), s.warned.Load(), err)
		}
		if bytes.Contains(out, []byte(fake)) || bytes.Contains(out, []byte(other)) {
			t.Fatal("credential survived")
		}
		if !strings.Contains(in, "ghp_") && string(out) != in {
			t.Fatal("clean text changed")
		}
		again, err := s.Sanitize(out)
		if err != nil || !bytes.Equal(out, again) {
			t.Fatal("rescan not clean")
		}
	}
}

func TestRedactKnownEncodingsAndOverlap(t *testing.T) {
	secret := "synthetic /+?\"<&value"
	encoded, _ := json.Marshal(secret)
	inputs := []string{secret, string(encoded[1 : len(encoded)-1]), url.QueryEscape(secret), url.PathEscape(secret), base64.StdEncoding.EncodeToString([]byte(secret)), base64.RawStdEncoding.EncodeToString([]byte(secret)), base64.URLEncoding.EncodeToString([]byte(secret)), base64.RawURLEncoding.EncodeToString([]byte(secret))}
	s, err := NewSanitizer([]string{"", secret, "abc", "bcd"})
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	for _, in := range inputs {
		out, err := s.Sanitize([]byte("prefix " + in + " suffix"))
		if err != nil || bytes.Contains(out, []byte(in)) {
			t.Fatal("known encoding survived", err)
		}
	}
	out, err := s.Sanitize([]byte("✓ abcd!"))
	if err != nil || string(out) != "✓ [REDACTED]!" {
		t.Fatalf("overlap: %q %v", out, err)
	}
}

func TestSanitizeCapturedAcrossCalls(t *testing.T) {
	s, err := newSanitizer(nil, matcher.Config{Rules: []*types.Rule{{ID: "test", Name: "test", Pattern: `credential=(\w+)`}}})
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	earlier, err := s.Sanitize([]byte("earlier field: syntheticValue"))
	if err != nil || string(earlier) != "earlier field: syntheticValue" {
		t.Fatal("unexpected context-free detection")
	}
	for _, in := range []string{"credential=syntheticValue syntheticValue", "other field: syntheticValue", string(earlier) + " whole export: syntheticValue"} {
		out, err := s.Sanitize([]byte(in))
		if err != nil || bytes.Contains(out, []byte("syntheticValue")) {
			t.Fatal("capture survived", err)
		}
	}
}

func TestTimeoutSanitizer(t *testing.T) {
	config := matcher.Config{Rules: []*types.Rule{{ID: "timeout", Name: "timeout", Pattern: `(a+)+b`}}, MatchTimeout: time.Millisecond}
	var warned atomic.Bool
	config.WarnFunc = func(string, ...any) { warned.Store(true) }
	raw, err := matcher.New(config)
	if err != nil {
		t.Fatal(err)
	}
	_, scanErr := raw.Match([]byte(strings.Repeat("a", 5000) + "c"))
	_ = raw.Close()
	if scanErr != nil || !warned.Load() {
		t.Fatal("expected nil scan error with actual Titus warning")
	}
	s, err := newSanitizer(nil, config)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	out, err := s.Sanitize([]byte(strings.Repeat("a", 5000) + "c"))
	if err == nil || out != nil || !s.warned.Load() {
		t.Fatal("warning must withhold output")
	}
	out, err = s.Sanitize([]byte("clean"))
	if err == nil || out != nil {
		t.Fatal("warning must remain sticky")
	}
}

type fakeScanner struct {
	calls int
	mode  string
}

func (f *fakeScanner) Close() error { return nil }
func (f *fakeScanner) Match(b []byte) ([]*types.Match, error) {
	f.calls++
	if f.mode == "error" {
		return nil, errors.New("sensitive scanner error")
	}
	end := int64(len(b))
	if f.mode == "offset" {
		end++
	}
	return []*types.Match{{Location: types.Location{Offset: types.OffsetSpan{Start: 0, End: end}}}}, nil
}
func TestSanitizeFailClosed(t *testing.T) {
	for _, mode := range []string{"error", "offset", "rescan"} {
		t.Run(mode, func(t *testing.T) {
			s := &Sanitizer{scanner: &fakeScanner{mode: mode}, values: map[string]struct{}{}}
			out, err := s.Sanitize([]byte("private"))
			if out != nil || err != errUnsafe {
				t.Fatal("unsafe output or non-fixed error")
			}
		})
	}
	s, err := NewSanitizer(nil)
	if err != nil {
		t.Fatal(err)
	}
	if out, err := s.Sanitize(make([]byte, maxInputBytes+1)); out != nil || err == nil {
		t.Fatal("unbounded input")
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	if out, err := s.Sanitize([]byte("clean")); out != nil || err == nil {
		t.Fatal("closed sanitizer accepted input")
	}
}

func TestSanitizeCompileFailure(t *testing.T) {
	s, err := newSanitizer(nil, matcher.Config{Rules: []*types.Rule{{ID: "invalid", Name: "invalid", Pattern: "("}}})
	if s != nil || err != errUnsafe {
		t.Fatal("invalid rule accepted")
	}
}

func TestSanitizeWholeArtifactSize(t *testing.T) {
	// A literal synthetic rule keeps size-contract coverage efficient while using
	// the real matcher and both scans, rather than a no-op scanner stub.
	newSized := func(t *testing.T) *Sanitizer {
		t.Helper()
		s, err := newSanitizer(nil, matcher.Config{Rules: []*types.Rule{{ID: "size", Name: "size", Pattern: `credential=(syntheticValue)`}}})
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = s.Close() })
		return s
	}
	t.Run("assembled-fields-above-one-MiB", func(t *testing.T) {
		s := newSized(t)
		earlier, err := s.Sanitize([]byte(strings.Repeat(".", 600<<10) + " syntheticValue"))
		if err != nil {
			t.Fatal(err)
		}
		later, err := s.Sanitize([]byte(strings.Repeat(".", 600<<10) + " credential=syntheticValue"))
		if err != nil {
			t.Fatal(err)
		}
		if len(earlier) > 1<<20 || len(later) > 1<<20 {
			t.Fatal("fixture field exceeds source limit")
		}
		artifact, err := json.Marshal([]string{string(earlier), string(later)})
		if err != nil {
			t.Fatal(err)
		}
		if len(artifact) <= 1<<20 || len(artifact) >= 2<<20 {
			t.Fatal("fixture artifact size incorrect")
		}
		out, err := s.Sanitize(artifact)
		if err != nil {
			t.Fatal(err)
		}
		if bytes.Contains(out, []byte("syntheticValue")) {
			t.Fatal("cross-field value survived final artifact scan")
		}
		again, err := s.Sanitize(out)
		if err != nil || !bytes.Equal(out, again) {
			t.Fatal("artifact rescan not clean")
		}
	})
	t.Run("exact-two-MiB", func(t *testing.T) {
		s := newSized(t)
		artifact := []byte(`"` + strings.Repeat(".", (2<<20)-2) + `"`)
		out, err := s.Sanitize(artifact)
		if err != nil || !bytes.Equal(out, artifact) {
			t.Fatal("exact 2 MiB clean artifact refused or changed", err)
		}
	})
	t.Run("above-two-MiB", func(t *testing.T) {
		s := newSized(t)
		out, err := s.Sanitize(bytes.Repeat([]byte("."), (2<<20)+1))
		if out != nil || err != errUnsafe {
			t.Fatal("oversized artifact accepted")
		}
	})
}
