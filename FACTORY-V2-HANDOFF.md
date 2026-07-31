# Handoff — Factory v2, after the cutover

> Supersedes the original handoff (see `git log FACTORY-V2-HANDOFF.md` for it).
> Paste everything below the line into a fresh session started in the
> `sandcastle-factory` worktree.

---

## Where this stands

**The migration is code-complete. `pi` + OpenRouter is the only runtime.**
`@cursor/sdk` is gone from `package.json` and the lockfile, `runtime.ts` is
deleted, and no code path anywhere reads `CURSOR_API_KEY`. What remains is a
merge and one secret deletion — see "What is left".

Two things gate the last step, and the order matters:

1. **`main` is still entirely Cursor-era.** `cmd-distill.ts:26` gates on
   `CURSOR_API_KEY`, `package.json:17` still depends on `@cursor/sdk`, and
   `guide-draft.yml:88,119` still pass the Cursor secret. Because
   `issues:labeled` always runs the workflow from the **default branch**, the
   factory on `main` works today and would break the moment the secret is
   deleted.
2. **So: merge this branch first, delete `CURSOR_API_KEY` from repo secrets
   second.** Never the other way round. The same fact means the CI half of this
   change *cannot be exercised before merge* — the workflow file on this branch
   never runs. That is why the CI verification here is a static audit.

`OPENROUTER_API_KEY` was minted and added to repo secrets on 2026-07-31.

### Stages 1 and 2 and the lock scheme (earlier work)

`--runtime pi` drove all four phases against OpenRouter and took a real guide
from an empty directory to `status: converged`; `resolve-issue.ts` no longer
imports `@cursor/sdk`; `prompt_digest` now hashes the prompt the agent actually
gets. Nine commits:

| Commit | What |
| --- | --- |
| `e9dd912` | The design (`FACTORY-V2.md`) plus nine research reports |
| `50fb40c` | The pi runtime behind `--runtime`, tests 34 → 85 |
| `62fefe0` | Per-phase tool-call logging |
| `3b7c204` | `PATH_CONTRACT`, tests 87 → 88 — a fix for the wrong cause, see below |
| `ce2106b` | Stage 2: `resolve-issue.ts` onto a direct OpenRouter `fetch`, tests 88 → 100 |
| `816a9dc` | Recording what the generation test measured |
| `fec5184` | `cmd-distill.ts` gates on `OPENROUTER_API_KEY` |
| `e39c1e6` | **The doubled-repo-root bug in `assign()`** — the real cause of run 1 |
| `9787bb7` | Lock scheme: `prompt_digest` over the rendered prompt, tests 100 → 112 |

At `9787bb7`: tests 112/112, `npm run typecheck` clean, all 18 guides lint `ok`.

### The cutover itself

Working-tree state after the cutover (see "What is left" for what to do with it):

| Change | What |
| --- | --- |
| `pipeline/src/runtime.ts` | **deleted** (161 lines) |
| `pipeline/src/cli.ts` | −105 lines: `--runtime`, `--effort`, `--light-model`, `--light-effort` and the `DRAFT_RUNTIME` / `CURSOR_MODEL*` / `CURSOR_EFFORT*` fallbacks all gone; unconditional `createPiRuntime`; key read is `OPENROUTER_API_KEY` |
| `pipeline/src/workflow.ts` | imports `withSchemaHint` from `schema-hint.ts` and `PiRuntime as Runtime` from `runtime-pi.ts`; lock `runtime` is `'pi'` |
| `pipeline/package.json` + lockfile | `@cursor/sdk` removed; `npm ci` installs 154 packages, was 164 |
| `.github/workflows/guide-draft.yml` | both steps (`:88` distill, `:119` draft) now pass `OPENROUTER_API_KEY` |
| Docs + prose | `FACTORY.md` (5 spots), `README.md`, `mise.toml`, `retro/README.md`, `.claude/skills/tune-pipeline/SKILL.md`, `schema/pipeline-lock.v1.schema.json`, `cmd-pr.ts`, `findings.ts`, `pi-guard.ts`, `runtime-pi.ts` |

Verified from a **clean install** (`rm -rf node_modules && npm ci`), not an
incremental one — `npm uninstall` leaves the rest of `node_modules` untouched, so
"typecheck passes" alone only proves nothing *imports* the package, not that the
lockfile is installable without it:

