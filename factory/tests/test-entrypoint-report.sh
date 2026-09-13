#!/usr/bin/env bash
# Real entrypoint -> snapshot-supplied helper, without a model invocation.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
TMP=$(cd "$TMP" && pwd -P)
entrypoint=${FACTORY_TEST_ENTRYPOINT:-$ROOT/factory/scripts/container-entrypoint.sh}
mkdir -p "$TMP/repo/factory/scripts" "$TMP/input" "$TMP/home" "$TMP/workspace"
cp "$ROOT/factory/coordinator.md" "$TMP/repo/factory/"
cp "$ROOT/factory/scripts/"{write-report.sh,validate-report.sh} "$TMP/repo/factory/scripts/"
printf '{}\n' >"$TMP/input/issue.json"; printf '{}\n' >"$TMP/input/catalog.json"
report='{"schema_version":1,"outcome":"failed","provider":null,"slug":null,"persona":null,"summary":"entrypoint fixture","open_questions":[],"blockers":[],"nits":[],"review_rounds":0,"artifacts":[]}'
run_entrypoint() {
  FACTORY_REPO_ROOT="$TMP/repo" FACTORY_INPUT_ROOT="$TMP/input" \
    FACTORY_WORKSPACE_ROOT="$TMP/workspace" FACTORY_KIT_HOME="$TMP/home" \
    KIT_BIN=/usr/bin/true KIT_MODEL=fixture KIT_REASONING_EFFORT=medium bash "$entrypoint"
}
for scenario in fresh snapshot755; do
  if [[ $scenario == snapshot755 ]]; then mkdir -m 755 "$TMP/repo/.factory"; fi
  (umask 022; run_entrypoint)
  [[ -n $(find "$TMP/workspace/.factory" -maxdepth 0 -type d -perm 0700 -print) ]] || { echo "FAIL: entrypoint .factory not 0700: $scenario" >&2; exit 1; }
  FACTORY_REPO_ROOT="$TMP/workspace" bash "$TMP/workspace/factory/scripts/write-report.sh" "$report"
  [[ $(cat "$TMP/workspace/.factory/run-report.json") == "$report" ]]
done
mkdir -m 755 "$TMP/victim"
for location in "$TMP/workspace/.factory" "$TMP/repo/.factory"; do
  mv "$location" "$location.saved"
  ln -s "$TMP/victim" "$location"
  if run_entrypoint >/dev/null 2>&1; then echo 'FAIL: symlink accepted' >&2; exit 1; fi
  [[ -n $(find "$TMP/victim" -maxdepth 0 -type d -perm 0755 -print) ]]
  rm "$location"; mv "$location.saved" "$location"
done
mv "$TMP/workspace" "$TMP/real-workspace"; ln -s "$TMP/real-workspace" "$TMP/workspace"
if run_entrypoint >/dev/null 2>&1; then echo 'FAIL: workspace symlink accepted' >&2; exit 1; fi
printf 'PASS: real entrypoint -> report, fresh/copied permissions, unsafe paths\n'
