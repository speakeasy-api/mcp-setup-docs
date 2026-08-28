package guidecheck

import (
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestURLPlacementTypeScriptRegressions(t *testing.T) {
	v := func(source string, line, column int) URLPlacementViolation {
		return URLPlacementViolation{Source: source, Line: line, Column: column}
	}
	brackets := strings.Repeat("]", 600)
	manyBrackets := "![a `" + brackets + "` https://bad.test]" +
		"(https://good.test \"title ]( https://title.test\")"
	deep := strings.Repeat("![x", 100) + strings.Repeat("](https://image.test)", 100)
	cases := []struct {
		name     string
		markdown string
		want     []URLPlacementViolation
	}{
		{"allows structural URLs", strings.Join([]string{"[docs](https://example.com/a_(b)?x=1#part)", "<https://example.com/autolink>", "[reference][docs-ref]", "", "[docs-ref]: https://example.com/reference", "![screen](https://example.com/image.png)", "![referenced screen][image-ref]", "", "[image-ref]: https://example.com/referenced-image.png", "```text", "https://example.com/copied", "```", "~~~", "http://example.com/also-copied?x=1#part", "~~~"}, "\n"), nil},
		{"image code closing bracket", "![a `]` https://bad.test](https://good.test)", []URLPlacementViolation{v("https://bad.test", 1, 9)}},
		{"image code opening bracket", "![a `[` https://bad.test](https://good.test)", []URLPlacementViolation{v("https://bad.test", 1, 9)}},
		{"many code span brackets", manyBrackets, []URLPlacementViolation{v("https://bad.test", 1, 608), v("https://title.test", 1, strings.Index(manyBrackets, "https://title.test")+1)}},
		{"destination title delimiter-like text", "![alt](https://good.test/a](b) \"title ]( text\")", nil},
		{"nested link destination", "![[x](https://inner.test)](https://outer.test)", nil},
		{"nested image destination", "![![x](https://inner-image.test)](https://outer.test)", nil},
		{"nested autolink", "![<https://autolink.test>](https://outer.test)", nil},
		{"nested rendered link label", "![[https://label.test](https://inner.test)](https://outer.test)", []URLPlacementViolation{v("https://label.test", 1, 4)}},
		{"nested rendered image alt", "![![https://alt.test](https://inner-image.test)](https://outer.test)", []URLPlacementViolation{v("https://alt.test", 1, 5)}},
		{"unresolved full reference", "[x][https://undefined.test]", []URLPlacementViolation{v("https://undefined.test]", 1, 5)}},
		{"unresolved reference in image alt", "![[x][https://undefined.test]](https://outer.test)", []URLPlacementViolation{v("https://undefined.test]", 1, 7)}},
		{"resolved URL-like reference", "[x][https://defined.test]\n\n[https://defined.test]: /target", nil},
		{"definition before URL-like reference", "[https://defined.test]: /target\n\n[x][https://defined.test]", nil},
		{"resolved URL-like reference in image", "![[x][https://defined.test]](https://outer.test)\n\n[https://defined.test]: /target", nil},
		{"deeply nested images", deep, nil},
		{"labels alt and definition title", strings.Join([]string{"[https://example.com/label](https://example.com/destination)", "![https://alt.test](https://image.test)", "[https://label.test][ref]", "![https://ref-alt.test][image-ref]", "", "[ref]: https://dest.test", "[image-ref]: https://image-ref.test", "[d]: https://d.test \"https://title.test\""}, "\n"), []URLPlacementViolation{v("https://example.com/label", 1, 2), v("https://alt.test", 2, 3), v("https://label.test", 3, 2), v("https://ref-alt.test", 4, 3), v("https://title.test", 8, 22)}},
		{"emphasis around link", "*[x](https://dest.test)*", nil},
		{"strong around link", "**[x](https://dest.test)**", nil},
		{"emphasis around image", "*![x](https://image.test)*", nil},
		{"emphasis around reference", "*[x][https://ref.test]*\n\n[https://ref.test]: /target", nil},
		{"entity in prose URL", "See https://x.test/a&amp;b", []URLPlacementViolation{v("https://x.test/a&amp;b", 1, 5)}},
		{"entity in link label URL", "[https://x.test/a&amp;b](https://dest.test)", []URLPlacementViolation{v("https://x.test/a&amp;b", 1, 2)}},
		{"emphasis in URL", "See https://x.test/a*em*b", []URLPlacementViolation{v("https://x.test/a*em*b", 1, 5)}},
		{"trailing entity in URL", "See https://x.test/a&amp;", []URLPlacementViolation{v("https://x.test/a&amp;", 1, 5)}},
		{"trailing emphasis in URL", "See https://x.test/a*em*", []URLPlacementViolation{v("https://x.test/a*em*", 1, 5)}},
		{"entities in excluded destinations", "[docs](https://dest.test/a&amp;b) <https://autolink.test/a&amp;b>", nil},
		{"uppercase scheme", "Open HTTPS://example.com/docs", []URLPlacementViolation{v("HTTPS://example.com/docs", 1, 6)}},
		{"entity in scheme", "Open ht&#x74;ps://example.com/docs", []URLPlacementViolation{v("ht&#x74;ps://example.com/docs", 1, 6)}},
		{"entity colon in scheme", "Open http&#58;//example.com/docs", []URLPlacementViolation{v("http&#58;//example.com/docs", 1, 6)}},
		{"emphasis in scheme", "Open ht*tp*s://example.com/docs", []URLPlacementViolation{v("ht*tp*s://example.com/docs", 1, 6)}},
		{"strong in scheme", "Open h**tt**ps://example.com/docs", []URLPlacementViolation{v("h**tt**ps://example.com/docs", 1, 6)}},
		{"escaped colon in scheme", "Open http\\://example.com/docs", []URLPlacementViolation{v("http\\://example.com/docs", 1, 6)}},
		{"escaped slashes in scheme", "Open https:\\/\\/example.com/docs", []URLPlacementViolation{v("https:\\/\\/example.com/docs", 1, 6)}},
		{"rendered schemes excluded structurally", strings.Join([]string{"[link](HTTPS://link.test)", "![image](ht&#x74;ps://image.test)", "<HTTPS://autolink.test>", "[resolved][ref]", "", "[ref]: http&#58;//reference.test", "```", "ht*tp*s://fenced.test", "```"}, "\n"), nil},
		{"soft line break", "*http\ns://example.com/docs*", nil},
		{"hard space line break", "**http  \ns://example.com/docs**", nil},
		{"hard escaped line break", "*http\\\ns://example.com/docs*", nil},
		{"non CommonMark escape", "Open ht\\tps://example.com/docs", nil},
		{"literal inline code punctuation escape", "`http\\://code.test`", nil},
		{"literal indented code punctuation escape", "    http\\://indented.test", nil},
		{"literal raw HTML punctuation escape", "<div>http\\://raw.test</div>", nil},
		{"literal inline code entity scheme", "`ht&#x74;ps://code.test`", nil},
		{"literal indented code entity scheme", "    ht&#x74;ps://indented.test", nil},
		{"literal raw HTML entity scheme", "<div>ht&#x74;ps://raw.test</div>", nil},
		{"lone carriage return", "x\rhttps://cr.test", []URLPlacementViolation{v("https://cr.test", 2, 1)}},
		{"CRLF line ending", "x\r\nhttps://crlf.test", []URLPlacementViolation{v("https://crlf.test", 2, 1)}},
		{"encoded definition title", "[d]: https://dest.test \"https://title.test?a=&amp;b\"", []URLPlacementViolation{v("https://title.test?a=&amp;b", 1, 25)}},
		{"multiline definition title", "[x]: https://dest.test\n  \"https://title.test\"", []URLPlacementViolation{v("https://title.test", 2, 4)}},
		{"multiline definition destination LF", "[x]:\nhttps://dest.test \"https://title.test\"", []URLPlacementViolation{v("https://title.test", 2, 20)}},
		{"multiline definition destination CRLF", "[x]:\r\nhttps://dest.test \"https://title.test\"", []URLPlacementViolation{v("https://title.test", 2, 20)}},
		{"raw HTML backtick does not hide link title", "<span data-x=\"`\">x</span>\n[x](/dest \"https://missed-title.test\")\n``", []URLPlacementViolation{v("https://missed-title.test", 2, 12)}},
		{"raw HTML paired backtick does not hide link title", "<span data-x=\"`\">x</span>\n[x](/dest \"https://missed-title.test\")\n`", []URLPlacementViolation{v("https://missed-title.test", 2, 12)}},
		{"indented code backticks do not hide link title", "    `\n\n[x](/dest \"https://missed-indented.test\")\n\n    ``", []URLPlacementViolation{v("https://missed-indented.test", 3, 12)}},
		{"indented code paired backtick does not hide link title", "    `\n\n[x](/dest \"https://missed-indented.test\")\n\n    `", []URLPlacementViolation{v("https://missed-indented.test", 3, 12)}},
		{"encoded link title", "[open](https://dest.test \"https://link-title.test?a=&amp;b\")", []URLPlacementViolation{v("https://link-title.test?a=&amp;b", 1, 27)}},
		{"image title delimiter sequence", "![alt](https://dest.test \"title ]( https://title.test\")", []URLPlacementViolation{v("https://title.test", 1, 36)}},
		{"prose and inline code", "Open https://example.com/docs.\nEnter `https://example.com/callback`.", []URLPlacementViolation{v("https://example.com/docs.", 1, 6), v("https://example.com/callback", 2, 8)}},
		{"indented code", "    https://example.com/not-fenced", []URLPlacementViolation{v("https://example.com/not-fenced", 1, 5)}},
		{"multiple query fragment URLs", "See http://a.test/x?y=1#z and https://b.test/q#end", []URLPlacementViolation{v("http://a.test/x?y=1#z", 1, 5), v("https://b.test/q#end", 1, 31)}},
		{"duplicate URL occurrences", "https://same.test and https://same.test", []URLPlacementViolation{v("https://same.test", 1, 1), v("https://same.test", 1, 23)}},
		{"raw HTML", "<div data-url=\"https://example.com/raw?x=1#part\">content</div>", []URLPlacementViolation{v("https://example.com/raw?x=1#part", 1, 16)}},
		{"unicode before URL", "é https://bad.test", []URLPlacementViolation{v("https://bad.test", 1, 4)}},
		{"unicode on prior line", "é\nhttps://bad.test", []URLPlacementViolation{v("https://bad.test", 2, 1)}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := FindURLPlacementViolations([]byte(tc.markdown))
			if !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("FindURLPlacementViolations()\n got: %#v\nwant: %#v", got, tc.want)
			}
		})
	}
}