- typecheck clean; **112/112 tests**; all **18 guides lint `ok`**
- `node_modules/@cursor` absent; `pi --version` → `0.83.0`, matching the pin
- `--runtime`, `--effort`, `--light-model` all now **exit 64 with "Unknown
  flag"** rather than being silently ignored. That was the failure mode worth
  checking: a stale CI invocation or shell alias carrying a removed flag now
  fails visibly at startup instead of quietly doing something different.

**Two defaults changed.** `--model` now takes an OpenRouter slug and defaults to
`openai/gpt-5.6-sol` (was the Cursor slug `gpt-5.6-sol`); its env fallback is
`DRAFT_MODEL` (was `CURSOR_MODEL`).

**`--effort` was deleted rather than reimplemented.** It was silently ignored on
the pi path while the banner still printed `effort=high`. pi encodes reasoning
effort as a `:<thinking>` suffix on the model pattern; the valid values were
never established, so guessing at them was out of scope. If effort control is
wanted back, that suffix is where it goes.

### Stage 2 is now validated against real inputs

11 past factory-processed issues replayed through `resolve-issue.ts` on
`openai/gpt-5.6-sol`: **11/11 agreement** on slug, provider, persona and
`ok`/`needs_clarification`, zero infrastructure failures. Ground truth was the
factory's own "resolved intent" comment, corroborated by the
`guide/issue-<N>-<slug>` branch name; the two agreed on all 11. The exit-2
clarification path had no historical examples, so it was probed with three
synthetic ambiguous inputs and exits 2 correctly on all three.

**Read the methodology before trusting the number.** `resolve-issue.ts` embeds
*today's* `guides/` slug list into the prompt and tells the model to prefer
matching one. Replaying against the live worktree therefore hands the model
answers that did not exist when the issue ran — and it showed the new path
"beating" Cursor on issue #64 by picking `x-docs`. Reconstructing `guides/` and
`doctrine/personas/` as of each issue's actual merge commit erased that: #64
resolves to `x`, the same answer Cursor gave. **The honest result is parity, not
improvement.** A naive replay would have shipped the claim that the new model is
smarter about X Docs; it is not, it was reading the answer off the present-day
repo.

Two limits worth carrying forward:

- **Persona classification is untested and currently untestable.**
  `doctrine/personas/` holds exactly one file, and `normalizeOk()` rewrites any
  unrecognised persona to `it-admin` — so that column could not have disagreed
  no matter what the model returned. It stays untested until a second persona
  exists.
- **#64 is a shared blind spot, not a regression.** Both classifiers chose `x`
  for "create x docs mcp guide" (`docs.x.com/mcp` is a *different* server from
  the `api.x.com/mcp` one in `guides/x/`); a human forced `x-docs` on the resume
  run. Neither path distinguishes two MCP servers from one vendor given only a
  URL, and arguably both should have returned `needs_clarification`.

## What the generation test showed

The fresh-draft run on `google-calendar` is **done**, and it answered the
question that was the migration's largest open risk.

**Run 1 failed, and usefully.** ~$0.75, dead at research on the I7 tripwire: the
agent wrote to `<repoRoot>/home/walker/…/guides/google-calendar/research.md`.

⚠️ **The root cause recorded here was wrong, twice over.** It was first blamed on
pi's path resolution (a live probe cleared pi — `dist/utils/paths.js:60`,
`resolvePath` branches on `isAbsolute`), then on the model rendering an absolute
path without its leading slash. Neither. `workflow.ts`'s `assign()` was building
the guide directory as `abs(ROOT, guideDir(slug))`, where the `guideDir` in scope
is a **local** helper returning an already-absolute path — so `abs` glued the
repo root on a second time and the prompt literally said:

```
- guide directory: /repo/home/walker/…/repo/guides/google-calendar/
```

The agent did what it was told. Present since `aa5964c`, on `main`, on both
runtimes — the Cursor-era guides came out fine only because the agent inferred
the real directory from the reading list instead of believing the assignment.
Fixed in `e39c1e6`, which also drops the shadowed import so the name cannot
collide again.

`PATH_CONTRACT` (`3b7c204`) therefore fixed a cause that did not exist. It stays:
two sentences telling the agent where it is standing are worth keeping, and its
regression test is unaffected. But do not treat it as load-bearing.

