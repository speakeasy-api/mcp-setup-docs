#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
READER="$ROOT/factory/scripts/read-guide-context-spill.sh"

test -x "$READER" || fail 'guide context spill reader is not executable'

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

artifact_root="$TMP/home/.kit/artifacts/session/call"
artifact="$artifact_root/compose-output.json"
mkdir -p "$artifact_root"
jq -n --rawfile stdout "$TMP/out" \
  '{exit_code:0,success:true,stdout:$stdout,stderr:""}' >"$artifact"
HOME="$TMP/home" "$READER" "$artifact" index >"$TMP/index" 2>"$TMP/reader.err"
jq -e '
  .slug == "box" and (.files | length) > 10
  and ([.files[].index] == [range(0; .files | length)])
  and ([.files[].path] | index("doctrine/constitution.md")) != null
  and all(.files[]; (.characters | type) == "number" and .characters >= 0)
' "$TMP/index" >/dev/null || fail 'spill reader index is invalid'
assert_eq '' "$(cat "$TMP/reader.err")"
constitution_index="$(jq -r '.files[] | select(.path == "doctrine/constitution.md") | .index' "$TMP/index")"
HOME="$TMP/home" "$READER" "$artifact" read "$constitution_index" 0 \
  >"$TMP/chunk" 2>"$TMP/reader.err"
assert_contains 'path=doctrine/constitution.md' "$(cat "$TMP/chunk")"
assert_contains 'offset=0' "$(cat "$TMP/chunk")"
assert_contains 'Speakeasy' "$(cat "$TMP/chunk")"
(( $(wc -c <"$TMP/chunk") < 6000 )) || fail 'spill reader chunk exceeded model-safe bound'
assert_eq '' "$(cat "$TMP/reader.err")"

printf '%s\n' 'SECRET_OUTSIDE_SPILL_CANARY' >"$TMP/outside.json"
if HOME="$TMP/home" "$READER" "$TMP/outside.json" index >"$TMP/rejected.out" 2>"$TMP/rejected.err"; then
  fail 'spill reader accepted an artifact outside Kit storage'
fi
assert_eq '' "$(cat "$TMP/rejected.out")"
assert_eq 'factory: invalid guide context spill' "$(cat "$TMP/rejected.err")"
ln -s "$artifact" "$artifact_root/compose-output-1.json"
if HOME="$TMP/home" "$READER" "$artifact_root/compose-output-1.json" index >"$TMP/rejected.out" 2>"$TMP/rejected.err"; then
  fail 'spill reader accepted a symlinked artifact'
fi
assert_eq 'factory: invalid guide context spill' "$(cat "$TMP/rejected.err")"
printf '%s\n' '{"SECRET_MALFORMED_SPILL_CANARY":true}' >"$artifact_root/compose-output-2.json"
if HOME="$TMP/home" "$READER" "$artifact_root/compose-output-2.json" index >"$TMP/rejected.out" 2>"$TMP/rejected.err"; then
  fail 'spill reader accepted malformed wrapped output'
fi
assert_eq 'factory: invalid guide context spill' "$(cat "$TMP/rejected.err")"
if grep -ER 'SECRET_OUTSIDE_SPILL_CANARY|SECRET_MALFORMED_SPILL_CANARY' "$TMP/rejected.out" "$TMP/rejected.err"; then
  fail 'spill reader leaked rejected source content'
fi

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
