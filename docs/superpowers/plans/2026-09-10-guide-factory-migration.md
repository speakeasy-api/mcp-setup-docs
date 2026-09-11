# Guide Factory Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current guide coordinator with the approved five-topic research workflow, one writer, deterministic checks, and useful sanitized run artifacts.

**Architecture:** Keep GitHub lifecycle operations in the existing Action/publisher and replace `factory/coordinator.md` with the promoted prompt. Use small deterministic helpers for exact dispatch and transcript export, in the existing Go module. Keep the existing metadata-only diagnostics as the fallback when a readable export cannot be safely produced.

**Tech Stack:** Go 1.27.0, Titus v1.2.9 (pure-Go matcher), Kit 0.1.130 as currently pinned, Bash/jq, GitHub Actions, existing guide schema/linter.

**Spec:** [Agreed design and decision record](guide-factory-migration-working-checklist.md), the [research prompt](../../research-prompt-draft.md), and [Titus feasibility results](titus-transcript-feasibility.md). Read all three. The decision record overrides conflicting experimental prompt text and superseded proposals.

**Status:** Ready for implementation review; no production changes have been made. Technical interfaces below are the proposed implementation of the agreed decisions, not claims that helpers already exist.

## Global Constraints

- Go **1.27.0** across this repository; no separate sanitizer module.
- Research **15-minute target / 30-minute hard limit**; writing is outside this window.
- At most **two research follow-up rounds**, reusing original topic sessions.
- Exactly **one dedicated writer**; at most **one deterministic-validation repair** followed by revalidation.
- **No automated editorial reviewer agents, no automatic merge, no bypass of repository safeguards.**
- Four generated files only: `research.md`, `meta.yaml`, `external.md`, `speakeasy.md` under the resolved `guides/<slug>/`.
- Preserve unrelated existing files; do not install or publish failed/incomplete guide output.
- Sanitized transcripts for success and failure, **seven-day retention**; no raw-log fallback.
- Known runtime secrets must be redacted; no Titus live credential validation; scanner warnings/errors withhold readable output.
- Production execution is one-shot: joined calls, caught failures, validated atomic final report.
- Do not upgrade Kit or change the model as incidental cleanup. Leave experiment directories untouched.

---

## Approved execution amendment: process-supervised research

After Tasks 1–2 passed review, pinned Kit 0.1.130 source confirmed native
subagent dispatch has no deadline argument. The user approved a small local
process supervisor instead of changing Kit or weakening the hard limit.
Read [Task 3a supervisor amendment](2026-09-10-research-supervisor-amendment.md).
It is authoritative over the native research dispatch example below: the
supervisor calls the existing assembler and passes its exact bytes directly
to `kit prompt`, resuming stored topic session IDs for follow-ups.

Execute Task 3a and review it before Task 3 (now 3b) coordinator integration.
The coordinator retains research sequencing, global follow-up waves, deadline
budgeting, and audit decisions. The dedicated writer may remain native.
Tasks 6–7 must include the supervisor's private records, binary and CI tests.
No replacement framework, new module, or Kit version change is authorized.

## Delivery order and file map

Tasks 1–7 are one coordinated migration. Task 2 and Task 5 may proceed independently after Task 1 if file ownership is separated. Task 3 depends on Task 2; Task 4 consumes Task 3's report contract; Task 6 consumes Tasks 4–5. Task 7 integrates the image and CI. Tasks 8–9 are verification/rollout gates.

