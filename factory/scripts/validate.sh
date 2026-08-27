#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 2 ]] || { printf 'usage: validate.sh <export-dir> <repo-root>\n' >&2; exit 2; }
export_dir=$1
repo_root=$2
report="$export_dir/run-report.json"
guide_dir="$export_dir/guide"
script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

die() {
  printf 'validate: %s\n' "$*" >&2
  exit 1
}

write_output() {
  local name=$1 value=$2 delimiter
  [[ -n "${GITHUB_OUTPUT:-}" ]] || return 0
  delimiter="factory_${RANDOM}_${RANDOM}_$$"
  while grep -Fqx "$delimiter" <<<"$value"; do
    delimiter="factory_${RANDOM}_${RANDOM}_$$"
  done
  printf '%s<<%s\n%s\n%s\n' "$name" "$delimiter" "$value" "$delimiter" >>"$GITHUB_OUTPUT"
}

[[ -d "$export_dir" ]] || die "export directory does not exist"
[[ -d "$repo_root" ]] || die "repository root does not exist"
[[ -f "$report" && ! -L "$report" ]] || die "run-report.json must be a regular file"

# Keep this strict shape check aligned with factory/schemas/run-report.schema.json.
jq -e '
  def nonempty_strings: all(.[]; type == "string" and length > 0);
  (keys | sort) == (["schema_version","outcome","provider","slug","persona","summary","open_questions","blockers","nits","review_rounds","artifacts"] | sort) and
  .schema_version == 1 and
  (.outcome | IN("converged","awaiting_scope","blocked","failed")) and
  ((.provider == null) or (.provider | type == "string" and length > 0)) and
  ((.slug == null) or (.slug | type == "string" and test("^[a-z0-9]+(-[a-z0-9]+)*$"))) and
  ((.persona == null) or (.persona | type == "string" and length > 0)) and
  (.summary | type == "string" and length > 0) and
  (.open_questions | type == "array" and nonempty_strings) and
  (.blockers | type == "array" and nonempty_strings) and
  (.nits | type == "array" and nonempty_strings) and
  (.review_rounds | type == "number" and floor == . and . >= 0 and . <= 3) and
  (.artifacts | type == "array" and length == (unique | length) and all(.[]; IN("research.md","meta.yaml","external.md","speakeasy.md"))) and
  (if (.provider == null or .slug == null or .persona == null) then
     (.outcome | IN("blocked","failed")) and (.artifacts | length == 0)
   else true end) and
  (if .outcome == "converged" then
     (.blockers | length == 0) and (["research.md","meta.yaml","external.md","speakeasy.md"] - .artifacts | length == 0)
   elif .outcome == "awaiting_scope" then
     (["research.md","meta.yaml"] - .artifacts | length == 0)
   elif .outcome == "failed" then
     (.artifacts | length == 0)
   else true end)
' "$report" >/dev/null || die "run-report.json failed validation"

outcome=$(jq -r '.outcome' "$report")
slug=$(jq -r '.slug // empty' "$report")
provider=$(jq -r '.provider // empty' "$report")
persona=$(jq -r '.persona // empty' "$report")
write_output outcome "$outcome"
write_output slug "$slug"
write_output provider "$provider"
write_output persona "$persona"

if [[ "$outcome" == failed || ("$outcome" == blocked && -z "$slug") ]]; then
  if [[ -d "$guide_dir" ]] && find "$guide_dir" -mindepth 1 -print -quit | grep -q .; then
    die "non-installing outcome exported guide files"
  fi
  exit 0
fi

[[ -n "$slug" ]] || die "installing outcome requires a slug"
[[ -d "$guide_dir" && ! -L "$guide_dir" ]] || die "guide export must be a directory"
if find "$guide_dir" -type l -print -quit | grep -q .; then
  die "symlinks are not allowed in guide exports"
fi
while IFS= read -r -d '' path; do
  name=${path##*/}
  [[ "${path%/*}" == "$guide_dir" && -f "$path" ]] || die "unexpected guide entry: $path"
  case "$name" in
    research.md|meta.yaml|external.md|speakeasy.md) ;;
    *) die "unexpected guide artifact: $name" ;;
  esac
done < <(find "$guide_dir" -mindepth 1 -print0)

for name in research.md meta.yaml external.md speakeasy.md; do
  listed=$(jq -e --arg name "$name" '.artifacts | index($name) != null' "$report" >/dev/null && printf yes || printf no)
  present=no
  [[ -f "$guide_dir/$name" && ! -L "$guide_dir/$name" ]] && present=yes
  [[ "$listed" == "$present" ]] || die "report/artifact mismatch for $name"
done

case "$outcome" in
  converged) required=(research.md meta.yaml external.md speakeasy.md) ;;
  awaiting_scope) required=(research.md meta.yaml) ;;
  blocked) required=() ;;
  *) die "unsupported outcome: $outcome" ;;
esac
for name in "${required[@]}"; do
  [[ -f "$guide_dir/$name" ]] || die "$outcome export is missing $name"
done

staged=$(mktemp -d)
backup=$(mktemp -d)
cleanup() { rm -rf "$staged" "$backup"; }
trap cleanup EXIT
cp -a "$guide_dir/." "$staged/"

if [[ -f "$staged/meta.yaml" ]]; then
  lint_args=(--meta-only "$staged")
  if [[ -f "$staged/external.md" && -f "$staged/speakeasy.md" ]]; then
    lint_args=("$staged")
  fi
  (cd "$script_root/go" && go run ./cmd/lint-guide "${lint_args[@]}") || die "guide lint failed"
fi

[[ -d "$repo_root/.git" || -f "$repo_root/.git" ]] || die "repository root is not a Git worktree"
target="$repo_root/guides/$slug"
mkdir -p "$repo_root/guides"
had_target=false
if [[ -e "$target" || -L "$target" ]]; then
  mv "$target" "$backup/target"
  had_target=true
fi
mv "$staged" "$target"
staged=$(mktemp -d)

invalid_diff=false
while IFS= read -r -d '' path; do
  case "$path" in
    "guides/$slug/"*) ;;
    *) invalid_diff=true ;;
  esac
done < <({ git -C "$repo_root" diff --name-only -z HEAD --; git -C "$repo_root" ls-files --others --exclude-standard -z; })
if [[ "$invalid_diff" == true ]]; then
  rm -rf "$target"
  if [[ "$had_target" == true ]]; then
    mv "$backup/target" "$target"
  fi
  die "repository has changed paths outside guides/$slug/"
fi
