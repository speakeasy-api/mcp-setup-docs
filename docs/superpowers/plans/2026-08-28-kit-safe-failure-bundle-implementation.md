# Kit Safe Failure Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve a downloadable, seven-day GitHub Actions failure artifact containing only validated Kit tool lifecycle metadata and deterministic post-mortem classification.

**Architecture:** Enable pinned Kit's private runtime-event side channel and stream it through a fail-closed projector that suppresses unsafe summaries and identifiers. Assemble one exact diagnostic manifest inside/around the container, validate it again on the host, and upload only that file on failed Kit runs. Raw transcripts are never read.

**Tech Stack:** Bash 5, jq, Docker, Kit v0.1.98 runtime events, GitHub Actions upload-artifact v4, existing factory shell test harness.

**Spec:** `docs/superpowers/specs/2026-08-28-kit-safe-failure-bundle-design.md`

## Global Constraints

- Kit remains pinned to `0.1.98` with SHA-256 `7d14561469ced8af21df1075a9071d04a7bad1b1c5ff90d685142d3231abae85`.
- Never preserve or emit raw transcripts, runtime summaries, prompts, tool arguments/results, commands, URLs, content, environment values, credentials, session IDs, raw call IDs, or arbitrary errors.
- Runtime event count is capped at 512; duration is capped at 10,800,000 ms.
- Diagnostics are uploaded only for failed Kit steps and retained for exactly seven days.
- Kit receives no GH token, Pulse credentials, SSH credentials, or unrelated Actions secrets.
- Tests make no paid OpenRouter/Exa calls and use no real Pulse credentials.

## File map

- Create `factory/schemas/factory-diagnostics.schema.json`: exact public artifact contract.
- Create `factory/scripts/project-kit-events.sh`: streaming marked-event suppression and safe lifecycle projection.
- Create `factory/scripts/validate-diagnostics.sh`: exact recursive manifest and lifecycle validator.
- Create `factory/scripts/build-diagnostics.sh`: deterministic classification and atomic manifest assembly.
- Create `factory/tests/test-diagnostics.sh`: adversarial projector, builder, validation, and non-leakage coverage.
- Modify `factory/scripts/container-entrypoint.sh`: FIFO capture, Kit lifecycle, safe export.
- Modify `factory/scripts/run-kit.sh`: stale removal, build-failure synthesis, host validation, minimal logging.
- Modify `factory/tests/test-container.sh`: container/host integration and stale/non-leakage regressions.
- Modify `.github/workflows/guide-draft.yml`: upload the one validated failure artifact for seven days.
- Modify `factory/tests/test-coordinator.sh`: workflow contract assertions.
- Modify `factory/README.md`: operator download and interpretation instructions.

---

### Task 1: Define and validate the safe diagnostic schema

**Files:**
- Create: `factory/schemas/factory-diagnostics.schema.json`
- Create: `factory/scripts/validate-diagnostics.sh`
- Create: `factory/tests/test-diagnostics.sh`

**Interfaces:**
- Consumes: one manifest path.
- Produces: `validate-diagnostics.sh <manifest>` with no stdout on success and nonzero failure using fixed `factory: invalid diagnostics` stderr.

- [ ] **Step 1: Write failing exact-schema tests**

Create fixtures in `test-diagnostics.sh` with exact top-level keys `schema_version`, `kind`, `status`, `stage`, `classification`, `report`, `events`, and `kit_errors`. Assert rejection of extra keys, strings where booleans/integers are required, unknown enums, more than 512 events, durations over `10800000`, noncontiguous sequences, duplicate starts/finishes, finish-before-start, mismatched tools/operations for one `call_ref`, and the malicious nested key `events[0].details.prompt`. Include the existing safe Kit fatal record shape.

- [ ] **Step 2: Run the test and confirm RED**

Run: `bash factory/tests/test-diagnostics.sh`
Expected: failure because the validator and schema do not exist.

- [ ] **Step 3: Add the JSON Schema and recursive validator**

Use draft 2020-12 with `additionalProperties: false` at every object. In `validate-diagnostics.sh`, reject symlinks, run `jq -e` for exact recursive types/enums, then fold events in sequence order to enforce lifecycle consistency and caps. Emit only `factory: invalid diagnostics` on any rejection; never echo source JSON or jq errors.

- [ ] **Step 4: Run focused tests and ShellCheck**

Run: `bash factory/tests/test-diagnostics.sh && mise x shellcheck@0.10.0 -- shellcheck factory/scripts/validate-diagnostics.sh factory/tests/test-diagnostics.sh`
Expected: PASS and no ShellCheck output.

- [ ] **Step 5: Commit**

```bash
git add factory/schemas/factory-diagnostics.schema.json factory/scripts/validate-diagnostics.sh factory/tests/test-diagnostics.sh
git commit -m "feat(factory): define safe diagnostic manifest"
```

