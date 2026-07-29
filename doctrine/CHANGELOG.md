# Doctrine changelog

One entry per applied doctrine change — role docs, personas, skills, or
the workflow — newest first: date, files touched, what changed, and the
evidence (Run Records / Retro Notes) behind it. Required by constitution
invariant I8; written by `/tune-pipeline` when a human approves a
proposal, or by hand for direct human edits.

## 2026-07-29 — dossier-backed render fixes are not chrome Decisions

Files: `pipeline/src/{findings,workflow}.ts`,
`pipeline/src/factory/format-pipeline-review.ts`,
`pipeline/src/factory/formatters.test.ts`,
`pipeline/src/findings.test.ts`, `pipeline/src/scope-gate.ts`,
`doctrine/roles/fidelity.md`, `FACTORY.md`,
`retro/notes/2026-07-29-dossier-backed-render-not-decision.md`.

- **Narrow finalization salvage (unwind of Phase 0 cut):** Phase 0/1 locked
  “no salvage recheck loop.” This restores **only** dossier-backed
  setup-file fidelity salvage (shared `shouldSalvageFinalization`): when
  every blocker after the last-round confirmatory review is fidelity on
  `external` / `speakeasy`, one revise (blockers only — no nits) + recheck.
  Research, meta, and achievability gaps still surface with no salvage.
  Polish / spiral stay gone.
- **Factory review comment:** those misses → **Render fixes**
  (`Decision N: apply` / `override`) instead of verified / drop / hedge;
  removed the “fact may already be in research” hedge. Shared predicate
  with the workflow so salvage and the comment agree.
- **Fidelity opening prose:** sharpened existing omission check #3 so
  every round re-checks opening prose against Dossier Server facts /
  Credential flow permissions — not only the prior contested locus (no
  net new section; tightened the existing rule).

Invariants: I1 strengthened (render the Dossier; do not escalate a known
fact as console capture). I6 preserved — capped rounds, structured
findings; salvage is one bounded extra revise only for dossier-backed
setup fidelity, then unresolved still surfaces. I8 — this entry.

