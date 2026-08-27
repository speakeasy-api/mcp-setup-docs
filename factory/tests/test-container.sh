#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
export TMP
trap 'rm -rf "$TMP"; exit 130' INT TERM

test_config_is_pinned() {
  # shellcheck disable=SC1091
  source "$ROOT/factory/config.env"
  assert_eq "0.1.98" "$KIT_VERSION"
  assert_eq "openai/gpt-5.6-sol" "$KIT_MODEL"
  assert_eq "high" "$KIT_REASONING_EFFORT"
  assert_eq "7d14561469ced8af21df1075a9071d04a7bad1b1c5ff90d685142d3231abae85" "$KIT_SHA256"
}

test_release_archive_layout_and_checksum() {
  # shellcheck disable=SC1091
  source "$ROOT/factory/config.env"
  local cache_dir archive entries
  cache_dir="${KIT_ARCHIVE_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/mcp-setup-docs}"
  archive="$cache_dir/kit-v${KIT_VERSION}-x86_64-unknown-linux-gnu.tar.gz"
  mkdir -p "$cache_dir"
  if [[ ! -f "$archive" ]]; then
    curl -fsSLo "$archive.tmp" \
      "https://github.com/speakeasy-api/kit/releases/download/v${KIT_VERSION}/kit-v${KIT_VERSION}-x86_64-unknown-linux-gnu.tar.gz"
    mv "$archive.tmp" "$archive"
  fi
  printf '%s  %s\n' "$KIT_SHA256" "$archive" | sha256sum -c - >/dev/null
  entries="$(tar -tzf "$archive")"
  assert_eq "kit" "$entries"
}

test_run_kit_does_not_forward_github_credentials() {
  export OPENROUTER_API_KEY=or-test GH_TOKEN=forbidden SSH_AUTH_SOCK=/forbidden
  export FACTORY_DOCKER="$TMP/bin/docker"
  # shellcheck disable=SC2016
  make_fake docker 'printf "%s\n" "$@" >"$TMP/docker.args"'
  printf '{}\n' >"$TMP/issue.json"
  printf '{}\n' >"$TMP/catalog.json"
  "$ROOT/factory/scripts/run-kit.sh" "$TMP/issue.json" "$TMP/catalog.json" "$TMP/export"
  local args
  args="$(cat "$TMP/docker.args")"
  assert_contains "OPENROUTER_API_KEY" "$args"
  ! grep -qE 'GH_TOKEN|SSH_AUTH_SOCK' "$TMP/docker.args"
}

test_run_kit_uses_only_allowed_mounts() {
  export OPENROUTER_API_KEY=or-test
  export FACTORY_DOCKER="$TMP/bin/docker"
  # shellcheck disable=SC2016
  make_fake docker 'printf "%s\n" "$@" >"$TMP/docker.args"'
  printf '{}\n' >"$TMP/issue.json"
  printf '{}\n' >"$TMP/catalog.json"
  "$ROOT/factory/scripts/run-kit.sh" "$TMP/issue.json" "$TMP/catalog.json" "$TMP/export"
  local args
  args="$(cat "$TMP/docker.args")"
  assert_contains "$ROOT:/repo:ro" "$args"
  assert_contains "$TMP/issue.json:/input/issue.json:ro" "$args"
  assert_contains "$TMP/catalog.json:/input/catalog.json:ro" "$args"
  assert_contains "$TMP/export:/export" "$args"
  ! grep -qE '/var/run/docker.sock|/[.]git|/[.]ssh|:/root|:/home' "$TMP/docker.args"
}

test_config_is_pinned
test_release_archive_layout_and_checksum
test_run_kit_does_not_forward_github_credentials
test_run_kit_uses_only_allowed_mounts
rm -rf "$TMP"
