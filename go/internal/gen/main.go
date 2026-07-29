// Command gen syncs publishable guide files into go/generated and emits
// the identity index used by package guides.
//
// It may read ../guides (parent of the Go module). Only go:embed cannot.
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"
)

var kebab = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

type assetMeta struct {
	Path        string `yaml:"path"`
	ContentHash string `yaml:"content_hash"`
}

type provenanceMeta struct {
	Name string `yaml:"name"`
}

type remoteMeta struct {
	ID         string           `yaml:"id"`
	URL        string           `yaml:"url"`
	Transport  string           `yaml:"transport"`
	Tenanted   bool             `yaml:"tenanted"`
	Provenance []provenanceMeta `yaml:"provenance"`
}

type metaFile struct {
	SchemaVersion      int      `yaml:"schema_version"`
	Slug               string   `yaml:"slug"`
	Title              string   `yaml:"title"`
	Summary            string   `yaml:"summary"`
	SpeakeasyAddServer string   `yaml:"speakeasy_add_server"`
	Aliases            []string `yaml:"aliases"`
	Documentation      struct {
		External  string      `yaml:"external"`
		Speakeasy string      `yaml:"speakeasy"`
		Assets    []assetMeta `yaml:"assets"`
	} `yaml:"documentation"`
	Remotes    []remoteMeta     `yaml:"remotes"`
	Provenance []provenanceMeta `yaml:"provenance"`
}

type remoteIndex struct {
	ID        string
	URL       string
	Transport string
	Tenanted  bool
}

