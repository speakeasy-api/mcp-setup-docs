// Package guides embeds Speakeasy MCP setup guides and exposes stable
// identifier-based lookup.
//
// Canonical identity is ServerRef{Guide, Remote} with text form
// "slug/remote-id" (for example "intercom/eu"). Resolve and ByURL are
// secondary indexes that may return zero, one, or many matches; they never
// invent a default remote.
//
// Module path: github.com/speakeasy-api/mcp-setup-docs/go
// Version tags: go/vX.Y.Z
//
// See research/go-module-publish.md and research/go-module-execution-plan.md
// in the repository for packaging and semver policy.
package guides
