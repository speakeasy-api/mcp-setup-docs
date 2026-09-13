# Factory Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the approved research/writing prompt into the existing one-issue factory with host-enforced deadlines, private postmortem export, and publication gated on accepted guides and uploaded readable logs.

**Architecture:** Replace the old coordinator with the approved prompt and native Kit children; retain the completed assembler and Titus sanitizer. A small Go host command owns only model-container lifecycle/phase timing; existing shell scripts retain preparation, validation, reporting and publication. Host-only finalization reads private stopped-container records and freezes sanitized upload artifacts without model calls.

**Tech Stack:** Existing `go/go.mod` (Go 1.27.0, Titus v1.2.9), Go standard library, Bash, Docker, jq, GitHub Actions/gh, released Kit.

**Spec:** `docs/superpowers/plans/2026-09-11-factory-integration-design.md` is authoritative. Reconcile `2026-09-10-guide-factory-migration.md`, `2026-09-10-research-supervisor-amendment.md`, `guide-factory-migration-working-checklist.md`, and `docs/research-prompt-draft.md`; conflicting orchestration/deadline requirements are superseded, not additional requirements.

## Global Constraints

- One GitHub issue triggers one Action run. No global concurrency cap: keep the existing per-issue concurrency group and `cancel-in-progress: false`.
- Research has 1800 seconds, beginning before context resolution; the accepted one-time begin-writing signal starts 900 seconds for writing/repair/validation. The outer model-container ceiling is 2700 seconds. No retry/resume/duplicate signal resets a clock.
- Prompt owns endpoint gate, five topics, authentication selection, final authority audit and at most two bounded factual follow-up rounds. No duplicate topic manifest/check state machine, alternate coordinator, generic framework or ACP implementation.
- Exactly one writer; at most one deterministic-validation repair; `review_rounds: 0`; no automated post-draft reviewer loop.
- Preserve actual returned session handles. No invented generations, native timeout flag, failed-call generation advancement or automatic failed-run recovery.
- Hard termination/removal of the owned container is the cleanup boundary, including separate-process-group native tools. Do not claim process-tree killing guarantees cleanup.
- Persist private run-specific session/research/report storage outside the container writable layer. No model access to GitHub tokens, Docker socket, arbitrary host mounts or publication authority.
- Successful readable sanitization/export **AND upload** are required before guide PR creation/update. No raw fallback; 1 MiB per source, 2 MiB final readable artifact, seven-day artifact retention.
- Only converged publishes/installs a complete guide. Preserve awaiting_scope and numbered issue replies, blocked and failed reporting; no partial guide publication.
- Preserve guide slugs and published remote IDs for unchanged logical servers. Provider-documented MCP HTTP maps to `streamable-http`; explicit legacy SSE stays `sse`; ordinary HTTP APIs fail the MCP endpoint gate. Preserve quoted provider terminology.
- Run guide lint, full repository generation/append-only ID validation, 5 MiB generated total and 512 KiB per-file budgets, and whitespace checks before publisher acceptance.
- All new factory Go commands/packages belong to `go/go.mod`; no new module. The existing generator module `go/internal/gen/go.mod` stays in place.
- Planning authorizes no code edits, commits, pushes, live provider calls or deployment. Subsequent implementation/deployment needs authorization; normal review/CI safeguards remain mandatory.

## Baseline and approval refinements

Inspected actual run-kit/entrypoint, workflow, publisher, transactional validator, transcript projector, assembler CLI, research runner/tests and sanitizer. Existing assembler is `go/internal/factoryprompt/assemble.go`, not the old proposed `prompt.go`. Existing sanitizer is `go/internal/factorytranscript/sanitize.go`; reuse `NewSanitizer([]string) (*Sanitizer, error)`, `Sanitize([]byte) ([]byte, error)` and `Close() error`.

`research-task` currently assembles exact bytes into a positional `kit prompt` argument, extracts a CLI `session_id:` marker, and stores per-topic sequencing/clock state. Its contract is **not** native `{id, output, generation, name?, updates?}` handles. Retire runtime use only after Task 2 replaces exact dispatch/report persistence coverage. Preserve the RED separate-group evidence until Task 3 adds container coverage; do not silently skip or claim it passed.

