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
mkdir -p "$export_dir"

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
  --volume "$ROOT:/repo:ro" \
  --volume "$issue_json:/input/issue.json:ro" \
  --volume "$catalog_json:/input/catalog.json:ro" \
  --volume "$export_dir:/export" \
  "$KIT_IMAGE"
