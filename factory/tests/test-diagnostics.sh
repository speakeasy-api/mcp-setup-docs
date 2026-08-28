#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
VALIDATOR="$ROOT/factory/scripts/validate-diagnostics.sh"
PROJECTOR="$ROOT/factory/scripts/project-kit-events.sh"
SCHEMA="$ROOT/factory/schemas/factory-diagnostics.schema.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

test -f "$SCHEMA" || fail "diagnostics schema does not exist"
test -x "$VALIDATOR" || fail "validate-diagnostics.sh is not executable"
test -x "$PROJECTOR" || fail "project-kit-events.sh is not executable"
jq -e '."$schema" == "https://json-schema.org/draft/2020-12/schema"' "$SCHEMA" >/dev/null || fail "diagnostics schema is not draft 2020-12"

cat >"$TMP/valid.json" <<'JSON'
{
  "schema_version": 1,
  "kind": "guide_factory_diagnostics",
  "status": "failed",
  "stage": "kit_prompt",
  "classification": "kit_fatal",
  "report": {"exists": true, "valid": true, "outcome": "failed", "review_rounds": 3},
  "events": [
    {"sequence": 1, "call_ref": 0, "event": "started", "tool": "kit_prompt", "operation": "kit_prompt", "success": null, "duration_ms": null},
    {"sequence": 2, "call_ref": 1, "event": "started", "tool": "shell", "operation": "inspect_inputs", "success": null, "duration_ms": null},
    {"sequence": 3, "call_ref": 1, "event": "finished", "tool": "shell", "operation": "inspect_inputs", "success": false, "duration_ms": 10800000},
    {"sequence": 4, "call_ref": 0, "event": "finished", "tool": "kit_prompt", "operation": "kit_prompt", "success": false, "duration_ms": 42}
  ],
  "kit_errors": {
    "schema_version": 1,
    "records": [{
      "schema_version": 2,
      "kind": "provider",
      "code": "provider_error",
      "diagnostics": {
        "stage": "request",
        "retryable": false,
        "attempt": 1,
        "response_request_id": "req_123:abc",
        "reqwest": {"timeout": false, "connect": true, "request": false, "body": false, "decode": false},
        "source_chain_unknown": false,
        "source_chain_truncated": true
      }
    }]
  }
}
JSON

assert_valid() {
  local name=$1 file=$2
  if ! "$VALIDATOR" "$file" >"$TMP/$name.out" 2>"$TMP/$name.err"; then
    fail "rejected valid diagnostics: $name"
  fi
  [[ ! -s "$TMP/$name.out" ]] || fail "validator wrote stdout on success: $name"
  [[ ! -s "$TMP/$name.err" ]] || fail "validator wrote stderr on success: $name"
}

expect_invalid_file() {
  local name=$1 file=$2
  if "$VALIDATOR" "$file" >"$TMP/$name.out" 2>"$TMP/$name.err"; then
    fail "accepted invalid diagnostics: $name"
  fi
  [[ ! -s "$TMP/$name.out" ]] || fail "validator leaked stdout: $name"
  [[ "$(cat "$TMP/$name.err")" == "factory: invalid diagnostics" ]] || fail "validator used unsafe stderr: $name"
}

expect_invalid() {
  local name=$1 filter=$2
  jq "$filter" "$TMP/valid.json" >"$TMP/$name.json"
  expect_invalid_file "$name" "$TMP/$name.json"
}

assert_valid complete-lifecycle "$TMP/valid.json"
jq '.events = .events[0:2] | .kit_errors.records = [] | .classification = "unknown_failure" | .report = {"exists":false,"valid":false,"outcome":null,"review_rounds":null}' "$TMP/valid.json" >"$TMP/incomplete.json"
assert_valid incomplete-lifecycle "$TMP/incomplete.json"

