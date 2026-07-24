# Guides

Each Guide lives in `guides/<slug>/`:

- `meta.yaml` — Metadata (server URL, transport, credentials, provenance).
  Validates against [`../schema/guide.v1.schema.json`](../schema/guide.v1.schema.json).
- `research.md` — Research Dossier: every fact the Setup Guide renders, with
  provenance and anchor IDs.
- `setup.md` — Setup Guide voiced for a persona from
  [`../doctrine/personas/`](../doctrine/personas/).

Draft via the factory ([`../FACTORY.md`](../FACTORY.md)) or locally with
`mise run draft-guide -- <slug>`. `guides/box/` is the reference shape.
