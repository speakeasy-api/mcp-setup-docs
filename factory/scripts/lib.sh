#!/usr/bin/env bash

# Shared by host-side factory scripts. Never evaluate API or issue data.
die() { printf 'factory: %s\n' "$*" >&2; exit 1; }

require_env() {
  [[ -n "${!1:-}" ]] || die "missing environment variable: $1"
}

write_output() {
  local key=$1 value=$2 marker=FACTORY_OUTPUT_EOF
  while grep -Fqx "$marker" <<<"$value"; do marker="${marker}_X"; done
  printf '%s<<%s\n%s\n%s\n' "$key" "$marker" "$value" "$marker" >>"$GITHUB_OUTPUT"
}

retry_gh() {
  local attempt
  for attempt in 1 2 3; do
    if gh "$@"; then return 0; fi
    (( attempt == 3 )) || sleep "$attempt"
  done
  return 1
}