The following integration choices were approved in conversation:

1. **Transport:** an at-most-256-byte regular file `control/begin-writing.json` in a dedicated private mount. Helper atomically installs JSON with `version:1`, host-generated `run_id`, and `phase:"writing"` once using a temporary file and no-replace hard link. Identical duplicate succeeds without replacement. Host uses its own monotonic observation time, not timestamps in data. Wrong-run, malformed, oversized or unsafe-path signals fail lifecycle validation. This signals phase, not evidence truth.
2. **Finalization:** 300 seconds total for teardown confirmation, report/export and deterministic validation, measured in Task 6 without model calls. Keep the existing 180-minute outer job timeout initially. Upload/report steps remain separately bounded; use five-minute step limits as an implementation default and verify their behavior with workflow tests. Setup keeps its existing job-bound behavior; no new setup-time policy is approved here. Insufficient measured headroom blocks acceptance rather than silently extending budgets. No extension to 1800/900 model time.
3. **Exporter location:** prebuilt host Go binary, built before model work; read private mounts only after confirmed container removal. Keep private storage through finalization, then delete in cleanup. It is not a public artifact or cross-run automatic resume store. Runner loss can prevent cleanup/reporting.
4. **Approved Kit pin:** v0.1.134, image `mcp-setup-docs-kit:0.1.134`, Linux x86_64 tarball SHA256 `e1262d364187f3c244ec28a099c7cb2e1f2c22b4440f1d8179de34b707d56487`. Read-only GitHub checks found PR #139 merged at `05ddea3956e8047875670403880005ab26d080d4`; v0.1.134 is six commits ahead, zero behind; release notes advertise `--request-budget-seconds`. This is release-backed, not runtime acceptance. Private experimental images are not production pins. **Approved model:** `openai/gpt-6-astra` through OpenRouter, medium effort. The user explicitly selected Astra and approved medium in this conversation; prior trial model-list verification and runs established this exact ID. Do not substitute another model or alias.

---

### Task 1: Pin and characterize released Kit; prebuild tools

**Files:** Modify `factory/config.env`, `factory/Dockerfile`, `factory/tests/test-container.sh`, `.github/workflows/factory-ci.yml`; create `factory/tests/test-kit-release.sh`, `factory/tests/fixtures/kit-v0.1.134/session.jsonl`, `factory/tests/fixtures/kit-v0.1.134/handle.json`. Read `go/go.mod`, `go/internal/gen/go.mod`; no incidental dependency changes.

**Interfaces:** Entrypoint uses `kit prompt --root /workspace --provider openrouter --model "$KIT_MODEL" --reasoning-effort medium --request-budget-seconds 300 --mcp-config /workspace/factory/mcp/exa.json "$prompt"`. `KIT_MODEL=openai/gpt-6-astra` is the approved provider ID. Keep idle/attempt defaults. Native `subagent({prompt: string})` returns its complete handle; `prompt({subagent: handle, prompt: string})` consumes that unchanged handle and returns the next actual handle. No new timeout/ACP arguments.

- [ ] Add release-contract tests before configuration changes: verify downloaded checksum/version/help without provider calls. Add synthetic source-derived fixtures from v0.1.134 `src/session.rs` and `src/tools/subagent.rs`: schema version, session ID, generation, item/part shape, parent/child records and text/structured output. Help must expose the real request flag, not a fictional child timeout.

```bash
bash factory/tests/test-kit-release.sh
# Initially FAIL: config remains 0.1.130/high with no request budget.
```

- [ ] Set the exact release/checksum above, medium reasoning and `KIT_REQUEST_BUDGET_SECONDS=300`. Inspect v0.1.134 request-budget propagation into native children; retain source references and tests detecting dropped inheritance or changed idle/attempt defaults. Verify the released binary, not a patched experiment.
- [ ] Extend current Docker build stages to prebuild the existing assembler, lint-guide and generator. Add begin-writing and readable exporter binaries when their implementing tasks introduce them; do not reference nonexistent packages or create placeholders in Task 1. Build host supervisor/exporter with the existing module in their owning tasks before model work. Build generator in its existing module before model work and copy required resources. Preserve Titus build requirements; no Python/Go downloads during model time. Representative existing build contract:

```bash
(cd go && go build -trimpath -o /tmp/prepare-research-prompt ./cmd/prepare-research-prompt)
(cd go/internal/gen && go build -trimpath -o /tmp/factory-generate .)
(cd go && go test ./internal/factoryprompt ./cmd/prepare-research-prompt ./internal/factorytranscript)
bash factory/tests/test-container.sh
bash factory/tests/test-kit-release.sh
```

- [ ] Record checksum, supported record shape, inheritance evidence and remaining runtime verification. Stop if release verification is unavailable; do not substitute an arbitrary version/model.

### Task 2: Replace coordinator; preserve exact native dispatch and reports

**Files:** Modify `factory/coordinator.md`, `docs/research-prompt-draft.md`, `factory/tests/fixtures/research/dispatch.runlet`, `factory/tests/test-coordinator.sh`, `go/internal/factoryprompt/assemble_test.go`; create `factory/tests/test-native-dispatch.sh`. Reuse `go/cmd/prepare-research-prompt/main.go`, `go/internal/factoryprompt/assemble.go`; do not remove old regression yet.

**Interfaces:** Keep assembler flags `--document`, `--sha256`, `--kind`, `--input` unchanged: exact stdout bytes; fixed error category on failure. Pin document hash once per run. Private prompt/input/report files live under `/workspace/.factory/research/`. Native result is the returned handle's `output`, not a CLI marker; persist complete handle only after successful return. Phase command: `begin-writing --control-dir /control --run-id "$FACTORY_RUN_ID"` (Task 3).

- [ ] Add deterministic fake-native tests: exact assembled Topic 5 dispatch including HTTP normalization; Topics 1–4 distinct handles; follow-ups consume prior complete returned handle verbatim; failure never fabricates a generation or overwrites previous complete report. Assert issue data cannot become shell syntax.

```bash
bash factory/tests/test-native-dispatch.sh
# Initially FAIL: production coordinator is not the approved native integration.
(cd go && go test ./internal/factoryprompt ./cmd/prepare-research-prompt)
```

- [ ] Preserve approved assembler-selected section bytes when replacing coordinator/timing prose. Construct shell arguments only from fixed workspace paths, validated hashes/kinds/numeric indexes. Feed assembler stdout directly to native tools; shell command substitution strips trailing newlines and must not implement child dispatch. Preserve this existing fixture pattern:

```text
prepared = shell({command: input.command})
assert(prepared.success, "research prompt assembly failed")
child = if input.kind == "initial" {
  return subagent({prompt: prepared.stdout})
} else {
  return prompt({subagent: input.existingHandle, prompt: prepared.stdout})
}
return child
```

Production `input.command` is constructed from validated fixed arguments, never an issue-provided command. Catch call failures; retain last known handle and stop uncertain failed work, not blind retry. Persist exact prompts, complete reports and handles privately without a semantic topic manifest.
- [ ] Prompt owns endpoint-first sequencing, evidence/follow-up gates, authentication before final audit, and dossier completion. Context selection happens after host clock start. Save dossier, invoke begin-writing once, then send one writer the approved writer prompt/dossier. Its one repair and validation stay in writing time. Preserve create/update context, slugs, remote IDs, unrelated existing files, four generated files and truthful `review_rounds: 0` reports.
- [ ] Test converged, blocked endpoint, material awaiting_scope and exhausted follow-ups. Awaiting_scope has numbered questions and no installable artifacts. Explicit later reply/relabel is recovery, not a timer reset. Re-run tests above and `bash factory/tests/test-coordinator.sh`.

### Task 3: Host deadlines, atomic helper and actual container boundary

