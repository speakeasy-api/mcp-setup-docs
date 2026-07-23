# Guide draft factory

Turn a GitHub issue into a draft MCP Setup Guide PR. Same Cursor SDK pipeline
as `mise run draft-guide` / `npm run draft-guide`, driven by a label instead of
a local CLI.

Workflow: [`.github/workflows/guide-draft.yml`](.github/workflows/guide-draft.yml).  
Implementation notes: [`docs/agents/guide-factory.md`](docs/agents/guide-factory.md).

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
| `guide:blocked` | Distill unclear, hard failure, or refused (set by the Action) |

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
2. **Pipeline review** — numbered decisions (blockers), open questions, optional nits. Written so you can answer without reading the whole guide.
3. A **draft PR** on branch `guide/issue-<N>-<slug>` (`Closes #<issue>`), including when the pipeline is **unconverged** (title/body say so). Human review still required before merge.

Persona defaults to `it-admin` unless distill confidently picks another file under `docs/personas/`.

## When the pipeline asks for a decision

Reply on the **issue** (preferred) using the templates from the Pipeline review comment, for example:

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

That includes retries after **unconverged** runs — as long as the earlier run opened the PR. (Runs that never produced files have nothing to resume from.)

## Outcomes

| Result | What happens |
| --- | --- |
| Converged | Draft PR; Pipeline review may still list open questions / nits |
| Unconverged | Draft PR anyway (marked unconverged); decide on blockers, then re-label |
| Distill unclear | `guide:blocked` + comment; clarify server, re-add `guide:draft` |
| Hard failure | `guide:blocked` + comment + Actions link; no PR |

A non-factory open PR that already `Closes #<issue>` (collaborator-authored) blocks the factory so it does not overwrite human work — close or finish that PR first.

## Local equivalent

```bash
export CURSOR_API_KEY=cursor_...
cd scripts/cursor-sdk && npm install
npm run draft-guide -- asana --overwrite --notes "drop secret-reset recovery branch"
```

Factory adds issue distill, labels, PR open/update, and Pipeline review comments around that same CLI.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Label added, no Actions run | Workflow YAML invalid on `main`, or label was already on the issue (remove + re-add) |
| Run skipped immediately | Event was a different label (`guide:blocked` etc.) — only `guide:draft` starts the job |
| “Refused to run” + existing PR | That PR is not a `guide/issue-<N>-*` factory branch |
| Resume feels like a full rewrite | No prior factory PR / files; or clarifications forced research to change materially |

## Related

- [`docs/agents/guide-factory.md`](docs/agents/guide-factory.md) — step-by-step Action internals  
- [`docs/agents/constitution.md`](docs/agents/constitution.md) — agents never commit (I7); the Action does  
- [`retro/notes/`](retro/notes/) — human signal for `/tune-pipeline` after factory runs
