# Factory v2 — pi + OpenRouter

Proposal. Replaces the `@cursor/sdk` runtime under `pipeline/` and moves model
access to OpenRouter. Nothing in `doctrine/` changes.

Status: **design, not approved.** Three of four prototype gates ran on
2026-07-30 and passed; see [Gate results](#gate-results--run-2026-07-30).

**Sandcastle was evaluated and rejected** — it is a git-worktree-and-container
harness, and on the one path this design would use it (`run()` + `noSandbox()` +
`head`) it blocks two tightenings we want while adding an unpinned CLI contract.
Sections 1–7 still describe it, because understanding what it does is what
produced the decision; §6.1 is the decision itself. The runtime is a direct
`spawn` of the pi CLI.

## Start here (handoff, 2026-07-30)

**Nothing has been implemented.** No pipeline code has changed; `runtime.ts` is
untouched. What exists is this design plus the evidence behind it in
`factory-v2-evidence/`.

Settled, with evidence — do not re-litigate without reading the linked report:

| Question | Answer | Evidence |
| --- | --- | --- |
| Can we drop `CURSOR_API_KEY`? | Yes — pi + OpenRouter works end to end | `probe-pi.md` |
| Can `@cursor/sdk` use an OpenRouter key? | No — one credential env var, no `baseUrl` | §0 below |
| Use Sandcastle as the harness? | **No** — blocks `--tools` and `--no-session` | `probe-sandcastle.md`, §6.1 |
| Use `@openrouter/agent`? | **No** — no filesystem tools at all | `probe-orsdk.md`, §0 |
| So what is the runtime? | A direct `spawn` of the `pi` CLI, replacing `runtime.ts` | §6.1, §8 |

Next actions, in order: Stages 2–4 (build the adapter), then Stage 5b
(regression). Definition of done is below — an implementation is not finished
until every box is checked.

## Definition of done

Each is mechanically checkable. Run from the repo root unless noted.

**Goal met (the point of the whole exercise)**

1. `grep -rn 'CURSOR_API_KEY\|@cursor/sdk' pipeline/src .github/workflows` returns
   nothing.
2. `@cursor/sdk` is gone from `pipeline/package.json` and the lockfile.
3. `CURSOR_API_KEY` deleted from repo secrets, and from `FACTORY.md`.
4. A full run completes with only `OPENROUTER_API_KEY` present in the
   environment.

**No regression in the deterministic checks**

5. `cd pipeline && npm test` — was 34/34 passing on 2026-07-30; must be ≥ that,
   plus new adapter tests.
6. `cd pipeline && npx tsx src/lint-guide-cli.ts <all 18 slugs>` — all `ok`,
   exit 0. This was verified green on 2026-07-30, so any failure is a
   regression, not pre-existing debt.
7. `cd pipeline && npm run typecheck` clean.

**Error handling — the failure modes the probes found (§Gate results, finding 2)**

8. Missing `OPENROUTER_API_KEY` → the run fails loudly. It must **not** be
   reported as an empty success. (pi: exit 1 + stderr stack trace.)
9. An invalid model slug → the run fails loudly, **despite pi exiting 0**. The
   adapter must inspect `stopReason` / `errorMessage` inside the stream. This is
   the single most likely silent-corruption bug; it needs a dedicated test.
10. A malformed/missing JSON result → the existing remediation path fires
    (one in-conversation follow-up), and a still-invalid second result fails the
    phase rather than writing junk.
11. Result parsing keys off `type === "agent_end"`, never stream position — with
    a test, since 0.83.0 appends a contentless `agent_settled` line.

**Output comparison vs. the Cursor era (Stage 5b)**

12. Re-verify `google-calendar`'s recorded input digests still match the working
    tree before comparing (all four steps' `reading_list` entries). A doctrine
    edit since 2026-07-30 invalidates the comparison.
13. Re-run `google-calendar` **with the model held at `gpt-5.6-sol`** so the
    runtime is the only variable. Then require: `lintGuide` clean, `meta.yaml`
    schema-valid, anchors resolve, scope-gate verdict unchanged.
14. Output sits inside the envelope of the 7 pure-bot reference guides
    (`google-calendar`, `google-docs`, `google-drive`, `google-people`,
    `google-sheets`, `google-slides`, `x-docs`) on length, section structure,
    anchor count, setup-step count. Outside the envelope is a flag for a human,
    not an automatic failure.
15. **A human reads the regenerated guide.** Checks 5–14 are all structural;
    none of them can tell you the guide is *correct*. Do not report success on
    mechanical checks alone.

**Invariants that must survive (`doctrine/constitution.md`)**

16. I7 — the agent never commits or pushes; writes stay within
    `guides/<slug>/`. With no container this is enforced by the
    `git status --porcelain` tripwire (§4), which is load-bearing, not optional.
17. Secrets are not handed to the agent. `noSandbox`-style execution inherits the
    caller's whole environment, so the adapter must build an **explicit** env
    rather than passing `process.env` through — `PULSE_REGISTRY_KEY`,
    `GH_TOKEN`, `AGENT_PAT` must not reach it.
18. Nothing under `doctrine/` changes (I8 — human-approved only).

**Known-open, not blockers**

19. Gate 3 (produce→extract on a real phase) was never run — it is now a test of
    our own phase shape and is covered by check 13.
20. Drafting *quality* under cheaper per-phase models (§7 routing) is untested
    and deliberately out of scope until check 13 passes at `gpt-5.6-sol`.

## 0. Goal, and what follows from it

**The problem being solved is dependence on `CURSOR_API_KEY`.** Everything else
here is optional and should be sequenced accordingly.

That has one consequence worth stating up front, because it inverts a
recommendation that would otherwise look obvious:

> **Running without a container is not a regression.** Today's Cursor agent runs
> with `local.cwd = repoRoot`, full file access, no sandbox, no tool allowlist
> (`runtime.ts:87-96`). Running pi uncontained is *at worst parity* with that.
> Containers are a genuine upgrade to I7 enforcement — but they are a **separate
> project**, and putting them on the critical path drags in a GHCR image build,
> UID alignment, network egress policy, and a per-job image pull for a goal that
> does not require any of it.

> **Updated after the 2026-07-30 gates:** "parity" now understates it. Because
> the direct-spawn path can pass `--tools read,edit,write,grep,find,ls`, dropping
> `bash`, Phase 1 ends up *narrower* than what runs today — see §6.1. That
> allowlist is not expressible through Sandcastle, which is part of why
> Sandcastle was rejected.

So the split is:

| Phase | Buys | Requires |
| --- | --- | --- |
| **1 — provider swap** | no more Cursor key; per-phase model routing; hard spend cap; `bash` dropped from the toolset | pi + OpenRouter, direct `spawn`, no container |
| **2 — isolation** *(optional, later)* | I7 as an enforced boundary, not prompt text | Docker, GHCR, UID alignment |

Sections 2–8 describe the end state. Phase 1 is the subset that removes the
Cursor dependency; §9 sequences it.

### Three alternatives, all closed

**"Use OpenRouter's own agent SDK."** `@openrouter/agent` 0.8.0 is real, official
(`OpenRouterTeam`, Apache-2.0), and **not a coding agent**. Probed 2026-07-30:

- Its shipped code imports **nothing** from `node:fs`, `node:path`, or
  `node:child_process`. No `read_file`, `write_file`, `edit`, `glob`, `grep`, or
  `bash`; no workspace concept, so no equivalent of `local.cwd = repoRoot`. The
  only named tools are three *server-executed* ones (`web_search`,
  `image_generation`, `file_search` — the last is vector-store RAG, not disk).
- The correct comparison is the Vercel AI SDK, not Cursor. It orchestrates a
  tool loop; the tools are yours to write. A minimal `read/write/edit/glob` +
  path-escape guard typechecked at 82 lines, but that is a floor, not a usable
  coding agent — no ripgrep, no ranged reads or truncation, no `.gitignore`
  respect, no `bash`. Realistically 300–600 lines **plus permanent ownership of
  coding-agent tool quality**, tuned continuously against model behaviour.
- Note `local.cwd = repoRoot` is one config line in `@cursor/sdk`; here it
  becomes a `safe()` guard every tool must remember to call — a
  security-relevant invariant you own and can silently break.
- Maturity flag: 0.8.0 ships pinned to `@openrouter/sdk ^0.13.7`, a line that
  ended 2026-07-20 when 1.0.0 shipped — the agent released two days *after* that
  cutover, still on the dead major. Breaking changes land in minors (0.8.0
  flipped a default that adds an extra model request per run).

So it does not remove the Cursor dependency; it removes the Cursor dependency
*and* commits us to building the part Cursor was providing. **Rejected.**

Reconsider only if OpenRouter ships a first-party filesystem/bash toolset —
everything else about it maps well, and that one addition would flip the verdict.

**One win worth harvesting regardless.** OpenRouter's API supports
server-enforced `text.format` json_schema **simultaneously with tool use** —
verified live. That is a property of the *API*, not of `@openrouter/agent`, so
it is available on the pi path too. If pi exposes a response-format passthrough,
`extractJson` and the `withSchemaHint`/`SCHEMA_HINTS` prose (~165 lines, §8) can
be deleted outright, along with the whole class of "model wrapped it in ```json
fences" failures. Worth checking during Stage 2.

### Two further alternatives, also closed

**"Point `@cursor/sdk` at OpenRouter."** Not possible. Checked against the
installed 1.0.24 under `pipeline/node_modules/@cursor/sdk/dist/esm`:

- Exactly one credential env var is read — `CURSOR_API_KEY`, at 6 sites. No
  `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` anywhere.
- `AgentOptions` (`options.d.ts:218-241`) offers `apiKey` and
  `model: { id, params }` — no `baseUrl`, no provider selector.
  `configureCursorSdk` (`sdk-config.d.ts`) exposes only `local.store` and
  `useHttp1ForAgent`.
- `baseUrl` exists only on internals (`CloudApiClient` ctor,
  `ConnectTransportSeamOptions`) and is never reachable from the public API.
- `CURSOR_BACKEND_URL` is not an escape hatch: it defaults to
  `https://api2.cursor.sh` / `https://api.cursor.com` and speaks Cursor's
  Connect-RPC protocol, not an OpenAI-compatible one.
- Local agents are not offline. `exchangeApiKeyForAccessToken(apiKey, baseUrl)`
  trades the key for an access token, and `Cursor.models.list()` is documented
  as a cloud-only catalog call that falls back to `CURSOR_API_KEY`
  (`agent.d.ts:151-153`).

Cursor's BYOK is an editor setting that redirects token *billing*; it layers on
top of Cursor auth rather than replacing it. Two keys, not zero.

**"Just call OpenRouter directly instead of running an agent."** Also no — the
phases write files. `runtime.ts:87-96` creates an agent with `local.cwd =
repoRoot`, and every phase postcondition is a file on disk (`lock.ts:38`
`missingResearchOutputs`, the draft's `guides/<slug>/**`). A chat completion
returns text; something has to hold the read/write/glob/grep/bash loop. The only
exception is **distill**, which produces a slug and a title and nothing else —
it should become a plain OpenRouter call (§9, Stage 1).

So the real question Phase 1 answers is narrow: **which OpenRouter-speaking
coding CLI replaces the Cursor cloud agent, and how is it invoked.** Sandcastle
is one answer to the second half only.

---

## 1. The reframe

Sandcastle is **not an agent framework**. It is a git-worktree-and-container
harness for CLI coding agents. Verified against npm (`@ai-hero/sandcastle`
0.12.0, MIT):

- One runtime dependency: `@clack/prompts`. **No model client of any kind** — no
  Vercel AI SDK, no Anthropic SDK, no HTTP client.
- `pi("model")` / `claudeCode("model")` build a shell command and pipe the prompt
  to stdin. The model argument is spliced into the CLI's `--model` flag.
- No tool system, no workflow engine, no durable execution, no concurrency
  primitives. Composition is plain TypeScript in a script you own.

Its ubiquitous-language doc calls the pattern what it is — a productised,
sandboxed Ralph loop. The abstraction it sells: *put an agent CLI in a box, hand
it a branch, get commits back.*

So the two asks are **complementary, not competing**:

| Layer | Today | v2 |
| --- | --- | --- |
| Execution substrate | `@cursor/sdk` cloud agent, `local.cwd = repoRoot` | Sandcastle: `pi` CLI in a Docker container, repo bind-mounted |
| Model source | Cursor plan tokens (`gpt-5.6-sol`) | OpenRouter, per phase |
| Orchestration | `workflow.ts`, 1735 lines | Same phases, plain TS |
| Structured output | `extractJson` + `safeParse` + schema-hint prose | `Output.object({tag, schema, maxRetries})` |
| Domain logic | lint · scope gate · lock digests · doctrine | **unchanged** |

### What this actually buys

In Phase 1 order — the first three are the goal, the rest are why the shape is
worth keeping:

1. **No `CURSOR_API_KEY`.** One secret, on one vendor, replaced by an OpenRouter
   key you mint and revoke per run.
2. **A hard spend cap**, server-side, which Cursor plan tokens do not offer.
3. **Per-phase model choice.** Cross-family review — the fidelity reviewer stops
   sharing a tokenizer, a post-training run, and a house style with the drafter.
4. **Structured output with schema-aware retry**, deleting `json.ts` and
   `runtime.ts`'s parse/validate path.
5. **Prompts can become files**, which kills `PROMPT_TEMPLATES` (`lock.ts:100-158`) —
   a hand-maintained shadow copy that nothing verifies. Editing `researchPrompt()`
   today silently leaves the lock skipping work whose prompt changed. (Stage 7;
   the lock fix in Stage 5 closes the hole regardless.)
6. **A real I7 boundary** — *Phase 2 only.* Today "agents write only inside
   `guides/<slug>/`" is prompt text; containment is `cmd-git.ts:69-78` silently
   discarding stray writes. A container makes it enforceable. Not needed to remove
   the Cursor key.

### What it does not buy

- **No durable execution.** `pipeline.lock.json` already *is* our resume
  mechanism. It stays.
- **No provider-error retry** — explicitly out of scope upstream ("Sandcastle
  fails fast on provider errors"). We own that. We have zero LLM retries today,
  so this is not a regression, but OpenRouter adds a routing layer with its own
  429/5xx modes and nothing between it and `main.ts` will retry any of them.
- **No cost accounting.** Raw token counts only.

---

## 2. Agent provider: `pi`, not `claudeCode`

Sandcastle ships six providers. Only three are resumable (`claudeCode`, `codex`,
`pi`) — and resumability is what makes `Output.maxRetries` work at all;
`opencode`/`cursor`/`copilot` **throw at entry** if retries are requested.

Of the three resumable providers, **`pi` is the only one where OpenRouter is a
first-class documented integration**: reads `OPENROUTER_API_KEY`, base
`https://openrouter.ai/api/v1`, `provider/model` slugs.

The `claudeCode` + `ANTHROPIC_BASE_URL` path works but is a trap here:

- Anthropic documents that they *"[don't] support routing Claude Code to
  non-Claude models through any gateway"* — forfeiting the main reason to want
  OpenRouter.
- Claude Code's gateway model discovery filters to ids starting `claude` or
  `anthropic`. Of OpenRouter's 364 live models, **26 survive**.
- Claude Code sends `thinking: {"type":"adaptive"}` for any model name it doesn't
  recognise, and the documented fix (`_SUPPORTED_CAPABILITIES`) explicitly *does
  not apply* behind `ANTHROPIC_BASE_URL`. No escape hatch.
- `POST /api/v1/messages/count_tokens` 404s on OpenRouter (verified by probe), so
  context accounting degrades silently to local estimation.

**Risk on the `pi` path:** Sandcastle's session-resume support was verified
against `@mariozechner/pi-coding-agent` **0.73.1**; pi has since been renamed to
`@earendil-works/pi-coding-agent`, now **0.83.0**. Pin the version and re-verify
resume. This is [check 1](#kill-criteria).

---

## 3. Phase shape: produce, then extract

**Do not combine file work and tag emission in one run.** Sandcastle's own four
first-party workflows all split them (`.sandcastle/agent-workflows/shared/run-with-extraction.ts`),
and every `extraction.md` opens with *"Do not change files. Do not run commands."*

The reason is structural: a long tool-using `--print` turn ends with a `result`
message that is whatever the model chose to summarise with. Asking it to also be
a strict JSON payload after 40 tool calls is the failure mode `maxRetries` exists
to paper over — and each retry is a resumed turn, so you pay context twice.

| Phase | Writes files? | Shape |
| --- | --- | --- |
| research (gather → synthesize) | yes | produce → extract |
| draft | yes | produce → extract |
| revise | yes | produce → extract |
| research-judge | no | single run + `output` |
| review:fidelity | no | single run + `output` |
| review:achievability | no | single run + `output` |

Cost: one cheap resumed turn on three of six phases. Benefit: the extraction turn
is exactly where the filesystem postcondition gets asserted, collapsing extraction
and remediation into one mechanism.

### The remediation contract survives

Requirement: `status:"ok"` is a lie unless the files exist; the agent gets exactly
one in-conversation follow-up before failing.

`resume()` accepts `output` (`RunOptions.output` is not in the `Omit` list) and
hardcodes `maxIterations: 1`, satisfying both entry checks. So:

```ts
const produced = await run({ ...opts, promptFile: 'prompts/research.md', promptArgs })
const missing = missingResearchOutputs(dir)          // lock.ts:38 — unchanged
const report = await produced.resume!(
  extractionPrompt(missing),                          // inline; must contain <result>
  { output: Output.object({ tag: 'result', schema: PhaseResult, maxRetries: 2 }) },
)
```

Two constraints to design around, not discover:

- **`resume()` forces the prompt inline**, and inline prompts get no `{{KEY}}`
  substitution (ADR-0008). The three remediation/extraction prompts stay as TS
  template literals. "Move all prompts to files" is ~70% achievable, not 100% —
  which is fine, since those prompts embed a computed `missing[]` list.
- **`Output.maxRetries` is not the remediation.** It fires on
  `StructuredOutputError` (malformed JSON / schema miss). Our remediation fires on
  a *valid* report whose filesystem postcondition is false. Different triggers.
  We need both.

---

## 4. Prompts as files

```
.sandcastle/
  Dockerfile
  prompts/
    research-fresh.md      research-revise.md
    draft-new.md           draft-revise.md
    review-fidelity.md     review-achievability.md
    revise.md              revise-salvage.md
    research-judge.md
```

`promptArgs` is `Record<string, string | number | boolean>` — no objects, no
arrays, **and no conditional syntax**. A placeholder with no matching arg is a
hard error. So the five structural conditionals in today's builders (`hasPrior`,
`existing`, `prior`, the dimension line, the nits section) become **separate
prompt files**. Bonus: file identity now encodes the variant, which deletes
`PROMPT_TEMPLATES.draft(existing)` (`lock.ts:116-138`).

Findings blobs (`PRIOR_ROUND_JSON`, `BLOCKER_FINDINGS_JSON`) stay `JSON.stringify`'d
into a single arg. That's fine — but it means the string concatenation moved, it
didn't disappear.

### Injection: the hazard has shifted

The `` !`cmd` `` expansion risk *via `promptArgs`* **is fixed** (CHANGELOG
`6bc4d74`): arg values are marked inert with a `\x01` sentinel before
substitution, sentinels are stripped from both template and args so they can't be
forged, and substitution is single-pass. Issue text containing `{{`, backticks,
`$()` or `;rm -rf` is safe as an arg value, unescaped.

Three consequences:

- **Pin `@ai-hero/sandcastle` at or above the fixing release** and add a
  regression test: notes containing `` !`id` `` must appear verbatim in the
  resolved prompt. This is a security property enforced by a sentinel, not by
  types.
- **Never write `` !`cmd` `` into a prompt file.** Template-authored blocks still
  execute, a failed expansion aborts the run with no retry (30 s timeout), and
  under parallel guides that is a contention case.
- `{{ gram.oauth.callback_url }}` is safe — the placeholder grammar is
  identifier-only and dots don't match. Worth a test to lock in.

**The risk that remains is larger than before.** Distill embeds the issue title,
body, and *every comment*; the `Decision N:` flow means arbitrary GitHub users'
text becomes agent instructions. Under Cursor that drove a `cwd`-scoped agent.
Under Sandcastle + `head` + `--dangerously-skip-permissions` (hardcoded in
`Orchestrator.ts:142-144` for the `run()` path) it drives an agent with write
access to the entire mounted repo — including `doctrine/` (I8),
`.github/workflows/`, and `.sandcastle/prompts/` itself.

**Mitigation (new, and the design depends on it):** a post-run tripwire asserting
`git status --porcelain` shows changes only under `guides/<slug>/` and
`retro/runs/`. Fail the phase otherwise. This turns I7 from prose into a test.

---

## 5. Concurrency — serialize

Today: `parallel()` runs both review dimensions per guide, `pipeline()` runs all
guides. Under Sandcastle every `run()` is its own container, so peak is **N + 2N
containers bind-mounting one host directory.**

`branchStrategy: {type:"head"}` is the right choice — it sidesteps the two open
worktree-corruption bugs (#849, #854) by creating no worktree at all. But head
has **no locking of any kind**: ADR-0007 excludes it from `WorktreeManager`'s
purview, and ADR-0018 states head is unsafe for concurrent fan-out.

"Reviewers write nothing and guides are disjoint" is not sufficient:

| Shared path | Problem |
| --- | --- |
| `.git/index`, `.git/index.lock` | `git status` *writes* the index; Claude-style agents run it unprompted. N containers → lock contention → spurious agent-visible git failures. Our prompts only forbid commit/push. |
| `.claude/` | Agents write settings/todo/shell-snapshot files; `.claude/skills/` is doctrine-adjacent (I8). |
| `pipeline/node_modules` | Issue #745: container-side installs write Linux-arch binaries into the shared tree, corrupting the *host* toolchain on macOS. **Never add an `npm ci` `onSandboxReady` hook**, which the upstream README recommends in four places. |
| `~/.npm` | `technical-research.md:40` instructs the agent to run `npx --yes ajv-cli`. Verify HOME is container-local. |
| `guides/<slug>/` | Genuinely disjoint ✅ |

**Decision: CLI concurrency 1 across guides for v1.** Keep the 2-reviewer fan-out
only after measuring `git status` races.

This costs almost nothing, because **the factory is already serialized per issue**
(`guide-draft.yml:12-14`, `concurrency: guide-draft-issue-<n>`), and each issue
gets its own runner. The concurrency exposure is almost entirely the local
multi-guide CLI path — so fix it by policy, not architecture.

---

## 6. Sandbox: `noSandbox()` now, `docker()` later

### Phase 1 — `noSandbox()`

Parity with today (see §0). No image, no registry, no UID alignment, no egress
policy. CI installs pi with `npm i -g`, and the workflow change is one secret
swap.

**One thing must be tested first**, because the source contradicts the docs:
`no-sandbox.ts:9-11` and ADR-0015 say `noSandbox()` does *not* pass
`--dangerously-skip-permissions`, but `Orchestrator.ts:142-144` hardcodes it
`true` for the `run()` path. If the docs are stale, the agent can write files and
we have parity. If the docs are right, the agent cannot write files under
`--print` and every phase fails its postcondition. That is
[kill criterion 4](#kill-criteria), and it is a 30-minute check.

Because there is no container, the `git status --porcelain` tripwire (§4) is doing
*all* the I7 work in Phase 1. Build it in Stage 3, not later.

### Phase 2 — `docker()`, if and when isolation is worth it

`ubuntu-latest` has Docker and `guide-draft.yml` runs steps directly on the runner
(no job `container:`), so `docker()` works in CI when you want it. Note the
asymmetry trap: **do not** run `docker()` locally and `noSandbox()` in CI. That
puts the weaker boundary exactly where untrusted issue text arrives. Pick one per
environment and keep them the same.

Costs to plan for when Phase 2 happens:

- **No prebuilt image.** Build once, push to GHCR from a separate workflow, pull
  in `guide-draft.yml`. Otherwise a per-job image build on a job already at
  `timeout-minutes: 180`.
- **Image contents:** `pi`, node, git, `gh`, `npx ajv-cli`, and **network egress
  to arbitrary vendor documentation** — research fetches provider docs, so a
  locked-down network breaks the product.
- **UID alignment.** Sandcastle passes host UID/GID as build args (ADR-0014).
  GitHub runners are `runner` (uid 1001), not 1000. Get this wrong and
  agent-written files are root-owned and `factory commit-push` fails.
- **Secrets:** `PULSE_REGISTRY_KEY`/`PULSE_REGISTRY_TENANT` are read by the
  *orchestrator* (`pulse-catalog.ts:138-140`), not the agent. They must stay on
  the host process and **must not** be forwarded into the container. Same for
  `GH_TOKEN`.

---

## 7. Model routing

Cross-family by design: the fidelity reviewer must not share a family with the
drafter, and achievability sits on a third family so one family-level blind spot
can't take out both reviews.

| Phase | Model | Effort | Why |
| --- | --- | --- | --- |
| distill | `google/gemini-3.1-flash-lite` | low | Slug + persona from an issue body. Classification. |
| research — gather | `openai/gpt-5.6-terra` | medium | The loop is the budget. Tool dispatch is not reasoning-bound. |
| research — synthesize | `anthropic/claude-opus-5` | high | The dossier is the fact ceiling (I1). One expensive call, correctly placed. |
| research-judge | `openai/gpt-5.6-luna` | low | Binary materiality classification. |
| draft | `anthropic/claude-opus-5` | high | Long-form persona prose over a 15k dossier. |
| review:fidelity | `openai/gpt-5.6-sol` | high | **Different family from the drafter.** |
| review:achievability | `google/gemini-3.6-flash` | medium | **Third family.** Persona simulation. |
| revise | `anthropic/claude-sonnet-5` | medium | Mechanical execution against a findings list. |

**Splitting research into gather + synthesize is the highest-leverage change in
this document**, worth more than any model choice. An agent loop re-sends the
whole conversation each turn; 45 web fetches at ~3k tokens each bills
`Σ(20k + 3k·(i−1)) ≈ 3.87M` input tokens for that one phase — more than all 17
other calls combined. On Opus 5 that's $19.35; on Terra it's $3.87.

### Cost

| Variant | $/run | Note |
| --- | --- | --- |
| **Balanced (recommended)** | **~$5.22** | 7 models, cross-family review |
| Cheap | $1.42 | **don't ship this on `review:fidelity`** |
| Cheap + Sol on fidelity | ~$2.47 | best value/risk point |
| Premium | $9.95 | $3.17 of it wasted on flagship gather |
| Cursor, all Sonnet 5 @ list | $5.94 | Pro includes ~3.4 runs/month |

**Do not justify this migration on per-token price.** Opus 5 is $5/$25 on both
Cursor and OpenRouter; Sonnet 5's 33% OpenRouter edge is erased by Cursor's promo
through Aug 2026. The real wins are per-phase routing to $0.10–$0.25/M models for
distill/judge/achievability, and a hard spend cap. **Below ~3 guides/month,
Cursor Pro is effectively free and this migration saves nothing.**

> **Caveat that the cost model cannot fully cover.** Those figures assume we
> control request bodies — rolling `cache_control` breakpoints, `session_id`
> sticky routing, `provider.order`, `max_price`, `seed`. Driving a CLI in a box
> forfeits all of that: **pi owns the request bodies, not us.** We keep per-phase
> model choice and the server-side spend cap; we lose per-request tuning. Budget
> $5–9/run and cap at $12 rather than trusting the point estimate. This is the
> real price of the Sandcastle architecture, and it is worth paying only because
> the research phase needs a genuine agent loop with web tools that we would
> otherwise have to build and maintain ourselves.

### Spend cap

The one layer that cannot be exceeded is a **server-side per-key limit**:

1. Store only an OpenRouter **management key** as a CI secret.
2. At job start, `POST /api/v1/keys/` with `limit` ≈ 2.5× expected run cost.
3. Run all phases with the returned disposable key.
4. In a `finally`/`trap`: read `usage` for the run record, then `DELETE` the key.

Exhaustion returns **402**, which no other condition returns — cleanly
distinguishable. Treat it as fatal and non-retryable with a distinct exit code so
CI surfaces "budget exceeded", not "flaky". Trap: if the 402 lands *after*
streaming began, it arrives as an SSE event with `finish_reason: 'error'` under
HTTP 200 — check `finish_reason`, or a budget kill reads as a successful empty
phase.

### Reproducibility

Pin concrete slugs, never `~author/family-latest` ("versions can change at any
time"). Note **no Anthropic model on OpenRouter supports `seed`**, and
`claude-sonnet-5` doesn't accept `temperature` — so `draft` and `revise` can never
be bit-reproducible. Record `{agent, model, effort}` in the lock (today `effort`
is *not* in `modelId()`, so `--effort high → low` doesn't bust the lock — fix that
while we're here).

---

## 8. What changes in `pipeline/`

**Deleted**

| File / range | Lines | Replaced by |
| --- | --- | --- |
| `runtime.ts` | 182 | Sandcastle `run()` + `Output` |
| `json.ts` | 28 | `extractStructuredOutput` (fence-aware, last-match-wins — strictly better than our brace-slicing) |
| `workflow.ts` schema hints | ~100 | Standard Schema; the hand-mirrored JSON Schema copies go |
| `lock.ts:100-158` `PROMPT_TEMPLATES` | 59 | `digestRepoFile('.sandcastle/prompts/<file>.md')` |

**Unchanged — this is the product's judgment**

`doctrine/**` · `lint-guide.ts` (579) · `scope-gate.ts` (221) · `findings.ts` ·
`schema/**` · `pulse-catalog.ts` resolution precedence · `factory/**` (gh/git glue
is orthogonal) · outcome taxonomy and exit codes 0/2/3.

**Changed**

- `workflow.ts` — phases become `produce → extract`; prompt builders become
  prompt files plus an args bag.
- `lock.ts` — `prompt_digest` becomes `sha256(promptFileBytes ‖ canonicalize(promptArgs))`.

  ⚠️ **The single most likely way to silently break the cache:** `assign()`
  injects `NOW` (`workflow.ts:560`), the run timestamp. Today the template shadow
  strips it. If `OBSERVED_AT` enters the hashed arg set, *every run busts every
  digest and the lock stops skipping anything*. Explicit exclude-list, plus a test
  that two runs differing only in `NOW` produce identical `input_digest`.

  Same trap for notes: hash `lockNotes`, interpolate `catalogPromptNote` — that
  split (`workflow.ts:413` vs `457`) exists for a reason.

  The v1 schema is `additionalProperties: false` on both `step_inputs` and
  `params`, so `prompt_args` cannot be added as a field. Fold into `prompt_digest`
  and rewrite `doctrine/pipeline-lock.md:93-102` to match.

**Migration cost:** all **16** committed locks go cold on first contact — `model`
changes and `prompt_digest` changes scheme, so `canSkipStep` returns false. No
crash; just a full `draft` + both `review.*` re-run per guide, incurred lazily as
each guide is next touched. Don't use the `runtime` field as a migration signal:
`writeConvergedLock` only runs on converge, so non-converged guides keep a
`cursor-sdk` lock indefinitely.

---

## 9. Migration plan

### Principles

1. **Migrate on the existing seam.** Every LLM call goes through
   `rt.agent(prompt, opts)` (`runtime.ts:77`), and `@cursor/sdk` is imported in
   exactly two files (`runtime.ts:1`, `resolve-issue.ts:9`). A second runtime
   implementing the same interface means `workflow.ts` is untouched for most of
   the migration. This is a strangler fig, not a rewrite.
2. **Change one variable at a time.** Runtime, prompt format, phase shape, model
   routing, and the lock scheme are five independent changes. Shipping them
   together makes a quality regression unattributable.
3. **Take the lock out of play during validation.** Run with `--force` until
   cutover. Change the digest scheme exactly once.
4. **Keep Docker out of the bootstrap path.** `distill` runs before branch
   creation, guarded by the pure-`gh` bootstrap fallback
   (`guide-draft.yml:82-89`). It writes no files and needs no repo access — it
   should become a **direct OpenRouter call**, not a sandboxed agent.

### Stages

**Phase 1 — remove the Cursor dependency (stages 0–6).**
**Phase 2 — isolation and improvements (stages 7–8), separate projects.**

| # | Stage | Ships | Gate to proceed | Revert |
| --- | --- | --- | --- | --- |
| 0 | Prototype gates | nothing | all four kill criteria pass | n/a |
| 1 | Second runtime behind a flag | `runtime-pi.ts`, `--runtime` | typecheck + tests green on both paths | delete file |
| 2 | Read-only phases | reviewers + judge on pi | golden-guide replay matches | flip flag |
| 3 | Write phases | produce→extract, **tripwire** | replay converges, tripwire clean | flip flag |
| 4 | Distill | direct OpenRouter call | slug/persona match on 10 past issues | flip flag |
| 5 | Cutover | serialize, drop `@cursor/sdk`, new lock scheme | one guide end-to-end locally | revert commit |
| 6 | **CI — Cursor key gone** | secret swap, `npm i -g` pi, disposable key | one real issue end-to-end | revert workflow |
| 7 | Improvements | prompts→files, research split, model routing | per-change replay | independent |
| 8 | Isolation *(optional)* | `docker()`, GHCR image, UID alignment | one real issue end-to-end | revert workflow |

**Stage 6 is the finish line for the stated goal.** Stages 7–8 are separate calls
made later, on their own merits.

### Stage 0 — prototype gates

The three [kill criteria](#kill-criteria), in a throwaway directory. No changes to
this repo. Everything below assumes all three passed; if any fails, the design
changes shape.

### Stage 1 — a second runtime behind a flag

Add `pipeline/src/runtime-sandcastle.ts` exporting the **same
`createRuntime(cfg) → { log, agent, parallel, pipeline, modelId }`** shape.
`cli.ts` grows `--runtime cursor|sandcastle` (default `cursor`).

Crucially, use Sandcastle's **inline `prompt:`** here, not `promptFile`. Prompts
stay as TS template literals exactly as they are today. Inline prompts get no
`{{}}` substitution and no `` !`cmd` `` expansion — which at this stage is a
feature, not a limitation: zero new injection surface, zero prompt edits.

Only two real changes inside the seam:

- `schemaInstruction()` (`runtime.ts:55-69`) emits a `<result>` tag instruction
  instead of "end with a JSON object". `Output` requires the resolved prompt to
  literally contain the opening tag.
- The `remediation` callback (`runtime.ts:104-118`) calls `result.resume?.(followUp,
  { output })` instead of a second `handle.send()`. Same contract, same one
  follow-up.

`json.ts`, `extractJson`, and the `withSchemaHint` blocks stay in place, unused by
the new path. Nothing is deleted yet.

**Ship it when:** `npm run typecheck` and `npm test` pass, and
`--runtime sandcastle --force` completes one phase against a scratch guide.

### Stage 2 — port the read-only phases

`review:fidelity`, `review:achievability`, `research-change judge`. These write no
files, so there is no postcondition, no remediation, and no `git status` exposure
— the cheapest possible blast radius. Route per phase so the write phases stay on
Cursor.

**Validation — golden-guide replay.** Pick 3 converged guides. Re-run with
`--force` under both runtimes and compare, using `retro/runs/*.json`, which
already records `status`, `rounds`, `history`, `unresolved`, and `skipped`:

- Does it still converge, in the same number of rounds?
- Blocker/nit counts within noise, and are the *same* real defects found?
- Deterministic `lintGuide` findings identical — this one is a hard equality
  check, not a judgement call.

Artifacts will not be byte-equal; models are nondeterministic and Anthropic slugs
on OpenRouter support neither `seed` nor (for Sonnet 5) `temperature`. Compare
outcomes, not bytes.

### Stage 3 — port the write phases

`research`, `draft`, `revise`. This is where produce→extract lands (§3), along
with the two mechanisms that keep I7 honest:

- The existing `missingResearchOutputs` / `missingDraftOutputs` postcondition
  (`lock.ts:38,43`) — unchanged, now asserted in the extraction turn.
- **New:** the `git status --porcelain` tripwire. Changes outside
  `guides/<slug>/` and `retro/runs/` fail the phase. Write this as a unit test
  with a deliberately misbehaving stub agent before wiring it to the real one.

Same replay validation as Stage 2, now including `setup_churn` (a resumed run
with unchanged inputs should produce near-zero churn).

### Stage 4 — distill off the coding-agent path entirely

`resolve-issue.ts` is a one-shot classification: issue text plus two directory
listings in, `{slug, provider, persona, notes}` or `needs_clarification` out. It
touches no files and needs no repo.

Replace `Agent.prompt` with a direct OpenRouter call (`@openrouter/ai-sdk-provider`
+ `generateObject`, ~30 lines) rather than a Sandcastle run. This keeps Docker out
of the CI bootstrap path, keeps the `gh`-only failure fallback meaningful, and
removes the second `@cursor/sdk` import.

**Validation:** replay 10 past labelled issues; slug and persona must match what
shipped. This is cheap and unusually easy to check.

### Stage 5 — cutover

One commit, because these changes are entangled and all bust the cache:

- CLI concurrency 1 across guides (§5); keep the 2-reviewer fan-out.
- Delete `runtime.ts`, `json.ts`, the `withSchemaHint` duplication; drop
  `@cursor/sdk` and the `--runtime` flag.
- **Lock scheme, changed exactly once.**

  `prompt_digest` becomes a digest of the **actual rendered prompt with declared
  volatile fields stripped** — not of a shadow template, and not of a prompt file.
  Chosen deliberately so that Stage 7's move to prompt files needs *no further
  lock change*: same rendered prompt, different source.

  Strip: the run timestamp `NOW` (`workflow.ts:560`), absolute `repoRoot` paths
  (today's digest is repo-relative for portability — the rendered prompt is not),
  and the catalog prompt note, which maps to the stable catalog token
  (`workflow.ts:413` vs `457`).

  Also record model identity as `{agent, model, effort}` — `effort` is missing
  from `modelId()` today, so `--effort high → low` doesn't bust the lock.

  Two regression tests, both cheap and both load-bearing: two runs differing only
  in `NOW` produce an identical `input_digest`; and editing a prompt builder *does*
  change it. That second test is the one that never existed and is why
  `PROMPT_TEMPLATES` could silently drift.

- Rewrite `doctrine/pipeline-lock.md:93-102` in the same commit.

### Stage 5b — regression against the Cursor-era corpus

**No new baseline run is needed. The corpus already in git is the baseline.**
An A/B against freshly-captured Cursor output was considered and rejected: it
costs money, and it is *worse* evidence than what is already committed.

Verified 2026-07-30:

- **7 guides are pure `guide-factory[bot]` output, never hand-edited** —
  `google-calendar`, `google-docs`, `google-drive`, `google-people`,
  `google-sheets`, `google-slides`, `x-docs`. Seven independent Cursor-era runs
  characterise normal variance far better than two runs of one guide would.
- **9 guides are bot-then-human.** Excluded as references. They are separately
  interesting as a record of *what the pipeline got wrong*, but a raw pi draft
  compared against a human-polished guide would be unfairly penalised.
- **2 guides were never pipeline output at all** — `google-big-query`,
  `google-compute-engine`, authored entirely by hand. Must be excluded from any
  comparison.
- **All 18 lint clean; 34/34 unit tests pass.** The oracle is green on the
  committed corpus, which is the precondition for using `lintGuide` as a
  regression gate at all.
- **`google-calendar`'s recorded input digests still match the working tree** —
  all four steps, every `reading_list` entry across `doctrine/glossary.md`,
  `shared.md`, `roles/{technical-research,writer,fidelity,review}.md`,
  `speakeasy-setup.md`, `personas/it-admin.md`. Inputs are equivalent *today*,
  so a re-run is apples-to-apples. Re-check this before running — a doctrine
  edit between now and then invalidates it.
- Model of record for every step of that run: `gpt-5.6-sol`, `runtime:
  "cursor-sdk"`, persona `it-admin`.

The test, in order of strength:

1. **Deterministic gates** — re-run `google-calendar` on the pi adapter, then
   require: `lintGuide` clean, `meta.yaml` schema-valid, anchors resolve, and the
   scope-gate verdict unchanged. Objective pass/fail, no judgement.
2. **Envelope check** — does the output sit inside the distribution of the 7
   reference guides (length, section structure, anchor count, setup-step count)?
   A result outside the envelope is a flag, not a failure.
3. **Read it.** Whether the guide is actually correct is not mechanisable, and
   gates 1–2 passing does not mean the drafting model is good enough. Item 6 of
   the pi probe's blockers stands: nothing tested so far says anything about
   drafting quality.

What this design **cannot** tell you: whether a given divergence is the runtime
or the model. Those change together at cutover. Holding the model at
`gpt-5.6-sol` via OpenRouter for the first regression run isolates the runtime —
do that before exercising the per-phase routing in §7.

Expect all 16 committed locks to go cold, lazily, as each guide is next touched.
That is correct behaviour — the model changed.

### Stage 6 — CI, and the Cursor key is gone

Small, because Phase 1 has no image:

- Add `npm i -g @earendil-works/pi-coding-agent@<pinned>` to the workflow.
- Replace the `CURSOR_API_KEY` secret with the OpenRouter **management** key on
  both the distill step (`guide-draft.yml:82-89`) and the draft step (`:115-124`).
- Mint a spend-capped disposable runtime key per run; delete it in a `trap` (§7).
- Delete `CURSOR_API_KEY` from repo secrets and from `FACTORY.md`'s secrets table.

Ship behind the label on a scratch issue first. **When this merges, the goal is
met** — nothing downstream is required.

### Stages 7–8 — after the goal is met

Neither is migration work; each stands alone, each should be replayed separately,
and each is a fresh decision rather than a commitment made now:

- **Prompts → files** (§4). Pure refactor by construction — no lock impact after
  Stage 5. Do it for the injection-surface *reduction* and the conditional-variant
  split, not for the lock.
- **Research gather → synthesize** (§7). The biggest cost and quality lever, and a
  genuine workflow change: a new lock step, a new artifact boundary. Deserves its
  own design pass.
- **Per-phase model routing** (§7). Move one phase at a time, replaying each.
- **Isolation — `docker()`** (§6, Phase 2). The only reason to do this is turning
  I7 from a tripwire into a boundary. Worth it if untrusted issue text worries
  you; not worth it for the Cursor-key goal.

### What not to do

- **Don't swap runtime and prompt format together.** A quality regression then has
  two candidate causes and you will re-run everything to disambiguate.
- **Don't port the write phases first** because they're "the interesting ones."
  They carry the postcondition, the remediation, and the whole I7 surface.
- **Don't add an `npm ci` `onSandboxReady` hook.** The upstream README recommends
  it in four places; issue #745 is it corrupting the host `node_modules` on macOS.
- **Don't trust the lock during Stages 1–4.** Run `--force`.
- **Don't split research in the same release as the runtime swap.**

## Gate results — run 2026-07-30

Three of the four gates were run against live OpenRouter. **Total spend: $0.0031.**
Raw evidence: `factory-v2-evidence/probe-pi.md`, `factory-v2-evidence/probe-sandcastle.md`.

| Gate | Verdict | Finding |
| --- | --- | --- |
| 1 — pi accepts an OpenRouter slug | **PASS** | The exact argv Sandcastle emits works on 0.57.1 *and* 0.83.0 |
| 2 — structured-output retry round-trips | **PASS** | Retry resumes the *same* pi session in place; zod issues forwarded to the model |
| 4 — `noSandbox()` + pi writes a file | **PASS** | 8 bytes, byte-exact, no permission flag needed |
| 3 — produce→extract on a real phase | **NOT RUN** | Needs a real `research` run against the actual prompts |

**The decision: spawn pi directly. Do not adopt Sandcastle.** Reasoning in
§6.1 below. Gate 3 is now a test of *our* phase shape, not of a third party,
and should be run against the direct adapter.

### What the gates changed in this design

1. **Kill criterion 4 was aimed at the wrong thing.** The
   `--dangerously-skip-permissions` contradiction is real —
   `Orchestrator.ts:143` hardcodes it `true` while `no-sandbox.ts:8-11` promises
   the opposite — but the **pi adapter never destructures the field**
   (`AgentProvider.ts:637-654`), so pi never receives it. pi has no such flag;
   `-p` mode has no approval gate at all. Moot for us, and a live hazard for
   anyone using `claudeCode`/`opencode`/`cursor` on the `run()` + `noSandbox()`
   path, who get a host-level permission bypass the shipped docs deny.
2. **pi has *two* different failure modes, and neither is a clean error event.**
   This is the single most important finding, and it applies to the direct-spawn
   path just as much:
   - *Auth failure* (missing key): exit **1**, lone `session` line on stdout,
     raw Node stack trace on **stderr**.
   - *API 400* (bad model, and presumably rate limits): exit **0**, with the
     error only as `errorMessage` / `stopReason:"error"` **inside** the JSON
     stream.

   Sandcastle keys success off exit code alone (`Orchestrator.ts:191`) and never
   inspects `errorMessage`, so `run()` **resolves successfully on a total API
   failure**. For this pipeline that renders as *a guide that never generated
   looking like a guide that generated empty*. The adapter must check exit code,
   stderr, **and** `stopReason` — see §8.
3. **Parse by event type, never by stream position.** On 0.57.1 the last line is
   `agent_end`; on 0.83.0 it is a contentless `agent_settled`. "Read the last
   line" works on one and silently returns nothing on the other.
4. **`noSandbox()` hands the agent the whole host environment** —
   `no-sandbox.ts:51` spreads `...process.env`. Every secret in the invoking
   shell is visible to the agent process. Inherent to running without a
   container, but it means `PULSE_REGISTRY_KEY` / `GH_TOKEN` / `AGENT_PAT`
   hygiene has to be enforced by the *caller* building an explicit env, not
   assumed.

## 6.1 Why direct spawn, not Sandcastle

The probe recommendation was unambiguous, and two findings decide it:

**The things this design most wants are not expressible through Sandcastle.**
`PiOptions` exposes only `thinking`, `env`, `captureSessions`, `sessionStorage`
(`AgentProvider.ts:613-625`). There is no way to pass `--tools`, so the
tool allowlist below cannot be set. And Sandcastle *deliberately strips*
`--no-session` (`AgentProvider.ts:644-646`) so every run persists a session
forever with no GC — the probe alone left 9 session files in `~/.pi`.

**What it would buy is small and now fully read.** On the
`run()` + `noSandbox()` + `head` path the only real feature is `Output.object`
+ retry: `extractStructuredOutput.ts` is 161 lines and
`buildStructuredOutputRetryFeedback` is 30. Everything else — worktrees,
containers, branch strategies, merge-back — we deliberately switch off. In
exchange we would inherit an unpinned CLI contract (Sandcastle declares **no
dependency on pi at all**; it shells out to whatever is on `PATH`, with the
stream format documented only in a comment naming 0.73.1), a run that reports
success when the model call 400s, and a shipped permission docstring that is
wrong.

**Two tightenings the direct path makes available**, both impossible via
Sandcastle and both worth taking:

- `--tools read,edit,write,grep,find,ls` — pi's default set is
  `read,bash,edit,write` and `-p` auto-approves all of it unsandboxed. Dropping
  `bash` is a real reduction in blast radius and costs nothing. This also
  retires the claim in §0 that `noSandbox()` is bare "parity" with the Cursor
  runtime: with an explicit allowlist it is *narrower* than what we run today.
- `--no-session` — no unbounded `~/.pi` growth in CI.

**What we must build that Sandcastle would not have given us anyway:** the
post-hoc validity check from finding 2. That was always ours to own.

### Superseded kill criteria

Retained for the record; each answered a question no documentation settled.

1. **`pi -p --mode json --model <openrouter-slug>` inside the container.** Does
   the argv form Sandcastle emits accept an OpenRouter model, on
   `@earendil-works/pi-coding-agent` 0.83.0 rather than the 0.73.1 Sandcastle was
   verified against? *If no:* fall back to `claudeCode` + `ANTHROPIC_BASE_URL`
   pinned to `anthropic/claude-*` slugs only, and accept Claude-only routing.
2. **Structured-output retry round-trips through the sandbox.** Force a malformed
   tag with `maxRetries: 1` and confirm the session JSONL is captured back to the
   host and resumed. *If no:* every remediation degrades to a hard failure and the
   exit-2 rate climbs — reconsider.
3. **Produce→extract holds for a file-writing phase.** One real `research` run:
   does the extraction turn reliably emit a valid tag *and* leave `research.md` +
   `meta.yaml` on disk? *If no:* the phase shape is wrong, not the runtime.
4. **`run()` + `noSandbox()` + pi can write a file.** The source and the docs
   disagree about whether `--dangerously-skip-permissions` is passed on this path
   (§6). 30 minutes to settle. *If no:* Sandcastle is not usable without Docker —
   see the fallback below.

Run all four before writing pipeline code.

### If Sandcastle fails a gate

Sandcastle is a **convenience** in Phase 1, not a requirement. What it supplies is
the pi adapter — stream-JSON parsing, session-file locations, the resume-flag
mapping — plus `Output` and Standard Schema validation.

If gate 1 or 4 fails, the fallback is to spawn pi directly:
`spawn('pi', ['-p', '--mode', 'json', '--model', slug])`, prompt on stdin. That is
roughly 100 lines of spawn-and-parse, and **the rest of `runtime.ts` already does
the remaining work** — `extractJson`, `safeParse`, and the remediation follow-up
all stay. The Cursor-key goal is met either way; only the adapter maintenance
burden differs.

Decide this with the 30-minute test rather than by argument.

---

## Open questions for a human

1. **Volume.** Below ~3 guides/month, Cursor Pro's included usage makes this
   migration cost-neutral at best. What's the actual run rate?
2. **Is sandboxing the goal, or is model routing?** They're separable. Sandcastle
   alone (keeping Cursor models) buys I7 enforcement. OpenRouter alone (keeping
   the Cursor SDK shape, or a direct AI-SDK loop) buys per-phase routing and spend
   caps without a Docker dependency. Doing both is the most work.
3. **Determinism.** `draft`/`revise` on Anthropic can never be bit-reproducible
   (no `seed`). Does that matter enough to move `draft` off Claude?
