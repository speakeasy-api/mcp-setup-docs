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
jq -e 'keys == ["generation","id","name","output","updates"] and .generation == 1 and .updates == {items:[],truncated:false}' "$fixture/handle.json" >/dev/null
jq -se 'length == 2 and all(.[]; .schema_version == 3 and .session_id == "synthetic-session" and .workspace_root == "/workspace") and .[0].generation == 1 and .[1].generation == 2 and .[0].item.kind == "Assistant" and .[1].replacement == [.[0].item] and (.[0] | has("replacement") | not) and (.[1] | has("item") | not)' "$fixture/session.jsonl" >/dev/null
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
