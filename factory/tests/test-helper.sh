#!/usr/bin/env bash

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  return 1
}

assert_eq() {
  local expected=$1 actual=$2
  [[ "$actual" == "$expected" ]] || fail "expected [$expected], got [$actual]"
}

assert_contains() {
  local needle=$1 haystack=$2
  [[ "$haystack" == *"$needle"* ]] || fail "expected output to contain [$needle]"
}

make_fake() {
  local name=$1 body=$2
  mkdir -p "$TMP/bin"
  {
    printf '%s\n' '#!/usr/bin/env bash' 'set -euo pipefail'
    printf '%s\n' "$body"
  } >"$TMP/bin/$name"
  chmod +x "$TMP/bin/$name"
}
