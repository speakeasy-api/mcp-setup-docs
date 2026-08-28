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
rm -rf "$export_dir/guide" "$export_dir/run-report.json" "$export_dir/kit-error-summary.json"

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

if ! "$FACTORY_DOCKER" run --rm \
  --env OPENROUTER_API_KEY \
  --env "KIT_MODEL=$KIT_MODEL" \
  --env "KIT_REASONING_EFFORT=$KIT_REASONING_EFFORT" \
  --volume "$source_snapshot:/repo:ro" \
  --volume "$issue_json:/input/issue.json:ro" \
  --volume "$catalog_json:/input/catalog.json:ro" \
  --volume "$export_dir:/export" \
  "$KIT_IMAGE"; then
  if [[ -f "$export_dir/kit-error-summary.json" ]] && jq -e '
    (keys | sort) == (["records","schema_version"] | sort)
    and .schema_version == 1
    and (.records | type) == "array"
    and all(.records[];
      (keys | sort) == (["code","diagnostics","kind","schema_version"] | sort)
      and .schema_version == 2
      and (.kind | type) == "string" and (.kind | test("^[a-z0-9_]{1,64}$"))
      and (.code | type) == "string" and (.code | test("^[a-z0-9_]{1,64}$"))
      and (.diagnostics == null or (
        (.diagnostics | type) == "object"
        and (.diagnostics | keys | sort) == (["attempt","reqwest","response_request_id","retryable","source_chain_truncated","source_chain_unknown","stage"] | sort)
        and (.diagnostics.stage | IN("request","stream"))
        and (.diagnostics.retryable | type) == "boolean"
        and (.diagnostics.attempt | type) == "number" and (.diagnostics.attempt | floor) == .diagnostics.attempt
        and (.diagnostics.attempt >= 1 and .diagnostics.attempt <= 1000)
        and (.diagnostics.response_request_id == null or (
          (.diagnostics.response_request_id | type) == "string"
          and (.diagnostics.response_request_id | test("^[A-Za-z0-9_.:-]{1,128}$"))))
        and (.diagnostics.reqwest | keys | sort) == (["body","connect","decode","request","timeout"] | sort)
        and all(.diagnostics.reqwest[]; type == "boolean")
        and (.diagnostics.source_chain_unknown | type) == "boolean"
        and (.diagnostics.source_chain_truncated | type) == "boolean"
      )))
  ' "$export_dir/kit-error-summary.json" >/dev/null; then
    printf 'factory: Kit failure diagnostic: ' >&2
    jq -c . "$export_dir/kit-error-summary.json" >&2
  fi
  exit 1
fi
