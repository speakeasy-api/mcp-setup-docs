package main

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// fieldSet reports whether the generated index sets field to value. It
// ignores the column alignment gofmt applies, which shifts whenever a new
// field lengthens the struct literal.
func fieldSet(s, field, value string) bool {
	return regexp.MustCompile(regexp.QuoteMeta(field) + `:\s+` + regexp.QuoteMeta(value) + `,`).MatchString(s)
}

func TestNormalizeURLMatchesRuntimeRules(t *testing.T) {
	cases := map[string]string{
		"https://mcp.box.com":               "https://mcp.box.com",
		"https://mcp.box.com/":              "https://mcp.box.com",
		"HTTPS://MCP.BOX.COM":               "https://mcp.box.com",
		"https://mcp.box.com:443/path/":     "https://mcp.box.com/path",
		"https://example.com/mcp?a=b/":      "https://example.com/mcp?a=b/",
		"https://example.com/mcp?a=b/#frag": "https://example.com/mcp?a=b/",
		"https://x.com/a/b/<placeholder>/c": "https://x.com/a/b/%3Cplaceholder%3E/c",
	}
	for in, want := range cases {
		if got := normalizeURL(in); got != want {
			t.Errorf("normalizeURL(%q)=%q want %q", in, got, want)
		}
	}
}

func TestIsIndexableURL(t *testing.T) {
	if !isIndexableURL("https://mcp.box.com") {
		t.Fatal("concrete URL should be indexable")
	}
	if isIndexableURL("https://<account_url>/mcp") {
		t.Fatal("templated URL should not be indexable")
	}
}

