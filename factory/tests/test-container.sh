#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
export TMP
export FACTORY_EVENT_PROJECTOR="$ROOT/factory/scripts/project-kit-events.sh"
export FACTORY_DIAGNOSTICS_BUILDER="$ROOT/factory/scripts/build-diagnostics.sh"
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
  assert_contains "FROM debian:trixie-slim@sha256:d7e12182ce18b85b93007c1dedf31f2d29e01ccf3182cc4017c709b6259bc132" "$dockerfile"
  assert_contains "CGO_ENABLED=0" "$dockerfile"
  assert_contains "go build" "$dockerfile"
  assert_contains "./cmd/lint-guide" "$dockerfile"
  assert_contains "COPY --from=lint-builder /out/lint-guide /usr/local/bin/lint-guide" "$dockerfile"
  assert_contains "COPY factory/scripts/validate-report.sh /usr/local/bin/validate-report" "$dockerfile"
  assert_contains "COPY factory/scripts/project-kit-events.sh /usr/local/bin/project-kit-events" "$dockerfile"
  assert_contains "COPY factory/scripts/build-diagnostics.sh /usr/local/bin/build-diagnostics" "$dockerfile"
  assert_contains "COPY factory/scripts/validate-diagnostics.sh /usr/local/bin/validate-diagnostics" "$dockerfile"
  # shellcheck disable=SC2016
  grep -Fq 'EVENT_PROJECTOR=${FACTORY_EVENT_PROJECTOR:-/usr/local/bin/project-kit-events}' \
    "$ROOT/factory/scripts/container-entrypoint.sh" || fail 'entrypoint does not default to installed projector'
  # shellcheck disable=SC2016
  grep -Fq 'DIAGNOSTICS_BUILDER=${FACTORY_DIAGNOSTICS_BUILDER:-/usr/local/bin/build-diagnostics}' \
    "$ROOT/factory/scripts/container-entrypoint.sh" || fail 'entrypoint does not default to installed builder'
  [[ "$(grep -c '^FROM ' "$ROOT/factory/Dockerfile")" -eq 2 ]] || fail "expected a two-stage image"
  local image_bin="$TMP/image-helper-bin"
  mkdir -p "$image_bin"
  cp "$ROOT/factory/scripts/build-diagnostics.sh" "$image_bin/build-diagnostics"
  cp "$ROOT/factory/scripts/validate-diagnostics.sh" "$image_bin/validate-diagnostics"
  cp "$ROOT/factory/scripts/validate-report.sh" "$image_bin/validate-report"
  chmod +x "$image_bin"/*
  "$image_bin/build-diagnostics" docker_build 73 - - - "$TMP/image-helper-diagnostics.json" \
    >/dev/null 2>&1 || fail 'installed-layout diagnostics builder is not runnable'
  "$image_bin/validate-diagnostics" "$TMP/image-helper-diagnostics.json" >/dev/null \
    || fail 'installed-layout diagnostics output is invalid'
}

test_docker_context_excludes_credentials_and_keeps_build_inputs() {
  local ignore context archive listing excluded required
  ignore="$ROOT/.dockerignore"
  context="$TMP/docker-context"
  archive="$TMP/docker-context.tar"
  test -f "$ignore" || fail "root .dockerignore does not exist"
  grep -Fqx '.git' "$ignore" || fail ".dockerignore does not exclude root .git"
  mkdir -p "$context/nested/.git" "$context/.worktrees/private" \
    "$context/.claude/worktrees/private" "$context/tools/pulse-catalog" \
    "$context/.tmp-run" "$context/go" "$context/factory/scripts"
  printf '%s\n' 'gitdir: /credential-bearing/worktree' >"$context/.git"
  printf '%s\n' credential-bearing-metadata >"$context/nested/.git/config"
  printf '%s\n' secret >"$context/.worktrees/private/token"
  printf '%s\n' secret >"$context/.claude/worktrees/private/token"
  printf '%s\n' secret >"$context/mise.local.toml"
  printf '%s\n' secret >"$context/.env"
  printf '%s\n' secret >"$context/.env.local"
  printf '%s\n' secret >"$context/pulse-catalog.json"
  printf '%s\n' secret >"$context/tools/pulse-catalog/pulse-catalog.json"
  printf '%s\n' secret >"$context/.tmp-run/token"
  cp "$ROOT/go/go.mod" "$ROOT/go/go.sum" "$context/go/"
  cp -R "$ROOT/go/cmd" "$ROOT/go/internal" "$context/go/"
  cp "$ROOT/factory/Dockerfile" "$ROOT/factory/config.env" "$context/factory/"
  cp "$ROOT/factory/scripts/validate-report.sh" \
    "$ROOT/factory/scripts/project-kit-events.sh" \
    "$ROOT/factory/scripts/build-diagnostics.sh" \
    "$ROOT/factory/scripts/validate-diagnostics.sh" \
    "$ROOT/factory/scripts/container-entrypoint.sh" "$context/factory/scripts/"
  tar -cf "$archive" --exclude-from="$ignore" -C "$context" .
  listing="$(tar -tf "$archive")"
  for excluded in .git nested/.git .worktrees .claude/worktrees mise.local.toml \
    .env .env.local pulse-catalog.json tools/pulse-catalog/pulse-catalog.json .tmp-run; do
    if grep -Eq "(^|/)${excluded//./[.]}(/|$)" <<<"$listing"; then
      fail "Docker context contains local-only path: $excluded"
    fi
  done
  for required in go/go.mod go/go.sum go/cmd/ go/internal/ factory/Dockerfile \
    factory/config.env factory/scripts/validate-report.sh factory/scripts/project-kit-events.sh \
    factory/scripts/build-diagnostics.sh factory/scripts/validate-diagnostics.sh \
    factory/scripts/container-entrypoint.sh; do
    grep -Fq "$required" <<<"$listing" || fail "Docker context excludes required input: $required"
  done
  # Literal shell source is the build-interface contract under test.
  # shellcheck disable=SC2016
  grep -Fq '"$FACTORY_DOCKER" build' "$ROOT/factory/scripts/run-kit.sh" \
    || fail "run-kit no longer builds the factory image"
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

test_startup_failures_remove_stale_diagnostics() {
  local host_export host_status container_export container_status repo input
  host_export="$TMP/stale-host-export"
  mkdir -p "$host_export"
  printf '%s\n' 'SECRET_STALE_HOST_DIAGNOSTIC' >"$host_export/factory-diagnostics.json"

  host_status=0
  OPENROUTER_API_KEY=or-test "$ROOT/factory/scripts/run-kit.sh" \
    "$TMP/missing-issue.json" "$TMP/missing-catalog.json" "$host_export" \
    >/dev/null 2>&1 || host_status=$?
  assert_eq 2 "$host_status"
  test ! -e "$host_export/factory-diagnostics.json" \
    || fail 'run-kit retained stale diagnostics after startup failure'

  repo="$TMP/stale-container-repo"
  input="$TMP/stale-container-input"
  container_export="$TMP/stale-container-export"
  mkdir -p "$repo/factory" "$input" "$container_export"
  printf 'assignment\n' >"$repo/factory/coordinator.md"
  printf '%s\n' 'SECRET_STALE_CONTAINER_DIAGNOSTIC' \
    >"$container_export/factory-diagnostics.json"

  container_status=0
  FACTORY_REPO_ROOT="$repo" FACTORY_INPUT_ROOT="$input" \
    FACTORY_WORKSPACE_ROOT="$TMP/stale-container-workspace" \
    FACTORY_EXPORT_ROOT="$container_export" \
    FACTORY_KIT_HOME="$TMP/stale-container-home" \
    "$ROOT/factory/scripts/container-entrypoint.sh" >/dev/null 2>&1 \
    || container_status=$?
  assert_eq 1 "$container_status"
  test ! -e "$container_export/factory-diagnostics.json" \
    || fail 'entrypoint retained stale diagnostics after startup failure'
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

test_run_kit_reports_safe_failure_diagnostics() {
  export OPENROUTER_API_KEY=or-test FACTORY_DOCKER="$TMP/bin/docker"
  local export_dir
  export_dir="$TMP/error-run-export"
  printf '{}\n' >"$TMP/issue.json"; printf '{}\n' >"$TMP/catalog.json"
  mkdir -p "$export_dir"

  cat >"$TMP/valid-container-diagnostics.json" <<'JSON'
{"schema_version":1,"kind":"guide_factory_diagnostics","status":"failed","stage":"kit_prompt","classification":"kit_prompt_failed","report":{"exists":false,"valid":false,"outcome":null,"review_rounds":null},"events":[{"sequence":1,"call_ref":0,"event":"started","tool":"kit_prompt","operation":"kit_prompt","success":null,"duration_ms":null},{"sequence":2,"call_ref":0,"event":"finished","tool":"kit_prompt","operation":"kit_prompt","success":false,"duration_ms":0}],"kit_errors":{"schema_version":1,"records":[]}}
JSON
  # shellcheck disable=SC2016
  make_fake docker '[[ "${1:-}" == build ]] && exit 0; cp "$TMP/valid-container-diagnostics.json" "$TMP/error-run-export/factory-diagnostics.json"; exit 1'
  if "$ROOT/factory/scripts/run-kit.sh" "$TMP/issue.json" "$TMP/catalog.json" "$export_dir" \
    >"$TMP/out" 2>"$TMP/err"; then
    fail 'run-kit accepted failed container'
  fi
  assert_eq 'factory: diagnostics: stage=kit_prompt classification=kit_prompt_failed events=2' "$(cat "$TMP/err")"
  cmp -s "$TMP/valid-container-diagnostics.json" "$export_dir/factory-diagnostics.json" \
    || fail 'run-kit did not preserve valid diagnostics'

  printf '%s\n' '{"prompt":"SECRET_INVALID_DIAGNOSTIC"}' >"$TMP/invalid-container-diagnostics.json"
  # shellcheck disable=SC2016
  make_fake docker '[[ "${1:-}" == build ]] && exit 0; cp "$TMP/invalid-container-diagnostics.json" "$TMP/error-run-export/factory-diagnostics.json"; exit 0'
  if ! "$ROOT/factory/scripts/run-kit.sh" "$TMP/issue.json" "$TMP/catalog.json" "$export_dir" \
    >"$TMP/out" 2>"$TMP/err"; then
    fail 'run-kit rejected successful container with invalid diagnostics'
  fi
  test ! -e "$export_dir/factory-diagnostics.json" || fail 'run-kit retained invalid diagnostics'
  ! grep -q 'SECRET_INVALID_DIAGNOSTIC' "$TMP/err" || fail 'run-kit logged invalid diagnostics'

  printf '%s\n' 'SECRET_STALE_DIAGNOSTIC' >"$export_dir/factory-diagnostics.json"
  make_fake docker 'exit 73'
  if "$ROOT/factory/scripts/run-kit.sh" "$TMP/issue.json" "$TMP/catalog.json" "$export_dir" \
    >"$TMP/out" 2>"$TMP/err"; then
    fail 'run-kit accepted failed build'
  fi
  jq -e '.stage == "docker_build" and .classification == "docker_build_failed" and .events == [] and .kit_errors.records == []' \
    "$export_dir/factory-diagnostics.json" >/dev/null || fail 'run-kit did not synthesize minimal build diagnostics'
  assert_eq 'factory: diagnostics: stage=docker_build classification=docker_build_failed events=0' "$(cat "$TMP/err")"
  ! grep -q 'SECRET_STALE_DIAGNOSTIC' "$TMP/err" || fail 'run-kit logged stale diagnostics'
}

test_run_kit_preserves_primary_status_when_diagnostics_fail() {
  local bin export_dir status mode builder validator diagnostics_jq
  bin="$TMP/diagnostics-failure-bin"; export_dir="$TMP/diagnostics-failure-export"
  mkdir -p "$bin" "$export_dir"
  printf '{}\n' >"$TMP/helper-issue.json"; printf '{}\n' >"$TMP/helper-catalog.json"
  cat >"$TMP/helper-valid-diagnostics.json" <<'JSON'
{"schema_version":1,"kind":"guide_factory_diagnostics","status":"failed","stage":"container_run","classification":"container_run_failed","report":{"exists":false,"valid":false,"outcome":null,"review_rounds":null},"events":[],"kit_errors":{"schema_version":1,"records":[]}}
JSON
  cat >"$bin/fail-builder" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' '{"raw":"SECRET_HELPER_CANARY"}' >"${6:?}"
printf '%s\n' 'SECRET_HELPER_CANARY' >&2
exit 88
MOCK
  cat >"$bin/fail-validator" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' 'SECRET_HELPER_CANARY' >&2
exit 89
MOCK
  cat >"$bin/fail-jq" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' 'SECRET_HELPER_CANARY' >&2
exit 90
MOCK
  chmod +x "$bin/fail-builder" "$bin/fail-validator" "$bin/fail-jq"

  for mode in builder validator summary; do
    if [[ $mode == builder ]]; then
      make_fake docker 'exit 73'
      builder="$bin/fail-builder"; validator="$ROOT/factory/scripts/validate-diagnostics.sh"; diagnostics_jq=jq
    else
      # shellcheck disable=SC2016
      make_fake docker '[[ "${1:-}" == build ]] && exit 0; cp "$TMP/helper-valid-diagnostics.json" "$TMP/diagnostics-failure-export/factory-diagnostics.json"; exit 73'
      builder="$ROOT/factory/scripts/build-diagnostics.sh"
      if [[ $mode == validator ]]; then
        validator="$bin/fail-validator"; diagnostics_jq=jq
      else
        validator="$ROOT/factory/scripts/validate-diagnostics.sh"; diagnostics_jq="$bin/fail-jq"
      fi
    fi
    if OPENROUTER_API_KEY=or-test FACTORY_DOCKER="$TMP/bin/docker" \
      FACTORY_DIAGNOSTICS_BUILDER="$builder" FACTORY_DIAGNOSTICS_VALIDATOR="$validator" \
      FACTORY_DIAGNOSTICS_JQ="$diagnostics_jq" TMPDIR="$TMP" \
      "$ROOT/factory/scripts/run-kit.sh" "$TMP/helper-issue.json" "$TMP/helper-catalog.json" \
      "$export_dir" >"$TMP/helper-$mode.out" 2>"$TMP/helper-$mode.err"; then
      fail "run-kit accepted $mode helper failure"
    else
      status=$?
    fi
    assert_eq 73 "$status"
    test ! -e "$export_dir/factory-diagnostics.json" || fail "run-kit retained $mode helper output"
    if grep -q 'SECRET_HELPER_CANARY' "$TMP/helper-$mode.out" "$TMP/helper-$mode.err"; then
      fail "run-kit logged unsafe $mode helper output"
    fi
    [[ -z "$(find "$TMP" -maxdepth 1 -type d -name 'mcp-setup-docs-source.*' -print -quit)" ]] \
      || fail "run-kit leaked snapshot after $mode helper failure"
  done
}

test_run_kit_synthesizes_setup_failure_diagnostics() {
  local bin export_dir mode status expected real_realpath
  bin="$TMP/setup-failure-bin"; export_dir="$TMP/setup-failure-export"
  mkdir -p "$bin" "$export_dir"
  printf '{}\n' >"$TMP/setup-issue.json"; printf '{}\n' >"$TMP/setup-catalog.json"
  cat >"$bin/mktemp" <<'MOCK'
#!/usr/bin/env bash
if [[ "${SETUP_FAILURE_MODE:-}" == create && "$*" == *mcp-setup-docs-source* ]]; then exit 73; fi
exec /usr/bin/mktemp "$@"
MOCK
  cat >"$bin/realpath" <<'MOCK'
#!/usr/bin/env bash
if [[ "${SETUP_FAILURE_MODE:-}" == normalize && "${1:-}" == *mcp-setup-docs-source* ]]; then exit 74; fi
exec "$REAL_REALPATH" "$@"
MOCK
  chmod +x "$bin/mktemp" "$bin/realpath"
  real_realpath=$(command -v realpath)
  # shellcheck disable=SC2016
  make_fake docker 'printf "%s\n" invoked >"$TMP/setup-docker-invoked"'

  for mode in create normalize; do
    expected=73; [[ $mode == normalize ]] && expected=74
    rm -f "$TMP/setup-docker-invoked"
    if OPENROUTER_API_KEY=or-test FACTORY_DOCKER="$TMP/bin/docker" \
      SETUP_FAILURE_MODE="$mode" REAL_REALPATH="$real_realpath" PATH="$bin:$PATH" TMPDIR="$TMP" \
      "$ROOT/factory/scripts/run-kit.sh" "$TMP/setup-issue.json" "$TMP/setup-catalog.json" \
      "$export_dir" >"$TMP/setup-$mode.out" 2>"$TMP/setup-$mode.err"; then
      fail "run-kit accepted snapshot $mode failure"
    else
      status=$?
    fi
    assert_eq "$expected" "$status"
    test ! -e "$TMP/setup-docker-invoked" || fail "run-kit invoked Docker after snapshot $mode failure"
    "$ROOT/factory/scripts/validate-diagnostics.sh" "$export_dir/factory-diagnostics.json" >/dev/null \
      || fail "run-kit did not validate snapshot $mode diagnostics"
    jq -e '.stage == "docker_build" and .classification == "docker_build_failed" and .events == []' \
      "$export_dir/factory-diagnostics.json" >/dev/null || fail "wrong snapshot $mode diagnostics"
    [[ -z "$(find "$TMP" -maxdepth 1 -type d -name 'mcp-setup-docs-source.*' -print -quit)" ]] \
      || fail "run-kit leaked snapshot after $mode failure"
  done
}

  export OPENROUTER_API_KEY=or-test
test_run_kit_uses_only_allowed_mounts() {
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

test_run_kit_source_snapshot_applies_dockerignore() {
  local repo bin recorded snapshot excluded status
  repo="$TMP/snapshot-repo"
  bin="$TMP/snapshot-bin"
  recorded="$TMP/source-volume"
  mkdir -p "$repo/factory/scripts" "$repo/nested/.git" \
    "$repo/tools/pulse-catalog" "$repo/.tmp-run" \
    "$repo/.worktrees/private" "$repo/.claude/worktrees/private" "$bin"
  cp "$ROOT/.dockerignore" "$repo/.dockerignore"
  cp "$ROOT/factory/config.env" "$repo/factory/config.env"
  cp "$ROOT/factory/Dockerfile" "$repo/factory/Dockerfile"
  cp "$ROOT/factory/scripts/run-kit.sh" "$repo/factory/scripts/run-kit.sh"
  mkdir -p "$repo/factory/schemas"
  cp "$ROOT/factory/scripts/build-diagnostics.sh" \
    "$ROOT/factory/scripts/validate-diagnostics.sh" \
    "$ROOT/factory/scripts/validate-report.sh" "$repo/factory/scripts/"
  cp "$ROOT/factory/schemas/factory-diagnostics.schema.json" "$repo/factory/schemas/"
  printf '%s\n' modified-working-source >"$repo/working-change.txt"
  printf '%s\n' gitdir-private >"$repo/.git"
  printf '%s\n' nested-git-private >"$repo/nested/.git/config"
  for excluded in .env .env.local mise.local.toml pulse-catalog.json; do
    printf '%s\n' private >"$repo/$excluded"
  done
  printf '%s\n' private >"$repo/tools/pulse-catalog/pulse-catalog.json"
  printf '%s\n' private >"$repo/.tmp-run/value"
  printf '%s\n' private >"$repo/.worktrees/private/value"
  printf '%s\n' private >"$repo/.claude/worktrees/private/value"
  ln -s working-change.txt "$repo/kept-link"
  ln -s working-change.txt "$repo/.env.link"

  cat >"$bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == build ]] && exit 0
[[ "$1" == run ]] || exit 91
shift
source_volume=
while [[ $# -gt 0 ]]; do
  if [[ "$1" == --volume && "$2" == *:/repo:ro ]]; then
    source_volume=${2%:/repo:ro}
    break
  fi
  shift
done
[[ -n "$source_volume" && "$source_volume" != "$SNAPSHOT_REPO" ]] || exit 92
printf '%s\n' "$source_volume" >"$SNAPSHOT_RECORDED"
for path in .git nested/.git .env .env.local .env.link mise.local.toml \
  pulse-catalog.json tools/pulse-catalog/pulse-catalog.json .tmp-run \
  .worktrees .claude/worktrees; do
  [[ ! -e "$source_volume/$path" && ! -L "$source_volume/$path" ]] || exit 93
done
[[ -f "$source_volume/working-change.txt" ]] || exit 94
grep -Fqx modified-working-source "$source_volume/working-change.txt" || exit 95
[[ -f "$source_volume/factory/scripts/run-kit.sh" ]] || exit 96
[[ -L "$source_volume/kept-link" ]] || exit 97
[[ "$(readlink "$source_volume/kept-link")" == working-change.txt ]] || exit 98
MOCK
  chmod +x "$bin/docker"
  printf '{}\n' >"$TMP/snapshot-issue.json"
  printf '{}\n' >"$TMP/snapshot-catalog.json"
  OPENROUTER_API_KEY=or-test FACTORY_DOCKER="$bin/docker" \
    SNAPSHOT_REPO="$repo" SNAPSHOT_RECORDED="$recorded" \
    TMPDIR="$TMP" "$repo/factory/scripts/run-kit.sh" \
    "$TMP/snapshot-issue.json" "$TMP/snapshot-catalog.json" "$TMP/snapshot-export"
  snapshot="$(cat "$recorded")"
  [[ ! -e "$snapshot" ]] || fail 'run-kit leaked its source snapshot'

  cat >"$bin/tar" <<'MOCK'
#!/usr/bin/env bash
exit 73
MOCK
  chmod +x "$bin/tar"
  rm -f "$recorded"
  if OPENROUTER_API_KEY=or-test FACTORY_DOCKER="$bin/docker" \
    SNAPSHOT_REPO="$repo" SNAPSHOT_RECORDED="$recorded" \
    PATH="$bin:$PATH" TMPDIR="$TMP" "$repo/factory/scripts/run-kit.sh" \
    "$TMP/snapshot-issue.json" "$TMP/snapshot-catalog.json" \
    "$TMP/snapshot-export" >"$TMP/tar-failure.out" 2>"$TMP/tar-failure.err"; then
    fail 'run-kit continued after source archive failure'
  else
    status=$?
  fi
  assert_eq 73 "$status"
  "$repo/factory/scripts/validate-diagnostics.sh" "$TMP/snapshot-export/factory-diagnostics.json" >/dev/null \
    || fail 'run-kit did not export valid source archive diagnostics'
  jq -e '.stage == "docker_build" and .classification == "docker_build_failed" and .events == []' \
    "$TMP/snapshot-export/factory-diagnostics.json" >/dev/null || fail 'wrong source archive diagnostics'
  [[ ! -e "$recorded" ]] || fail 'run-kit invoked Docker after source archive failure'
  [[ -z "$(find "$TMP" -maxdepth 1 -type d -name 'mcp-setup-docs-source.*' -print -quit)" ]] \
    || fail 'run-kit leaked a failed source snapshot'
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
    FACTORY_REPORT_VALIDATOR="$ROOT/factory/scripts/validate-report.sh" \
    KIT_MODEL=openai/gpt-5.6-sol \
    KIT_REASONING_EFFORT=high \
    "$ROOT/factory/scripts/container-entrypoint.sh"

  "$ROOT/factory/scripts/validate-report.sh" "$workspace/.factory/run-report.json"
  test -f "$export_root/guide/research.md"
  test -f "$export_root/guide/meta.yaml"
  test -f "$export_root/run-report.json"
  test ! -e "$export_root/not-exported.txt"
  assert_eq "3" "$(find "$export_root" -type f | wc -l | tr -d ' ')"
}

test_entrypoint_rejects_invalid_report() {
  local repo input workspace export_root fake_kit
  repo="$TMP/invalid-repo"; input="$TMP/invalid-input"
  workspace="$TMP/invalid-workspace"; export_root="$TMP/invalid-export"
  fake_kit="$TMP/bin/invalid-kit"
  mkdir -p "$repo/factory" "$input" "$TMP/bin"
  printf 'assignment\n' >"$repo/factory/coordinator.md"
  printf '{}\n' >"$input/issue.json"; printf '{}\n' >"$input/catalog.json"
  cat >"$fake_kit" <<'MOCK'
#!/usr/bin/env bash
mkdir -p "$FACTORY_WORKSPACE_ROOT/.factory"
case "$MOCK_REPORT_KIND" in
  missing) printf '%s\n' '{"outcome":"converged","slug":"acme"}' ;;
  cross-field) printf '%s\n' '{"schema_version":1,"outcome":"converged","provider":"Acme","slug":"acme","persona":"it-admin","summary":"invalid","open_questions":[],"blockers":["still blocked"],"nits":[],"review_rounds":1,"artifacts":["research.md","meta.yaml","external.md","speakeasy.md"]}' ;;
esac >"$FACTORY_WORKSPACE_ROOT/.factory/run-report.json"
MOCK
  chmod +x "$fake_kit"
  local kind
  for kind in missing cross-field; do
    if MOCK_REPORT_KIND="$kind" FACTORY_REPO_ROOT="$repo" FACTORY_INPUT_ROOT="$input" \
      FACTORY_WORKSPACE_ROOT="$workspace-$kind" FACTORY_EXPORT_ROOT="$export_root-$kind" \
      FACTORY_KIT_HOME="$TMP/invalid-home-$kind" KIT_BIN="$fake_kit" \
      FACTORY_REPORT_VALIDATOR="$ROOT/factory/scripts/validate-report.sh" \
      KIT_MODEL=openai/gpt-5.6-sol KIT_REASONING_EFFORT=high \
      "$ROOT/factory/scripts/container-entrypoint.sh" >/dev/null 2>&1; then
      fail "entrypoint accepted invalid report: $kind"
    fi
    test ! -e "$export_root-$kind/run-report.json"
  done
}

test_entrypoint_exports_safe_kit_failure_diagnostics() {
  local repo input workspace export_root fake_kit
  repo="$TMP/error-repo"; input="$TMP/error-input"
  workspace="$TMP/error-workspace"; export_root="$TMP/error-export"
  fake_kit="$TMP/bin/error-kit"
  mkdir -p "$repo/factory" "$input" "$TMP/bin"
  printf 'assignment\n' >"$repo/factory/coordinator.md"
  printf '{}\n' >"$input/issue.json"; printf '{}\n' >"$input/catalog.json"
  cat >"$fake_kit" <<'MOCK'
#!/usr/bin/env bash
marker=$(printf '\001kit-runtime\001')
printf '%s\n' 'ordinary Kit diagnostic' >&2
printf '%s%s\n' "$marker" '{"event":"child_started","call":"SECRET_RAW_CALL","tool":"shell","summary":"printf SECRET_RUNTIME_SUMMARY","at":8}' >&2
printf '%s%s\n' "$marker" '{"event":"child_finished","call":"SECRET_RAW_CALL","tool":"shell","ok":false,"summary":"SECRET_RUNTIME_RESULT","millis":42}' >&2
mkdir -p "$HOME/errors/s-test"
cat >"$HOME/errors/s-test/e-test.json" <<'JSON'
{"schema_version":2,"event_id":"e-test","occurred_at_ms":1,"kit_version":"0.1.98","session_id":"s-test","surface":"prompt","kind":"provider","code":"provider_error","message":"sensitive-provider-body","prompt":{"code":"sensitive-code","provider":"sensitive-provider"},"url":"https://sensitive.example","diagnostics":null}
JSON
cat >"$HOME/errors/s-test/e-transport.json" <<'JSON'
{"schema_version":2,"event_id":"e-transport","occurred_at_ms":2,"kit_version":"0.1.98","session_id":"s-test","surface":"prompt","kind":"provider","code":"request_transport","message":"sensitive-transport-message","diagnostics":{"stage":"request","retryable":true,"attempt":2,"response_request_id":"req_safe-123","reqwest":{"timeout":false,"connect":true,"request":true,"body":false,"decode":false},"source_chain":[{"code":"sensitive-source-code","provider":"sensitive-source-provider"}],"source_chain_unknown":true,"source_chain_truncated":false}}
JSON
exit 1
MOCK
  chmod +x "$fake_kit"
  if FACTORY_REPO_ROOT="$repo" FACTORY_INPUT_ROOT="$input" \
    FACTORY_WORKSPACE_ROOT="$workspace" FACTORY_EXPORT_ROOT="$export_root" \
    FACTORY_KIT_HOME="$TMP/error-home" KIT_BIN="$fake_kit" \
    FACTORY_REPORT_VALIDATOR="$ROOT/factory/scripts/validate-report.sh" \
    FACTORY_EVENT_PROJECTOR="$ROOT/factory/scripts/project-kit-events.sh" \
    FACTORY_DIAGNOSTICS_BUILDER="$ROOT/factory/scripts/build-diagnostics.sh" \
    KIT_MODEL=openai/gpt-5.6-sol KIT_REASONING_EFFORT=high \
    "$ROOT/factory/scripts/container-entrypoint.sh" >/dev/null 2>"$TMP/entrypoint.err"; then
    fail 'entrypoint accepted failed Kit process'
  fi
  jq -e '
    (.records | length) == 2
    and any(.records[]; .kind == "provider" and .code == "provider_error" and .diagnostics == null)
    and any(.records[];
      .code == "request_transport"
      and .diagnostics == {stage:"request",retryable:true,attempt:2,response_request_id:"req_safe-123",reqwest:{timeout:false,connect:true,request:true,body:false,decode:false},source_chain_unknown:true,source_chain_truncated:false})
  ' "$export_root/kit-error-summary.json" >/dev/null
  if grep -Eq 'sensitive-provider-body|sensitive-code|sensitive-provider|sensitive-transport-message|sensitive-source|sensitive\.example' "$export_root/kit-error-summary.json"; then
    fail 'Kit failure diagnostics leaked unsafe fields'
  fi
  assert_contains 'ordinary Kit diagnostic' "$(cat "$TMP/entrypoint.err")"
  if grep -Eq 'SECRET_RAW_CALL|SECRET_RUNTIME_SUMMARY|SECRET_RUNTIME_RESULT' "$TMP/entrypoint.err" "$export_root/factory-diagnostics.json"; then
    fail 'entrypoint exposed raw runtime event data'
  fi
  jq -e '
    .stage == "kit_prompt" and .classification == "kit_fatal"
    and (.events | length) == 4
    and .events[0] == {sequence:1,call_ref:0,event:"started",tool:"kit_prompt",operation:"kit_prompt",success:null,duration_ms:null}
    and .events[1].operation == "unrecognized"
    and .events[2].success == false and .events[2].duration_ms == 42
    and .events[3] == {sequence:4,call_ref:0,event:"finished",tool:"kit_prompt",operation:"kit_prompt",success:false,duration_ms:0}
    and (.kit_errors.records | length) == 2
  ' "$export_root/factory-diagnostics.json" >/dev/null || fail 'entrypoint did not export safe failure diagnostics'
}

test_entrypoint_handles_invalid_projection_and_missing_report() {
  local repo input fake_kit kind workspace export_root
  repo="$TMP/runtime-repo"; input="$TMP/runtime-input"; fake_kit="$TMP/bin/runtime-kit"
  mkdir -p "$repo/factory" "$input" "$TMP/bin"
  printf 'assignment\n' >"$repo/factory/coordinator.md"
  printf '{}\n' >"$input/issue.json"; printf '{}\n' >"$input/catalog.json"

  for kind in malformed unknown; do
    workspace="$TMP/runtime-workspace-$kind"; export_root="$TMP/runtime-export-$kind"
    cat >"$fake_kit" <<'MOCK'
#!/usr/bin/env bash
marker=$(printf '\001kit-runtime\001')
printf '%s%s\n' "$marker" "${RUNTIME_BAD_LINE}" >&2
printf '%s\n' 'ordinary diagnostic after bad event' >&2
exit 1
MOCK
    chmod +x "$fake_kit"
    if [[ $kind == malformed ]]; then
      bad_line='{not-json SECRET_MALFORMED_CANARY'
    else
      bad_line='{"event":"future_event","summary":"SECRET_UNKNOWN_CANARY"}'
    fi
    if RUNTIME_BAD_LINE="$bad_line" FACTORY_REPO_ROOT="$repo" FACTORY_INPUT_ROOT="$input" \
      FACTORY_WORKSPACE_ROOT="$workspace" FACTORY_EXPORT_ROOT="$export_root" \
      FACTORY_KIT_HOME="$TMP/runtime-home-$kind" KIT_BIN="$fake_kit" \
      FACTORY_REPORT_VALIDATOR="$ROOT/factory/scripts/validate-report.sh" \
      FACTORY_EVENT_PROJECTOR="$ROOT/factory/scripts/project-kit-events.sh" \
      FACTORY_DIAGNOSTICS_BUILDER="$ROOT/factory/scripts/build-diagnostics.sh" \
      KIT_MODEL=openai/gpt-5.6-sol KIT_REASONING_EFFORT=high \
      "$ROOT/factory/scripts/container-entrypoint.sh" >/dev/null 2>"$TMP/runtime-$kind.err"; then
      fail "entrypoint accepted $kind runtime event"
    fi
    test ! -e "$export_root/factory-diagnostics.json" || fail "entrypoint retained $kind diagnostics"
    assert_contains 'ordinary diagnostic after bad event' "$(cat "$TMP/runtime-$kind.err")"
    assert_contains 'factory: invalid Kit runtime event' "$(cat "$TMP/runtime-$kind.err")"
    if grep -Eq 'SECRET_MALFORMED_CANARY|SECRET_UNKNOWN_CANARY' "$TMP/runtime-$kind.err"; then
      fail "entrypoint logged $kind marked runtime input"
    fi
  done

  workspace="$TMP/runtime-workspace-valid"; export_root="$TMP/runtime-export-valid"
  cat >"$fake_kit" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
marker=$(printf '\001kit-runtime\001')
printf '%s%s\n' "$marker" '{"event":"future_event","summary":"SECRET_VALID_REPORT_CANARY"}' >&2
printf '%s\n' 'ordinary diagnostic after rejected projection' >&2
mkdir -p "$FACTORY_WORKSPACE_ROOT/.factory" "$FACTORY_WORKSPACE_ROOT/guides/acme"
printf 'research\n' >"$FACTORY_WORKSPACE_ROOT/guides/acme/research.md"
printf 'metadata\n' >"$FACTORY_WORKSPACE_ROOT/guides/acme/meta.yaml"
cat >"$FACTORY_WORKSPACE_ROOT/.factory/run-report.json" <<'JSON'
{"schema_version":1,"outcome":"awaiting_scope","provider":"Acme","slug":"acme","persona":"it-admin","summary":"Needs scope","open_questions":["Which auth path?"],"blockers":[],"nits":[],"review_rounds":0,"artifacts":["research.md","meta.yaml"]}
JSON
MOCK
  chmod +x "$fake_kit"
  if ! FACTORY_REPO_ROOT="$repo" FACTORY_INPUT_ROOT="$input" \
    FACTORY_WORKSPACE_ROOT="$workspace" FACTORY_EXPORT_ROOT="$export_root" \
    FACTORY_KIT_HOME="$TMP/runtime-home-valid" KIT_BIN="$fake_kit" \
    FACTORY_REPORT_VALIDATOR="$ROOT/factory/scripts/validate-report.sh" \
    FACTORY_EVENT_PROJECTOR="$ROOT/factory/scripts/project-kit-events.sh" \
    FACTORY_DIAGNOSTICS_BUILDER="$ROOT/factory/scripts/build-diagnostics.sh" \
    KIT_MODEL=openai/gpt-5.6-sol KIT_REASONING_EFFORT=high \
    "$ROOT/factory/scripts/container-entrypoint.sh" >"$TMP/runtime-valid.out" 2>"$TMP/runtime-valid.err"; then
    fail 'entrypoint let rejected diagnostics replace a valid Kit report'
  fi
  test -f "$export_root/run-report.json" || fail 'entrypoint lost valid report after rejected diagnostics'
  test -f "$export_root/guide/research.md" || fail 'entrypoint lost valid guide after rejected diagnostics'
  test ! -e "$export_root/factory-diagnostics.json" || fail 'entrypoint retained rejected diagnostics for valid report'
  assert_contains 'ordinary diagnostic after rejected projection' "$(cat "$TMP/runtime-valid.err")"
  assert_contains 'factory: invalid Kit runtime event' "$(cat "$TMP/runtime-valid.err")"
  if grep -Rq 'SECRET_VALID_REPORT_CANARY' "$TMP/runtime-valid.err" "$export_root"; then
    fail 'entrypoint exposed rejected marked runtime input for valid report'
  fi

  cat >"$fake_kit" <<'MOCK'
#!/usr/bin/env bash
[[ "${KIT_RUNTIME_EVENTS:-}" == 1 ]] || exit 91
exit 0
MOCK
  chmod +x "$fake_kit"
  export_root="$TMP/runtime-export-missing"; workspace="$TMP/runtime-workspace-missing"
  if FACTORY_REPO_ROOT="$repo" FACTORY_INPUT_ROOT="$input" \
    FACTORY_WORKSPACE_ROOT="$workspace" FACTORY_EXPORT_ROOT="$export_root" \
    FACTORY_KIT_HOME="$TMP/runtime-home-missing" KIT_BIN="$fake_kit" \
    FACTORY_REPORT_VALIDATOR="$ROOT/factory/scripts/validate-report.sh" \
    FACTORY_EVENT_PROJECTOR="$ROOT/factory/scripts/project-kit-events.sh" \
    FACTORY_DIAGNOSTICS_BUILDER="$ROOT/factory/scripts/build-diagnostics.sh" \
    KIT_MODEL=openai/gpt-5.6-sol KIT_REASONING_EFFORT=high \
    "$ROOT/factory/scripts/container-entrypoint.sh" >/dev/null 2>"$TMP/runtime-missing.err"; then
    fail 'entrypoint accepted zero-exit Kit without a report'
  fi
  jq -e '.stage == "report_validation" and .classification == "missing_run_report" and .events[-1].success == true' \
    "$export_root/factory-diagnostics.json" >/dev/null || fail 'entrypoint lost missing-report classification'
}

test_local_draft_parsing_and_secret_boundary() {
  local bin log tmpdir issue_path
  bin="$TMP/local-bin"; log="$TMP/local.log"; tmpdir="$TMP/local tmp"
  issue_path="$TMP/issue input.json"
  mkdir -p "$bin" "$tmpdir"
  cat >"$bin/run-kit" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'run\nissue=%s\ncatalog=%s\nexport=%s\n' "$1" "$2" "$3" >>"$LOCAL_TEST_LOG"
for name in GH_TOKEN GITHUB_TOKEN PULSE_REGISTRY_KEY PULSE_REGISTRY_TENANT PULSE_REGISTRY_URL SSH_AUTH_SOCK SSH_AGENT_PID; do
  [[ -z "${!name:-}" ]] || exit 91
done
if [[ -z "${LOCAL_TEST_EXPECT_PATH:-}" ]]; then
  jq -e '.schema_version == 1 and .repository == "local" and .issue.number == 0 and .issue.title == "Draft Acme" and .issue.body == "Body text\n\nRequested guide slug: acme." and .issue.url == "local://guide-draft/acme" and .issue.author == "local" and .comments == []' "$1" >/dev/null
fi
jq -e '.status == "skipped" and .servers == []' "$2" >/dev/null
mkdir -p "$3/guide"
printf '%s\n' '{"slug":"acme","outcome":"converged"}' >"$3/run-report.json"
MOCK
  cat >"$bin/validate" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'validate\nexport=%s\nroot=%s\n' "$1" "$2" >>"$LOCAL_TEST_LOG"
[[ -f "$1/run-report.json" && -d "$1/guide" ]]
MOCK
  chmod +x "$bin/run-kit" "$bin/validate"

  LOCAL_TEST_LOG="$log" TMPDIR="$tmpdir" \
    GH_TOKEN=host-gh GITHUB_TOKEN=host-github PULSE_REGISTRY_KEY=host-pulse \
    PULSE_REGISTRY_TENANT=host-tenant PULSE_REGISTRY_URL=https://secret.invalid \
    SSH_AUTH_SOCK=/tmp/host-agent.sock SSH_AGENT_PID=4242 \
    FACTORY_LOCAL_RUN_KIT="$bin/run-kit" FACTORY_LOCAL_VALIDATE="$bin/validate" \
    "$ROOT/factory/scripts/local-draft.sh" --title 'Draft Acme' --body 'Body text' --slug acme
  assert_eq $'run\nvalidate' "$(grep -E '^(run|validate)$' "$log")"
  [[ -z "$(find "$tmpdir" -mindepth 1 -maxdepth 1 -print -quit)" ]] || fail 'local draft leaked temporary files'

  jq -n '{schema_version:1,repository:"local",issue:{number:0,title:"Issue path",body:"Body",url:"local://issue",author:"local"},comments:[]}' >"$issue_path"
  : >"$log"
  LOCAL_TEST_LOG="$log" TMPDIR="$tmpdir" \
    FACTORY_LOCAL_RUN_KIT="$bin/run-kit" FACTORY_LOCAL_VALIDATE="$bin/validate" \
    LOCAL_TEST_EXPECT_PATH=1 "$ROOT/factory/scripts/local-draft.sh" -- "$issue_path"
  assert_contains "issue=$issue_path" "$(cat "$log")"
}

test_local_draft_rejects_invalid_arguments_and_slug_mismatch() {
  local bin tmpdir
  bin="$TMP/reject-bin"; tmpdir="$TMP/reject-tmp"
  mkdir -p "$bin" "$tmpdir"
  cat >"$bin/run-kit" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$3/guide"
printf '%s\n' '{"slug":"other","outcome":"converged"}' >"$3/run-report.json"
MOCK
  cat >"$bin/validate" <<'MOCK'
#!/usr/bin/env bash
exit 99
MOCK
  chmod +x "$bin/run-kit" "$bin/validate"

  local args
  for args in \
    '--title T --body B' \
    '--title T --body B --slug Not-Canonical' \
    '--title T --title U --body B --slug acme' \
    '--title T --body B --slug acme issue.json' \
    '--unknown value'; do
    # These fixtures intentionally contain no shell metacharacters or whitespace-bearing values.
    # shellcheck disable=SC2086
    if FACTORY_LOCAL_RUN_KIT="$bin/run-kit" FACTORY_LOCAL_VALIDATE="$bin/validate" \
      "$ROOT/factory/scripts/local-draft.sh" $args >/dev/null 2>&1; then
      fail "local draft accepted invalid arguments: $args"
    fi
  done
  if TMPDIR="$tmpdir" FACTORY_LOCAL_RUN_KIT="$bin/run-kit" FACTORY_LOCAL_VALIDATE="$bin/validate" \
    "$ROOT/factory/scripts/local-draft.sh" --title T --body B --slug acme >/dev/null 2>&1; then
    fail 'local draft accepted a report selecting another slug'
  fi
  [[ -z "$(find "$tmpdir" -mindepth 1 -maxdepth 1 -print -quit)" ]] || fail 'failed local draft leaked temporary files'
}

test_opt_in_final_image() {
  [[ "${FACTORY_TEST_IMAGE:-0}" == 1 ]] || return 0
  # shellcheck disable=SC1091
  source "$ROOT/factory/config.env"
  local image="mcp-setup-docs-kit:test"
  docker build --platform linux/amd64 -f "$ROOT/factory/Dockerfile" \
    --build-arg "KIT_VERSION=$KIT_VERSION" --build-arg "KIT_SHA256=$KIT_SHA256" \
    -t "$image" "$ROOT" >/dev/null
  docker run --rm --platform linux/amd64 --entrypoint /bin/sh \
    -v "$ROOT:/fixture:ro" -w /fixture "$image" -c \
    '! command -v go && test -x /usr/local/bin/lint-guide && test -x /usr/local/bin/project-kit-events && test -x /usr/local/bin/build-diagnostics && test -x /usr/local/bin/validate-diagnostics && ldd /usr/local/bin/lint-guide 2>&1 | grep -q "not a dynamic executable" && /usr/local/bin/lint-guide guides/asana'
}

test_config_is_pinned
test_dockerfile_builds_static_linter_without_go_in_final_image
test_docker_context_excludes_credentials_and_keeps_build_inputs
test_release_archive_layout_and_checksum
test_startup_failures_remove_stale_diagnostics
test_run_kit_does_not_forward_github_credentials
test_run_kit_reports_safe_failure_diagnostics
test_run_kit_preserves_primary_status_when_diagnostics_fail
test_run_kit_synthesizes_setup_failure_diagnostics
test_run_kit_uses_only_allowed_mounts
test_run_kit_source_snapshot_applies_dockerignore
test_entrypoint_exports_only_selected_guide_with_mocked_kit
test_entrypoint_rejects_invalid_report
test_entrypoint_exports_safe_kit_failure_diagnostics
test_entrypoint_handles_invalid_projection_and_missing_report
test_local_draft_parsing_and_secret_boundary
test_local_draft_rejects_invalid_arguments_and_slug_mismatch
test_opt_in_final_image
rm -rf "$TMP"
