package factorytranscript

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// Source-derived synthetic fixtures: Kit 735409e src/session.rs Record and
// ChildSnapshot; src/session/children.rs DurableChild; agentkit-core
// 0.10.5+git8e4ee Item/Part. No provider session data or pin changes.
const childFixture = `{"id":"child-1","acp_session_id":"PRIVATE_ACP","name":"PRIVATE_NAME","task":"PRIVATE_TASK","generation":2,"handle_generation":2,"output":{"private":"PRIVATE_OUTPUT"},"updates":{"private":"PRIVATE_UPDATES"},"harness":"PRIVATE_HARNESS","model":null,"root":"/PRIVATE_ROOT","depth":1,"lifecycle":"Idle","created_at_unix_ms":0}`
const visibleItem = `{"kind":"Assistant","parts":[{"Text":{"text":"repeat"}}]}`
const snapshotFixture = `{"replacement":[` + visibleItem + `,{"kind":"Assistant","parts":[{"Text":{"text":"snapshot unique synthetic-key-never-real"}}]}],"children":[` + childFixture + `],"title_seed":[{"kind":"User","parts":[{"Text":{"text":"PRIVATE_TITLE"}}]}]}`

func childRecord(version, generation int, field, value string) string {
	b, _ := json.Marshal(map[string]any{"schema_version": version, "session_id": "private-id", "generation": generation, "workspace_root": "/private", "placeholder": nil})
	return strings.Replace(string(b), `"placeholder":null`, `"`+field+`":`+value, 1) + "\n"
}
func mixedChildren() []byte {
	return []byte(childRecord(3, 1, "item", visibleItem) + childRecord(5, 2, "child", childFixture) + childRecord(5, 3, "child", strings.Replace(strings.Replace(childFixture, `"Idle"`, `"Interrupted"`, 1), `"handle_generation":2`, `"handle_generation":1`, 1)) + childRecord(5, 4, "snapshot", snapshotFixture) + childRecord(5, 5, "child", strings.Replace(childFixture, `"Idle"`, `"Closed"`, 1)) + childRecord(3, 6, "item", visibleItem))
}
func TestSchema5Observations(t *testing.T) {
	got, err := decodeSession(mixedChildren())
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Events) != 4 {
		t.Fatalf("events: %+v", got.Events)
	}
	for i, want := range []string{"repeat", "repeat", "snapshot unique synthetic-key-never-real", "repeat"} {
		if got.Events[i].Text[0] != want || got.Events[i].Replacement != (i == 1 || i == 2) {
			t.Fatalf("observation %d: %+v", i, got.Events[i])
		}
	}
	b, _ := json.Marshal(got)
	if bytes.Contains(b, []byte("PRIVATE_")) || !bytes.Contains(b, []byte("child_recovery_metadata")) || !got.Limited {
		t.Fatalf("private or missing omission: %s", b)
	}
}
func TestSchema5Reject(t *testing.T) {
	good := childRecord(5, 1, "child", childFixture)
	cases := map[string]string{
		"unknown version":    childRecord(6, 1, "child", childFixture),
		"redirect snapshot":  childRecord(4, 1, "snapshot", snapshotFixture),
		"v3 child":           childRecord(3, 1, "child", childFixture),
		"v5 item":            childRecord(5, 1, "item", visibleItem),
		"v5 replacement":     childRecord(5, 1, "replacement", "["+visibleItem+"]"),
		"mixed":              strings.Replace(good, `"child":`, `"item":`+visibleItem+`,"child":`, 1),
		"unknown":            strings.Replace(good, `"child":`, `"unknown":1,"child":`, 1),
		"duplicate":          strings.Replace(good, `"output":{`, `"output":null,"output":{`, 1),
		"nested duplicate":   strings.Replace(good, `"private":"PRIVATE_OUTPUT"`, `"x":1,"x":2`, 1),
		"no workspace":       strings.Replace(good, `,"workspace_root":"/private"`, "", 1),
		"null workspace":     strings.Replace(good, `"workspace_root":"/private"`, `"workspace_root":null`, 1),
		"empty snapshot":     childRecord(5, 1, "snapshot", `{"replacement":[],"children":[]}`),
		"duplicate children": childRecord(5, 1, "snapshot", strings.Replace(snapshotFixture, `"children":[`+childFixture+`]`, `"children":[`+childFixture+`,`+childFixture+`]`, 1)),
		"bad seed":           childRecord(5, 1, "snapshot", strings.Replace(snapshotFixture, `"kind":"User"`, `"kind":"Unknown"`, 1)),
		"empty seed":         childRecord(5, 1, "snapshot", `{"replacement":[`+visibleItem+`],"children":[],"title_seed":[]}`),
		"snapshot unknown":   childRecord(5, 1, "snapshot", strings.Replace(snapshotFixture, `"children":`, `"extra":0,"children":`, 1)),
	}
	for _, key := range []string{"id", "acp_session_id", "name", "task", "generation", "handle_generation", "output", "updates", "harness", "model", "root", "depth", "lifecycle", "created_at_unix_ms"} {
		var child map[string]any
		json.Unmarshal([]byte(childFixture), &child)
		delete(child, key)
		b, _ := json.Marshal(child)
		cases["missing "+key] = childRecord(5, 1, "child", string(b))
	}
	for key, values := range map[string][]any{"id": {"", "bad/id", strings.Repeat("a", 129)}, "acp_session_id": {"", 1}, "name": {"", false}, "task": {nil}, "harness": {""}, "model": {1}, "root": {"relative"}, "depth": {0, -1, 1.5}, "generation": {0, -1, "2"}, "handle_generation": {0, 1, 3}, "created_at_unix_ms": {-1, 1.5}, "lifecycle": {"Running"}, "unknown": {1}} {
		for i, v := range values {
			var child map[string]any
			json.Unmarshal([]byte(childFixture), &child)
			child[key] = v
			b, _ := json.Marshal(child)
			cases[key+string(rune('a'+i))] = childRecord(5, 1, "child", string(b))
		}
	}
	for name, data := range cases {
		t.Run(name, func(t *testing.T) {
			got, err := decodeSession([]byte(data))
			if err == nil || len(got.Events) != 0 {
				t.Fatal("accepted unsafe record")
			}
		})
	}
}
func TestExportSchema5(t *testing.T) {
	home, work, out := exportFixture(t)
	if err := os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", mixedChildren(), 0600); err != nil {
		t.Fatal(err)
	}
	if err := Export(home, work, out, []string{"synthetic-key-never-real"}); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(b, []byte("PRIVATE_")) || bytes.Contains(b, []byte("synthetic-key-never-real")) || !bytes.Contains(b, []byte("snapshot unique")) || !bytes.Contains(b, []byte("child_recovery_metadata")) {
		t.Fatal("unsafe or missing snapshot export")
	}
}
