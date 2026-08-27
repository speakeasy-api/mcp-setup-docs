#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=${FACTORY_REPO_ROOT:-/repo}
INPUT_ROOT=${FACTORY_INPUT_ROOT:-/input}
WORKSPACE_ROOT=${FACTORY_WORKSPACE_ROOT:-/workspace}
EXPORT_ROOT=${FACTORY_EXPORT_ROOT:-/export}
KIT_HOME=${FACTORY_KIT_HOME:-/tmp/kit-home}

test -r "$INPUT_ROOT/issue.json"
test -r "$INPUT_ROOT/catalog.json"
test -r "$REPO_ROOT/factory/coordinator.md"
rm -rf "$WORKSPACE_ROOT"
mkdir -p "$WORKSPACE_ROOT/.factory" "$KIT_HOME" "$EXPORT_ROOT"
rm -rf "$EXPORT_ROOT/guide" "$EXPORT_ROOT/run-report.json"
cp -a "$REPO_ROOT/." "$WORKSPACE_ROOT/"
rm -rf "$WORKSPACE_ROOT/.git"
export HOME="$KIT_HOME"
KIT_BIN=${KIT_BIN:-kit}
"$KIT_BIN" prompt \
  --root "$WORKSPACE_ROOT" \
  --provider openrouter \
  --model "$KIT_MODEL" \
  --reasoning-effort "$KIT_REASONING_EFFORT" \
  --mcp-config "$WORKSPACE_ROOT/factory/mcp/exa.json" \
  "$(cat "$WORKSPACE_ROOT/factory/coordinator.md")"
test -s "$WORKSPACE_ROOT/.factory/run-report.json"
jq -e '.outcome | IN("converged", "awaiting_scope", "blocked", "failed")' \
  "$WORKSPACE_ROOT/.factory/run-report.json" >/dev/null
outcome="$(jq -r '.outcome' "$WORKSPACE_ROOT/.factory/run-report.json")"
slug="$(jq -r '.slug // empty' "$WORKSPACE_ROOT/.factory/run-report.json")"
if [[ -n "$slug" && "$outcome" != failed ]]; then
  [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]
  test -d "$WORKSPACE_ROOT/guides/$slug"
  cp -a "$WORKSPACE_ROOT/guides/$slug" "$EXPORT_ROOT/guide"
fi
cp "$WORKSPACE_ROOT/.factory/run-report.json" "$EXPORT_ROOT/run-report.json"
