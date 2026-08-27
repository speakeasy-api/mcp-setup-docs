#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/scripts/lib.sh"

require_env GH_REPO
require_env ISSUE_NUMBER
require_env GITHUB_OUTPUT
[[ "$ISSUE_NUMBER" =~ ^[1-9][0-9]*$ ]] || die "invalid issue number: $ISSUE_NUMBER"

prs="$(mktemp)"
matching="$(mktemp)"
cleanup() { rm -f "$prs" "$matching"; }
trap cleanup EXIT
retry_gh pr list --state open --json number,url,headRefName,author,body,isDraft >"$prs" \
  || die "failed to list open pull requests"

jq -e 'type == "array" and all(.[];
  (.number | type) == "number"
  and (.url | type) == "string"
  and (.headRefName | type) == "string"
  and (.author.login | type) == "string"
  and ((.body | type) == "string" or (.body | type) == "null")
  and (.isDraft | type) == "boolean")' "$prs" >/dev/null \
  || die "malformed pull request response"

jq -c --arg issue "$ISSUE_NUMBER" '
  .[] | select((.body // "") | test("(closes|fixes|resolves)[[:space:]]+#" + $issue + "\\b"; "i"))
' "$prs" >"$matching"

refused=false
refused_pr_url=''
resume=false
resume_branch=''
resume_pr_number=''
prefix="guide/issue-$ISSUE_NUMBER-"

while IFS= read -r pr; do
  [[ -n "$pr" ]] || continue
  login="$(jq -r '.author.login' <<<"$pr")"
  if ! gh api "repos/$GH_REPO/collaborators/$login" --silent >/dev/null 2>&1; then
    continue
  fi
  head="$(jq -r '.headRefName' <<<"$pr")"
  if [[ "$head" == "$prefix"* ]]; then
    resume=true
    resume_branch=$head
    resume_pr_number="$(jq -r '.number' <<<"$pr")"
  else
    refused=true
    refused_pr_url="$(jq -r '.url' <<<"$pr")"
  fi
  break
done <"$matching"

if [[ "$resume" == false && "$refused" == false ]]; then
  git fetch --quiet origin "+refs/heads/$prefix*:refs/remotes/origin/$prefix*" \
    || die "failed to fetch factory branches"
  resume_branch="$(git for-each-ref --count=1 --sort=-committerdate --format='%(refname:strip=3)' "refs/remotes/origin/$prefix*")"
  if [[ -n "$resume_branch" ]]; then resume=true; fi
fi

write_output refused "$refused"
write_output refused_pr_url "$refused_pr_url"
write_output resume "$resume"
write_output resume_branch "$resume_branch"
write_output resume_pr_number "$resume_pr_number"
