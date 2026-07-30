# Guide draft factory — pipeline map

Repo: `mcp-setup-docs`, worktree `sandcastle-factory`. Two layers:

| Layer | Code | Job |
|---|---|---|
| **Drafting pipeline** | `pipeline/src/{cli,workflow,runtime,lock,lint-guide,scope-gate,pulse-catalog,findings,json,paths}.ts` (~3.9k LOC) | issue-free: slug → guide bundle on disk + run record + exit code |
| **Factory** | `pipeline/src/factory/*.ts` (~1.7k LOC) + `.github/workflows/guide-draft.yml` | label → distill → invoke pipeline → commit/push/PR/comment |

The boundary is an **exit code + a JSON run record**. Agents never touch git; `factory/cmd-git.ts` does.

---

## 1. Control-flow map of `runWorkflow()`

Entry `cli.ts:275` → `workflow.ts:396`. Fan-out over guides at `workflow.ts:1731` (`pipeline()` = `Promise.all`, `runtime.ts:167`). Everything below is per-guide inside `draftOne` (`workflow.ts:1058`).

```
draftOne(raw)
├─ P0  mkdir guides/<slug>/                                  workflow.ts:1059
├─ P1  Pulse catalog lookup (HTTP, no LLM)                   workflow.ts:1062 → pulse-catalog.ts:131
│      readGuideAddServerHints(meta.yaml)                    workflow.ts:1066 / :93
│      resolveAddServerPath{tenanted|forced|present|absent}  pulse-catalog.ts:260
│      applyCatalogNotes → catalogPromptNote + lockNotes     workflow.ts:1102 / :141
├─ P2  readLock, snapshotResearchOutputs, snapshotSetupFiles workflow.ts:1106-1110
├─ P3  ▶ AGENT research (+in-conversation write remediation) workflow.ts:1113-1132
│      ✗ null report            → status failed/research     workflow.ts:1133  → exit 2
│      ✗ status "blocked"       → status blocked/research    workflow.ts:1136  → exit 2
│      ✗ files still missing    → status failed/research     workflow.ts:1147  → exit 2
├─ P4  re-read meta hints (research may set tenanted)        workflow.ts:1169-1198
│      ensureMetaAlias(catalog match name)                   workflow.ts:1200 / :55
├─ P5  decideResearchUnchanged                               workflow.ts:1219 → :664
│      --force            → {none,false}                     workflow.ts:671
│      no prior snapshot  → {none,false}                     workflow.ts:678
│      digests == snapshot→ {digest,true}                    workflow.ts:685
│      digests == lock    → {digest,true}                    workflow.ts:695
│      else ▶ AGENT research-change judge                    workflow.ts:711
│        no verdict            → {judge,false}               workflow.ts:719
│        !material & notes ≠ lock → {judge,false}            workflow.ts:731
│        !material & notes = lock → {judge,true,rebaseline}  workflow.ts:750
│        material              → {judge,false}               workflow.ts:757
│      notes guard / rebaseline of in-memory lock            workflow.ts:1237-1260
├─ P6  scope gate (only when --pause-on-scope)               workflow.ts:1272-1317
│      OQs = report ∪ "## Open questions" in research.md     scope-gate.ts:60,77
│      evaluateScopeGate(material vs soft, Decision N)       scope-gate.ts:129
│      ⇒ pause  → status awaiting_scope                      workflow.ts:1298  → exit 3
├─ P7  canSkipStep('draft')                                  workflow.ts:1329 → lock.ts:467
├─ P8  ▶ AGENT draft/Writer (+write remediation)             workflow.ts:1347-1366
│      ✗ null / blocked / missing files → failed|blocked     workflow.ts:1367,1376,1388 → exit 2
│      measureSetupChurn(before→after)                       workflow.ts:1413
├─ P9  reviewInvalidated = !researchUnchanged || draftRan    workflow.ts:1422
└─ P10 for round = 1..MAX_ROUNDS (default 3)                 workflow.ts:1426
       allowSkip = round==1 && !invalidated && prior==null   workflow.ts:1427
       reviewRound()                                         workflow.ts:1437 → :960
         parallel over DIMENSIONS                            workflow.ts:972
           per-dim canSkipStep('review.<dim>')               workflow.ts:988
           ▶ AGENT review:fidelity | review:achievability    workflow.ts:998
           null report ⇒ synthetic blocker "(pipeline)"      workflow.ts:1016
         lintGuide() deterministic, every round, never skipped  workflow.ts:1035
       ⇒ EARLY EXIT: round 1 && draft skipped && all dims skipped
                     && 0 blockers && 0 nits → converged, rounds:0  workflow.ts:1448-1473
       if blockers > 0:
         ▶ AGENT revise (blockers + nits, +write remediation) workflow.ts:1493
         prior = {blockers, nits, revision_notes, disputed, skipped_nits}  :1540
         if round < MAX_ROUNDS → continue                     workflow.ts:1549
         ── last round only ──
         reviewRound() "finalization" (allowSkip:false)       workflow.ts:1565
         if fin.blockers > 0:
            shouldSalvageFinalization(all blockers are        findings.ts:31
              fidelity ∧ target ∈ {external,speakeasy})?
              yes → ▶ AGENT revise "finalization salvage"     workflow.ts:1596
                    reviewRound() recheck                     workflow.ts:1627
                    recheck.blockers > 0 → unconverged        workflow.ts:1650 → exit 2
                    else fall through to converged
              no  → unconverged                               workflow.ts:1674 → exit 2
       blockers == 0 ⇒ converged: writeConvergedLock, nits→checklist  workflow.ts:1693-1719
```

