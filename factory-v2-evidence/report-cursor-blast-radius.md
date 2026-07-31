# Blast radius: removing `CURSOR_API_KEY` / `@cursor/sdk` from `pipeline/`

Scope: worktree `/home/walker/github.com/speakeasy-api/mcp-setup-docs/.claude/worktrees/sandcastle-factory`
(branch `worktree-sandcastle-factory`). Read-only survey — nothing was edited, committed, or installed.

**Secrets note:** no secret values appear in this report. Key *names* only; `OPENROUTER_API_KEY` is
reported as a character count.

---

## 1. Every hit of `CURSOR_API_KEY` / `@cursor/sdk` / `cursor-sdk` / `CURSOR_`

Search: `grep -rn "CURSOR_API_KEY\|@cursor/sdk\|cursor-sdk\|CURSOR_" pipeline/src pipeline/package.json .github/workflows/ FACTORY.md doctrine/`

### 1a. Real code coupling — must change

| # | Location | What it does |
| --- | --- | --- |
| 1 | `pipeline/package.json:17` | The dependency itself |
| 2 | `pipeline/src/runtime.ts:1` | **Primary** SDK import — `Agent`, `CursorAgentError`, `ModelSelection` |
| 3 | `pipeline/src/resolve-issue.ts:9` | **Second** SDK import — `Agent`, `CursorAgentError` |
| 4 | `pipeline/src/cli.ts:218-222` | Reads + hard-requires `CURSOR_API_KEY` |
| 5 | `pipeline/src/resolve-issue.ts:233-237` | Reads + hard-requires `CURSOR_API_KEY` |
| 6 | `pipeline/src/factory/cmd-distill.ts:26-29` | Third `CURSOR_API_KEY` gate (pre-flight, before spawning `resolve-issue.ts`) |
| 7 | `.github/workflows/guide-draft.yml:88` | Secret injected into the **distill** step |
| 8 | `.github/workflows/guide-draft.yml:119` | Secret injected into the **draft** step |

### 1b. Env-var defaults (`CURSOR_MODEL*` / `CURSOR_EFFORT*`)

`pipeline/src/cli.ts:74-77` — the actual read sites:

```ts
  // Heavy slots (research / draft / fidelity / achievability / revision)
  // default to GPT-5.6 Sol at high effort; light model kept for optional overrides.
  let model = process.env.CURSOR_MODEL || 'gpt-5.6-sol'
  let lightModel = process.env.CURSOR_MODEL_LIGHT || 'composer-2.5'
  let effort = process.env.CURSOR_EFFORT || 'high'
  let lightEffort = process.env.CURSOR_EFFORT_LIGHT || ''
```

`pipeline/src/resolve-issue.ts:96`:

```ts
  let lightModel = process.env.CURSOR_MODEL_LIGHT || 'composer-2.5'
```

Help-text mirrors of the same names: `pipeline/src/cli.ts:39-43`, `pipeline/src/resolve-issue.ts:43`, `:46`, `:49`.

### 1c. Emitted-data strings (`runtime: 'cursor-sdk'`) — written to disk, schema-visible

- `pipeline/src/cli.ts:209` — run record body:
  ```ts
    runtime: 'cursor-sdk',
  ```
  (inside `writeRunRecord()`, `pipeline/src/cli.ts:190-214`; lands in `retro/runs/<ts>-<slug>.json`)
- `pipeline/src/workflow.ts:545` — lockfile body:
  ```ts
      const lock: PipelineLock = {
        schema_version: 1,
        slug: g.slug,
        persona: PERSONA,
        runtime: 'cursor-sdk',
        updated_at: completedAt,
        steps,
      }
  ```
  (written to `guides/<slug>/pipeline.lock.json`)
- `pipeline/src/cli.ts:270` — startup banner: `` `draft-guide (cursor-sdk): persona=…` ``

**Doctrine constraint on that string** — `doctrine/pipeline-lock.md:114-115`:

> Top-level `runtime` (e.g. `cursor-sdk`) is observational and **must not**
> appear inside `inputs` or affect `input_digest`.

…and the illustrative lockfile at `doctrine/pipeline-lock.md:203`: `"runtime": "cursor-sdk",`.

Because `runtime` is explicitly excluded from `input_digest`, **changing this string will not
invalidate existing lockfiles / force re-runs.** It is free to change. The doc examples at
`:114` and `:203` are prose and should be updated for accuracy, not correctness.

### 1d. Docs

