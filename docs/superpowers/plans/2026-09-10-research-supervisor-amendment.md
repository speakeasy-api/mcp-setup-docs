# Task 3a: Small process-supervised research runner

User explicitly approved option 1: keep the migration self-contained with a
small process supervisor enforcing research deadlines and retaining exact
prompts/resumable topic sessions. This supersedes native subagent dispatch for
research topics only. Do not add a general orchestration framework, MCP server,
ACP implementation, new module, or Kit upgrade. Coordinator retains research
sequencing/reconciliation; writer can remain a native subagent.

## Verified pinned CLI contract

Kit v0.1.130 source `src/main.rs:2077-2136` supports:
`kit prompt --root <workspace> --provider openrouter --model <configured>
--reasoning-effort <configured> --mcp-config <path> [--resume <session-id>]
<prompt>`.
On successful completion it prints the assistant output, then a final line
`session_id: <session-id>`. Resume reuses that ID. There is no `--json` or native
subagent timeout argument. Do not use `--force` to override session locks.
Sources: https://github.com/speakeasy-api/kit/blob/v0.1.130/src/main.rs and
src/tools/subagent.rs. Existing assembler: go/internal/factoryprompt.Assemble.

## Files and scope

Create `go/internal/factoryresearch/runner.go`, `runner_test.go` and a small
platform-specific process helper only if needed; create
`go/cmd/research-task/main.go`, `main_test.go`. Standard library plus the existing
factoryprompt package only. Docker/CI wiring is Task 7. Coordinator changes are
Task 3b, not this task. Modify no existing guide, prompt, or experiments.

## Public command contract

```
research-task init --workspace /workspace
research-task run --workspace /workspace --document /workspace/factory/coordinator.md \
  --sha256 <pinned-hash> --kind initial|follow-up \
  --input /workspace/.factory/research/<assignment>.input.json \
  --timeout-seconds <positive-integer>
```

`init` runs as the first research-phase operation, before input/context resolution.
It creates private `.factory/research/run.json` recording version, start time,
and deadline exactly 1800 seconds later. Refuse a pre-existing run clock instead
of resetting/extending it. Use an atomic write. Return bounded JSON including
start/deadline/remaining_seconds so coordinator can plan shared budgets.

`run` reads that clock, validates it, validates input/hash/sections through the
existing assembler, and sends the assembled bytes directly as one exec argument
to Kit (never through a shell or back to the model for copying). Clamp each
positive process allowance to the phase time remaining. The input's research
budget cannot exceed the effective process allowance. Refuse expired phases
before spawning. Phase deadline and process cancellation stop new research;
saving failure evidence/cleanup may happen afterward, never resume model work.

Select topic and follow-up index from validated input. Exactly topics 1..5;
initial index 0, follow-up 1 or 2. The supervisor enforces per-topic ordering and
single active process per topic; the coordinator enforces the global two-wave
limit and final audit ordering. Independent topic processes must run concurrently
without a global lock. A follow-up must use the successfully stored original
session ID; refuse missing/mismatched/unsafe IDs and failed/stale states rather
than creating another session. A timed-out/failed task terminates that run path;
no automatic retry/force-resume. Do not discard a prior complete report.

Use the factory's existing `KIT_MODEL`, `KIT_REASONING_EFFORT`, provider openrouter,
existing isolated HOME and explicit workspace Exa config. Do not invent another
model/provider selection or copy credentials. Kit executable may be injectable
through a test-only dependency (or FACTORY_RESEARCH_KIT environment override for
fake integration tests); production defaults to installed `kit`. Do not invoke
real provider research in tests.

Each child starts in its own process group on Linux/macOS. On deadline or parent
cancellation terminate its group, allow at most five seconds of cleanup, then
kill remaining group members and reap the child. Handle descendants holding
stdout/stderr open, output-limit errors, and normal-completion orphan descendants
without leaving background research running. Group cleanup must target only the
child's own group. No detached durable jobs. Unsupported platforms may fail
explicitly if a tiny build-tagged helper is needed; don't broaden platform scope.

## Private records and response

Inside the physically verified `.factory/research/` root, store deterministic
names `topic-N-initial` or `topic-N-followup-I` with `.prompt.md`, `.input.json`,
`.stdout.txt`, `.stderr.txt`, `.execution.json` suffixes. Store a successful report
separately as `.report.md`, excluding the CLI session marker. Preserve prior
complete reports. Store per-topic private state with session ID and last completed
index. Cap each stream at 1 MiB; crossing the cap cancels the process and marks
output limited instead of unbounded disk/memory growth. Files are mode 0600;
no raw stdout/stderr to the parent tool response or Actions log. These files are
inputs to the later sanitizer, never uploaded raw.

Return small JSON fields: status (`complete`, `timeout`, `failed`), topic_id,
follow_up_index, session_id (only known validated ID), report_path (only on
complete), execution_path, started_at, finished_at, deadline, remaining_seconds,
and output_limited. Report/record paths must be workspace-relative and bounded.
Malformed inputs or unsafe paths return a fixed error category/nonzero status.
Handled execution failure may return its structured status; define/document the
choice consistently so coordinator does not treat shell success as research
success. The execution record also records document/prompt SHA-256, argv identity
without the prompt/credentials, and the original process exit code if available.

All state/input/record path components must remain inside the workspace/private
research root, be regular files/directories rather than symlinks, and avoid
following attacker-provided paths. Use temp files + rename and exclusive topic
locks. Child instructions remain read-only research; the supervisor is process
control, not a filesystem sandbox, and must not claim otherwise.

## Test cycle and acceptance

Use TDD with a fake Kit subprocess, never real credentials or provider calls.
Cover: exact assembled prompt argument (including quotes/newlines); provider/model
configuration; valid final session marker; initial then same-ID follow-up; reject
missing state, duplicate initial, out-of-order/third follow-up, reset clock,
expired deadline, malformed/hash-invalid input and symlinks; concurrent different
topics versus same-topic rejection; nonzero exit; stream bounds; previous complete
report survives follow-up timeout; kill/reap child AND descendants; parent
cancellation; no raw secrets in returned JSON/errors. A fake can write a canary
and `session_id: s-fake-topic-1` to prove report/marker separation.

Keep tests fast by injecting clock/process allowance durations in package tests
rather than sleeping for production budgets. Test the CLI's real integer-second
flags separately. Do not mock away actual process-group cancellation tests.

Run focused tests, then `(cd go && GOTOOLCHAIN=go1.27.0 go test ./...)` once; run
race checks only where mutable callback/state is involved. Self-review, commit
scoped files, report exact API/CLI/response paths for Task 3b and Task 6/7 consumers.
Budget initial implementation to 10 minutes; commands <=120 seconds. If scope or
runtime assumptions fail, preserve partial work/report a specific blocker instead
of adding a framework or claiming unverified deadline behavior.

Report: `.superpowers/sdd/2026-09-10-guide-factory-migration/task-3a-report.md`.
Return only status, commit(s), test summary, and concerns. Do not spawn subagents
or a reviewer; controller supplies review. No push/merge/provider actions.
