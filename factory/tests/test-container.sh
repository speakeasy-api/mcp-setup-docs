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

test_dockerfile_builds_static_linter_without_go_in_final_image() {
  local dockerfile
  dockerfile="$(cat "$ROOT/factory/Dockerfile")"
  assert_contains "FROM golang:1.22.12-bookworm@sha256:3d699e4d15d0f8f13c9195c0632a16702b8cbdece2955af1c23b37ae5d55a253 AS lint-builder" "$dockerfile"
  assert_contains "AS lint-builder" "$dockerfile"
  assert_contains "CGO_ENABLED=0" "$dockerfile"
  assert_contains "go build" "$dockerfile"
  assert_contains "./cmd/lint-guide" "$dockerfile"
  assert_contains "COPY --from=lint-builder /out/lint-guide /usr/local/bin/lint-guide" "$dockerfile"
  [[ "$(grep -c '^FROM ' "$ROOT/factory/Dockerfile")" -eq 2 ]] || fail "expected a two-stage image"
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
  assert_contains "/repo:ro" "$args"
  assert_contains "$TMP/issue.json:/input/issue.json:ro" "$args"
  assert_contains "$TMP/catalog.json:/input/catalog.json:ro" "$args"
  assert_contains "$TMP/export:/export" "$args"
  if grep -Fq "$ROOT:/repo:ro" "$TMP/docker.args"; then
    fail "repository root was mounted directly"
  fi
  ! grep -qE '/var/run/docker.sock|/[.]git|/[.]ssh|:/root|:/home' "$TMP/docker.args"
}

test_entrypoint_exports_only_selected_guide_with_mocked_kit() {
  grep -Fq "KIT_BIN=\${KIT_BIN:-kit}" "$ROOT/factory/scripts/container-entrypoint.sh" || fail "KIT_BIN does not default to kit"
  local repo input workspace export_root fake_kit
  repo="$TMP/mock-repo"
  input="$TMP/mock-input"
  workspace="$TMP/mock-workspace"
  export_root="$TMP/mock-export"
  fake_kit="$TMP/bin/fake-kit"
  mkdir -p "$repo/factory" "$input" "$TMP/bin"
  printf 'assignment\n' >"$repo/factory/coordinator.md"
  printf '{}\n' >"$input/issue.json"
  printf '{}\n' >"$input/catalog.json"
  cat >"$fake_kit" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == prompt ]]
mkdir -p "$FACTORY_WORKSPACE_ROOT/guides/acme"
printf 'guide\n' >"$FACTORY_WORKSPACE_ROOT/guides/acme/research.md"
printf 'ignore\n' >"$FACTORY_WORKSPACE_ROOT/not-exported.txt"
cat >"$FACTORY_WORKSPACE_ROOT/.factory/run-report.json" <<'JSON'
{"schema_version":1,"outcome":"awaiting_scope","provider":"Acme","slug":"acme","persona":"it-admin","summary":"Needs scope","open_questions":["Which auth path?"],"blockers":[],"nits":[],"review_rounds":0,"artifacts":["research.md","meta.yaml"]}
JSON
printf 'metadata\n' >"$FACTORY_WORKSPACE_ROOT/guides/acme/meta.yaml"
MOCK
  chmod +x "$fake_kit"

  FACTORY_REPO_ROOT="$repo" \
    FACTORY_INPUT_ROOT="$input" \
    FACTORY_WORKSPACE_ROOT="$workspace" \
    FACTORY_EXPORT_ROOT="$export_root" \
    FACTORY_KIT_HOME="$TMP/kit-home" \
    KIT_BIN="$fake_kit" \
    KIT_MODEL=openai/gpt-5.6-sol \
    KIT_REASONING_EFFORT=high \
    "$ROOT/factory/scripts/container-entrypoint.sh"

  test -f "$export_root/guide/research.md"
  test -f "$export_root/guide/meta.yaml"
  test -f "$export_root/run-report.json"
  test ! -e "$export_root/not-exported.txt"
  assert_eq "3" "$(find "$export_root" -type f | wc -l | tr -d ' ')"
}

test_config_is_pinned
test_dockerfile_builds_static_linter_without_go_in_final_image
test_release_archive_layout_and_checksum
test_run_kit_does_not_forward_github_credentials
test_run_kit_uses_only_allowed_mounts
test_entrypoint_exports_only_selected_guide_with_mocked_kit
rm -rf "$TMP"
