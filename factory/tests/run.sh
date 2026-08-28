#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
status=0

for test_file in "$ROOT"/factory/tests/test-*.sh; do
  [[ "$(basename "$test_file")" == test-helper.sh ]] && continue
  if bash "$test_file" >/dev/null 2>&1; then
    printf 'PASS %s\n' "$(basename "$test_file")"
  else
    printf 'FAIL %s\n' "$(basename "$test_file")"
    status=1
  fi
done

exit "$status"