**Files:** Create `go/internal/factoryrun/lifecycle.go`, `go/internal/factoryrun/lifecycle_test.go`, `go/cmd/supervise-factory/main.go`, `go/cmd/supervise-factory/main_test.go`, `go/cmd/begin-writing/main.go`, `go/cmd/begin-writing/main_test.go`, `factory/tests/test-container-boundary.sh`; modify `factory/scripts/run-kit.sh`, `factory/scripts/container-entrypoint.sh`, `factory/tests/test-container.sh`, `factory/tests/test-export-boundary.sh`. After replacement passes, remove `go/cmd/research-task/{main.go,main_test.go}` and `go/internal/factoryresearch/{runner.go,runner_test.go,process_unix.go,process_other.go}`; preserve RED evidence/rationale in `factory/README.md`.

**Interfaces:** Keep `run-kit.sh <issue-json> <catalog-json> <export-dir>`. Host CLI: `supervise-factory --container-id ID --control-dir DIR --run-id ID --result FILE`. Host creates owned container first; supervisor starts monotonic clock immediately before `docker start`, conservatively including entrypoint preparation before Kit/context. It owns wait/removal/confirmation. Host-only result JSON: `{version:1,run_id:string,termination:"completed"|"provider_exit"|"research_timeout"|"writing_timeout"|"lifecycle_invalid"|"cleanup_failed",exit_code:integer,container_removed:boolean}`. No topic state.

- [ ] Add fake-clock tests for no signal, first/duplicate signal, malformed/foreign/oversized/symlink signal, signal/completion exactly at expiry, early writing, stale success after timeout and outer ceiling. Helper tests prove bounded, atomic no-replace creation. Production run ID is 128 random bits encoded as 32 lowercase hex characters; no model-selected identity.

```bash
(cd go && go test ./internal/factoryrun ./cmd/supervise-factory ./cmd/begin-writing)
# Initially FAIL: packages absent.
```

First add this executable failing unit test in `lifecycle_test.go` (package `factoryrun`, imports `testing` and `time`); then implement the small timer value below, not a research engine:

```go
func TestStartBudgets(t *testing.T) {
    now := time.Now()
    d := Start(now)
    if d.Research.Sub(now) != 1800*time.Second || d.Outer.Sub(now) != 2700*time.Second {
        t.Fatal("incorrect host budgets")
    }
    if d.Begun || d.Failed || !d.Writing.IsZero() {
        t.Fatal("writing began before signal")
    }
}
```

```go
type Deadlines struct { Research, Writing, Outer time.Time; Begun, Failed bool }
func Start(now time.Time) Deadlines {
    return Deadlines{Research: now.Add(1800*time.Second), Outer: now.Add(2700*time.Second)}
}
```

Tests advance explicit in-process `time.Time` values. Check `!now.Before(deadline)` before signal/completion acceptance. First valid signal sets writing to `now.Add(900*time.Second)`, capped by Outer. Valid duplicates do nothing; failures are sticky. Host polls bounded signal reads at 100 ms while waiting for container completion; file timestamps grant no time. Production uses monotonic `time.Now` comparisons, not serialized wall times.
- [ ] Allocate fresh 0700 runner-private `home/`, `workspace/`, `control/`; mount only these writable directories. Keep source/issue/catalog read-only. Remove model's public `/export` mount. Persist HOME at `/kit-home`, workspace at `/workspace`. Reject unsafe mount/path replacement and special files; no host Docker socket/GitHub credentials. Move preparation before container start where practical, but never start Kit before the host clock.
- [ ] Capture raw stdout/stderr privately, never Action logs. Stop using in-container exporter/FIFO completion as finalization authority. Entrypoint preserves atomic candidate report and exits Kit's real status. Host removes owned container on **all** terminal paths, including nominal completion with orphan writers, confirms absence, then permits finalization. Bound Docker subprocesses; add EXIT/INT/TERM cleanup traps. Cleanup failure withholds publication and trusted snapshot acceptance; no cooperative/process-group guarantee.
- [ ] Record old failure first and add real replacement:

```bash
(cd go && go test ./internal/factoryresearch -run '^TestSeparateGroupToolCleanup$' -count=1 -timeout=15s)
# Known RED: separate-group canary can outlive research-task timeout.
bash factory/tests/test-container-boundary.sh
```

