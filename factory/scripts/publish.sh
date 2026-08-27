#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/scripts/lib.sh"

TEMP_FILES=()
cleanup_on_exit() {
  ((${#TEMP_FILES[@]} == 0)) || rm -f "${TEMP_FILES[@]}"
  cleanup
}

require_common() {
  require_env GH_REPO
  require_env ISSUE_NUMBER
  [[ "$ISSUE_NUMBER" =~ ^[1-9][0-9]*$ ]] || die "invalid issue number: $ISSUE_NUMBER"
}

remove_label() {
  retry_gh issue edit "$ISSUE_NUMBER" --repo "$GH_REPO" --remove-label "$1" >/dev/null 2>&1 || true
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
  remove_label guide:draft
  add_label guide:blocked
  printf '%s\n' \
    "Refused to run: the conflicting pull request $url already targets this issue and is not a factory branch (\`guide/issue-$ISSUE_NUMBER-*\`)." \
    '' "Close or finish that pull request, then re-add \`guide:draft\`." >"$body"
  post_comment "$body"
  rm -f "$body"
}

render_report_comment() {
  local report=$1 pr_url=$2 resumed=$3 output=$4
  jq -r --arg pr_url "$pr_url" --arg resumed "$resumed" '
    def bound: tostring[0:1000];
    def items($heading; $numbered):
      .[0:20] as $values | if ($values | length) == 0 then [] else
        [$heading, ""] + [range(0; $values|length) as $i |
          (if $numbered then ((($i + 1)|tostring) + ". " + ($values[$i]|bound))
           else ("- " + ($values[$i]|bound)) end)] + [""] end;
    ([(if .outcome == "awaiting_scope" then "## Scope check"
       elif .outcome == "failed" then "## Guide factory failed"
       else "## Pipeline review" end), "",
      "- **Outcome:** " + (.outcome|bound),
      "- **Provider:** " + ((.provider // "unresolved")|bound),
      "- **Slug:** " + ((.slug // "unresolved")|bound),
      "- **Persona:** " + ((.persona // "unresolved")|bound),
      "- **Run context:** " + (if $resumed == "true" then "resumed existing factory branch" else "new factory branch" end),
      (if $pr_url == "" then empty else "- **Pull request:** " + $pr_url end),
      "", "### Summary", "", (.summary|bound), ""]
     + (if .outcome == "awaiting_scope" then (.open_questions|items("### Material decisions"; true)) else [] end)
     + (.blockers|items("### Blockers"; false))
     + (if .outcome == "awaiting_scope" then [] else (.open_questions|items("### Open questions"; false)) end)
     + (.nits|items("### Nits"; false))
     + [if .outcome == "converged" then "Ready for review."
        elif .outcome == "awaiting_scope" then "Reply with the numbered decisions, then re-add `guide:draft`."
        else "Resolve the findings, then re-add `guide:draft`." end])
    | join("\n")
  ' "$report" >"$output"
}

publish_report() {
  local report=$1 outcome provider slug artifacts resumed branch title pr_body comment pr_number pr_url changed
  [[ -f "$report" && ! -L "$report" ]] || die "publish requires a regular report file"
  outcome="$(jq -r '.outcome' "$report")"
  provider="$(jq -r '.provider // empty' "$report")"
  slug="$(jq -r '.slug // empty' "$report")"
  artifacts="$(jq -r '.artifacts | length' "$report")"
  resumed=${RESUME:-false}
  pr_body="$(mktemp)"
  comment="$(mktemp)"
  TEMP_FILES=("$pr_body" "$comment")
  trap cleanup_on_exit EXIT

  if [[ "$outcome" == failed || -z "$slug" || "$artifacts" -eq 0 ]]; then
    render_report_comment "$report" '' "$resumed" "$comment"
    add_label guide:blocked
    post_comment "$comment"
    return 0
  fi

  if [[ "$resumed" == true ]]; then
    branch=${RESUME_BRANCH:-}
    [[ -n "$branch" ]] || branch="$(git branch --show-current)"
  else
    branch="guide/issue-$ISSUE_NUMBER-$slug"
    git checkout -b "$branch"
  fi

  git add -- "guides/$slug"
  changed=true
  if git diff --cached --quiet -- "guides/$slug"; then changed=false; fi
  if [[ "$changed" == true ]]; then
    git commit -m "guide: $provider"
    git push --set-upstream origin "$branch"
  fi

  title="$(jq -r '(.provider // "guide")[0:249] | "guide: " + .' "$report")"
  printf 'Closes #%s\n' "$ISSUE_NUMBER" >"$pr_body"
  pr_number=${RESUME_PR_NUMBER:-}
  pr_url=''
  if [[ -n "$pr_number" ]]; then
    retry_gh pr edit "$pr_number" --repo "$GH_REPO" --title "$title" --body-file "$pr_body" >/dev/null
  else
    pr_number="$(retry_gh pr list --repo "$GH_REPO" --state open --head "$branch" --json number --jq '.[0].number // empty')"
    if [[ -n "$pr_number" ]]; then
      retry_gh pr edit "$pr_number" --repo "$GH_REPO" --title "$title" --body-file "$pr_body" >/dev/null
    else
      if [[ "$outcome" == converged ]]; then
        pr_url="$(retry_gh pr create --repo "$GH_REPO" --base main --head "$branch" --title "$title" --body-file "$pr_body")"
      else
        pr_url="$(retry_gh pr create --repo "$GH_REPO" --base main --head "$branch" --title "$title" --body-file "$pr_body" --draft)"
      fi
      pr_number=${pr_url##*/}
      [[ "$pr_number" =~ ^[1-9][0-9]*$ ]] || die "could not determine created pull request number"
    fi
  fi
  [[ -n "$pr_url" ]] || pr_url="https://github.com/$GH_REPO/pull/$pr_number"

  if [[ "$outcome" == converged ]]; then
    retry_gh pr ready "$pr_number" --repo "$GH_REPO" >/dev/null
    remove_label guide:blocked
  else
    retry_gh pr ready "$pr_number" --repo "$GH_REPO" --undo >/dev/null
    add_label guide:blocked
  fi
  render_report_comment "$report" "$pr_url" "$resumed" "$comment"
  post_comment "$comment"
}

fail_run() {
  local reason_file=$1 body reason run_url
  [[ -f "$reason_file" && ! -L "$reason_file" ]] || die "fail requires a regular reason file"
  body="$(mktemp)"
  TEMP_FILES=("$body")
  trap cleanup_on_exit EXIT
  reason="$(jq -Rs -r '.[0:1000]' "$reason_file")"
  run_url="https://github.com/$GH_REPO/actions/runs/${GITHUB_RUN_ID:-}"
  printf '%s\n' '## Guide factory failed' '' "$reason" '' "**Workflow run:** $run_url" '' \
    "Re-add \`guide:draft\` to retry after correcting the failure." >"$body"
  add_label guide:blocked
  post_comment "$body"
}

require_common
command=${1:-}
case "$command" in
  ensure-labels) [[ $# -eq 1 ]] || die 'usage: publish.sh ensure-labels'; ensure_labels ;;
  transition) [[ $# -eq 1 ]] || die 'usage: publish.sh transition'; transition ;;
  refuse) [[ $# -le 2 ]] || die 'usage: publish.sh refuse [pr-url]'; refuse "${2:-}" ;;
  publish) [[ $# -eq 2 ]] || die 'usage: publish.sh publish <report>'; publish_report "$2" ;;
  fail) [[ $# -eq 2 ]] || die 'usage: publish.sh fail <reason-file>'; fail_run "$2" ;;
  cleanup) [[ $# -eq 1 ]] || die 'usage: publish.sh cleanup'; cleanup ;;
  *) die 'usage: publish.sh {ensure-labels|transition|refuse|publish <report>|fail <reason-file>|cleanup}' ;;
esac
