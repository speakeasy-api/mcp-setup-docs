# Host-controlled guide runner: transport-first implementation plan

> **For agentic workers:** Use subagent-driven-development. Complete and review the transport milestone before changing the production workflow.

**Goal:** Remove model reproduction of orchestration programs while retaining Kit-powered research and writing and all trusted acceptance gates.

**Architecture:** A controller-owned Go executable runs inside the existing container. It owns research sessions through `kit prompt` / `--resume`, while the existing outer supervisor owns deadlines, cleanup, finalization and installation. Models return findings and bounded decisions, never workflow programs.

**Tech Stack:** Existing Go 1.27 standard library, pinned Kit 0.2.2, existing shell helpers and Docker image. No new dependencies or Kit modifications.

**Spec:** User-approved host-runner direction in this conversation; concrete design and constraints below. Workflow/doctrine replacement still requires approval of its concrete diff under constitution I8.

## Global constraints

- Local-only: no pushes, PRs, publication, Actions triggers or merges.
- Preserve unrelated guides and 13 baseline running containers.
- Research 1800 seconds, writing 900 seconds, outer ceiling 2700 seconds, finalization 300 seconds; no model turn or retry resets a clock.
- Pinned Kit source `bf347453982d0d62f57d4f4c38d2541537f967f9`; verified official image remains the production runtime.
- Preserve read-only repository/input mounts, private workspace/home, credential isolation and non-root ownership.
- Preserve document hashing, exact assembled research instructions, safe path checks, artifact validation, append-only identities, sanitizer failure handling and finalization gates.
- No automatic replay of a failed/ambiguous turn, no `--force`, no replacement writer, no continuation using model-supplied session IDs.
- Existing export failure remains unresolved; orchestration migration is not itself proof of acceptance.

## Design boundaries

`factoryrun` remains lifecycle control. A separate `factorycontroller` package owns workflow and a concrete CLI transport; do not turn the lifecycle package into a research engine. Container entrypoint eventually invokes `guide-factory`, built through the existing Dockerfile. No external queue, database, plugin system, or generic workflow framework.

One Kit process per completed turn, same HOME and physical workspace. A successful CLI emits answer bytes followed by its terminal `session_id: ID` line. Require exit success, bounded output, valid terminal identity, and equality with the stored identity on resume. Persist the identity only from successful runtime output, not model JSON. Lock each topic against overlapping turns. Failed/cancelled initial sessions may leave native logs without a returned ID: retain for host export, never infer a resumable identity or rerun automatically.

The controller runs Topic 5 first, then Topics 1–4 concurrently. Structured model decisions resolve authentication and material gaps; code schedules follow-ups to original sessions within two bounded rounds and reserves final Topic 1 audit after authentication selection. Exact round allocation and decision schemas must be demonstrated by state-machine tests before production wiring. The controller writes the dossier before signaling begin-writing once, starts exactly one writer and allows one same-session validation repair. Existing validators and atomic candidate reporting remain authoritative.

## Milestone 1: prove and implement transport (no production wiring)

**Files:** Create `go/internal/factorycontroller/transport.go`, `transport_test.go`; add an offline pinned-CLI smoke fixture under `factory/tests/fixtures/controller/` only if needed.

**Interface:** `Transport.Turn(ctx context.Context, sessionID string, prompt string) (TurnResult, error)`; result has `SessionID string` and `Answer string`. Transport configuration fixes Kit executable, workspace, HOME and approved provider/model arguments. Empty session ID means first turn; nonempty means resume. Configuration never comes from agent output.

- [ ] Write table tests with a local fake executable: initial success, two continuations preserve ID, embedded misleading `session_id:` text in the answer, missing terminal ID, mismatched resumed ID, nonzero exit despite plausible output, oversized output, cancellation, leading-dash prompt passed after `--`, four independent sessions concurrently.
- [ ] Run tests and establish expected failures before implementation.
- [ ] Implement using `os/exec`, bounded capture, explicit argv and no shell interpolation. Preserve answer bytes; remove only the CLI framing newline and terminal ID line. Treat malformed output as terminal failure.
- [ ] Implement graceful cancellation with a bounded TERM grace then process-group kill/reap. Do not mistake process exit for completed descendant cleanup; test both cooperative and uncooperative children.
- [ ] Run focused tests using installed Go 1.27, `CGO_ENABLED=0`, unset `GOROOT`, `GOPROXY=off`.
- [ ] Prove real pinned CLI initial/continuation against an offline fake provider: original transcript identity, four-root export compatibility, and cancellation. Fake CLI unit tests alone do not prove Kit behavior. Reuse existing verified image/offline fixture patterns; no paid provider calls.
- [ ] Review implementation and record exact evidence/limitations before committing.

## Subsequent milestones (expand after transport evidence)

1. Strict decision records and a fake-transport workflow state machine: test endpoint gate, concurrency, two-round limits, auth-before-audit, failure propagation and no replay. Reuse `factoryprompt.Assemble`; preserve approved research bytes.
2. Controller-owned safe persistence, dossier transition, single writer/repair and existing validator/report commands. Test each failing stage with operation-prefix assertions and no later effects.
3. Prepare concrete workflow/doctrine/entrypoint replacement diff for approval; retain old production path until replacement is tested. Update safety tests to exercise controller behavior rather than model-copied source text, never just delete them.
4. Build official pinned container; run offline connected lifecycle and native-root transcript export tests, Go factory packages and complete shell suite. Resolve export diagnostic regressions without relaxing sanitization.
5. Commit a clean local checkpoint and run one subscription-backed Okta acceptance. Require validated converged report, four installed guide artifacts, readable sanitized evidence and preserved baseline services. A candidate convergence or shell exit zero is insufficient.

This document deliberately commits implementation only for the transport milestone. Later implementation tasks and concrete workflow changes follow its executable evidence rather than assumptions about session transport.
