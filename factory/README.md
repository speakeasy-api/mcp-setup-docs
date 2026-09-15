# Guide factory operations

## Approved ordinary read-only research correction

The current policy supersedes earlier fixed-count restrictions.
Ordinary read-only fetch, parsing, quoting, and tool-selection mistakes can be
corrected with already available tools within the existing 1800-second research
deadline. There is no fixed failure count. Repeated identical no-progress failures
stop that approach: change approach or report the blocker, never blindly loop.
Every attempted operation must be positively known read-only with no uncertain
partial effects; exit codes alone are insufficient. Record failures, corrections,
and outcomes in existing private research evidence, without new logs or child writes.
Parent audit applies the same classification as shared child instructions.

Unresolved model-generated ordinary research Runlet may be corrected only after
authoritative pre-execution rejection evidence establishes zero dispatch and the
intended program remains read-only within existing authority. Otherwise stop.
Warnings, absent output, and model assertions do not prove zero dispatch.
Mandatory exact-byte canonical programs remain strict, even before dispatch.
Unknown writes cannot be blindly retried. No installs, known-absent Python,
automatic service-write retries, or expanded authentication/access authority.
Validation remains gate closed, with correction only where the existing workflow
permits. Mandatory helpers, privacy, evidence integrity, native handles, factual
and endpoint gates, reporting/export, publication and host deadlines are unchanged.

Prompt-text fixtures and assembler parity are not a runtime classifier or proof
of model compliance. No live providers, runtime/dependency change, or new live-run
authorization is part of this adjustment. Historical private sed/curl evidence
omitted exact input and does not establish an original-root-cause reproduction.

## Later approved automatic syntax-repair policy correction

For model-generated ordinary research only, successful harness-healed execution
is not fatal solely because `compose_warnings.auto_repaired` reports minor syntax
repair. Child instructions and parent audit assess the resulting execution using
the same allowed-operation, result and evidence criteria as unrepaired research.
A warning proves neither failure nor zero effects. Do not replay solely for the
warning or require proof of zero dispatch to accept already-executed allowed research.
Actual errors use the ordinary read-only correction policy above; acceptance of
a successful healed result is unchanged and is not a recovery attempt.
Unknown/partial mutative effects require existing-policy inspection/reconciliation,
not replay. Exact-byte mandatory canonical dispatch/context/report programs still
reject any healing or improvisation as trusted-literal corruption; ordinary child
research is not a mandatory literal. Canonical program bytes are unchanged.
Validation, privacy, evidence, native handles, endpoint gates, authentication scope,
deadlines and publication safeguards are unchanged, with no new logging policy.

The certified private `okta-live-1e59e9a.0VACCD` report recorded an automatic
missing-separator repair warning. Local source suggests execution precedes the
warning, but exact release linkage and live effects are unknown: this is not a
runtime reproduction claim. These are prompt-text contracts and assembly parity,
not a runtime classifier or proof of model compliance. Independent review follows;
no live/provider execution is authorized or performed by this correction.

## Host lifecycle integration — Tasks 1–5 approved; Task 6 acceptance pending

`run-kit.sh <issue-json> <catalog-json> <export-dir>` now prebuilds the native Go
supervisor, prepares private inputs/source, creates a run-labelled Docker container,
and hands its full immutable ID to `supervise-factory`. The cached configured
image is reused; absent images are built with a bounded command. Both lifecycle
CLIs are built/installed by the owning Dockerfile. Operator-only
`FACTORY_KIT_IMAGE`, `FACTORY_SUPERVISOR`, and `FACTORY_PRIVATE_ROOT` overrides
support reviewed local images, prebuilt host tools and private storage; none is
passed to the model. There are no production deadline overrides.

The host creates 0700 HOME/workspace/control directories; only these are writable
mounts. Source and copied issue/catalog inputs are readonly. There is no public
export mount, Docker socket or GitHub token in the model container. The entrypoint
executes Kit with the established prompt flags and real exit status; its atomic
candidate report stays private. It no longer runs exporters or waits on a FIFO.
Raw streams and command logs remain under the private host run directory.

