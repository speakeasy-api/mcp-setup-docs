# Doctrine changelog

One entry per applied doctrine change — role docs, personas, skills, or
the workflow — newest first: date, files touched, what changed, and the
evidence (Run Records / Retro Notes) behind it. Required by constitution
invariant I8; written by `/tune-pipeline` when a human approves a
proposal, or by hand for direct human edits.

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
