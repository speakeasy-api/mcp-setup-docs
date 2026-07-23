# Drafting Guides locally

> **Superseded (mcp-setup-docs):** This guide came from the original
> `mcp-catalog` repo and is kept as historical reference only. The design
> it was the starting point for now exists: the `/draft-guide` skill and
> `scripts/draft-guide-workflow.js` pipeline, with roles split across
> `shared.md`, `technical-research.md`, `writer.md`, `fidelity.md`, and
> `review.md` in this directory. Its single-agent loop (one agent writes
> `setup.md` directly) no longer applies — research facts now land in a
> Research Dossier first, and `setup.md` is rendered from it for a persona
> (`docs/personas/`). The content bar, `setup.md` grammar, and hard rules
> below were carried into those role docs; if this file and a role doc
> disagree, the role doc wins.

A draft is one `guides/<slug>/` directory — `meta.yaml` plus `setup.md` —
authored from the provider's public documentation, fully locally. Screenshots
are an enrichment pass, not a drafting requirement: mark where an image could
go with a placeholder comment. Live-remote validation is out of scope;
guides are authored from public documentation only.

## The loop

1. Take your assigned candidate (or pick one from the seed tracker at
   `.scratch/enriched-catalog-phase-1/seed-state.yaml`).
2. Research the provider's public MCP documentation: remote URL, transport,
   authentication model, tool inventory, the console path an admin follows,
   and the gotchas (licensing, billing, restricted tools).
3. Write `guides/<slug>/meta.yaml` and `guides/<slug>/setup.md`.
   `guides/box/` is the reference draft.
4. Validate each `meta.yaml` against `schema/guide.v1.schema.json` and fix
   until it conforms.
5. Report back: what you decided, what you were unsure about, and the
   documentation locators behind every fact.

## setup.md grammar (the parts that bite)

- YAML frontmatter with `setup_version: 1`, then exactly one H1 title.
- Exactly three H2 sections in this order: Prerequisites, Provider setup,
  Speakeasy setup.
- Provider setup steps are H3 headings with explicit document-unique
  kebab-case IDs: `### Create credentials {#create-credentials}`.
- Every provider step needs one of:
  - a declared Screenshot,
  - a placeholder comment on its own line —
    `<!-- screenshot: what the image could show -->` — the drafting default;
    write the note well enough that a later capture pass needs no
    re-research, or
  - an exception comment on its own line —
    `<!-- screenshot-exception: reason -->` — only when a screenshot would
    never add value (for example, a plain text field). Like the
    placeholder, it must not render for readers.
- The only supported template key is `{{ gram.oauth.callback_url }}`.
- meta.yaml fields can reference any anchor as `setup.md#anchor-id`.

## Setup guide content bar

Write for someone who has never opened the provider's console. The grammar
above is the floor; this is the standard a draft must clear:

- Every provider step is a full click-through: the entry URL, the
  navigation path (menu > page > tab), exact button and field labels, and
  search terms where the console has a search box. "Enable the API" or
  "create credentials" alone is a placeholder, not a step.
- When the provider documents a sub-flow (API enablement, role grants,
  consent screens, credential dialogs), fetch that documentation, quote its
  exact UI labels, and record each fetched page as a provenance locator in
  meta.yaml. Grounding in provider docs is how detail stays compatible
  with the no-invented-console-paths rule — sparseness is not.
- Prerequisites name the account type, plan tier, and permissions needed,
  and orient the reader: where to sign in, and that no prior console
  experience is assumed.
- Add recovery hints where the console is unforgiving: one-time secret
  displays, destructive token rotation, publish-status expiries.
- Before reporting, re-read the guide as a first-time console user; any
  step you could not follow blind needs more detail.

## meta.yaml essentials

- Start with the schema pointer comment
  (`# yaml-language-server: $schema=../../schema/guide.v1.schema.json`).
- `credential_setup` fields map to guide anchors via `setup.md#step-id`.
- `remotes` carry the transport, the authentication option IDs, and the tool
  inventory from provider documentation.
- `provenance` records every fact source with a locator and `observed_at`.

## Hard rules

- Never commit or push; leave the working tree for human review.
- Touch only your assigned `guides/<slug>/` directory.
- No secret values anywhere — not in files, argv, reports, or issues.
- The private Pulse export under `~/.local/share/mcp-catalog/private/` is
  licensed data. Individual derived facts (remote URL, transport, version)
  with `source: pulsemcp` provenance are fine; never copy its content into
  the repository, an issue, or a chat.
- Do not invent tools or console paths. Record the documentation locator each
  fact came from, and flag uncertainty in your report instead of guessing.
- The product is the "Speakeasy AI Control Plane"; never write the legacy
  name "Gram" in prose. The `{{ gram.oauth.callback_url }}` template key is
  the only surface where the legacy token still appears, pending a
  coordinated rename.

## Running several drafts at once

One agent per slug. Drafts do not share files — each owns its
`guides/<slug>/` directory — so parallel drafting agents in one working tree
are safe. Shared files (schema, AGENTS.md, other guides) are out of a
drafting agent's scope.
