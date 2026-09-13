#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# Static contract only: no provider, native runtime, persistence or cleanup proof.
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
fixture="$ROOT/factory/tests/fixtures/research/dispatch.runlet"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
awk '/^# Native dispatch contract/{copy=1} copy && /^```$/{exit} copy{print}' "$ROOT/factory/coordinator.md" >"$tmp/embedded"
cmp "$fixture" "$tmp/embedded" || fail 'production dispatch differs from reviewed fixture'
for phrase in \
  'boundary {' 'catch err' \
  'assignment.topic_id == input.topic' \
  'assignment.follow_up_index == input.index' \
  'after checked' 'after savedInput' 'after savedPrompt' \
  'subagent({prompt: prepared.stdout})' \
  'prompt({subagent: input.existingHandle, prompt: prepared.stdout})' \
  'path:base + ".report.md", content:child.output' \
  'path:base + ".handle.json", content:json.encode(child)' \
  'after savedReport' 'after savedHandle' \
  'status:"failed"' 'test ! -L'; do
  grep -Fq "$phrase" "$fixture" || fail "missing dispatch dependency: $phrase"
done
for forbidden in 'input.command' 'model:' 'harness:' 'generation +' 'text.trim(prepared.stdout)' 'text.trim(child.output)'; do
  ! grep -Fq "$forbidden" "$fixture" || fail "unsafe dispatch contract: $forbidden"
done
printf 'PASS: static exact dispatch contract (not native execution proof)\n'

# Execution mode builds the actual release-locked crate, never a static substitute.
if [[ ${1:-} == --execute ]]; then
  : "${FACTORY_PROMPT_ASSEMBLER:?set the prebuilt prepare-research-prompt path}"
  bash "$ROOT/factory/tests/build-native-dispatch.sh" "$tmp/build"
  "$tmp/build/target/debug/native-dispatch" "$ROOT" "$FACTORY_PROMPT_ASSEMBLER" "$tmp"
elif [[ ${1:-} == --execute-context ]]; then
  bash "$ROOT/factory/tests/build-native-dispatch.sh" "$tmp/build"
  "$tmp/build/target/debug/native-dispatch" "$ROOT" --context
elif [[ $# -ne 0 ]]; then
  fail 'usage: test-native-dispatch.sh [--execute|--execute-context]'
fi
