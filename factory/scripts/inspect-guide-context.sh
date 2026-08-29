#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT=${FACTORY_REPO_ROOT:-$SCRIPT_ROOT}
ROOT="$(cd "$ROOT" && pwd -P)"
# shellcheck disable=SC1091
source "$SCRIPT_ROOT/factory/scripts/lib.sh"
[[ $# -eq 1 ]] || die "usage: ${0##*/} <slug>"
slug=$1
[[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ && ${#slug} -le 96 ]] || die "invalid guide slug"

paths=''
sorted=''
manifest=''
next=''
guide_dirs=''
cleanup() {
  for path in "$paths" "$sorted" "$manifest" "$next" "$guide_dirs"; do
    [[ -z "$path" ]] || rm -f "$path"
  done
}
trap cleanup EXIT
paths="$(mktemp "${TMPDIR:-/tmp}/factory-context-paths.XXXXXX")"
sorted="$(mktemp "${TMPDIR:-/tmp}/factory-context-sorted.XXXXXX")"
manifest="$(mktemp "${TMPDIR:-/tmp}/factory-context-manifest.XXXXXX")"
next="$(mktemp "${TMPDIR:-/tmp}/factory-context-next.XXXXXX")"
guide_dirs="$(mktemp "${TMPDIR:-/tmp}/factory-context-guides.XXXXXX")"
printf '[]\n' >"$manifest"

printf '%s\n' \
  doctrine/constitution.md doctrine/shared.md doctrine/glossary.md \
  doctrine/speakeasy-setup.md schema/guide.v1.schema.json >>"$paths"
for directory in doctrine/personas doctrine/roles factory/schemas; do
  resolved_directory="$(realpath "$ROOT/$directory" 2>/dev/null)" \
    || die "invalid guide context directory"
  [[ -d "$ROOT/$directory" && ! -L "$ROOT/$directory" \
    && "$resolved_directory" == "$ROOT/$directory" ]] || die "invalid guide context directory"
  find "$ROOT/$directory" -maxdepth 1 -type f | while IFS= read -r path; do
    printf '%s\n' "${path#"$ROOT/"}"
  done >>"$paths"
done
resolved_guides="$(realpath "$ROOT/guides" 2>/dev/null)" || die "guide discovery failed"
[[ -d "$ROOT/guides" && ! -L "$ROOT/guides" && "$resolved_guides" == "$ROOT/guides" ]] \
  || die "guide discovery failed"
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

for required in doctrine/personas/it-admin.md doctrine/roles/technical-research.md \
  doctrine/roles/writer.md doctrine/roles/fidelity.md doctrine/roles/review.md \
  factory/schemas/research-status.schema.json factory/schemas/review-findings.schema.json \
  factory/schemas/run-report.schema.json; do
  resolved_required="$(realpath "$ROOT/$required" 2>/dev/null)" \
    || die "invalid guide context file"
  [[ -f "$ROOT/$required" && ! -L "$ROOT/$required" \
    && "$resolved_required" == "$ROOT/$required" ]] || die "invalid guide context file"
done

sort -u "$paths" >"$sorted"
count="$(wc -l <"$sorted" | tr -d ' ')"
[[ "$count" =~ ^[1-9][0-9]*$ && "$count" -le 40 ]] || die "invalid guide context manifest"
while IFS= read -r path; do
  [[ ${#path} -le 120 ]] || die "invalid guide context manifest"
  [[ "$path" =~ ^(doctrine/(constitution|shared|glossary|speakeasy-setup)\.md|doctrine/(personas|roles)/[A-Za-z0-9._-]+\.md|factory/schemas/[A-Za-z0-9._-]+\.json|schema/guide\.v1\.schema\.json|guides/[a-z0-9]+(-[a-z0-9]+)*/(research\.md|meta\.yaml|external\.md|speakeasy\.md))$ ]] \
    || die "invalid guide context manifest"
  resolved_path="$(realpath "$ROOT/$path" 2>/dev/null)" || die "invalid guide context file"
  [[ -f "$ROOT/$path" && ! -L "$ROOT/$path" && "$resolved_path" == "$ROOT/$path" ]] \
    || die "invalid guide context file"
  characters="$(jq -Rs 'length' <"$ROOT/$path")" || die "invalid guide context file"
  jq --arg path "$path" --argjson characters "$characters" \
    '. + [{path:$path,characters:$characters}]' "$manifest" >"$next"
  mv "$next" "$manifest"
done <"$sorted"

jq -cn --arg slug "$slug" --slurpfile files "$manifest" \
  '{slug:$slug,files:$files[0]}' >"$next"
(( $(wc -c <"$next") <= 7000 )) || die "invalid guide context manifest"
cat "$next" || die "guide context manifest output failed"
