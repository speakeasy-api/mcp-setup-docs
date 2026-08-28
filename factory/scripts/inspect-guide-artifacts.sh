#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT=${FACTORY_REPO_ROOT:-$SCRIPT_ROOT}
ROOT="$(cd "$ROOT" && pwd -P)"
# shellcheck disable=SC1091
source "$SCRIPT_ROOT/factory/scripts/lib.sh"

[[ $# -eq 2 ]] || die "usage: ${0##*/} <slug> <research|writer|revision>"
slug=$1
stage=$2
[[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || die "invalid guide slug"
case "$stage" in
  research|writer|revision) ;;
  *) die "invalid inspection stage" ;;
esac

target="$ROOT/guides/$slug"
[[ -d "$target" && ! -L "$target" ]] || die "invalid target guide directory"
[[ "$(realpath "$target")" == "$ROOT/guides/$slug" ]] || die "invalid target guide directory"

required=(research.md meta.yaml)
if [[ "$stage" != research ]]; then
  required+=(external.md speakeasy.md)
fi
for artifact in "${required[@]}"; do
  path="$target/$artifact"
  [[ -e "$path" || -L "$path" ]] || die "missing required guide artifact"
  [[ -f "$path" && ! -L "$path" ]] || die "invalid guide artifact"
done

if [[ "$stage" == research ]]; then
  external_present=false
  speakeasy_present=false
  [[ -e "$target/external.md" || -L "$target/external.md" ]] && external_present=true
  [[ -e "$target/speakeasy.md" || -L "$target/speakeasy.md" ]] && speakeasy_present=true
  [[ "$external_present" == "$speakeasy_present" ]] || die "incomplete setup artifact pair"
fi

artifacts=()
shopt -s nullglob dotglob
for path in "$target"/*; do
  artifact=${path##*/}
  case "$artifact" in
    research.md|meta.yaml|external.md|speakeasy.md) ;;
    *) die "unexpected guide artifact" ;;
  esac
  [[ -f "$path" && ! -L "$path" ]] || die "invalid guide artifact"
  artifacts+=("$artifact")
done

printf '%s\n' "${artifacts[@]}" | sort | jq -Rsc --arg slug "$slug" --arg stage "$stage" \
  '{slug:$slug,stage:$stage,artifacts:(split("\n") | map(select(length > 0)))}'
