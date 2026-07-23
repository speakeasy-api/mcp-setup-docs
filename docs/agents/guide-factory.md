# Guide draft factory

Label-driven GitHub Action that turns a freeform issue into a draft Guide PR.
Mirrors a Matt Pocock–style factory: label → distill → pipeline → draft PR.
Pipeline agents still never commit (constitution **I7**); only the Action
commits, pushes, and opens the PR.

Workflow: [`.github/workflows/guide-draft.yml`](../../.github/workflows/guide-draft.yml).
Distill CLI: `npm run resolve-issue` in `scripts/cursor-sdk/`.

## How to file an issue

1. Open a new issue. **Title + body are freeform** — no required template.
   Examples:
   - `create datadog guide`
   - `Draft a BigQuery MCP setup guide`
   - `We need HubSpot — prefer OAuth docs at https://…`
2. Add the label `guide:draft`.
3. Wait for the Action. On success you get a draft PR (`Closes #<issue>`).
   On clarification or failure you get `guide:blocked` and a comment; edit the
   issue and re-add `guide:draft` to retry.

Persona defaults to `it-admin` unless the distill step confidently finds a
known id under `docs/personas/`.

## Labels

The workflow **creates these labels automatically** if missing. You can still
create them by hand for triage before the first run:

| Label | Role |
| --- | --- |
| `guide:draft` | Trigger — removed as soon as the job accepts the work |
| `guide:in-progress` | Set while distill + pipeline run; always cleared in `always()` |
| `guide:blocked` | Set on preflight refusal, distill clarification, or pipeline failure; cleared when a new successful accept starts |

Suggested colors (optional): draft = blue, in-progress = yellow, blocked = red.

## Secrets

| Secret | Required? | Purpose |
| --- | --- | --- |
| `CURSOR_API_KEY` | **Yes** | Distill (`Agent.prompt`) + full `draft-guide` pipeline |
| `AGENT_PAT` | Recommended | Checkout / push / label edits with a PAT so follow-on workflows can fire; falls back to `GITHUB_TOKEN` |

`GITHUB_TOKEN` alone is enough to open the draft PR and comment on the issue,
but a classic PAT (`AGENT_PAT`) is better when label-triggered chaining or
pushing with full permissions matters.

## Flow

1. **Preflight** — refuse if an open collaborator PR already `Closes #N`.
2. **Labels** — remove `guide:draft` + `guide:blocked`, add `guide:in-progress`.
3. **Distill** — light Cursor agent (`composer-2.5` / `CURSOR_MODEL_LIGHT`)
   reads title+body (+ existing `guides/*` slugs) and writes structured JSON
   (`slug`, `provider`, `persona`, `notes`) or `needs_clarification`.
4. **Comment** — on `ok`, comment a short “Resolved as `slug` …” summary.
5. **Draft** — `npm run draft-guide -- <slug> --overwrite [--notes …] [--persona …]`.
6. **PR** — commit `guides/<slug>/` + matching `retro/runs/*-<slug>.json`,
   push `guide/issue-<N>-<slug>`, open a **draft** PR.
7. **Failure** — `guide:blocked` + comment with reason and Actions run URL.
8. **Always** — remove `guide:in-progress`.

CLI exit `0` (converged) opens a draft PR. Exit `2` (unconverged / blocked /
failed guide status) still opens a draft PR when `guides/<slug>/` exists, so
expensive agent work is not discarded — the PR title/body mark it
**unconverged** for human review. Hard failures (exit `1`, missing files)
take the `guide:blocked` path with no PR.

## What v1 does not do

- No queued/promote state machine, no `guide:review` auto-label on the PR.
- No human confirmation gate when distill returns `ok` (comment only).
- Distill `needs_clarification` is the only intentional stop before the heavy
  pipeline.
