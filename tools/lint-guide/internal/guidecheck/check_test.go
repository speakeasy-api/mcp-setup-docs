package guidecheck

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestCheckGuideFixtures(t *testing.T) {
	cases := []string{
		"valid", "missing-external", "missing-speakeasy", "legacy-setup",
		"bad-external-frontmatter", "bad-template-key",
		"bad-headings-anchors-screenshot", "bad-speakeasy-anchors",
		"bad-meta-schema", "bad-setup-reference", "bad-anchor-agreement",
		"unicode-heading-whitespace",
	}
	for _, name := range cases {
		t.Run(name, func(t *testing.T) {
			root := filepath.Join("testdata", name)
			raw, err := os.ReadFile(filepath.Join(root, "expected.json"))
			if err != nil {
				t.Fatal(err)
			}
			var want []Finding
			if err := json.Unmarshal(raw, &want); err != nil {
				t.Fatal(err)
			}
			got, err := CheckGuide(filepath.Join(root, "guides", "sample"), root)
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("findings mismatch\n got: %#v\nwant: %#v", got, want)
			}
		})
	}
}

func TestJavaScriptWhitespace(t *testing.T) {
	jsWhitespace := []rune{
		'\t', '\n', '\v', '\f', '\r', ' ', '\u00a0', '\u1680',
		'\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005',
		'\u2006', '\u2007', '\u2008', '\u2009', '\u200a', '\u2028',
		'\u2029', '\u202f', '\u205f', '\u3000', '\ufeff',
	}
	for _, r := range jsWhitespace {
		if !isJSWhitespace(r) {
			t.Errorf("isJSWhitespace(%U) = false, want true", r)
		}
	}
	for _, r := range []rune{'x', '\u0085', '\u200b'} {
		if isJSWhitespace(r) {
			t.Errorf("isJSWhitespace(%U) = true, want false", r)
		}
	}
}

func TestParseHeadingsUsesJavaScriptWhitespace(t *testing.T) {
	got := parseHeadings("#\u00a0Title\u3000\n###\u2007Step\u202f{#step}\ufeff")
	want := []heading{
		{level: 1, text: "Title", line: 1, index: 0},
		{level: 3, text: "Step", anchor: "step", line: 2, index: len("#\u00a0Title\u3000\n")},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("headings mismatch\n got: %#v\nwant: %#v", got, want)
	}
}

func TestSchemaMessageNormalization(t *testing.T) {
	root := filepath.Join("testdata", "bad-meta-schema")
	raw, err := os.ReadFile(filepath.Join(root, "schema-messages.json"))
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Name     string    `json:"name"`
		Meta     string    `json:"meta"`
		Expected []Finding `json:"expected"`
	}
	if err := json.Unmarshal(raw, &cases); err != nil {
		t.Fatal(err)
	}
	for _, tc := range cases {
		t.Run(tc.Name, func(t *testing.T) {
			got, err := lintMeta(tc.Meta, filepath.Join(root, "schema", "guide.v1.schema.json"))
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, tc.Expected) {
				t.Fatalf("findings mismatch\n got: %#v\nwant: %#v", got, tc.Expected)
			}
		})
	}
}

func TestMetaOracleEdgeCases(t *testing.T) {
	root := filepath.Join("testdata", "bad-meta-schema")
	validRaw, err := os.ReadFile(filepath.Join("testdata", "valid", "guides", "sample", "meta.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	minimumMeta := strings.Replace(string(validRaw), "documentation:\n", "documentation:\n  assets:\n    - id: screenshot\n      path: assets/screenshot.png\n      alt: Screenshot\n      media_type: image/png\n      content_hash: sha256:"+strings.Repeat("0", 64)+"\n      width: 1\n      height: 0\n", 1)

	cases := []struct {
		name string
		meta string
		want []Finding
	}{
		{
			name: "minimum",
			meta: minimumMeta,
			want: []Finding{finding("blocker", "meta", "/documentation/assets/0/height", "meta.yaml failed schema: must be >= 1", "Fix the field so meta.yaml validates against schema/guide.v1.schema.json.")},
		},
		{
			name: "unclosed-flow-sequence",
			meta: "name: [",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Flow sequence in block collection must be sufficiently indented and end with a ] at line 1, column 8:\n\nname: [\n       ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "unclosed-flow-map",
			meta: "name: {",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Flow map in block collection must be sufficiently indented and end with a } at line 1, column 8:\n\nname: {\n       ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "mismatched-flow-sequence-end",
			meta: "name: [}",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Flow sequence in block collection must be sufficiently indented and end with a ] at line 1, column 8:\n\nname: [}\n       ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "mismatched-flow-map-end",
			meta: "name: {]",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Flow map in block collection must be sufficiently indented and end with a } at line 1, column 8:\n\nname: {]\n       ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "unexpected-flow-sequence-end",
			meta: "name: ]",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Unexpected flow-seq-end token in YAML stream: \"]\" at line 1, column 7:\n\nname: ]\n      ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "unexpected-flow-map-end",
			meta: "name: }",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Unexpected flow-map-end token in YAML stream: \"}\" at line 1, column 7:\n\nname: }\n      ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "quoted-flow-token-before-empty-alias",
			meta: "quoted: \"]\"\nbad: *",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Alias cannot be an empty string at line 2, column 6:\n\nbad: *\n     ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "comment-flow-token-before-empty-alias",
			meta: "# }\nbad: *",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Alias cannot be an empty string at line 2, column 6:\n\nbad: *\n     ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "block-scalar-flow-token-before-empty-alias",
			meta: "text: |\n  [\nbad: *",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Alias cannot be an empty string at line 3, column 6:\n\nbad: *\n     ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "nested-unclosed-flow-map",
			meta: "name: [{",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Flow map in block collection must be sufficiently indented and end with a } at line 1, column 9:\n\nname: [{\n        ^\n", "Fix YAML syntax so the file parses.")},
		},
		{
			name: "mismatched-nested-flow-end",
			meta: "name: [{]",
			want: []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: YAMLParseError: Flow map in block collection must be sufficiently indented and end with a } at line 1, column 9:\n\nname: [{]\n        ^\n", "Fix YAML syntax so the file parses.")},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := lintMeta(tc.meta, filepath.Join(root, "schema", "guide.v1.schema.json"))
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("findings mismatch\n got: %#v\nwant: %#v", got, tc.want)
			}
		})
	}
}
