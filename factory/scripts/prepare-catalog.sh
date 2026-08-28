#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/scripts/lib.sh"

[[ $# -eq 1 ]] || die "usage: ${0##*/} <output-json>"
output=$1
tenant=${PULSE_REGISTRY_TENANT:-}
api_key=${PULSE_REGISTRY_KEY:-}
base_url=${PULSE_REGISTRY_URL:-https://api.pulsemcp.com}
base_url=${base_url%/}
observed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p "$(dirname "$output")"
tmp="$(mktemp "${output}.tmp.XXXXXX")"
pages="$(mktemp "${output}.pages.XXXXXX")"
response="$(mktemp "${output}.response.XXXXXX")"
seen_cursors="$(mktemp "${output}.cursors.XXXXXX")"
seen_next="$(mktemp "${output}.cursors-next.XXXXXX")"
cleanup() { rm -f "$tmp" "$pages" "$response" "$seen_cursors" "$seen_next"; }
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
printf '[]\n' >"$seen_cursors"

if [[ -z "$tenant" || -z "$api_key" ]]; then
  jq -n --arg tenant "$tenant" --arg observed_at "$observed_at" \
    '{status:"skipped", tenant:$tenant, observed_at:$observed_at, servers:[]}' >"$tmp"
  mv "$tmp" "$output"
  cleanup
  trap - EXIT HUP INT TERM
  exit 0
fi

cursor=''
for ((page = 1; page <= 20; page++)); do
  url="$base_url/v0.1/servers?version=latest&limit=50"
  if [[ -n "$cursor" ]]; then
    encoded_cursor="$(jq -rn --arg value "$cursor" '$value | @uri')"
    url="$url&cursor=$encoded_cursor"
  fi
  : >"$response"
  if ! curl -fsS -H "X-Tenant-ID: $tenant" -H "X-API-Key: $api_key" "$url" >"$response"; then
    die "Pulse registry request failed on page $page"
  fi
  if ! jq -e '
      (.servers | type) == "array"
      and (.metadata | type) == "object"
      and ((.metadata.nextCursor | type) == "string" or (.metadata.nextCursor | type) == "null")
      and all(.servers[];
        (.server | type) == "object"
        and (.server.name | type) == "string" and (.server.name | length) > 0
        and ((.server.title | type) == "string" or (.server.title | type) == "null")
        and ((.server.description | type) == "string" or (.server.description | type) == "null")
        and (.remotes | type) == "array"
        and all(.remotes[]; (.transport | type) == "string" and (.url | type) == "string"))
    ' "$response" >/dev/null; then
    die "malformed Pulse registry response on page $page"
  fi
  jq -c '.servers[] | {name:.server.name, title:(.server.title // null), description:(.server.description // null), remotes:[.remotes[] | {transport,url}]}' "$response" >>"$pages"
  next_cursor="$(jq -r '.metadata.nextCursor // empty' "$response")"
  [[ -n "$next_cursor" ]] || break
  jq -e --arg cursor "$next_cursor" 'index($cursor) == null' "$seen_cursors" >/dev/null \
    || die "Pulse registry cursor cycle on page $page"
  (( page < 20 )) || die "Pulse registry pagination exceeded 20 pages"
  jq --arg cursor "$next_cursor" '. + [$cursor]' "$seen_cursors" >"$seen_next"
  mv "$seen_next" "$seen_cursors"
  cursor=$next_cursor
done

jq -s --arg tenant "$tenant" --arg observed_at "$observed_at" '
  reduce .[] as $server ({}; if has($server.name) then . else . + {($server.name): $server} end)
  | [.[]] | sort_by(.name)
  | {status:"ready", tenant:$tenant, observed_at:$observed_at, servers:.}
' "$pages" >"$tmp"
jq -e . "$tmp" >/dev/null
mv "$tmp" "$output"
cleanup
trap - EXIT HUP INT TERM
