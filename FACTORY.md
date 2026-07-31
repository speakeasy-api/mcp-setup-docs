# Guide draft factory

Turn a GitHub issue into a draft MCP Setup Guide PR. Same drafting pipeline
as `mise run draft-guide` / `npm run draft-guide`, driven by a label instead of
a local CLI.

Workflow: [`.github/workflows/guide-draft.yml`](.github/workflows/guide-draft.yml).  
Action/contract detail: [Action internals](#action-internals).

## One-time setup

### Secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Required? | What it is |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | **Yes** | OpenRouter API key (openrouter.ai → Keys) |
| `AGENT_PAT` | Recommended | PAT with contents + issues + pull requests write on this repo. Falls back to `GITHUB_TOKEN` (PRs still work; label chaining is less reliable). |
| `PULSE_REGISTRY_KEY` | Recommended | PulseMCP Sub-Registry API key — resolves Speakeasy MCP Catalog presence before research. Without it, `speakeasy_add_server: auto` guides keep both catalog/custom paths unless remotes are tenanted or the guide forces `custom-remote` / `catalog`. |
| `PULSE_REGISTRY_TENANT` | Recommended with key | PulseMCP tenant slug (e.g. `gram-recommended`). Required together with the key for catalog lookup. |

Local `mise run draft-guide` uses the same env names (`PULSE_REGISTRY_KEY`, `PULSE_REGISTRY_TENANT`, optional `PULSE_REGISTRY_URL`) — typically from gitignored `mise.local.toml`, same as `mise run pull-catalog`.

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

Runs can take a long time (often 20–40+ minutes). Usage burns OpenRouter credits.

### What you get

1. **Resolved as `slug`…** — distill figured out which server / persona / notes.  
   On a retry: **Resuming on existing factory PR…** (or **Resuming on factory branch…** if the branch was pushed but PR create flaked).
2. Sometimes **Scope check** — research finished with *material* open questions (recovery path, conflicting docs, etc.). Drafting pauses; answer with `Decision N: …`, then re-add `guide:draft`. Soft OQs (UI silence already hedged; catalog presence only when Pulse lookup was skipped or ambiguous) do **not** pause.
3. **Pipeline review** — after a full draft run: **Render fixes** (setup-file fidelity; Dossier already has the wording — reply `apply` / `override`), **Decisions** (research/meta/achievability gaps — verified / drop / hedge), open questions, optional nits. Written so you can answer without reading the whole guide.
4. A PR titled **`guide: <provider>`** on branch `guide/issue-<N>-<slug>`
   (`Closes #<issue>`). It stays a **draft** when the run needs a human reply
   (awaiting scope or unconverged); **converged** runs open ready for review.

Persona defaults to `it-admin` unless distill confidently picks another file under `doctrine/personas/`.

## When the pipeline asks for a decision

Reply on the **issue** (preferred) using the templates from the **Scope check** or **Pipeline review** comment, for example:

```text
Decision 1: apply
Decision 2: drop this branch
Decision 3: verified — confirm button is "**Reset secret**"; new secret appears under **Credentials**
```

Use `apply` for **Render fixes** (fidelity on `external.md` / `speakeasy.md` when research already has the fact). Use verified / drop / hedge for scope or research gaps.

Or edit the issue body with the same facts. You do **not** need to paste the guide.

Then:

1. Remove `guide:draft` if it is still present, **or** leave it off.
2. Add **`guide:draft` again** (the `labeled` event only fires when the label is newly applied).

Distill re-reads the issue body **and** the comment thread into pipeline notes.

### Resume (not a full restart)

If a factory draft PR already exists (`guide/issue-<N>-*`), **or** only the remote factory branch exists (push succeeded, PR create flaked):

- The next run checks out **that branch**.
- Prior `research.md` / `external.md` / `speakeasy.md` / lock stay on disk; research revises in place.
- An existing PR is **updated**; if there is no PR yet, one is opened from the branch.

That includes retries after **awaiting scope**, **unconverged**, or a failed PR-open step — as long as the earlier run pushed the factory branch. (Runs that never produced files have nothing to resume from.)

`gh pr create` / `gh pr edit` also retry transient GitHub GraphQL / 5xx errors in-run before giving up.

## Outcomes

| Result | What happens |
| --- | --- |
| Converged | Ready-for-review PR (`guide: <provider>`); Pipeline review may still list open questions / nits |
| Awaiting scope | **Draft** PR (research only); **Scope check** + `guide:blocked`; answer Decisions, re-label |
| Unconverged | **Draft** PR; decide on blockers, then re-label |
| Distill unclear | `guide:blocked` + comment; clarify server, re-add `guide:draft` |
| Hard failure | `guide:blocked` + comment + Actions link; no PR |
| PR create flake after push | Branch is on remote; comment says so — re-add `guide:draft` to resume and open the PR |

A non-factory open PR that already `Closes #<issue>` (collaborator-authored) blocks the factory so it does not overwrite human work — close or finish that PR first.

## Local equivalent

```bash
export OPENROUTER_API_KEY=sk-or-...
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
| Resume feels like a full rewrite | No prior factory branch / files; or clarifications forced research to change materially |
| Run failed but branch exists, no PR | PR create flaked after push — re-add `guide:draft` (retries + branch resume) |

## Action internals

Label-driven GitHub Action that turns a freeform issue into a draft Guide PR.
Mirrors a Matt Pocock–style factory: label → distill → pipeline → draft PR.
Pipeline agents still never commit (constitution **I7**); the factory CLI
(invoked by the Action) commits, pushes, and opens the PR.

- Workflow (thin step glue): [`.github/workflows/guide-draft.yml`](.github/workflows/guide-draft.yml)
- Factory CLI: `npm run factory -- <command>` in [`pipeline/src/factory/`](pipeline/src/factory/)
- Distill (composed by `factory distill`): `npm run resolve-issue`
- Draft (composed by `factory draft`): `npm run draft-guide`
- Formatters (TS): `format-pipeline-review.ts`, `format-scope-check.ts`
- Pipeline CI (typecheck + tests): [`.github/workflows/pipeline-ci.yml`](.github/workflows/pipeline-ci.yml)

The workflow checks out `main`, installs `pipeline/` deps, then runs factory
subcommands. On resume it switches to the factory branch and merges `main`
(`checkout-resume`) so tooling stays current. If checkout / Node / `npm ci`
fails before preflight, a pure-`gh` **Bootstrap failure fallback** still
clears `guide:draft`, sets `guide:blocked`, and comments (factory CLI may
be unavailable).

### Factory commands

| Command | Role |
| --- | --- |
| `ensure-labels` | Create `guide:*` labels if missing |
| `preflight` | Resume factory PR/branch or refuse human PR → `GITHUB_OUTPUT` |
| `refuse` / `transition-labels` / `cleanup` | Issue label transitions |
| `checkout-resume` / `sync-main` | Resume branch + merge `main` |
| `distill` | Fold issue comments + `resolve-issue` → slug/persona/notes |
| `comment-resolved` | “Resolved as …” issue comment |
| `create-branch` | `guide/issue-<N>-<slug>` (or reuse resume) |
| `draft` | `draft-guide` + exit→outcome mapping |
| `commit-push` | Stage guides + run records; push with lease |
| `open-pr` | Create/update PR (GraphQL retry); draft↔ready |
| `comment-review` | Scope check or Pipeline review on the issue |
| `mark-blocked` | Failure comment + `guide:blocked` |

### Flow

1. **Preflight** — if an open factory PR (`guide/issue-<N>-*`) already
   `Closes #N`, **resume** on that branch. Else if a remote factory branch
   exists with no open PR (push-then-PR-create flake), resume from that
   branch. Refuse only for non-factory collaborator PRs that target the
   same issue.
2. **Labels** — remove `guide:draft` + `guide:blocked`, add `guide:in-progress`.
3. **Distill** — light distill agent reads title + body + issue comments (+
   existing `guides/*` slugs) → structured JSON or `needs_clarification`.
4. **Comment** — “Resolved as `slug` …” (or resume notice) summary.
5. **Draft** — `npm run draft-guide -- <slug> --overwrite --pause-on-scope
   [--notes …]` (no `--force`; lock skips still apply). Before research,
   a deterministic PulseMCP tenant lookup (`PULSE_REGISTRY_KEY` +
   `PULSE_REGISTRY_TENANT`) resolves catalog presence into operator notes
   so research drafts a single add-server path when confident. Remotes
   marked `tenanted: true`, or guide-level `speakeasy_add_server:
   custom-remote`, always force Custom remote (non-registry), even if
   Pulse lists the provider. After
   research, a heuristic scope gate pauses before draft when **material**
   open questions lack `Decision N:` replies in notes (soft OQs do not
   pause). When prior artifacts exist, research revises in place;
   unchanged research can skip re-draft via `pipeline.lock.json`.
6. **PR** — commit `guides/<slug>/` + matching `retro/runs/*-<slug>.json`,
   push `guide/issue-<N>-<slug>`, open or **update** the PR titled
   `guide: <provider>` (retries transient GraphQL / 5xx). Draft while
   awaiting scope / unconverged; mark ready for review when converged
   (resume flips draft↔ready as needed). If there is nothing new to commit
   but the remote factory branch already exists, skip the empty commit and
   still open/update the PR.
7. **Comment** — **Scope check** (awaiting scope) or **Pipeline review**
   (full draft) on the issue + PR body. Awaiting scope also sets
   `guide:blocked`.
8. **Hard failure** — `guide:blocked` + comment (includes review summary when
   a run record exists). If the branch was already pushed, the comment says
   so and points at re-adding `guide:draft` to resume.
9. **Always** — remove `guide:in-progress`.

CLI exit `0` (converged), exit `2` (unconverged / blocked / failed with files),
and exit `3` (awaiting_scope — research written, no draft) all open a PR.
Hard failures (exit `1`, missing artifacts) take the blocked path with no PR.

### What v1 does not do

- No queued/promote state machine, no `guide:review` auto-label on the PR.
- No LLM judge for the scope gate (keyword heuristic only — material vs soft).
- Distill `needs_clarification` and the post-research scope gate are the
  intentional stops before / mid heavy pipeline.

## Runtime facts that are easy to get wrong

The pipeline spawns the `pi` CLI against OpenRouter. Seven things are not
obvious from reading the code, and each one has cost a run:

- **`pi` exits 0 on API errors.** Success is decided by `classifyPiRun`
  (`pi-stream.ts`), never by the exit code. Checking the code reports a guide
  that never generated as one that generated empty.
- **Never edit the repo while a run is in flight.** The I7 tripwire captures its
  baseline *once*, before any agent runs, so a file you touch mid-run is
  indistinguishable from an agent breach and fails the phase.
- **There is no container.** The env allowlist in `pi-guard.ts` and the
  `git status` tripwire in `runtime-pi.ts` are the entire boundary keeping
  secrets out of the agent and the agent inside `guides/<slug>/`.
- **The research phase keeps `bash` deliberately.** `pi` ships no web-fetch
  tool, so `bash` + `curl` is research's only route to provider docs. Removing
  it does not tighten research, it disables it.
- **Session continuity is one flag.** The same `--session <path>` creates the
  session on turn 1 and resumes it on turn 2, which is what lets remediation say
  "use the research you already gathered". `--no-session` breaks that.
- **`model` feeds `input_digest`.** Changing the model slug goes cold on every
  committed lock, so the next run of each guide re-runs every phase.
- **Secrets come from `mise`** via a gitignored `mise.local.toml`. If
  `OPENROUTER_API_KEY` reads empty the shell snapshot is stale — use `mise exec --`.

## Related

- [`README.md`](README.md) — short how-to (issue flow + local CLI)
- [`doctrine/constitution.md`](doctrine/constitution.md) — agents never commit (I7); the Action does
- [`retro/notes/`](retro/notes/) — human signal for `/tune-pipeline` after factory runs
