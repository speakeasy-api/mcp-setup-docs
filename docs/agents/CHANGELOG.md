# Doctrine changelog

One entry per applied doctrine change — role docs, personas, skills, or
the workflow — newest first: date, files touched, what changed, and the
evidence (Run Records / Retro Notes) behind it. Required by constitution
invariant I8; written by `/tune-pipeline` when a human approves a
proposal, or by hand for direct human edits.

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
