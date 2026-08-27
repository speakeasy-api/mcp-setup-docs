#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=test-helper.sh
source "$ROOT/factory/tests/test-helper.sh"
SCRIPT="$ROOT/factory/scripts/publish.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

export GH_REPO=acme/docs ISSUE_NUMBER=42 GITHUB_RUN_ID=9001
export FACTORY_RETRY_DELAY=0
export GH_LOG="$TMP/gh.log" GIT_LOG="$TMP/git.log" COMMENT_LOG="$TMP/comments.log"
export PATH="$TMP/bin:$PATH"

make_fake gh 'printf "%s\n" "$*" >>"$GH_LOG"
if [[ "$*" == *"--body-file"* ]]; then
  previous=""
  for argument in "$@"; do
    if [[ "$previous" == "--body-file" ]]; then cat "$argument" >>"$COMMENT_LOG"; printf "\n---\n" >>"$COMMENT_LOG"; fi
    previous=$argument
  done
fi
if [[ "${GH_FAIL_MUTATIONS:-0}" -gt 0 ]]; then
  count_file="${GH_FAIL_COUNT_FILE:?}"
  count=0; [[ -f "$count_file" ]] && count=$(cat "$count_file")
  if (( count < GH_FAIL_MUTATIONS )); then printf "%s" $((count + 1)) >"$count_file"; exit 1; fi
fi
case "$*" in
  "pr list"*) if [[ -n "${GH_PR_LIST:-}" ]]; then printf "%s\n" "$GH_PR_LIST"; fi ;;
  "pr create"*) printf "https://github.com/acme/docs/pull/77\n" ;;
  "pr view"*) printf "https://github.com/acme/docs/pull/77\n" ;;
esac'

make_fake git 'printf "%s\n" "$*" >>"$GIT_LOG"
case "$1" in
  diff) [[ "${GIT_HAS_DIFF:-1}" == 0 ]] ; exit ;;
  commit) [[ "${GIT_COMMIT_FAIL:-0}" == 0 ]] ; exit ;;
esac'

reset_logs() { : >"$GH_LOG"; : >"$GIT_LOG"; : >"$COMMENT_LOG"; unset GH_FAIL_MUTATIONS GH_FAIL_COUNT_FILE GH_PR_LIST GIT_COMMIT_FAIL; export GIT_HAS_DIFF=1 RESUME=false RESUME_BRANCH='' RESUME_PR_NUMBER=''; }

make_report() {
  local file=$1 outcome=$2 artifacts=$3
  jq -n --arg outcome "$outcome" --argjson artifacts "$artifacts" '{schema_version:1,outcome:$outcome,provider:"Provider $(touch /tmp/provider-pwn)",slug:"safe-slug",persona:"Backend engineer",summary:"Summary `touch /tmp/nope` $(echo no)",open_questions:["Question; rm -rf /","Second question"],blockers:(if $outcome == "converged" then [] else ["Blocker && false"] end),nits:["Nit | cat"],review_rounds:2,artifacts:$artifacts}' >"$file"
}

assert_not_contains() { local needle=$1 haystack=$2; [[ "$haystack" != *"$needle"* ]] || fail "did not expect output to contain [$needle]"; }
assert_count() { local expected=$1 needle=$2 file=$3 actual; actual=$(grep -Fc -- "$needle" "$file" || true); assert_eq "$expected" "$actual"; }

test_labels_and_transitions() {
  reset_logs
  bash "$SCRIPT" ensure-labels
  assert_count 4 "label create" "$GH_LOG"
  assert_contains "guide:draft --color 1D76DB" "$(cat "$GH_LOG")"
  assert_contains "guide:in-progress --color FBCA04" "$(cat "$GH_LOG")"
  assert_contains "guide:blocked --color D73A4A" "$(cat "$GH_LOG")"
  assert_contains "guide:stale --color C5DEF5" "$(cat "$GH_LOG")"

  reset_logs
  bash "$SCRIPT" transition
  assert_contains "issue edit 42 --repo acme/docs --remove-label guide:draft" "$(cat "$GH_LOG")"
  assert_contains "issue edit 42 --repo acme/docs --remove-label guide:blocked" "$(cat "$GH_LOG")"
  assert_contains "issue edit 42 --repo acme/docs --add-label guide:in-progress" "$(cat "$GH_LOG")"

  reset_logs
  bash "$SCRIPT" refuse "https://github.com/acme/docs/pull/12"
  assert_contains "issue edit 42 --repo acme/docs --add-label guide:blocked" "$(cat "$GH_LOG")"
  assert_contains "conflicting pull request" "$(cat "$COMMENT_LOG")"
  assert_contains "https://github.com/acme/docs/pull/12" "$(cat "$COMMENT_LOG")"

  reset_logs
  bash "$SCRIPT" cleanup
  assert_contains "--remove-label guide:in-progress" "$(cat "$GH_LOG")"

  reset_logs
  export GH_FAIL_MUTATIONS=99 GH_FAIL_COUNT_FILE="$TMP/cleanup-fails"
  rm -f "$GH_FAIL_COUNT_FILE"
  bash "$SCRIPT" cleanup
}

