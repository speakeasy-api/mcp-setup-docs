<h3 align="center">Speakeasy MCP Setup Docs</h3>
<p align="center">
  Setup guides for MCP servers behind the Speakeasy AI Control Plane.
  Each guide lives in <code>guides/&lt;slug&gt;/</code>.
  <br /><br />
  <a href="https://speakeasy.com/"><img alt="Built by Speakeasy" src="https://www.speakeasy.com/assets/badges/built-by-speakeasy.svg" /></a>
  <br /><br />
  <a href="./guides/"><strong>Guides</strong></a> ·
  <a href="./FACTORY.md"><strong>Factory</strong></a> ·
  <a href="./go"><strong>Go SDK</strong></a>
</p>

<hr />

## Draft through GitHub

Open a freeform issue and apply `guide:draft`. The Kit 0.1.98 factory resolves
the guide, performs research and bounded review with GPT-5.6 Sol through
OpenRouter, and opens or resumes one factory PR. Every trigger reruns the whole
guide. Outcomes, labels, security boundaries, and troubleshooting are covered
in [`FACTORY.md`](FACTORY.md).

## Run locally

Local drafting requires Docker and `OPENROUTER_API_KEY`. It validates the
selected guide but does not publish or use host GitHub/Pulse credentials.

```bash
export OPENROUTER_API_KEY=...
mise run draft-guide -- \
  --title "Refresh Asana guide" \
  --body "Dry-run the Kit factory without publishing" \
  --slug asana

mise run lint-guide -- ../guides/asana
```

See [`FACTORY.md`](FACTORY.md) for normalized issue-JSON input, stale sweeps,
outcomes, and the local command's exact behavior.

## Related

- [`doctrine/`](doctrine/) — factory doctrine and authoring roles
- [`doctrine/personas/`](doctrine/personas/) — audience voice
- [`doctrine/glossary.md`](doctrine/glossary.md) — vocabulary
- [`research/`](research/) — research initiatives
- [`GO-MODULE.md`](GO-MODULE.md) — Go module release process