The supervisor verifies the `factory.run-id` label before touching the full
64-hex container ID. It starts monotonic deadlines immediately before Docker start:
1800 seconds research, one-time 900 seconds writing capped by 2700 seconds outer.
Signals are regular files of at most 256 bytes with version 1, host-generated
128-bit lowercase hex run ID and writing phase. Exact-expiry wins over phase or
completion; duplicates do not reset deadlines. TERM/INT maps to
`lifecycle_invalid`; unconfirmed cleanup yields sticky `cleanup_failed`. Removal
and successful absence confirmation are independent of model cancellation.

The host now freezes the candidate after confirmed container removal, sanitizes
readable session output, runs full deterministic validation, and removes private
records within the independent 300-second finalization clock. Research has an
1800-second deadline and writing a one-time 900-second deadline; finalization
is not model time. There are no per-topic native timeout flags or global guide cap.
Released Kit 0.2.2 uses Astra, medium reasoning and a 300-second logical request
budget; none of those settings replaces the host phase clocks.

Publication requires the frozen readable export **and successful readable artifact
upload**. A confirmed PR is recorded before notification side effects; a failed
comment does not mean no PR was created. Raw records are never fallback uploads.
Cleanup failure is a residual operational failure, not proof of removal. Any later
recovery requires explicit operator action; runner loss or forced cancellation
cannot promise logs or unattended recovery.

**Task 6 remains incomplete.** The connected offline lifecycle matrix, reproducible
native fixture execution and maximum-input finalization headroom still need
acceptance. `local-draft.sh` now uses the explicit `validate.sh --local` interface:
a fresh local host identity, frozen readiness and byte equality are required at
staging, merge and installation. Local mode clears workflow/upload environment,
never invents artifact URLs and cannot relax the publisher's upload gate.
`test-factory-lifecycle.sh` first exercises the local slice, then runs a connected
real Docker/fake Kit matrix through the actual wrapper, entrypoint, supervisor,
finalizer, extracted workflow run/upload-gate/outcome shell, common validator and
publisher with fake gh. Upload fixtures copy only the real readable export;
no live provider or GitHub calls occur. Cases include success, blocked, numbered
scope request, crash with stale success, timeout with proven separate process
group, sanitized-candidate rejection, malformed/truncated store, maximum accepted
8 MiB source, upload failure and confirmed publication with notification repair.

A test-only Go build overlay records elapsed host monotonic time from the exact
terminal callback through supervisor return (after deferred finalization/private
cleanup). It shortens research only; the original 300-second finalization and
60-second worker reserve remain unchanged. Each exporter is a fresh process;
this is cold exporter initialization, not forced-cold Docker rebuilding. Output
reports per-case intervals and remaining 300-second headroom. The 8 MiB fixture
uses whitespace padding and is not an exhaustive worst-case parser/secret-density
proof. Separate unit tests cover late/malformed phase, Titus warning and interrupted
export behavior; those are not all connected rows. Release cache-assisted builds
are valid release checks; cold-image timing is optional rollout-capacity evidence.

Factory CI builds the configured release tag before image-requiring tests and
runs the affected Go packages with CGO disabled. The default native-dispatch test
is explicitly static-only. Its optional executor currently requires Runlet 0.5
and matching serde_json rlibs; no cached-library execution is silently claimed.
Reproducible executor pinning remains an acceptance gate.
No live provider or issue-to-PR acceptance is authorized by offline checks.

### Cleanup replacement evidence

Before replacement, the following command ran once and failed:

```bash
(cd go && GOTOOLCHAIN=go1.27.0 CGO_ENABLED=0 go test ./internal/factoryresearch -run '^TestSeparateGroupToolCleanup$' -count=1 -timeout=15s)
```

A normal separate-process-group tool survived cancellation and wrote its delayed
canary. Process-group termination was not proof that model writers had stopped.
The old research-task CLI and factoryresearch runner/tests were removed together
**only after** real Docker replacement acceptance through the actual run-kit and
entrypoint path passed:

```bash
FACTORY_BOUNDARY_IMAGE=mcp-setup-docs-kit:task3 bash factory/tests/test-container-boundary.sh
```