test_converged_new_publication() {
  reset_logs
  report="$TMP/converged.json"
  make_report "$report" converged '["research.md","meta.yaml","external.md","speakeasy.md"]'
  rm -f /tmp/nope /tmp/provider-pwn
  bash "$SCRIPT" publish "$report"
  git_log=$(cat "$GIT_LOG") gh_log=$(cat "$GH_LOG") comments=$(cat "$COMMENT_LOG")
  assert_contains "checkout -b guide/issue-42-safe-slug" "$git_log"
  assert_contains "add -- guides/safe-slug" "$git_log"
  assert_contains 'commit -m guide: Provider $(touch /tmp/provider-pwn)' "$git_log"
  assert_contains "push --set-upstream origin guide/issue-42-safe-slug" "$git_log"
  assert_contains "pr create --repo acme/docs --base main --head guide/issue-42-safe-slug" "$gh_log"
  assert_contains "pr ready 77 --repo acme/docs" "$gh_log"
  assert_contains 'Provider $(touch /tmp/provider-pwn)' "$comments"
  assert_contains "safe-slug" "$comments"
  assert_contains "Backend engineer" "$comments"
  assert_contains "## Pipeline review" "$comments"
  assert_contains "Ready for review" "$comments"
  assert_not_contains "--add-label guide:blocked" "$gh_log"
  assert_contains "--remove-label guide:in-progress" "$gh_log"
  [[ ! -e /tmp/nope && ! -e /tmp/provider-pwn ]] || fail "model text was evaluated"
  other_adds=$(grep '^add ' "$GIT_LOG" | grep -Fv 'add -- guides/safe-slug' || true)
  [[ -z "$other_adds" ]] || fail "staged paths outside selected guide"
}

test_awaiting_scope_and_resumed_ready_conversion() {
  reset_logs
  export RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER=55
  report="$TMP/scope.json"
  make_report "$report" awaiting_scope '["research.md","meta.yaml"]'
  bash "$SCRIPT" publish "$report"
  assert_not_contains "checkout" "$(cat "$GIT_LOG")"
  assert_contains "pr edit 55 --repo acme/docs" "$(cat "$GH_LOG")"
  assert_contains "pr ready 55 --repo acme/docs --undo" "$(cat "$GH_LOG")"
  assert_contains "--add-label guide:blocked" "$(cat "$GH_LOG")"
  assert_contains "## Scope check" "$(cat "$COMMENT_LOG")"
  assert_contains "1. Question; rm -rf /" "$(cat "$COMMENT_LOG")"
  assert_contains "resumed" "$(cat "$COMMENT_LOG")"
}

test_blocked_artifacts_publish_draft() {
  reset_logs
  report="$TMP/blocked.json"
  make_report "$report" blocked '["research.md","meta.yaml"]'
  bash "$SCRIPT" publish "$report"
  assert_count 1 "commit -m" "$GIT_LOG"
  assert_contains "pr ready 77 --repo acme/docs --undo" "$(cat "$GH_LOG")"
  assert_contains "Blockers" "$(cat "$COMMENT_LOG")"
  assert_contains "Open questions" "$(cat "$COMMENT_LOG")"
  assert_contains "Nits" "$(cat "$COMMENT_LOG")"
  assert_contains "Blocker && false" "$(cat "$COMMENT_LOG")"
}

