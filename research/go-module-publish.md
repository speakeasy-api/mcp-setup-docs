# Publishing MCP setup guides as a Go module

Research note: how to publish this repository’s guide packages via a Go
module that uses `go:embed`, and which **stable identifiers** consumers
should use to locate an MCP server / guide.

**Date:** 2026-07-27  
**Repo remote:** `github.com/speakeasy-api/mcp-setup-docs`  
(local clone directory may differ; module path must match the published
GitHub path, not the clone folder name.)

**Counsel:** [GPT 5.6 Sol](687d4af0-9713-4e73-ac8c-490d24f33563),
[Fable](47cc994b-4407-4c74-9726-af502c0cd37c),
[Opus 5](e94c0011-3564-4db4-81df-5054d60a894b)  
**Publish mechanics:** [Go publish research](365d6472-e568-4112-9e03-e57697ebe550)  
plus primary Go docs cited below.

**Execution plan:** [`research/go-module-execution-plan.md`](go-module-execution-plan.md)
([Fable](65e68fb8-0ef7-4c61-9c9d-c7854cf79368), 2026-07-29).

---

## Verdict

1. **Canonical identity:** guide `slug` + guide-local `remote.id`,
   serialized as `slug/remote-id` (e.g. `intercom/eu`,
   `salesforce/sobject-reads-production`). Typed as a two-field struct in
   Go; string form is for storage/config only.
2. **Secondary indexes (not persisted identity):** `aliases[]`,
   endpoint URL reverse lookup, optional provenance-name hints — all
   resolve *to* the canonical pair, and may return multiple matches.
3. **Module layout (two first-class options):** never put `go.mod` at the
   repo root — that would ship ~100 MiB of unrelated tree
   (`pulse-catalog.json` ~19 MiB, `pipeline/` ~84 MiB) in the module zip.
   Prefer **Option B (codegen into `/go`)** when `guides/` should stay
   content-only; **Option A (`guides/go.mod`)** when avoiding a sync
   pipeline matters more. Both keep the zip small and satisfy
   `go:embed`’s “no `..`” rule.
4. **Embed:** only publishable files — `meta.yaml`, `external.md`,
   `speakeasy.md`, declared assets. Never embed `research.md` or
   `pipeline.lock.json`.
5. **Before first tag:** consider renaming guide-local `id: primary`
   (8 of 10 guides) to meaning-bearing ids — free now, major forever
   after. Add a root `LICENSE` (repo currently has none). Stay on `v0.x`
   until the identifier contract freezes.

---

## Part 1 — Stable identifiers (counsel synthesis)

### What the schema already promises

From [`schema/guide.v1.schema.json`](../schema/guide.v1.schema.json):

| Field | Contract |
|---|---|
| `slug` | “Stable Guide identity; must match the guide directory name.” Pattern `^[a-z0-9]+(-[a-z0-9]+)*$`. |
| `remotes[].id` | “Stable MCP Server identity **within the guide**.” Same pattern. Guide-local by design. |
| `aliases[]` | “Legacy or source-native alias resolved to this Guide.” Used once today: `google-compute-engine` → `com.googleapis.compute/mcp`. |
| `remotes[].url` | Absolute HTTPS endpoint — a fact, not an identity. |
| Provenance `name` | Source-native observation (e.g. `com.pulsemcp.mirror/box`); often `classification: mirror`. Not Speakeasy-owned. |

Corpus shape (verified 2026-07-27): 10 guides; most remotes use `id: primary`; Intercom has `us`/`eu`; Salesforce has eight remotes; all remote URLs are currently distinct; zero git tags.

### Strategies considered

| Strategy | Shape examples | Counsel scores (Sol / Fable / Opus) | Role |
|---|---|---|---|
| **A. Hierarchical / compound** | Guide `box`; server `box/primary` or `box#primary` | 5 / 5 / 4–5 | **Canonical** |
| B. Minted reverse-DNS | `com.speakeasy.mcp/box` | 3 / 2 / 2 | Avoid as primary — invents identity; collides visually with provenance |
| C. URN / interchange form | `speakeasy:mcp-server:intercom:eu` | 4 as serialization / — / — | Optional wire format over A |
| D. Endpoint URL as key | `https://mcp.box.com` | 2 canonical, 4–5 secondary | Secondary index only |
| E. Typed codegen constants | `guides.IntercomEU` | — / 3 / — | Deferred sugar on A |
| Slug-only | `intercom` (caller picks remote) | — / — / 3 | Insufficient for multi-remote correctness |

