# Handoff — Factory v2, after Stage 2

> Supersedes the original handoff (see `git log FACTORY-V2-HANDOFF.md` for it).
> Paste everything below the line into a fresh session started in the
> `sandcastle-factory` worktree.

---

## Where this stands

**Stages 1 and 2 are done and committed.** `--runtime pi` drives all four phases
against OpenRouter and has taken a real guide from an empty directory to
`status: converged`; `resolve-issue.ts` no longer imports `@cursor/sdk`. Six
commits:

| Commit | What |
| --- | --- |
| `e9dd912` | The design (`FACTORY-V2.md`) plus nine research reports |
| `50fb40c` | The pi runtime behind `--runtime`, tests 34 → 85 |
| `62fefe0` | Per-phase tool-call logging |
| `3b7c204` | The `PATH_CONTRACT` fix found by the fresh-draft run, tests 87 → 88 |
| `ce2106b` | Stage 2: `resolve-issue.ts` onto a direct OpenRouter `fetch`, tests 88 → 100 |
| `816a9dc` | This file, recording what the generation test measured |

At `ce2106b`: tests 100/100, `npm run typecheck` clean.

**The `CURSOR_API_KEY` goal is NOT met yet**, and the tree is now in a
**deliberate half-migrated state** — read the next section before running
anything in CI.

## Your task — finish the cutover, in this order

**⚠️ First, the thing that is currently broken.** `ce2106b` moved
`resolve-issue.ts` onto `OPENROUTER_API_KEY`, but its two callers still speak
Cursor. In CI the distill step now passes `cmd-distill.ts`'s gate and *then*
dies with `OPENROUTER_API_KEY is required`:

- `pipeline/src/factory/cmd-distill.ts:26` still hard-gates on `CURSOR_API_KEY`
  before spawning `src/resolve-issue.ts`.
- `.github/workflows/guide-draft.yml:88` passes only
  `CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}` to that step.

**Do not merge this branch to `main` until both are fixed.** They were left
alone on purpose: pointing the workflow at `OPENROUTER_API_KEY` before that
secret exists in GitHub breaks CI immediately, and minting it is a human
decision (see Hard constraints — use a fresh spend-capped key, not the dev one).

Then, in order:

1. **`cmd-distill.ts:26`** — swap the gate to `OPENROUTER_API_KEY`. Safe and
   local; do this first so the code is at least self-consistent.
2. **Lock scheme** (§9 Stage 5) — `prompt_digest` over the rendered prompt with
   `NOW` stripped. Two regression tests: two runs differing only in `NOW` produce
   an identical `input_digest`, and editing a prompt builder *does* change it.
3. **Cutover** — flip the default to `pi`, delete `runtime.ts` and its
   `@cursor/sdk` import, drop the dependency from `package.json` + lockfile.
4. **CI** (§9 Stage 6) — mint the spend-capped key, swap the secret on both
   `guide-draft.yml` steps (`:88` distill, `:119` draft), then delete
   `CURSOR_API_KEY` from repo secrets and from the docs listed below.
   **When this merges, the goal is met.**

Stage 2 is still unvalidated against real inputs: replay ~10 past labelled
issues and confirm slug and persona match what the Cursor path produced. The
unit tests cover every branch of `distill()`, but nothing has yet checked that
the OpenRouter light model classifies as well as `composer-2.5` did.

## What the generation test showed

The fresh-draft run on `google-calendar` is **done**, and it answered the
question that was the migration's largest open risk.

**Run 1 failed, and usefully.** ~$0.75, dead at research on the I7 tripwire: the
agent wrote to `<repoRoot>/home/walker/…/guides/google-calendar/research.md`.
Root cause is a genuine ambiguity, not a model lapse — `workflow.ts`'s `assign()`
(~`:558`) hands the agent an **absolute** guide directory while pi runs with
`cwd = repoRoot`, so both encodings are valid; the model rendered the absolute
path *without its leading slash* and pi resolved that as relative. A live probe
cleared pi (`dist/utils/paths.js:60`, `resolvePath` branches on `isAbsolute`).
Fixed in `3b7c204`; see `PATH_CONTRACT` under "What Stage 1 built".

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

