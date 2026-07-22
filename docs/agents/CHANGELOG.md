# Doctrine changelog

One entry per applied doctrine change — role docs, personas, skills, or
the workflow — newest first: date, files touched, what changed, and the
evidence (Run Records / Retro Notes) behind it. Required by constitution
invariant I8; written by `/tune-pipeline` when a human approves a
proposal, or by hand for direct human edits.

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
