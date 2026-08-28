#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat >"$TMP/ready.json" <<'JSON'
{"status":"ready","tenant":"sensitive-tenant","observed_at":"2026-08-28T00:00:00Z","servers":[{"name":"io.example/box","title":"Box","description":"Box content API","remotes":[{"transport":"streamable-http","url":"https://sensitive.example/mcp"}],"private":"sensitive-extra"}]}
JSON

bash "$ROOT/factory/scripts/inspect-catalog.sh" "$TMP/ready.json" >"$TMP/out" 2>"$TMP/err"
jq -e '. == {status:"ready", observed_at:"2026-08-28T00:00:00Z", servers:[{name:"io.example/box", title:"Box", description:"Box content API"}]}' "$TMP/out" >/dev/null
assert_eq '' "$(cat "$TMP/err")"
if grep -Eq 'sensitive-(tenant|extra)|sensitive\.example|streamable-http' "$TMP/out" "$TMP/err"; then
  fail 'catalog inspection leaked excluded fields'
fi

cat >"$TMP/skipped.json" <<'JSON'
{"status":"skipped","tenant":"","observed_at":"2026-08-28T00:00:00Z","servers":[]}
JSON
bash "$ROOT/factory/scripts/inspect-catalog.sh" "$TMP/skipped.json" >"$TMP/out"
jq -e '. == {status:"skipped", observed_at:"2026-08-28T00:00:00Z", servers:[]}' "$TMP/out" >/dev/null

cat >"$TMP/malformed.json" <<'JSON'
{"status":"ready","tenant":"sensitive-malformed","observed_at":"2026-08-28T00:00:00Z","servers":[{"name":"box","title":"Box","description":null,"remotes":null}]}
JSON
if bash "$ROOT/factory/scripts/inspect-catalog.sh" "$TMP/malformed.json" >"$TMP/out" 2>"$TMP/err"; then
  fail 'malformed catalog inspection unexpectedly succeeded'
fi
assert_contains 'factory: malformed catalog snapshot' "$(cat "$TMP/err")"
if grep -q 'sensitive-malformed' "$TMP/out" "$TMP/err"; then
  fail 'malformed catalog inspection leaked input data'
fi

cat "$TMP/malformed.json" "$TMP/skipped.json" >"$TMP/multiple.json"
if bash "$ROOT/factory/scripts/inspect-catalog.sh" "$TMP/multiple.json" >"$TMP/out" 2>"$TMP/err"; then
  fail 'multiple catalog documents unexpectedly succeeded'
fi
assert_eq '' "$(cat "$TMP/out")"
assert_contains 'factory: malformed catalog snapshot' "$(cat "$TMP/err")"
if grep -q 'sensitive-malformed' "$TMP/out" "$TMP/err"; then
  fail 'multiple catalog documents leaked input data'
fi

for timestamp in \
  'not-a-timestamp' \
  '2026-8-28T00:00:00Z' \
  '2026-02-30T00:00:00Z' \
  '2026-08-28T00:00:60Z'; do
  jq --arg timestamp "$timestamp" '.observed_at = $timestamp' "$TMP/skipped.json" >"$TMP/bad-time.json"
  if bash "$ROOT/factory/scripts/inspect-catalog.sh" "$TMP/bad-time.json" >"$TMP/out" 2>"$TMP/err"; then
    fail "malformed catalog timestamp unexpectedly succeeded: $timestamp"
  fi
  assert_eq '' "$(cat "$TMP/out")"
  assert_contains 'factory: malformed catalog snapshot' "$(cat "$TMP/err")"
done

printf 'PASS: deterministic catalog inspection\n'