## Corrections to `FACTORY-V2.md` — it is wrong in four places

Trust this file over the design doc where they disagree. All four were found by
live probing; the evidence is in `factory-v2-evidence/probe-pi-session.md`.

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
  so the fix cannot change what the Cursor runtime produces.

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

- **`--effort` is ignored on the pi path.** pi encodes it as a `:<thinking>`
  suffix on the model pattern; I did not guess at the values. The CLI still
  prints `effort=high`, which is now misleading on `--runtime pi`.
- **`workflow.ts:545` still hardcodes `runtime: 'cursor-sdk'`** in the lock.
  `cli.ts`'s run record was fixed; the lock's was not, because it sits outside
  the seam. Not read by any skip predicate, so it is cosmetic.
- **`modelId()` returns the full slug** (`openrouter/openai/gpt-5.6-sol`) on the
  pi path, so locks written under pi will not match Cursor-era locks. Expected —
  all 16 go cold at cutover — but it means you cannot mix runtimes across a
  guide's history without `--force`.
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
2. ~~**`resolve-issue.ts`**~~ — **done** in `ce2106b`. Still needs the
   replay validation described under "Your task"; only its unit tests have run.
3. **Lock scheme** (§9 Stage 5) — `prompt_digest` over the rendered prompt with
   `NOW` stripped. Two regression tests: two runs differing only in `NOW` produce
   an identical `input_digest`, and editing a prompt builder *does* change it.
4. **Cutover** — flip the default, delete `runtime.ts`/`json.ts`, drop
   `@cursor/sdk`.
5. **CI** (§9 Stage 6) — swap the secret on both steps of `guide-draft.yml`
   (`:88` distill, `:119` draft), mint a spend-capped disposable key per run,
   then delete `CURSOR_API_KEY` everywhere. **When this merges, the goal is met.**

The full blast radius for that last step, **as of `ce2106b`**. The prose is the
part that gets missed — `README.md` was absent from the earlier version of this
list:

| Where | Lines |
| --- | --- |
| `pipeline/src/runtime.ts` | `1` (import) |
| `pipeline/src/factory/cmd-distill.ts` | `26` (pre-flight gate) — **currently broken, see "Your task"** |
| `pipeline/src/cli.ts` | `250` (key selection), `45`, `55` (usage text) |
| `pipeline/package.json` | `17` + lockfile |
| `.github/workflows/guide-draft.yml` | `88`, `119` — **`:88` currently broken** |
| `FACTORY.md` | `18`, `106` |
| `README.md` | `30` |
| `mise.toml` | `23` (comment; `18` also says "via the Cursor SDK") |

Plus GitHub repo secrets themselves. The `resolve-issue.ts` rows are gone —
`ce2106b` cleared them.

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
file (`:69`, `:81`) and uses the code only inside a failure message (`:63`). So
the exit-table change above alters which message reaches the issue, not control
flow. `resolve-issue.ts` also gained an `isCliEntry()` guard so the test file can
import `distill` without the CLI running and calling `process.exit`; the house
idiom would be a `-cli.ts` split, which needs `package.json` and
`cmd-distill.ts:57` to move with it.

## Repo state

- Branch `worktree-sandcastle-factory`, worktree at
  `.claude/worktrees/sandcastle-factory`. `guides/google-calendar/` was restored
  after the test, so the committed guide is still the Cursor-generated reference.
- Tree is clean apart from `retro/runs/2026-07-31T14:58:27Z-*` (failed) and
  `…T15:07:07Z-*` (converged), the two run records from the generation test.
  Nothing under `retro/runs/` has ever been tracked, and it sits inside the
  tripwire allowlist, so leaving them costs nothing.
- `pipeline/node_modules` installed (164 packages, includes pinned pi).
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

1. **The prompt pastes without submitting** — the pane shows the text in the
   input box and the agent stays `idle`. Fix: `herdr agent send-keys <name> enter`.
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
