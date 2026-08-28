# Go Guide Linter Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PR #171's TypeScript guide-lint semantics with one parity-tested Go checker in an isolated tools module while preserving current CLI, workflow, doctrine, and guide behavior.

**Architecture:** `tools/lint-guide/internal/guidecheck` owns all validation and a goldmark-based rendered-URL classifier; `tools/lint-guide/cmd/lint-guide` preserves the grouped human/JSON CLI and adds the required `--meta-only` compatibility mode. The live Kit factory builds and consumes this nested command directly through `LINT_GUIDE_BIN`; no TypeScript workflow client remains.

**Tech Stack:** Go 1.22+, goldmark 1.8.5, yaml.v3 3.0.1, jsonschema/v5 5.3.1, the Kit factory, Node.js 24 for remaining repository JavaScript tooling, and GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-27-markdown-url-placement-go-port-design.md`

## Post-Prerequisite Reconciliation

The factory prerequisite series through PR #178 merged before final review. The original task sequence below remains the historical record of the parity-first TypeScript-to-Go cutover, but steps that invoke `pipeline`, its temporary process client, npm tests, or TypeScript typecheck are superseded and are not commands for the final tree.

The authoritative final integration is the Kit factory: production and Factory CI use `go-version-file: tools/lint-guide/go.mod`, build `tools/lint-guide/cmd/lint-guide` once, and pass the runner-temp executable as `LINT_GUIDE_BIN`; the factory image builds the same nested module. `factory/scripts/validate.sh` uses the supplied binary or a local nested-module fallback. The public `go` module contains no duplicate checker.

`--meta-only` is now required for partial factory exports and is covered by checker, CLI, and host-validator regression tests. It preserves grouped human/JSON output and `0`/`1`/`2` exits. Current user invocations are:

```bash
mise run lint-guide -- asana
mise run lint-guide -- --json guides/asana
mise run lint-guide -- --meta-only guides/asana
```

The resolved-tree acceptance matrix is: tools-module fmt/test/vet/tidy drift; focused CLI and `--meta-only` contracts; all 21 guides; the complete factory suite with `LINT_GUIDE_BIN`; `actionlint` and structural workflow assertions; shellcheck; public Go tests and `go/check.sh`; linux/amd64 factory-image build; deletion/duplication searches; and Git diff/status hygiene.

## Global Constraints

- Keep all linter dependencies in the nested `tools/lint-guide` module; do not modify the published `go/go.mod` for authoring-tool dependencies.
- Preserve the existing TypeScript finding order, exact problem/suggestion strings, grouped JSON, human output, target resolution, and `0/1/2` exits.
- Check URL placement only in `external.md` and `speakeasy.md`; never check `research.md`.
- Match rendered HTTP(S) schemes case-insensitively while retaining exact source spelling and one-based source byte coordinates.
- Exclude real link/image/reference destinations, autolinks, resolved reference syntax, definition labels/destinations, and fenced code; scan prose, labels/alt text, titles, inline/indented code, raw HTML, and unresolved references.
- Do not add URL suppression, network validation, GFM, or linkify behavior.
- Never run two authoritative linters in production; TypeScript remains only as a temporary oracle during parity work.
- Retain Node 24 for repository JavaScript tooling, doctrine changes, six migrated guide sources, and generated Go copies already in PR #171. The merged prerequisite removed the obsolete TypeScript 7 drafting pipeline; do not reintroduce it.

## Final Reconciled File Structure

- `tools/lint-guide/go.mod`, `go.sum`: isolated authoring dependencies and Go version authority.
- `tools/lint-guide/internal/guidecheck/check.go`: file orchestration, metadata-only compatibility, and all non-URL guide rules.
- `tools/lint-guide/internal/guidecheck/markdown.go`: goldmark parsing, source recovery, projection, and URL findings.
- `tools/lint-guide/internal/guidecheck/*_test.go` and `testdata/`: rule, metadata-only, Markdown parity, and golden finding tests.
- `tools/lint-guide/cmd/lint-guide/main.go` and `main_test.go`: Mise-facing usage, target resolution, grouped output, `--meta-only`, and exit contracts.
- `.github/workflows/guide-draft.yml` and `factory-ci.yml`: version-file setup, build-once, and `LINT_GUIDE_BIN` wiring.
- `factory/scripts/validate.sh`, `factory/Dockerfile`, and factory tests: live host, image, fallback, and compatibility consumers.
- `mise.toml`: `mise run lint-guide -- ...` developer entry point.
- `go/cmd/lint-guide` and `go/internal/guidecheck`: absent after duplicate prerequisite implementations were reconciled into the nested tool.

### Historical Pre-Prerequisite Files (Superseded)

The original plan temporarily used `pipeline/src/lint-guide-client.ts`, its process tests, `pipeline/src/workflow.ts`, pipeline package files, and Pipeline CI to bridge TypeScript orchestration to Go. The merged Kit factory deleted that pipeline before final reconciliation; these paths remain in the task history below only to document the parity-first cutover.

---

### Task 1: Scaffold the nested module and freeze checker contracts

**Files:**
- Create: `tools/lint-guide/go.mod`
- Create: `tools/lint-guide/go.sum`
- Create: `tools/lint-guide/internal/guidecheck/check.go`
- Create: `tools/lint-guide/internal/guidecheck/check_test.go`
- Create: `tools/lint-guide/internal/guidecheck/testdata/**`

**Interfaces:**
- Consumes: repository root, guide directory, `schema/guide.v1.schema.json`, and the current TypeScript oracle.
- Produces: `guidecheck.Finding` and `guidecheck.CheckGuide(guideDir, repoRoot string) ([]Finding, error)` implementing every non-URL rule.

- [ ] **Step 1: Create the module with pinned direct dependencies**

```bash
mkdir -p tools/lint-guide/internal/guidecheck/testdata
after=$(pwd)
cd tools/lint-guide
go mod init github.com/speakeasy-api/mcp-setup-docs/tools/lint-guide
go get gopkg.in/yaml.v3@v3.0.1
go get github.com/santhosh-tekuri/jsonschema/v5@v5.3.1
cd "$after"
```

Do not add goldmark until Task 2 needs it.

- [ ] **Step 2: Capture oracle fixtures before porting**

Create fixture directories for these exact states, each containing only the files needed for that state:

```text
valid/
missing-external/
missing-speakeasy/
legacy-setup/
bad-external-frontmatter/
bad-template-key/
bad-headings-anchors-screenshot/
bad-speakeasy-anchors/
bad-meta-schema/
bad-setup-reference/
bad-anchor-agreement/
```

Add `expected.json` beside each fixture. Generate each expected finding array by calling the current `lintGuide(fixtureDir, repoRoot)` and serializing with two-space JSON indentation. Include exact `severity`, `target`, `where`, `problem`, `suggestion`, `dimension`, and optional `rule`; do not hand-normalize strings or reorder findings.

Run the temporary capture command from `pipeline/` and inspect every produced fixture before staging:

```bash
node --import tsx tools/capture-lint-fixtures.ts
```

The temporary script may live under `/tmp` instead of the repository; it must not remain in the final task diff.

- [ ] **Step 3: Write failing table tests for the frozen fixtures**

Create `check_test.go` with the exact public contract:

```go
package guidecheck

import (
    "encoding/json"
    "os"
    "path/filepath"
    "reflect"
    "testing"
)

func TestCheckGuideFixtures(t *testing.T) {
    cases := []string{
        "valid", "missing-external", "missing-speakeasy", "legacy-setup",
        "bad-external-frontmatter", "bad-template-key",
        "bad-headings-anchors-screenshot", "bad-speakeasy-anchors",
        "bad-meta-schema", "bad-setup-reference", "bad-anchor-agreement",
    }
    for _, name := range cases {
        t.Run(name, func(t *testing.T) {
            root := filepath.Join("testdata", name)
            raw, err := os.ReadFile(filepath.Join(root, "expected.json"))
            if err != nil { t.Fatal(err) }
            var want []Finding
            if err := json.Unmarshal(raw, &want); err != nil { t.Fatal(err) }
            got, err := CheckGuide(filepath.Join(root, "guides", "sample"), root)
            if err != nil { t.Fatal(err) }
            if !reflect.DeepEqual(got, want) {
                t.Fatalf("findings mismatch\n got: %#v\nwant: %#v", got, want)
            }
        })
    }
}
```

- [ ] **Step 4: Verify RED**

```bash
cd tools/lint-guide
go test ./internal/guidecheck
```

Expected: compilation fails because `Finding` and `CheckGuide` do not exist.

- [ ] **Step 5: Port the non-URL checker**

Use historical parity work as a starting point, not as an authority:

```bash
git show 23791c7:go/internal/guidecheck/check.go > /tmp/historical-check.go
```

Implement this exact public shape in `check.go`:

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

Port current behavior from `pipeline/src/lint-guide.ts`, using the historical implementation only where fixtures prove parity. Preserve the current argument order `(guideDir, repoRoot)`, missing-published-file early return, narrow frontmatter stripping, heading order, deterministic finding order, and schema-message normalization. Do not add URL findings in this task.

- [ ] **Step 6: Verify GREEN and module hygiene**

```bash
cd tools/lint-guide
gofmt -w internal/guidecheck/*.go
go test ./internal/guidecheck
go vet ./...
go mod tidy
git diff --check
```

Expected: every non-URL fixture passes; `go.mod` contains only YAML and JSON Schema direct dependencies.

- [ ] **Step 7: Commit**

```bash
git add tools/lint-guide
git commit -m "feat: port guide checker core to Go"
```

---

### Task 2: Port rendered Markdown URL classification

**Files:**
- Create: `tools/lint-guide/internal/guidecheck/markdown.go`
- Create: `tools/lint-guide/internal/guidecheck/markdown_test.go`
- Modify: `tools/lint-guide/internal/guidecheck/check.go`
- Modify: `tools/lint-guide/go.mod`
- Modify: `tools/lint-guide/go.sum`

**Interfaces:**
- Consumes: a Markdown source string.
- Produces: `FindURLPlacementViolations(markdown []byte) []URLPlacementViolation`, where the violation is `{Source string; Line, Column int}` using one-based source byte coordinates.
- Integrates: `CheckGuide` maps violations to exact `url-placement` blocker findings for external and speakeasy targets only.

- [ ] **Step 1: Add goldmark and write the complete failing regression table**

```bash
cd tools/lint-guide
go get github.com/yuin/goldmark@v1.8.5
```

Create:

```go
type URLPlacementViolation struct {
    Source string
    Line   int
    Column int
}

func FindURLPlacementViolations(markdown []byte) []URLPlacementViolation
```

Port every case from `pipeline/src/markdown-url-placement.test.ts` into Go table tests. The table must include links, images, autolinks, definitions before/after use, unresolved references, nested labels/images, code spans containing brackets, titles and encoded titles, fenced/indented/inline code, raw HTML, entities, punctuation escapes, emphasis/strong boundaries, uppercase schemes, duplicate URLs, CR/LF/CRLF, hard/soft breaks, deeply nested structures, and source spelling.

Add these non-ASCII coordinate cases explicitly:

```go
{name: "unicode before URL", markdown: "é https://bad.test", want: []URLPlacementViolation{{Source: "https://bad.test", Line: 1, Column: 4}}},
{name: "unicode on prior line", markdown: "é\nhttps://bad.test", want: []URLPlacementViolation{{Source: "https://bad.test", Line: 2, Column: 1}}},
```

Column 4 in the first case defines byte-column semantics: `é` occupies two bytes, followed by one space.

- [ ] **Step 2: Verify RED**

```bash
cd tools/lint-guide
go test ./internal/guidecheck -run URLPlacement
```

Expected: compilation fails because the classifier types/functions are absent.

- [ ] **Step 3: Implement goldmark structural classification**

In `markdown.go`:

- construct a CommonMark-default goldmark parser with no extensions;
- walk positioned text, code, link, image, autolink, emphasis, HTML, and definition nodes;
- track resolved definitions using goldmark's parser context;
- recover destination/title/label byte ranges only inside parser-confirmed constructs;
- build projected pieces containing rendered bytes and source start/end offsets;
- decode CommonMark entities and valid punctuation escapes;
- omit formatting delimiters but retain visible content;
- preserve every line-break form as a projection boundary;
- match `(?i)https?://[^\s<>"'` + "`" + `]+` against projected text;
- map the projected match back to exact source spelling, line, and byte column;
- traverse ordered pieces monotonically so complexity is linear in pieces/regions.

Keep the narrow range scanner in private helpers such as:

```go
type sourceRange struct { Start, End int }
type projectionPiece struct {
    Rendered []byte
    SourceStart int
    SourceEnd int
}

func recoverLinkRanges(source []byte, node ast.Node) (destinations, titles []sourceRange)
func projectVisible(source []byte, root ast.Node, excluded []sourceRange) []projectionPiece
func sourcePoint(source []byte, offset int) (line, column int)
```

Do not search decoded destination strings globally in the source; repeated values make that ambiguous.

- [ ] **Step 4: Verify classifier GREEN and complexity sanity**

```bash
cd tools/lint-guide
go test ./internal/guidecheck -run URLPlacement -count=1
go test ./internal/guidecheck -run URLPlacement -bench URLPlacement -benchmem
```

Include a benchmark with alternating valid destinations and prose at 1K, 4K, and 16K repetitions. Do not assert wall-clock thresholds; inspect allocations and scaling for accidental quadratic traversal.

- [ ] **Step 5: Integrate exact findings with TDD**

Add an integration test whose external URL begins after three-line frontmatter, whose speakeasy URL is inline code, and whose research URL is bare. Assert exactly two findings, exact source strings, external original-file line offset, `rule: "url-placement"`, and no research finding.

Map violations with exact text:

```go
Finding{
    Severity: "blocker",
    Target: target,
    Where: fmt.Sprintf("line %d, column %d", line, column),
    Problem: "URL is not in a Markdown link or fenced code block: " + violation.Source,
    Suggestion: "URLs should either be Markdown links or appear in fenced code blocks. Use a link when the reader should open the URL; use a fenced code block when the reader should copy it.",
    Dimension: "lint",
    Rule: "url-placement",
}
```

- [ ] **Step 6: Verify and commit**

```bash
cd tools/lint-guide
gofmt -w internal/guidecheck/*.go
go test ./...
go vet ./...
go mod tidy
git diff --check
git add tools/lint-guide
git commit -m "feat: port Markdown URL linting to Go"
```

---

### Task 3: Implement the compatibility CLI

**Files:**
- Create: `tools/lint-guide/cmd/lint-guide/main.go`
- Create: `tools/lint-guide/cmd/lint-guide/main_test.go`

**Interfaces:**
- Consumes: CLI args and `guidecheck.CheckGuide`.
- Produces: grouped JSON/human output with target order and exits `0` clean, `1` findings, `2` usage/unresolved target.

- [ ] **Step 1: Write failing CLI contract tests**

Test `run(args []string, cwd, repoRoot string, stdout, stderr io.Writer) int` directly. Cover:

```text
no args                         => stderr usage, exit 2
--help / -h                     => stderr usage, exit 2
slug                            => resolves <repo>/guides/<slug>
guides/<slug>                   => resolves from repo root
CWD-relative fixture directory  => resolves before repo paths
bad target mixed with good      => exit 2 and no partial stdout
clean human                     => "<slug>: ok\n"
findings human                  => count, [severity/rule], problem, suggestion
clean --json                    => grouped wrapper array, exit 0
findings --json                 => valid grouped wrapper array, exit 1
multiple targets                => preserves caller order
unknown option                  => current target-resolution behavior
```

Use temp repositories and fixture copies; do not depend on live guides for unit tests.

- [ ] **Step 2: Verify RED**

```bash
cd tools/lint-guide
go test ./cmd/lint-guide
```

Expected: command package does not exist.

- [ ] **Step 3: Implement the thin command**

Define:

```go
type guideResult struct {
    Guide    string               `json:"guide"`
    Findings []guidecheck.Finding `json:"findings"`
}

func run(args []string, cwd, repoRoot string, stdout, stderr io.Writer) int
func resolveGuideDir(arg, cwd, repoRoot string) (string, error)
func findRepoRoot(start string) (string, error)
```

Parse arguments manually to preserve interspersed targets and current unknown-option behavior. `main` discovers cwd/repo root and exits with `run`'s code. Encode JSON only after all targets resolve and check successfully so bad targets cannot emit partial reports.

- [ ] **Step 4: Verify CLI behavior against real guides**

```bash
cd tools/lint-guide
go test ./cmd/lint-guide
go run ./cmd/lint-guide --json box x-docs
go run ./cmd/lint-guide box x-docs
```

Expected: grouped JSON in requested order and `<slug>: ok` for both clean guides.

- [ ] **Step 5: Commit**

```bash
git add tools/lint-guide/cmd
git commit -m "feat: add Go guide lint CLI"
```

---

### Task 4: Add the TypeScript process client and workflow integration

**Files:**
- Create: `pipeline/src/lint-guide-client.ts`
- Create: `pipeline/src/lint-guide-client.test.ts`
- Modify: `pipeline/src/workflow.ts:29,858-883`

**Interfaces:**
- Consumes: `LINT_GUIDE_BIN` or the nested-module `go run` fallback.
- Produces: `lintGuideWithGo(guideDir: string, repoRoot: string): Promise<LintFinding[]>` with no semantic lint logic.

- [ ] **Step 1: Write failing client tests with a fake executable**

Define/export:

```ts
export type LintFinding = {
  severity: 'blocker' | 'nit'
  target: 'external' | 'speakeasy' | 'research' | 'meta'
  where: string
  problem: string
  suggestion: string
  dimension: 'lint'
  rule?: 'url-placement'
}

export async function lintGuideWithGo(
  guideDir: string,
  repoRoot: string,
): Promise<LintFinding[]>
```

Use temporary executable shell scripts through `LINT_GUIDE_BIN` to test:

- exit 0 with one clean grouped result;
- exit 1 with one grouped result containing findings returns findings rather than throwing;
- exit 2 rejects with stderr;
- malformed JSON rejects;
- zero or multiple grouped results reject;
- spawned args are `--json <absolute-guide-dir>`;
- fallback command is `go run ./cmd/lint-guide --json <path>` with cwd `tools/lint-guide`.

Restore `process.env.LINT_GUIDE_BIN` after each test.

- [ ] **Step 2: Verify RED**

```bash
cd pipeline
npx tsx --test src/lint-guide-client.test.ts
```

Expected: import fails because the client does not exist.

- [ ] **Step 3: Implement the process client**

Use `node:child_process.spawn`, collect stdout/stderr separately, and decode:

```ts
type GuideResult = { guide: string; findings: LintFinding[] }
```

Treat exit 0 and 1 as decodable linter outcomes; all other exits are operational errors. Validate that decoded JSON is an array of exactly one object and that `findings` is an array before returning. Do not duplicate semantic field validation already enforced by Go tests.

- [ ] **Step 4: Await the client in workflow**

Replace the semantic import with:

```ts
import { lintGuideWithGo } from './lint-guide-client.ts'
```

At the existing lint point:

```ts
const lintFindings = await lintGuideWithGo(dir, ROOT)
```

Preserve downstream finding counts, ordering, and reviewer conversion unchanged.

- [ ] **Step 5: Verify with built binary and commit**

```bash
mkdir -p .tmp-bin
(cd tools/lint-guide && go build -o ../../.tmp-bin/lint-guide ./cmd/lint-guide)
cd pipeline
LINT_GUIDE_BIN=../.tmp-bin/lint-guide npx tsx --test src/lint-guide-client.test.ts
LINT_GUIDE_BIN=../.tmp-bin/lint-guide npm test
npm run typecheck
cd ..
rm -rf .tmp-bin
git add pipeline/src/lint-guide-client.ts pipeline/src/lint-guide-client.test.ts pipeline/src/workflow.ts
git commit -m "feat: call Go guide linter from pipeline"
```

---

### Task 5: Differential parity and authoritative cutover

**Files:**
- Create temporarily, then delete before commit: parity runner under `/tmp`
- Delete: `pipeline/src/lint-guide.ts`
- Delete: `pipeline/src/lint-guide-cli.ts`
- Delete: `pipeline/src/lint-guide.test.ts`
- Delete: `pipeline/src/markdown-url-placement.ts`
- Delete: `pipeline/src/markdown-url-placement.test.ts`
- Modify: `pipeline/package.json`
- Modify: `pipeline/package-lock.json`
- Modify: `mise.toml`
- Modify: `.github/workflows/pipeline-ci.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: approved Go checker, CLI, and TypeScript client from Tasks 1–4.
- Produces: one authoritative Go linter in local tasks, CI, CLI, and workflow; no TypeScript lint semantics remain.

- [ ] **Step 1: Run corpus differential parity before deletion**

Build the Go command, then use a temporary TypeScript runner to invoke both implementations for every `guides/*` directory and every Task 1 fixture. Compare `JSON.stringify` of findings exactly, including order and omitted `rule` fields.

```bash
(cd tools/lint-guide && go build -o /tmp/lint-guide-go ./cmd/lint-guide)
cd pipeline
node --import tsx /tmp/compare-guide-linters.ts
```

Expected: every corpus and malformed fixture prints `MATCH`; any mismatch stops deletion and is fixed in Go with a failing Go regression first.

- [ ] **Step 2: Switch package and Mise entry points**

Change `pipeline/package.json` script to retain command compatibility while delegating:

```json
"lint-guide": "cd ../tools/lint-guide && go run ./cmd/lint-guide"
```

Change Mise `lint-guide` to:

```toml
[tasks.lint-guide]
description = "Deterministic guide lint"
dir = "tools/lint-guide"
# Usage: mise run lint-guide -- box x
#        mise run lint-guide -- --json guides/box
run = "go run ./cmd/lint-guide"
```

Remove `_pipeline-install` from this task's dependencies. Keep README invocation examples unchanged and update its implementation note to identify the Go tool.

- [ ] **Step 3: Expand Pipeline CI**

Add path triggers for `tools/lint-guide/**`, `guides/**`, and `schema/**`. Add `actions/setup-go@v5` with Go `1.22`, then run:

```yaml
- name: Test Go guide linter
  working-directory: tools/lint-guide
  run: go test ./...

- name: Build Go guide linter
  working-directory: tools/lint-guide
  run: go build -o "$RUNNER_TEMP/lint-guide" ./cmd/lint-guide

- name: Typecheck pipeline
  working-directory: pipeline
  env:
    LINT_GUIDE_BIN: ${{ runner.temp }}/lint-guide
  run: npm run typecheck

- name: Test pipeline
  working-directory: pipeline
  env:
    LINT_GUIDE_BIN: ${{ runner.temp }}/lint-guide
  run: npm test
```

Keep Node 24 setup and `npm ci` for remaining pipeline code.

- [ ] **Step 4: Delete TypeScript lint semantics and remove only unused dependencies**

Delete the five TypeScript semantic/CLI/test files listed above. Verify imports before dependency removal:

```bash
rg -n "from ['\"](ajv|ajv-formats|micromark|micromark-util-decode-string)['\"]|require\('(ajv|ajv-formats|micromark|micromark-util-decode-string)'\)" pipeline/src
```

Expected: no matches. Then run:

```bash
cd pipeline
npm uninstall ajv ajv-formats micromark micromark-util-decode-string
```

Keep `yaml`, which remains used by `workflow.ts` and `lock.ts`.

- [ ] **Step 5: Verify no semantic duplication remains**

```bash
rg -n 'URL_PATTERN|url-placement|ALLOWED_TEMPLATE_KEY|lintExternalMarkdown|lintSpeakeasyMarkdown' pipeline/src
```

Expected: `url-placement` may appear only in the process-client type/tests or generic finding fixtures; rule constants and Markdown parsing exist only under `tools/lint-guide`.

- [ ] **Step 6: Run the cutover matrix and commit**

```bash
(cd tools/lint-guide && go test ./... && go vet ./...)
mkdir -p .tmp-bin
(cd tools/lint-guide && go build -o ../../.tmp-bin/lint-guide ./cmd/lint-guide)
(cd pipeline && LINT_GUIDE_BIN=../.tmp-bin/lint-guide npm test && npm run typecheck)
slugs=$(find guides -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)
(cd tools/lint-guide && go run ./cmd/lint-guide $slugs)
bash go/check.sh
rm -rf .tmp-bin
git diff --check
git add pipeline mise.toml .github/workflows/pipeline-ci.yml README.md
git commit -m "refactor: cut guide linting over to Go"
```

Expected: all 21 guides print `ok`, all tests pass, generated copies remain clean, and no temporary parity runner or binary is tracked.

---

### Task 6: Reconcile documentation and final PR state

**Files:**
- Modify: `docs/superpowers/specs/2026-08-27-markdown-url-placement-design.md`
- Modify: `docs/superpowers/plans/2026-08-27-markdown-url-placement-implementation.md`
- Modify: `docs/superpowers/specs/2026-08-27-markdown-url-placement-go-port-design.md` only if implementation rulings changed the approved contract
- Modify: PR #171 title/body through `gh`

**Interfaces:**
- Consumes: final authoritative Go implementation and verification evidence.
- Produces: unambiguous repository docs and an accurate draft PR description.

- [ ] **Step 1: Mark the original TypeScript design and plan as superseded**

Add this notice below each original title:

```markdown
> Superseded for implementation by the Go port design in
> `docs/superpowers/specs/2026-08-27-markdown-url-placement-go-port-design.md`.
> The policy and regression rationale remain historical context; the final
> authoritative checker is Go.
```

Do not delete the historical rationale or falsely rewrite completed history.

- [ ] **Step 2: Run final acceptance verification**

> Historical pre-prerequisite command block: the `pipeline` npm command and its
> expected typecheck are superseded by the post-prerequisite matrix above.

```bash
(cd tools/lint-guide && go test ./... && go vet ./...)
(cd go && go test ./...)
bash go/check.sh
mkdir -p .tmp-bin
(cd tools/lint-guide && go build -o ../../.tmp-bin/lint-guide ./cmd/lint-guide)
(cd pipeline && LINT_GUIDE_BIN=../.tmp-bin/lint-guide npm test && npm run typecheck)
slugs=$(find guides -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)
(cd tools/lint-guide && go run ./cmd/lint-guide --json $slugs) > /tmp/go-lint-all.json
node -e 'const r=require("/tmp/go-lint-all.json"); const f=r.flatMap(x=>x.findings); console.log(`guides=${r.length} findings=${f.length}`); if(f.length) process.exit(1)'
rm -rf .tmp-bin /tmp/go-lint-all.json
git diff --check
test -z "$(git status --porcelain)"
```

Historical expectation at the time of the original plan: tools/public Go tests, 21 guides with zero findings, and pipeline tests/typecheck. In the reconciled tree, the complete Kit factory suite and workflow checks supersede the deleted pipeline checks; the worktree must still be clean after the documentation commit.

- [ ] **Step 3: Commit documentation**

```bash
git add docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: record Go linter cutover"
```

Rerun `git status --short`; expected output is empty.

- [ ] **Step 4: Update the draft PR**

Update PR #171 without changing its draft state. The title should describe deterministic Go guide linting. The body must summarize the nested module, parity-preserved CLI, live Kit-factory integration, doctrine/guide migration, retained Node 24 tooling pin, superseded TypeScript pipeline, and exact final factory verification count. Keep the prerequisite merge-order history and record that reconciliation completed.

- [ ] **Step 5: Request broad whole-branch review**

Review the complete PR range, not only the last task. Require explicit checks for parser/source-coordinate correctness, schema message parity, CLI exits/output, subprocess failure handling, absence of duplicate TypeScript semantics, dependency isolation, CI paths, source/generated guide parity, and documentation accuracy. Resolve findings with regression-first changes and rerun Step 2 before declaring completion.

---

## Final Review Checklist

- [ ] All approved spec sections map to a completed task.
- [ ] `tools/lint-guide/go.mod` owns all authoring dependencies; `go/go.mod` is unchanged by the port.
- [ ] Go and the former TypeScript oracle matched on every committed guide and malformed fixture before deletion.
- [ ] URL behavior includes rendered entities/escapes/formatting, destination exclusions, unresolved references, non-ASCII byte columns, and linear traversal.
- [ ] Human/JSON output, target order/resolution, and `0/1/2` exits match the current CLI.
- [ ] Workflow and factory image consume only the nested Go command; no TypeScript process client remains.
- [ ] TypeScript semantic files, the deleted pipeline, duplicate public-module checker, and linter-only npm dependencies are absent.
- [ ] Doctrine and all six guide migrations remain intact; generated copies match.
- [ ] Tools Go tests/vet/tidy/fmt, public Go checks, complete factory tests, workflow checks, all-guide lint, Docker build, and diff hygiene pass.
- [ ] PR #171 remains a draft and documents prerequisite merge ordering.