- `FACTORY.md:18` — secrets table row:
  ```
  | `CURSOR_API_KEY` | **Yes** | Cursor API key (Dashboard → Integrations / API Keys) |
  ```
- `FACTORY.md:106` — local-run instructions:
  ```bash
  export CURSOR_API_KEY=cursor_...
  mise run draft-guide -- asana --overwrite --notes "drop secret-reset recovery branch"
  ```
- `mise.toml:18` (repo root **and** worktree, identical) — task description: `"Draft a Guide via the Cursor SDK pipeline (pipeline/)"`; `mise.toml:23` comment: `# Requires CURSOR_API_KEY in the environment (user or team service-account key).`

### 1e. Historical only — do NOT touch

`doctrine/CHANGELOG.md` lines 247, 248, 270-273, 298, 299, 378, 449, 474, 494, 526, 561 all reference
the **old path** `scripts/cursor-sdk/src/…` (pre-rename to `pipeline/`). These are dated changelog
entries describing past work; they are not live references.

---

## 2. `pipeline/package.json` — full

```json
{
  "name": "mcp-setup-docs-pipeline",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.13"
  },
  "scripts": {
    "draft-guide": "tsx src/cli.ts",
    "lint-guide": "tsx src/lint-guide-cli.ts",
    "resolve-issue": "tsx src/resolve-issue.ts",
    "factory": "tsx src/factory/cli.ts",
    "typecheck": "tsc --noEmit",
    "test": "tsx --test \"src/**/*.test.ts\""
  },
  "dependencies": {
    "@cursor/sdk": "^1.0.24",
    "ajv": "^8.20.0",
    "ajv-formats": "^3.0.1",
    "yaml": "^2.9.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0"
  }
}
```

What the scripts actually run:

- **`npm test`** → `tsx --test "src/**/*.test.ts"` — Node's **built-in test runner** (`node:test`) driven
  through `tsx`. No jest/vitest/mocha. No config file, no setup file, no reporter config.
- **`npm run typecheck`** → `tsc --noEmit` against `pipeline/tsconfig.json`. Verified passing (exit 0).
- **Lint script: there is none.** No `lint` key, no ESLint/Biome/Prettier dependency anywhere in
  `pipeline/`. `lint-guide` is *content* linting (I4 grammar + meta schema for guides) —
  `tsx src/lint-guide-cli.ts`, unrelated to code style and **not run by CI**.

CI (`.github/workflows/pipeline-ci.yml`) runs exactly three commands: `npm ci`, `npm run typecheck`, `npm test`.

---

## 3. `pipeline/src/cli.ts` — flag surface (313 lines; no separate `main.ts`)

There is **no `main.ts`**. `pipeline/src/cli.ts` is the sole `draft-guide` entrypoint; `main()` lives
at `cli.ts:216-308`.

### 3a. `parseArgs` verbatim — `pipeline/src/cli.ts:63-149`

```ts
function parseArgs(argv: string[]) {
  const positionals: string[] = []
  let persona = 'it-admin'
  let notes: string | undefined
  let maxRounds = 3
  let overwrite = false
  let force = false
  let pauseOnScope = false
  let repoRoot: string | undefined
  // Heavy slots (research / draft / fidelity / achievability / revision)
  // default to GPT-5.6 Sol at high effort; light model kept for optional overrides.
  let model = process.env.CURSOR_MODEL || 'gpt-5.6-sol'
  let lightModel = process.env.CURSOR_MODEL_LIGHT || 'composer-2.5'
  let effort = process.env.CURSOR_EFFORT || 'high'
  let lightEffort = process.env.CURSOR_EFFORT_LIGHT || ''

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--help' || a === '-h') usage()
    if (a === '--overwrite' || a === '-y') {
      overwrite = true
      continue
    }
    if (a === '--force') {
      force = true
      continue
    }
    if (a === '--pause-on-scope') {
      pauseOnScope = true
      continue
    }
    if (a === '--persona') {
      persona = argv[++i] || usage()
      continue
    }
    if (a === '--notes') {
      notes = argv[++i] || usage()
      continue
    }
    if (a === '--max-rounds') {
      maxRounds = Number(argv[++i])
      if (!Number.isFinite(maxRounds) || maxRounds < 1) usage()
      continue
    }
    if (a === '--repo-root') {
      repoRoot = resolve(argv[++i] || usage())
      continue
    }
    if (a === '--model') {
      model = argv[++i] || usage()
      continue
    }
    if (a === '--light-model') {
      lightModel = argv[++i] || usage()
      continue
    }
    if (a === '--effort') {
      effort = argv[++i] || usage()
      continue
    }
    if (a === '--light-effort') {
      lightEffort = argv[++i] || usage()
      continue
    }
    if (a.startsWith('-')) {
      console.error('Unknown flag: ' + a)
      usage()
    }
    positionals.push(a)
  }

  if (positionals.length === 0) usage()
  return {
    positionals,
    persona,
    notes,
    maxRounds,
    overwrite,
    force,
    pauseOnScope,
    repoRoot,
    model,
    lightModel,
    effort,
    lightEffort,
  }
}
```

