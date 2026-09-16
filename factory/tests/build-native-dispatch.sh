#!/usr/bin/env bash
# Test-only Cargo context; no production Rust module or shared target artifacts.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
: "${1:?usage: build-native-dispatch.sh EMPTY_BUILD_DIRECTORY}"
mkdir -p "$1"
[[ -z $(ls -A "$1") ]] || { echo 'fixture build directory must be empty' >&2; exit 1; }
cp "$ROOT/factory/tests/fixtures/research/"{Cargo.toml,Cargo.lock,native_dispatch.rs,dispatch_diagnostics.rs} "$1/"
# Fresh source cache: Cargo verifies downloaded archives against Cargo.lock;
# never trust an extracted workstation cache or precompiled rlib by path alone.
CARGO_HOME="$1/cargo-home" cargo +1.94.0 build --locked --manifest-path "$1/Cargo.toml"
