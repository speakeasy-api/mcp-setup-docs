#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
TMP=$(mktemp -d)
trap 'rm -rf -- "$TMP"' EXIT
(cd "$ROOT/go" && GOTOOLCHAIN=go1.27.0 CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go test -c -o "$TMP/ownership.test" ./internal/factorytranscript)
docker run --rm --platform linux/amd64 --tmpfs /fixture --entrypoint /bin/bash \
  -v "$TMP/ownership.test:/ownership.test:ro" mcp-setup-docs-kit:0.2.2 -c '
set -euo pipefail
for mode in root matched; do
  base=/fixture/$mode
  mkdir -p "$base"/{home,workspace,export,host}
  chmod 700 "$base" "$base"/*
  chown -R 1001:1001 "$base"
  script="umask 077; mkdir -p $base/home/.kit/sessions/w-test; printf '\''%s\\n'\'' '\''{\"schema_version\":3,\"session_id\":\"fixture\",\"generation\":1,\"item\":{\"kind\":\"Assistant\",\"parts\":[{\"Text\":{\"text\":\"Public finding\",\"metadata\":{}}}]}}'\'' > $base/home/.kit/sessions/w-test/session.jsonl"
  if [[ $mode == root ]]; then bash -c "$script"; else setpriv --reuid=1001 --regid=1001 --clear-groups bash -c "$script"; fi
  FACTORY_OWNERSHIP_ROOT="$base" FACTORY_OWNERSHIP_MODE="$mode" setpriv --reuid=1001 --regid=1001 --clear-groups /ownership.test -test.run="^TestLinuxOwnership$" -test.v
 done'