Note: `--runtime` **does not exist**. There is no runtime-selection flag today.

### 3b. Flag → destination map

| Flag | Env fallback | Destination |
| --- | --- | --- |
| `<positional>` (1+, required) | — | slugified → `GuideInput[]` → `runWorkflow` |
| `--persona <id>` (default `it-admin`) | — | validated against `doctrine/personas/*.md`, → `runWorkflow` |
| `--notes <text>` | — | `GuideInput.notes` |
| `--max-rounds <n>` (default 3) | — | `runWorkflow({maxRounds})` |
| `--overwrite`, `-y` | — | local only (overwrite prompt bypass) |
| `--force` | — | local overwrite bypass **and** `runWorkflow({force})` (bypasses lock skips) |
| `--pause-on-scope` | — | `runWorkflow({pauseOnScope})` |
| `--repo-root <path>` | — | `repoRoot`, → both `createRuntime` and `runWorkflow` |
| `--model <id>` | `CURSOR_MODEL` (default `gpt-5.6-sol`) | **`RuntimeConfig.defaultModel.id`** |
| `--light-model <id>` | `CURSOR_MODEL_LIGHT` (default `composer-2.5`) | **`RuntimeConfig.lightModel.id`** |
| `--effort <level>` | `CURSOR_EFFORT` (default `high`) | **`RuntimeConfig.defaultModel.params[{id:'effort'}]`** |
| `--light-effort <level>` | `CURSOR_EFFORT_LIGHT` (default `''` = omitted) | **`RuntimeConfig.lightModel.params[{id:'effort'}]`** |

### 3c. The RuntimeConfig construction — `pipeline/src/cli.ts:251-267`

```ts
  const startedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const defaultModel = {
    id: args.model,
    ...(args.effort ? { params: [{ id: 'effort', value: args.effort }] } : {}),
  }
  const lightModel = {
    id: args.lightModel,
    ...(args.lightEffort
      ? { params: [{ id: 'effort', value: args.lightEffort }] }
      : {}),
  }
  const rt = createRuntime({
    apiKey,
    repoRoot,
    defaultModel,
    lightModel,
  })
```

Effort is encoded as Cursor's `ModelSelection.params` array — `[{ id: 'effort', value: <level> }]`.
That shape is `@cursor/sdk`-specific and is also read back out in `runtime.ts:43`
(`selection.params?.find((p) => p.id === 'effort')?.value`) for logging. Both sides need reshaping.

### 3d. Env reads in `cli.ts`

- `:74`, `:75`, `:76`, `:77` — `CURSOR_MODEL`, `CURSOR_MODEL_LIGHT`, `CURSOR_EFFORT`, `CURSOR_EFFORT_LIGHT`
- `:218-222` — the hard gate:
  ```ts
    const args = parseArgs(process.argv.slice(2))
    const apiKey = process.env.CURSOR_API_KEY?.trim()
    if (!apiKey) {
      console.error('CURSOR_API_KEY is required')
      process.exit(1)
    }
  ```
- No other `process.env` reads in `cli.ts` (`process.stdin.isTTY` at `:173` is the only other ambient input).

### 3e. Exit codes (contract with the factory — `cli.ts:300-307`)

`0` converged · `1` hard failure/missing key · `2` unconverged|blocked|failed · `3` awaiting_scope.
Consumed by `pipeline/src/factory/draft-outcome.ts` via `mapDraftOutcome`. **Preserve these.**

---

## 4. `pipeline/src/resolve-issue.ts` — the second `@cursor/sdk` import

**Total: 322 lines.** Entrypoint for `npm run resolve-issue`.

### End to end

1. `parseArgs` (`:91-130`) — `--title` / `--body` (env fallbacks `ISSUE_TITLE` / `ISSUE_BODY`),
   `--output <path>`, `--repo-root`, `--light-model` (env `CURSOR_MODEL_LIGHT`, default `composer-2.5`).
