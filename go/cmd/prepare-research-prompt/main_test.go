package main

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryprompt"
	"os"
	"testing"
)

func TestInvalidArguments(t *testing.T) {
	for _, args := range [][]string{nil, {"--unknown", "secret"}, {"--document", "missing", "--sha256", "secret", "--kind", "initial", "--input", "missing"}} {
		var out, err bytes.Buffer
		if run(args, &out, &err) == 0 || out.Len() != 0 || bytes.Contains(err.Bytes(), []byte("secret")) {
			t.Fatal("unsafe CLI failure")
		}
	}
}

func TestSuccess(t *testing.T) {
	d, e := os.ReadFile("../../../docs/research-prompt-draft.md")
	if e != nil {
		t.Fatal(e)
	}
	h := fmt.Sprintf("%x", sha256.Sum256(d))
	for _, kind := range []string{"initial", "follow-up"} {
		name := "topic-5"
		if kind == "follow-up" {
			name = "follow-up-2"
		}
		path := "../../../factory/tests/fixtures/research/" + name + ".input.json"
		in, e := os.ReadFile(path)
		if e != nil {
			t.Fatal(e)
		}
		want, e := factoryprompt.Assemble(d, h, kind, in)
		if e != nil {
			t.Fatal(e)
		}
		var out, err bytes.Buffer
		if run([]string{"--document", "../../../docs/research-prompt-draft.md", "--sha256", h, "--kind", kind, "--input", path}, &out, &err) != 0 || err.Len() != 0 || !bytes.Equal(out.Bytes(), want) {
			t.Fatal("CLI did not forward exact prompt")
		}
	}
}
