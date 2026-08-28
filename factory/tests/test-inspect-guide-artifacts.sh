#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
INSPECTOR="$ROOT/factory/scripts/inspect-guide-artifacts.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
REPO="$TMP/repo"
mkdir -p "$REPO/guides/box"

printf '%s\n' dossier >"$REPO/guides/box/research.md"
printf '%s\n' metadata >"$REPO/guides/box/meta.yaml"
FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box research >"$TMP/out"
jq -e '(keys == ["artifacts", "slug", "stage"]) and .slug == "box" and .stage == "research" and .artifacts == ["meta.yaml", "research.md"]' "$TMP/out" >/dev/null

printf '%s\n' partial >"$REPO/guides/box/external.md"
if FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box research >"$TMP/out" 2>"$TMP/err"; then
  fail 'research inspection accepted a partial setup artifact pair'
fi
assert_contains 'factory: incomplete setup artifact pair' "$(cat "$TMP/err")"
rm "$REPO/guides/box/external.md"

if FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box writer >"$TMP/out" 2>"$TMP/err"; then
  fail 'writer inspection accepted missing setup files'
fi
assert_contains 'factory: missing required guide artifact' "$(cat "$TMP/err")"

if FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box revision >"$TMP/out" 2>"$TMP/err"; then
  fail 'revision inspection accepted missing setup files'
fi
assert_contains 'factory: missing required guide artifact' "$(cat "$TMP/err")"

printf '%s\n' external >"$REPO/guides/box/external.md"
printf '%s\n' speakeasy >"$REPO/guides/box/speakeasy.md"
FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box research >"$TMP/out"
jq -e '.stage == "research" and .artifacts == ["external.md", "meta.yaml", "research.md", "speakeasy.md"]' "$TMP/out" >/dev/null
FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box writer >"$TMP/out"
jq -e '(keys == ["artifacts", "slug", "stage"]) and .artifacts == ["external.md", "meta.yaml", "research.md", "speakeasy.md"]' "$TMP/out" >/dev/null
FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box revision >/dev/null

printf '%s\n' unexpected >"$REPO/guides/box/notes.md"
if FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box writer >"$TMP/out" 2>"$TMP/err"; then
  fail 'writer inspection accepted unexpected artifact'
fi
assert_contains 'factory: unexpected guide artifact' "$(cat "$TMP/err")"
rm "$REPO/guides/box/notes.md"

rm "$REPO/guides/box/external.md"
ln -s /etc/passwd "$REPO/guides/box/external.md"
if FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box writer >"$TMP/out" 2>"$TMP/err"; then
  fail 'writer inspection accepted symlinked artifact'
fi
assert_contains 'factory: invalid guide artifact' "$(cat "$TMP/err")"

rm -rf "$REPO/guides/box"
mkdir "$REPO/real-box"
ln -s "$REPO/real-box" "$REPO/guides/box"
if FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box research >"$TMP/out" 2>"$TMP/err"; then
  fail 'inspection accepted symlinked guide directory'
fi
assert_contains 'factory: invalid target guide directory' "$(cat "$TMP/err")"

if FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" '../box' writer >"$TMP/out" 2>"$TMP/err"; then
  fail 'inspection accepted unsafe slug'
fi
assert_contains 'factory: invalid guide slug' "$(cat "$TMP/err")"
if FACTORY_REPO_ROOT="$REPO" bash "$INSPECTOR" box review >"$TMP/out" 2>"$TMP/err"; then
  fail 'inspection accepted invalid stage'
fi
assert_contains 'factory: invalid inspection stage' "$(cat "$TMP/err")"

printf 'PASS: deterministic guide artifact inspection\n'