2. `main` (`:231`) gates on `CURSOR_API_KEY` (`:233-237`), then requires non-empty title-or-body.
3. Enumerates existing `guides/*` slugs (`listGuideSlugs`, `:73-80`) and `doctrine/personas/*.md`
   ids (`listPersonas`, `:82-89`) to constrain the model's choices.
4. `buildPrompt` (`:132-196`) — a single self-contained prompt asking for one JSON object:
   either `{status:"ok", slug, provider, persona, notes}` or
   `{status:"needs_clarification", reason, candidates[]}`.
5. **One-shot `Agent.prompt`** (quoted below) — no file work, no tools, no multi-turn.
6. `extractJson` (`./json.ts`) → `ResolvedSchema.safeParse` (zod discriminated union on `status`,
   `:16-30`) → `normalizeOk` (`:204-229`) re-slugifies and clamps persona to a known id.
7. `writeOutput` (`:198-202`) prints the JSON to stdout **and** writes it to `--output` if given.

### Returns / exits

Writes `ResolvedIssue` JSON. Exits `0` on `status:"ok"`, `2` on `needs_clarification` (including
unparseable JSON and schema-validation failure — both are converted into a `needs_clarification`
payload that is still *written*), `1` on missing key / empty input / agent error, `64` on usage.

### The agent-invoking portion, in full — `pipeline/src/resolve-issue.ts:254-286`

```ts
  console.error(
    `resolve-issue: model=${args.lightModel} guides=${guideSlugs.length} personas=${personas.join(',')}`
  )

  let resultText = ''
  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: args.lightModel },
      name: 'resolve-issue',
      local: {
        cwd: repoRoot,
        settingSources: [],
      },
    })

    if (result.status !== 'finished') {
      console.error(
        `resolve-issue: run ended status=${result.status}` +
          (result.error ? ` error=${result.error.message}` : '')
      )
      process.exit(1)
    }
    resultText = result.result ?? ''
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        `resolve-issue: Agent.prompt failed: ${err.message} retryable=${err.isRetryable}`
      )
      process.exit(1)
    }
    throw err
  }
```

**Notable:** this path does **not** go through `runtime.ts` at all — it calls `Agent.prompt` directly.
So swapping `createRuntime` alone leaves this file broken. It also has *no* effort param and no
remediation/follow-up loop, so it's the cheapest of the two to port: it needs "prompt in → final
assistant text out", nothing more.

### For contrast: `pipeline/src/runtime.ts` (182 lines) is the other surface

Exports `createRuntime(cfg: RuntimeConfig)` returning `{ log, agent, parallel, pipeline, modelId }`.
Uses `Agent.create` + `await using` (explicit-resource-management disposal), `agentHandle.send(prompt)`,
`run.wait()`, `run.id`, `agentHandle.agentId`, and a one-shot **remediation follow-up on the same agent
handle** (`:104-118`) that requires *conversation continuity across two sends* — the hardest thing to
reproduce with a stateless `spawn`. `CursorAgentError.isRetryable` is consumed at `:122-127`.

`RuntimeConfig` — `runtime.ts:23-30`:

```ts
export type RuntimeConfig = {
  apiKey: string
  repoRoot: string
  /** Heavy slots: research, draft, fidelity, achievability, revision. */
  defaultModel: ModelSelection
  /** Light model for optional `model: 'sonnet'` overrides (CLI still accepts it). */
  lightModel: ModelSelection
}
```

Consumers of `runtime.ts` are only two files:

- `pipeline/src/cli.ts:5` — `import { createRuntime } from './runtime.ts'`
- `pipeline/src/workflow.ts:30` — `import { withSchemaHint, type Runtime } from './runtime.ts'`

`workflow.ts` (1735 lines) destructures the whole surface once at `:407`:

```ts
  const { log, agent, parallel, pipeline, modelId } = rt
```

`agent()` call sites in `workflow.ts`: `:711` (judge), `:998` (reviewer), `:1113` (research),
`:1347` (draft), `:1493` (revision), `:1596` (salvage). `modelId()` at `:481`, `:501`, `:520`,
`:977`, `:1322` (recorded into lockfile `inputs.model`). The only slot-alias override is
`:1002` — `...(dim.model ? { model: dim.model } : {})`. **`workflow.ts` never imports `@cursor/sdk`
directly** — `Runtime` is already a clean seam. Keep its shape and `workflow.ts` needs no changes
beyond the `runtime: 'cursor-sdk'` string at `:545`.

