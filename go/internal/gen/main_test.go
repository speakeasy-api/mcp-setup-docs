package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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
remotes:
  - id: hosted
    url: https://mcp.example.com/demo
    transport: streamable-http
`
	for name, body := range map[string]string{
		"meta.yaml":    meta,
		"external.md":  "# external\n",
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
	for _, want := range []string{"Summary:", "SpeakeasyAddServer:", "https://mcp.example.com/demo", "com.example/demo"} {
		if !strings.Contains(string(idx), want) {
			t.Errorf("index_gen.go missing %q", want)
		}
	}
}
