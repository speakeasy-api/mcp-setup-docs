# Kit guide factory

The factory turns a freeform GitHub issue into the four files under
`guides/<slug>/`: `research.md`, `meta.yaml`, `external.md`, and
`speakeasy.md`. GitHub Actions owns repository and GitHub lifecycle work, small
deterministic shell scripts own validation and publication, and one Kit
coordinator owns research, drafting, review, and revision.

Every trigger reruns the whole guide. There is no phase-level skip state:
existing guide files and issue discussion are inputs, not a checkpoint.

## One-time setup

Add `OPENROUTER_API_KEY` as an Actions repository secret. Create it at
[OpenRouter Keys](https://openrouter.ai/settings/keys). The factory pins Kit
**0.1.98**, selects **GPT-5.6 Sol** as `openai/gpt-5.6-sol` through OpenRouter,
and keeps both selections in [`factory/config.env`](factory/config.env).

Optional Pulse credentials may be configured for the host-side catalog
snapshot. They are not model credentials and are never passed to Kit. Exa is
configured inside the factory for public-web research; no Exa credential is
required by offline CI.

The workflow creates and manages these issue labels:

- `guide:draft` — trigger a run;
- `guide:in-progress` — a run is active;
- `guide:blocked` — operator action or a retry is required; and
- `guide:stale` — the stale sweep recommends a refresh. This label does not
  trigger drafting.

## Draft or refresh a guide

1. Open an issue with a freeform title and body. Include the provider, useful
   documentation URLs, preferences, and prior decisions when known.
2. Apply `guide:draft`.
3. Follow the issue comment and pull request produced by the **Guide draft**
   workflow.

Kit resolves the provider and canonical slug from the complete normalized issue
context. It prefers a matching existing guide and blocks rather than guessing
when identity is ambiguous. One run per issue executes at a time.

A prior factory branch named `guide/issue-<number>-<slug>` and its pull request
are resumed: the workflow syncs the branch with `main`, reruns the complete
guide, and updates that pull request. If an unrelated pull request claims the
issue, preflight refuses to modify it. Reapply `guide:draft` after answering a
scope question or correcting a failure.

### Research boundary

Only technical research may use Exa, and it should prefer primary provider
sources. Writers and reviewers receive the completed dossier and must not do
external research. Built-in Kit agents inherit one coordinator session's MCP
configuration, so this is a coordinator policy rather than a hard per-agent
capability boundary. That single-session limitation is why container, path, and
credential boundaries remain mandatory.

### Outcomes

The validated run report has exactly one terminal outcome:

| Outcome | Operator-visible behavior |
| --- | --- |
| `converged` | All four artifacts pass review and lint. The factory publishes or updates a ready-for-review PR and clears `guide:blocked`. |
| `awaiting_scope` | Valid research found a material question. The factory preserves allowed research output on a draft PR, posts answerable choices, and applies `guide:blocked`. Reply on the issue and reapply `guide:draft`; the next run is a whole-guide rerun. |
| `blocked` | Identity is unsafe to infer or blockers remain after the bounded review rounds. Valid selected artifacts may be preserved on a draft PR and `guide:blocked` is applied. |
| `failed` | Model, container, schema, export, or deterministic validation failed. No model-written changes are published; the issue gets a bounded diagnostic and workflow-log link, and is marked blocked. |

Review uses three focused reviewers (technical accuracy, doctrine fidelity, and
editorial fit), a deterministic linter, and at most three completed review
waves.

## Architecture and security boundary

The Actions host normalizes issue data and obtains a credential-free catalog
snapshot. `run-kit.sh` builds the pinned image, copies the repository to an
ephemeral source snapshot, removes every `.git` entry, and mounts that snapshot
read-only. The container receives only:

- the gitless repository snapshot, read-only;
- normalized issue and catalog JSON, read-only;
- one writable export directory; and
- `OPENROUTER_API_KEY`.

It receives no GitHub token, Pulse secret, SSH material, Docker socket, host
home, or unrelated Actions secret. Kit works in an ephemeral copy. The
entrypoint validates the report-selected slug and exports only
`run-report.json` plus that one selected guide when the outcome permits it.
Session data, MCP state, temporary files, and edits to other paths are not
exported.

After Kit exits, host-side validation checks report/outcome consistency, exact
artifacts, metadata, lint, and that changed paths are confined to the selected
guide. Only then do deterministic host scripts receive GitHub credentials to
commit, push, manage labels, and create or update the PR. Issue text and
researched pages are untrusted data and are never evaluated as shell code.

## Local dry run

A local run uses the same container and validation but does not invoke `gh`,
change labels, create a PR, commit, or push. It deliberately ignores host
GitHub and Pulse secrets and uses a credential-free skipped catalog snapshot.
Validation places a valid selected guide in the local working tree for review.
Model usage is paid, so run it only with approval and an OpenRouter key.

```bash
export OPENROUTER_API_KEY=...
mise run draft-guide -- \
  --title "Refresh Asana guide" \
  --body "Dry-run the Kit factory without publishing" \
  --slug asana
```

The slug form is strict lowercase kebab-case. To replay normalized issue input,
pass a readable JSON path (use `--` for a path beginning with `-`):

```bash
mise run draft-guide -- -- "/path with spaces/issue.json"
```

Lint one or more guides without model use:

```bash
mise run lint-guide -- ../guides/asana
mise run lint-guide -- --json ../guides/asana
```

## Stale sweep

`mise run stale-sweep` is read-only and makes no model call. It compares the
newest Git commit touching factory prompts, doctrine, version/model
configuration, workflows, or validation rules with the newest commit touching
each guide directory, then lists older guides first.

To file at most five deduplicated refresh issues, authenticate `gh`, set
`GH_REPO=owner/repository`, and run:

```bash
mise run stale-sweep -- --create --limit 5
```

Created issues receive `guide:stale`, never `guide:draft`, so a human must
approve each refresh. Detection is intentionally coarse: a direct edit to a
guide advances its Git timestamp and can make it appear current even though Kit
did not regenerate it.

## Troubleshooting

- Open the run linked from the factory's issue comment, or go to
  [Guide draft workflow](.github/workflows/guide-draft.yml) in Actions, and inspect
  the first failing named step.
- **Run Kit** contains image/model execution logs; **Validate export** contains
  report, artifact, lint, and changed-path failures; publication steps contain
  branch, PR, and label failures.
- For `awaiting_scope`, answer the posted choices on the issue before reapplying
  `guide:draft`.
- For ambiguous identity or a conflicting non-factory PR, resolve that conflict
  rather than changing the generated branch manually.
- Offline checks are `bash factory/tests/run.sh`, ShellCheck over
  `factory/scripts/*.sh factory/tests/*.sh`, and `(cd go && go test ./...)`.

See [`factory/coordinator.md`](factory/coordinator.md) for the orchestration
contract and [`doctrine/shared.md`](doctrine/shared.md) for authoring rules.
