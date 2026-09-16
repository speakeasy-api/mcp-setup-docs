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

## Milestone 1 evidence

Committed transport `71e5a2d`: fake-executable tests and vet pass, including queued cancellation, same-session exclusion, bounded output, explicit root and descendant cleanup. Real pinned Kit offline smoke: four concurrent sessions in one physical workspace/HOME, one continuation each, distinct initial IDs, original resumed IDs, isolated histories, four native sessions exported successfully. Private evidence: `.superpowers/sdd/host-controller-smoke/shared-workspace/`. This does not prove live acceptance or real-provider cancellation.

## Milestone 2: research sequence with fake backends, no production wiring

**Files:** `go/internal/factorycontroller/research.go`, `research_test.go`.

**Interfaces:** Concrete workflow data and one small backend interface:

```go
type TopicTask struct {
 Topic, FollowUp int // FollowUp 0 is initial, then exact 1/2 predecessor sequence.
 SessionID string // Empty only for initial; runner-owned, never model-supplied.
 Checks []string
 FinalAudit bool
 Authentication string
 Actions []SetupAction
 Endpoint EndpointGate
 EndpointReport string
}
type SetupAction struct { Description string; Sources []string }
type EndpointGate struct { Established bool; Endpoint string; Sources, Blockers []string }
type FollowUpRequest struct { Topic int; Checks []string }
type ResearchDecision struct {
 Authentication string
 Actions []SetupAction
 FollowUps []FollowUpRequest
 Blockers []string
 Dossier string
}
type ResearchSnapshot struct {
 Reports map[int]string
 Endpoint EndpointGate
 Round int
 FinalAudit bool
 Authentication string
 Actions []SetupAction
}
type ResearchFinalization struct { Dossier string; Blockers []string }
type ResearchBackend interface {
 Research(context.Context, TopicTask) (TurnResult, error)
 Endpoint(context.Context, string) (EndpointGate, error)
 Reconcile(context.Context, ResearchSnapshot) (ResearchDecision, error)
 Finalize(context.Context, ResearchSnapshot) (ResearchFinalization, error)
}
type ResearchResult struct {
 Authentication string
 Actions []SetupAction
 Dossier string
 Reports map[int]string
 Sessions map[int]string
 Blockers []string
}
func RunResearch(context.Context, ResearchBackend) (ResearchResult, error)
```

The backend performs model turns; the runner alone schedules them. Backend methods must obey context cancellation. Errors are terminal execution failure, not factual blocking. A result with blockers and nil error is a factual block, never successful research. No writer/persistence responsibility in this milestone.

- [ ] Write fake-backend tests recording operation order before implementation. Test Topic 5 exclusively precedes gate and initial Topics 1–4; gate blocked means no remaining topics. A channel barrier must prove 1–4 concurrency, not just goroutine creation.
- [ ] Test three reconciliation opportunities: initial round 0, after round 1, after round 2. Reject duplicate/out-of-range topic requests, empty checks and requests after round 2. No automatic execution retries. Follow-up indices count completed turns per topic; original IDs must match on continuation.
- [ ] Reserve Topic 1 final authority audit: at most one non-final Topic 1 follow-up; final audit uses its next index and only starts after authentication/actions are selected and all other requested checks finish. Round-2 factual checks may run first, with the authority audit as the final dependency in that bounded round. If selection cannot finish, return blocked before audit/dossier.
- [ ] Require selected authentication and at least one nonempty action with nonempty source references before audit. These are structure checks, not proof of truth. Send exactly that selection/actions to Topic 1.
- [ ] Finalize once after final audit with `FinalAudit=true`, returning only `ResearchFinalization`. Keep independent copies of the audited authentication/actions in the result; do not require a model echo. The finalizer cannot request follow-ups or replace structured selection. Factual problems requiring new selection return blockers. Require a nonempty dossier and no blockers. This does not establish prose fidelity by structural validation alone.
- [ ] Validate nonempty research output and runtime session ID on each success. Store IDs only from initial runtime results and enforce exact same ID on all continuations. Initial IDs must be unique across topics. Partial reports remain in result on terminal error, but no further model phases start.
- [ ] Cancellation or one concurrent task failure cancels sibling contexts and waits for started tasks to end. Already-completed reports survive in result. No unsynchronized map writes.
- [ ] Implement one explicit sequence with a small concurrent-wave helper; no generic workflow DSL, transitions registry, event bus, retry framework or persistence layer.
- [ ] Run `go test ./internal/factorycontroller -count=3` and vet with the established offline Go environment; independent review before next milestone.

The concrete production prompts, JSON decoding/schema validation, persistence and entrypoint changes are deliberately outside this pure scheduling milestone. They must bind to these typed records rather than accept model-authored commands or session identities.

