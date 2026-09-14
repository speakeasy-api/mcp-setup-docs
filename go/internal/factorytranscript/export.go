package factorytranscript

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

// This is a private, UNSANITIZED projection, not an upload artifact. The owning
// exporter must sanitize all selected fields and rescan its final serialization
// with one shared Sanitizer, then check Close before writing anything.
// Normal schema-3: Kit 0.1.134 (5eb7601) and 0.2.2 (bf34745),
// src/session.rs Record/append/replace; historical fixture names retained.
// agentkit-core 0.10.5 src/lib.rs Item, Part, ToolCallPart, ToolResultPart.
// Schema-5 child/snapshot source: Kit 735409e (included in release 0.2.2, bf34745), src/session.rs; see children.go.
// Persistence generations are not native returned-handle generations.
type decodedSession struct {
	Events    []decodedEvent `json:"events"`
	Limited   bool           `json:"limited"`
	Omissions []string       `json:"omissions"`
}
type decodedEvent struct {
	Role        string   `json:"role"`
	Part        string   `json:"part"`
	Text        []string `json:"text,omitempty"`
	CallRef     string   `json:"call_ref,omitempty"`
	Replacement bool     `json:"replacement,omitempty"`
}

// readValue rejects duplicate keys and bounds recursive JSON before projection.
// Standard Unmarshal otherwise silently accepts the last duplicate field.
func readValue(d *json.Decoder, depth int) (any, error) {
	if depth > 32 {
		return nil, errUnsafe
	}
	t, err := d.Token()
	if err != nil {
		return nil, err
	}
	delim, ok := t.(json.Delim)
	if !ok {
		return t, nil
	}
	switch delim {
	case '{':
		out := map[string]any{}
		for d.More() {
			key, err := d.Token()
			if err != nil {
				return nil, err
			}
			k, ok := key.(string)
			if !ok {
				return nil, errUnsafe
			}
			if _, exists := out[k]; exists {
				return nil, errUnsafe
			}
			v, err := readValue(d, depth+1)
			if err != nil {
				return nil, err
			}
			out[k] = v
		}
		end, err := d.Token()
		if err != nil || end != json.Delim('}') {
			return nil, errUnsafe
		}
		return out, nil
	case '[':
		out := []any{}
		for d.More() {
			v, err := readValue(d, depth+1)
			if err != nil {
				return nil, err
			}
			out = append(out, v)
		}
		end, err := d.Token()
		if err != nil || end != json.Delim(']') {
			return nil, errUnsafe
		}
		return out, nil
	}
	return nil, errUnsafe
}
func object(v any, allowed ...string) (map[string]any, error) {
	m, ok := v.(map[string]any)
	if !ok {
		return nil, errUnsafe
	}
	for k := range m {
		found := false
		for _, a := range allowed {
			if k == a {
				found = true
				break
			}
		}
		if !found {
			return nil, errUnsafe
		}
	}
	return m, nil
}
func stringField(m map[string]any, k string) (string, error) {
	v, ok := m[k].(string)
	if !ok {
		return "", errUnsafe
	}
	return v, nil
}