New regression drives actual run-kit lifecycle with fake Kit launching a `setsid` tool that writes a delayed private-mount canary. Assert different process group established; inject a short test-only host deadline; confirm owned container removal, no later canary and no installed success. Cover normal parent exit with orphan too. Docker unavailable is an explicit acceptance blocker, not PASS. Only after replacement passes remove old runner/test together, recording old command/result and changed cleanup contract in README.

### Task 4: Host postmortem reports and fail-closed readable exporter

**Files:** Create `go/internal/factorytranscript/export.go`, `go/internal/factorytranscript/export_test.go`, `go/cmd/export-transcript/main.go`, `go/cmd/export-transcript/main_test.go`, `factory/scripts/finalize-run.sh`, `factory/tests/test-readable-transcript.sh`, `factory/tests/test-finalize-run.sh`; modify `factory/scripts/run-kit.sh`, `factory/scripts/build-transcript.sh`, `factory/tests/test-transcript.sh`. Reuse report/diagnostics validators and sanitizer.

**Interfaces:** `export-transcript --home DIR --workspace DIR --output FILE` reads supported `DIR/.kit/sessions/w-*/*.jsonl`, private research prompt/report records and four known candidate guide filenames. Known runtime secrets enter via inherited environment, never command arguments or upload roots. Select only the known provider-key names and use a minimal exporter environment; do not enumerate/log the host environment or give exporter unnecessary GitHub credentials. `finalize-run.sh <private-dir> <host-result> <export-dir>` emits atomic validated `run-report.json`, readable `session-transcript.json` only on success, metadata `execution-transcript.json` and safe diagnostics if available. Host-only `finalization.json`: `{version:1,primary_outcome:string,readable_export:"ready"|"failed",partial:boolean,publication_ready:boolean}`. No model URL is trusted. `primary_outcome` uses the unchanged four report outcomes; `publication_ready` means only host lifecycle/export/validation eligibility, never upload authorization. Task 5 must independently require the successful trusted upload. The finalization 300-second deadline begins at model termination/deadline detection, includes removal, and is enforced by the host wrapper across its child commands.

- [ ] Add source-derived v0.1.134 decoding tests: parent/child text and structured tools, report bodies, escaped/nested secrets, captured secrets repeated later, quoted transport, truncated final line, oversized line/source, malformed complete record, unknown variants, symlinks/hardlinks/path swaps, final-size overflow. Unsupported/malformed complete records fail readable export; a truncated tail can be omitted only with partial status.

```bash
(cd go && go test ./internal/factorytranscript ./cmd/export-transcript)
bash factory/tests/test-readable-transcript.sh
# Initially FAIL: exporter/CLI absent.
```

- [ ] Decode only supported released fields; recursively decode allowed Text/Structured representations. Use bounded readers (1 MiB per source), not unbounded JSON scanning. Reuse one sanitizer across all fields and final assembled document so captured secrets propagate; treat warning, Close and rescan errors as failure. Limit assembled output to 2 MiB; private temporary output is renamed only after clean validation. Preserve metadata/diagnostic fallback without publishing raw error text.
- [ ] Finalize only after confirmed removal. Validate candidate report, but lifecycle failure wins. Timeout/crash/missing-invalid report gets fixed-content schema-valid failed report, no failed guide copy. Preserve primary outcome separately from export/upload errors. Representative fixture:

```bash
jq -n '{schema_version:1,outcome:"failed",provider:null,slug:null,persona:null,summary:"Factory model execution failed.",open_questions:[],blockers:["Factory model execution failed."],nits:[],review_rounds:0,artifacts:[]}' > "$RUNNER_TEMP/failed-report.json"
bash factory/scripts/validate-report.sh "$RUNNER_TEMP/failed-report.json"
bash factory/tests/test-finalize-run.sh
```

- [ ] Test success, blocked, awaiting_scope, provider exit before report, report then nonzero exit, sticky timeout over stale converged, interrupted exporter, sanitizer/rescan error and missing diagnostic tooling. Expose final report regardless of run-kit exit status. Freeze selected sanitized regular files in host-only upload directory after validation/no writers; clean private storage afterward. Never glob private directories or substitute stdout/stderr, telemetry or credentials.

