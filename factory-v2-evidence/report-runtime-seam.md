# Seam map: `pipeline/src/runtime.ts` → consumers

Worktree: `/home/walker/github.com/speakeasy-api/mcp-setup-docs/.claude/worktrees/sandcastle-factory`
All paths below are relative to `pipeline/`.

## 0. Seam summary (read this first)

`runtime.ts` has exactly **two importers**:

| File | Line | Imports |
|---|---|---|
| `src/cli.ts` | 5 | `createRuntime` |
| `src/workflow.ts` | 30 | `withSchemaHint`, `type Runtime` |

Nothing under `src/factory/` imports `runtime.ts` (verified — `src/factory/` shells out to the
CLI via `run-pipeline.ts`; it never touches the runtime object).

`workflow.ts` destructures the whole surface once, at **`src/workflow.ts:407`**:

```ts
const { log, agent, parallel, pipeline, modelId } = rt
```

…so every call site below is a bare `agent(` / `parallel(` / `pipeline(` / `modelId(` / `log(`,
not `rt.agent(`. A grep for `rt.agent(` returns nothing — that is why the destructure line matters.

**Total consumer surface you must reproduce:**
- 6 `agent()` call sites
- 1 `parallel()` call site
- 1 `pipeline()` call site
- 4 `modelId()` call sites
- ~50 `log()` call sites (plain `(message: string) => void`, no contract beyond that)
- 4 `withSchemaHint()` call sites (all module-level, all in `workflow.ts`)

---

## 1. Every `agent(...)` call site

Six total, all in `src/workflow.ts`. Listed in file order.

### 1.1 `src/workflow.ts:711` — research-change judge

```ts
    const judgment = await agent(
      researchChangeJudgePrompt(g, before, afterResearch, afterMeta),
      {
        label: g.slug + ' research-change judge',
        phase: g.slug + ': research-judge',
        schema: ResearchChangeJudgment,
      }
    )
```

| field | value |
|---|---|
| `label` | `` `${slug} research-change judge` `` |
| `phase` | `` `${slug}: research-judge` `` |
| `schema` | `ResearchChangeJudgment` |
| `model` | **not passed** |
| `remediation` | **not passed** |

Null-handling (`src/workflow.ts:719-726`): a `null` return is a soft failure — treated as
"materially changed", pipeline continues.

### 1.2 `src/workflow.ts:998` — reviewer (inside `parallel`, per dimension)

```ts
        const report = await agent(reviewerPrompt(g, dim, round, prior), {
          label: g.slug + ' review:' + dim.role + ' r' + round,
          phase: g.slug + ': review',
          schema: Review,
          ...(dim.model ? { model: dim.model } : {}),
        })
```

| field | value |
|---|---|
| `label` | `` `${slug} review:${dim.role} r${round}` `` e.g. `asana review:fidelity r1` |
| `phase` | `` `${slug}: review` `` |
| `schema` | `Review` |
| `model` | **conditionally spread — but always absent in practice** (see §2) |
| `remediation` | not passed |

Null-handling (`src/workflow.ts:1016-1028`): a `null` report is converted into a synthetic
`blocker` finding ("The {role} reviewer returned no verdict this round.") so the round still
advances.

### 1.3 `src/workflow.ts:1113` — research phase

```ts
    const research = await agent(researchPrompt(g), {
      label: g.slug + ' research',
      phase: g.slug + ': research',
      schema: PhaseResult,
      remediation: (parsed) => {
        if (parsed.status === 'blocked') return null
        const missing = missingResearchOutputs(dir)
        if (missing.length === 0) return null
        log(
          '[' +
            g.slug +
            '] research reported ' +
            parsed.status +
            ' but missing ' +
            missing.join(', ') +
            '; requesting write remediation'
        )
        return researchWriteRemediationPrompt(g, missing)
      },
    })
```

| field | value |
|---|---|
| `label` | `` `${slug} research` `` |
| `phase` | `` `${slug}: research` `` |
| `schema` | `PhaseResult` |
| `model` | not passed |
| `remediation` | **yes — synchronous, returns `string \| null`** |

Null-handling (`src/workflow.ts:1133-1135`): `null` → `{status: 'failed', failed_phase: 'research'}`,
guide aborts.

### 1.4 `src/workflow.ts:1347` — draft phase

