#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
TMP=$(mktemp -d)
TMP=$(cd "$TMP" && pwd -P)
chmod 700 "$TMP"
trap 'rm -rf "$TMP"' EXIT
mkdir -m 700 "$TMP/bin" "$TMP/private" "$TMP/export" "$TMP/repo" "$TMP/input" "$TMP/workspace" "$TMP/home"
printf '{}\n' > "$TMP/issue.json"
printf '{}\n' > "$TMP/catalog.json"
# Safe setup failure removes stale installable output, without requiring Docker.
mkdir "$TMP/export/guide"
printf stale > "$TMP/export/guide/content"
printf '{"outcome":"converged"}' > "$TMP/export/run-report.json"
if OPENROUTER_API_KEY='' FACTORY_PRIVATE_ROOT="$TMP/private" \
  "$ROOT/factory/scripts/run-kit.sh" "$TMP/issue.json" "$TMP/catalog.json" "$TMP/export" > "$TMP/out" 2> "$TMP/err"; then
  echo 'unready wrapper returned success' >&2; exit 1
fi
[[ ! -e "$TMP/export/guide" && ! -e "$TMP/export/run-report.json" ]]
[[ -n $(find "$TMP/private" -name stale-guide -type d -print -quit) ]]
# Symlink input/export ancestors must not be traversed or create target children.
ln -s "$TMP/issue.json" "$TMP/issue-link"
ln -s "$TMP/export" "$TMP/export-link"
for bad in input export; do
  issue="$TMP/issue.json"; target="$TMP/export-link/new"
  if [[ $bad == input ]]; then issue="$TMP/issue-link"; target="$TMP/export"; fi
  if OPENROUTER_API_KEY=fixture FACTORY_PRIVATE_ROOT="$TMP/private" \
    "$ROOT/factory/scripts/run-kit.sh" "$issue" "$TMP/catalog.json" "$target" > "$TMP/out" 2> "$TMP/err"; then
    echo 'unsafe path accepted' >&2; exit 1
  fi
  [[ ! -e "$TMP/export/new" ]]
done
# Entrypoint is only Kit execution and atomic candidate persistence, never report
# validation/export. Even malformed candidates are private Task 4 inputs.
mkdir -p "$TMP/repo/factory" "$TMP/repo/.factory"
printf coordinate > "$TMP/repo/factory/coordinator.md"
printf '{}\n' > "$TMP/input/issue.json"
printf '{}\n' > "$TMP/input/catalog.json"
cat > "$TMP/bin/kit" <<'KIT'
#!/usr/bin/env bash
set -euo pipefail
[[ $1 == prompt && $2 == --root && $3 == "$FACTORY_WORKSPACE_ROOT" ]]
printf 'PRIVATE_TEST_STDOUT\n'
printf 'malformed candidate' > "$FACTORY_WORKSPACE_ROOT/.factory/run-report.json.tmp"
mv "$FACTORY_WORKSPACE_ROOT/.factory/run-report.json.tmp" "$FACTORY_WORKSPACE_ROOT/.factory/run-report.json"
exit "${FAKE_KIT_EXIT:-0}"
KIT
chmod 700 "$TMP/bin/kit"
for status in 0 7; do
  set +e
  FACTORY_REPO_ROOT="$TMP/repo" FACTORY_INPUT_ROOT="$TMP/input" FACTORY_WORKSPACE_ROOT="$TMP/workspace" \
    FACTORY_KIT_HOME="$TMP/home" FACTORY_EXPORT_ROOT="$TMP/export" KIT_BIN="$TMP/bin/kit" \
    KIT_MODEL=fixture KIT_REASONING_EFFORT=medium FAKE_KIT_EXIT=$status \
    "$ROOT/factory/scripts/container-entrypoint.sh" > "$TMP/raw" 2>&1
  actual=$?
  set -e
  [[ $actual == "$status" && -f "$TMP/workspace/.factory/run-report.json" ]]
  [[ -z $(find "$TMP/export" -mindepth 1 -print -quit) ]]
done
if grep -Eq 'mkfifo|TRANSCRIPT_BUILDER|EVENT_PROJECTOR|EXPORT_ROOT|rm -rf' "$ROOT/factory/scripts/container-entrypoint.sh"; then exit 1; fi
printf '%s\n' 'PASS: host unready/export isolation, unsafe paths, entrypoint real status and private candidate'
