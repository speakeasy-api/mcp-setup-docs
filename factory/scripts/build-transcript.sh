#!/usr/bin/env bash
# Only structural data is exported. Never print source paths or jq errors.
set -euo pipefail
[[ $# == 2 ]] || exit 1
home=$1
output=$2
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
filter="$SCRIPT_DIR/transcript.jq"
[[ -d $(dirname "$output") && ! -d $output ]] || exit 1
rm -f -- "$output"
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
sessions="$home/.kit/sessions"
# Fixed-depth globs, rejecting every symlink component below the supplied home.
[[ ! -L $home && ! -L $home/.kit && ! -L $sessions ]] || exit 1
count=0
bytes=0
limited=false
: >"$tmp/events"
shopt -s nullglob
for dir in "$sessions"/w-*; do
  [[ -d $dir && ! -L $dir ]] || continue
  for file in "$dir"/*.jsonl; do
    [[ -f $file && ! -L $file ]] || continue
    if ((count >= 64 || bytes >= 8388608)); then limited=true; break 2; fi
    count=$((count + 1))
    # Bound input even for an unterminated or enormous line.
    head -c 1048576 -- "$file" >"$tmp/source" 2>/dev/null || exit 1
    size=$(wc -c <"$tmp/source")
    bytes=$((bytes + size))
    if ((size >= 1048576)); then limited=true; fi
    jq -Rnc --argjson session "$count" -f "$filter" <"$tmp/source" >>"$tmp/events" 2>/dev/null || exit 1
  done
done
jq -sc --argjson sessions "$count" --argjson limited "$limited" '
 {schema_version:1,kind:"guide_factory_transcript",sessions:$sessions,
 limited:($limited or length > 4096),events:.[0:4096]}
' "$tmp/events" >"$tmp/safe" 2>/dev/null
[[ $(wc -c <"$tmp/safe") -le 2097152 ]] || exit 1
# Defense in depth: no unrecognized key or string may cross the export boundary.
jq -e '
 def keysafe: IN("schema_version","kind","sessions","limited","events","session_ref","call_ref","role","part","tool","is_error","shell_results","exit_code","stdout","stderr","present","json_valid","json_count");
 all(.. | objects | keys[]; keysafe) and
 all(.. | strings; IN("guide_factory_transcript","System","Developer","User","Assistant","Tool","Context","Notification","unknown","Text","Media","File","Structured","Reasoning","ToolCall","ToolResult","Custom","malformed","shell","compose","tool","tool_search","subagent","prompt","fork","close","skill","docs","edit","a2a","auth","subagents")) and
 all(.. | numbers; floor == . and . >= 0 and . <= 8388608)
' "$tmp/safe" >/dev/null 2>&1 || exit 1
chmod 0644 "$tmp/safe"
mv -f -- "$tmp/safe" "$output"
