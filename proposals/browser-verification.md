# Consensus plan: Browser verification for the guide pipeline

**Counsel:** Claude Opus 5 · GPT 5.6 Sol · Claude Fable 5  
**Status:** Ratified by counsel (Opus · Sol · Fable) with nits absorbed below  
**Date:** 2026-07-25  
**Repo:** `speakeasy-api/mcp-setup-docs`

This document is the agreed architecture. Minority notes appear where a
member reserved a Phase-2 escalation path without blocking v1. All three
counsel members **RATIFY WITH NITS**; must-fix nits from the ratify pass
are incorporated in this revision.

---

## 0. One-sentence recommendation

Add an **opt-in, post-convergence `verify-guide` phase** that
deterministically click-throughs the converged `setup.md` in a sandboxed
browser (Playwright/Chromium), records a Verification Ledger of
confirm/deny/amend/blocked findings, captures redacted screenshots,
**always tears down** created resources to a re-runnable baseline, and —
only on material denies/amends — re-enters the fact flow by amending the
Research Dossier and re-rendering affected setup anchors through the
existing Revision lane.

---

## 1. Settled architecture

```text
Existing (unchanged):
  draft-guide:
    research → [scope gate] → Writer → review/lint loop → converged setup.md
    (may ship unverified)

New (opt-in):
  verify-guide:                          # mise / factory label guide:verify
    V0 preflight     allowlist tenant, vault, reap strays
    V1 plan          compile claim plan from setup.md + Dossier + meta.yaml
    V2 execute       deterministic Playwright walk + capture
    V3 seal          sanitized Verification Ledger
    V4 teardown      always (finally / Actions always()) + absence audit
    V5 reconcile     material deny/amend → amend Dossier (Research role)
    V6 re-render     targeted Revision/Writer + fidelity/lint (denies/amends)
    V7 promote       redacted assets + meta.yaml descriptors + status;
                     rewrite pipeline.lock from final on-disk artifacts
```

### 1.1 Roles / components

| Piece | Kind | Secrets? | Writes |
| --- | --- | --- | --- |
| Verification Planner | **deterministic compiler in v1** (secretless agent optional later) | no | claim plan / manifest: origins, mutation budget, teardown adapters, stop-lines; **digest sealed before any mutation**; no vault refs or runtime-only selectors required in the reviewable surface |
| Browser executor | **deterministic** Playwright TS (`tools/browser-verifier/`) | yes (harness only) | scratch evidence, resource ledger |
| Offline analyst (optional) | secretless LLM on **scrubbed** snapshots | no | locator suggestions / triage notes |
| Reconciler | Technical Research mode (bounded diff) | no | `research.md` / `meta.yaml` on deny/amend only |
| Asset weaver | deterministic harness | no | `assets/*.png`, placeholder→`![]()` swaps, asset descriptors |
| Teardown driver | deterministic (+ UI fallback adapters) | yes (harness) | teardown report (ephemeral), absence assertions |
| Existing Revision / Fidelity / lint | unchanged | no | targeted setup fixes after Dossier amend |

**v1 security boundary (unanimous for shipping):** no LLM receives
credentials, TOTP, cookies, OAuth secrets, or a command loop over an
authenticated browser. Session bootstrap and all mutations are harness
code. Opus reserves a Phase-2 **constrained tool-layer Driver** (origin
allowlist, mutation whitelist keyed on claim id, no LLM-originated
mutation) if console drift makes pure determinism untenable — never an
open agent.

### 1.2 What the browser walks

- **Coverage contract (Fable):** plan keyed and ordered by every
  provider-step anchor in converged `setup.md`; gaps reported per anchor.
- **Assertions (Opus):** Dossier verbatim labels → semantic locators
  (`getByRole` / `getByLabel`); a documented label is a testable assertion.
- **Mechanism (Sol):** schema-validated claim/action plan; deterministic
  executor; lint rejects setup actions without Dossier backing.
- Anchor contract already makes setup labels ≡ Dossier labels
  post-convergence; divergence is a pre-browser fidelity failure.

### 1.3 Fact flow & I1

Live console observation is a **provider-side source** that enters at the
Dossier (already practiced as `source: endpoint-observation` in multiple
guides). Clarifying amendment to I1 / goal paragraph (human-approved):

