# Factory integration design amendment

Status: integration decisions approved in conversation; planning amendment.
implementation tasks and rollout remain pending. Applies to draft PR #208.
This amendment supersedes conflicting timeout/orchestration requirements in the
September 10 plan and research-supervisor amendment. It does not approve ACP
integration, new review loops, or weaker repository safeguards.

## Goal and preserved contracts

One GitHub issue triggers one Action run. Reuse issue normalization, catalog input,
publisher, issue labels, atomic `.factory/run-report.json`, outcome schemas,
success-only installation, and normal PR review/CI. No global concurrency cap:
keep the existing per-issue concurrency group and `cancel-in-progress: false`.
The two-guide limit applied only to local experiments.

Replace the old coordinator, not layer another coordinator over it. The approved
research/writing prompt remains responsible for evidence assessment, endpoint gate,
five topics, authentication selection, final authority audit, and bounded factual
follow-ups. Use deterministic exact-byte prompt assembly. Preserve actual returned
session handles; do not invent generations or assume a failed call advanced one.
No new deterministic research state machine or manifest restating every topic gate.

## Deadline ownership and phase signal

The host, outside the model container, owns monotonic deadlines and termination.
Start its research clock immediately before launching Kit, before context resolution.
Research has 1800 seconds. The coordinator invokes a small begin-writing helper only
after the existing prompt's gates pass and the completed dossier is saved. That helper
records a one-time phase signal. The host switches to a 900-second writing/repair/
validation clock when it accepts the signal. Retries, repeated signals, child tasks,
and resumed calls cannot reset or extend either clock. Unused research time does not
extend the writing allowance. Reject a phase transition received after research expiry.
The host does not use a model-supplied timestamp to grant extra time.

Use an atomic run-specific phase file (at most 256 bytes) containing version, run ID
and writing phase. The helper/host protocol must be atomic, bounded, and idempotent; malformed,
foreign-run or duplicate signals cannot extend time. Exact representation is an
specified in the implementation plan. It signals phase, not independent proof of research truth.
At deadline arbitration, accept a phase transition or completion only while the
current deadline has not expired according to the host monotonic clock. Deadline
failure is sticky; a later success report cannot reverse it. Confirm the model
container has stopped with no remaining container writers before final export or
publication validation.
A fixed outer model-container ceiling of 2700 seconds is a fallback, not a replacement
for the earlier phase deadlines. Image build/input preparation happen before this clock.

Normal `kit prompt` completion ends model work. On phase expiry, crash, or invalid
lifecycle state, fail the run and terminate/remove the owned container. Do not depend
on cooperative Kit cancellation, outer process-group killing, or an agent's report
of success to establish container cleanup. Native tools in separate process groups
must be covered by an actual container-boundary regression. Existing failing supervisor
evidence must not be hidden; adjust its acceptance contract only with that replacement
coverage and explicit documentation. ACP is not required for graceful cleanup.

## Host-owned finalization and readable logs

Persist Kit session storage and research/report records into private run-specific
host storage, not only the container writable layer. Give the agent no GitHub token,
host Docker socket, arbitrary host mounts, or authority to publish. The model runtime
is not a filesystem sandbox; mount and path validation remain necessary.

After model exit or forced termination, the host performs bounded finalization without
model calls: record outcome, export sanitized diagnostics, validate permissible output,
and clean up resources. Preserve the atomic report contract. A timeout/crash needs a
fixed-content host-generated failed report even if the coordinator wrote none; never
allow a stale converged report or old guide files to override host failure. Make the
final report available to workflow issue reporting regardless of the runner command
exit code; do not leave its copy behind a success-only shell command. Crash-time
session stores may be incomplete; exporter must handle that safely, not assume orderly
Kit shutdown. Model-dependent validation belongs inside the writing allowance.

Connect the Titus sanitizer to the readable exporter. Decode supported session fields,
reuse the same sanitizer across fields and final assembled export, retain the approved
1 MiB per-source and 2 MiB final limits, and fail closed on warnings/rescan failure.
Export only allowlisted content from validated paths; raw stdout/stderr, credential
stores and private telemetry are not upload targets. The existing metadata-only
execution transcript and safe diagnostics remain fallbacks. Partial readable logs
are labelled partial. Successful readable sanitization/export AND upload are required
before guide PR creation/update. On either failure, withhold publication, preserve the
primary research outcome separately from the diagnostics failure, and attempt an issue
failure comment with the workflow link. Never substitute raw content. Freeze sanitized
artifacts after validation and before upload so no model or container writer can alter
them. Never pass model-controlled URLs through as artifact links.

