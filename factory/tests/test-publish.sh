#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
SCRIPT="$ROOT/factory/scripts/publish.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

TMP="$(cd "$TMP" && pwd -P)"
export RUNNER_TEMP="$TMP/runner"
mkdir -p "$RUNNER_TEMP/export"
export GH_REPO=acme/docs ISSUE_NUMBER=42 GITHUB_RUN_ID=9001 GITHUB_RUN_ATTEMPT=1
export FACTORY_RETRY_DELAY=0
export GH_LOG="$TMP/gh.log" GIT_LOG="$TMP/git.log" COMMENT_LOG="$TMP/comments.log" RM_LOG="$TMP/rm.log"
export PATH="$TMP/bin:$PATH"
REAL_RM="$(command -v rm)"
export REAL_RM

# shellcheck disable=SC2016
make_fake gh 'printf "%s\n" "$*" >>"$GH_LOG"
if [[ "$*" == *"--body-file"* ]]; then
  previous=""
  for argument in "$@"; do
    if [[ "$previous" == "--body-file" ]]; then cat "$argument" >>"$COMMENT_LOG"; printf "\n---\n" >>"$COMMENT_LOG"; fi
    previous=$argument
  done
fi
if [[ -n "${GH_FAIL_MATCH:-}" && "$*" == *"$GH_FAIL_MATCH"* ]]; then exit 1; fi
if [[ "${GH_FAIL_MUTATIONS:-0}" -gt 0 ]]; then
  count_file="${GH_FAIL_COUNT_FILE:?}"
  count=0; [[ -f "$count_file" ]] && count=$(cat "$count_file")
  if (( count < GH_FAIL_MUTATIONS )); then printf "%s" $((count + 1)) >"$count_file"; exit 1; fi
fi
case "$*" in
  "api graphql"*) printf "%s\n" "${GH_VIEWER:-factory-agent}" ;;
  "api repos/acme/docs/issues/42/comments"*) printf "[%s]\n" "${GH_COMMENTS_JSON:-[]}" ;;
  "issue view"*)
    if [[ -n "${GH_LABEL_STATE_FILE:-}" ]]; then
      jq -Rn "[inputs | {name:.}] | {labels:.}" <"$GH_LABEL_STATE_FILE"
    else printf "%s\n" "$GH_LABELS_JSON"; fi ;;
  "issue edit"*)
    if [[ -n "${GH_LABEL_STATE_FILE:-}" ]]; then
      previous=
      for argument in "$@"; do
        if [[ "$previous" == --remove-label ]]; then
          grep -Fvx "$argument" "$GH_LABEL_STATE_FILE" >"$GH_LABEL_STATE_FILE.next" || true
          mv "$GH_LABEL_STATE_FILE.next" "$GH_LABEL_STATE_FILE"
        elif [[ "$previous" == --add-label ]] && ! grep -Fqx "$argument" "$GH_LABEL_STATE_FILE"; then
          printf "%s\n" "$argument" >>"$GH_LABEL_STATE_FILE"
        fi
        previous=$argument
      done
    fi ;;
  "pr list"*)
    if [[ -f "${GH_PR_STATE_FILE:-/nonexistent}" ]]; then response=$(cat "$GH_PR_STATE_FILE")
    elif [[ -n ${GH_PR_LIST:-} ]]; then response=$GH_PR_LIST
    elif [[ ${RESUME_PR_NUMBER:-} =~ ^[1-9][0-9]*$ ]]; then
      response=$(jq -n --argjson n "$RESUME_PR_NUMBER" "[{number:\$n,url:(\"https://github.com/acme/docs/pull/\"+(\$n|tostring))}]")
    else response="[]"; fi
    jq --arg head "${GH_PR_HEAD:-guide/issue-42-safe-slug}" --arg author "${GH_PR_AUTHOR:-factory-agent}" \
      "map({headRefName:\$head,headRepository:{nameWithOwner:\"acme/docs\"},baseRefName:\"main\",isCrossRepository:false,author:{login:\$author}} + .)" <<<"$response" ;;
  "pr create"*)
    if [[ ${GH_RECEIPT_WRITE_FAIL:-0} == 1 ]]; then
      ln -s "$RUNNER_TEMP/receipt-sentinel" "$FACTORY_PUBLICATION_RECEIPT.pending"
    fi
    if [[ -n "${GH_CREATE_PR_JSON:-}" ]]; then printf "%s\n" "$GH_CREATE_PR_JSON" >"$GH_PR_STATE_FILE"; fi
    printf "%b" "${GH_CREATE_OUTPUT:-https://github.com/acme/docs/pull/77\n}"
    [[ "${GH_CREATE_LOST:-0}" == 0 ]] ;;
