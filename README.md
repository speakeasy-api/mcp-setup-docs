# mcp-setup-docs

Documentation for setting up MCP servers behind the Speakeasy AI Control
Plane. Each MCP server gets one Guide — a small, self-contained bundle that
agents can be spun up to draft from a provider's public MCP documentation.

## Layout

```text
guides/<slug>/
├── meta.yaml    # Metadata (server, credentials, provenance)
├── research.md  # the Research Dossier every rendered fact traces to
└── setup.md     # the Setup Guide a user follows, voiced for a persona
schema/
└── guide.v1.schema.json   # what every meta.yaml validates against
docs/agents/     # pipeline role docs (shared rules, research, writer,
                 # fidelity, review), constitution.md (goal + invariants),
                 # CHANGELOG.md (doctrine changes), guide-factory.md
                 # (issue→draft PR Action), drafting.md (historical)
docs/personas/   # audience definitions Setup Guides are voiced for
retro/           # pipeline signal: runs/ (Run Records), notes/ (human)
scripts/
├── draft-guide-workflow.js   # Claude Code Workflow harness pipeline
└── cursor-sdk/               # Cursor SDK port of the same pipeline (CLI)
.claude/
├── skills/draft-guide/       # /draft-guide — entry point to the pipeline
└── skills/tune-pipeline/     # /tune-pipeline — retro → doctrine proposals
CONTEXT.md       # ubiquitous-language glossary
```

## Anatomy of a Guide

- **`meta.yaml`** captures the machine-readable facts: the MCP server's URL and
  transport, the credential setup and its requirements, and a `provenance`
  list recording the documentation locator behind every fact. It starts
  with a `# yaml-language-server` pointer to the schema so editors validate
  it as you write. Tool inventories are out of scope — the server's
  advertised list is the runtime source of truth.
- **`research.md`** is the Research Dossier — every fact the Setup Guide
  renders, at click-through depth, with provenance and minted anchor IDs.
  It is the fact ceiling: nothing appears in `setup.md` that is not
  recorded here first.
- **`setup.md`** is the click-through Setup Guide for a named persona (see
  `docs/personas/`): prerequisites, the provider-side walkthrough (exact
  menus, buttons, and field labels), and the Speakeasy-side steps that
  connect the server behind the Speakeasy AI Control Plane, closing with
  a pointer to the provider's MCP documentation.

`guides/box/` is the reference draft — match its shape when adding new guides.

## Authoring a Guide (Cursor SDK CLI)

Same pipeline and doctrine, driven by local Cursor agents instead of the
Claude Code Workflow harness. From `scripts/cursor-sdk/`:

```bash
export CURSOR_API_KEY=cursor_...   # Dashboard → Integrations / API Keys
npm install
npm run draft-guide -- box
npm run draft-guide -- box hubspot --persona it-admin --overwrite
```

Requires Node ≥ 22.13. Defaults: `gpt-5.6-sol` at `effort=high` for
research, draft, fidelity, voice, achievability, and revision;
`composer-2.5` for the lighter formatting / concision / polish slots.
Usage burns your Cursor plan's token pool (tagged SDK in the usage
dashboard). Run records land in `retro/runs/` with `runtime: "cursor-sdk"`.
Pass `--help` for flags (`--notes`, `--model`, `--effort`, `--light-model`,
`--max-rounds`, `--overwrite`, `--force`).

### Guide draft factory (GitHub Issues)

Prefer filing a freeform issue and labeling it `guide:draft` — a GitHub
Action distills the title/body, runs the same Cursor SDK pipeline, and opens
a draft PR. See [`docs/agents/guide-factory.md`](docs/agents/guide-factory.md)
for labels, secrets (`CURSOR_API_KEY`, optional `AGENT_PAT`), and the retry
contract.

## Authoring a Guide (`/draft-guide`)

Run [Claude Code](https://claude.com/claude-code) from the repo root
(`mise.toml` pins the `claude` tool) and invoke the skill:

```text
/draft-guide Box
/draft-guide box hubspot                       # several at once — safe,
                                               # each owns its own directory
/draft-guide "Google BigQuery" --persona it-admin
/draft-guide zapier here are the docs: https://…   # extra context is
                                                   # handed to the agents
```

The persona defaults to `it-admin`; anything else you say (candidate docs
URLs, plan constraints, scope notes) rides along to the agents.
Re-drafting a slug that already exists asks for confirmation first — a run
overwrites all three files.

**What happens.** The skill launches
`scripts/draft-guide-workflow.js` in the background (`/workflows` shows
live progress):

1. **Technical Research** drafts the Dossier and Metadata from the
   provider's public documentation.
2. **Writer** renders `setup.md` from the Dossier in the persona's voice.
3. **Fidelity** (setup ↔ dossier ↔ metadata) and an **Editorial** panel
   (voice, formatting, achievability) review in parallel; a revision agent
   fixes blockers, and the loop repeats until every reviewer passes or
   rounds run out (3 by default).

**What you get back**, per slug:

- `converged` — the draft is ready for human review; remaining nits and
  open questions are your review checklist.
- `unconverged` — the agents could not agree; each unresolved blocker is
  presented for you to settle (fix the files, or direct a fix).
- `blocked` / `failed` — which phase stopped and why; the guide directory
  may be partial.

**Your part afterward.** Review the draft as the persona would use it —
against the real provider console when you can. Fix what's wrong (or tell
Claude to). Then do two things the pipeline can't: record what you had to
correct in `retro/notes/<date>-<slug>.md` (that feedback is how the
pipeline gets better — see below), and commit — the pipeline never
commits, pushes, or captures screenshots; images are a later enrichment
pass.

Role docs live in [`docs/agents/`](docs/agents/) (start with
[`shared.md`](docs/agents/shared.md)); audience definitions in
[`docs/personas/`](docs/personas/); vocabulary in [`CONTEXT.md`](CONTEXT.md).
Need a new audience? Ask `/draft-guide` for a persona that doesn't exist
yet and it will draft the persona file for your sign-off first.

## Improving the pipeline (`/tune-pipeline`)

The pipeline improves through a two-layer loop that keeps capture and
change separate:

- **Capture (automatic).** Every run writes a Run Record to
  [`retro/runs/`](retro/) — per-round blockers, disputes, open questions.
  Your `retro/notes/` files add the human signal, and they are weighted
  highest. Capture never changes behavior.
- **Distill (human-gated).** Run `/tune-pipeline` after a batch of guides
  has accumulated records, or whenever the same annoyance shows up twice.
  It reads the uncited retro signal and proposes evidence-cited diffs to
  doctrine — the role docs, personas, skills, and workflow. You approve,
  reject, or edit each diff; nothing self-applies. Applied changes land in
  [`docs/agents/CHANGELOG.md`](docs/agents/CHANGELOG.md), and the skill
  will suggest a regression re-draft of a reference guide when a change
  touches reviewer or writer behavior.

Don't hand-tweak role docs in the heat of a bad run — drop a retro note
instead, so the change happens once, with evidence, where everyone can see
it. (Direct human edits are always allowed; they just belong in the
changelog too.)

[`docs/agents/constitution.md`](docs/agents/constitution.md) pins the goal
and the invariants no proposal may weaken; it changes only by direct human
edit, and `/tune-pipeline` may never touch it.

## Status

The four existing guides (`bigquery`, `box`, `hubspot`, `zapier`) predate
the pipeline: they were drafted from public provider docs directly into
`setup.md`, so they have no `research.md` and no persona voicing pass.
Re-drafting them through `/draft-guide` is the migration path. Live-remote
validation is not part of this repository.
