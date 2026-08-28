#!/usr/bin/env bash
set -euo pipefail

ERROR='factory: invalid guide context spill'
CHUNK_CHARACTERS=4000
artifact=${1-}
mode=${2-}
index=${3-}
offset=${4-}
temporary=

cleanup() {
  if [[ -n $temporary ]]; then
    rm -f -- "$temporary"
  fi
}
trap cleanup EXIT HUP INT TERM

fail_closed() {
  printf '%s\n' "$ERROR" >&2
  exit 1
}

[[ -n ${HOME:-} && -n $artifact && -n $mode ]] || fail_closed
artifact_root="$HOME/.kit/artifacts"
[[ -d $artifact_root && -f $artifact && ! -L $artifact ]] || fail_closed
resolved_root=$(realpath "$artifact_root" 2>/dev/null) || fail_closed
resolved_artifact=$(realpath "$artifact" 2>/dev/null) || fail_closed
[[ $resolved_artifact == "$resolved_root/"* ]] || fail_closed
[[ ${resolved_artifact##*/} =~ ^compose-output(-[1-9][0-9]*)?[.]json$ ]] || fail_closed

temporary=$(mktemp "${TMPDIR:-/tmp}/factory-context-spill.XXXXXX") || fail_closed
# jq programs intentionally use jq variables.
# shellcheck disable=SC2016
validate_filter='
  def exact($allowed): (keys | sort) == ($allowed | sort);
  if type != "object" or (exact(["exit_code","success","stdout","stderr"]) | not)
     or .exit_code != 0 or .success != true or (.stdout | type) != "string"
     or .stderr != "" then error("invalid") else .stdout | fromjson end
  | if type != "object" or (exact(["slug","files"]) | not)
       or (.slug | type) != "string" or (.slug | test("^[a-z0-9]+(-[a-z0-9]+)*$") == false)
       or (.files | type) != "object"
       or (all(.files | to_entries[]; (.key | type) == "string" and (.value | type) == "string") | not)
    then error("invalid") else . end
'
# jq programs intentionally use jq variables.
# shellcheck disable=SC2016
read_filter='
  | (.files | to_entries | sort_by(.key)) as $entries
  | (if $index >= ($entries | length) then error("invalid") else $entries[$index] end) as $entry
  | ($entry.value | length) as $length
  | if $offset > $length then error("invalid") else . end
  | ([$offset + $chunk, $length] | min) as $next
  | [
      "path=\($entry.key)",
      "index=\($index)",
      "offset=\($offset)",
      "next_offset=\($next)",
      "done=\($next == $length)",
      "",
      $entry.value[$offset:$next]
    ] | join("\n")
'

case $mode in
  index)
    (( $# == 2 )) || fail_closed
    if ! jq -ce "$validate_filter
      | {slug, files:(.files | to_entries | sort_by(.key) | to_entries
          | map({index:.key,path:.value.key,characters:(.value.value | length)}))}
    " "$resolved_artifact" >"$temporary" 2>/dev/null; then
      fail_closed
    fi
    ;;
  read)
    (( $# == 4 )) || fail_closed
    [[ $index =~ ^(0|[1-9][0-9]*)$ && $offset =~ ^(0|[1-9][0-9]*)$ ]] || fail_closed
    if ! jq -rce --argjson index "$index" --argjson offset "$offset" \
      --argjson chunk "$CHUNK_CHARACTERS" "$validate_filter$read_filter" \
      "$resolved_artifact" >"$temporary" 2>/dev/null; then
      fail_closed
    fi
    ;;
  *)
    fail_closed
    ;;
esac

cat "$temporary" || fail_closed