// decodeSession keeps append/replacement observations, not a reconstructed final
// conversation. It never follows redirects, artifact links, or lifecycle files.
// An incomplete final line is the ONLY malformed-input omission. All errors
// discard preceding observations. Source reads/traversal belong to the caller.
func decodeSession(source []byte) (decodedSession, error) {
	fail := func() (decodedSession, error) { return decodedSession{}, errUnsafe }
	if len(source) > 1<<20 {
		return fail()
	}
	out := decodedSession{Events: []decodedEvent{}, Omissions: []string{}}
	omit := func(reason string) {
		out.Limited = true
		for _, s := range out.Omissions {
			if s == reason {
				return
			}
		}
		out.Omissions = append(out.Omissions, reason)
	}
	refs := map[string]string{}
	ref := func(id string) string {
		if refs[id] == "" {
			refs[id] = fmt.Sprintf("call-%d", len(refs)+1)
		}
		return refs[id]
	}
	var identity string
	var generation int64
	lines := bytes.Split(source, []byte("\n"))
	for index, line := range lines {
		if len(line) == 0 && index == len(lines)-1 {
			continue
		}
		d := json.NewDecoder(bytes.NewReader(line))
		d.UseNumber()
		value, err := readValue(d, 0)
		if err != nil {
			if index == len(lines)-1 && (err == io.EOF || err == io.ErrUnexpectedEOF) {
				omit("truncated_tail")
				break
			}
			return fail()
		}
		if _, err = d.Token(); err != io.EOF {
			return fail()
		}
		record, err := object(value, "schema_version", "session_id", "generation", "workspace_root", "item", "replacement", "redirect", "child", "snapshot")
		if err != nil {
			return fail()
		}
		version := record["schema_version"]
		if (version != json.Number("3") && version != json.Number("5")) || record["redirect"] != nil {
			return fail()
		}
		id, err := stringField(record, "session_id")
		if err != nil || id == "" {
			return fail()
		}
		if identity != "" && identity != id {
			return fail()
		}
		identity = id
		n, ok := record["generation"].(json.Number)
		if !ok {
			return fail()
		}
		next, err := n.Int64()
		if err != nil || next <= generation {
			return fail()
		}
		generation = next
		if w, exists := record["workspace_root"]; exists && w != nil {
			if _, ok := w.(string); !ok {
				return fail()
			}
		}
		var items []any
		hasReplacement := false
		if version == json.Number("5") {
			items, err = childItems(record)
			if err != nil {
				return fail()
			}
			hasReplacement = items != nil
			omit("child_recovery_metadata")
		} else {
			for _, key := range []string{"child", "snapshot"} {
				if _, exists := record[key]; exists {
					return fail()
				}
			}
			item, hasItem := record["item"]
			replacement, present := record["replacement"]
			hasReplacement = present
			if hasItem == hasReplacement {
				return fail()
			}
			items = []any{item}
			if hasReplacement {
				var ok bool
				items, ok = replacement.([]any)
				if !ok {
					return fail()
				}
			}
		}
		for _, raw := range items {
			item, err := object(raw, "id", "kind", "parts", "metadata", "usage", "finish_reason", "created_at")
			if err != nil {
				return fail()
			}
			role, err := stringField(item, "kind")
			if err != nil {
				return fail()
			}
			switch role {
			case "System", "Developer", "User", "Assistant", "Tool", "Context", "Notification":
			default:
				return fail()
			}
			parts, ok := item["parts"].([]any)
			if !ok {
				return fail()
			}
			for _, rawPart := range parts {
				if len(out.Events) >= 4096 {
					return fail()
				}
				part, ok := rawPart.(map[string]any)
				if !ok || len(part) != 1 {
					return fail()
				}
				for kind, body := range part {
					event := decodedEvent{Role: role, Part: kind, Replacement: hasReplacement}
					// Actual Kit 61708db background completions use Notification
					// + Structured(ToolResult), agentkit 8e4ee26 loop:3307-3348.
					// Accept only this envelope, then reuse the tool-result boundary.
					if kind == "Structured" {
						fields, err := object(body, "value", "schema", "metadata")
						if err != nil || role != "Notification" || len(fields) != 3 || fields["schema"] != nil {
							return fail()
						}
						if _, ok := fields["metadata"].(map[string]any); !ok {
							return fail()
						}
						result, err := object(fields["value"], "call_id", "output", "is_error", "metadata")
						if err != nil || len(result) != 4 {
							return fail()
						}
						if _, ok := result["metadata"].(map[string]any); !ok {
							return fail()
						}
						kind, body = "ToolResult", result
					}
					switch kind {
					case "Text":
						fields, err := object(body, "text", "metadata")
						if err != nil {
							return fail()
						}
						text, err := stringField(fields, "text")
						if err != nil {
							return fail()
						}
						event.Text = []string{text}
					case "Reasoning":
						fields, err := object(body, "summary", "data", "redacted", "metadata")
						if err != nil {
							return fail()
						}
						if summary := fields["summary"]; summary != nil {
							if _, ok := summary.(string); !ok {
								return fail()
							}
						}
						if _, ok := fields["redacted"].(bool); !ok {
							return fail()
						}
						// Opaque DataRef variants still require a validated decoder.
						if fields["data"] != nil {
							return fail()
						}
						omit("reasoning")
					case "ToolCall":
						fields, err := object(body, "id", "name", "input", "metadata")
						if err != nil {
							return fail()
						}
						id, err := stringField(fields, "id")
						if err != nil || id == "" {
							return fail()
						}
						if _, err = stringField(fields, "name"); err != nil {
							return fail()
						}
						if _, ok := fields["input"]; !ok {
							return fail()
						}
						event.CallRef = ref(id)
						omit("tool_inputs")
					case "ToolResult":
						fields, err := object(body, "call_id", "output", "is_error", "metadata")
						if err != nil {
							return fail()
						}
						id, err := stringField(fields, "call_id")
						if err != nil || id == "" {
							return fail()
						}
						event.CallRef = ref(id)
						if _, ok := fields["is_error"].(bool); !ok {
							return fail()
						}
						output, ok := fields["output"].(map[string]any)
						if !ok || len(output) != 1 {
							return fail()
						}
						for variant, value := range output {
							switch variant {
							case "Text", "Structured":
								if variant == "Text" {
									if _, ok := value.(string); !ok {
										return fail()
									}
								}
								selected, err := projectToolText(value, 0)
								if err != nil {
									return fail()
								}
								event.Text = selected
								omit("structured_fields")
							default:
								return fail()
							}
						}
					// Other released variants need a validated projection before support.
					// Do not accept arbitrary malformed shapes as harmless omissions.
					default:
						return fail()
					}
					if role == "System" || role == "Developer" || role == "Context" {
						event.Text = nil
						omit("private_context")
					}
					out.Events = append(out.Events, event)
				}
			}
		}
	}
	return out, nil
}

