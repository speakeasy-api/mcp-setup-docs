# Markdown URL Placement Validator Implementation Plan

> Superseded for implementation by the Go port design in
> `docs/superpowers/specs/2026-08-27-markdown-url-placement-go-port-design.md`.
> The policy and regression rationale remain historical context; the final
> authoritative checker is Go.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `lint-guide` reject published-guide URLs that are neither Markdown links nor fenced code-block content.

**Architecture:** A focused module parses CommonMark into micromark structural events, excludes valid URL destination ranges, and reports HTTP(S) URLs found in other rendered source ranges with exact positions. The existing guide linter controls file scope and maps these violations into blocker findings.

**Tech Stack:** Node.js 24, TypeScript 7.0.2, `micromark` 4.x, `tsx`, and `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-27-markdown-url-placement-design.md`

## Global Constraints

- Standardize the pipeline's declared, local, CI, documented, and typed runtime on Node 24 and use TypeScript 7.0.2 or newer within major version 7.
- Check only `external.md` and `speakeasy.md`; never check `research.md`.
- Allow HTTP(S) URLs only in Markdown links, autolinks, reference destinations, images, or fenced code blocks.
- Report bare and inline-code URLs as blockers with rule identifier `url-placement`.
- Add no suppression mechanism and perform no network URL validation.
- Preserve existing CLI exit codes and human-readable and JSON modes.

## File Structure

- Create `pipeline/src/markdown-url-placement.ts` for CommonMark event-range classification.
- Create `pipeline/src/markdown-url-placement.test.ts` for focused parser tests.
- Create `pipeline/src/lint-guide.test.ts` for published-file integration and research exclusion.
- Modify `pipeline/src/lint-guide.ts` and `pipeline/src/lint-guide-cli.ts` for finding integration.
- Modify Node declarations in `pipeline/package.json`, `pipeline/package-lock.json`, `mise.toml`, `README.md`, and the three pipeline GitHub workflows.
- Modify the two doctrine files and affected published guides; regenerate embedded Go guide copies.

---

### Task 1: Standardize on Node 24 and TypeScript 7

**Files:**
- Modify: `pipeline/package.json`
- Modify: `pipeline/package-lock.json`
- Modify: `mise.toml`
- Modify: `README.md:27`
- Modify: `.github/workflows/pipeline-ci.yml`
- Modify: `.github/workflows/guide-stale-sweep.yml`
- Modify: `.github/workflows/guide-draft.yml`

**Interfaces:**
- Consumes: environments capable of installing Node 24.
- Produces: one consistent Node 24 runtime contract across development, CI, documentation, package metadata, and Node types, plus a TypeScript 7 compiler baseline.

- [ ] **Step 1: Update runtime declarations**

Set `pipeline/package.json` to:

```json
"engines": { "node": ">=24" }
```

Set `mise.toml` to `node = "24"`, each workflow `node-version` to `24`, and the README requirement to `Node ≥ 24`.

- [ ] **Step 2: Update Node type definitions and lockfile**

Run from `pipeline/`:

```bash
npm install --save-dev @types/node@^24 typescript@^7.0.2
```

Expected: `@types/node`, `typescript`, and their lockfile resolutions change. Run the existing test and typecheck commands before validator work so any TypeScript 7 migration issue is isolated.

- [ ] **Step 3: Verify the baseline**

```bash
node --version
npx tsc --version
npm run typecheck
npm test
```

Expected: Node reports `v24.x`, TypeScript reports `Version 7.x`, and both typecheck and tests pass. If TypeScript 7 exposes an obsolete compiler option or existing type error, make the smallest strictness-preserving compatibility edit in this task and rerun both checks.

- [ ] **Step 4: Commit**

```bash
git add pipeline/package.json pipeline/package-lock.json mise.toml README.md .github/workflows
git commit -m "chore: standardize pipeline on Node 24"
```

---

### Task 2: Build the source-positioned URL classifier

**Files:**
- Create: `pipeline/src/markdown-url-placement.ts`
- Create: `pipeline/src/markdown-url-placement.test.ts`
- Modify: `pipeline/package.json`
- Modify: `pipeline/package-lock.json`

**Interfaces:**
- Consumes: a Markdown body string.
- Produces: `findUrlPlacementViolations(markdown: string): UrlPlacementViolation[]`, where `UrlPlacementViolation` is `{ url: string; line: number; column: number }` with one-based coordinates.

- [ ] **Step 1: Install the parser**

```bash
cd pipeline
npm install micromark@^4.0.2
```