Unanimous preference: **A as the contract you persist**, with URL + alias (+ optional provenance) as a **Resolve** layer that may be ambiguous.

### Recommended Go surface

```go
package guides

type GuideSlug string
type RemoteID string

type ServerRef struct {
	Guide  GuideSlug
	Remote RemoteID
}

func (r ServerRef) String() string // "intercom/eu"
func ParseServerRef(s string) (ServerRef, error)

func Lookup(slug GuideSlug) (Guide, bool)
func LookupServer(ref ServerRef) (Guide, Remote, bool)
func Guides() []Guide

// Wide input; may return 0, 1, or many matches — never invent a default.
type MatchKind int // slug | server-ref | alias | provenance | endpoint | title
type Match struct {
	Ref  ServerRef
	Kind MatchKind
}
func Resolve(query string) []Match

func ByURL(rawURL string) []Match // normalize carefully; return slice
```

**Policies the counsel agreed on:**

1. Never invent a `PrimaryRemote()` / “first remote” helper — schema has no
   default flag and no ordering contract (Salesforce makes this dangerous).
2. `remote.id` is **append-only**. Never rename or re-point an id at a
   different logical endpoint; retire with a deprecation marker instead.
3. Provider rebrands change `title`, not `slug`; old names go in `aliases[]`.
4. Alias collisions fail at authoring/CI time (same discipline as
   `pipeline/src/pulse-catalog.ts` exact-vs-ambiguous matching).
5. Do not treat `provenance.name` as Speakeasy identity unless deliberately
   promoted into `aliases[]`.

### Text form delimiter

Counsel split on `#` (Sol) vs `/` (Fable, Opus). Prefer **`/`**:

- Both segments are already kebab-case with no `/`.
- `strings.Cut` parses cleanly.
- Reads like a path (`intercom/eu`).

Document the format; keep the struct as the real API.

### Pre-tag content change (Opus, endorsed)

Rename `id: primary` on the eight single-remote guides to meaning-bearing
values **before** the first module tag (e.g. region, product surface, or a
stable short name). After tagging, renaming is a major/breaking event for
every persisted `ServerRef`.

---

## Part 2 — Publishing with `go:embed`

### Why not a root module

