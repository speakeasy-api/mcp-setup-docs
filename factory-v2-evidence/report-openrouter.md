Research complete — pulled from openrouter.ai/docs (the `.md` source variants), the live `/api/v1/models` endpoint, and OpenRouter's published OpenAPI spec. Note the docs were reorganized: old `/docs/features/*` URLs now 404; canonical paths are `/docs/guides/features/*`. Full URL map at [openrouter.ai/docs/llms.txt](https://openrouter.ai/docs/llms.txt).

---

# OpenRouter for a self-owned agent loop

## 1. Auth, base URL, OpenAI-compatibility surface

**Base URL:** `https://openrouter.ai/api/v1` · **Auth:** `Authorization: Bearer $OPENROUTER_API_KEY` ([quickstart](https://openrouter.ai/docs/quickstart))

Three API "skins" exist on the same router (confirmed in the [OpenAPI spec](https://openrouter.ai/docs/openapi/openapi.yaml) and by unauthenticated probe returning `401`, not `404`):

| Path | Shape |
|---|---|
| `POST /api/v1/chat/completions` | OpenAI Chat Completions |
| `POST /api/v1/responses` | OpenAI Responses API |
| `POST /api/v1/messages` | **Anthropic Messages API** — "Creates a message using the Anthropic Messages API format. Supports text, images, PDFs, tools, and extended thinking." (openapi.yaml `/messages`) |

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -H "HTTP-Referer: https://yourapp.com" \
  -H "X-OpenRouter-Title: Docs Pipeline" \
  -d '{"model":"anthropic/claude-opus-5","messages":[{"role":"user","content":"hi"}]}'
```

**Header note:** the attribution header is now `X-OpenRouter-Title`; "`X-Title` is still supported for backwards compatibility." `HTTP-Referer` is described as required for your usage to appear in rankings/analytics ([app-attribution](https://openrouter.ai/docs/app-attribution)).

**What differs from OpenAI:**

- **`finish_reason` is normalized** to `tool_calls | stop | length | content_filter | error`; the provider's raw value is preserved in `native_finish_reason` ([api_reference/overview](https://openrouter.ai/docs/api_reference/overview)).
- **Unsupported params are silently dropped**, not rejected: "If this setting is omitted or set to false, then providers will receive only the parameters they support, and ignore the rest" (`require_parameters`, openapi.yaml `ProviderPreferences`). **This is the single most important behavioral difference for your use case.**
- **Extra request params** with no OpenAI equivalent: `provider`, `models` (fallback list), `plugins`, `session_id`, `reasoning`, `reasoning_effort`, `verbosity`, `service_tier`, `prompt_cache_key`, `prompt_cache_options`, `debug`. `route` is marked `DeprecatedRoute` in the spec.
- **`usage` always returned with cost.** `usage: {include: true}` and `stream_options: {include_usage: true}` are documented as deprecated no-ops: "Full usage details are now always included automatically" ([usage-accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)).
- **`X-Generation-Id` response header** on all endpoints, for correlating to the generation record ([streaming](https://openrouter.ai/docs/api_reference/streaming)).
- **Routing transparency is opt-in**: send `X-OpenRouter-Metadata: enabled` to get an `openrouter_metadata` object containing `requested`, `strategy`, `region`, `attempt`, `is_byok`, `endpoints` ("snapshot of endpoint candidates considered, and which one was selected"), and `pipeline` ([router-metadata](https://openrouter.ai/docs/guides/features/router-metadata)). I could **not** find a top-level `provider` field on the chat-completions response schema in the current OpenAPI spec — don't assume one; use this header or `/api/v1/generation`.

---

## 2. Model IDs and variants

Format is `{author}/{slug}`; each model also has a `canonical_slug`, "a permanent slug for the model that never changes." Aliases auto-resolve ([guides/overview/models](https://openrouter.ai/docs/guides/overview/models)).

**Live IDs as of 2026-07-30**, pulled from `GET https://openrouter.ai/api/v1/models` (364 models). Frontier set, with context and USD/1M in→out:

| Model ID | Ctx | In → Out | Structured outputs? |
|---|---|---|---|
| `anthropic/claude-opus-5` | 1,000,000 | $5 → $25 | ✅ |
| `anthropic/claude-opus-5-fast` | 1,000,000 | $10 → $50 | ✅ |
| `anthropic/claude-sonnet-5` | 1,000,000 | $2 → $10 | ✅ |
| `anthropic/claude-fable-5` | 1,000,000 | $10 → $50 | ✅ |
| `anthropic/claude-opus-4.8` | 1,000,000 | $5 → $25 | ✅ |
| `anthropic/claude-haiku-4.5` | 200,000 | $1 → $5 | ✅ |
| `openai/gpt-5.6-sol` / `-sol-pro` | 1,050,000 | $5 → $30 | ✅ |
| `openai/gpt-5.6-terra` / `-terra-pro` | 1,050,000 | $1 → $6 | ✅ |
| `openai/gpt-5.6-luna` / `-luna-pro` | 1,050,000 | $0.10 → $0.60 | ✅ |
| `openai/gpt-5.5` / `gpt-5.5-pro` | 1,050,000 | $5 → $30 / $30 → $180 | ✅ |
| `google/gemini-3.6-flash` | 1,048,576 | $1.50 → $7.50 | ✅ |
| `google/gemini-3.5-flash` | 1,048,576 | $1.50 → $9 | ✅ |
| `google/gemini-3.1-pro-preview` | 1,048,576 | $2 → $12 | ✅ |
| `google/gemini-3.1-flash-lite` | 1,048,576 | $0.25 → $1.50 | ✅ |

Notable: Google's top *Pro* tier is still `gemini-3.1-pro-preview` in the catalog — there is no `gemini-3.5-pro`/`3.6-pro` listed. There is also `google/gemini-3.1-pro-preview-customtools`.

**Variant suffixes** (appended to the slug, e.g. `openai/gpt-4o:floor`):

| Suffix | Meaning | Source |
|---|---|---|
| `:nitro` | alias for `provider.sort = "throughput"` | [model-variants/nitro](https://openrouter.ai/docs/guides/routing/model-variants/nitro) |
| `:floor` | restore price-first sorting (opts out of Auto Exacto) | [auto-exacto](https://openrouter.ai/docs/guides/routing/auto-exacto) |
| `:exacto` | quality-first provider sort using tool-call success, throughput/latency, and OpenRouter's benchmark harness | [model-variants/exacto](https://openrouter.ai/docs/guides/routing/model-variants/exacto) |
| `:thinking` | enables extended reasoning | [model-variants/thinking](https://openrouter.ai/docs/guides/routing/model-variants/thinking) |
| `:free` | free endpoint; subject to hard RPM/RPD caps | [limits](https://openrouter.ai/docs/api_reference/limits) |
| `:batch` | batch endpoint (present on most frontier IDs in the live catalog) | `/api/v1/models` |
| `:extended`, `:online` | documented as variants; I did not fetch these pages | doc nav in llms.txt |

**Tilde "latest" aliases:** `~author/family-latest` "always resolve to the newest concrete model in a given family, so you can ship code against a stable alias and pick up new releases without redeploying." The response `model` field reports the concrete model that ran. Caveat, verbatim: "versions can change at any time" and "there is no built-in way to pin to 'second newest' or to roll back through the alias." ([latest-resolution](https://openrouter.ai/docs/guides/routing/routers/latest-resolution))

For a docs pipeline you want reproducibility — **use concrete slugs, not `~...-latest`.**

---

## 3. Structured outputs

`response_format` is a discriminated union over `text | json_object | json_schema | grammar | python` (openapi.yaml, `ChatCompletionRequest.response_format`).

```json
{
  "model": "anthropic/claude-opus-5",
  "messages": [{"role": "user", "content": "..."}],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "guide_result",
      "strict": true,
      "schema": { "type": "object", "properties": {...}, "required": [...] }
    }
  },
  "provider": { "require_parameters": true }
}
```

Schema object fields, from `ChatJsonSchemaConfig` in the OpenAPI spec: `name` (**required**, `a-z A-Z 0-9 _ -`, max 64 chars), `schema`, `strict` (boolean|null), `description`.

**Strictness is not uniform.** Verbatim from [structured-outputs](https://openrouter.ai/docs/guides/features/structured-outputs): with `strict: true`, "enforcement varies by provider. Some guarantee schema compliance, while others treat it as guidance." And "Strict modes may also restrict which JSON Schema features you can use."

**Support is per-endpoint, not per-model** — "the same model may be served by multiple providers, and only some of those providers may support structured outputs." Named supported providers: OpenAI, Google Gemini, Anthropic, Fireworks. All the frontier models in §2 report `structured_outputs` in their `supported_parameters`.

**Failure modes:**
1. Routed to an endpoint without support → request errors (mitigate with `require_parameters: true`).
2. Invalid JSON Schema → model returns a schema validation error.
3. Truncation by `max_tokens` → unrepairable malformed JSON.
4. **Known bug class:** when `tools` and `response_format` are both set and the model returns *no* tool calls, the structured-output pass has been reported skipped, returning raw text ([simstudioai/sim#2917](https://github.com/simstudioai/sim/issues/2917) — third-party report, not an OpenRouter doc).

**How to force valid JSON reliably** — layered, in order of what I'd actually do:

1. `provider: { require_parameters: true }` so you never land on a non-supporting endpoint.
2. Add the **Response Healing plugin** — repairs "missing brackets, commas, quotes," unquoted keys, trailing commas, and "extracts JSON from markdown code blocks." Requires **non-streaming** + `response_format` of `json_schema` or `json_object`. It cannot fix truncation. ([response-healing](https://openrouter.ai/docs/guides/features/plugins/response-healing))
   ```json
   { "plugins": [{ "id": "response-healing" }] }
   ```
3. **Prefer a forced tool call over `response_format`** for the terminal payload: `tool_choice: {"type":"function","function":{"name":"emit_result"}}`. Tool-argument generation is the more universally-implemented path across providers, and it sidesteps the tools + response_format interaction above.
4. Validate client-side (Zod/ajv) and retry with the validation error appended. Non-negotiable regardless of the above.

---

## 4. Tool / function calling

Standard OpenAI shape. From `ChatFunctionTool` in the OpenAPI spec: `function.name` (max 64 chars), `description`, `parameters` (JSON Schema object), `strict` (boolean|null) — plus an OpenRouter addition, **`cache_control` on the tool definition itself**.

```json
{
  "tools": [{
    "type": "function",
    "function": {
      "name": "write_file",
      "description": "Write content to a path in the repo",
      "parameters": {
        "type": "object",
        "properties": { "path": {"type":"string"}, "content": {"type":"string"} },
        "required": ["path", "content"]
      }
    }
  }],
  "tool_choice": "auto",
  "parallel_tool_calls": true
}
```

- **`tool_choice`**: `"auto"` (default), `"none"`, or a named function `{"type":"function","function":{"name":"..."}}` (`ChatNamedToolChoice`).
- **`parallel_tool_calls`**: boolean, **default `true`** ([parameters](https://openrouter.ai/docs/api_reference/parameters)). Set `false` for sequential dispatch.
- **Streaming**: tool calls arrive as deltas; terminate on `finish_reason === 'tool_calls'` ([tool-calling](https://openrouter.ai/docs/guides/features/tool-calling)).
- **Loop contract**: return results as `{role: "tool", tool_call_id, content}`, and **resend the complete `tools` array each turn for validation**.
- **Provider support**: filter with `openrouter.ai/models?supported_parameters=tools`. OpenRouter tracks a per-provider **Tool Call Error Rate** and feeds it into routing.

**Server tools (relevant to a file-writing pipeline).** OpenRouter hosts tools the model can call, most on the Responses API:

- **`openrouter:apply_patch`** — model emits V4A diffs (`create_file` / `update_file` / `delete_file`); OpenRouter validates syntax but explicitly does **not** execute: "This is a **human-in-the-loop** tool: OpenRouter validates the diff but never applies it. Your application is responsible for executing the file operation." You echo results back via `apply_patch_call_output`. ([apply-patch](https://openrouter.ai/docs/guides/features/server-tools/apply-patch)) — **this is the right primitive for your repo-editing agent.**
- **`openrouter:shell`** — runs in OpenRouter's hosted sandbox: "the shell tool has no client-side execution mode: commands always run in a hosted environment." **Not usable against your local checkout.** ([shell](https://openrouter.ai/docs/guides/features/server-tools/shell))
- Others: `bash` (has a client-side mode), `files`, `web_search`, `web_fetch`, `subagent`, `advisor`, `datetime`, `search_models`.

---

## 5. Reasoning controls

From the OpenAPI spec and [reasoning-tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens):

```json
{
  "reasoning": {
    "effort": "high",      // max | xhigh | high | medium | low | minimal | none
    "max_tokens": 8000,    // explicit budget
    "exclude": false,      // compute but don't return
    "enabled": true,
    "summary": "concise"   // ChatReasoningSummaryVerbosityEnum
  }
}
```

`reasoning_effort` is a top-level shorthand: "Equivalent to setting reasoning.effort. Cannot be used simultaneously with reasoning.effort if they differ."

**Cross-provider mapping:**

| Provider | Mechanism |
|---|---|
| **Anthropic** | `reasoning.max_tokens`, min 1024 / max 128,000. Effort→budget: `max(min(max_tokens * ratio, 128000), 1024)` with ratios max/xhigh 0.95, high 0.8, medium 0.5, low 0.2, minimal 0.1. Returns **summarized** thinking by default. |
| **OpenAI (o-series, GPT-5+)** | Uses `effort` natively; allocations ≈95/80/50/20/10%. **Does not return reasoning tokens.** |
| **Google Gemini 3** | `effort` → `thinkingLevel` (minimal/low/medium/high; `xhigh` maps down to `high`). Token spend decided internally by Google. |

**Response shape:** `message.reasoning` (plaintext string) and `message.reasoning_details[]` (structured; types `reasoning.summary`, `reasoning.encrypted`, `reasoning.text`).

**Critical for multi-turn tool loops:** pass `reasoning_details` back unmodified on the assistant turn. "The complete sequence of reasoning blocks must match model output—no rearranging permitted." If you drop or reorder these, Anthropic and OpenAI reasoning models will error or silently degrade across tool rounds.

Also: **"Reasoning tokens are counted as output tokens for billing purposes."** Legacy `include_reasoning: true/false` still maps to `reasoning: {}` / `reasoning: {exclude: true}`.

GPT-5.6+ adds `reasoning_context` (`auto | all_turns | current_turn`) and `reasoning_mode` (`standard | pro`; pro is OpenAI/Azure only, not Bedrock).

---

## 6. Provider routing

Full `ProviderPreferences` object, verbatim field set from the OpenAPI spec:

| Field | Type | Doc text |
|---|---|---|
| `order` | string[] | "ordered list of provider slugs. The router will attempt to use the first provider in the subset of this list that supports your requested model, and fall back to the next" |
| `allow_fallbacks` | bool (default `true`) | "false: use only the primary/custom provider, and return the upstream error if it's unavailable" |
| `require_parameters` | bool (default `false`) | "filter providers to only those that support the parameters you've provided" |
| `only` / `ignore` | string[] | allow/skip lists; **"merged with your account-wide settings for this request"** |
| `data_collection` | `allow`\|`deny` | deny = "use only providers which do not collect user data" |
| `zdr` | bool | "only endpoints that do not retain prompts will be used" |
| `sort` | `price`\|`throughput`\|`latency` or object | "When set, no load balancing is performed" |
| `max_price` | object | `{prompt, completion, image, audio, request}`, USD per 1M tokens |
| `quantizations` | string[] | int4, int8, fp8, … |
| `preferred_min_throughput` | number\|object | tokens/sec floor |
| `preferred_max_latency` | number\|object | seconds ceiling |
| `enforce_distillable_text` | bool | only models whose author permits distillation |

**Pinning one upstream provider — the only way to do it deterministically:**

```json
{ "provider": { "order": ["anthropic"], "allow_fallbacks": false } }
```

**`models[]` fallback** is a separate mechanism (cross-*model*, not cross-provider). Triggers on context-length failure, moderation rejection, rate limiting, and provider downtime. "Requests are priced using the model that was ultimately used, which will be returned in the `model` attribute of the response body." ([model-fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks))

**ZDR** ([zdr](https://openrouter.ai/docs/guides/features/zdr)): request-level `zdr: true` ORs with account and guardrail settings — "if any is enabled, ZDR enforcement will be applied." Per-request ZDR can only *enable*, never *override*. In-memory prompt caching at providers is not counted as retention, so cached endpoints stay available under ZDR.

**Auto Exacto — read this one.** It "runs by default on every tool-calling request, requiring no configuration," reordering providers by throughput, tool-call success rate, and benchmark scores instead of price ([auto-exacto](https://openrouter.ai/docs/guides/routing/auto-exacto)). Since your pipeline is tool-heavy, **your requests are already being routed by a non-price policy you didn't opt into.** Opt out with `provider.sort = "price"` or the `:floor` suffix. Scoring uses a rolling 32-day window.

---

## 7. Prompt caching

From [prompt-caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching):

**Automatic (no config):** OpenAI, Grok, Moonshot, Groq, DeepSeek, Z.AI, Google Gemini 2.5 (implicit).
**Manual `cache_control` breakpoints:** Anthropic Claude, Alibaba Qwen, Google Gemini (explicit).

**Anthropic `cache_control` passes straight through.** The OpenAPI spec's `ChatContentCacheControl` says it plainly: "Anthropic-style cache breakpoint for the content part. Interchangeable with the OpenAI-style `prompt_cache_breakpoint` marker: OpenRouter converts between the two based on the provider serving the request." Example value: `{ "ttl": "5m", "type": "ephemeral" }`. It is also accepted **on tool definitions** (`ChatFunctionTool.cache_control`).

```json
{
  "role": "system",
  "content": [
    { "type": "text", "text": "<large style guide + repo conventions>",
      "cache_control": { "type": "ephemeral", "ttl": "1h" } }
  ]
}
```

- Max **4** explicit breakpoints per request. Or use top-level automatic mode: "Add a single `cache_control` field at the top level of your request. The system automatically applies the cache breakpoint to the last cacheable block."
- **Anthropic minimums:** Opus models 4,096 tokens; Sonnet 4.6/4.5 1,024; Haiku 3.5 2,048. (The page doesn't list Opus 5 / Sonnet 5 explicitly — treat 4,096 as the safe Opus floor.)

**Billing multipliers:**

| Provider | Write | Read |
|---|---|---|
| Anthropic (5m TTL) | 1.25× | 0.1× |
| Anthropic (1h TTL) | 2.0× | 0.1× |
| OpenAI (GPT-5.6+) | 1.25× | 0.25–0.50× |
| Google Gemini 2.5 | input + storage | 0.25× |
| Groq | free | 0.5× |
| DeepSeek | 1.0× | 0.1× |

Verify against the live `/api/v1/models` pricing block, which carries per-model `input_cache_read` / `input_cache_write` (e.g. `anthropic/claude-opus-5`: in $5/M, cache read $0.50/M, cache write $6.25/M — exactly 0.1× and 1.25×).

**Cache hits are visible in usage:**
```json
"prompt_tokens_details": { "cached_tokens": 10318, "cache_write_tokens": 0 }
```

**Sticky routing is what makes caching work behind a router.** Send `session_id` (body, or `x-session-id` header; body wins; max 256 chars): "OpenRouter uses it as the sticky routing key, routing all requests in the session to the same provider to maximize prompt cache hits" (openapi.yaml). **Without this, a provider swap silently voids your cache** and you pay full input price. For a per-guide agent run, set `session_id` to the run ID.

---

## 8. Rate limits, credits, keys, cost accounting

**Limits** ([limits](https://openrouter.ai/docs/api_reference/limits)):
- Insufficient credits → `402 Payment Required`.
- Free variants (`:free`): <$10 lifetime credits → 20 req/min, 50 req/day; ≥$10 → 20 req/min, 1,000 req/day.
- **Paid models have no documented platform-level RPM cap** — only DDoS protection plus upstream provider limits.
- `429` may originate from OpenRouter *or* upstream; responses carry `X-RateLimit-*` and may carry `Retry-After`.
- `GET /api/v1/key` returns `limit_remaining`, `usage` (all-time/daily/weekly/monthly), `is_free_tier`, BYOK usage.

**Key management** ([management-api-keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)): a *management* key drives CRUD over runtime keys at `/api/v1/keys` (`GET` list, `POST` create, `GET|PATCH|DELETE /{keyHash}`). Management keys "cannot be used to make API calls to OpenRouter's completion endpoints." Per-key fields include `limit`, `limit_remaining`, `limit_reset`, `disabled`, `include_byok_in_limit`. Good fit if you want a disposable, spend-capped key per pipeline run.

**Per-request cost.** Always present in the response — no opt-in:
```json
"usage": {
  "prompt_tokens": 10, "completion_tokens": 25, "total_tokens": 35,
  "cost": 0.0012,
  "cost_details": { "upstream_inference_cost": null,
                    "upstream_inference_input_cost": 0.0008,
                    "upstream_inference_output_cost": 0.0004 },
  "prompt_tokens_details": { "cached_tokens": 0, "cache_write_tokens": 0 },
  "completion_tokens_details": { "reasoning_tokens": 0 },
  "is_byok": false
}
```
Streaming: usage arrives in the **final chunk**. `upstream_inference_cost` is BYOK-only; otherwise 0/null.

**`GET /api/v1/generation?id=<gen-id>`** gives the full record after the fact (openapi.yaml `/generation`): `tokens_prompt`, `tokens_completion`, `native_tokens_prompt`, `native_tokens_completion`, `native_tokens_reasoning`, `native_tokens_cached`, `total_cost`, `upstream_inference_cost`, `cache_discount`, `latency`, `moderation_latency`, `generation_time`, `provider_name`, `finish_reason`, `native_finish_reason`, `streamed`, `cancelled`, `router`, `session_id`, `is_byok`, `service_tier`. Get the id from the `X-Generation-Id` header. **`provider_name` here is your ground truth for which upstream actually served the request.**

---

## 9. Streaming and error semantics

**SSE** ([streaming](https://openrouter.ai/docs/api_reference/streaming)): keepalive comment lines `: OPENROUTER PROCESSING` are emitted periodically. Per spec they're ignorable — but a naive `line.startsWith('data: ')` splitter that chokes on them is a classic bug. Docs recommend `eventsource-parser`, the OpenAI SDK, or the Vercel AI SDK rather than hand-rolling.

**Errors** ([errors-and-debugging](https://openrouter.ai/docs/api_reference/errors-and-debugging)):
```ts
type ErrorResponse = { error: { code: number; message: string; metadata?: Record<string, unknown> } }
```
HTTP status matches `error.code`. `400` bad request · `401` invalid credentials · `402` insufficient credits · `403` forbidden / guardrail / moderation · `408` timeout · `429` rate limited · `502` "your chosen model is down or we received an invalid response" · `503` "there is no available model provider that meets your routing requirements".

`503` is the one to watch: it's what over-constrained routing (`require_parameters` + `zdr` + `order` + `allow_fallbacks:false`) produces.

**Mid-stream failures** arrive as SSE data, not HTTP status — "once the first token has been written to the client, the HTTP `200 OK` status and headers are already committed":
```ts
{ error: { code, message, metadata?: { error_type, provider_code? } },
  choices: [{ finish_reason: 'error' }] }
```
Your loop must check `finish_reason === 'error'` on every stream, or a failed generation reads as a successful empty one.

**Retry:** `429` and `503` include `Retry-After` (seconds). Honor it, then exponential backoff. OpenRouter also normalizes provider errors into stable typed codes: `rate_limit_exceeded`, `provider_overloaded`, `authentication`, `context_length_exceeded`, `content_policy_violation`.

**Cancellation is provider-dependent.** Aborting the connection "immediately stops model processing and billing" for OpenAI, Anthropic, Fireworks and others — but **not** AWS Bedrock, Groq, or Google. There, "the model will continue processing and you will be billed for the complete response." Same for all non-streaming requests.

**Zero completion insurance** ([zero-completion-insurance](https://openrouter.ai/docs/guides/features/zero-completion-insurance)): no charge for zero-completion-token responses with blank/null finish reason, or an error finish reason — covers prompt, completion, and reasoning tokens. Web search / PDF OCR / web fetch work is still billed.

---

## 10. SDK integration

### `@openrouter/ai-sdk-provider` (Vercel AI SDK)

```bash
npm install @openrouter/ai-sdk-provider   # current: targets AI SDK v7, Node 22+, ESM-only
# npm install @openrouter/ai-sdk-provider@2.9.1   # AI SDK v6
# npm install @openrouter/ai-sdk-provider@1.5.4   # AI SDK v5
```
([README](https://github.com/OpenRouterTeam/ai-sdk-provider) · [vercel-ai-sdk guide](https://openrouter.ai/docs/guides/community/vercel-ai-sdk))

```ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject, generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  headers: { 'HTTP-Referer': 'https://yourapp.com', 'X-OpenRouter-Title': 'Docs Pipeline' },
  extraBody: {                       // applies to every request
    provider: { require_parameters: true, order: ['anthropic'], allow_fallbacks: false },
  },
});

// Structured output
const model = openrouter('anthropic/claude-opus-5', {
  plugins: [{ id: 'response-healing' }],   // non-streaming only
});
const { object } = await generateObject({
  model,
  schema: z.object({ title: z.string(), sections: z.array(z.string()) }),
  prompt: 'Produce the guide outline',
});

// Tool loop with OpenRouter-specific params per request
const { text, steps } = await generateText({
  model: openrouter('anthropic/claude-opus-5'),
  tools: { readFile: tool({ /* ... */ }), writeFile: tool({ /* ... */ }) },
  stopWhen: stepCountIs(30),
  providerOptions: {
    openrouter: {
      reasoning: { effort: 'high' },
      session_id: runId,                    // sticky routing → cache hits
      provider: { require_parameters: true },
    },
  },
  prompt: '...',
});
```

Anthropic cache breakpoints go on content parts:
```ts
content: [{
  type: 'text',
  text: largeStyleGuide,
  providerOptions: { openrouter: { cacheControl: { type: 'ephemeral' } } },
}]
```

### `@openrouter/agent` — OpenRouter's own agent loop

```bash
npm install @openrouter/agent
```
`callModel` "runs an inference loop that: 1. Sends messages to the model 2. If the model returns tool calls, executes them automatically 3. Appends tool results to the conversation 4. Repeats until a stop condition is met or no more tool calls are made." ([agent-sdk/overview](https://openrouter.ai/docs/agent-sdk/overview))

```ts
import { OpenRouter, tool, stepCountIs, maxCost } from '@openrouter/agent';
import { z } from 'zod';

const openrouter = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const writeFile = tool({
  name: 'write_file',
  description: 'Write a file in the checkout',
  inputSchema: z.object({ path: z.string(), content: z.string() }),
  execute: async ({ path, content }) => { /* your fs write */ return { ok: true }; },
});

const result = openrouter.callModel({
  model: 'anthropic/claude-opus-5',
  messages: [{ role: 'user', content: 'Draft the guide for issue #76' }],
  tools: [writeFile],
  stopWhen: [stepCountIs(30), maxCost(2.00)],
});
console.log(await result.getText());
```

Notable capabilities ([call-model/tools](https://openrouter.ai/docs/agent-sdk/call-model/tools)): `execute: false` for manual dispatch (loop pauses, calls persist to `ConversationState.pendingToolCalls`); HITL hooks `onToolCalled`/`onResponseReceived`; generator tools that stream progress events; per-tool typed `contextSchema` persisted across turns; `maxToolRounds`; parallel execution of simultaneous calls; errors in `execute` are caught and returned to the model for recovery. There are also documented lifecycle hooks, MCP tool support, and tool-approval/state-persistence pages.

**Structured output in the Agent SDK is weaker.** The only documented form is `text: { format: { type: 'json_object' } }` returning text you `JSON.parse` yourself — no `generateObject` equivalent, no schema validation ([call-model/text-generation](https://openrouter.ai/docs/agent-sdk/call-model/text-generation)).

### OpenAI SDK

```ts
import OpenAI from "openai";
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: { "HTTP-Referer": "...", "X-OpenRouter-Title": "..." },
});
```
OpenRouter-only params go in `extra_body` (Python) / just added to the request object (TS) ([openai-sdk](https://openrouter.ai/docs/guides/community/openai-sdk)).

### Anthropic SDK / Claude Agent SDK

```bash
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
export ANTHROPIC_API_KEY=""   # must be explicitly empty
```
Works because `/api/v1/messages` is a real Anthropic-Messages-format endpoint. Also supports `ANTHROPIC_DEFAULT_SONNET_MODEL` / `ANTHROPIC_DEFAULT_OPUS_MODEL` overrides pointing at OpenRouter slugs ([anthropic-agent-sdk](https://openrouter.ai/docs/guides/community/anthropic-agent-sdk)).

### Which is most robust for structured output + tool loops

**`@openrouter/ai-sdk-provider` + Vercel AI SDK.** It's the only option that gives you schema-validated structured output (`generateObject` with Zod, automatic repair/retry), a mature tool loop with `stopWhen`, and full passthrough to every OpenRouter-only param via `providerOptions.openrouter`/`extraBody`. `@openrouter/agent` has the better *agent* ergonomics (HITL, manual dispatch, per-tool context, cost-based stopping) but its structured-output story is `JSON.parse` on a `json_object` string. The raw OpenAI SDK is the most portable and the least ergonomic — fine if you want zero framework and are writing the loop by hand anyway.

Pragmatic split for your pipeline: **AI SDK for the loop and the final schema-validated JSON**; borrow `openrouter:apply_patch` (Responses API) if you want validated diffs instead of raw write-file tools.

---

## 11. Production gotchas

**Silent provider swaps — the top one.** Params a provider doesn't support are dropped, not rejected, unless you set `require_parameters: true`. So a request with `response_format` + `reasoning` can land on an endpoint that honors neither and return plausible unstructured prose. There is no exception, no warning. (openapi.yaml `require_parameters`; [provider-selection](https://openrouter.ai/docs/guides/routing/provider-selection))

**Auto Exacto silently reorders providers on every tool-calling request** by default — a routing policy you did not configure, using a rolling 32-day benchmark window. Your provider mix can shift week to week with no code change. ([auto-exacto](https://openrouter.ai/docs/guides/routing/auto-exacto))

**`~...-latest` aliases mutate under you.** "Versions can change at any time" and there's no rollback through the alias. Fine for a chat product, wrong for a reproducible docs pipeline.

**`structured_outputs` on a model listing is per-*endpoint*, not per-model.** A model can advertise support because 1 of 5 providers implements it. Frontier Anthropic/OpenAI/Google are consistent; anything else is not ([datastudios analysis](https://www.datastudios.org/post/openrouter-provider-selection-explained-latency-availability-model-quality-and-cost-trade-offs-f) — third-party).

**Cache misses from provider drift.** Without `session_id`, consecutive turns of one agent run can hit different upstream endpoints, voiding Anthropic prompt caches. On a long tool loop with a big system prompt, that is a large, invisible cost increase.

**Token accounting is not one number.** `tokens_prompt` (normalized) ≠ `native_tokens_prompt` (provider tokenizer), and reasoning tokens bill as output tokens. If you reconcile spend against provider-direct baselines, compare `native_tokens_*` and `total_cost` from `/api/v1/generation`, not the normalized fields.

**Cancellation doesn't stop billing everywhere.** Abort on Bedrock/Groq/Google and you still pay for the full completion. Relevant if your pipeline has aggressive timeouts.

**Mid-stream errors return HTTP 200.** Check `choices[0].finish_reason === 'error'` on every streamed generation, or failures look like empty successes.

**Response Healing is non-streaming only**, and cannot repair `max_tokens` truncation — so a too-small `max_tokens` on a large JSON payload fails hard with no recovery path.

**Over-constrained routing yields `503`.** `require_parameters` + `zdr: true` + `order: [x]` + `allow_fallbacks: false` can leave zero eligible endpoints. Decide which constraints are hard and which are preferences.

**Context compression can fire silently.** Middle-out compression "activates automatically for all OpenRouter endpoints with 8,192 tokens or less context length," removing/truncating messages from the middle of the prompt. Irrelevant for the 1M-context frontier models above, but a real hazard if you ever fall back to a small model. Disable with `{ plugins: [{ id: "context-compression", enabled: false }] }` ([message-transforms](https://openrouter.ai/docs/guides/features/message-transforms)).

---

### Suggested baseline config for your pipeline

```jsonc
{
  "model": "anthropic/claude-opus-5",            // concrete slug, not ~latest
  "models": ["anthropic/claude-sonnet-5"],       // cross-model fallback
  "session_id": "<run-id>",                      // sticky routing → cache hits
  "provider": {
    "require_parameters": true,                  // never silently drop response_format/reasoning
    "sort": "price"                              // opt out of Auto Exacto; or omit to keep it
  },
  "reasoning": { "effort": "high" },
  "parallel_tool_calls": true,
  "plugins": [{ "id": "response-healing" }]      // non-streaming terminal JSON call only
}
```
Plus `X-OpenRouter-Metadata: enabled` in dev so you can see which endpoint actually served each request, and log `X-Generation-Id` in prod so you can reconcile cost after the fact.

**Two things I could not verify** and would flag before you build on them: (a) whether `:extended` and `:online` variants are still live — they appear in the doc navigation but I didn't open those pages; (b) the top-level `structured_outputs: boolean` parameter listed in [parameters](https://openrouter.ai/docs/api_reference/parameters) does not appear in the chat-completions request schema in the current OpenAPI spec — use `response_format` and treat `structured_outputs` as a capability flag on model listings only.

Sources: [quickstart](https://openrouter.ai/docs/quickstart) · [api_reference/overview](https://openrouter.ai/docs/api_reference/overview) · [parameters](https://openrouter.ai/docs/api_reference/parameters) · [limits](https://openrouter.ai/docs/api_reference/limits) · [errors-and-debugging](https://openrouter.ai/docs/api_reference/errors-and-debugging) · [streaming](https://openrouter.ai/docs/api_reference/streaming) · [structured-outputs](https://openrouter.ai/docs/guides/features/structured-outputs) · [tool-calling](https://openrouter.ai/docs/guides/features/tool-calling) · [reasoning-tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens) · [prompt-caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching) · [provider-selection](https://openrouter.ai/docs/guides/routing/provider-selection) · [auto-exacto](https://openrouter.ai/docs/guides/routing/auto-exacto) · [latest-resolution](https://openrouter.ai/docs/guides/routing/routers/latest-resolution) · [model-fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks) · [zdr](https://openrouter.ai/docs/guides/features/zdr) · [router-metadata](https://openrouter.ai/docs/guides/features/router-metadata) · [response-healing](https://openrouter.ai/docs/guides/features/plugins/response-healing) · [apply-patch](https://openrouter.ai/docs/guides/features/server-tools/apply-patch) · [shell](https://openrouter.ai/docs/guides/features/server-tools/shell) · [agent-sdk](https://openrouter.ai/docs/agent-sdk/overview) · [agent-sdk/tools](https://openrouter.ai/docs/agent-sdk/call-model/tools) · [vercel-ai-sdk](https://openrouter.ai/docs/guides/community/vercel-ai-sdk) · [openai-sdk](https://openrouter.ai/docs/guides/community/openai-sdk) · [anthropic-agent-sdk](https://openrouter.ai/docs/guides/community/anthropic-agent-sdk) · [management-api-keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys) · [usage-accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting) · [OpenAPI spec](https://openrouter.ai/docs/openapi/openapi.yaml) · [GitHub: OpenRouterTeam/ai-sdk-provider](https://github.com/OpenRouterTeam/ai-sdk-provider) · live `GET /api/v1/models`