Finalization has an approved 300-second allowance, including termination confirmation,
safe export and final deterministic checks, enforced independently with cleanup traps.
Measure its headroom during acceptance; it cannot restart model work or extend
research/writing. The exporter is a prebuilt host binary; delete private run storage
during final cleanup after export. The workflow's outer job
timeout must leave room for image setup, finalization, uploads and issue reporting.
Runner loss/forced platform cancellation may prevent these steps: do not promise logs
or an issue comment when the runner cannot execute them.

## Validation and publication

Preserve existing outcomes and interactions: converged only for a complete accepted
guide; awaiting_scope for material questions the ticket author can answer, including
the publisher's numbered-decision response flow; blocked where research cannot establish
a supported path; failed for execution/timeout/validation failure. Only converged plus
successful readable-log export/upload may open/update a guide PR. Never automatically publish a partial guide or
restart failed runs. Recovery is a separate explicit action, not a deadline reset.

One writer and the approved bounded validation repair; no automated post-draft reviewer
loop. Preinstall needed tools and use known binaries rather than depending on Python or
Go downloads during model work. Run guide lint, full repository generation/append-only
ID validation, size budgets and whitespace checks before publisher acceptance. Preserve
published remote IDs for unchanged logical servers as well as guide slugs. Normalize
provider-documented MCP HTTP transport to streamable-http; explicit legacy SSE remains
sse. Ordinary HTTP APIs still do not satisfy the MCP endpoint gate. Do not alter cited
provider text to pretend it used the normalized term.

Pin released Kit v0.1.134 and its verified release checksum, containing PR #139's
request-budget flag; production
must not silently depend on the private experimental image. Configure Astra/medium and
300-second logical model-request budgets, inherited by native children. Preserve idle
and attempt timeouts. No runtime/dependency upgrade is considered verified merely because
the local patched image produced a guide.

## Issue comment and artifact links

Use deterministic GitHub workflow/publisher reporting, not a model comment tool. After
uploads, post the outcome and workflow link plus the readable session artifact URL
returned by the trusted upload step. Include partial-log status and seven-day retention.
Users still need GitHub artifact access; links expire with artifact retention.

On awaiting_scope/blocked/failed runs, link available sanitized logs alongside the existing outcome
message. On success, include the guide PR link and logs. If export/upload is unavailable,
say so and link the workflow instead; it blocks guide publication, not the attempt to
report failure. An artifact upload failure must not suppress the attempt to report the
primary outcome. If PR creation/update succeeds but the final issue comment fails,
record notification failure and retain the real PR URL; never describe that PR as
uncreated, roll it back, or repeat publication to repair a comment. Avoid duplicated outcome comments by extending
existing reporting or using an explicit run/attempt-scoped comment convention.
No public raw session or telemetry uploads. Preserve existing fallback failure comments
for failures before publisher setup. Handle missing upload outputs without broken links.

## Acceptance evidence required

- Exact prompt dispatch retains the approved Topic 5 transport normalization.
- Phase signal is accepted once; invalid/late/repeated signals never reset a deadline.
- Independent host expiry removes the actual model container, including ordinary
  separate-process-group descendants, before success can be accepted.
- Normal exit, blocked research, provider crash, timeout and interrupted export yield
  correct reports; partial files and stale success reports never become publishable.
- Readable export redacts known/captured secrets, handles truncated records and refuses
  unsafe content; upload paths cannot select private raw records.
- Issue reporting includes trusted artifact links or explicit unavailable status on
  success/blocked/failure; permissions and retention are documented.
- Existing remote IDs survive updates; linter, full generator, size and whitespace gates
  run before PR publication. Ordinary issue/label/publisher behavior stays intact.
- Test the actual local factory entrypoint, then an authorized Action issue-to-PR run.
  The earlier custom prompt trials establish feasibility, not production acceptance.

## Planning follow-through

Next, convert this amendment into small implementation tasks against current #208,
reconciling completed assembler/sanitizer work rather than rebuilding it. The phase-file transport, 300-second finalization, host exporter/private cleanup and
v0.1.134 release pin have been approved. Review the concrete tasks before code changes;
release/runtime verification and authorized Action acceptance remain required.
