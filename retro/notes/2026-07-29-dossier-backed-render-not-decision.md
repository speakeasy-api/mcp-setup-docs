# 2026-07-29 — Dossier-backed render fixes are not chrome Decisions

Human direction from Walker, 2026-07-29 (review of
[google-calendar PR #79](https://github.com/speakeasy-api/mcp-setup-docs/pull/79)
Pipeline review Decision 1; transcribed by the assistant — amend freely).

## What the human said

On Decision 1 (“Fact check failed… Needs a clearer step in `external.md`
(the fact may already be in research)” for opening prerequisites that
named Service Usage Admin / Owner while research already recorded
`serviceusage.services.enable`, normally via those roles):

> Should our workflow be adjusted? If "the fact may already be in
> research", then why isn't it checking the research definitively? Is
> there a context rot situation going on?

Then: open a PR to fix it; later approved fixing Opus 5 review findings
on that PR.

## What happened

1. Research already had the permission wording. Writer omitted it in
   opening prose. Fidelity missed it for three rounds (attention tunnel
   on a secret-recovery spiral), then raised it only at finalization.
2. Phase 0/1 had removed finalization salvage, so the miss became a
   human Decision with verified / drop / hedge reply templates — chrome
   capture UX for a pure render fix.
3. The formatter hedged “the fact may already be in research” without
   opening research; the suggestion already named the Dossier fix.

## What it implicates

- Restore **narrow** finalization salvage only when every remaining
  blocker is setup-file fidelity (`external` / `speakeasy`).
- Classify those misses as Render fixes (`apply` / `override`), not
  console-capture Decisions.
- Share one predicate between salvage and the formatter; salvage must
  not apply nits.
- Sharpen fidelity so opening prose is re-checked every round against
  Dossier permissions, not only the contested locus.