Evidence: [PR #79](https://github.com/speakeasy-api/mcp-setup-docs/pull/79)
Pipeline review Decision 1 (opening prerequisites already in research;
escalated as verified/drop/hedge);
`retro/notes/2026-07-29-dossier-backed-render-not-decision.md` (operator
direction).

## 2026-07-29 — guide stability: stamp digests + lock rebaseline

Files: `doctrine/pipeline-lock.md`, `doctrine/roles/writer.md`,
`pipeline/src/{lock,workflow}.ts`, `retro/README.md`.

- **Stable `research.md` digests** normalize frontmatter `researched_at` and
  ISO-8601-Z provenance stamp tokens (not bare calendar dates), mirroring
  `observed_at` stripping for `meta.yaml`, so stamp-only research refreshes
  hit the digest fast path.
- **Non-material judge:** keep AFTER on disk; when notes match the lock,
  rebaseline in-memory lock research/draft/review artifact digests so
  draft and round-1 review can skip. Supersedes the 2026-07-23 claim that
  keep-AFTER alone still drove skips (it did not — digest mismatch forced
  full rewrites).
- **Notes guard:** when operator notes differ from the lock, never skip via
  research equivalence and never restore BEFORE (note incorporations stay
  on disk; draft runs).
- **Writer / revise:** when setup files exist, edit in place / minimal diff;
  silent restyling is a defect. Run Records gain `notes_digest` and optional
  `setup_churn`.

Invariants: I2 preserved — this-run stamps stay on disk. I1/I5/I6 preserved —
dossier ceiling and review gates unchanged; skips only fire when
draft-equivalent.

Evidence: 14/14 historical `unchanged=true` runs still drafted
(`retro/runs/*`); retro validation of note-added / restore-BEFORE risk.

## 2026-07-27 — Speakeasy skeleton: OAuth DCR credential variant

Files: `doctrine/speakeasy-setup.md`.

- Add **OAuth with Dynamic Client Registration (DCR)** under Connect your
  credentials: Configure Manually / Use Discovered, Issuer URL when
  needed, Discover, Client Type **Dynamic Client Registration (DCR)**,
  token-endpoint auth method, empty Scope/Audience unless recorded,
  Attach Identity Provider, no Client ID/Secret, browser prompts hedge.
- UI label provenance: DCR attach-sheet strings from gram commit
  `f1d60da` (2026-07-27); prior Manual / Upstream Headers remain
  `96f7f73`.

Invariants: I1–I8 unchanged (human edit to Speakeasy canonical skeleton).

Evidence: Intercom MCP advertises `registration_endpoint`; draft-guide
fidelity blocked Intercom until the skeleton carried a DCR variant;
operator approved adding one.

## 2026-07-27 — speakeasy_add_server guide-level path override

Files: `schema/guide.v1.schema.json`, `pipeline/src/{pulse-catalog,workflow}.ts`,
`doctrine/speakeasy-setup.md`,
`doctrine/roles/{technical-research,writer,fidelity,review}.md`,
`FACTORY.md`, `guides/salesforce/meta.yaml`.

- Guide-level `speakeasy_add_server: auto | catalog | custom-remote`
  (default auto). Use `custom-remote` when shared public URLs must still
  skip the catalog (e.g. Salesforce); keep `remotes[].tenanted` for true
  region/instance/org-specific URLs (e.g. Intercom).
- Path tree: tenanted → remote; else `speakeasy_add_server` force; else
  Pulse present/absent/dual.
- Pipeline logs meta-read failures instead of silent fail-open; lock
  research inputs preserve pre-refresh notes; notes/lock tokens derive
  from `resolveAddServerPath`.

Invariants: I1–I8 unchanged (human edit to Speakeasy path-selection
rule).

Evidence: multi-model review — Salesforce mislabeled as tenanted;
dossiers must stay aligned with overrides.

## 2026-07-27 — tenanted remotes force Custom remote add-server

Files: `schema/guide.v1.schema.json`, `pipeline/src/pulse-catalog.ts`,
`pipeline/src/workflow.ts`, `doctrine/speakeasy-setup.md`,
`doctrine/roles/{technical-research,writer,fidelity,review}.md`,
`FACTORY.md`, `guides/{intercom,salesforce}/meta.yaml`, matching
`speakeasy.md` path wording.

- Optional `remotes[].tenanted` marks region/instance/org-specific MCP
  URLs. Any tenanted remote → Custom remote add-server only (non-registry),
  even when Pulse returns `present`.
- Path decision tree: tenanted → remote; else Pulse present → catalog,
  absent → remote, ambiguous/skipped → dual + soft OQ.
- Pipeline reads `meta.yaml` before research (and refreshes after) to
  override catalog notes/lock tokens (`overridden-tenanted`).
- Skeleton documents catalog / custom / dual as imperative source
  material; research emits only the chosen path when resolved.

Invariants: I1–I8 unchanged (human edit to Speakeasy path-selection
rule).

Evidence: operator request for deterministic Speakeasy setup — catalog
vs remote, with tenanted URLs always treated as non-registry.

## 2026-07-27 — Pulse catalog presence resolves add-server path

Files: `pipeline/src/pulse-catalog.ts`, `pipeline/src/workflow.ts`,
`pipeline/src/scope-gate.ts`, `.github/workflows/guide-draft.yml`,
`FACTORY.md`, `doctrine/speakeasy-setup.md`,
`doctrine/roles/{technical-research,writer,fidelity,review}.md`.

- Before research, the workflow queries the PulseMCP tenant catalog
  (`PULSE_REGISTRY_KEY` + `PULSE_REGISTRY_TENANT`) and injects a
  structured catalog-presence note into operator notes.
- **present** → draft only the 3rd-party catalog add-server path;
  **absent** → only Custom remote server; **ambiguous** / **skipped** →
  keep both conditionals + soft OQ (unchanged fallback).
- Canonical skeleton still carries both bullets; research selects which
  to transclude when presence is known. Writer/fidelity/review honor the
  selection and do not demand the omitted alternate.
- Follow-up hardening: lock digests use a stable catalog token (no
  per-run timestamp); only exact title/name matches yield `present`
  (sole fuzzy hits are `ambiguous`); registry error bodies stay in logs,
  not notes/locks; scope gate reads distill notes only.

Invariants: I1–I8 unchanged (human edit to Speakeasy path-selection
rule).

Evidence: operator request to confirm catalog membership via Pulse
tenant search and resolve the dual add-server conditional; multi-model
review of PR #37.

## 2026-07-27 — split setup into external.md + speakeasy.md

Files: `schema/guide.v1.schema.json`, `pipeline/src/lint-guide.ts`,
`pipeline/src/workflow.ts`, `pipeline/src/lock.ts`, `pipeline/src/cli.ts`,
`doctrine/constitution.md` (I3/I4), `doctrine/shared.md`,
`doctrine/roles/{writer,fidelity,review,technical-research}.md`,
`doctrine/speakeasy-setup.md`, `doctrine/glossary.md`, `guides/README.md`,
`README.md`, every `guides/*/setup.md` → `external.md` + `speakeasy.md`,
matching `meta.yaml` refs.

- Setup Guide is two files so consumers can hide Speakeasy setup when it
  is already in context (e.g. an installed MCP server detail page).
- Prerequisites fold into `external.md` opening prose (no Prerequisites
  H2). Speakeasy account is assumed, not listed.
- Schema: `documentation.external` / `documentation.speakeasy`; credential
  `setup` refs are `external.md#…` or `speakeasy.md#…`.
- Lint enforces the split; legacy `setup.md` is a blocker.
- Migration: Speakeasy-ready guides split mechanically; box / hubspot /
  zapier keep Gotchas in `external.md` and carry a stub `speakeasy.md`
  pending re-draft through `draft-guide`.

Invariants: I3/I4 updated (human edit). I1/I5–I8 unchanged.

Evidence: operator request to section External vs Speakeasy for embed/
hide; preference for split files over title-based slicing.

## 2026-07-24 — concern-first repo layout

Files: `scripts/` → `pipeline/` + `tools/`; `docs/agents/` +
`docs/personas/` + `CONTEXT.md` + `docs/speakeasy-setup.md` → `doctrine/`;
`docs/agents/guide-factory.md` → folded into `FACTORY.md`;
`docs/agents/drafting.md` → `doctrine/archive/drafting.md`;
CI formatters → `.github/scripts/`; `pipeline/src/paths.ts`; `mise.toml`;
`.github/workflows/guide-draft.yml`; README/FACTORY/skills and guide lock
reading-list paths.

- Top-level dirs now match stable concerns (content / doctrine / engine /
  tools / telemetry). Factory Action formatters live under `.github/scripts/`.
- Single drafting engine lives at `pipeline/` (Claude harness already
  retired). Path constants centralize doctrine/guide/schema/retro refs.

Evidence: structure plan (concern-first layout); no monorepo tooling.

## 2026-07-24 — factory PR titles + draft-vs-ready

Files: `.github/workflows/guide-draft.yml`, `FACTORY.md`,
`docs/agents/guide-factory.md`, `README.md`.

- PR title is always `guide: <provider>` (status no longer in the title).
- **Draft** PR when the run still needs a human reply (`awaiting_scope` or
  `unconverged`); **ready for review** when converged. Resume flips
  draft↔ready with `gh pr ready` / `--undo`.

Evidence: operator request after Phase 3/4 factory UX.

## 2026-07-24 — architecture Phase 4: single workflow + slim operator docs

Files: deleted `scripts/draft-guide-workflow.js`,
`.claude/skills/draft-guide/`; `README.md`, `FACTORY.md`,
`guides/README.md`, `retro/README.md`, `docs/agents/shared.md`,
`docs/agents/pipeline-lock.md`, `docs/agents/drafting.md`,
`.claude/skills/tune-pipeline/SKILL.md`.

- **One orchestrator:** Cursor SDK only (`mise run draft-guide` / factory).
  Removed the Claude Code Workflow harness and `/draft-guide` skill that
  drove it.
- **README** slimmed to issue flow + local CLI; deep factory detail stays
  in `FACTORY.md`.
- Retargeted shared / lock / retro / tune-pipeline / drafting pointers
  away from the deleted harness. Dispute protocol kept (still in revision
  schema); polish/spiral already gone in Phase 1.

Invariants: I7 unchanged (agents still never commit). Operational clarity
only — no gate behavior change vs Phase 3.

Evidence: Phase 0 decision #5 (stop dual-workflow lockstep); operator
direction for Phase 4 cleanup + concise README.

## 2026-07-24 — architecture Phase 3: factory scope gate (minimal)

Files: `scripts/cursor-sdk/src/scope-gate.ts`,
`scripts/cursor-sdk/src/workflow.ts`, `scripts/cursor-sdk/src/cli.ts`,
`scripts/ci/format-scope-check.sh`, `.github/workflows/guide-draft.yml`,
`FACTORY.md`, `docs/agents/guide-factory.md`.

- **`--pause-on-scope`** (factory always on): after research, classify open
  questions as material vs soft. Material + no `Decision N:` in notes →
  status `awaiting_scope`, exit **3**, no draft.
- **Material** ≈ recovery/regen, conflicting paths, exclusive branches.
  **Soft** ≈ catalog presence, UI silence-for-hedge (no pause).
- Factory opens a **research-only** draft PR, posts **Scope check**, sets
  `guide:blocked`. Re-label `guide:draft` after Decisions resumes on the
  factory branch and drafts.

Invariants: I6 (unresolved scope → human before inventing). Complements
Phase 1 silence+hedge rule (soft OQs do not become Decisions that demand
console capture).

Evidence: architecture review (X factory PR #17 / issue #15 Decision
noise); operator direction for Phase 3 minimal (heuristic gate, not LLM).

## 2026-07-24 — architecture Phase 2: deterministic I4 lint

Files: `scripts/cursor-sdk/src/lint-guide.ts`,
`scripts/cursor-sdk/src/lint-guide-cli.ts`,
`scripts/cursor-sdk/src/workflow.ts`, `scripts/cursor-sdk/src/lock.ts`,
`scripts/cursor-sdk/package.json` (ajv), `scripts/draft-guide-workflow.js`,
`scripts/ci/format-pipeline-review.sh`, `mise.toml`.

- **Lint module** enforces I4 mechanically: `setup_version` frontmatter,
  one H1, three H2s in order, provider H3 anchors + screenshot rule,
  Speakeasy fixed anchors, sole template key, `meta.yaml` vs
  `schema/guide.v1.schema.json`, and setup↔research↔meta anchor
  agreement (I3 mechanical slice).
- **Wired into every review round** (Cursor SDK in-process; Claude
  harness via `npx tsx … --json`). Findings use `dimension: lint` and
  gate like fidelity/achievability in the factory formatter.
- **CLI / mise:** `npm run lint-guide -- box` /
  `mise run lint-guide -- box x`.

Invariants: I4 strengthened (deterministic). I3 partially enforced without
an LLM. Does not replace fidelity's invention/distortion judgment.

Evidence: Phase 0/1 architecture cut (formatting LLM removed); operator
direction to implement Phase 2.

## 2026-07-24 — architecture: two-gate review (Phase 0 + 1)

Files: `docs/agents/constitution.md` (I5), `fidelity.md`, `review.md`,
`writer.md`, `technical-research.md`, `shared.md`, `pipeline-lock.md`,
`guide-factory.md`, `docs/personas/it-admin.md`,
`scripts/cursor-sdk/src/workflow.ts`, `scripts/cursor-sdk/src/lock.ts`,
`scripts/cursor-sdk/src/runtime.ts`, `scripts/cursor-sdk/src/cli.ts`,
`scripts/draft-guide-workflow.js`, `scripts/ci/format-pipeline-review.sh`,
`.claude/skills/draft-guide/SKILL.md`.

Operator-directed architecture cut (Phase 0 decisions + Phase 1
subtraction), not a tune-pipeline batch.

### Phase 0 decisions (locked)

1. Gates: Research → Writer → **Fidelity + Achievability** only.
2. Cut: concision / voice / formatting as standing reviewers; polish pass;
   polish salvage; spiral detector; finalization salvage.
3. Merge voice + formatting + concision into the Writer cold-read/cut
   self-check.
4. Deterministic I4 lint deferred to Phase 2.
5. Cursor SDK remains primary; Claude harness kept in lockstep for this
   cut (delete/stub later).
6. Public-docs silence + existing hedge → open question / nit, **not** a
   research-target blocker or factory Decision demanding console capture.

### Phase 1 changes

- **DIMENSIONS** shrink to fidelity + achievability in both workflows.
- **Polish / salvage / spiral removed.** On zero blockers, converge and
  leave leftover nits on the human checklist. Last-round revise still
  gets one confirmatory finalization review; if blockers remain →
  `unconverged` (no salvage recheck loop).
- **Writer** owns voice / formatting / concision self-check.
- **`review.md`** is achievability-only; silence+hedge rule strengthened
  there and in `fidelity.md` / `technical-research.md`.
- **I5** updated so Writer applies voice; reviewers judge achievability.
- **Factory Decisions** (`format-pipeline-review.sh`): gate dims only;
  dedupe by target+anchor (prefer fidelity); non-gate leftovers →
  optional nits; open-questions blurb notes hedge ≠ console capture.

Invariants: I1 strengthened (silence stays visible as hedge/OQ, not
invented chrome). I5 updated by operator (human constitution edit). I6
preserved as capped structured review + unresolved-to-human; unused
dispute/spiral machinery removed from the hot path. I4 enforcement
moves toward Writer self-check (+ Phase 2 lint); fidelity still checks
anchors/grammar-adjacent facts.

Evidence: architecture review of 15 run records (polish broke fidelity
in `2026-07-23T18:50:25Z-google-big-query.json` and
`2026-07-23T19:12:45Z-google-big-query.json`; X factory PR #17 /
`2026-07-23T22:43:32Z-x.json` escalated four silence loci into nine
Decisions while hedges already existed; 0 disputes cleared across the
corpus). Operator direction (Walker, 2026-07-24): implement Phase 0+1.

## 2026-07-23 — tune: trust provider-documented UI

Files: `docs/agents/technical-research.md`, `docs/agents/review.md`,
`docs/agents/fidelity.md`, `docs/agents/guide-factory.md`.

One proposal approved (P1), none rejected.

- **Trust provider-documented UI**: labels named or shown in provider
  docs (including screenshots on those pages) are confirmed facts.
  Research must not mint open questions asking for live console
  verification of that chrome; report `open_questions` must match the
  Dossier section. Achievability / fidelity must not demand console
  re-proof when the Dossier cites the provider page. Open questions
  remain for silence, unresolved property conflicts, or live probing
  that contradicts documented URL/behavior. Guide-factory clarifications
  for "exact UI labels" are for those gaps, not re-checks of cited UI.

Invariants: I1/I2 strengthened — public docs (incl. screenshots) stay
the fact source; visible gaps still cover true silence and live
discrepancy. Does not weaken click-through depth for undocumented
chrome (Box-style capture-time OQs for silent docs stay valid).

Evidence: `retro/notes/2026-07-23-trust-provider-documented-ui.md`
(explicit human direction — Asana redirect-control "console
verification" OQ was distrust of provider docs, not a gap).

## 2026-07-23 — tune: first-connect scope; keep research AFTER on non-material judge

Files: `docs/agents/technical-research.md`, `docs/agents/writer.md`,
`docs/agents/fidelity.md`, `docs/agents/review.md`,
`scripts/draft-guide-workflow.js`, `scripts/cursor-sdk/src/workflow.ts`.

Batch from `/tune-pipeline`; two proposals approved (P1 generalized per
operator edit, P2 as sketched), none rejected.

- **First-connect scope** (role docs + polish prompts): guides cover the
  path to first successful MCP connection only. Later-ops / maintenance
  (reset a secret next month, availability management, rotate for drift)
  are not walkthrough steps — research records at most an open question
  or one-line hedge; writer omits them; fidelity omissions and
  achievability blockers do not demand their click-through depth;
  "unforgiving recovery stays" protects only first-connect misses
  (secret-at-create, expiry that blocks connect now, mid-setup
  destructive rotation), not later-ops reset branches. Sharpens the
  existing setup-not-maintenance and critical-path ceiling rules; no new
  review dimension.
- **Keep research AFTER** (Cursor SDK workflow): when the research-change
  judge says not materially changed, stop restoring the prior snapshot.
  Restore had discarded this run's `researched_at` / `observed_at`
  refresh, after which fidelity burned round 1 re-stamping provenance.
  `unchanged=true` still drives draft/review skips.

Invariants: I1 preserved — later-ops gaps stay visible as hedge/open
question, not invented chrome. I2 preserved — this run's observed dates
stay on disk. I5/I6 preserved — persona still owns achievability; capped
structured review unchanged. Narrows which recoveries the earlier
"unforgiving recovery stays" tune protects; does not weaken first-connect
recovery.

Evidence: `retro/notes/2026-07-23-secret-reset-out-of-band.md` (explicit
human direction — Asana Reset branch out of band for setup; operator
asked to generalize beyond resets to any out-of-scope later-ops).
Corroborated by setup-not-maintenance
(`retro/notes/2026-07-22-setup-not-maintenance.md`) and the critical-path
ceiling batch. P2:
`retro/runs/2026-07-23T19:12:45Z-google-big-query.json` and
`2026-07-23T19:36:30Z-google-big-query.json` (both R1 fidelity blockers
on stale provenance stamps after non-material research; judge notes
timestamp-only AFTER).

## 2026-07-23 — tune: redirect URI uses template key, not Speakeasy mid-flow copy

Files: `docs/agents/writer.md`, `docs/agents/technical-research.md`,
`docs/agents/review.md`, `docs/speakeasy-setup.md`.

Operator direction (Walker, in-session): prefer the Compute Engine
pattern — paste `{{ gram.oauth.callback_url }}` directly in the
provider redirect field — over BigQuery's mid-flow Speakeasy trip to
copy **Redirect URI** before the OAuth client exists.

- **Writer / Technical Research**: default paste locus is the provider
  field with the template key; mint a Speakeasy-first copy step only
  when public docs require a live value the template cannot supply
  (recorded with provenance).
- **Achievability**: blockers that invent that mid-flow copy trip are
  out of bounds unless the Dossier records the live-value exception.
- **Canonical Speakeasy doc**: Attach step confirms the sheet matches
  the template value registered in Provider setup.

Invariants: I4 preserved — still the sole template key. I1 preserved —
live-value exceptions stay provenance-backed. Aligns Speakeasy setup
with the already-stated "callback URL the guide had the reader
register in Provider setup" wording.

Evidence: converged `guides/google-big-query/setup.md` (create-oauth
detour into Speakeasy) vs `guides/google-compute-engine/setup.md`
(template key inline); operator preference for the latter seam.

## 2026-07-23 — tune: unforgiving recovery survives polish; polish salvage

Files: `docs/agents/review.md`, `scripts/draft-guide-workflow.js`,
`scripts/cursor-sdk/src/workflow.ts`.

Follow-up after P12 (conditional gates). Review now converges; polish
still deleted a fidelity-required Testing expiry recovery note.

- **Unforgiving recovery stays** (`review.md` concision + polish
  prompts): never drop expiry / one-time-secret / destructive-rotation
  recovery; shorten or cross-link only; skip nits that delete them.
- **Polish salvage** (both workflows): if the post-polish fidelity
  re-check returns blockers, run one salvage revise (restore gates /
  recovery) and one fidelity re-check before `unconverged`.

Invariants: I1/I6 preserved — recovery facts stay; salvage is one
bounded extra revise+recheck.

Evidence: `retro/runs/2026-07-23T19:12:45Z-google-big-query.json`
(review 8→2→0; polish applied a concision nit that dropped Testing
re-authorization recovery; fidelity re-check returned that single
blocker). Same class as
`2026-07-23T18:50:25Z-google-big-query.json` (polish stripped
conditional gates).

## 2026-07-23 — tune: polish must keep conditional gates

Files: `docs/agents/review.md`, `scripts/draft-guide-workflow.js`,
`scripts/cursor-sdk/src/workflow.ts`.

One proposal approved (P12). Concision/polish may dedupe repeated
`If`/`When` wording but must keep one explicit conditional per
Dossier-conditional branch; never replace gates with unconditional
headings. Polish prompt tells the agent to skip nits that would drop a
fidelity-backed condition.

Invariants: I1 preserved — conditional facts stay visible in the guide;
polish cannot invent an unconditional path the Dossier does not allow.
I6 preserved — fidelity re-check still gates polish output.

Evidence: `retro/runs/2026-07-23T18:50:25Z-google-big-query.json`
(review cleared 3→2→1→2 fin→0 recheck; polish then stripped
production-verification and sensitive-scope `If` gates into unconditional
headings; fidelity re-check returned the two unresolved blockers).

## 2026-07-23 — tune: voice owner-gloss ceiling, alternative-step nits, finalization salvage

Files: `docs/agents/review.md`, `docs/personas/it-admin.md`,
`scripts/draft-guide-workflow.js`, `scripts/cursor-sdk/src/workflow.ts`.

Batch from `/tune-pipeline`; three proposals approved, none rejected.
Follow-up after P5–P7: BigQuery still unconverged at finalization with
novel soft blockers and a spiral warning that had no revise to act on.

- **Owner-gloss ceiling** (`review.md` voice + `it-admin.md`): 
  organization-specific values need at most one obtain-from-owner hedge
  per section; re-raising the same gloss on adjacent fields is a nit;
  provider picker enumeration (account vs Group) is nit/open question,
  not a voice blocker.
- **Mutually exclusive alternatives** (`review.md` formatting): "click A,
  or click B when offered" / "Otherwise, select X" in one numbered step
  are nits, not blockers; sequential "and then" bundles stay blockers.
- **Finalization salvage** (both workflows): when finalization review
  still has blockers, run one salvage revise (spiral note injected when
  present) and one `finalization_recheck` review before `unconverged`.
  No further loops.

Invariants: I5 preserved — persona still owns voice; ceiling sharpens
severity, not taste. I6 preserved — salvage is one bounded extra
revise+review after finalization, unresolved blockers still surface.

Evidence: `retro/runs/2026-07-23T18:14:24Z-google-big-query.json`
(4→2→2→3 finalization; spiral fired on 3/3 novel finalization blockers
but no revise followed; voice dominated with 4 blockers ratcheting
owner-gloss per field; leftover formatting blocker was Configure
Manually / Use Discovered alternatives).

## 2026-07-23 — tune: Speakeasy canonical guard, spiral softens, finalization revise

Files: `docs/agents/review.md`, `scripts/draft-guide-workflow.js`,
`scripts/cursor-sdk/src/workflow.ts`.

Batch from `/tune-pipeline`; three proposals approved (P5–P7), none
rejected. Follow-up after the critical-path ceiling batch still left
BigQuery unconverged:

- **Speakeasy canonical is fixed** (`review.md` achievability): blockers
  must not invent login URLs, catalog-first rewrites, post-credential
  chrome, or other steps outside `docs/speakeasy-setup.md`. Gaps there
  are nits / open questions for a human doctrine edit — never
  research-target expansions that fight fidelity's skeleton check.
- **Spiral detector softens** (both workflows): warn when blocker count
  did not drop **and** a majority (≥½) of loci are new (was: require
  100% novel). Message also names the Speakeasy-canonical failure mode.
- **Finalization revise** (both workflows): on the last review round,
  revise remaining blockers, then run one confirmatory review
  (`finalization: true` history entry) before reporting `unconverged`.
  Round-N findings no longer strand without a fix attempt.

Invariants: I6 preserved — capped rounds, structured findings, unresolved
blockers still surface; the finalization pass is one bounded extra
revise+review inside the same cap, not unbounded looping. I1/I7
preserved — Speakeasy canonical remains human-maintained doctrine.

Evidence: `retro/runs/2026-07-23T17:52:00Z-google-big-query.json`
(post-ceiling: 6→7→3, still unconverged; R1 achievability expanded
Speakeasy past the skeleton and R2 fidelity rolled it back — zero
disputes; spiral never fired because only 4/7 R2 loci were novel; the
three R3 leftovers never received a revise). Corroborated by the prior
unconverged Cursor run `2026-07-23T17:16:10Z-google-big-query.json`.

## 2026-07-23 — tune: critical-path ceiling, recovery scope, dispute conflicts, spiral warning

Files: `docs/agents/review.md`, `docs/agents/fidelity.md`,
`docs/agents/shared.md`, `scripts/draft-guide-workflow.js`,
`scripts/cursor-sdk/src/workflow.ts`.

Batch from `/tune-pipeline`; four proposals approved (P1–P4), none
rejected. Stops review depth from ratcheting past convergence on
Google-style OAuth surfaces:

- **Achievability critical-path ceiling** (`review.md`): blockers only for
  named controls on the path to first successful connection. Vendor
  programs and IdP chrome public docs do not fully enumerate (OAuth
  branding/scope verification, end-user consent screens once launch is
  named) → open question + one Dossier-backed hedge, not unbounded
  research-target blockers. Re-expanding the same locus after a hedge is
  a nit at most.
- **Fidelity recovery-note scope** (`fidelity.md` check 3): recovery
  blockers cover only unforgiving misses (one-time secrets, expiry,
  destructive rotation). Optional undo / soft capability restatements are
  nits or out of scope, not omissions.
- **Cross-dimension conflict → dispute** (`shared.md` + both revision
  prompts): when achievability and concision/ceiling conflict, revision
  disputes one finding instead of growing the guide forever.
- **Review spiral warning** (both workflows): if a round's blockers are
  all new loci vs prior rounds and the count did not drop, log a warning,
  record `spiral_warning` on the history entry, and inject the same note
  into the revision prompt so dispute is preferred over more research.

Invariants: I5/I6 preserved — persona still defines achievability; findings
remain structured and disputable; unresolved blockers still surface to a
human. I1 preserved — hedges and open questions keep gaps visible rather
than inventing click-through. Sharpens existing severity/scope rules;
does not add a new review dimension.

Evidence: `retro/runs/2026-07-23T17:16:10Z-google-big-query.json`
(Cursor SDK, unconverged 8→4→9, all R3 blockers novel; R2 skipped a
concision nit that conflicted with an achievability blocker that R3 then
re-deepened) contrasted with
`retro/runs/2026-07-23T15:15:19Z-google-compute-engine.json` (same Google
Auth surface, converged 5→2→0; verification scored as nit + hedge).
Operator direction (Walker, in-session, 2026-07-23): the BigQuery Cursor
run should have converged.

## 2026-07-23 — canonical Speakeasy flow filled from product source

Files: `docs/speakeasy-setup.md`.

Direct human-directed edit (Walker shared the product repo in-session,
same day as the batch below). The placeholder instructions and
`verify(operator)` label markers are replaced with the real dashboard
flow, extracted verbatim from the product source
(`/home/walker/repos/speakeasy/gram`, `client/dashboard`, branch `main`,
commit `96f7f73`, observed 2026-07-23): Connect → **Sources** →
**Add Source** → **3rd-party server** (MCP Catalog) or **Custom remote
server** (by URL); then Settings → **Authentication** → **Attach Remote
Identity Provider** with **Client Type** **Manual** for pre-registered
OAuth clients (the sheet's **Redirect URI** callout is the
`{{ gram.oauth.callback_url }}` surface), or Settings →
**Upstream Headers** for API-key/token auth. One `verify(operator)`
marker remains: confirming the template key substitutes the same
Redirect URI value the Attach sheet displays. An operator note records
the deliberate scope boundary (no Server URL / publishing / plugin
steps).

## 2026-07-23 — tune: Speakeasy setup replaces Gotchas in the guide grammar

Files: `docs/speakeasy-setup.md` (new), `docs/agents/writer.md`,
`docs/agents/review.md`, `docs/agents/technical-research.md`,
`docs/agents/fidelity.md`, `docs/agents/shared.md`,
`docs/personas/it-admin.md`, `CONTEXT.md`, `README.md`,
`guides/README.md`; `docs/agents/drafting.md` (historical) synced in its
two grammar spots, per the Values-from-Gram precedent.

Batch from `/tune-pipeline`; four proposals approved, none rejected.
Guides restructure into "set up the provider, then set up Speakeasy":

- **Canonical Speakeasy-side doc** (`docs/speakeasy-setup.md`, new): the
  single human-maintained source for every guide's Speakeasy-side facts —
  two fixed-anchor steps (`#add-server-in-speakeasy`, both connection
  paths: catalog if listed, else remote MCP server by URL;
  `#connect-speakeasy-credentials`) and the closing provider-docs pointer
  template. Speakeasy public docs do not document this console flow at
  UI-label depth (searched this run), so labels carry
  `verify(operator)` markers; until verified, guides render the
  instructions without bolded labels — no role may invent one.
- **Grammar: Gotchas → Speakeasy setup** (`writer.md`, `review.md`,
  `drafting.md`): the three H2 sections are now Prerequisites, Provider
  setup, Speakeasy setup. The formatting dimension checks the Speakeasy
  section's canonical anchors and closing pointer instead of the gotcha
  dual listing; concision drops the gotcha carve-out, and its
  ownership probe now excludes only Speakeasy surfaces *beyond* adding
  and authenticating the server (the guide owns that much now).
- **Gotchas leave Guide scope** (`technical-research.md`, `writer.md`,
  `fidelity.md`, `it-admin.md`, `CONTEXT.md`, READMEs): research stops
  minting gotchas; a caveat that changes what the reader must do during
  setup is recorded in the step it bites, and everything else (billing,
  tool restrictions, post-setup behavior) is delegated to the provider's
  MCP documentation via the closing pointer. The persona's dual-listing
  formatting rule goes; the warn-before-one-way-doors voice rule stays.
  The Dossier's Gotchas section becomes the Speakeasy setup transclusion
  (skeleton from the canonical doc + per-guide values, with provenance).
- **Fact-flow plumbing** (`shared.md`, `fidelity.md`): the anchor
  contract now reads "anchors enter a guide once, through the Dossier" —
  provider-step IDs minted there, Speakeasy-section IDs fixed in the
  canonical doc and carried in by transclusion; fidelity gains check 7
  (the transcluded skeleton matches the current canonical doc; drift is
  a `research`-targeted blocker).

Invariants: I4 preserved — still exactly three H2 sections in order;
section identities are doctrine-level, and the count (the element the
constitution pins, per the four→three precedent) is unchanged, so no
constitution edit was needed. I1/I2/I3 preserved: the canonical doc is
an upstream source Technical Research ingests like provider docs; the
Dossier remains the sole fact ceiling and sole anchor entry point, and
transcluded facts carry provenance. I7 extended in practice: the
canonical doc is doctrine, read-only to pipeline agents. Scope
reduction (dropping gotcha coverage) parallels the tool-inventory and
setup-not-maintenance precedents: the goal sentence requires what a
persona needs to *configure* the server, and the closing pointer covers
the rest.

Evidence: operator direction (Walker, in-session, 2026-07-23 — the
two-part restructure and the gotchas removal, with the four design
choices — canonical shared doc, both catalog paths, migrate-by-redraft,
end-of-guide pointer — selected explicitly). Corroborated by gotcha
upkeep churn: the only two leftover nits in
`retro/runs/2026-07-23T01:06:26Z-hubspot.json` were gotcha-content
bookkeeping, and box's nine-entry Gotchas section drew repeated review
traffic across its five run records. Migration: existing guides keep
the old structure until each is re-drafted through `/draft-guide`
(operator-selected); the zapier `meta.yaml` comment referencing
`setup.md#server-modes` migrates with that guide's redraft.

## 2026-07-22 — tune: doc-gap narration is not reader content

Files: `docs/agents/review.md`, `docs/agents/writer.md`.

One proposal approved (both diffs), none rejected. The concision
dimension's pipeline-serving-content probe now names statements the
reader cannot act on — above all, narration of what the provider's
documentation does or does not say — and the Writer's cut pass gets the
parallel clause: a documentation gap renders as a hedged instruction
with a recovery path, never as narration about the docs.

Evidence: operator direction (Walker, in-session, 2026-07-22): the
concision dry run against the hubspot draft caught two duplications but
passed "HubSpot does not name the exact permission that controls this"
(guides/hubspot/setup.md Prerequisites) — true but unactionable, and
redundant beside the adjacent hedged instruction ("The closest
documented match is the **Developer tools access** permission… the
first thing to check") and the later #open-mcp-auth-apps recovery note.
A reviewer passing something the human then corrected is the
highest-weight signal class.

Preserves I1: the gap stays visible to the pipeline (Dossier, open
questions), and the reader keeps the hedge and recovery path rather
than an invented fact — only the narration goes. Validation: an
isolated dry-run concision review (fresh agent, no session context)
was run after this change; result recorded in the session, not here,
as dry runs produce no Run Record.

## 2026-07-22 — tune: concision review, writer cut pass, open-question dedupe

Files: `docs/agents/writer.md`, `docs/agents/review.md`,
`scripts/draft-guide-workflow.js`.

Batch from `/tune-pipeline`; three proposals approved (the concision
dimension in its `model: 'sonnet'` variant), none rejected.

- **Writer open-question dedupe** (`writer.md` Report section): the
  Writer lists only gaps the Dossier does not already record; rendering
  around a Dossier-listed open question goes in `notes`, not a duplicate
  question. Re-proposal of the entry rejected in the nits-in-loop batch,
  whose condition ("re-propose if the pattern recurs") is met: after the
  original 21:57 mass duplication, every subsequent run duplicated —
  `retro/runs/2026-07-22T22:43:04Z-box.json` (6 near-duplicate pairs of
  14 items), `retro/runs/2026-07-22T23:18:01Z-box.json` (8 of 16), and
  `retro/runs/2026-07-22T23:59:17Z-hubspot.json` (4 of 10 — a second
  provider). Preserves I1: the Dossier's Open questions section remains
  the canonical record; nothing becomes invisible.
- **Concision dimension** (`review.md`, workflow `DIMENSIONS`): a fifth
  Editorial dimension asks what can be removed — duplication (with a
  carve-out for the persona-mandated gotcha dual listing), process the
  guide does not own, content serving the pipeline rather than the
  reader. Over-explanation stays voice's beat (no double-reporting);
  removals must survive fidelity's needs-to-finish-setup bar and target
  the copy, never the original; surplus alone is a nit — a blocker only
  when it misleads. Runs on `model: 'sonnet'` like formatting; its
  mechanical removals are applied by the polish pass under the
  session-model fidelity re-check. Touches I5/I6 and preserves both
  (persona defines the need-to-do bar; same structured-finding
  machinery); I1/I2 protected by the fidelity bar and re-check.
- **Writer cut pass** (`writer.md` pre-report self-check): after the
  cold read, the Writer cuts what the reader does not need to finish
  setup before reviewers see the draft. Preserves I1 — cutting is not
  inventing; the ceiling-not-floor rule is unchanged.

Evidence: `retro/notes/2026-07-22-what-can-be-removed.md` (explicit
human direction, Walker — the four probes: necessity, duplication,
over-explanation, ownership) for the concision dimension and cut pass,
corroborated by removal-shaped findings squeezed through the voice
dimension in `retro/runs/2026-07-22T23:59:17Z-hubspot.json` round 1
(#scopes-are-automatic teaching OAuth mechanics; #keyword-search-only
leading with implementation detail); the run records named above for the
dedupe.

Observed, not proposed: unbolded-UI-label nits recur across both
providers, but the persona rule is unambiguous and in-loop polish fixes
them cheaply — adding words to an unambiguous rule is bloat, not
sharpening. The split-navigation nit churn did not recur after nits
began auto-applying; no action needed.

## 2026-07-22 — tune: Run Records gain started_at/finished_at

Files: `.claude/skills/draft-guide/SKILL.md`, `retro/README.md`.

Batch from `/tune-pipeline`; one proposal approved (both diffs), none
rejected.

- **Timing fields** (`SKILL.md` step 7): the skill runs
  `date -u +%Y-%m-%dT%H:%M:%SZ` a second time when writing Run Records
  and adds `started_at` (the step-4 timestamp, duplicated so the timing
  pair reads standalone) and `finished_at` (captured at record-write
  time — an upper bound on completion). The capture lives in the skill
  because workflow scripts cannot read the clock (resume determinism).
- **Format sketch synced** (`retro/README.md`): the run-record sketch
  gains the two timing fields plus the `skipped`, `polish_notes`,
  `polish_skipped`, `polish_disputed`, and `recheck` fields that runs
  have carried since the nits-in-loop change — the hand edit that batch's
  entry deferred — with a note on which records predate each addition.
  Operator-approved exception to the tune rule of leaving `retro/`
  untouched: the README documents format, it is not a record; `runs/`
  and `notes/` remain append-only and no existing record was backfilled.

Evidence: operator direction (Walker, in-session, 2026-07-22 — asked for
duration data after finding the records hold none); corroborated by all
five box run records, whose wall-clock durations (~33, 35, 17, 14, 34
min) were recoverable only from file mtimes, which any later touch or
fresh checkout destroys. No invariant touched; I8 satisfied by this
entry.

## 2026-07-22 — tune: mechanical stages move to a cheaper model

Files: `scripts/draft-guide-workflow.js`.

Batch from `/tune-pipeline`; two proposals approved (both in their
`model: 'sonnet'` variant), none rejected.

- **Formatting reviewer → sonnet**: the formatting dimension entry in
  `DIMENSIONS` gains `model: 'sonnet'`, passed through by `reviewRound`.
  The fidelity re-check reuses `DIMENSIONS[0]`, which carries no model
  override, so it stays on the session model.
- **Polish pass → sonnet**: the zero-blocker nit-application pass gains
  `model: 'sonnet'`. Blocker revisions are untouched, and the
  session-model fidelity re-check continues to gate polished files
  (a re-check blocker reports `unconverged` rather than shipping).

Evidence: operator direction (Walker, in-session, 2026-07-22 — trim cost
on the pipeline's mechanical stages), corroborated by all four box run
records: the formatting dimension produced nine findings across
`retro/runs/2026-07-22T19:42:22Z-box.json`,
`retro/runs/2026-07-22T20:55:13Z-box.json`,
`retro/runs/2026-07-22T21:57:12Z-box.json`, and
`retro/runs/2026-07-22T22:43:04Z-box.json` — every one a nit citing a
documented checklist rule (one-action-per-step, UI-label bolding,
numbered-steps-vs-prose, cross-link consistency), zero blockers; and in
the polish flow's first live run (22:43) the pass applied 7 of 8 nits and
correctly skipped the one needing new facts, with the fidelity re-check
passing over the polished files.

Invariants: I4 is formatting's enforcement beat, but its blocker duties
are objective checks (frontmatter, three H2s in order, anchored H3s, the
screenshot rule) and fidelity independently verifies the anchor contract
on the session model — enforcement is preserved. I6's agreement
mechanics (structured findings, disputes, capped rounds, unresolved
blockers surfacing) are unchanged; only the model behind one non-fact
dimension changes. I1/I2 on the polish side are guarded structurally by
the session-model fidelity re-check. Known risk, accepted with the
approval: a cheaper formatting reviewer raising a false blocker would
force an extra full round; the observed formatting-blocker base rate is
zero across four runs, and the next box regression run is the tripwire.

## 2026-07-22 — tune: "Values from Gram" section removed from the grammar

Files: `docs/agents/writer.md`, `docs/agents/review.md`,
`docs/agents/shared.md`, `docs/agents/drafting.md`; guides
`guides/box/setup.md`, `guides/bigquery/setup.md`,
`guides/hubspot/setup.md`, `guides/zapier/setup.md`. Companion direct human
edit: `docs/agents/constitution.md` (I4).

Batch from `/tune-pipeline`; one proposal approved, none rejected. The
mandated `Values from Gram` H2 section is dropped from the setup.md grammar
— four H2 sections become three (Prerequisites, Provider setup, Gotchas).

- **Grammar four → three** (`writer.md`, `review.md`): the setup.md grammar
  and the Editorial formatting dimension now name three H2 sections in
  order, not four.
- **Section removed from all guides**: the `## Values from Gram` H2 and its
  prose are deleted from all four `guides/*/setup.md`. Its only load-bearing
  element, `{{ gram.oauth.callback_url }}`, already appears in each guide's
  redirect-URI step (`bigquery#create-oauth-client`,
  `hubspot#create-mcp-auth-app`, `box#set-redirect-uri`); zapier carried no
  token (bearer-token auth) and its section was absent-alternative prose
  ("no callback URL to register"). No `meta.yaml` referenced the section — it
  carried no anchor — so no cross-reference broke.
- **Gram carve-out trimmed** (`shared.md`): with the section gone, the
  template key `{{ gram.oauth.callback_url }}` is now the only surface where
  the legacy name still appears (was two: the section title and the key).

Invariant I4 touched: it enumerated "the four H2 sections in order." Per the
constitution (changes only by direct human edit) and this skill (never edits
the constitution), the operator (Walker) made the one-word `four` → `three`
edit to I4 directly; this batch applied only after that edit landed. The
change strengthens the never-"Gram" direction by removing a legacy-name
prose surface and weakens no invariant. `docs/agents/drafting.md`
(superseded / historical) was synced in the same two spots — its grammar
line and its "Gram" carve-out note — so a doc still living in
`docs/agents/` does not state stale grammar as current; this departs, at
operator direction, from the tool-inventory entry below, which left that
file frozen. Its own header already says the grammar "was carried into
those role docs," i.e. it is meant to agree with them. `fidelity.md` does
not enumerate the section count.

Evidence: `retro/notes/2026-07-22-drop-values-from-gram-section.md`
(explicit human direction, Walker — the decision) and
`retro/notes/2026-07-22-never-gram-close-the-carveout.md` (the same human
raising whether the section earns its place). Supersedes the section-title
half of the "Gram carve-out" flagged tension logged in the entry below; the
template-key rename remains open (external-contract coordination with the
downstream tooling that substitutes it).

## 2026-07-22 — tune: nits applied in-loop, no absent-alternative prose, setup-not-maintenance scope, tolerant workflow args

Files: `scripts/draft-guide-workflow.js`,
`.claude/skills/draft-guide/SKILL.md`, `docs/agents/writer.md`,
`docs/agents/technical-research.md`, `docs/agents/fidelity.md`.

Batch from `/tune-pipeline`; four proposals approved (the first with its
fidelity re-check variant), one rejected.

- **Nits applied in-loop** (workflow, `SKILL.md`): revision agents now
  receive the round's nits alongside blockers and apply those with a
  concrete mechanical remedy (`REVISION_RESULT` gains a required
  `skipped` list for the rest); a zero-blocker round with nits runs a
  polish pass, then a single fidelity-only re-check of the polished
  files — a re-check blocker reports the run `unconverged` instead of
  shipping silently. The converged `nits` checklist now holds only the
  polish pass's skipped/disputed leftovers and re-check notes. Evidence:
  `retro/notes/2026-07-22-apply-nits-in-loop.md` (explicit human note)
  plus all three box runs shipping every nit unfixed
  (`retro/runs/2026-07-22T19:42:22Z-box.json` 8,
  `retro/runs/2026-07-22T20:55:13Z-box.json` 6,
  `retro/runs/2026-07-22T21:57:12Z-box.json` 9). The note's split-nav
  sub-signal (one-action-per-step possibly over-firing on two-part
  navigation) was below threshold and is mooted by auto-apply. Note:
  `retro/README.md`'s run-record sketch does not yet show the new
  `polish_*`/`skipped`/`recheck` fields — left for a hand edit, since
  tune runs leave `retro/` untouched.
- **No absent-alternative prose or gotchas** (`writer.md`,
  `technical-research.md`): a gotcha must change what the reader does or
  expects — the absence of an alternative flow the guide already routes
  around (e.g. Dynamic Client Registration) is not one, and the Writer
  never justifies a required flow by naming what the provider lacks.
  Evidence: `retro/notes/2026-07-22-dont-state-dcr-unsupported.md`
  (explicit human direction); the same sentence drew a voice nit in
  `retro/runs/2026-07-22T21:57:12Z-box.json`.
- **Setup, not maintenance** (`fidelity.md`, `writer.md`): the Omissions
  criterion scopes "needs" to finishing setup — post-setup
  administration is outside the guide's scope and its absence is correct
  rendering; the Writer treats the Dossier as a ceiling, not a floor.
  Evidence: `retro/notes/2026-07-22-setup-not-maintenance.md` (explicit
  human direction); the mis-scored Platform-Apps fidelity nit in
  `retro/runs/2026-07-22T21:57:12Z-box.json`.
- **Tolerant `args` guard** (workflow): `args` is JSON-parsed when it
  arrives as a string before validation, so launches survive either
  harness encoding. Evidence:
  `retro/notes/2026-07-22-workflow-args-string-encoding.md` (single
  session, but a deterministic double launch failure with probe-confirmed
  root cause; without it every fresh session needs a scratchpad shim).

Rejected:

- **Writer open-question dedupe** (`writer.md` Report section) — the
  Writer restating the Dossier's open questions doubled the 21:57
  checklist, but the evidence is marginal (mass duplication in one run,
  a single pair in `retro/runs/2026-07-22T19:42:22Z-box.json`, none in
  the 20:55 run); re-propose if the pattern recurs.

Flagged tension (reported, not proposed): closing the "Gram" carve-out
(`retro/notes/2026-07-22-never-gram-close-the-carveout.md`) requires
renaming the `{{ gram.oauth.callback_url }}` template key named verbatim
in constitution invariant I4 and coordinating with the downstream
tooling that substitutes it; constitution edits are human-only, so
sequencing sits with the operator.

## 2026-07-22 — tool inventories removed from Guide scope

Files: `schema/guide.v1.schema.json` (drops the `tool` definition, the
`remotes[].tools` property, and its required entry),
`docs/agents/technical-research.md` (inventory out of scope; record a
tool only where it matters to setup), `CONTEXT.md` (Metadata, MCP
Server, Tool), `README.md`, `guides/README.md`; mechanical migration of
`guides/*/meta.yaml` (tools blocks removed, header comments updated),
`guides/box/research.md` (inventory section removed, external-sharing
gotcha now names its fifteen tools explicitly), `guides/zapier/setup.md`
(one inventory cross-reference). `docs/agents/drafting.md` untouched
(historical). All four `meta.yaml` files re-validate against the updated
schema.

Guides document setup, not capability catalogs: the server's advertised
tool list is the runtime source of truth, and authored copies drift.
Evidence: operator direction (Walker); corroborated by
`retro/runs/2026-07-22T19:42:22Z-box.json` and
`retro/runs/2026-07-22T20:55:13Z-box.json`, where inventory upkeep
produced repeated review churn (truncated-description blockers across
rounds, unverifiable `read_only_hint` claims, a footnote-count
mismatch) with no setup value.

## 2026-07-22 — tune: source sweep, terseness, transitions, reviewer dedupe

Files: `docs/agents/technical-research.md`, `docs/personas/it-admin.md`,
`docs/agents/writer.md`, `docs/agents/review.md`.

Batch from `/tune-pipeline`; all five proposals approved, none rejected
(the fifth arrived mid-session as direct operator direction).

- **Source sweep first** (`technical-research.md`): new loop step 1 —
  sweep the provider's documentation properties (developer docs,
  product/admin docs, support KB; check each for `/llms.txt`) before
  going deep, prefer current product/admin docs on console-UI conflicts,
  and open the Dossier's Provenance section with the source inventory so
  reviewers can audit coverage. Evidence:
  `retro/notes/2026-07-22-box.md` (research never discovered
  docs.box.com; the console flow was built from stale developer docs).
- **Terseness — persona bar shifts from understanding to doing**
  (`it-admin.md`, `writer.md`, `review.md`): define-at-first-use is
  gone; a console term appears as its verbatim bolded label, glossed
  only where a choice or typed value depends on understanding it;
  Prerequisites no longer claim "no prior experience is assumed"; the
  voice dimension now flags over-explanation instead of missing
  introductions. Evidence: `retro/notes/2026-07-22-box-terseness.md`
  (explicit human direction), reinforced by more-glossing voice nits in
  both box runs (`retro/runs/2026-07-22T19:42:22Z-box.json`,
  `retro/runs/2026-07-22T20:55:13Z-box.json`).
- **Transition-complete walkthroughs** (`technical-research.md`): the
  Console walkthrough must record entry-point navigation and the click
  that takes each screen to the next (including re-opens); where docs
  are silent, a flagged inference or open question is mandatory.
  Evidence: both box run records — 19:42 Admin Console navigation nits;
  20:55 round-1 tile-to-Configuration blocker and re-open-gesture nits.
- **Reviewer dedupe** (`review.md`): "steps that bundle several actions"
  removed from the voice dimension's finding list; formatting owns
  "numbered single-action steps". Evidence: duplicate voice+formatting
  findings on the same steps in both box runs.
- **No one-item step lists** (`it-admin.md`): numbered steps are for
  sequences; a section with a single action renders as one imperative
  sentence, never a one-item numbered list. Evidence:
  `retro/notes/2026-07-22-single-step-sections.md` (operator direction,
  Walker; four live instances across the box and bigquery guides).

## 2026-07-22 — screenshot exceptions become comments

Files: `docs/agents/writer.md`, `docs/agents/drafting.md` (plus mechanical
conversion of existing instances in `guides/box/setup.md`,
`guides/hubspot/setup.md`, `guides/bigquery/setup.md`).

The screenshot-exception marker changes from a blockquote
(`> Screenshot exception: reason`) to a comment on its own line
(`<!-- screenshot-exception: reason -->`). The blockquote form rendered
visibly to end readers — internal capture-pass bookkeeping leaking into the
published guide — while the placeholder (`<!-- screenshot: ... -->`) was
already invisible; both markers now behave the same. Evidence:
`retro/notes/2026-07-22-screenshot-exception-rendering.md` (operator
direction, Walker); direct human edit per I8.

## 2026-07-22 — initial doctrine

Files: `docs/agents/*` (shared, technical-research, writer, fidelity,
review, constitution), `docs/personas/it-admin.md`,
`.claude/skills/draft-guide/`, `.claude/skills/tune-pipeline/`,
`scripts/draft-guide-workflow.js`.

Initial pipeline design. Evidence: none (no runs yet) — built from
`docs/agents/drafting.md` (the pre-pipeline drafting reference) and
operator direction.
