package factorytranscript

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func fixtureRecord(part string) []byte {
	return []byte(`{"schema_version":3,"session_id":"private-id","generation":1,"item":{"kind":"Assistant","parts":[` + part + `]}}` + "\n")
}

func TestDecodePinnedSession(t *testing.T) {
	for _, name := range []string{"session", "parent"} {
		b, err := os.ReadFile("../../../factory/tests/fixtures/kit-v0.1.134/" + name + ".jsonl")
		if err != nil {
			t.Fatal(err)
		}
		got, err := decodeSession(b)
		if err != nil || len(got.Events) == 0 {
			t.Fatalf("%s: %v", name, err)
		}
		encoded, _ := json.Marshal(got)
		if bytes.Contains(encoded, []byte("synthetic-child")) || bytes.Contains(encoded, []byte("synthetic-parent")) {
			t.Fatal("raw identifier")
		}
		if name == "session" && !got.Events[len(got.Events)-1].Replacement {
			t.Fatal("replacement lost")
		}
	}
}

func TestDecodeSessionFailClosed(t *testing.T) {
	good := fixtureRecord(`{"Text":{"text":"public","metadata":{}}}`)
	cases := map[string][]byte{
		"malformed complete":  []byte("{\n"),
		"unsupported version": bytes.Replace(good, []byte(`"schema_version":3`), []byte(`"schema_version":4`), 1),
		"unknown record":      bytes.Replace(good, []byte(`"generation":1`), []byte(`"generation":1,"extra":"hidden"`), 1),
		"unknown part":        fixtureRecord(`{"Surprise":{"text":"hidden"}}`),
		"invalid text":        fixtureRecord(`{"Text":{"text":123}}`),
		"missing text":        fixtureRecord(`{"Text":{}}`),
		"duplicate key":       fixtureRecord(`{"Text":{"text":"one","text":"two"}}`),
		"multiple variants":   fixtureRecord(`{"Text":{"text":"public"},"Structured":{"value":{}}}`),
		"oversize":            bytes.Repeat([]byte("x"), (1<<20)+1),
		"both modes":          bytes.Replace(good, []byte(`"generation":1`), []byte(`"generation":1,"replacement":[]`), 1),
		"changed identity":    append(bytes.Clone(good), bytes.Replace(good, []byte("private-id"), []byte("different"), 1)...),
		"repeated generation": append(bytes.Clone(good), good...),
	}
	for name, b := range cases {
		t.Run(name, func(t *testing.T) {
			got, err := decodeSession(b)
			if err == nil || len(got.Events) != 0 {
				t.Fatal("unsafe record accepted")
			}
		})
	}
	got, err := decodeSession(append(bytes.Clone(good), []byte(`{"truncated`)...))
	if err != nil || !got.Limited || len(got.Omissions) != 1 || len(got.Events) != 1 {
		t.Fatal("tail must be explicitly omitted", err)
	}
	got, err = decodeSession(bytes.TrimSuffix(good, []byte("\n")))
	if err != nil || got.Limited || len(got.Events) != 1 {
		t.Fatal("complete final record lost", err)
	}
}

func TestDecodeToolsAndOmissions(t *testing.T) {
	call := fixtureRecord(`{"ToolCall":{"id":"private-call","name":"shell","input":{"command":"ignored private input"},"metadata":{}}}`)
	result := fixtureRecord(`{"ToolResult":{"call_id":"private-call","output":{"Structured":{"stdout":"public finding","private":"do not copy","nested":{"stderr":"public error"}}},"is_error":false,"metadata":{}}}`)
	result = bytes.Replace(result, []byte(`"generation":1`), []byte(`"generation":2`), 1)
	got, err := decodeSession(append(call, result...))
	if err != nil {
		t.Fatal(err)
	}
	b, _ := json.Marshal(got)
	for _, private := range []string{"private-call", "private-id", "do not copy", "ignored private input"} {
		if bytes.Contains(b, []byte(private)) {
			t.Fatal("private field escaped")
		}
	}
	if !strings.Contains(string(b), "public finding") || !got.Limited || got.Events[0].CallRef != got.Events[1].CallRef {
		t.Fatal("projection/correlation lost")
	}
}
