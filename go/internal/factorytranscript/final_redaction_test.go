package factorytranscript

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"testing"

	"github.com/praetorian-inc/titus/pkg/matcher"
	"github.com/praetorian-inc/titus/pkg/types"
)

// Only the assembled export reveals these matches. No capture groups are
// returned, so retrying must preserve the full matched-span redactions too.
type lateExportScanner struct {
	targets []string
	calls   int
	failAt  int
}

func (s *lateExportScanner) Close() error { return nil }
func (s *lateExportScanner) Match(b []byte) ([]*types.Match, error) {
	if !bytes.Contains(b, []byte(`"kind": "guide_factory_readable_transcript"`)) {
		return nil, nil
	}
	s.calls++
	if s.failAt != 0 && s.calls >= s.failAt {
		return nil, errors.New("synthetic private scanner failure")
	}
	// Each Sanitize call rescans its own result before returning.
	index := (s.calls - 1) / 2
	if s.calls%2 == 0 || index >= len(s.targets) {
		return nil, nil
	}
	target := []byte(s.targets[index])
	var matches []*types.Match
	for start := 0; start < len(b); {
		at := bytes.Index(b[start:], target)
		if at < 0 {
			break
		}
		at += start
		matches = append(matches, &types.Match{Location: types.Location{Offset: types.OffsetSpan{Start: int64(at), End: int64(at + len(target))}}})
		start = at + len(target)
	}
	return matches, nil
}

func TestExportFinalTextRedaction(t *testing.T) {
	home, work, out := exportFixture(t)
	writeCandidate(t, work, "converged")
	if err := os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", fixtureRecord(`{"Text":{"text":"public finding synthetic-report-secret"}}`), 0600); err != nil {
		t.Fatal(err)
	}
	scanner := &lateExportScanner{targets: []string{"synthetic-report-secret"}}
	err := exportWithSanitizer(home, work, out, nil, func([]string) (*Sanitizer, error) {
		return &Sanitizer{scanner: scanner, values: map[string]struct{}{}}, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	var doc readableArtifact
	if json.Unmarshal(data, &doc) != nil || doc.Kind != "guide_factory_readable_transcript" || bytes.Contains(data, []byte("synthetic-report-secret")) || !bytes.Contains(data, []byte("public finding [REDACTED]")) {
		t.Fatal("late secret was not safely redacted while retaining readable logs")
	}
	if scanner.calls != 4 {
		t.Fatalf("expected one final-scan retry, got %d matcher calls", scanner.calls)
	}
	original, err := os.ReadFile(work + "/guides/example/research.md")
	if err != nil || !bytes.Contains(original, []byte("synthetic-report-secret")) {
		t.Fatal("export silently rewrote the generated guide", err)
	}
}

func TestExportFinalRedactionFailsClosed(t *testing.T) {
	for name, scanner := range map[string]*lateExportScanner{
		"metadata":         {targets: []string{"guide_factory_readable_transcript"}},
		"filename":         {targets: []string{"guide/research.md"}},
		"invalid-json":     {targets: []string{`"schema_version"`}},
		"nonconvergent":    {targets: []string{"synthetic-report-secret", "Public draft"}},
		"retry-scan-error": {targets: []string{"synthetic-report-secret"}, failAt: 3},
	} {
		t.Run(name, func(t *testing.T) {
			home, work, out := exportFixture(t)
			writeCandidate(t, work, "converged")
			err := exportWithSanitizer(home, work, out, nil, func([]string) (*Sanitizer, error) {
				return &Sanitizer{scanner: scanner, values: map[string]struct{}{}}, nil
			})
			if WorkerExitCode(err) != 51 {
				t.Fatalf("unsafe final redaction accepted or misclassified: %v", err)
			}
			if _, err := os.Lstat(out); !os.IsNotExist(err) {
				t.Fatal("failure emitted an export")
			}
			if scanner.calls > 4 {
				t.Fatal("final redaction exceeded the retry bound")
			}
		})
	}
}

func TestExportFinalRedactionWithTitus(t *testing.T) {
	home, work, out := exportFixture(t)
	if err := os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", fixtureRecord(`{"Text":{"text":"public finding synthetic-late-secret"}}`), 0600); err != nil {
		t.Fatal(err)
	}
	// The quote exists only in the serialized export, not in the decoded text.
	factory := func([]string) (*Sanitizer, error) {
		return newSanitizer(nil, matcher.Config{Rules: []*types.Rule{{ID: "late", Name: "late", Pattern: `synthetic-late-secret(?=")`}}})
	}
	if err := exportWithSanitizer(home, work, out, nil, factory); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(out)
	if err != nil || !json.Valid(data) || bytes.Contains(data, []byte("synthetic-late-secret")) || !bytes.Contains(data, []byte("public finding [REDACTED]")) {
		t.Fatal("real Titus late finding was not safely exported", err)
	}
}

