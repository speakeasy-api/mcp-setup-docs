#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/scripts/lib.sh"

TEMP_FILES=()
cleanup_on_exit() {
  local original_status=$? temp_status=0 cleanup_status=0
  trap - EXIT HUP INT TERM
  set +e
  if ((${#TEMP_FILES[@]} != 0)); then
    rm -f "${TEMP_FILES[@]}" || temp_status=$?
  fi
  if [[ ${CLEANUP_LABELS:-true} == true ]]; then (cleanup) || cleanup_status=$?; fi
  ((original_status != 0)) && exit "$original_status"
  ((temp_status != 0)) && exit "$temp_status"
  exit "$cleanup_status"
}

register_temp() {
  TEMP_FILES[${#TEMP_FILES[@]}]=$1
  trap cleanup_on_exit EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
}

require_common() {
  require_env GH_REPO
  require_env ISSUE_NUMBER
  [[ "$ISSUE_NUMBER" =~ ^[1-9][0-9]*$ ]] || die "invalid issue number: $ISSUE_NUMBER"
}

issue_labels() {
  local response
  response="$(retry_gh issue view "$ISSUE_NUMBER" --repo "$GH_REPO" --json labels)" || {
    printf 'factory: failed to inspect issue labels\n' >&2
    return 1
  }
  jq -e 'type == "object" and (.labels | type == "array") and
    all(.labels[]; type == "object" and (.name | type == "string"))' <<<"$response" >/dev/null || {
    printf 'factory: malformed issue label response\n' >&2
    return 1
  }
  jq -r '.labels[].name' <<<"$response"
}

remove_label() {
  local label=$1 labels
  labels="$(issue_labels)" || return $?
  grep -Fqx "$label" <<<"$labels" || return 0
  retry_gh issue edit "$ISSUE_NUMBER" --repo "$GH_REPO" --remove-label "$label" >/dev/null || {
    printf 'factory: failed to remove label: %s\n' "$label" >&2
    return 1
  }
}

add_label() {
  retry_gh issue edit "$ISSUE_NUMBER" --repo "$GH_REPO" --add-label "$1" >/dev/null
}

post_comment() {
  retry_gh issue comment "$ISSUE_NUMBER" --repo "$GH_REPO" --body-file "$1" >/dev/null
}

ensure_labels() {
  local existing name color description
  existing="$(retry_gh label list --repo "$GH_REPO" --limit 100 --json name --jq '.[].name')" \
    || die "failed to list labels"
  while IFS='|' read -r name color description; do
    grep -Fqx "$name" <<<"$existing" && continue
    retry_gh label create "$name" --color "$color" --description "$description" --repo "$GH_REPO" >/dev/null \
      || die "failed to create label: $name"
  done <<'LABELS'
guide:draft|1D76DB|Trigger guide draft factory
guide:in-progress|FBCA04|Guide draft factory running
guide:blocked|D73A4A|Guide draft factory blocked
guide:stale|C5DEF5|Guide lockfile drifted; refresh queued
LABELS
}

transition() {
  remove_label guide:draft
  remove_label guide:blocked
  add_label guide:in-progress
}

cleanup() {
  remove_label guide:in-progress
}

refuse() {
  local url=${1:-${REFUSED_PR_URL:-}} body
  [[ -n "$url" ]] || die "refuse requires a conflicting pull request URL"
  body="$(mktemp)"
  register_temp "$body"
  remove_label guide:draft
  add_label guide:blocked
  printf '%s\n' \
    "Refused to run: the conflicting pull request $url already targets this issue and is not a factory branch (\`guide/issue-$ISSUE_NUMBER-*\`)." \
    '' "Close or finish that pull request, then re-add \`guide:draft\`." >"$body"
  post_comment "$body"
}

# Only host environment values can supply artifact links. Never read report URLs.
readable_context() {
  READABLE_URL=''
  READABLE_STATUS=unavailable
  if [[ ${GITHUB_RUN_ID:-} =~ ^[1-9][0-9]*$ &&
        ${READABLE_LOG_STATUS:-} =~ ^(complete|partial)$ &&
        ${READABLE_ARTIFACT_URL:-} == "https://github.com/$GH_REPO/actions/runs/$GITHUB_RUN_ID/artifacts/"* ]]; then
    local artifact_id=${READABLE_ARTIFACT_URL#"https://github.com/$GH_REPO/actions/runs/$GITHUB_RUN_ID/artifacts/"}
    if [[ $artifact_id =~ ^[1-9][0-9]*$ ]]; then
      READABLE_URL=$READABLE_ARTIFACT_URL
      READABLE_STATUS=$READABLE_LOG_STATUS
    fi
  fi
}

notify_report() {
  local report=$1 body comments comment_id payload viewer
  local pr_url=${2:-}
  # This command never invokes git or a PR mutation, including on converged reports.
  bash "$ROOT/factory/scripts/validate-report.sh" "$report" || die 'invalid notification report'
  [[ ${GITHUB_RUN_ID:-} =~ ^[1-9][0-9]*$ && ${GITHUB_RUN_ATTEMPT:-} =~ ^[1-9][0-9]*$ ]] \
    || die 'notify requires a valid run and attempt'
  body=$(mktemp)
  register_temp "$body"
  render_report_comment "$report" "$pr_url" "${RESUME:-false}" "$body"
  viewer=$(retry_gh api graphql -f query='{ viewer { login } }' --jq '.data.viewer.login') \
    || die 'could not identify comment author'
  [[ $viewer =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*(\[bot\])?$ ]] || die 'invalid comment author'
  comments=$(retry_gh api "repos/$GH_REPO/issues/$ISSUE_NUMBER/comments" --paginate --slurp) \
    || die 'could not inspect outcome comments'
  comment_id=$(jq -er --arg viewer "$viewer" --arg marker "<!-- guide-factory-status:$GITHUB_RUN_ID:$GITHUB_RUN_ATTEMPT -->" '
    if type != "array" or any(.[]; type != "array") then error("invalid comment pages") else add // [] end |
    [.[] | select(.user.login == $viewer and (.body | type == "string") and
      (.body | split("\n") | index($marker) != null))] |
    if length == 0 then "" elif length == 1 and
      (.[0].id | type == "number" and floor == . and . > 0) then .[0].id | tostring
    else error("ambiguous outcome comment") end' <<<"$comments") || die 'invalid outcome comments'
  if [[ -n $comment_id ]]; then
    payload=$(mktemp)
    register_temp "$payload"
    jq -n --rawfile body "$body" '{body:$body}' >"$payload"
    # Do not blindly retry a comment mutation after an ambiguous transport error.
    gh api --method PATCH "repos/$GH_REPO/issues/comments/$comment_id" --input "$payload" >/dev/null
  else
    gh issue comment "$ISSUE_NUMBER" --repo "$GH_REPO" --body-file "$body" >/dev/null
  fi
}

publication_state() {
  python3 "$ROOT/factory/scripts/publication-state.py" "$@"
}

notify_publication() {
  local report=$1 receipt=$2 pr_url status=0
  pr_url=$(publication_state read "$receipt") || return 1
  # Isolate die/exit in comment rendering so every notification failure is recorded.
  (CLEANUP_LABELS=false; notify_report "$report" "$pr_url") || status=$?
  if ((status == 0)); then
    publication_state notification "$receipt" sent || return 1
  else
    publication_state notification "$receipt" failed || true
    printf 'factory: PR published at %s; notification failed; repair comments only\n' "$pr_url" >&2
  fi
  return "$status"
}

render_report_comment() {
  local report=$1 pr_url=$2 resumed=$3 output=$4
  local run_url="" marker="<!-- guide-factory-status -->"
  readable_context
  if [[ ${GITHUB_RUN_ID:-} =~ ^[1-9][0-9]*$ && ${GITHUB_RUN_ATTEMPT:-} =~ ^[1-9][0-9]*$ ]]; then
    marker="<!-- guide-factory-status:$GITHUB_RUN_ID:$GITHUB_RUN_ATTEMPT -->"
  fi
  if [[ -n ${GITHUB_RUN_ID:-} ]]; then
    run_url="${GITHUB_SERVER_URL:-https://github.com}/$GH_REPO/actions/runs/$GITHUB_RUN_ID"
  fi
  jq -r --arg pr_url "$pr_url" --arg resumed "$resumed" --arg run_url "$run_url" --arg marker "$marker" \
    --arg readable_url "$READABLE_URL" --arg readable_status "$READABLE_STATUS" '
    def bound: tostring[0:1000];
    def items($heading; $numbered):
      .[0:20] as $values | if ($values | length) == 0 then [] else
        [$heading, ""] + [range(0; $values|length) as $i |
          (if $numbered then ((($i + 1)|tostring) + ". " + ($values[$i]|bound))
           else ("- " + ($values[$i]|bound)) end)] + [""] end;
    ([(if .outcome == "awaiting_scope" then "## Scope check"
       elif .outcome == "failed" then "## Guide factory failed"
       else "## Pipeline review" end), "", $marker, "",
      "- **Outcome:** " + (.outcome|bound),
      "- **Provider:** " + ((.provider // "unresolved")|bound),
      "- **Slug:** " + ((.slug // "unresolved")|bound),
      "- **Persona:** " + ((.persona // "unresolved")|bound),
      "- **Run context:** " + (if $resumed == "true" then "resumed existing factory branch" else "new factory branch" end),
      (if $pr_url == "" then empty else "- **Pull request:** " + $pr_url end),
      (if $run_url == "" then empty else "- **Workflow run:** " + $run_url end),
      "- **Readable chatlog:** " + (if $readable_url == "" then "unavailable; see the workflow run instead."
        else $readable_url + " (" + $readable_status + "; expires after seven days; GitHub artifact access required)." end),
      "", "### Summary", "", (.summary|bound), ""]
     + (if .outcome == "awaiting_scope" then (.open_questions|items("### Material decisions"; true)) else [] end)
     + (.blockers|items("### Blockers"; false))
     + (.nits|items("### Nits"; false))
     + [if .outcome == "converged" then (if $pr_url != "" then "Ready for review."
          else "Research converged; guide publication is withheld until all validation and readable export/upload gates pass." end)
        elif .outcome == "awaiting_scope" then "Reply with the numbered decisions, then re-add `guide:draft`."
        elif .outcome == "failed" then "The automation did not complete; this is not a completed review requesting guide changes. Check the workflow logs and diagnostic artifact (if available) for the failure, then re-add `guide:draft` once it is resolved."
        else "Resolve the findings, then re-add `guide:draft`." end])
    | join("\n")
  ' "$report" >"$output"
}

validate_pr_number() {
  [[ "$1" =~ ^[1-9][0-9]*$ ]] || die "invalid pull request number"
}

FOUND_PR_NUMBER=''
FOUND_PR_URL=''
find_pr_for_head() {
  local branch=$1 response count viewer
  FOUND_PR_NUMBER=''
  FOUND_PR_URL=''
  viewer=$(retry_gh api graphql -f query='{ viewer { login } }' --jq '.data.viewer.login') || die 'could not inspect publication author'
  response="$(retry_gh pr list --repo "$GH_REPO" --state open --head "$branch" --json number,url,headRefName,headRepository,baseRefName,isCrossRepository,author,title,body)" \
    || die "failed to inspect pull requests for branch"
  jq -e --arg repo "$GH_REPO" --arg branch "$branch" --arg viewer "$viewer" '
    type == "array" and length <= 1 and all(.[];
      type == "object" and .headRefName == $branch and .headRepository.nameWithOwner == $repo and
      .baseRefName == "main" and .isCrossRepository == false and .author.login == $viewer and
      (.number | type) == "number" and (.number | floor) == .number and .number >= 1 and
      (.url | type) == "string" and
      .url == ("https://github.com/" + $repo + "/pull/" + (.number | tostring)))
  ' <<<"$response" >/dev/null || die "malformed pull request response"
  count="$(jq 'length' <<<"$response")"
  ((count == 1)) || return 1
  FOUND_PR_NUMBER="$(jq -r '.[0].number' <<<"$response")"
  FOUND_PR_URL="$(jq -r '.[0].url' <<<"$response")"
  validate_pr_number "$FOUND_PR_NUMBER"
}

publish_report() {
  local report=$1 outcome provider slug artifacts resumed branch title pr_body comment pr_number pr_url changed
  local local_head remote_head push_needed=false publication response mutation_status=0 staged
  [[ -f "$report" && ! -L "$report" ]] || die "publish requires a regular report file"
  outcome="$(jq -r '.outcome' "$report")"
  provider="$(jq -r '.provider // empty' "$report")"
  slug="$(jq -r '.slug // empty' "$report")"
  artifacts="$(jq -r '.artifacts | length' "$report")"
  resumed=${RESUME:-false}
  pr_body="$(mktemp)"
  comment="$(mktemp)"
  register_temp "$pr_body"
  register_temp "$comment"

  if [[ "$outcome" != converged || -z "$slug" || "$artifacts" -eq 0 ]]; then
    render_report_comment "$report" '' "$resumed" "$comment"
    add_label guide:blocked
    post_comment "$comment"
    return 0
  fi

  bash "$ROOT/factory/scripts/validate-report.sh" "$report" || die 'invalid publication report'
  publication_state gate "$report" || die 'publication gates failed'
  publication_state candidate "$report" "$PWD/guides/$slug" || die 'installed candidate differs from host validation'
  staged=$(git diff --cached --name-only) || die 'could not inspect staging area'
  [[ -z $staged ]] || die 'publication requires an initially clean staging area'
  if [[ "$resumed" == true ]]; then
    branch=${RESUME_BRANCH:-}
    [[ -n "$branch" ]] || branch="$(git branch --show-current)"
  else
    branch="guide/issue-$ISSUE_NUMBER-$slug"
    git checkout -b "$branch"
  fi

  [[ $branch == "guide/issue-$ISSUE_NUMBER-$slug" ]] || die 'unexpected factory branch'
  git add -- "guides/$slug/research.md" "guides/$slug/meta.yaml" "guides/$slug/external.md" "guides/$slug/speakeasy.md"
  changed=true
  if git diff --cached --quiet -- "guides/$slug"; then changed=false; fi
  if [[ "$changed" == true ]]; then
    git commit -m "guide: $provider"
  fi

  if [[ "$resumed" == true ]]; then
    remote_head="$(git rev-parse --verify "refs/remotes/origin/$branch^{commit}")" \
      || die "could not resolve remote resume branch: $branch"
    local_head="$(git rev-parse --verify HEAD)" || die "could not resolve local resume HEAD"
    [[ "$local_head" == "$remote_head" ]] || push_needed=true
  elif [[ "$changed" == true ]]; then
    push_needed=true
  fi
  if [[ "$push_needed" == true ]]; then
    git push --set-upstream origin "$branch"
  fi

  title="$(jq -r '(.provider // "guide")[0:249] | "guide: " + .' "$report")"
  printf 'Closes #%s\n' "$ISSUE_NUMBER" >"$pr_body"
  pr_number=${RESUME_PR_NUMBER:-}
  [[ -z $pr_number ]] || validate_pr_number "$pr_number"
  if find_pr_for_head "$branch"; then
    [[ -z $pr_number || $pr_number == "$FOUND_PR_NUMBER" ]] || die 'resume PR does not match trusted branch lookup'
    pr_number=$FOUND_PR_NUMBER
    pr_url=$FOUND_PR_URL
    publication=updated
    publication_state begin || die 'could not reserve publication'
    CLEANUP_LABELS=false
    gh pr edit "$pr_number" --repo "$GH_REPO" --title "$title" --body-file "$pr_body" >/dev/null 2>&1 || mutation_status=$?
    if ((mutation_status != 0)); then
      # A failed edit may have applied. Observe only, retain the known PR, and
      # require explicit operator reconciliation rather than repeating the edit.
      find_pr_for_head "$branch" || die 'publication uncertain; reconcile existing PR read-only'
      printf 'factory: existing PR %s; edit status uncertain; explicit reconciliation required\n' "$pr_url" >&2
      return 1
    fi
  else
    [[ -z $pr_number ]] || die 'resume PR not found on exact factory branch'
    publication=created
    publication_state begin || die 'could not reserve publication'
    CLEANUP_LABELS=false
    response=$(gh pr create --repo "$GH_REPO" --base main --head "$branch" --title "$title" --body-file "$pr_body" 2>/dev/null) || mutation_status=$?
    pr_url=$response
    if ((mutation_status != 0)) || [[ $pr_url != "https://github.com/$GH_REPO/pull/"* || ! ${pr_url#"https://github.com/$GH_REPO/pull/"} =~ ^[1-9][0-9]*$ ]]; then
      find_pr_for_head "$branch" || die 'publication status uncertain; reconcile read-only before explicit retry'
      pr_url=$FOUND_PR_URL
    fi
  fi
  # Persist known publication BEFORE labels, readiness, or issue comments.
  publication_state record "$pr_url" "$publication" || {
    printf 'factory: PR published at %s; receipt persistence failed; do not republish\n' "$pr_url" >&2
    return 1
  }
  CLEANUP_LABELS=true
  notify_publication "$report" "$FACTORY_PUBLICATION_RECEIPT" || return $?
  # Non-draft creation is already ready. Existing draft promotion is separate
  # from notification repair and never performed by notify-publication.
  pr_number=${pr_url##*/}
  gh pr ready "$pr_number" --repo "$GH_REPO" >/dev/null
  remove_label guide:blocked

}

fail_run() {
  local reason_file=$1 body reason run_url status=0
  if [[ -n ${FACTORY_PUBLICATION_RECEIPT:-} && ( -e $FACTORY_PUBLICATION_RECEIPT || -L $FACTORY_PUBLICATION_RECEIPT ) ]]; then
    notify_publication "$RUNNER_TEMP/run-report.json" "$FACTORY_PUBLICATION_RECEIPT"
    return $?
  fi
  # shellcheck disable=SC2016
  local publication_uncertain=false recovery='Re-add `guide:draft` to retry after correcting the failure.'
  if [[ -n ${RUNNER_TEMP:-} && -e $RUNNER_TEMP/guide-factory-publication/publication-started.json ]]; then
    publication_uncertain=true
  fi
  [[ -f "$reason_file" && ! -L "$reason_file" ]] || die "fail requires a regular reason file"
  body="$(mktemp)"
  register_temp "$body"
  reason="$(jq -Rs -r '.[0:1000]' "$reason_file")"
  if [[ $publication_uncertain == true ]]; then
    recovery='Do not repeat publication until read-only reconciliation establishes what happened.'
    reason='A PR mutation was attempted; publication or receipt persistence could not be confirmed here. A PR may already exist. Inspect the trusted workflow diagnostics and reconcile the exact factory branch read-only before any explicit retry. Do not republish to repair notifications.'
  fi
  run_url="https://github.com/$GH_REPO/actions/runs/${GITHUB_RUN_ID:-}"
  printf '%s\n' '## Guide factory failed' '' '<!-- guide-factory-status -->' '' "$reason" '' "**Workflow run:** $run_url" '' \
    "Readable chatlog unavailable; see the workflow run." "$recovery" >"$body"
  remove_label guide:draft || status=$?
  remove_label guide:in-progress || status=$?
  add_label guide:blocked || status=$?
  post_comment "$body" || status=$?
  return "$status"
}

require_common
command=${1:-}
case "$command" in
  ensure-labels) [[ $# -eq 1 ]] || die 'usage: publish.sh ensure-labels'; ensure_labels ;;
  transition) [[ $# -eq 1 ]] || die 'usage: publish.sh transition'; transition ;;
  refuse) [[ $# -le 2 ]] || die 'usage: publish.sh refuse [pr-url]'; refuse "${2:-}" ;;
  notify-publication) [[ $# -eq 3 ]] || die 'usage: publish.sh notify-publication <report> <publication-receipt>'; notify_publication "$2" "$3" ;;
  notify) [[ $# -eq 2 ]] || die 'usage: publish.sh notify <report>'; notify_report "$2" ;;
  publish) [[ $# -eq 2 ]] || die 'usage: publish.sh publish <report>'; publish_report "$2" ;;
  fail) [[ $# -eq 2 ]] || die 'usage: publish.sh fail <reason-file>'; fail_run "$2" ;;
  cleanup) [[ $# -eq 1 ]] || die 'usage: publish.sh cleanup'; cleanup ;;
  *) die 'usage: publish.sh {ensure-labels|transition|refuse|publish <report>|notify <report>|fail <reason-file>|cleanup}' ;;
esac
