# 2026-07-23 — Trust provider-documented UI; no console-verification OQs

Human direction from Walker, 2026-07-23 (Asana factory PR
https://github.com/speakeasy-api/mcp-setup-docs/pull/12 / issue #6;
transcribed by the assistant — amend freely).

Related: [`2026-07-23-secret-reset-out-of-band.md`](2026-07-23-secret-reset-out-of-band.md)
(same Asana run; different failure mode).

## What the human said

On the Pipeline review open questions for Asana, especially:

> The OAuth page's redirect URL add/save control label requires console
> verification.

> the first open questions are a bit odd to me. i'm assuming that we added
> those questions because the asana docs referred to these UI bits. We
> shouldn't really be questioning whether or not upstream providers'
> documentation is correct - we can take their word for stuff.

## What happened

1. Fidelity / achievability blocked round 1 because the Dossier left the
   Redirect URL completion control unresolved (“reader must guess which
   control adds or saves”).
2. Research then recorded **`+ Add redirect URL`** / **`Add`** from
   Asana’s own OAuth docs (including official console screenshots) and a
   Frontegg corroboration page, rendered them in `setup.md`, and removed
   the gap from `research.md`’s Open questions section.
3. The run record / Pipeline review checklist still surfaced
   “requires console verification” as an open question — asking a human
   to re-prove UI the provider already documented.

That is distrust of upstream docs, not a documentation gap.

## What it implicates

Provider public docs are authoritative for the UI they name or show
(including screenshots on those pages). Do not mint open questions that
ask for live console verification of that chrome. Do not burn review
rounds demanding third-party corroboration when the provider page already
shows the control.

Open questions remain appropriate when public docs are **silent** (e.g.
which account permission gates app creation) or when live probing
contradicts a documented URL/behavior (e.g. protected-resource metadata
404 vs the working challenge URL) — those are gaps or discrepancies, not
“please re-check the vendor’s screenshot.”

Likely targets for `/tune-pipeline`:

- `docs/agents/technical-research.md` — Open questions / loop: treat
  provider-documented labels and screenshots as confirmed facts; OQs only
  for silence or live contradiction.
- `docs/agents/fidelity.md` / `docs/agents/review.md` (achievability) —
  do not block or demand “console verification” when the Dossier cites
  provider docs/screenshots for the exact control.
- `docs/agents/guide-factory.md` — “exact UI labels” clarifications are
  for gaps humans must fill, not for re-verifying already-cited provider
  UI.
- Writer / research report aggregation — do not re-list a resolved
  UI-label fact as an open question after the Dossier records it.

## Status

Captured. Asana PR cleanup: drop the console-verification open question
from the run-record checklist (Dossier Open questions already omitted it).
Keep the permission-gate silence and metadata-URL discrepancy OQs unless
the human says otherwise.