expect_invalid top-level-extra '.prompt = "secret"'
expect_invalid report-extra '.report.summary = "secret"'
expect_invalid event-extra '.events[0].details = {"prompt":"secret-canary"}'
expect_invalid kit-errors-extra '.kit_errors.raw = "secret"'
expect_invalid kit-record-extra '.kit_errors.records[0].message = "secret"'
expect_invalid diagnostics-extra '.kit_errors.records[0].diagnostics.provider_body = "secret"'
expect_invalid reqwest-extra '.kit_errors.records[0].diagnostics.reqwest.url = true'
expect_invalid boolean-as-string '.report.exists = "true"'
expect_invalid integer-as-string '.events[0].sequence = "1"'
expect_invalid success-as-string '.events[2].success = "false"'
expect_invalid duration-as-string '.events[2].duration_ms = "1"'
expect_invalid unknown-stage '.stage = "model_call"'
expect_invalid unknown-classification '.classification = "other_failure"'
expect_invalid unknown-outcome '.report.outcome = "other"'
expect_invalid unknown-event '.events[0].event = "session_started"'
expect_invalid unknown-tool '.events[0].tool = "computer"'
expect_invalid unknown-operation '.events[0].operation = "run_command"'
expect_invalid duration-over-cap '.events[2].duration_ms = 10800001'
expect_invalid noncontiguous-sequence '.events[2].sequence = 4'
expect_invalid duplicate-start '.events[2] = (.events[1] | .sequence = 3)'
expect_invalid duplicate-finish '.events += [(.events[2] | .sequence = 5)]'
expect_invalid finish-before-start '.events = [(.events[2] | .sequence = 1), (.events[1] | .sequence = 2)]'
expect_invalid mismatched-tool '.events[2].tool = "edit"'
expect_invalid mismatched-operation '.events[2].operation = "validate_report"'
expect_invalid start-has-success '.events[1].success = true'
expect_invalid start-has-duration '.events[1].duration_ms = 1'
expect_invalid finish-missing-success '.events[2].success = null'
expect_invalid finish-missing-duration '.events[2].duration_ms = null'
expect_invalid bad-call-ref '.events[1].call_ref = -1'
expect_invalid reserved-call-ref '.events[1].call_ref = 0'
expect_invalid kit-prompt-nonzero-ref '.events[0].call_ref = 2'
# $n is a jq variable.
# shellcheck disable=SC2016
expect_invalid too-many-events '.events = [range(1; 514) as $n | {"sequence":$n,"call_ref":$n,"event":"started","tool":"shell","operation":"unrecognized","success":null,"duration_ms":null}]'
expect_invalid invalid-kit-kind '.kit_errors.records[0].kind = "Provider Error"'
expect_invalid invalid-kit-attempt '.kit_errors.records[0].diagnostics.attempt = 0'

printf '{not json\n' >"$TMP/malformed.json"
expect_invalid_file malformed "$TMP/malformed.json"
ln -s "$TMP/valid.json" "$TMP/link.json"
expect_invalid_file symlink "$TMP/link.json"
expect_invalid_file missing "$TMP/missing.json"

marker=$(printf '\001kit-runtime\001')
cat >"$TMP/runtime-events.in" <<EOF
ordinary diagnostic
${marker}{"event":"session_started","session_id":"SECRET_SESSION_ID_CANARY"}
${marker}{"event":"compaction_started","reason":"SECRET_COMPACTION_REASON_CANARY","at":7}
${marker}{"event":"child_started","call":"SECRET_RAW_CALL_1","tool":"shell","summary":"bash factory/scripts/inspect-inputs.sh /input/issue.json /input/catalog.json","at":8}
${marker}{"event":"child_started","call":"SECRET_RAW_CALL_2","tool":"shell","summary":"bash factory/scripts/inspect-guide-context.sh command-canary","at":9}
${marker}{"event":"child_started","call":"SECRET_RAW_CALL_3","tool":"shell","summary":"bash factory/scripts/inspect-guide-artifacts.sh command-canary research","at":10}
${marker}{"event":"child_started","call":"SECRET_RAW_CALL_4","tool":"shell","summary":"/usr/local/bin/lint-guide --json /workspace/guides/command-canary","at":11}
${marker}{"event":"child_started","call":"SECRET_RAW_CALL_5","tool":"shell","summary":"/workspace/factory/scripts/validate-report.sh /workspace/.factory/run-report.json.tmp","at":12}
${marker}{"event":"child_started","call":"SECRET_RAW_CALL_6","tool":"shell","summary":"printf SECRET_COMMAND_CANARY https://SECRET_URL_CANARY.invalid SECRET_PROMPT_CANARY","at":13}
${marker}{"event":"child_started","call":"SECRET_RAW_CALL_7","tool":"future_tool_SECRET_TOOL_CANARY","summary":"SECRET_SUMMARY_CANARY","at":14}
${marker}{"event":"child_started","call":"SECRET_RAW_CALL_8","tool":"edit","summary":"SECRET_EDIT_SUMMARY_CANARY","at":15}
${marker}{"event":"child_finished","call":"SECRET_RAW_CALL_2","tool":"shell","ok":true,"summary":"SECRET_OUTPUT_CANARY","millis":42}
${marker}{"event":"child_finished","call":"SECRET_RAW_CALL_7","tool":"future_tool_SECRET_TOOL_CANARY","ok":false,"summary":"SECRET_RESULT_CANARY","millis":10800000}
${marker}{"event":"compaction_finished","reason":"SECRET_COMPACTION_FINISH_REASON_CANARY","ok":true,"compacted":true,"millis":17}
EOF

