# Go Guide Linter Port Design

## Purpose

Rewrite PR #171 so its authoritative guide validator is implemented in Go rather than TypeScript. Preserve the URL-placement behavior, doctrine, migrated guides, generated guide copies, and observable linter contracts already established by the PR while moving semantic validation into an isolated Go authoring tool.

This port removes the TypeScript guide-linter implementation and linter-only npm dependencies. It does not claim to remove Node or TypeScript from the whole repository: drafting, orchestration, stale sweep, and other pipeline commands remain separate future migrations.

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

Unknown options continue to be interpreted according to the current argument behavior rather than silently adopting Go's standard `flag` semantics. Factory-specific flat JSON, `--meta-only`, or alternate exit conventions are outside this PR and must be introduced later as explicit modes or separate thin commands.

## TypeScript Workflow Adapter

The existing TypeScript drafting workflow currently imports the checker in-process. During this broader repository migration, it calls the Go command through a thin process/JSON adapter with no lint semantics.

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

Add one small TypeScript process adapter under a name that does not imply semantic ownership, such as `pipeline/src/lint-guide-client.ts`, only while TypeScript workflow orchestration remains.

Remove npm dependencies only after a repository-wide import search proves they are unused. Node 24 and TypeScript 7 standardization remains in PR #171 as previously requested; unrelated TypeScript pipeline tools continue to use that baseline.

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

The pipeline workflow builds the command once before TypeScript tests and exports `LINT_GUIDE_BIN`. Mise's `lint-guide` task invokes the built Go command while preserving current examples. CI continues to run Node/TypeScript checks for remaining pipeline code and Go checks for both the public module and nested linter module.

The command must not require network access at runtime. Dependencies are resolved only during module download/build.

## Error Handling

- Content problems are deterministic findings.
- Operational file/process/configuration failures are returned errors and produce usage/runtime failure rather than partial findings.
- JSON output is never mixed with human diagnostics on stdout.
- Human diagnostics and usage text go to stderr where the current contract requires it.
- The TypeScript adapter includes stderr in operational errors but does not expose environment contents or credentials.
- No ignore or suppression mechanism is added for URL placement.

## Verification and Acceptance

The port is accepted only when all of the following pass:

- focused Go Markdown URL tests;
- complete Go checker tests;
- Go CLI contract and exit-code tests;
- temporary TypeScript-to-Go parity fixtures;
- all committed guides with zero findings;
- existing pipeline tests and TypeScript typecheck;
- `go test ./...` in `tools/lint-guide`;
- `go test ./...` in `go`;
- `go/check.sh` generation, formatting, vet, and tests;
- source/generated guide parity;
- `git diff --check`;
- final whole-branch review.

The final PR tree contains one authoritative Go semantic checker, one temporary semantics-free TypeScript client for the remaining workflow, and no TypeScript guide-lint rules.

## Rollout and Compatibility

PR #171 remains a draft until prerequisite work identified by the author has merged. This port is implemented directly on PR #171 rather than stacked on the local `feat/kit-guide-factory` branch. After any prerequisite merge, rebase or merge conflict resolution must rerun the full parity and acceptance matrix.

If a later factory migration introduces a different Go CLI protocol, preserve both consumer contracts through explicit modes or thin adapters first. Protocol consolidation is a separate design and must not silently change this PR's human/Mise contract.
