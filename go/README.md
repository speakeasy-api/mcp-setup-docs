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

Version tags: `go/vX.Y.Z`.
