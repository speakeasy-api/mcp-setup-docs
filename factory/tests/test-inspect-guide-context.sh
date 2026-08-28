#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

bash "$ROOT/factory/scripts/inspect-guide-context.sh" box >"$TMP/out" 2>"$TMP/err"
jq -e '
  .slug == "box"
  and (.files["doctrine/constitution.md"] | type) == "string"
  and (.files["doctrine/personas/it-admin.md"] | type) == "string"
  and (.files["doctrine/roles/technical-research.md"] | type) == "string"
  and (.files["factory/schemas/run-report.schema.json"] | fromjson | type) == "object"
  and (.files["schema/guide.v1.schema.json"] | fromjson | type) == "object"
  and (.files["guides/box/meta.yaml"] | type) == "string"
' "$TMP/out" >/dev/null
assert_eq '' "$(cat "$TMP/err")"
(( $(wc -c <"$TMP/out") > 100000 )) || fail 'context fixture does not exercise large output'
FACTORY_REPO_ROOT="$ROOT/" bash "$ROOT/factory/scripts/inspect-guide-context.sh" box >/dev/null

jq -e '
  [.files | keys[] | select(startswith("guides/") and (startswith("guides/box/") | not)) | split("/")[1]]
  | group_by(.) | all(.[]; length == 4)
' "$TMP/out" >/dev/null

mkdir -p "$TMP/repo/guides" "$TMP/repo/doctrine/personas" "$TMP/repo/doctrine/roles" \
  "$TMP/repo/factory/schemas" "$TMP/repo/schema"
for path in doctrine/constitution.md doctrine/shared.md doctrine/glossary.md \
  doctrine/speakeasy-setup.md schema/guide.v1.schema.json; do
  : >"$TMP/repo/$path"
done
ln -s "$ROOT/guides/box" "$TMP/repo/guides/box"
if FACTORY_REPO_ROOT="$TMP/repo" bash "$ROOT/factory/scripts/inspect-guide-context.sh" box >"$TMP/out" 2>"$TMP/err"; then
  fail 'symlinked guide directory unexpectedly succeeded'
fi
assert_contains 'factory: invalid target guide directory' "$(cat "$TMP/err")"

rm "$TMP/repo/guides/box"
rmdir "$TMP/repo/guides"
if FACTORY_REPO_ROOT="$TMP/repo" bash "$ROOT/factory/scripts/inspect-guide-context.sh" box >"$TMP/out" 2>"$TMP/err"; then
  fail 'missing guides directory unexpectedly succeeded'
fi
assert_contains 'factory: guide discovery failed' "$(cat "$TMP/err")"

if bash "$ROOT/factory/scripts/inspect-guide-context.sh" '../box' >"$TMP/out" 2>"$TMP/err"; then
  fail 'unsafe context slug unexpectedly succeeded'
fi
assert_eq '' "$(cat "$TMP/out")"
assert_contains 'factory: invalid guide slug' "$(cat "$TMP/err")"
printf 'PASS: deterministic guide context inspection\n'
