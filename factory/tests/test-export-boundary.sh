#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
export TMP
trap 'rm -rf "$TMP"; exit 130' INT TERM

test_launcher_canonicalizes_paths_and_mounts_gitless_snapshot() {
  mkdir -p "$TMP/caller" "$TMP/caller/export/guide"
  printf '{}\n' >"$TMP/caller/issue.json"
  printf '{}\n' >"$TMP/caller/catalog.json"
  printf 'stale\n' >"$TMP/caller/export/guide/stale.txt"
  printf 'stale\n' >"$TMP/caller/export/run-report.json"
  export OPENROUTER_API_KEY=or-test FACTORY_DOCKER="$TMP/bin/docker"
  # shellcheck disable=SC2016
  make_fake docker 'printf "%s\n" "$@" >"$TMP/docker.args"; if [[ "${1:-}" == run ]]; then for arg in "$@"; do case "$arg" in *:/repo:ro) snapshot=${arg%:/repo:ro}; [[ "$snapshot" == /* ]]; [[ -r "$snapshot/factory/Dockerfile" ]]; [[ -z "$(find "$snapshot" -name .git -print -quit)" ]]; printf "%s\n" "$snapshot" >"$TMP/snapshot.path" ;; esac; done; fi'

  (cd "$TMP/caller" && "$ROOT/factory/scripts/run-kit.sh" issue.json catalog.json export)

  local args snapshot
  args="$(cat "$TMP/docker.args")"
  snapshot="$(cat "$TMP/snapshot.path")"
  assert_contains "$TMP/caller/issue.json:/input/issue.json:ro" "$args"
  assert_contains "$TMP/caller/catalog.json:/input/catalog.json:ro" "$args"
  assert_contains "$TMP/caller/export:/export" "$args"
  [[ "$snapshot" != "$ROOT" ]] || fail "repository root was mounted instead of a snapshot"
  [[ ! -e "$snapshot" ]] || fail "source snapshot survived launcher cleanup"
  [[ ! -e "$TMP/caller/export/guide" ]] || fail "stale guide survived launcher cleanup"
  [[ ! -e "$TMP/caller/export/run-report.json" ]] || fail "stale report survived launcher cleanup"
}

prepare_entrypoint_fixture() {
  rm -rf "$TMP/entry"
  mkdir -p "$TMP/entry/repo/factory/mcp" \
    "$TMP/entry/repo/guides/alpha" "$TMP/entry/repo/guides/beta" \
    "$TMP/entry/input" "$TMP/entry/export"
  printf 'coordinate\n' >"$TMP/entry/repo/factory/coordinator.md"
  printf '{}\n' >"$TMP/entry/repo/factory/mcp/exa.json"
  printf 'alpha\n' >"$TMP/entry/repo/guides/alpha/content.txt"
  printf 'beta\n' >"$TMP/entry/repo/guides/beta/content.txt"
  local guide artifact
  for guide in alpha beta; do
    for artifact in research.md meta.yaml external.md speakeasy.md; do
      printf 'fixture\n' >"$TMP/entry/repo/guides/$guide/$artifact"
    done
  done
  printf '{}\n' >"$TMP/entry/input/issue.json"
  printf '{}\n' >"$TMP/entry/input/catalog.json"
  # shellcheck disable=SC2016
  make_fake kit 'cat "$FAKE_REPORT" >"$FACTORY_WORKSPACE_ROOT/.factory/run-report.json"'
  export KIT_BIN="$TMP/bin/kit" KIT_MODEL=model KIT_REASONING_EFFORT=high
  export FACTORY_REPO_ROOT="$TMP/entry/repo"
  export FACTORY_INPUT_ROOT="$TMP/entry/input"
  export FACTORY_WORKSPACE_ROOT="$TMP/entry/workspace"
  export FACTORY_EXPORT_ROOT="$TMP/entry/export"
  export FACTORY_KIT_HOME="$TMP/entry/home"
  export FACTORY_REPORT_VALIDATOR="$ROOT/factory/scripts/validate-report.sh"
}

run_entrypoint() {
  printf '%s\n' "$1" >"$TMP/entry/report.json"
  export FAKE_REPORT="$TMP/entry/report.json"
  "$ROOT/factory/scripts/container-entrypoint.sh"
}

test_entrypoint_rejects_invalid_outcome() {
  prepare_entrypoint_fixture
  mkdir -p "$FACTORY_EXPORT_ROOT/guide"
  printf 'stale\n' >"$FACTORY_EXPORT_ROOT/guide/stale.txt"
  printf 'stale\n' >"$FACTORY_EXPORT_ROOT/run-report.json"
  if run_entrypoint '{"schema_version":1,"outcome":"unknown","provider":"Alpha","slug":"alpha","persona":"it-admin","summary":"bad","open_questions":[],"blockers":[],"nits":[],"review_rounds":0,"artifacts":[]}' >/dev/null 2>&1; then
    fail "invalid outcome was accepted"
  fi
  [[ ! -e "$FACTORY_EXPORT_ROOT/run-report.json" ]] || fail "invalid report was exported"
  [[ ! -e "$FACTORY_EXPORT_ROOT/guide" ]] || fail "guide was exported for invalid outcome"
}

