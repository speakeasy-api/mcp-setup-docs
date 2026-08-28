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

jq '.comments = [
  {author:"alice",created_at:"2026-08-28T00:00:00Z",body:"Operator evidence before retries."},
  {author:"walker-tx",created_at:"2026-08-28T01:00:00Z",body:("## Guide factory failed\n\n" + ("OLD_FACTORY_HISTORY_CANARY" * 500) + "\n\n**Workflow run:** https://github.com/acme/docs/actions/runs/1\n\nRe-add `guide:draft` to retry after correcting the failure.")},
  {author:"walker-tx",created_at:"2026-08-28T01:10:00Z",body:"## Scope check\n\n- **Outcome:** awaiting_scope\n\nReply with the numbered decisions, then re-add `guide:draft`."},
  {author:"walker-tx",created_at:"2026-08-28T01:20:00Z",body:"## Guide factory failed\n\n- **Outcome:** failed\n\nResolve the findings, then re-add `guide:draft`."},
  {author:"walker-tx",created_at:"2026-08-28T01:30:00Z",body:"## Pipeline review\n\n- **Outcome:** changes_requested\n- **Provider:** Box\n- **Run context:** resumed existing factory branch\n\n### Summary\n\nRevise.\n\nResolve the findings, then re-add `guide:draft`."},
  {author:"bob",created_at:"2026-08-28T02:00:00Z",body:"## Scope check\nOperator evidence using a reserved heading."},
  {author:"walker-tx",created_at:"2026-08-28T03:00:00Z",body:"## Pipeline review\n\n<!-- guide-factory-status -->\n\nLATEST_FACTORY_STATUS_CANARY"}
]' "$TMP/issue.json" >"$TMP/history.json"
bash "$ROOT/factory/scripts/inspect-inputs.sh" "$TMP/history.json" "$TMP/catalog.json" \
  >"$TMP/history.out" 2>"$TMP/history.err"
jq -e '
  [.issue.comments[].body] == [
    "Operator evidence before retries.",
    "## Scope check\nOperator evidence using a reserved heading.",
    "## Pipeline review\n\n<!-- guide-factory-status -->\n\nLATEST_FACTORY_STATUS_CANARY"
  ]
' "$TMP/history.out" >/dev/null || fail 'input inspection did not bound generated factory history'
(( $(wc -c <"$TMP/history.out") < 8192 )) || fail 'bounded input inspection still spills generated history'
if grep -q 'OLD_FACTORY_HISTORY_CANARY' "$TMP/history.out" "$TMP/history.err"; then
  fail 'input inspection retained stale generated factory history'
fi
assert_eq '' "$(cat "$TMP/history.err")"

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
