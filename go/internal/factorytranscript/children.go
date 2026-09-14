package factorytranscript

import (
	"encoding/json"
	"path/filepath"
	"regexp"
	"strconv"
)

// Kit 735409e (included in release 0.2.2, bf34745): src/session/children.rs:8-45 and session.rs:2423-2432.
// Recovery output/updates are opaque JSON, already duplicate/depth checked by
// readValue. They are never projected as messages or followed as paths.
var durableChildID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)

func childUint(v any) (uint64, error) {
	n, ok := v.(json.Number)
	if !ok {
		return 0, errUnsafe
	}
	value, err := strconv.ParseUint(string(n), 10, 64)
	if err != nil {
		return 0, errUnsafe
	}
	return value, nil
}
func validateChild(v any) (string, error) {
	fields := []string{"id", "acp_session_id", "name", "task", "generation", "handle_generation", "output", "updates", "harness", "model", "root", "depth", "lifecycle", "created_at_unix_ms"}
	m, err := object(v, fields...)
	if err != nil || len(m) != len(fields) {
		return "", errUnsafe
	}
	for _, key := range []string{"id", "acp_session_id", "name", "task", "harness", "root", "lifecycle"} {
		s, err := stringField(m, key)
		if err != nil || (key != "task" && s == "") {
			return "", errUnsafe
		}
	}
	id := m["id"].(string)
	if !durableChildID.MatchString(id) || !filepath.IsAbs(m["root"].(string)) {
		return "", errUnsafe
	}
	if m["model"] != nil {
		if _, ok := m["model"].(string); !ok {
			return "", errUnsafe
		}
	}
	generation, err := childUint(m["generation"])
	if err != nil || generation == 0 {
		return "", errUnsafe
	}
	handle, err := childUint(m["handle_generation"])
	if err != nil || handle == 0 || handle > generation {
		return "", errUnsafe
	}
	depth, err := childUint(m["depth"])
	if err != nil || depth == 0 {
		return "", errUnsafe
	}
	if _, err := childUint(m["created_at_unix_ms"]); err != nil {
		return "", errUnsafe
	}
	switch m["lifecycle"] {
	case "Idle":
		if handle != generation {
			return "", errUnsafe
		}
	case "Interrupted", "Closed":
	default:
		return "", errUnsafe
	}
	return id, nil
}

// Schema 5 contains exactly one child delta or snapshot, with a workspace.
// Snapshot replacement remains an observation, not a rewrite of exported history.
func childItems(record map[string]any) ([]any, error) {
	if _, err := stringField(record, "workspace_root"); err != nil {
		return nil, errUnsafe
	}
	for _, key := range []string{"item", "replacement", "redirect"} {
		if _, ok := record[key]; ok {
			return nil, errUnsafe
		}
	}
	child, hasChild := record["child"]
	snapshot, hasSnapshot := record["snapshot"]
	if hasChild == hasSnapshot {
		return nil, errUnsafe
	}
	if hasChild {
		_, err := validateChild(child)
		return nil, err
	}
	m, err := object(snapshot, "replacement", "children", "title_seed")
	if err != nil {
		return nil, errUnsafe
	}
	items, ok := m["replacement"].([]any)
	if !ok || len(items) == 0 {
		return nil, errUnsafe
	}
	children, ok := m["children"].([]any)
	if !ok {
		return nil, errUnsafe
	}
	seen := map[string]bool{}
	for _, child := range children {
		id, err := validateChild(child)
		if err != nil || seen[id] {
			return nil, errUnsafe
		}
		seen[id] = true
	}
	if seed := m["title_seed"]; seed != nil {
		titles, ok := seed.([]any)
		if !ok || len(titles) == 0 {
			return nil, errUnsafe
		}
		// Reuse the existing Item/Part boundary without publishing catalog context or
		// sharing call references. This synthetic schema-3 record cannot recurse.
		b, err := json.Marshal(map[string]any{"schema_version": 3, "session_id": "title-validation", "generation": 1, "replacement": titles})
		if err != nil {
			return nil, errUnsafe
		}
		if _, err := decodeSession(b); err != nil {
			return nil, errUnsafe
		}
	}
	return items, nil
}