type guideIndex struct {
	Slug               string
	Title              string
	Summary            string
	SpeakeasyAddServer string
	Aliases            []string
	Remotes            []remoteIndex
	ProvenanceNames    []string
	RemoteProvenances  [][]string // parallel to Remotes
	AssetPaths         []string
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "gen: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	moduleRoot, err := findModuleRoot()
	if err != nil {
		return err
	}
	repoRoot := filepath.Dir(moduleRoot)
	guidesSrc := filepath.Join(repoRoot, "guides")
	outRoot := filepath.Join(moduleRoot, "generated")
	outGuides := filepath.Join(outRoot, "guides")

	entries, err := os.ReadDir(guidesSrc)
	if err != nil {
		return fmt.Errorf("read guides: %w", err)
	}

	var slugs []string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "_") {
			continue
		}
		slugs = append(slugs, name)
	}
	sort.Strings(slugs)
	if len(slugs) == 0 {
		return fmt.Errorf("no guide directories under %s", guidesSrc)
	}

	if err := os.MkdirAll(outGuides, 0o755); err != nil {
		return err
	}

	guides := make([]guideIndex, 0, len(slugs))
	aliasToSlug := map[string]string{}
	urlToRefs := map[string][]string{} // normalized URL → "slug/remote"
	provToRefs := map[string][]string{}
	currentRefs := map[string]struct{}{}

	for _, slug := range slugs {
		srcDir := filepath.Join(guidesSrc, slug)
		metaPath := filepath.Join(srcDir, "meta.yaml")
		raw, err := os.ReadFile(metaPath)
		if err != nil {
			return fmt.Errorf("%s: read meta.yaml: %w", slug, err)
		}
		var meta metaFile
		if err := yaml.Unmarshal(raw, &meta); err != nil {
			return fmt.Errorf("%s: parse meta.yaml: %w", slug, err)
		}
		if meta.Slug != slug {
			return fmt.Errorf("%s: slug %q does not match directory name", slug, meta.Slug)
		}
		if !kebab.MatchString(meta.Slug) {
			return fmt.Errorf("%s: slug is not kebab-case", slug)
		}
		if meta.Title == "" {
			return fmt.Errorf("%s: empty title", slug)
		}
		if len(meta.Remotes) == 0 {
			return fmt.Errorf("%s: no remotes", slug)
		}

		core := []string{"meta.yaml", "external.md", "speakeasy.md"}
		for _, name := range core {
			p := filepath.Join(srcDir, name)
			st, err := os.Stat(p)
			if err != nil {
				return fmt.Errorf("%s: missing %s: %w", slug, name, err)
			}
			if st.Size() == 0 {
				return fmt.Errorf("%s: %s is empty", slug, name)
			}
		}

		// Rebuild each guide dir from scratch so deleted assets/files cannot linger.
		dstDir := filepath.Join(outGuides, slug)
		if err := os.RemoveAll(dstDir); err != nil {
			return err
		}
		if err := os.MkdirAll(dstDir, 0o755); err != nil {
			return err
		}
		for _, name := range core {
			if err := copyFile(filepath.Join(srcDir, name), filepath.Join(dstDir, name)); err != nil {
				return fmt.Errorf("%s: copy %s: %w", slug, name, err)
			}
		}

		g := guideIndex{
			Slug:               meta.Slug,
			Title:              meta.Title,
			Summary:            meta.Summary,
			SpeakeasyAddServer: meta.SpeakeasyAddServer,
		}
		seenRemote := map[string]struct{}{}
		for _, r := range meta.Remotes {
			if !kebab.MatchString(r.ID) {
				return fmt.Errorf("%s: remote id %q is not kebab-case", slug, r.ID)
			}
			if _, ok := seenRemote[r.ID]; ok {
				return fmt.Errorf("%s: duplicate remote id %q", slug, r.ID)
			}
			seenRemote[r.ID] = struct{}{}
			if r.URL == "" || !strings.HasPrefix(r.URL, "https://") {
				return fmt.Errorf("%s: remote %s: invalid url %q", slug, r.ID, r.URL)
			}
			if r.Transport == "" {
				return fmt.Errorf("%s: remote %s: empty transport", slug, r.ID)
			}
			g.Remotes = append(g.Remotes, remoteIndex{
				ID:        r.ID,
				URL:       r.URL,
				Transport: r.Transport,
				Tenanted:  r.Tenanted,
			})
			ref := slug + "/" + r.ID
			currentRefs[ref] = struct{}{}
			if isIndexableURL(r.URL) {
				norm := normalizeURL(r.URL)
				if norm != "" {
					urlToRefs[norm] = append(urlToRefs[norm], ref)
				}
			}
			var names []string
			for _, p := range r.Provenance {
				if p.Name == "" {
					continue
				}
				names = append(names, p.Name)
				provToRefs[p.Name] = append(provToRefs[p.Name], ref)
			}
			g.RemoteProvenances = append(g.RemoteProvenances, names)
		}

		for _, a := range meta.Aliases {
			if a == "" {
				return fmt.Errorf("%s: empty alias", slug)
			}
			if other, ok := aliasToSlug[a]; ok {
				return fmt.Errorf("alias %q claimed by both %s and %s", a, other, slug)
			}
			if a == slug {
				return fmt.Errorf("%s: alias equals own slug", slug)
			}
			aliasToSlug[a] = slug
			g.Aliases = append(g.Aliases, a)
		}

		seenProv := map[string]struct{}{}
		for _, p := range meta.Provenance {
			if p.Name == "" {
				continue
			}
			if _, ok := seenProv[p.Name]; ok {
				continue
			}
			seenProv[p.Name] = struct{}{}
			g.ProvenanceNames = append(g.ProvenanceNames, p.Name)
			for _, r := range g.Remotes {
				ref := slug + "/" + r.ID
				provToRefs[p.Name] = append(provToRefs[p.Name], ref)
			}
		}

		for _, asset := range meta.Documentation.Assets {
			if asset.Path == "" {
				return fmt.Errorf("%s: asset with empty path", slug)
			}
			if !strings.HasPrefix(asset.Path, "assets/") || !strings.HasSuffix(asset.Path, ".png") {
				return fmt.Errorf("%s: asset path %q must match assets/<id>.png", slug, asset.Path)
			}
			srcAsset := filepath.Join(srcDir, asset.Path)
			data, err := os.ReadFile(srcAsset)
			if err != nil {
				return fmt.Errorf("%s: missing asset %s: %w", slug, asset.Path, err)
			}
			sum := sha256.Sum256(data)
			want := "sha256:" + hex.EncodeToString(sum[:])
			if asset.ContentHash != "" && asset.ContentHash != want {
				return fmt.Errorf("%s: asset %s hash mismatch: got %s want %s", slug, asset.Path, want, asset.ContentHash)
			}
			dstAsset := filepath.Join(dstDir, asset.Path)
			if err := os.MkdirAll(filepath.Dir(dstAsset), 0o755); err != nil {
				return err
			}
			if err := copyFile(srcAsset, dstAsset); err != nil {
				return fmt.Errorf("%s: copy asset %s: %w", slug, asset.Path, err)
			}
			g.AssetPaths = append(g.AssetPaths, asset.Path)
		}

		guides = append(guides, g)
	}

	// Drop generated guide dirs that no longer exist on disk.
	if err := pruneStaleGuideDirs(outGuides, slugs); err != nil {
		return err
	}

	slugSet := map[string]struct{}{}
	for _, g := range guides {
		slugSet[g.Slug] = struct{}{}
	}
	for alias, owner := range aliasToSlug {
		if _, ok := slugSet[alias]; ok {
			return fmt.Errorf("alias %q (owned by %s) collides with a guide slug", alias, owner)
		}
	}

	for u, refs := range urlToRefs {
		sort.Strings(refs)
		urlToRefs[u] = uniq(refs)
		if len(urlToRefs[u]) > 1 {
			fmt.Fprintf(os.Stderr, "gen: warning: normalized URL %s maps to multiple refs: %v\n", u, urlToRefs[u])
		}
	}
	for n, refs := range provToRefs {
		sort.Strings(refs)
		provToRefs[n] = uniq(refs)
	}

	if err := syncPublishedRefs(filepath.Join(moduleRoot, "published_server_refs.txt"), currentRefs); err != nil {
		return err
	}
	if err := writeIndex(filepath.Join(moduleRoot, "index_gen.go"), guides, aliasToSlug, urlToRefs, provToRefs); err != nil {
		return err
	}
	// Older layouts left a separate assets embed file; remove if present.
	_ = os.Remove(filepath.Join(moduleRoot, "embed_assets_gen.go"))
	return nil
}