func TestFinalRedactionEnvelope(t *testing.T) {
	original := readableArtifact{
		Version: 1, Kind: "guide_factory_readable_transcript", Limited: true,
		Omissions: []string{"metadata_and_unselected_files"},
		Sessions: []readableSession{{Ref: "s1", decodedSession: decodedSession{
			Events:    []decodedEvent{{Role: "Assistant", Part: "Text", Text: []string{"private"}}},
			Omissions: []string{},
		}}},
		Files: []readableFile{{Name: "research/dossier.md", Text: "private"}},
	}
	before, err := json.MarshalIndent(original, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	for name, change := range map[string]func(*readableArtifact){
		"session-identity": func(d *readableArtifact) { d.Sessions[0].Ref = "other" },
		"event-role":       func(d *readableArtifact) { d.Sessions[0].Events[0].Role = "User" },
		"event-count":      func(d *readableArtifact) { d.Sessions[0].Events = nil },
		"text-count":       func(d *readableArtifact) { d.Sessions[0].Events[0].Text = nil },
		"file-count":       func(d *readableArtifact) { d.Files = nil },
		"omissions":        func(d *readableArtifact) { d.Omissions = append(d.Omissions, "new") },
	} {
		t.Run(name, func(t *testing.T) {
			var candidate readableArtifact
			if err := json.Unmarshal(before, &candidate); err != nil {
				t.Fatal(err)
			}
			candidate.Sessions[0].Events[0].Text[0] = "[REDACTED]"
			change(&candidate)
			data, err := json.MarshalIndent(candidate, "", "  ")
			if err != nil {
				t.Fatal(err)
			}
			if err := applyFinalTextRedactions(&original, data); err == nil {
				t.Fatal("accepted changed envelope")
			}
			after, _ := json.MarshalIndent(original, "", "  ")
			if !bytes.Equal(after, before) {
				t.Fatal("rejected candidate partially mutated original")
			}
		})
	}
	for name, data := range map[string][]byte{
		"unknown-field": bytes.Replace(before, []byte(`"schema_version": 1`), []byte(`"unknown": 1, "schema_version": 1`), 1),
		"duplicate-key": bytes.Replace(before, []byte(`"schema_version": 1`), []byte(`"schema_version": 1, "schema_version": 1`), 1),
		"case-alias":    bytes.Replace(before, []byte(`"schema_version"`), []byte(`"SCHEMA_VERSION"`), 1),
	} {
		t.Run(name, func(t *testing.T) {
			if err := applyFinalTextRedactions(&original, data); err == nil {
				t.Fatal("accepted noncanonical schema")
			}
		})
	}
}

func TestExportFinalRedactionOmissions(t *testing.T) {
	for _, existing := range []bool{false, true} {
		t.Run(map[bool]string{false: "new-omission-rejected", true: "existing-omission-preserved"}[existing], func(t *testing.T) {
			home, work, out := exportFixture(t)
			// Redacting this escaped key leaves undecodable embedded JSON.
			body := `{"Text":{"text":"{\"value\":\"public\\ntext\"}"}}`
			target := `\"value\"`
			if existing {
				body = `{"Text":{"text":"public finding synthetic-late-secret"}}`
				target = "synthetic-late-secret"
				if err := os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", fixtureRecord(`{"Text":{"text":"unsupported\\escape"}}`), 0600); err != nil {
					t.Fatal(err)
				}
			}
			if err := os.WriteFile(home+"/.kit/sessions/w-test/child.jsonl", fixtureRecord(body), 0600); err != nil {
				t.Fatal(err)
			}
			scanner := &lateExportScanner{targets: []string{target}}
			err := exportWithSanitizer(home, work, out, nil, func([]string) (*Sanitizer, error) {
				return &Sanitizer{scanner: scanner, values: map[string]struct{}{}}, nil
			})
			if !existing {
				if WorkerExitCode(err) != 51 {
					t.Fatal("new omission metadata accepted", err)
				}
				if _, err := os.Lstat(out); !os.IsNotExist(err) {
					t.Fatal("failure emitted output")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			data, err := os.ReadFile(out)
			if err != nil {
				t.Fatal(err)
			}
			var doc readableArtifact
			if err := json.Unmarshal(data, &doc); err != nil {
				t.Fatal(err)
			}
			count := 0
			for _, omission := range doc.Omissions {
				if omission == "unsafe_text_omitted" {
					count++
				}
			}
			if count != 1 || !doc.Limited || bytes.Contains(data, []byte(target)) {
				t.Fatal("retry changed existing omission metadata or leaked a finding")
			}
		})
	}
}