---

## 5. Test setup

### Runner

Node's built-in `node:test`, executed through `tsx`: `tsx --test "src/**/*.test.ts"`.
Assertions via `node:assert/strict`. **No jest/vitest/mocha, no config file, no setup/teardown file,
no coverage config.**

### Every test file

| File | Lines |
| --- | --- |
| `pipeline/src/lock.test.ts` | 338 |
| `pipeline/src/factory/formatters.test.ts` | 163 |
| `pipeline/src/factory/preflight.test.ts` | 119 |
| `pipeline/src/findings.test.ts` | 85 |
| `pipeline/src/factory/draft-outcome.test.ts` | 54 |
| `pipeline/src/factory/github-output.test.ts` | 53 |
| **Total** | **812** |

### Current pass count (verified — `npm test`, read-only)

```
ℹ tests 34
ℹ suites 19
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 145.264947
```

**34/34 passing, 19 suites.** `npm run typecheck` also passes (exit 0).

### Is there an existing stub/fake pattern for the runtime or for subprocesses?

**No — and this is the single most important gap for your change.**

- Zero occurrences of `mock`, `jest.fn`, `sinon`, `t.mock`, `td`, or any fake/spy helper anywhere in
  `pipeline/src`. (The only `stub` hit is `lock.test.ts:243` writing the literal string `'# stub\n'`
  as fixture file content — unrelated.)
- **Nothing tests `runtime.ts`, `cli.ts`, `resolve-issue.ts`, or `workflow.ts`.** The four files you're
  changing are entirely untested today.
- The established idiom instead is **dependency injection of pure functions**: the testable logic is
  extracted into a pure module and the impure caller is a thin untested shell. See
  `decidePreflight({ isCollaborator: () => true, committerDate: (sha) => dates[sha], … })` in
  `preflight.test.ts` — collaborators are passed in as plain function properties. `lock.test.ts` uses
  real temp dirs + real files rather than fs mocks.
- Existing subprocess code is `spawnSync` wrapped in three thin, **untested** modules:
  `pipeline/src/factory/gh.ts:1,13` · `pipeline/src/factory/git.ts:1,10` ·
  `pipeline/src/factory/run-pipeline.ts:1,25`.

**Idiomatic move for your port:** put the `pi` spawn behind an injectable function (mirroring
`isCollaborator`), keep prompt-building / stdout-parsing / model-selection as pure exported functions,
and test those. That matches the repo exactly and needs no mocking library.

`run-pipeline.ts` is also the closest existing model for *how this repo spawns a CLI* — worth matching:

```ts
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot } from './env.ts'

/**
 * Run a pipeline entrypoint with live stdio.
 * Prefer the local `tsx` binary over `npm run` — npm buffers script output
 * when stdout is not a TTY (GitHub Actions), so progress only appears at exit.
 */
export function runPipelineScript(
  scriptRel: string,
  args: string[],
  opts?: { env?: NodeJS.ProcessEnv },
): number {
  const root = repoRoot()
  const pipelineDir = join(root, 'pipeline')
  const tsxBin = join(pipelineDir, 'node_modules', '.bin', 'tsx')
  if (!existsSync(tsxBin)) {
    console.error(`factory: missing ${tsxBin}; run npm ci in pipeline/`)
    return 1
  }
  console.error(`factory: ${scriptRel} ${args.join(' ')}`)
  // Do not set `encoding` with inherit — it can suppress live streaming.
  const r = spawnSync(tsxBin, [scriptRel, ...args], {
    cwd: pipelineDir,
    env: opts?.env ?? process.env,
    stdio: 'inherit',
  })
  if (r.error) {
    console.error(`factory: failed to spawn ${tsxBin}: ${r.error.message}`)
    return 1
  }
  return r.status ?? 1
}
```

⚠️ Note its `stdio: 'inherit'` + the comment about npm buffering under non-TTY. If you `spawn` `pi`
and need to **capture** its output (you will — you parse the final JSON), you cannot use `'inherit'`
for stdout. Plan for `['ignore','pipe','inherit']` or a tee, or agent progress goes dark in Actions.

### Representative test file — imports + setup, verbatim

`pipeline/src/factory/preflight.test.ts:1-35` (the DI idiom; match this exactly):

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { decidePreflight, filterClosingPrs, type MatchingPr } from './preflight.ts'