```ts
      const draft = await agent(draftPrompt(g), {
        label: g.slug + ' draft',
        phase: g.slug + ': draft',
        schema: PhaseResult,
        remediation: (parsed) => {
          if (parsed.status === 'blocked') return null
          const missing = missingDraftOutputs(dir)
          if (missing.length === 0) return null
          log(
            '[' +
              g.slug +
              '] draft reported ' +
              parsed.status +
              ' but missing ' +
              missing.join(', ') +
              '; requesting write remediation'
          )
          return draftWriteRemediationPrompt(g, missing)
        },
      })
```

| field | value |
|---|---|
| `label` | `` `${slug} draft` `` |
| `phase` | `` `${slug}: draft` `` |
| `schema` | `PhaseResult` (same singleton as research) |
| `model` | not passed |
| `remediation` | **yes — synchronous** |

Null-handling (`src/workflow.ts:1367-1375`): `null` → `{status: 'failed', failed_phase: 'draft'}`.

### 1.5 `src/workflow.ts:1493` — revision (per review round with blockers)

```ts
        const revision = await agent(
          revisionPrompt(g, round, blockers, nits),
          {
            label: g.slug + ' revise r' + round,
            phase: g.slug + ': revise',
            schema: RevisionResult,
            remediation: () => {
              // After draft, setup files must stay on disk. Revision agents
              // have claimed they exist while lint still saw ENOENT.
              const missing = missingResearchOutputs(dir).concat(
                missingDraftOutputs(dir)
              )
              if (missing.length === 0) return null
              log(
                '[' +
                  g.slug +
                  '] revise r' +
                  round +
                  ' missing ' +
                  missing.join(', ') +
                  '; requesting write remediation'
              )
              return reviseWriteRemediationPrompt(g, missing)
            },
          }
        )
```

| field | value |
|---|---|
| `label` | `` `${slug} revise r${round}` `` |
| `phase` | `` `${slug}: revise` `` |
| `schema` | `RevisionResult` |
| `model` | not passed |
| `remediation` | **yes — takes NO argument** (ignores `parsed`; pure on-disk check) |

Null-handling (`src/workflow.ts:1532-1536`): `null` is tolerated —
`entry.revision_notes = '(revision agent returned no report)'`, `disputed`/`skipped` default `[]`.

### 1.6 `src/workflow.ts:1596` — finalization salvage revision

```ts
            const salvage = await agent(
              revisionPrompt(g, round, fin.blockers, [], salvageNote),
              {
                label: g.slug + ' revise finalization',
                phase: g.slug + ': revise',
                schema: RevisionResult,
                remediation: () => {
                  const missing = missingResearchOutputs(dir).concat(
                    missingDraftOutputs(dir)
                  )
                  if (missing.length === 0) return null
                  return reviseWriteRemediationPrompt(g, missing)
                },
              }
            )
```

| field | value |
|---|---|
| `label` | `` `${slug} revise finalization` `` (no round suffix) |
| `phase` | `` `${slug}: revise` `` (same phase string as 1.5 — **phase is not unique per call**) |
| `schema` | `RevisionResult` |
| `model` | not passed |
| `remediation` | **yes — no argument, no logging** (silent variant of 1.5) |

Null-handling (`src/workflow.ts:1611-1615`): same tolerant pattern as 1.5.

### Distinct `phase` strings emitted

`{slug}: research-judge`, `{slug}: review`, `{slug}: research`, `{slug}: draft`, `{slug}: revise`.
Five values; `revise` is reused by two call sites. `phase` is consumed **only** by the runtime's own
`log()` line (`runtime.ts:84`) — nothing in `workflow.ts` reads it back. It is purely observability.

### `label` consumption

`label` is used for (a) log prefixes and (b) `Agent.create({ name: opts.label })` in the Cursor SDK.
The remediation path derives a second label as `opts.label + ' remediation'` (`runtime.ts:114`).

---

## 2. Which `AgentOptions` fields are actually exercised

| Field | Exercised? | Evidence |
|---|---|---|
| `label` | **Yes** — all 6 sites | required, always a distinct human string |
| `phase` | **Yes** — all 6 sites | required, but log-only (see above) |
| `schema` | **Yes** — all 6 sites | 4 distinct schemas across 6 sites |
| `model` | **Dead in practice** | see below |
| `remediation` | **Yes** — 4 of 6 sites | research, draft, revise, salvage |

### `model:` is dead — the full chain

Only one call site even mentions it: `src/workflow.ts:1002`, `...(dim.model ? { model: dim.model } : {})`.
`dim` comes from the `DIMENSIONS` constant at **`src/workflow.ts:378-381`**:

