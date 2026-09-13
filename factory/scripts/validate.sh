#!/usr/bin/env bash
set -euo pipefail

local_run_id=
if [[ ${1:-} == --local ]]; then
  [[ $# == 4 && $4 =~ ^[a-f0-9]{32}$ ]] || { printf 'usage: validate.sh --local <export-dir> <repo-root> <host-run-id>\n' >&2; exit 2; }
  local_run_id=$4
  set -- "$2" "$3"
fi
[[ $# -eq 2 ]] || { printf 'usage: validate.sh <export-dir> <repo-root>\n' >&2; exit 2; }
script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
export_dir="$(cd "$1" && pwd -P)"
repo_root="$(cd "$2" && pwd -P)"
report="$export_dir/run-report.json"
guide_dir="$export_dir/guide"
guides_dir="$repo_root/guides"
guides_physical=

stage_dir=
preserve_dir=
backup_dir=
diff_file=
untracked_file=
tree_file=
anchor_active=false
target_displaced=false
new_installed=false
transaction_complete=false
slug=

fatal() {
  printf 'validate: %s\n' "$*" >&2
  exit 1
}

check_candidate() {
  if [[ -n $local_run_id ]]; then
    python3 "$script_root/factory/scripts/publication-state.py" local-gate "$export_dir" "$local_run_id" "$1"
  else
    python3 "$script_root/factory/scripts/publication-state.py" candidate "$report" "$1"
  fi
}

verify_guides_dir() {
  [[ "$anchor_active" == true ]] || return 1
  [[ -d "$guides_dir" && ! -L "$guides_dir" && . -ef "$guides_dir" ]]
}

cleanup_transaction() {
  local status=$?
  trap - EXIT HUP INT TERM
  if [[ "$transaction_complete" != true && "$anchor_active" == true ]]; then
    if [[ "$new_installed" == true && -n "$slug" ]]; then
      rm -rf -- "$slug" || true
      new_installed=false
    fi
    if [[ "$target_displaced" == true && -n "$backup_dir" ]]; then
      if [[ -e "$backup_dir/target" || -L "$backup_dir/target" ]]; then
        if ! mv -- "$backup_dir/target" "$slug"; then
          printf 'validate: CRITICAL: could not restore previous guide from %s/target\n' "$backup_dir" >&2
          status=1
        else
          target_displaced=false
        fi
      elif [[ -e "$slug" || -L "$slug" ]]; then
        target_displaced=false
      fi
    fi
  fi
  [[ -z "$preserve_dir" ]] || rm -rf -- "$preserve_dir" || true
  [[ -z "$stage_dir" ]] || rm -rf -- "$stage_dir" || true
  if [[ "$target_displaced" != true && -n "$backup_dir" ]]; then
    rmdir -- "$backup_dir" 2>/dev/null || true
  fi
  [[ -z "$diff_file" ]] || rm -f -- "$diff_file" || true
  [[ -z "$untracked_file" ]] || rm -f -- "$untracked_file" || true
  [[ -z "$tree_file" ]] || rm -f -- "$tree_file" || true
  exit "$status"
}
trap cleanup_transaction EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

write_output() {
  local name=$1 value=$2 delimiter
  [[ -n "${GITHUB_OUTPUT:-}" ]] || return 0
  delimiter="factory_${RANDOM}_${RANDOM}_$$"
  while grep -Fqx "$delimiter" <<<"$value"; do
    delimiter="factory_${RANDOM}_${RANDOM}_$$"
  done
  printf '%s<<%s\n%s\n%s\n' "$name" "$delimiter" "$value" "$delimiter" >>"$GITHUB_OUTPUT"
}

validate_tree() {
  local root=$1 path name parent
  [[ ! -L "$root" ]] || fatal "guide export must not be a symlink"
  if [[ ! -e "$root" ]]; then
    return 0
  fi
  [[ -d "$root" ]] || fatal "guide export must be a directory"
  tree_file=$(mktemp) || fatal "could not create guide tree capture"
  if ! find "$root" -mindepth 1 -print0 >"$tree_file"; then
    rm -f "$tree_file"
    tree_file=
    fatal "could not scan guide tree"
  fi
  while IFS= read -r -d '' path; do
    name=${path##*/}
    parent=${path%/*}
    [[ "$parent" == "$root" && -f "$path" && ! -L "$path" ]] || fatal "unexpected guide entry: $path"
    case "$name" in
      research.md|meta.yaml|external.md|speakeasy.md) ;;
      *) fatal "unexpected guide artifact: $name" ;;
    esac
  done <"$tree_file"
  rm -f "$tree_file"
  tree_file=
}

validate_artifacts() {
  local root=$1 name listed present
  for name in research.md meta.yaml external.md speakeasy.md; do
    if jq -e --arg name "$name" '.artifacts | index($name) != null' "$report" >/dev/null; then
      listed=yes
    else
      listed=no
    fi
    if [[ -f "$root/$name" && ! -L "$root/$name" ]]; then
      present=yes
    else
      present=no
    fi
    [[ "$listed" == "$present" ]] || fatal "report/artifact mismatch for $name"
  done
}

check_git_paths() {
  local allowed_prefix=$1 backup_prefix='' path='' invalid=false
  diff_file=$(mktemp) || fatal "could not create Git diff capture"
  untracked_file=$(mktemp) || fatal "could not create Git untracked capture"
  if ! git -C "$repo_root" diff --name-only -z HEAD -- >"$diff_file"; then
    fatal "git diff failed"
  fi
  if ! git -C "$repo_root" ls-files --others --exclude-standard -z >"$untracked_file"; then
    fatal "git untracked scan failed"
  fi
  if [[ -n "$backup_dir" ]]; then
    backup_prefix="guides/${backup_dir#./}/"
  fi
  for capture in "$diff_file" "$untracked_file"; do
    while IFS= read -r -d '' path; do
      if [[ -n "$backup_prefix" && "$path" == "$backup_prefix"* ]]; then
        continue
      fi
      if [[ -n "$allowed_prefix" && "$path" == "$allowed_prefix"* ]]; then
        continue
      fi
      invalid=true
    done <"$capture"
  done
  [[ "$invalid" == false ]] || fatal "repository has changed paths outside ${allowed_prefix:-the allowed guide path}"
}

"$script_root/factory/scripts/validate-report.sh" "$report" || fatal "run-report.json failed validation"

outcome=$(jq -r '.outcome' "$report")
slug=$(jq -r '.slug // empty' "$report")
provider=$(jq -r '.provider // empty' "$report")
persona=$(jq -r '.persona // empty' "$report")

# Validate the export tree even for outcomes that install nothing.
validate_tree "$guide_dir"
validate_artifacts "$guide_dir"

[[ -d "$repo_root/.git" || -f "$repo_root/.git" ]] || fatal "repository root is not a Git worktree"
if [[ "$outcome" == converged ]]; then
  if [[ -n $local_run_id ]]; then
    python3 "$script_root/factory/scripts/publication-state.py" local-gate "$export_dir" "$local_run_id" || fatal 'trusted local handoff rejected'
  else
    [[ "$export_dir" == "${RUNNER_TEMP:?}/export" ]] || fatal 'export must be the fixed host export directory'
    python3 "$script_root/factory/scripts/publication-state.py" gate "$report" || fatal 'trusted publication handoff rejected'
  fi
fi

[[ -d "$guides_dir" && ! -L "$guides_dir" ]] || fatal "repository guides path must be a physical directory"
cd -P "$guides_dir" || fatal "could not enter guides directory"
guides_physical=$PWD
anchor_active=true
[[ "$guides_physical" == "$repo_root/guides" ]] || fatal "repository guides path resolved outside the repository"
verify_guides_dir || fatal "repository guides directory changed"

if [[ "$outcome" != converged ]]; then
  check_git_paths ""
  transaction_complete=true
  write_output outcome "$outcome"
  write_output slug "$slug"
  write_output provider "$provider"
  write_output persona "$persona"
  exit 0
fi

[[ -n "$slug" ]] || fatal "installing outcome requires a slug"
if [[ "$outcome" == converged ]]; then
  for name in research.md meta.yaml external.md speakeasy.md; do
    [[ -f "$guide_dir/$name" ]] || fatal "converged export is missing $name"
  done
fi

verify_guides_dir || fatal "repository guides directory changed before staging"
stage_dir=$(mktemp -d "./.factory-stage.XXXXXX") || fatal "could not create same-filesystem stage"
backup_dir=$(mktemp -d "./.factory-backup.XXXXXX") || fatal "could not create same-filesystem backup"
cp -a "$guide_dir/." "$stage_dir/" || fatal "could not copy export to stage"

# The export may have changed during copying; trust only this staged snapshot.
validate_tree "$stage_dir"
validate_artifacts "$stage_dir"

check_candidate "$PWD/${stage_dir#./}" || fatal 'staged candidate differs from host validation'

# Preserve unrelated trusted bundle files. Only four host-validated files replace
# existing content, and the original directory remains the rollback source.
if [[ -e "$slug" || -L "$slug" ]]; then
  [[ -d "$slug" && ! -L "$slug" ]] || fatal 'existing guide must be a physical directory'
  preserve_dir=$(mktemp -d "./.factory-stage.XXXXXX") || fatal 'could not stage existing bundle'
  cp -a "$slug/." "$preserve_dir/" || { rm -rf -- "$preserve_dir"; fatal 'could not preserve existing bundle'; }
  for name in research.md meta.yaml external.md speakeasy.md; do
    # Unlink first: copying must never follow an old guide-file symlink.
    rm -f -- "$preserve_dir/$name" || { rm -rf -- "$preserve_dir"; fatal 'could not replace existing guide file'; }
    cp -- "$stage_dir/$name" "$preserve_dir/$name" || { rm -rf -- "$preserve_dir"; fatal 'could not merge candidate'; }
  done
  rm -rf -- "$stage_dir"
  stage_dir=$preserve_dir
  preserve_dir=
  check_candidate "$PWD/${stage_dir#./}" || fatal 'merged candidate differs from host validation'
fi

verify_guides_dir || fatal "repository guides directory changed before install"
if [[ -e "$slug" || -L "$slug" ]]; then
  target_displaced=true
  mv -- "$slug" "$backup_dir/target" || fatal "could not displace existing guide"
fi
verify_guides_dir || fatal "repository guides directory changed during install"
new_installed=true
mv -- "$stage_dir" "$slug" || fatal "could not install staged guide"
stage_dir=
verify_guides_dir || fatal "repository guides directory changed after install"
check_git_paths "guides/$slug/"
verify_guides_dir || fatal "repository guides directory changed after Git checks"
check_candidate "$PWD/$slug" || fatal 'installed candidate differs from host validation'

# The new guide is committed once validation, install, and Git checks pass.
# Destructive old-backup collection cannot be rollback-safe if it partially fails.
transaction_complete=true
target_displaced=false
if [[ -e "$backup_dir/target" || -L "$backup_dir/target" ]]; then
  if rm -rf -- "$backup_dir" 2>/dev/null; then
    backup_dir=
  else
    printf 'validate: warning: committed guide; leftover backup: %s\n' "$backup_dir" >&2
    backup_dir=
  fi
else
  if rmdir -- "$backup_dir" 2>/dev/null; then
    backup_dir=
  else
    printf 'validate: warning: committed guide; leftover backup: %s\n' "$backup_dir" >&2
    backup_dir=
  fi
fi
write_output outcome "$outcome"
write_output slug "$slug"
write_output provider "$provider"
write_output persona "$persona"
