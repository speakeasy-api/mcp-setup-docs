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
factory_prs="$(mktemp)"
human_prs="$(mktemp)"
collaborator_response="$(mktemp)"
branch_candidates="$(mktemp)"
cleanup() {
  rm -f "$prs" "$matching" "$factory_prs" "$human_prs" \
    "$collaborator_response" "$branch_candidates"
}
trap cleanup EXIT
retry_gh pr list --state open --json number,url,headRefName,author,body,isDraft >"$prs" \
  || die "failed to list open pull requests"

jq -e 'type == "array" and all(.[];
  (.number | type) == "number"
  and (.url | type) == "string"
  and (.headRefName | type) == "string"
  and ((.author | type) == "null" or ((.author | type) == "object"
    and ((.author.login | type) == "string" or (.author.login | type) == "null")))
  and ((.body | type) == "string" or (.body | type) == "null")
  and (.isDraft | type) == "boolean")' "$prs" >/dev/null \
  || die "malformed pull request response"

jq -c --arg issue "$ISSUE_NUMBER" '
  [.[] | select((.body // "") | test("(closes|fixes|resolves)[[:space:]]+#" + $issue + "\\b"; "i"))]
  | sort_by(.number)[]
' "$prs" >"$matching"

is_collaborator() {
  local login=$1 attempt status
  for attempt in 1 2 3; do
    : >"$collaborator_response"
    if gh api "repos/$GH_REPO/collaborators/$login" --include --silent \
      >"$collaborator_response" 2>/dev/null; then
      return 0
    fi
    status="$(awk '/^HTTP\// { code=$2 } END { print code }' "$collaborator_response")"
    [[ "$status" == 404 ]] && return 1
    (( attempt == 3 )) || sleep "$attempt"
  done
  die "could not determine collaborator status for $login"
}

refused=false
refused_pr_url=''
resume=false
resume_branch=''
resume_pr_number=''
prefix="guide/issue-$ISSUE_NUMBER-"

while IFS= read -r pr; do
  [[ -n "$pr" ]] || continue
  login="$(jq -r '.author.login // empty' <<<"$pr")"
  [[ -n "$login" ]] || continue
  if is_collaborator "$login"; then
    head="$(jq -r '.headRefName' <<<"$pr")"
    if [[ "$head" == "$prefix"* ]]; then
      printf '%s\n' "$pr" >>"$factory_prs"
    else
      printf '%s\n' "$pr" >>"$human_prs"
    fi
  fi
done <"$matching"

factory_count="$(wc -l <"$factory_prs" | tr -d ' ')"
human_count="$(wc -l <"$human_prs" | tr -d ' ')"
if (( factory_count > 1 || (factory_count == 1 && human_count > 0) )); then
  die "ambiguous collaborator pull requests closing issue #$ISSUE_NUMBER"
elif (( factory_count == 1 )); then
  pr="$(cat "$factory_prs")"
  resume=true
  resume_branch="$(jq -r '.headRefName' <<<"$pr")"
  resume_pr_number="$(jq -r '.number' <<<"$pr")"
elif (( human_count > 0 )); then
  pr="$(sed -n '1p' "$human_prs")"
  refused=true
  refused_pr_url="$(jq -r '.url' <<<"$pr")"
fi

if [[ "$resume" == false && "$refused" == false ]]; then
  git fetch --quiet --prune origin "+refs/heads/$prefix*:refs/remotes/origin/$prefix*" \
    || die "failed to fetch factory branches"
  git for-each-ref --format='%(committerdate:unix)%09%(refname:strip=3)' \
    "refs/remotes/origin/$prefix*" \
    | LC_ALL=C sort -k1,1nr -k2,2 >"$branch_candidates"
  while IFS=$'\t' read -r commit_date branch; do
    [[ "$commit_date" =~ ^[0-9]+$ && "$branch" == "$prefix"* ]] \
      || die "invalid factory branch metadata"
    git rev-parse --verify --quiet "refs/remotes/origin/$branch^{commit}" >/dev/null \
      || die "invalid factory branch: $branch"
  done <"$branch_candidates"
  if IFS=$'\t' read -r _ resume_branch <"$branch_candidates"; then
    resume=true
  fi
fi

write_output refused "$refused"
write_output refused_pr_url "$refused_pr_url"
write_output resume "$resume"
write_output resume_branch "$resume_branch"
write_output resume_pr_number "$resume_pr_number"
