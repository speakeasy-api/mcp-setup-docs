# Go Guide Linter Port Design

## Purpose

Rewrite PR #171 so its authoritative guide validator is implemented in Go rather than TypeScript. Preserve the URL-placement behavior, doctrine, migrated guides, generated guide copies, and observable linter contracts already established by the PR while moving semantic validation into an isolated Go authoring tool.

This port removes the TypeScript guide-linter implementation and linter-only npm dependencies. It does not claim to remove Node or TypeScript from the whole repository: drafting, orchestration, stale sweep, and other pipeline commands remain separate future migrations.

## Reconciliation After the Factory Prerequisite

The prerequisite factory work merged before this branch was finalized and removed the
remaining TypeScript drafting pipeline. Reconciliation with current `main` therefore
replaces the temporary TypeScript adapter described below with direct factory consumers;
the adapter sections remain the approved pre-reconciliation rationale, not the final tree.
Node 24 remains pinned for repository JavaScript tooling, while the prerequisite removed
the TypeScript 7 pipeline rather than this port reintroducing obsolete code.

`tools/lint-guide` remains the sole semantic implementation. Factory CI tests and builds
that nested module. The production guide-draft workflow installs Go 1.22, builds the
command once to `${{ runner.temp }}/lint-guide`, and exports `LINT_GUIDE_BIN` at job scope.
`factory/scripts/validate.sh` consumes that binary and falls back to building the same
nested command for local use. The factory image also builds the nested command and copies
only the static executable into the runtime image. The public `go` module contains only
published API and generation code; duplicate checker and CLI packages are removed.

The factory's partial-export contract adds `--meta-only` without changing the original
human/JSON target, ordering, or `0`/`1`/`2` contracts. The factory coordinator accepts
exit `0` or `1`, validates exactly one grouped JSON guide result, and flattens only its
`findings`; exit `2` or malformed output is operational failure.

## Module Boundary

Create a nested Go module at `tools/lint-guide`:

```text
tools/lint-guide/
  go.mod
  go.sum
  cmd/lint-guide/
    main.go
    main_test.go
  internal/guidecheck/
    check.go
    check_test.go
    markdown.go
    markdown_test.go
    fixtures/
```

The module owns repository-authoring validation and its dependencies. It must not add goldmark, YAML, or JSON Schema dependencies to the published `go/` module. This follows the repository's existing nested-tool-module pattern and keeps public guide-consumption APIs independent from authoring rules.

The tool uses Go 1.22 or newer, matching the repository Go baseline. Its direct semantic dependencies are:

- `github.com/yuin/goldmark` for CommonMark 0.31.2 parsing;
- `gopkg.in/yaml.v3` for frontmatter and metadata YAML;
- `github.com/santhosh-tekuri/jsonschema/v5` for guide metadata schema validation.

No GFM, linkify, or other Markdown extensions are enabled unless a future design explicitly changes repository Markdown semantics.

## Core Checker Contract

`internal/guidecheck` owns every semantic lint rule. Its central API is:

```go
type Finding struct {
    Severity   string `json:"severity"`
    Target     string `json:"target"`
    Where      string `json:"where"`
    Problem    string `json:"problem"`
    Suggestion string `json:"suggestion"`
    Dimension  string `json:"dimension"`
    Rule       string `json:"rule,omitempty"`
}

func CheckGuide(guideDir, repoRoot string) ([]Finding, error)
```

The Go checker preserves the TypeScript checker's observable behavior:

- finding order;
- exact problem and suggestion strings;
- `blocker` and `nit` severity vocabulary;
- `external`, `speakeasy`, `research`, and `meta` targets;
- fixed `dimension: "lint"`;
- optional `rule: "url-placement"`;
- missing-file early-return behavior;
- narrow frontmatter recognition and external-body line offsets;
- allowed template-key checks;
- heading, anchor, screenshot, metadata, schema, setup-reference, and cross-file anchor checks;
- exclusion of `research.md` from URL-placement linting.

Go YAML and JSON Schema library errors are normalized into the existing finding contract. Library-native message text or iteration order must not become accidental public behavior.

Filesystem and schema failures that are currently findings remain findings. Truly operational failures such as unreadable files or invalid repository-root configuration return errors to the CLI rather than being disguised as content findings.

## Markdown URL Classification

### Policy

Every rendered HTTP or HTTPS URL in `external.md` or `speakeasy.md` must be a Markdown link/image destination, autolink, resolved reference destination, or fenced-code value. All other rendered URL occurrences produce one `url-placement` blocker.

The classifier excludes:

- inline link and image destinations;
- autolinks;
- resolved reference syntax and definition destinations;
- reference-definition labels;
- fenced code blocks.

