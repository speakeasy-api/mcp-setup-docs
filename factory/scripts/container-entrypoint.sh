#!/usr/bin/env bash
set -euo pipefail
# The host owns deadlines, logs, cleanup and later finalization. The model writes
# only its atomic candidate report in /workspace/.factory; it cannot export.
REPO_ROOT=${FACTORY_REPO_ROOT:-/repo}
INPUT_ROOT=${FACTORY_INPUT_ROOT:-/input}
WORKSPACE_ROOT=${FACTORY_WORKSPACE_ROOT:-/workspace}
KIT_HOME=${FACTORY_KIT_HOME:-/kit-home}
test -r "$INPUT_ROOT/issue.json"
test -r "$INPUT_ROOT/catalog.json"
test -r "$REPO_ROOT/factory/coordinator.md"
# These are fresh mount roots. Never unlink or recursively remove a mount path.
fail_private() { printf 'factory: unsafe private workspace directory\n' >&2; exit 1; }
[[ -d "$WORKSPACE_ROOT" && "$(realpath "$WORKSPACE_ROOT")" == "$WORKSPACE_ROOT" ]] || fail_private
# Reject a snapshot symlink/special entry before cp can touch the destination.
if [[ -e "$REPO_ROOT/.factory" || -L "$REPO_ROOT/.factory" ]]; then
  [[ -d "$REPO_ROOT/.factory" && ! -L "$REPO_ROOT/.factory" ]] || fail_private
fi
secure_private() {
  local private="$WORKSPACE_ROOT/.factory"
  if [[ ! -e "$private" && ! -L "$private" ]]; then mkdir -m 700 "$private"; fi
  [[ -d "$private" && ! -L "$private" && "$(realpath "$private")" == "$private" ]] || fail_private
  chmod 700 "$private"
}
secure_private
mkdir -p "$KIT_HOME"
cp -a "$REPO_ROOT/." "$WORKSPACE_ROOT/"
# cp -a can restore snapshot directory permissions; establish the guard again.
secure_private
export HOME="$KIT_HOME"
KIT_BIN=${KIT_BIN:-kit}
exec "$KIT_BIN" prompt \
  --root "$WORKSPACE_ROOT" \
  --provider openrouter \
  --model "$KIT_MODEL" \
  --reasoning-effort "$KIT_REASONING_EFFORT" \
  --request-budget-seconds "${KIT_REQUEST_BUDGET_SECONDS:-300}" \
  --mcp-config "$WORKSPACE_ROOT/factory/mcp/exa.json" \
  "$(cat "$WORKSPACE_ROOT/factory/coordinator.md")"