**The lesson is about the diagnosis, not the bug.** Two plausible stories about
model behaviour were accepted before anyone evaluated the expression. If a prompt
says something surprising, print it.

**Run 2 converged.** `status: converged`, 2 review rounds, **$2.25**, ~7 minutes
(15:07:07 → 15:14:21). `lint-guide: ok`, no tripwire. Per-phase:

| Phase | Cost | Tools |
| --- | --- | --- |
| research | $0.8636 | bash=22 read=9 write=2 ls=1 find=1 edit=1 |
| draft | $0.2778 | read=10 ls=2 write=2 |
| review:achievability r1 | $0.1975 | read=9 ls=2 |
| review:fidelity r1 | $0.2454 | read=11 ls=2 |
| revise r1 | $0.2836 | read=14 edit=3 ls=1 find=1 |
| review:achievability r2 | $0.1681 | read=8 ls=1 |
| review:fidelity r2 | $0.2117 | read=11 ls=2 |

Both run records are in `retro/runs/2026-07-31T*-google-calendar.json`.

**Research really does fetch the live web**, through `bash` + `curl` — 22 bash
calls in the research phase. Verified independently of the tool counts: every
specific claim in the generated dossier matches Google's official page exactly,
including all three unusual OAuth scopes (`calendar.calendarlist.readonly`,
`calendar.events.freebusy`, `calendar.events.readonly`), both API service names,
the `calendarmcp.googleapis.com/mcp/v1` endpoint, and the Web-application client
type. Those scope strings are not recallable from training data. Source:
`https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server`.
This retroactively justifies correction #2 below — the design doc's tool list
would have produced a hallucinated dossier.

**Quality vs the committed Cursor-generated guide: comparable, not worse.**

