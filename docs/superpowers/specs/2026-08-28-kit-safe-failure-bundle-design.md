# Kit Safe Failure Bundle Design

## Purpose

Make failed `guide:draft` runs diagnosable after GitHub Actions finishes without preserving or publishing raw Kit transcripts, prompts, tool arguments, tool outputs, URLs, environment values, credentials, provider bodies, source chains, or workspace contents. The downloadable artifact must show ordered tool lifecycle, success/failure, duration, top-level invariants, and a deterministic post-mortem classification.

## Key decision

Use pinned Kit `v0.1.98`'s opt-in `KIT_RUNTIME_EVENTS` side channel rather than parsing durable transcripts. Kit emits marked JSON lines for hidden `compose` children, including start/finish, tool name, success, and duration. Those source events also contain unsafe summaries and call/session identifiers. A streaming repository-owned projector must consume them inside the container, discard unsafe fields immediately, and emit only the schema below. Raw marked lines must never reach Actions logs, an artifact, or a persistent file. Durable Kit transcript files must never be opened or uploaded.

## Scope

The first implementation covers failed runs that reach `factory/scripts/run-kit.sh`, including Docker build failure, container/Kit failure, missing or invalid run reports, and model-reported `failed` outcomes. Earlier workflow bootstrap/preflight failures keep their existing minimal reporting and do not receive a synthetic tool trace.

A successful run may create diagnostics transiently, but GitHub uploads diagnostics only when the job fails. Artifact retention is seven days. Repository access controls govern download; diagnostics are never attached to the public issue or PR.

## Runtime-event projection

`factory/scripts/project-kit-events.sh` reads Kit stderr as a stream. Ordinary, unmarked stderr is forwarded unchanged. Lines beginning with Kit's exact control-character marker are never forwarded. Every marked line must parse as one supported Kit runtime event with the pinned v0.1.98 field types; malformed or unknown marked events invalidate the projection. The projector continues draining its input to prevent a producer deadlock, removes partial output, and exits nonzero.

The projector assigns each raw child call ID a run-local integer `call_ref` in first-seen order and never emits the raw ID. `session_started` is ignored. Compaction events are ignored because they have no child call identity and do not help diagnose factory operations. Child summaries are never read into output.

Each projected event has exactly:

```json
{
  "sequence": 1,
  "call_ref": 1,
  "event": "started",
  "tool": "shell",
  "operation": "inspect_inputs",
  "success": null,
  "duration_ms": null
}
```

- `sequence`: positive, contiguous integer in projected order.
- `call_ref`: nonnegative integer; `0` is reserved for the host-created `kit_prompt` lifecycle.
- `event`: `started` or `finished`.
- `tool`: one of `kit_prompt`, `shell`, `edit`, `subagent`, `prompt`, `fork`, `close`, `a2a`, `docs`, `skill`, `tool_search`, `tool`, `auth`, or `unknown`. Unknown source tool names become `unknown`; their original text is discarded.
- `operation`: a bounded enum. Known shell summaries are classified by exact anchored command patterns into `inspect_inputs`, `inspect_guide_context`, `inspect_guide_artifacts`, `lint_guide`, or `validate_report`. Other shell calls become `unrecognized`. Non-shell tools map to their allowlisted tool enum. The top-level operation is `kit_prompt`.
- `success`: null on start and boolean on finish.
- `duration_ms`: null on start and a nonnegative bounded integer on finish.

The projector may inspect an unsafe summary only to compare it against exact anchored known-command patterns. It must never interpolate, hash, log, or emit that value.

## Diagnostic manifest

`factory-diagnostics.json` has exact top-level keys:

```json
{
  "schema_version": 1,
  "kind": "guide_factory_diagnostics",
  "status": "failed",
  "stage": "kit_prompt",
  "classification": "missing_run_report",
  "report": {
    "exists": false,
    "valid": false,
    "outcome": null,
    "review_rounds": null
  },
  "events": [],
  "kit_errors": {"schema_version": 1, "records": []}
}
```

