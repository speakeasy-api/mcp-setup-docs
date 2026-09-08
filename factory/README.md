# Guide factory operations

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