Gains — caught two requirements Cursor missed (`developer-preview-access` and
`preview-use-compliance`, the Developer Preview restriction barring end users
outside the participant's domain before GA); added the
`developers.google.com/workspace/preview` provenance source; turned a bare URL
into a markdown link and added a cross-anchor to `#grant-mcp-tool-user`.

Losses, worst first:

- **Provenance weakened.** The endpoint observation for
  `calendarmcp.googleapis.com/mcp/v1` previously carried
  `status: MCP initialize returned HTTP 200` and `version: "2025-03-26"`. pi
  dropped both fields *while refreshing `observed_at`* — a newer observation
  asserting less evidence than the one it replaced. This is the one worth fixing.
- Dropped the `calendar/api/auth` scopes source (20 locators, was 21).
- Envelope: 2 of 8 metrics outside core-6 — `researchLines` 332 vs `259..307`,
  `speakeasyLines` 28 vs `30..31`. Both mild.
- **Style drift:** flipped `Click` → `Select` throughout (23/0 → 0/23). Nothing
  lints it, and the corpus is genuinely split — asana/salesforce/zapier use
  `Select`, the whole `google-*` family uses `Click`, and
  `doctrine/speakeasy-setup.md:74,80,81` says "click". Drift, not a correction.

**The `observed_at` worry is partly settled.** 20 timestamps bumped against 20
locators with 22 bash calls in 200s — near 1:1, consistent with genuinely
re-fetching each, and the independently verified facts point the same way. It is
*probably* honest but **not proven**; see the session-deletion gap below.

## Corrections to `FACTORY-V2.md` — it is wrong in five places

Trust this file over the design doc where they disagree. The first four were
found by live probing; the evidence is in
`factory-v2-evidence/probe-pi-session.md`.

**1. `--no-session` cannot be used.** The design mandates it. It is mutually
exclusive with remediation: with `--no-session`, turn 2 starts a fresh
conversation and the agent redoes all its research, which is the exact failure
the remediation contract exists to prevent. The fix in `runtime-pi.ts` is a
per-call `--session <path>` in a temp dir — the same flag creates the file on
turn 1 and resumes it on turn 2. Verified live: turn 2 recalled a fact from
turn 1. Deleted in a `finally`, so no unbounded `~/.pi` growth either — at the
cost of post-hoc auditability; see "Known gaps".

**2. Dropping `bash` disables research; it does not tighten it.** §6.1 claims
`--tools read,edit,write,grep,find,ls` "costs nothing". pi has no web-fetch tool
on 0.57.1 or 0.83.0, and `doctrine/roles/technical-research.md:32` has the agent
fetching provider docs. `bash` is its only route out. `toolsForPhase()` now
scopes tools per phase instead: reviewers and the judge get read-only, draft and
revise get writes without `bash`, research keeps `bash`. Still narrower than the
Cursor runtime everywhere except research. **Confirmed by run 2**: research spent
22 of its 36 tool calls in `bash`, and the facts it returned are not recallable.

**3. Stage 5b as written does not test drafting.** "Re-run `google-calendar`"
reads like a fresh draft but is not one: `researchPrompt` sees a prior dossier
and takes the *revise* path. A re-run produced only timestamp churn plus one
prose edit — a fine result for the "near-zero churn on unchanged inputs" check,
and useless for judging draft quality. The runs above therefore deleted
`research.md`, `meta.yaml`, `external.md` and `speakeasy.md` first; any future
draft-quality test must do the same.

**4. Check 14's envelope is nearly vacuous.** `x-docs` is a no-setup provider
(14 lines, 0 setup steps) against 99–140 lines for the other six, which stretches
`externalLines` to `14..140`. `tools/envelope.ts` prints both; use **core6** for
a setup-heavy guide:

| Metric | all 7 | core 6 |
| --- | --- | --- |
| externalLines | 14..140 | 99..140 |
| externalWords | 82..927 | 636..927 |
| researchLines | 131..307 | 259..307 |
| anchors | 1..7 | 5..7 |
| setupSteps | 0..73 | 48..73 |

**5. Stage 5 does not need a doctrine rewrite.** §8 says to "rewrite
`doctrine/pipeline-lock.md:93-102` in the same commit" as the lock-scheme change,
and §9 repeats it. Not so: that section already requires exactly the exclusions
the new scheme makes, and it already says "the contract only requires a stable
byte sequence; hashing the template source in the workflow is an implementation
detail." The instruction was written for Stage 7's prompt-file design, where
`prompt_args` would have needed a schema field. `9787bb7` landed with `doctrine/`
untouched, as I8 requires. **Do not open `doctrine/` for this.**

## Hard constraints

- **Never edit the repo while a run is in flight.** The I7 tripwire captures its
  baseline once before any agent runs, so any file you touch mid-run is
  indistinguishable from an agent breach. This cost one $1.22 run — the tripwire
  correctly failed `review:fidelity r2` and named three files I had just edited.
- **Never commit or push during an agent run** (constitution I7). Agents write
  only inside `guides/<slug>/`.
- **Nothing under `doctrine/` changes** (I8, human-approved only).
- **Never print secret values.** `OPENROUTER_API_KEY` comes from `mise` via the
  gitignored `mise.local.toml` at the repo root; it resolves inside this worktree
  because the worktree is nested under it. If it reads empty the shell snapshot
  is stale — use `mise exec --`. Confirm length only:
  `mise exec -- bash -c 'echo ${#OPENROUTER_API_KEY}'`.
- The OpenRouter key in use is a **dev** key with a $1000/month cap. Do not put
  it in GitHub secrets — mint a separate, tightly-capped key at cutover.

## What Stage 1 built

| File | Role |
| --- | --- |
| `pipeline/src/pi-stream.ts` | NDJSON parsing; `classifyPiRun` decides success |
| `pipeline/src/pi-guard.ts` | Env allowlist + I7 tripwire (both pure) |
| `pipeline/src/schema-hint.ts` | `withSchemaHint`, shared by both runtimes |
| `pipeline/src/runtime-pi.ts` | The adapter |
| `pipeline/tools/*.ts` | check12 (is the reference set still apples-to-apples?), envelope, smoke-pi — not typechecked; outside `src` |

Four design points worth not re-deriving:

- **`classifyPiRun` never trusts the exit code.** pi exits **0** on API errors,
  carrying the failure only as `stopReason:"error"` / `errorMessage` on the
  message object (surfacing under `message_start`, `message_end`, `turn_end`,
  and `agent_end.messages[-1]`). Naive exit-code checking reports a guide that
  never generated as one that generated empty. Auth failure is a different shape:
  exit 1, lone `session` line, stack on stderr.
- **`finalText` keys off `type === 'agent_end'`, never position.** 0.83.0 appends
  a contentless `agent_settled`; "read the last line" works on 0.57.1 and
  silently returns nothing on 0.83.0.
- **The tripwire baseline is captured once**, before any agent runs. A per-turn
  baseline lets a first-turn breach be accepted as pre-existing by the
  remediation turn. When the baseline is non-empty the degradation is logged
  loudly rather than silently.
- **`PATH_CONTRACT` is appended to every pi prompt** (`3b7c204`) — one paragraph
  stating that `cwd` is the repo root and that a path must either start with `/`
  or be repo-relative. It is appended inside `turn`, not `agent`, so the
  remediation turn carries it too; the regression test pins both turns. Deliberately
  **runtime-local**: `workflow.ts`, `doctrine/`, and the Cursor path are untouched,
  so the fix cannot change what the Cursor runtime produces. It was written to fix
  run 1 and did not — see the correction under "What the generation test showed".

`withSchemaHint` had to move to `schema-hint.ts` and be re-exported from
`runtime.ts`: hints are keyed by zod schema *identity* and `workflow.ts` calls it
at module load, so both runtimes must read one map. **`workflow.ts` is
untouched** — typecheck proves the pi runtime is structurally compatible with
`Runtime`.

pi is pinned as an exact dependency (`@earendil-works/pi-coding-agent` 0.83.0)
rather than the design's `npm i -g`: both published scopes can sit on `PATH` with
different stream formats, and `resolvePiBin()` prefers the pinned binary. This
also means CI needs no new global-install step.

## Known gaps in Stage 1

- ~~**`--effort` is ignored on the pi path.**~~ Closed at cutover by deleting the
  flag rather than implementing it — see "The cutover itself".
- ~~**`workflow.ts:514` hardcodes `runtime: 'cursor-sdk'`**~~ — now `'pi'`.
- **`modelId()` returns the full slug** (`openrouter/openai/gpt-5.6-sol`), so
  **every committed lock goes cold on first contact.** `runtime` is
  observational and excluded from digests, but `model` sits inside `inputs` and
  does feed `input_digest` (`lock.ts:520/527`, `539/548`, `564/576`). So the
  first post-cutover run of each guide skips nothing and re-runs every phase.
  That is inherent to the cutover and was always the plan — but it means the
  first full run is a full re-run of all 18 guides. Know that before launching
  one and watching the bill.
- **The pi session is deleted in a `finally`, so a finished run cannot be
  audited.** This is what keeps the `observed_at` question at "probably honest"
  instead of proven: the tool *counts* survive in the log, the actual `curl`
  commands do not. Keeping the session on failure — or on an explicit flag —
  would close it, and would have made run 1 much faster to diagnose.
- **The endpoint probe lost fields under pi.** Run 2's dossier refreshed
  `observed_at` on the `calendarmcp.googleapis.com/mcp/v1` observation while
  dropping its `status` and `version`. Nothing in the schema or `lintGuide`
  requires an observation to keep what it already had, so this class of silent
  provenance decay is invisible. **Check it before cutover** — either on the
  research role doc or as a lint rule.

## What is left

Stages 2–6 from `FACTORY-V2.md` §9, reinterpreted now that the runtime is
whole-swap rather than per-phase:

1. ~~**Validate drafting quality**~~ — **done.** Converged on a fresh draft at
   $2.25; the `curl`-fed dossier is comparable to the Cursor one, not worse. One
   real regression (the dropped endpoint-probe fields) and one style drift
   (`Click` → `Select`) to settle before cutover. See "What the generation test
   showed".
2. ~~**`resolve-issue.ts`**~~ — **done** in `ce2106b`, gate fixed in `fec5184`,
   replay-validated 11/11 (see "Stage 2 is now validated against real inputs").
3. ~~**Lock scheme**~~ — **done** in `9787bb7`. See "What the lock scheme
   changed" below.
4. ~~**Cutover**~~ — **done**, uncommitted in the working tree. Note `json.ts`
   was **not** deleted: an earlier version of this doc said to, and that was
   wrong — `extractJson` is imported by `resolve-issue.ts:12` and
   `runtime-pi.ts:23`, both of which survive.
5. ~~**CI**~~ — **done**, uncommitted. `OPENROUTER_API_KEY` was minted and added
   to repo secrets on 2026-07-31.

### CI was audited statically, and one question was then settled by running it

The workflow file on this branch cannot execute before merge, so the CI check
was a static trace of all 18 steps: **zero env gaps, zero surviving
`CURSOR_API_KEY` reads, zero removed flags passed, `npm ci --dry-run` exit 0.**
`cmd-draft.ts:30` calls `runPipelineScript` with no `opts`, so the subprocess
inherits `OPENROUTER_API_KEY` via the `process.env` branch; `cmd-distill.ts:62`
builds `{ ...process.env, ISSUE_BODY: body }`, and the spread carries it. Both
fine.

**The audit raised one thing nobody had considered, and it was worth the
scare.** `~/.pi/agent/auth.json` exists on the dev machine, dated *before* both
generation-test runs — so every local `pi` run may have authenticated from that
stored credential rather than from `OPENROUTER_API_KEY`, and a GitHub runner has
a fresh `HOME` with no `~/.pi`. CI would have been the first execution where the
env-key path was load-bearing.

**Settled by execution, not by reading:** `pi` was run with
`HOME=$(mktemp -d)` (verified empty) and the key supplied only via the
environment. It authenticated and completed — `provider: "openrouter"`,
`model: "openai/gpt-5.6-sol"`, `stopReason: "stop"`. Cost $0.0033. The env-key
path works with no credential store, and the new default slug resolves at
OpenRouter. **Do not re-derive this by reading pi's docs — it is verified.**

**Not settled, and unsettleable without a runner:** whether pi's `bash` tool
behaves identically on a GitHub runner (research depends on it for `curl`), and
whether the `OPENROUTER_API_KEY` secret's *value* is valid and funded — only its
name and mint date are observable.

### ⚠️ A pre-existing bug that will disguise the first post-cutover failure

**Not caused by the migration** — it behaves identically on the Cursor runtime —
but the first post-cutover run is exactly when a novel failure mode is likeliest,
and this is what would hide it. Every link verified by reading the cited code:

1. `workflow.ts:895-896` — `draftOne` runs `mkdirSync(guideDir(slug))` **before
   the first agent call**.
2. `workflow.ts:969-970` — a `null` from the research agent (what *any* pi
   failure produces, since `classifyPiRun` decides success rather than the exit
   code) returns `{ status: 'failed', failed_phase: 'research' }`.
3. `cli.ts:284-287` — `failed`, `blocked` and `unconverged` **all collapse to
   exit 2**. The factory cannot tell them apart.
4. `draft-outcome.ts:36-40` — exit 2 plus an existing `guides/<slug>/` ⇒
   `unconverged`, `ok: true`. The directory exists because of step 1, so the
   `existsSync` guard meant to catch "the pipeline produced nothing" can never
   fire.
5. `cmd-git.ts:69-78` — `retro/runs/<ts>-<slug>.json` is always written, so the
   commit is non-empty and the push proceeds.

**Result: a run where no agent ever executed opens a draft PR containing only a
run record, described as "unconverged (reviewers still had blockers after max
rounds)", and never applies `guide:blocked`.** The natural human response is to
re-run it, and each re-run pays in full while never revealing the real failure.

