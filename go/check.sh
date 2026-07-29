#!/usr/bin/env bash
# Regenerate go/generated, fail on drift, then vet+test the Go module.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
cd "$root/go/internal/gen"
go run .
cd "$root"
git diff --exit-code -- go/
cd "$root/go"
out="$(gofmt -l .)"
if [[ -n "$out" ]]; then
  echo "gofmt needed on:"
  echo "$out"
  exit 1
fi
go vet .
go test .
