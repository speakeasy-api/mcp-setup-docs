package factorytranscript

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExportOfflineResearch(t *testing.T) {
	for name, text := range map[string]string{
		"http-error":        "403 Forbidden: official documentation returned an HTML challenge; no credentials were sent.",
		"numbered-research": "1) Read https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/\n2) Inspect /oauth2/v1/authorize and /oauth2/v1/token.\n```sh\ncurl --head https://developer.okta.com/docs/\n```",
		"nested-error":      `{"results":[{"stderr":"403 Forbidden: public documentation unavailable","stdout":"See https://developer.okta.com/docs/"}]}`,
		"html-and-escapes":  `Research <a href="https://developer.okta.com/docs/?a=1&b=2">OAuth</a> and shell examples: curl --head https://developer.okta.com/docs/`,
	} {
		t.Run(name, func(t *testing.T) {
			home, work, out := exportFixture(t)
			b, err := json.Marshal(map[string]any{"Text": map[string]string{"text": text}})
			if err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", fixtureRecord(string(b)), 0600); err != nil {
				t.Fatal(err)
			}
			if err := Export(home, work, out, nil); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestOfflineNumericPrefixBranch(t *testing.T) {
	text := "403 Forbidden: public documentation unavailable"
	s, err := NewSanitizer(nil)
	if err != nil {
		t.Fatal("scanner construction")
	}
	defer s.Close()
	if _, err := s.Sanitize([]byte(text)); err != nil {
		t.Fatal("direct scanner failure")
	}
	d := json.NewDecoder(strings.NewReader(text))
	d.UseNumber()
	v, err := readValue(d, 0)
	if err != nil {
		t.Fatal("initial parser failure")
	}
	if _, ok := v.(json.Number); !ok {
		t.Fatal("not numeric prefix")
	}
	if _, err := d.Token(); err == io.EOF {
		t.Fatal("missing trailing prose")
	}
	if _, err := sanitizeDecoded(s, text, 0); err != nil {
		t.Fatal("numeric prefix plus prose rejected before scan")
	}
}

func TestNumericProseSecurityAndRescan(t *testing.T) {
	const secret = "synthetic-offline-value<&>"
	s, err := NewSanitizer([]string{secret})
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	text := "403 Forbidden " + secret + " https://developer.okta.com/docs/?a=1&b=2"
	for range 3 {
		b, err := json.Marshal(text)
		if err != nil {
			t.Fatal(err)
		}
		text = string(b)
	}
	clean, err := sanitizeDecoded(s, text, 0)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(clean, "synthetic-offline-value") {
		t.Fatal("known value survived")
	}
	again, err := sanitizeDecoded(s, clean, 0)
	if err != nil || again != clean {
		t.Fatal("rescan not idempotent")
	}
	for _, bad := range []string{`{"x":"safe"} trailing`, `"safe" trailing`, `{"x":1,"x":2}`, strings.Repeat("x", (1<<20)+1)} {
		if _, err := sanitizeDecoded(s, bad, 0); err == nil {
			t.Fatal("strict rejection lost")
		}
	}
	if err := s.Close(); err != nil {
		t.Fatal("close failed")
	}
}

func TestFinalizeOfflineNumericResearch(t *testing.T) {
	home, _, out := exportFixture(t)
	private := filepath.Dir(home)
	if err := os.Chmod(private, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(private+"/host", 0700); err != nil {
		t.Fatal(err)
	}
	result := private + "/host/result.json"
	if err := os.WriteFile(result, []byte(`{"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","termination":"completed","exit_code":0,"container_removed":true}`), 0600); err != nil {
		t.Fatal(err)
	}
	text := `{"id":"synthetic-native-handle","generation":1,"output":{"stderr":"403 Forbidden: https://developer.okta.com/docs/","stdout":"1) Review /oauth2/v1/authorize and /oauth2/v1/token"}}`
	b, err := json.Marshal(map[string]any{"Text": map[string]string{"text": text}})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", fixtureRecord(string(b)), 0600); err != nil {
		t.Fatal(err)
	}
	if err := Finalize(private, result, filepath.Dir(out), nil); err != nil {
		t.Fatal(err)
	}
	b, err = os.ReadFile(filepath.Dir(out) + "/session-transcript.json")
	if err != nil {
		t.Fatal(err)
	}
	if !json.Valid(b) || !bytes.Contains(b, []byte("403 Forbidden")) || bytes.Contains(b, []byte("synthetic-native-handle")) {
		t.Fatal("projection or export invalid")
	}
}

func TestExportNumericProseWithholdsEscapes(t *testing.T) {
	for _, prefix := range []string{"403 ", "1) Read ", "01 "} {
		for _, suffix := range []string{`{"value":"\u0073ynthetic-offline-value"}`, `plain\backslash`} {
			for _, wrapper := range []string{"plain", "json-string", "nested-error"} {
				t.Run(prefix+suffix+wrapper, func(t *testing.T) {
					home, work, out := exportFixture(t)
					text := prefix + suffix
					var value any = text
					if wrapper == "nested-error" {
						value = map[string]any{"results": []any{map[string]string{"stderr": text}}}
					}
					if wrapper != "plain" {
						b, err := json.Marshal(value)
						if err != nil {
							t.Fatal(err)
						}
						text = string(b)
					}
					b, err := json.Marshal(map[string]any{"Text": map[string]string{"text": text}})
					if err != nil {
						t.Fatal(err)
					}
					if err := os.WriteFile(home+"/.kit/sessions/w-test/parent.jsonl", fixtureRecord(string(b)), 0600); err != nil {
						t.Fatal(err)
					}
					if err := Export(home, work, out, []string{"synthetic-offline-value"}); err != nil {
						t.Fatal(err)
					}
					b, err = os.ReadFile(out)
					if err != nil || !json.Valid(b) || !bytes.Contains(b, []byte(omittedText)) || bytes.Contains(b, []byte("u0073ynthetic")) || bytes.Contains(b, []byte("plain"+`\backslash`)) {
						t.Fatal("affected prose was not omitted", err)
					}
				})
			}
		}
	}
}
