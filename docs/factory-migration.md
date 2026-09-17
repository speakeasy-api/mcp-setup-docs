# Guide factory migration: decisions and acceptance

Current record for PR #208, consolidating seven superseded migration plans.
Their historical task lists and private evidence locations are intentionally
omitted. Pre-existing unrelated plans remain untouched.
See [FACTORY.md](../FACTORY.md) for operation and troubleshooting.

## Architecture

- One issue triggers one Action run, retaining issue normalization, catalog,
  labels, publisher, atomic run reports, outcome schemas and normal PR checks.
- Preserve per-issue concurrency and `cancel-in-progress: false`; the two-guide
  limit applied to local experiments, not production concurrency.
- A controller-owned Go executable runs inside the existing model container.
  `factorycontroller` owns workflow/Kit CLI transport; `factoryrun` owns lifecycle.
  The outer host owns deadlines, cleanup, finalization and installation.
- The container entrypoint invokes `guide-factory`. Models return findings and
  bounded decisions, not orchestration programs. Keep one active workflow.
- Use the existing Go 1.27 module and pinned Kit 0.2.2 runtime, source
  `bf347453982d0d62f57d4f4c38d2541537f967f9`, with the verified official image.
  No Kit changes, ACP integration or generic workflow framework are required.
- Titus v1.2.9 supplies transcript detection in the existing module, replacing
  the original proposal for a separate sanitizer module/build stage.
- Host-controlled scheduling supersedes the initial standalone research
  supervisor and interim model-owned scheduling, not their safety requirements.

## Research and writing

- Keep [the research prompt draft](research-prompt-draft.md) byte-identical as
  the reference/test contract. The active operational prompt is
  [factory/coordinator.md](../factory/coordinator.md).
- Assemble exact common/topic/follow-up instructions and ordered inputs in
  code; models must not copy/rewrite dispatch text. Privately record document
  and prompt hashes, topic, follow-up index and actual dispatched text.
- Topic 5 establishes a supported remote MCP endpoint before Topics 1–4 run
  concurrently. No particular HTTP transport is mandatory. Missing evidence
  is unresolved, not proof that the service is unsupported.
- Select create/update by confidently matched identity, not the request verb.
  Refuse ambiguous identity, traversal, unrelated collisions and duplicates.
- Existing guide identity metadata may select a destination. Existing guide
  instructions and representative examples are not fresh research inputs.
- Research agents return findings only. Consolidate one canonical dossier with
  sources, conditions, actors, procedural detail and STE requirements.
- Inspect official `speakeasy-api/gram` implementation/tests narrowly when
  client docs cannot answer necessary compatibility questions. Share consistent
  commit-pinned evidence rather than routinely researching the entire repo.
- Reuse original sessions for at most two follow-up rounds. Resolve auth
  selection before the final Topic 1 authority audit; reserve audit capacity.
  Material gaps or an unavailable audit stop writing.
- Preserve complete reports and safe partial findings on failure. Incomplete
  research gets a short issue explanation/run link, never a guide PR.
- Save the completed dossier before signaling begin-writing exactly once.
- Exactly one writer receives dossier, destination/mode, persona and doctrine.
  No new research, replacement writer or automated editorial reviewer loop.
- Write only `research.md`, `meta.yaml`, `external.md` and `speakeasy.md` in the
  selected guide. Preserve unrelated files and guides.
- Permit one same-session repair for deterministic validation errors, then
  revalidate. A second failure withholds publication.
- Exclude credential renewal/rotation procedures, not initial refresh-token
  acquisition. Zero automated editorial review rounds is intentional.

## Sessions and evidence transport

- One joined Kit process per turn uses the same HOME and physical workspace.
  Require successful exit, bounded output and a valid terminal runtime ID.
- Persist session identities only from successful runtime output, never model
  JSON. Resume must match stored identity; prevent overlapping topic turns.
- No automatic replay of failed/ambiguous turns, force-resume, inferred identity
  from failed logs, or continuation using model-supplied replacement IDs.
- Preserve inherited model/provider settings; no invented per-topic overrides.
- Preserve full reports through private bounded file/chunk reads, not lossy
  stdout summaries. Structured decisions stay small and schema-validated.
  Factual blocking is distinct from execution failure.
- Private prompts/outputs/records are sanitizer inputs, never raw upload targets.
  Validate physical paths, reject symlinks/traversal, bound reads and outputs,
  use restrictive permissions and atomic records.
- Failed initial turns may leave native evidence without a resumable ID; keep
  it for safe host export rather than automatically starting another session.

## Deadlines and cleanup

