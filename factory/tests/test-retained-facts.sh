#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"

# Prompt contracts, not a claim of live model compliance.
require_phrase() {
  grep -Fq -- "$2" "$ROOT/$1" || fail "$1 missing retention contract: $2"
}
require_phrase doctrine/roles/technical-research.md 'Operator notes are provenance for Speakeasy-specific implementation facts'
require_phrase doctrine/roles/technical-research.md '## Retained Speakeasy facts'
require_phrase doctrine/roles/technical-research.md 'Silence in a new ticket or in public docs does not retract a retained fact'
require_phrase doctrine/roles/technical-research.md 'explicit correction in the current ticket supersedes the affected prior fact'
require_phrase doctrine/roles/technical-research.md 'Do not promote questions, guesses, or factory status comments into facts'
require_phrase doctrine/roles/writer.md 'Render active retained Speakeasy facts that affect first connection'

require_phrase factory/prompts/reconcile.md 'Compare requested_task with the current reports and selected actions'
require_phrase factory/prompts/finalize-research.md 'Compare requested_task with the final dossier'

# Real input boundary: notes on both sides of a factory retry retain attribution.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cat >"$TMP/issue.json" <<'JSON'
{"schema_version":1,"repository":"acme/docs","issue":{"number":42,"title":"Refresh box","body":"Use the official Speakeasy app.","url":"https://github.com/acme/docs/issues/42","author":"alice"},"comments":[{"author":"alice","created_at":"2026-09-01T00:00:00Z","body":"Install the official Speakeasy app instead of creating an OAuth app."},{"author":"bot","created_at":"2026-09-02T00:00:00Z","body":"<!-- guide-factory-status --> retry"},{"author":"alice","created_at":"2026-09-03T00:00:00Z","body":"Correction: use a custom OAuth app; the official app is retired."}]}
JSON
printf '%s\n' '{"status":"skipped","tenant":"test","observed_at":"2026-09-03T00:00:00Z","servers":[]}' >"$TMP/catalog.json"
bash "$ROOT/factory/scripts/inspect-inputs.sh" "$TMP/issue.json" "$TMP/catalog.json" >"$TMP/result.json"
jq -e --slurpfile original "$TMP/issue.json" '
  .issue.issue == $original[0].issue and
  [.issue.comments[] | select(.author == "alice")] ==
  [$original[0].comments[] | select(.author == "alice")]
' "$TMP/result.json" >/dev/null || fail 'implementation notes lost at input boundary'
printf 'PASS: retained facts contracts and note ingestion\n'
