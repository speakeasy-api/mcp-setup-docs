package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryresearch"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestArguments(t *testing.T) {
	for _, a := range [][]string{{}, {"run", "--timeout-seconds", "1.5"}, {"run", "--timeout-seconds", "0"}, {"SECRET"}} {
		var out, err bytes.Buffer
		if run(context.Background(), a, &out, &err) == 0 || strings.Contains(err.String(), "SECRET") {
			t.Fatal("invalid arguments accepted or leaked")
		}
	}
}
func TestInitAndIntegerSeconds(t *testing.T) {
	w, _ := filepath.EvalSymlinks(t.TempDir())
	var out, err bytes.Buffer
	if run(context.Background(), []string{"init", "--workspace", w}, &out, &err) != 0 {
		t.Fatal(err.String())
	}
	var c factoryresearch.Clock
	if json.Unmarshal(out.Bytes(), &c) != nil || c.Deadline.Sub(c.StartedAt) != 1800*time.Second {
		t.Fatal("clock response")
	}
	out.Reset()
	if run(context.Background(), []string{"init", "--workspace", w}, &out, &err) == 0 {
		t.Fatal("reset")
	}
	for _, s := range []string{"1.5", "-1", "0", "9223372036854775807"} {
		if run(context.Background(), []string{"run", "--workspace", w, "--timeout-seconds", s}, &out, &err) == 0 {
			t.Fatal("bad seconds", s)
		}
	}
}

func TestRunIntegerSecond(t *testing.T) {
	w, _ := filepath.EvalSymlinks(t.TempDir())
	var out, err bytes.Buffer
	if run(context.Background(), []string{"init", "--workspace", w}, &out, &err) != 0 {
		t.Fatal(err.String())
	}
	out.Reset()
	d, e := os.ReadFile("../../../docs/research-prompt-draft.md")
	if e != nil {
		t.Fatal(e)
	}
	in, e := os.ReadFile("../../../factory/tests/fixtures/research/topic-1.input.json")
	if e != nil {
		t.Fatal(e)
	}
	in = []byte(strings.ReplaceAll(string(in), "900", "1"))
	os.WriteFile(w+"/doc.md", d, 0600)
	os.WriteFile(w+"/.factory/research/in.json", in, 0600)
	os.MkdirAll(w+"/factory/mcp", 0700)
	os.WriteFile(w+"/factory/mcp/exa.json", []byte("{}"), 0600)
	os.WriteFile(w+"/fake", []byte("#!/bin/sh\nprintf 'canary\\nsession_id: s-cli\\n'\n"), 0700)
	t.Setenv("FACTORY_RESEARCH_KIT", w+"/fake")
	t.Setenv("KIT_MODEL", "model")
	t.Setenv("KIT_REASONING_EFFORT", "high")
	args := []string{"run", "--workspace", w, "--document", w + "/doc.md", "--sha256", fmt.Sprintf("%x", sha256.Sum256(d)), "--kind", "initial", "--input", w + "/.factory/research/in.json", "--timeout-seconds", "1"}
	if run(context.Background(), args, &out, &err) != 0 {
		t.Fatal(err.String())
	}
	var r factoryresearch.Result
	if json.Unmarshal(out.Bytes(), &r) != nil || r.Status != "complete" || r.SessionID != "s-cli" {
		t.Fatal(out.String())
	}
	st, e := os.Stat(w + "/" + r.ExecutionPath)
	if e != nil || st.Mode().Perm() != 0600 {
		t.Fatal("record permissions", e)
	}
}
