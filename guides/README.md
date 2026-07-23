# Guides

Each Guide lives in `guides/<slug>/` with a `meta.yaml` and a `setup.md`.
Screenshots may be added later under an `assets/` directory; drafts mark where
an image could go with placeholder comments instead.

- `meta.yaml` — the Metadata backing the Guide: the MCP Server's URL and
  transport, the credential setup, and provenance for every fact. It
  validates against
  [`../schema/guide.v1.schema.json`](../schema/guide.v1.schema.json).
- `research.md` — the Research Dossier: every fact the Setup Guide renders,
  with provenance and the anchor IDs the other files reuse.
- `setup.md` — the Setup Guide a user follows, voiced for a persona from
  [`../docs/personas/`](../docs/personas/): prerequisites, the provider
  console walkthrough, and the Speakeasy-side steps that connect the
  server.

Current guides: `bigquery`, `box`, `hubspot`, `zapier`. All are drafts
authored from public provider documentation, and all predate the
`/draft-guide` pipeline — none has a `research.md` yet. `guides/box/` is
the reference draft.
