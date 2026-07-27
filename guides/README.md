# Guides

Each Guide lives in `guides/<slug>/`:

- `meta.yaml` — Metadata (server URL, transport, credentials, provenance).
  Validates against [`../schema/guide.v1.schema.json`](../schema/guide.v1.schema.json).
- `research.md` — Research Dossier: every fact the Setup Guide renders, with
  provenance and anchor IDs.
- `external.md` — External setup (provider-side): prerequisites folded into
  opening prose, then anchored provider console steps. Consumers may show
  this file alone when Speakeasy setup is already in context.
- `speakeasy.md` — Speakeasy setup (Control Plane): add-server and connect
  credentials, voiced for a persona from
  [`../doctrine/personas/`](../doctrine/personas/).

Draft via the factory ([`../FACTORY.md`](../FACTORY.md)) or locally with
`mise run draft-guide -- <slug>`. `guides/asana/` is a reference shape for
the two-file split; `guides/box/` still carries legacy Gotchas pending
re-draft.
