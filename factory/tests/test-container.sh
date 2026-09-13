#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
export TMP
export FACTORY_TRANSCRIPT_BUILDER="$ROOT/factory/scripts/build-transcript.sh"
export FACTORY_EVENT_PROJECTOR="$ROOT/factory/scripts/project-kit-events.sh"
export FACTORY_DIAGNOSTICS_BUILDER="$ROOT/factory/scripts/build-diagnostics.sh"
trap 'rm -rf "$TMP"; exit 130' INT TERM

test_config_is_pinned() {
  # shellcheck disable=SC1091
  source "$ROOT/factory/config.env"
  assert_eq "0.1.134" "$KIT_VERSION"
  assert_eq "openai/gpt-6-astra" "$KIT_MODEL"
  assert_eq "medium" "$KIT_REASONING_EFFORT"
  assert_eq "e1262d364187f3c244ec28a099c7cb2e1f2c22b4440f1d8179de34b707d56487" "$KIT_SHA256"
}

test_go_toolchain_is_pinned() {
  grep -Fxq 'go 1.27.0' "$ROOT/go/go.mod" || fail 'module must require Go 1.27.0'
  grep -Fxq 'go = "1.27.0"' "$ROOT/mise.toml" || fail 'mise must pin Go 1.27.0'
}

