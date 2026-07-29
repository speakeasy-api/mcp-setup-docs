#!/usr/bin/env bash
# Regenerate go/generated, fail on drift (including untracked), then vet+test.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
cd "$root/go/internal/gen"
go run .
cd "$root"
# Catch modified, deleted, and untracked files under go/.
if [ -n "$(git status --porcelain -- go/)" ]; then
  echo "go/ drift detected after regenerate:"
  git status --porcelain -- go/
  exit 1
fi
cd "$root/go"
out="$(gofmt -l .)"
if [[ -n "$out" ]]; then
  echo "gofmt needed on:"
  echo "$out"
  exit 1
fi
go vet .
go test .
cd "$root/go/internal/gen"
go test .
