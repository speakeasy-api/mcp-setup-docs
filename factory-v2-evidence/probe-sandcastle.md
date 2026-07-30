# Probe: `@ai-hero/sandcastle` 0.12.0 as a pi runtime

**Date:** 2026-07-30
**Probe dir:** `/home/walker/github.com/speakeasy-api/mcp-setup-docs/.claude/worktrees/sandcastle-factory/.tmp-probe-sandcastle/`
**Versions:** `@ai-hero/sandcastle@0.12.0`, `pi` 0.57.1 (global, untouched), node v24.16.0, zod 4.4.3
**Model used:** `openrouter/openai/gpt-5-nano`
**Total OpenRouter spend:** **$0.00254**
**`OPENROUTER_API_KEY`:** present via `mise exec`, length 73. Value never printed.

## How the source was read

The npm package ships `dist/` only — no `src/`. But `dist/index.js.map` carries
`sourcesContent` for all 19 first-party modules, so the original TypeScript was
recovered verbatim:

```bash
node -e '...JSON.parse(fs.readFileSync("dist/index.js.map")).sourcesContent...'
# -> src-extracted/src/{Orchestrator,run,AgentProvider,Output,...}.ts  (47 files)
```

All line numbers below are into those recovered originals, which match the
shipped bundle. Note `dist/sandboxes/no-sandbox.js.map` has **no**
`sourcesContent`; that file came from `index.js.map`.

---

## Q1 — Does `run()` + `noSandbox()` pass `--dangerously-skip-permissions`?

### **PARTIAL** — both sides of the contradiction are wrong, and the answer depends on the layer.

- At the **orchestrator layer: YES**, it is hardcoded `true`. `no-sandbox.ts`'s
  docstring and ADR-0015 are **factually wrong** about the `run()` path.
- At the **pi adapter layer: NO**. The pi adapter never reads the field, so
  `pi` never receives the flag. For our use case the flag is moot.

### The orchestrator does hardcode it

`run()` → `orchestrate()` (`src/run.ts:741`) → `src/Orchestrator.ts:140-146`:

```ts
    const execEffect = Effect.gen(function* () {
      const printCmd = provider.buildPrintCommand({
        prompt,
        dangerouslySkipPermissions: true,      // <-- src/Orchestrator.ts:143
        resumeSession,
        forkSession,
      });
```

Unconditional. No reference to `sandboxProvider.tag`. Compare the two call
sites that *do* gate correctly:

```
src/interactive.ts:398      dangerouslySkipPermissions: sandboxProvider.tag !== "none",
src/createWorktree.ts:434   dangerouslySkipPermissions: resolvedSandbox.tag !== "none",
src/createSandbox.ts:631    dangerouslySkipPermissions: true,      <-- also ungated
```

So `interactive()` and `createWorktree()` honour the documented contract;
`run()` and `createSandbox()` do not.

### The docstring that contradicts it

`src/sandboxes/no-sandbox.ts:8-11`:

```ts
 * Accepted by `run()`, `interactive()`, and `createSandbox()`. Skips
 * container isolation entirely — the agent executes on the host. Does not
 * pass `--dangerously-skip-permissions` to the agent — the user manages
 * permissions themselves.
```

This is wrong for two of the three functions it names.

### But the pi adapter drops the field on the floor

`src/AgentProvider.ts:637-654` — note the destructure:

```ts
  buildPrintCommand({
    prompt,
    resumeSession,
  }: AgentCommandOptions): PrintCommand {
    const thinkingFlag = options?.thinking ? ` --thinking ${options.thinking}` : "";
    const sessionFlag = resumeSession ? ` --session ${shellEscape(resumeSession)}` : "";
    return {
      command: `pi -p --mode json --model ${shellEscape(model)}${thinkingFlag}${sessionFlag}`,
      stdin: prompt,
    };
  },
```

`dangerouslySkipPermissions` is not destructured and not referenced. Contrast
`claudeCode` at `src/AgentProvider.ts:1190-1205`, which does consume it and
emits ` --dangerously-skip-permissions`.

This is correct behaviour, because pi has no such flag — confirmed against the
installed CLI:

```
$ pi --help | grep -i permission
(no output)
```

pi's tool set (`read,bash,edit,write`) is enabled by default with no approval
gate in `-p` mode. So writes work without any flag.

### Consequence for us

Irrelevant for pi. **But** it is a live hazard for `claudeCode`, `opencode`,
and `cursor`: under `run()` + `noSandbox()` those adapters *will* receive the
permission bypass on the host, contrary to what the shipped docstring promises.

---

## Q2 — Can `run()` + `noSandbox()` + `pi` write a file?

### **YES.**

`q2.mjs`:

```js
import { run, pi } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

const PROBE_DIR = new URL(".", import.meta.url).pathname;

const result = await run({
  agent: pi("openrouter/openai/gpt-5-nano"),
  sandbox: noSandbox(),
  cwd: PROBE_DIR,
  branchStrategy: { type: "head" },
  maxIterations: 1,
  logging: { type: "stdout" },
  prompt:
    "Create a file named probe-write.txt in the current working directory. Its contents must be exactly PROBE_OK and nothing else. Then stop.",
});
```

Command and result:

```
$ mise exec -- bash -c 'timeout 300 node q2.mjs'
=== EXIT: 0 ===

●  Iteration 1/1
◆  Setting up sandbox
◆  Agent started
│  Done. Created probe-write.txt with contents exactly "PROBE_OK".
●  Agent stopped
◇  Collecting commits
●  Reached max iterations (1).
▲  Run complete: reached 1 iteration(s) without completion signal.

=== branch === "worktree-sandcastle-factory"
=== commits === []
=== preservedWorktreePath === undefined
```

File verified on disk:

```
$ cat probe-write.txt
PROBE_OK[EOF]        # 8 bytes, no trailing newline
```

No refusal, no permission prompt, no hang, no false success.

### Git safety — verified statically and empirically

`branchStrategy: { type: "head" }` + `tag === "none"` takes the branch at
`src/SandboxFactory.ts:346` (`// Head mode: use hostRepoDir directly, no worktree.`),
which skips `pruneAndCreate()` entirely. The dangerous block in
`src/SandboxLifecycle.ts:432` (`git checkout --detach`) and `:441`
(`git merge`) is guarded by `if (hostCurrentBranch !== null)` at `:408`, and
`hostCurrentBranch` is `null` whenever `branch` is set (`:201`) — which head
mode always does (`src/run.ts:738-739`). Only read-only `git rev-parse` /
`git rev-list` / `git config` run.

`resolveCwd` (`src/resolveCwd.ts:25-26`) uses the given path verbatim; it does
**not** walk up to a git root, so `hostRepoDir` stayed inside the probe dir.

Before/after on the real repo — identical:

```
HEAD    3794b3d054e90cc68213798a405bad216a486e5b  (unchanged)
branch  worktree-sandcastle-factory               (unchanged)
status  ?? FACTORY-V2.md                          (pre-existing, unchanged)
stashes 3                                         (unchanged)
worktrees 11                                      (unchanged)
```

The only reflog entry (`reset: moving to HEAD`) is stamped
`2026-07-30 12:00:43 -0700`, 1h45m *before* the probe began (first write at
13:38). `grep -rn "git reset|git stash|git clean"` over all 47 sources returns
no executable match. No `git add`/`commit`/`push`/`checkout` was run by me or
by sandcastle.

---

## Q3 — Does `Output.object` work, and does retry round-trip?

### **YES** to both. The session JSONL is resumed in place; the run does *not* hard-fail.

### Happy path (`q3a.mjs`)

```js
  output: Output.object({
    tag: "result",
    schema: z.object({ answer: z.number() }),
    maxRetries: 1,
  }),
  prompt:
    'Do not use any tools. Reply with exactly this and nothing else: <result>{"answer":42}</result>',
```

```
=== EXIT: 0 ===
│  <result>{"answer":42}</result>
=== OUTPUT === {"answer":42}
=== typeof answer === number
=== iteration sessionIds === ["6c4d56e0-1cf7-4d57-af1a-c6414555c5f3"]
```

Both documented constraints are real and enforced at entry, before any spend:
`maxIterations === 1` (`src/run.ts:551`), opening tag must appear in the
resolved prompt (`src/run.ts:605-610`), and `maxRetries > 0` requires a
provider with `sessionStorage` (`src/run.ts:570`).

### Induced schema failure → retry fires (`q3b.mjs`)

Attempt 1 forced to emit a string where the schema demands a number:

```js
  schema: z.object({ answer: z.number() }),
  maxRetries: 1,
  prompt:
    'Do not use any tools. Reply with exactly this and nothing else: <result>{"answer":"forty-two"}</result>',
```

```
=== EXIT: 0 ===
=== 'Iteration 1/1' banner count (2 = retry fired) ===
2
=== RESOLVED (retry must have fired) ===
=== OUTPUT === {"answer":42}
=== typeof answer === number
```

**The retry resumed the same session rather than starting a new one.** Decisive
evidence — the single pi session JSONL on the host contains *both* turns:

```
$ node ... ~/.pi/agent/sessions/--home-walker-...-tmp-probe-sandcastle--/2026-07-30T20-42-11-388Z_3942f33c-....jsonl
entries: 7
[0] type=session
[1] type=model_change
[2] type=thinking_level_change
[3] user: "Do not use any tools. Reply with exactly this and nothing else: <result>{\"answer\":\"forty-two\"}</result>"
[4] assistant: "<result>{\"answer\":\"forty-two\"}</result>"
[5] user: "Your previous response did not produce valid structured output.\n\nRetries remaining after this attempt: 0.\n\nProblem:\nStructured output tag <result> failed schema validation\n\nParser detail:\n[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": ..."
[6] assistant: "<result>{\"answer\":42}</result>"
```

Entry [5] is `buildStructuredOutputRetryFeedback` (`src/run.ts:59-88`), and it
forwards the actual zod issues. The mechanism is `run()` recursing into itself
with `resumeSession: error.sessionId` (`src/run.ts:876-887`).

### Missing-tag failure mode also retries (`q3c.mjs`, case 1)

```
########## CASE 1: MISSING TAG, maxRetries: 1 ##########
CASE1 RESOLVED output= {"answer":7}
CASE1 sessionIds= ["300ceb97-aeb9-4e97-999f-6a31641cf080"]
```

### With `maxRetries: 0` it fails cleanly and informatively (`q3c.mjs`, case 2)

```
CASE2 THREW StructuredOutputError
CASE2 isStructuredOutputError= true
CASE2 message= Structured output tag <result> not found in agent output
CASE2 tag= result
CASE2 rawMatched= undefined
CASE2 sessionId= "8fa7c18c-aeec-4f3d-ae0f-09abd017bcfb"
CASE2 sessionFilePath= undefined
CASE2 branch= "worktree-sandcastle-factory" commits= []
```

Note `sessionFilePath` is `undefined` under `noSandbox` — capture-to-host is
skipped because the file is already on the host. `sessionId` is populated,
which is the field retry actually needs. The `StructuredOutputError` JSDoc
(`src/Output.ts:166-167`) advertises `sessionFilePath` without noting it is
absent for the no-sandbox provider.

### Prerequisite verified separately: pi 0.57.1 resume-by-id works

sandcastle's parser comment claims verification against pi **0.73.1**; the host
has **0.57.1**, so I checked the two assumptions it rests on.

Session header is emitted (`src/AgentProvider.ts:554` expects `type:"session"` + `id`):

```
0 type=session id=a81f2445-6ffd-42aa-9b95-e9a932615506 keys=type,version,id,timestamp,cwd
```

`--session <id>` resolves an existing session by id, despite `pi --help`
documenting the flag as `--session <path>`:

```
ORIGINAL_SID=a81f2445-6ffd-42aa-9b95-e9a932615506
RESUME EXIT:0
NEW SESSION ID: a81f2445-6ffd-42aa-9b95-e9a932615506   # same id -> appended in place
REPLY: ["hi"]                                          # prior context retained
```

---

## Q4 — What does it cost us to adopt?

### 1. Silent success on a hard API failure — the serious one

pi exits **0** on a 400 from OpenRouter. The error appears only as
`errorMessage` / `stopReason:"error"` inside `message_start`/`message_end`/
`turn_end`:

```
$ echo hi | pi -p --mode json --model openrouter/this-model-does-not-exist-xyz
{"type":"message_start","message":{...,"stopReason":"error",...,"errorMessage":"400 this-model-does-not-exist-xyz is not a valid model ID"}}
=== EXIT: 0 ===
```

`parsePiStreamLine` (`src/AgentProvider.ts:546-611`) handles `agent_error` and
`error` *event types*, which pi 0.57.1 does not emit here. It never inspects
`errorMessage` or `stopReason` — `grep -n "errorMessage\|stopReason"
src/AgentProvider.ts` returns **nothing**. And the orchestrator decides
success purely on exit code (`src/Orchestrator.ts:191`):

```ts
      if (execResult.exitCode !== 0) { ... return yield* Effect.fail(new AgentError(...)) }
```

Result — `run()` **resolves successfully** on a total API failure:

```
$ mise exec -- bash -c 'timeout 200 node q4.mjs'
=== EXIT: 0 ===
UNEXPECTEDLY RESOLVED: "{\"type\":\"session\",\"version\":3,\"id\":\"28919c82-...\"...
```

For a docs pipeline this means a guide that never generated looks like a guide
that generated empty. Any adoption must add its own post-hoc check.

### 2. `result.stdout` silently changes shape

`src/Orchestrator.ts:209`:

```ts
      return { result: resultText || execResult.stdout, sessionId, usage };
```

On success `stdout` is the assistant's *text*; when no text event parses it is
the entire raw NDJSON stream. Q2 returned `Done. Created probe-write.txt...`;
Q4 returned raw JSON lines. Downstream string handling has to cope with both.

