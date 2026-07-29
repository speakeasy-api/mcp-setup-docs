package guides_test

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	guides "github.com/speakeasy-api/mcp-setup-docs/go"
)

func TestSlugsMatchDisk(t *testing.T) {
	disk, err := onDiskGuideSlugs()
	if err != nil {
		t.Skipf("full checkout required: %v", err)
	}
	got := map[string]bool{}
	for _, s := range guides.Slugs() {
		got[string(s)] = true
	}
	if len(got) != len(disk) {
		t.Fatalf("slug count: embedded %d disk %d", len(got), len(disk))
	}
	for s := range disk {
		if !got[s] {
			t.Errorf("disk guide %q missing from embed", s)
		}
	}
}

func TestLookupIntercom(t *testing.T) {
	g, ok := guides.Lookup("intercom")
	if !ok {
		t.Fatal("intercom not found")
	}
	if len(g.Remotes) != 2 {
		t.Fatalf("remotes: got %d want 2", len(g.Remotes))
	}
	if len(g.Meta) == 0 || len(g.External) == 0 || len(g.Speakeasy) == 0 {
		t.Fatal("empty content bytes")
	}
	ids := map[guides.RemoteID]bool{}
	for _, r := range g.Remotes {
		ids[r.ID] = true
	}
	if !ids["us"] || !ids["eu"] {
		t.Fatalf("expected us and eu remotes, got %#v", g.Remotes)
	}
}

func TestLookupServer(t *testing.T) {
	ref, err := guides.ParseServerRef("intercom/eu")
	if err != nil {
		t.Fatal(err)
	}
	_, remote, ok := guides.LookupServer(ref)
	if !ok {
		t.Fatal("intercom/eu not found")
	}
	if remote.URL == "" || !remote.Tenanted {
		t.Fatalf("unexpected remote: %#v", remote)
	}

	sf, err := guides.ParseServerRef("salesforce/sobject-reads-sandbox")
	if err != nil {
		t.Fatal(err)
	}
	_, _, ok = guides.LookupServer(sf)
	if !ok {
		t.Fatal("salesforce/sobject-reads-sandbox not found")
	}
}

func TestParseServerRef(t *testing.T) {
	for _, slug := range guides.Slugs() {
		g, ok := guides.Lookup(slug)
		if !ok {
			t.Fatalf("lookup %s", slug)
		}
		for _, r := range g.Remotes {
			ref := guides.ServerRef{Guide: slug, Remote: r.ID}
			parsed, err := guides.ParseServerRef(ref.String())
			if err != nil {
				t.Fatalf("parse %s: %v", ref, err)
			}
			if parsed != ref {
				t.Fatalf("round-trip: got %#v want %#v", parsed, ref)
			}
		}
	}

	for _, bad := range []string{"", "box", "a/b/c", "Box/hosted", "box/", "/hosted"} {
		if _, err := guides.ParseServerRef(bad); err == nil {
			t.Errorf("ParseServerRef(%q) should fail", bad)
		}
	}
}

func TestResolveAliasAndProvenance(t *testing.T) {
	ms := guides.Resolve("com.googleapis.compute/mcp")
	if len(ms) == 0 {
		t.Fatal("expected alias match")
	}
	foundAlias := false
	for _, m := range ms {
		if m.Kind == guides.MatchAlias && m.Ref.Guide == "google-compute-engine" && m.Ref.Remote == "" {
			foundAlias = true
		}
	}
	if !foundAlias {
		t.Fatalf("alias match missing: %#v", ms)
	}

	ms = guides.Resolve("com.pulsemcp.mirror/box")
	foundBoxAlias := false
	foundProv := false
	for _, m := range ms {
		if m.Kind == guides.MatchAlias && m.Ref.Guide == "box" && m.Ref.Remote == "" {
			foundBoxAlias = true
		}
		if m.Kind == guides.MatchProvenance && m.Ref.Guide == "box" {
			foundProv = true
		}
	}
	if !foundBoxAlias {
		t.Fatalf("box alias match missing: %#v", ms)
	}
	if !foundProv {
		t.Fatalf("provenance match missing: %#v", ms)
	}
}

func TestByURL(t *testing.T) {
	for _, raw := range []string{"https://mcp.box.com", "https://mcp.box.com/", "HTTPS://MCP.BOX.COM"} {
		ms := guides.ByURL(raw)
		if len(ms) != 1 || ms[0].Ref.Guide != "box" {
			t.Fatalf("ByURL(%q) = %#v", raw, ms)
		}
	}
	if ms := guides.ByURL("https://example.com/not-a-guide"); len(ms) != 0 {
		t.Fatalf("unknown URL should be empty, got %#v", ms)
	}
}