The narrow fix is to stop collapsing `failed` into exit 2 at `cli.ts:284-287`.
Left undone deliberately: it changes the exit-code contract between `cli.ts` and
`draft-outcome.ts`, which is factory semantics rather than migration scope.

**The only steps left are a merge and a deletion, in this order:**

1. **Commit and merge this branch.** Everything above is working-tree state.
   Merging the pipeline changes *without* the `guide-draft.yml` change would
   break every CI draft run at `cli.ts` with `OPENROUTER_API_KEY is required`.
   They must land together.
2. **Then delete `CURSOR_API_KEY` from repo secrets.** Not before — see the two
   ordering constraints at the top of this doc.

The blast-radius table that used to live here is gone because every row is
cleared. One row was resolved the other way and is worth stating so nobody
"finishes the job" by deleting it:

**`pipeline/src/pi-guard.ts` keeps `'CURSOR_API_KEY'` in `DENIED_ENV`.** The old
table said to drop it. Do not. `buildAgentEnv` iterates `ALLOWED_ENV` and never
reads `DENIED_ENV` — so it looks inert — but `pi-guard.test.ts:22-29` seeds every
`DENIED_ENV` name into a source env and asserts none survive into the agent's.
The list *is* the guarantee, via the test. Keeping the entry asserts that a stale
Cursor key still exported in a developer's shell can never reach the agent, which
stays true and useful long after this repo stops using one. Removing it deletes a
real test case and buys nothing.