> Guides are authored from providers' public documentation and, when
> verification runs, from provenance-backed live observation of designated
> sandbox consoles. Observation amends the Research Dossier; `setup.md`
> changes only by re-render from the Dossier. Observation never overrides
> documentation on **policy / plan / eligibility** — those escalate to a
> human open question. Absence of observation in one sandbox never weakens
> a documented fact (`not_observed` ≠ `contradicted`).

**Confirmations are Ledger-only** (Opus hill; peers conceded). An
all-confirm run leaves **factual** `research.md` content and **factual**
`setup.md` prose unchanged (acceptance test). Screenshot weaving (§4) is
mechanical enrichment: it may rewrite placeholder comments → image refs
and append `documentation.assets[]` in `meta.yaml`. That *does* change
digests under today's `stableDigestFile` (strips only `observed_at`), so
**V7 must rewrite `pipeline.lock.json` from final on-disk artifacts**
(reuse `writeConvergedLock`) rather than claiming draft/review skips
survive capture. Do not treat asset/placeholder churn as a material
research change that forces a full re-draft/review loop.

**Trust-provider-docs doctrine (2026-07-23) is strengthened, not reopened:**
Research still must not mint "please verify in console" open questions for
documented UI; reviewers still must not demand them. The Verifier
**performs** checks; it never requests them of humans. Materiality
firewall: only differences that change what the reader types/clicks/selects
become deny/amend findings; cosmetic chrome drift is noise.

---

## 2. Browser & CI

- **Stack:** Playwright + bundled Chromium, Node aligned with the draft
  pipeline (`>=22.13`; pin the same major as `guide-draft.yml` —
  currently Node 22 — unless both bump together), locked versions in
  `tools/browser-verifier/`. Same locally and on `ubuntu-latest`.
- **Mode:** headless in CI; headed optional locally for debugging.
- **Traces/videos/HAR/raw ledgers:** ephemeral under `$RUNNER_TEMP` /
  local scratch; **never commit and never upload** as workflow artifacts
  (repo is public — Actions artifacts are world-downloadable). Promote
  only allowlisted redacted PNGs + sanitized ledger summaries.
- **Flake:** retry **non-mutating** steps; never blind-retry a mutation —
  tear down recorded resource, absence-assert, then retry once.
- **Success depth ladder:**
  - **L1** chrome/labels match plan (read-only)
  - **L2** mutating provider setup (create OAuth app / credentials) + capture
  - **L3** Speakeasy attach + first-connect (OAuth dance / tool list)
- **v1 GitHub slice target:** L2 required; **L3 is a Phase-0 go/no-go** —
  include iff Speakeasy source + identity teardown is proven reliable in the
  spike; otherwise defer L3 to Phase 2 (Fable/Sol condition; Opus preferred
  L3 deferred — resolved by evidence, not debate).
- **Hard stop-line:** no billing, no irreversible tenant destruction, no
  crossing paid gates without explicit `Decision N:`.

### Job isolation (v1 requirement — Sol, unanimous after round)

Do **not** put the vault token in today's `guide-draft.yml` (it already
combines untrusted issue text + `contents: write`). Split:

1. **draft job** — current factory (no vault, no browser)
2. **verify-browser job** — protected environment, `contents: read`,
   vault token, Playwright; concurrency keyed to **credential profile /
   sandbox tenant**, not issue number. Execute harness/adapters only from
   a **pinned trusted revision** (default branch / release tag) — never
   from the factory branch under test. Treat factory-branch `setup.md` /
   plan inputs as **untrusted data**.
3. **verify-promote job** — secretless; consumes sanitized artifacts;
   amends Dossier / weaves assets / opens or updates PR comments

---

## 3. Credentials & accounts

- **Human-once, reuse-forever** sandbox identity per provider (and a
  Speakeasy sandbox org/project). No agent signup, no CAPTCHA solving, no
  ToS-acceptance automation in v1.
- **Vault:** 1Password CLI (`op`)
  - Local: user sign-in
  - CI: restricted service account + Actions environment secrets
- **Item naming (illustrative):**
  - `verify/<provider>/account` — durable login + TOTP seed
  - `verify/<provider>/run-<id>/*` — ephemeral only if ever stored; prefer
    **never persist** run-created client secrets (teardown revokes them)
- **Agent/harness split:** harness resolves `op://` refs; executor gets
  filled fields / session; LLM never sees values. Durable ledgers use
  **opaque random handles** (or a run-keyed HMAC never committed) — never
  `sha256` prefixes of secret values (those are offline verifiers).
- **Sandbox policy:** allowlisted throwaway orgs only (GitHub org unrelated
  to `speakeasy-api`); no customer data; no production tenants.