func TestResolveSalesforceNoDefaultRemote(t *testing.T) {
	ms := guides.Resolve("salesforce")
	if len(ms) == 0 {
		t.Fatal("expected slug match")
	}
	for _, m := range ms {
		if m.Kind == guides.MatchSlug && m.Ref.Remote != "" {
			t.Fatalf("slug match must not select a remote: %#v", m)
		}
		if m.Kind == guides.MatchServerRef {
			t.Fatalf("Resolve(salesforce) must not invent a server ref: %#v", m)
		}
	}
}

func TestEmbedSetExcludesAuthoringFiles(t *testing.T) {
	err := fs.WalkDir(guides.FS(), ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		base := filepath.Base(p)
		switch base {
		case "research.md", "pipeline.lock.json", "README.md":
			t.Errorf("authoring file embedded: %s", p)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	for _, slug := range guides.Slugs() {
		for _, name := range []string{"meta.yaml", "external.md", "speakeasy.md"} {
			path := string(slug) + "/" + name
			if _, err := fs.Stat(guides.FS(), path); err != nil {
				t.Errorf("missing %s: %v", path, err)
			}
		}
	}
}

func TestSchemaVersion(t *testing.T) {
	if guides.SchemaVersion != 1 {
		t.Fatalf("SchemaVersion = %d", guides.SchemaVersion)
	}
}

func TestEmbedTreeMatchesSlugs(t *testing.T) {
	slugs := map[string]bool{}
	for _, s := range guides.Slugs() {
		slugs[string(s)] = true
	}
	entries, err := fs.ReadDir(guides.FS(), ".")
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		if !e.IsDir() {
			t.Errorf("unexpected non-dir in embed root: %s", e.Name())
			continue
		}
		if !slugs[e.Name()] {
			t.Errorf("stale embedded guide dir %q not in Slugs()", e.Name())
		}
		delete(slugs, e.Name())
	}
	for s := range slugs {
		t.Errorf("slug %q missing from embedded tree", s)
	}
}

func TestByURLRoundTripIndexableRemotes(t *testing.T) {
	for _, slug := range guides.Slugs() {
		g, ok := guides.Lookup(slug)
		if !ok {
			t.Fatalf("lookup %s", slug)
		}
		for _, r := range g.Remotes {
			if strings.ContainsAny(r.URL, "<>{}") {
				if ms := guides.ByURL(r.URL); len(ms) != 0 {
					t.Fatalf("templated URL %q should not be indexed, got %#v", r.URL, ms)
				}
				continue
			}
			ms := guides.ByURL(r.URL)
			found := false
			for _, m := range ms {
				if m.Ref.Guide == slug && m.Ref.Remote == r.ID {
					found = true
				}
			}
			if !found {
				t.Fatalf("ByURL(%q) did not resolve %s/%s; got %#v (norm=%q)",
					r.URL, slug, r.ID, ms, guides.NormalizeURL(r.URL))
			}
		}
	}
}

func TestSummaryAndAddServerPromoted(t *testing.T) {
	g, ok := guides.Lookup("box")
	if !ok {
		t.Fatal("box missing")
	}
	if g.Summary == "" {
		t.Fatal("expected Summary to be promoted onto Guide")
	}
	if g.SpeakeasyAddServer == "" {
		t.Fatal("expected SpeakeasyAddServer to be promoted onto Guide")
	}
}

func TestPublishedServerRefsStillResolve(t *testing.T) {
	data, err := os.ReadFile("published_server_refs.txt")
	if err != nil {
		t.Fatalf("published_server_refs.txt: %v", err)
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		ref, err := guides.ParseServerRef(line)
		if err != nil {
			t.Errorf("bad published ref %q: %v", line, err)
			continue
		}
		if _, _, ok := guides.LookupServer(ref); !ok {
			t.Errorf("published ref %s no longer resolves", line)
		}
	}
}

func TestHostedDefaultForVendorSingleRemote(t *testing.T) {
	for _, slug := range []guides.GuideSlug{"box", "github", "asana", "hubspot"} {
		g, ok := guides.Lookup(slug)
		if !ok {
			t.Fatalf("missing %s", slug)
		}
		if len(g.Remotes) != 1 || g.Remotes[0].ID != "hosted" {
			t.Fatalf("%s: want single hosted remote, got %#v", slug, g.Remotes)
		}
	}
	sf, ok := guides.Lookup("snowflake")
	if !ok {
		t.Fatal("snowflake missing")
	}
	if len(sf.Remotes) != 1 || sf.Remotes[0].ID != "cortex-agent-mcp" {
		t.Fatalf("snowflake should keep cortex-agent-mcp, got %#v", sf.Remotes)
	}
}

func onDiskGuideSlugs() (map[string]bool, error) {
	// tests run with cwd = go/
	entries, err := os.ReadDir("../guides")
	if err != nil {
		return nil, err
	}
	out := map[string]bool{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "_") {
			continue
		}
		out[name] = true
	}
	return out, nil
}