| Area | Existing files | New files |
|---|---|---|
| Toolchain | `go/go.mod`, `go/go.sum`, `mise.toml`, `factory/Dockerfile`, `factory/tests/test-container.sh` | None |
| Exact prompt assembly | `factory/coordinator.md` | `go/internal/factoryprompt/prompt.go`, `prompt_test.go`; `go/cmd/prepare-research-prompt/main.go`, `main_test.go` |
| Research/writer | `factory/coordinator.md`, `factory/scripts/inspect-guide-context.sh`, `factory/scripts/inspect-guide-artifacts.sh`, relevant factory tests | Checked-in synthetic prompt input fixtures under `factory/tests/fixtures/research/` |
| Reporting/publication | `factory/scripts/container-entrypoint.sh`, `validate.sh`, `publish.sh`, `validate-report.sh`, `factory/schemas/run-report.schema.json`, their tests | None unless a focused fixture is needed |
| Sanitization/export | Existing `factory/scripts/build-transcript.sh` and `transcript.jq` stay metadata-only | `go/internal/factorytranscript/{sanitize.go,sanitize_test.go,export.go,export_test.go}`; `go/cmd/export-transcript/{main.go,main_test.go}`; `factory/tests/test-readable-transcript.sh` |
| Integration/docs | `.github/workflows/{guide-draft,factory-ci}.yml`, `factory/scripts/run-kit.sh`, `factory/README.md`, `FACTORY.md`, `docs/research-prompt-draft.md` | None |

Do not introduce a generic agent orchestration framework, a second production coordinator, or a custom secret-rule database.

## Contracts shared by tasks

### Prompt assembly

Production command:

```text
/usr/local/bin/prepare-research-prompt \
  --document /workspace/factory/coordinator.md \
  --sha256 <run-pinned-document-hash> \
  --kind initial|follow-up \
  --input /workspace/.factory/research/<assignment>.input.json
```

Stdout contains only the exact assembled prompt; failures return nonzero with a fixed error category, not input contents. The coordinator pins the document hash once before research. The command rejects a mismatch, missing/duplicate headings, invalid topics, reordered/extra/missing input fields, and invalid budgets/follow-up indexes. Preserve section bytes rather than reflowing Markdown.

Initial output: complete common instructions, selected Topic N, complete return format, then labeled ordered run input. Follow-up output: complete follow-up instructions plus labeled ordered follow-up input. Follow-up indexes are 1 or 2 and use the same topic session.

### Outcome and artifact contract

Keep the existing report schema version and outcome names where possible; do not add a new status merely because editorial review is removed.

| New run result | Report outcome | `artifacts` | Publishing |
|---|---|---|---|
| Complete research, four files verified and lint passes | `converged` | Exactly the four names | Open/update PR |
| Unsupported endpoint, unresolved material evidence/identity, incomplete required audit | `blocked` | `[]` | Issue comment only |
| Agent/process/helper failure, timeout preventing completion, exhausted writer repair | `failed` | `[]` | Issue comment only |

The new coordinator need not emit `awaiting_scope`: operator questions fit a `blocked` report's existing `open_questions`. Keep compatibility parsing of historical reports if tests depend on it, but no non-`converged` outcome may create/update a guide PR in the new publishing path. Research limitations belong in the dossier; `open_questions` are operator-actionable, not a request to repeat public-source searches.

All new runs record `review_rounds: 0`. The writer's one validation repair is not a review wave. Record create/update selection in `summary` rather than adding a report field. Failed candidate files and research are diagnostic content, never listed as installable report artifacts.

### Readable artifact

Command:

```text
/usr/local/bin/export-transcript \
  --home /tmp/kit-home \
  --workspace /workspace \
  --output /export/session-transcript.json
```

The command reads `OPENROUTER_API_KEY` from its inherited environment, never command-line arguments. It produces a sanitized, indented JSON artifact with `schema_version: 1`, `kind: "guide_factory_readable_transcript"`, `limited`, `omissions`, `sessions`, and `files`. Stable anonymous session/call references replace original identifiers. `sessions` contains readable selected events; `files` contains allowlisted research records and failed draft snapshots needed when logs alone are insufficient. It is not a raw-session archive.

Success exits 0 only after final validation and atomic rename; failures leave no readable output and return a fixed category. Metadata-only `execution-transcript.json` and `factory-diagnostics.json` remain separate fallbacks. A sanitizer failure is nonfatal to an otherwise valid guide run; it must not be mistaken for successful readable export.

---

### Task 1: Upgrade the existing Go toolchain

