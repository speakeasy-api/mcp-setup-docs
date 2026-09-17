#!/usr/bin/env bash
set -euo pipefail
[[ $# == 3 ]] || { printf 'usage: finalize-run.sh <private-dir> <host-result> <export-dir>\n' >&2; exit 2; }
# Host-built executable in the private, unmounted host directory. The supervisor
# normally invokes this binary directly to own its monotonic deadline and signals.
exec "$1/host/finalize-factory" "$1" "$2" "$3"