```ts
type Dimension = {
  role: ReviewDimension
  doc: string
  persona: boolean
  model?: 'sonnet'
}

/** Review gates only — voice/formatting/concision are Writer self-check. */
const DIMENSIONS: Dimension[] = [
  { role: 'fidelity', doc: 'fidelity.md', persona: false },
  { role: 'achievability', doc: 'review.md', persona: true },
]
```

Neither entry sets `model`. So:

- `dim.model` is **always `undefined`** → the conditional spread is always `{}` → `agent()` never
  receives a `model` key at any call site.
- `'sonnet'` is therefore **never passed**, and `resolveModel`'s `if (model === 'sonnet') return cfg.lightModel`
  branch (`runtime.ts:34`) is **unreachable**.
- The explicit-override branch (`runtime.ts:36-39`, arbitrary model id) is likewise unreachable
  from `workflow.ts`.
- `RuntimeConfig.lightModel` is dead weight from the consumer's perspective, even though the CLI
  still parses `--light-model` / `--light-effort` and passes it in.
- Corroborated on disk: all 64 `"model"` entries across every `guides/*/pipeline.lock.json`
  are `"gpt-5.6-sol"` — no `composer-2.5` anywhere.

**Practical consequence for the `pi` rewrite:** you need to keep `model?: string` in the type
signature so `workflow.ts` still compiles (line 1002 spreads it), but it never fires at runtime.
`modelId()` must still return *something* stable — that's the live half of the model contract (§5).

---

## 3. `withSchemaHint(...)` and the `SCHEMA_HINTS` mechanism

### Mechanism

```ts
const SCHEMA_HINTS = new WeakMap<AnyZod, string>()

/** Attach a JSON Schema (or example) shown to the model for structured reports. */
export function withSchemaHint<T extends AnyZod>(schema: T, hint: unknown): T {
  SCHEMA_HINTS.set(schema, JSON.stringify(hint, null, 2))
  return schema
}
```

A `WeakMap` keyed by the **zod schema object identity**, mapping to a pre-serialized string.
`withSchemaHint` returns the *same* object it was given (identity-preserving), so the four exported
schemas in `workflow.ts` are module-level singletons whose identity survives into `agent()`.

Consumed by `schemaInstruction(schema)` (`runtime.ts:55-69`), which appends this block to the prompt:

```
(blank line)
---
STRUCTURED REPORT (required):
When your file work is done, end your final message with ONLY a single JSON
object matching this schema. No markdown fences, no commentary before or
after the JSON. The orchestrator parses your final message as JSON.
(blank line)
<hint>
```

Fallback when a schema has no hint registered:
`'(see phase prompt for required keys; return a flat JSON object)'`.

`schemaInstruction` is applied **twice**: once to the initial prompt (`runtime.ts:82`) and again to
the remediation follow-up (`runtime.ts:109`).

### Call sites — 4 total, all module-level in `workflow.ts`

| # | Line | Schema | Used by |
|---|---|---|---|
| 1 | `src/workflow.ts:157` | `PhaseResult` | research (1.3), draft (1.4) |
| 2 | `src/workflow.ts:196` | `Review` | reviewer (1.2) |
| 3 | `src/workflow.ts:237` | `RevisionResult` | revise (1.5), salvage (1.6) |
| 4 | `src/workflow.ts:271` | `ResearchChangeJudgment` | research-change judge (1.1) |

`ReviewFinding` (`src/workflow.ts:186-194`) is a bare zod object with **no** hint — it is nested
inside `Review`'s hand-written JSON Schema instead.

### Shape and volume

