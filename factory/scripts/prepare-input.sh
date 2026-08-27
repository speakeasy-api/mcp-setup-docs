#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/scripts/lib.sh"

[[ $# -eq 2 ]] || die "usage: ${0##*/} <issue-number> <output-json>"
issue=$1
output=$2
[[ "$issue" =~ ^[1-9][0-9]*$ ]] || die "invalid issue number: $issue"
require_env GH_REPO
mkdir -p "$(dirname "$output")"
tmp="$(mktemp "${output}.tmp.XXXXXX")"
cleanup() { rm -f "$tmp"; }
trap cleanup EXIT

retry_gh issue view "$issue" --json number,title,body,author,comments,url \
  | jq -e '
      if (.number | type) != "number"
        or (.title | type) != "string"
        or (.body | type) != "string"
        or (.url | type) != "string"
        or (.author.login | type) != "string"
        or (.comments | type) != "array"
        or any(.comments[]; (.createdAt | type) != "string" or (.body | type) != "string" or ((.author.login | type) != "string" and (.author.login | type) != "null"))
      then error("malformed issue response")
      else {
        schema_version: 1,
        repository: env.GH_REPO,
        issue: {number, title, body, url, author: .author.login},
        comments: [.comments[-100:][] | {author: .author.login, created_at: .createdAt, body}]
      }
      end
    ' >"$tmp"
jq -e . "$tmp" >/dev/null
mv "$tmp" "$output"
trap - EXIT