**Convergence criterion:** zero `severity:"blocker"` findings across `review.fidelity` + `review.achievability` + deterministic `lint` in a single round (`workflow.ts:1052`, `1483`). Nits never block; they land on the human checklist (`workflow.ts:1697`). `pass` in the `Review` schema is decorative — the workflow counts blockers, it never reads `pass`.

**Loop shape gotcha:** the `for` never falls through. Rounds `< MAX_ROUNDS` with blockers `continue`; the last round always returns. So the terminal `status:'failed', failed_phase:'review'` at `workflow.ts:1722` is **dead code**.

**Effective max agent calls per guide:** research (+1 remediation) + judge + draft (+1) + 2×(rounds) reviewers + rounds revises + finalization 2 + salvage 1 + recheck 2 ≈ 18 worst case.

### Outcome codes

| Status (`GuideResult.status`, `workflow.ts:343`) | Where | CLI exit | Factory outcome (`factory/draft-outcome.ts:20`) |
|---|---|---|---|
| `converged` | `workflow.ts:1462`, `1709` | **0** | `converged` → ready-for-review PR |
| `awaiting_scope` | `workflow.ts:1298` | **3** | `awaiting_scope` (asserts `research.md` exists, else hard-fail exit 1) → draft PR + `guide:blocked` |
| `unconverged` | `workflow.ts:1650`, `1674` | **2** | `unconverged` (asserts `guides/<slug>/` exists) → draft PR |
| `blocked` (agent said blocked) | `workflow.ts:1137`, `1377` | **2** | same bucket as unconverged |
| `failed` (null report / missing files) | `workflow.ts:1134`, `1156`, `1368`, `1397` | **2** | same bucket |
| exception / no `CURSOR_API_KEY` / bad persona / bad slug / exists-without-`--overwrite` | `cli.ts:219,226,236,240,310` | **1** | hard failure → `mark-blocked`, no PR |
| usage error | `cli.ts:52` | 64 | bootstrap fallback |

Exit selection: `cli.ts:300-307` — `awaiting_scope` wins over everything, then `failed|blocked|unconverged` → 2.

Factory-side early exits, before any of this: `preflight` refuses a non-factory collaborator PR closing the same issue (`factory/preflight.ts:44-68`), and distill `needs_clarification` exits 1 → `guide:blocked` (`factory/cmd-distill.ts:81-98`).

---

## 2. LLM agent inventory

All calls go through `runtime.agent()` (`runtime.ts:77`) except distill. Model for every workflow slot is the **default** (`gpt-5.6-sol`, `effort=high`, `cli.ts:74,77`) — see the dead light-model note below.

