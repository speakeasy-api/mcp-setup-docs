#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
tmp=$(mktemp -d); tmp=$(cd "$tmp" && pwd -P); trap 'rm -rf "$tmp"' EXIT
export FACTORY_REPO_ROOT=$tmp
mkdir -m 700 "$tmp/.factory" "$tmp/.factory/research"
base=$tmp/.factory/research/topic-1
read_handle() { bash "$ROOT/factory/scripts/read-research-handle.sh" "$@"; }
reject() { if read_handle "$@" >"$tmp/out" 2>/dev/null; then echo 'unsafe handle accepted' >&2; exit 1; fi; [[ ! -s $tmp/out ]]; }
reject 1 1
jq -n '{id:"session-1",name:"topic-1",generation:1,output:("x" * 36000),updates:{items:[{opaque:{extra:[1,2,3]}}],truncated:false}}' >"$base-0.handle.json"
printf '{"topic_id":1}' >"$base-0.input.json"
chmod 600 "$base-0."*.json
read_handle 1 1 >"$tmp/out"; cmp "$base-0.handle.json" "$tmp/out"
jq '.generation=2 | .updates.items += [{new:"opaque"}]' "$base-0.handle.json" >"$base-1.handle.json"
printf '{"topic_id":1,"follow_up_index":1}' >"$base-1.input.json"
chmod 600 "$base-1."*.json
read_handle 1 2 >"$tmp/out"; cmp "$base-1.handle.json" "$tmp/out"
reject 1 0; reject '../1' 1; reject 1 1.5; reject 2 1
cp "$base-1.handle.json" "$tmp/good"
printf '{' >"$base-1.handle.json"; reject 1 2
cp "$tmp/good" "$base-1.handle.json"
jq '.id="foreign-session"' "$tmp/good" >"$base-1.handle.json"; reject 1 2
cp "$tmp/good" "$base-1.handle.json"
printf '{"topic_id":2,"follow_up_index":1}' >"$base-1.input.json"; reject 1 2
printf '{"topic_id":1,"follow_up_index":1}' >"$base-1.input.json"
jq '.output=("x" * 65537)' "$tmp/good" >"$base-1.handle.json"; reject 1 2
cp "$tmp/good" "$base-1.handle.json"
chmod 755 "$tmp/.factory/research"; reject 1 2; chmod 700 "$tmp/.factory/research"
chmod 644 "$base-1.handle.json"; reject 1 2; chmod 600 "$base-1.handle.json"
ln "$base-1.handle.json" "$tmp/link"; reject 1 2; rm "$tmp/link"
rm "$base-1.handle.json"; ln -s "$tmp/good" "$base-1.handle.json"; reject 1 2
rm "$base-1.handle.json"; reject 1 2
mv "$tmp/.factory/research" "$tmp/elsewhere"; ln -s "$tmp/elsewhere" "$tmp/.factory/research"; reject 1 1
printf 'PASS: exact private handle read, opaque bytes and unsafe/missing records\n'
