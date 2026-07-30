# Sandcastle + OpenRouter: can it be done, and what is the least-bad wiring

**Evidence labels used throughout:**

| Label | Meaning |
|---|---|
| **[DOC]** | Stated in vendor documentation. Quoted, with URL. |
| **[CODE]** | Read directly from source in the Sandcastle clone at `main` HEAD `e99f832` (= `v0.12.0`). |
| **[VERIFIED]** | I executed it and observed the result. Raw output included. |
| **[INFERRED]** | My reasoning from the above. **Not** documented, **not** tested. Treat as a hypothesis to validate. |

---

## Verdict first

**Yes — three of Sandcastle's six agent providers can be driven by OpenRouter, and the least-bad wiring depends on which thing you actually want:**

| What you want | Use | Why |
|---|---|---|
| **Arbitrary OpenRouter models** (GLM, Qwen, Kimi, DeepSeek…) *with* schema-retry | **`pi()`** | Native first-class OpenRouter support **[DOC]**, and `pi` is one of the three resumable providers in Sandcastle **[CODE]**, so `Output.maxRetries` works |
| **Claude models, billed/routed through OpenRouter** | **`claudeCode()`** + `ANTHROPIC_BASE_URL` | The documented gateway path; most mature agent. But you are limited to Claude models, which defeats most of the point of OpenRouter |
| Arbitrary models, retry not needed | `opencode()` | Native OpenRouter, but **non-resumable in Sandcastle** — `Output` `maxRetries > 0` **throws at entry** **[CODE]** |

**The single most important thing I found**, and it is documented by Anthropic, not inferred:

> "Anthropic doesn't endorse, maintain, or audit third-party gateway products, and **doesn't support routing Claude Code to non-Claude models through any gateway**."
> — [code.claude.com/docs/en/llm-gateway](https://code.claude.com/docs/en/llm-gateway)

So "Claude Code CLI + OpenRouter + a non-Claude model" is explicitly outside what Anthropic supports. Claude Code + OpenRouter + *Claude* models is the documented gateway mechanism working as designed — unsupported only in the sense that Anthropic doesn't audit OpenRouter.

---

## 1. Claude Code CLI + OpenRouter

### 1.1 Does the CLI (not just the SDK) honour these vars? — **Yes. [DOC]**

`ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_API_KEY` are the CLI's documented LLM-gateway mechanism, with a whole doc set behind them. From [llm-gateway-connect](https://code.claude.com/docs/en/llm-gateway-connect):

```bash
export ANTHROPIC_BASE_URL=https://llm-gateway.example.com
export ANTHROPIC_AUTH_TOKEN=sk-gateway-key
```

### 1.2 Exactly what `ANTHROPIC_BASE_URL` must be — **no `/v1`. [DOC] + [VERIFIED]**

Claude Code appends the path itself. Anthropic's own verification snippet is unambiguous:

```bash
curl -X POST "$ANTHROPIC_BASE_URL/v1/messages" \
  -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01" ...
```
— [llm-gateway-connect §Verify the connection](https://code.claude.com/docs/en/llm-gateway-connect)

So `ANTHROPIC_BASE_URL=https://openrouter.ai/api` → Claude Code posts to `https://openrouter.ai/api/v1/messages`. That matches OpenRouter's documented value exactly:

> `ANTHROPIC_BASE_URL`: `"https://openrouter.ai/api"`
> `ANTHROPIC_AUTH_TOKEN`: Your OpenRouter API key
> `ANTHROPIC_API_KEY`: `""` (explicitly blank to prevent conflicts)
> — [openrouter.ai/docs/cookbook/coding-agents/claude-code-integration](https://openrouter.ai/docs/cookbook/coding-agents/claude-code-integration)

**Setting `/api/v1` would produce `/api/v1/v1/messages` and 404.** Do not "helpfully" add the `/v1`.

**I verified the endpoint exists** (unauthenticated probe — a real endpoint 401s, a bogus one 404s):

```
POST https://openrouter.ai/api/v1/messages
→ HTTP 401  {"error":{"message":"No cookie auth credentials found","code":401}}

POST https://openrouter.ai/api/v1/definitely-not-a-real-endpoint
→ HTTP 404  <!DOCTYPE html>…            ← control: bogus paths return HTML 404
```

### 1.3 Endpoint surface Claude Code expects vs. what OpenRouter serves

**[DOC]** — from the [gateway protocol reference](https://code.claude.com/docs/en/llm-gateway-protocol), the Anthropic-Messages format requires:

> Endpoints: `/v1/messages`, `/v1/messages/count_tokens` (optional)
> "Token-counting endpoints are the only optional ones: **when they're absent, Claude Code estimates context usage locally.**"

**[VERIFIED]** — what OpenRouter actually serves:

| Endpoint | Result | Consequence |
|---|---|---|
| `POST /api/v1/messages` | **401** (exists, needs auth) | ✅ inference works |
| `POST /api/v1/messages/count_tokens` | **404** `{"error":{"message":"Not Found","code":404}}` | ⚠️ **absent** — Claude Code falls back to *local* context estimation. Documented as graceful, but your context accounting is now an estimate, not a measurement |
| `GET /api/v1/models` | **200**, `{"data":[{"id":…,"name":…}]}` | ✅ shape matches what gateway model discovery expects |

**Streaming is mandatory** **[DOC]**: *"Inference responses must stream… a gateway that buffers complete responses before relaying them stalls the client."* OpenRouter streams SSE, so this is fine — but note it means an OpenRouter provider that doesn't stream will hang Claude Code, not error.

### 1.4 The `--model` flag and the `ANTHROPIC_DEFAULT_*_MODEL` family

**[DOC]** The base-URL variable does not select models. Verbatim note from [model-config](https://code.claude.com/docs/en/model-config):

> "`ANTHROPIC_BASE_URL` changes **where** requests are sent, not **which model** answers them."

What each variable does **[DOC]**, from the same page's env-var table:

| Variable | Effect |
|---|---|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | "The model to use for `opus`, or for `opusplan` when Plan Mode is active." |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | "The model to use for `sonnet`, or for `opusplan` when Plan Mode is not active." |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | "The model to use for `haiku`, or **background functionality**" |
| `CLAUDE_CODE_SUBAGENT_MODEL` | "The model Claude Code uses for all subagents, agent teams, and agents in a workflow… **overrides** the per-invocation `model` parameter and the subagent definition's `model` frontmatter" |

So they **remap the aliases** `opus` / `sonnet` / `haiku`. They are how you make an alias resolve to an OpenRouter slug. `--model` with an explicit string bypasses them and is sent as-is.

**Precedence [DOC]:** *"A model you pick for the new launch with `--model` or `ANTHROPIC_MODEL` still takes precedence over the restored model."*

**⚠️ `_SUPPORTED_CAPABILITIES` does NOT work behind a base-URL gateway.** This is stated twice and is easy to miss:

> "The `ANTHROPIC_DEFAULT_*_MODEL_SUPPORTED_CAPABILITIES` variables declare model capabilities only in the provider configurations: `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `CLAUDE_CODE_USE_FOUNDRY`, and `CLAUDE_CODE_USE_MANTLE`. **They have no effect behind an `ANTHROPIC_BASE_URL` gateway.**"
> — [llm-gateway-protocol §Feature pass-through](https://code.claude.com/docs/en/llm-gateway-protocol)

This matters because it removes your escape hatch for the failure in §1.5.

**Model slugs [VERIFIED].** Claude Code's model-discovery filter *"ignores entries whose `id` doesn't begin with `claude` or `anthropic`"* **[DOC]**. Running that filter over OpenRouter's live `/api/v1/models`: **364 models total, 26 survive.** A sample:

```
anthropic/claude-opus-5          anthropic/claude-sonnet-5
anthropic/claude-opus-4.8        anthropic/claude-sonnet-4.6
anthropic/claude-opus-4.8-fast   anthropic/claude-haiku-4.5
anthropic/claude-fable-5         anthropic/claude-opus-4.8:batch
```

So with `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1` the picker gets the 26 Anthropic-prefixed slugs and **nothing else** — the other 338 (Qwen, GLM, DeepSeek…) are filtered out. That filter is a second, independent mechanism pushing you toward Claude-only models on this path. You can still force a non-Claude slug via `--model`; it just won't be discoverable.

*(Note: OpenRouter's cookbook suggests `~anthropic/claude-opus-latest`. The leading `~` is OpenRouter's floating-alias syntax; it would fail Claude Code's `startsWith("anthropic")` discovery filter, though it is fine passed explicitly as `--model`. **[INFERRED]**)*

### 1.5 Known breakage — all **[DOC]** from the official troubleshooting table

This is the highest-value part of the research. Anthropic documents exactly what breaks behind a gateway:

| Symptom | Cause | Fix |
|---|---|---|
| `400` naming `context_management`, or `Extra inputs are not permitted` | Upstream rejects fields Claude Code sends to Anthropic-format endpoints | `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` |
| **`400` naming `thinking` or `adaptive`**, e.g. `Input tag 'adaptive' found` | *"The upstream model build doesn't accept adaptive reasoning, which Claude Code requests for Claude 4.6 and later models"* | Upgrade upstream. `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` works **only on Opus 4.6 / Sonnet 4.6** |
| `400` with the gateway's own context wording (`ContextWindowExceededError`) | Gateway enforces a smaller context and rewrites the error, so Claude Code's auto-compact-and-retry **doesn't fire** (it matches on Anthropic's exact wording) | `/compact` manually; set `CLAUDE_CODE_AUTO_COMPACT_WINDOW` + `CLAUDE_CODE_MAX_OUTPUT_TOKENS` |
| **`ANTHROPIC_API_KEY` set but silently ignored, no prompt** | *"The key needs a one-time approval in interactive sessions, and a previously declined key is ignored without asking again"* | Enable under `/config` → `Use custom API key` |
| **Claude Code asks you to log in even though the curl test succeeds** | *"an `env` block in a project's `.claude/settings.json` … applies only **after** the first-run wizard and trust prompt"* | Set `ANTHROPIC_AUTH_TOKEN` "somewhere Claude Code reads **before** first-run setup: a shell export, the `env` block in `~/.claude/settings.json`, or managed settings" |
| `403` HTML, gateway logs show nothing | A WAF ahead of the gateway blocks the body — *"Claude Code prompts include XML-style tags and source code that match cross-site-scripting body rules, so a short curl test passes while a real session doesn't"* | Exempt `/v1/messages` from body inspection |
| `/fast` reports unavailable | The fast-mode check **goes to `api.anthropic.com` directly and does not follow `ANTHROPIC_BASE_URL`** | `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK=1` |

**Two rows above are load-bearing for a Sandcastle design:**

- **The `adaptive` thinking 400.** Claude Code *"treats model names it doesn't recognize, such as gateway aliases, as current models that receive the field"* **[DOC]**. So passing an OpenRouter slug means Claude Code assumes it's modern and sends `thinking: {"type":"adaptive"}`. If OpenRouter's upstream build doesn't accept it → hard 400 on **every** request. And per §1.4, `_SUPPORTED_CAPABILITIES` — the natural fix — **doesn't work on this path**.
- **The "asks you to log in" row** is exactly the Sandcastle container problem (§3). Sandcastle passes env via `docker run -e`, which is the process environment and therefore satisfies "somewhere Claude Code reads before first-run setup". **[INFERRED — mechanism matches, but untested end-to-end.]**

**Other documented losses behind a gateway:** Remote Control is disabled when `ANTHROPIC_BASE_URL` points at a non-Anthropic host (v2.1.196+); voice dictation is disabled while a credential variable is active; subscription usage limits do not apply (billing shifts to whoever owns the credential). Also worth knowing: Claude Code prepends a **system-prompt attribution block** that `api.anthropic.com` strips but *"Any other upstream receives it as part of the prompt"* — set `CLAUDE_CODE_ATTRIBUTION_HEADER=0` if you care about prompt-cache keys on OpenRouter.

**Not found:** no documentation or issue confirming session resume, subagents, or tool use working or failing specifically against OpenRouter. Given resume is purely local JSONL replay **[CODE]**, it should be provider-agnostic **[INFERRED]**.

---

## 2. Sandcastle's env seam — the exact wiring

### 2.1 Does an empty string survive the resolver? **No via `.env`, yes via provider `env`. [CODE]**

This is answerable exactly from the source. `src/EnvResolver.ts`:

```typescript
const result: Record<string, string> = {};
for (const key of Object.keys(sandcastleEnv)) {
  const value = sandcastleEnv[key] || process.env[key];   // ← "" is falsy: falls through
  if (value) {                                            // ← "" is falsy: dropped
    result[key] = value;
  }
}
```

`""` is falsy at **both** gates. So `ANTHROPIC_API_KEY=` in `.sandcastle/.env` will (a) fall through to `process.env.ANTHROPIC_API_KEY` and (b) be dropped entirely if that is also empty/unset. **You cannot force an empty-string value through the `.env` resolver.**

The provider-`env` path has no such filter. `src/mergeProviderEnv.ts` is a plain spread:

```typescript
return { ...resolvedEnv, ...sandboxProviderEnv, ...agentProviderEnv };
```

and `src/DockerLifecycle.ts` emits every entry unconditionally:

```typescript
const envFlags = Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
```

So `claudeCode(m, { env: { ANTHROPIC_API_KEY: "" } })` **does** reach the container as `-e ANTHROPIC_API_KEY=`.

### 2.2 …but you almost certainly don't need to blank it **[INFERRED]**

OpenRouter's `ANTHROPIC_API_KEY=""` guidance exists because on a **developer laptop** the variable is usually already exported and would shadow `ANTHROPIC_AUTH_TOKEN`. A Sandcastle container starts from `node:22-bookworm` with only the env Sandcastle injects — there is no ambient `ANTHROPIC_API_KEY` to shadow anything. Simply **not setting it** is cleaner than setting it to `""`, and it sidesteps the `ANTHROPIC_API_KEY`-needs-interactive-approval trap in §1.5 entirely.

### 2.3 The config

**Recommended — everything on the agent provider, nothing in `.env`:**

```typescript
// .sandcastle/main.ts
import { run, claudeCode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

await run({
  agent: claudeCode("anthropic/claude-opus-4.8", {
    env: {
      ANTHROPIC_BASE_URL: "https://openrouter.ai/api",   // NO trailing /v1
      ANTHROPIC_AUTH_TOKEN: process.env.OPENROUTER_API_KEY!,
      // ANTHROPIC_API_KEY deliberately omitted — see §2.2
      CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: "1",       // pre-empts the context_management 400
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",     // container has no reason to phone home
    },
  }),
  sandbox: docker(),
  branchStrategy: { type: "branch", branch: "agent/phase-1" },
  promptFile: ".sandcastle/implement.md",
});
```

Note `process.env.OPENROUTER_API_KEY!` is read on the **host**, in your orchestration script — that is ordinary Node, entirely outside Sandcastle's resolver, so no empty-string or declaration rules apply.

**Alternative — via `.sandcastle/.env`** (needed if you want `sandcastle init`'s scaffolding to own it). Remember the rule: *"Only keys declared in `.sandcastle/.env` are resolved from `process.env`"* **[CODE]**. Declaring a key with an empty value makes it a **passthrough** from the host env:

```bash
# .sandcastle/.env  — keys must be declared here or they never reach the sandbox
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_AUTH_TOKEN=              # blank ⇒ resolved from host process.env
GH_TOKEN=
```
```bash
# on the host, before running:
export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
```

**⚠️ The overlap rule [CODE].** `mergeProviderEnv` throws if agent env and sandbox env share **any** key:

```
Overlapping env keys between agent provider and sandbox provider: ANTHROPIC_BASE_URL
```

So put all Anthropic/OpenRouter variables on **one** provider. Don't split them across `claudeCode({env})` and `docker({env})`. Provider env overrides the `.env` resolver for shared keys, so mixing both paths for the same key is legal but confusing — pick one.

---

## 3. The Dockerfile problem

### 3.1 Is there a first-run prompt that breaks `claude --print`? **Yes. [DOC] + community-confirmed**

Claude Code stores onboarding and trust state in `$HOME/.claude.json`. Two gates exist: the **onboarding/theme wizard** and the **workspace trust dialog**. Anthropic's own troubleshooting table names the interaction directly:

> **"Claude Code asks you to log in even though the curl test succeeds"** — cause: *"The CLI has no credential of its own: a reachable base URL isn't one, and an `env` block in a project's `.claude/settings.json` or `.claude/settings.local.json` applies **only after the first-run wizard and trust prompt**."*
> — [llm-gateway-connect](https://code.claude.com/docs/en/llm-gateway-connect)

The documented bypass is to supply the credential **as a process env var** (shell export / `~/.claude/settings.json` / managed settings), which is precisely what `docker run -e` gives you. **[INFERRED]** that this is sufficient for Sandcastle — the mechanism matches, but I did not run it.

### 3.2 How people bypass it

The community pattern (multiple independent sources; not in Anthropic's docs) is to pre-seed `~/.claude.json`:

```dockerfile
# add to .sandcastle/Dockerfile, AFTER the `USER ${AGENT_UID}:${AGENT_GID}` line
RUN printf '%s' '{"hasCompletedOnboarding":true,"numStarts":2,"projects":{"/home/agent/workspace":{"hasTrustDialogAccepted":true}}}' \
      > /home/agent/.claude.json
```

`hasCompletedOnboarding: true` skips the theme picker and welcome screen; `hasTrustDialogAccepted` per project directory pre-accepts workspace trust; some reports add `numStarts > 1`. `/home/agent/workspace` is Sandcastle's bind-mount point **[CODE]** — `.sandcastle/Dockerfile` says so explicitly: *"Sandcastle bind-mounts the git worktree at `/home/agent/workspace`"*.

Sources: [Vellum headless-claude-code](https://www.vellum.ai/skills/headless-claude-code), [Freestyle sandbox guide](https://www.freestyle.sh/docs/guides/run-claude-code-in-a-sandbox), [anthropics/claude-code#7100](https://github.com/anthropics/claude-code/issues/7100). **Treat as [INFERRED] for exact key names** — `.claude.json` is an internal file with no published schema and it has changed shape before.

### 3.3 Whether OpenRouter *specifically* forces a Dockerfile change: **No. [INFERRED]**

Nothing about OpenRouter needs baking into the image on the `claudeCode()` path — base URL and token are pure env. The onboarding seeding above is a *headless* concern, not an OpenRouter concern, and it applies equally to stock Sandcastle. Sandcastle already sidesteps the login path in the default config by scaffolding `CLAUDE_CODE_OAUTH_TOKEN` **[CODE]** (`src/InitService.ts:418`), which is a credential env var — same category as `ANTHROPIC_AUTH_TOKEN`.

**The `codex()` path *does* need a Dockerfile change** — see §4.

---

## 4. The four alternatives, against your three requirements

Requirements: **(a)** file writes into one directory, **(b)** a validated JSON report per phase, **(c)** retry-on-invalid-output via session resume.

**Requirement (a) is satisfied identically by all four** — it's Sandcastle's bind-mounted worktree, not an agent feature **[CODE]**.

**Requirement (c) is the discriminator.** From `src/Output.ts` **[CODE]**: *"Retries require the agent provider to support session resumption (i.e. `provider.sessionStorage` is populated — Claude Code, Codex, Pi). `run()` fails at entry with a clear error when retries are requested but the provider cannot resume."*

| Provider | `sessionStorage`? | OpenRouter path | Setup complexity | Verdict |
|---|---|---|---|---|
| **`pi()`** | ✅ yes **[CODE]** | **Native.** Reads `OPENROUTER_API_KEY`; `/login openrouter` OAuth or plain API key; base `https://openrouter.ai/api/v1` **[DOC]** | **Lowest** — one env var | ✅ **Best fit** |
| **`claudeCode()`** | ✅ yes **[CODE]** | Anthropic-Messages gateway (§1) | Low — two env vars | ✅ Works, **Claude models only in practice** |
| **`codex()`** | ✅ yes **[CODE]** | `config.toml` custom provider, `wire_api = "responses"` **[DOC]** | **Highest** — requires baking config into the image | ⚠️ Viable, most moving parts |
| **`opencode()`** | ❌ **no** — `captureSessions: false`, no `sessionStorage` **[CODE]** | Native (issue #540 pattern) | Low | ❌ **`maxRetries > 0` throws at entry.** Ruled out by (c) |
| **Custom `AgentProvider`** | your choice | anything | Highest, but bounded | Escape hatch |

### 4.1 `pi()` — recommended

Pi has genuine first-class OpenRouter support **[DOC]** ([pi providers.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md)): OAuth via `/login openrouter`, or `OPENROUTER_API_KEY` directly; credentials in `~/.pi/agent/auth.json`; base URL `https://openrouter.ai/api/v1`; model format `provider/model`. And critically it **is** resumable in Sandcastle — `makePiSessionStorage` is implemented, `captureSessions` defaults `true`, and resume maps to `pi --session <id>` **[CODE]**.

```typescript
await run({
  agent: pi("<openrouter-model-slug>", {
    thinking: "high",
    env: { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY! },
  }),
  sandbox: docker({ imageName: "sandcastle:pi" }),
  prompt: "…emit JSON inside <result> tags…",
  output: Output.object({ tag: "result", schema: planSchema, maxRetries: 2 }),
});
```

**Two things to verify before committing [INFERRED]:**
1. **The exact model-string format Pi's `--model` expects for OpenRouter.** Sandcastle emits `pi -p --mode json --model <m>` **[CODE]**, passing your string straight through. Pi's docs describe `/model` selection and a `provider/model` format but do **not** show the exact `--model` argv form for an OpenRouter model. Test `pi -p --mode json --model <slug>` in the container before wiring it up.
2. **The Dockerfile must install `pi`.** The scaffolded Dockerfile installs Claude Code only **[CODE]**. `sandcastle init --agent pi` scaffolds a Pi image; if you're converting an existing repo, add the install yourself.

Also note Sandcastle's own comment **[CODE]**: pi's session behavior was *"Verified against @mariozechner/pi-coding-agent 0.73.1"* — and the package has since been renamed to `@earendil-works/pi-coding-agent` **[DOC]**. Pin your version and re-verify resume.

### 4.2 `codex()` — works, but the config has to be baked in

Codex CLI reaches OpenRouter through a custom provider block in `~/.codex/config.toml` **[DOC]** ([OpenRouter Codex cookbook](https://openrouter.ai/docs/cookbook/coding-agents/codex-cli)):

```toml
model = "<slug>"
model_provider = "openrouter"

[model_providers.openrouter]
name = "OpenRouter"
base_url = "https://openrouter.ai/api/v1"
env_key = "OPENROUTER_API_KEY"
wire_api = "responses"       # required — "chat" or omitted fails at startup
```

Two Sandcastle-specific frictions **[CODE]**:
- Sandcastle's `codex()` builds a fixed command — `codex exec --json <approvals-flags> -m <model> [effort]` — and exposes **no** hook for arbitrary `-c key=value` overrides. So `model_provider` must come from a `config.toml` **baked into the image** (or written by an `onSandboxReady` hook, the issue-#540 pattern).
- The provider IDs `openai`, `ollama`, `lmstudio` are reserved **[DOC]** — you must define a *new* provider ID, not override `openai`'s base URL.

Same hook trick as issue #540:
```typescript
hooks: { sandbox: { onSandboxReady: [{
  command: `mkdir -p ~/.codex && printf '%s' '<toml>' > ~/.codex/config.toml`,
}]}}
```

### 4.3 `opencode()` — ruled out by requirement (c)

The community recipe works and is proven ([issue #540](https://github.com/mattpocock/sandcastle/issues/540)) — write `~/.local/share/opencode/auth.json` in an `onSandboxReady` hook, pass the model as `provider/model`. But `opencode` has `captureSessions: false` and no `sessionStorage` **[CODE]**, so `Output.object({ maxRetries: 2 })` **throws before the sandbox is even created**. You would have to hand-roll retry by re-running the whole phase from scratch — losing the "resume the same session, feed back the error, don't redo the work" property that makes `maxRetries` worth having.

### 4.4 Custom `AgentProvider` — the honest escape hatch

Explicitly sanctioned **[DOC]** (`.out-of-scope/built-in-agent-providers.md`): *"`AgentProvider` is a public, exported interface… Anyone who wants to run another agent can implement that interface in their own project and pass it as the `agent` — no change to Sandcastle is needed."*

The interface is small **[CODE]**: `name`, `env`, `captureSessions`, optional `sessionStorage`, `buildPrintCommand()`, `parseStreamLine()`, optional `buildInteractiveArgs()` / `parseSessionUsage()`. The bar for the agent itself **[DOC]**: *"non-interactive run mode, prompt via stdin, a bypass-permissions flag, env-based auth, and (critically) line-delimited JSON stream events."*

**Cost:** implementing `sessionStorage` — the four transfer methods plus host/sandbox path mapping — is the expensive part, and it's exactly the part you need for requirement (c). Don't take this path unless one of the three built-ins genuinely can't be made to work.

---

## 5. `pi` and `cursor`

- **`pi`** — ✅ **Yes, first-class.** Covered in §4.1. This is the strongest OpenRouter story of any Sandcastle provider.
- **`cursor`** — ❌ **No usable path.** Cursor's Agent mode does not support BYOK; OpenRouter's own Cursor integration requires the special base URL `https://openrouter.ai/api/v1/cursor` and even then *"Auto and Composer 2 modes may not be routed through your API key"* **[DOC]** ([OpenRouter Cursor cookbook](https://openrouter.ai/docs/cookbook/coding-agents/cursor-integration)). Sandcastle's `cursor()` also exposes only `env` — no base-URL option — and is non-resumable **[CODE]**, so it fails requirement (c) regardless. **Rule it out.**
- **`copilot`** — non-resumable **[CODE]**, and no OpenRouter path found. Rule it out.

---

## 6. Reasons not to do this

**1. Anthropic explicitly does not support it. [DOC]** Repeating because it's the strongest single fact in this report: *"doesn't support routing Claude Code to non-Claude models through any gateway."* If your design routes `claudeCode()` at a non-Claude model, you are outside the supported envelope and every future Claude Code release can break you. This is a real, cited reason — not licensing FUD.

**2. The gateway contract is a moving target you don't control. [DOC]** *"Claude Code adds capabilities with each release, and a gateway that doesn't forward them breaks the corresponding features."* And: *"Treat the headers and body fields as open lists, not closed ones… A gateway pinned to an observed list strips the next capability's header or field and breaks it on the release that introduces it."* You are depending on OpenRouter tracking Claude Code's evolving Anthropic-format surface. When it lags, you get 400s in production.

**3. The `adaptive` thinking failure has no escape hatch on this path. [DOC]** Claude Code sends `thinking: {"type":"adaptive"}` for any model name it doesn't recognize; the documented fix (`_SUPPORTED_CAPABILITIES`) explicitly does not apply behind `ANTHROPIC_BASE_URL`; and `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` only covers Opus 4.6 / Sonnet 4.6. Pin a Claude model OpenRouter fully supports, or use `pi()`.

**4. Context accounting degrades silently. [VERIFIED]** `count_tokens` 404s on OpenRouter, so Claude Code estimates locally. Combined with the documented gateway-context row — a gateway that rewrites context errors defeats Claude Code's auto-compact-and-retry, because that recovery *matches on Anthropic's exact error wording* — long agent runs can die on context in a way Sandcastle surfaces only as a failed `run()`.

**5. Sandcastle fails fast by design. [DOC]** From `.out-of-scope/provider-error-retry.md`: *"Sandcastle shells out to provider CLIs — it doesn't own the API connection or error interface… **Sandcastle fails fast on provider errors.**"* OpenRouter adds a routing layer with its own rate limits, upstream-provider failovers, and 5xx modes — and **nothing between OpenRouter and your `main.ts` will retry any of it**. In a `Promise.allSettled` fan-out, one flaky upstream = one silently dropped branch. You must write that retry yourself.

**6. Auth-terms / billing.** Routing through OpenRouter means *"a developer's claude.ai subscription isn't used: the credential replaces the subscription login… and the subscription's usage limits don't apply"* **[DOC]**. Billing moves to the OpenRouter credential. If your plan was "use my Claude Max subscription via OpenRouter" — that does not work, and attempting it with a subscription OAuth token through a third party is a terms question you should resolve with Anthropic, not architect around. **Not found:** any documentation permitting or forbidding this specific combination.

**7. Prompt/response data path.** Every prompt — including repository source pulled in by `` !`command` `` expansion — now traverses OpenRouter and whatever upstream it routes to. That's a third data processor added to your threat model, on top of the container-escape and prompt-injection exposure already in the Sandcastle report (issues #682, #870).

### What I would actually build

**Use `pi()` with OpenRouter.** It is the only provider where OpenRouter is a supported first-class integration *and* Sandcastle's session-resume retry works. You get all three requirements with one env var, no gateway-protocol coupling, and no "unsupported by the vendor" asterisk.

Keep `claudeCode()` + `ANTHROPIC_BASE_URL` in your back pocket for the narrow case of *Claude models routed through OpenRouter for billing/quota reasons* — pin an explicit `anthropic/claude-*` slug, set `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`, and expect to re-test on every Claude Code release.

**Before writing the design doc, run these three checks** — each answers a question I could not settle from documentation:
1. `pi -p --mode json --model <openrouter-slug>` inside the container — does the argv form Sandcastle emits accept an OpenRouter model?
2. A one-iteration `claudeCode()` run against `https://openrouter.ai/api` — does it 400 on `adaptive`?
3. A deliberately-malformed structured-output run with `maxRetries: 1` — does session resume actually round-trip through the sandbox on your chosen provider?

---

## Sources

**Anthropic / Claude Code (primary, documented):**
- [LLM gateways overview](https://code.claude.com/docs/en/llm-gateway) — the non-Claude-models statement
- [Connect Claude Code to an LLM gateway](https://code.claude.com/docs/en/llm-gateway-connect) — env vars, base-URL format, credential→header mapping, troubleshooting table
- [Gateway protocol reference](https://code.claude.com/docs/en/llm-gateway-protocol) — endpoints, headers, feature pass-through, model discovery, attribution block
- [Model configuration](https://code.claude.com/docs/en/model-config) — `ANTHROPIC_DEFAULT_*_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL`, `_SUPPORTED_CAPABILITIES` scope

**OpenRouter (primary, documented):**
- [Claude Code integration](https://openrouter.ai/docs/cookbook/coding-agents/claude-code-integration) — exact env values, "ordering matters" caveat, "may not work correctly with other providers"
- [Codex CLI integration](https://openrouter.ai/docs/cookbook/coding-agents/codex-cli) — `config.toml`, `wire_api = "responses"`
- [Cursor integration](https://openrouter.ai/docs/cookbook/coding-agents/cursor-integration) — `/api/v1/cursor`, Agent-mode caveats

**Pi:**
- [pi providers.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md) — OpenRouter OAuth + `OPENROUTER_API_KEY`, `auth.json`, base URL

**Sandcastle source** (clone at `main` HEAD `e99f832` = `v0.12.0`): `src/EnvResolver.ts`, `src/mergeProviderEnv.ts`, `src/DockerLifecycle.ts`, `src/AgentProvider.ts`, `src/Output.ts`, `.sandcastle/Dockerfile`, `.out-of-scope/*.md`; [issue #540](https://github.com/mattpocock/sandcastle/issues/540)

**Headless onboarding (community, not vendor-documented):** [Vellum](https://www.vellum.ai/skills/headless-claude-code), [Freestyle](https://www.freestyle.sh/docs/guides/run-claude-code-in-a-sandbox), [anthropics/claude-code#7100](https://github.com/anthropics/claude-code/issues/7100)

**My own probes [VERIFIED], run 2026-07-30:** `POST /api/v1/messages` → 401; `POST /api/v1/messages/count_tokens` → 404 JSON; `GET /api/v1/models` → 200, 364 models, 26 pass Claude Code's `claude|anthropic` discovery filter.
