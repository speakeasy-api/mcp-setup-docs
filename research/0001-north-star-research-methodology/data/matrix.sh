#!/usr/bin/env bash
# Drives the remaining north-star A/B matrix in 3 parallel lanes.
# Each lane runs its cells sequentially; lanes are staggered so the concurrent
# `git worktree add` calls in run-ab.sh do not contend on the repo lock.
set -uo pipefail

WT=/home/walker/github.com/speakeasy-api/mcp-setup-docs/.claude/worktrees/ns-pi
LOGDIR=/tmp/ns-exp-logs
mkdir -p "$LOGDIR"
cd "$WT"

lane() {
  local name=$1; shift
  local delay=$1; shift
  local log=$LOGDIR/lane-$name.log
  sleep "$delay"
  for cell in "$@"; do
    local slug=${cell%:*} arm=${cell#*:}
    echo "=== [$name] START $slug $arm $(date -u +%H:%M:%SZ) ===" >>"$log"
    tools/experiment/run-ab.sh "$slug" "$arm" >>"$log" 2>&1
    echo "=== [$name] END   $slug $arm rc=$? $(date -u +%H:%M:%SZ) ===" >>"$log"
  done
  echo "=== [$name] LANE COMPLETE $(date -u +%H:%M:%SZ) ===" >>"$log"
}

lane gs-a  0  google-sheets:a google-sheets:a &
lane gs-b  45 google-sheets:b google-sheets:b &
lane mixed 90 github:a github:b hubspot:b &

wait
echo "ALL LANES COMPLETE $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee "$LOGDIR/DONE"