That regression uses fake Kit, proves a separate session/process group, injects
short deadlines only in a compiled test supervisor, and covers timeout, normal
parent exit with orphan, and direct wrapper TERM. It confirms removal, waits beyond
the canary delay, rejects installable success, checks private/readonly mounts and
credential absence, and invokes the real begin-writing CLI twice. Docker/image
absence is a hard failure, never a skip. Exact native dispatch/report persistence
coverage remains in the independently approved native-dispatch fixture tests; the
obsolete CLI is not used as an alternate coordinator.

## Failed Kit diagnostics

When `Run Kit` fails or reports a factory failure (even with a successful step),
the workflow uploads the validated
`factory-diagnostics.json` file as a repository-access-controlled artifact. The
issue failure comment remains a safe summary that links to the workflow run; it
does not read or inline diagnostics.

Download and inspect a bundle with:

```bash
gh run download RUN_ID \
  --repo speakeasy-api/mcp-setup-docs \
  --name guide-factory-diagnostics-RUN_ID-RUN_ATTEMPT
jq . factory-diagnostics.json
```

Artifacts expire after seven days. They contain no raw transcript or tool
payloads. If runtime-event parsing fails, rejected events are discarded; the
bundle still retains independently validated failure metadata and the outer Kit
invocation status. The workflow log records the parser failure. If bundle
validation itself fails closed, the workflow safely skips the missing artifact.

## Sanitized execution transcript

For a completed Kit invocation (success or failure), Actions separately uploads
`export/execution-transcript.json` as
`guide-factory-transcript-RUN_ID-RUN_ATTEMPT`, retained for **seven days** under
repository artifact access controls. The upload names only that file, never an
export glob or raw session directory. Stale transcript exports are removed before
startup. Capture runs immediately after Kit exits, independently of runtime-event
projection and before report validation, so parser errors and factory-reported
failure do not discard it. Capture failure is nonfatal and removes the export;
abrupt runner/container loss or cancellation is not guaranteed to produce it.
There is **no automatic retry** and no change to lint behavior.

This is **not a full conversational transcript**. It is an allowlisted structural
summary of persisted `.kit/sessions/w-*/*.jsonl` records from parent and subagent
sessions: anonymous per-file session references, per-session call references,
recognized role/part kinds and tool names (`unknown` otherwise), result error
flags, and safe integer exit codes (0–255). Shell-shaped results nested inside
compose output are summarized too. Stdout/stderr retain only nonempty presence,
JSON validity and top-level array/object counts—not their values. These fields
can help distinguish a command failure from malformed JSON without revealing its
content; they do not prove a particular linter ran or succeeded.

Tool-error details are deliberately narrow: the verified `RL1003` invalid-string
escape diagnostic retains its code and byte offsets; `RL5201` distinguishes
invalid numeric operands; `RL6102`/`RL6103` distinguish tool input/output schema
mismatches. Invalid subagent `output_schema`, ACP handshake timeout/failure, and
cancellation have fixed categories. Messages, source snippets, fixes, and schema
paths are never copied. Known caught Runlet errors returned inside compose JSON
retain only code/category, boolean retryable/uncertain, integer attempt, and byte
span (0–8,388,608). No retry is performed by capture. At most eight textual and
eight nested error details are retained per result. Unrecognized error prose is
**omitted**, not captured: an error result with no recognized details sets
`error_details_omitted: true`. This is not an exhaustive error catalog; remote
transport prose and arbitrary error codes remain unavailable.

Nested subagent handle-shaped results retain completion, generation, output JSON
type, update truncation, and at most 16 exact ACP tool-update status enums
(`pending`, `in_progress`, `completed`, `failed`); at most 16 handles per result.
These are structural observations, not authenticated provenance: compose can
return objects shaped like errors or handles. Output values, IDs, schema field
names and update contents are never retained. `schema_validation: not_observable`
is intentional: Kit 0.1.130 silently returns the original string when JSON parsing
or output-schema validation fails; successful string output is also possible.
Neither a handle's completion nor a failed tool update proves the subagent's
schema passed or failed. End-turn versus max-token completion is not persisted
in the handle either. Runtime `storage_status` is accepted and ignored only with
exact boolean `pending`/`exhausted` fields; missing/wrong/extra fields and unknown
events still fail closed, without discarding subsequent ordinary stderr handling.

