package factorycontroller

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"unicode/utf8"
)

const decisionInputLimit = 1 << 20
const decisionStringLimit = 65536
const decisionCollectionLimit = 128

var errInvalidDecision = errors.New("invalid research decision")

// decisionObject reads exact, required fields without JSON's case folding or
// last-duplicate-wins behavior. Nested objects use the same helper.
func decisionObject(data []byte, keys ...string) (map[string]json.RawMessage, error) {
	d := json.NewDecoder(bytes.NewReader(data))
	tok, err := d.Token()
	if err != nil || tok != json.Delim('{') {
		return nil, errInvalidDecision
	}
	fields := make(map[string]json.RawMessage, len(keys))
	for d.More() {
		tok, err = d.Token()
		if err != nil {
			return nil, errInvalidDecision
		}
		key, ok := tok.(string)
		if !ok {
			return nil, errInvalidDecision
		}
		allowed := false
		for _, k := range keys {
			if key == k {
				allowed = true
				break
			}
		}
		if !allowed {
			return nil, errInvalidDecision
		}
		if _, exists := fields[key]; exists {
			return nil, errInvalidDecision
		}
		var raw json.RawMessage
		if d.Decode(&raw) != nil {
			return nil, errInvalidDecision
		}
		fields[key] = raw
	}
	if tok, err = d.Token(); err != nil || tok != json.Delim('}') {
		return nil, errInvalidDecision
	}
	if _, err = d.Token(); err != io.EOF || len(fields) != len(keys) {
		return nil, errInvalidDecision
	}
	return fields, nil
}

func decisionString(raw json.RawMessage, limit int, required bool) (string, error) {
	var s string
	if len(raw) == 0 || raw[0] != '"' || json.Unmarshal(raw, &s) != nil || len(s) > limit || (required && strings.TrimSpace(s) == "") {
		return "", errInvalidDecision
	}
	return s, nil
}

func decisionArray(raw json.RawMessage) ([]json.RawMessage, error) {
	var values []json.RawMessage
	if len(raw) == 0 || raw[0] != '[' || json.Unmarshal(raw, &values) != nil || len(values) > decisionCollectionLimit {
		return nil, errInvalidDecision
	}
	return values, nil
}

func decisionStrings(raw json.RawMessage, required bool) ([]string, error) {
	values, err := decisionArray(raw)
	if err != nil || (required && len(values) == 0) {
		return nil, errInvalidDecision
	}
	result := make([]string, 0, len(values))
	for _, value := range values {
		s, err := decisionString(value, decisionStringLimit, true)
		if err != nil {
			return nil, errInvalidDecision
		}
		result = append(result, s)
	}
	return result, nil
}

// DecodeEndpoint validates a model's factual endpoint gate. Decode errors remain
// execution errors; they are never converted into factual blockers.
func DecodeEndpoint(data []byte) (EndpointGate, error) {
	var out EndpointGate
	if len(data) > decisionInputLimit || !utf8.Valid(data) {
		return EndpointGate{}, errInvalidDecision
	}
	f, err := decisionObject(data, "established", "endpoint", "sources", "blockers")
	if err != nil {
		return EndpointGate{}, errInvalidDecision
	}
	if !bytes.Equal(f["established"], []byte("true")) && !bytes.Equal(f["established"], []byte("false")) {
		return EndpointGate{}, errInvalidDecision
	}
	out.Established = bytes.Equal(f["established"], []byte("true"))
	if out.Endpoint, err = decisionString(f["endpoint"], decisionStringLimit, out.Established); err != nil {
		return EndpointGate{}, errInvalidDecision
	}
	if out.Sources, err = decisionStrings(f["sources"], out.Established); err != nil {
		return EndpointGate{}, errInvalidDecision
	}
	if out.Blockers, err = decisionStrings(f["blockers"], !out.Established); err != nil {
		return EndpointGate{}, errInvalidDecision
	}
	if out.Established && len(out.Blockers) != 0 {
		return EndpointGate{}, errInvalidDecision
	}
	return out, nil
}