### Task 2: Project Kit runtime events without retaining summaries

**Files:**
- Create: `factory/scripts/project-kit-events.sh`
- Modify: `factory/tests/test-diagnostics.sh`

**Interfaces:**
- Consumes: Kit stderr on stdin and one output JSON path.
- Produces: ordinary stderr forwarded to stderr plus atomic JSON array at the output path; marked lines never forwarded.

- [ ] **Step 1: Add failing projector fixtures**

Use the exact marker byte followed by v0.1.98 `child_started`, `child_finished`, `session_started`, `compaction_started`, and `compaction_finished` JSON. Put unique canaries in `summary`, `call`, `session_id`, `reason`, command, prompt, URL, and output. Assert call refs become integers, sequence is contiguous, known anchored commands classify to stable operations, unknown shell commands become `unrecognized`, unknown tool names become `unknown`, success/duration project correctly, session and compaction events disappear, and no canary appears in stdout, stderr, or output. Add malformed/unknown event tests that remove partial output while continuing to drain input.

- [ ] **Step 2: Run the projector tests and confirm RED**

Run: `bash factory/tests/test-diagnostics.sh`
Expected: failure because `project-kit-events.sh` does not exist.

- [ ] **Step 3: Implement streaming projection**

Read with `IFS= read -r`. Forward unmarked lines with `printf '%s\n' >&2`. For marked lines, parse into a temporary file with jq, validate exact source event fields/types, maintain raw-call-to-integer mapping only in temporary state, classify allowlisted tool/operation enums, and atomically rename the final array. Trap cleanup removes all temporary files. Never print a marked source line or parse error.

- [ ] **Step 4: Verify projection and non-leakage**

Run: `bash factory/tests/test-diagnostics.sh && mise x shellcheck@0.10.0 -- shellcheck factory/scripts/project-kit-events.sh factory/tests/test-diagnostics.sh`
Expected: PASS; grep assertions find no canary.

- [ ] **Step 5: Commit**

```bash
git add factory/scripts/project-kit-events.sh factory/tests/test-diagnostics.sh
git commit -m "feat(factory): project safe Kit runtime events"
```

### Task 3: Build deterministic post-mortem manifests

**Files:**
- Create: `factory/scripts/build-diagnostics.sh`
- Modify: `factory/tests/test-diagnostics.sh`

**Interfaces:**
- Consumes: stage, Kit exit status, event array, optional validated report, optional validated safe Kit error summary, and output path.
- Produces: atomically written, validator-approved `factory-diagnostics.json`.

- [ ] **Step 1: Add failing classification tests**

Cover exact precedence: Docker build failure → `docker_build_failed`; container start/run failure → `container_run_failed`; nonempty validated Kit fatal records → `kit_fatal`; nonzero Kit with no fatal → `kit_prompt_failed`; zero Kit with no report → `missing_run_report`; present invalid report → `invalid_run_report`; validated report outcome `failed` → `factory_reported_failure`. Assert report projection contains only `exists`, `valid`, `outcome`, and `review_rounds`.

- [ ] **Step 2: Run tests and confirm RED**

Run: `bash factory/tests/test-diagnostics.sh`
Expected: failure because `build-diagnostics.sh` does not exist.

- [ ] **Step 3: Implement atomic assembly**

Validate every optional input before jq composition. Use fixed enum arguments rather than free-form messages. Project only validated report scalars and existing allowlisted Kit fatal fields. Run `validate-diagnostics.sh` on the sibling temporary output before `mv`. On any error remove temporary/final output and emit only `factory: diagnostics unavailable`.

- [ ] **Step 4: Verify classifications**

