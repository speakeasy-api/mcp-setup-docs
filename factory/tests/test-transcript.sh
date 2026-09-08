#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/home/.kit/sessions/w-parent" "$TMP/home/.kit/sessions/w-child"
cat >"$TMP/home/.kit/sessions/w-parent/parent.jsonl" <<'JSON'
{"schema_version":3,"session_id":"SECRET_SESSION","generation":1,"item":{"kind":"Assistant","parts":[{"Text":{"text":"SECRET_PROMPT"}},{"Reasoning":{"text":"SECRET_REASON"}},{"ToolCall":{"id":"SECRET_CALL","name":"compose","input":{"script":"SECRET_ARGUMENT"},"metadata":{"secret":"SECRET_META"}}}]}}
{"schema_version":3,"session_id":"SECRET_SESSION","generation":1,"item":{"kind":"Tool","parts":[{"ToolResult":{"call_id":"SECRET_CALL","is_error":false,"output":{"Structured":{"nested":{"exit_code":1,"stdout":"{\"errors\":[\"SECRET_LINT\"]}","stderr":"SECRET_STDERR","secret":"SECRET_UNKNOWN"}}}}}]}}
{"schema_version":3,"session_id":"SECRET_SESSION","generation":2,"replacement":[{"kind":"User","parts":[{"Custom":{"secret":"SECRET_CUSTOM"}},{"ToolCall":{"id":"SECRET_OTHER","name":"SECRET_TOOL","input":{}}}]}]}
{"truncated":"SECRET_TAIL
JSON
cp "$TMP/home/.kit/sessions/w-parent/parent.jsonl" "$TMP/home/.kit/sessions/w-child/child.jsonl"
ln -s "$TMP/home/.kit/sessions/w-parent" "$TMP/home/.kit/sessions/w-link"
ln -s "$TMP/home/.kit/sessions/w-parent/parent.jsonl" "$TMP/home/.kit/sessions/w-child/link.jsonl"
BUILD="$ROOT/factory/scripts/build-transcript.sh"
bash "$BUILD" "$TMP/home" "$TMP/transcript.json"
! grep -q SECRET "$TMP/transcript.json" || fail 'transcript leaked a canary'
jq -e '.sessions == 2 and ([.events[] | select(.part == "malformed")] | length) == 2 and any(.events[]; .tool == "unknown") and any(.events[]; .shell_results[0].exit_code == 1 and .shell_results[0].stdout.json_valid == true and .shell_results[0].stdout.json_count == 1) and ([.events[] | select(.part == "ToolResult") | .call_ref] == [1,1])' "$TMP/transcript.json" >/dev/null
[[ -n $(find "$TMP/transcript.json" -perm 0644 -print) ]] || fail 'transcript not host readable'
bash "$ROOT/factory/scripts/build-diagnostics.sh" docker_build 1 - - - "$TMP/diagnostics.json"
[[ -n $(find "$TMP/diagnostics.json" -perm 0644 -print) ]] || fail 'validated diagnostics not host readable'
printf 'PASS sanitized transcript\n'

# Text-wrapped JSON is a real ToolOutput variant; never copy its payload.
mkdir -p "$TMP/text/.kit/sessions/w-test"
jq -nc '{schema_version:3,item:{kind:"Tool",parts:[{ToolResult:{call_id:"SECRET",is_error:true,output:{Text:({exit_code:2,stdout:"[1,2]",stderr:"SECRET"}|tojson)}}}]}}' >"$TMP/text/.kit/sessions/w-test/test.jsonl"
printf '%s\n' '{"schema_version":3,"item":{"parts":[{"ToolResult":{"output":7}}]}}' >>"$TMP/text/.kit/sessions/w-test/test.jsonl"
bash "$BUILD" "$TMP/text" "$TMP/text.json"
jq -e '.events[0].shell_results[0].stdout.json_count == 2 and .events[1].part == "malformed"' "$TMP/text.json" >/dev/null
! grep -q SECRET "$TMP/text.json" || fail 'text output leaked a canary'
# Source prefix truncation is flagged, not copied or treated as complete.
head -c 1100000 /dev/zero | tr '\0' x >"$TMP/text/.kit/sessions/w-test/large.jsonl"
bash "$BUILD" "$TMP/text" "$TMP/limited.json"
jq -e '.limited == true and any(.events[]; .part == "malformed")' "$TMP/limited.json" >/dev/null
# A symlinked session root cannot be traversed, and stale output is removed.
mv "$TMP/text/.kit/sessions" "$TMP/real-sessions"
ln -s "$TMP/real-sessions" "$TMP/text/.kit/sessions"
if bash "$BUILD" "$TMP/text" "$TMP/text.json"; then fail 'followed session symlink'; fi
test ! -e "$TMP/text.json"

# Workflow upload is explicit, independent, and short-lived.
workflow="$ROOT/.github/workflows/guide-draft.yml"
sed -n '/name: Upload sanitized execution transcript/,/name: Upload safe factory diagnostics/p' "$workflow" >"$TMP/upload"
grep -Fq "if: always() && !cancelled() && (steps.kit.outcome == 'success' || steps.kit.outcome == 'failure')" "$TMP/upload"
# shellcheck disable=SC2016
grep -Fq 'path: ${{ runner.temp }}/export/execution-transcript.json' "$TMP/upload"
grep -Fq 'retention-days: 7' "$TMP/upload"

# Verified Kit v0.1.130 / compose 0.10.11 / Runlet 0.6.0 formats.
mkdir -p "$TMP/details/.kit/sessions/w-test"
python3 - "$TMP/details/.kit/sessions/w-test/test.jsonl" <<'PY'
import json,sys
errors = [
 'invalid tool input: runlet program rejected before execution; fix the errors and retry (warnings are advisory and do not block execution):\n\nerror RL1003 [invalid string escape] at 22..35: SECRET_ERROR\n  fix: SECRET_FIX',
 'tool execution failed: RL5201: INVALID_NUMERIC_OPERANDS\n  at 2..8: `SECRET_SOURCE`',
 'tool execution failed: RL6103: TOOL_OUTPUT_SCHEMA_MISMATCH\n  at 4..9: `SECRET_SCHEMA`',
 'tool execution failed: ACP harness handshake timeout: SECRET_TRANSPORT (harness="SECRET_ID", source=configured ACP profile, cwd=configured working directory)',
 'SECRET_UNKNOWN RL5201: INVALID_NUMERIC_OPERANDS',
]
with open(sys.argv[1],'w') as f:
 for text in errors:
  f.write(json.dumps(dict(schema_version=3,item=dict(kind='Tool',parts=[dict(ToolResult=dict(call_id='SECRET',is_error=True,output=dict(Text=text)))])))+'\n')
 value={'nested':{'id':'SECRET','generation':1,'output':'SECRET_SCHEMA_FALLBACK','updates':{'items':[{'sessionUpdate':'tool_call_update','status':'failed','content':'SECRET_UPDATE','unknown':'SECRET'}, {'sessionUpdate':'tool_call_update','status':'SECRET_STATUS'}],'truncated':True}}}
 f.write(json.dumps(dict(schema_version=3,item=dict(kind='Tool',parts=[dict(ToolResult=dict(call_id='SECRET',is_error=False,output=dict(Structured=value)))])))+'\n')
PY
bash "$BUILD" "$TMP/details" "$TMP/details.json"
jq -e '[.events[0:4][].error_details[0].category] == ["runlet_compile","runlet_type","tool_output_schema","acp_transport"] and .events[0].error_details[0].start == 22 and .events[4].error_details == [] and .events[4].error_details_omitted == true and .events[5].subagent_results[0].output_kind == "string" and .events[5].subagent_results[0].schema_validation == "not_observable" and .events[5].subagent_results[0].statuses == ["failed"] and .events[5].subagent_results[0].updates_truncated == true' "$TMP/details.json" >/dev/null
! grep -q SECRET "$TMP/details.json" || fail 'error/outcome projection leaked canaries'
# Preserve late failure evidence beyond both source and event limits.
python3 - "$TMP/details/.kit/sessions/w-test/test.jsonl" <<'PY'
import json,sys
with open(sys.argv[1], 'w') as f:
 for _ in range(5000):
  f.write(json.dumps({'schema_version':3,'item':{'kind':'Assistant','parts':[{'Text':'SECRET_PADDING'*30}]}})+'\n')
 f.write(json.dumps({'schema_version':3,'item':{'kind':'Tool','parts':[{'ToolResult':{'is_error':True,'output':{'Text':'tool execution failed: RL6102: TOOL_INPUT_SCHEMA_MISMATCH'}}}]}})+'\n')
PY
bash "$BUILD" "$TMP/details" "$TMP/tail.json"
jq -e '.limited and any(.events[]; any(.error_details[]?; .category == "tool_input_schema"))' "$TMP/tail.json" >/dev/null
! grep -q SECRET "$TMP/tail.json" || fail 'tail leaked canary'
# Compose may return a caught Runlet error nested in an otherwise successful result.
jq -nc '{schema_version:3,item:{kind:"Tool",parts:[{ToolResult:{is_error:false,output:{Structured:{nested:{code:"RL6103",message:"SECRET_ERROR",retryable:false,uncertain:true,attempt:2,span:{start:4,end:9,SECRET:9},node_id:"SECRET_NODE",SECRET:"SECRET_EXTRA"},unknown:{code:"SECRET_CODE",message:"SECRET_UNKNOWN",attempt:3}}}}}]}}' >"$TMP/details/.kit/sessions/w-test/test.jsonl"
bash "$BUILD" "$TMP/details" "$TMP/caught.json"
jq -e '.events[0].error_details == [{category:"tool_output_schema",code:"RL6103",retryable:false,uncertain:true,attempt:2,start:4,end:9}]' "$TMP/caught.json" >/dev/null
! grep -q SECRET "$TMP/caught.json" || fail 'caught error leaked canary'
# Installed sibling layout needs no source-tree paths.
mkdir -p "$TMP/installed"
cp "$BUILD" "$ROOT/factory/scripts/transcript.jq" "$TMP/installed/"
bash "$TMP/installed/build-transcript.sh" "$TMP/details" "$TMP/installed.json"
cmp "$TMP/caught.json" "$TMP/installed.json"
# Independently exercise the event cap without exceeding the source byte cap.
python3 - "$TMP/details/.kit/sessions/w-test/test.jsonl" <<'PY'
import json,sys
with open(sys.argv[1], 'w') as f:
 for _ in range(5000):
  f.write('{"schema_version":3,"item":{"kind":"Assistant","parts":[{"Text":""}]}}\n')
 f.write(json.dumps({'schema_version':3,'item':{'kind':'Tool','parts':[{'ToolResult':{'is_error':True,'output':{'Text':'tool execution failed: RL6102: TOOL_INPUT_SCHEMA_MISMATCH'}}}]}})+'\n')
PY
bash "$BUILD" "$TMP/details" "$TMP/event-cap.json"
jq -e '.limited and (.events | length) == 4096 and .events[-1].error_details[0].code == "RL6102"' "$TMP/event-cap.json" >/dev/null
