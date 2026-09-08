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
