#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/scripts/lib.sh"

[[ $# -eq 2 ]] || die "usage: ${0##*/} <issue-json> <catalog-json>"
issue_input=$1
catalog_input=$2
issue=''
catalog=''
cleanup() {
  [[ -z "$issue" ]] || rm -f "$issue"
  [[ -z "$catalog" ]] || rm -f "$catalog"
}
trap cleanup EXIT
issue="$(mktemp "${TMPDIR:-/tmp}/factory-issue.XXXXXX")"
catalog="$(mktemp "${TMPDIR:-/tmp}/factory-catalog.XXXXXX")"

if ! jq -e -s '
  if length == 1 and (.[0] |
    type == "object"
    and (keys | sort) == (["comments","issue","repository","schema_version"] | sort)
    and .schema_version == 1
    and (.repository | type) == "string"
    and (.issue | type) == "object"
    and (.issue | keys | sort) == (["author","body","number","title","url"] | sort)
    and (.issue.number | type) == "number"
    and (.issue.title | type) == "string"
    and (.issue.body | type) == "string"
    and (.issue.url | type) == "string"
    and ((.issue.author | type) == "string" or (.issue.author | type) == "null")
    and (.comments | type) == "array"
    and all(.comments[];
      type == "object"
      and (keys | sort) == (["author","body","created_at"] | sort)
      and ((.author | type) == "string" or (.author | type) == "null")
      and (.created_at | type) == "string"
      and (.body | type) == "string"))
  then .[0] | {
    schema_version, repository,
    issue:{number:.issue.number,title:.issue.title,body:.issue.body,url:.issue.url,author:.issue.author},
    comments:[.comments[] | {author,created_at,body}]
  }
  else error("invalid issue")
  end
' "$issue_input" >"$issue" 2>/dev/null; then
  die "malformed issue snapshot"
fi

if ! bash "$ROOT/factory/scripts/inspect-catalog.sh" "$catalog_input" >"$catalog" 2>/dev/null; then
  die "malformed catalog snapshot"
fi

personas="$(find "$ROOT/doctrine/personas" -maxdepth 1 -type f -name '*.md' -exec basename {} .md \; | sort | jq -Rsc 'split("\n") | map(select(length > 0))')"
guides="$(find "$ROOT/guides" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | jq -Rsc 'split("\n") | map(select(length > 0))')"

jq -n --slurpfile issue "$issue" --slurpfile catalog "$catalog" \
  --argjson personas "$personas" --argjson guide_slugs "$guides" \
  '{issue:$issue[0], catalog:$catalog[0], personas:$personas, guide_slugs:$guide_slugs}'
