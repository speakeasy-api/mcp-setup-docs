#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  printf 'usage: %s <issue-json> <catalog-json> <export-dir>\n' "${0##*/}" >&2
  exit 2
fi

issue_json=$1
catalog_json=$2
export_dir=$3
[[ -r "$issue_json" ]] || { printf 'issue JSON is not readable: %s\n' "$issue_json" >&2; exit 2; }
[[ -r "$catalog_json" ]] || { printf 'catalog JSON is not readable: %s\n' "$catalog_json" >&2; exit 2; }
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/config.env"
FACTORY_DOCKER=${FACTORY_DOCKER:-docker}
issue_json="$(realpath "$issue_json")"
catalog_json="$(realpath "$catalog_json")"
mkdir -p "$export_dir"
export_dir="$(realpath "$export_dir")"
rm -rf "$export_dir/guide" "$export_dir/run-report.json" \
  "$export_dir/kit-error-summary.json" "$export_dir/factory-diagnostics.json"

DIAGNOSTICS_BUILDER=${FACTORY_DIAGNOSTICS_BUILDER:-$ROOT/factory/scripts/build-diagnostics.sh}
DIAGNOSTICS_VALIDATOR=${FACTORY_DIAGNOSTICS_VALIDATOR:-$ROOT/factory/scripts/validate-diagnostics.sh}
DIAGNOSTICS_JQ=${FACTORY_DIAGNOSTICS_JQ:-jq}
DIAGNOSTICS="$export_dir/factory-diagnostics.json"
source_snapshot=
cleanup() {
  exit_code=$?
  trap - EXIT
  [[ -z $source_snapshot ]] || rm -rf -- "$source_snapshot" 2>/dev/null || true
  exit "$exit_code"
}
trap cleanup EXIT

diagnostics_unavailable() {
  rm -rf -- "$DIAGNOSTICS" 2>/dev/null || true
  printf '%s\n' 'factory: diagnostics unavailable' >&2
}

print_diagnostics_summary() {
  local summary stage classification events
  summary=$("$DIAGNOSTICS_JQ" -r '[.stage,.classification,(.events | length)] | @tsv' \
    "$DIAGNOSTICS" 2>/dev/null) || return 1
  IFS=$'\t' read -r stage classification events <<<"$summary" || return 1
  [[ -n $stage && -n $classification && $events =~ ^[0-9]+$ ]] || return 1
  printf 'factory: diagnostics: stage=%s classification=%s events=%s\n' \
    "$stage" "$classification" "$events" >&2
}

retain_diagnostics() {
  if ! "$DIAGNOSTICS_VALIDATOR" "$DIAGNOSTICS" >/dev/null 2>&1 \
    || ! print_diagnostics_summary; then
    diagnostics_unavailable
    return 1
  fi
}

build_minimal_diagnostics() {
  local stage=$1 status=$2
  rm -rf -- "$DIAGNOSTICS" 2>/dev/null || true
  if ! "$DIAGNOSTICS_BUILDER" "$stage" "$status" - - - "$DIAGNOSTICS" >/dev/null 2>&1; then
    diagnostics_unavailable
    return 1
  fi
  retain_diagnostics || return 1
}

if source_snapshot=$(mktemp -d "${TMPDIR:-/tmp}/mcp-setup-docs-source.XXXXXX"); then
  :
else
  setup_status=$?
  build_minimal_diagnostics docker_build "$setup_status" || true
  exit "$setup_status"
fi
if normalized_snapshot=$(realpath "$source_snapshot"); then
  source_snapshot=$normalized_snapshot
else
  setup_status=$?
  build_minimal_diagnostics docker_build "$setup_status" || true
  exit "$setup_status"
fi
if [[ ! -r "$ROOT/.dockerignore" ]]; then
  build_minimal_diagnostics docker_build 1 || true
  exit 1
fi
if tar -cf - --exclude-from="$ROOT/.dockerignore" -C "$ROOT" . \
  | tar -xf - -C "$source_snapshot"; then
  :
else
  setup_status=$?
  build_minimal_diagnostics docker_build "$setup_status" || true
  exit "$setup_status"
fi

if "$FACTORY_DOCKER" build \
  --file "$ROOT/factory/Dockerfile" \
  --build-arg "KIT_VERSION=$KIT_VERSION" \
  --build-arg "KIT_SHA256=$KIT_SHA256" \
  --tag "$KIT_IMAGE" \
  "$ROOT"; then
  build_status=0
else
  build_status=$?
fi
if ((build_status != 0)); then
  build_minimal_diagnostics docker_build "$build_status" || true
  exit "$build_status"
fi

if "$FACTORY_DOCKER" run --rm \
  --env OPENROUTER_API_KEY \
  --env "KIT_MODEL=$KIT_MODEL" \
  --env "KIT_REASONING_EFFORT=$KIT_REASONING_EFFORT" \
  --volume "$source_snapshot:/repo:ro" \
  --volume "$issue_json:/input/issue.json:ro" \
  --volume "$catalog_json:/input/catalog.json:ro" \
  --volume "$export_dir:/export" \
  "$KIT_IMAGE"; then
  container_status=0
else
  container_status=$?
fi
if ((container_status != 0)); then
  if [[ -e $DIAGNOSTICS ]]; then
    retain_diagnostics || true
  else
    build_minimal_diagnostics container_run "$container_status" || true
  fi
  exit "$container_status"
fi
if [[ -e $DIAGNOSTICS ]]; then
  retain_diagnostics || true
fi