esac'

# shellcheck disable=SC2016
make_fake git 'printf "%s\n" "$*" >>"$GIT_LOG"
case "$1" in
  diff) [[ "${GIT_HAS_DIFF:-1}" == 0 ]] ; exit ;;
  commit)
    if [[ -n "${GIT_SIGNAL:-}" ]]; then kill -s "$GIT_SIGNAL" "$PPID"; exit 0; fi
    [[ "${GIT_COMMIT_FAIL:-0}" == 0 ]] || exit "${GIT_COMMIT_STATUS:-1}" ;;
  rev-parse)
    if [[ "${3:-}" == HEAD ]]; then printf "%s\n" "${GIT_LOCAL_HEAD:-same}"
    else printf "%s\n" "${GIT_REMOTE_HEAD:-same}"; fi ;;
esac'

# shellcheck disable=SC2016
make_fake rm 'printf "%s\n" "$*" >>"$RM_LOG"
if [[ -n "${RM_FAIL_MATCH:-}" && "$*" == *"$RM_FAIL_MATCH"* ]]; then exit "${RM_FAIL_STATUS:-91}"; fi
exec "$REAL_RM" "$@"'

make_fake sleep 'exit 0'

reset_logs() {
  export GITHUB_RUN_ATTEMPT=1 READABLE_UPLOAD_OUTCOME=success READABLE_LOG_STATUS=complete
  export READABLE_ARTIFACT_URL=https://github.com/acme/docs/actions/runs/9001/artifacts/123
  export FACTORY_PUBLICATION_RECEIPT="$RUNNER_TEMP/guide-factory-publication/publication-receipt.json"
  "$REAL_RM" -rf "$RUNNER_TEMP/guide-factory-publication"
  printf '%s' '{"version":1,"primary_outcome":"converged","readable_export":"ready","partial":false,"publication_ready":true}' >"$RUNNER_TEMP/export/finalization.json"
  "$REAL_RM" -f "$RUNNER_TEMP/export/session-transcript.json"
  printf '{}' >"$RUNNER_TEMP/export/session-transcript.json"

  unset GH_RECEIPT_WRITE_FAIL GH_PR_HEAD GH_PR_AUTHOR GH_FAIL_MUTATIONS GH_FAIL_COUNT_FILE GH_FAIL_MATCH GH_PR_LIST GH_CREATE_LOST GH_CREATE_OUTPUT GH_LABEL_STATE_FILE
  unset GIT_COMMIT_FAIL GIT_COMMIT_STATUS GIT_SIGNAL GIT_LOCAL_HEAD GIT_REMOTE_HEAD RM_FAIL_MATCH RM_FAIL_STATUS
  : >"$GH_LOG"; : >"$GIT_LOG"; : >"$COMMENT_LOG"
  export GH_PR_STATE_FILE="$TMP/pr-state.json"
  rm -f "$GH_PR_STATE_FILE"
  : >"$RM_LOG"
  export GH_CREATE_PR_JSON='[{"number":77,"url":"https://github.com/acme/docs/pull/77"}]'
  export GH_LABELS_JSON='{"labels":[{"name":"guide:draft"},{"name":"guide:blocked"},{"name":"guide:in-progress"}]}'
  export GIT_HAS_DIFF=1 RESUME=false RESUME_BRANCH='' RESUME_PR_NUMBER=''
}

make_report() {
  local file=$1 outcome=$2 artifacts=$3
  jq -n --arg outcome "$outcome" --argjson artifacts "$artifacts" '{schema_version:1,outcome:$outcome,provider:"Provider $(touch /tmp/provider-pwn)",slug:"safe-slug",persona:"Backend engineer",summary:"Summary `touch /tmp/nope` $(echo no)",open_questions:["Question; rm -rf /","Second question"],blockers:(if $outcome == "converged" then [] else ["Blocker && false"] end),nits:["Nit | cat"],review_rounds:2,artifacts:$artifacts}' >"$file"
  cp "$file" "$RUNNER_TEMP/export/run-report.json"
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
  export GH_LABELS_JSON='{"labels":[]}' GH_FAIL_MATCH='--remove-label guide:in-progress'
  bash "$SCRIPT" cleanup
  assert_not_contains "--remove-label guide:in-progress" "$(cat "$GH_LOG")"

  reset_logs
  export GH_FAIL_MATCH='--remove-label guide:draft'
  if bash "$SCRIPT" transition >/dev/null 2>&1; then fail "transition swallowed a persistent label-removal failure"; fi

  reset_logs
  export GH_FAIL_MATCH='--remove-label guide:in-progress'
  if bash "$SCRIPT" cleanup >/dev/null 2>&1; then fail "cleanup swallowed a known-present label-removal failure"; fi
}