Format sources verified against the public **Kit v0.1.130** release source (the
available local checkout was older): `src/events.rs` (`StorageStatus`),
`src/tools/subagent.rs:158–239` (`SubagentValue`, `structured_output`, `turn_output`),
`src/acp_child.rs:507–543,1371–1390` (captured updates and completion), and
`Cargo.lock`. Its pinned dependencies are agentkit-core **0.10.5**
(`src/lib.rs`, externally tagged `Part`/`ToolOutput`), agentkit-tools-core **0.10.5**
(`ToolError` display prefixes), agentkit-task-manager **0.10.7**
(`src/lib.rs:933,956`, failed tasks become `ToolOutput::Text(error.to_string())`),
agentkit-tool-compose **0.10.11**
(`src/runlet_backend.rs:642–658,718–742`, rendering and host-error recall), and
Runlet **0.6.0** (`src/runtime.rs:31–52,1142,1204,2152–2178`, typed errors and catch
objects). No live session contents were inspected to derive these rules.

No prompts, text, reasoning, arguments, original identifiers, URLs, metadata,
stdout/stderr contents, or unknown fields are copied. Kit's PascalCase parts and
Text/Structured tool outputs are supported; replacement records are summarized
as encountered, not reconstructed into a canonical conversation. Replacements
may repeat events. Compose spill previews/files, tool-output Parts/Files and
unrecognized formats may omit data; no referenced artifact paths are followed.
Malformed lines produce a fixed marker, retaining preceding valid events even
with a truncated tail. Session file names are not exported; references do not
encode parent-child relationships or global chronological order.

Capture samples at most 64 regular files, 1 MiB per file and 8 MiB total; session
symlinks and symlinked directories below the supplied Kit home are skipped or
rejected. It retains at most 4,096 events, 16 shell-shaped results per tool result,
and a 2 MiB final artifact. Oversized files sample the first and last 512 KiB (less when the total
remaining byte budget is smaller),
discarding the first tail fragment and inserting a separator (at most one extra
byte per sampled file). Event overflow retains the first and last 2,048 events,
both per file and globally. This preserves some late failure evidence, not every
failure: later files beyond the file/byte budgets remain unread, tail fragments
may be omitted, and an artifact over 2 MiB fails export rather than leaking raw
data. Source/event truncation sets `limited`; unsupported
fields and per-result omissions need not do so. Sanitization/size validation
must succeed before the transcript becomes world-readable (`0644`), allowing the
non-root Actions host to read a root-owned container export. Diagnostics likewise
receive `0644` only after their existing strict validator succeeds. Neither
artifact contains raw session logs; do not upload those as a fallback.

### Linux ownership and released Runlet pin

The wrapper runs the model container with the host numeric UID:GID. A real Linux
(tmpfs, not macOS file sharing) fixture proves root-owned 0700 session directories
prevent non-root host export/cleanup, while matching UID permits both actual Go
operations. The model still receives no Docker socket or GitHub credentials.
The connected fixture now reaps subprocess groups on timeout/signals and its
finally handler removes only containers matching its image, private mount root
and run label, confirming actual absence. Forced SIGKILL/runner loss still cannot
promise cleanup; leftover private state requires explicit recovery.

Kit v0.2.2 resolves to `bf347453982d0d62f57d4f4c38d2541537f967f9`, including
PR 224 (`b4d204e76d5422410c728364eb614b9205878e6a`). See
[release provenance](tests/fixtures/kit-v0.2.2/README.md) and
[native executor provenance](tests/fixtures/research/runlet-build.md).
Runlet **0.6.0**, serde_json **1.0.151**, and Rust **1.94.0** are unchanged;
all 31 registry tuples in the native executor lock match the new release lock.
No dependency updates were needed. Default shell checks remain static; CI also
executes the release-locked native fixture.

Build the new `mcp-setup-docs-kit:0.2.2` image before image-dependent tests or the
full suite: helpers and configuration are baked into the image. The existing
`0.1.134` Docker image/tag remains untouched and is not evidence for this release.

