# Handoff — Factory v2, after Stage 1

> Supersedes the original handoff (see `git log FACTORY-V2-HANDOFF.md` for it).
> Paste everything below the line into a fresh session started in the
> `sandcastle-factory` worktree.

---

## Where this stands

**Stage 1 is done and committed.** `--runtime pi` exists, drives all four phases
against OpenRouter, and has been exercised on a real guide. Three commits:

| Commit | What |
| --- | --- |
| `e9dd912` | The design (`FACTORY-V2.md`) plus nine research reports |
| `50fb40c` | The pi runtime behind `--runtime`, tests 34 → 85 |
| `62fefe0` | Per-phase tool-call logging |

Tests 87/87, `npm run typecheck` clean, 18/18 guides lint clean, tree clean.

**The `CURSOR_API_KEY` goal is NOT met yet.** `--runtime cursor` is still the
default, `resolve-issue.ts` still imports `@cursor/sdk`, and `cmd-distill.ts`
still gates on the key. That is Stages 4 and 6.

## Your task

Run the generation test that actually exercises drafting, then read the result.

```bash
cd pipeline
# 1. Confirm the comparison is still apples-to-apples (must print PASS)
./node_modules/.bin/tsx tools/check12.ts

# 2. Force the FRESH-DRAFT path — this is the whole point, see below
rm -f ../guides/google-calendar/{research.md,meta.yaml,external.md,speakeasy.md}

# 3. Run it. ~$5, ~10-30 min. Model held at gpt-5.6-sol to isolate the runtime.
mise exec -- npm run draft-guide -- google-calendar \
  --runtime pi --model openai/gpt-5.6-sol --force --persona it-admin

# 4. Compare against the 7 pure-bot reference guides
./node_modules/.bin/tsx tools/envelope.ts ../guides/google-calendar
```

Then the deterministic gates: `lintGuide` clean, `meta.yaml` schema-valid,
anchors resolve, scope-gate verdict unchanged. Then **read the guide** — checks
5–14 are all structural and none of them can tell you it is correct.

**Restore with `git checkout -- guides/google-calendar/` when done.** That
directory is one of the seven reference guides; do not commit a regenerated
version over it without deciding to.

## The one thing to watch

**Does research actually fetch the web?** pi ships no web-fetch tool, so
research reaches the internet only through `bash` + `curl`. Cursor had a
purpose-built fetch tool. This is the single largest open risk in the migration
and the fresh-draft run is what measures it.

`62fefe0` added the instrument. Each phase now logs `tools: read=12 bash=3`.
After the run:

```bash
grep 'tools:' <run log>
```

If the research phase shows few or no `bash` calls, the dossier came from the
model's memory rather than from fetched sources — which breaks I1 (the dossier
is the fact ceiling) no matter how good the prose looks.

Related, unresolved: in the aborted run, research bumped ~20 `observed_at`
timestamps to today in 76 seconds. If it did not re-fetch those pages, the guide
asserts provenance it never verified. Worth checking deliberately.

## Corrections to `FACTORY-V2.md` — it is wrong in four places

Trust this file over the design doc where they disagree. All four were found by
live probing; the evidence is in `factory-v2-evidence/probe-pi-session.md`.

**1. `--no-session` cannot be used.** The design mandates it. It is mutually
exclusive with remediation: with `--no-session`, turn 2 starts a fresh
conversation and the agent redoes all its research, which is the exact failure
the remediation contract exists to prevent. The fix in `runtime-pi.ts` is a
per-call `--session <path>` in a temp dir — the same flag creates the file on
turn 1 and resumes it on turn 2. Verified live: turn 2 recalled a fact from
turn 1. Deleted in a `finally`, so no unbounded `~/.pi` growth either.

**2. Dropping `bash` disables research; it does not tighten it.** §6.1 claims
`--tools read,edit,write,grep,find,ls` "costs nothing". pi has no web-fetch tool
on 0.57.1 or 0.83.0, and `doctrine/roles/technical-research.md:32` has the agent
fetching provider docs. `bash` is its only route out. `toolsForPhase()` now
scopes tools per phase instead: reviewers and the judge get read-only, draft and
revise get writes without `bash`, research keeps `bash`. Still narrower than the
Cursor runtime everywhere except research.

**3. Stage 5b as written does not test drafting.** "Re-run `google-calendar`"
reads like a fresh draft but is not one: `researchPrompt` sees a prior dossier
and takes the *revise* path. A re-run produced only timestamp churn plus one
prose edit — a fine result for the "near-zero churn on unchanged inputs" check,
and useless for judging draft quality. Hence the `rm` in step 2 above.

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
| `pipeline/tools/*.ts` | check12, envelope, smoke-pi (not typechecked; outside `src`) |

Three design points worth not re-deriving:

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

## What is left

Stages 2–6 from `FACTORY-V2.md` §9, reinterpreted now that the runtime is
whole-swap rather than per-phase:

1. **Validate drafting quality** — the run above. Everything downstream is
   pointless if a `curl`-fed dossier is materially worse.
2. **`resolve-issue.ts`** — the second `@cursor/sdk` import. One-shot
   classification, no files, no tools; a direct OpenRouter call (~30 lines).
   Validate by replaying 10 past labelled issues; slug and persona must match.
3. **Lock scheme** (§9 Stage 5) — `prompt_digest` over the rendered prompt with
   `NOW` stripped. Two regression tests: two runs differing only in `NOW` produce
   an identical `input_digest`, and editing a prompt builder *does* change it.
4. **Cutover** — flip the default, delete `runtime.ts`/`json.ts`, drop
   `@cursor/sdk`.
5. **CI** (§9 Stage 6) — swap the secret on both steps of `guide-draft.yml`
   (`:88` distill, `:119` draft), mint a spend-capped disposable key per run,
   delete `CURSOR_API_KEY` from repo secrets and `FACTORY.md`. **When this
   merges, the goal is met.**

## Repo state

- Branch `worktree-sandcastle-factory`, worktree at
  `.claude/worktrees/sandcastle-factory`, tree clean.
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

Three gotchas, all hit in the last session:

1. **The prompt pastes without submitting** — the pane shows `[Pasted text #1]`.
   Fix: `herdr agent send-keys <name> enter`.
2. **Long output is unreadable from the pane** (alternate screen; scrollback
   cannot recover it). Ask workers to **write a Markdown report to a file and
   reply with only that path**.
3. **Workers block on permission prompts**, and `herdr agent send-keys` may
   itself be denied by the permission classifier — auto-approving another
   agent's prompts looks like a bypass. Ask the user to put workers in auto mode
   instead of building an approver loop.

Use descriptive role names (`seam-mapper`, `pi-prober`), never "agent A/B/C".
Close panes you created when done; leave others alone.