**Files:** `go/go.mod`, `mise.toml`, `factory/Dockerfile`, `factory/tests/test-container.sh`; inspect `.github/workflows/*go*.yml` and `.github/workflows/factory-ci.yml`.

**Consumes:** agreed Go 1.27.0 requirement. **Produces:** one repo toolchain, no extra module.

- [ ] Update the container contract test to require `go 1.27.0` in the module, `go = "1.27.0"` in mise, and a digest-pinned Go 1.27.0 builder. Run the test before editing runtime configuration and verify it fails on the old pin.
- [ ] Resolve a real official Go 1.27.0 Debian builder image digest using the registry; retain digest pinning. Do not fabricate or silently drop the digest. If the matching image is unavailable, report the blocker rather than changing the requested version.
- [ ] Apply the module/mise/builder changes. Existing setup-go jobs use `go-version-file: go/go.mod`; retain that mechanism. The consumer-bump workflow intentionally reads the consumer's own go.mod, so do not substitute this repository's version there.
- [ ] Run:

```sh
bash factory/tests/test-container.sh
(cd go && GOTOOLCHAIN=go1.27.0 go test ./...)
rg -n '1[.]22|go-version|golang:' mise.toml go/go.mod factory/Dockerfile .github/workflows
```

Expected: container test and Go tests pass; no active local 1.22 pin remains. Historical prose/fixtures need not be rewritten indiscriminately. Record that consumers now need Go 1.27 or toolchain download support.
- [ ] Review the targeted diff and commit only this task's files.

### Task 2: Assemble research prompts in code and dispatch without rewriting

**Files:** new `go/internal/factoryprompt/` and `go/cmd/prepare-research-prompt/`; new `factory/tests/fixtures/research/` inputs. Build/copy wiring belongs to Task 7.

**Interfaces:**

```go
// kind is "initial" or "follow-up". expectedSHA256 is mandatory.
func Assemble(document []byte, expectedSHA256, kind string, input []byte) ([]byte, error)
```

- [ ] Create table tests from the draft's exact sections and ordered JSON objects. Cover initial topics 1–5, both follow-up indexes, unchanged bytes/hash, and missing/duplicate headings. Include instructions inside input strings as data, not additional prompt sections.
- [ ] Add a determinism check and invalid-input checks:

```go
first, err := Assemble(document, hash, "initial", topic5Input)
if err != nil { t.Fatal(err) }
second, err := Assemble(document, hash, "initial", topic5Input)
if err != nil || !bytes.Equal(first, second) { t.Fatal("non-deterministic prompt") }
if _, err := Assemble(document, strings.Repeat("0", 64), "initial", topic5Input); err == nil {
    t.Fatal("accepted changed document")
}
```

Here `document`, `hash`, and `topic5Input` are fixtures loaded/generated by the test, not live provider data. Assert exactly one topic heading and absence of coordinator instructions in initial outputs.
- [ ] Run `cd go && go test ./internal/factoryprompt ./cmd/prepare-research-prompt` and observe the missing implementation failure.
- [ ] Implement heading extraction with same/higher-level section termination, ordered-object validation, SHA-256 validation, and the CLI above using standard library only. Validate null/list/scalar rules and topic/budget bounds from the prompt. Return only assembled text on stdout.
- [ ] Test direct dispatch in the coordinator's Runlet contract; the required pattern is a data dependency, not model copying:

```runlet
prepared = shell({command: "/usr/local/bin/prepare-research-prompt --document /workspace/factory/coordinator.md --sha256 <hash> --kind initial --input /workspace/.factory/research/topic-5.input.json"})
assert(prepared.success, "research prompt assembly failed")
child = subagent({prompt: prepared.stdout})
return child
```

The production version wraps assembly/dispatch in caught boundaries and returns a bounded reusable handle/result. Follow-ups use `prompt({subagent: existingHandle, prompt: prepared.stdout})`. Do not set model/harness overrides. Save actual text/hash/input/topic/index as private run records before the call.
- [ ] Rerun package tests and review. Commit the helper and fixtures, not provider experiment outputs.

### Task 3: Replace the coordinator's research and context flow

