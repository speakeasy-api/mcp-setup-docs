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

No prompts, text, reasoning, arguments, original identifiers, URLs, metadata,
stdout/stderr contents, or unknown fields are copied. Kit's PascalCase parts and
Text/Structured tool outputs are supported; replacement records are summarized
as encountered, not reconstructed into a canonical conversation. Replacements
may repeat events. Compose spill previews/files, tool-output Parts/Files and
unrecognized formats may omit data; no referenced artifact paths are followed.
Malformed lines produce a fixed marker, retaining preceding valid events even
with a truncated tail. Session file names are not exported; references do not
encode parent-child relationships or global chronological order.

Capture reads at most 64 regular files, 1 MiB per file and 8 MiB total; session
symlinks and symlinked directories below the supplied Kit home are skipped or
rejected. It retains at most 4,096 events, 16 shell-shaped results per tool result,
and a 2 MiB final artifact. Source/event truncation sets `limited`; unsupported
fields and per-result omissions need not do so. Sanitization/size validation
must succeed before the transcript becomes world-readable (`0644`), allowing the
non-root Actions host to read a root-owned container export. Diagnostics likewise
receive `0644` only after their existing strict validator succeeds. Neither
artifact contains raw session logs; do not upload those as a fallback.
