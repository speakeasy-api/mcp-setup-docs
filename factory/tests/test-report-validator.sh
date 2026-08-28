#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
VALIDATOR="$ROOT/factory/scripts/validate-report.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

test -x "$VALIDATOR" || fail "validate-report.sh is not executable"
grep -Fq 'factory/scripts/validate-report.sh' "$ROOT/factory/scripts/validate.sh" || fail "host validator does not reuse report validator"

cat >"$TMP/valid.json" <<'JSON'
{"schema_version":1,"outcome":"converged","provider":"Acme","slug":"acme","persona":"it-admin","summary":"Complete","open_questions":[],"blockers":[],"nits":[],"review_rounds":1,"artifacts":["research.md","meta.yaml","external.md","speakeasy.md"]}
JSON
"$VALIDATOR" "$TMP/valid.json"

expect_invalid() {
  local name=$1 filter=$2
  jq "$filter" "$TMP/valid.json" >"$TMP/$name.json"
  if "$VALIDATOR" "$TMP/$name.json" >/dev/null 2>&1; then
    fail "accepted invalid report: $name"
  fi
}

expect_invalid missing-key 'del(.summary)'
expect_invalid extra-key '.extra = true'
expect_invalid empty-string '.summary = ""'
expect_invalid bad-slug '.slug = "Bad Slug"'
expect_invalid fractional-rounds '.review_rounds = 1.5'
expect_invalid too-many-rounds '.review_rounds = 4'
expect_invalid duplicate-artifact '.artifacts += ["research.md"]'
expect_invalid unknown-artifact '.artifacts[0] = "other.md"'
expect_invalid empty-array-item '.nits = [""]'
expect_invalid converged-blocker '.blockers = ["unresolved"]'
expect_invalid null-identity '.persona = null'
expect_invalid failed-artifacts '.outcome = "failed"'
expect_invalid awaiting-missing-research '.outcome = "awaiting_scope" | .artifacts = ["meta.yaml"]'
ln -s "$TMP/valid.json" "$TMP/link.json"
if "$VALIDATOR" "$TMP/link.json" >/dev/null 2>&1; then
  fail "accepted symlink report"
fi

printf 'PASS: strict report validator\n'