**Files:** `factory/coordinator.md`, `factory/scripts/inspect-guide-context.sh`, `factory/scripts/inspect-inputs.sh` if identity projection requires it; `factory/tests/test-coordinator.sh`, `test-inspect-guide-context.sh`, `test-inspect-inputs.sh`, `test-contracts.sh`.

**Consumes:** Task 2 assembler. **Produces:** resolved context, original topic handles, reconciled dossier under `/workspace/.factory/research/`, terminal research result.

- [ ] Replace tests that mandate the old single researcher/three reviewers with explicit new contract assertions. Test new behavior rather than just changing every old phrase expectation to pass.
- [ ] Add context fixtures where an existing guide instruction contains `OLD_GUIDE_RESEARCH_CANARY`. Verify the research handoff excludes it. Existing instructions and representative guide examples must not enter topic inputs; identity metadata and approved doctrine remain available. Verify exact slug matching, create-for-existing, update-for-missing, ambiguous identity, unrelated path collision, and traversal refusal.
- [ ] Promote the draft text into `factory/coordinator.md`, preserving the common/topic/return/follow-up sections as exact source text. Rewrite only coordinator integration/approved changes, including experimental/inactive status wording and the now-implemented exact-dispatch requirement. Add concrete `/input/issue.json`, `/input/catalog.json`, `/workspace` and helper paths. Pin document hash once.
- [ ] Resolve identity with bounded directory/metadata reads. Reuse existing YAML parsing facilities if a helper is needed; do not parse YAML with regex. Do not expose full existing metadata as research when only identity fields are needed. Allow safe create/update fallback but not overwriting another service.
- [ ] Implement the required sequence in the coordinator instructions:

```text
resolve context and destination; start one shared research clock
Topic 5 -> endpoint gate -> Topics 1,2,3,4 concurrently
collect complete reports -> bounded same-session gap follow-ups
resolve authentication path -> final Topic 1 authority audit
consolidate canonical actions and dossier -> research completion decision
```

The two-round limit is global follow-up waves, not two arbitrary retries per topic. Reserve a permitted wave/time for the final audit. A changed selected action after the audit requires re-audit within remaining limits or a stop. Start no new research at the 30-minute deadline. Preserve last complete reports; never replace them with empty/partial output.
- [ ] Add central client-source fallback with commit-pinned Gram references, applicable tests/conditions, and observation dates; share it via structured follow-up input. Keep documented user procedures distinct from automatic client behavior.
- [ ] Preserve caught failure finalization, untrusted-input boundaries, inherited model settings, and joined one-shot execution. Permit private `.factory/research/` records and the report, not arbitrary writes. Keep topic agents findings-only and forbid GitHub operations for every agent.
- [ ] Run the four targeted shell tests above. These are static/helper tests, not evidence the model obeys every instruction; actual dispatch/sequence evidence is required in Task 8.
- [ ] Review and commit with the writer/report integration in Task 4 before any rollout.

### Task 4: One writer, one repair, and successful-only installation/publication

**Files:** `factory/coordinator.md`; `factory/scripts/{inspect-guide-artifacts,container-entrypoint,validate,publish,validate-report}.sh`; `factory/schemas/run-report.schema.json` only if needed; tests `test-coordinator.sh`, `test-report-validator.sh`, `test-inspect-guide-artifacts.sh`, `test-export-boundary.sh`, `test-publish.sh`.

**Consumes:** Task 3 dossier and outcome contract. **Produces:** successful four-file export or comment-only terminal report; optional private failed draft snapshot.

- [ ] Add a schema/validator regression proving zero review rounds are accepted without adding a new status:

```sh
jq -n '{schema_version:1,outcome:"converged",provider:"Example",slug:"example",
 persona:"it-admin",summary:"Created guide; validation passed.",open_questions:[],
 blockers:[],nits:[],review_rounds:0,
 artifacts:["research.md","meta.yaml","external.md","speakeasy.md"]}' >"$TMP/report.json"
bash "$ROOT/factory/scripts/validate-report.sh" "$TMP/report.json"
```

