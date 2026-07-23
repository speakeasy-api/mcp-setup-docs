# Guide draft factory

Label-driven GitHub Action that turns a freeform issue into a draft Guide PR.
Mirrors a Matt Pocock–style factory: label → distill → pipeline → draft PR.
Pipeline agents still never commit (constitution **I7**); only the Action
commits, pushes, and opens the PR.

Workflow: [`.github/workflows/guide-draft.yml`](../../.github/workflows/guide-draft.yml).
Distill CLI: `npm run resolve-issue` in `scripts/cursor-sdk/`.
Review comment formatter: [`scripts/ci/format-pipeline-review.sh`](../../scripts/ci/format-pipeline-review.sh).

## How to file an issue

1. Open a new issue. **Title + body are freeform** — no required template.
   Examples:
   - `create datadog guide`
   - `Draft a BigQuery MCP setup guide`
   - `We need HubSpot — prefer OAuth docs at https://…`
2. Add the label `guide:draft`.
3. Wait for the Action. You get:
   - a **Resolved as …** comment (distill intent),
   - a **Pipeline review** comment (unresolved blockers, open questions, nits),
   - a draft PR (`Closes #<issue>`) when files were written — including
     **unconverged** runs (PR title/body say so).

Persona defaults to `it-admin` unless the distill step confidently finds a
known id under `docs/personas/`.

## Where to put clarifications

When the **Pipeline review** comment asks for a call (exact UI labels, whether
to drop a recovery branch, etc.):

1. **Reply on the issue** with the answers (preferred — easy to skim in the
   thread), and/or
2. **Edit the issue body** with the same facts.

Then re-add `guide:draft`. Distill re-reads the **body and the full comment
thread** into `--notes` for the next run. You do **not** need to paste the
whole guide into the ticket — answer the open questions / blockers listed in
the review comment.

## Labels

The workflow **creates these labels automatically** if missing. You can still
create them by hand for triage before the first run:

| Label | Role |
| --- | --- |
| `guide:draft` | Trigger — removed as soon as the job accepts the work |
| `guide:in-progress` | Set while distill + pipeline run; always cleared in `always()` |
| `guide:blocked` | Set on preflight refusal, distill clarification, or hard failure; cleared when a new successful accept starts |

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
3. **Distill** — light Cursor agent reads title + body + issue comments (+
   existing `guides/*` slugs) → structured JSON or `needs_clarification`.
4. **Comment** — “Resolved as `slug` …” summary.
5. **Draft** — `npm run draft-guide -- <slug> --overwrite [--notes …]`.
6. **PR** — commit `guides/<slug>/` + matching `retro/runs/*-<slug>.json`,
   push `guide/issue-<N>-<slug>`, open a **draft** PR (also on unconverged
   when files exist).
7. **Comment** — **Pipeline review** on the issue (blockers / open questions /
   nits + PR link). Same summary is appended to the PR body.
8. **Hard failure** — `guide:blocked` + comment (includes review summary when
   a run record exists).
9. **Always** — remove `guide:in-progress`.

CLI exit `0` (converged) and exit `2` (unconverged / blocked / failed guide
status with files on disk) both open a draft PR. Hard failures (exit `1`,
missing `guides/<slug>/`) take the blocked path with no PR.

## What v1 does not do

- No queued/promote state machine, no `guide:review` auto-label on the PR.
- No human confirmation gate when distill returns `ok` (comment only).
- Distill `needs_clarification` is the only intentional stop before the heavy
  pipeline.
