# Sandcastle — research report

**Basis:** all code/README quotes are from a clone of `mattpocock/sandcastle` at `main` HEAD `e99f832f26dc9d245c019a9ddd19fa5dee792427` (2026-06-29 21:15 +0100), which is the commit tagged `v0.12.0`. Registry/API figures pulled 2026-07-30.

---

## 1. Identity

| Fact | Value | Source |
|---|---|---|
| npm package | `@ai-hero/sandcastle` (scoped — **not** `sandcastle`) | `registry.npmjs.org/@ai-hero/sandcastle` |
| Repo | https://github.com/mattpocock/sandcastle | — |
| Latest version | **0.12.0**, published **2026-06-29T20:16:25Z** | npm `time` field |
| First publish | `0.0.1` on 2026-03-26; repo created 2026-03-17 | npm `time.created`; GH `created_at` |
| License | MIT (both `package.json` and GH `license.spdx_id`) | — |
| Downloads | **109,737 last week** (2026-07-23→29); 361,459 last 30 days | `api.npmjs.org/downloads/point/...` |
| Stars / forks | 7,109 / 726 | GH API |
| Open issues | **86 issues + 38 PRs** (GH's `open_issues_count: 124` conflates the two) | `search/issues` counts |
| Last push to `main` | **2026-06-29** — no commits in ~1 month | GH `pushed_at` |
| Binary | `sandcastle` (`dist/main.js`) | `package.json#bin` |

**Maturity / stability.** There is no "experimental" banner in the README. The stability signal is in the contributor guide instead — breaking changes ship as *minor* bumps:

> "Make all bugfixes `patch`, all new features or breaking changes `minor` (**since we're pre-1.0**)." — [`AGENTS.md`](https://github.com/mattpocock/sandcastle/blob/main/AGENTS.md)

Two precise wrinkles worth knowing:

- **`0.11.0` was never published to npm** and has no release tag, despite having a full `CHANGELOG.md` section. Published versions jump `0.10.0 → 0.12.0`. Its features (`Output` `maxRetries`, `sandbox.run()` resume/fork) are present in 0.12.0 since versions are cumulative — but don't pin `^0.11.0`.
- **Past CVE-class bug in this exact package**: `AIKIDO-2026-10637`, High (85) — *"Affected versions allow attacker-controlled `promptArgs` to be injected into prompts and mistakenly executed as shell commands, leading to possible command or remote shell execution."* Affects **0.2.0–0.5.3**, fixed in **0.5.4**. ([intel.aikido.dev](https://intel.aikido.dev/cve/AIKIDO-2026-10637)) The current README documents the fix as a guarantee: `` !`…` `` patterns inside a `promptArgs` value "are treated as inert text." No GitHub Security Advisories are published on the repo itself (`/security-advisories` returns empty).

**Docs site: not found.** There is a `docs/` directory in-repo (Next.js 16 + fumadocs) with exactly three MDX pages (`index`, `agents`, `configuration`), but the repo's `homepage` field is empty and I found no deployed public docs URL. **The 1,400-line README is the documentation.** `CONTEXT.md` and `docs/adr/` (20 ADRs) are the design record.

---

## 2. The problem it solves, in Matt's framing

His own words, from his announcement posts:

> "I built a framework for co-ordinating AFK coding agents. It's called Sandcastle. Watch me use it to pick tasks, parallelize N coding agents, and merge the code — all AFK" — [@mattpocockuk, status/2039350619681554434](https://x.com/mattpocockuk/status/2039350619681554434)

> "I built my own software factory, and I open-sourced it. It's called Sandcastle." — [@mattpocockuk, status/2049506712801935611](https://x.com/mattpocockuk/status/2049506712801935611)

*(Caveat: x.com returns HTTP 402 to WebFetch, so I have these post texts only via search-result titles and a third-party archive at [kishorkukreja/Self-OS](https://github.com/kishorkukreja/Self-OS/blob/master/wikis/ai-research-os/raw/x-threads/2026-04-30-mattpocockuk-sandcastle-open-source.md). The video content itself I could not verify.)*

The README's own three-line pitch:

> 1. You invoke agents with a single `sandcastle.run()`.
> 2. Sandcastle handles sandboxing the agent with a configurable branch strategy.
> 3. The commits made on the branches get merged back.

**The mental model, stated precisely.** `CONTEXT.md` is an unusually rigorous ubiquitous-language document — it defines each term *and* lists banned synonyms:

```
**Sandbox**: The isolation boundary around the **agent** -- a container, VM, or similar
environment that constrains the **agent**'s access.
_Avoid_: "container" (too specific), "Docker sandbox", "workspace"

**Host**: The developer's machine where Sandcastle runs and the real git repo lives.

**Agent**: The AI coding tool invoked inside the **sandbox** (e.g. Claude Code, Codex).
_Avoid_: "RALPH", "the bot", "Claude" (too specific -- agent is swappable)

**Iteration**: A single invocation of the **agent** inside the **sandbox**, producing at
most one commit against one **task**.
_Avoid_: "run" (ambiguous with the JS `run()` function), "cycle", "loop"
```
— [`CONTEXT.md`](https://github.com/mattpocock/sandcastle/blob/main/CONTEXT.md)

The "_Avoid_: RALPH" entries are the tell: this is a productized, sandboxed **Ralph loop** (prompt an agent in a loop until it emits a done-signal), with git worktrees as the isolation and merge mechanism.

**The deliberate non-opinion**, from the README:

> "Sandcastle uses a flexible prompt system. You write the prompt, and the engine executes it — **no opinions about workflow, task management, or context sources are imposed.**"

---

## 3. Core API surface

Exact exports, verbatim from [`src/index.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/index.ts):

```typescript
export { run } from "./run.js";
export { interactive } from "./interactive.js";
export { createSandbox } from "./createSandbox.js";
export { createWorktree } from "./createWorktree.js";
export { Output, StructuredOutputError } from "./Output.js";
export { CwdError } from "./CwdError.js";
export { claudeCode, codex, copilot, cursor, opencode, pi } from "./AgentProvider.js";
export {
  createBindMountSandboxProvider,
  createIsolatedSandboxProvider,
} from "./SandboxProvider.js";
export {
  transferClaudeSession, transferCodexSession, encodeProjectPath,
  claudeHostSessionPath, claudeSandboxSessionPath,
  findClaudeSessionOnHost, findCodexSessionOnHost,
} from "./SessionStore.js";
```

That is the **entire** runtime export surface: 4 orchestration functions, 6 agent factories, 2 provider-builder helpers, 1 output namespace, 2 error classes, and session-path utilities. Everything else is types.

Sandbox providers ship as **separate subpath exports** (so `@vercel/sandbox` / `@daytona/sdk` stay optional peer deps):

```json
"./sandboxes/docker" | "./sandboxes/vercel" | "./sandboxes/podman"
| "./sandboxes/daytona" | "./sandboxes/no-sandbox"
```

> ⚠️ `daytona` is exported from `package.json` and implemented at `src/sandboxes/daytona.ts`, but the README's provider table lists only Docker/Podman/Vercel/no-sandbox — **`daytona` appears in zero README lines**. It's shipped-but-undocumented.

**The canonical example** (README quick start):

```typescript
import { run, claudeCode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

await run({
  agent: claudeCode("claude-opus-4-8"),
  sandbox: docker(), // or podman(), vercel(), or your own provider
  promptFile: ".sandcastle/prompt.md",
});
```

**`RunResult`** (README §RunResult):

| Field | Type |
|---|---|
| `iterations` | `IterationResult[]` |
| `completionSignal` | `string?` |
| `stdout` | `string` |
| `commits` | `{ sha }[]` |
| `branch` | `string` |
| `logFilePath` | `string?` |
| `output` | `T?` (only when `output` option set) |

**Long-lived sandbox** — `createSandbox()` + explicit disposal via `await using`:

```typescript
await using sandbox = await createSandbox({
  branch: "agent/fix-42",
  sandbox: docker(),
  hooks: { sandbox: { onSandboxReady: [{ command: "npm install" }] } },
});

await sandbox.run({ agent: claudeCode("claude-opus-4-8"), promptFile: ".sandcastle/implement.md", maxIterations: 5 });

// Verify before review — non-zero exitCode is returned, not thrown.
const tests = await sandbox.exec("npm test");
if (tests.exitCode !== 0) throw new Error(`Tests failed:\n${tests.stdout}\n${tests.stderr}`);

await sandbox.run({ agent: claudeCode("claude-sonnet-4-6"), prompt: "Review the changes and fix any issues." });
```

**Custom provider seam** — the two builders take a `create()` returning a handle with `exec`/`close`/`copyFileOut`/`worktreePath`:

```typescript
interface ExecResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}
```

The README ships a complete ~90-line reference implementation of a `localProcess()` bind-mount provider that just `spawn`s `sh -c`. That's the whole contract — small enough that "write your own backend" is genuinely realistic.

---

## 4. How it models work

**Not** a workflow engine. There are no agents-as-graph-nodes, no step DSL, no state machine, no durable execution.

- **Unit of composition = one `await run(...)` call.** Composition is done in **plain TypeScript** in a script you own (`.sandcastle/main.ts`), executed with `npx tsx`. `for` loops, `if`, `Promise.all` — that's the orchestration language.
- **Unit of agent work = an "iteration"**: one CLI invocation, "producing at most one commit against one task" (`CONTEXT.md`). `maxIterations` re-invokes the agent up to N times; the loop exits early when the agent emits the **completion signal** (default `<promise>COMPLETE</promise>`), which `CONTEXT.md` calls "a pure termination signal — carries no payload."
- **Tools: Sandcastle provides none.** It does not define, register, or broker tools. It spawns an agent CLI which brings its own tools. The only tool-awareness in the codebase is a display allowlist for rendering:
  ```typescript
  /** Maps allowlisted tool names to the input field containing the display arg */
  const TOOL_ARG_FIELDS: Record<string, string> = {
    Bash: "command", WebSearch: "query", WebFetch: "url", Agent: "description",
  };
  ```
  — [`src/AgentProvider.ts:43-49`](https://github.com/mattpocock/sandcastle/blob/main/src/AgentProvider.ts)

**Three ways units pass data — and only three:**

1. **Git.** The primary channel. Commits land on a branch; `result.commits` and `result.branch` come back; a later agent merges. This is the point of the library.
2. **Structured output.** `result.output`, a typed JS value extracted from an XML tag in stdout (§6).
3. **Prompt arguments.** You interpolate JS values into the next agent's prompt via `promptArgs: { KEY: value }` → `{{KEY}}`, or via `` !`shell command` `` expansion (which runs **inside the sandbox**, after `onSandboxReady` hooks).

Two built-ins are always injected: `{{SOURCE_BRANCH}}` (branch the agent works on) and `{{TARGET_BRANCH}}` (host's active branch at `run()` time). Passing either in `promptArgs` is an error.

**Branch strategies** are the real state model:

| Strategy | Behavior | Bind-mount | Isolated |
|---|---|---|---|
| `{ type: "head" }` | Agent writes directly to the host working dir. No worktree. | **Default** | N/A |
| `{ type: "merge-to-head" }` | Temp branch in a worktree, merged back to HEAD, temp branch deleted. | Supported | **Default** |
| `{ type: "branch", branch }` | Commits land on a named branch in a worktree. | Supported | Supported |

Note the default for `docker()` is **`head`** — the agent writes straight into your working directory unless you say otherwise.

---

## 5. Model providers — **no AI SDK, no model client at all**

This is the single most important architectural fact, and it is unambiguous.

**Sandcastle does not depend on the Vercel AI SDK, the Anthropic SDK, the OpenAI SDK, or any HTTP client.** Its complete runtime dependency list is one package:

```json
"dependencies": { "@clack/prompts": "^1.1.0" },
"peerDependencies": { "@daytona/sdk": "^0.164.0", "@vercel/sandbox": ">=1.0.0" }  // both optional
```
— [`package.json`](https://github.com/mattpocock/sandcastle/blob/main/package.json). (`effect`, `zod`, `@effect/*` are **devDependencies only**; there's even a `scripts/check-public-types-effect-free.mjs` postbuild guard keeping Effect out of the public types.)

**It builds a shell command string and pipes a prompt to stdin.** Verbatim from [`src/AgentProvider.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/AgentProvider.ts):

```typescript
export const claudeCode = (model: string, options?: ClaudeCodeOptions) => ({
  name: "claude-code",
  buildPrintCommand({ prompt, dangerouslySkipPermissions, resumeSession, forkSession }) {
    const permissionFlag = options?.permissionMode
      ? ` --permission-mode ${options.permissionMode}`
      : dangerouslySkipPermissions ? " --dangerously-skip-permissions" : "";
    const effortFlag  = options?.effort ? ` --effort ${options.effort}` : "";
    const resumeFlag  = resumeSession ? ` --resume ${shellEscape(resumeSession)}` : "";
    const forkFlag    = resumeSession && forkSession ? " --fork-session" : "";
    return {
      command: `claude --print --verbose${permissionFlag} --output-format stream-json --model ${shellEscape(model)}${effortFlag}${resumeFlag}${forkFlag} -p -`,
      stdin: prompt,
    };
  },
  ...
});
```

The `model` argument is **a string spliced into the CLI's `--model` flag**. Nothing more. Same shape for every provider:

| Factory | Emitted command (abridged) |
|---|---|
| `claudeCode(m)` | `claude --print --verbose --output-format stream-json --model <m> -p -` |
| `codex(m)` | `codex exec --json --dangerously-bypass-approvals-and-sandbox -m <m>` |
| `pi(m)` | `pi -p --mode json --model <m>` |
| `opencode(m)` | `opencode run --format json --model <m>` |
| `cursor(m)` | `agent --print --output-format stream-json --model <m>` |
| `copilot(m)` | `copilot -p <prompt> --output-format json --model <m>` |

`export const DEFAULT_MODEL = "claude-opus-4-8";`

**Can you plug in an arbitrary OpenAI-compatible endpoint (e.g. OpenRouter)? Not through Sandcastle's API — there is no such option.** No `baseURL`, no `apiKey`, no provider config. A grep for `base_url|openrouter|ANTHROPIC_AUTH_TOKEN|litellm` across the entire repo returns **zero** hits outside an unrelated test fixture.

What you can do is configure the *underlying CLI* inside the sandbox, via two documented seams:

**(a) Environment variables.** Env resolution is deliberately narrow — read the docstring carefully:

```typescript
/**
 * Resolve all env vars from .env files with process.env fallback.
 *
 * Precedence: .sandcastle/.env > process.env
 * Only keys declared in .sandcastle/.env are resolved from process.env.
 * Repo root .env is not part of the resolution chain.
 */
```
— [`src/EnvResolver.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/EnvResolver.ts)

So an env var reaches the sandbox only if you **declare its key in `.sandcastle/.env`** (value may be blank, in which case `process.env` supplies it) — or pass it explicitly on the provider:

```typescript
await run({
  agent: claudeCode("claude-opus-4-8", { env: { ANTHROPIC_API_KEY: "sk-ant-..." } }),
  sandbox: docker({ env: { DOCKER_SPECIFIC_VAR: "value" } }),
  prompt: "Fix issue #42",
});
```
Merge rules: provider env beats the `.env` resolver; **agent env and sandbox env must not share any key or `run()` throws**.

For an Anthropic-compatible proxy (OpenRouter's Anthropic endpoint, LiteLLM, a gateway), the mechanism would be declaring `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` this way so Claude Code picks them up. **I found no documentation, test, or issue in the repo confirming this path works** — it follows from how env passthrough works, not from anything Sandcastle documents. Treat it as untested.

**(b) A sandbox hook that writes the CLI's own auth file.** This is the pattern the community actually uses for third-party providers, from [issue #540 — "Integrating with OpenCode and external providers via BYOK"](https://github.com/mattpocock/sandcastle/issues/540) (open):

```ts
const OPENCODE_AUTH = JSON.stringify({
  "zai-coding-plan": { type: "api", key: process.env.OPENCODE_API_KEY },
});

const authHook = {
  command: `mkdir -p /home/agent/.local/share/opencode && printf '%s' '${OPENCODE_AUTH}' > /home/agent/.local/share/opencode/auth.json`,
};

const hooks = { sandbox: { onSandboxReady: [authHook, { command: "yarn install" }] } };

await sandcastle.run({ hooks, sandbox: sandboxConfig, agent: sandcastle.opencode("zai-coding-plan/glm-5.1"), ... });
```

Note the model string `"zai-coding-plan/glm-5.1"` — with OpenCode, provider routing lives entirely in the model string plus OpenCode's own config. An OpenRouter model would be expressed the same way. The issue is still open and the reporter's own conclusion stands: *"the project could simplify the configuration for opencode providers."*

**(c) The clean escape hatch: implement `AgentProvider` yourself.** This is explicitly the sanctioned path, per [`.out-of-scope/built-in-agent-providers.md`](https://github.com/mattpocock/sandcastle/blob/main/.out-of-scope/built-in-agent-providers.md):

> "**a built-in provider is not required to use an agent with Sandcastle.** `AgentProvider` is a public, exported interface… Anyone who wants to run another agent can implement that interface in their own project and pass it as the `agent` — no change to Sandcastle is needed."

The bar for any such agent (from the same doc): "non-interactive run mode, prompt via stdin, a bypass-permissions flag, env-based auth, and (critically) line-delimited JSON stream events."

---

## 6. Structured output & schema validation

**Standard Schema**, not Zod-specific. The only schema import in the library is the spec types:

```typescript
import type { StandardSchemaV1 } from "@standard-schema/spec";

export interface OutputObjectDefinition<T> {
  readonly _tag: "object";
  readonly tag: string;
  readonly schema: StandardSchemaV1<unknown, T>;
  readonly maxRetries?: number;
}
```
— [`src/Output.ts`](https://github.com/mattpocock/sandcastle/blob/main/src/Output.ts)

Zod appears only as a `devDependency` and in template scaffolds. README: *"The schema can be any [Standard Schema](https://standardschema.dev) validator — the examples below use Zod, but Valibot, ArkType, and others work identically."*

The mechanism is **XML-tag extraction from stdout**, not tool-calling or JSON mode:

```ts
import { run, Output, claudeCode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { z } from "zod";

const result = await run({
  agent: claudeCode("claude-opus-4-8"),
  sandbox: docker(),
  prompt: `Analyze the code, and output the result as JSON inside <result> tags.
    The result must match this schema:
    { summary: string; score: string }
  `,
  output: Output.object({
    tag: "result",
    schema: z.object({ summary: z.string(), score: z.number() }),
  }),
});

console.log(result.output.summary); // typed as string
console.log(result.output.score);   // typed as number
```

Constraints, all enforced: **`maxIterations` must be `1`**; the resolved prompt **must literally contain the opening tag** or `run()` errors early; `Output.string({ tag })` skips JSON parsing and returns trimmed text. Sandcastle deliberately does *not* inject the tag instruction — you own the prompt side (`CONTEXT.md`, "Structured output").

**Retries on invalid output** — added in the 0.11.0 changeset, shipping in 0.12.0:

```ts
output: Output.object({
  tag: "result",
  schema: z.object({ summary: z.string(), score: z.number() }),
  maxRetries: 2, // 2 retries on top of the initial attempt
})
```

> "Each retry **resumes the same agent session** and feeds back a token-efficient description of the error, so the agent can re-emit a corrected tag **without redoing the work**. Retries require an agent provider that supports session resumption (`claudeCode`, `codex`, `pi`) — calling `run()` with `maxRetries > 0` against a non-resumable provider (`cursor`, `opencode`, `copilot`) **throws immediately**."

Default is `0`. On failure you get a `StructuredOutputError` carrying `tag`, `rawMatched`, `cause`, **and the run's side effects** (`commits`, `branch`, `preservedWorktreePath`) plus `sessionId`/`sessionFilePath` so you can drive the retry loop manually (e.g. to rotate models between attempts). Three distinct failure modes are documented: tag absent (`rawMatched === undefined`), `JSON.parse` failure, schema-validation failure.

---

## 7. What "sandcastle" actually sandboxes

**It sandboxes the agent process, using OS-level container/VM isolation — and it grants the agent no tools of its own.** The filesystem the agent sees is a **git worktree**, and the mechanism for getting work back out is **git commits**, not a file-diff protocol.

**Two provider shapes** (README §Custom Sandbox Providers):

- **Bind-mount** (Docker, Podman, your `localProcess()`): Sandcastle creates a worktree on the *host*, the provider mounts it in. "The agent writes directly to the host filesystem through the mount, so **no sync is needed**."
- **Isolated** (Vercel Firecracker microVMs, Daytona): "the sandbox has its own filesystem… The provider handles syncing code in and out via `copyIn` and `copyFileOut`."
- **`noSandbox()`**: explicit opt-out. Agent runs directly on the host, no isolation. Accepted by `run()`, `createSandbox()`, and `interactive()` — and it's the **default for `wt.interactive()`**.

**What the container actually looks like**, from the scaffolded [`.sandcastle/Dockerfile`](https://github.com/mattpocock/sandcastle/blob/main/.sandcastle/Dockerfile):

```dockerfile
FROM node:22-bookworm
RUN apt-get update && apt-get install -y git curl jq && rm -rf /var/lib/apt/lists/*
# ... installs GitHub CLI (gh) ...
ARG AGENT_UID=1000
ARG AGENT_GID=1000
RUN groupmod -o -g $AGENT_GID node && usermod -o -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node
USER ${AGENT_UID}:${AGENT_GID}
RUN curl -fsSL https://claude.ai/install.sh | bash
ENTRYPOINT ["sleep", "infinity"]
```

The container is a long-lived `sleep infinity` box; Sandcastle `docker exec`s into it. The agent runs as non-root `agent`, UID/GID-aligned to the host user via build args (ADR 0014) so bind-mounted files don't need runtime `chown`.

**Be clear-eyed about the security boundary.** From reading `src/sandboxes/docker.ts`, the launch config sets image, env, volume mounts, workdir, `--user`, and optionally `--network`/`--group-add`/`--device`/`--cpus`. There is **no `--network none` default, no `--cap-drop`, no `--read-only`, no seccomp/AppArmor profile.** Network egress is unrestricted by default. Meanwhile the agent is launched with `--dangerously-skip-permissions` (Claude) / `--dangerously-bypass-approvals-and-sandbox` (Codex) unless you override with `permissionMode` / `approvalsReviewer`.

This trade-off is raised, unresolved, in [issue #682](https://github.com/mattpocock/sandcastle/issues/682) (open, from a Discord thread with Matt):

> "`sandbox: docker()` uses plain Docker containers, which **share the host kernel**. Docker Sandbox put each agent run inside a microVM… For agent workloads specifically — arbitrary shell, package installs, `sudo`, evaluating untrusted content from issues / PRs / web pages / transitive deps — a container escape via a kernel bug is low-probability but not zero… At minimum, surfacing this trust boundary in the README would help users reason about where Sandcastle is safe to deploy."

The README still does not surface it. Use `vercel()` (Firecracker microVMs) if you need kernel isolation.

**Sandbox hooks can escalate:** `sandbox.onSandboxReady` accepts `{ command, sudo?: true, timeoutMs? }`, e.g. `{ command: "apt-get install -y ffmpeg", sudo: true }`.

---

## 8. Concurrency, fan-out, pipelines, barriers

**There are no concurrency primitives in the library.** Zero. Fan-out is `Promise.all` / `Promise.allSettled` in your own script, and the barrier is `await`.

This is the shipped `parallel-planner` template — plan → fan-out → merge, verbatim from [`src/templates/parallel-planner/main.mts`](https://github.com/mattpocock/sandcastle/blob/main/src/templates/parallel-planner/main.mts):

```typescript
for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  // Phase 1: Plan — opus emits a <plan> JSON, validated by Output.object
  const plan = await sandcastle.run({
    hooks, sandbox: docker(), name: "planner", maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-8"),
    promptFile: "./.sandcastle/plan-prompt.md",
    output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
  });
  const issues = plan.output.issues;
  if (issues.length === 0) break;

  // Phase 2: Execute — one sonnet agent per issue, each on its OWN branch.
  // Promise.allSettled means one failing agent doesn't cancel the others.  <-- the barrier
  const settled = await Promise.allSettled(
    issues.map((issue) =>
      sandcastle.run({
        hooks, copyToWorktree, sandbox: docker(),
        branchStrategy: { type: "branch", branch: issue.branch },
        name: "implementer", maxIterations: 100,
        agent: sandcastle.claudeCode("claude-sonnet-4-6"),
        promptFile: "./.sandcastle/implement-prompt.md",
        promptArgs: { TASK_ID: issue.id, ISSUE_TITLE: issue.title, BRANCH: issue.branch },
      }),
    ),
  );

  // Only branches that actually produced commits go to the merge phase.
  const completedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i]! }))
    .filter((e) => e.outcome.status === "fulfilled" && e.outcome.value.commits.length > 0)
    .map((e) => e.issue);

  // Phase 3: Merge — one agent merges all completed branches.
  await sandcastle.run({ /* ..., promptArgs: { BRANCHES, ISSUES } */ });
}
```

Every phase transition is a hard barrier (`await` on `Promise.allSettled`). There is no pipelining — a fast implementer sits idle until the slowest one finishes. If you want streaming/pipelined stages, you write that yourself.

**Concurrency safety rules you must obey manually:**

- **Fork fan-out requires distinct branches.** README, on `RunResult.fork()`: *"**Fork is session-only.** `--fork-session` and `codex exec fork` isolate the agent session JSONL — they do **not** isolate the branch, worktree, or sandbox. Safe concurrent fan-out (`Promise.all([r.fork(a), r.fork(b)])`) requires the caller to give each child a distinct `branch`… The default `head` and `merge-to-head` strategies are **not** safe for concurrent forks: `head` shares the host working directory across all children, and `merge-to-head` races `git merge` against the same HEAD."* (ADR 0018)
- **⚠️ There is an open correctness bug in exactly the safe path.** [Issue #849, "Concurrent branch-strategy worktrees delete each other"](https://github.com/mattpocock/sandcastle/issues/849) (open, with a deterministic repro):
  > "In-container git sees the worktree at `/home/agent/workspace` and repairs the **shared** admin gitdir to `/home/agent/workspace/.git`… The next `createSandbox` → `pruneStale` runs `git worktree prune` on the host. The rewritten gitdir is invalid on the host → **the live sibling's admin dir is removed**… under concurrency, sibling runs mutually annihilate: the boxes that finish early survive, the rest break with `fatal: not a git repository`."

  Related: [#854](https://github.com/mattpocock/sandcastle/issues/854) "Bind-mount worktree sandboxes corrupt worktree git metadata on non-Windows hosts". Both open, both untouched since the repo went quiet on 2026-06-29. **This is the headline feature's headline bug.**

---

## 9. Persistence & resumability

**There is no journal, no checkpoint, and no durable execution.** A grep for `journal|checkpoint|durable|resumeFrom|replay` across `src/`, `docs/`, and `README.md` returns **zero matches**. If your `main.ts` crashes at phase 3 of 3, you re-run the whole script. Sandcastle has no memory of the orchestration.

What *is* resumable is the **agent session**, at the CLI's own level:

**Session capture** (automatic, default-on for `claudeCode`, `codex`, `pi`): after each iteration the agent's session JSONL is copied out of the sandbox to the host, with `cwd` fields rewritten to the host repo root "so the provider's native resume command works." Locations: `~/.claude/projects/<encoded-path>/<session-id>.jsonl`, `~/.codex/sessions/YYYY/MM/DD/rollout-*-<id>.jsonl`, `~/.pi/agent/sessions/--<encoded-cwd>--/<ts>_<id>.jsonl`. For Claude Code, `Agent`- and `Workflow`-tool subagent transcripts under `<session-id>/subagents/agent-*.jsonl` are captured too (best-effort; main-session capture failure **fails the run**). Opt out with `captureSessions: false`.

**Resume** (mutates the session in place) and **fork** (new session id, parent left byte-for-byte intact — ADR 0018):

```typescript
const first  = await run({ agent: codex("gpt-5.4"), sandbox: docker(), prompt: "Draft a plan" });
const second = await first.resume?.("Now implement the plan");
```

```typescript
const parent = await run({ agent: claudeCode("claude-opus-4-8"), sandbox: docker(),
  prompt: "Read the codebase and summarise the data model" });

const [reviewA, reviewB] = await Promise.all([
  parent.fork?.("Review the migration plan", { branchStrategy: { type: "branch", branch: "review-a" } }),
  parent.fork?.("Audit the auth layer",      { branchStrategy: { type: "branch", branch: "review-b" } }),
]);
```

`resume?.` / `fork?.` are optional-chained because they exist **only** on results from providers with `sessionStorage` — Claude Code, Codex, Pi. Constraints: incompatible with `maxIterations > 1` (ADR 0011, throws before sandbox creation); host session file must exist; only iteration 1 gets the resume flag.

**Non-resumable by design:** `cursor`, `opencode`, `copilot`. The Copilot rationale is instructive:

> "Copilot CLI does expose `--resume <id>`, but its session state is indexed by a **SQLite database** alongside the JSONL files in `~/.copilot/session-state/`, so transferring a single session file between host and sandbox is not enough to make resume work (see ADR 0016). Until the round-trip is verified end-to-end, copilot is non-resumable." — `src/AgentProvider.ts:1117-1122`

**Crash-state preservation.** Both `sandbox.close()` and `wt.close()` check for uncommitted changes: **dirty worktree → preserved on disk** (path returned as `CloseResult.preservedWorktreePath`); clean → removed. `StructuredOutputError` also carries `preservedWorktreePath`. So work isn't silently destroyed, but recovery is manual.

---

## 10. Observability

**Logging** — two modes, file (default) or terminal:

```typescript
logging: {
  type: "file",
  path: ".sandcastle/logs/my-run.log",
  onAgentStreamEvent: (event) => {
    // event is { type: "text" | "toolCall" | "raw", iteration, timestamp, ... }
    myLogger.info(event);
  },
  verbose: true,
}
// logging: { type: "stdout", verbose: true },
```

- `onAgentStreamEvent` is the forwarding hook to external observability. Fires per text chunk, tool call, and raw stdout line, each stamped with `iteration` and `timestamp`. **Errors thrown by the callback are swallowed** — "so a broken forwarder cannot kill the run." **File mode only** (`CONTEXT.md`, "Agent stream event").
- `verbose: true` appends every raw stdout line the agent emits, "**Includes lines the provider's stream parser would otherwise drop**" — the debug escape hatch when a run goes silent.
- Only 4 tool names render with friendly args (`Bash`, `WebSearch`, `WebFetch`, `Agent`); everything else is dropped from the human-readable log (but survives in `verbose`).

**Token accounting** — raw counts, per iteration, Claude Code and Codex only:

```typescript
export interface IterationUsage {
  readonly inputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly outputTokens: number;
}
```

Claude Code parses these from the *last assistant message* in the captured session JSONL (`parseSessionUsage`); Codex maps them from `turn.completed` events. `usage` is `undefined` when capture is off or the provider doesn't support it (`pi`, `cursor`, `opencode`, `copilot`).

**Cost accounting: none.** There is no `$` figure anywhere. And **no context-window percentage either**, by explicit decision — [ADR 0005](https://github.com/mattpocock/sandcastle/blob/main/docs/adr/0005-usage-raw-tokens-no-percentage.md):

> "Context window size is not available from any data source Sandcastle reads. The session JSONL contains token counts but not the model's context limit… A hardcoded model-to-size lookup table was rejected as stale-prone and subject to the same bugs. **Callers who know the context window size for their model can compute percentage themselves from the raw counts.**"

**No tracing.** No OpenTelemetry, no spans, no trace IDs. `onAgentStreamEvent` is the entire integration surface.

---

## 11. Known limitations & explicit non-goals

The repo maintains a `.out-of-scope/` directory of signed-off "we will not build this" decisions — an unusually honest artifact. Summarized, with the reasoning quoted:

| Not doing | Why (quoted) |
|---|---|
| **More built-in agent providers** | "Every built-in provider is a standing maintenance commitment: its CLI surface, JSON stream format, auth model, and session-capture behaviour all have to be tracked." → implement `AgentProvider` yourself |
| **More built-in sandbox providers** | "The space of 'places you could run a container or microVM' is effectively unbounded" → implement `SandboxProvider` yourself |
| **Retry on provider errors** (rate limits, auth, quota, network) | "Sandcastle shells out to provider CLIs — it doesn't own the API connection or error interface… **Sandcastle fails fast on provider errors.**" |
| **Multi-repo sandboxes** | "The single-repo assumption is deeply threaded through the system… `SandboxConfig` bakes one `hostRepoDir` into an Effect context tag at layer construction time" |
| **Per-feature `docker()` options** (ports, contexts, GPU…) | Would drift toward "all of `docker run`, retyped in TypeScript" |
| **Dockerfile/base-image abstraction** | "Control is inverted towards the user. Sandcastle scaffolds a sensible default; the user owns the result." |
| **Configurable `sandcastle`/`.sandcastle` prefix** | Cosmetic; would thread a namespace through branch naming, worktree layout, log paths, and every provider |
| **Large bundled workflow templates** (superpowers/freecc-style) | "an implicit endorsement of one workflow over others" |

⚠️ Note: [`.out-of-scope/docker-provider-bespoke-options.md`](https://github.com/mattpocock/sandcastle/blob/main/.out-of-scope/docker-provider-bespoke-options.md) points users at **`dockerCompose()`** as an escape hatch, and `custom-base-image-abstraction.md` mentions **"Daytona, E2B"** as supported. `dockerCompose` **does not exist in `src/`** (grep: zero hits), and there is no E2B provider. These docs are stale; the open [issue #471 "Add docker-compose sandbox provider"](https://github.com/mattpocock/sandcastle/issues/471) is the actual status.

**Documented behavioral limitations:**

- **Structured output requires `maxIterations === 1`.** No structured output from a multi-iteration loop.
- **`resumeSession` is incompatible with `maxIterations > 1`** (ADR 0011).
- **Inline `prompt:` gets zero processing** (ADR 0008): no `{{KEY}}` substitution, no `` !`cmd` `` expansion, no `{{SOURCE_BRANCH}}`/`{{TARGET_BRANCH}}`. Passing `promptArgs` with an inline prompt is an error. All templating requires `promptFile`.
- **`promptFile` resolves against `process.cwd()`, NOT the `cwd` option.** A genuine footgun, called out twice in the README.
- **`copyToWorktree` is unsupported with `branchStrategy: { type: "head" }`.**
- **Prompt expansion fails fast**: any `` !`cmd` `` exiting non-zero fails the whole run (ADR 0020).
- **Cursor and Copilot cap prompts at 120 KiB** — their CLIs take the prompt as an argv argument, so Linux `ARG_MAX` applies. Other providers use stdin.
- **A branch already checked out in the host working tree cannot be used** — git refuses the same branch in two worktrees. "sandcastle still does **not** attempt smart recovery here."
- **Windows is a second-class but active target** — a stream of Windows-specific path/mount fixes in 0.11.0, plus open [#859 "Windows issues with docker/wsl"](https://github.com/mattpocock/sandcastle/issues/859).

**Open issues worth weighing before adopting** (all open as of 2026-07-30):

- [#849](https://github.com/mattpocock/sandcastle/issues/849) — concurrent branch-strategy worktrees mutually delete each other. Breaks the flagship parallel workflow.
- [#854](https://github.com/mattpocock/sandcastle/issues/854) — bind-mount worktrees corrupt git metadata on non-Windows hosts.
- [#870](https://github.com/mattpocock/sandcastle/issues/870) — **prompt injection via untrusted issue comments**: an attacker adds a malicious comment to a labeled GitHub issue, the agent ingests it via `` !`gh issue list --json …comments` ``, then deletes the comment. Unaddressed. This is inherent to the "pull issue bodies into the prompt" pattern the templates ship with, combined with `--dangerously-skip-permissions` and unrestricted network egress.
- [#873](https://github.com/mattpocock/sandcastle/issues/873) / [#745](https://github.com/mattpocock/sandcastle/issues/745) — init templates copy host `node_modules` into container worktrees by default; `pnpm install` in `onSandboxReady` then corrupts the **host** `node_modules` with Linux-only binaries on macOS.
- [#540](https://github.com/mattpocock/sandcastle/issues/540) / [#488](https://github.com/mattpocock/sandcastle/issues/488) — third-party/BYOK provider config and Codex-subscription auth are both unresolved, community-workaround territory.

**Project health, stated plainly.** 7.1k stars and ~110k weekly npm downloads against **86 open issues, 38 open PRs, and no commits since 2026-06-29** — a month of silence, during which several open correctness bugs sit in the parallel-execution path that is the library's main selling point. The download number is worth discounting somewhat: 110k/week against 7.1k stars is a ratio that usually indicates CI/mirror traffic rather than that many distinct human users.

---

## Bottom line

Sandcastle is a **git-worktree-and-container harness for CLI coding agents**, not an agent framework. It has no model client, no tool system, no workflow engine, and no durable execution — and each of those omissions is a deliberate, documented decision. The abstraction it actually sells is: *put an agent CLI in a box, hand it a branch, get commits back.* Composition is plain TypeScript; the only cross-agent data channels are git, an XML-tagged structured-output payload, and prompt interpolation.

If your interest is plugging an arbitrary OpenAI-compatible endpoint (OpenRouter) into it: **there is no first-class path.** Sandcastle passes a model string to a CLI's `--model` flag and passes env vars into a container. Whether OpenRouter works is entirely a question of whether the *underlying CLI* supports it, configured via `.sandcastle/.env` declarations or an `onSandboxReady` hook that writes that CLI's auth file. The `opencode` provider is the most tractable of the six for this, and issue #540 is the closest thing to a working recipe.

**Sources**

- [github.com/mattpocock/sandcastle](https://github.com/mattpocock/sandcastle) — README, `src/`, `CONTEXT.md`, `AGENTS.md`, `docs/adr/`, `.out-of-scope/`, `CHANGELOG.md`, `.sandcastle/Dockerfile`, `src/templates/`
- [registry.npmjs.org/@ai-hero/sandcastle](https://registry.npmjs.org/@ai-hero/sandcastle) and [api.npmjs.org/downloads](https://api.npmjs.org/downloads/point/last-week/@ai-hero/sandcastle)
- GitHub REST API — repo stats, releases, commits, issues #488, #540, #682, #849, #854, #870
- [intel.aikido.dev/cve/AIKIDO-2026-10637](https://intel.aikido.dev/cve/AIKIDO-2026-10637) — command-injection advisory
- [@mattpocockuk on X](https://x.com/mattpocockuk/status/2039350619681554434) and [status/2049506712801935611](https://x.com/mattpocockuk/status/2049506712801935611) — announcement posts (paywalled to WebFetch; text via search results + [third-party archive](https://github.com/kishorkukreja/Self-OS/blob/master/wikis/ai-research-os/raw/x-threads/2026-04-30-mattpocockuk-sandcastle-open-source.md))
- [standardschema.dev](https://standardschema.dev) — the schema spec Sandcastle targets
