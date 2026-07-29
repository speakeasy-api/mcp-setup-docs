# Execution plan: publish MCP setup guides as a Go module

Detailed, implementer-ready plan for shipping the guide corpus from
`github.com/speakeasy-api/mcp-setup-docs` as a Go module with `go:embed`.

**Date:** 2026-07-29  
**Basis:** [`research/go-module-publish.md`](go-module-publish.md) (the
research note; all rationale pointers below refer to it),
[`schema/guide.v1.schema.json`](../schema/guide.v1.schema.json),
[`mise.toml`](../mise.toml), and the live `guides/` corpus.

**Corpus facts verified 2026-07-29** (re-verify at implementation time):

- 10 guides: `asana`, `box`, `github`, `google-big-query`,
  `google-compute-engine`, `hubspot`, `intercom`, `salesforce`, `x`,
  `zapier`. Plus a `guides/README.md` that is **not** a guide directory.
- 8 guides have a single remote named `id: primary`; `intercom` has
  `us`/`eu`; `salesforce` has 8 meaning-bearing remote ids.
- Every guide dir contains `meta.yaml`, `external.md`, `speakeasy.md`,
  `research.md`; most contain `pipeline.lock.json`
  (`google-big-query` and `google-compute-engine` do not — the
  generator's skip list must tolerate absence).
- No guide currently has an `assets/` directory, but the schema declares
  `assets/<id>.png` descriptors — the generator must handle assets from
  day one so the first guide with screenshots doesn't break publishing.
- Exactly one alias in the corpus: `google-compute-engine` ←
  `com.googleapis.compute/mcp`.
- All remote URLs are currently distinct across the corpus.
- Repo has **no `LICENSE`** and **no git tags**.
- Git remote: `git@github.com:speakeasy-api/mcp-setup-docs.git`. The
  local clone folder (`mcp-setup-docs-cursor-sdk`) is irrelevant to the
  module path.
- Existing CI: `.github/workflows/pipeline-ci.yml` (path-filtered to
  `pipeline/**`) and `guide-draft.yml` (issue-label-driven drafting).
- Existing mise task conventions: public verbs (`draft-guide`,
  `lint-guide`, `probe-mcp-oauth`) with hidden `_*-install`
  prerequisites, `dir = "<subdir>"`, `run = "npm run <script> --"`.

---

## 1. Goals / non-goals

### Goals

1. Consumers can `go get github.com/speakeasy-api/mcp-setup-docs/go@go/v0.1.0`
   and read guide content (`meta.yaml`, `external.md`, `speakeasy.md`,
   declared assets) from an `embed.FS` — no network, no YAML pipeline.
2. A stable, typed identifier contract: `ServerRef{Guide, Remote}` with
   text form `slug/remote-id`, plus a wide `Resolve` layer for aliases,
   endpoint URLs, and provenance hints.
3. `guides/` stays content-only. All Go code and embedded copies live
   under `/go`, produced by a deterministic generator, committed, and
   drift-checked in CI.
4. Small module zip: publishable guide subset only (~0.5 MiB today).
   Never `research.md`, `pipeline.lock.json`, `pipeline/`,
   `tools/pulse-catalog/pulse-catalog.json`, or `.tmp-gram/`.
5. A release process (tagging, proxy priming, smoke test) that anyone on
   the team can execute from a checklist.

### Non-goals

1. Typed Go structs for the full `meta.yaml` shape. v0.x serves raw YAML
   bytes plus a small generated identity index (research note: "Typed
   YAML on day one" pitfall). Full typed meta is a later minor version.
2. Rendering, templating, or HTML conversion of the markdown. The module
   ships bytes; presentation is the consumer's problem.
3. Vanity import path (`go.speakeasy.com/...`) — only if `go-import`
   meta infrastructure already exists, which it does not.
4. A v2 URN/wire serialization (`speakeasy:mcp-server:...`) — optional
   later layer over `ServerRef.String()`.
5. Changing the drafting pipeline, lint, or guide authoring flow beyond
   what CI drift-checking requires.

---

## 2. Locked decisions

These are settled by the research note (see the "Verdict" and "Open
decisions" sections there); do not relitigate without a hard blocker.

| # | Decision | Rationale pointer |
|---|---|---|
| 1 | Canonical identity is `slug` + guide-local `remote.id`, typed as `ServerRef{Guide GuideSlug; Remote RemoteID}`; text form `slug/remote-id` with `/` delimiter (e.g. `intercom/eu`) | Research note Part 1: unanimous counsel for hierarchical/compound; `/` wins the delimiter split (kebab-case segments, `strings.Cut`, reads like a path) |
| 2 | Secondary resolution (`Resolve`, `ByURL`) may return 0, 1, or many matches; **never** a `PrimaryRemote()` / first-remote helper | Research note "Policies the counsel agreed on" #1: schema has no default flag or ordering contract; Salesforce's 8 remotes make defaulting dangerous |
| 3 | Option B packaging: codegen into `/go`; module path `github.com/speakeasy-api/mcp-setup-docs/go`; tags `go/vX.Y.Z` | Research note Part 2: root module ships ~100 MiB of unrelated tree; `go:embed` forbids `../guides`; `guides/` stays content-only |
| 4 | Embed only `meta.yaml`, `external.md`, `speakeasy.md`, and schema-declared assets. Never `research.md`, `pipeline.lock.json`, `guides/README.md` | Research note "Embed" verdict + generator contract |
| 5 | Start at `go/v0.1.0`; stay v0.x until `ServerRef` + `Resolve` semantics freeze; declare v1 deliberately | Research note SemVer section |
| 6 | Module path derives from the git remote (`mcp-setup-docs`), never the local clone folder name | Research note "Module path naming" |
| 7 | Ship `Resolve` + `ByURL` in v0.1, not just `Lookup` | Research note open decision #4: counsel wants the rename escape hatch to exist before v1 |
| 8 | Raw YAML bytes + generated identity index in v0.x; no typed meta structs | Research note open decision #6 |
| 9 | Commit the generated tree; consumers never run `go generate` | Research note "Why commit generated files?": module zips are immutable git-tree snapshots |
| 10 | `remote.id` is append-only after first tag; retire with deprecation markers, never rename/re-point | Research note policies #2 |

## 3. Open decisions needing a human

Mark each resolved in this file before starting the phase that depends
on it.

- **OD-1 (blocks Phase 0 → first tag): rename `id: primary`?**
  8 of 10 guides use `id: primary` (more with snowflake). The research
  note (Opus, endorsed) strongly recommends renaming to meaning-bearing
  ids **before** the first tag — free now, a major version forever
  after. This is a product-naming call per guide (e.g. `box/mcp`?
  `box/hosted`? `asana/default`?). A human must approve the id list. If
  declined, document `primary` as a permanent, meaning-bearing-enough id
  and move on — do **not** leave it undecided into Phase 4.
  - Note: renaming touches `meta.yaml` and any prose in
    `external.md`/`speakeasy.md` that references remote ids, and must
    pass `mise run lint-guide`.
  - **Status (2026-07-29): resolved — rename to `hosted`.** Applied to
    asana, box, github, google-big-query, google-compute-engine,
    hubspot, x, zapier. Left meaning-bearing ids alone (intercom
    `us`/`eu`, salesforce `sobject-…`, snowflake `cortex-agent-mcp`).
- **OD-2 (blocks Phase 4): public or private module?**
  The repo's visibility decides proxy behavior. Public → prime
  `proxy.golang.org` and smoke-test through it. Private → set
  `GOPRIVATE=github.com/speakeasy-api/*` in the smoke test and **skip**
  proxy priming (research note: don't probe the public proxy with
  private paths). The Phase 4 checklist has a branch for each.
  - **Status (2026-07-29): resolved — public.**
- **OD-3 (blocks Phase 0): LICENSE choice.**
  Repo has none. The research note requires a repo-root `LICENSE` (the
  `/go` submodule inherits it via the Go modules LICENSE special case).
  Which license (Apache-2.0 to match typical speakeasy-api repos? Or a
  content-specific license since this is largely prose?) is a
  legal/business call. Content licensing (CC-BY vs code license) may
  matter because the module embeds markdown docs.
  - **Status (2026-07-29): resolved — Apache-2.0** at repo-root
    `LICENSE`.
- **OD-4 (soft, decide by Phase 2): package name.**
  Module path ends in `/go`; the package name is what callers type.
  Recommend `package guides` (`import guides "github.com/speakeasy-api/mcp-setup-docs/go"`),
  per the research note. Alternative: `mcpguides`. Low stakes but
  API-visible; pick once.
  - **Status (2026-07-29): resolved — `package guides`.**---

## 4. Phased work breakdown

Dependency chain: Phase 0 → 1 → 2 → 3 → 4 → 5. Phases 2 and 3 can
overlap after Phase 1 lands; Phase 4 requires everything before it.

### Phase 0 — Pre-flight

**P0.1 Add repo-root `LICENSE`** *(needs OD-3)*

- What: create `LICENSE` at the repo root with the approved license
  text.
- Files: `LICENSE` (new).
- Verify: file exists at exactly that name/casing at the root;
  `git ls-files LICENSE` shows it tracked.
- Depends: OD-3 resolved.

**P0.2 Resolve the `primary` rename** *(needs OD-1)*

- What: get a human decision on OD-1. If "rename": produce a mapping
  table (8 rows) in the PR description, update each guide's `meta.yaml`
  `remotes[].id`, grep `external.md`/`speakeasy.md` for stale id
  references, and run `mise run lint-guide -- <slug>` for every touched
  guide. If "keep": record the decision here and in the eventual
  `go/README.md` identifier docs.
- Files: up to 8 × `guides/<slug>/meta.yaml` (+ possibly the paired
  markdown files); this file (decision record).
- Verify: `mise run lint-guide` passes for all guides;
  `rg '^  - id: primary' guides/` returns nothing (if renamed).
- Depends: none (do this first — it is the only step that mutates
  `guides/` content and everything downstream snapshots it).

**P0.3 Confirm module path and tag scheme**

- What: one-line confirmation in the implementation PR that the module
  is `github.com/speakeasy-api/mcp-setup-docs/go`, tags are
  `go/vX.Y.Z`, and no `replace` directives will ever appear in the
  published `go.mod`. Confirm the GitHub repo default branch is where
  tags will be cut.
- Files: none (PR description / this file).
- Verify: `git remote get-url origin` contains
  `speakeasy-api/mcp-setup-docs`.
- Depends: none.

### Phase 1 — Scaffold `/go` module + generator

**P1.1 Create the module skeleton**

- What: create the `/go` directory with `go.mod`
  (`module github.com/speakeasy-api/mcp-setup-docs/go`, `go 1.22` or
  the current team-standard toolchain), `doc.go` (package docs: what
  the module is, the identifier contract, semver policy pointer), and a
  placeholder `guides.go`.
- Files: `go/go.mod`, `go/doc.go`, `go/guides.go` (new).
- Verify: `cd go && go build ./...` succeeds (empty but valid).
- Depends: P0.3.

**P1.2 Write the generator**

- What: implement the sync generator as a Go program at
  `go/internal/gen/` (main package), per the contract in §6 below. Go,
  not Node: it must run via `go run` in CI without the pipeline's npm
  install, and it lives inside the module tree it feeds (but under
  `internal/`, so it is not public API).
- Files: `go/internal/gen/main.go` (+ helpers), `go/generate.go`
  containing `//go:generate go run ./internal/gen`.
- Verify: running it from `go/` produces `go/generated/guides/<slug>/…`
  containing exactly `meta.yaml`, `external.md`, `speakeasy.md` (and
  declared assets when present) for all 10 guides; second run is a
  no-op (`git status --porcelain go/` empty); `research.md`,
  `pipeline.lock.json`, `guides/README.md` never appear under
  `go/generated/`.
- Depends: P1.1, P0.2 (generator snapshots post-rename ids).

**P1.3 Wire the embed + commit generated tree**

- What: add `go/embed.go` with explicit `//go:embed` patterns
  (`generated/guides/*/meta.yaml`, `…/external.md`, `…/speakeasy.md`);
  have the generator emit `go/generated/embed_gen.go` with explicit
  per-file `//go:embed` lines for assets only when assets exist (a glob
  matching zero files is a compile error — today there are none).
  Commit `go/generated/` in full.
- Files: `go/embed.go`, `go/generated/**` (committed).
- Verify: `cd go && go build ./...`; a throwaway test iterates the
  `embed.FS` and finds exactly 30 files (10 guides × 3) today.
- Depends: P1.2.

**P1.4 Add mise task, following existing conventions**

- What: add to `mise.toml`:

  ```toml
  [tasks.generate-go]
  description = "Sync publishable guide files into go/generated for the Go module"
  dir = "go"
  run = "go run ./internal/gen"

  [tasks.check-go]
  description = "Regenerate go/generated, fail on drift, then test the Go module"
  dir = "go"
  run = [
    "go run ./internal/gen",
    "git diff --exit-code -- .",
    "go vet ./...",
    "go test ./...",
  ]
  ```

  (Adjust to mise's actual multi-run syntax; the repo's `mise.toml`
  uses single-string `run` today, so a small shell script or `&&`
  chain is fine.) `go` is not yet in `[tools]` — add
  `go = "1.22"` (or latest) so contributors get a pinned toolchain.
- Files: `mise.toml`.
- Verify: `mise run generate-go` and `mise run check-go` succeed from
  the repo root.
- Depends: P1.2.

### Phase 2 — Identifier API

**P2.1 Generated identity index**

- What: extend the generator to parse each `meta.yaml` (identity fields
  only: `slug`, `title`, `aliases`, `remotes[].id`, `remotes[].url`,
  `remotes[].provenance[].name`, guide-level `provenance[].name`) and
  emit `go/generated/index_gen.go`: deterministic, sorted Go literals —
  slug list, per-guide remote-id list, alias→slug map, normalized-URL→
  `[]ServerRef` map, provenance-name→`[]ServerRef` map. Malformed
  metadata fails generation in this repo's CI, not in consumer
  `init()`.
- Files: `go/internal/gen/…` (extend), `go/generated/index_gen.go`
  (new, committed).
- Verify: regeneration is deterministic (two runs, zero diff); the
  emitted file `gofmt`-clean; index contains 10 slugs, 18 ServerRefs
  (8×1 + 2 + 8), 1 alias.
- Depends: P1.2.

**P2.2 Core types and lookup**

- What: implement in `go/` (hand-written, stdlib-only):
  `GuideSlug`, `RemoteID`, `ServerRef`, `ServerRef.String()`,
  `ParseServerRef`, `Guide`, `Remote`, `ErrNotFound`, `Guides()`,
  `Slugs()`, `Lookup`, `LookupServer`, and `FS()` (escape hatch,
  documented as layout-is-API). See §7 for signatures. `Guide` carries
  raw bytes (`Meta`, `External`, `Speakeasy`) and `Assets fs.FS`
  (non-nil only when the guide declares assets).
- Files: `go/guides.go`, `go/ref.go`.
- Verify: unit tests (P2.4).
- Depends: P1.3, P2.1.

**P2.3 Resolve layer**

- What: implement `MatchKind`, `Match`, `Resolve(query string) []Match`,
  and `ByURL(rawURL string) []Match` over the generated index.
  `Resolve` checks, in documented order: exact `ServerRef` text form,
  exact slug, alias, provenance name, endpoint URL. It returns all
  matches with kinds — never invents a default, never picks a winner.
  URL normalization: lowercase scheme/host, strip default port, strip
  trailing slash, ignore fragment; document exactly what is normalized.
- Files: `go/resolve.go`.
- Verify: unit tests (P2.4).
- Depends: P2.2.

**P2.4 Tests against the real corpus**

- What: table-driven tests using the committed generated data (no
  fixtures — the corpus *is* the fixture). Minimum cases:
  - `Lookup("intercom")` returns both remotes; bytes non-empty and
    parse as YAML/markdown-shaped (sanity length checks).
  - `LookupServer` for `intercom/eu` and one Salesforce ref, e.g.
    `salesforce/sobject-reads-sandbox`.
  - `ParseServerRef` round-trips `String()` for every ref in the index;
    rejects `""`, `"box"`, `"a/b/c"`, `"Box/primary"` (case).
  - `Resolve("com.googleapis.compute/mcp")` → alias match for
    `google-compute-engine`.
  - `Resolve("com.pulsemcp.mirror/box")` → provenance match (box).
  - `ByURL("https://mcp.box.com")` and `ByURL("https://mcp.box.com/")`
    both → box; unknown URL → empty slice.
  - No-default policy test: `Resolve("salesforce")` yields a slug
    match, not any server ref.
  - Embed-set test: walk `FS()`; assert no file basename is ever
    `research.md`, `pipeline.lock.json`, or `README.md`; assert every
    guide dir has exactly the three core files (+declared assets).
  - Cross-check: set of guide dirs in `../guides/` (excluding
    `README.md`) equals the embedded slug set — this is the in-repo
    drift tripwire even before CI runs.
- Files: `go/guides_test.go`, `go/resolve_test.go`.
- Verify: `cd go && go test ./...` green; `go vet ./...` clean.
- Depends: P2.2, P2.3.

### Phase 3 — CI

**P3.1 Go module workflow**

- What: add `.github/workflows/go-module-ci.yml`, mirroring the
  path-filter style of `pipeline-ci.yml`:
  - Triggers: PRs and pushes to `main` touching `guides/**`, `go/**`,
    `schema/**`, or the workflow file. (Critically: **guide content
    changes trigger the Go check** — that's the drift catch.)
  - Steps: checkout, `actions/setup-go` pinned to the `go.mod`
    toolchain, `go run ./internal/gen` in `go/`,
    `git diff --exit-code -- go/` (fail = drift), `gofmt -l` (fail if
    output), `go vet ./...`, `go test ./...`.
- Files: `.github/workflows/go-module-ci.yml` (new).
- Verify: push a PR that edits a guide's `external.md` without
  regenerating — CI must fail with the diff; regenerate — CI green.
- Depends: Phase 1 (generator), Phase 2 (tests exist to run).

**P3.2 Size budget**

- What: in the same workflow, fail if the publishable payload exceeds a
  budget. Simplest robust check: `du -sk go/generated` against a limit
  (start at 5 MiB; today's corpus is ~0.5 MiB). Optionally also
  per-asset: any single file > 512 KiB fails (assets inflate every
  consumer binary — research note pitfall).
- Files: `.github/workflows/go-module-ci.yml` (extend), or a small
  script under `go/internal/gen` invoked with a `-check-size` flag.
- Verify: temporarily drop the budget below current size in a branch;
  CI fails; restore; CI passes.
- Depends: P3.1.

**P3.3 Guard the drafting pipeline against the generated tree**

- What: confirm the drafting pipeline and lint never write into `go/`
  (they don't today — they operate on `guides/`), and add
  `go/generated/` to any tooling ignore lists if the pipeline's file
  walkers glob broadly. Also decide `.gitattributes`:
  `go/generated/** linguist-generated=true` to collapse it in PR
  review.
- Files: `.gitattributes` (new or extend).
- Verify: open a PR touching `go/generated/`; GitHub marks files as
  generated/collapsed.
- Depends: P1.3.

### Phase 4 — First release (`go/v0.1.0`)

Ordered checklist; all of Phases 0–3 merged to `main` first, OD-1 and
OD-2 resolved.

1. On a clean `main` checkout: `mise run check-go` — zero drift, tests
   green.
2. Confirm `go/go.mod` has no `replace` directives and no requirements
   (stdlib-only).
3. Confirm root `LICENSE` exists on the tagged commit.
4. Tag: `git tag -a go/v0.1.0 -m "mcp-setup-docs Go module v0.1.0: 10 guides, ServerRef + Resolve API"`
   then `git push origin go/v0.1.0`.
5. **If public (OD-2):** prime the proxy:
   `GOPROXY=https://proxy.golang.org go list -m github.com/speakeasy-api/mcp-setup-docs/go@v0.1.0`.
   **If private:** skip; verify instead with
   `GOPRIVATE=github.com/speakeasy-api/* go list -m …@v0.1.0` from a
   machine with repo access.
6. Proxy/consumer smoke test from a clean temp module **outside** this
   repo (no `replace`):

   ```go
   g, err := guides.Lookup("intercom")            // both remotes present
   ref, _ := guides.ParseServerRef("intercom/eu") // parses
   _, _, ok := guides.LookupServer(ref)           // found
   ms := guides.ByURL("https://mcp.box.com")      // 1 match
   ```

   Also assert `len(g.External) > 0` and that walking `guides.FS()`
   finds no `research.md`.
7. Check the module zip is small:
   `go mod download -x github.com/speakeasy-api/mcp-setup-docs/go@v0.1.0`
   and inspect the cached zip size (< the P3.2 budget).
8. Announce internally: module path, `ServerRef` format, the
   append-only `remote.id` policy, and the v0.x instability caveat.

Verify: smoke-test module builds and passes against the tagged version
fetched through the proxy (or GOPRIVATE path), not a local copy.

If a release is bad: publish a fixed patch + `retract` directive in a
subsequent version. Never move or delete a pushed tag.

### Phase 5 — Hardening toward v1

No fixed dates; gate v1 on the exit criteria below.

- **P5.1 Release automation:** a GitHub Actions workflow (manual
  `workflow_dispatch` with a version input) that re-runs `check-go`,
  tags `go/vX.Y.Z`, pushes, and (if public) primes the proxy. Prevents
  hand-tagging mistakes (`v0.2.0` instead of `go/v0.2.0`).
- **P5.2 Policy docs in-tree:** `go/README.md` documenting: the
  identifier contract and text form; append-only `remote.id`;
  rebrand policy (title changes, slug stays, old names → `aliases[]`);
  alias-collision CI failure; SemVer table for content changes
  (prose = patch, new guide/remote/alias = minor, remove/rename = major);
  `schema_version` exposed as a package constant and the rule that a
  breaking schema bump implies a module major.
- **P5.3 Deprecation story:** design (not necessarily ship) the
  mechanism for retiring a remote: a schema-level deprecation marker
  (e.g. `remotes[].deprecated: true` + successor ref) surfaced through
  the index, so `LookupServer` keeps resolving retired ids. This needs
  a schema change proposal — coordinate with the pipeline owners; it is
  the main known future schema_version pressure.
- **P5.4 Alias-collision lint:** extend generation (or `lint-guide`) to
  fail when an alias equals another guide's slug/alias or a
  `ServerRef` text form — same exact-vs-ambiguous discipline as
  `pipeline/src/pulse-catalog.ts`.
- **P5.5 Typed meta (minor release):** optional `guides/meta` subpackage
  with typed structs once the schema has been stable across several
  releases. Additive only.
- **v1 exit criteria:** `ServerRef` + `Resolve` semantics unchanged
  across ≥2 consecutive minor releases; at least one real internal
  consumer in production; OD-1 permanently settled; deprecation story
  (P5.3) at least designed; then tag `go/v1.0.0`.

---

## 6. Generator design detail

**Location & invocation:** `go/internal/gen` (main package). Invoked
three equivalent ways, all running the same code: `go generate ./...`
from `go/` (via `//go:generate go run ./internal/gen` in
`go/generate.go`), `mise run generate-go` (the team-facing entry point,
consistent with existing `mise.toml` verbs), and directly in CI. The
mise task is the documented one; `go:generate` exists so Go-native
contributors get the conventional hook.

**Inputs:**

- `../guides/<slug>/` directories (relative to `go/`; the generator may
  read `..` — only `go:embed` cannot).
- Each guide's `meta.yaml` — parsed for validation and for the identity
  index (needs a YAML parser: use `gopkg.in/yaml.v3` as a dependency of
  the *generator only*; keep the published package stdlib-only by
  having the generator emit pure-Go index literals).
- `../schema/guide.v1.schema.json` — not evaluated as JSON Schema by the
  generator (that's `lint-guide`'s job); the generator does cheap
  structural checks only (fields it consumes exist and match kebab-case
  patterns).

**Publish set (allowlist, not blocklist):** exactly `meta.yaml`,
`external.md`, `speakeasy.md`, plus every `documentation.assets[].path`
declared in `meta.yaml`. Anything else in the guide dir
(`research.md`, `pipeline.lock.json`, stray editor files, future
authoring artifacts) is ignored *by construction* — the generator never
globs the guide dir for content; it copies named files. `guides/README.md`
is skipped because only directories are treated as guides.

**Validation (fail generation, which fails CI):**

- `slug` == directory name; kebab-case.
- All three core files exist and are non-empty.
- Every declared asset file exists, matches `assets/<id>.png`, and its
  bytes hash to the declared `content_hash`.
- Remote ids kebab-case and unique within the guide.
- Alias collisions: no alias equals another guide's slug or alias
  (P5.4 formalizes; do the basic slug-collision check from day one).
- Duplicate normalized remote URLs across guides: **warn, don't fail**
  (all distinct today, but two guides legitimately documenting one
  endpoint is conceivable; `ByURL` returns slices for exactly this
  reason).

**Outputs (all under `go/generated/`, all committed):**

1. `go/generated/guides/<slug>/{meta.yaml,external.md,speakeasy.md[,assets/…]}`
   — byte-identical copies, stable relative paths.
2. `go/generated/index_gen.go` — package-internal identity tables
   (sorted slices/maps as literals): slugs, refs, alias→slug,
   normalized-URL→refs, provenance-name→refs, plus
   `SchemaVersion = 1`.
3. `go/generated/embed_gen.go` — only when at least one asset exists:
   explicit `//go:embed generated/guides/<slug>/assets/<id>.png` lines
   (explicit paths, never globs; a zero-match glob is a compile error
   and a broad glob is the "authoring junk" pitfall).

**Determinism:** walk guides in sorted order; sort every emitted slice
and map literal; no timestamps in output; copies are byte-for-byte
(no newline munging). The whole pipeline must satisfy: run twice →
`git diff` empty. Stale-file handling: the generator **deletes**
`go/generated/guides/` and rebuilds it each run, so removed guides
disappear (deletion is scoped to that subtree only; `index_gen.go` and
`embed_gen.go` are overwritten, and no other path under `go/` is ever
touched).

**What the generator must never do:** write outside `go/generated/`,
read the network, reorder or reformat guide file bytes, or invent
identity (it reads ids; it never mints them).

---

## 7. Public Go API sketch (target signatures for v0.1.0)

```go
// Package guides embeds the published Speakeasy MCP setup guides and
// exposes stable identifier-based lookup.
package guides // import "github.com/speakeasy-api/mcp-setup-docs/go"

const SchemaVersion = 1

type GuideSlug string
type RemoteID string

// ServerRef is the canonical identity of one MCP server within one
// guide. Text form: "slug/remote-id" (e.g. "intercom/eu").
type ServerRef struct {
	Guide  GuideSlug
	Remote RemoteID
}

func (r ServerRef) String() string
func ParseServerRef(s string) (ServerRef, error)

type Remote struct {
	ID        RemoteID
	URL       string
	Transport string
	Tenanted  bool
}

type Guide struct {
	Slug      GuideSlug
	Title     string
	Meta      []byte   // raw meta.yaml
	External  []byte   // raw external.md
	Speakeasy []byte   // raw speakeasy.md
	Assets    fs.FS    // nil when the guide declares no assets
	Remotes   []Remote // schema order, no default semantics
	Aliases   []string
}

var ErrNotFound = errors.New("guides: not found")

func Slugs() []GuideSlug
func Guides() []Guide
func Lookup(slug GuideSlug) (Guide, bool)
func LookupServer(ref ServerRef) (Guide, Remote, bool)

// Resolution over wide input. May return zero, one, or many matches.
// Never invents a default remote.
type MatchKind int

const (
	MatchServerRef MatchKind = iota + 1 // exact "slug/remote-id"
	MatchSlug                           // guide slug (no remote selected)
	MatchAlias                          // guide alias
	MatchProvenance                     // source-native provenance name
	MatchEndpoint                       // normalized endpoint URL
)

type Match struct {
	Ref  ServerRef // Remote empty for guide-level matches
	Kind MatchKind
}

func Resolve(query string) []Match
func ByURL(rawURL string) []Match

// FS exposes the embedded tree rooted at guides/<slug>/…. The path
// layout is API; prefer Lookup.
func FS() fs.FS
```

Deliberate deviations from the research-note sketch, to settle here:
`Lookup` returns `(Guide, bool)` not `(Guide, error)` — the only error
was "not found" and the note itself showed both shapes; comma-ok
matches `LookupServer`. `ErrNotFound` is kept for any future fallible
API. Guide-level matches use `Match.Ref` with an empty `Remote` rather
than a separate type — document it.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Generated tree drifts from `guides/` (the structural cost of Option B) | CI regenerates on every PR touching `guides/**` or `go/**` and fails on `git diff` (P3.1); in-package test cross-checks slug sets against `../guides` (P2.4); tag only from green `main` |
| Tag typo (`v0.1.0` instead of `go/v0.1.0`) publishes nothing / wrong thing | Checklist wording in Phase 4; release automation in P5.1; a root-level tag would also try to zip the 100 MiB tree — the 500 MiB cap won't save you, review will |
| `id: primary` ships in v0.x and someone persists refs before the rename discussion ends | Force OD-1 to a decision in Phase 0, before any tag; v0.x caveat in announcement (Phase 4 step 8) |
| First guide with screenshots breaks embed (zero-match glob) or bloats binaries | Assets handled in generator from day one via emitted explicit embed lines (P1.3); per-file and total size budgets in CI (P3.2) |
| Alias or provenance-name collides with a slug and makes `Resolve` ambiguous silently | Generation-time collision checks (generator validation; P5.4); `Resolve` returns all matches with kinds so ambiguity is visible, never swallowed |
| YAML dependency creeps into the published module | Parser lives only in `go/internal/gen`; generator emits pure-Go literals; Phase 4 step 2 verifies `go.mod` has no requirements |
| Private-repo path leaks to `proxy.golang.org` | OD-2 branch in the Phase 4 checklist; never proxy-probe until visibility is confirmed public |
| `pipeline/` npm CI and the new Go CI interfere | Separate workflow file with its own path filters, mirroring `pipeline-ci.yml`'s existing pattern (P3.1) |
| URL normalization disagreements (`/mcp` vs `/mcp/`, host case) cause `ByURL` misses | Normalization rules documented in code and README; round-trip tests over every corpus URL with and without trailing slash (P2.4) |
| Schema evolves (e.g. deprecation markers) and breaks index generation | Generator does minimal structural checks against fields it uses; `SchemaVersion` constant; policy that breaking schema bump implies module major (P5.2) |

---

## 9. Out of scope / later

- Typed `meta.yaml` structs in the public API (P5.5, later minor).
- URN/wire serialization (`speakeasy:mcp-server:intercom:eu`) as an
  interchange format.
- Typed per-guide constants (`guides.IntercomEU`) — counsel scored it
  "deferred sugar"; revisit after v1.
- Vanity import path (`go.speakeasy.com/mcp-guides`).
- Publishing screenshots until the first asset lands (generator already
  supports them).
- Splitting per-guide Go packages.
- Publishing `external.md`/`speakeasy.md` through any channel other
  than this module (website, registry API) — separate projects that
  should *consume* this module.
- Non-Go distributions (npm package, JSON bundle) of the same content.
- Deprecation-marker schema change itself (Phase 5 designs it; the
  schema bump is its own proposal with the pipeline owners).
- Any change to the drafting pipeline, personas, or lint beyond the CI
  wiring named above.
- **Gram integration wiring** (handler + `aliases[]` backfill of catalog
  `registry_specifier`s). Verified fit documented in
  [`go-module-publish.md`](go-module-publish.md) § "Consumer verification:
  gram server"; implement in gram after this module publishes.
