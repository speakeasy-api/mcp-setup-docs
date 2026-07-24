# Guide draft factory

Turn a GitHub issue into a draft MCP Setup Guide PR. Same Cursor SDK pipeline
as `mise run draft-guide` / `npm run draft-guide`, driven by a label instead of
a local CLI.

Workflow: [`.github/workflows/guide-draft.yml`](.github/workflows/guide-draft.yml).  
Action/contract detail: [Action internals](#action-internals).

## One-time setup

### Secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Required? | What it is |
| --- | --- | --- |
| `CURSOR_API_KEY` | **Yes** | Cursor API key (Dashboard → Integrations / API Keys) |
| `AGENT_PAT` | Recommended | PAT with contents + issues + pull requests write on this repo. Falls back to `GITHUB_TOKEN` (PRs still work; label chaining is less reliable). |

### Labels

The workflow creates these if missing. You can also create them by hand:

| Label | Meaning |
| --- | --- |
| `guide:draft` | **Trigger** — add this to start (or retry) a run |
| `guide:in-progress` | Run is active (set/cleared by the Action) |
| `guide:blocked` | Distill unclear, hard failure, refused, or **awaiting scope** (set by the Action) |

## Draft a guide

1. Open an issue. **Title and body are freeform** — no template.
   - **Title:** what to draft, e.g. `create datadog guide` or `Draft BigQuery MCP setup`
   - **Body (optional):** notes for the agents — docs URLs, “prefer OAuth”, “drop secret-reset recovery”, etc.
2. Add the label **`guide:draft`**.
3. Watch the issue comments and the **Actions** tab (`Guide draft` workflow).

Runs can take a long time (often 20–40+ minutes). Usage burns Cursor plan tokens.

### What you get

1. **Resolved as `slug`…** — distill figured out which server / persona / notes.  
   On a retry: **Resuming on existing factory PR…**
2. Sometimes **Scope check** — research finished with *material* open questions (recovery path, conflicting docs, etc.). Drafting pauses; answer with `Decision N: …`, then re-add `guide:draft`. Soft OQs (catalog presence, UI silence already hedged) do **not** pause.
3. **Pipeline review** — numbered decisions (blockers), open questions, optional nits — after a full draft run. Written so you can answer without reading the whole guide.
4. A PR titled **`guide: <provider>`** on branch `guide/issue-<N>-<slug>`
   (`Closes #<issue>`). It stays a **draft** when the run needs a human reply
   (awaiting scope or unconverged); **converged** runs open ready for review.

Persona defaults to `it-admin` unless distill confidently picks another file under `doctrine/personas/`.

## When the pipeline asks for a decision

Reply on the **issue** (preferred) using the templates from the **Scope check** or **Pipeline review** comment, for example:

```text
Decision 1: drop this branch
Decision 2: verified — confirm button is "**Reset secret**"; new secret appears under **Credentials**
```

Or edit the issue body with the same facts. You do **not** need to paste the guide.

Then:

1. Remove `guide:draft` if it is still present, **or** leave it off.
2. Add **`guide:draft` again** (the `labeled` event only fires when the label is newly applied).

Distill re-reads the issue body **and** the comment thread into pipeline notes.

### Resume (not a full restart)

If a factory draft PR already exists (`guide/issue-<N>-*`):

- The next run checks out **that branch**.
- Prior `research.md` / `setup.md` / lock stay on disk; research revises in place.
- The same PR is **updated** (not a new PR from a blank tree).

That includes retries after **awaiting scope** or **unconverged** — as long as the earlier run opened the PR. (Runs that never produced files have nothing to resume from.)

## Outcomes

| Result | What happens |
| --- | --- |
| Converged | Ready-for-review PR (`guide: <provider>`); Pipeline review may still list open questions / nits |
| Awaiting scope | **Draft** PR (research only); **Scope check** + `guide:blocked`; answer Decisions, re-label |
| Unconverged | **Draft** PR; decide on blockers, then re-label |
| Distill unclear | `guide:blocked` + comment; clarify server, re-add `guide:draft` |
| Hard failure | `guide:blocked` + comment + Actions link; no PR |

A non-factory open PR that already `Closes #<issue>` (collaborator-authored) blocks the factory so it does not overwrite human work — close or finish that PR first.

## Local equivalent

```bash
export CURSOR_API_KEY=cursor_...
mise run draft-guide -- asana --overwrite --notes "drop secret-reset recovery branch"
# Match factory: pause before draft when material OQs lack Decision N replies
mise run draft-guide -- x --overwrite --pause-on-scope
```

Or `cd pipeline && npm install && npm run draft-guide -- …`. Factory
adds issue distill, labels, PR open/update, and Scope check / Pipeline review
comments around that same CLI.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Label added, no Actions run | Workflow YAML invalid on `main`, or label was already on the issue (remove + re-add) |
| Run skipped immediately | Event was a different label (`guide:blocked` etc.) — only `guide:draft` starts the job |
| “Refused to run” + existing PR | That PR is not a `guide/issue-<N>-*` factory branch |
| Resume feels like a full rewrite | No prior factory PR / files; or clarifications forced research to change materially |

## Action internals

Label-driven GitHub Action that turns a freeform issue into a draft Guide PR.
Mirrors a Matt Pocock–style factory: label → distill → pipeline → draft PR.
Pipeline agents still never commit (constitution **I7**); only the Action
commits, pushes, and opens the PR.

- Workflow: [`.github/workflows/guide-draft.yml`](.github/workflows/guide-draft.yml)
- Distill CLI: `npm run resolve-issue` in `pipeline/`
- Review comment formatter: [`.github/scripts/format-pipeline-review.sh`](.github/scripts/format-pipeline-review.sh)
- Scope check formatter: [`.github/scripts/format-scope-check.sh`](.github/scripts/format-scope-check.sh)

### Flow

1. **Preflight** — if an open factory PR (`guide/issue-<N>-*`) already
   `Closes #N`, **resume** on that branch. Refuse only for non-factory
   collaborator PRs that target the same issue.
2. **Labels** — remove `guide:draft` + `guide:blocked`, add `guide:in-progress`.
3. **Distill** — light Cursor agent reads title + body + issue comments (+
   existing `guides/*` slugs) → structured JSON or `needs_clarification`.
4. **Comment** — “Resolved as `slug` …” (or resume notice) summary.
5. **Draft** — `npm run draft-guide -- <slug> --overwrite --pause-on-scope
   [--notes …]` (no `--force`; lock skips still apply). After research, a
   heuristic scope gate pauses before draft when **material** open questions
   lack `Decision N:` replies in notes (soft OQs do not pause). When prior
   artifacts exist, research revises in place; unchanged research can skip
   re-draft via `pipeline.lock.json`.
6. **PR** — commit `guides/<slug>/` + matching `retro/runs/*-<slug>.json`,
   push `guide/issue-<N>-<slug>`, open or **update** the PR titled
   `guide: <provider>`. Draft while awaiting scope / unconverged; mark ready
   for review when converged (resume flips draft↔ready as needed).
7. **Comment** — **Scope check** (awaiting scope) or **Pipeline review**
   (full draft) on the issue + PR body. Awaiting scope also sets
   `guide:blocked`.
8. **Hard failure** — `guide:blocked` + comment (includes review summary when
   a run record exists).
9. **Always** — remove `guide:in-progress`.

CLI exit `0` (converged), exit `2` (unconverged / blocked / failed with files),
and exit `3` (awaiting_scope — research written, no draft) all open a PR.
Hard failures (exit `1`, missing artifacts) take the blocked path with no PR.

### What v1 does not do

- No queued/promote state machine, no `guide:review` auto-label on the PR.
- No LLM judge for the scope gate (keyword heuristic only — material vs soft).
- Distill `needs_clarification` and the post-research scope gate are the
  intentional stops before / mid heavy pipeline.

## Related

- [`README.md`](README.md) — short how-to (issue flow + local CLI)
- [`doctrine/constitution.md`](doctrine/constitution.md) — agents never commit (I7); the Action does
- [`retro/notes/`](retro/notes/) — human signal for `/tune-pipeline` after factory runs