## What the lock scheme changed

`prompt_digest` used to hash `PROMPT_TEMPLATES` in `lock.ts`: a hand-written
shadow of each prompt, which nothing tied to the real builder. Editing a prompt
left the digest unchanged, so the pipeline would skip a step whose instructions
had moved — the exact failure the lock exists to prevent, and unobservable.

It now hashes the **rendered** prompt with declared volatile spans replaced by
placeholders. Worth not re-deriving:

- **The three hashed prompts moved to `pipeline/src/prompts.ts`.** They were
  closures inside `runWorkflow`, which is why no test could render one — and why
  the shadow existed at all. `createPrompts({repoRoot, timestamp, persona,
  maxRounds})` returns them. Remediation, judge and revision prompts stayed in
  `workflow.ts`; nothing hashes those.
- **What is stripped, and why each:** the whole `assign()` block (slug, provider,
  guide directory, persona, operator notes with the catalog note merged in, and
  `NOW`); the persona file path where the reading list repeats it; the repo root,
  so digests stay portable; and the reviewer round line, which carries
  `MAX_ROUNDS` and would otherwise let `--max-rounds` bust every review entry.
  Everything stripped is already in `params` or `reading_list`, so nothing that
  used to bust the cache stopped.
- **`stripVolatile` throws when a span is absent** rather than skipping it. A
  span that quietly stopped matching would leave `NOW` in the digest and every
  run would bust every entry while looking healthy — costly and invisible. This
  is also what forces the `persona` flag in `volatileSpans` to match the
  `withPersona` its builder passes to `readingList`.
