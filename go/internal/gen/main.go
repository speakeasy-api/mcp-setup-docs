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
	SchemaVersion int      `yaml:"schema_version"`
	Slug          string   `yaml:"slug"`
	Title         string   `yaml:"title"`
	Aliases       []string `yaml:"aliases"`
	Documentation struct {
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
	Slug              string
	Title             string
	Aliases           []string
	Remotes           []remoteIndex
	ProvenanceNames   []string
	RemoteProvenances [][]string // parallel to Remotes
	AssetPaths        []string
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

	// Stale generated Go sources from older layouts.
	for _, stale := range []string{
		filepath.Join(outRoot, "index_gen.go"),
		filepath.Join(outRoot, "embed_gen.go"),
	} {
		_ = os.Remove(stale)
	}

	guides := make([]guideIndex, 0, len(slugs))
	aliasToSlug := map[string]string{}
	urlToRefs := map[string][]string{} // normalized URL → "slug/remote"
	provToRefs := map[string][]string{}

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

		dstDir := filepath.Join(outGuides, slug)
		if err := os.MkdirAll(dstDir, 0o755); err != nil {
			return err
		}
		for _, name := range core {
			if err := copyFile(filepath.Join(srcDir, name), filepath.Join(dstDir, name)); err != nil {
				return fmt.Errorf("%s: copy %s: %w", slug, name, err)
			}
		}

		g := guideIndex{
			Slug:  meta.Slug,
			Title: meta.Title,
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
			norm := normalizeURL(r.URL)
			urlToRefs[norm] = append(urlToRefs[norm], ref)
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
			// Guide-level provenance resolves to every remote of that guide.
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

	// Alias must not collide with another guide's slug.
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

	if err := writeIndex(filepath.Join(moduleRoot, "index_gen.go"), guides, aliasToSlug, urlToRefs, provToRefs); err != nil {
		return err
	}
	if err := writeEmbedGen(filepath.Join(moduleRoot, "embed_assets_gen.go"), guides); err != nil {
		return err
	}
	return nil
}

func findModuleRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	// When run as go run ./internal/gen from go/, cwd is go/.
	// When run from go/internal/gen, cwd is that dir.
	candidates := []string{wd, filepath.Join(wd, "..", "..")}
	for _, c := range candidates {
		if _, err := os.Stat(filepath.Join(c, "go.mod")); err == nil {
			// Prefer the published module root (…/go/go.mod), not this nested module.
			data, err := os.ReadFile(filepath.Join(c, "go.mod"))
			if err != nil {
				continue
			}
			if strings.Contains(string(data), "module github.com/speakeasy-api/mcp-setup-docs/go\n") ||
				strings.Contains(string(data), "module github.com/speakeasy-api/mcp-setup-docs/go\r\n") {
				return filepath.Clean(c), nil
			}
		}
	}
	// Walk up looking for the published module.
	dir := wd
	for {
		mod := filepath.Join(dir, "go.mod")
		if data, err := os.ReadFile(mod); err == nil {
			if strings.HasPrefix(strings.TrimSpace(string(data)), "module github.com/speakeasy-api/mcp-setup-docs/go\n") ||
				strings.Contains(string(data), "module github.com/speakeasy-api/mcp-setup-docs/go\n") {
				// Exclude the nested gen module path suffix.
				if !strings.Contains(string(data), "/internal/gen") {
					return dir, nil
				}
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

// normalizeURL matches package guides URL normalization for the index.
func normalizeURL(raw string) string {
	s := strings.TrimSpace(raw)
	s = strings.TrimSuffix(s, "/")
	// Lowercase scheme and host only.
	if i := strings.Index(s, "://"); i >= 0 {
		scheme := strings.ToLower(s[:i])
		rest := s[i+3:]
		hostEnd := len(rest)
		if j := strings.IndexAny(rest, "/?#"); j >= 0 {
			hostEnd = j
		}
		host := strings.ToLower(rest[:hostEnd])
		// Strip default ports.
		host = strings.TrimSuffix(host, ":443")
		pathQuery := rest[hostEnd:]
		if fq := strings.Index(pathQuery, "#"); fq >= 0 {
			pathQuery = pathQuery[:fq]
		}
		s = scheme + "://" + host + pathQuery
		s = strings.TrimSuffix(s, "/")
	}
	return s
}
