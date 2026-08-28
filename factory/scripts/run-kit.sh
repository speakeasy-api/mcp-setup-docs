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
rm -rf "$export_dir/guide" "$export_dir/run-report.json"

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

"$FACTORY_DOCKER" build \
  --file "$ROOT/factory/Dockerfile" \
  --build-arg "KIT_VERSION=$KIT_VERSION" \
  --build-arg "KIT_SHA256=$KIT_SHA256" \
  --tag "$KIT_IMAGE" \
  "$ROOT"

"$FACTORY_DOCKER" run --rm \
  --env OPENROUTER_API_KEY \
  --env "KIT_MODEL=$KIT_MODEL" \
  --env "KIT_REASONING_EFFORT=$KIT_REASONING_EFFORT" \
  --volume "$source_snapshot:/repo:ro" \
  --volume "$issue_json:/input/issue.json:ro" \
  --volume "$catalog_json:/input/catalog.json:ro" \
  --volume "$export_dir:/export" \
  "$KIT_IMAGE"
