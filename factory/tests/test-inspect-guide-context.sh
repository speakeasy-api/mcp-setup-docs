#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

bash "$ROOT/factory/scripts/inspect-guide-context.sh" box >"$TMP/out" 2>"$TMP/err"
jq -e '
  (keys | sort) == ["files","slug"]
  and .slug == "box"
  and (.files | type) == "array"
  and (.files | length) > 10 and (.files | length) <= 40
  and [.files[].path] == ([.files[].path] | sort | unique)
  and all(.files[];
    (keys | sort) == ["characters","path"]
    and (.path | type) == "string" and (.path | length) <= 120
    and (.characters | type) == "number" and (.characters | floor) == .characters and .characters >= 0)
  and ([.files[].path] | index("doctrine/constitution.md")) != null
  and ([.files[].path] | index("doctrine/personas/it-admin.md")) != null
  and ([.files[].path] | index("doctrine/roles/technical-research.md")) != null
  and ([.files[].path] | index("factory/schemas/run-report.schema.json")) != null
  and ([.files[].path] | index("schema/guide.v1.schema.json")) != null
  and ([.files[].path] | index("guides/box/meta.yaml")) != null
' "$TMP/out" >/dev/null || fail 'guide context manifest is invalid'
assert_eq '' "$(cat "$TMP/err")"
(( $(wc -c <"$TMP/out") < 7000 )) || fail 'guide context manifest exceeded bounded output'
if grep -Fq '# Constitution' "$TMP/out"; then
  fail 'guide context manifest retained raw file content'
fi
expected_characters="$(wc -m <"$ROOT/doctrine/constitution.md" | tr -d ' ')"
actual_characters="$(jq -r '.files[] | select(.path == "doctrine/constitution.md") | .characters' "$TMP/out")"
assert_eq "$expected_characters" "$actual_characters"
FACTORY_REPO_ROOT="$ROOT/" bash "$ROOT/factory/scripts/inspect-guide-context.sh" box >/dev/null

long_slug="$(printf 'a%.0s' {1..121})"
if bash "$ROOT/factory/scripts/inspect-guide-context.sh" "$long_slug" >"$TMP/out" 2>"$TMP/err"; then
  fail 'overlong guide slug unexpectedly succeeded'
fi
assert_eq '' "$(cat "$TMP/out")"
assert_contains 'factory: invalid guide slug' "$(cat "$TMP/err")"

bash "$ROOT/factory/scripts/inspect-guide-context.sh" box >"$TMP/out" 2>"$TMP/err"
jq -e '
  [.files[].path | select(startswith("guides/") and (startswith("guides/box/") | not)) | split("/")[1]]
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
mkdir -p "$TMP/repo/guides/box"
for artifact in research.md meta.yaml external.md speakeasy.md; do
  : >"$TMP/repo/guides/box/$artifact"
done
for required in doctrine/personas/it-admin.md doctrine/roles/technical-research.md \
  doctrine/roles/writer.md doctrine/roles/fidelity.md doctrine/roles/review.md \
  factory/schemas/research-status.schema.json factory/schemas/review-findings.schema.json \
  factory/schemas/run-report.schema.json; do
  : >"$TMP/repo/$required"
done
for directory in doctrine/personas doctrine/roles factory/schemas; do
  mv "$TMP/repo/$directory" "$TMP/repo/${directory}.real"
  ln -s "$TMP/repo/${directory}.real" "$TMP/repo/$directory"
  if FACTORY_REPO_ROOT="$TMP/repo" bash "$ROOT/factory/scripts/inspect-guide-context.sh" box \
    >"$TMP/out" 2>"$TMP/err"; then
    fail "symlinked context directory unexpectedly succeeded: $directory"
  fi
  assert_eq '' "$(cat "$TMP/out")"
  assert_contains 'factory: invalid guide context directory' "$(cat "$TMP/err")"
  rm "$TMP/repo/$directory"
  mv "$TMP/repo/${directory}.real" "$TMP/repo/$directory"
done

for required in doctrine/personas/it-admin.md doctrine/roles/writer.md \
  factory/schemas/run-report.schema.json; do
  rm "$TMP/repo/$required"
  if FACTORY_REPO_ROOT="$TMP/repo" bash "$ROOT/factory/scripts/inspect-guide-context.sh" box \
    >"$TMP/out" 2>"$TMP/err"; then
    fail "missing required context unexpectedly succeeded: $required"
  fi
  assert_eq '' "$(cat "$TMP/out")"
  assert_contains 'factory: invalid guide context file' "$(cat "$TMP/err")"
  : >"$TMP/repo/$required"
done

rm -rf "$TMP/repo/guides/box"
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
printf 'PASS: bounded guide context manifest\n'
