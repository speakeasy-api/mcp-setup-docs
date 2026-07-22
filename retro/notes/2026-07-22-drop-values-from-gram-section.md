# 2026-07-22 — Decision: drop the "Values from Gram" H2 section entirely

Human direction from Walker, 2026-07-22 (transcribed by the assistant —
Walker, amend freely).

## What the human said

"Let's remove this section from any setup docs. It's really not needed."
— referring to the `Values from Gram` H2 section.

## What this resolves

The prior note
[`2026-07-22-never-gram-close-the-carveout.md`](2026-07-22-never-gram-close-the-carveout.md)
left the section's fate as an open question ("(a) keep a stripped, renamed
minimal section, or (b) drop the standalone section and inline the token").
Walker has now decided: **drop the standalone section (option b).**

## Key constraint — the token stays

The section's only load-bearing element, `{{ gram.oauth.callback_url }}`,
already appears in each guide's actual redirect-URI step and must remain:

- `guides/bigquery/setup.md` — step `#create-oauth-client` (Authorized
  redirect URIs)
- `guides/hubspot/setup.md` — step `#create-mcp-auth-app` (Redirect URL)
- `guides/box/setup.md` — step `#set-redirect-uri` (Redirect URIs)
- `guides/zapier/setup.md` — no token (bearer-token auth, no callback URL);
  its section is prose-only and drops cleanly.

So removing the section loses nothing functional in any of the four guides.
This is a decision about the section, **not** about renaming the
`{{ gram.oauth.callback_url }}` template key — that key is substituted by
downstream Speakeasy tooling (external contract) and is out of scope here.

## What it implicates (for /tune-pipeline)

Removing the section from the grammar touches, at minimum:

- `docs/agents/drafting.md:38` and `docs/agents/writer.md:29` — the "exactly
  four H2 sections in this order" grammar → three sections
  (Prerequisites, Provider setup, Gotchas).
- `docs/agents/shared.md:63-66` and `docs/agents/drafting.md:98-101` — the
  "Gram-surface" carve-out note (the section title is one of the two named
  surfaces); with the section gone, only the template key remains as a
  legacy-name surface.
- All four `guides/*/setup.md` — remove the `## Values from Gram` H2.

## Invariant flag (I4)

**This weakens/redefines constitution invariant I4**, which enumerates "the
four H2 sections in order" ([`../docs/agents/constitution.md`](../docs/agents/constitution.md)).
Per the constitution, I4 is an invariant that changes only by direct human
edit, and /tune-pipeline must present an invariant-touching change as a
flagged tension for the human, not as a silent proposal. Walker's direction
here is that human decision; /tune-pipeline should surface the I4 edit
(four → three sections) explicitly for confirmation, alongside the CHANGELOG
entry I8 requires.

## Status

Captured only — no doctrine or guide edited. Routing to /tune-pipeline per
Walker's choice.
