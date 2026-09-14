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
chmod 755 "$TMP/repo/factory/scripts/"*.sh
chmod 644 "$TMP/repo/factory/coordinator.md"
printf '{}\n' >"$TMP/input/issue.json"; printf '{}\n' >"$TMP/input/catalog.json"
report='{"schema_version":1,"outcome":"failed","provider":null,"slug":null,"persona":null,"summary":"entrypoint fixture","open_questions":[],"blockers":[],"nits":[],"review_rounds":0,"artifacts":[]}'
# Provider-free writer executed by the entrypoint, not the caller.
# Tests inherited creation modes, not Kit native API execution.
cat >"$TMP/writer" <<'WRITER'
#!/usr/bin/env bash
set -euo pipefail
cd "$FACTORY_WORKSPACE_ROOT"
mkdir -p .factory/research
for index in 0 1; do
  # A descendant represents a same-session follow-up; no mode repair.
  bash -c 'for suffix in input.json prompt.md report.md handle.json; do
    printf "fixture\n" >".factory/research/topic-5-$1.$suffix"
  done' -- "$index"
done
WRITER
chmod 755 "$TMP/writer"
run_entrypoint() {
  FACTORY_REPO_ROOT="$TMP/repo" FACTORY_INPUT_ROOT="$TMP/input" \
    FACTORY_WORKSPACE_ROOT="$TMP/workspace" FACTORY_KIT_HOME="$TMP/home" \
    KIT_BIN="$TMP/writer" KIT_MODEL=fixture KIT_REASONING_EFFORT=medium bash "$entrypoint"
}
for scenario in fresh snapshot755; do
  if [[ $scenario == snapshot755 ]]; then mkdir -m 755 "$TMP/repo/.factory"; fi
  (umask 022; run_entrypoint)
  [[ -n $(find "$TMP/workspace/.factory" -maxdepth 0 -type d -perm 0700 -print) ]] || { echo "FAIL: entrypoint .factory not 0700: $scenario" >&2; exit 1; }
  [[ -n $(find "$TMP/workspace/.factory/research" -maxdepth 0 -type d -perm 0700 -print) ]] || { echo "FAIL: writer directory not 0700: $scenario" >&2; exit 1; }
  for file in "$TMP/workspace/.factory/research/"*; do
    [[ -n $(find "$file" -maxdepth 0 -type f -perm 0600 -print) ]] || { echo "FAIL: writer file not 0600: $scenario" >&2; exit 1; }
  done
  # cp -a must retain snapshot/public/helper permissions despite the mask.
  [[ -n $(find "$TMP/workspace/factory/scripts/write-report.sh" -maxdepth 0 -perm 0755 -print) ]]
  [[ -n $(find "$TMP/workspace/factory/coordinator.md" -maxdepth 0 -perm 0644 -print) ]]
  FACTORY_REPO_ROOT="$TMP/workspace" bash "$TMP/workspace/factory/scripts/write-report.sh" "$report"
  [[ $(cat "$TMP/workspace/.factory/run-report.json") == "$report" ]]
  rm -r "$TMP/workspace/.factory/research"
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
