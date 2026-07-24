# mcp-setup-docs

Setup Guides for MCP servers behind the Speakeasy AI Control Plane. Each
guide lives in `guides/<slug>/` (`research.md`, `meta.yaml`, `setup.md`).

## Draft via GitHub issue (preferred)

1. Open an issue — freeform title/body (docs URLs, “prefer OAuth”, etc. optional).
2. Add the label **`guide:draft`**.
3. Wait for comments + a draft PR (`guide/issue-<N>-<slug>`).

How it works (labels, scope checks, Decisions, resume): **[`FACTORY.md`](FACTORY.md)**.

## Run locally

Requires Node ≥ 22.13 and a Cursor API key.

```bash
export CURSOR_API_KEY=cursor_...   # Dashboard → Integrations / API Keys

# From repo root (installs deps as needed):
mise run draft-guide -- box --overwrite
mise run draft-guide -- box --overwrite --notes "prefer ADC docs"
mise run draft-guide -- x --overwrite --pause-on-scope

# Or:
cd scripts/cursor-sdk && npm install
npm run draft-guide -- box --overwrite
```

Exit codes: `0` converged · `2` unconverged/blocked/failed · `3` awaiting scope
(`--pause-on-scope`). Pass `--help` for flags. Run records land in `retro/runs/`.

Lint without drafting: `mise run lint-guide -- box`.

## Related

- [`FACTORY.md`](FACTORY.md) — factory operator guide  
- [`docs/agents/`](docs/agents/) — pipeline doctrine (start with [`shared.md`](docs/agents/shared.md))  
- [`docs/personas/`](docs/personas/) — audience voice  
- [`CONTEXT.md`](CONTEXT.md) — vocabulary  
- `/tune-pipeline` — retro signal → doctrine proposals (Claude Code skill)
