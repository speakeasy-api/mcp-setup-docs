# Model routing plan for the docs factory on OpenRouter

Read-only research + arithmetic. Catalog data pulled live from `GET https://openrouter.ai/api/v1/models` on 2026-07-30 (364 models). Provider-behavior claims are sourced to Anthropic's and OpenRouter's own docs; Cursor rates are from [cursor.com/docs/account/pricing](https://cursor.com/docs/account/pricing).

**Headline findings, before the detail:**

1. The doctrine corpus is too small for prompt caching to matter. ~900 lines ≈ 12k tokens ≈ $0.06/call at Opus 5 rates. Caching it saves cents per run.
2. The cost of this pipeline is dominated by one thing: the **research phase's tool loop**. 45 web fetches accumulating in one conversation costs ~3.9M billed input tokens — 45× more than all 17 other calls' prompts combined. That is where caching and architecture pay.
3. **Cross-phase cache sharing is blocked by your tool definitions**, not by TTL. Tool defs sit above `system` in Anthropic's cache hierarchy; a different tool array per phase invalidates the doctrine prefix entirely. Fixable, but only if you standardize the tool array.
4. OpenRouter is not meaningfully cheaper than Cursor at the same model. The win is per-phase model choice and hard spend caps.

---

## 0. Price table (live catalog, USD per 1M tokens)

```
model                            in     out    cache_read  cache_write  ctx
anthropic/claude-opus-5          5.00   25.00  0.50        6.25         1,000,000
anthropic/claude-sonnet-5        2.00   10.00  0.20        2.50         1,000,000
anthropic/claude-haiku-4.5       1.00    5.00  0.10        1.25           200,000
openai/gpt-5.6-sol               5.00   30.00  0.50        6.25         1,050,000
openai/gpt-5.6-terra             1.00    6.00  0.10        1.25         1,050,000
openai/gpt-5.6-luna              0.10    0.60  0.01        0.125        1,050,000
google/gemini-3.6-flash          1.50    7.50  0.15        0.0833       1,048,576
google/gemini-3.1-pro-preview    2.00   12.00  0.20        0.375        1,048,576
google/gemini-3.5-flash-lite     0.30    2.50  0.03        0.0833       1,048,576
google/gemini-3.1-flash-lite     0.25    1.50  0.025       0.0833       1,048,576
```

GPT-5.6 tiers, from the catalog descriptions: **Sol** is "the flagship model in OpenAI's GPT-5.6 series … particularly strong at command-line and multi-step coding tasks"; **Terra** is "a balanced model … positioned between the flagship Sol tier and the cost-efficient Luna tier"; **Luna** is "fast, cost-efficient … suited for high-volume, latency-sensitive tasks such as chat, classification, and lightweight agentic workflows". The `-pro` suffixes are "the same underlying model … served with `reasoning.mode` set to `pro`".

Capability flags, verified per-model from `supported_parameters`:

| Model | `seed` | `temperature` | `tools` | `structured_outputs` | `reasoning_effort` |
|---|---|---|---|---|---|
| `anthropic/claude-opus-5` | ✘ | ✓ | ✓ | ✓ | ✓ |
| `anthropic/claude-sonnet-5` | ✘ | ✘ | ✓ | ✓ | ✓ |
| `anthropic/claude-haiku-4.5` | ✘ | ✓ | ✓ | ✓ | ✘ |
| `openai/gpt-5.6-sol` / `terra` / `luna` | ✓ | ✘ | ✓ | ✓ | ✓ |
| `google/gemini-3.6-flash` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `google/gemini-3.1-flash-lite` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `google/gemini-3.5-flash-lite` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `google/gemini-3.1-pro-preview` | ✓ | ✓ | ✓ | ✓ | ✓ |

Two things fall out of that table immediately: **no Anthropic model on OpenRouter supports `seed`**, and `claude-sonnet-5` does not even accept `temperature`. Anthropic phases can never be bit-reproducible. See §5.

---

## 1. Per-phase model recommendation

Design constraints I'm optimizing against:

- **research** is a long tool loop over untrusted web content, needs 1M context and disciplined tool use. Its cost is quadratic in fetch count, so the per-token rate matters ~45× more here than anywhere else.
- **review:fidelity** must not share a family with **draft**. Same-family reviewers agree with themselves; a drafter and its reviewer sharing a tokenizer, a post-training run, and a house style is not independent judgment.
- **review:achievability** is a simulation ("could this persona follow these steps"), a third kind of task — put it on a third family so a family-level blind spot can't take out both reviews.
- **distill** and **research-judge** are classification. Anything frontier is waste.
- **revise** is mechanical execution against a findings list, not judgment. Mid-tier.

### Recommended (balanced)

| Phase | Model | Reasoning | Rationale |
|---|---|---|---|
| distill | `google/gemini-3.1-flash-lite` | `effort: "low"` | Slug + persona from an issue body. $0.25/M in. |
| research — gather | `openai/gpt-5.6-terra` | `effort: "medium"` | 1.05M ctx at $1/$6. The loop is the budget; Sol costs 5× for tool dispatch that doesn't need flagship reasoning. |
| research — synthesize | `anthropic/claude-opus-5` | `effort: "high"` | The dossier is the source of truth for every downstream phase. One expensive call, correctly placed. |
| research-judge | `openai/gpt-5.6-luna` | `effort: "low"` | BEFORE/AFTER materiality is a binary classification. $0.10/M. |
| draft | `anthropic/claude-opus-5` | `effort: "high"` | Long-form prose in a persona voice over a 15k dossier. |
| review:fidelity | `openai/gpt-5.6-sol` | `effort: "high"` | **Different family from the drafter.** Claim-by-claim traceability against a dossier is exactly the "multi-step, command-line" strength the catalog claims for Sol. |
| review:achievability | `google/gemini-3.6-flash` | `effort: "medium"` | **Third family.** Persona simulation is cheap to run and benefits from a different prior. $1.50/M. |
| revise | `anthropic/claude-sonnet-5` | `effort: "medium"` | Targeted edits across ≤4 files from an explicit findings list. |

**Split `research` into gather and synthesize.** This is the single highest-leverage change in the plan and is worth more than any model choice: it turns a 3.9M-token quadratic loop on a frontier model into a 3.9M-token loop on a $1/M model plus one 150k-token call on Opus 5. See §2 for the arithmetic.

The reasoning-effort values map per-provider as documented at [reasoning-tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens): on Anthropic they become a thinking budget (`max(min(max_tokens × ratio, 128000), 1024)`, high = 0.8); on OpenAI they pass through natively; on Gemini 3 they become `thinkingLevel`. Reasoning tokens bill as output tokens on all three.

### Required per-request scaffolding

```jsonc
{
  "model": "anthropic/claude-opus-5",
  "session_id": "<run-id>",                       // sticky routing, see §3
  "provider": {
    "order": ["anthropic"],
    "allow_fallbacks": false,                     // reproducibility, see §5
    "require_parameters": true                    // never silently drop response_format
  },
  "reasoning": { "effort": "high" },
  "max_price": { "prompt": "6", "completion": "30" }  // routing guard, see §4
}
```

`require_parameters: true` is non-optional for this pipeline. Every phase returns "one JSON report"; without it a request whose endpoint doesn't implement `response_format` gets the parameter dropped silently and returns prose ([provider-selection](https://openrouter.ai/docs/guides/routing/provider-selection)).

---

## 2. Cost model

### Assumptions (state these; they drive everything)

| Quantity | Value | Basis |
|---|---|---|
| Static doctrine prefix `S` | 12,000 tok | ~900 lines markdown @ ~13 tok/line |
| Per-call variable prompt `V` | 8,000 tok | role doc + persona + guide files + prior artifacts |
| Base prompt `P = S + V` | 20,000 tok | midpoint of your 15–25k |
| Web fetches in research | 45 | midpoint of 30–60 |
| Extracted text per fetch | 3,000 tok | typical provider doc page after extraction |
| Outputs | distill 2k · gather 10k · synth 15k · judge 2k · draft 10k · fidelity 5k · achievability 5k · revise 6k | your figures |

**18-call allocation** (illustrative, sums to 18):

```
distill 1 · research-gather 1 · research-synth 1 · research-judge 1
draft 2 · review:fidelity 4 · review:achievability 4 · revise 4
```

### The research loop is the whole cost story

An agent loop re-sends the entire conversation every turn. With 45 fetch rounds each adding 3k tokens:

```
billed input = Σ(i=1..45) [ 20,000 + 3,000·(i−1) ]
             = 45 × 20,000  +  3,000 × (44×45/2)
             = 900,000      +  3,000 × 990
             = 900,000      +  2,970,000
             = 3,870,000 tokens
```

**3.87M input tokens for one phase.** The other 17 calls' prompts total ~848k. At Opus 5 rates that single loop would be $19.35 — more than double every other phase combined. On `gpt-5.6-terra` it is $3.87. That ratio is why gather goes on the cheap model and synthesis goes on the expensive one.

With a **rolling cache breakpoint** (move `cache_control` to the newest message each turn), the loop collapses:

```
cache reads  = Σ(i=2..45)[20,000 + 3,000·(i−2)] = 3,718,000 tok @ $0.10/M = $0.372
cache writes = 20,000 + 45×3,000 = 155,000 tok  @ $1.25/M = $0.194
                                                    input subtotal = $0.566
```

$3.87 → $0.57, an 82% cut. This is the caching that pays for itself; the doctrine corpus is not.

Web fetch itself: `openrouter:web_fetch` is **free on the OpenRouter engine**, $1 per 1,000 fetches on Exa or Parallel, with a hard cap of 50 fetches per request on the OpenRouter/native engines ([web-fetch](https://openrouter.ai/docs/guides/features/server-tools/web-fetch)). At 45 fetches you are one page under that ceiling — budget for it. Exa cost at 45 fetches = $0.045. If you use the `web` search plugin instead, Exa is $0.005/request for up to 10 results, $0.001 per extra result ([web-search plugin](https://openrouter.ai/docs/guides/features/plugins/web-search)).

### Recommended plan — per-phase table

Costs shown with research-gather cached (rolling breakpoint), everything else uncached.

| Phase | Model | Calls | In/call | Out/call | $/call | Phase $ |
|---|---|---|---|---|---|---|
| distill | gemini-3.1-flash-lite | 1 | 20k | 2k | 0.008 | **0.008** |
| research-gather | gpt-5.6-terra | 1 | 3.87M (cached) | 10k | 0.671 | **0.671** |
| research-synth | claude-opus-5 | 1 | 150k | 15k | 1.125 | **1.125** |
| research-judge | gpt-5.6-luna | 1 | 36k | 2k | 0.005 | **0.005** |
| draft | claude-opus-5 | 2 | 35k | 10k | 0.425 | **0.850** |
| review:fidelity | gpt-5.6-sol | 4 | 43k | 5k | 0.365 | **1.460** |
| review:achievability | gemini-3.6-flash | 4 | 43k | 5k | 0.102 | **0.408** |
| revise | claude-sonnet-5 | 4 | 57k | 6k | 0.174 | **0.696** |
| | | **18** | | | | **$5.22** |

Worked examples so you can re-run these with your own numbers:

```
draft (opus-5):      in  35,000/1e6 × $5  = $0.175
                     out 10,000/1e6 × $25 = $0.250   → $0.425/call × 2 = $0.850

fidelity (sol):      in  43,000/1e6 × $5  = $0.215
                     out  5,000/1e6 × $30 = $0.150   → $0.365/call × 4 = $1.460

gather (terra):      reads  3,718,000/1e6 × $0.10 = $0.372
                     writes   155,000/1e6 × $1.25 = $0.194
                     out       10,000/1e6 × $6.00 = $0.060
                     fetch (Exa) 45 × $0.001       = $0.045   → $0.671
```

**Without the rolling cache breakpoint on gather, the same plan costs $8.53.** ($5.22 − $0.671 + $3.975.)

### Cheap variant — $1.42/run

| Phase | Model | Calls | Phase $ |
|---|---|---|---|
| distill | gemini-3.1-flash-lite | 1 | 0.008 |
| research-gather | gemini-3.1-flash-lite (cached) | 1 | 0.166 |
| research-synth | gemini-3.6-flash | 1 | 0.338 |
| research-judge | gpt-5.6-luna | 1 | 0.005 |
| draft | claude-sonnet-5 | 2 | 0.340 |
| review:fidelity | gemini-3.6-flash | 4 | 0.408 |
| review:achievability | gpt-5.6-luna | 4 | 0.029 |
| revise | gemini-3.5-flash-lite | 4 | 0.128 |
| | | **18** | **$1.42** |

What you give up: the drafter drops to Sonnet 5 (acceptable), but fidelity review moves to Gemini Flash — and fidelity is the phase where a miss ships a wrong claim into published docs. **I would not run the cheap variant on fidelity.** A hybrid — cheap everywhere except `review:fidelity` on `gpt-5.6-sol` — lands at ~$2.47 and is the one I'd actually ship if $5/run is too much.

### Premium variant — $9.95/run

| Phase | Model | Calls | Phase $ |
|---|---|---|---|
| distill | claude-haiku-4.5 | 1 | 0.030 |
| research-gather | gpt-5.6-sol (cached) | 1 | 3.173 |
| research-synth | claude-opus-5 | 1 | 1.125 |
| research-judge | claude-sonnet-5 | 1 | 0.092 |
| draft | claude-opus-5, `effort: max` | 2 | 1.150 |
| review:fidelity | gpt-5.6-sol-pro | 4 | 2.060 |
| review:achievability | gemini-3.1-pro-preview | 4 | 0.584 |
| revise | claude-opus-5 | 4 | 1.740 |
| | | **18** | **$9.95** |

Note where the premium money goes: $3.17 of it is running the gather loop on a flagship model, which buys you almost nothing — tool dispatch and text extraction are not reasoning-bound. Premium is a bad allocation. The balanced plan at $5.22 is the efficient frontier here; if you want to spend more, spend it on `draft` at `effort: max` and a second independent fidelity reviewer, not on gather.

### Cursor baseline

Published rates ([cursor.com/docs/account/pricing](https://cursor.com/docs/account/pricing)):

| Model | In | Out | Cache write | Cache read |
|---|---|---|---|---|
| Claude Opus 5 | $5 | $25 | $6.25 | $0.50 |
| Claude Sonnet 5 | $3 | $15 | $3.75 | $0.30 |
| Claude Sonnet 5 (promo, through Aug 2026) | $2 | $10 | — | — |
| GPT-5.4 | $2.50 | $15 | — | $0.25 |
| GPT-5.5 | $5 | $30 | — | $0.50 |
| Gemini 3.1 Pro | $2 | $12 | — | $0.20 |

Same pipeline, all 18 calls on Cursor's Sonnet 5 at list ($3/$15), gather cached:

```
gather:      reads 3,718,000/1e6 × $0.30 = $1.115
             writes  155,000/1e6 × $3.75 = $0.581
             out      10,000/1e6 × $15    = $0.150   → $1.846
other 17:    in    848,000/1e6 × $3       = $2.544
             out   103,000/1e6 × $15      = $1.545   → $4.089
                                                       total $5.94
```

**$5.94 on Cursor vs $5.22 on the OpenRouter balanced plan.** Two honest observations:

- There is a real per-token arbitrage on one model: Sonnet 5 is **$2/$10 on OpenRouter vs $3/$15 on Cursor list** — 33% cheaper — but Cursor's promo rate through August 2026 is $2/$10, which erases it. Opus 5 is $5/$25 on both. **Do not justify this migration on frontier per-token rates; they are the same.**
- The actual saving is that OpenRouter lets you put distill/judge/achievability on $0.10–$0.25/M models. That's what takes the cheap variant to $1.42, and there is no Cursor equivalent at that tier for agent work.
- Cursor Pro/Pro+/Ultra "include at least $20 of third-party model usage each month." At $5.94/run that's ~3.4 runs included before on-demand billing. If you run fewer than ~3 guides a month, Cursor is effectively free and this migration saves nothing. The case for OpenRouter is volume, per-phase routing, and the hard spend caps in §4 — not unit price.

---

## 3. Prompt caching: what you can actually recover

### The mechanism, precisely

Anthropic prompt caching is **not conversation-scoped**. It is a content-hash lookup: "Cache hits require 100% identical prompt segments, including all text and images up to and including the block marked with cache control," with the prefix hierarchy ordered `tools → system → messages`, and "Caches are isolated per workspace" ([Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).

**So yes — separate agent processes with byte-identical prefixes share a cache entry.** Separate conversations are fine. That part of your design is not a problem.

`cache_control` passes through OpenRouter unchanged. The OpenAPI spec's `ChatContentCacheControl` states it is an "Anthropic-style cache breakpoint for the content part. Interchangeable with the OpenAI-style `prompt_cache_breakpoint` marker: OpenRouter converts between the two based on the provider serving the request."

### But three things fragment the cache, and one of them is fatal here

**(a) Tool definitions sit above `system` in the hierarchy.** Anthropic's invalidation table is explicit: a change to tool definitions invalidates tools, system, *and* messages — "Entire cache invalidated." Your phases present different tool sets (research has web fetch; distill has none; revise has file writes). **That alone prevents the doctrine prefix from ever being shared across phases**, regardless of TTL, session stickiness, or breakpoint placement.

> Fix: present one identical superset tool array to every phase and gate availability in your executor rather than in the tool schema. If you won't do that, cross-phase caching of the doctrine corpus is dead on arrival and you should stop optimizing it.

**(b) Cache is per-model.** Opus 5 and Sonnet 5 do not share entries. The balanced plan uses 7 distinct models, so the doctrine prefix would need 7 separate writes even with identical tools.

**(c) Cache is per-provider endpoint.** This is what `session_id` is for: "OpenRouter uses it as the sticky routing key, routing all requests in the session to the same provider to maximize prompt cache hits" (openapi.yaml). Pass the same run ID as `session_id` from every one of the 18 processes. Belt-and-braces: also pin `provider.order` + `allow_fallbacks: false`.

### Does a 5m TTL survive a 20–40 minute run?

The refresh rule: "By default, the cache has a 5-minute lifetime. The cache is refreshed for no additional cost each time the cached content is used." So the TTL restarts on every hit — what matters is the **gap between consecutive cache reads**, not total run length.

For most of your phases that gap is small. But `research-gather` is a 45-fetch loop that will run 10–20 minutes wall-clock as a single call. Every phase downstream of it starts more than 5 minutes after the last read of a 5m entry. **A 5m TTL will not survive your run.**

And a 5m TTL that misses is *worse than no caching*, because you pay the 1.25× write every time and never collect a read.

### Break-even, in units of (base input price × prefix tokens)

| Strategy | Formula | N=18 |
|---|---|---|
| No caching | `N × 1.0` | 18.0 |
| 5m TTL, every call hits | `1.25 + (N−1)×0.1` | 2.95 |
| **5m TTL, every call misses** | `N × 1.25` | **22.5** ← 25% worse than not caching |
| 1h TTL, every call hits | `2.0 + (N−1)×0.1` | 3.7 |

Multipliers from Anthropic: 5m write 1.25×, 1h write 2×, reads 0.1× for both TTLs.

Break-even for the 1h TTL:

```
vs no caching:        2.0 + 0.1(N−1) < N        →  1.9 < 0.9N   →  N > 2.11  (≥3 calls)
vs 5m-always-missing: 2.0 + 0.1(N−1) < 1.25N    →  1.9 < 1.15N  →  N > 1.65  (≥2 calls)
```

**The 2.0× write multiplier is worth it at ≥3 calls sharing a prefix.** You have 18. If you consolidate onto fewer models, it's worth it by a wide margin.

### So how much money is actually on the table?

This is the deflating part. The doctrine corpus is 12k tokens. At Opus 5 rates that is **$0.06 per call**.

```
Opus 5, 3 calls sharing the prefix:
  no cache:   3 × 12,000/1e6 × $5.00  = $0.180
  1h TTL:     write 12,000/1e6 × $10.00 = $0.120
              2 reads 12,000/1e6 × $0.50 = $0.012   = $0.132
  saving:     $0.048   (27%, but 4.8 cents)
```

Across the whole balanced plan, with its 7-model fragmentation, realistic recovery on the doctrine corpus is **~$0.15 per run — about 3% of a $5.22 run.**

Even in the best case — identical tool arrays, everything consolidated onto Opus 5, perfect 1h hits — the theoretical ceiling is `18 × $0.06 = $1.08` down to `$0.12 + 17 × $0.006 = $0.22`, saving $0.86.

**Conclusion: don't build cross-phase doctrine caching. Build the rolling breakpoint inside the research loop, which saves $3.30 on the same run — 22× more, for less engineering.** If cross-phase caching comes free once you standardize the tool array, take it; don't restructure the pipeline for it.

Two caveats before you budget on any of this:

- OpenRouter's `/api/v1/models` feed exposes only **one** `input_cache_write` price per model — the 1.25× (5m) tier. Opus 5 shows $6.25/M; the 1h tier at 2.0× ($10/M per Anthropic's own worked example) is **not in OpenRouter's pricing feed**. Verify actual 1h billing on a throwaway run before trusting a forecast.
- OpenRouter's caching page lists Anthropic minimum cacheable tokens as "Opus 4,096 / Sonnet 4.6-4.5 1,024 / Haiku 3.5 2,048" ([prompt-caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching)), which is stale relative to Anthropic's current table: **Opus 5 = 512, Sonnet 5 = 1,024, Haiku 4.5 = 4,096**. Note Haiku 4.5's minimum went *up* to 4,096. Your 12k prefix clears all of them, so this doesn't bite here — but trust Anthropic's page over OpenRouter's.

---

## 4. Hard cost ceiling

Three layers, in increasing order of how much you should rely on them.

### Layer 1 — `maxCost` in `@openrouter/agent` (soft, in-process)

```ts
import { stepCountIs, maxCost } from '@openrouter/agent';

const result = openrouter.callModel({
  model: 'openai/gpt-5.6-terra',
  messages,
  tools: [webFetch],
  stopWhen: [stepCountIs(50), maxCost(1.50)],
});
```

Semantics per [stop-conditions](https://openrouter.ai/docs/agent-sdk/call-model/stop-conditions): `maxCost(amount)` "Stops after reaching a spending limit … checked between steps, preventing overage beyond the specified amount." Conditions combine with OR — any one firing halts the run. When a condition fires mid-tool-call the SDK "executes those pending tool calls" and appends a final response directive (configurable via `allowFinalResponse`).

**This is per-`callModel`, i.e. per-phase, not per-run.** To make it a run budget, thread it:

```ts
let spent = 0;
const RUN_BUDGET = 8.00;
for (const phase of phases) {
  const remaining = RUN_BUDGET - spent;
  if (remaining <= 0) throw new Error('run budget exhausted');
  const r = phase.model.callModel({ ...phase, stopWhen: [stepCountIs(50), maxCost(remaining)] });
  spent += (await r.getUsage()).cost;   // or sum usage.cost off each response
}
```

Weakness: it is in-process. A crash-loop, a retry storm, or a second orchestrator instance blows straight through it.

### Layer 2 — per-key `limit` via the management API (hard, server-side)

This is the one that actually cannot be exceeded. A **management key** drives CRUD at `/api/v1/keys` and "cannot be used to make API calls to OpenRouter's completion endpoints" ([management-api-keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)). Per-key fields include `limit`, `limit_remaining`, `limit_reset`, `disabled`, `include_byok_in_limit`.

```bash
# job start — mint a disposable key capped at $12
KEY=$(curl -s https://openrouter.ai/api/v1/keys/ \
  -H "Authorization: Bearer $OPENROUTER_MANAGEMENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"guide-run-'"$GITHUB_SHA"'","limit":12}')

# ... run all 18 phases with the returned runtime key ...

# job end (always, in a finally/trap) — read spend, then revoke
curl -s "https://openrouter.ai/api/v1/keys/$HASH" -H "Authorization: Bearer $OPENROUTER_MANAGEMENT_KEY"
curl -s -X DELETE "https://openrouter.ai/api/v1/keys/$HASH" -H "Authorization: Bearer $OPENROUTER_MANAGEMENT_KEY"
```

### Layer 3 — `provider.max_price` (routing guard, per request)

```json
{ "provider": { "max_price": { "prompt": "6", "completion": "30" } } }
```

USD per million tokens. This doesn't cap total spend; it stops a routing decision from landing you on an endpoint priced above your expectation. Cheap insurance against a fallback or an Auto Exacto reorder picking an expensive endpoint.

### What happens mid-run when the cap is hit

**You get `402 Payment Required`.** From [limits](https://openrouter.ai/docs/api_reference/limits): "When credits are insufficient, you receive a `402 Payment Required` error. To resolve this, add credits to bring your account balance positive **or increase your key's credit limit**." The error body follows the standard shape, and the HTTP status matches `error.code` ([errors-and-debugging](https://openrouter.ai/docs/api_reference/errors-and-debugging)):

```ts
{ error: { code: 402, message: "...", metadata?: {...} } }
```

**Is it distinguishable from other 4xx? Yes, cleanly, by status code alone.** OpenRouter reserves distinct codes: `400` bad request · `401` invalid credentials · `402` insufficient credits · `403` forbidden/guardrail/moderation · `408` timeout · `429` rate limited. Nothing else returns 402.

Two things it does *not* tell you, and one trap:

- **402 does not distinguish key-limit from account-balance exhaustion.** Both produce it. To disambiguate, `GET /api/v1/key` and compare `limit_remaining` against your account credits.
- **Trap: if the 402 arrives after streaming has begun, it is not an HTTP 402.** Per the docs, "once the first token has been written to the client, the HTTP `200 OK` status and headers are already committed" — the error arrives as an SSE data event with `choices: [{ finish_reason: 'error' }]`. Your orchestrator must check `finish_reason`, not just status, or a budget kill looks like a successful empty phase.
- Good news for retry accounting: **zero completion insurance** means you aren't charged for responses with zero completion tokens and a blank or error finish reason ([zero-completion-insurance](https://openrouter.ai/docs/guides/features/zero-completion-insurance)), so failed calls don't compound the overrun.

### Recommended mechanism for a CI job that must not run away

1. Store only the **management key** as a CI secret. Never expose a long-lived inference key to the job.
2. At job start, `POST /api/v1/keys/` with `limit` = 2.5× your expected run cost (`$12` for the $5.22 balanced plan — headroom for one retry round, not for a runaway).
3. Pass `session_id: <run-id>` and `provider.max_price` on every request.
4. Set `stopWhen: [stepCountIs(50), maxCost(remaining)]` per phase from a threaded run budget.
5. Treat **402 (or `finish_reason === 'error'` with code 402) as fatal and non-retryable.** Exit with a distinct code so CI surfaces "budget exceeded" rather than "flaky".
6. In a `finally`/`trap`, read the key's `usage` for the run cost report and `DELETE` the key.

Steps 2 and 6 are the load-bearing ones. Everything else is graceful degradation on top of a cap that a buggy loop physically cannot exceed.

---

## 5. Reproducibility

### What you must pin

**1. Never `~author/family-latest`.** The tilde alias "always resolve[s] to the newest concrete model in a given family"; the docs state plainly that "versions can change at any time" and "there is no built-in way to pin to 'second newest' or to roll back through the alias" ([latest-resolution](https://openrouter.ai/docs/guides/routing/routers/latest-resolution)). Fine for a chat product, disqualifying for a docs factory.

**2. Prefer the dated `canonical_slug` over the marketing slug.** OpenRouter documents `canonical_slug` as "a permanent slug for the model that never changes," and for your candidates these are dated:

```
anthropic/claude-opus-5        → anthropic/claude-opus-5-20260723
anthropic/claude-sonnet-5      → anthropic/claude-sonnet-5-20260630
anthropic/claude-haiku-4.5     → anthropic/claude-4.5-haiku-20251001
openai/gpt-5.6-sol             → openai/gpt-5.6-sol-20260709
openai/gpt-5.6-terra           → openai/gpt-5.6-terra-20260709
openai/gpt-5.6-luna            → openai/gpt-5.6-luna-20260709
google/gemini-3.6-flash        → google/gemini-3.6-flash-20260721
google/gemini-3.1-flash-lite   → google/gemini-3.1-flash-lite-20260507
google/gemini-3.5-flash-lite   → google/gemini-3.5-flash-lite-20260721
```

The undated slug is the alias; the dated one is the identity. **Caveat I could not verify without an API key: whether `POST /chat/completions` accepts a `canonical_slug` directly as `model`.** These dated forms do not appear as `id` values in the models list — only as `canonical_slug`. Test one request against `anthropic/claude-opus-5-20260723` before building on it. If it's rejected, the fallback is to pin the undated slug *and* assert `response.model` and `canonical_slug` against a lockfile on every run, failing the build on drift.

**3. Avoid `-preview` slugs.** `google/gemini-3.1-pro-preview` is a moving upstream target by construction. It's in the premium variant; drop it if reproducibility outranks quality there.

**4. Pin the provider, not just the model.** The same slug can be served by Anthropic direct, Bedrock, or Vertex, with different behavior and different cache pools:

```json
{ "provider": { "order": ["anthropic"], "allow_fallbacks": false } }
```

Use `order` + `allow_fallbacks: false`, **not** `only`. Per the OpenAPI spec, `only` and `ignore` are "merged with your account-wide … settings for this request" — meaning someone changing an account-level preference in the dashboard silently changes your pipeline's routing with no code change. `order` + `allow_fallbacks:false` is the deterministic form.

**5. Turn off cross-model fallback for reproducible runs.** A populated `models[]` array means a context-length failure or moderation rejection silently swaps the model, and "requests are priced using the model that was ultimately used" ([model-fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)). Either omit it, or log the response `model` field and treat a mismatch as a run-invalidating event.

**6. Neutralize Auto Exacto.** It "runs by default on every tool-calling request, requiring no configuration," reordering providers by a **rolling 32-day** benchmark window ([auto-exacto](https://openrouter.ai/docs/guides/routing/auto-exacto)). Your research and revise phases carry tools, so they are subject to it today. An explicit `provider.order` overrides it; `provider.sort: "price"` or the `:floor` suffix also opts out. **This is the most likely cause of "same code, different provider, a month later."**

**7. Sampling determinism is asymmetric across families — and Anthropic loses.**

| Family | `seed` | `temperature` | Best achievable |
|---|---|---|---|
| OpenAI GPT-5.6 | ✓ | ✘ | `seed` only |
| Google Gemini 3.x | ✓ | ✓ | `seed` + `temperature: 0` |
| Anthropic Claude 5 | ✘ | Opus ✓ / **Sonnet ✘** | `temperature: 0` on Opus; **nothing on Sonnet 5** |

Verified from `supported_parameters` in the live catalog. Practical consequence: **your `draft` and `revise` phases (Anthropic) can never be made deterministic.** If run-to-run reproducibility of the *output* matters — not just of the model routing — that's an argument for moving `draft` to `gemini-3.6-flash` or a GPT-5.6 tier and accepting the prose-quality trade. Note also that `reasoning.effort` changes invalidate caches and change sampling behavior, so treat effort as a pinned config value, not a tuning knob.

### Does OpenRouter ever silently change what a concrete slug resolves to?

Honest answer, separating documented from undocumented:

- **Documented:** `canonical_slug` "never changes." Aliases auto-resolve to canonical (`anthropic/claude-3-5-sonnet` → `anthropic/claude-3.5-sonnet`). Deprecated endpoints carry an `expiration_date`. Tilde aliases explicitly do change.
- **Documented as changing:** which *provider endpoint* serves a given slug — via Auto Exacto, load balancing, `sort`, and account-level `only`/`ignore` merges. This changes without notice and is the realistic drift vector.
- **Not documented either way:** whether OpenRouter ever repoints an undated slug like `anthropic/claude-opus-5` at a newer upstream snapshot. The existence of a separate dated `canonical_slug` strongly implies the undated form is an alias layer — but I found no statement guaranteeing the undated slug is frozen. Don't assume it is.
- **Outside OpenRouter's control entirely:** upstream providers updating a model behind a stable name. No router can pin that.

### Minimum viable reproducibility harness

```jsonc
// pinned per phase, checked into the repo
{
  "model": "anthropic/claude-opus-5",
  "expect_canonical_slug": "anthropic/claude-opus-5-20260723",  // assert on every run
  "provider": { "order": ["anthropic"], "allow_fallbacks": false, "require_parameters": true },
  "reasoning": { "effort": "high" },
  "temperature": 0                                              // where supported
}
```

Plus, on every one of the 18 calls: send `X-OpenRouter-Metadata: enabled`, and log `X-Generation-Id`, `response.model`, and `openrouter_metadata.endpoints` (which endpoint was selected). Reconcile cost afterward from `GET /api/v1/generation?id=<gen-id>`, whose `provider_name` field is your ground truth for what actually served each call. That log is what lets you answer "why did this run differ" a month later — nothing else will.

---

## Summary

| | Cost/run | Notes |
|---|---|---|
| **Balanced (recommended)** | **$5.22** | 7 models, cross-family review, rolling cache in research |
| Balanced, no research caching | $8.53 | the $3.30 delta is one breakpoint |
| Cheap | $1.42 | don't ship this on `review:fidelity` |
| Cheap + Sol on fidelity (hybrid) | ~$2.47 | best value/risk point |
| Premium | $9.95 | $3.17 of it wasted on flagship gather |
| Cursor, all Sonnet 5 @ list | $5.94 | Cursor Pro includes ~3.4 runs/mo |

Three things to do first, in order: **(1)** split research into gather + synthesize; **(2)** add a rolling `cache_control` breakpoint inside the gather loop; **(3)** mint a spend-limited key per CI run. Those three are worth more than every model-selection decision in §1 combined. Cross-phase doctrine caching is the last thing to build, and only after you've standardized the tool array.