### Review corrections before milestone 2 acceptance

Carry an independent copy of the endpoint gate and Topic 5 report in every later TopicTask, including initial Topics 1–4; do not require hidden mutable backend context. Cap active research calls at four across every wave, including a five-topic follow-up wave. Test external cancellation during an active wave and deep-copy isolation for endpoint/action slices.

Final decision JSON uses exactly `dossier` (string) and `blockers` (nonempty-string array); reject all selection/follow-up fields. Decode with the same bounded strict-key rules as endpoint/reconciliation JSON. Successful finalization requires nonempty dossier; blockers can accompany an empty dossier. Pre-audit `ResearchDecision.dossier` remains non-authoritative and is never installed.

## Milestone 3: backend adapter and private records (still no production wiring)

Two independent units, followed by combined tests:

### Private evidence records

Files `factorycontroller/evidence.go`, `evidence_test.go`. API:
`OpenEvidence(workspace string) (*Evidence,error)`, `Close() error`,
`SavePrompt(topic,index int, assignment,prompt []byte) error`,
`SaveTurn(topic,index int, turn TurnResult) error`, and
`Session(topic,index int) (string,error)`.

Use fixed `.factory/research/topic-N-I.{input.json,prompt.md,report.md,session.json}`.
The CLI identity record is `{version:1,topic:N,index:I,session_id:ID}`, not a
fabricated native ACP handle. Export already selects prompt/report names and
excludes input/identity records. Persist reports before identity records; require
existing complete predecessor identity before continuation. Every write refuses
existing entries, links or special files. Directories are physical owned 0700;
files are owned single-link 0600, capped at 1 MiB per record. Bound reads and
reject duplicate/extra/mismatched record fields. Use directory-rooted operations,
not shell interpolation. Return fixed errors and never retry a completed turn.
This preserves the existing same-UID private-record threat model, not a new
sandbox against a concurrently malicious process with equivalent filesystem rights.
Tests cover exact bytes, predecessor/topic/index, permissions, size, symlinks,
hardlinks, preexisting paths and failed persistence without replay.

### Production ResearchBackend adapter

Files `factorycontroller/backend.go`, `backend_test.go`. Use concrete
`KitResearchBackend` with a turn function matching `Transport.Turn` (production
binds the actual method; tests supply a fake), Evidence, immutable ResearchContext,
approved prompt strings, coordinator bytes/hash, and a fixed research deadline.
ResearchContext contains provider, MCP server, task, slug, mode, persona path,
client claims/source references and documentation URLs. Validate at construction.
Never take these configuration values or filesystem paths from a decision result.

`Research` constructs ordered structs matching `factoryprompt.Assemble`, uses
remaining seconds from the supplied deadline (1–1800), saves input/prompt, verifies
persisted predecessor against runner-owned ID, makes one turn and saves report/ID.
Initial Topics 1–4 and subsequent checks receive endpoint evidence explicitly.
Final audit receives selected authentication/actions via requested checks/evidence.
No hidden mutable endpoint state. No scheduling, retries or new deadlines here.

`Endpoint`, `Reconcile`, `Finalize` each make one data-only decision turn using
caller-supplied approved prompt text, append a JSON data section, and use the
strict decoder. Decisions do not supply commands/paths/IDs. Native Kit stores
retain those decision sessions. Do not pass the entire coordinator as their prompt.
No production prompt text or workflow change is authorized by this adapter milestone.

Fake-turn tests capture prompts/argv-independent data: all five initial templates,
ordered input/hash fidelity, endpoint/audit evidence, exact original continuation,
expired budget causes zero turns, malformed decisions terminal, persistence failure
never invokes a replacement, and hostile quotes/newlines remain data. Use real
prompt assembler and private temp evidence directories. No provider calls.

## Milestone 4a: deterministic writing sequence (no production wiring)

Files `factorycontroller/writing.go`, `writing_test.go`; add `DecodeWriter` and
its tests to existing decision decoder. Exact output is `{completed:boolean,
open_questions:string[]}` with strict keys, nonblank bounded questions and the
same 1 MiB input bound. No prose handback or model-authored run report.

```go
type WriterTask struct {
 SessionID string
 Repair bool
 Findings []string
 Research ResearchResult
}
type ValidationResult struct { Valid bool; Findings []string }
type WritingBackend interface {
 SaveDossier(context.Context, string) error
 BeginWriting(context.Context) error
 Write(context.Context, WriterTask) (TurnResult, error)
 Validate(context.Context, bool) (ValidationResult, error) // bool is repair stage
}
type WritingResult struct { Outcome, SessionID string; OpenQuestions []string }
func RunWriting(context.Context, WritingBackend, ResearchResult) (WritingResult,error)
```