| # | Label / phase | Call site | Model | Zod schema | Reads (numbered reading list + inputs) | Writes (via Cursor file tools) |
|---|---|---|---|---|---|---|
| 1 | `resolve-issue` (distill) | `resolve-issue.ts:260` (`Agent.prompt`) | light `composer-2.5` | `ResolvedSchema` = `OkSchema \| ClarificationSchema` `resolve-issue.ts:16-30` | issue title+body (+comments folded in by `factory/cmd-distill.ts:37-49`), `guides/*` dir listing, `doctrine/personas/*` listing `resolve-issue.ts:73-89` | **nothing** — JSON to `--output` (runner temp) |
| 2 | `<slug> research` / `<slug>: research` | `workflow.ts:1113` | default | `PhaseResult` `workflow.ts:157` | `doctrine/glossary.md`, `doctrine/shared.md`, `doctrine/roles/technical-research.md` (`readingList` `workflow.ts:383,574`); assignment block (slug, provider, guide dir, persona path, `observed_at`, operator notes + catalog note) `workflow.ts:553`; prior `research.md`/`meta.yaml` when resuming `workflow.ts:578` | **`guides/<slug>/research.md`, `guides/<slug>/meta.yaml`** (explicitly forbidden from setup files, `workflow.ts:591`) |
| 2r | `… remediation` (same conversation) | `runtime.ts:109` via `workflow.ts:1117` | default | `PhaseResult` | prompt `workflow.ts:603` — lists missing files | same two files |
| 3 | `<slug> research-change judge` / `: research-judge` | `workflow.ts:711` | default | `ResearchChangeJudgment` `workflow.ts:271` | same reading list as research; BEFORE/AFTER `research.md` + `meta.yaml` **inlined into the prompt** `workflow.ts:651-658` | **nothing** |
| 4 | `<slug> draft` / `: draft` | `workflow.ts:1347` | default | `PhaseResult` | glossary, shared, `doctrine/roles/writer.md`, `doctrine/personas/<persona>.md` `workflow.ts:790`; guide's `research.md` + `meta.yaml` (read by the agent itself) | **`guides/<slug>/external.md`, `guides/<slug>/speakeasy.md`** (revise-in-place variant when both exist, `workflow.ts:766-784`) |
| 4r | `… remediation` | `workflow.ts:1351` → prompt `:802` | default | `PhaseResult` | missing-file list | same two files |
| 5 | `<slug> review:fidelity rN` / `: review` | `workflow.ts:998`, dim `workflow.ts:379` | default | `Review` `workflow.ts:196` | glossary, shared, `doctrine/roles/fidelity.md` (**no persona**) `workflow.ts:857`; all four guide files; prior-round JSON `workflow.ts:880` | **nothing** ("You never edit files", `workflow.ts:870`) |
| 6 | `<slug> review:achievability rN` / `: review` | `workflow.ts:998`, dim `workflow.ts:380` | default | `Review` | glossary, shared, `doctrine/roles/review.md`, **+ persona**; all four guide files; prior-round JSON | **nothing** |
| — | *lint* (not an agent) | `workflow.ts:1035` → `lint-guide.ts:487` | — | `LintFinding[]` `lint-guide.ts:19` | `external.md`, `speakeasy.md`, `meta.yaml`, `research.md`, `schema/guide.v1.schema.json` | nothing |
| 7 | `<slug> revise rN` / `: revise` | `workflow.ts:1493` | default | `RevisionResult` `workflow.ts:237` | glossary, shared, `doctrine/roles/technical-research.md`, `doctrine/roles/writer.md`, persona `workflow.ts:903`; blocker JSON + nit JSON inlined `workflow.ts:924,936` | **any of the four**: `research.md`, `meta.yaml`, `external.md`, `speakeasy.md` |
| 7r | `… remediation` | `workflow.ts:1499` → prompt `:824` | default | `RevisionResult` | missing-file list | same four |
| 8 | `<slug> revise finalization` / `: revise` | `workflow.ts:1596` | default | `RevisionResult` | same as #7 + salvage note `workflow.ts:1590`; **blockers only, nits deliberately excluded** `workflow.ts:1597` | same four |

**Files the pipeline produces per guide:** `research.md`, `meta.yaml` (research/revise) · `external.md`, `speakeasy.md` (draft/revise) · `pipeline.lock.json` (orchestrator, `workflow.ts:549`, converge only) · `retro/runs/<started_at>-<slug>.json` (orchestrator, `cli.ts:190`).

**How writes actually happen:** the Cursor agent edits files directly with `cwd = repoRoot` (`runtime.ts:92`). The orchestrator never receives file content from the model — it only checks existence afterwards (`missingResearchOutputs`/`missingDraftOutputs`, `lock.ts:38,43`) and then lints. There is **no sandbox**: nothing prevents an agent writing outside `guides/<slug>/` except prompt text (`workflow.ts:592`, `doctrine/shared.md:67-70`). The only real containment is at commit time — `factory/cmd-git.ts:69-78` stages exactly `guides/<slug>/` and `retro/runs/*-<slug>.json`, so stray writes are silently discarded rather than blocked.