// DecodeDecision validates structure, not final readiness. Empty authentication
// and actions are legitimate intermediate results; the scheduler owns readiness.
func DecodeDecision(data []byte) (ResearchDecision, error) {
	var out ResearchDecision
	if len(data) > decisionInputLimit || !utf8.Valid(data) {
		return ResearchDecision{}, errInvalidDecision
	}
	f, err := decisionObject(data, "authentication", "actions", "follow_ups", "blockers", "dossier")
	if err != nil {
		return ResearchDecision{}, errInvalidDecision
	}
	if out.Authentication, err = decisionString(f["authentication"], decisionStringLimit, false); err != nil {
		return ResearchDecision{}, errInvalidDecision
	}
	if out.Dossier, err = decisionString(f["dossier"], decisionInputLimit, false); err != nil {
		return ResearchDecision{}, errInvalidDecision
	}
	if out.Blockers, err = decisionStrings(f["blockers"], false); err != nil {
		return ResearchDecision{}, errInvalidDecision
	}
	actions, err := decisionArray(f["actions"])
	if err != nil {
		return ResearchDecision{}, errInvalidDecision
	}
	out.Actions = make([]SetupAction, 0, len(actions))
	for _, raw := range actions {
		fields, err := decisionObject(raw, "description", "sources")
		if err != nil {
			return ResearchDecision{}, errInvalidDecision
		}
		description, err := decisionString(fields["description"], decisionStringLimit, true)
		if err != nil {
			return ResearchDecision{}, errInvalidDecision
		}
		sources, err := decisionStrings(fields["sources"], true)
		if err != nil {
			return ResearchDecision{}, errInvalidDecision
		}
		out.Actions = append(out.Actions, SetupAction{Description: description, Sources: sources})
	}
	followUps, err := decisionArray(f["follow_ups"])
	if err != nil {
		return ResearchDecision{}, errInvalidDecision
	}
	out.FollowUps = make([]FollowUpRequest, 0, len(followUps))
	var seen [6]bool
	for _, raw := range followUps {
		fields, err := decisionObject(raw, "topic", "checks")
		if err != nil {
			return ResearchDecision{}, errInvalidDecision
		}
		var topic int
		if json.Unmarshal(fields["topic"], &topic) != nil || topic < 1 || topic > 5 || seen[topic] {
			return ResearchDecision{}, errInvalidDecision
		}
		seen[topic] = true
		checks, err := decisionStrings(fields["checks"], true)
		if err != nil {
			return ResearchDecision{}, errInvalidDecision
		}
		out.FollowUps = append(out.FollowUps, FollowUpRequest{Topic: topic, Checks: checks})
	}
	return out, nil
}

// DecodeFinalization accepts only the final dossier and factual blockers, never
// a replacement authentication selection, action list, or follow-up request.
func DecodeFinalization(data []byte) (ResearchFinalization, error) {
	var out ResearchFinalization
	if len(data) > decisionInputLimit || !utf8.Valid(data) {
		return ResearchFinalization{}, errInvalidDecision
	}
	fields, err := decisionObject(data, "dossier", "blockers")
	if err != nil {
		return ResearchFinalization{}, errInvalidDecision
	}
	out.Blockers, err = decisionStrings(fields["blockers"], false)
	if err != nil {
		return ResearchFinalization{}, errInvalidDecision
	}
	out.Dossier, err = decisionString(fields["dossier"], decisionInputLimit, len(out.Blockers) == 0)
	if err != nil {
		return ResearchFinalization{}, errInvalidDecision
	}
	return out, nil
}

// WriterDecision is the only accepted writer handback; it is not a run report.
type WriterDecision struct {
	Completed     bool     `json:"completed"`
	OpenQuestions []string `json:"open_questions"`
}

func DecodeWriter(data []byte) (WriterDecision, error) {
	if len(data) > decisionInputLimit || !utf8.Valid(data) {
		return WriterDecision{}, errInvalidDecision
	}
	fields, err := decisionObject(data, "completed", "open_questions")
	if err != nil {
		return WriterDecision{}, errInvalidDecision
	}
	if !bytes.Equal(fields["completed"], []byte("true")) && !bytes.Equal(fields["completed"], []byte("false")) {
		return WriterDecision{}, errInvalidDecision
	}
	questions, err := decisionStrings(fields["open_questions"], false)
	if err != nil {
		return WriterDecision{}, errInvalidDecision
	}
	return WriterDecision{Completed: bytes.Equal(fields["completed"], []byte("true")), OpenQuestions: questions}, nil
}
