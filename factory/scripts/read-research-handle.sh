#!/usr/bin/env bash
# Read only the exact successful predecessor; never search for another handle.
set -euo pipefail
export LC_ALL=C
ROOT=${FACTORY_REPO_ROOT:-/workspace}
fail() { printf 'factory: unsafe or missing research handle\n' >&2; exit 1; }
[[ $# -eq 2 && $1 =~ ^[1-5]$ && $2 =~ ^[12]$ ]] || fail
[[ "$ROOT" == /* && "$(realpath "$ROOT")" == "$ROOT" ]] || fail
for dir in "$ROOT/.factory" "$ROOT/.factory/research"; do
  [[ ! -L $dir && $(realpath "$dir") == "$dir" && -n $(find "$dir" -maxdepth 0 -type d -uid "$(id -u)" -perm 0700 -print) ]] || fail
done
base="$ROOT/.factory/research/topic-$1"
prior="$base-$(($2 - 1))"
# Stay below the native shell's output budget; reject rather than truncate.
regular() {
  [[ ! -L $1 && -n $(find "$1" -maxdepth 0 -type f -uid "$(id -u)" -perm 0600 -links 1 -print) ]] || fail
  [[ $(wc -c <"$1") -le 65536 ]] || fail
}
for file in "$base-0.handle.json" "$prior.handle.json" "$prior.input.json"; do regular "$file"; done
jq -e --argjson topic "$1" --argjson index "$(($2 - 1))" '
  .topic_id == $topic and (if $index == 0 then true else .follow_up_index == $index end)
' "$prior.input.json" >/dev/null 2>&1 || fail
jq -e -s 'length == 2 and
  (.[0].id | type == "string" and length > 0) and
  .[1].id == .[0].id and
  (.[1].generation | type == "number" and . >= 1 and . == floor) and
  .[1].generation >= .[0].generation and
  (.[1] | has("output"))
' "$base-0.handle.json" "$prior.handle.json" >/dev/null 2>&1 || fail
cat -- "$prior.handle.json"