Use the existing test suite's temporary-directory setup. Add blocked/failed reports with resolved identity and zero artifacts; assert they do not require a guide directory, install files, invoke commit/push/PR creation, or alter a resumed PR's files.
- [ ] Dispatch exactly one writer with the reconciled dossier, selected paths/mode, persona, STE and source-supported detail rules. No new external research. Have it save all four files and return a bounded completion result. Preserve initial refresh-token setup instructions but exclude credential renewal/rotation procedures.
- [ ] Run the existing artifact helper and `/usr/local/bin/lint-guide --json /workspace/guides/<slug>` from the coordinator; validate the linter's JSON. Missing/invalid generated files and valid linter findings go to the same writer once. Re-run both checks. A tool crash/malformed linter result is operational failure, not permission for unlimited repair or fabricated findings.
- [ ] Set report outcomes per the shared table, always `review_rounds: 0`. Atomically write/validate/rename `.factory/run-report.json` even after caught failure. Never claim convergence from the writer's statement alone.
- [ ] Before exporting, require a validated `converged` report. Copy only its four regular generated files, not `cp -a` of the whole target directory. For other outcomes leave the installable export empty and preserve diagnostics privately for Task 6.
- [ ] Change `validate.sh` so non-success reports take a no-install path with no guide required. Keep path/symlink/report/artifact checks; reject unexpected installable files rather than ignoring them.
- [ ] On updates preserve unrelated pre-existing bundle files. Snapshot/check their identity and contents; stage from the existing destination without following symlinks, replace only the four generated files, validate those files, and retain transactional rollback. Reject agent-created/changed extras. Add a fixture with an existing `notes.txt`, verify unchanged bytes after update, and assert injected extra files are rejected. Do not relax the exported four-file allowlist.
- [ ] Restrict `publish.sh` PR/commit behavior to `converged`. Other outcomes post bounded issue comments with the run URL; retain existing labels/resume mechanics and status-comment marker so old factory comments do not become fresh user input. Success says drafted/validation passed, not automated editorial review.
- [ ] Run all six targeted tests listed in Files. Verify safety tests still fail when validation/PR gating is deliberately removed. Review and commit.

### Task 5: Implement the Titus redaction core

**Files:** `go/go.mod`, `go/go.sum`, `go/internal/factorytranscript/sanitize.go`, `sanitize_test.go`.

**Consumes:** Go 1.27.0. **Produces:** reusable bounded sanitizer with no networking/credential validation.

```go
func NewSanitizer(knownSecrets []string) (*Sanitizer, error)
func (s *Sanitizer) Sanitize(text []byte) ([]byte, error)
func (s *Sanitizer) Close() error
```

- [ ] Pin `github.com/praetorian-inc/titus v1.2.9`; import its `pkg/rule` and `pkg/matcher`, not the root convenience scanner. Do not instantiate `pkg/validator`. Use CGO-disabled builds.
- [ ] Port the spike into durable synthetic tests. Cover repeated values, Unicode byte offsets, overlapping ranges, distinct credentials, JSON-decoded input, exact known secrets not recognized by Titus, empty known values, clean text, and final rescan.

```go
fake := "ghp_" + "aB3dE6gH9jK2mN5pQ8sT1vW4yZ7cD0fG3hJ6"
s, err := NewSanitizer(nil)
if err != nil { t.Fatal(err) }
defer s.Close()
out, err := s.Sanitize([]byte("Evidence ✓\n" + fake + "\nAgain: " + fake))
if err != nil { t.Fatal(err) }
if bytes.Contains(out, []byte(fake)) { t.Fatal("repeated credential survived") }
```

