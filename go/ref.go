package guides

import (
	"fmt"
	"strings"
)

// GuideSlug is the stable guide identity (directory name / meta.slug).
type GuideSlug string

// RemoteID is the stable MCP server identity within a guide.
type RemoteID string

// ServerRef is the canonical identity of one MCP server within one guide.
// Text form: "slug/remote-id" (e.g. "intercom/eu").
type ServerRef struct {
	Guide  GuideSlug
	Remote RemoteID
}

func (r ServerRef) String() string {
	if r.Guide == "" || r.Remote == "" {
		return ""
	}
	return string(r.Guide) + "/" + string(r.Remote)
}

// ParseServerRef parses the canonical text form "slug/remote-id".
// Both segments must be kebab-case. Guide-only strings like "box" are rejected.
func ParseServerRef(s string) (ServerRef, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return ServerRef{}, fmt.Errorf("guides: empty server ref")
	}
	guide, remote, ok := strings.Cut(s, "/")
	if !ok || guide == "" || remote == "" {
		return ServerRef{}, fmt.Errorf("guides: server ref %q must be slug/remote-id", s)
	}
	if strings.Contains(remote, "/") {
		return ServerRef{}, fmt.Errorf("guides: server ref %q must be slug/remote-id", s)
	}
	if !kebab.MatchString(guide) || !kebab.MatchString(remote) {
		return ServerRef{}, fmt.Errorf("guides: server ref %q has invalid segments", s)
	}
	return ServerRef{Guide: GuideSlug(guide), Remote: RemoteID(remote)}, nil
}