"$PROJECTOR" "$TMP/projected.json" <"$TMP/runtime-events.in" >"$TMP/projector.out" 2>"$TMP/projector.err" || fail 'projector rejected valid runtime events'
[[ ! -s "$TMP/projector.out" ]] || fail 'projector wrote stdout'
printf 'ordinary diagnostic\n' >"$TMP/projector.expected-err"
cmp -s "$TMP/projector.expected-err" "$TMP/projector.err" || fail 'projector did not safely forward ordinary stderr'
jq -e '
  . == [
    {"sequence":1,"call_ref":1,"event":"started","tool":"shell","operation":"inspect_inputs","success":null,"duration_ms":null},
    {"sequence":2,"call_ref":2,"event":"started","tool":"shell","operation":"inspect_guide_context","success":null,"duration_ms":null},
    {"sequence":3,"call_ref":3,"event":"started","tool":"shell","operation":"inspect_guide_artifacts","success":null,"duration_ms":null},
    {"sequence":4,"call_ref":4,"event":"started","tool":"shell","operation":"lint_guide","success":null,"duration_ms":null},
    {"sequence":5,"call_ref":5,"event":"started","tool":"shell","operation":"validate_report","success":null,"duration_ms":null},
    {"sequence":6,"call_ref":6,"event":"started","tool":"shell","operation":"unrecognized","success":null,"duration_ms":null},
    {"sequence":7,"call_ref":7,"event":"started","tool":"unknown","operation":"unknown","success":null,"duration_ms":null},
    {"sequence":8,"call_ref":8,"event":"started","tool":"edit","operation":"edit","success":null,"duration_ms":null},
    {"sequence":9,"call_ref":2,"event":"finished","tool":"shell","operation":"inspect_guide_context","success":true,"duration_ms":42},
    {"sequence":10,"call_ref":7,"event":"finished","tool":"unknown","operation":"unknown","success":false,"duration_ms":10800000}
  ]
' "$TMP/projected.json" >/dev/null || fail 'projector output did not match safe projection'
if grep -q -E 'SECRET_|future_tool' "$TMP/projected.json" "$TMP/projector.out" "$TMP/projector.err"; then
  fail 'projector leaked a marked runtime event canary'
fi

expect_bad_runtime() {
  local name=$1 marked=$2
  printf 'stale partial output\n' >"$TMP/$name.json"
  {
    printf '%s\n' "$marked"
    printf 'ordinary diagnostic after invalid event\n'
  } | "$PROJECTOR" "$TMP/$name.json" >"$TMP/$name.out" 2>"$TMP/$name.err" && fail "projector accepted invalid runtime event: $name"
  [[ ! -e "$TMP/$name.json" ]] || fail "projector retained partial output: $name"
  [[ ! -s "$TMP/$name.out" ]] || fail "projector leaked invalid runtime event to stdout: $name"
  printf '%s\n' 'ordinary diagnostic after invalid event' 'factory: invalid Kit runtime event' >"$TMP/$name.expected-err"
  cmp -s "$TMP/$name.expected-err" "$TMP/$name.err" || fail "projector did not fail safely after draining input: $name"
}

expect_bad_runtime malformed "${marker}{not-json-SECRET_MALFORMED_CANARY"
expect_bad_runtime unknown-event "${marker}{\"event\":\"future_event\",\"summary\":\"SECRET_UNKNOWN_EVENT_CANARY\"}"
expect_bad_runtime extra-source-key "${marker}{\"event\":\"session_started\",\"session_id\":\"SECRET_EXTRA_KEY_SESSION_CANARY\",\"prompt\":\"SECRET_EXTRA_KEY_PROMPT_CANARY\"}"
expect_bad_runtime invalid-source-type "${marker}{\"event\":\"child_started\",\"call\":\"SECRET_BAD_TYPE_CALL_CANARY\",\"tool\":\"shell\",\"summary\":\"SECRET_BAD_TYPE_SUMMARY_CANARY\",\"at\":\"7\"}"
expect_bad_runtime duration-over-cap "${marker}{\"event\":\"child_finished\",\"call\":\"SECRET_LONG_CALL_CANARY\",\"tool\":\"edit\",\"ok\":true,\"summary\":\"SECRET_LONG_RESULT_CANARY\",\"millis\":10800001}"

printf 'PASS: strict diagnostics validation and runtime projection\n'
