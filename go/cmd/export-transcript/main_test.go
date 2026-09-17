package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestCLI(t *testing.T) {
	base, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	home, work, out := base+"/home", base+"/work", base+"/out/readable.json"
	for _, p := range []string{home + "/.kit/sessions/w-fixture", work, filepath.Dir(out)} {
		if err := os.MkdirAll(p, 0700); err != nil {
			t.Fatal(err)
		}
	}
	const secret = "synthetic-openrouter-key-for-cli-test"
	t.Setenv("OPENROUTER_API_KEY", secret)
	data := []byte(`{"schema_version":3,"session_id":"fake-private","generation":1,"item":{"id":null,"kind":"Assistant","parts":[{"Text":{"text":"Public evidence ` + secret + `","metadata":{}}}],"metadata":{},"usage":null,"finish_reason":null,"created_at":null}}` + "\n")
	if err := os.WriteFile(home+"/.kit/sessions/w-fixture/test.jsonl", data, 0600); err != nil {
		t.Fatal(err)
	}
	var stderr bytes.Buffer
	if code := run([]string{"--home", home, "--workspace", work, "--output", out}, &stderr); code != 0 {
		t.Fatalf("code %d: %s", code, stderr.String())
	}
	b, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(b, []byte(secret)) || stderr.Len() != 0 || !bytes.Contains(b, []byte("Public evidence")) {
		t.Fatal("unsafe CLI output")
	}
	for _, args := range [][]string{{"--secret", secret}, {"--home", home}, {"--home", home, "--workspace", work, "--output", out}} {
		stderr.Reset()
		if run(args, &stderr) == 0 {
			t.Fatal("unsafe invocation accepted")
		}
		if bytes.Contains(stderr.Bytes(), []byte(secret)) || bytes.Contains(stderr.Bytes(), []byte(home)) {
			t.Fatal("private error text")
		}
	}
}

func TestCLIAssistantNativeHandleProjection(t *testing.T) {
	base, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	home, work, out := base+"/home", base+"/workspace", base+"/export/readable.json"
	for _, path := range []string{home + "/.kit/sessions/w-test", work, filepath.Dir(out)} {
		if err := os.MkdirAll(path, 0700); err != nil {
			t.Fatal(err)
		}
	}
	handle := `{"id":"private-child-handle-123","generation":1,"output":"public finding","updates":{"items":[],"truncated":false}}`
	wrapped, _ := json.Marshal(map[string]any{"nested": []any{handle}})
	parts := []any{}
	for _, text := range []string{handle, string(wrapped)} {
		parts = append(parts, map[string]any{"Text": map[string]any{"text": text, "metadata": map[string]any{}}})
	}
	record, _ := json.Marshal(map[string]any{"schema_version": 3, "session_id": "synthetic-session", "generation": 1, "item": map[string]any{"kind": "Assistant", "parts": parts}})
	os.WriteFile(home+"/.kit/sessions/w-test/session.jsonl", append(record, '\n'), 0600)
	var stderr bytes.Buffer
	if run([]string{"--home", home, "--workspace", work, "--output", out}, &stderr) != 0 {
		t.Fatal(stderr.String())
	}
	data, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(data, []byte("private-child-handle-123")) {
		t.Fatal("native handle leaked through ordinary Assistant Text")
	}
	if !bytes.Contains(data, []byte("public finding")) || !bytes.Contains(data, []byte("native_handle_metadata")) {
		t.Fatal("readable output or explicit omission lost")
	}
}