### Task 5: Mandatory upload gate, complete validation and truthful notification

**Files:** Modify `.github/workflows/guide-draft.yml`, `factory/scripts/validate.sh`, `factory/scripts/publish.sh`, `factory/tests/test-publish.sh`, `factory/tests/test-export-boundary.sh`, `factory/tests/test-contracts.sh`; create `factory/tests/test-workflow-finalization.sh`.

**Interfaces:** Workflow forwards host report even after nonzero run-kit. Upload `id: readable_upload` supplies trusted `artifact-url`; host env `READABLE_ARTIFACT_URL`, `READABLE_LOG_STATUS` (`complete`, `partial`, `unavailable`), `RUN_URL` never come from model fields. Keep publisher commands; add `notify <report>` for outcome-only comments and `notify-publication <report> <publication-receipt>` for comment-only repair. `FACTORY_PUBLICATION_RECEIPT` names host-only atomic JSON immediately after confirmed PR create/update: `{version:1,run_id:string,run_attempt:integer,pr_url:string,pr_number:integer,publication:"created"|"updated",notification:"pending"|"sent"|"failed"}`.

- [ ] Add fake gh/workflow tests: nonzero Kit forwards report; converged export failure; successful export/upload failure or missing URL; blocked/awaiting_scope with available/unavailable logs; PR created/updated then comment fails; bootstrap failure; repeated notification repair never republishes. Assert numbered decisions/relabel instructions survive.

```bash
bash factory/tests/test-workflow-finalization.sh
bash factory/tests/test-publish.sh
# Initially FAIL: copy is success-only, uploads lack readable gate,
# publisher can publish non-converged artifacts and has no receipt.
```

- [ ] Capture status and forward before returning it; reporting uses `always() && !cancelled()` plus explicit attempted/setup conditions. Preserve pre-model/bootstrap failure comments. Upload exactly frozen readable file, `if-no-files-found: error`, retention 7; keep separate metadata/diagnostic fallbacks. No output URL means unavailable, not a fabricated link.

```bash
status=0
bash factory/scripts/run-kit.sh "$RUNNER_TEMP/issue.json" "$RUNNER_TEMP/catalog.json" "$RUNNER_TEMP/export" || status=$?
if test -f "$RUNNER_TEMP/export/run-report.json"; then
  cp "$RUNNER_TEMP/export/run-report.json" "$RUNNER_TEMP/run-report.json"
fi
exit "$status"
```

- [ ] Require converged, successful lifecycle/finalization, readable ready, upload success/nonempty trusted URL, and validation success before publish. Non-converged goes to notify, never install/PR creation. Change current validator awaiting_scope/blocked installation paths accordingly. Preserve unrelated existing bundle files and transactional rollback; four generated files only; stable remote IDs for unchanged logical servers.
- [ ] Run prebuilt lint/full generator during writing allowance and deterministic host validation before publisher acceptance. In disposable validation checkout run all-guide generation, append-only refs and size checks, without committing generated output. Developer executable equivalents:

```bash
(cd go/internal/gen && go run .)
test "$(du -sk go/generated | awk '{print $1}')" -le 5120
find go/generated -type f -exec sh -c 'for f do test "$(wc -c < "$f")" -le 524288 || exit 1; done' sh {} +
git diff --check
```

Production uses prebuilt generator, not `go run` in model time. Stage candidate four paths only in disposable validation checkout and run `git diff --cached --check` to include untracked new-guide whitespace. Test changed logical-server remote ID, generator/lint/size/whitespace failure: reject and rollback before any gh publish call.
- [ ] Extend existing deterministic comment rendering with workflow link, trusted artifact URL or unavailable, partial status, seven-day expiration/access requirements. Use an actual run/attempt-scoped HTML marker to update one outcome comment, not duplicate generic failure reporting. Keep numbered awaiting_scope questions and label interactions.
- [ ] Write receipt immediately when gh confirms PR, before comment/label side effects. Comment failure leaves publication true and URL preserved; workflow reports **notification failure**, never “no PR created”. Failure handler reads receipt and never reruns publish. Notification-only repair can update the existing issue comment, not PR. Ambiguous gh failure requires read-only PR reconciliation before explicit retry, never blind republish. Assert single create/update, retained URL and truthful comment-only retry. Re-run task tests.

