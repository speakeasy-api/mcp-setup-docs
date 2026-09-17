#!/usr/bin/env bash
# Historical filename: retained context/report/dossier safety contracts, not dispatch.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
cd "$ROOT"
for retired in factory/tests/fixtures/research/dispatch.runlet factory/tests/fixtures/research/dispatch_diagnostics.rs factory/scripts/read-research-handle.sh go/cmd/prepare-research-prompt; do
  [[ ! -e "$retired" ]] || fail "obsolete dispatch dependency remains: $retired"
done
for contract in context report dossier; do
  grep -Fq "${contract}_contract(&a[1]);" factory/tests/fixtures/research/native_dispatch.rs || fail "missing native safety contract: $contract"
done
printf 'PASS: static retirement and native safety entrypoints (not execution proof)\n'
if [[ ${1:-} == --execute || ${1:-} == --execute-context ]]; then
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  bash "$ROOT/factory/tests/build-native-dispatch.sh" "$tmp/build"
  "$tmp/build/target/debug/native-dispatch" "$ROOT"
elif [[ $# -ne 0 ]]; then
  fail 'usage: test-native-dispatch.sh [--execute|--execute-context]'
fi