test_refuse_cleans_temp_body_on_failure() {
  reset_logs
  refuse_tmp="$TMP/refuse-tmp"
  mkdir -p "$refuse_tmp"
  export TMPDIR="$refuse_tmp" GH_FAIL_MATCH='issue comment'
  if bash "$SCRIPT" refuse "https://github.com/acme/docs/pull/12"; then fail "refuse comment failure succeeded"; fi
  [[ -z "$(find "$refuse_tmp" -type f -print -quit)" ]] || fail "refuse leaked its temporary body"
  unset TMPDIR
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
  assert_contains "commit -m guide: Provider \$(touch /tmp/provider-pwn)" "$git_log"
  assert_contains "push --set-upstream origin guide/issue-42-safe-slug" "$git_log"
  assert_contains "pr create --repo acme/docs --base main --head guide/issue-42-safe-slug" "$gh_log"
  assert_contains "pr ready 77 --repo acme/docs" "$gh_log"
  assert_contains "Provider \$(touch /tmp/provider-pwn)" "$comments"
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

test_awaiting_scope_never_publishes() {
  reset_logs
  export RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER=55
  report="$TMP/scope.json"
  make_report "$report" awaiting_scope '["research.md","meta.yaml"]'
  bash "$SCRIPT" publish "$report"
  assert_not_contains "checkout" "$(cat "$GIT_LOG")"
  [[ ! -s "$GIT_LOG" ]] || fail "historical scope report invoked git"
  assert_not_contains "pr " "$(cat "$GH_LOG")"
  assert_contains "Reply with the numbered decisions" "$(cat "$COMMENT_LOG")"
  assert_contains "--add-label guide:blocked" "$(cat "$GH_LOG")"
  assert_contains "## Scope check" "$(cat "$COMMENT_LOG")"
  assert_contains "1. Question; rm -rf /" "$(cat "$COMMENT_LOG")"
  assert_contains "resumed" "$(cat "$COMMENT_LOG")"
}

test_blocked_artifacts_never_publish() {
  reset_logs
  report="$TMP/blocked.json"
  make_report "$report" blocked '["research.md","meta.yaml"]'
  bash "$SCRIPT" publish "$report"
  [[ ! -s "$GIT_LOG" ]] || fail "blocked report invoked git"
  assert_not_contains "pr " "$(cat "$GH_LOG")"
  assert_contains "Blockers" "$(cat "$COMMENT_LOG")"
  assert_not_contains "Open questions" "$(cat "$COMMENT_LOG")"
  assert_contains "Nits" "$(cat "$COMMENT_LOG")"
  assert_contains "Blocker && false" "$(cat "$COMMENT_LOG")"
}

test_failed_and_hard_failure_never_commit() {
  reset_logs
  report="$TMP/failed.json"
  make_report "$report" failed '[]'
  bash "$SCRIPT" publish "$report"
  [[ ! -s "$GIT_LOG" ]] || fail "failed report invoked git"
  assert_contains "https://github.com/acme/docs/actions/runs/9001" "$(cat "$COMMENT_LOG")"
  assert_contains "The automation did not complete" "$(cat "$COMMENT_LOG")"
  assert_contains "diagnostic artifact" "$(cat "$COMMENT_LOG")"
  assert_not_contains "Resolve the findings" "$(cat "$COMMENT_LOG")"
  assert_contains "Summary" "$(cat "$COMMENT_LOG")"
  assert_not_contains "Question; rm -rf /" "$(cat "$COMMENT_LOG")"
  assert_not_contains "Open questions" "$(cat "$COMMENT_LOG")"
  assert_contains "--add-label guide:blocked" "$(cat "$GH_LOG")"
  assert_contains "--remove-label guide:in-progress" "$(cat "$GH_LOG")"

  reset_logs
  printf '%s\n' "runner exploded \`uname\`" >"$TMP/reason.txt"
  export GH_LABEL_STATE_FILE="$TMP/failure-labels"
  printf '%s\n' guide:draft guide:in-progress >"$GH_LABEL_STATE_FILE"
  bash "$SCRIPT" fail "$TMP/reason.txt"
  [[ ! -s "$GIT_LOG" ]] || fail "hard failure invoked git"
  assert_contains "runner exploded \`uname\`" "$(cat "$COMMENT_LOG")"
  assert_contains "https://github.com/acme/docs/actions/runs/9001" "$(cat "$COMMENT_LOG")"
  assert_contains "Re-add" "$(cat "$COMMENT_LOG")"
  draft_line="$(grep -nF -- '--remove-label guide:draft' "$GH_LOG" | head -1 | cut -d: -f1)"
  progress_line="$(grep -nF -- '--remove-label guide:in-progress' "$GH_LOG" | head -1 | cut -d: -f1)"
  blocked_line="$(grep -nF -- '--add-label guide:blocked' "$GH_LOG" | head -1 | cut -d: -f1)"
  [[ -n "$draft_line" && "$draft_line" -lt "$progress_line" && "$progress_line" -lt "$blocked_line" ]] \
    || fail 'failure labels must finish without draft/in-progress and with blocked'
  assert_eq guide:blocked "$(cat "$GH_LABEL_STATE_FILE")"
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

test_resumed_merge_is_pushed_without_guide_changes() {
  reset_logs
  export GIT_HAS_DIFF=0 RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER=55
  export GIT_REMOTE_HEAD=before-merge GIT_LOCAL_HEAD=after-merge
  report="$TMP/resumed-merge.json"
  make_report "$report" converged '["research.md","meta.yaml","external.md","speakeasy.md"]'
  bash "$SCRIPT" publish "$report"
  assert_count 0 "commit -m" "$GIT_LOG"
  assert_contains "push --set-upstream origin guide/issue-42-safe-slug" "$(cat "$GIT_LOG")"
}

test_pr_numbers_and_create_recovery_are_safe() {
  report="$TMP/pr-safety.json"
  make_report "$report" converged '["research.md","meta.yaml","external.md","speakeasy.md"]'

  for bad in '--help' '0' '77 extra'; do
    reset_logs
    export GIT_HAS_DIFF=0 RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER="$bad"
    if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail "accepted malformed resume PR number: $bad"; fi
    assert_not_contains "pr edit" "$(cat "$GH_LOG")"
  done

  reset_logs
  export GIT_HAS_DIFF=0 RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug
  export GH_PR_LIST='[{"number":"--help\n77","url":"https://github.com/acme/docs/pull/77"}]'
  if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail "accepted malformed discovered PR number"; fi
  assert_not_contains "pr edit --help" "$(cat "$GH_LOG")"

  reset_logs
  export GIT_HAS_DIFF=0 RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug
  export GH_CREATE_OUTPUT='warning\n--help\nhttps://evil.invalid/pull/999\n'
  bash "$SCRIPT" publish "$report"
  assert_contains "pr ready 77 --repo acme/docs" "$(cat "$GH_LOG")"
  assert_not_contains "pr ready --help" "$(cat "$GH_LOG")"

  reset_logs
  export GIT_HAS_DIFF=0 RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug GH_CREATE_LOST=1
  export GH_CREATE_PR_JSON='[{"number":88,"url":"https://github.com/acme/docs/pull/88"}]'
  bash "$SCRIPT" publish "$report"
  assert_count 1 "pr create" "$GH_LOG"
  assert_contains "pr ready 88 --repo acme/docs" "$(cat "$GH_LOG")"
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

test_cleanup_preserves_failure_and_signal_status() {
  report="$TMP/cleanup-status.json"
  make_report "$report" converged '["research.md","meta.yaml","external.md","speakeasy.md"]'

  reset_logs
  export GIT_COMMIT_FAIL=1 GIT_COMMIT_STATUS=73 GH_FAIL_MATCH='issue view' RM_FAIL_MATCH=tmp. RM_FAIL_STATUS=91
  set +e
  bash "$SCRIPT" publish "$report" >/dev/null 2>&1
  status=$?
  set -e
  assert_eq 73 "$status"
  assert_contains "issue view" "$(cat "$GH_LOG")"
  [[ -s "$RM_LOG" ]] || fail "cleanup did not attempt temporary-file removal"

  for signal_status in 'INT 130' 'TERM 143'; do
    signal=${signal_status% *}
    expected=${signal_status#* }
    reset_logs
    export GIT_SIGNAL="$signal" GH_FAIL_MATCH='issue view' RM_FAIL_MATCH=tmp. RM_FAIL_STATUS=91
    set +e
    bash "$SCRIPT" publish "$report" >/dev/null 2>&1
    status=$?
    set -e
    assert_eq "$expected" "$status"
    assert_contains "issue view" "$(cat "$GH_LOG")"
    [[ -s "$RM_LOG" ]] || fail "$signal cleanup did not attempt temporary-file removal"
  done

  reset_logs
  reason="$TMP/cleanup-reason.txt"
  printf 'reason\n' >"$reason"
  export GH_FAIL_MATCH='issue view'
  set +e
  bash "$SCRIPT" fail "$reason" >/dev/null 2>&1
  status=$?
  set -e
  assert_eq 1 "$status"
}

test_comments_and_title_are_bounded() {
  reset_logs
  report="$TMP/bounded.json"
  long=$(printf '%1200s' '' | tr ' ' x)
  jq -n --arg long "$long" '{schema_version:1,outcome:"converged",provider:$long,slug:"safe-slug",persona:$long,summary:$long,open_questions:[range(0;25)|($long + tostring)],blockers:[],nits:[range(0;25)|($long + tostring)],review_rounds:3,artifacts:["research.md","meta.yaml","external.md","speakeasy.md"]}' >"$report"
  cp "$report" "$RUNNER_TEMP/export/run-report.json"
  bash "$SCRIPT" publish "$report"
  title=$(grep 'pr create' "$GH_LOG")
  (( ${#title} < 600 )) || fail "PR command/title was not bounded"
  (( $(wc -c <"$COMMENT_LOG") < 65000 )) || fail "comment was not bounded"
  assert_not_contains "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" "$(cat "$COMMENT_LOG")"


  reset_logs
  jq -n '{schema_version:1,outcome:"blocked",provider:"Provider",slug:"safe-slug",persona:"Persona",summary:"Summary",open_questions:[range(0;25)|"question-\(.)"],blockers:[],nits:[],review_rounds:3,artifacts:["research.md","meta.yaml"]}' >"$report"
  jq '.outcome = "awaiting_scope"' "$report" >"$report.next" && mv "$report.next" "$report"
  bash "$SCRIPT" publish "$report"
  assert_contains "question-19" "$(cat "$COMMENT_LOG")"
  assert_not_contains "question-20" "$(cat "$COMMENT_LOG")"
}

test_notify_only_and_trusted_logs() {
  local report="$TMP/notify.json"
  reset_logs
  make_report "$report" awaiting_scope '[]'
  export GITHUB_RUN_ATTEMPT=2 READABLE_LOG_STATUS=partial
  export READABLE_ARTIFACT_URL=https://github.com/acme/docs/actions/runs/9001/artifacts/123
  bash "$SCRIPT" notify "$report"
  assert_eq '' "$(cat "$GIT_LOG")"
  assert_not_contains 'pr ' "$(cat "$GH_LOG")"
  assert_contains '1. Question; rm -rf /' "$(cat "$COMMENT_LOG")"
  # shellcheck disable=SC2016
  assert_contains 're-add `guide:draft`' "$(cat "$COMMENT_LOG")"
  assert_contains '<!-- guide-factory-status:9001:2 -->' "$(cat "$COMMENT_LOG")"
  assert_contains "$READABLE_ARTIFACT_URL" "$(cat "$COMMENT_LOG")"
  assert_contains 'partial' "$(cat "$COMMENT_LOG")"
  assert_contains 'seven days' "$(cat "$COMMENT_LOG")"
  assert_contains 'GitHub artifact access' "$(cat "$COMMENT_LOG")"
  export GH_COMMENTS_JSON='[{"id":99,"user":{"type":"User","login":"factory-agent"},"body":"<!-- guide-factory-status:9001:2 -->"},{"id":98,"user":{"type":"User","login":"factory-agent"},"body":"<!-- guide-factory-status:9001:1 -->"}]'
  : >"$GH_LOG"
  bash "$SCRIPT" notify "$report"
  assert_contains 'issues/comments/99' "$(cat "$GH_LOG")"
  assert_not_contains 'issues/comments/98' "$(cat "$GH_LOG")"
  assert_not_contains 'issue comment 42' "$(cat "$GH_LOG")"
  unset GH_COMMENTS_JSON
  for url in '' https://github.com/acme/docs/actions/runs/9001/artifacts/raw/123 https://github.com/acme/other/actions/runs/9001/artifacts/123 https://github.com/acme/docs/actions/runs/9002/artifacts/123; do
    : >"$COMMENT_LOG"
    READABLE_ARTIFACT_URL="$url" bash "$SCRIPT" notify "$report"
    assert_contains '**Readable chatlog:** unavailable' "$(cat "$COMMENT_LOG")"
  done
  for outcome in converged blocked failed; do
    reset_logs
    if [[ $outcome == converged ]]; then
      make_report "$report" "$outcome" '["research.md","meta.yaml","external.md","speakeasy.md"]'
    else make_report "$report" "$outcome" '[]'; fi
    READABLE_ARTIFACT_URL=https://evil.invalid/raw bash "$SCRIPT" notify "$report"
    assert_contains "**Outcome:** $outcome" "$(cat "$COMMENT_LOG")"
    assert_contains 'unavailable' "$(cat "$COMMENT_LOG")"
    assert_contains 'https://github.com/acme/docs/actions/runs/9001' "$(cat "$COMMENT_LOG")"
    assert_not_contains 'evil.invalid' "$(cat "$COMMENT_LOG")"
    assert_not_contains 'Ready for review.' "$(cat "$COMMENT_LOG")"
    assert_not_contains 'pr ' "$(cat "$GH_LOG")"
    assert_eq '' "$(cat "$GIT_LOG")"
  done
  reset_logs
  printf '{}' >"$report"
  if bash "$SCRIPT" notify "$report" >/dev/null 2>&1; then fail 'invalid notification report accepted'; fi
  assert_eq '' "$(cat "$COMMENT_LOG")"
  unset READABLE_LOG_STATUS READABLE_ARTIFACT_URL GITHUB_RUN_ATTEMPT
}

test_publication_gate_and_receipt() {
  local report="$TMP/receipt-report.json" key
  for key in READABLE_UPLOAD_OUTCOME READABLE_ARTIFACT_URL; do
    reset_logs
    make_report "$report" converged '["research.md","meta.yaml","external.md","speakeasy.md"]'
    if env "$key=" bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail "missing $key allowed publication"; fi
    assert_eq '' "$(cat "$GIT_LOG")"
    assert_not_contains 'pr create' "$(cat "$GH_LOG")"
  done
  reset_logs
  jq '.publication_ready=false' "$RUNNER_TEMP/export/finalization.json" >"$TMP/state"
  mv "$TMP/state" "$RUNNER_TEMP/export/finalization.json"
  if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail 'host unready allowed publication'; fi
  assert_eq '' "$(cat "$GIT_LOG")"

  for mode in created updated; do
    reset_logs
    if [[ $mode == updated ]]; then
      export RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER=55
    fi
    export GH_FAIL_MATCH='issue comment'
    if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail 'comment failure returned success'; fi
    jq -e --arg mode "$mode" '.publication==$mode and .notification=="failed" and .run_id=="9001" and .run_attempt==1 and (.pr_number|type)=="number"' "$FACTORY_PUBLICATION_RECEIPT" >/dev/null
    assert_contains 'https://github.com/acme/docs/pull/' "$(cat "$FACTORY_PUBLICATION_RECEIPT")"
    : >"$GH_LOG"; : >"$GIT_LOG"
    unset GH_FAIL_MATCH
    bash "$SCRIPT" notify-publication "$report" "$FACTORY_PUBLICATION_RECEIPT"
    jq -e '.notification=="sent"' "$FACTORY_PUBLICATION_RECEIPT" >/dev/null
    assert_not_contains 'pr ' "$(cat "$GH_LOG")"
    assert_eq '' "$(cat "$GIT_LOG")"
    if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail 'receipt allowed repeat publication'; fi
    assert_eq '' "$(cat "$GIT_LOG")"
    if GITHUB_RUN_ATTEMPT=2 bash "$SCRIPT" notify-publication "$report" "$FACTORY_PUBLICATION_RECEIPT" >/dev/null 2>&1; then fail 'stale receipt accepted'; fi
  done
}

test_receipt_and_reconciliation_boundaries() {
  local report="$TMP/reconcile-report.json" kind
  reset_logs
  make_report "$report" converged '["research.md","meta.yaml","external.md","speakeasy.md"]'
  for kind in stale symlink missing failure; do
    reset_logs
    case $kind in
      stale) jq '.summary="Stale"' "$report" >"$RUNNER_TEMP/export/run-report.json" ;;
      symlink) rm "$RUNNER_TEMP/export/session-transcript.json"; ln -s "$report" "$RUNNER_TEMP/export/session-transcript.json" ;;
      missing) rm "$RUNNER_TEMP/export/session-transcript.json" ;;
      failure) export READABLE_UPLOAD_OUTCOME=failure ;;
    esac
    if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail "accepted $kind gate"; fi
    assert_eq '' "$(cat "$GIT_LOG")"
    rm -f "$RUNNER_TEMP/export/session-transcript.json"
    cp "$report" "$RUNNER_TEMP/export/run-report.json"
  done
  for kind in head author; do
    reset_logs
    export RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER=55
    if [[ $kind == head ]]; then export GH_PR_HEAD=user-branch; else export GH_PR_AUTHOR=unrelated-user; fi
    if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail "adopted wrong $kind PR"; fi
    assert_not_contains 'pr edit' "$(cat "$GH_LOG")"
    assert_not_contains 'pr create' "$(cat "$GH_LOG")"
  done
  reset_logs
  export RESUME=true RESUME_BRANCH=guide/issue-42-safe-slug RESUME_PR_NUMBER=55 GH_FAIL_MATCH='pr edit'
  if bash "$SCRIPT" publish "$report" >"$TMP/ambiguous" 2>&1; then fail 'uncertain edit succeeded'; fi
  assert_count 1 'pr edit' "$GH_LOG"
  assert_count 2 'pr list' "$GH_LOG"
  assert_contains 'https://github.com/acme/docs/pull/55' "$(cat "$TMP/ambiguous")"
  : >"$GIT_LOG"; : >"$GH_LOG"
  if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail 'uncertain edit retried'; fi
  assert_eq '' "$(cat "$GIT_LOG")"
  assert_not_contains 'pr edit' "$(cat "$GH_LOG")"

  reset_logs
  export GH_RECEIPT_WRITE_FAIL=1
  printf unchanged >"$RUNNER_TEMP/receipt-sentinel"
  if bash "$SCRIPT" publish "$report" >"$TMP/write-failure" 2>&1; then fail 'receipt write failure succeeded'; fi
  assert_contains 'PR published at https://github.com/acme/docs/pull/77' "$(cat "$TMP/write-failure")"
  assert_eq unchanged "$(cat "$RUNNER_TEMP/receipt-sentinel")"
  assert_count 1 'pr create' "$GH_LOG"
  assert_not_contains 'issue comment' "$(cat "$GH_LOG")"
  assert_not_contains 'issue edit' "$(cat "$GH_LOG")"
  : >"$GH_LOG"; : >"$GIT_LOG"
  if bash "$SCRIPT" publish "$report" >/dev/null 2>&1; then fail 'receipt write failure allowed duplicate'; fi
  assert_eq '' "$(cat "$GIT_LOG")"
  assert_not_contains 'pr create' "$(cat "$GH_LOG")"
  printf 'Fixture failure' >"$TMP/reason"
  bash "$SCRIPT" fail "$TMP/reason"
  assert_contains 'A PR may already exist' "$(cat "$COMMENT_LOG")"
}

test_receipt_and_reconciliation_boundaries
test_publication_gate_and_receipt
test_notify_only_and_trusted_logs
test_labels_and_transitions
test_refuse_cleans_temp_body_on_failure
test_converged_new_publication
test_awaiting_scope_never_publishes
test_blocked_artifacts_never_publish
test_failed_and_hard_failure_never_commit
test_no_change_orphan_creates_pr_and_converges_resume
test_resumed_merge_is_pushed_without_guide_changes
test_pr_numbers_and_create_recovery_are_safe
test_github_retries_but_commit_does_not
test_cleanup_preserves_failure_and_signal_status
test_comments_and_title_are_bounded
printf 'PASS: deterministic publication and comments\n'
