#!/usr/bin/env bash
# One private candidate; no retries, model data evaluation, or runtime dependencies.
set -euo pipefail
export LC_ALL=C
umask 077
SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT=${FACTORY_REPO_ROOT:-/workspace}
fail() { printf 'factory: report creation failed\n' >&2; exit 1; }
[[ $# -eq 1 && ${#1} -le 65536 ]] || fail
[[ "$ROOT" == /* && "$(realpath "$ROOT")" == "$ROOT" ]] || fail
private="$ROOT/.factory"
[[ -d "$private" && ! -L "$private" && "$(realpath "$private")" == "$private" ]] || fail
[[ -n $(find "$private" -maxdepth 0 -type d -perm 0700 -print) ]] || fail
cd "$private"
regular() { [[ -f "$1" && ! -L "$1" && -n $(find "$1" -maxdepth 0 -type f -links 1 -print) ]]; }
if [[ -e run-report.json || -L run-report.json ]]; then regular run-report.json || fail; fi
# Reject special files before redirection (opening a FIFO would block).
[[ ! -e run-report.json.tmp && ! -L run-report.json.tmp ]] || fail
# noclobber refuses a competing regular-file candidate.
(set -o noclobber; printf '%s' "$1" >run-report.json.tmp) 2>/dev/null || fail
trap 'rm -f -- run-report.json.tmp' EXIT
regular run-report.json.tmp || fail
if bash "$SCRIPT_ROOT/validate-report.sh" "$private/run-report.json.tmp" >/dev/null 2>&1; then
  :
else
  status=$?
  if [[ $status -eq 1 ]]; then printf 'factory: report validation failed\n' >&2; exit 2; fi
  fail
fi
# Reports run after model phases stop; never follow a replaced destination.
[[ "$private" -ef . && ! -L "$private" && "$(realpath "$private")" == "$private" ]] || fail
regular run-report.json.tmp || fail
if [[ -e run-report.json || -L run-report.json ]]; then regular run-report.json || fail; fi
mv -f -- run-report.json.tmp run-report.json
trap - EXIT