func pruneStaleGuideDirs(outGuides string, slugs []string) error {
	keep := map[string]struct{}{}
	for _, s := range slugs {
		keep[s] = struct{}{}
	}
	entries, err := os.ReadDir(outGuides)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		if _, ok := keep[e.Name()]; ok {
			continue
		}
		if err := os.RemoveAll(filepath.Join(outGuides, e.Name())); err != nil {
			return fmt.Errorf("prune stale guide %s: %w", e.Name(), err)
		}
	}
	return nil
}

// syncPublishedRefs enforces append-only remote ids after first publish.
// New refs are added automatically; removing a previously published ref fails.
func syncPublishedRefs(path string, current map[string]struct{}) error {
	published, err := readPublishedRefs(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	var missing []string
	for ref := range published {
		if _, ok := current[ref]; !ok {
			missing = append(missing, ref)
		}
	}
	sort.Strings(missing)
	if len(missing) > 0 {
		return fmt.Errorf("published ServerRefs were removed (append-only after first tag): %v\nre-add the remote id or intentionally rewrite %s after a deprecation review", missing, path)
	}
	merged := map[string]struct{}{}
	for ref := range published {
		merged[ref] = struct{}{}
	}
	for ref := range current {
		merged[ref] = struct{}{}
	}
	refs := make([]string, 0, len(merged))
	for ref := range merged {
		refs = append(refs, ref)
	}
	sort.Strings(refs)
	var b strings.Builder
	b.WriteString("# Append-only list of published ServerRefs (slug/remote-id).\n")
	b.WriteString("# Generator adds new refs automatically; removing a line without\n")
	b.WriteString("# restoring the remote will fail go generate / CI.\n")
	for _, ref := range refs {
		b.WriteString(ref)
		b.WriteByte('\n')
	}
	return os.WriteFile(path, []byte(b.String()), 0o644)
}

func readPublishedRefs(path string) (map[string]struct{}, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	out := map[string]struct{}{}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		out[line] = struct{}{}
	}
	return out, nil
}

func findModuleRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	candidates := []string{wd, filepath.Join(wd, "..", "..")}
	for _, c := range candidates {
		mod := filepath.Join(c, "go.mod")
		data, err := os.ReadFile(mod)
		if err != nil {
			continue
		}
		text := string(data)
		if strings.Contains(text, "module github.com/speakeasy-api/mcp-setup-docs/go\n") ||
			strings.Contains(text, "module github.com/speakeasy-api/mcp-setup-docs/go\r\n") {
			if !strings.Contains(text, "/internal/gen") {
				return filepath.Clean(c), nil
			}
		}
	}
	dir := wd
	for {
		mod := filepath.Join(dir, "go.mod")
		if data, err := os.ReadFile(mod); err == nil {
			text := string(data)
			if strings.Contains(text, "module github.com/speakeasy-api/mcp-setup-docs/go") &&
				!strings.Contains(text, "/internal/gen") {
				return dir, nil
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", fmt.Errorf("could not locate module root github.com/speakeasy-api/mcp-setup-docs/go from %s", wd)
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func uniq(in []string) []string {
	if len(in) == 0 {
		return in
	}
	out := in[:0]
	var prev string
	first := true
	for _, s := range in {
		if first || s != prev {
			out = append(out, s)
			prev = s
			first = false
		}
	}
	return out
}

// isIndexableURL excludes templated / placeholder endpoints from ByURL.
func isIndexableURL(raw string) bool {
	return !strings.ContainsAny(raw, "<>{}")
}

// normalizeURL must match package guides.NormalizeURL exactly.
func normalizeURL(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	u, err := url.Parse(s)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return normalizeURLFallback(s)
	}
	scheme := strings.ToLower(u.Scheme)
	host := strings.ToLower(u.Host)
	if scheme == "https" {
		host = strings.TrimSuffix(host, ":443")
	}
	path := u.EscapedPath()
	if path == "/" {
		path = ""
	} else {
		path = strings.TrimSuffix(path, "/")
	}
	out := scheme + "://" + host + path
	if u.RawQuery != "" {
		out += "?" + u.RawQuery
	}
	return out
}

func normalizeURLFallback(s string) string {
	s = strings.TrimSuffix(strings.TrimSpace(s), "/")
	if i := strings.Index(s, "://"); i >= 0 {
		scheme := strings.ToLower(s[:i])
		rest := s[i+3:]
		hostEnd := len(rest)
		if j := strings.IndexAny(rest, "/?#"); j >= 0 {
			hostEnd = j
		}
		host := strings.ToLower(rest[:hostEnd])
		host = strings.TrimSuffix(host, ":443")
		pathQuery := rest[hostEnd:]
		if fq := strings.Index(pathQuery, "#"); fq >= 0 {
			pathQuery = pathQuery[:fq]
		}
		pathQuery = strings.TrimSuffix(pathQuery, "/")
		return scheme + "://" + host + pathQuery
	}
	return s
}
