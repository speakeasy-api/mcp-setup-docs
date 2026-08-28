#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
run_kit=${FACTORY_LOCAL_RUN_KIT:-"$ROOT/factory/scripts/run-kit.sh"}
validate=${FACTORY_LOCAL_VALIDATE:-"$ROOT/factory/scripts/validate.sh"}

usage() {
  printf 'usage: %s [--] <issue-json>\n       %s --title <title> --body <body> --slug <slug>\n' \
    "${0##*/}" "${0##*/}" >&2
  exit 2
}

title=''
body=''
slug=''
issue_json=''
title_set=false body_set=false slug_set=false end_options=false
while [[ $# -gt 0 ]]; do
  if [[ "$end_options" == true ]]; then
    [[ -z "$issue_json" ]] || usage
    issue_json=$1
    shift
    continue
  fi
  case $1 in
    --) end_options=true; shift ;;
    --title|--body|--slug)
      option=$1
      [[ $# -ge 2 ]] || usage
      value=$2
      shift 2
      case $option in
        --title) [[ "$title_set" == false ]] || usage; title=$value; title_set=true ;;
        --body) [[ "$body_set" == false ]] || usage; body=$value; body_set=true ;;
        --slug) [[ "$slug_set" == false ]] || usage; slug=$value; slug_set=true ;;
      esac
      ;;
    -*) usage ;;
    *) [[ -z "$issue_json" ]] || usage; issue_json=$1; shift ;;
  esac
done

if [[ -n "$issue_json" ]]; then
  [[ "$title_set" == false && "$body_set" == false && "$slug_set" == false ]] || usage
  [[ -f "$issue_json" && -r "$issue_json" && ! -L "$issue_json" ]] || { printf 'local-draft: issue JSON must be a readable regular file\n' >&2; exit 2; }
  jq -e '
    type == "object" and .schema_version == 1 and
    (.repository | type) == "string" and
    (.issue | type) == "object" and
    (.issue.number | type) == "number" and
    (.issue.title | type) == "string" and
    (.issue.body | type) == "string" and
    (.issue.url | type) == "string" and
    ((.issue.author | type) == "string" or (.issue.author | type) == "null") and
    (.comments | type) == "array" and
    all(.comments[]; (.author | type) == "string" or (.author | type) == "null") and
    all(.comments[]; (.created_at | type) == "string" and (.body | type) == "string")
  ' "$issue_json" >/dev/null || { printf 'local-draft: issue JSON is not normalized factory input\n' >&2; exit 2; }
else
  [[ "$title_set" == true && "$body_set" == true && "$slug_set" == true ]] || usage
  [[ -n "$title" && -n "$body" ]] || usage
  [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { printf 'local-draft: slug must be canonical lowercase kebab-case\n' >&2; exit 2; }
fi

tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/mcp-setup-docs-local-draft.XXXXXX")"
cleanup() {
  status=$?
  trap - EXIT HUP INT TERM
  rm -rf -- "$tmp_root"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

catalog_json="$tmp_root/catalog.json"
export_dir="$tmp_root/export"
mkdir -p "$export_dir"
jq -n --arg observed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{status:"skipped",tenant:"",observed_at:$observed_at,servers:[]}' >"$catalog_json"

expected_slug=
if [[ -z "$issue_json" ]]; then
  issue_json="$tmp_root/issue.json"
  expected_slug=$slug
  normalized_body="$body

Requested guide slug: $slug."
  jq -n --arg title "$title" --arg body "$normalized_body" --arg slug "$slug" '{
    schema_version: 1,
    repository: "local",
    issue: {number: 0, title: $title, body: $body, url: ("local://guide-draft/" + $slug), author: "local"},
    comments: []
  }' >"$issue_json"
fi

(
  unset GH_TOKEN GITHUB_TOKEN GH_ENTERPRISE_TOKEN AGENT_PAT
  unset PULSE_REGISTRY_KEY PULSE_REGISTRY_TENANT PULSE_REGISTRY_URL
  unset SSH_AUTH_SOCK SSH_AGENT_PID
  "$run_kit" "$issue_json" "$catalog_json" "$export_dir"
  [[ -f "$export_dir/run-report.json" ]] || { printf 'local-draft: Kit did not export run-report.json\n' >&2; exit 1; }
  if [[ -n "$expected_slug" ]]; then
    selected_slug="$(jq -er '.slug // empty' "$export_dir/run-report.json")" || { printf 'local-draft: report does not select a slug\n' >&2; exit 1; }
    [[ "$selected_slug" == "$expected_slug" ]] || { printf 'local-draft: report selected %s, expected %s\n' "$selected_slug" "$expected_slug" >&2; exit 1; }
  fi
  "$validate" "$export_dir" "$ROOT"
)

outcome="$(jq -r '.outcome' "$export_dir/run-report.json")"
selected_slug="$(jq -r '.slug // empty' "$export_dir/run-report.json")"
printf 'local-draft: validated outcome=%s slug=%s\n' "$outcome" "${selected_slug:-none}"
