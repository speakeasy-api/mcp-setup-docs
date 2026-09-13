#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
# shellcheck disable=SC1091
source "$ROOT/factory/config.env"
assert_eq 0.1.134 "$KIT_VERSION"
assert_eq e1262d364187f3c244ec28a099c7cb2e1f2c22b4440f1d8179de34b707d56487 "$KIT_SHA256"
assert_eq openai/gpt-6-astra "$KIT_MODEL"
assert_eq medium "$KIT_REASONING_EFFORT"
assert_eq 300 "${KIT_REQUEST_BUDGET_SECONDS:-}"
assert_eq mcp-setup-docs-kit:0.1.134 "$KIT_IMAGE"
# Literal shell contracts: config must reach the actual prompt invocation.
# shellcheck disable=SC2016
grep -Fq -- '--request-budget-seconds "${KIT_REQUEST_BUDGET_SECONDS:-300}"' "$ROOT/factory/scripts/container-entrypoint.sh"
# shellcheck disable=SC2016
grep -Fq -- '--env "KIT_REQUEST_BUDGET_SECONDS=$KIT_REQUEST_BUDGET_SECONDS"' "$ROOT/factory/scripts/run-kit.sh"
for binary in prepare-research-prompt factory-generate; do
  grep -Fq "/usr/local/bin/$binary" "$ROOT/factory/Dockerfile"
done
fixture="$ROOT/factory/tests/fixtures/kit-v0.1.134"
validate_fixtures() {
  local dir="$1"
  jq -ne --slurpfile child "$dir/session.jsonl" --slurpfile parent "$dir/parent.jsonl" \
    --slurpfile handle "$dir/handle.json" --slurpfile event "$dir/lifecycle.json" '
    def item($kind; $text; $metadata):
      {id:null, kind:$kind, parts:[{Text:{text:$text,metadata:{}}}],
       metadata:$metadata, usage:null, finish_reason:null, created_at:null};
    def record($id; $generation; $item):
      {schema_version:3,session_id:$id,generation:$generation,workspace_root:"/workspace",item:$item};
    {"dev.kit.session.origin":"subagent"} as $origin |
    item("Assistant"; "Synthetic assistant output"; {}) as $assistant |
    $parent == [record("synthetic-parent"; 1; item("System"; "Synthetic parent system"; $origin))] and
    $child == [record("synthetic-child"; 1; item("System"; "Synthetic child system"; $origin)),
      record("synthetic-child"; 2; $assistant),
      {schema_version:3,session_id:"synthetic-child",generation:3,workspace_root:"/workspace",replacement:[$assistant]}] and
    $handle == [{id:"synthetic-child",name:"Synthetic researcher",
      output:{summary:"Synthetic fixture, not a provider result"},generation:1,
      updates:{items:[],truncated:false}}] and
    $event == [{event:"subagent_state_changed",id:$handle[0].id,name:$handle[0].name,
      status:"idle",outcome:"success",generation:$handle[0].generation,task:"Synthetic task",
      parent_id:$parent[0].session_id,parent_name:"Synthetic parent",harness:"acp.kit",
      model:null,created_at_unix_ms:10,generation_started_at_unix_ms:20,generation_finished_at_unix_ms:30}]
  ' >/dev/null
}
validate_fixtures "$fixture"

# Negative controls use disposable copies; never alter the checked-in fixtures.
negative=$(mktemp -d)
trap 'rm -rf "$negative"' EXIT
for mutation in text part item output parent origin; do
  cp "$fixture"/{session.jsonl,parent.jsonl,handle.json,lifecycle.json} "$negative/"
  file=session.jsonl
  case "$mutation" in
    text) filter='.[1].item.parts[0].Text.text = 42' ;;
    part) filter='.[1].item.parts[0] = {Text:{text:"Synthetic assistant output"}}' ;;
    item) filter='.[1].item.kind = "User"' ;;
    output) file=handle.json; filter='.[0].output = {}' ;;
    parent) file=lifecycle.json; filter='.[0].parent_id = "unrelated"' ;;
    origin) file=parent.jsonl; filter='.[0].item.metadata = {}' ;;
  esac
  jq -sc "$filter | .[]" "$negative/$file" >"$negative/mutated"
  mv "$negative/mutated" "$negative/$file"
  if validate_fixtures "$negative"; then fail "malformed $mutation fixture accepted"; fi
done
# Optional pinned-source characterization, not a Rust test/runtime claim.
if [[ -n "${KIT_RELEASE_SOURCE_ROOT:-}" ]]; then
  source_root="$KIT_RELEASE_SOURCE_ROOT/src"
  assert_eq 2 "$(grep -Fc '.arg("--request-budget-seconds")' "$source_root/acp_child.rs")"
  assert_eq 2 "$(grep -Fc 'crate::request_budget::RequestBudget::current()' "$source_root/acp_child.rs")"
  grep -Fq 'fn request_budget_inherited_for_new_and_resumed_children()' "$source_root/acp_child.rs"
  grep -Fq 'retry_budget: Duration::from_secs(self.0),' "$source_root/request_budget.rs"
  grep -Fq '..Default::default()' "$source_root/request_budget.rs"
  grep -Fq 'fn request_budget_changes_only_total_budget()' "$source_root/request_budget.rs"
  if grep -Eq '(attempt_timeout|stream_idle_timeout):' "$source_root/request_budget.rs"; then
    fail "request budget must preserve idle/attempt defaults"
  fi
fi