Run: `bash factory/tests/test-diagnostics.sh && git diff --check`
Expected: PASS and no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add factory/scripts/build-diagnostics.sh factory/tests/test-diagnostics.sh
git commit -m "feat(factory): classify safe failure diagnostics"
```

### Task 4: Integrate FIFO capture and host validation

**Files:**
- Modify: `factory/scripts/container-entrypoint.sh`
- Modify: `factory/scripts/run-kit.sh`
- Modify: `factory/tests/test-container.sh`

**Interfaces:**
- Consumes: projector, builder, validator, Kit stderr, and normal run outputs.
- Produces: `/export/factory-diagnostics.json` when and only when safe validation succeeds.

- [ ] **Step 1: Add failing container/host tests**

Extend fake Kit fixtures to emit interleaved marked events with secret summaries, ordinary stderr, success, nonzero failure, and zero exit without a report. Assert ordinary stderr remains, marked lines/canaries never appear, missing-report classification is preserved, safe fatal records remain exact, stale diagnostics are deleted before Docker build, and malformed container diagnostics are deleted rather than logged. Add a fake Docker build failure expecting a minimal `docker_build_failed` manifest with no child events.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `bash factory/tests/test-container.sh`
Expected: failure because runtime capture/host preservation is absent.

- [ ] **Step 3: Integrate the FIFO in `container-entrypoint.sh`**

Create a private FIFO and background projector, run Kit with `KIT_RUNTIME_EVENTS=1` and stderr redirected to the FIFO, capture Kit status without `set -e` aborting, wait for projector status, append safe call-ref-zero Kit events, validate report state, assemble diagnostics, and preserve existing guide/report export behavior. Traps remove FIFO and temporary files.

- [ ] **Step 4: Integrate host-side handling in `run-kit.sh`**

Delete stale diagnostics before build. Synthesize the fixed Docker-build manifest when no container can run. For container diagnostics, call the exact validator before retaining the file. Print at most `factory: diagnostics: stage=<enum> classification=<enum> events=<integer>`. Never print manifest JSON.

- [ ] **Step 5: Verify container regressions**

Run: `bash factory/tests/test-container.sh && mise x shellcheck@0.10.0 -- shellcheck factory/scripts/*.sh factory/tests/test-container.sh`
Expected: PASS and no ShellCheck output.

- [ ] **Step 6: Commit**

```bash
git add factory/scripts/container-entrypoint.sh factory/scripts/run-kit.sh factory/tests/test-container.sh
git commit -m "feat(factory): preserve safe runtime diagnostics"
```

### Task 5: Upload the validated failure artifact

**Files:**
- Modify: `.github/workflows/guide-draft.yml`
- Modify: `factory/tests/test-coordinator.sh`
- Modify: `factory/README.md`

**Interfaces:**
- Consumes: `$RUNNER_TEMP/export/factory-diagnostics.json`.
- Produces: Actions artifact `guide-factory-diagnostics-${{ github.run_id }}-${{ github.run_attempt }}` retained seven days.

- [ ] **Step 1: Add failing workflow contract assertions**

Assert one `actions/upload-artifact@v4` step named `Upload safe factory diagnostics`, condition `failure() && steps.kit.outcome == 'failure'`, exact single-file path, `retention-days: 7`, `if-no-files-found: ignore`, and the run-ID/run-attempt artifact name. Assert the issue failure step does not read or inline diagnostics.

- [ ] **Step 2: Run workflow contract tests and confirm RED**

Run: `bash factory/tests/test-coordinator.sh`
Expected: failure because the upload step is absent.

- [ ] **Step 3: Add the upload step and operator docs**

Place upload after `Run Kit` and before failure reporting with `if: failure() && steps.kit.outcome == 'failure'`. Document:

```bash
gh run download RUN_ID \
  --repo speakeasy-api/mcp-setup-docs \
  --name guide-factory-diagnostics-RUN_ID-RUN_ATTEMPT
jq . factory-diagnostics.json
```

State that artifacts are repository-access-controlled, expire after seven days, and contain no raw transcript or tool payloads.

- [ ] **Step 4: Run workflow checks**

Run: `bash factory/tests/test-coordinator.sh && actionlint .github/workflows/guide-draft.yml`
Expected: PASS and no actionlint findings.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/guide-draft.yml factory/tests/test-coordinator.sh factory/README.md
git commit -m "feat(factory): upload safe failure diagnostics"
```

### Task 6: Final security and regression verification

**Files:**
- Modify only if verification exposes a defect.

**Interfaces:**
- Consumes: complete implementation.
- Produces: review-ready branch with offline evidence.

- [ ] **Step 1: Run the complete factory suite**

Run: `GOFLAGS='-ldflags=-linkmode=external' bash factory/tests/run.sh`
Expected: every `test-*.sh` file passes, including `test-diagnostics.sh`.

- [ ] **Step 2: Run static checks**

Run:

```bash
mise x shellcheck@0.10.0 -- shellcheck factory/scripts/*.sh factory/tests/*.sh
actionlint .github/workflows/guide-draft.yml
git diff --check
```

Expected: all commands exit zero with no findings.

- [ ] **Step 3: Run bounded canary scan**

Run: `rg -n 'SECRET_CANARY|PROMPT_CANARY|URL_CANARY|SESSION_CANARY|CALL_CANARY' factory/tests/test-diagnostics.sh factory/tests/test-container.sh` and confirm every canary appears only in input fixtures/assertions. Run the tests once more and confirm none appears in captured stdout, stderr, or output artifacts.

- [ ] **Step 4: Request independent security review**

Ask the reviewer to inspect the full diff for raw-event leakage, malformed-event fail-open behavior, stale artifact reuse, workflow over-upload, lifecycle validation gaps, and any path that could print manifest/source JSON. Fix every Critical or Important finding and rerun Steps 1–3.

- [ ] **Step 5: Commit verification fixes if needed**

```bash
git add factory .github/workflows/guide-draft.yml
git commit -m "fix(factory): harden safe diagnostic bundle"
```
