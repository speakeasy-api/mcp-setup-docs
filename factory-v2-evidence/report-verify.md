# Design review: replacing the Cursor SDK runtime with Sandcastle

Verified against this repo's code and against `mattpocock/sandcastle@main` (npm `@ai-hero/sandcastle` latest = **0.12.0**). Sandcastle refs are `repo-path:symbol` or `path:line` where I read the raw file.

**Headline:** the plan is mostly sound, but five things are wrong or unverified as stated:

1. **Sandcastle's own repo does not do "work then emit tag" in one run** — it runs the work, then a *second* resumed run whose prompt says "Do not change files. Do not run commands" purely to extract the tag (`.sandcastle/agent-workflows/shared/run-with-extraction.ts`). That is direct evidence against the single-shot assumption in your §3.
2. **`resume()` accepts `output`** (good — your remediation contract survives), but resume forces the prompt **inline**, and inline prompts skip all templating (ADR-0008). So remediation prompts can never live in `.sandcastle/prompts/*.md`.
3. **OpenRouter is not a thing in Sandcastle** — zero hits across the repo; the model string is passed straight to `claude --model`. This is a Claude-Code-env hack, not a supported path.
4. **`branchStrategy: {type:"head"}` has no locking of any kind** (ADR-0007 explicitly excludes head from `WorktreeManager`'s purview) and ADR-0018 states head is *unsafe for concurrent fan-out*. Your 2-reviewers × N-guides parallelism is exactly that.
5. **The prompt-injection hazard you cite was fixed** (CHANGELOG `6bc4d74`) — `promptArgs` values are inert data now. The real injection risk is different and still fully present.

---

## 1. Prompt-builder inventory and template-arg fit

### 1a. Every builder, with its interpolated values

Shared helpers used by nearly all of them:

- `readingList()` — `workflow.ts:383-394` → numbered list of **absolute** doctrine paths (`abs(root, PATHS.glossary)`, …). Multiline blob, and content varies by role.
- `assign(g)` — `workflow.ts:553-563` → 6 lines: slug, provider, absolute guide dir, persona id + absolute persona path, `NOW` (run timestamp), and `promptNotesOf(g)` (`workflow.ts:457-463`) = operator notes **merged with the catalog note** (`pulse-catalog.ts:320-416`, up to 5 lines).
- `schemaInstruction()` — `runtime.ts:55-69`, appended to *every* prompt; becomes the `<result>` tag instruction under Sandcastle.

| # | Builder | Where | Scalars (fine as `{{ARG}}`) | Blobs / structure (problem) |
|---|---|---|---|---|
| 1 | `researchPrompt` | `workflow.ts:565-601` | `ROOT`, slug, provider, guideDir, persona, personaFile, `NOW` | `readingList` (multiline); `promptNotesOf` (multiline, untrusted); **`hasPrior` conditional block** `:578-588` gated on `existsSync` |
| 2 | `researchWriteRemediationPrompt` | `workflow.ts:603-622` | dir | `missing[]` list → join; `assign(g)` |
| 3 | `researchChangeJudgePrompt` | `workflow.ts:624-662` | `ROOT` + assignment scalars | **four whole files inlined**: BEFORE `research.md`, BEFORE `meta.yaml`, AFTER `research.md`, AFTER `meta.yaml` (`:651-658`). Real dossiers are 300–800 lines each |
| 4 | `draftPrompt` | `workflow.ts:764-800` | assignment scalars | `readingList`; **`existing` conditional** picks a 8-line vs 5-line instruction block (`:766-784`) |
| 5 | `draftWriteRemediationPrompt` | `workflow.ts:802-822` | dir | `missing[]`; `assign(g)` |
| 6 | `reviseWriteRemediationPrompt` | `workflow.ts:824-842` | dir | `missing[]`; `assign(g)` |
| 7 | `reviewerPrompt` | `workflow.ts:844-889` | `round`, `MAX_ROUNDS`, `dim.role`→"Fidelity"/"Editorial" (`:852`) | `readingList(dim.doc, dim.persona)`; **`prior` conditional** `:872-882` with `JSON.stringify(prior)` — a whole round's blockers+nits+revision notes+disputed; **`dim.role !== 'fidelity'` conditional line** `:862-867` |
| 8 | `revisionPrompt` | `workflow.ts:891-956` | `round` | `JSON.stringify(blockers, null, 2)` `:925`; **conditional nits section** `:928-940` with `JSON.stringify(nits, null, 2)`; optional `extraNote` `:908-910` (the finalization salvage note, `:1590`) |
| 9 | `buildPrompt` (distill) | `resolve-issue.ts:132-196` | — | guide-slug list, persona list, **issue title**, **issue body + every issue comment** (`factory/cmd-distill.ts:37-49`) — fully untrusted |

### 1b. What breaks under `promptArgs`

**`promptArgs` is `Record<string, string | number | boolean>`** — `src/PromptArgumentSubstitution.ts:PromptArgs`. No objects, no arrays. So every findings blob still gets `JSON.stringify`'d in TypeScript; you have moved the string concatenation, not eliminated it.

**There is no conditional syntax.** The placeholder grammar is exactly `/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g` (`PromptArgumentSubstitution.ts:PLACEHOLDER_PATTERN`) and a placeholder present in the file with no matching arg is a hard `PromptError` (`findMissingPromptArgKeys` + the `!(key in sanitizedArgs)` check). Empty string *is* accepted (only `null`/`undefined` fail), so your five structural conditionals (#1 `hasPrior`, #4 `existing`, #7 `prior`, #7 dimension line, #8 nits section) have two options:

- **(a)** separate prompt files — `research-fresh.md` / `research-revise.md`, `draft-new.md` / `draft-revise.md`, `review-fidelity.md` / `review-achievability.md`, `revise.md` / `revise-salvage.md`. This is the right answer and has a bonus: it removes `PROMPT_TEMPLATES.draft(existing)` (`lock.ts:116-138`) as a special case, because file identity now encodes the variant.
- **(b)** pass the whole rendered block as one arg. Works, but the block text is then back in TypeScript and invisible to the prompt-file digest unless you also hash `promptArgs` — which you're already planning (§4). Acceptable for `PRIOR_ROUND_JSON` / `BLOCKER_FINDINGS_JSON`, bad for prose blocks.

**Unused args only warn**, they don't fail (`substitutePromptArgs`, the `display.status(... "warn")` branch), so a shared arg bag across variant files is tolerable but noisy.

**Reserved keys:** `SOURCE_BRANCH` / `TARGET_BRANCH` are auto-injected and passing them is an error (`BUILT_IN_PROMPT_ARG_KEYS`). Nothing in this repo uses those names — fine.

### 1c. The `{{`, backtick and shell-metachar analysis — your stated hazard is stale

You wrote that Sandcastle expands `` !`cmd` `` inside prompt files and that this is an injection hazard when interpolating issue text. **That was true and is now fixed.** CHANGELOG `6bc4d74`:

> Fix `PromptPreprocessor` executing `` !`...` `` patterns that arrive via `promptArgs` substitution. Argument values are now treated as inert data: only shell blocks written in the raw template are executed. Previously, any caller passing text through `promptArgs` (issue titles, bodies, docs excerpts, etc.) could hit spurious command execution — or, **with untrusted inputs, remote shell execution**.

Mechanism, verified in source:

- `substitutePromptArgs` marks template-authored shell blocks with `\x01` (`SHELL_BLOCK_MARKER`, `src/PromptPreprocessor.ts:16`) *before* substitution, and strips any `\x01` already present in both the raw prompt and every arg value so markers cannot be forged.
- `preprocessPrompt` only executes `MARKED_SHELL_BLOCK_PATTERN` (`!\x01\`cmd\``), then strips remaining markers.
- Substitution is a **single pass** (`markedPrompt.replace(PLACEHOLDER_PATTERN, …)`), so a `{{FOO}}` arriving inside an arg value is never re-expanded.

**Consequences for the plan:**

- ✅ Issue body / notes / findings JSON containing `{{`, backticks, `$()`, `;rm -rf` are safe *as arg values*. No escaping needed.
- ⚠️ **Pin `@ai-hero/sandcastle` to a version that has `6bc4d74`** and add a regression test (`notes` containing `` !`id` `` must appear verbatim in the resolved prompt). This is a security property enforced by a `\x01` sentinel, not by types.
- ⚠️ Anything you put in the *template* is still executed. Do **not** write `!`gh issue view $N`` into `.sandcastle/prompts/research.md` as a shortcut for the notes — that reintroduces the whole class, and per ADR-0020 a single failed/slow expansion aborts the run with no retry (30 s timeout, `PROMPT_EXPANSION_TIMEOUT_MS`), which under N-parallel guides is exactly the contention case issue #617 reported.
- ✅ **`{{ gram.oauth.callback_url }}` is safe.** The placeholder grammar is identifier-only (`[A-Za-z_][A-Za-z0-9_]*`) and dots don't match, so the one string in this repo that looks like a Sandcastle placeholder (constitution I4, `lint-guide.ts:37`, `doctrine/roles/writer.md:69`) passes through untouched even if quoted verbatim in a prompt file. Worth a test to lock that in.

**The injection risk that remains, and is worse than before:** the distill prompt embeds the issue title, body, *and every comment* (`resolve-issue.ts:158-162`, `factory/cmd-distill.ts:37-49`), and the Decision-reply flow (`FACTORY.md:59-69`) means arbitrary GitHub users' comment text becomes agent instructions. Under Cursor that text drove a `cwd`-scoped agent; under Sandcastle + `head` + `--dangerously-skip-permissions` (hardcoded, see §3) it drives an agent with write access to the entire bind-mounted repo, including `doctrine/` (I8), `.github/workflows/`, and `.sandcastle/prompts/` itself. Nothing in the design stops "add a step to `.github/workflows/guide-draft.yml`". Today the only backstop is that `factory/cmd-git.ts:69-78` stages only `guides/<slug>/` and `retro/runs/*-<slug>.json` — keep that, and consider verifying a clean `git status` outside those paths before commit.

---

## 2. The remediation contract under `resume()`

**Requirement restated:** `status:"ok"` is a lie unless files exist (`workflow.ts:1147`, `1388`; `lock.ts:38,43`); give the agent exactly one in-conversation follow-up (`runtime.ts:104-118`) before failing. Prompts at `workflow.ts:603,802,824`.

### Does `resume()` accept `output`? **Yes.**

```ts
// src/run.ts:431-439
export type ResumeRunResultOptions = Omit<
  RunOptions,
  "agent" | "sandbox" | "prompt" | "promptFile"
  | "resumeSession" | "forkSession" | "maxIterations"
>;
```

`output` is **not** in the omit list, and `RunOptions.output` is `readonly output?: OutputDefinition` (`src/run.ts:426`). So `first.resume(prompt, { output: Output.object({ tag: "result", schema: PhaseResult }) })` type-checks and works.

### Is it compatible with `Output` + `maxIterations: 1`? **Yes, by construction.**

`resume()` hardcodes `maxIterations: 1` (`src/run.ts:818`), which satisfies the `output requires maxIterations to be 1` entry check (`src/run.ts:551-556`) and the `resumeSession + maxIterations > 1` check (`src/run.ts:534-540`). ADR-0011 fixes this: `.resume()` is exactly one iteration and does not accept `maxIterations` at all.

### Four caveats that change your code

1. **The follow-up prompt is inline, always.** `resume()` sets `prompt` and `promptFile: undefined` (`src/run.ts:816-817`). Inline prompts get no `{{KEY}}` substitution, no expansion, no built-ins (ADR-0008; `validateNoArgsWithInlinePrompt` throws if you pass `promptArgs` with an inline prompt). **So the three remediation prompts must stay as TypeScript template literals.** Your "move all prompt builders to `.sandcastle/prompts/*.md`" goal is ~70% achievable, not 100%. This is fine — arguably better, since remediation text embeds a computed `missing[]` list — but say so in the plan rather than discovering it.
2. **The resumed prompt must literally contain `<result>`.** ADR-0010: `run()` throws at entry if the resolved prompt lacks the opening tag, and `resume()` inherits `options.output` via `{...options}` (`src/run.ts:815`) whether or not you re-pass it. So `researchWriteRemediationPrompt` must be edited to include the tag instruction. Today `runtime.ts:109-110` appends `schemaInstruction()` for exactly this reason — keep that habit.
3. **`Output.maxRetries` is not your remediation.** The built-in retry (`src/run.ts:858-890`, `Output.object({maxRetries})`) resumes the session and feeds back a *schema/parse error* description (`buildStructuredOutputRetryFeedback`). It fires only on `StructuredOutputError`. Your remediation fires on a **valid** report whose *filesystem postcondition* is false. Different trigger, different feedback. You need both: `maxRetries: 1-2` for malformed JSON (replacing `json.ts` + the `null`-return path), and an explicit `resume()` for the missing-files case.
4. **Resume needs a host-visible session file.** ADR-0016: only filesystem-backed session providers can resume; `claudeCode` qualifies (`captureSessions` defaults `true`, `AgentProvider.ts:claudeCode`). `resume()` throws `"Cannot resume: no sessionId was captured"` if the id is missing (`src/run.ts:811-812`). Under Docker the session JSONL must be captured back to the host — verify this survives your CI container teardown, or every remediation degrades to a hard failure and your exit-2 rate goes up.

**Recommended shape:**

```ts
const first = await run({ ...opts, promptFile: "…/research.md", promptArgs,
  output: Output.object({ tag: "result", schema: PhaseResult, maxRetries: 2 }) });
const missing = missingResearchOutputs(dir);            // lock.ts:38 — unchanged
if (first.output.status === "ok" && missing.length) {
  const second = await first.resume!(
    researchWriteRemediationPrompt(g, missing),          // inline, tag included
    { output: Output.object({ tag: "result", schema: PhaseResult, maxRetries: 1 }) },
  );
}
```

---

## 3. Does "write files, then emit the tag" work in one iteration?

### The constraints do fit our phase shape

Every phase is single-shot and returns one JSON object today (`runtime.ts:98-101`: one `send()`, one `wait()`, parse `result.result`). So `maxIterations: 1` is not a regression. And extraction reads the right thing: `stdout` on the result is `resultText || execResult.stdout` where `resultText` is the parsed `result` stream event (`src/Orchestrator.ts:209`) — i.e. the agent's **final message**, decoded, not raw `stream-json`. That is byte-for-byte the same contract as `runtime.ts:145` + `json.ts:2`. Extraction is last-match-wins, fence-aware, `JSON.parse` then Standard Schema (`src/extractStructuredOutput.ts:extractObject`), which is strictly better than `json.ts`'s brace-slicing fallback (`json.ts:21-25`).

### But the evidence says don't combine work + extraction in one run

**Sandcastle's own workflows don't.** `.sandcastle/agent-workflows/shared/run-with-extraction.ts` is a two-run helper:

```ts
const produce = await run(produceOptions);                 // no `output` — does the work
const sessionId = produce.iterations.at(-1)?.sessionId;
const extraction = await run({
  ...extractionOptions, promptFile: undefined,
  prompt: extractionPrompt, resumeSession: sessionId,
  output: { ...output, maxRetries },                       // default 2
});
return { ...produce, output: extraction.output };
```

and every `extraction.md` opens with:

> Emit a single `<output>` block as the last thing in your response.
> **Do not change files. Do not run commands.** Do not include text outside the `<output>` block.

(`.sandcastle/agent-workflows/review/extraction.md`, `…/implement-pr/extraction.md`, same for `explore` and `update-branch`.)

Four of four first-party workflows that need both file work and structured output split them. That is the maintainers' own answer to your question, and the reason is obvious from the Claude Code invocation:

```
claude --print --verbose --dangerously-skip-permissions --output-format stream-json \
       --model <model> [--effort …] [--resume …] -p -        # prompt on stdin
```
(`src/AgentProvider.ts:claudeCode.buildPrintCommand`, ~`:1181+`)

A long tool-using `--print` turn ends with a `result` message whose text is whatever the model decided to summarize with. Asking it to also be a strict JSON payload after 40 tool calls is the failure mode `maxRetries` exists to paper over — and each retry is a *resumed* turn, so you pay context twice anyway.

**Recommendation:** adopt the two-run pattern for `research`, `draft`, and `revise` (the file-writing phases), and single-run + `output` for `review:fidelity`, `review:achievability`, and the `research-change judge` (which write nothing — `workflow.ts:870`). Cost: +1 cheap resumed turn on 3 of 6 phases. Benefit: the extraction turn is exactly where you also assert the file postcondition, which collapses §2's remediation and §3's extraction into one mechanism.

Two smaller notes:

- `--dangerously-skip-permissions` is hardcoded for the `run()` path (`src/Orchestrator.ts:142-144`, `dangerouslySkipPermissions: true`) regardless of sandbox. `claudeCode(model, { permissionMode })` takes precedence if set. There is no tool allowlist — I7 lane containment remains prompt-only, same as today, but the blast radius grows from `cwd` to the whole mounted repo.
- Prompt goes on **stdin** for Claude Code (`-p -`), so no argv size limit. Our `revisionPrompt` blockers JSON and the judge's four inlined files are safe here. (They would *not* be for the `cursor`/`copilot` providers, which cap prompts as argv — `AgentProvider.ts:124-134`, `:1005-1017`.)

---

## 4. `lock.ts`: what dies, and what the new digest inputs are

### Lines that die

| Lines | What | Fate |
|---|---|---|
| `lock.ts:100-158` | `PROMPT_TEMPLATES` (the hand-maintained shadow: `.research`, `.draft(existing)`, `.review(dimension)`) | **delete, 59 lines** |
| `lock.ts:540` | `prompt_digest: promptDigest(PROMPT_TEMPLATES.research)` | → `digestRepoFile(root, '.sandcastle/prompts/research.md')` |
| `lock.ts:558,561` | `const existing = missingDraftOutputs(...)` + `PROMPT_TEMPLATES.draft(existing)` | → file identity (`draft-new.md` vs `draft-revise.md`); **the `existing` branch disappears entirely, 2 lines** |
| `lock.ts:588` | `promptDigest(PROMPT_TEMPLATES.review(opts.dimension))` | → per-dimension prompt file digest |
| `lock.ts:166-168` | `promptDigest(template)` | keep as a `digestBytes` alias or inline it |

**Nothing else reads `PROMPT_TEMPLATES`** — verified: the only references in `pipeline/src/**` are the definition and the three `buildXInputs` call sites (plus `lock.test.ts`, which will need updating). `workflow.ts` imports `buildResearchInputs` / `buildDraftInputs` / `buildReviewInputs` (`workflow.ts:6-27`) and never touches the templates directly.

This is a genuine improvement: today nothing verifies `PROMPT_TEMPLATES.research` matches `researchPrompt()`, so editing `workflow.ts:565-601` silently leaves the lock skipping work whose prompt changed. Hashing the actual file bytes closes that hole.

### Where `promptArgs` goes — the schema will fight you

`schema/pipeline-lock.v1.schema.json` is strict:

- `step_inputs`: `"additionalProperties": false` (line 30) with required `artifacts, model, params, prompt_digest, reading_list` (95-101) — **you cannot add a top-level `prompt_args` field.**
- `step_inputs.params`: `"additionalProperties": false` (line 46) with only `dimension|notes|persona|provider` (48-75) — **you cannot add args there either.**
- `params.dimension` is an `enum` (52-58) — still fine, `fidelity`/`achievability` are in it.

Two options:

- **(a) fold into `prompt_digest`** — `sha256(promptFileBytes || "\0" || canonicalize(promptArgs))`. Zero schema change; `canonicalize` already exists (`lock.ts:206-233`). Downside: the digest stops being "digest of the prompt" and the doc at `doctrine/pipeline-lock.md:93-102` becomes a lie unless rewritten. Rewrite it.
- **(b) bump `schema_version` to 2** and add `prompt_args`. Cleaner semantics, but `readLock` returns `null` for any `schema_version !== 1` (`lock.ts:285-286`) and `canSkipStep` re-checks it (`lock.ts:477`), so all 16 existing locks become invisible. That's the same practical outcome as (a) given the model change below, so (b) is defensible — but only if you also update `doctrine/pipeline-lock.md` and the schema together.

Recommend **(a)** plus a doc rewrite, and be careful that `promptArgs` no longer contains anything volatile. Today `assign()` injects `NOW` (`workflow.ts:560`) — the run timestamp. It is currently excluded from the digest because the template shadow strips it (`pipeline-lock.md:93-97`: "Never include `observed_at` or the run `timestamp`"). If `OBSERVED_AT` becomes a `promptArg` and you hash the arg object, **every run busts every digest and the lock stops skipping anything.** You must explicitly exclude `OBSERVED_AT` (and any other per-run field) from the hashed arg set. This is the single most likely way to silently break the cache.

Same trap for `NOTES`: `notesOf()` already routes the *stable* catalog token into the lock while the *full* catalog note goes to the prompt (`workflow.ts:413-417` vs `457-463`, `pulse-catalog.ts:275-303`). Preserve that split — hash `lockNotes`, interpolate `catalogPromptNote`.

### Model identity

`modelId()` (`runtime.ts:175-177`) returns `resolveModel(cfg, model).id` — today `gpt-5.6-sol`. Under Sandcastle the equivalent is the string handed to `claudeCode(model)`, which goes straight to `claude --model`. So:

- **If you actually route through OpenRouter**, that's an OpenRouter slug like `anthropic/claude-opus-4.5`. But see the warning below — Sandcastle has no OpenRouter concept.
- **Record more than the id.** Two existing gaps worth fixing while you're here: (i) `effort` is in the log label (`runtime.ts:42-45`) but **not** in `modelId()`, so `--effort high` → `low` does not bust the lock today; (ii) the agent CLI itself is now part of the environment. Record `{ agent: "claude-code", model: "<slug>", effort: "high" }` and hash the object into `model` (schema says `model` is a `minLength:1` string, so serialize it, e.g. `claude-code:anthropic/claude-opus-4.5:high`).

### OpenRouter: no support, and it's not a Sandcastle knob

Verified: **0 code hits** for `openrouter` and **0** for `ANTHROPIC_BASE_URL` across `mattpocock/sandcastle`. The README/docs mention only `CLAUDE_CODE_OAUTH_TOKEN` and `ANTHROPIC_API_KEY`. What exists is a generic per-provider env bag — `claudeCode(model, { env })` (`AgentProvider.ts:claudeCode`, `env: options?.env ?? {}`) merged with the `.sandcastle/.env` resolver and sandbox env. So OpenRouter would be "set `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` and hope Claude Code's Anthropic-compatible client honors them against OpenRouter's shim" — an unsupported configuration in *both* products, with no test coverage on either side. **Prototype this in isolation before it becomes a dependency of the whole pipeline design**, and note that it silently changes what `--effort` means (a Claude Code flag, not an OpenRouter parameter) and breaks usage accounting (`parseSessionUsage` expects Anthropic-shaped `usage` objects, `AgentProvider.ts:claudeCode.parseSessionUsage`).

### `runtime: "cursor-sdk"` and the 16 committed locks

**There are 16** committed lockfiles, all with `"runtime": "cursor-sdk"`:
`guides/{asana,box,github,google-calendar,google-docs,google-drive,google-people,google-sheets,google-slides,hubspot,intercom,salesforce,snowflake,x,x-docs,zapier}/pipeline.lock.json`.

- Changing the field to `"sandcastle"` is **harmless on its own**: it is explicitly observational and excluded from digests (`schema/pipeline-lock.v1.schema.json:174-177`; `doctrine/pipeline-lock.md:114-115`), it is written unconditionally (`workflow.ts:546`), and nothing reads it (`canSkipStep` never looks at it, `lock.ts:467-485`).
- **But every one of those 16 locks becomes non-skippable anyway**, because `model` changes (`gpt-5.6-sol` → a Claude/OpenRouter slug) and `prompt_digest` changes scheme. `readLock` still parses them (schema_version is still 1), `canSkipStep` just returns false. No crash — just a full `draft` + both `review.*` re-run for all 16 guides on first contact. Budget for that: 16 × a converge cycle, and it will be the first real bill under the new provider.
- **Stale-lock hazard:** `writeConvergedLock` only runs on converge (`workflow.ts:1461,1708`). Any guide that lands `unconverged`/`awaiting_scope` keeps a `cursor-sdk` lock indefinitely, so `runtime` will be a mixed field for a long time. Don't use it as a migration signal; if you need one, add a `prompt_digest` scheme marker or bump `schema_version`.

---

## 5. Concurrency under `head` + bind mount — this is the biggest problem

**Our parallelism today:** `parallel()` runs both review dimensions concurrently per guide (`workflow.ts:972-1006`), and `pipeline()` runs all guides concurrently (`workflow.ts:1731`, `runtime.ts:167-173` = `Promise.all`). Locally `mise run draft-guide -- box hubspot snowflake` is 3 guides; each fans out to 2 reviewers. Under Sandcastle every `run()` is its own container, so peak is **N + 2N containers all bind-mounting the same host directory**.

### What Sandcastle says about that

- **ADR-0007 (worktree locking):** "The **head** strategy operates on the **host** working directory, which is outside `WorktreeManager`'s purview." There is *no* lock for head. The `.sandcastle/locks/<name>.lock` mechanism only covers the `branch` strategy.
- **ADR-0018 (fork is session-only):** "On the **head** and **merge-to-head** strategies, concurrent forks share a working directory / race to merge into the host's HEAD, so they are **unsafe**." Written about `fork()`, but the shared-working-directory half applies identically to concurrent `run()` calls.
- **Issue #745 triage (verified against code):** "With `docker()`/`podman()` and no `branchStrategy`, the strategy defaults to **head** mode (`src/run.ts:350-354`). In head mode the host repo dir is bind-mounted *directly* at `/home/agent/workspace`."

Good news: issues **#849** and **#854** are *worktree*-metadata corruption bugs (shared `.git/worktrees/<name>/gitdir` rewritten to the container path, then killed by host-side `git worktree prune`). Choosing `head` sidesteps both — no worktree is created. That's a real argument for your choice. **#745/#873 are the ones that bite `head` specifically.**

### Is "reviewers write nothing, guides are disjoint" actually enough? No.

| Shared path | Who touches it | Why it's a problem |
|---|---|---|
| `.git/index`, `.git/index.lock` | any `git status`, `git diff`, `git stash` — Claude Code runs these unprompted | `git status` refreshes and *writes* the index. 10 containers → `index.lock` contention → spurious agent-visible git failures. Nothing in our prompts forbids read-only git (`doctrine/shared.md:67` only forbids commit/push) |
| `.claude/` **(this repo has one)** | Claude Code writes `settings.local.json`, todo/plan files, shell snapshots; skills live at `.claude/skills/` | Concurrent writes race; worse, an agent could modify `.claude/skills/tune-pipeline/SKILL.md` — a doctrine-adjacent artifact (I8) |
| `pipeline/node_modules` | issue **#745**: a container-side install writes Linux-arch binaries into the shared tree | We ship platform-specific deps: `@cursor/sdk-{linux-x64,darwin-arm64,…}` (`pipeline/package-lock.json:82-86`), plus `tsx`/esbuild. On a macOS dev box this is the exact `@esbuild/darwin-arm64` → `linux-arm64` corruption from #745, and it breaks the *host* `mise run draft-guide` afterwards. Do **not** add an `onSandboxReady: [{command:"npm ci"}]` hook (which the Sandcastle README recommends at four places, per the #745 triage) |
| `~/.npm` cache (if HOME is mounted) | `doctrine/roles/technical-research.md:40` **instructs the agent to run** `npx --yes ajv-cli validate …` | N concurrent `npx --yes` against one cache is a documented flake source. Verify HOME is container-local |
| **`guides/<slug>/`** | research/draft/revise | Genuinely disjoint per guide ✅ — this part of your reasoning holds |
| `retro/runs/` | orchestrator only, not agents | Safe ✅ |
| `.sandcastle/prompts/*.md`, `doctrine/`, `.github/` | nothing *should* — but `--dangerously-skip-permissions` + head mounts the whole repo | I7/I8 are prompt-enforced only. Blast radius is now the repo, not `cwd` |

### Recommendations

1. **Serialize, or isolate.** Either (a) drop `pipeline()` to concurrency 1 across guides and keep only the 2-reviewer fan-out, or (b) give each concurrent run its own worktree via `branchStrategy: {type:"branch", branch: …}` — but that lands you in #849/#854, which are open. Given those are open bugs, **(a) + accepting slower wall clock is the safer call for v1.** The 2 reviewers are read-only and short; even that is not risk-free (`git status` races), so measure before assuming.
2. **Add `node_modules` to the container as an anonymous volume or exclude it**; never run installs in `onSandboxReady`.
3. **Add a post-run tripwire**: `git status --porcelain` must show changes only under `guides/<slug>/` and `retro/runs/`. Fail the phase otherwise. This turns I7 from prose into a test (see §7).
4. Note the factory is already serialized *per issue* (`.github/workflows/guide-draft.yml:12-14`, `concurrency: guide-draft-issue-<n>`), and each issue gets its own runner VM — so the CI path only ever has one guide. **The concurrency exposure is almost entirely the local multi-guide CLI path.** That's a reason to fix it by policy (CLI concurrency 1) rather than by architecture.

---

## 6. CI: Docker on `ubuntu-latest`, and the `noSandbox()` asymmetry

### Docker availability — yes, but that's not the hard part

`.github/workflows/guide-draft.yml:11` runs `runs-on: ubuntu-latest` with steps executing directly on the runner (no job `container:`), so the preinstalled Docker daemon is available and `docker()` will work.

The real costs:

- **No prebuilt image is published** — you must run `sandcastle init` + `sandcastle docker build-image`, and the default image name is `sandcastle:<repo-dir-name>`. In CI that's a per-job image build unless you push to GHCR and pull, or use buildx layer caching. Add several minutes to a job that already runs `timeout-minutes: 180` (`guide-draft.yml:11`).
- **The image must contain what the roles need**: `claude` CLI, node, git, `gh`, and network egress to provider documentation sites — research agents fetch arbitrary vendor docs (`doctrine/roles/technical-research.md:13-36`) — plus `npx ajv-cli` (`:40`). Sandcastle's `docker()` exposes a `network` option; a locked-down network breaks research outright.
- **UID alignment.** The image build passes host UID/GID (ADR-0014); on GitHub runners the user is `runner` (uid 1001), not 1000. Get this wrong and agent-written files under `guides/<slug>/` are root-owned, and the very next step — `factory commit-push` (`factory/cmd-git.ts:69-101`) — fails or commits with wrong ownership.
- **Secrets:** `CURSOR_API_KEY` (`guide-draft.yml:119`) is replaced by `ANTHROPIC_API_KEY`/`CLAUDE_CODE_OAUTH_TOKEN` (or the OpenRouter pair). `PULSE_REGISTRY_KEY`/`PULSE_REGISTRY_TENANT` (`:120-121`) are read by the **orchestrator**, not the agent (`pulse-catalog.ts:138-140`), so they must stay on the host process and must **not** be forwarded into the container — that's a constitution "no secret values" point (`doctrine/shared.md:77`).

### Is `noSandbox()` in CI + `docker()` locally sane? **No — it inverts the trust model, and the flag behavior is contradictory in the source.**

`noSandbox()` is accepted by `run()` (ADR-0015). But:

- `src/sandboxes/no-sandbox.ts:9-11` documents: *"Skips container isolation entirely — the agent executes on the host. **Does not pass `--dangerously-skip-permissions`** to the agent — the user manages permissions themselves."* ADR-0015's Consequences repeats this.
- **`src/Orchestrator.ts:142-144` hardcodes `dangerouslySkipPermissions: true`** for the `run()` path, unconditionally. Only `interactive()` conditions on the sandbox (`src/interactive.ts:398`: `sandboxProvider.tag !== "none"`).

So one of two things is true, and **neither is good for you**: either the docs are stale and `run()` + `noSandbox()` gives you an unrestricted agent executing directly on the GitHub runner — with `GH_TOKEN`/`AGENT_PAT` (`guide-draft.yml:24`), the model key, and write access to the checked-out repo including `.github/workflows/` — or the docs are right and the agent gets **no** permission bypass under `--print`, in which case it cannot write files at all and every phase fails the "files exist" postcondition. **Test this specific combination before designing around it.**

What else breaks in the asymmetry:

1. **Different toolchain, different guides.** The Docker image pins node/`gh`/`npx`; the runner has its own. `doctrine/roles/technical-research.md:38-43` tells the agent to validate `meta.yaml` with whatever validator runs and to *report which method it used* — so the environment leaks into the artifact. Two environments = two behaviors for identical lock inputs, which quietly makes `pipeline.lock.json` digests non-portable in practice even though they're byte-portable by design (`doctrine/pipeline-lock.md:73-76`).
2. **Prompt expansion runs "in the sandbox"** (`PromptPreprocessor.preprocessPrompt` → `sandbox.exec`). With `noSandbox()` that is the CI host. If you ever add a `` !`cmd` `` to a prompt file, it executes on the runner in CI and in a container locally. Don't build on that.
3. **I7 containment differs by environment.** Locally the container is a real boundary; in CI there is none. That is backwards — CI is where untrusted issue text arrives.

**Recommendation:** use `docker()` in **both** places. Build/push the image once to GHCR from a separate workflow, pull it in `guide-draft.yml`. If image build time proves prohibitive, the fallback is not `noSandbox()` — it's keeping the CI job's blast radius small by (a) running the agent as a non-root user, (b) not forwarding `GH_TOKEN` into the agent env, and (c) keeping the `git status` tripwire from §5.

---

## 7. Ranked risks and what I'd change in the plan

| # | Risk | Evidence | Fix |
|---|---|---|---|
| 1 | Single-run "write files then emit tag" is unreliable | Sandcastle's own 4/4 workflows split it (`run-with-extraction.ts`, `*/extraction.md`) | Two-run produce→extract for research/draft/revise; single-run for the 3 read-only phases |
| 2 | `head` + bind mount + our N×3 fan-out has no locking | ADR-0007 (head excluded), ADR-0018 (head unsafe for concurrent fan-out), #745 triage on `run.ts:350-354` | Serialize guides in the CLI; keep reviewer fan-out only after measuring `git status` races |
| 3 | OpenRouter is unsupported in both products | 0 hits for `openrouter`/`ANTHROPIC_BASE_URL` in `mattpocock/sandcastle`; only `ANTHROPIC_API_KEY`/`CLAUDE_CODE_OAUTH_TOKEN` documented | Prototype standalone before committing the design to it; keep `model` identity in the lock as `agent:model:effort` either way |
| 4 | `OBSERVED_AT` in hashed `promptArgs` silently kills every lock skip | `workflow.ts:560` injects `NOW`; `doctrine/pipeline-lock.md:93-97` forbids timestamps in the digest | Explicit exclude-list for volatile args; add a test that two runs differing only in `NOW` produce identical `input_digest` |
| 5 | `noSandbox()` permission behavior is self-contradictory in the source | `no-sandbox.ts:9-11` + ADR-0015 vs `Orchestrator.ts:142-144` | Don't use it; if you must, test it first |
| 6 | Untrusted issue/comment text drives an agent with repo-wide write access | `resolve-issue.ts:158-162`, `cmd-distill.ts:37-49`; `--dangerously-skip-permissions` hardcoded | `git status` tripwire; keep the narrow `git add` in `cmd-git.ts:69-78` |
| 7 | `promptArgs` shell-injection depends on a `\x01` sentinel | CHANGELOG `6bc4d74`; `PromptPreprocessor.ts:16` | Pin ≥ the fixing release; regression test with `` !`id` `` in notes |
| 8 | node_modules corruption on macOS dev machines | #745, #873; our `@cursor/sdk-*` + esbuild deps | No install hooks; isolate `node_modules` from the mount |
| 9 | Remediation prompts can't be templated | ADR-0008; `run.ts:816-817` | Accept it — keep the 3 remediation builders in TS, document why |
| 10 | 16 committed locks all go cold on first run | all 16 have `"runtime":"cursor-sdk"`; model + prompt_digest both change | Plan/budget one full re-draft sweep; don't treat `runtime` as a migration signal (stale on non-converged guides) |

**Things the plan gets right and should keep:** `head` avoids the two open worktree-corruption bugs (#849/#854); `Output.object` + Standard Schema is strictly better than `json.ts`'s brace-slicing; hashing real prompt-file bytes fixes the `PROMPT_TEMPLATES` drift hole; and splitting conditionals into separate prompt files deletes `PROMPT_TEMPLATES.draft(existing)` (`lock.ts:116-138,558`) as a bonus.

**Requirements from the earlier map that this design must still pass** (all testable, all unaffected by the runtime swap): agents never commit (I7); writes confined to `guides/<slug>/`; `status:"ok"` verified against disk, not trusted; one remediation turn; lint runs every round and is never cache-skipped; the lock writes only on converge; `{{ gram.oauth.callback_url }}` survives verbatim; exit codes 0/2/3 keep their factory meanings.