test_entrypoint_rejects_invalid_slug() {
  prepare_entrypoint_fixture
  if run_entrypoint '{"schema_version":1,"outcome":"converged","provider":"Alpha","slug":"../alpha","persona":"it-admin","summary":"bad","open_questions":[],"blockers":[],"nits":[],"review_rounds":1,"artifacts":["research.md","meta.yaml","external.md","speakeasy.md"]}' >/dev/null 2>&1; then
    fail "invalid slug was accepted"
  fi
  [[ ! -e "$FACTORY_EXPORT_ROOT/run-report.json" ]] || fail "invalid report was exported"
  [[ ! -e "$FACTORY_EXPORT_ROOT/guide" ]] || fail "guide was exported for invalid slug"
}

test_failed_outcome_clears_prior_guide() {
  prepare_entrypoint_fixture
  mkdir -p "$FACTORY_EXPORT_ROOT/guide"
  printf 'stale\n' >"$FACTORY_EXPORT_ROOT/guide/stale.txt"
  printf 'stale\n' >"$FACTORY_EXPORT_ROOT/run-report.json"
  run_entrypoint '{"schema_version":1,"outcome":"failed","provider":"Alpha","slug":"alpha","persona":"it-admin","summary":"failed","open_questions":[],"blockers":["failure"],"nits":[],"review_rounds":0,"artifacts":[]}'
  [[ ! -e "$FACTORY_EXPORT_ROOT/guide" ]] || fail "failed outcome retained prior guide"
  assert_eq "failed" "$(jq -r .outcome "$FACTORY_EXPORT_ROOT/run-report.json")"
}

test_null_identity_outcome_clears_prior_guide() {
  prepare_entrypoint_fixture
  mkdir -p "$FACTORY_EXPORT_ROOT/guide"
  printf 'stale\n' >"$FACTORY_EXPORT_ROOT/guide/stale.txt"
  run_entrypoint '{"schema_version":1,"outcome":"blocked","provider":null,"slug":null,"persona":null,"summary":"identity blocked","open_questions":[],"blockers":["missing identity"],"nits":[],"review_rounds":0,"artifacts":[]}'
  [[ ! -e "$FACTORY_EXPORT_ROOT/guide" ]] || fail "null-identity outcome retained prior guide"
  assert_eq "blocked" "$(jq -r .outcome "$FACTORY_EXPORT_ROOT/run-report.json")"
}

test_selected_guide_replaces_export_without_nesting() {
  prepare_entrypoint_fixture
  run_entrypoint '{"schema_version":1,"outcome":"converged","provider":"Alpha","slug":"alpha","persona":"it-admin","summary":"complete","open_questions":[],"blockers":[],"nits":[],"review_rounds":1,"artifacts":["research.md","meta.yaml","external.md","speakeasy.md"]}'
  assert_eq "alpha" "$(cat "$FACTORY_EXPORT_ROOT/guide/content.txt")"
  [[ ! -e "$FACTORY_EXPORT_ROOT/guide/alpha" ]] || fail "selected guide was nested"
  printf 'stale\n' >"$FACTORY_EXPORT_ROOT/guide/stale.txt"
  run_entrypoint '{"schema_version":1,"outcome":"converged","provider":"Beta","slug":"beta","persona":"it-admin","summary":"complete","open_questions":[],"blockers":[],"nits":[],"review_rounds":1,"artifacts":["research.md","meta.yaml","external.md","speakeasy.md"]}'
  assert_eq "beta" "$(cat "$FACTORY_EXPORT_ROOT/guide/content.txt")"
  assert_eq "beta" "$(jq -r .slug "$FACTORY_EXPORT_ROOT/run-report.json")"
  [[ ! -e "$FACTORY_EXPORT_ROOT/guide/stale.txt" ]] || fail "repeated export retained stale guide content"
  [[ ! -e "$FACTORY_EXPORT_ROOT/guide/beta" ]] || fail "replacement guide was nested"
}

test_launcher_canonicalizes_paths_and_mounts_gitless_snapshot
test_entrypoint_rejects_invalid_outcome
test_entrypoint_rejects_invalid_slug
test_failed_outcome_clears_prior_guide
test_null_identity_outcome_clears_prior_guide
test_selected_guide_replaces_export_without_nesting
rm -rf "$TMP"