**Dead model slot:** `Dimension.model?: 'sonnet'` (`workflow.ts:375`) is never set in `DIMENSIONS` (`workflow.ts:378-381`), so `lightModel` / `--light-model` / `CURSOR_MODEL_LIGHT` is unreachable from `runWorkflow`. Only distill uses the light model. `resolveModel`'s `'sonnet'` branch (`runtime.ts:34`) is live only through that unused path.

**Reading-list drift:** the research *prompt* lists glossary + shared + `technical-research.md` (`workflow.ts:574`), but the research *lock digest* also fingerprints `doctrine/speakeasy-setup.md` (`lock.ts:500-507`). The agent reaches that file only because the role doc points at it (`doctrine/roles/technical-research.md:93`). Editing `speakeasy-setup.md` therefore busts the lock without changing the prompt — correct outcome, accidental mechanism.

---

## 3. `@cursor/sdk` coupling

**Import sites — exactly two:**

- `pipeline/src/runtime.ts:1` — `import { Agent, CursorAgentError, type ModelSelection } from '@cursor/sdk'`
- `pipeline/src/resolve-issue.ts:9` — `import { Agent, CursorAgentError }`
- dependency pin: `pipeline/package.json:17` `"@cursor/sdk": "^1.0.24"` (platform-specific binaries, `package-lock.json:82-86` — it ships a native agent binary per platform)

**Capabilities depended on:**

| Capability | Where | Notes for a replacement |
|---|---|---|
| `Agent.create({apiKey, model, name, local})` returning a disposable handle | `runtime.ts:87-96` | uses `await using` / `Symbol.asyncDispose` — handle lifetime = one phase |
| `local.cwd = repoRoot` | `runtime.ts:92` | **the whole file-writing contract**: agents edit the repo in place |
| `local.settingSources: []` | `runtime.ts:94` | suppress ambient IDE/MCP config in headless CI. Replacement must have an equivalent "no ambient tools/config" switch |
| Implicit coding-agent toolset (read/write/edit files, fetch docs) | never configured | **Nothing is allowlisted or denied.** Web access for research is assumed and never declared |
| `handle.send(prompt)` → run object; `run.id`, `handle.agentId` | `runtime.ts:98-99` | logging only |
| `run.wait()` → `{status, result?, error?}` | `runtime.ts:136-145` | blocking; no streaming, no progress events, no token/cost accounting |
| **Second `send()` on the same handle = same conversation** | `runtime.ts:109-117` | this is the *remediation* mechanism — "you said ok but the file isn't there, finish it using work already in this conversation" (`workflow.ts:613`). Any replacement must preserve multi-turn continuation on a live session, not a fresh agent |
| `Agent.prompt(prompt, opts)` one-shot | `resolve-issue.ts:260` | distill only |
| `ModelSelection = {id, params:[{id:'effort', value}]}` | `runtime.ts:37-39`, `cli.ts:252-261` | model id + reasoning-effort param; `modelId()` (`runtime.ts:175`) feeds the **lock digest**, so model identity is part of the cache key |
| `CursorAgentError` + `.isRetryable` | `runtime.ts:122-128`, `resolve-issue.ts:279` | logged and **swallowed** — `isRetryable` is printed, never acted on |
| Final assistant message as a plain string | `runtime.ts:145` | no native structured output; hence `schemaInstruction()` (`runtime.ts:55`) + `extractJson()` (`json.ts:2`) + `safeParse` |

**Notably not used, and therefore not implemented anywhere:** retries (a transient failure = `null` = phase failure = exit 2), timeouts, cancellation, streaming, cost/token accounting, tool allowlists, per-agent sandboxing, session persistence/replay, sub-agents.

---

## 4. What `pipeline.lock.json` does

Normative doc `doctrine/pipeline-lock.md`; schema `schema/pipeline-lock.v1.schema.json`; implementation `lock.ts`.

**Shape** (`lock.ts:89`, schema `:166-195`): `{schema_version:1, slug, persona, runtime:"cursor-sdk", updated_at, steps}` where `steps ∈ {research, draft, review.fidelity, review.achievability}` (+ legacy `review.{voice,formatting,concision}` tolerated, `lock.ts:51-55`).

