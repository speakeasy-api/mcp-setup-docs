#!/usr/bin/env bash
# Synthetic public fixture only; no providers or private session logs.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
# Resolve platform /tmp aliases before testing strict no-symlink source paths.
tmp=$(cd "$tmp" && pwd -P)
mkdir -p "$tmp/home/.kit/sessions/w-fixture" "$tmp/workspace" "$tmp/export"
chmod 700 "$tmp/export"
(cd "$ROOT/go" && GOTOOLCHAIN=go1.27.0 CGO_ENABLED=0 go build -o "$tmp/export-transcript" ./cmd/export-transcript)
cp "$ROOT/factory/tests/fixtures/kit-v0.1.134/session.jsonl" "$tmp/home/.kit/sessions/w-fixture/session.jsonl"
printf '%s\n' '{"schema_version":3,"session_id":"synthetic-parent","generation":1,"item":{"kind":"Assistant","parts":[{"Text":{"text":"Public finding synthetic-cli-key-not-real","metadata":{}}}]}}' > "$tmp/home/.kit/sessions/w-fixture/parent.jsonl"
mkdir -p "$tmp/workspace/.factory" "$tmp/workspace/guides/example"
printf '%s\n' '{"schema_version":1,"outcome":"failed","provider":"Example","slug":"example","persona":"admin","summary":"Public failure synthetic-cli-key-not-real","open_questions":[],"blockers":[],"nits":[],"review_rounds":0,"artifacts":[]}' > "$tmp/workspace/.factory/run-report.json"
for name in research.md meta.yaml external.md speakeasy.md; do
  printf '%s\n' 'Public failed draft synthetic-cli-key-not-real' > "$tmp/workspace/guides/example/$name"
done
env -i OPENROUTER_API_KEY=synthetic-cli-key-not-real "$tmp/export-transcript" --home "$tmp/home" --workspace "$tmp/workspace" --output "$tmp/export/session-transcript.json" >"$tmp/stdout" 2>"$tmp/stderr"
[[ ! -s "$tmp/stdout" && ! -s "$tmp/stderr" ]]
jq -e '.schema_version == 1 and .kind == "guide_factory_readable_transcript" and (.sessions | length) == 2' "$tmp/export/session-transcript.json" >/dev/null
if grep -q 'synthetic-cli-key-not-real' "$tmp/export/session-transcript.json"; then exit 1; fi
grep -q 'Public finding' "$tmp/export/session-transcript.json"
jq -e '([.files[].name] | index("guide/research.md")) != null and ([.files[] | select(.name == "run-report.json") | .text | fromjson | .artifacts] == [[]])' "$tmp/export/session-transcript.json" >/dev/null
[[ ! -e "$tmp/export/guide" ]]

# Existing output is refused rather than deleted or overwritten, even on error.
if env -i "$tmp/export-transcript" --home "$tmp/home" --workspace "$tmp/workspace" --output "$tmp/export/session-transcript.json" >"$tmp/stdout" 2>"$tmp/stderr"; then exit 1; fi
grep -qx 'transcript export: output withheld' "$tmp/stderr"
printf 'readable transcript synthetic CLI checks passed\n'