- **`doctrine/pipeline-lock.md` needed no change** (I8 respected). It already
  requires exactly these exclusions and says the byte sequence's source is an
  implementation detail. `FACTORY-V2.md` §9 expected a doctrine rewrite here;
  that assumed the prompt-file design of Stage 7, not this one.
- All 16 committed locks go cold on first contact, as the design planned.

## What Stage 2 built

`resolve-issue.ts` now calls OpenRouter's `/api/v1/chat/completions` directly.
Three decisions worth not re-deriving:

- **Infrastructure failure and genuine ambiguity are different exits.** A thrown
  transport, a non-2xx, a 200 whose body is not JSON, and a 200 with no message
  content all exit **1**. Only a real model response that fails `extractJson` or
  the zod schema becomes `needs_clarification` and exits **2**. A 200-with-no-content
  used to take the clarification path; asking the issue author to clarify when the
  model returned nothing is both useless and the same shape of lie that let a
  broken pi run look empty rather than failed.
- **The HTTP envelope is parsed with `JSON.parse`, not `extractJson`.**
  `extractJson` scavenges from the first `{` to the last `}`, which would
  manufacture a plausible object out of an HTML error page. `extractJson` still
  parses the *model's* text, where scavenging is the point.
- **`distill()` takes its transport as a parameter**, matching `RunPi` in
  `runtime-pi.ts`, so all twelve new tests run without a mocking library.

One thing to know when reading it: `cmd-distill.ts` **does not branch on
`resolve-issue`'s exit code** — it branches on `resolved.status` in the output
file (`:72`, `:84`) and uses the code only inside a failure message (`:66`). So
the exit-table change above alters which message reaches the issue, not control
flow. `resolve-issue.ts` also gained an `isCliEntry()` guard so the test file can
import `distill` without the CLI running and calling `process.exit`; the house
idiom would be a `-cli.ts` split, which needs `package.json` and
`cmd-distill.ts:59` to move with it.

`fec5184` swapped `cmd-distill.ts`'s pre-flight gate to `OPENROUTER_API_KEY` and
made it trim first, matching `resolve-issue.ts:363`. Without the trim a
whitespace-only secret clears the gate and dies in the subprocess as
"resolve-issue produced no resolved.json", which names neither the secret nor
the problem.

## Repo state

- Branch `worktree-sandcastle-factory`, worktree at
  `.claude/worktrees/sandcastle-factory`. `guides/google-calendar/` was restored
  after the test, so the committed guide is still the Cursor-generated reference.