### Task 6: End-to-end acceptance, measurements and authorization gates

**Files:** Modify `factory/tests/run.sh`, `.github/workflows/factory-ci.yml`, `factory/scripts/local-draft.sh`, `factory/README.md`, `FACTORY.md`, `docs/superpowers/plans/guide-factory-migration-working-checklist.md`; create `factory/tests/test-factory-lifecycle.sh`.

**Interfaces:** Fixture matrix drives actual `run-kit.sh`/entrypoint, fake Kit/provider and gh, then real host finalization/validator and workflow contract tests. Emit only safe statuses/timing, no raw session records. Short timing injection exists only in test constructors/build fixtures, never agent-adjustable production deadlines.

- [ ] Add initially failing matrix: complete success; blocked endpoint; awaiting_scope numbered response; provider crash; real container timeout/separate group; malformed/late phase; sanitizer warning/interrupted export; upload failure; publication plus notification failure. Include hostile private paths, fake secrets and stale success. Each row asserts report, primary vs diagnostic outcome, readable status, PR count, receipt, issue text and removed container.

```bash
bash factory/tests/test-factory-lifecycle.sh
# Initially FAIL until lifecycle/report/upload contracts are connected.
```

- [ ] Integrate Tasks 1–5 and run affected tests after each change, then full offline acceptance:

```bash
(cd go && go test ./internal/factoryprompt ./cmd/prepare-research-prompt ./internal/factorytranscript ./cmd/export-transcript ./internal/factoryrun ./cmd/supervise-factory ./cmd/begin-writing)
bash factory/tests/run.sh
bash factory/tests/test-container-boundary.sh
bash factory/tests/test-factory-lifecycle.sh
git diff --check
```

- [ ] Measure `/usr/bin/time -p bash factory/tests/test-factory-lifecycle.sh`, including cold exporter, maximum bounded input, corrupt/truncated stores, teardown and full validation. Record maximum observed finalization and actual container absence. Require all cases below the approved 300 seconds with reviewed headroom; otherwise stop for budget approval, not silent increase. No promised logs on runner loss/forced cancellation.
- [ ] Update docs/checklist: completed assembler/sanitizer, superseded process supervisor with RED evidence and replacement coverage, mandatory upload gate, private cleanup and explicit later recovery. No active per-topic clock instructions, alternate coordinator or global cap.
- [ ] **Deferred authorized acceptance:** after separate approval, run actual local factory entrypoint with reviewed released image and approved `openai/gpt-6-astra` ID; inspect sanitized output only. Verify exact prompt bytes, native handle/report persistence, 300-second request inheritance, full lint/generator/size/whitespace and remote ID continuity. Then request separately authorized Action issue-to-PR acceptance through normal review. Prior custom-prompt/private-image trials prove feasibility only. Do not create credentials, label issues, publish, merge or bypass review in offline acceptance.

## Self-review and handoff

Coverage: Task 1 release/binaries; Task 2 semantic prompt/native sessions/HTTP/IDs; Task 3 monotonic arbitration/container boundary; Task 4 private postmortem/sanitizer safety; Task 5 outcomes/upload gate/publication versus notification; Task 6 matrix/measurement/rollout. Cross-task CLI paths, handle/result/receipt fields are defined above. No duplicate topic gate state is introduced.

Approved: atomic run-specific phase file, 300-second finalization, private host exporter/storage cleanup, and Kit v0.1.134 pin. Separate implementation execution and live Action acceptance remain authorization checkpoints. The Astra ID is resolved as `openai/gpt-6-astra`; released native runtime and real container acceptance remain verification gates, not claimed successes. This is an implementation plan, not completed implementation or deployment authorization.