- Reject blocked/incomplete research before effects. Persist dossier successfully
  before exactly one gate call, then launch the one writer. Writing deadline is
  900 seconds from just before gate invocation, bounded by parent context; host
  remains authoritative and no turn/repair resets it.
- Require runtime identity and strictly decoded completion. Operator questions
  return awaiting_scope (never converged); incomplete output without questions
  is failure. No validation on malformed/failed writer output.
- Validate under controller ownership. Valid with no findings returns converged.
  Invalid must include actionable nonblank findings. Allow exactly one repair on
  the original writer ID, passing only validation findings and unchanged research.
  Revalidate once. Invalid again fails; no new writer/research/reviewer.
- Deep-copy authoritative research/actions at backend boundaries. Error or
  cancellation at any step stops later calls; preserve returned writer identity
  for diagnostics, never resume automatically after a failed turn.
- Fake-backend tests assert exact operation prefixes for every failure, one gate,
  one writer/one repair, original IDs, questions, malformed/null/extra outputs,
  unchanged research despite backend mutation, and shared writing deadline.

Concrete filesystem snapshot validation, context resolution, approved prompts,
atomic candidate reporting and container entrypoint remain subsequent integration
work; this milestone does not pretend those helpers are wired.

## Milestone 4b: context and deterministic validation adapters

Approved five prompt assets are now in `factory/prompts/`; their approval does
not itself activate a new container entrypoint. No new provider calls in tests.

### Context adapter

Files `context.go`, `context_test.go` in factorycontroller.
`ContextConfig{Workspace,InputRoot string; Turn func(context.Context,string,string)(TurnResult,error)}`;
`ResolveContext(ctx,config) (ResolvedContext,error)`.
`ResolvedContext` includes `Research ResearchContext`, `Paths []string`,
`Catalog json.RawMessage`, `Authority string`, `Blockers []string`.

Invoke fixed `inspect-inputs.sh` with fixed input issue/catalog paths via argv;
its bounded JSON is runtime data for approved resolve-context prompt. Include
trusted constitution/shared/context-resolution rules separately in prompt.
Strictly parse exact provider/slug/persona/mcp_server/documentation_urls/blockers,
nullable identities only when blocked, all provider/slug/persona null on blocked
identity. Valid nonblocked provider/slug/persona required, optional MCP server.
Validate slug kebab-case <=96, persona exact membership in inspected personas,
mode from actual guide directories, then call inspect-guide-context helper.
Validate its manifest exact keys, unique sorted safe relative paths, required
authority/schema/role paths and bounded counts. Read only approved physical
regular context files using bounded reads; reject links and special files.
Build research context and authority from trusted snapshot docs, not model text.
Populate capabilities from checked-in client reference and its source references.
Do not ask models to re-read raw issue/catalog or discover files. Catalog retained
exactly from inspector, unknown lookup never becomes absence. Blocked identity
returns blockers without research dispatch. Model identity resolution remains
semantic judgment, not independent code proof of provider identity.

### Validation adapter

Files `validation.go`, `validation_test.go` in factorycontroller.
`ValidationConfig{Workspace,Slug,LintBinary,GenerateBinary string}`;
`ValidateDraft(ctx,config,repair bool) (ValidationResult,error)`.
Production passes `/usr/local/bin/lint-guide` and `/usr/local/bin/factory-generate`;
tests use local fake binaries, never shell command strings from model output.

Create fresh private phase-specific snapshots under `.factory`, refuse preexisting
or unsafe paths. Copy only four target artifacts for inspect-guide-artifacts;
preserve unrelated target files without allowing them into the inspection subset.
Run existing artifact helper with root override; strictly validate returned slug,
stage writer/revision, sorted exact four basenames. Then run lint-guide --json and
strictly parse its actual Finding fields; exit2+blockers means repairable findings,
execution/malformed results fail. No direct model invocation of validators.

Make fresh validation snapshot containing full guides/schema plus go/go.mod and
go/published_server_refs.txt. Reject symlinks/special files in all copied trees;
never mutate source/generated directories. Run generator from snapshot/go, so
full-repository and append-only ID checks remain active. Enforce target artifacts
nonempty <=512KiB each, generated files <=512KiB each and <=5MiB total, and whitespace
checks. Safely expose bounded validation defects only to the writer, not raw errors
in public reports. Cancellation/error stops later commands. Snapshot names differ
for first validation and repair; no reuse of partial failed snapshots.

