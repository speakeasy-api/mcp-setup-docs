# Synthetic source-derived Kit v0.1.134 fixtures

These are constructed fixtures, not trial logs or provider/runtime acceptance.
Public tag commit: `5eb76012530cc374a37ed6ebb0ddea965e116c18`.
Source: https://github.com/speakeasy-api/kit/tree/5eb76012530cc374a37ed6ebb0ddea965e116c18

- `src/session.rs:25-48,675-714,975-1024`: JSONL records have
  schema_version, session_id and generation; optional workspace_root, item,
  replacement and redirect. Version 3 writes item OR replacement, not both.
  This fixture exercises an assistant item followed by replacement of its transcript.
  Item and TextPart serialization comes from pinned `agentkit-core =0.10.5`,
  `src/lib.rs:369-386,532-547,616-621`; null option fields and empty metadata
  maps are intentional.
  Version 4 redirect records and legacy versions 1/2 are not represented here.
  Record generations count persistence writes, not returned subagent generations.
- `src/tools/subagent.rs:155-172`: complete native SubagentValue has id,
  output (arbitrary JSON), generation; name and updates are optional. Updates
  contains items (arbitrary JSON values) and truncated. Keep returned values;
  never synthesize or advance handles after failure. Fixture IDs are synthetic.
- `src/acp_child.rs:274-279,350-355`: new and resumed children explicitly
  receive the current request budget. Source regression test at 1830:
  request_budget_inherited_for_new_and_resumed_children.
- `src/request_budget.rs:53-59,67-76`: only retry_budget changes; the existing
  idle/attempt defaults remain inherited from ResilienceConfig::default().
  Source regression: request_budget_changes_only_total_budget.
  These Rust tests have been inspected, not executed by the factory shell test.
  Set `KIT_RELEASE_SOURCE_ROOT` to the extracted public v0.1.134 source to run
  shell assertions guarding both child argument sites and unchanged timeout fields.

## Existing generator runtime contract

Build `go/internal/gen` in its existing module. Run `factory-generate` from
`/workspace/go`, NOT repository root; it locates the parent Go module using
its go.mod. Reads sibling guides (meta.yaml, documentation and assets) and
`go/published_server_refs.txt`; writes go/generated, index_gen.go and the
append-only published refs ledger. Its `index.go:160-173` invokes `gofmt -w`; the final image copies only
that formatter from the pinned Go builder (no go compiler). No embedded
templates or separate resource bundle: the current source snapshot already supplies these inputs. Preserve
that snapshot and ledger. Prebuilding alone does not replace the current
coordinator or validator invocation; their owning tasks wire the binary.

## Task 1 verification evidence

- RED before implementation: `bash factory/tests/test-kit-release.sh` exited 1:
  `FAIL: expected [0.1.134], got [0.1.130]`.
- Public Linux x86_64 release archive SHA256 verified:
  `e1262d364187f3c244ec28a099c7cb2e1f2c22b4440f1d8179de34b707d56487`.
  Actual release binary in ephemeral Debian: `kit 0.1.134`; prompt help lists
  `--request-budget-seconds`, range 1–3600, default 60 (factory sets 300).
- GREEN: release test with/without `KIT_RELEASE_SOURCE_ROOT`; source mutation
  controls correctly reject removed child budget arguments and an added idle
  timeout override. These are lexical source guards, not compiled Rust tests.
- GREEN: `FACTORY_TEST_IMAGE=1 bash factory/tests/test-container.sh` builds the
  real image, verifies binaries are static and no go compiler exists, checks
  Kit version/help, lints Asana and runs full generation in a disposable copy
  retaining the published ID ledger. Initial generator smoke was RED without
  gofmt; copying the pinned formatter made it GREEN.
- GREEN: `GOTOOLCHAIN=go1.27.0 CGO_ENABLED=0 go test` for factoryprompt,
  cmd/prepare-research-prompt, factorytranscript in go; `go test ./...` in the
  existing generator module with the same environment. Targeted shellcheck
  0.10.0 and `git diff --check` pass.
- No providers, native session runtime, Actions or publication were exercised.
  Existing `TestSeparateGroupToolCleanup` RED was not changed or rerun; no
  full-suite GREEN claim. Coordinator, host supervision and readable export
  remain with their owning tasks.

## Review correction: parent/child characterization

`parent.jsonl` and `session.jsonl` represent **two separate persisted session
files**, for a synthetic parent subagent and its nested child. Both start
with a System item carrying `dev.kit.session.origin: "subagent"`, exactly
as `src/runtime.rs:1607-1619` constructs it. A top-level session would instead
use `"top_level"`; this fixture deliberately models the nested case. The
child then appends an Assistant Text item and replaces its transcript.

`lifecycle.json` is the **decoded JSON payload of a separate stderr lifecycle
event**, not a session record or a file Kit writes under this name. Actual
emission prefixes it with `\u0001kit-runtime\u0001` (`src/events.rs:1-37`).
Its `subagent_state_changed` fields and enum values come from
`src/events.rs:72-106,317-334`. That event supplies the explicit parent_id;
`src/tools/subagent.rs:1174-1213` fills parent context when forwarding nested
events. `src/tools/subagent.rs:394-399` assigns the Kit child persisted ID
from its registry ID, tying the child session, event and returned handle.
All IDs, task text, output and timestamps here are fabricated fixture values.

No parent_id was invented in JSONL or item metadata. Kit's separate
`<session_id>.metadata.json` contains only optional display_name
(`src/session.rs:50-55,2163-2165`), not parent relationships; no such sidecar
is necessary for this fixture. Origin classifies a session as a subagent,
not its particular parent. The explicit link here comes only from the event.

Review-round RED: the stricter release test exited 2 before fixture additions
because parent.jsonl was absent. GREEN after adding the source-derived
fixtures: focused release test with and without source assertions, bash -n,
Shellcheck 0.10.0 and whitespace checks. Six disposable malformed-fixture
controls reject numeric Text.text, missing Text metadata, wrong item kind,
empty handle output, mismatched parent_id and missing session-origin metadata.
The checker compares these synthetic examples exactly; it is not a universal
Kit schema validator (native output remains arbitrary JSON in real handles).
No image rebuild, providers or native runtime acceptance in this fix round.
