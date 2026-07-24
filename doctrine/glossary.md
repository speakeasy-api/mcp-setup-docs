# MCP Setup Docs

This repository holds Guides that document how to configure MCP servers for
use behind the Speakeasy AI Control Plane. Every Guide is authored from a
provider's public documentation.

## Language

### The guide

**Guide**:
The documentation bundle for one MCP Server — its setup walkthrough and the
structured metadata that backs it. The primary artifact this repository
produces.
_Avoid_: Catalog Entry, entry, integration, connector

**Setup Guide**:
The step-by-step walkthrough a user follows to configure an MCP Server — the
prose half of a Guide.
_Avoid_: instructions, tutorial, readme

**Metadata**:
The structured facts backing a Guide — the MCP Server's URL and transport,
credential setup, and provenance.
_Avoid_: entry, frontmatter, manifest

**MCP Server**:
The remote MCP endpoint a Setup Guide documents, identified by its URL and
transport. A guide may cover more than one when they share a single
credential setup.
_Avoid_: Remote, endpoint, provider

**Provider**:
The company that operates an MCP Server and publishes the documentation a
guide is drafted from — for example Box, Zapier, or Google.
_Avoid_: vendor

**Tool**:
A single callable operation an MCP Server exposes. Guides never catalog
inventories — the server's advertised list is the runtime source of truth —
and name a tool only where it matters to setup: billing, licensing,
off-by-default, or restricted behavior.
_Avoid_: function, capability, action

**Authentication Option**:
One supported way to acquire and present credentials for an MCP Server; a
server may offer several.
_Avoid_: auth type, credential type

### The product guides configure

**Speakeasy AI Control Plane**:
The Speakeasy product these guides configure — where a user pastes the
credentials and values a guide tells them to collect.
_Avoid_: Gram, control plane, platform

### Authoring

**Draft**:
A Guide authored from the provider's public documentation with screenshot
placeholders, before human enrichment and image capture.
_Avoid_: stub, WIP, pending entry

**Research Dossier**:
The fact artifact of a Guide (`research.md`) — every fact the Setup Guide
renders, recorded at click-through depth with provenance and minted
Anchors. The Writer's fact ceiling: nothing enters `setup.md` that is not
recorded here first.
_Avoid_: research notes, source doc, dossier file

**Persona**:
A named audience definition (`doctrine/personas/<id>.md`) a Setup Guide is
voiced for — who is reading, what they know and do not, the voice and
formatting rules, and the achievability bar reviewers judge against.
_Avoid_: audience, user type, reader profile

**Anchor**:
The document-unique kebab-case ID behind each `setup.md` heading — minted
in the Research Dossier for provider steps, fixed in
`doctrine/speakeasy-setup.md` for Speakeasy steps — carried verbatim into
`setup.md` headings and `meta.yaml` references.
_Avoid_: heading id, fragment, link id

**Provenance**:
The recorded source behind a fact in a guide — a documentation locator and the
date it was observed. Every asserted fact traces to one.
_Avoid_: citation, reference, source record

**Screenshot**:
A captured setup-guide image with a stable identity and a place in the guide.
_Avoid_: Catalog Asset, asset, CDN URL

**Screenshot Placeholder**:
A marker where a Screenshot could go, describing the intended shot well enough
that a later capture pass needs no re-research.
_Avoid_: TODO, stub

**Screenshot Exception**:
A recorded reason that a setup step needs no Screenshot because it has no
meaningful visual state, such as a plain text field.
_Avoid_: skip, capture failure

### The review loop

**Finding**:
One reviewer-reported defect: a severity, a target file, where it lives,
the problem in one sentence, and a concrete suggestion. A **Blocker** must
be fixed before the Guide ships; a **Nit** is worth fixing but shippable.
_Avoid_: issue, comment, feedback item

**Convergence**:
The review loop's exit: a round in which every reviewer passes with zero
Blockers. Rounds are capped; whatever remains unresolved goes to a human.
_Avoid_: sign-off, approval, consensus

**Disputed Finding**:
A Finding a revision agent declined to apply, recorded with a one-line
reason so next-round reviewers re-examine it fresh — the loop converges by
agreement, not by rank.
_Avoid_: rejected finding, wontfix

### Process improvement

**Doctrine**:
The rules the pipeline runs on — the role docs, personas, skills, and
workflow. Changes only through human-approved `/tune-pipeline` proposals
or direct human edits, always recorded in the doctrine changelog.
_Avoid_: prompts, config, process docs

**Constitution**:
The fixed point doctrine evolves toward (`doctrine/constitution.md`) —
the pipeline's goal and the numbered Invariants no proposal may weaken.
Changes only by direct human edit.
_Avoid_: charter, manifesto, north star

**Run Record**:
The machine-written capture of one pipeline run (`retro/runs/`): status,
rounds, per-round Findings, disputes, and open questions. Append-only
evidence for tuning, never a behavior change in itself.
_Avoid_: log, telemetry, report

**Retro Note**:
A human-written observation in `retro/notes/` — corrections made after
review, stumbles seen in the field. The highest-weight evidence a tune
run considers.
_Avoid_: feedback file, comment
