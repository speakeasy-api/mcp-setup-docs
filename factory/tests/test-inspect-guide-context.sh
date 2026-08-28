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
wrap_context() {
  local context=$1 destination=$2
  jq -n --rawfile stdout "$context" \
    '{exit_code:0,success:true,stdout:$stdout,stderr:""}' >"$destination"
}
expect_rejected_spill() {
  local rejected=$1
  if HOME="$TMP/home" "$READER" "$rejected" index >"$TMP/rejected.out" 2>"$TMP/rejected.err"; then
    fail 'spill reader accepted unsafe context metadata'
  fi
  assert_eq '' "$(cat "$TMP/rejected.out")"
  assert_eq 'factory: invalid guide context spill' "$(cat "$TMP/rejected.err")"
}
wrap_context "$TMP/out" "$artifact"
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

case_number=3
for content_kind in ascii emoji control exact empty; do
  case $content_kind in
    ascii) jq '.files["doctrine/constitution.md"] = ([range(0;9000) | "x"] | join(""))' "$TMP/out" >"$TMP/context-$content_kind" ;;
    emoji) jq '.files["doctrine/constitution.md"] = ([range(0;4000) | "😀"] | join(""))' "$TMP/out" >"$TMP/context-$content_kind" ;;
    control) jq '.files["doctrine/constitution.md"] = ([range(0;4000) | "\u0001"] | join(""))' "$TMP/out" >"$TMP/context-$content_kind" ;;
    exact) jq '.files["doctrine/constitution.md"] = ([range(0;4000) | "x"] | join(""))' "$TMP/out" >"$TMP/context-$content_kind" ;;
    empty) jq '.files["doctrine/constitution.md"] = ""' "$TMP/out" >"$TMP/context-$content_kind" ;;
  esac
  bounded_artifact="$artifact_root/compose-output-$case_number.json"
  wrap_context "$TMP/context-$content_kind" "$bounded_artifact"
  offset=0
  iterations=0
  while :; do
    HOME="$TMP/home" "$READER" "$bounded_artifact" read 0 "$offset" >"$TMP/bounded-chunk"
    encoded_bytes="$(jq -n --rawfile stdout "$TMP/bounded-chunk" \
      '{exit_code:0,success:true,stdout:$stdout,stderr:""} | tojson | utf8bytelength')"
    (( encoded_bytes <= 7000 )) || fail "spill reader exceeded encoded bound for $content_kind"
    next_offset="$(sed -n 's/^next_offset=//p' "$TMP/bounded-chunk")"
    done_value="$(sed -n 's/^done=//p' "$TMP/bounded-chunk")"
    if [[ $done_value == true ]]; then
      break
    fi
    (( next_offset > offset )) || fail "spill reader did not advance for $content_kind"
    offset=$next_offset
    iterations=$((iterations + 1))
    (( iterations < 20 )) || fail "spill reader used too many chunks for $content_kind"
  done
  if [[ $content_kind == ascii || $content_kind == emoji || $content_kind == control ]]; then
    (( iterations > 0 )) || fail "spill reader did not chunk $content_kind content"
  fi
  case_number=$((case_number + 1))
done

jq '.files["../SECRET_TRAVERSAL_PATH_CANARY"] = "x"' "$TMP/out" >"$TMP/unsafe-context"
wrap_context "$TMP/unsafe-context" "$artifact_root/compose-output-8.json"
expect_rejected_spill "$artifact_root/compose-output-8.json"
jq '.files["doctrine/roles/bad\nSECRET_NEWLINE_PATH_CANARY.md"] = "x"' "$TMP/out" >"$TMP/unsafe-context"
wrap_context "$TMP/unsafe-context" "$artifact_root/compose-output-9.json"
expect_rejected_spill "$artifact_root/compose-output-9.json"
long_path="doctrine/roles/$(printf '%0120d' 0).md"
jq --arg path "$long_path" '.files[$path] = "x"' "$TMP/out" >"$TMP/unsafe-context"
wrap_context "$TMP/unsafe-context" "$artifact_root/compose-output-10.json"
expect_rejected_spill "$artifact_root/compose-output-10.json"
jq '.files = {}' "$TMP/out" >"$TMP/unsafe-context"
wrap_context "$TMP/unsafe-context" "$artifact_root/compose-output-11.json"
expect_rejected_spill "$artifact_root/compose-output-11.json"
jq '.files += (reduce range(0;41) as $n ({}; .["doctrine/roles/extra-\($n).md"] = "x"))' \
  "$TMP/out" >"$TMP/unsafe-context"
wrap_context "$TMP/unsafe-context" "$artifact_root/compose-output-12.json"
expect_rejected_spill "$artifact_root/compose-output-12.json"
if grep -ER 'SECRET_TRAVERSAL_PATH_CANARY|SECRET_NEWLINE_PATH_CANARY' "$TMP/rejected.out" "$TMP/rejected.err"; then
  fail 'spill reader leaked rejected path metadata'
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