describe('filterClosingPrs', () => {
  it('keeps PRs that Closes/Fixes/Resolves the issue', () => {
    const prs: MatchingPr[] = [
      {
        number: 1,
        url: 'https://example/1',
        body: 'Closes #42',
        author: { login: 'bot' },
        headRefName: 'guide/issue-42-box',
      },
      {
        number: 2,
        url: 'https://example/2',
        body: 'Related to #42',
        author: { login: 'bot' },
        headRefName: 'other',
      },
      {
        number: 3,
        url: 'https://example/3',
        body: 'fixes #42\n\nnotes',
        author: { login: 'bot' },
        headRefName: 'x',
      },
    ]
    const got = filterClosingPrs(prs, '42')
    assert.equal(got.length, 2)
    assert.equal(got[0]!.number, 1)
    assert.equal(got[1]!.number, 3)
  })
})
```

And the injection shape, `preflight.test.ts:101-118`:

```ts
  it('picks newest orphan branch by committer date', () => {
    const dates: Record<string, string> = {
      old: '2026-01-01T00:00:00Z',
      neu: '2026-06-01T00:00:00Z',
    }
    const r = decidePreflight({
      issueNumber: '7',
      matchingPrs: [],
      isCollaborator: () => true,
      orphanRefs: [
        { ref: 'refs/heads/guide/issue-7-a', object: { sha: 'old' } },
        { ref: 'refs/heads/guide/issue-7-b', object: { sha: 'neu' } },
      ],
      committerDate: (sha) => dates[sha],
    })
    assert.equal(r.resume, true)
    assert.equal(r.resume_branch, 'guide/issue-7-b')
  })
```

Style notes to match: `.ts` extension on relative imports (required — `type: module` + tsx),
`assert.equal` (not `deepStrictEqual`) for scalars, non-null `!` on array indexing, no `beforeEach`.

---

## 6. `.github/workflows/guide-draft.yml`

202 lines. Triggered by `issues: [labeled]`, gated `if: github.event.label.name == 'guide:draft'`.

### Job-level facts you asked for

```yaml
jobs:
  draft:
    if: github.event.label.name == 'guide:draft'
    runs-on: ubuntu-latest
    timeout-minutes: 180
    concurrency:
      group: guide-draft-issue-${{ github.event.issue.number }}
      cancel-in-progress: false
    permissions:
      contents: write
      issues: write
      pull-requests: write
```

- **`timeout-minutes: 180`** (3 h) — job level, no step-level timeouts anywhere.
- **`concurrency`** — keyed per issue number, `cancel-in-progress: false` (queues rather than cancels).

### `npm i -g` steps: **there are none.**

Every workflow in `.github/workflows/` installs only via `npm ci` inside `pipeline/`. Full inventory of
npm invocations across all workflows: `pipeline-ci.yml:29,31` and `guide-draft.yml:49` plus fourteen
`npm run factory -- <cmd>` steps. **Nothing is installed globally today** — adding
`npm i -g @earendil-works/pi-coding-agent@<pin>` would be a new class of step in this repo.

### The two steps referencing `CURSOR_API_KEY`, in full

**Distill bootstrap — `guide-draft.yml:83-89`** (design doc said ~82-89; it's 83-89):

```yaml
      - name: Distill issue intent
        id: distill
        if: steps.preflight.outputs.refused != 'true'
        working-directory: pipeline
        env:
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
        run: npm run factory -- distill
```

**Draft — `guide-draft.yml:114-125`** (design doc said ~115-124; it's 114-125):

```yaml
      - name: Draft guide
        id: draft
        if: steps.preflight.outputs.refused != 'true' && success()
        working-directory: pipeline
        env:
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
          PULSE_REGISTRY_KEY: ${{ secrets.PULSE_REGISTRY_KEY }}
          PULSE_REGISTRY_TENANT: ${{ secrets.PULSE_REGISTRY_TENANT }}
          SLUG: ${{ steps.distill.outputs.slug }}
          PERSONA: ${{ steps.distill.outputs.persona }}
          NOTES: ${{ steps.distill.outputs.notes }}
        run: npm run factory -- draft
