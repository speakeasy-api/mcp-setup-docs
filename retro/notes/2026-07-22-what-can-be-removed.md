# 2026-07-22 — Review should ask what can be removed

Human direction from Walker, 2026-07-22 (proposed in-session; transcribed
by the assistant — amend freely).

## What the human said

"I'd like to propose an additional step or aspect of our review.
Basically, at some point we should be asking what can be removed? To keep
the guides as small/concise as possible. Basically asking 'does this
really need to be here?' Does it duplicate something? Does it explain or
reveal something the user doesn't need to know? Does it speak to things in
the process that we don't own?"

The four probes:

1. **Necessity** — does this really need to be here?
2. **Duplication** — does it duplicate something already in the guide?
3. **Over-explanation** — does it explain or reveal something the reader
   doesn't need to know?
4. **Ownership** — does it speak to parts of the process we don't own?

## What it implicates

No review dimension currently owns the removal question. Existing doctrine
covers fragments of it — voice flags over-explanation (probe 3, since the
terseness change), fidelity's Omissions scope-check treats absent
maintenance content as correct rendering (probe 4, partially, per
setup-not-maintenance), and writer.md's "ceiling not a floor" keeps
post-setup facts out — but nothing hunts duplication (probe 2) or pure
necessity (probe 1), and review findings in the five box runs skew
additive (add a gloss, add a cross-link, renumber) rather than
subtractive. This generalizes the terseness and setup-not-maintenance
corrections into a removal-first question asked deliberately, not as a
side effect of other dimensions.

Likely targets for a tune proposal: `docs/agents/review.md` (a new
dimension, or probes grafted onto an existing one), `docs/agents/writer.md`
(a cut pass in the pre-report self-check), and
`scripts/draft-guide-workflow.js` if it becomes its own reviewer
(cost note: a fifth reviewer runs every round; it would be a candidate for
the cheaper-model treatment the formatting dimension got).

One boundary the proposal must draw: a removal reviewer suggesting
deletions can ping-pong with fidelity's omission blockers (dropped Dossier
facts a user needs to finish setup). Fidelity's "needs means needs to
finish setup" scope is the existing line; removal findings should have to
clear it.

## Status

Captured only.