**What each step digests** (`StepInputs`, `lock.ts:74`):

1. `model` — resolved id, never a slot alias (`lock.ts:540` etc., doc `pipeline-lock.md:111`)
2. `prompt_digest` — sha256 of a **hand-maintained copy** of the prompt template with volatile fields stripped (`PROMPT_TEMPLATES`, `lock.ts:101-158`). This is *not* the string actually sent; it's a parallel abstraction that must be kept in sync by hand.
3. `reading_list` — repo-relative doctrine/persona paths + byte digests (`lock.ts:500-530`)
4. `artifacts` — guide-relative upstream files + **stable** digests (`lock.ts:563`, `595`)
5. `params` — `provider`, `notes` (= operator notes **+ stable catalog token**, `workflow.ts:413`), `persona`, `dimension`

`input_digest = sha256(canonicalJSON(inputs))` — sorted keys, nulls dropped, arrays ordered (`lock.ts:206-233`, doc `:78-91`).

**Stable digests** (`lock.ts:240-251`) — the domain-critical part:
- `meta.yaml`: parse YAML → recursively drop every `observed_at` → canonicalize → hash
- `research.md`: replace frontmatter `researched_at` and every ISO-8601-Z token with sentinels (`lock.ts:171-187`); bare calendar dates survive
- `external.md`/`speakeasy.md`/doctrine: raw bytes

Without that normalization every research refresh would bump every digest and nothing would ever skip.

**What it lets you skip** (`canSkipStep`, `lock.ts:467`): `draft` and each `review.<dim>` — never `research` (always runs, doc `:117`), never `revise` (doc `:43`), never `lint`. All of: not `--force`, not invalidated this run, (for draft) `researchUnchanged === true`, lock present & v1 & slug matches, recomputed `input_digest` matches, stored `inputs` re-hash to their own `input_digest`, and every recorded output still exists on disk with a matching stable digest.

Invalidation (`workflow.ts:1337,1422,1427`): research changed → no draft/review skip; draft ran → no review skip; any revise ran → no skip in later rounds (`allowSkip` is round-1-only).

**`research_unchanged`** — the three-tier ladder (digest fast path → LLM judge → notes guard) is fully described at `workflow.ts:664-762` and doc `pipeline-lock.md:117-145`. The subtle bit: when the judge says "not material" and notes match, AFTER stays on disk and the *in-memory* lock is **rebaselined** (`rebaselineLockResearchArtifacts`, `lock.ts:389`) so downstream skips still fire — soft research improvements are kept without forcing a setup rewrite.

**Write policy:** `writeConvergedLock` (`workflow.ts:471`) runs **only on converge** (`:1461`, `:1708`). `awaiting_scope`, `unconverged`, `blocked`, `failed` leave the previous lock untouched. Its `research` record deliberately stores the notes actually sent pre-refresh (`researchLockNotes`, `workflow.ts:1104,1461`).

**Resume has two independent layers:**

1. **Git-level (factory).** `preflight` finds an open factory PR whose head is `guide/issue-<N>-*` and whose body `Closes #N`, else a lone orphan remote branch, else newest by committer date (`factory/preflight.ts:44-96`); `checkout-resume` fetches it and merges `main` (`factory/cmd-git.ts:35-42`). Result: prior `research.md`/`meta.yaml`/`external.md`/`speakeasy.md`/`pipeline.lock.json` are on disk before the pipeline starts.
2. **Lock-level (pipeline).** With those files present, research revises in place (`workflow.ts:578`), the digest/judge ladder decides `researchUnchanged`, and draft/review skip when inputs match. Full-skip converge with `rounds:0` at `workflow.ts:1448`.

Resume is therefore **not** a checkpoint/replay of the agent conversation — it's "prior artifacts on disk + content-addressed step skipping". There's no way to resume mid-round.

---

## 5. Essential domain logic vs. orchestration plumbing

### Essential — must survive any rewrite

