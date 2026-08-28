#!/usr/bin/env bash
set -uo pipefail

ERROR='factory: invalid Kit runtime event'
MARKER=$(printf '\001kit-runtime\001')
OUTPUT=${1-}
TMP_DIR=

cleanup() {
  if [[ -n $TMP_DIR ]]; then
    rm -rf -- "$TMP_DIR"
  fi
}
trap cleanup EXIT HUP INT TERM

fail_closed() {
  if [[ -n $OUTPUT ]]; then
    rm -f -- "$OUTPUT" 2>/dev/null || true
  fi
  printf '%s\n' "$ERROR" >&2
  exit 1
}

if (( $# != 1 )) || [[ -z $OUTPUT ]]; then
  fail_closed
fi

rm -f -- "$OUTPUT" 2>/dev/null || fail_closed
output_dir=$(dirname -- "$OUTPUT") || fail_closed
output_base=$(basename -- "$OUTPUT") || fail_closed
TMP_DIR=$(mktemp -d "$output_dir/.$output_base.project.XXXXXX") || fail_closed
STATE="$TMP_DIR/state.json"
WORK="$TMP_DIR/work.json"
PACKAGE="$TMP_DIR/package.json"
EVENTS="$TMP_DIR/events.jsonl"
FINAL="$TMP_DIR/final.json"
printf '%s\n' '{"next_ref":1,"calls":{}}' >"$STATE" || fail_closed
: >"$EVENTS" || fail_closed

invalid=false
sequence=0
while IFS= read -r line || [[ -n $line ]]; do
  if [[ $line != "$MARKER"* ]]; then
    printf '%s\n' "$line" >&2
    continue
  fi

  if [[ $invalid == true ]]; then
    continue
  fi

  payload=${line#"$MARKER"}
  if ! printf '%s\n' "$payload" | jq -ce '
    def exact($allowed): (keys | sort) == ($allowed | sort);
    def uint: type == "number" and . >= 0 and floor == .;
    def source_tool:
      if . == "shell" then "shell"
      elif IN("edit", "subagent", "prompt", "fork", "close", "a2a", "docs", "skill", "tool_search", "tool", "auth") then .
      else "unknown"
      end;
    def shell_operation:
      if test("^bash factory/scripts/inspect-inputs[.]sh /input/issue[.]json /input/catalog[.]json$") then "inspect_inputs"
      elif test("^bash factory/scripts/inspect-guide-context[.]sh [a-z0-9]+(-[a-z0-9]+)*$") then "inspect_guide_context"
      elif test("^bash factory/scripts/inspect-guide-artifacts[.]sh [a-z0-9]+(-[a-z0-9]+)* (research|writer|revision)$") then "inspect_guide_artifacts"
      elif test("^/usr/local/bin/lint-guide --json /workspace/guides/[a-z0-9]+(-[a-z0-9]+)*$") then "lint_guide"
      elif . == "/workspace/factory/scripts/validate-report.sh /workspace/.factory/run-report.json.tmp" then "validate_report"
      else "unrecognized"
      end;
    if type != "object" or (.event | type) != "string" then error("invalid")
    elif .event == "session_started" then
      if exact(["event", "session_id"]) and (.session_id | type == "string")
      then {kind: "ignored"} else error("invalid") end
    elif .event == "compaction_started" then
      if exact(["event", "reason", "at"]) and (.reason | type == "string") and (.at | uint)
      then {kind: "ignored"} else error("invalid") end
    elif .event == "compaction_finished" then
      if exact(["event", "reason", "ok", "compacted", "millis"])
         and (.reason | type == "string") and (.ok | type == "boolean")
         and (.compacted | type == "boolean") and (.millis | uint)
      then {kind: "ignored"} else error("invalid") end
    elif .event == "child_started" then
      if exact(["event", "call", "tool", "summary", "at"])
         and (.call | type == "string") and (.tool | type == "string")
         and (.summary | type == "string") and (.at | uint)
      then (.tool | source_tool) as $tool
        | {kind: "child", call, source_tool: .tool, event: "started", tool: $tool,
           operation: (if $tool == "shell" then (.summary | shell_operation)
                       elif $tool == "unknown" then "unknown" else $tool end),
           success: null, duration_ms: null}
      else error("invalid") end
    elif .event == "child_finished" then
      if exact(["event", "call", "tool", "ok", "summary", "millis"])
         and (.call | type == "string") and (.tool | type == "string")
         and (.ok | type == "boolean") and (.summary | type == "string")
         and (.millis | uint) and .millis <= 10800000
      then (.tool | source_tool) as $tool
        | {kind: "child", call, source_tool: .tool, event: "finished", tool: $tool,
           success: .ok, duration_ms: .millis}
      else error("invalid") end
    else error("invalid")
    end
  ' >"$WORK" 2>/dev/null; then
    invalid=true
    rm -f -- "$WORK"
    continue
  fi

  if [[ $(jq -r '.kind' "$WORK" 2>/dev/null) == ignored ]]; then
    continue
  fi

  ((sequence += 1))
  if (( sequence > 512 )); then
    invalid=true
    continue
  fi

  if ! jq -nce --argjson sequence "$sequence" --slurpfile work "$WORK" --slurpfile state "$STATE" '
    ($work[0]) as $work
    | ($state[0]) as $old
    | ($old.calls[$work.call] // null) as $known
    | if $work.event == "started" then
        if $known != null then error("invalid")
        else
          {call_ref: $old.next_ref, source_tool: $work.source_tool,
           tool: $work.tool, operation: $work.operation, lifecycle: "started"} as $call
          | {
              state: ($old
                | .calls[$work.call] = $call
                | .next_ref += 1),
              call: $call
            }
        end
      elif $known == null
        or $known.lifecycle != "started"
        or $known.source_tool != $work.source_tool
        or $known.tool != $work.tool then
        error("invalid")
      else
        {
          state: ($old | .calls[$work.call].lifecycle = "finished"),
          call: $known
        }
      end
    | {
        state: .state,
        event: {
          sequence: $sequence,
          call_ref: .call.call_ref,
          event: $work.event,
          tool: .call.tool,
          operation: .call.operation,
          success: $work.success,
          duration_ms: $work.duration_ms
        }
      }
  ' >"$PACKAGE" 2>/dev/null; then
    invalid=true
    rm -f -- "$PACKAGE"
    continue
  fi

  if ! jq -c '.state' "$PACKAGE" >"$STATE.next" 2>/dev/null \
    || ! mv -f -- "$STATE.next" "$STATE" \
    || ! jq -c '.event' "$PACKAGE" >>"$EVENTS" 2>/dev/null; then
    invalid=true
  fi
done

if [[ $invalid == true ]]; then
  fail_closed
fi

if ! jq -s '.' "$EVENTS" >"$FINAL" 2>/dev/null || ! mv -f -- "$FINAL" "$OUTPUT"; then
  fail_closed
fi