Allowed `stage` values are `docker_build`, `container_run`, `kit_prompt`, `report_validation`, and `factory_outcome`. Allowed classifications are `docker_build_failed`, `container_run_failed`, `kit_fatal`, `kit_prompt_failed`, `missing_run_report`, `invalid_run_report`, `factory_reported_failure`, and `unknown_failure`. Classification is deterministic and never contains an error message.

`report` contains only existence, validity, validated outcome, and review-round count. It never copies report summaries, blockers, nits, open questions, provider, persona, or slug. `kit_errors` is the existing strictly projected and recursively host-validated safe Kit error summary; its allowlist does not change. `events` contains only validated runtime projections.

## Capture and failure behavior

`container-entrypoint.sh` creates a FIFO, starts the projector as its consumer, sets `KIT_RUNTIME_EVENTS=1`, and runs Kit with stderr connected to the FIFO. It waits for both Kit and projector. Ordinary diagnostics remain visible; unsafe runtime lines are suppressed.

The entrypoint adds safe `kit_prompt` start/finish events with `call_ref: 0`. It then evaluates report existence and validation. Before any exit it attempts to assemble and validate the diagnostic manifest and atomically copies it to `/export/factory-diagnostics.json`. If event projection or manifest validation fails, no diagnostic manifest is exported. Diagnostic generation must never turn a failed Kit run into success or a successful Kit run into a published guide when normal invariants fail.

`run-kit.sh` removes stale diagnostics before Docker build/run. On a Docker build or pre-container failure, it creates a minimal host diagnostic with no child events. For container output, it recursively validates the exact manifest before preserving it. Invalid diagnostics are deleted and never logged or uploaded. Host logs may print only classification, stage, and event count.

## GitHub Actions artifact

After `Run Kit`, an `if: failure() && steps.kit.outcome == 'failure'` step uploads exactly the validated `factory-diagnostics.json` using `actions/upload-artifact@v4` with:

- Name: `guide-factory-diagnostics-${{ github.run_id }}-${{ github.run_attempt }}`
- Retention: 7 days
- Missing file behavior: ignore, because fail-closed projection may intentionally produce no bundle
- No hidden files and no directory upload

The existing issue failure comment remains minimal and links to the workflow run. It must not inline artifact content. An operator or coding agent can retrieve the artifact with `gh run download <run-id> --name <artifact-name>`.

## Post-mortem use

No paid model call is part of diagnostics. The deterministic `classification` handles common failures. A human or coding agent may later inspect the validated artifact and reason from event order. In particular, a `kit_prompt` success followed by `report.exists: false` classifies as `missing_run_report`; a started child with no finish event reveals incomplete child work without exposing its prompt.

## Security invariants

- Never upload raw transcripts, raw runtime-event lines, stderr, prompts, responses, summaries, arguments, outputs, commands, URLs, source content, workspace files, environment data, credentials, request bodies, response bodies, raw error messages, session IDs, or raw call IDs.
- Keep OpenTelemetry message capture disabled; this design does not require an OTLP collector.
- Validate exact keys, enums, scalar types, array bounds, contiguous sequence numbers, call lifecycle consistency, and the existing exact Kit fatal schema.
- Cap events at 512 and duration at 3 hours; overflow invalidates the bundle.
- Use atomic writes and remove raw/partial temporary state on every exit.
- Adversarial fixtures must place secret canaries in every discarded runtime field and prove they do not appear in projected output, host logs, or uploaded paths.

## Verification

Offline tests cover successful and failed child calls, concurrency/interleaving, unknown tools, known and unrecognized shell operations, malformed marked lines, extra keys, secret canaries, missing finishes, event and duration caps, stale bundles, Docker-build synthesis, report classifications, and workflow artifact retention/conditions. The full factory suite, ShellCheck 0.10.0, actionlint 1.7.7, and `git diff --check` must pass. No paid OpenRouter/Exa call or real Pulse credential is used.
