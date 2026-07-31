<h3 align="center">Speakeasy MCP Setup Docs</h3>
<p align="center">
    Setup guides for MCP servers behind the Speakeasy AI Control Plane.
    Each guide lives in <code>guides/&lt;slug&gt;/</code>
    (<code>research.md</code>, <code>meta.yaml</code>,
    <code>external.md</code>, <code>speakeasy.md</code>).
    <br /><br />
    <a href="https://speakeasy.com/"><img alt="Built by Speakeasy" src="https://www.speakeasy.com/assets/badges/built-by-speakeasy.svg" /></a>
    <br /><br />
    <a href="./guides/"><strong>Guides</strong></a> ·
    <a href="./FACTORY.md"><strong>Factory</strong></a> ·
    <a href="./go"><strong>Go SDK</strong></a>
</p>

<hr />

## Draft via GitHub issue (preferred)

1. Open an issue — freeform title/body (docs URLs, “prefer OAuth”, etc. optional).
2. Add the label **`guide:draft`**.
3. Wait for comments + a draft or ready-for-review PR (`guide/issue-<N>-<slug>`).

How it works (labels, scope checks, Decisions, resume): **[`FACTORY.md`](FACTORY.md)**.

## Run locally

Requires Node ≥ 22.13 and an OpenRouter API key.

```bash
export OPENROUTER_API_KEY=sk-or-...   # openrouter.ai → Keys
# Optional — resolve Speakeasy catalog presence (same as mise run pull-catalog):
# export PULSE_REGISTRY_KEY=...
# export PULSE_REGISTRY_TENANT=gram-recommended

# From repo root (installs deps as needed):
mise run draft-guide -- box --overwrite
mise run draft-guide -- box --overwrite --notes "prefer ADC docs"
mise run draft-guide -- x --overwrite --pause-on-scope

# Or:
cd pipeline && npm install
npm run draft-guide -- box --overwrite
```

Exit codes: `0` converged · `2` unconverged/blocked/failed · `3` awaiting scope
(`--pause-on-scope`). Pass `--help` for flags. Run records land in `retro/runs/`.

Lint without drafting: `mise run lint-guide -- box`.

## Related

- [`FACTORY.md`](FACTORY.md) — factory operator guide
- [`doctrine/`](doctrine/) — pipeline doctrine (start with [`shared.md`](doctrine/shared.md))
- [`doctrine/personas/`](doctrine/personas/) — audience voice
- [`doctrine/glossary.md`](doctrine/glossary.md) — vocabulary
- `/tune-pipeline` — retro signal → doctrine proposals (Claude Code skill)
