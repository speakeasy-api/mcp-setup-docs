#!/usr/bin/env bash
# Preliminary supervisor regression. This is NOT run-kit replacement acceptance;
# retain research-task and its known RED until the actual wrapper is migrated.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/config.env"
export FACTORY_BOUNDARY_IMAGE=${FACTORY_BOUNDARY_IMAGE:-$KIT_IMAGE}
cd "$ROOT/go"
GOTOOLCHAIN=go1.27.0 CGO_ENABLED=0 go test ./cmd/supervise-factory \
  -run '^TestDockerSupervisorBoundary$' -count=1 -timeout=45s
printf '%s\n' 'PASS: supervisor container boundary only; run-kit replacement acceptance remains pending'
