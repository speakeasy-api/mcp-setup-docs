#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat >"$TMP/issue.json" <<'JSON'
{"schema_version":1,"repository":"acme/docs","issue":{"number":145,"title":"Refresh guide: box","body":"Requested guide slug: box.","url":"https://example.test/issues/145","author":"alice"},"comments":[{"author":null,"created_at":"2026-08-28T00:00:00Z","body":"Please refresh."}]}
JSON
cat >"$TMP/catalog.json" <<'JSON'
{"status":"ready","tenant":"sensitive-tenant","observed_at":"2026-08-28T00:00:00Z","servers":[{"name":"io.example/box","title":"Box","description":"Box API","remotes":[{"transport":"streamable-http","url":"https://sensitive.example/mcp"}]}]}
JSON

bash "$ROOT/factory/scripts/inspect-inputs.sh" "$TMP/issue.json" "$TMP/catalog.json" >"$TMP/out" 2>"$TMP/err"
jq -e '
  .issue.issue.number == 145
  and .issue.issue.title == "Refresh guide: box"
  and .catalog.status == "ready"
  and .catalog.servers == [{name:"io.example/box",title:"Box",description:"Box API"}]
  and (.personas | index("it-admin")) != null
  and (.guide_slugs | index("box")) != null
' "$TMP/out" >/dev/null
assert_eq '' "$(cat "$TMP/err")"
if grep -Eq 'sensitive-tenant|sensitive\.example|streamable-http' "$TMP/out" "$TMP/err"; then
  fail 'input inspection leaked excluded catalog fields'
fi

printf '%s\n%s\n' "$(cat "$TMP/issue.json")" "$(cat "$TMP/issue.json")" >"$TMP/multiple.json"
if bash "$ROOT/factory/scripts/inspect-inputs.sh" "$TMP/multiple.json" "$TMP/catalog.json" >"$TMP/out" 2>"$TMP/err"; then
  fail 'multiple issue documents unexpectedly succeeded'
fi
assert_eq '' "$(cat "$TMP/out")"
assert_contains 'factory: malformed issue snapshot' "$(cat "$TMP/err")"

jq '.unexpected = "private"' "$TMP/issue.json" >"$TMP/extra.json"
if bash "$ROOT/factory/scripts/inspect-inputs.sh" "$TMP/extra.json" "$TMP/catalog.json" >"$TMP/out" 2>"$TMP/err"; then
  fail 'issue snapshot with unknown field unexpectedly succeeded'
fi
assert_eq '' "$(cat "$TMP/out")"
assert_contains 'factory: malformed issue snapshot' "$(cat "$TMP/err")"

mkdir -p "$TMP/bin" "$TMP/leak-test"
real_mktemp="$(command -v mktemp)"
cat >"$TMP/bin/mktemp" <<'SH'
#!/usr/bin/env bash
count=0
[[ -f "$MKTEMP_COUNT" ]] && count="$(cat "$MKTEMP_COUNT")"
count=$((count + 1))
printf '%s\n' "$count" >"$MKTEMP_COUNT"
(( count == 2 )) && exit 1
exec "$REAL_MKTEMP" "$@"
SH
chmod +x "$TMP/bin/mktemp"
if PATH="$TMP/bin:$PATH" TMPDIR="$TMP/leak-test" REAL_MKTEMP="$real_mktemp" MKTEMP_COUNT="$TMP/mktemp-count" \
  bash "$ROOT/factory/scripts/inspect-inputs.sh" "$TMP/issue.json" "$TMP/catalog.json" >"$TMP/out" 2>"$TMP/err"; then
  fail 'second tempfile allocation failure unexpectedly succeeded'
fi
if find "$TMP/leak-test" -type f -print -quit | grep -q .; then
  fail 'first tempfile survived second allocation failure'
fi

printf 'PASS: deterministic initial input inspection\n'