- [ ] Run `cd go && CGO_ENABLED=0 go test ./internal/factorytranscript -run 'Sanit|Redact|Timeout'` and observe failures before implementation.
- [ ] Load rules once. Redact exact nonempty known secret values and practical JSON/URL/base64 encodings; do not treat an empty string as a match. Scan decoded text, merge overlapping ranges, and redact all occurrences of captured nonempty values so deduplication cannot leave copies. Keep output markers explicit. Accumulate detected sensitive values for a final whole-export pass so repeats across fields are also removed.
- [ ] Use an atomic warning flag because callbacks may run concurrently internally, even when export calls are sequential. Any compile/regex warning, scan error, invalid offset, or non-clean final check returns a fixed error without echoing content. Do not retry indefinitely. Do not assume context cancellation interrupts regex matching; bound the outer process too.
- [ ] Reproduce the spike's timeout case using a synthetic `(a+)+b` rule and 5,000 `a` characters plus `c`. Assert the wrapper refuses output even when Titus returns nil error with a warning. A clean result is not allowed after any incomplete scan.
- [ ] Run package tests and the existing Go tests; review and commit. Performance measurement comes from bounded representative fixtures, not the spike's tiny-input timings alone.

### Task 6: Export readable, bounded session records without raw-log leakage

**Files:** `go/internal/factorytranscript/{export.go,export_test.go}`, `go/cmd/export-transcript/{main.go,main_test.go}`, `factory/tests/test-readable-transcript.sh`. Existing structural exporter stays unchanged except necessary integration tests.

**Consumes:** Task 5 sanitizer and the CLI/artifact contract. **Produces:** sanitized `session-transcript.json` or no readable file.

- [ ] Create synthetic fixtures using the real externally tagged record shapes from `factory/tests/test-transcript.sh`, not made-up role/message JSON:

```json
{"schema_version":3,"item":{"kind":"Assistant","parts":[{"Text":{"text":"public research finding"}}]}}
```

Cover parent and child files; versions 1–3; replacement records; Text/Structured tool outputs; nested compose output; unknown variants; Reasoning; truncated tails; and linked files. Test `ToolCall.input` and `ToolResult.output` separately. Never use real credentials in fixtures.
- [ ] Keep readable assistant/user text and selected tool inputs/results. Omit Reasoning, arbitrary metadata, binary/media, credential-file payloads, private catalog payloads, and recognized environment dumps. Recursively sanitize retained strings and object keys; decode Text-wrapped JSON before scanning. Anonymous session/call IDs preserve useful correlations without copying original identifiers. Secret detection does not make private non-credential data public; retain the existing catalog confidentiality boundary.
- [ ] Enforce initial limits matching the structural export: at most 64 session files, 1 MiB per file, 8 MiB total input, 4,096 events, and 2 MiB final output. Apply input bounds to supplemental files/spills too, not an unbounded second channel. Add a 60-second process deadline in the caller. Omit incomplete records/fields rather than exporting clipped raw text that could hide a credential prefix from detection. Record truncation/omissions explicitly; never represent bounded capture as complete research recovery. Tune only after Task 8 evidence, with tests for the new bounds.
- [ ] Use physical-path checks and reject symlink components below the allowed roots. Read only known session files, `.factory/research/` records produced by the coordinator, and the four selected guide files identified by a validated report. Unrelated filesystem paths mentioned in tool output are data, not instructions to read them. For Kit spill references, only read verified regular files under the runtime's actual artifact root, within the same limits; otherwise emit an omission marker. Do not archive the whole Kit home or workspace.
- [ ] Capture selected failed draft file contents as sanitized `files` entries when needed; do not put them in the installable guide export. Preserve complete topic reports separately within the same artifact when session truncation would otherwise lose them. Read only explicit expected filenames, not arbitrary directories supplied by model text.
- [ ] On a malformed final JSONL line, omit raw bytes, mark incompleteness, and retain prior sanitized records. On sanitizer warnings/errors or unsafe traversal, withhold the readable export. These are distinct from harmless unsupported-format omissions.
- [ ] Write privately to a sibling temporary file, sanitize/recheck the final serialization, enforce the output schema/size, then chmod 0644 and atomically rename. Remove stale output at start. Never print original text, secret values, scanner matches, or raw paths in errors.
- [ ] Add CLI tests with a fake key set only in the child environment. Assert the key is absent from output, stdout, and stderr; warnings/errors leave no output. Assert the successful artifact is host-readable and contains a public research finding, not merely metadata.
- [ ] Run:

```sh
(cd go && CGO_ENABLED=0 go test ./internal/factorytranscript ./cmd/export-transcript)
bash factory/tests/test-readable-transcript.sh
bash factory/tests/test-transcript.sh
```

Expected: readable-content tests pass and original metadata-only leak-canary tests still pass. Review and commit.

### Task 7: Wire binaries, safe artifact uploads, and operator docs

**Files:** `factory/Dockerfile`, `factory/scripts/{container-entrypoint,run-kit}.sh`, `.github/workflows/{guide-draft,factory-ci}.yml`, `factory/tests/{test-container,test-transcript,test-readable-transcript,test-export-boundary}.sh`, `factory/README.md`, `FACTORY.md`, `docs/research-prompt-draft.md`.

**Consumes:** Tasks 2–6 binaries and contracts. **Produces:** integrated factory without a second production pipeline.

- [ ] Add failing container/Action tests for both helper binaries, a separate explicit readable artifact upload, seven-day retention on success/failure, and no raw-session/export-directory glob.
- [ ] Build `prepare-research-prompt` and `export-transcript` alongside `lint-guide` in the existing Go builder, with `CGO_ENABLED=0 GOOS=linux GOARCH=amd64`. Copy the binaries into the runtime. Pin the Go image digest and Titus version; keep Kit config unchanged.
- [ ] Invoke readable export after the Kit process exits and before report-result branching, under the explicit 60-second limit, so failed Kit runs can still preserve safe evidence. Keep structural export independent. On readable failure remove the candidate, emit only a fixed notice, and continue normal diagnostics/report handling.
- [ ] Add an Actions upload step with `if: always() && !cancelled() && (steps.kit.outcome == 'success' || steps.kit.outcome == 'failure')`, exact path `${{ runner.temp }}/export/session-transcript.json`, `retention-days: 7`, and `if-no-files-found: ignore`. Never upload raw scanner logs/datastores. Abrupt runner loss/cancellation is best effort, not guaranteed capture.
- [ ] Extend factory CI path filters for `go/go.mod`, `go/go.sum`, the new command/internal packages, and test fixtures. Extend its Go test step to cover those packages. Keep all existing required checks.
- [ ] After successful local migration verification, replace the draft document with a short provenance/redirect note pointing to the active coordinator, so there is one maintained prompt. Historical experiment snapshots stay untouched. Update FACTORY.md and factory/README.md for the sequence, Go version, statuses, one repair, artifacts/redactions/limitations, and existing trigger/resume behavior. Remove stale claims of reviewer convergence and old Kit version prose where touched.
- [ ] Run targeted shell tests, then `bash factory/tests/run.sh` and shellcheck. Review the workflow diff specifically for trigger/permission/retention changes; commit only intended changes.

### Task 8: Verify locally in an isolated workspace before rollout

**Files:** tests/fixtures from earlier tasks; update this plan's verification record with results, not generated guide bundles or raw logs.

**Consumes:** integrated image. **Produces:** evidence that the actual Kit runtime follows the new path.

- [ ] Use an isolated implementation worktree. Do not run installation validation against the original workspace containing untracked experiments/planning docs. The validator intentionally rejects unrelated dirty paths. Review/commit intended task changes before clean-tree drift checks.
- [ ] Run offline checks with Go 1.27.0:

```sh
(cd go && GOTOOLCHAIN=go1.27.0 CGO_ENABLED=0 go test ./...)
bash factory/tests/run.sh
shellcheck factory/scripts/*.sh factory/tests/*.sh
bash go/check.sh
```

`go/check.sh` expects a clean committed tree and regenerates files; do not weaken it to accommodate work in progress.
- [ ] Build the image using existing pinned Kit settings:

```sh
set -a
. factory/config.env
set +a
docker build --build-arg KIT_VERSION="$KIT_VERSION" \
  --build-arg KIT_SHA256="$KIT_SHA256" -f factory/Dockerfile .
```

