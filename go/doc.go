// Package guides embeds Speakeasy MCP setup guides and exposes stable
// identifier-based lookup.
//
// Canonical identity is ServerRef{Guide, Remote} with text form
// "slug/remote-id" (for example "intercom/eu"). Resolve and ByURL are
// secondary indexes that may return zero, one, or many matches; they never
// invent a default remote.
//
// Guide content ships with the template key {{ gram.oauth.callback_url }}
// in place. Guide.RequiresCallbackURL reports which guides carry it, and
// Guide.Render(Vars) returns a copy with a caller-supplied value
// substituted. Leaving the value empty keeps the key, which is a valid
// thing to show a reader.
//
// Module path: github.com/speakeasy-api/mcp-setup-docs/go
// Version tags: go/vX.Y.Z
package guides