Both adapters use stdlib direct argv processes and caller context, bounded output,
fixed errors, no retries or new phase clocks. Temporary process helpers may be
file-local to avoid introducing a generic execution framework. Production wiring
must retain the isolated environment and outer supervisor cancellation/cleanup.
Tests prove helper contracts, hostile inputs as data, mode/persona/path checks,
malformed outputs, snapshot safety, generator isolation and repair stage naming.

### Concrete writer adapter

`writer_backend.go`/tests implement existing `WritingBackend` using
`WriterBackendConfig{Workspace,ControlDir,RunID,BeginBinary,LintBinary,GenerateBinary
string; Context ResolvedContext; Evidence *Evidence; Turn func(context.Context,
string,string)(TurnResult,error)}` and `NewKitWritingBackend`.
Persist the dossier through the existing private exclusive evidence writer at
fixed `dossier.md`; invoke begin-writing with literal argv and host identity;
assemble the approved writer prompt with trusted role context and a separate JSON
projection of dossier/audited selection/destination/persona/catalog/approved paths.
Do not duplicate full research reports or private session maps in writer input.
Delegate validation to `ValidateDraft`, use caller context, and never retry gates
or turns. Fake-turn and real-private-record tests cover quoting, immutable context,
original writer continuation and overwrite refusal; no live provider.

Prompt transport is bounded at 120 KiB per CLI argument on the supported Linux
runtime. Oversized complete prompts fail before launch, never silently truncate
source evidence. This is a transport limit, not permission to discard material
facts; a future observed oversized use case needs a reviewed input transport
change rather than relaxing source or privacy gates.

## Milestone 5: top-level runner and CLI, before entrypoint activation

Files `factorycontroller/controller.go`, `controller_test.go`,
`go/cmd/guide-factory/main.go`, `main_test.go`.
`ControllerConfig` contains Workspace/InputRoot/ControlDir/RunID and trusted
BeginBinary/LintBinary/GenerateBinary plus the bound `Turn` function.
`RunController(ctx,config) error` resolves context, opens private evidence, loads
approved prompt assets, hashes the coordinator template, runs research and writing,
and always attempts the existing atomic candidate report helper once. No model
writes the workflow report. Return an error if the report cannot be written;
a persisted failed/blocked report is a completed controller invocation, not guide
success. Success is determined only by the validated report and trusted host gates.

Start a parent-bounded 2700-second controller context and 1800-second research
context before resolution. Supply the fixed research deadline to the backend.
After research, retain the parent context for the writing sequence; never carry
the expiring research context into writing. Outer supervisor remains authoritative.
Pass actual trusted authority text to decision prompts and separate host context
JSON (identity, persona, mode, host UTC date, catalog facts) from research snapshots.
Endpoint/reconciliation/finalization may not rediscover context. Never include
legacy executable coordinator instructions in decision prompts.

Code owns the exact run-report fields: schema_version 1, outcome, nullable identity,
summary, open_questions, blockers, nits [], review_rounds 0, artifacts (four names
only for convergence). Strip persona path to its validated name. Report fixed phase
failure categories, never raw error text or private paths. Identity ambiguity stays
all-null blocked. Use actual existing write-report/validate-report scripts via argv,
no report shell interpolation, no report retries, no report-size truncation.

CLI flags configure trusted paths and existing provider/model/reasoning/request
budget. Preserve subscription file credentials at /subscription and existing Exa
MCP config. Use Transport with the existing isolated HOME; allow only configured
openrouter/openai-subscription providers. Print fixed errors only. No new runtime
dependencies, no provider fallback, no publication code. Container entrypoint and
Dockerfile activation are a separate concrete approval diff.

Tests use real prompt assembly/private records/report helper, scripted fake turns,
fake gate/lint/generator, and temporary trusted repositories. Prove full convergence,
blocked context/endpoint, malformed decision, research/validation failure, one repair,
and scope questions with exact report outcomes and no later forbidden effects.
Test CLI configuration without real provider calls. Reuse existing fixtures rather
than copying a second schema/validation framework.

### Milestone 5 verification and review

Implemented runner/CLI without production activation. Full offline Go module suite
passed, including lifecycle and transcript packages. Controller/prompt/CLI suites
and vet passed. Integration fixtures now read actual `factory/coordinator.md`, not
the research draft. Review confirmed current host finalization separately gates
converged outcomes and does not mistake exit zero for success.

Review corrections: candidate report creation now shares the controller context
and parent cancellation; it cannot consume the host's separate finalization
allowance. Preserve the trusted `KIT_BIN` environment override (explicit flag
wins). Both regression tests failed before the corrections, then complete
controller/CLI suites and vet passed. Keep the existing private entrypoint setup
when proposing activation. Production image wiring, connected offline acceptance,
full shell regression suite, and real local Okta acceptance remain outstanding.