```

Those are the **only** two `CURSOR_API_KEY` references in the entire `.github/` tree. Job-level `env:`
(lines 20-26) carries `ISSUE_NUMBER`, `ISSUE_TITLE`, `ISSUE_BODY`, `GH_TOKEN`, `GH_REPO` — **no**
model/API keys, so the key is deliberately scoped to just these two steps. Swapping in
`OPENROUTER_API_KEY` is a two-line change plus adding the repo secret.

### The chain from those steps down to the SDK

- `npm run factory -- distill` → `pipeline/src/factory/cli.ts` → `cmd-distill.ts:runDistill()` →
  gate at `cmd-distill.ts:26-29`:
  ```ts
    if (!process.env.CURSOR_API_KEY) {
      writeFailureReason('CURSOR_API_KEY secret is not set')
      process.exit(1)
    }
  ```
  → folds issue comments into `ISSUE_BODY` → `runPipelineScript('src/resolve-issue.ts', ['--output', outPath, '--repo-root', root], {env})` → **`@cursor/sdk` import #2**.
- `npm run factory -- draft` → `cmd-draft.ts:runDraft()` → builds
  `[slug, '--overwrite', '--pause-on-scope']` (+ `--persona`, `--notes`) → `runPipelineScript('src/cli.ts', args)` (`cmd-draft.ts:30`) → `createRuntime` → **`@cursor/sdk` import #1**. Note `cmd-draft.ts` has **no** `CURSOR_API_KEY` gate of its own; it relies on `cli.ts:218`.

So the env var must survive one extra process hop in both paths (`runPipelineScript` passes
`opts?.env ?? process.env`, so plain inheritance works for a renamed var too).

---

## 7. mise config

`mise config ls` (run from inside the worktree) — full resolution chain, nearest last:

```
~/.config/mise/config.toml    aqua:speakeasy-api/speakeasy, atuin, bat, btop, chezmoi, claude, codex,
                              delta, dust, eza, fd, gemini-cli, github-cli, github:IxDay/psql,
                              github:agavra/tuicr, github:dalance/procs, github:speakeasy-api/openapi,
                              go, go:github.com/jorgerojas26/lazysql, go:golang.org/x/tools/gopls,
                              herdr, jq, k9s, lazydocker, lazygit, neovim, node,
                              npm:@mariozechner/pi-coding-agent, npm:@openai/codex,
                              npm:@tailwindcss/language-server, npm:@vtsls/language-server,
                              npm:playwright, npm:vscode-langservers-extracted, pitchfork, pnpm,
                              ripgrep, rust, starship, usage, yazi, zellij, zoxide
~/mise.toml                                              (none)
~/github.com/mise.toml                                   go, node
~/github.com/speakeasy-api/mcp-setup-docs/mise.toml      claude, go, node, pitchfork
~/github.com/speakeasy-api/mcp-setup-docs/mise.local.toml (none)
…/.claude/worktrees/sandcastle-factory/mise.toml         claude, go, node, pitchfork
```

### Files

- **Repo root** `/home/walker/github.com/speakeasy-api/mcp-setup-docs/mise.toml` — 55 lines, present.
- **Repo root** `mise.local.toml` — present, gitignored (467 bytes).
- **Worktree** `./mise.toml` — present, **byte-identical to the repo-root one** (diffed).
- **Worktree** `mise.local.toml` — **absent.** It is not needed: the worktree lives *inside* the repo,
  so mise walks up and picks up the repo-root `mise.local.toml` anyway (confirmed by `config ls` above,
  and by the env resolving correctly from the worktree cwd).
- No `.mise.toml` anywhere.

### Tools pinned in the repo `mise.toml`

```toml
[tools]
claude = "latest"
go = "1.22"
node = "24"
pitchfork = "latest"
```

**`pi` is NOT pinned in either repo `mise.toml`.** It comes from the **global** `~/.config/mise/config.toml`:

```toml
"npm:@mariozechner/pi-coding-agent" = "0.57.1"
```

⚠️ **Two findings here that matter for your plan:**

1. The pinned package is the **old scope** — `@mariozechner/pi-coding-agent`, not `@earendil-works/`.
2. It is pinned **globally on this machine only** — nothing in the repo declares it. CI has no `pi`
   at all. If the pipeline is going to shell out to `pi`, the pin needs to move into the repo
   `mise.toml` (for local reproducibility) *and* a global-install step needs adding to
   `guide-draft.yml` (for CI). Right now neither exists.

Also of note: global `[settings.npm] package_manager = "pnpm"` — mise installs npm-backed tools via
pnpm, which can matter if you pin a new npm tool.

### Env key NAMES in `mise.local.toml` (values withheld)

Single `[env]` section containing exactly four keys:

```
PULSE_REGISTRY_TENANT
PULSE_REGISTRY_KEY
CURSOR_API_KEY
OPENROUTER_API_KEY
```

### `OPENROUTER_API_KEY` resolution

```
$ mise exec -- bash -c 'echo ${#OPENROUTER_API_KEY}'
73
```

**It resolves. Length: 73 characters.** (For comparison, `CURSOR_API_KEY` resolves at 69 characters —
both are live from the worktree cwd.) The key you need for the OpenRouter port is already in place
locally; only the **CI secret** would be new.

---

## 8. `pi` on PATH

```
$ which pi
/home/walker/.local/share/mise/installs/npm-mariozechner-pi-coding-agent/0.57.1/bin/pi

