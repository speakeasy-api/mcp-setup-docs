# `github.com/speakeasy-api/mcp-setup-docs/go`

Embedded Speakeasy MCP setup guides for Go consumers.

```bash
go get github.com/speakeasy-api/mcp-setup-docs/go@go/v0.1.0
```

```go
import guides "github.com/speakeasy-api/mcp-setup-docs/go"

g, ok := guides.Lookup("intercom")
ref, _ := guides.ParseServerRef("intercom/eu")
_, remote, ok := guides.LookupServer(ref)
matches := guides.ByURL("https://mcp.box.com")
// Pulse / registry name → guide (no default remote invented)
matches = guides.Resolve("io.github.github/github-mcp-server")
```

## Identifiers

- **Canonical:** `ServerRef{Guide, Remote}` text form `slug/remote-id`
  (e.g. `box/hosted`, `intercom/eu`, `salesforce/sobject-reads-sandbox`).
- **Secondary:** `Resolve` / `ByURL` may return 0..N matches (alias,
  provenance name, endpoint URL). They never invent a default remote.
- Single-endpoint guides use remote id `hosted` (append-only after first
  tag).

## Develop

```bash
mise run generate-go   # sync guides → go/generated + regenerate index
mise run check-go      # regenerate, fail on drift, go test
```

Publishable files only: `meta.yaml`, `external.md`, `speakeasy.md`,
declared assets. Authoring files (`research.md`, `pipeline.lock.json`)
are never embedded.

Version tags: `go/vX.Y.Z`. See `research/go-module-execution-plan.md`.