| Area | Files / lines | Why it's domain |
|---|---|---|
| Guide grammar lint | `lint-guide.ts` (579) + `schema/guide.v1.schema.json` | I3/I4 enforced deterministically: frontmatter `setup_version:1`, single H1, forbidden H2s, H3 `{#anchor}` + screenshot rule, fixed Speakeasy anchors, single template key, anchor agreement across research/meta/setup. Zero LLM. Keep verbatim. |
| Doctrine corpus | `doctrine/**` (~900 lines of prose) | This *is* the product's judgment. Agnostic to framework. |
| Review dimension set + finding shape | `workflow.ts:186-235`, `370-381` | `{severity, target, where, problem, suggestion}` and exactly two LLM gates + lint. |
| Prompt builders | `workflow.ts:383-394, 553-601, 764-800, 844-956` (~300) | Reading-list ordering, the "status ok is invalid unless files exist" contract, revise-in-place vs blank-slate, disputed-findings protocol, cross-dimension conflict rule. Shrinks maybe 30% if a framework supplies role/subagent definitions, but the content stays. |
| Scope gate | `scope-gate.ts` (221) | Material-vs-soft OQ classification + `Decision N:` parsing. Crude (three regexes, `:24-32`) but it's product policy. |
| Finalization salvage predicate | `findings.ts` (33) | "all remaining blockers are dossier-backed render fixes ⇒ one more revise". Pure policy. |
| Catalog resolution | `pulse-catalog.ts:236-303` (~70) | Override precedence tenanted > forced > Pulse present/absent > dual-conditional. |
| Stable-digest normalization | `lock.ts:170-251` (~80) | `observed_at` / ISO-Z stripping. Domain knowledge no generic cache can infer. |
| Outcome taxonomy + exit codes | `workflow.ts:343-368`, `cli.ts:300-307`, `factory/draft-outcome.ts` | The pipeline↔factory contract. |
| Run-record schema | `cli.ts:190-214`, `retro/README.md` | Feeds `/tune-pipeline`; changing it breaks the retro loop. |

### Plumbing a real agent framework deletes

| Area | Where | Est. lines removed |
|---|---|---|
| Agent creation, model resolution, logging, `parallel`/`pipeline` wrappers | `runtime.ts:32-45, 71-99, 163-179` | **~110** |
| JSON extraction from prose | `json.ts` (28) + `runtime.ts:55-69, 145-160` | **~65** |
| Hand-mirrored JSON Schema hints duplicating the zod schemas | `workflow.ts:157-294` — ~100 of those 137 lines are a second copy of the same shape for `withSchemaHint` | **~100** |
| Write-remediation follow-ups (mechanism, not the postcondition) | `workflow.ts:603-622, 802-842` + 4 remediation closures | **~90** |
| Null-report / failed-phase branching, repeated 6× | `workflow.ts:1016-1028, 1133-1166, 1367-1409` | **~110** |
| Lock skip machinery minus digest rules | `lock.ts` (608 − ~80 domain) + `lock.test.ts` (338) + skip plumbing in `workflow.ts:1219-1260, 1321-1345, 975-996` | **~450 prod + 338 test** |
| CLI arg parsing / persona listing / overwrite prompt | `cli.ts:63-188` | **~120** |
| Factory GH glue that a framework with GH integration would own | `factory/{gh,git,env,github-output,failure-reason,labels}.ts` | **~250** |
| Dead / deprecated code | `lock.ts:341` `restoreResearchSnapshot` (unused), `lint-guide.ts:347` `lintSetupMarkdown` (unused alias), `workflow.ts:137` `guideHasTenantedRemote` (deprecated, unused), `scope-gate.ts:162` `formatScopeCheckComment` (superseded by `factory/format-scope-check.ts`), `workflow.ts:1722` unreachable, `runtime.ts:34` unreachable light-model branch | **~90** |

**Rough total: ~1,400 production lines + ~340 test lines of pure plumbing**, i.e. `workflow.ts` 1735 → ~700 of real policy, `runtime.ts` + `json.ts` → 0, `lock.ts` 608 → ~120 (digest rules + a cache-key builder).

### Candid notes on accidental complexity

