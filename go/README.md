# `github.com/speakeasy-api/mcp-setup-docs/go`

Embedded Speakeasy MCP setup guides for Go consumers.

```bash
go get github.com/speakeasy-api/mcp-setup-docs/go@v0.1.0
```

(Use a `go/vX.Y.Z` git tag; the subdirectory module resolves as `@vX.Y.Z`.)

```go
package main

import (
	"fmt"

	guides "github.com/speakeasy-api/mcp-setup-docs/go"
)

func main() {
	g, ok := guides.Lookup("intercom")
	fmt.Println(ok, g.Title, g.Summary)

	ref, err := guides.ParseServerRef("intercom/eu")
	if err != nil {
		panic(err)
	}
	_, remote, ok := guides.LookupServer(ref)
	fmt.Println(ok, remote.URL)

	fmt.Println(guides.ByURL("https://mcp.box.com"))
	// Pulse / registry name → guide (no default remote invented)
	fmt.Println(guides.Resolve("io.github.github/github-mcp-server"))
}
```

## Rendering the callback URL

`Guide.External` and `Guide.Speakeasy` ship with the template key
`{{ gram.oauth.callback_url }}` in place. **Serve the renderers, not the raw
fields.** Pass your own value on every call:

```go
vars := guides.Vars{OAuthCallbackURL: "https://app.example.com/oauth/callback"}

g, _ := guides.Lookup("intercom")
os.Stdout.Write(g.RenderExternal(vars))
```

- The renderers never change the embedded content, so a server may render per
  request with a different value each time. **Treat the result as read-only:**
  an empty `Vars` returns a slice aliasing the raw field.
- The callback URL is a property of your deployment, not of the guide, so
  there is nothing to look up first. Content that never references the key
  comes back unchanged.
- An empty `Vars` field leaves its key in place, so a missing value degrades
  to the unrendered content instead of a blank.
- Only `External` and `Speakeasy` have a renderer. No template key reaches
  `Meta` or an asset — the generator fails if one ever does.
- `{{ gram.oauth.callback_url }}` is the only supported key. Add a field to
  `Vars` to support another; existing callers keep compiling.

## Identifiers

- **Canonical:** `ServerRef{Guide, Remote}` text form `slug/remote-id`
  (e.g. `box/hosted`, `intercom/eu`, `salesforce/sobject-reads-sandbox`).
- **Secondary:** `Resolve` / `ByURL` may return 0..N matches (alias,
  provenance name, endpoint URL). They never invent a default remote.
- Vendor-hosted single-endpoint guides use remote id `hosted`.
  Customer-provisioned / templated endpoints keep a meaning-bearing id
  (today: `snowflake/cortex-agent-mcp`). Remote ids are append-only after
  the first tag; see `published_server_refs.txt`.

## Develop

```bash
mise run generate-go   # sync guides → go/generated + regenerate index
mise run check-go      # regenerate, fail on drift, go test
```

Publishable files only: `meta.yaml`, `external.md`, `speakeasy.md`,
declared assets. Authoring files (`research.md`, `pipeline.lock.json`)
are never embedded.

## Release flow

See **[`GO-MODULE.md`](../GO-MODULE.md)** (validate → regen PR → human merge → `go/vX.Y.Z`).

**First tag is manual:** `git tag -a go/v0.1.0 -m "…" && git push origin go/v0.1.0`.

Version tags: `go/vX.Y.Z` (consumers install `@vX.Y.Z`).