It scans:

- prose;
- link labels and image alt text;
- link and definition titles;
- inline code;
- indented code;
- raw HTML source that renders URL text;
- unresolved reference-like source.

### Goldmark Structure and Source Recovery

Goldmark supplies CommonMark structure and positioned visible nodes, but decoded destination, title, and reference fields do not carry independent source spans. The classifier therefore uses two layers:

1. Goldmark determines construct identity, nesting, block boundaries, reference resolution, and visible positioned nodes.
2. A narrow source scanner runs only inside parser-confirmed link, image, and reference-definition constructs to recover exact destination, title, and label ranges.

The source scanner is not a standalone Markdown parser. It consumes parser-confirmed boundaries and is tested against nested brackets, code spans in labels, escaped delimiters, entities, titles containing delimiter-like text, nested images/links, and resolved versus unresolved references.

### Rendered-Text Projection

Eligible visible source ranges become a rendered-text projection. Projection pieces:

- decode CommonMark character references;
- decode valid CommonMark punctuation escapes;
- omit emphasis and strong delimiters while retaining visible characters;
- preserve soft, hard, LF, CRLF, and lone-CR line boundaries so URLs never join across rendered lines;
- map each rendered character back to its exact source byte range.

URL matching is ASCII case-insensitive for `http://` and `https://`. Findings retain exact source-oriented spelling, including entities, escapes, and formatting delimiters associated with the occurrence.

Projection construction and destination-range exclusion are linear in source/events apart from URL matching and line lookup. Ordered source pieces must not be repeatedly rescanned for each eligible region.

### Coordinates

Finding line and column values are one-based source byte coordinates. This is explicit because Go parsers naturally expose byte offsets while JavaScript string offsets are UTF-16 code units. Existing ASCII behavior remains identical. New non-ASCII fixtures define and document Go's byte-column convention before cutover.

External Markdown is classified after frontmatter removal, then mapped back to original file lines. Speakeasy Markdown is classified as a complete file. URL findings remain in source order and duplicate occurrences are not deduplicated.

## CLI Contract

The initial Go command preserves PR #171's current human/Mise-facing TypeScript CLI behavior:

```text
lint-guide [--json] <slug|guides/<slug>|path>…
```

Target resolution remains:

1. a current-working-directory-relative directory containing `external.md` or `meta.yaml`;
2. `<repoRoot>/guides/<argument>`;
3. `<repoRoot>/<argument>`;
4. usage error.

Caller target order is preserved. A bad target aborts before a partial report.

Human output remains:

- `<slug>: ok` for a clean target;
- `<slug>: N finding(s)` followed by severity/rule, target, location, problem, and suggestion lines for findings.

JSON output remains a list of per-guide wrappers:

```json
[
  {
    "guide": "/absolute/resolved/path",
    "findings": []
  }
]
```

Exit codes remain:

- `0`: no findings;
- `1`: one or more findings;
- `2`: usage, help, or unresolved target.

Unknown options continue to be interpreted according to the current argument behavior rather than silently adopting Go's standard `flag` semantics. `--meta-only` is now a required compatibility surface for partial Kit-factory exports: it validates `meta.yaml` against the repository schema without requiring published Markdown files, retains grouped human/JSON output, and uses the same `0`/`1`/`2` exit contract. Focused checker, CLI, and host-validator tests cover this mode.

The supported human entry point and usage text are exactly:

```text
Usage: mise run lint-guide -- [--json] [--meta-only] <slug|guides/<slug>|path>…
```

For example, `mise run lint-guide -- asana` checks one guide and `mise run lint-guide -- --json guides/asana` requests grouped JSON.

## TypeScript Workflow Adapter (Historical, Superseded)

> This section records the approved pre-prerequisite cutover. The merged Kit
> factory removed the TypeScript drafting pipeline and client before final
> reconciliation; no TypeScript adapter or pipeline check exists in the final tree.

The pre-prerequisite TypeScript drafting workflow imported the checker in-process. During that migration stage, it called the Go command through a thin process/JSON adapter with no lint semantics.

Binary resolution is:

1. use `LINT_GUIDE_BIN` when provided;
2. otherwise invoke `go run ./cmd/lint-guide` with working directory `tools/lint-guide`.

Mise and CI build the binary once and provide `LINT_GUIDE_BIN`, avoiding repeated compilation in automated runs. The `go run` fallback preserves direct local pipeline commands while Go remains available as a repository development prerequisite.

The adapter passes one resolved guide directory with `--json`, decodes the grouped response, validates that exactly one guide result is present, and returns its findings in the existing TypeScript workflow shape. Process failure, malformed JSON, or an unexpected result count is an operational workflow error. Exit `1` with valid JSON findings is expected lint behavior, not a subprocess failure.

