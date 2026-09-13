#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
source "$ROOT/factory/tests/test-helper.sh"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
TMP=$(cd "$TMP" && pwd -P)
mkdir -m 700 "$TMP/.factory" "$TMP/helpers"
cp "$ROOT/factory/scripts/"{write-report.sh,validate-report.sh} "$TMP/helpers/"
export FACTORY_REPO_ROOT="$TMP"
report='{"schema_version":1,"outcome":"failed","provider":null,"slug":null,"persona":null,"summary":"quotes '\'' \" $(printf PWNED) 雪","open_questions":[],"blockers":["stopped"],"nits":[],"review_rounds":0,"artifacts":[]}'
write() { bash "$TMP/helpers/write-report.sh" "$1"; }
write "$report"
[[ $(cat "$TMP/.factory/run-report.json") == "$report" ]] || fail 'changed report bytes'
[[ -n $(find "$TMP/.factory/run-report.json" -perm 0600 -print) ]] || fail 'not private'
for validator in 'exit 1' 'exit 127'; do
  printf '#!/bin/bash\necho call >>"%s/calls"\n%s\n' "$TMP" "$validator" >"$TMP/helpers/validate-report.sh"
  : >"$TMP/calls"
  if write "$report" 2>/dev/null; then fail 'validator failure accepted'; fi
  [[ $(wc -l <"$TMP/calls") -eq 1 ]] || fail 'validator retried'
  [[ $(cat "$TMP/.factory/run-report.json") == "$report" ]] || fail 'replaced final on failure'
  [[ ! -e "$TMP/.factory/run-report.json.tmp" ]] || fail 'candidate leaked'
done
cp "$ROOT/factory/scripts/validate-report.sh" "$TMP/helpers/"
if write '{}' 2>/dev/null; then fail 'invalid report accepted'; fi
for name in run-report.json.tmp run-report.json; do
  rm -f "$TMP/.factory/$name"
  ln -s "$TMP/victim" "$TMP/.factory/$name"
  if write "$report" 2>/dev/null; then fail 'symlink accepted'; fi
  [[ ! -e "$TMP/victim" ]] || fail 'symlink followed'
  rm "$TMP/.factory/$name"
done
mkfifo "$TMP/.factory/run-report.json.tmp"
if write "$report" 2>/dev/null; then fail 'FIFO accepted'; fi
rm "$TMP/.factory/run-report.json.tmp"
printf prior >"$TMP/.factory/run-report.json.tmp"
if write "$report" 2>/dev/null; then fail 'existing candidate accepted'; fi
[[ $(cat "$TMP/.factory/run-report.json.tmp") == prior ]] || fail 'existing candidate modified'
rm "$TMP/.factory/run-report.json.tmp"
printf prior >"$TMP/victim"
ln "$TMP/victim" "$TMP/.factory/run-report.json"
if write "$report" 2>/dev/null; then fail 'hardlink accepted'; fi
rm "$TMP/.factory/run-report.json"
mkfifo "$TMP/.factory/run-report.json"
if write "$report" 2>/dev/null; then fail 'final FIFO accepted'; fi
rm "$TMP/.factory/run-report.json"
ln -s "$TMP" "$TMP/alias"
if FACTORY_REPO_ROOT="$TMP/alias" write "$report" 2>/dev/null; then fail 'root symlink accepted'; fi
large=$(printf '%65537s' '')
if write "$large" 2>/dev/null; then fail 'oversized payload accepted'; fi
chmod 755 "$TMP/.factory"
if write "$report" 2>/dev/null; then fail 'public directory accepted'; fi
chmod 700 "$TMP/.factory"
mv "$TMP/.factory" "$TMP/real"; ln -s "$TMP/real" "$TMP/.factory"
if write "$report" 2>/dev/null; then fail 'private symlink accepted'; fi
printf 'PASS: atomic report bytes, permissions, validator failure/no retry, unsafe entries\n'