- Host monotonic clocks allow research 1800 seconds, writing/repair/validation
  900 seconds, outer model-container ceiling 2700 seconds and finalization
  300 seconds. The 15-minute research target is not the hard limit.
- Research starts before context resolution/model launch; build and input prep
  are outside it. Writing requires a saved dossier and accepted atomic, bounded,
  run-specific phase signal. The signal is not proof of factual correctness.
- No retry, resumed call, child task, duplicate signal or model timestamp resets
  a clock. Unused research time cannot extend the writing allowance.
- Reject expired transitions/completions. Deadline failure is sticky: late
  success, stale reports and old guide files cannot reverse host failure.
- On expiry/crash/invalid lifecycle state, terminate/remove only the owned
  container. Cooperative or process-group cancellation alone is insufficient.
  Confirm container writers stopped before final export and validation.
- Preserve unrelated host services. Finalization is bounded and model-free.
  Crash paths generate a fixed-content failed report for issue reporting;
  report copying must not depend on successful runner exit.

## Security and publication

- Issue text and researched pages are untrusted data, never shell code or
  authority to change instructions or bypass repository safeguards.
- Preserve read-only repo/input mounts, private workspace/HOME and non-root
  ownership. Agents get no GitHub token, Docker socket or arbitrary host mount.
  The runtime is not a filesystem sandbox; mount/path validation is necessary.
- Only deterministic host scripts commit, push, label and manage PRs. Preserve
  review, required checks and branch protection without bypasses.
- Runtime model credentials still exist: keeping them out of prompts does not
  make raw tool/error logs safe. Local mode ignores host GitHub/Pulse secrets.
- Persist private evidence outside the disposable container. Export allowlisted
  content from validated paths, not raw stdout/stderr, credential stores or
  private telemetry.
- Decode supported text fields and independently redact exact runtime secrets.
  Redact every occurrence of Titus captured values, not only reported offsets;
  account for repeated and escaped representations.
- Never enable live credential validation or publish scanner findings/matches.
  Nil scan error alone is insufficient; matcher warnings/timeouts fail closed.
- Reuse the sanitizer across fields and rescan final serialized output. Bound
  sources to 1 MiB and final readable output to 2 MiB with a process deadline.
  Findings, warnings, errors or incomplete scans withhold readable output.
- Sanitized readable success/failure transcripts have seven-day Actions
  retention. Label partial exports. Metadata-only transcripts and safe
  diagnostics are fallbacks; raw logs are never a fallback.
- Sanitizer failure does not erase a valid research outcome, but cannot count
  as readable-export success. Record diagnostics failure separately.
- Freeze artifacts after model/container termination. Host checks report/outcome
  consistency, exact artifacts, metadata, lint and changed-path confinement.
  Reject stale identities/reports and candidate bytes differing from the freeze.
- PR creation/update requires validated frozen export AND successful readable
  artifact upload. Failure withholds publication and attempts an issue comment
  with the workflow link. Never trust model-controlled artifact URLs.
- Local installation uses a fresh host identity and explicit no-PR validation.
  Install only bytes matching frozen export; do not fabricate upload outputs.
  Local success does not satisfy the separate PR upload gate.

## Recorded acceptance and caveats

The historical record reports successful **local-only Okta acceptance** at
`b7aa263`. This documentation consolidation did not rerun paid model work or
inspect private evidence. Earlier blocked trials/offline replays were not live
acceptance; no private evidence paths or raw transcripts are retained here.

- Validated outcome: `converged`, no blockers/open questions, matching host
  diagnostic identity and `host_reason: none`.
- `publication_ready: true` was a frozen acceptance result, not publication.
- Exactly four installed Okta guide files matched the retained sanitized
  snapshot byte-for-byte. Fresh lint returned `[]`, exit 0; no guide artifact
  was silently redacted or rewritten.
- Readable evidence: 11 sessions, 784073 bytes, explicitly partial because
  metadata/unselected files and unsafe selected text were omitted by policy.
  This is not proof of full raw-session coverage or universal secret detection.
- Original clocks held: research 1736497 ms, writing 377860 ms, finalization
  8488 ms. All 13 baseline services survived, with zero added containers.
- The record reports an earlier shell suite passing 33/33 and latest full Go
  suite, controller vet and connected chunk/export/frozen checks passing.
  These are historical results, not checks rerun by this documentation change.
- No push, PR, Actions trigger, upload or merge occurred. Generated local Okta
  artifacts were left for review, not included in this decision record.
- Authorized production Action/publication acceptance remains separate from
  local acceptance. Paid runs require approval; this record grants none.

See [shared doctrine](../doctrine/shared.md) for authoring rules.
