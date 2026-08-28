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

source_snapshot="$(mktemp -d "${TMPDIR:-/tmp}/mcp-setup-docs-source.XXXXXX")"
source_snapshot="$(realpath "$source_snapshot")"
cleanup() {
  exit_code=$?
  trap - EXIT
  rm -rf "$source_snapshot"
  exit "$exit_code"
}
trap cleanup EXIT
[[ -r "$ROOT/.dockerignore" ]] || { printf 'root .dockerignore is not readable\n' >&2; exit 1; }
tar -cf - --exclude-from="$ROOT/.dockerignore" -C "$ROOT" . \
  | tar -xf - -C "$source_snapshot"

DIAGNOSTICS_BUILDER="$ROOT/factory/scripts/build-diagnostics.sh"
DIAGNOSTICS_VALIDATOR="$ROOT/factory/scripts/validate-diagnostics.sh"
DIAGNOSTICS="$export_dir/factory-diagnostics.json"
print_diagnostics_summary() {
  local stage classification events
  stage=$(jq -r '.stage' "$DIAGNOSTICS")
  classification=$(jq -r '.classification' "$DIAGNOSTICS")
  events=$(jq -r '.events | length' "$DIAGNOSTICS")
  printf 'factory: diagnostics: stage=%s classification=%s events=%s\n' \
    "$stage" "$classification" "$events" >&2
}

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
  "$DIAGNOSTICS_BUILDER" docker_build "$build_status" - - - "$DIAGNOSTICS"
  print_diagnostics_summary
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
    if "$DIAGNOSTICS_VALIDATOR" "$DIAGNOSTICS" >/dev/null 2>&1; then
      print_diagnostics_summary
    else
      rm -f -- "$DIAGNOSTICS"
    fi
  else
    "$DIAGNOSTICS_BUILDER" container_run "$container_status" - - - "$DIAGNOSTICS"
    print_diagnostics_summary
  fi
  exit "$container_status"
fi
if [[ -e $DIAGNOSTICS ]]; then
  if "$DIAGNOSTICS_VALIDATOR" "$DIAGNOSTICS" >/dev/null 2>&1; then
    print_diagnostics_summary
  else
    rm -f -- "$DIAGNOSTICS"
  fi
fi
