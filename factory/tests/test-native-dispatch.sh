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

# Explicit execution mode uses an already-built real Runlet library. No download,
# interpreter, provider, native agent, or production orchestration is introduced.
if [[ ${1:-} == --execute ]]; then
  : "${FACTORY_RUNLET_RLIB:?set the existing Runlet 0.5 rlib path}"
  : "${FACTORY_SERDE_JSON_RLIB:?set the matching existing serde_json rlib path}"
  : "${FACTORY_PROMPT_ASSEMBLER:?set the prebuilt prepare-research-prompt path}"
  deps=$(dirname "$FACTORY_RUNLET_RLIB")
  rustc --edition=2024 "$ROOT/factory/tests/fixtures/research/native_dispatch.rs" \
    -L "dependency=$deps" --extern "runlet=$FACTORY_RUNLET_RLIB" \
    --extern "serde_json=$FACTORY_SERDE_JSON_RLIB" -o "$tmp/native-dispatch"
  "$tmp/native-dispatch" "$ROOT" "$FACTORY_PROMPT_ASSEMBLER" "$tmp"
elif [[ $# -ne 0 ]]; then
  fail 'usage: test-native-dispatch.sh [--execute]'
fi
