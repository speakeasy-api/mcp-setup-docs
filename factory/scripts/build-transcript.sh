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
    # Bound retained input even for an unterminated or enormous line.
    budget=$((8388608 - bytes))
    if ((budget > 1048576)); then budget=1048576; fi
    size=$(wc -c <"$file")
    if ((size > budget)); then
      limited=true
      head -c "$((budget / 2))" -- "$file" >"$tmp/source" 2>/dev/null || exit 1
      printf '\n' >>"$tmp/source"
      tail -c "$((budget - budget / 2))" -- "$file" | sed '1d' >>"$tmp/source" || exit 1
      size=$budget
    else
      head -c "$budget" -- "$file" >"$tmp/source" 2>/dev/null || exit 1
    fi
    bytes=$((bytes + size))
    jq -Rnc --argjson session "$count" -f "$filter" <"$tmp/source" >>"$tmp/events" 2>/dev/null || exit 1
  done
done
jq -sc --argjson sessions "$count" --argjson limited "$limited" '
 {schema_version:1,kind:"guide_factory_transcript",sessions:$sessions,
 limited:($limited or length > 4096),events:(if length > 4096 then .[0:2048] + .[-2048:] else . end)}
' "$tmp/events" >"$tmp/safe" 2>/dev/null
[[ $(wc -c <"$tmp/safe") -le 2097152 ]] || exit 1
# Defense in depth: no unrecognized key or string may cross the export boundary.
jq -e '
 def keysafe: IN("schema_version","kind","sessions","limited","events","session_ref","call_ref","role","part","tool","is_error","shell_results","exit_code","stdout","stderr","present","json_valid","json_count","error_details","error_details_omitted","category","code","start","end","phase","subagent_results","completed","generation","output_kind","schema_validation","updates_truncated","statuses","retryable","uncertain","attempt");
 all(.. | objects | keys[]; keysafe) and
 all(.. | strings; IN("guide_factory_transcript","System","Developer","User","Assistant","Tool","Context","Notification","unknown","Text","Media","File","Structured","Reasoning","ToolCall","ToolResult","Custom","malformed","shell","compose","tool","tool_search","subagent","prompt","fork","close","skill","docs","edit","a2a","auth","subagents","runlet_compile","RL1003","runlet_type","RL5201","tool_input_schema","RL6102","tool_output_schema","RL6103","output_schema_invalid","acp_transport","handshake_timeout","handshake_failure","cancelled","not_observable","string","object","array","number","boolean","null","pending","in_progress","completed","failed")) and
 all(.. | numbers; floor == . and . >= 0 and . <= 8388608)
' "$tmp/safe" >/dev/null 2>&1 || exit 1
chmod 0644 "$tmp/safe"
mv -f -- "$tmp/safe" "$output"