$ pi --version
0.57.1

$ mise which pi
/home/walker/.local/share/mise/installs/npm-mariozechner-pi-coding-agent/0.57.1/bin/pi
```

`pi` **is** on PATH, shimmed by mise, at **0.57.1** from the **`@mariozechner`** scope.

### `@earendil-works/pi-coding-agent` availability

- **Not installed anywhere on this machine.** Only `npm-mariozechner-pi-coding-agent` exists under
  `~/.local/share/mise/installs/`. Global npm has only `corepack` and `npm`
  (`/home/walker/.local/share/mise/installs/node/24.16.0/lib`). No `~/.npm-global`.
- **It does exist on the registry** — `npm view @earendil-works/pi-coding-agent version` → **`0.83.0`**
  (metadata query only; **nothing was installed**).
- Your own prior notes already flag this: `factory-v2-evidence/probe-pi.md:251` records that the
  `@earendil-works` scope starts at **0.74.0**, so there is no 0.57.x under the new name —
  0.57.1 → 0.83.0 is a real version jump, not a rename-in-place. `FACTORY-V2.md:299` and
  `FACTORY-V2-HANDOFF.md:67` say the same, and `FACTORY-V2.md:816` already contemplates adding
  `npm i -g @earendil-works/pi-coding-agent@<pinned>` to the workflow.

**Implication:** the `pi` you can exercise locally today (0.57.1, old scope) is **not** the one the
design targets (0.83.0, new scope). Flag surface and JSON output shape should be re-verified against
0.83.0 before you write the spawn wrapper against what `pi --help` says on this box.

---

## Summary — the actual blast radius

**8 files must change:**

1. `pipeline/package.json` — drop `@cursor/sdk` (leaves `ajv`, `ajv-formats`, `yaml`, `zod`; the spawn
   needs no new dep).
2. `pipeline/src/runtime.ts` (182 lines) — full rewrite behind the existing `Runtime` shape.
   Hard parts: `await using` disposal, the two-send remediation loop (`:104-118`) needing conversation
   continuity, `ModelSelection.params` effort encoding, `CursorAgentError.isRetryable`.
3. `pipeline/src/resolve-issue.ts` (322 lines) — `Agent.prompt` one-shot at `:260-268`; simplest port.
   Consider routing it through the new runtime instead of duplicating spawn logic.
4. `pipeline/src/cli.ts` (313 lines) — env names `:74-77`, key gate `:218-222`, `ModelSelection`
   construction `:251-267`, banner `:270`, run-record `runtime` string `:209`.
5. `pipeline/src/factory/cmd-distill.ts:26-29` — the third key gate.
6. `pipeline/src/workflow.ts:545` — one string (`runtime: 'cursor-sdk'`). Nothing else; `Runtime` is
   already a clean seam and `workflow.ts` never imports the SDK.
7. `.github/workflows/guide-draft.yml` — two `env:` blocks (`:88`, `:119`), plus a **new** global-install
   step for `pi` (no precedent in this repo).
8. `FACTORY.md:18,106` + `mise.toml:18,23` — docs/task descriptions. `doctrine/pipeline-lock.md:114,203`
   are prose examples worth refreshing; `doctrine/CHANGELOG.md` is history — leave it.

**Free:** `runtime` is excluded from `input_digest` by doctrine, so renaming it does not invalidate
lockfiles.

**Riskiest, and untested today:** `runtime.ts`'s remediation follow-up needs a *stateful* agent session
across two prompts. A naive `spawn`-per-prompt loses that. There is no existing test to catch the
regression — nothing in the 34-test suite touches `runtime.ts`, `cli.ts`, `resolve-issue.ts`, or
`workflow.ts`. Extract pure functions + inject the spawn (the `decidePreflight` idiom) and you can
cover it without adding a mocking library.
