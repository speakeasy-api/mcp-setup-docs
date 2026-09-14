package factorytranscript

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestActualBackgroundNotification(t *testing.T) {
	b, err := os.ReadFile("../../../factory/tests/fixtures/kit-61708db/background-notification.jsonl")
	if err != nil {
		t.Fatal(err)
	}
	got, err := decodeSession(b)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Events) != 2 || got.Events[1].Part != "Structured" || got.Events[1].CallRef != "call-1" {
		t.Fatalf("missing background observation: %+v", got)
	}
	encoded, _ := json.Marshal(got)
	for _, private := range []string{"rawInput", "rawOutput", "configOptions", "SYNTHETIC_PRIVATE_REASONING", "synthetic-child"} {
		if bytes.Contains(encoded, []byte(private)) {
			t.Fatal("private metadata projected")
		}
	}
}
func TestBackgroundResultProjection(t *testing.T) {
	record := `{"schema_version":3,"session_id":"synthetic","generation":1,"item":{"kind":"Notification","parts":[{"Structured":{"value":{"call_id":"private-call","output":{"Structured":{"stdout":"public background synthetic-key-never-real","private":"PRIVATE_RESULT"}},"is_error":false,"metadata":{"private":"PRIVATE_METADATA"}},"schema":null,"metadata":{}}}]}}` + "\n"
	got, err := decodeSession([]byte(record))
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Events) != 1 || len(got.Events[0].Text) != 1 || got.Events[0].Text[0] != "public background synthetic-key-never-real" {
		t.Fatal("background output discarded")
	}
	for name, bad := range map[string]string{
		"wrong role":      strings.Replace(record, `"Notification"`, `"Assistant"`, 1),
		"unknown wrapper": strings.Replace(record, `"schema":null`, `"unknown":null`, 1),
		"schema":          strings.Replace(record, `"schema":null`, `"schema":{}`, 1),
		"bad metadata":    strings.Replace(record, `"metadata":{}}}`, `"metadata":null}}`, 1),
		"unknown result":  strings.Replace(record, `"is_error":false`, `"is_error":false,"unknown":0`, 1),
		"duplicate":       strings.Replace(record, `"call_id":"private-call"`, `"call_id":"private-call","call_id":"other"`, 1),
		"bad output":      strings.Replace(record, `"Structured":{"stdout"`, `"Unknown":{"stdout"`, 1),
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := decodeSession([]byte(bad)); err == nil {
				t.Fatal("accepted invalid notification")
			}
		})
	}
	home, work, out := exportFixture(t)
	if err := os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", []byte(record), 0600); err != nil {
		t.Fatal(err)
	}
	if err := Export(home, work, out, []string{"synthetic-key-never-real"}); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(b, []byte("PRIVATE_")) || bytes.Contains(b, []byte("synthetic-key-never-real")) || !bytes.Contains(b, []byte("public background")) {
		t.Fatal("unsafe background export")
	}
}