The hints are **hand-written JSON Schema** (draft-style: `type`/`properties`/`required`/`enum`/
`additionalProperties: false`/`description`), *not* example objects. The `description` fields carry
real prompt-engineering prose (e.g. the "status ok is only valid after research.md and meta.yaml
exist on disk" rule), so they are load-bearing behavior, not decoration.

| Schema | Source lines (JS literal) | Serialized (`JSON.stringify(hint, null, 2)`) |
|---|---|---|
| `PhaseResult` | 19 (`:165-183`) | 29 lines / 762 chars |
| `Review` | 33 (`:202-234`) | 58 lines / 1250 chars |
| `RevisionResult` | 22 (`:246-267`) | 29 lines / 650 chars |
| `ResearchChangeJudgment` | 19 (`:275-293`) | 18 lines / 505 chars |
| **Total** | **93 source lines** | **134 lines / 3167 chars** |

So roughly **3.2 KB of hint JSON** total, of which the largest single injection is `Review` at ~1.25 KB.

### Two representative hints, quoted in full

**(a) `PhaseResult` — `src/workflow.ts:157-184`** (the most-used; drives both `research` and `draft`)

```ts
export const PhaseResult = withSchemaHint(
  z
    .object({
      status: z.enum(['ok', 'blocked']),
      notes: z.string(),
      open_questions: z.array(z.string()),
    })
    .strict(),
  {
    type: 'object',
    additionalProperties: false,
    required: ['status', 'notes', 'open_questions'],
    properties: {
      status: {
        type: 'string',
        enum: ['ok', 'blocked'],
        description:
          'ok = required artifacts written and complete enough to draft from; blocked = cannot produce them from public sources.',
      },
      notes: {
        type: 'string',
        description:
          'Decisions made, uncertainty, and (for research) the meta.yaml validation method used. For research, status "ok" is only valid after research.md and meta.yaml exist on disk in the guide directory.',
      },
      open_questions: { type: 'array', items: { type: 'string' } },
    },
  }
)
```

**(b) `Review` — `src/workflow.ts:186-235`** (the largest; note `ReviewFinding` is defined as a
separate zod schema but its hint is inlined here)

```ts
export const ReviewFinding = z
  .object({
    severity: z.enum(['blocker', 'nit']),
    target: z.enum(['external', 'speakeasy', 'research', 'meta']),
    where: z.string(),
    problem: z.string(),
    suggestion: z.string(),
  })
  .strict()

export const Review = withSchemaHint(
  z
    .object({
      pass: z.boolean(),
      findings: z.array(ReviewFinding),
    })
    .strict(),
  {
    type: 'object',
    additionalProperties: false,
    required: ['pass', 'findings'],
    properties: {
      pass: {
        type: 'boolean',
        description: 'True only with zero blocker findings.',
      },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['severity', 'target', 'where', 'problem', 'suggestion'],
          properties: {
            severity: { type: 'string', enum: ['blocker', 'nit'] },
            target: {
              type: 'string',
              enum: ['external', 'speakeasy', 'research', 'meta'],
            },
            where: {
              type: 'string',
              description: 'Anchor id, section, or quoted text.',
            },
            problem: { type: 'string', description: 'One factual sentence.' },
            suggestion: { type: 'string', description: 'A concrete fix.' },
          },
        },
      },
    },
  }
)
```

For completeness, the other two:

**`RevisionResult` — `src/workflow.ts:237-268`** — keys `notes` / `disputed[]` / `skipped[]`;
descriptions encode the "restate each with a one-line reason" protocol.

**`ResearchChangeJudgment` — `src/workflow.ts:271-294`** — keys `materially_changed` (bool) /
`notes`; the boolean's description carries the entire ignore-list ("False for wording-only,
ordering-only, or observed_at-only churn").

> **Rewrite note:** because the mechanism is keyed on object identity via `WeakMap`, any replacement
> must keep `withSchemaHint` exported from `runtime.ts` with the same identity-returning signature —
> `workflow.ts:30` imports it by name and calls it at module load, before any runtime exists.
> It is the one export that is *not* part of the `createRuntime` closure.

---

## 4. `parallel` and `pipeline` call sites

### Runtime implementations (both unbounded `Promise.all`)

```ts
  async function parallel<T>(thunks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(thunks.map((fn) => fn()))
  }

  async function pipeline<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>
  ): Promise<R[]> {
    // Guides own disjoint directories — safe to run concurrently (matches harness).
    return Promise.all(items.map((item) => fn(item)))
  }
```

**There is no concurrency cap.** Both are `Promise.all` fan-outs with zero throttling, zero
error isolation (a rejection propagates — though `agent()` swallows `CursorAgentError` into `null`,
so in practice only non-Cursor throws escape).

### `parallel` — 1 call site

**`src/workflow.ts:972`**, inside `reviewRound`:

```ts
    const results = await parallel(
      DIMENSIONS.map((dim) => async () => {
        ...
      })
    )
```

- **Over:** `DIMENSIONS` — exactly **2 items** (`fidelity`, `achievability`).
- **Implied concurrency:** 2 agents at once, per guide, per review round.
- Each thunk may short-circuit to `{ skipped: true, stepId }` via `canSkipStep` before spawning an
  agent, so actual in-flight count is 0–2.

### `pipeline` — 1 call site

**`src/workflow.ts:1731`**, the top-level fan-out at the end of `runWorkflow`:

```ts
  const results = (await pipeline(input.guides, draftOne)).filter(Boolean)
  return { persona: PERSONA, timestamp: NOW, results }
```

- **Over:** `input.guides` (`GuideInput[]`) — one entry per positional arg on the CLI.
- **Implied concurrency:** **N guides fully in parallel, unbounded.** Each `draftOne` internally
  runs research → (judge) → draft → up to `MAX_ROUNDS` review rounds, each round fanning out 2
  reviewers.
- **Worst-case simultaneous agents ≈ 2 × (number of guides).**
- The safety argument is the code comment at `runtime.ts:171`: guides own disjoint directories.
- In practice the factory (`src/factory/run-pipeline.ts`) invokes the CLI with a single guide, so
  N=1 is the common case; multi-guide is the documented `npm run draft-guide -- box hubspot` form.

---

## 5. `modelId(...)` — how model identity reaches `pipeline.lock.json`

### Runtime implementation

```ts
  function modelId(model?: string): string {
    return resolveModel(cfg, model).id
  }
```

Returns just the `.id` string — **effort params are deliberately excluded** from the lock digest.
`gpt-5.6-sol` at `effort=high` and `gpt-5.6-sol` at `effort=low` produce the *same* lock digest.

### 4 call sites — all feed `StepInputs.model`

| # | Line | Context | Argument |
|---|---|---|---|
| 1 | `src/workflow.ts:481` | `writeConvergedLock` → `buildResearchInputs` | `modelId()` — no arg |
| 2 | `src/workflow.ts:501` | `writeConvergedLock` → `buildDraftInputs` | `modelId()` — no arg |
| 3 | `src/workflow.ts:520` | `writeConvergedLock` → `buildReviewInputs` (per dim) | `modelId(dim.model)` — always `undefined` |
| 4 | `src/workflow.ts:977` | `reviewRound` skip-check → `buildReviewInputs` | `modelId(dim.model)` — always `undefined` |
| 5 | `src/workflow.ts:1322` | `draftOne` skip-check → `buildDraftInputs` | `modelId()` — no arg |

(Five occurrences of the token; call sites 3 and 4 are the two `modelId(dim.model)` forms. All five
resolve to `cfg.defaultModel.id`.)

Sites 1–3 **write** the lock; sites 4–5 **read-compare** against it. Both halves must agree or every
skip check breaks — this is the single most digest-sensitive thing in the seam.

### The code that writes it

`writeConvergedLock` (`src/workflow.ts:471-551`), abridged to the model path:

```ts
  function writeConvergedLock(
    g: GuideInput,
    completedAt: string,
    opts?: { researchNotes?: string }
  ): void {
    const dir = guideDir(g.slug)
    mkdirSync(dir, { recursive: true })
    const steps: Partial<Record<StepId, StepRecord>> = {}

    const researchInputs = buildResearchInputs({
      model: modelId(),                       // <-- site 1
      repoRoot: ROOT,
      provider: g.provider,
      // Prefer the notes actually sent to research (pre-refresh).
      notes: opts?.researchNotes ?? notesOf(g),
    })
    steps.research = makeStepRecord(
      researchInputs,
      [
        digestGuideFile(dir, 'research.md'),
        digestGuideFile(dir, 'meta.yaml'),
      ],
      completedAt
    )

    if (
      existsSync(join(dir, 'external.md')) &&
      existsSync(join(dir, 'speakeasy.md'))
    ) {
      const draftInputs = buildDraftInputs({
        model: modelId(),                     // <-- site 2
        repoRoot: ROOT,
        guideDir: dir,
        provider: g.provider,
        notes: notesOf(g),
        persona: PERSONA,
      })
      steps.draft = makeStepRecord(
        draftInputs,
        [
          digestGuideFile(dir, 'external.md'),
          digestGuideFile(dir, 'speakeasy.md'),
        ],
        completedAt
      )

      for (const dim of DIMENSIONS) {
        const stepId = ('review.' + dim.role) as StepId
        const reviewInputs = buildReviewInputs({
          model: modelId(dim.model),          // <-- site 3
          repoRoot: ROOT,
          guideDir: dir,
          provider: g.provider,
          notes: notesOf(g),
          persona: PERSONA,
          dimension: dim.role,
          roleDoc: dim.doc,
          withPersona: dim.persona,
        })
        steps[stepId] = makeStepRecord(
          reviewInputs,
          [
            digestGuideFile(dir, 'external.md'),
            digestGuideFile(dir, 'speakeasy.md'),
          ],
          completedAt
        )
      }
    }

    const lock: PipelineLock = {
      schema_version: 1,
      slug: g.slug,
      persona: PERSONA,
      runtime: 'cursor-sdk',                  // <-- hardcoded string, NOT from modelId
      updated_at: completedAt,
      steps,
    }
    writeLock(dir, lock)
    log('[' + g.slug + '] wrote ' + LOCK_FILENAME_REL)
  }
```

Called from two places: `src/workflow.ts:1461` (lock-only convergence) and `src/workflow.ts:1708`
(normal convergence).

### Where the string lands in the file

`buildResearchInputs` / `buildDraftInputs` / `buildReviewInputs` (`src/lock.ts:532-608`) all set
`model: opts.model` as the first key of `StepInputs`:

```ts
export type StepInputs = {
  model: string
  prompt_digest: string
  reading_list: PathDigest[]
  artifacts: PathDigest[]
  params: StepParams
}
```

`makeStepRecord` (`src/lock.ts:487-498`) then hashes the whole `StepInputs` into `input_digest` via
`inputDigest` → `digestBytes(canonicalize(inputs))`. **The model id is inside the digest**, so
changing it invalidates every skip.

Observed on disk (`guides/asana/pipeline.lock.json`):

```
runtime: cursor-sdk
persona: it-admin
 step research           -> inputs.model = "gpt-5.6-sol"
 step draft              -> inputs.model = "gpt-5.6-sol"
 step review.fidelity    -> inputs.model = "gpt-5.6-sol"
 step review.achievability -> inputs.model = "gpt-5.6-sol"
```

Across **all** lock files in the repo: 64 `"model"` entries, 100% `"gpt-5.6-sol"`.

### Two consequences for the `pi` rewrite

1. **`modelId()` must keep returning a bare id string** with no effort suffix, or you silently
   invalidate every existing `pipeline.lock.json` and force a full re-run of every guide.
2. `runtime: 'cursor-sdk'` is hardcoded in **two** places — `src/workflow.ts:545` and
   `src/cli.ts:209` (the run-record writer). Neither reads it from the runtime object, so a rename
   to `'pi'` is a `workflow.ts` edit — which is outside your stated seam. Either leave the string
   alone or accept that this one constant crosses the line. (`PipelineLock.runtime` is typed
   optional at `src/lock.ts:93` and is never read by any skip predicate, so leaving it as
   `'cursor-sdk'` is functionally harmless, just inaccurate.)

---

## 6. Where `createRuntime` is constructed

**Single construction site: `src/cli.ts:262-267`.**

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

…then handed to the workflow at `src/cli.ts:275`:

```ts
  const out = await runWorkflow(rt, {
    guides,
    persona: args.persona,
    timestamp: startedAt,
    repoRoot,
    maxRounds: args.maxRounds,
    force: args.force,
    pauseOnScope: args.pauseOnScope,
  })
```

### `apiKey` — where it comes from

`src/cli.ts:218-222`, env var only, hard-fails before anything else runs:

```ts
  const args = parseArgs(process.argv.slice(2))
  const apiKey = process.env.CURSOR_API_KEY?.trim()
  if (!apiKey) {
    console.error('CURSOR_API_KEY is required')
    process.exit(1)
  }
```

There is no config file, no keychain, no `.env` loading in this path.

### `defaultModel` / `lightModel` — where the values are defined

Neither is a constant nor a config file. Both are **CLI flags with env fallbacks and hardcoded
defaults**, defined inline in `parseArgs` at `src/cli.ts:74-77`:

```ts
  // Heavy slots (research / draft / fidelity / achievability / revision)
  // default to GPT-5.6 Sol at high effort; light model kept for optional overrides.
  let model = process.env.CURSOR_MODEL || 'gpt-5.6-sol'
  let lightModel = process.env.CURSOR_MODEL_LIGHT || 'composer-2.5'
  let effort = process.env.CURSOR_EFFORT || 'high'
  let lightEffort = process.env.CURSOR_EFFORT_LIGHT || ''
```

Overridden by flags at `src/cli.ts:111-126` (`--model`, `--light-model`, `--effort`, `--light-effort`).

Resolution precedence, per knob: **CLI flag > env var > hardcoded literal.**

| Knob | Flag | Env | Default |
|---|---|---|---|
| heavy model | `--model` | `CURSOR_MODEL` | `gpt-5.6-sol` |
| light model | `--light-model` | `CURSOR_MODEL_LIGHT` | `composer-2.5` |
| heavy effort | `--effort` | `CURSOR_EFFORT` | `high` |
| light effort | `--light-effort` | `CURSOR_EFFORT_LIGHT` | `''` (omit the param entirely — Composer has no effort knob) |

The shape `{ id, params?: [{ id: 'effort', value }] }` is `ModelSelection` from `@cursor/sdk` — the
only `@cursor/sdk` type that leaks into `RuntimeConfig`. Replacing it with a plain
`{ id: string; effort?: string }` is a `cli.ts`-only change (workflow.ts never touches
`ModelSelection`).

Relevant help text, `src/cli.ts:25-30` and `:38-43`:

```
  --model <id>       Default Cursor model id (default: gpt-5.6-sol)
  --light-model <id> Model for "sonnet" slots (default: composer-2.5)
  --effort <level>   Reasoning effort for heavy slots (default: high)
  --light-effort <level>
                     Reasoning effort for light slots (default: none /
                     omit param — Composer has no effort knob)
...
Env:
  CURSOR_API_KEY     Required (user or team service-account key)
  CURSOR_MODEL       Fallback for --model
  CURSOR_MODEL_LIGHT Fallback for --light-model
  CURSOR_EFFORT      Fallback for --effort
  CURSOR_EFFORT_LIGHT Fallback for --light-effort
```

---

## 7. `pipeline/src/json.ts` in full (28 lines)

```ts
/** Pull a JSON object out of agent final text (raw or fenced). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('empty agent result')

  try {
    return JSON.parse(trimmed)
  } catch {
    // continue
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }

  throw new Error('could not parse JSON from agent result')
}
```

Three fallbacks in order: raw parse → first fenced block → outermost `{`…`}` slice. Throws on
empty input and on total failure; `waitAndParse` catches and logs the first 500 chars
(`runtime.ts:147-153`). This file has **no `@cursor/sdk` dependency** and carries over unchanged.

---

## 8. The remediation contract

### Type

```ts
  /**
   * After a successful parse, return a follow-up prompt to send once on the
   * same agent (keeps conversation context), or null/undefined to accept.
   * Used when the model reports ok without finishing required file work.
   */
  remediation?: (
    parsed: z.infer<S>
  ) => string | null | undefined | Promise<string | null | undefined>
```

### Runtime driver (`runtime.ts:101-120`)

```ts
      let parsed = await waitAndParse(run, opts)
      if (!parsed) return null

      if (opts.remediation) {
        const followUp = await opts.remediation(parsed)
        if (followUp) {
          log(`[${opts.label}] sending remediation follow-up`)
          const remRun = await agentHandle.send(
            followUp + schemaInstruction(opts.schema)
          )
          log(`[${opts.label}] remediation run=${remRun.id}`)
          const remediated = await waitAndParse(remRun, {
            ...opts,
            label: opts.label + ' remediation',
          })
          if (remediated) parsed = remediated
        }
      }

      return parsed
```

**Contract invariants your `pi` implementation must preserve:**

1. Fires **only after a successful parse** — never on `null` from `waitAndParse`.
2. Fires **at most once**. No loop, no retry-until-clean.
3. Follow-up is sent **on the same agent handle** (`agentHandle.send`) — conversation context is
   retained. This is the load-bearing bit: every remediation prompt says "use the research you
   already gathered in this conversation" / "use work already done in this conversation". A `pi`
   implementation that spawns a fresh process for the follow-up will make the agent redo the work
   from scratch, which was the original failure mode.
4. `schemaInstruction(opts.schema)` is re-appended to the follow-up.
5. Failure is **soft**: if the remediation run fails to parse, the *original* `parsed` is returned.
   The workflow never sees "remediation happened" in the return value — it re-checks disk itself
   (`workflow.ts:1147`, `:1388`, `:1519`).
6. The callback is `await`ed, so a `Promise`-returning callback is legal — **none of the four
   in-tree callbacks are async.** Two take `parsed`, two take no argument at all.

### All four callback bodies, quoted in full

**(1) research — `src/workflow.ts:1117-1131`**

```ts
      remediation: (parsed) => {
        if (parsed.status === 'blocked') return null
        const missing = missingResearchOutputs(dir)
        if (missing.length === 0) return null
        log(
          '[' +
            g.slug +
            '] research reported ' +
            parsed.status +
            ' but missing ' +
            missing.join(', ') +
            '; requesting write remediation'
        )
        return researchWriteRemediationPrompt(g, missing)
      },
```

**(2) draft — `src/workflow.ts:1351-1365`**

```ts
        remediation: (parsed) => {
          if (parsed.status === 'blocked') return null
          const missing = missingDraftOutputs(dir)
          if (missing.length === 0) return null
          log(
            '[' +
              g.slug +
              '] draft reported ' +
              parsed.status +
              ' but missing ' +
              missing.join(', ') +
              '; requesting write remediation'
          )
          return draftWriteRemediationPrompt(g, missing)
        },
```

**(3) revise — `src/workflow.ts:1499-1516`**

```ts
            remediation: () => {
              // After draft, setup files must stay on disk. Revision agents
              // have claimed they exist while lint still saw ENOENT.
              const missing = missingResearchOutputs(dir).concat(
                missingDraftOutputs(dir)
              )
              if (missing.length === 0) return null
              log(
                '[' +
                  g.slug +
                  '] revise r' +
                  round +
                  ' missing ' +
                  missing.join(', ') +
                  '; requesting write remediation'
              )
              return reviseWriteRemediationPrompt(g, missing)
            },
```

**(4) finalization salvage — `src/workflow.ts:1602-1608`**

```ts
                remediation: () => {
                  const missing = missingResearchOutputs(dir).concat(
                    missingDraftOutputs(dir)
                  )
                  if (missing.length === 0) return null
                  return reviseWriteRemediationPrompt(g, missing)
                },
```

Every one is the same shape: **check disk, return a prompt naming the missing files, or `null`.**
`parsed` is consulted only to short-circuit on `status: 'blocked'` (callbacks 1 and 2) — the
`RevisionResult` schema has no status field, so callbacks 3 and 4 don't need the argument at all.

### The `missing*Outputs` helpers — `src/lock.ts:18-45`

```ts
/** Guide-relative research outputs compared for "unchanged". */
export const RESEARCH_OUTPUT_FILES = ['research.md', 'meta.yaml'] as const

/** Guide-relative Writer outputs required after a successful draft. */
export const DRAFT_OUTPUT_FILES = ['external.md', 'speakeasy.md'] as const

export type ResearchSnapshot = {
  'research.md'?: string
  'meta.yaml'?: string
}

/** Guide-relative files from `files` that are not present on disk. */
export function missingGuideFiles(
  guideDir: string,
  files: readonly string[]
): string[] {
  return files.filter((name) => !existsSync(join(guideDir, name)))
}

/** Guide-relative research outputs that are not present on disk. */
export function missingResearchOutputs(guideDir: string): string[] {
  return missingGuideFiles(guideDir, RESEARCH_OUTPUT_FILES)
}

/** Guide-relative draft outputs that are not present on disk. */
export function missingDraftOutputs(guideDir: string): string[] {
  return missingGuideFiles(guideDir, DRAFT_OUTPUT_FILES)
}
```

Pure `existsSync` checks — **presence only, no content inspection, no size check**. An empty
`research.md` counts as present. Return value is an array of guide-relative filenames, which the
prompt builders join into the "these required files are still missing" list.

`missingDraftOutputs` has a second, unrelated consumer: `buildDraftInputs` (`src/lock.ts:558`) uses
`missingDraftOutputs(opts.guideDir).length === 0` to pick the revise-in-place vs write-fresh prompt
digest template — so the same helper feeds both the remediation contract and the lock digest.
`draftPrompt` (`src/workflow.ts:766`) uses it identically to pick prompt wording. These three must
stay in sync or lock skips break.

---

## 9. Consolidated checklist for the `pi` rewrite

The exact surface `workflow.ts:407` destructures, and what each must guarantee:

| Export | Signature | Must preserve |
|---|---|---|
| `log` | `(message: string) => void` | stderr, timestamped; ~50 call sites, no return value read |
| `agent` | `<S>(prompt, opts) => Promise<z.infer<S> \| null>` | `null` on *any* failure (never throw for model/API errors); schema-validated object otherwise |
| `parallel` | `<T>(thunks: Array<() => Promise<T>>) => Promise<T[]>` | order-preserving; 1 call site, 2 items |
| `pipeline` | `<T,R>(items: T[], fn) => Promise<R[]>` | order-preserving; 1 call site, N guides |
| `modelId` | `(model?: string) => string` | bare id, **no effort suffix** — digest-critical |
| `withSchemaHint` | `<T>(schema: T, hint: unknown) => T` | **module-level export, outside the closure**; identity-returning |
| `type Runtime` | `ReturnType<typeof createRuntime>` | the type `workflow.ts:30` imports |

Things `workflow.ts` does **not** care about and you are free to change:
`ModelSelection`, `lightModel`, the `'sonnet'` branch, the explicit-model-override branch,
`CursorAgentError` handling specifics, `AgentOptions.model` at runtime (the type must stay for
compilation, the behavior is dead), `run.id` / `agentHandle.agentId` in logs, and
`local: { cwd, settingSources: [] }`.

The one string that crosses your seam boundary: `runtime: 'cursor-sdk'`, hardcoded at
`src/workflow.ts:545` and `src/cli.ts:209`. Not read by any predicate — safe to leave stale.