test_failed_and_hard_failure_never_commit() {
  reset_logs
  report="$TMP/failed.json"
  make_report "$report" failed '[]'
  bash "$SCRIPT" publish "$report"
  [[ ! -s "$GIT_LOG" ]] || fail "failed report invoked git"
  assert_contains "Summary" "$(cat "$COMMENT_LOG")"
  assert_contains "--add-label guide:blocked" "$(cat "$GH_LOG")"
  assert_contains "--remove-label guide:in-progress" "$(cat "$GH_LOG")"

  reset_logs
  printf '%s\n' 'runner exploded `uname`' >"$TMP/reason.txt"
  bash "$SCRIPT" fail "$TMP/reason.txt"
  [[ ! -s "$GIT_LOG" ]] || fail "hard failure invoked git"
  assert_contains 'runner exploded `uname`' "$(cat "$COMMENT_LOG")"
  assert_contains "https://github.com/acme/docs/actions/runs/9001" "$(cat "$COMMENT_LOG")"
  assert_contains "Re-add" "$(cat "$COMMENT_LOG")"
  assert_contains "--add-label guide:blocked" "$(cat "$GH_LOG")"
  assert_contains "--remove-label guide:in-progress" "$(cat "$GH_LOG")"
}

test_no_change_orphan_creates_pr_and_converges_resume() {
  reset_logs
  export GIT_HAS_DIFF=0 RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER=''
  report="$TMP/no-change.json"
  make_report "$report" converged '["research.md","meta.yaml","external.md","speakeasy.md"]'
  bash "$SCRIPT" publish "$report"
  assert_count 0 "commit -m" "$GIT_LOG"
  assert_count 0 "push --set-upstream" "$GIT_LOG"
  assert_contains "pr create" "$(cat "$GH_LOG")"
  assert_contains "pr ready 77 --repo acme/docs" "$(cat "$GH_LOG")"

  reset_logs
  export GIT_HAS_DIFF=0 RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER=55
  bash "$SCRIPT" publish "$report"
  assert_count 0 "commit -m" "$GIT_LOG"
  assert_not_contains "pr create" "$(cat "$GH_LOG")"
  assert_contains "pr edit 55 --repo acme/docs" "$(cat "$GH_LOG")"
  assert_contains "pr ready 55 --repo acme/docs" "$(cat "$GH_LOG")"
}

test_github_retries_but_commit_does_not() {
  reset_logs
  export GH_FAIL_MUTATIONS=2 GH_FAIL_COUNT_FILE="$TMP/gh-fails"
  rm -f "$GH_FAIL_COUNT_FILE"
  bash "$SCRIPT" transition
  assert_eq 2 "$(cat "$GH_FAIL_COUNT_FILE")"

  reset_logs
  export GIT_COMMIT_FAIL=1
  report="$TMP/commit-fail.json"
  make_report "$report" converged '["research.md","meta.yaml","external.md","speakeasy.md"]'
  if bash "$SCRIPT" publish "$report"; then fail "commit failure succeeded"; fi
  assert_count 1 "commit -m" "$GIT_LOG"
  assert_not_contains "pr create" "$(cat "$GH_LOG")"
  assert_contains "--remove-label guide:in-progress" "$(cat "$GH_LOG")"
}

test_comments_and_title_are_bounded() {
  reset_logs
  report="$TMP/bounded.json"
  long=$(printf '%1200s' '' | tr ' ' x)
  jq -n --arg long "$long" '{schema_version:1,outcome:"blocked",provider:$long,slug:"safe-slug",persona:$long,summary:$long,open_questions:[range(0;25)|($long + tostring)],blockers:[range(0;25)|($long + tostring)],nits:[range(0;25)|($long + tostring)],review_rounds:3,artifacts:["research.md","meta.yaml"]}' >"$report"
  bash "$SCRIPT" publish "$report"
  title=$(grep 'pr create' "$GH_LOG")
  (( ${#title} < 600 )) || fail "PR command/title was not bounded"
  (( $(wc -c <"$COMMENT_LOG") < 65000 )) || fail "comment was not bounded"
  assert_not_contains "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" "$(cat "$COMMENT_LOG")"


  reset_logs
  jq -n '{schema_version:1,outcome:"blocked",provider:"Provider",slug:"safe-slug",persona:"Persona",summary:"Summary",open_questions:[range(0;25)|"question-\(.)"],blockers:[],nits:[],review_rounds:3,artifacts:["research.md","meta.yaml"]}' >"$report"
  bash "$SCRIPT" publish "$report"
  assert_contains "question-19" "$(cat "$COMMENT_LOG")"
  assert_not_contains "question-20" "$(cat "$COMMENT_LOG")"
}

test_labels_and_transitions
test_converged_new_publication
test_awaiting_scope_and_resumed_ready_conversion
test_blocked_artifacts_publish_draft
test_failed_and_hard_failure_never_commit
test_no_change_orphan_creates_pr_and_converges_resume
test_github_retries_but_commit_does_not
test_comments_and_title_are_bounded
printf 'PASS: deterministic publication and comments\n'
