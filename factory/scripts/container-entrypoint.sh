#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=${FACTORY_REPO_ROOT:-/repo}
INPUT_ROOT=${FACTORY_INPUT_ROOT:-/input}
WORKSPACE_ROOT=${FACTORY_WORKSPACE_ROOT:-/workspace}
EXPORT_ROOT=${FACTORY_EXPORT_ROOT:-/export}
KIT_HOME=${FACTORY_KIT_HOME:-/tmp/kit-home}
REPORT_VALIDATOR=${FACTORY_REPORT_VALIDATOR:-/usr/local/bin/validate-report}

test -r "$INPUT_ROOT/issue.json"
test -r "$INPUT_ROOT/catalog.json"
test -r "$REPO_ROOT/factory/coordinator.md"
rm -rf "$WORKSPACE_ROOT"
mkdir -p "$WORKSPACE_ROOT/.factory" "$KIT_HOME" "$EXPORT_ROOT"
rm -rf "$EXPORT_ROOT/guide" "$EXPORT_ROOT/run-report.json" "$EXPORT_ROOT/kit-error-summary.json"
cp -a "$REPO_ROOT/." "$WORKSPACE_ROOT/"
rm -rf "$WORKSPACE_ROOT/.git"
export HOME="$KIT_HOME"
KIT_BIN=${KIT_BIN:-kit}
if ! "$KIT_BIN" prompt \
  --root "$WORKSPACE_ROOT" \
  --provider openrouter \
  --model "$KIT_MODEL" \
  --reasoning-effort "$KIT_REASONING_EFFORT" \
  --mcp-config "$WORKSPACE_ROOT/factory/mcp/exa.json" \
  "$(cat "$WORKSPACE_ROOT/factory/coordinator.md")"; then
  error_files=()
  while IFS= read -r error_file; do
    error_files+=("$error_file")
  done < <(find "$KIT_HOME/errors" -type f -name '*.json' -print 2>/dev/null || true)
  if (( ${#error_files[@]} == 0 )); then
    jq -n '{schema_version:1,records:[]}' >"$EXPORT_ROOT/kit-error-summary.json"
  else
    jq -s '
      {schema_version:1,records:[.[] | {
        schema_version,kind,code,
        diagnostics:(if (.diagnostics | type) == "object" then {
          stage:.diagnostics.stage,
          retryable:.diagnostics.retryable,
          attempt:.diagnostics.attempt,
          response_request_id:(.diagnostics.response_request_id // null),
          reqwest:{
            timeout:.diagnostics.reqwest.timeout,
            connect:.diagnostics.reqwest.connect,
            request:.diagnostics.reqwest.request,
            body:.diagnostics.reqwest.body,
            decode:.diagnostics.reqwest.decode
          },
          source_chain_unknown:.diagnostics.source_chain_unknown,
          source_chain_truncated:.diagnostics.source_chain_truncated
        } else null end)
      }]}
    ' "${error_files[@]}" >"$EXPORT_ROOT/kit-error-summary.json"
  fi
  exit 1
fi
test -s "$WORKSPACE_ROOT/.factory/run-report.json"
"$REPORT_VALIDATOR" "$WORKSPACE_ROOT/.factory/run-report.json"
outcome="$(jq -r '.outcome' "$WORKSPACE_ROOT/.factory/run-report.json")"
slug="$(jq -r '.slug // empty' "$WORKSPACE_ROOT/.factory/run-report.json")"
if [[ -n "$slug" && "$outcome" != failed ]]; then
  [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]
  test -d "$WORKSPACE_ROOT/guides/$slug"
  cp -a "$WORKSPACE_ROOT/guides/$slug" "$EXPORT_ROOT/guide"
fi
cp "$WORKSPACE_ROOT/.factory/run-report.json" "$EXPORT_ROOT/run-report.json"
