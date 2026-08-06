// Package guides embeds Speakeasy MCP setup guides and exposes stable
// identifier-based lookup.
//
// Canonical identity is ServerRef{Guide, Remote} with text form
// "slug/remote-id" (for example "intercom/eu"). Resolve and ByURL are
// secondary indexes that may return zero, one, or many matches; they never
// invent a default remote.
//
// Guide.External and Guide.Speakeasy ship with the template key
// {{ gram.oauth.callback_url }} in place. Serve Guide.RenderExternal(Vars)
// and Guide.RenderSpeakeasy(Vars) instead: they return the same content
// with a caller-supplied value substituted. Supply the value on every call.
// It is a property of the deployment, not of the guide, and content that
// never references the key comes back unchanged.
//
// Module path: github.com/speakeasy-api/mcp-setup-docs/go
// Version tags: go/vX.Y.Z
package guides
