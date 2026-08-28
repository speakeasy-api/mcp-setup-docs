#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [--create] [--limit N]\n' "${0##*/}" >&2
}

create=false
limit=5
while [[ $# -gt 0 ]]; do
  case $1 in
    --create)
      create=true
      shift
      ;;
    --limit)
      if [[ $# -lt 2 || ! $2 =~ ^[0-9]+$ || ${#2} -gt 9 ]]; then
        printf 'error: --limit requires a non-negative integer\n' >&2
        usage
        exit 2
      fi
      limit=$((10#$2))
      shift 2
      ;;
    -*)
      printf 'error: unknown option: %s\n' "$1" >&2
      usage
      exit 2
      ;;
    *)
      printf 'error: unexpected argument: %s\n' "$1" >&2
      usage
      exit 2
      ;;
  esac
done

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  printf 'error: stale-sweep must run in a Git repository\n' >&2
  exit 1
}
cd "$repo_root"

tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/stale-sweep.XXXXXX")
trap 'rm -rf "$tmp_dir"' EXIT
stale_file="$tmp_dir/stale"
issues_file="$tmp_dir/issues.json"
bodies_file="$tmp_dir/bodies"
markers_file="$tmp_dir/markers"
: >"$stale_file"
: >"$markers_file"

for dir in guides/*; do
  [[ -d $dir ]] || continue
  slug=${dir#guides/}
  if [[ ! $slug =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    printf 'error: invalid guide slug: %q (expected lowercase words separated by single hyphens)\n' "$slug" >&2
    exit 1
  fi
done

factory_timestamp=$(git log -1 --format=%ct -- \
  factory doctrine schema/guide.v1.schema.json \
  .github/workflows/guide-draft.yml .github/workflows/factory-ci.yml)
factory_timestamp=${factory_timestamp:-0}

for dir in guides/*; do
  [[ -d $dir ]] || continue
  slug=${dir#guides/}
  guide_timestamp=$(git log -1 --format=%ct -- "$dir")
  guide_timestamp=${guide_timestamp:-0}
  if [[ $guide_timestamp -lt $factory_timestamp ]]; then
    printf '%s\t%s\n' "$guide_timestamp" "$slug" >>"$stale_file"
  fi
done

LC_ALL=C sort -t $'\t' -k1,1n -k2,2 "$stale_file" -o "$stale_file"
stale_count=$(wc -l <"$stale_file")
stale_count=${stale_count//[[:space:]]/}
printf 'Stale guides (%s), oldest first:\n' "$stale_count"
while IFS=$'\t' read -r timestamp slug; do
  [[ -n ${slug:-} ]] || continue
  if [[ $timestamp -eq 0 ]]; then
    printf '%s\n' "- $slug (last guide change: never committed)"
  else
    printf '%s\n' "- $slug (last guide change: $timestamp)"
  fi
done <"$stale_file"

[[ $create == true ]] || exit 0

if [[ ! ${GH_REPO:-} =~ ^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9._-]+$ ]]; then
  printf 'error: --create requires GH_REPO in owner/repository form\n' >&2
  exit 1
fi

if ! gh issue list --repo "$GH_REPO" --state open --label guide:stale --limit 200 --json body >"$issues_file"; then
  printf 'error: could not list open guide:stale issues\n' >&2
  exit 1
fi
if ! jq -e 'type == "array" and all(.[]; type == "object" and has("body") and (.body | type == "string"))' \
  "$issues_file" >/dev/null; then
  printf 'error: issue list returned malformed JSON\n' >&2
  exit 1
fi
if ! jq -r '.[].body' "$issues_file" >"$bodies_file"; then
  printf 'error: could not read issue bodies\n' >&2
  exit 1
fi

grep_status=0
grep -oE '<!-- stale-sweep:[a-z0-9]+(-[a-z0-9]+)* -->' "$bodies_file" >"$markers_file" || grep_status=$?
if [[ $grep_status -gt 1 ]]; then
  printf 'error: could not extract stale issue markers\n' >&2
  exit 1
fi
LC_ALL=C sort -u "$markers_file" -o "$markers_file"

created=0
while IFS=$'\t' read -r timestamp slug; do
  [[ -n ${slug:-} ]] || continue
  marker="<!-- stale-sweep:$slug -->"
  if grep -Fqx -- "$marker" "$markers_file"; then
    continue
  fi
  [[ $created -lt $limit ]] || break
  gh issue create \
    --repo "$GH_REPO" \
    --title "Refresh guide: $slug" \
    --label guide:stale \
    --body "$marker

The factory inputs are newer than this guide. Refresh and validate the guide." \
    >/dev/null
  created=$((created + 1))
done <"$stale_file"