- **`PROMPT_TEMPLATES` (`lock.ts:101-158`) is a hand-maintained shadow of the real prompts.** Nothing checks they agree. Edit `researchPrompt` without editing the template and the lock happily skips work whose prompt changed. A framework with content-addressed step caching should hash the *actual* rendered prompt minus declared-volatile fields.
- **Two separate "notes" concepts, three accessors** (`notesOf`/`promptNotesOf`/`operatorNotesOf`, `workflow.ts:413,457,465`) exist solely because the catalog note must reach prompts, must reach lock digests in a timestamp-free form, and must *not* reach the scope gate's keyword matcher. Real, but it's three functions and a `lockNotes`/`catalogPromptNote` field pair to express one policy.
- **`pass` in the `Review` schema is never read.** Blocker counting is the actual gate (`workflow.ts:1052`).
- **A transient SDK error is indistinguishable from a real failure.** `runtime.ts:122` returns `null` on `CursorAgentError` and logs `isRetryable` without using it; a reviewer's `null` becomes a synthetic blocker (`workflow.ts:1016`), a research `null` fails the whole run at exit 2. Zero retries anywhere in the LLM path — the only retry logic in the repo is `retryGh` for GitHub 5xx (`factory/cmd-pr.ts:113,156`).
- **Scope-gate classification is three regexes.** `FACTORY.md:210` admits it ("No LLM judge for the scope gate"). It's a defensible v1 but it silently mislabels anything phrased outside the pattern.
- **~150 lines of `pulse-catalog.ts` (`:306-416`) are prompt English, not logic** — they belong beside the role docs, not in a TS module.

---

## 6. Hard requirements a replacement must preserve

Testable constraints. Each is stated so it can be asserted.

**Constitution / safety**