- [ ] Run one authorized full provider draft through the container with a temporary normalized issue/catalog fixture. Use `factory/scripts/run-kit.sh <issue-json> <catalog-json> <export-dir>` so artifacts survive for inspection; `local-draft.sh` removes its temporary export on exit. Do not enable GitHub publishing for this local run. Use normal secret injection without displaying credential values.
- [ ] Inspect only sanitized artifacts. Verify actual dispatched prompt hashes/bytes against the assembler, five distinct initial topic sessions, Topic 5 before Topics 1–4, reused follow-up sessions, two-round maximum, authentication selection before audit, shared timing, one writer, no reviewers, four durable files, lint success, and truthful report text. Confirm parent/child reports and useful sources appear in the artifact.
- [ ] Test update behavior on a fixture with an existing bundle and unrelated file. Confirm no existing instructions in research inputs, no alias duplicate, and unrelated-file preservation. Test create/update verb mismatch in both directions.
- [ ] Exercise deterministic failure fixtures without live provider research: no endpoint, unresolved audit, agent timeout/partial output, first lint failure repaired, repeated lint failure, sanitizer timeout, malicious path, failed resume. For each, assert the report/installation/publication/artifact behavior defined above.
- [ ] Measure representative transcript export within the 60-second budget and capture limits. If essential reports are missing, do not claim log-only recovery; fix the bounded supplemental file capture or explicitly revisit limits before rollout.
- [ ] Record commands, outcomes, safe artifact locations, elapsed timings, and limitations in the verification section below. Cross-compilation alone does not satisfy this gate. Request review before integration; preserve all repository safeguards.

### Task 9: Authorized Action verification and rollout

**Files:** only fixes supported by verification findings; do not create a permanent second workflow.

- [ ] Land changes through normal required reviews/checks/merge policy. Do not add bypass labels or change protection rules. If normal policy blocks progress, report it.
- [ ] Trigger one authorized `guide:draft` issue through the existing Action after the replacement is available. Confirm it opens the intended PR with four valid files and truthful drafted/validated status. Confirm sanitized transcript and metadata diagnostics are separate seven-day artifacts.
- [ ] Exercise an authorized update/resume case and confirm existing PR/branch handling and guide identity remain correct. Use the fake publisher tests, not destructive live failures, to cover repeated validation failure and no-PR outcomes.
- [ ] Inspect required checks and human-review readiness. Do not merge the generated guide automatically.
- [ ] If production behavior materially regresses, revert the migration through the normal reviewed workflow rather than bypassing checks or enabling an unreviewed parallel pipeline. Preserve safe diagnostic artifacts before their expiry.

## Requirements-to-task coverage

| Agreed requirement | Tasks |
|---|---|
| Replace coordinator / one prompt | 2, 3, 7 |
| Flexible destination / fresh research / preserve unrelated files | 3, 4, 8 |
| Central client fallback | 3, 8 |
| Endpoint-first / exact dispatch / bounded follow-ups / authority audit | 2, 3, 8 |
| Shared research time budget / incomplete evidence | 3, 6, 8 |
| One writer / one deterministic repair | 4, 8 |
| Success-only PR / honest reporting / safeguards | 4, 7, 9 |
| Titus / Go 1.27.0 / safe seven-day transcripts | 1, 5, 6, 7, 8 |
| Staged verification / no second pipeline | 8, 9 |

## Verification record

Planning-time evidence only: Titus v1.2.9 synthetic redaction and warning-observation
checks passed in an isolated scratch module; a static Linux/amd64 test binary
cross-compiled. See the separate feasibility report. No production-container
execution, repo-wide Go upgrade, coordinator migration, or live Action test has
been performed as part of planning. Fill this section with actual command
results as tasks execute; do not convert proposed checks into success claims.

## Execution handoff

Execute task-by-task with review checkpoints. Prefer one scoped commit per
reviewable task and no bulk staging of local experiments. Recommended mode:
subagent-driven development with a fresh agent per task and review between tasks.
Inline execution with the executing-plans workflow is also supported.