- **The cutover is uncommitted working-tree state.** `git status` shows the ten
  modified files, the `D pipeline/src/runtime.ts` deletion, and the two
  untracked run records below. Commit them together — the pipeline half and the
  `guide-draft.yml` half must not be split across commits that could merge
  separately.
- `retro/runs/2026-07-31T14:58:27Z-*` (failed) and `…T15:07:07Z-*` (converged)
  are the two run records from the generation test. Nothing under `retro/runs/`
  has ever been tracked, and it sits inside the tripwire allowlist, so leaving
  them untracked costs nothing.
- `pipeline/node_modules` installed (**154** packages after the `@cursor/sdk`
  removal; was 164). Includes the pinned pi at `0.83.0`.
- Pre-existing, not caused by the cutover: `npm audit` reports one high-severity
  advisory (`brace-expansion` DoS) nested under
  `@earendil-works/pi-coding-agent` — it arrived with the **pi** dependency.
  `npm audit fix` would rewrite the lockfile, so it was left alone.
- `pipeline/src/prompts.ts` is new as of `9787bb7` and now owns the research,
  draft and review prompts. `workflow.ts` lost ~300 lines to it and re-exports
  `GuideInput` so `cli.ts` is unchanged.
- `factory-v2-evidence/` holds twelve reports. Start with
  `probe-pi-session.md` (resume flags, exact error shapes),
  `report-runtime-seam.md` (every `agent()` call site and what it expects),
  `report-cursor-blast-radius.md` (every file that must change).
- `pipeline/.tmp-smoke/` and `.tmp-probe-*/` are gitignored scratch; safe to
  delete. `pipeline/tools/` is the committed copy.
- Unrelated: `.claude/worktrees/` is **not** gitignored in the main repo, so a
  stray `git add -A` on `main` would try to commit this whole worktree.

## Managing your own context

**Keep total context under ~175k.** Delegate anything that means reading a lot
to produce a little — mapping call sites, verifying a library's behaviour,
checking a version's flags. Keep the adapter work inline.

Workers run in `herdr` panes. Verify `test "${HERDR_ENV:-}" = 1` first, then:

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
# -> .result.pane.pane_id
herdr agent start seam-mapper --kind claude --pane <pane_id>
herdr agent prompt seam-mapper "$(cat brief.md)"
```

Write the brief to a file in the scratchpad and prompt with **just its path**
(`"Read <path> and carry it out exactly as written."`). That keeps the worker's
context near zero and yours unchanged, and sidesteps the paste gotcha below.
Give each worker a disjoint file set and an explicit "do not commit, do not
push, do not run `git checkout/reset/stash/clean`" — they share this worktree.

Five gotchas, all hit for real:

1. **The prompt sometimes pastes without submitting** — the pane shows the text
   in the input box and the agent stays `idle`. **It is intermittent, not
   deterministic**: in one session the first round of three prompts all
   submitted fine and the second round of three all stalled. So do not assume
   either way — check, and check *properly*. `agent prompt`'s own response is
   not evidence: it returns a snapshot taken before the agent reacts, so it says
   `idle` even when the prompt did submit. The reliable check is
   `herdr agent read <name> --source visible` a few seconds later — if the brief
   text is sitting after the `❯`, it stalled. The documented fix is
   `herdr agent send-keys <name> enter`, but see gotcha 4: that call is the one
   the classifier denies, so in practice the user has to press Enter.
2. **New agents start in `⏸ manual mode`** and will block on every edit and
   bash call. Ask the user to flip them to auto *before* prompting; it costs
   them seconds and costs you a stall otherwise.
3. **Long output is unreadable from the pane** (alternate screen; scrollback
   cannot recover it). Ask workers to **write a Markdown report to a file and
   reply with only that path**.
4. **The permission classifier will eventually deny `herdr agent get`/`send-keys`**
   once it reads the pattern as auto-approving another agent. Do not build an
   approver loop and do not route around it — surface it to the user. To wait on
   workers without polling herdr at all, background a shell loop that waits for
   the report *files* to appear.
5. **Delegation has fixed friction** (pane, agent start, manual-mode flip). For a
   focused edit where you already hold the facts, inline is faster than briefing.

Use descriptive role names (`seam-mapper`, `pi-prober`), never "agent A/B/C".
Close panes you created when done; leave others alone. **Review the diff
yourself** — both Stage 2 workers wrote accurate, self-critical reports, and both
still had judgement calls worth overriding.
