#!/usr/bin/env bash
set -euo pipefail
# Kit/native descendants must create private records as 0600 and directories
# as 0700 from the outset. cp -a below preserves snapshot/helper modes.
umask 077
# The host owns deadlines, logs, cleanup and later finalization. The controller
# writes its atomic candidate report in /workspace/.factory; it cannot export.
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
# cp -a also copies the public snapshot root mode onto the private mount.
# Restore both private directory boundaries before starting the controller.
chmod 700 "$WORKSPACE_ROOT"
secure_private
export HOME="$KIT_HOME"
KIT_BIN=${KIT_BIN:-/usr/local/bin/kit}
# Trusted host controller owns scheduling and the candidate report; the outer
# supervisor still owns lifecycle termination and frozen export acceptance.
exec "${GUIDE_FACTORY_BIN:-/usr/local/bin/guide-factory}" \
  --workspace "$WORKSPACE_ROOT" \
  --input-root "$INPUT_ROOT" \
  --home "$KIT_HOME" \
  --kit-binary "$KIT_BIN" \
  --provider "${FACTORY_PROVIDER:-openrouter}" \
  --model "$KIT_MODEL" \
  --reasoning-effort "$KIT_REASONING_EFFORT" \
  --request-budget-seconds "${KIT_REQUEST_BUDGET_SECONDS:-300}"
