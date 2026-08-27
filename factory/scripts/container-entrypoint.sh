#!/usr/bin/env bash
set -euo pipefail

test -r /input/issue.json
test -r /input/catalog.json
test -r /repo/factory/coordinator.md
rm -rf /workspace
mkdir -p /workspace/.factory /tmp/kit-home /export
cp -a /repo/. /workspace/
rm -rf /workspace/.git
export HOME=/tmp/kit-home
KIT_BIN=${KIT_BIN:-kit}
"$KIT_BIN" prompt \
  --root /workspace \
  --provider openrouter \
  --model "$KIT_MODEL" \
  --reasoning-effort "$KIT_REASONING_EFFORT" \
  --mcp-config /workspace/factory/mcp/exa.json \
  "$(cat /workspace/factory/coordinator.md)"
test -s /workspace/.factory/run-report.json
jq -e '.outcome | IN("converged", "awaiting_scope", "blocked", "failed")' \
  /workspace/.factory/run-report.json >/dev/null
outcome="$(jq -r '.outcome' /workspace/.factory/run-report.json)"
slug="$(jq -r '.slug // empty' /workspace/.factory/run-report.json)"
if [[ -n "$slug" && "$outcome" != failed ]]; then
  [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]
  test -d "/workspace/guides/$slug"
  cp -a "/workspace/guides/$slug" /export/guide
fi
cp /workspace/.factory/run-report.json /export/run-report.json
