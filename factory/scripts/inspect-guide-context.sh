#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT=${FACTORY_REPO_ROOT:-$SCRIPT_ROOT}
ROOT="$(cd "$ROOT" && pwd -P)"
# shellcheck disable=SC1091
source "$SCRIPT_ROOT/factory/scripts/lib.sh"
[[ $# -eq 1 ]] || die "usage: ${0##*/} <slug>"
slug=$1
[[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || die "invalid guide slug"

paths=''
sorted=''
files=''
next=''
guide_dirs=''
cleanup() {
  for path in "$paths" "$sorted" "$files" "$next" "$guide_dirs"; do
    [[ -z "$path" ]] || rm -f "$path"
  done
}
trap cleanup EXIT
paths="$(mktemp "${TMPDIR:-/tmp}/factory-context-paths.XXXXXX")"
sorted="$(mktemp "${TMPDIR:-/tmp}/factory-context-sorted.XXXXXX")"
files="$(mktemp "${TMPDIR:-/tmp}/factory-context-files.XXXXXX")"
next="$(mktemp "${TMPDIR:-/tmp}/factory-context-next.XXXXXX")"
guide_dirs="$(mktemp "${TMPDIR:-/tmp}/factory-context-guides.XXXXXX")"
printf '{}\n' >"$files"

printf '%s\n' \
  doctrine/constitution.md doctrine/shared.md doctrine/glossary.md \
  doctrine/speakeasy-setup.md schema/guide.v1.schema.json >>"$paths"
for directory in doctrine/personas doctrine/roles factory/schemas; do
  find "$ROOT/$directory" -maxdepth 1 -type f | while IFS= read -r path; do
    printf '%s\n' "${path#"$ROOT/"}"
  done >>"$paths"
done
target="$ROOT/guides/$slug"
if [[ -e "$target" || -L "$target" ]]; then
  [[ -d "$target" && ! -L "$target" ]] || die "invalid target guide directory"
  resolved_target="$(realpath "$target")"
  [[ "$resolved_target" == "$ROOT/guides/$slug" ]] || die "invalid target guide directory"
  for artifact in research.md meta.yaml external.md speakeasy.md; do
    path="$target/$artifact"
    if [[ -e "$path" || -L "$path" ]]; then
      [[ -f "$path" && ! -L "$path" ]] || die "invalid target guide artifact"
      printf 'guides/%s/%s\n' "$slug" "$artifact" >>"$paths"
    fi
  done
fi
if ! find "$ROOT/guides" -mindepth 1 -maxdepth 1 -type d ! -type l | sort >"$guide_dirs"; then
  die "guide discovery failed"
fi
representatives=0
while IFS= read -r guide; do
  [[ "${guide##*/}" == "$slug" ]] && continue
  complete=true
  for artifact in research.md meta.yaml external.md speakeasy.md; do
    [[ -f "$guide/$artifact" && ! -L "$guide/$artifact" ]] || complete=false
  done
  [[ "$complete" == true ]] || continue
  for artifact in research.md meta.yaml external.md speakeasy.md; do
    printf '%s/%s\n' "${guide#"$ROOT/"}" "$artifact" >>"$paths"
  done
  representatives=$((representatives + 1))
  (( representatives == 2 )) && break
done <"$guide_dirs"

sort -u "$paths" >"$sorted"
while IFS= read -r path; do
  [[ -f "$ROOT/$path" && ! -L "$ROOT/$path" ]] || die "invalid guide context file"
  jq --arg path "$path" --rawfile content "$ROOT/$path" '. + {($path):$content}' \
    "$files" >"$next"
  mv "$next" "$files"
done <"$sorted"

jq -n --arg slug "$slug" --slurpfile files "$files" '{slug:$slug,files:$files[0]}'
