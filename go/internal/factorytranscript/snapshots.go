package factorytranscript

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"regexp"
	"strings"
)

var guideNames = []string{"research.md", "meta.yaml", "external.md", "speakeasy.md"}
var reportSlug = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// Validate the fixed report contract from factory/schemas/run-report.schema.json
// and validate-report.sh, additionally requiring this plan's review_rounds == 0.
// The trusted host must validate again AFTER sanitizing any standalone report.
func decodeReport(data []byte) (map[string]any, error) {
	if len(data) > 1<<20 {
		return nil, errUnsafe
	}
	d := json.NewDecoder(bytes.NewReader(data))
	d.UseNumber()
	v, err := readValue(d, 0)
	if err != nil {
		return nil, errUnsafe
	}
	if _, err = d.Token(); err != io.EOF {
		return nil, errUnsafe
	}
	fields := []string{"schema_version", "outcome", "provider", "slug", "persona", "summary", "open_questions", "blockers", "nits", "review_rounds", "artifacts"}
	m, err := object(v, fields...)
	if err != nil || len(m) != len(fields) {
		return nil, errUnsafe
	}
	if m["schema_version"] != json.Number("1") || m["review_rounds"] != json.Number("0") {
		return nil, errUnsafe
	}
	outcome, err := stringField(m, "outcome")
	if err != nil {
		return nil, errUnsafe
	}
	switch outcome {
	case "converged", "blocked", "failed", "awaiting_scope":
	default:
		return nil, errUnsafe
	}
	summary, err := stringField(m, "summary")
	if err != nil || summary == "" {
		return nil, errUnsafe
	}
	missingIdentity := false
	for _, key := range []string{"provider", "slug", "persona"} {
		if m[key] == nil {
			missingIdentity = true
			continue
		}
		s, ok := m[key].(string)
		if !ok || s == "" {
			return nil, errUnsafe
		}
		if key == "slug" && (!reportSlug.MatchString(s) || len(s) > 200) {
			return nil, errUnsafe
		}
	}
	for _, key := range []string{"open_questions", "blockers", "nits", "artifacts"} {
		items, ok := m[key].([]any)
		if !ok {
			return nil, errUnsafe
		}
		for _, item := range items {
			s, ok := item.(string)
			if !ok || s == "" {
				return nil, errUnsafe
			}
		}
	}
	artifacts := m["artifacts"].([]any)
	seen := map[string]bool{}
	for _, item := range artifacts {
		name := item.(string)
		if seen[name] {
			return nil, errUnsafe
		}
		seen[name] = true
		allowed := false
		for _, known := range guideNames {
			if name == known {
				allowed = true
			}
		}
		if !allowed {
			return nil, errUnsafe
		}
	}
	if missingIdentity && (outcome != "blocked" && outcome != "failed" || len(artifacts) != 0) {
		return nil, errUnsafe
	}
	if outcome == "converged" {
		if len(artifacts) != 4 || len(m["blockers"].([]any)) != 0 {
			return nil, errUnsafe
		}
	} else if len(artifacts) != 0 {
		return nil, errUnsafe
	}
	if outcome == "awaiting_scope" && len(m["open_questions"].([]any)) == 0 {
		return nil, errUnsafe
	}
	return m, nil
}
func (b *sourceBoundary) snapshots(workspace, factory *os.Root, doc *readableArtifact) error {
	data, err := b.read(factory, "run-report.json")
	if os.IsNotExist(err) {
		doc.Omissions = append(doc.Omissions, "missing_candidate_report")
		return nil
	}
	if err != nil {
		return err
	}
	report, err := decodeReport(data)
	if err != nil {
		return errUnsafe
	}
	doc.Files = append(doc.Files, readableFile{"run-report.json", string(data)})
	slug, ok := report["slug"].(string)
	if !ok {
		doc.Omissions = append(doc.Omissions, "no_candidate_slug")
		return nil
	}
	guides, err := b.directory(workspace, "guides")
	if os.IsNotExist(err) {
		doc.Omissions = append(doc.Omissions, "missing_candidate_guides")
		return nil
	}
	if err != nil {
		return errUnsafe
	}
	guide, err := b.directory(guides, slug)
	if os.IsNotExist(err) {
		doc.Omissions = append(doc.Omissions, "missing_candidate_guides")
		return nil
	}
	if err != nil {
		return errUnsafe
	}
	for _, name := range guideNames {
		data, err := b.read(guide, name)
		if os.IsNotExist(err) {
			doc.Omissions = append(doc.Omissions, "missing_candidate_file")
			continue
		}
		if err != nil {
			return err
		}
		// Fixed display name: no raw slug or model-selected paths in artifact metadata.
		doc.Files = append(doc.Files, readableFile{"guide/" + name, string(data)})
	}
	return nil
}

var environmentAssignment = regexp.MustCompile(`(?m)^(?:export )?[A-Z_][A-Z0-9_]*=.+$`)

// Recognized confidential payloads are OMITTED, not merely secret-redacted.
// This is a structural privacy filter, not a credential database or validator.
// Secret matching remains exclusively the shared pinned Titus sanitizer.
func confidentialText(text string, depth int) bool {
	if depth > 32 {
		return true
	}
	if len(environmentAssignment.FindAllStringIndex(text, 3)) >= 3 {
		return true
	}
	// A referenced private source is never useful enough to risk exporting its body.
	for _, path := range []string{"/input/catalog.json", ".kit/credentials", ".kit/auth.json", ".factory/catalog.json"} {
		if strings.Contains(text, path) {
			return true
		}
	}
	d := json.NewDecoder(strings.NewReader(text))
	d.UseNumber()
	value, err := readValue(d, depth)
	if err != nil {
		return false
	}
	if _, err = d.Token(); err != io.EOF {
		return false
	}
	var private func(any) bool
	private = func(v any) bool {
		switch x := v.(type) {
		case string:
			return confidentialText(x, depth+1)
		case []any:
			for _, v := range x {
				if private(v) {
					return true
				}
			}
		case map[string]any:
			_, tenant := x["tenant"]
			_, servers := x["servers"]
			_, observed := x["observed_at"]
			if tenant && servers && observed {
				return true
			}
			_, access := x["access_token"]
			_, refresh := x["refresh_token"]
			_, tokenType := x["token_type"]
			if access && (refresh || tokenType) {
				return true
			}
			_, home := x["HOME"]
			_, path := x["PATH"]
			if home && path && len(x) >= 3 {
				return true
			}
			for _, v := range x {
				if private(v) {
					return true
				}
			}
		}
		return false
	}
	return private(value)
}
func omitConfidential(doc *readableArtifact) {
	omitted := false
	for i := range doc.Sessions {
		for j := range doc.Sessions[i].Events {
			event := &doc.Sessions[i].Events[j]
			selected := []string{}
			for _, text := range event.Text {
				if confidentialText(text, 0) {
					omitted = true
					continue
				}
				selected = append(selected, text)
			}
			event.Text = selected
		}
	}
	files := []readableFile{}
	for _, file := range doc.Files {
		if confidentialText(file.Text, 0) {
			omitted = true
			continue
		}
		files = append(files, file)
	}
	doc.Files = files
	if omitted {
		doc.Limited = true
		doc.Omissions = append(doc.Omissions, "confidential_content")
	}
}
