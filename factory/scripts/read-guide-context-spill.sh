#!/usr/bin/env bash
set -euo pipefail

ERROR='factory: invalid guide context spill'
CHUNK_CHARACTERS=4000
MAX_ENCODED_BYTES=7000
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
       or (.files | type) != "object" or (.files | length) < 1 or (.files | length) > 40
       or ((.files | has("doctrine/constitution.md")) | not)
       or ((.files | has("doctrine/shared.md")) | not)
       or ((.files | has("doctrine/glossary.md")) | not)
       or ((.files | has("doctrine/speakeasy-setup.md")) | not)
       or ((.files | has("schema/guide.v1.schema.json")) | not)
       or (all(.files | to_entries[];
          (.key | type) == "string" and (.key | length) <= 120
          and (.key | test("^(doctrine/(constitution|shared|glossary|speakeasy-setup)[.]md|doctrine/(personas|roles)/[A-Za-z0-9._-]+[.]md|factory/schemas/[A-Za-z0-9._-]+[.]json|schema/guide[.]v1[.]schema[.]json|guides/[a-z0-9]+(-[a-z0-9]+)*/(research[.]md|meta[.]yaml|external[.]md|speakeasy[.]md))$"))
          and (.value | type) == "string") | not)
    then error("invalid") else . end
'
# jq programs intentionally use jq variables.
# shellcheck disable=SC2016
read_definitions='
  def body($entry; $length; $next):
    [
      "path=\($entry.key)",
      "index=\($index)",
      "offset=\($offset)",
      "next_offset=\($next)",
      "done=\($next == $length)",
      "",
      $entry.value[$offset:$next]
    ] | join("\n");
  def encoded_bytes($text):
    ({exit_code:0,success:true,stdout:($text + "\n"),stderr:""} | tojson | utf8bytelength);
  def fit($entry; $length; $low; $high):
    if $low >= $high then $low
    else (($low + $high + 1) / 2 | floor) as $middle
      | if encoded_bytes(body($entry; $length; $middle)) <= $max_encoded
        then fit($entry; $length; $middle; $high)
        else fit($entry; $length; $low; $middle - 1)
        end
    end;
'
# jq programs intentionally use jq variables.
# shellcheck disable=SC2016
read_filter='
  | (.files | to_entries | sort_by(.key)) as $entries
  | (if $index >= ($entries | length) then error("invalid") else $entries[$index] end) as $entry
  | ($entry.value | length) as $length
  | if $offset > $length then error("invalid") else . end
  | ([$offset + $chunk, $length] | min) as $maximum
  | fit($entry; $length; $offset; $maximum) as $next
  | if $next == $offset and $offset < $length then error("invalid")
    else body($entry; $length; $next) end
'

case $mode in
  index)
    (( $# == 2 )) || fail_closed
    if ! jq -ce "$validate_filter
      | {slug, files:(.files | to_entries | sort_by(.key) | to_entries
          | map({index:.key,path:.value.key,characters:(.value.value | length)}))}
    " "$resolved_artifact" >"$temporary" 2>/dev/null \
      || ! jq -en --rawfile stdout "$temporary" --argjson maximum "$MAX_ENCODED_BYTES" \
        '({exit_code:0,success:true,stdout:$stdout,stderr:""} | tojson | utf8bytelength) <= $maximum' \
        >/dev/null 2>&1; then
      fail_closed
    fi
    ;;
  read)
    (( $# == 4 )) || fail_closed
    [[ $index =~ ^(0|[1-9][0-9]*)$ && $offset =~ ^(0|[1-9][0-9]*)$ ]] || fail_closed
    if ! jq -rce --argjson index "$index" --argjson offset "$offset" \
      --argjson chunk "$CHUNK_CHARACTERS" --argjson max_encoded "$MAX_ENCODED_BYTES" \
      "$read_definitions$validate_filter$read_filter" \
      "$resolved_artifact" >"$temporary" 2>/dev/null; then
      fail_closed
    fi
    ;;
  *)
    fail_closed
    ;;
esac

cat "$temporary" || fail_closed
