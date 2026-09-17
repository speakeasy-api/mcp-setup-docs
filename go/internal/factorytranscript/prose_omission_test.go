package factorytranscript

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestExportMixedProseOmissions(t *testing.T) {
	const secret = "synthetic-offline-value"
	for name, text := range map[string]string{
		"quoted-tail":       `"public quotation" followed by prose`,
		"json-tail":         `{"finding":"public"} followed by prose`,
		"numbered-shell":    "1) Run curl \\\n --head https://example.com",
		"malformed-escaped": `Research {"value":"\u0073ynthetic-offline-value"`,
		"duplicate":         `{"a":1,"a":2}`,
		"collision":         `{"synthetic-offline-value":1,"[REDACTED]":2}`,
		"invalid-handle":    `{"id":"private-handle","generation":0,"output":"private output"}`,
		"nested":            `{"results":[{"stderr":"1) \\u0073ynthetic-offline-value"}]}`,
		"oversize":          strings.Repeat("x", (1<<20)+1),
	} {
		t.Run(name, func(t *testing.T) {
			home, work, out := exportFixture(t)
			parts := []any{map[string]any{"Text": map[string]string{"text": "Public finding: documented OAuth endpoint."}}, map[string]any{"Text": map[string]string{"text": text}}, map[string]any{"Text": map[string]string{"text": `{"value":"\u0073ynthetic-offline-value"}`}}}
			b, err := json.Marshal(parts)
			if err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(home+"/.kit/sessions/w-test/child.jsonl", fixtureRecord(string(b[1:len(b)-1])), 0600); err != nil {
				t.Fatal(err)
			}
			if err := Export(home, work, out, []string{secret}); err != nil {
				t.Fatal(err)
			}
			b, err = os.ReadFile(out)
			if err != nil {
				t.Fatal(err)
			}
			var doc readableArtifact
			if err := json.Unmarshal(b, &doc); err != nil {
				t.Fatal(err)
			}
			if !doc.Limited || !bytes.Contains(b, []byte("unsafe_text_omitted")) || !bytes.Contains(b, []byte("Public finding: documented OAuth endpoint.")) || bytes.Contains(b, []byte(secret)) || bytes.Contains(b, []byte(`u0073ynthetic`)) {
				t.Fatal("unsafe or unreadable artifact")
			}
			if got := doc.Sessions[0].Events[1].Text[0]; got != "[unsafe_text omitted]" {
				t.Fatalf("affected field retained original bytes: %q", got)
			}
		})
	}
}

func TestSelectedNestedScannerErrorIsFatal(t *testing.T) {
	s := &Sanitizer{scanner: &fakeScanner{mode: "error"}, values: map[string]struct{}{}}
	defer s.Close()
	if got, err := sanitizeDecoded(s, `{"value":"Public finding"}`, 0); got != "" || err != errUnsafe {
		t.Fatal("nested scanner error made recoverable", err)
	}
}
