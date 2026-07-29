package guides

import (
	"errors"
	"io/fs"
	"path"
	"regexp"
)

var (
	// ErrNotFound is reserved for fallible APIs; Lookup uses comma-ok.
	ErrNotFound = errors.New("guides: not found")

	kebab = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
)

// Remote is one MCP server endpoint documented by a guide.
type Remote struct {
	ID        RemoteID
	URL       string
	Transport string
	Tenanted  bool
}

// Guide is one published setup guide with raw content bytes.
type Guide struct {
	Slug      GuideSlug
	Title     string
	Meta      []byte // raw meta.yaml
	External  []byte // raw external.md
	Speakeasy []byte // raw speakeasy.md
	Assets    fs.FS  // nil when the guide declares no assets
	Remotes   []Remote
	Aliases   []string
}

// Slugs returns all guide slugs in sorted order.
func Slugs() []GuideSlug {
	out := make([]GuideSlug, len(generatedSlugs))
	copy(out, generatedSlugs)
	return out
}

// Guides returns every published guide in slug order.
func Guides() []Guide {
	out := make([]Guide, 0, len(generatedSlugs))
	for _, slug := range generatedSlugs {
		g, ok := Lookup(slug)
		if !ok {
			continue
		}
		out = append(out, g)
	}
	return out
}

// Lookup returns the guide for slug.
func Lookup(slug GuideSlug) (Guide, bool) {
	meta, ok := generatedGuides[slug]
	if !ok {
		return Guide{}, false
	}
	base := path.Join("generated", "guides", string(slug))
	metaBytes, err := embedded.ReadFile(path.Join(base, "meta.yaml"))
	if err != nil {
		return Guide{}, false
	}
	external, err := embedded.ReadFile(path.Join(base, "external.md"))
	if err != nil {
		return Guide{}, false
	}
	speakeasy, err := embedded.ReadFile(path.Join(base, "speakeasy.md"))
	if err != nil {
		return Guide{}, false
	}

	remotes := make([]Remote, len(meta.Remotes))
	for i, r := range meta.Remotes {
		remotes[i] = Remote{
			ID:        r.ID,
			URL:       r.URL,
			Transport: r.Transport,
			Tenanted:  r.Tenanted,
		}
	}
	aliases := make([]string, len(meta.Aliases))
	copy(aliases, meta.Aliases)

	var assets fs.FS
	if sub, err := fs.Sub(embedded, path.Join(base, "assets")); err == nil {
		// Only expose Assets when the subtree has at least one file.
		var hasFile bool
		_ = fs.WalkDir(sub, ".", func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if !d.IsDir() {
				hasFile = true
				return fs.SkipAll
			}
			return nil
		})
		if hasFile {
			assets = sub
		}
	}

	return Guide{
		Slug:      meta.Slug,
		Title:     meta.Title,
		Meta:      metaBytes,
		External:  external,
		Speakeasy: speakeasy,
		Assets:    assets,
		Remotes:   remotes,
		Aliases:   aliases,
	}, true
}

// LookupServer returns the guide and remote for a ServerRef.
func LookupServer(ref ServerRef) (Guide, Remote, bool) {
	g, ok := Lookup(ref.Guide)
	if !ok {
		return Guide{}, Remote{}, false
	}
	for _, r := range g.Remotes {
		if r.ID == ref.Remote {
			return g, r, true
		}
	}
	return Guide{}, Remote{}, false
}

// FS returns the embedded tree rooted at generated/guides/<slug>/….
// The path layout is part of the API; prefer Lookup for normal use.
func FS() fs.FS {
	sub, err := fs.Sub(embedded, "generated/guides")
	if err != nil {
		return embedded
	}
	return sub
}