func TestPruneStaleGuideDirs(t *testing.T) {
	dir := t.TempDir()
	keep := filepath.Join(dir, "box")
	stale := filepath.Join(dir, "zz-stale")
	if err := os.MkdirAll(filepath.Join(keep, "x"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(stale, "x"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := pruneStaleGuideDirs(dir, []string{"box"}); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(keep); err != nil {
		t.Fatalf("kept dir missing: %v", err)
	}
	if _, err := os.Stat(stale); !os.IsNotExist(err) {
		t.Fatalf("stale dir still present: %v", err)
	}
}

func TestSyncPublishedRefsAppendOnly(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "published_server_refs.txt")
	current := map[string]struct{}{
		"box/hosted":  {},
		"intercom/eu": {},
		"intercom/us": {},
	}
	if err := syncPublishedRefs(path, current); err != nil {
		t.Fatal(err)
	}
	current["github/hosted"] = struct{}{}
	if err := syncPublishedRefs(path, current); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "github/hosted") {
		t.Fatalf("expected new ref in file:\n%s", data)
	}
	delete(current, "box/hosted")
	err = syncPublishedRefs(path, current)
	if err == nil {
		t.Fatal("expected append-only violation")
	}
	if !strings.Contains(err.Error(), "box/hosted") {
		t.Fatalf("error should mention removed ref: %v", err)
	}
}

func TestRunEndToEndCopiesAssetsAndPrunes(t *testing.T) {
	root := t.TempDir()
	guidesDir := filepath.Join(root, "guides", "demo")
	assetsDir := filepath.Join(guidesDir, "assets")
	moduleRoot := filepath.Join(root, "go")
	genDir := filepath.Join(moduleRoot, "internal", "gen")
	for _, d := range []string{guidesDir, assetsDir, genDir} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(moduleRoot, "go.mod"), []byte("module github.com/speakeasy-api/mcp-setup-docs/go\n\ngo 1.22\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	meta := `schema_version: 1
slug: demo
title: Demo
summary: A demo guide.
speakeasy_add_server: catalog
aliases:
  - com.example/demo
documentation:
  external: external.md
  speakeasy: speakeasy.md
  assets:
    - path: assets/shot.png
      content_hash: ""
credential_setup:
  options:
    - id: oauth-app
      kind: oauth
      client_registration: manual
      upstream_setup: provider-steps
remotes:
  - id: hosted
    url: https://mcp.example.com/demo
    transport: streamable-http
`
	for name, body := range map[string]string{
		"meta.yaml": meta,
		// The canonical callback key here takes run() through the accept
		// path of the template scan, not only the rejections below.
		"external.md":  "# external\n\nEnter {{ gram.oauth.callback_url }} in the field.\n",
		"speakeasy.md": "# speakeasy\n",
	} {
		if err := os.WriteFile(filepath.Join(guidesDir, name), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	png := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}
	if err := os.WriteFile(filepath.Join(assetsDir, "shot.png"), png, 0o644); err != nil {
		t.Fatal(err)
	}

	// A guide whose ONLY reason to need setup is a tenanted remote: the
	// option is public and asks nothing of the reader upstream. No real
	// guide has this shape, so without this fixture nothing would notice
	// the tenanted term being dropped from SetupRequired.
	tenantDir := filepath.Join(root, "guides", "tenant")
	if err := os.MkdirAll(tenantDir, 0o755); err != nil {
		t.Fatal(err)
	}
	tenantMeta := `schema_version: 1
slug: tenant
title: Tenant
summary: A guide whose only setup burden is a tenanted URL.
documentation:
  external: external.md
  speakeasy: speakeasy.md
credential_setup:
  options:
    - id: public
      kind: open
      upstream_setup: none
remotes:
  - id: hosted
    url: https://mcp.example.com/tenant
    transport: streamable-http
    tenanted: true
`
	for name, body := range map[string]string{
		"meta.yaml":    tenantMeta,
		"external.md":  "# external\n",
		"speakeasy.md": "# speakeasy\n",
	} {
		if err := os.WriteFile(filepath.Join(tenantDir, name), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	stale := filepath.Join(moduleRoot, "generated", "guides", "zz-stale")
	if err := os.MkdirAll(stale, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(stale, "meta.yaml"), []byte("stale"), 0o644); err != nil {
		t.Fatal(err)
	}

	old, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = os.Chdir(old) }()
	if err := os.Chdir(genDir); err != nil {
		t.Fatal(err)
	}
	if err := run(); err != nil {
		t.Fatalf("run: %v", err)
	}

	assetOut := filepath.Join(moduleRoot, "generated", "guides", "demo", "assets", "shot.png")
	if _, err := os.Stat(assetOut); err != nil {
		t.Fatalf("asset not copied: %v", err)
	}
	if _, err := os.Stat(stale); !os.IsNotExist(err) {
		t.Fatalf("stale guide not pruned: %v", err)
	}
	refsPath := filepath.Join(moduleRoot, "published_server_refs.txt")
	data, err := os.ReadFile(refsPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "demo/hosted\n") && !strings.HasSuffix(strings.TrimSpace(string(data)), "demo/hosted") {
		t.Fatalf("published refs missing demo/hosted:\n%s", data)
	}
	idx, err := os.ReadFile(filepath.Join(moduleRoot, "index_gen.go"))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"Summary:", "SpeakeasyAddServer:", "https://mcp.example.com/demo", "com.example/demo",
		`{ID: "oauth-app", Kind: "oauth", ClientRegistration: "manual", UpstreamSetup: "provider-steps", SpeakeasySetup: "manual-oauth"},`,
	} {
		if !strings.Contains(string(idx), want) {
			t.Errorf("index_gen.go missing %q", want)
		}
	}

	_, afterDemo, _ := strings.Cut(string(idx), `"demo": {`)
	demoEntry, _, _ := strings.Cut(afterDemo, "\n\t},")
	if !fieldSet(demoEntry, "SetupRequired", "true") {
		t.Errorf("demo should need setup, got:\n%s", demoEntry)
	}

	_, afterTenant, _ := strings.Cut(string(idx), `"tenant": {`)
	tenantEntry, _, _ := strings.Cut(afterTenant, "\n\t},")
	if !fieldSet(tenantEntry, "SetupRequired", "true") {
		t.Errorf("tenanted remote must force SetupRequired=true, got:\n%s", tenantEntry)
	}
	// Guards the fixture itself: if its option ever needs setup, the
	// assertion above would pass for the wrong reason.
	if !strings.Contains(tenantEntry, `UpstreamSetup: "none", SpeakeasySetup: "none"`) {
		t.Errorf("tenant fixture no longer isolates the tenanted term:\n%s", tenantEntry)
	}
}

// The generator is the only place that enforces the one-key rule, so the
// rejections matter as much as the happy path: the renderers substitute
// with a literal byte replacement on the strength of this check.
func TestScanTemplateKeys(t *testing.T) {
	for _, tc := range []struct {
		name      string
		external  string
		speakeasy string
		meta      string
		errText   string
	}{
		{name: "no keys", external: "# external\n", speakeasy: "# speakeasy\n"},
		{
			name:     "canonical key in external",
			external: "Enter " + canonicalCallbackKey + " here.\n",
		},
		{
			name:      "canonical key in speakeasy",
			speakeasy: "Confirm " + canonicalCallbackKey + " matches.\n",
		},
		{
			name:     "non-canonical spacing",
			external: "Enter {{gram.oauth.callback_url}} here.\n",
			errText:  "only supported key",
		},
		{
			name:     "unknown key",
			external: "Enter {{ gram.server.redirect_uri }} here.\n",
			errText:  "only supported key",
		},
		{
			name:    "key in meta",
			meta:    "callback: \"" + canonicalCallbackKey + "\"\n",
			errText: "meta.yaml carries template key",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			files := map[string]string{
				"external.md":  "# external\n" + tc.external,
				"speakeasy.md": "# speakeasy\n" + tc.speakeasy,
			}
			for name, body := range files {
				if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o644); err != nil {
					t.Fatal(err)
				}
			}
			err := scanTemplateKeys("demo", dir, []byte("slug: demo\n"+tc.meta))
			if tc.errText != "" {
				if err == nil {
					t.Fatalf("expected an error mentioning %q, got nil", tc.errText)
				}
				if !strings.Contains(err.Error(), tc.errText) {
					t.Fatalf("error %v should mention %q", err, tc.errText)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestDeriveSpeakeasySetup(t *testing.T) {
	for _, tc := range []struct {
		name string
		opt  credentialOptionMeta
		want string
	}{
		{"open", credentialOptionMeta{ID: "public", Kind: "open"}, "none"},
		{"api key", credentialOptionMeta{ID: "token", Kind: "api_key"}, "headers"},
		{"oauth dcr", credentialOptionMeta{ID: "o", Kind: "oauth", ClientRegistration: "dynamic"}, "dcr"},
		{"oauth manual", credentialOptionMeta{ID: "o", Kind: "oauth", ClientRegistration: "manual"}, "manual-oauth"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, err := deriveSpeakeasySetup("demo", tc.opt)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestDeriveSpeakeasySetupRejectsGaps(t *testing.T) {
	// Both cases are unreachable through schema validation; the generator
	// must still refuse rather than invent a value.
	for _, tc := range []struct {
		name string
		opt  credentialOptionMeta
	}{
		{"oauth without client_registration", credentialOptionMeta{ID: "o", Kind: "oauth"}},
		{"unknown kind", credentialOptionMeta{ID: "o", Kind: "mtls"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := deriveSpeakeasySetup("demo", tc.opt); err == nil {
				t.Fatal("expected an error, got nil")
			}
		})
	}
}