---

## 4. Screenshots & verified `setup.md`

- **One `setup.md`.** No `setup.verified.md`. Verification status is
  machine metadata (`meta.yaml` verification block + run record), never
  reader-facing chrome (extends 2026-07-22 screenshot-exception retro).
- Capture every non-exception `<!-- screenshot: -->` placeholder at the
  state the Dossier screenshot note describes (by default immediately
  before a committing click when one exists; navigation-only steps have
  no committing click). Never after a secret reveal. Fixed viewport
  (e.g. 1440×900).
- **Redaction fail-closed:** Playwright locator `mask:`; plan-declared
  mask lists; never capture secret-reveal screens; if redaction cannot be
  verified, keep the placeholder and drop the shot.
- **Asset weaver (deterministic, Fable — unanimous for v1):** after
  capture+hash, swap placeholder comments for
  `![alt](assets/<id>.png)`, write schema-valid `meta.yaml` `assets[]`
  (`content_hash`, dimensions, path). Alt text from the Dossier's existing
  screenshot note (not model-invented). This is mechanical enrichment, not
  a second fact channel — and preserves the confirmation byte-identity test
  for *factual* prose.
- Factual corrections (deny/amend) still go Dossier → Revision/Writer.

---

## 5. Tear-down (first-class)

Tear-down is part of the definition of **verified**, not best-effort cleanup.

### Principles (unanimous)

1. **Always runs** (`finally` / Actions `always()`), with its own time budget.
2. **Write-ahead resource ledger** (`resources.jsonl` in scratch): log
   `intended` **before** the mutating click.
3. **LIFO** with declared `depends_on` overrides; prefer API delete over UI.
4. **Idempotent:** absent / 404 = success; **absence-assert** after each delete.
5. **Capture before destroy.**
6. **Attempt all entries** on partial failure; report leftovers.
7. **Pre-flight reap** of naming-convention strays
   (e.g. `[speakeasy-verify] …` / run-id embedded names) so the next run
   self-heals.
8. **Standalone:** `mise run verify-teardown -- --run <id>` /
   `--teardown-only`.
9. **Readers never see teardown** in `setup.md`.
10. Propose constitution **I9** (human edit, Opus + Fable as invariant;
    Sol accepts the property and is fine starting in role doctrine if I8
    prefers a smaller constitution diff): every off-repo mutation is
    logged before it happens and reversed after.

### Retained vs destroyed

| Retained | Destroyed every run |
| --- | --- |
| Vaulted sandbox account + TOTP | OAuth apps / integration credentials |
| Allowlisted empty org/project shell | Client secrets, redirect URI registrations |
| | Speakeasy sources / attached IdPs / temp projects |
| | Browser storageState (v1 default: re-auth each run) |

### "Validated again later" (acceptance)

`mise run verify-guide -- github` twice back-to-back with no human touch;
both reach the declared depth with `teardown.status: clean`.

An L2/L3 success with leftovers is **not** green.

---

## 6. Findings schema (sketch)

```jsonc
{
  "claim_id": "register-oauth-app.labels.create",
  "anchor": "register-oauth-app",
  "verdict": "confirm" | "deny" | "amend" | "blocked",
  "materiality": "cosmetic" | "behavioral" | "blocking",
  "expected": {
    "from": "dossier",
    "match": "one_of",
    "labels": ["Register a new application", "New OAuth App"]
  },
  "observed": { "label": "…", "url": "…", "at": "ISO-8601" },
  "evidence": { "screenshot_id": "…", "trace_ref": "scratch://…" },
  "notes": "one factual sentence"
}
```

Documented UI alternates (GitHub's first-app vs subsequent-app button
labels) use `match: one_of`; any listed label is `confirm`, none is
`deny`. This keeps the §5 double-run stable across a fresh org and an
org that retained naming-convention history until reap.

- **confirm** → Ledger only
- **deny / amend** (behavioral+) → Reconciler bounded Dossier diff → targeted re-render
- **blocked** (awaiting human) → exit `3` + factory "Verification check"
  comment with `Decision N:` (session refresh, plan gate, billing
  stop-line, cleanup help)

Reuse `ReviewFinding` shape where findings enter Revision.

---

## 7. Local testability

Same command path as CI:

```bash
# from repo root
export CURSOR_API_KEY=…          # planner / reconcile agents only
export OP_SERVICE_ACCOUNT_TOKEN=… # or `op signin` locally

mise run verify-guide -- github
mise run verify-guide -- github --dry-run          # plan + lint, no browser
mise run verify-guide -- github --headed           # local debug
mise run verify-teardown -- --run <id>
mise run verify-sweep -- github                    # naming-convention reap

# Offline / hermetic (required in CI unit lane):
mise run verify-guide -- --fixture tools/browser-verifier/fixtures/fake-console
```

**Fake provider console** (Opus): hermetic tests for masking, write-ahead
ledger, LIFO teardown, crash recovery, out-of-plan refusal — without live
credentials. Full HAR record-replay of real consoles is **rejected** as a
false sense of coverage (Fable).

**First vertical slice: GitHub** — free OAuth app, existing click-through
Dossier, secret-at-create + redaction, enumerable teardown (UI delete),
exercises Speakeasy Configure Manually if L3 enabled. Box deferred (billing
stop-line validates tier system in Phase 2).

---

## 8. Factory / CLI integration

### Triggers

- Label **`guide:verify`** on an issue that already has a factory branch/PR
  with converged `setup.md` (or CLI locally).
- **Not** auto-chained after every draft in v1 (cost, flake, vault).
- Pipeline review comment advertises verify readiness.

### Labels

| Label | Meaning |
| --- | --- |
| `guide:verify` | Trigger (consumed like `guide:draft`) |
| `guide:in-progress` | Reuse while verify runs |
| `guide:blocked` | Awaiting Decision / unclear |
| `guide:needs-cleanup` | **Sticky** until a sweep/teardown run reports clean |

### Exit codes (`verify-guide`)

Aligned with draft-guide spirit:

| Code | Meaning |
| --- | --- |
| `0` | Declared depth succeeded **and** teardown clean |
| `1` | Hard failure (harness/crash) — teardown still attempted |
| `2` | Verification failed (denies / failed assertions) but teardown clean |
| `3` | Awaiting human (`blocked` → `Decision N:` / session refresh) |
| `4` | **Teardown incomplete / baseline dirty** — **outranks every other code**, including `1`/`2`/`3` |
| `64` | Usage / bad args (preserve draft-guide precedent) |

### Lock / skip

- Content digests of setup/research/meta/speakeasy-setup + **time-addressed
  TTL** for verify (outside world changes). Expired verify = drift canary.
- After a successful promote (including capture-only), **rewrite the lock**
  from final artifacts so the next draft run does not treat mechanical
  asset weaving as an invalidated draft.
- Re-draft / material research change drops `verification.status` to
  stale/unverified.

### Budgets (initial)

- Separate verify workflow timeout ~45–60 min
- Apply/mutate budget ~25 min; teardown reserved ~10 min
- Nightly sweeper for naming-convention orphans

---

## 9. Doctrine & constitution impact (human-approved)

| File | Change |
| --- | --- |
| `doctrine/constitution.md` | Clarify goal + I1 for live observation; **propose I9** teardown invariant. Prefer **no I7 edit** unless a concrete clause is shown necessary — harness/executor are not pipeline agents, so I7 already does not authorize them to hold secrets in reports; do not "narrow" language that reads as weakening |
| `doctrine/shared.md` | Add verify stage to pipeline table; artifact rules |
| `doctrine/roles/verifier.md` | **New** — plan coverage, materiality firewall, stop-lines |
| `doctrine/roles/technical-research.md` | Record deletion/teardown paths when encountered; reconciler bounds; live-verification provenance |
| `doctrine/roles/writer.md` | Note asset weaver may replace placeholders; still no fact invention |
| `doctrine/roles/review.md` | Do not demand console verification; defer to Verifier |
| `doctrine/glossary.md` | Ledger, verified status, teardown |
| `doctrine/CHANGELOG.md` | Evidence-cited entry when applied |
| `FACTORY.md` / `README.md` | Operator docs for `guide:verify`, Decisions, cleanup |
| `schema/guide.v1.schema.json` | Optional `verification` status block; assets already defined |
| `schema/verification-ledger.v1.schema.json` | **New** |
| `mise.toml` | `verify-guide`, `verify-teardown`, `verify-sweep` |
| `tools/browser-verifier/` | **New** package |
| `.github/workflows/guide-verify.yml` | **New** (isolated jobs) |

`/tune-pipeline` later — do not invent doctrine from this counsel alone
beyond what the human approves from this plan.

---

## 10. Phased delivery

### Phase 0 — Spike (local, GitHub sandbox)

Acceptance:

1. Human-provisioned GitHub throwaway org + 1Password items
2. Deterministic walk of existing `guides/github/setup.md` provider steps (L2)
3. Redacted screenshots written via asset weaver; secret-reveal not captured
4. Write-ahead ledger + LIFO teardown + absence assertions
5. **Double-run** both `teardown: clean` (exercises documented label alternates)
6. Seeded deny fixture → Dossier amend → targeted re-render path exercised
   (can be against fake console)
7. L3 Speakeasy go/no-go evidence recorded
8. Sentinel-secret test proves redaction chokepoint
9. **Crash recovery:** kill executor mid-mutation; next run's pre-flight
   reap removes the orphan and reports it as inherited (fake console OK)
10. **Measure login success rate** across the double-run (re-auth-per-run
    makes MFA/device-check the expected dominant flake source)

### Phase 1 — MVP integrated

- `tools/browser-verifier` + mise tasks + ledger schema
- `guide-verify.yml` three-job split
- Factory comments / labels / exit codes
- GitHub live verify on demand
- Hermetic fake-console CI tests for safety properties
- Doctrine PRs as human-approved diffs (I8)

### Phase 2 — Hardening

- Second provider (api-key path and/or Box at L1/L2 with billing stop-line)
- Nightly drift canary (TTL expiry)
- Optional constrained MCP Driver if determinism collapses on drift
- Optional confirmation provenance digest-strip
- `/tune-pipeline` over verification run records

---

## 11. Explicit non-goals (v1)

- Agent self-signup / CAPTCHA solving / production tenants
- Auto-verify on every draft
- Parallel `setup.verified.md`
- LLM operating an authenticated browser
- Committing **or uploading** traces, HARs, videos, raw ledgers, or
  unmasked shots (public-repo artifact exposure)
- Using verification to weaken documented policy facts from one sandbox
- Billing-crossing paths without Decision

---

## 12. Open questions for the human

1. Which Speakeasy environment/org is the verification sandbox, and who owns it?
2. Per-provider ToS / acceptable-use sign-off for automated console exercise?
3. 1Password vault/bootstrap: service account scope, rotation owner?
4. Approve constitution edits (I1 clarification, I7 narrowing, I9)?
5. Should published catalog UI surface `verification.status`, or keep it repo-only?
6. Standing budget / approval for any future billable L3 path (e.g. Box)?
7. Screenshot refresh cadence when TTL expires but guide text unchanged?
8. Confirm repo stays public — if diagnostic artifact upload is ever
   desired, visibility is the gate (default remains: no upload).

---

## 13. Dispute resolution record

| ID | Consensus | Notes |
| --- | --- | --- |
| D1 Placement | **Post-convergence, opt-in** | Sol conceded; Opus/Fable held |
| D2 Walk target | **setup.md order + Dossier locators + deterministic plan** | Merged |
| D3 LLM↔browser | **No LLM on auth browser in v1** | Sol/Fable; Opus Phase-2 constrained Driver reserved |
| D4 Confirmations | **Ledger-only; factual prose unchanged on confirm** | Opus hill; Fable/Sol conceded; asset weave handled via lock rewrite |
| D5 Exit codes | **0/1/2/3/4/64 with 4 outranking all** | Unified |
| D6 Artifacts | **Scratch outside repo; promote allowlist only; no upload** | Sol; Opus/Fable aligned |
| D7 Job isolation | **Separate privileged job in v1 + trusted-code pin** | Unanimous after round |
| N1 L3 depth | **Phase-0 evidence gate** | Not blocked on philosophy |
| N3 Asset insert | **Deterministic weaver** | Fable; lock rewrite absorbs digest churn |

### Ratification

| Member | Verdict |
| --- | --- |
| Opus 5 | RATIFY WITH NITS (absorbed) |
| GPT 5.6 Sol | RATIFY WITH NITS (absorbed) |
| Fable 5 | RATIFY WITH NITS (absorbed) |

---

## 14. Hills (joint)

1. One write lane for facts: browser → Ledger → Dossier → re-render → `setup.md`.
2. No secrets in git, agent context, or run records; harness-only resolution.
3. No LLM command loop on an authenticated browser in v1.
4. Tear-down success is required for "verified"; exit 4 if dirty.
5. One reader-facing `setup.md`; zero rendered verification chrome.
6. Verification performs checks; it never reopens distrust of documented UI as a human chore.
7. Local and CI share one Playwright executor and one `mise run verify-guide` path.
