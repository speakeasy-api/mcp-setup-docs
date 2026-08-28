#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/scripts/lib.sh"

[[ $# -eq 1 ]] || die "usage: ${0##*/} <catalog-json>"
input=$1

if ! jq -e -s '
  if length == 1 and (.[0] |
    type == "object"
    and (.status == "ready" or .status == "skipped")
    and (.tenant | type) == "string"
    and (.observed_at | type) == "string"
    and (.observed_at | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"))
    and (.observed_at as $timestamp
      | try (($timestamp | fromdateiso8601 | todateiso8601) == $timestamp) catch false)
    and (.servers | type) == "array"
    and (if .status == "skipped" then (.servers | length) == 0 else true end)
    and all(.servers[];
      type == "object"
      and (.name | type) == "string" and (.name | length) > 0
      and ((.title | type) == "string" or (.title | type) == "null")
      and ((.description | type) == "string" or (.description | type) == "null")
      and (.remotes | type) == "array"
      and all(.remotes[];
        type == "object"
        and (.transport | type) == "string"
        and (.url | type) == "string")))
  then .[0] | {status, observed_at, servers:[.servers[] | {name, title, description}]}
  else error("invalid catalog")
  end
' "$input" 2>/dev/null; then
  die "malformed catalog snapshot"
fi
