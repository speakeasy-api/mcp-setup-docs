package guides

import (
	"net/url"
	"strings"
)

// MatchKind classifies how Resolve / ByURL matched a query.
type MatchKind int

const (
	MatchServerRef  MatchKind = iota + 1 // exact "slug/remote-id"
	MatchSlug                            // guide slug (no remote selected)
	MatchAlias                           // guide alias
	MatchProvenance                      // source-native provenance name
	MatchEndpoint                        // normalized endpoint URL
)

// Match is one resolution hit. For guide-level matches (slug, alias),
// Ref.Remote is empty.
type Match struct {
	Ref  ServerRef
	Kind MatchKind
}

// Resolve accepts wide input and returns all matches (possibly zero).
// Check order: exact ServerRef, exact slug, alias, provenance name,
// endpoint URL. Never invents a default remote.
func Resolve(query string) []Match {
	q := strings.TrimSpace(query)
	if q == "" {
		return nil
	}

	var out []Match

	if ref, err := ParseServerRef(q); err == nil {
		if _, _, ok := LookupServer(ref); ok {
			out = append(out, Match{Ref: ref, Kind: MatchServerRef})
		}
	}

	slug := GuideSlug(q)
	if _, ok := generatedGuides[slug]; ok {
		out = append(out, Match{Ref: ServerRef{Guide: slug}, Kind: MatchSlug})
	}

	if s, ok := generatedAliasToSlug[q]; ok {
		out = append(out, Match{Ref: ServerRef{Guide: s}, Kind: MatchAlias})
	}

	if refs, ok := generatedProvenanceToRefs[q]; ok {
		for _, ref := range refs {
			out = append(out, Match{Ref: ref, Kind: MatchProvenance})
		}
	}

	out = append(out, ByURL(q)...)
	return out
}

// ByURL resolves a (possibly messy) MCP endpoint URL to ServerRefs.
// Normalization: trim space, lowercase scheme/host, strip default :443,
// strip trailing slash, drop fragment. Returns an empty slice when unknown.
func ByURL(rawURL string) []Match {
	norm := NormalizeURL(rawURL)
	if norm == "" {
		return nil
	}
	refs, ok := generatedURLToRefs[norm]
	if !ok {
		return nil
	}
	out := make([]Match, 0, len(refs))
	for _, ref := range refs {
		out = append(out, Match{Ref: ref, Kind: MatchEndpoint})
	}
	return out
}

// NormalizeURL applies the documented URL normalization used by ByURL
// and the generated index.
func NormalizeURL(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	u, err := url.Parse(s)
	if err != nil || u.Scheme == "" || u.Host == "" {
		// Fall back to the same string rules the generator uses for
		// already-canonical https URLs.
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
