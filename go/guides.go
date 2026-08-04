package guides

import (
	"fmt"
	"io/fs"
	"path"
	"regexp"
)

var kebab = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// Remote is one MCP server endpoint documented by a guide.
type Remote struct {
	ID        RemoteID
	URL       string
	Transport string
	Tenanted  bool
}

// CredentialOption is one supported way to acquire and present credentials
// for a guide's MCP servers.
type CredentialOption struct {
	ID   string
	Kind string // "api_key", "oauth", or "open"
	// ClientRegistration is "dynamic" or "manual" when Kind is "oauth",
	// and empty otherwise.
	ClientRegistration string
	// UpstreamSetup is "none" when the reader opens nothing at the provider,
	// and "provider-steps" when they must do something there — including
	// lookups, such as finding a region-specific URL, that configure nothing.
	UpstreamSetup string
	// SpeakeasySetup is the work this option needs in the Speakeasy AI
	// Control Plane: "none", "dcr", "manual-oauth", or "headers". Derived
	// from Kind and ClientRegistration at generation time.
	SpeakeasySetup string
}

// Guide is one published setup guide with typed identity fields and raw
// content bytes. Meta remains available for fields not yet promoted.
type Guide struct {
	Slug               GuideSlug
	Title              string
	Summary            string
	SpeakeasyAddServer string // e.g. "catalog", "custom-remote"; empty if unset
	// SetupRequired reports whether the reader must do anything beyond
	// adding the server. False means the guide has nothing to teach and a
	// consumer may hide it. True when any option needs upstream or
	// Speakeasy-side setup, or any remote is tenanted — a tenanted remote
	// means the reader must be told how to find their own URL even when no
	// credential work remains.
	SetupRequired     bool
	Meta              []byte // raw meta.yaml
	External          []byte // raw external.md
	Speakeasy         []byte // raw speakeasy.md
	Assets            fs.FS  // nil when the guide declares no assets
	Remotes           []Remote
	CredentialOptions []CredentialOption
	Aliases           []string
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
			panic(fmt.Sprintf("guides: missing embed for %s", slug))
		}
		out = append(out, g)
	}
	return out
}

// Lookup returns the guide for slug. Missing slugs return ok=false.
// A known slug with a corrupt embed panics — that indicates a packaging bug.
func Lookup(slug GuideSlug) (Guide, bool) {
	if _, ok := generatedGuides[slug]; !ok {
		return Guide{}, false
	}
	g, err := lookup(slug)
	if err != nil {
		panic(fmt.Sprintf("guides: corrupt embed for %s: %v", slug, err))
	}
	return g, true
}

func lookup(slug GuideSlug) (Guide, error) {
	meta, ok := generatedGuides[slug]
	if !ok {
		return Guide{}, errNotFound
	}
	base := path.Join("generated", "guides", string(slug))
	metaBytes, err := embedded.ReadFile(path.Join(base, "meta.yaml"))
	if err != nil {
		return Guide{}, err
	}
	external, err := embedded.ReadFile(path.Join(base, "external.md"))
	if err != nil {
		return Guide{}, err
	}
	speakeasy, err := embedded.ReadFile(path.Join(base, "speakeasy.md"))
	if err != nil {
		return Guide{}, err
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
	options := make([]CredentialOption, len(meta.CredentialOptions))
	for i, o := range meta.CredentialOptions {
		options[i] = CredentialOption{
			ID:                 o.ID,
			Kind:               o.Kind,
			ClientRegistration: o.ClientRegistration,
			UpstreamSetup:      o.UpstreamSetup,
			SpeakeasySetup:     o.SpeakeasySetup,
		}
	}
	aliases := make([]string, len(meta.Aliases))
	copy(aliases, meta.Aliases)

	var assets fs.FS
	if sub, err := fs.Sub(embedded, path.Join(base, "assets")); err == nil {
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
		Slug:               meta.Slug,
		Title:              meta.Title,
		Summary:            meta.Summary,
		SpeakeasyAddServer: meta.SpeakeasyAddServer,
		SetupRequired:      meta.SetupRequired,
		Meta:               metaBytes,
		External:           external,
		Speakeasy:          speakeasy,
		Assets:             assets,
		Remotes:            remotes,
		CredentialOptions:  options,
		Aliases:            aliases,
	}, nil
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

var errNotFound = fmt.Errorf("guides: not found")