### 3. No pi version pinning whatsoever

sandcastle declares **no dependency on pi at all** — it shells out to whatever
`pi` is on `PATH`.

```
dependencies:      { "@clack/prompts": "^1.1.0" }
peerDependencies:  { "@daytona/sdk": ..., "@vercel/sandbox": ... }   # both optional/unmet
```

The only version signal in the codebase is a comment
(`src/AgentProvider.ts:552-553`): *"Verified against @mariozechner/pi-coding-agent
0.73.1."* Host runs 0.57.1 — 16 minor versions behind, npm `latest` is 0.73.1.
It happens to work (verified above), but the pi JSON stream format is an
unversioned, unenforced contract. A pi upgrade can silently break session-id
capture, which silently disables structured-output retry.

### 4. `noSandbox` hands the agent the entire host environment

`src/sandboxes/no-sandbox.ts:51`:

```ts
    const processEnv = { ...process.env, ...createOptions.env };
```

Every secret in the invoking shell is visible to the spawned agent process.
That is inherent to running without a container, but it is not called out in
the provider docs.

### 5. Writes outside the probe dir

sandcastle itself stayed inside `cwd` — with default logging it created exactly
`.sandcastle/logs/<branch>.log` (388 bytes) in the probe dir, nothing else.

**pi** writes sessions to `~/.pi/agent/sessions/<encoded-cwd>/`. This probe
left **9 session files** there. sandcastle deliberately removed pi's
`--no-session` flag (`src/AgentProvider.ts:644-646`: *"Drop the legacy
`--no-session` flag so fresh runs also persist"*), so **every** run persists a
session forever. There is no GC. In a docs pipeline this grows without bound.

### 6. Branch strategy is a loaded footgun on the non-head paths

`head` is safe (proved in Q2). But `merge-to-head` runs `git checkout --detach`
(`src/SandboxLifecycle.ts:432`) and `git merge` (`:441`) **against the host
repo**. The default is `head` for bind-mount providers and `merge-to-head` for
isolated ones (`src/run.ts:385-386`), so *switching sandbox provider silently
changes whether sandcastle mutates your git state*. `branchStrategy` must be
pinned explicitly, forever, in any adoption.

### 7. Smaller surprises

- **`PiOptions` is thin**: only `thinking`, `env`, `captureSessions`,
  `sessionStorage` (`src/AgentProvider.ts:613-625`). No way to pass `--tools` /
  `--no-tools` / `--system-prompt` / `--append-system-prompt` through
  sandcastle. Restricting the agent's toolset is not expressible.
- **Completion signal**: defaults to `<promise>COMPLETE</promise>`. Not emitting
  it is a *warning*, not an error — `▲ Run complete: reached 1 iteration(s)
  without completion signal.`
- **Effect is vendored** into a 126 KB `dist/index.js`; 15 MB installed. Runtime
  stack traces will be Effect-flavoured.
- **ADRs are not shipped** in the npm package — only `README.md`. ADR-0015
  cannot be consulted from an install; the `no-sandbox.ts` docstring is the only
  shipped statement of the permission contract, and it is wrong (Q1).
- Model strings pass through verbatim; `openrouter/openai/gpt-5-nano`
  (provider/id form) works unmodified.

---

## Blockers

1. **A failed pi run reports success.** (Q4.1) pi exits 0 on API errors;
   sandcastle keys success off exit code alone and ignores pi's `errorMessage`.
   Any adoption needs a bolt-on validity check on every run — which is exactly
   the layer sandcastle was supposed to own.
2. **The pi CLI contract is unpinned and unversioned.** (Q4.3) No dependency, no
   version assertion, a stream-format contract documented only in a comment
   naming a version we are not running. Session capture — hence structured-output
   retry — degrades silently if it drifts.
3. **Unbounded session accumulation in `~/.pi`.** (Q4.5) `--no-session` was
   deliberately removed; no cleanup path exists.

None of these blocked the probe itself: Q1 resolved, Q2 wrote the file, Q3
round-tripped the retry. They are adoption costs, not capability gaps.

## Recommendation

**Spawn pi directly.** The only thing sandcastle actually buys us on the
`run()` + `noSandbox()` + `head` path is `Output.object` + retry — which is
~200 lines we just read in full (`extractStructuredOutput.ts` is 161 lines,
`buildStructuredOutputRetryFeedback` is 30) over a `pi -p --mode json --model X
[--session ID]` subprocess. Every other feature (worktrees, containers, branch
strategies, merge-back) we are deliberately switching off, while still
inheriting a run that reports success when the model call 400s, an unpinned CLI
contract, and a permission-flag path whose shipped documentation is wrong.
