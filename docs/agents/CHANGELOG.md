# Doctrine changelog

One entry per applied doctrine change — role docs, personas, skills, or
the workflow — newest first: date, files touched, what changed, and the
evidence (Run Records / Retro Notes) behind it. Required by constitution
invariant I8; written by `/tune-pipeline` when a human approves a
proposal, or by hand for direct human edits.

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