Go builds a module zip from the module root directory. Nested modules
(subdirectories with their own `go.mod`) and `vendor/` are omitted; arbitrary
docs/scripts are **not**.
([Module zip files](https://go.dev/ref/mod#zip-files),
[zip path/size constraints](https://go.dev/ref/mod#zip-path-size-constraints).)

Observed sizes in this working tree:

| Path | Approx size |
|---|---|
| `guides/` (all guides) | ~0.5 MiB |
| `pulse-catalog.json` | ~19 MiB |
| `pipeline/` | ~84 MiB |
| `.tmp-gram/` | ~19 MiB |

A root `go.mod` would make consumers download that unrelated bulk (subject to
the 500 MiB zip cap). The module root must therefore sit **beside** or
**under** a small publishable subtree — either `guides/` itself, or a
dedicated `/go` tree that only contains Go + generated content.

### `go:embed` constraint that forces the fork

From [`embed`](https://pkg.go.dev/embed): patterns are relative to the
package directory; they may not contain `..`, may not be absolute, and may
not match outside the package’s module (or through symlinks). So a Go
package living under `/go` **cannot** embed `../guides/...` directly.

That leaves two workable designs.

### Option comparison

| | **A — Nest module in `guides/`** | **B — Codegen into `/go` (preferred for separation)** |
|---|---|---|
| Module path | `…/mcp-setup-docs/guides` | `…/mcp-setup-docs/go` (or `…/mcpguides`) |
| Version tags | `guides/vX.Y.Z` | `go/vX.Y.Z` |
| `guides/` stays content-only | No — Go files sit beside guides | Yes |
| Sync / drift risk | None (embed authoritative files) | CI must regenerate + fail on diff |
| Module zip | Includes on-disk `research.md` / locks unless fenced | Only what codegen copied into `/go` |
| Consumer import | `…/mcp-setup-docs/guides` | `…/mcp-setup-docs/go` |
| Best when | Minimal tooling; content *is* the package | Docs factory and Go SDK must not share a tree |

Counsel initially preferred a root or `guides/`-adjacent package for
simplicity; archive size rules out the repo root, and keeping the drafting
factory clean pushes toward **B**.

### Option A — Nested module in `guides/`

```text
guides/
├── go.mod          # module github.com/speakeasy-api/mcp-setup-docs/guides
├── embed.go
├── doc.go          # package guides
├── guides_test.go
├── asana/
│   ├── meta.yaml
│   ├── external.md
│   ├── speakeasy.md
│   ├── research.md          # on disk; exclude from //go:embed
│   └── pipeline.lock.json   # on disk; exclude from //go:embed
└── ...
```

```go
module github.com/speakeasy-api/mcp-setup-docs/guides

go 1.22
```

```go
//go:embed */meta.yaml
//go:embed */external.md
//go:embed */speakeasy.md
var embedded embed.FS
```

**Zip caveat:** embed patterns control the **binary**, not the module zip.
`research.md` still ships in the download unless moved behind a nested
`go.mod` fence or out of `guides/`.

### Option B — Codegen into `/go` (recommended when separating concerns)

Authoritative content stays in `guides/`. A generator (mise task, `go
generate`, or pipeline step) materializes a **publishable subset** under
the Go module, which is what `go:embed` sees.

```text
guides/                 # authoritative — no Go
├── asana/
│   ├── meta.yaml
│   ├── external.md
│   ├── speakeasy.md
│   ├── research.md     # never copied
│   └── ...
└── ...

go/
├── go.mod              # module github.com/speakeasy-api/mcp-setup-docs/go
├── doc.go              # package guides (or mcpguides)
├── embed.go            # //go:embed generated/...
├── guides.go           # Lookup / Resolve API (hand-written)
├── generate.go         # //go:generate ...
├── generated/          # COMMITTED output — consumers never run generate
│   ├── embed_gen.go    # explicit //go:embed lines if needed
│   ├── index_gen.go    # optional typed index / ServerRef tables
│   └── guides/
│       ├── asana/
│       │   ├── meta.yaml
│       │   ├── external.md
│       │   └── speakeasy.md
│       └── ...
└── guides_test.go
```

```go
module github.com/speakeasy-api/mcp-setup-docs/go

go 1.22
```

```go
package guides

import "embed"

//go:embed generated/guides/*/meta.yaml
//go:embed generated/guides/*/external.md
//go:embed generated/guides/*/speakeasy.md
var embedded embed.FS
```

(Adjust paths if the generator flattens to `generated/<slug>/…`. When
assets exist, emit explicit `//go:embed` lines in `embed_gen.go` — a glob
that matches zero files is a compile error.)

**Generator contract:**

1. Walk `guides/<slug>/`; skip `research.md`, `pipeline.lock.json`, and
   anything not in the publish set.
2. Copy `meta.yaml`, `external.md`, `speakeasy.md`, and schema-declared
   assets into `go/generated/…` with deterministic ordering and stable
   relative paths.
3. Optionally emit `index_gen.go` (slug → remotes, aliases, URL index) so
   malformed metadata fails in this repo’s CI, not in every consumer
   `init()`.
4. Commit the generated tree. Consumers must **not** need `go generate`.
5. CI: regenerate and `git diff --exit-code` (plus `go test ./...` under
   `go/`). Fail the PR if content and generated tree drift.
6. Tag only commits where generation is current.

**Why not symlink?** Symlinks are not valid `go:embed` matches and are
ignored when building module zips
([`embed`](https://pkg.go.dev/embed),
[zip constraints](https://go.dev/ref/mod#zip-path-size-constraints)).

**Why commit generated files?** Module versions are immutable zip
snapshots of git trees. Generation at consumer `go get` time is
impossible; generation only at tag time without committing would make
local checkouts diverge from tagged releases.

Version tags:

```text
go/v0.1.0
go/v1.0.0
```

([Managing module source](https://go.dev/doc/modules/managing-source),
[Mapping versions to commits](https://go.dev/ref/mod#vcs-version).)

Import:

```go
import guides "github.com/speakeasy-api/mcp-setup-docs/go"
```

(Package name `guides` with a path ending in `/go` is fine; callers use
the package name.)

### Module path naming

Use **`github.com/speakeasy-api/mcp-setup-docs`**, matching `git remote`
(`origin` → `speakeasy-api/mcp-setup-docs`). Do **not** bake
`mcp-setup-docs-cursor-sdk` into the module path — that is local clone /
scaffolding residue (Opus). Vanity imports (`go.speakeasy.com/...`) only if
long-lived `go-import` meta infrastructure already exists
([Finding a repository](https://go.dev/ref/mod#vcs-find)).

### Shared embed rules

From [`embed`](https://pkg.go.dev/embed):

- Patterns are relative to the package directory; no `..`, no absolute paths.
- Patterns must not match outside the module, symlinks, `vendor/`, or nested
  modules.
- Directory matches recurse but skip names starting with `.` or `_` unless
  prefixed with `all:`.
- Each pattern must match ≥1 file or non-empty directory.

Avoid `//go:embed *` / `all:*` on a tree that might grow authoring junk.

### Public API (content access)

Same for A or B. Prefer identifier lookup over path construction; keep the
module stdlib-only at first (raw YAML bytes):

```go
var ErrNotFound = errors.New("guide not found")

type Guide struct {
	Slug      GuideSlug
	Meta      []byte
	External  []byte
	Speakeasy []byte
	Assets    fs.FS // fs.Sub when present
	Remotes   []Remote // parsed or generated
}

func IDs() []string
func Lookup(slug GuideSlug) (Guide, error)
func FS() fs.FS // optional escape hatch; path layout becomes API
```

Under Option B, the generator can also emit typed tables so `Lookup` /
`Resolve` are pure map access over committed Go, with markdown still
served from `embed.FS`.

### SemVer for a content module

([Publishing Go Modules](https://go.dev/blog/publishing-go-modules),
[Version numbers](https://go.dev/doc/modules/version-numbers).)

| Change | Bump |
|---|---|
| Prose / link / provenance refresh | patch |
| New guide, remote, alias, optional field, helper | minor |
| Remove/rename slug or remote id; change lookup semantics; remove exported API; incompatible meta field meaning | major (`…/go/v2` or `…/guides/v2`; tags `go/v2.0.0` / `guides/v2.0.0`) |

Start at **`go/v0.1.0`** (Option B) or **`guides/v0.1.0`** (Option A).
Declare **`v1.0.0`** only after `ServerRef` + Resolve behavior are frozen.
Keep `schema_version` visible as a package constant; a breaking schema bump
should usually imply a module major.

Published tags are immutable; bad releases get a new patch + `retract`, not
a moved tag
([`retract`](https://go.dev/doc/modules/gomod-ref#retract)).

### Publish checklist

1. Add a repository-root `LICENSE` (exact name; subdirectory modules inherit
   it when they lack a local copy —
   [LICENSE special case](https://go.dev/ref/mod#hdr-Special_case_for_LICENSE_files)).
2. **Option B:** regenerate into `go/generated/`; confirm no drift.
3. `cd go` (or `cd guides`) && `gofmt -w . && go mod tidy && go test ./... && go vet ./...`
4. Reject local-path `replace` in `go.mod` (`replace` is ignored when this
   module is a dependency —
   [`replace`](https://go.dev/doc/modules/gomod-ref#replace)).
5. Tag and push, e.g. `git tag -a go/v0.1.0 -m "…" && git push origin go/v0.1.0`
6. Prime proxy:
   `GOPROXY=https://proxy.golang.org go list -m github.com/speakeasy-api/mcp-setup-docs/go@v0.1.0`
7. Smoke-test from a clean temp module with the public proxy (not a local
   `replace`).

If the repo stays private, configure `GOPRIVATE` and do not probe
`proxy.golang.org` with private paths
([private modules](https://go.dev/ref/mod#private-modules),
[privacy](https://proxy.golang.org/privacy)).

### Pitfalls summary

| Pitfall | Mitigation |
|---|---|
| Tagging subdirectory module as `v1.2.3` | Use `go/v1.2.3` or `guides/v1.2.3` |
| `//go:embed ../guides` from `/go` | Invalid — codegen a copy (Option B) or nest the module (Option A) |
| Symlink + embed | Symlinks are not embeddable and are omitted from zips |
| Generated tree drifts from `guides/` | CI regenerate + `git diff --exit-code` before merge/tag |
| Forgetting to commit `generated/` | Tag would publish an empty/stale embed; gate releases on tests |
| Broad `*` embed | Explicit patterns + generated asset paths |
| Case-only aliases as directories | Forbidden in zips (case-fold collisions); resolve in maps |
| Large PNGs | CI size budget; assets inflate every consumer binary |
| Typed YAML on day one | Prefer raw bytes until struct stability is proven |

---

## Consumer verification: gram `server` (2026-07-29)

Primary consumer is expected to be `github.com/speakeasy-api/gram` (monorepo
module; code under `server/`, not a separate `go.mod`). Verified against
local checkout `/home/walker/repos/speakeasy/gram` and a live `Resolve`
probe of this module. Gram exploration:
[Explore gram server MCP IDs](f05d00bf-897e-4785-9297-5c467d00b9d7).

### What gram keys off

| UI | Primary keys available | Guide lookup |
|---|---|---|
| Catalog detail (`/catalog/:serverSpecifier`) | `registry_specifier` (PulseMCP `server.name`, e.g. `com.figma.mcp/mcp`), `remotes[].url`, `title` | Prefer **`ByURL(remote.url)`**, then **`Resolve(registry_specifier)`** |
| Installed remote MCP source | `remote_mcp_servers.url` (+ id/slug/name) | **`ByURL(url)`** |
| Hosted MCP overview (`/mcp/x/:slug`) | Gram `mcp_servers.id`/`slug`/`name` only | Join via `remote_mcp_server_id` → upstream URL, or `toolset_origins.registry_specifier` if installed from catalog |

Gram does **not** store our `ServerRef` (`box/hosted`). After catalog
install, the durable catalog link is usually the **remote URL**, not the
specifier (specifier may survive on toolset origins for some paths).

No existing gram references to `mcp-setup-docs`, `external.md`, or
`speakeasy.md`. Closest adjacent surface is MCP install-page metadata
(`external_documentation_*`), which is unrelated.

### Probe results (this module)

| Query | Matches? |
|---|---|
| `https://mcp.box.com` / GitHub URL ± trailing slash | yes → correct `ServerRef` |
| `com.pulsemcp.mirror/box`, `com.pulsemcp.mirror/hubspot` | yes (provenance) |
| `com.googleapis.compute/mcp` | yes (alias + provenance) |
| `io.github.github/github-mcp-server` | **no** — specifier not in aliases/provenance |
| Title `"GitHub"` | **no** — titles not indexed |

### Implications for this module

1. Keep `ByURL` + `Resolve` as the public search surface; treat
   `ServerRef` as the stable id **after** resolution.
2. Backfill every guided catalog entry’s real `registry_specifier` into
   `aliases[]` (sparse today).
3. Gram handler should accept `{url?, registry_specifier?}`, prefer URL,
   apply an explicit pick policy over `[]Match`, return 404 when empty.
4. Tenanted URL templates (Snowflake) need a non-URL path later.
5. Packaging into gram: `require github.com/speakeasy-api/mcp-setup-docs/go`
   on the monorepo `go.mod` is fine.

---

## Open decisions (before implementation)

1. **Packaging: Option A (`guides/go.mod`) vs Option B (codegen `/go`)?**
   Prefer B if `guides/` must stay content-only; A if avoiding sync
   tooling matters more. *(Still open — copy vs nest debate ongoing.)*
2. **Rename `primary` remotes now?** **Resolved:** renamed to `hosted`.
3. **Delimiter `#` vs `/`?** **Resolved:** `/`.
4. **Ship Resolve + ByURL in v0.1 or only Lookup?** **Resolved:** both.
5. **Public vs private module?** **Resolved:** public.
6. **Generate typed meta vs raw YAML?** **Resolved:** raw + generated index.
7. **Backfill catalog `registry_specifier` → `aliases[]`?** Required for
   reliable catalog-detail lookup when URL is missing or ambiguous
   (gram consumer verification above).

---

## Sources

### Primary (Go)

- [Publishing Go Modules](https://go.dev/blog/publishing-go-modules)
- [Managing module source](https://go.dev/doc/modules/managing-source)
- [Go Modules Reference](https://go.dev/ref/mod) (zip files, VERSION mapping,
  LICENSE special case, authentication, private modules)
- [`embed` package](https://pkg.go.dev/embed)
- [`io/fs`](https://pkg.go.dev/io/fs)
- [Module version numbering](https://go.dev/doc/modules/version-numbers)
- [Go Modules: v2 and Beyond](https://go.dev/blog/v2-go-modules)
- [proxy.golang.org](https://proxy.golang.org/)

### Repo

- [`schema/guide.v1.schema.json`](../schema/guide.v1.schema.json)
- [`guides/*/meta.yaml`](../guides/)
- [`pipeline/src/pulse-catalog.ts`](../pipeline/src/pulse-catalog.ts) (exact vs ambiguous resolution discipline)
