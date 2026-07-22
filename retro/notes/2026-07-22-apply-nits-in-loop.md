# 2026-07-22 — Mechanical nits are dumped on the human instead of applied in-loop

Human reaction from Walker, 2026-07-22 (reviewing the box re-draft
checklist; transcribed by the assistant — amend freely).

## What the human said

On the formatting nit (multi-action recovery paths should be numbered
lists) and the achievability nit ("confirm the scopes" → "ensure the base
option is selected"): "I'm not sure why you're surfacing this to me? ... I
thought the workflow would have supported applying this kind of formatting
feedback in the loop." And on the split-nav nit: "not sure what your point
is here."

## What actually happens

The box run returned **only nits, zero blockers**, so `draftOne` converged
in round 1 — `scripts/draft-guide-workflow.js` returns `converged` the
moment `blockers.length === 0`, and the revision agent runs only when there
are blockers. Nits are never applied; they are returned verbatim as the
human-review checklist. So a draft all reviewers agree is nit-only ships
every nit unfixed — including purely mechanical ones whose remedy the
reviewer already wrote out.

## What it implicates (for /tune-pipeline)

The severity model conflates "optional/subjective" with "mechanical, fix is
known." Candidate directions for the human to weigh:

- Let the revision pass apply nits too (at least those carrying a concrete
  remedy), so clear mechanical fixes — numbered-list conversion, verb swaps,
  splitting chained steps — happen in-loop and only genuine judgment calls
  reach the human.
- Or reclassify formatting/achievability findings that carry a concrete
  remedy as blockers.
- Or add a cheap final "apply mechanical nits" pass before convergence.

The split-nav nit (`#enable-box-ai-api` / `#enable-doc-gen` step 1: "go to
X, then open tab Y") is also a calibration signal: Walker couldn't see its
point, suggesting either it should be silently auto-applied or the
one-action-per-step rule is over-firing on trivial two-part navigation.

## Status

Captured only.