## Parity Strategy

The TypeScript implementation remains the behavioral oracle only during development. Before deleting it:

1. Capture golden fixtures for finding order, exact strings, optional fields, source coordinates, grouped JSON, human output, target resolution, and exits.
2. Port the complete focused URL corpus, including nested labels/images, references, titles, raw HTML, inline/indented/fenced code, entities, escapes, formatting boundaries, line endings, uppercase schemes, duplicate occurrences, and non-ASCII coordinates.
3. Add checker fixtures for valid guides, each content rule, malformed and missing files, schema errors, and anchor agreement.
4. Run both implementations over every committed guide and malformed fixture.
5. Require equivalent normalized findings and exact contract output where specified.
6. Switch the standalone CLI, Mise task, CI, and workflow caller to Go.
7. Delete the TypeScript semantic implementation and remove dependencies only after parity passes.

No production state runs two authoritative linters. A URL-only Go checker beside the TypeScript checker is prohibited because it creates two runtimes and finding streams without completing the migration.

## TypeScript Removal Scope

After cutover, delete:

- `pipeline/src/lint-guide.ts`;
- `pipeline/src/lint-guide-cli.ts`;
- `pipeline/src/lint-guide.test.ts`;
- `pipeline/src/markdown-url-placement.ts`;
- `pipeline/src/markdown-url-placement.test.ts`.

The pre-prerequisite plan allowed one small semantics-free TypeScript process adapter only while TypeScript workflow orchestration remained. The merged Kit prerequisite removed that orchestration, so the final reconciled tree contains no adapter or pipeline package.

The historical cutover removed linter-only npm dependencies after a repository-wide import search. Node 24 remains pinned for repository JavaScript tooling; the prerequisite removed the obsolete TypeScript 7 drafting pipeline rather than this port reintroducing it.

## Existing Content Migration

Retain the approved doctrine policy:

- opened URLs are Markdown links;
- copied URLs each use their own fenced code block;
- URLs are never bare prose or inline code;
- URL length is irrelevant.

Retain the six migrated guide sources and regenerate their matching `go/generated/guides` copies. The Go linter must report zero findings across all committed guide directories before cutover.

## CI and Developer Workflow

Add focused tools-module checks:

```text
cd tools/lint-guide && go test ./...
```

The live Kit integration builds the nested command once. `guide-draft.yml` uses `actions/setup-go@v5` with `go-version-file: tools/lint-guide/go.mod`, writes the executable to `${{ runner.temp }}/lint-guide`, and supplies it to export validation through `LINT_GUIDE_BIN`. Factory CI uses the same module version file, tests and builds the command, and supplies the binary to the complete factory suite. The factory image builds the nested module into `/usr/local/bin/lint-guide`; local validation falls back to building that same command. Mise invokes `go run ./cmd/lint-guide` from `tools/lint-guide`.

The command must not require network access at runtime. Dependencies are resolved only during module download/build.

## Error Handling

- Content problems are deterministic findings.
- Operational file/process/configuration failures are returned errors and produce usage/runtime failure rather than partial findings.
- JSON output is never mixed with human diagnostics on stdout.
- Human diagnostics and usage text go to stderr where the current contract requires it.
- Factory consumers validate grouped JSON and preserve stderr for operational errors without exposing environment contents or credentials.
- No ignore or suppression mechanism is added for URL placement.

## Verification and Acceptance

The port is accepted only when all of the following pass:

- focused Go Markdown URL tests;
- complete Go checker tests;
- Go CLI contract and exit-code tests;
- temporary TypeScript-to-Go parity fixtures;
- all committed guides with zero findings;
- the complete Kit factory regression suite with the prebuilt `LINT_GUIDE_BIN`;
- workflow structural checks, `actionlint`, and changed-script `shellcheck`;
- `go test ./...` and `go vet ./...` in `tools/lint-guide`;
- `go test ./...` in `go`;
- `go/check.sh` generation, formatting, vet, and tests;
- source/generated guide parity;
- `git diff --check`;
- final whole-branch review.

The final reconciled PR tree contains one authoritative Go semantic checker, direct Kit-factory consumers, and no TypeScript client, pipeline package, duplicate public-module checker, or TypeScript guide-lint rules.

## Rollout and Compatibility

The prerequisite factory series through PR #178 has merged. PR #171 remains draft while its rebased reconciliation and checks complete. Every prerequisite merge and rebase reruns the resolved-tree acceptance matrix.

The live factory protocol preserves the human/Mise contract and adds the explicit `--meta-only` compatibility mode. Any later protocol consolidation must preserve both surfaces or introduce a tested thin adapter rather than silently changing either consumer.
