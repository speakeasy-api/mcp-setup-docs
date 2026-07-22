# 2026-07-22 — "Gram" is banned outright; close the section-title + template-key carve-out

Human direction from Walker, 2026-07-22 (reviewing the box re-draft;
transcribed by the assistant — Walker, amend freely).

## What the human said

"We should NEVER call the product 'Gram'. EVER. It's 'Speakeasy AI Control
Plane' or 'Speakeasy' for short."

## Current doctrine contradicts this

`docs/agents/shared.md:63-66` and `docs/agents/drafting.md:100-103` already
say "never write the legacy name 'Gram' in prose" — but both explicitly
carve out two exceptions "pending a coordinated rename":

- the enforced H2 section title **`Values from Gram`** (mandated by
  `docs/agents/writer.md:26` and `docs/agents/drafting.md:38`, referenced in
  `docs/agents/constitution.md`), present in all four guides — bigquery,
  box, hubspot, zapier; and
- the template key **`{{ gram.oauth.callback_url }}`** — the only supported
  template key (`drafting.md:52`, `writer.md:40`, checked by
  `fidelity.md:32`).

Walker's direction closes that carve-out: the "coordinated rename" the
doctrine itself flagged as pending is now called for.

## What it implicates (for /tune-pipeline)

A coordinated rename touching, at minimum:

- role docs: `shared.md`, `drafting.md`, `writer.md`, `constitution.md`,
  `fidelity.md`, `technical-research.md`;
- the enforced section title in the setup.md grammar;
- the template-key token name, everywhere it appears in guides and docs;
- all four existing `guides/*/setup.md`.

`CONTEXT.md:55` already lists "Gram" under _Avoid_ for the product term —
that entry is correct and can stay.

Coordination risk: `{{ gram.oauth.callback_url }}` is substituted by
downstream Speakeasy tooling, so renaming the token is an external-contract
change, not just a docs edit. Confirm the consumer before renaming the key.

## Related question Walker raised: does the "Values from Gram" section earn its place?

Its only load-bearing element is the `{{ gram.oauth.callback_url }}` key
(the single render-time token). The surrounding prose duplicates
`#set-redirect-uri` and `#copy-client-credentials` and is a repeat source of
out-of-context OAuth-vocabulary nits. While doing the rename, decide whether
to (a) keep a stripped, renamed minimal section, or (b) drop the standalone
section and inline the token at the step where it's pasted — contingent on
whether the renderer requires a fixed section anchor. Assistant leans (b).

## Status

Captured only — no doctrine or guide edited, per the /draft-guide hard rules.