1. **Agents never commit or push.** No LLM-invoked process may run `git commit`/`push`. Constitution I7 (`doctrine/constitution.md:44`), `doctrine/shared.md:67`. Only `factory/cmd-git.ts:100-101` commits. *Test:* run a full pipeline in a dirty worktree; `git log` unchanged, working tree dirty.
2. **Agents write only inside `guides/<slug>/`.** I7. Currently prompt-only (`workflow.ts:592`) with commit-time containment (`factory/cmd-git.ts:69-78`). *Test:* after a run, `git status --porcelain` shows no modified path outside `guides/<slug>/` (+ orchestrator-owned `retro/runs/`, `pipeline.lock.json`).
3. **Agents never edit doctrine.** I8, `doctrine/shared.md:71`. *Test:* `doctrine/**` and `schema/**` digests unchanged across a run.
4. **No secret values in files, argv, reports, or issue comments.** `doctrine/shared.md:77`. *Test:* run record and issue-comment bodies contain no key-shaped strings; `CURSOR_API_KEY`/`PULSE_REGISTRY_KEY` never appear in argv (they're env-only, `cli.ts:218`, `pulse-catalog.ts:139`).
5. **Facts flow one way; the Dossier is the fact ceiling.** I1. Enforced by the Fidelity gate + role docs. *Test:* Fidelity runs on every non-skipped round and its blockers block converge.

**Artifact contract**

6. **Research writes exactly `research.md` + `meta.yaml`; Writer writes exactly `external.md` + `speakeasy.md`.** `doctrine/shared.md:13-14`, `workflow.ts:589-593`, `lock.ts:19-22`. *Test:* after research, no setup files exist on a fresh guide.
7. **`status:"ok"` is invalid unless the required files exist on disk** — checked by the orchestrator, not trusted from the model. `workflow.ts:1147`, `1388`, `lock.ts:38,43`. *Test:* mock an agent that reports `ok` and writes nothing → run must not converge.
8. **A "reported ok but didn't write" agent gets one in-conversation follow-up before failing.** `runtime.ts:104-118`, prompts `workflow.ts:603,802,824`. *Test:* agent writes only on the second turn → run proceeds.
9. **The anchor contract holds.** I3: anchors minted once in the Dossier, reused verbatim in `external.md`/`speakeasy.md`/`meta.yaml`. Enforced deterministically by `lintAnchorAgreement` (`lint-guide.ts:422`). *Test:* rename an anchor in `external.md` only → blocker.
10. **The setup grammar holds.** I4: `setup_version:1` frontmatter + single H1 + no `Prerequisites|Provider setup|Speakeasy setup` H2 in `external.md`; no frontmatter and `# Speakeasy setup` + both canonical anchors in `speakeasy.md`; `{{ gram.oauth.callback_url }}` the only template key; `meta.yaml` validates against `schema/guide.v1.schema.json`. `lint-guide.ts:139,270,351`. *Test:* the existing lint unit surface must keep passing.
11. **Deterministic lint runs every review round and is never skipped by the cache.** `workflow.ts:1035`, `doctrine/pipeline-lock.md:36`. *Test:* a lock-skipped round-1 that would otherwise converge still fails if `external.md` is grammatically broken on disk.

**Review / convergence**

12. **Review converges by agreement, capped, with unresolved blockers surfaced — never silently dropped, never settled by rank.** I6. `MAX_ROUNDS` default 3 (`workflow.ts:404`), `unresolved` carried into the result (`workflow.ts:1654,1678`) and into the issue comment (`factory/format-pipeline-review.ts:260`). *Test:* a permanently-blocking finding yields `unconverged` + a Decision line, not a converged PR.
13. **Disputed findings survive to the next round and are re-examined fresh.** `doctrine/shared.md:48-56`, `workflow.ts:876-882` (prior context), `RevisionResult.disputed` (`workflow.ts:250`). *Test:* dispute in round N appears in round N+1's reviewer prompt.
14. **Reviewers never edit files.** `workflow.ts:870`, role docs. *Test:* file digests unchanged across a review-only round.
15. **Exactly one finalization salvage, blockers-only, only when every remaining blocker is a setup-file fidelity miss.** `findings.ts:31`, `workflow.ts:1581-1597`. *Test:* a research-target blocker at finalization → `unconverged`, no salvage.
16. **Nits never block convergence** and are surfaced as a human checklist. `workflow.ts:1697`.

**Caching / resume**

17. **Research always runs; `draft` and `review.*` are the only skippable steps; `revise` is never cached.** `doctrine/pipeline-lock.md:29-46`.
18. **Skip requires input-digest match *and* on-disk output digests still matching.** `lock.ts:467-485`. *Test:* hand-edit `external.md` after a converged run → next run must not skip review.
19. **`--force` bypasses all skips; `--overwrite` does not.** `lock.ts:475`, `workflow.ts:671`, doc `:189`.
20. **Timestamp-only churn must not bust the cache** (`observed_at`, `researched_at`, inline ISO-8601-Z). `lock.ts:177-203`. *Test:* re-run research producing byte-different but semantically identical output → `research_change.method` is `digest` or judge-`unchanged`, and draft skips.
21. **Operator notes changing always defeats a skip**, even when research is judged unchanged. `workflow.ts:1237-1250`, `lock.ts:375`. *Test:* same research, new `--notes` → draft re-runs.
22. **The lock is written only on converge.** `workflow.ts:1461,1708`. *Test:* an `unconverged` run leaves the prior lock byte-identical.
23. **Resume must reuse on-disk prior artifacts rather than blank-slate rewriting.** `workflow.ts:578` (research), `workflow.ts:766-777` (writer revise-in-place), `doctrine/roles/writer.md:122`. *Test:* resume with unchanged inputs produces zero-line `setup_churn`.

**Factory contract**

24. **Exit codes 0/2/3 all yield a PR; exit 1 and missing artifacts yield `guide:blocked` with no PR.** `FACTORY.md:202-204`, `factory/draft-outcome.ts:20-51`, workflow YAML `.github/workflows/guide-draft.yml:160-171`.
25. **`awaiting_scope` and `unconverged` open a *draft* PR; `converged` opens ready-for-review.** `factory/cmd-pr.ts:83,131-135,152`.
26. **A non-factory collaborator PR closing the same issue refuses the run** — never overwrite human work. `factory/preflight.ts:60-67`, `.github/workflows/guide-draft.yml:60-65`.
27. **Push uses `--force-with-lease`, and an empty diff with an existing remote branch is not an error.** `factory/cmd-git.ts:80-101`.
28. **Every completed run emits `retro/runs/<started_at>-<slug>.json` with the documented fields** (`status`, `rounds`, `history`, `unresolved`, `open_questions`, `skipped`, `research_change`, `notes_digest`, `setup_churn`, `scope`). `cli.ts:190-214`, `retro/README.md:14-56`. This is `/tune-pipeline`'s only machine input and the source of every issue comment (`factory/format-pipeline-review.ts:229`, `factory/format-scope-check.ts`).
29. **Material open questions without a `Decision N:` reply pause before draft when `--pause-on-scope` is set; soft ones never pause.** `workflow.ts:1272-1317`, `scope-gate.ts:129`. *Test:* an OQ matching `SOFT_RE`/`SILENCE_ONLY_RE` alone → no pause.
30. **The product is "Speakeasy AI Control Plane"; the string "Gram" never appears in prose** — the sole exception is the `{{ gram.oauth.callback_url }}` template key. `doctrine/shared.md:85-88`.
