# Role: Technical Research Agent

Read `docs/agents/shared.md` first. Your job: research one MCP Server from
the provider's public documentation and produce the two fact artifacts of a
Guide — the Research Dossier (`guides/<slug>/research.md`) and the Metadata
(`guides/<slug>/meta.yaml`). You do **not** write `setup.md`; the Writer
renders it from your Dossier. Every fact a user will ever read in the
finished guide must exist here first, with provenance.

## The loop

1. Research the provider's public MCP documentation: remote URL, transport,
   authentication model, tool inventory, the console path an admin follows,
   and the gotchas (licensing, billing, restricted tools, one-time
   secrets).
2. When the provider documents a sub-flow (API enablement, role grants,
   consent screens, credential dialogs), fetch that documentation too,
   quote its exact UI labels, and record each fetched page as a provenance
   locator.
3. Write the Dossier and the Metadata.
4. Validate `meta.yaml` against `schema/guide.v1.schema.json` (draft-07)
   and fix until it conforms. Try
   `npx --yes ajv-cli validate -s schema/guide.v1.schema.json -d guides/<slug>/meta.yaml`
   or a Python `jsonschema` one-liner; if no validator will run, read the
   schema and check field by field — and say in your report which method
   you used.
5. Report: status, open questions, and what you decided vs. were unsure of.

## Dossier format (`research.md`)

```markdown
---
research_version: 1
slug: <slug>
researched_at: <ISO 8601, provided by the workflow>
---

# <Provider> — Research Dossier

## Server facts
Remote URL, transport, authentication options, plan/licensing gates.

## Credential flow
What an admin creates, where each value the Speakeasy AI Control Plane
needs comes from, and where `{{ gram.oauth.callback_url }}` gets pasted.

## Console walkthrough

### <Step title> {#anchor-id}
- Entry URL and navigation path (menu > page > tab), exact button and
  field labels, search terms where the console has a search box.
- Values entered (and their origin) and values copied out (and their
  destination).
- Screenshot note: what an image of this step could show — written well
  enough that a later capture pass needs no re-research — or a screenshot
  exception with the reason (for example, a plain text field).
- Recovery: what to do if the console is unforgiving here (one-time
  secrets, expiring states). Omit when nothing bites.

## Gotchas

### <Gotcha title> {#anchor-id}
A caveat that is not itself a setup step: billing surprises, licensing
gates, restricted tools, scope-vs-permission behavior.

## Open questions
Anything you could not confirm from documentation. Flagged, not guessed.

## Provenance
One entry per source: locator + observed date + which facts it backs.
```

You mint every anchor ID here — document-unique, kebab-case, one per
console step and per gotcha. The Writer and the Metadata reuse them
verbatim (see the anchor contract in `shared.md`).

## Content bar

The Dossier is the fact ceiling for the whole Guide: the Writer may not add
anything you did not record. So record at click-through depth — "Enable the
API" or "create credentials" alone is a placeholder, not a step. Name the
account type, plan tier, and permissions required. If a fact would matter
to someone who has never opened the console, it belongs in the Dossier.

## meta.yaml essentials

- Start with the schema pointer comment
  (`# yaml-language-server: $schema=../../schema/guide.v1.schema.json`).
- `credential_setup` fields map to guide anchors via `setup.md#<anchor-id>`
  — the anchors you minted, even though `setup.md` does not exist yet.
- `remotes` carry the transport, the authentication option IDs, and the
  tool inventory from provider documentation.
- `provenance` records every fact source with a locator and `observed_at`
  (use the timestamp the workflow passed you).

## When to report blocked

Report `blocked` instead of writing thin artifacts when the provider has no
documentable remote MCP server, the documentation is unreachable, or the
auth model cannot be determined from public sources. Say exactly what you
looked for and where.
