#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=${FACTORY_REPO_ROOT:-/repo}
INPUT_ROOT=${FACTORY_INPUT_ROOT:-/input}
WORKSPACE_ROOT=${FACTORY_WORKSPACE_ROOT:-/workspace}
EXPORT_ROOT=${FACTORY_EXPORT_ROOT:-/export}
KIT_HOME=${FACTORY_KIT_HOME:-/tmp/kit-home}
REPORT_VALIDATOR=${FACTORY_REPORT_VALIDATOR:-/usr/local/bin/validate-report}
EVENT_PROJECTOR=${FACTORY_EVENT_PROJECTOR:-/usr/local/bin/project-kit-events}
DIAGNOSTICS_BUILDER=${FACTORY_DIAGNOSTICS_BUILDER:-/usr/local/bin/build-diagnostics}

test -r "$INPUT_ROOT/issue.json"
test -r "$INPUT_ROOT/catalog.json"
test -r "$REPO_ROOT/factory/coordinator.md"
rm -rf "$WORKSPACE_ROOT"
mkdir -p "$WORKSPACE_ROOT/.factory" "$KIT_HOME" "$EXPORT_ROOT"
rm -rf "$EXPORT_ROOT/guide" "$EXPORT_ROOT/run-report.json" \
  "$EXPORT_ROOT/kit-error-summary.json" "$EXPORT_ROOT/factory-diagnostics.json"
cp -a "$REPO_ROOT/." "$WORKSPACE_ROOT/"
rm -rf "$WORKSPACE_ROOT/.git"
export HOME="$KIT_HOME"
KIT_BIN=${KIT_BIN:-kit}
RUNTIME_DIR=$(mktemp -d "${TMPDIR:-/tmp}/factory-runtime.XXXXXX")
RUNTIME_FIFO="$RUNTIME_DIR/kit-stderr"
PROJECTED_EVENTS="$RUNTIME_DIR/events.json"
MANIFEST_EVENTS="$RUNTIME_DIR/manifest-events.json"
cleanup() {
  rm -rf -- "$RUNTIME_DIR"
}
trap cleanup EXIT
mkfifo "$RUNTIME_FIFO"

"$EVENT_PROJECTOR" "$PROJECTED_EVENTS" <"$RUNTIME_FIFO" &
projector_pid=$!
if KIT_RUNTIME_EVENTS=1 "$KIT_BIN" prompt \
  --root "$WORKSPACE_ROOT" \
  --provider openrouter \
  --model "$KIT_MODEL" \
  --reasoning-effort "$KIT_REASONING_EFFORT" \
  --mcp-config "$WORKSPACE_ROOT/factory/mcp/exa.json" \
  "$(cat "$WORKSPACE_ROOT/factory/coordinator.md")" 2>"$RUNTIME_FIFO"; then
  kit_status=0
else
  kit_status=$?
fi
if wait "$projector_pid"; then
  projector_status=0
else
  projector_status=$?
fi
rm -f -- "$RUNTIME_FIFO"

if ((projector_status != 0)); then
  rm -f -- "$EXPORT_ROOT/factory-diagnostics.json"
  exit 1
fi

jq --argjson success "$([[ $kit_status == 0 ]] && printf true || printf false)" '
  [{sequence:1,call_ref:0,event:"started",tool:"kit_prompt",operation:"kit_prompt",success:null,duration_ms:null}]
  + (map(.sequence += 1))
  + [{sequence:(length + 2),call_ref:0,event:"finished",tool:"kit_prompt",operation:"kit_prompt",success:$success,duration_ms:0}]
' "$PROJECTED_EVENTS" >"$MANIFEST_EVENTS"

kit_errors_path=-
if ((kit_status != 0)); then
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
  kit_errors_path="$EXPORT_ROOT/kit-error-summary.json"
fi

report="$WORKSPACE_ROOT/.factory/run-report.json"
stage=
if ((kit_status != 0)); then
  stage=kit_prompt
elif [[ ! -s $report ]] || ! "$REPORT_VALIDATOR" "$report" >/dev/null 2>&1; then
  stage=report_validation
elif [[ $(jq -r '.outcome' "$report") == failed ]]; then
  stage=factory_outcome
fi

if [[ -n $stage ]]; then
  "$DIAGNOSTICS_BUILDER" "$stage" "$kit_status" "$MANIFEST_EVENTS" \
    "$report" "$kit_errors_path" "$EXPORT_ROOT/factory-diagnostics.json" || true
  if [[ $stage == factory_outcome ]]; then
    cp "$report" "$EXPORT_ROOT/run-report.json"
    exit 0
  fi
  exit 1
fi

outcome="$(jq -r '.outcome' "$report")"
slug="$(jq -r '.slug // empty' "$report")"
if [[ -n "$slug" && "$outcome" != failed ]]; then
  [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]
  test -d "$WORKSPACE_ROOT/guides/$slug"
  cp -a "$WORKSPACE_ROOT/guides/$slug" "$EXPORT_ROOT/guide"
fi
cp "$report" "$EXPORT_ROOT/run-report.json"