func TestURLPlacementCheckGuideIntegration(t *testing.T) {
	root := t.TempDir()
	src := filepath.Join("testdata", "valid")
	for _, relative := range []string{"schema/guide.v1.schema.json", "guides/sample/meta.yaml", "guides/sample/external.md", "guides/sample/speakeasy.md", "guides/sample/research.md"} {
		b, err := os.ReadFile(filepath.Join(src, relative))
		if err != nil {
			t.Fatal(err)
		}
		dest := filepath.Join(root, relative)
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(dest, b, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	guide := filepath.Join(root, "guides", "sample")
	appendFile := func(name, text string) {
		p := filepath.Join(guide, name)
		f, err := os.OpenFile(p, os.O_APPEND|os.O_WRONLY, 0)
		if err != nil {
			t.Fatal(err)
		}
		defer f.Close()
		if _, err := f.WriteString(text); err != nil {
			t.Fatal(err)
		}
	}
	appendFile("external.md", "\nOpen https://external.test/docs\n")
	appendFile("speakeasy.md", "\nEnter `https://speakeasy.test/callback`.\n")
	appendFile("research.md", "\nBrowse https://research.test/notes\n")

	got, err := CheckGuide(guide, root)
	if err != nil {
		t.Fatal(err)
	}
	want := []Finding{
		urlPlacementFinding("external", 12, 6, "https://external.test/docs"),
		urlPlacementFinding("speakeasy", 11, 8, "https://speakeasy.test/callback"),
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("findings mismatch\n got: %#v\nwant: %#v", got, want)
	}
}

func TestCheckGuideOrdersStructuralFindingsBeforeURLFindings(t *testing.T) {
	root := t.TempDir()
	src := filepath.Join("testdata", "valid")
	for _, relative := range []string{"schema/guide.v1.schema.json", "guides/sample/meta.yaml", "guides/sample/external.md", "guides/sample/speakeasy.md", "guides/sample/research.md"} {
		b, err := os.ReadFile(filepath.Join(src, relative))
		if err != nil {
			t.Fatal(err)
		}
		if relative == "guides/sample/external.md" {
			b = append(b, []byte("\nOpen https://external-order.test/docs\n")...)
		}
		if relative == "guides/sample/speakeasy.md" {
			b = []byte(strings.Replace(string(b), "# Speakeasy setup", "# Wrong title", 1))
		}
		dest := filepath.Join(root, relative)
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(dest, b, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	got, err := CheckGuide(filepath.Join(root, "guides", "sample"), root)
	if err != nil {
		t.Fatal(err)
	}
	want := []Finding{
		finding("blocker", "speakeasy", "line 1", "Expected \"# Speakeasy setup\", found \"# Wrong title\".", "Rename the H1 to Speakeasy setup."),
		urlPlacementFinding("external", 12, 6, "https://external-order.test/docs"),
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("findings mismatch\n got: %#v\nwant: %#v", got, want)
	}
}

func urlPlacementFinding(target string, line, column int, source string) Finding {
	return Finding{
		Severity: "blocker", Target: target, Where: fmt.Sprintf("line %d, column %d", line, column),
		Problem:    "URL is not in a Markdown link or fenced code block: " + source,
		Suggestion: "URLs should either be Markdown links or appear in fenced code blocks. Use a link when the reader should open the URL; use a fenced code block when the reader should copy it.",
		Dimension:  "lint", Rule: "url-placement",
	}
}

func BenchmarkURLPlacementNested(b *testing.B) {
	for _, depth := range []int{25, 50, 100} {
		b.Run(fmt.Sprintf("depth-%d", depth), func(b *testing.B) {
			markdown := []byte(strings.Repeat("![x", depth) + strings.Repeat("](https://image.test)", depth))
			b.ReportAllocs()
			b.SetBytes(int64(len(markdown)))
			for i := 0; i < b.N; i++ {
				FindURLPlacementViolations(markdown)
			}
		})
	}
}

func BenchmarkURLPlacement(b *testing.B) {
	for _, repetitions := range []int{1000, 4000, 16000} {
		b.Run(fmt.Sprintf("repetitions-%d", repetitions), func(b *testing.B) {
			markdown := []byte(strings.Repeat("[ok](https://valid.test) bare https://bad.test\n", repetitions))
			b.ReportAllocs()
			b.SetBytes(int64(len(markdown)))
			for i := 0; i < b.N; i++ {
				FindURLPlacementViolations(markdown)
			}
		})
	}
}
