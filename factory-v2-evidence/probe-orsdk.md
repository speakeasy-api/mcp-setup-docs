# Probe: `@openrouter/agent` as a replacement for `@cursor/sdk` in `pipeline/src/runtime.ts`

Probed 2026-07-30. Versions on disk: `@openrouter/agent` 0.8.0, `@openrouter/sdk` 0.13.67 (resolved via the agent's `^0.13.7` pin — **not** the 1.2.0 on npm latest).

Static analysis plus four live calls against `openai/gpt-4.1-mini`. No secrets printed. Nothing outside `.tmp-probe-orsdk/` was touched.

---

## Q1. Built-in filesystem tools?

**Verdict: NO. Definitively none. The grep hint was correct, and the reason is structural — the package cannot touch a filesystem.**

This is not an absence-of-evidence argument. The shipped code's *entire* set of external imports is:

```
from '@openrouter/sdk'                          from 'zod/v4'
from '@openrouter/sdk/core'                     from 'zod/v4/core'
from '@openrouter/sdk/funcs/betaResponsesSend'
from '@openrouter/sdk/hooks/hooks'
from '@openrouter/sdk/models'
from '@openrouter/sdk/models/easyinputmessage'
```

Zero imports of `node:fs`, `node:path`, `node:child_process`. Zero `readFileSync`/`writeFileSync`/`spawn`/`exec`. It is a pure HTTP + orchestration library with no I/O capability beyond the network.

The only tool-related exports from `esm/index.d.ts` are **factories**, not tools:

```ts
export { markMcp, serverTool, tool } from './lib/tool.js';
```

The only *named* tools anywhere in the package are three OpenRouter **server-executed** tools — `web_search`, `image_generation`, `file_search`. These run on OpenRouter's infrastructure, not your disk. Per `tool-types.d.ts`:

```ts
/**
 * A server-executed tool. OpenRouter runs the tool and returns an output
 * item in the response — no execute function lives on the client.
 */
export interface ServerTool<T extends ServerToolType = ServerToolType> extends ServerToolBase
```

`file_search` is vector-store/RAG retrieval, **not** local filesystem access. There is no `read_file`, no `write_file`, no `edit`, no `glob`, no `grep`, no `bash`.

**Impact on `runtime.ts`:** step 4 of the runtime's contract — *"the agent reads and writes files in the repo as part of doing the work"* — has **no counterpart** in this library. There is also no equivalent of `local: { cwd: repoRoot }`; no concept of a workspace exists in the type surface at all.

---

## Q2. If tools must be supplied, how much work?

**Verdict: The interface is genuinely good and the floor is low (~82 lines, verified compiling). The realistic cost is 300–600 lines plus permanent ownership of coding-agent tool quality — which is the actual expense, not the LOC.**

The `tool()` interface is clean and well-typed:

```ts
const weatherTool = tool({
  name: 'get_weather',
  description: 'Get the current weather for a location',
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => ({ temperature: 72, condition: 'sunny' }),
});
```

`inputSchema` is zod, `outputSchema` optional (return type inferred from `execute` otherwise), and there's a `contextSchema` for typed per-tool context injection.

I wrote and **typechecked** a real minimal toolset — `read_file`, `write_file`, `edit_file`, `glob`, plus a path-escape sandbox guard — at `.tmp-probe-orsdk/fs-tools.ts`:

```
82 lines · tsc --strict --module nodenext · EXIT=0, zero errors
```

That 82 lines is an honest **floor**, and it is not a usable coding agent. Missing, all of which Cursor and `pi` give you already:

- `grep` / ripgrep integration (the single highest-value tool for a code agent)
- line-ranged reads and output truncation — an unbounded `read_file` will blow the context window on a real repo
- `.gitignore` / ignore-file respect (otherwise the model globs into `node_modules`)
- directory listing, binary-file detection, encoding handling
- `bash` (the pipeline's agents plausibly need it)
- **prompt engineering to make a model actually use the tools well** — tool descriptions, error message wording, retry-on-bad-edit affordances

Note the sandbox guard in my probe: `local.cwd = repoRoot` in `@cursor/sdk` is one config line. Here it becomes a `safe()` function that **every single tool must remember to call**. That's a security-relevant invariant you now own and can silently break.

The ongoing maintenance is the real cost. Tool quality is most of what makes a coding agent work, and it is not a write-once artifact — it's tuned continuously against model behavior. Adopting this means the docs pipeline takes on being a coding-agent vendor as a side business.

---

## Q3. Multi-turn follow-up for the remediation path?

**Verdict: YES — fully supported, and the design is arguably better than `@cursor/sdk`'s because the conversation is serializable.**

The mechanism is a `StateAccessor` passed to `callModel`:

```ts
export interface StateAccessor<TTools extends readonly Tool[] = readonly Tool[]> {
    /** Load the current conversation state, or null if none exists */
    load: () => Promise<ConversationState<TTools> | null>;
    /** Save the conversation state */
    save: (state: ConversationState<TTools>) => Promise<void>;
}
```

```ts
export interface ConversationState<TTools> {
    version?: number;
    id: string;
    /** Full message history */
    messages: models.InputsUnion;
    /** Previous response ID for chaining (OpenRouter server-side optimization) */
    previousResponseId?: string;
    ...
}
```

**Live-verified.** Two `callModel` calls sharing one `state`; the second referred to *"that same file"* with no restatement:

```
turn1 text: "I have written the file named note.txt containing exactly the word \"one\"."
turn1 file : "one"
state msgs after t1: 4 status: complete
turn2 text: "The file note.txt has been updated to contain: \"one two\"."
turn2 file : "one two"
state msgs after t2: 8
CONTEXT RETAINED (t2 knew "that same file"): true
```

This maps cleanly onto `runtime.ts:104-118`. `agentHandle.send(followUp)` becomes a second `callModel({ ..., state })`. It's a **better** mapping than Cursor's: `serializeConversationState` / `deserializeConversationState` mean a remediation turn could survive a process restart, which the current `await using agentHandle` scope cannot.

One caveat, now resolved: open issue (2026-07-08) reports *"`callModel` with plain string `input` and existing `state` produces invalid `responsesRequest.input` array"* — exactly this pattern. Changelog PR #61 fixed it in 0.8.0, and my live test confirms it works. The issue is simply still open/stale.

---

## Q4. Structured output

**Verdict: YES, and materially better than what `runtime.ts` does today — server-enforced JSON Schema that works *simultaneously with tools*. This would let you delete `extractJson` entirely.**

There is no `getObject()` and no zod-native output helper on `ModelResult` — grep for `getObject|json_schema|responseFormat|structuredOutput` across the agent's `.d.ts` files returns **nothing**. But `CallModelInput` is a mapped passthrough over the full OpenResponses request:

```ts
type BaseCallModelInput<...> = {
    [K in keyof Omit<models.ResponsesRequest, 'stream' | 'tools' | 'input'>]?: FieldOrAsyncFunction<models.ResponsesRequest[K]>;
} & { input: ...; tools?: TTools; ... }
```

so the SDK's `text.format` field is available, and the SDK ships `FormatJsonSchemaConfig`:

```ts
export type FormatJsonSchemaConfig = {
    description?: string; name: string;
    schema: { [k: string]: any };
    strict?: boolean | null; type: "json_schema";
};
```

**Live-verified, including the combination that actually matters** — tools doing file work *and* a schema-constrained final report in one call:

```
z.toJSONSchema works: {"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object",...
final text: "{\"wrote\":[\"report.txt\"],\"ok\":true}"
TOOLS + STRUCTURED OUTPUT TOGETHER: true {"wrote":["report.txt"],"ok":true}
```

Comparison to the current hand-rolled path:

| | today (`runtime.ts`) | `@openrouter/agent` |
|---|---|---|
| schema conveyed to model | prose prompt (`schemaInstruction`, lines 55-69) | server-enforced `strict: true` json_schema |
| fence/prose stripping | `extractJson` — required | **not needed**, `JSON.parse(text)` works directly |
| zod → JSON Schema | manual `withSchemaHint` | `z.toJSONSchema()`, **native in zod 4, no new dep** |
| typing | `safeParse` | still `safeParse` (unchanged) |

Real improvement: `extractJson` and `withSchemaHint`/`SCHEMA_HINTS` both become deletable, and a whole class of "model wrapped it in ```json fences" failure disappears. Worth noting this is a **property of OpenRouter's API, not of `@openrouter/agent`** — you get it from the plain `@openrouter/sdk`, or from `pi`'s underlying OpenRouter calls, just as well.

---

## Q5. What are `anthropic-compat` / `chat-compat` / `claude-constants` / `hooks-*`?

**Verdict: NOT a Claude-Code-compatible harness. These are message-format converters plus a lifecycle-hook system. Nothing here changes the recommendation.**

The filenames are misleading. `anthropic-compat` converts *message shapes* between the Anthropic Messages API and OpenResponses:

```ts
/** Convert Anthropic Claude-style messages to OpenResponses input format. */
export declare function fromClaudeMessages(messages: ClaudeMessageParam[]): models.InputsUnion;
/** Convert an OpenResponses response to Anthropic Claude message format. */
export declare const toClaudeMessage: typeof convertToClaudeMessage;
```

`claude-constants` is four string literals for format sniffing (`"text" | "image" | "tool_use" | "tool_result"`). `chat-compat` is the same idea for OpenAI chat-completions shape. These exist so you can port code written against the Anthropic/OpenAI SDKs — they carry **no tools, no system prompt, no CLAUDE.md, no agent loop, no filesystem**.

`hooks-*` is a genuine lifecycle system, and the changelog explicitly cites its inspiration:

> *"Add a typed lifecycle hook system to `callModel`, **inspired by the Claude Agent SDK hooks pattern**."*

Eight hooks: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `PermissionRequest`, `Stop`, `SessionStart`/`SessionEnd`, plus `PostModelCall` with normalized usage/cost telemetry. This is legitimately nice — `PostModelCall` gives per-request `cost`, `durationMs`, and token counts, which `runtime.ts` has no equivalent of today.

But "Claude-Code-*shaped* hooks" is not "Claude Code". It is the observability scaffolding around an agent loop whose tools you still have to write yourself. **This does not change the answer to Q1.**

---

## Q6. Maturity risk

**Verdict: Young, actively developed, but carrying one concrete red flag — it ships pinned to an SDK major that was abandoned two days before the agent's own release.**

| signal | value |
|---|---|
| repo created | **2026-03-27** (4 months old) |
| last push | 2026-07-30 (today) — actively developed |
| stars | 19 |
| open issues | 14 |
| agent releases | 13, from 0.1.0 (2026-04-01) to 0.8.0 (2026-07-22) |
| weekly downloads | 147,427 (`@openrouter/sdk`: 624,023) |

**The pin is the real finding.** `@openrouter/agent` 0.8.0 depends on `@openrouter/sdk` `^0.13.7`, resolving to 0.13.67. But:

- `@openrouter/sdk` 0.13.x line: **56 versions, ended 2026-07-20** (last: 0.13.67)
- `@openrouter/sdk` 1.0.0 shipped **2026-07-20** — same day
- `@openrouter/agent` 0.8.0 shipped **2026-07-22** — *two days after* the 1.0 cutover, still pinned to the dead 0.13.x line
- The SDK has shipped **42 1.x versions in 10 days** (1.1.13 → 1.2.0 in the last 3 days alone), 206 versions total

So you'd be adopting a package that is one major version behind its own core dependency, on a line receiving no further publishes. When the agent does bump to `@openrouter/sdk` 1.x, that is a transitive-breaking-change event you'll absorb.

**Minor bumps carry breaking changes.** From the 0.8.0 changelog:

> *"**Breaking:** the `tool.result` event payload now includes `source`; consumers that constructed or exhaustively matched these events may need to account for it."*

> *"The forced final turn after `stopWhen` halts mid-tool-call is now **on by default**… Note: runs that previously ended on a halted tool-call turn now make one additional model request by default."*

A default silently flipping to "make one extra model request" in a **minor** bump is a cost and behavior change landing without a major.

**Docs drift is acknowledged by the maintainers.** Changelog PR #62: *"fix three README/API drifts found while building production agents — tool context is `ctx.local` (not `ctx.context`); the `state` option takes a `StateAccessor`… (not `(await getResponse()).state`)"*. Three wrong things in the README of a library this small, found only by someone building on it.

Open issues touch paths this pipeline would rely on: approval gate not enforced on `allowFinalResponse`; `getResponse()` throwing `'Invalid final response'` on tool-only turns; `fromChatMessages` producing wrong `input`. A 2026-07-29 commit adds *"doom-loop detection for the tool-execution loop"* — the tool loop had runaway-iteration problems recently enough to need a guard.

To be fair: 147k weekly downloads, provenance-signed publishes, changesets-based releases, real tests shipped in the tarball, and thoughtful type-level work (the `source` discriminant fix preventing one untyped MCP tool from collapsing every other tool's result type is careful engineering). This is a competent young library, not a toy. It's just young, and the pin is genuinely concerning.

---

## Q7. Verdict — head to head

| | `@openrouter/agent` | spawn `pi` |
|---|---|---|
| **built-in file tools** | **none — you write all of them** | full coding-agent toolset, maintained upstream |
| **maps `local.cwd = repoRoot`** | no equivalent; hand-rolled sandbox in every tool | `cwd` on the subprocess |
| **in-process vs subprocess** | ✅ in-process, typed | ❌ subprocess + NDJSON parsing |
| **error surfacing** | ✅ typed `Error` on `ToolExecutionResult.error`, `ZodError` re-exported, `PostModelCall` cost/usage telemetry | ❌ exit codes + stderr scraping |
| **multi-turn remediation** | ✅ `StateAccessor`, serializable — better than Cursor's | ✅ verified working |
| **structured output** | ✅ server-enforced json_schema, kills `extractJson` | ✅ same OpenRouter capability, available either way |
| **version-contract stability** | ⚠️ 0.8.0, breaking changes in minors, pinned to a dead SDK major | ⚠️ unpinned CLI contract |
| **total code we would own** | `runtime.ts` **+ an entire coding-agent toolset** (300–600 lines, permanently tuned) | `runtime.ts` + NDJSON parser (~100 lines) |

**Which is the closer mapping to what `runtime.ts` does today: `pi`.** Not close.

`@openrouter/agent` wins on the three things I expected it to win on — in-process typed errors, a cleaner multi-turn model than Cursor's, and structured output that deletes `extractJson`. Those are real. If `runtime.ts` were a *text-in, JSON-out* orchestrator, this would be the recommendation.

But it isn't. `runtime.ts`'s reason for existing is step 4: the agent reads and writes files in the repo. `@cursor/sdk` and `pi` are **coding agents**. `@openrouter/agent` is an **LLM-loop orchestrator** — the correct comparison is to the Vercel AI SDK, not to Cursor. Choosing it doesn't replace the Cursor dependency; it replaces the Cursor dependency *and* commits you to building and maintaining the part Cursor was actually providing. Swapping an unpinned CLI contract for permanent ownership of coding-agent tool quality is a bad trade for a docs pipeline.

The two genuine wins are separable and worth harvesting regardless: structured output via `text.format` + `z.toJSONSchema()` is a property of the OpenRouter **API**, not this package. If `pi` exposes a response-format passthrough, take that win there and delete `extractJson` anyway.

**Reconsider if** OpenRouter ships a first-party filesystem/bash toolset — that single addition flips this verdict, since everything else already maps well.

---

## Recommendation

**spawn `pi`.**

The deciding fact: `@openrouter/agent`'s shipped code imports **nothing** from Node's filesystem or process modules — it has no `read_file`, `write_file`, `edit`, `glob`, `grep`, or `bash`, and no workspace concept at all. It cannot do the one thing `runtime.ts` exists to do without you first building the coding agent it isn't.

---

### Artifacts (all under `.tmp-probe-orsdk/`, gitignored)

- `fs-tools.ts` — 82-line filesystem toolset, `tsc --strict` clean (Q2 sizing)
- `live-test.mjs` — multi-turn `StateAccessor` remediation proof (Q3)
- `so-test.mjs` — structured-output passthrough (Q4)
- `combo-test.mjs` — tools + structured output together (Q4, decisive)
- `sandbox/` — files written by the live agent runs