test_dockerfile_builds_static_linter_without_go_in_final_image() {
  local dockerfile
  dockerfile="$(cat "$ROOT/factory/Dockerfile")"
  assert_contains "FROM golang:1.27.0-bookworm@sha256:ded31c68586d2e49e760acc2e65a884b23d032e9bbbed0ae0c55abd3fcaf4452 AS lint-builder" "$dockerfile"
  assert_contains "AS lint-builder" "$dockerfile"
  assert_contains "FROM debian:trixie-slim@sha256:d7e12182ce18b85b93007c1dedf31f2d29e01ccf3182cc4017c709b6259bc132" "$dockerfile"
  assert_contains "CGO_ENABLED=0" "$dockerfile"
  assert_contains "go build" "$dockerfile"
  assert_contains "./cmd/lint-guide" "$dockerfile"
  assert_contains "./cmd/begin-writing" "$dockerfile"
  assert_contains "./cmd/supervise-factory" "$dockerfile"
  assert_contains "COPY --from=lint-builder /out/begin-writing /usr/local/bin/begin-writing" "$dockerfile"
  assert_contains "COPY --from=lint-builder /out/supervise-factory /usr/local/bin/supervise-factory" "$dockerfile"
  assert_contains "COPY --from=lint-builder /out/lint-guide /usr/local/bin/lint-guide" "$dockerfile"
  assert_contains "COPY factory/scripts/validate-report.sh /usr/local/bin/validate-report" "$dockerfile"
  assert_contains "COPY factory/scripts/project-kit-events.sh /usr/local/bin/project-kit-events" "$dockerfile"
  assert_contains "COPY factory/scripts/build-diagnostics.sh /usr/local/bin/build-diagnostics" "$dockerfile"
  assert_contains "COPY factory/scripts/validate-diagnostics.sh /usr/local/bin/validate-diagnostics" "$dockerfile"
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
  # Fake-only private canaries: both archive mechanisms must omit these exact
  # local evidence/session/credential paths, without excluding reviewed fixtures.
  local -a private_files=(
    .superpowers/sdd/trial/private.log nested/.superpowers/sdd/private.log
    .kit/sessions/w-private/session.jsonl nested/.kit/sessions/private.jsonl
    nested/.env nested/.env.local nested/mise.local.toml
    nested/.worktrees/private/token nested/.claude/worktrees/private/token
    nested/.tmp-trial/private.log .mcp.json nested/.mcp.json
    .claude/settings.local.json nested/.claude/settings.local.json
    local/ssl/private.key nested/local/ssl/private.key
  )
  local path
  for path in "${private_files[@]}"; do
    mkdir -p "$(dirname "$context/$path")"
    printf '%s\n' FAKE_PRIVATE_CANARY > "$context/$path"
  done
  mkdir -p "$context/factory/tests/fixtures/kit-v0.1.134"
  printf '%s\n' REVIEWED_FIXTURE > "$context/factory/tests/fixtures/kit-v0.1.134/session.jsonl"
  cp "$ignore" "$context/.dockerignore"
  tar -cf "$archive" --exclude-from="$ignore" -C "$context" .
  listing="$(tar -tf "$archive")"
  for excluded in .git nested/.git .worktrees .claude/worktrees mise.local.toml \
    .env .env.local pulse-catalog.json tools/pulse-catalog/pulse-catalog.json .tmp-run; do
    if grep -Eq "(^|/)${excluded//./[.]}(/|$)" <<<"$listing"; then
      fail "Docker context contains local-only path: $excluded"
    fi
  done
  for required in go/go.mod go/go.sum go/cmd/ go/internal/ \
    go/cmd/begin-writing/main.go go/cmd/supervise-factory/main.go factory/Dockerfile \
    factory/config.env factory/scripts/validate-report.sh factory/scripts/project-kit-events.sh \
    factory/scripts/build-diagnostics.sh factory/scripts/validate-diagnostics.sh \
    factory/scripts/container-entrypoint.sh; do
    grep -Fq "$required" <<<"$listing" || fail "Docker context excludes required input: $required"
  done
  for path in "${private_files[@]}"; do
    if grep -Fxq "./$path" <<<"$listing"; then
      fail "source archive contains fake private canary: $path"
    fi
  done
  grep -Fq 'factory/tests/fixtures/kit-v0.1.134/session.jsonl' <<<"$listing" \
    || fail 'source archive excluded reviewed session fixture'
  # Exercise Docker's ignore parser too, rather than assuming tar and Docker
  # assign identical meaning to patterns. Scratch build never runs a container.
  printf 'FROM scratch\nCOPY . /snapshot\n' > "$TMP/context.Dockerfile"
  if ! docker build --file "$TMP/context.Dockerfile" \
    --output "type=local,dest=$TMP/docker-output" "$context" > "$TMP/context-build.log" 2>&1; then
    fail 'Docker context exclusion test requires available Docker/BuildKit'
  fi
  for path in "${private_files[@]}" .git nested/.git/config .env .env.local mise.local.toml \
    .worktrees/private/token .claude/worktrees/private/token .tmp-run/token \
    pulse-catalog.json tools/pulse-catalog/pulse-catalog.json; do
    [[ ! -e "$TMP/docker-output/snapshot/$path" ]] || fail "Docker context leaked fake private path: $path"
  done
  for path in go/go.mod go/go.sum go/cmd/begin-writing/main.go \
    go/cmd/supervise-factory/main.go factory/scripts/container-entrypoint.sh \
    factory/tests/fixtures/kit-v0.1.134/session.jsonl; do
    [[ -f "$TMP/docker-output/snapshot/$path" ]] || fail "Docker context excluded required source: $path"
  done
  grep -Fq "'--exclude-from='+root+'/.dockerignore'" "$ROOT/factory/scripts/run-kit.sh" \
    || fail 'source snapshot does not use the tested shared exclusion file'
  # Literal shell source is the build-interface contract under test.
  # shellcheck disable=SC2016
  grep -Fq "[docker, 'build'," "$ROOT/factory/scripts/run-kit.sh" \
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
  # v0.1.134 also ships required license notices. Reject unexpected paths.
  for required in kit LICENSE THIRD_PARTY_NOTICES.md third_party/licenses/; do
    grep -Fxq "$required" <<<"$entries" || fail "archive missing $required"
  done
  if grep -Ev '^(kit|LICENSE|THIRD_PARTY_NOTICES\.md|third_party/licenses/([A-Za-z0-9_.-]+\.(txt|md))?)$' <<<"$entries"; then
    fail 'unexpected release archive path'
  fi
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
[[ $1 == --local && $4 =~ ^[a-f0-9]{32}$ ]]
printf 'validate\nexport=%s\nroot=%s\n' "$2" "$3" >>"$LOCAL_TEST_LOG"
[[ -f "$2/run-report.json" && -d "$2/guide" ]]
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
  local image="$KIT_IMAGE"
  docker build --platform linux/amd64 -f "$ROOT/factory/Dockerfile" \
    --build-arg "KIT_VERSION=$KIT_VERSION" --build-arg "KIT_SHA256=$KIT_SHA256" \
    -t "$image" "$ROOT" >/dev/null
  docker run --rm --platform linux/amd64 --entrypoint /bin/sh \
    -v "$ROOT:/fixture:ro" -w /fixture "$image" -c \
    'set -eu
     if command -v go; then exit 1; fi
     for binary in lint-guide prepare-research-prompt factory-generate; do
       test -x "/usr/local/bin/$binary"
       ldd "/usr/local/bin/$binary" 2>&1 | grep -q "not a dynamic executable"
     done
     for binary in project-kit-events build-diagnostics validate-diagnostics gofmt; do
       test -x "/usr/local/bin/$binary"
     done
     lint-guide guides/asana
     kit --version | grep -Fx "kit 0.1.134"
     kit prompt --help | grep -q -- --request-budget-seconds
     mkdir -p /tmp/generate/go
     cp -a guides /tmp/generate/
     cp go/go.mod go/published_server_refs.txt /tmp/generate/go/
     cd /tmp/generate/go
     factory-generate'
}

# Task 3 moves export/diagnostic authority out of the container. Old successful
# in-container publication assertions are replaced, not treated as valid gates.
test_config_is_pinned
test_go_toolchain_is_pinned
test_dockerfile_builds_static_linter_without_go_in_final_image
test_docker_context_excludes_credentials_and_keeps_build_inputs
test_release_archive_layout_and_checksum
test_local_draft_parsing_and_secret_boundary
test_local_draft_rejects_invalid_arguments_and_slug_mismatch
test_opt_in_final_image
bash "$ROOT/factory/tests/test-export-boundary.sh"
rm -rf "$TMP"
