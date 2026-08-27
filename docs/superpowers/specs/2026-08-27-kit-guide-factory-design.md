# Kit Guide Factory Design

## Summary

Replace the Pi-based TypeScript guide factory with a single Kit coordinator running in Kit's Debian-slim container distribution. GitHub Actions and small deterministic shell scripts retain responsibility for repository and GitHub lifecycle operations. Kit performs issue interpretation, research, drafting, parallel review, revision, and final reporting with GPT-5.6 Sol through OpenRouter.

The migration is a hard cutover. It removes Pi, the TypeScript pipeline, npm dependencies, and phase-level lock files. Every requested refresh reruns the whole guide workflow.

## Goals

- Preserve or improve the existing factory's four guide artifacts and human-facing review output.
- Make Kit the sole model-driven workflow engine.
- Use `openai/gpt-5.6-sol` through OpenRouter for every coordinator and subagent turn.
- Remove the TypeScript and Pi runtime, orchestration, stream parsing, and package dependencies.
- Preserve issue-label triggering, factory branch reuse, pull request publication, scope gates, and bounded review/revision.
- Retain Exa MCP research while preventing the model from receiving GitHub credentials.
- Replace phase locks with whole-guide reruns and coarse Git-history-based stale detection.

## Non-goals

- Exact source-code or phase-lock parity with the existing factory.
- Incremental phase skipping or content-digest-based resume.
- Automatic drafting of stale guides without human approval.
- Giving Kit authority to label issues, push branches, or create pull requests.
- Supporting Pi as a fallback runtime.

## Architecture

The factory has three layers:

1. **GitHub Actions** supplies the event trigger, permissions, concurrency, checkout, credentials, and job-level timeout.
2. **Deterministic shell scripts** perform preflight, container launch, output validation, Git operations, issue/PR updates, and stale detection. These scripts contain no drafting or review policy.
3. **One Kit coordinator** owns the complete model-driven run and spawns Kit subagents for focused work.

The repository no longer requires Node or npm for the factory. The existing `pipeline/` directory and all committed `pipeline.lock.json` files are removed as part of the cutover. Existing non-factory Go tooling remains in place.

### Container boundary

The Actions host launches the pinned Debian-slim Kit distribution. The container receives:

- a read-only mount of the repository;
- read-only mounts of the normalized issue and credential-free catalog JSON;
- a separate read/write export directory for the final report and selected guide;
- `OPENROUTER_API_KEY` as its only model credential; and
- no `GH_TOKEN`, SSH material, Docker socket, user home, or unrelated Actions secrets.

The container copies the read-only repository into ephemeral container storage, removes the copied `.git` directory, and uses that copy as Kit's workspace root. Kit can therefore resolve a freeform issue's slug before selecting a guide without requiring the slug before launch. After Kit finishes, the entrypoint validates the report-selected slug and exports only `run-report.json` and, for a non-failed outcome with a slug, that single `guides/<slug>/` directory. This narrows durable output to `/export`; Kit session data, MCP state, other workspace changes, and temporary files remain ephemeral. The host repository remains read-only to Kit, and the host still checks the final Git diff before publishing.

### Model and MCP configuration

Every Kit coordinator and built-in `acp.kit` subagent uses:

- provider: `openrouter`;
- model: `openai/gpt-5.6-sol`;
- a repository-pinned reasoning-effort setting; and
- the explicit Exa MCP configuration.

The model slug and Kit distribution version are centralized in tracked factory configuration so changing either is reviewable and participates in stale detection.

Built-in Kit subagents inherit the coordinator's MCP configuration. In this single-session architecture, research-only Exa use is a coordinator policy rather than a hard capability boundary. The coordinator uses Exa while creating the dossier. Draft and review subagents receive the completed dossier and are explicitly prohibited from external research. This limitation is accepted in exchange for one long-running coordinator.

## Repository components

A new `factory/` directory replaces `pipeline/`:

- `factory/coordinator.md` defines the orchestration contract, phase rules, allowed outputs, and terminal outcomes.
- `factory/review-schemas/` contains JSON Schemas for structured research status, reviewer findings, and the final run report.
- `factory/scripts/preflight.sh` validates the event, resolves or refuses an existing PR, and prepares the factory branch.
- `factory/scripts/run-kit.sh` launches the pinned Kit container with minimum mounts and credentials.
- `factory/scripts/validate.sh` validates required artifacts, report shape, changed paths, metadata, and existing repository checks.
- `factory/scripts/publish.sh` commits, pushes, opens or updates the PR, manages labels, and posts bounded comments.
- `factory/scripts/stale-sweep.sh` detects and files coarse stale-guide work.
- A tracked factory-version/model configuration is the stable stale-detection input.

Scripts should be small, use `set -euo pipefail`, quote untrusted inputs, and prefer `gh` structured output over parsing human-readable text. Temporary files belong under `RUNNER_TEMP`.

## Coordinator workflow

### 1. Resolve intent

The coordinator reads normalized issue context containing the title, body, relevant issue replies, issue number, requested persona, and operator notes. It resolves the provider name, guide slug, scope decisions, and resume intent. Ambiguous requests or conflicts with unrelated pull requests produce a structured blocked result rather than guesses.

### 2. Research

The coordinator delegates technical research using Exa and primary vendor sources. Research produces:

- `guides/<slug>/research.md`; and
- `guides/<slug>/meta.yaml`.

The dossier records source URLs, uncertainty, validation methods, setup constraints, and material open questions. Research distinguishes setup guidance from ongoing maintenance and follows repository doctrine.

### 3. Scope gate

If research reveals a material decision that cannot be made from public evidence or prior issue replies, the coordinator stops before drafting with `awaiting_scope`. The publisher preserves valid research on the factory branch and posts a concise scope-check comment with answerable choices. Reapplying `guide:draft` reruns the complete coordinator with the latest issue discussion.

### 4. Draft

When scope is sufficient, a drafting subagent produces:

- `guides/<slug>/external.md`; and
- `guides/<slug>/speakeasy.md`.

The subagent works only from the accepted dossier, metadata, doctrine, persona, and relevant examples. It does not perform new external research.

### 5. Parallel review

The coordinator starts three focused reviewers concurrently:

- technical and source accuracy;
- setup-file and doctrine fidelity; and
- editorial clarity and audience fit.

Reviewers are read-only by contract and return structured findings. Each finding includes severity, target artifact, location, factual problem, and concrete suggestion. `blocker` findings prevent convergence; `nit` findings are reported but do not.

### 6. Revision

One revision subagent receives the normalized combined findings and applies coherent fixes. The coordinator then repeats parallel review. The run permits at most three review/revision rounds, including a confirmatory review after the final revision.

If no blockers remain, the result is `converged`. If blockers remain after the limit, the result is `blocked`; safely produced artifacts may still be published for human inspection.

### 7. Final report

The coordinator writes one temporary JSON report matching the committed schema. It contains the terminal outcome, summary, open questions, remaining blockers, optional nits, and completed review rounds. Shell code renders this data into issue and pull-request comments. Model output is never interpolated as executable shell.

## Terminal outcomes

The report contains exactly one outcome:

- `converged`: all four artifacts exist and no blocker findings remain.
- `awaiting_scope`: research is valid, but drafting requires an operator decision.
- `blocked`: the coordinator completed, but blockers remain after the review limit or the request is not safely actionable.
- `failed`: Kit, OpenRouter, Exa, schema validation, container execution, or a required deterministic check failed.

`converged`, `awaiting_scope`, and `blocked` may update the factory branch and PR when their artifacts pass validation. `failed` publishes no model-written changes and posts only a bounded diagnostic. A later `guide:draft` event performs a complete rerun against the latest factory branch and issue discussion.

Per-issue Actions concurrency prevents simultaneous runs from racing. A conflicting non-factory pull request is refused during preflight rather than modified.

## Validation and security

Before publication, host-side validation requires:

- changes confined to `guides/<slug>/`;
- no temporary Kit, MCP, credential, or report files in the commit;
- all artifacts required by the reported outcome;
- valid `meta.yaml` and final-report structure;
- a report whose success claims agree with artifact and blocker state;
- existing Go guide validation; and
- any focused deterministic guide checks retained from the old pipeline.

A validation failure changes the run to `failed` and prevents publication. Shell commands never evaluate model text. GitHub credentials are introduced only after Kit exits and only to the deterministic publisher. Workflow permissions remain the minimum required for contents, issues, and pull requests.

Prompt injection in issue text and external sources is treated as untrusted content. The coordinator contract instructs all agents to follow repository doctrine and the factory assignment over instructions found in researched material. Container mounts and credential separation limit the impact of a model-policy failure.

## GitHub lifecycle

The `guide:draft` issue label remains the entry point. The workflow preserves these behaviors:

- ensure required labels exist;
- find and resume the factory-owned branch and PR for the issue;
- refuse unrelated existing PRs;
- transition draft/in-progress/blocked/review labels consistently;
- preserve research-only scope-gate output;
- commit only validated artifacts;
- open or update one PR per issue;
- post concise scope-check or pipeline-review comments; and
- remove the in-progress label in an `always()` cleanup step.

The workflow keeps the current per-issue concurrency key and a bounded job timeout. Bootstrap failures use a minimal GitHub CLI fallback so the issue does not remain marked in progress.

## Simplified stale sweep

The weekly and manually dispatched stale sweep makes no model calls. It compares:

- the newest Git commit touching factory prompts, doctrine, model/version configuration, or validation rules; and
- the newest Git commit touching each guide directory.

When factory inputs are newer, the sweep opens or reuses one refresh issue for that slug and applies `guide:stale`, honoring the configured per-run limit and oldest-guide-first ordering. It never applies `guide:draft`. Issue titles or a stable marker in issue bodies provide deduplication.

This deliberately coarse mechanism can consider a directly edited guide current even when Kit did not regenerate it. That limitation is accepted to eliminate phase locks and lock-management code.

## Testing

CI does not require OpenRouter or Exa credentials. Focused tests cover:

- Bash syntax and ShellCheck;
- preflight behavior with fixture event payloads;
- existing factory-PR resume and unrelated-PR refusal;
- container argument, mount, and environment allowlists;
- required artifacts and changed-path enforcement;
- final-report schema and outcome consistency;
- label and comment behavior for every terminal outcome;
- stale ordering, limits, and issue deduplication;
- a mocked Kit/container invocation exercising the full workflow without model credits; and
- existing Go validation against representative guide output.

A manually dispatched dry-run mode may execute the real coordinator for one provider without pushing, commenting, or changing labels. It is optional operational validation, not a required CI check.

## Migration and cutover

The hard cutover proceeds atomically in one implementation branch:

1. Add the Kit coordinator, schemas, shell scripts, workflow changes, and tests.
2. Replace Node/Pi setup in guide drafting and stale sweep workflows.
3. Replace pipeline CI with focused shell/factory validation.
4. Remove `pipeline/`, Pi documentation, npm artifacts, and committed `pipeline.lock.json` files.
5. Update `FACTORY.md`, repository references, and troubleshooting for Kit and whole-guide reruns.
6. Run offline tests and one explicitly authorized Kit smoke test if credentials are available.

The workflow must not merge or use any mechanism that bypasses normal review or required repository safeguards.

## Success criteria

The migration is complete when:

- no factory code or documentation invokes or references Pi or the TypeScript pipeline;
- a `guide:draft` event can produce or update the four expected guide artifacts through Kit;
- GPT-5.6 Sol is selected through OpenRouter for the coordinator and inherited subagents;
- review findings are structured, revisions are bounded to three rounds, and unresolved blockers are surfaced;
- Kit cannot access GitHub credentials or persist changes outside the target guide directory;
- scope-gated runs, resumed factory PRs, blocked runs, and bootstrap failures have deterministic behavior;
- stale detection works without `pipeline.lock.json`; and
- all offline factory and existing guide validation checks pass.