// ToolOutput::Structured is arbitrary JSON in pinned agentkit-core, as are
// compose/native-child return values. Project only known readable result slots;
// never copy a whole object, its IDs, metadata, update payloads or unknown keys.
// Text-wrapped JSON gets the SAME projection, not an all-fields escape hatch.
func projectToolText(value any, depth int) ([]string, error) {
	if depth > 32 {
		return nil, errUnsafe
	}
	out := []string{}
	switch x := value.(type) {
	case string:
		if len(x) > 1<<20 {
			return nil, errUnsafe
		}
		if confidentialText(x, 0) {
			return []string{"[confidential_content omitted]"}, nil
		}
		if json.Valid([]byte(x)) {
			d := json.NewDecoder(bytes.NewReader([]byte(x)))
			d.UseNumber()
			decoded, err := readValue(d, depth)
			if err != nil {
				return nil, errUnsafe
			}
			return projectToolText(decoded, depth+1)
		}
		return []string{x}, nil
	case []any:
		for _, v := range x {
			selected, err := projectToolText(v, depth+1)
			if err != nil {
				return nil, err
			}
			out = append(out, selected...)
			if len(out) > 4096 {
				return nil, errUnsafe
			}
		}
	case map[string]any:
		for _, key := range []string{"text", "stdout", "stderr", "output", "result", "results", "items"} {
			if v, ok := x[key]; ok {
				selected, err := projectToolText(v, depth+1)
				if err != nil {
					return nil, err
				}
				out = append(out, selected...)
				if len(out) > 4096 {
					return nil, errUnsafe
				}
			}
		}
	case nil, json.Number, bool:
		// No readable text to retain; the containing event records the omission.
	default:
		return nil, errUnsafe
	}
	return out, nil
}