### Selected prose omissions (fixture verification only)

Selected transcript/research prose is not a machine protocol. Ambiguous nested
JSON, trailing quoted/JSON-like prose, escaped unparseable prose, selected-text
key collisions or invalid handle-like structures, and fields over 1 MiB are
replaced as whole fields with `[unsafe_text omitted]`; no original bytes from
that field are retained. The artifact records `unsafe_text_omitted` and remains
limited. Ordinary public prose in other fields remains readable. Titus errors
and warnings still fail the export closed; native record/host protocol checks,
the final assembled scan, and the 2 MiB artifact cap remain mandatory.
These fixtures do not establish the cause of the previous live exit 43.
Source headroom is 16 MiB per file (including complete JSONL files) and 64 MiB
aggregate; retained handles remain capped at 1 MiB. Count limits are unchanged.

### Bounded export-limit diagnostics (source verification only)

Finalizer limit errors distinguish `source_bytes` (16 MiB), `total_bytes`
(64 MiB), `entries` (4096), `session_dirs` (64), `session_files` (64),
`events` (4096), and `assembled_bytes` (2 MiB). Each measurement contains
only category, observed count, and allowed count; the first failing bound wins.
The exporter source reader and whole-session JSONL decoder both accept sources
up to 16 MiB each; the decoded-text limit remains
1 MiB, the aggregate source limit is 64 MiB, and the final artifact remains
limited to 2 MiB. This removes the source-size rejection for the observed
1,522,551-byte file, but does not guarantee a successful whole export. A real
Titus export fixture accepts a 16 MiB whitespace-padded JSONL file with 64 small
text records; this is boundary coverage, not a worst-case memory/time claim.
Exit 48 and all other caps remain unchanged. Counts are observations at the
check, not an inventory of deleted data.

The worker atomically writes a private 0600 `host/worker-limit.json` sidecar.
Before `CompleteHost` deletes that sidecar, the supervisor validates its physical
file, private ownership/mode, 512-byte bound, exact fields, current run ID,
category, cap, and integer range, then adds only the measurement to retained
`host/host-reason.json`. Missing or invalid evidence is omitted; it cannot replace
termination, extend a deadline, or grant publication readiness. Observations
above the safe integer ceiling (2^53−1) are omitted rather than rounded.

The launcher prints `FACTORY_HOST_RUN_ID=<32-hex-id>` at invocation startup and,
when a valid matching host record is available, a bounded
`FACTORY_HOST_DIAGNOSTIC=<JSON>` line containing version, run ID, host reason,
termination, optional limit, and optional timings. Retain these lines in a **private local log**;
they contain no source filenames, session IDs, raw exceptions, or model text.
`local-draft.sh` generates a fresh host ID and passes that same ID to this
launcher. A startup ID without a matching final record is not completion proof.

Optional `timings` contains only integer milliseconds:

- `research_ms`: host deadline initialization (before Docker start) to the first
  accepted begin-writing signal, or terminal observation if writing never began.
- `writing_ms`: first accepted begin-writing signal to host terminal observation.
  Duplicate begin signals cannot reset either duration or any deadline.
- `finalization_ms`: immediately before container removal, after model supervision
  returns, to the pre-cleanup host-record path. Includes container removal and
  worker processing where reached; excludes prior log/wait teardown, sidecar
  validation, record persistence, and **all `CompleteHost` cleanup/promotion**.

Durations use host monotonic observations, not model timestamps. Terminal means
host receipt of the container wait result, or host observation of timeout/error;
therefore observed timeout durations can exceed the timer budget slightly.
Milliseconds are truncated. Absent, non-monotonic, reversed, sub-millisecond, or
above-one-hour observations are omitted, never replaced by zero. The one-hour
range is only a diagnostic validation ceiling, not a timeout setting. Invalid
local timing shapes/ranges suppress the optional diagnostic line, not run status.

Production research/writing/finalization budgets remain 1800/900/300 seconds,
with outer budget 2700 seconds and request budget 300 seconds. These offline
source checks are not current-image acceptance or proof that historical unlinked
worker and timeout records belonged to the same invocation.