- [ ] **Step 2: Write failing tests**

Create `pipeline/src/markdown-url-placement.test.ts` with `node:test` cases equivalent to:

```ts
assert.deepEqual(findUrlPlacementViolations([
  '[docs](https://example.com/a_(b)?x=1#part)',
  '<https://example.com/autolink>',
  '[ref]: https://example.com/reference',
  '![screen](https://example.com/image.png)',
  '```text',
  'https://example.com/copied',
  '```',
].join('\n')), [])

assert.deepEqual(
  findUrlPlacementViolations('Open https://example.com/docs.\nEnter `https://example.com/callback`.'),
  [
    { url: 'https://example.com/docs.', line: 1, column: 6 },
    { url: 'https://example.com/callback', line: 2, column: 8 },
  ],
)

assert.deepEqual(
  findUrlPlacementViolations('    https://example.com/not-fenced'),
  [{ url: 'https://example.com/not-fenced', line: 1, column: 5 }],
)
```

Also cover two URLs on one line, `http://`, query strings, fragments, tilde fences, and raw HTML.

- [ ] **Step 3: Confirm the tests fail**

```bash
npx tsx --test src/markdown-url-placement.test.ts
```

Expected: failure because the module does not exist.

- [ ] **Step 4: Implement the classifier**

Create these exports:

```ts
export type UrlPlacementViolation = {
  url: string
  line: number
  column: number
}

export function findUrlPlacementViolations(
  markdown: string,
): UrlPlacementViolation[]
```

Use micromark's CommonMark events to derive eligible rendered source ranges and excluded destination/fenced-code ranges. Coalesce contiguous eligible ranges before applying `https?://[^\s<>"'`]+` so entities, emphasis, and other inline events cannot truncate a URL. Preserve exact source spelling and convert source offsets to one-based line and column with LF, CRLF, and CR support. Treat only real definitions as resolving references; unresolved reference-like text remains rendered prose. This catches prose, labels, image alt text, titles, inline code, indented code, and raw HTML without decoding or fetching URLs, while excluding actual link/image/autolink/reference destinations and fenced code.

**Implementation ruling:** mdast image nodes flatten description children and cannot reliably distinguish nested destination ranges from rendered alt text. The reviewed implementation therefore uses micromark's structural event stream directly. This preserves CommonMark source ranges and document-level reference resolution while keeping the public classifier interface unchanged.

- [ ] **Step 5: Verify and commit**

```bash
npx tsx --test src/markdown-url-placement.test.ts
npm run typecheck
git add package.json package-lock.json src/markdown-url-placement.ts src/markdown-url-placement.test.ts
git commit -m "feat: classify markdown URL placement"
```

Expected: tests and typecheck pass.

---

### Task 3: Integrate the rule into `lint-guide`

**Files:**
- Modify: `pipeline/src/lint-guide.ts:19-61,482-540`
- Modify: `pipeline/src/lint-guide-cli.ts:45-65`
- Create: `pipeline/src/lint-guide.test.ts`

**Interfaces:**
- Consumes: `findUrlPlacementViolations(markdown)` from Task 2.
- Produces: `LintFinding.rule?: 'url-placement'` and one published-target blocker per violation.

- [ ] **Step 1: Write failing integration tests**

Build temporary guide directories with `external.md` and `speakeasy.md`, call `lintGuide`, and filter findings by `rule === 'url-placement'`. Assert:

```ts
assert.deepEqual(
  findings.map(({ target, where, rule }) => ({ target, where, rule })),
  [
    { target: 'external', where: 'line 6, column 6', rule: 'url-placement' },
    { target: 'speakeasy', where: 'line 3, column 8', rule: 'url-placement' },
  ],
)
```

Use external content with three-line frontmatter followed by a bare URL on line 6, and speakeasy content with an inline-code URL on line 3. Add `research.md` containing a bare URL and assert it produces no `url-placement` finding.

- [ ] **Step 2: Confirm integration tests fail**

```bash
cd pipeline
npx tsx --test src/lint-guide.test.ts
```

Expected: no rule field or URL findings exist yet.

- [ ] **Step 3: Add the finding and frontmatter interfaces**

Extend `LintFinding` with:

```ts
rule?: 'url-placement'
```

Extend `stripFrontmatter` to return `bodyStartLine`, equal to `1` without frontmatter and the actual one-based body start line when frontmatter is stripped.

- [ ] **Step 4: Map violations to blockers**

Add a helper that maps parser output to:

```ts
finding({
  severity: 'blocker',
  target,
  where: `line ${violation.line + lineOffset}, column ${violation.column}`,
  problem: `URL is not in a Markdown link or fenced code block: ${violation.url}`,
  suggestion:
    'URLs should either be Markdown links or appear in fenced code blocks. ' +
    'Use a link when the reader should open the URL; use a fenced code block ' +
    'when the reader should copy it.',
  rule: 'url-placement',
})
```

Invoke it for the stripped external body with its line offset and for complete `speakeasy.md` with offset zero. Do not invoke it for `research.md`.

- [ ] **Step 5: Add the rule to human output**

In `lint-guide-cli.ts`, preserve existing labels while adding the optional identifier:

```ts
const label = f.rule ? `${f.severity}/${f.rule}` : f.severity
console.log(`  [${label}] ${f.target} ${f.where}: ${f.problem}`)
```

- [ ] **Step 6: Verify and commit**

```bash
npx tsx --test src/markdown-url-placement.test.ts src/lint-guide.test.ts
npm test
npm run typecheck
git add src/lint-guide.ts src/lint-guide-cli.ts src/lint-guide.test.ts
git commit -m "feat: lint published guide URL placement"
```

---

### Task 4: Update doctrine and migrate published guides

**Files:**
- Modify: `doctrine/personas/it-admin.md:60-82`
- Modify: `doctrine/roles/writer.md:107-116`
- Modify: affected `guides/*/external.md` and `guides/*/speakeasy.md`
- Regenerate: matching `go/generated/guides/**` files

**Interfaces:**
- Consumes: the `url-placement` rule from Task 3.
- Produces: doctrine without a length threshold and published sources with no URL-placement findings.

- [ ] **Step 1: Replace the doctrine rule**

Use this persona policy:

```markdown
- Values the reader types or copies from the guide use fenced code blocks,
  exactly as the field receives them. Each separately entered value gets
  its own block, regardless of length.
- Every URL is either a Markdown link or in a fenced code block. A URL the
  reader opens is a link; a URL the reader copies is in its own fenced code
  block. URLs are never bare prose or inline code.
```

Apply the same invariant to the Writer formatting self-check and remove every reference to the approximately-30-character threshold.

- [ ] **Step 2: List current violations**

From the repository root, run `lint-guide` for every directory under `guides/` and retain lines labeled `[blocker/url-placement]`. Expected affected published sources are Google Compute Engine, X Docs, Salesforce, Google Calendar, and Intercom.

- [ ] **Step 3: Convert opened URLs to links**

- Make the Google Compute Engine explanatory server URL a descriptive link.
- Make the Google Calendar Admin console URL a link labeled `admin.google.com`.
- Preserve the Salesforce table while converting each production and sandbox endpoint cell to a link whose destination retains the exact endpoint bytes.

- [ ] **Step 4: Convert copied URLs to separate blocks**

- X Docs: put the fixed remote URL and prohibited substitute URL in separate `text` fences with prose identifying each.
- Intercom external setup: put US and EU MCP URLs in separate `text` fences under their hostname alternatives.
- Intercom Speakeasy setup: put issuer and authorization endpoint URLs in separate `text` fences under their respective numbered actions.

Indent fences so CommonMark parses them inside the containing list items.

- [ ] **Step 5: Verify no published URL finding remains**

Run all guide slugs through `lint-guide`. Fail the check if human output contains `[blocker/url-placement]`; unrelated pre-existing findings are outside this migration.

- [ ] **Step 6: Regenerate embedded guides and run final checks**

```bash
(cd go/internal/gen && go run .)
(cd pipeline && npm test && npm run typecheck)
(cd go && go test ./...)
git diff --check
```

Expected: all commands pass; only generated copies corresponding to modified guide sources change.

- [ ] **Step 7: Commit**

```bash
git add doctrine/personas/it-admin.md doctrine/roles/writer.md guides go/generated/guides
git commit -m "docs: enforce link or block URL placement"
```

---

## Final Review Checklist

- [ ] Node 24 is consistent in package metadata, mise, README, type definitions, and all three workflows; TypeScript reports version 7.x.
- [ ] A bare or inline-code URL in either published file yields a blocker with line, column, URL, and JSON rule identifier.
- [ ] Links, autolinks, references, images, and fenced blocks pass.
- [ ] `research.md` remains outside the rule.
- [ ] Doctrine contains no URL-length threshold.
- [ ] All published guide URL findings are resolved and generated copies are current.
- [ ] No escape hatch or network URL validation exists.
