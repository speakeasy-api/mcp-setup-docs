#!/usr/bin/env bash
# Format a draft-guide run record as a GitHub issue comment (markdown on stdout).
# Usage: format-pipeline-review.sh <run-record.json> [pr-url]
set -euo pipefail

record="${1:?run record json path required}"
pr_url="${2:-}"

if [ ! -f "$record" ]; then
  echo "No run record at $record" >&2
  exit 1
fi

status=$(jq -r '.status // "unknown"' "$record")
rounds=$(jq -r '.rounds // "?"' "$record")
slug=$(jq -r '.slug // "?"' "$record")

echo "## Pipeline review (\`${slug}\`)"
echo
echo "**Status:** \`${status}\` after ${rounds} review round(s)."
if [ -n "$pr_url" ]; then
  echo
  echo "**Draft PR:** ${pr_url}"
fi
echo

unresolved_n=$(jq '(.unresolved // []) | length' "$record")
if [ "$unresolved_n" -gt 0 ]; then
  echo "### Unresolved blockers (${unresolved_n})"
  echo
  echo "These need a human call (live console check, drop the branch, or supply exact UI labels)."
  echo
  jq -r '
    (.unresolved // [])[] |
    "- **\(.dimension // "?")** · `\(.where // "?")` (\(.target // "?"))\n  - \(.problem // "")\n  - Suggestion: \(.suggestion // "—")"
  ' "$record"
  echo
fi

oq_n=$(jq '(.open_questions // []) | length' "$record")
if [ "$oq_n" -gt 0 ]; then
  echo "### Open questions (${oq_n})"
  echo
  jq -r '(.open_questions // [])[] | "- [ ] \(.)"' "$record"
  echo
fi

nits_n=$(jq '(.nits // []) | length' "$record")
if [ "$nits_n" -gt 0 ] && [ "$nits_n" -le 12 ]; then
  echo "### Remaining nits (${nits_n})"
  echo
  jq -r '
    (.nits // [])[] |
    "- **\(.dimension // "?")** · `\(.where // "?")`: \(.problem // "")"
  ' "$record"
  echo
elif [ "$nits_n" -gt 12 ]; then
  echo "### Remaining nits"
  echo
  echo "_${nits_n} nits omitted here — see the run record in the PR._"
  echo
fi

echo "### How to clarify / retry"
echo
echo "1. Reply on this issue with answers (exact button labels, nav paths, or “drop the secret-reset recovery branch”)."
echo "2. Optionally edit the issue body with the same facts."
echo "3. Re-add the \`guide:draft\` label. Distill will read the body **and** issue comments into \`--notes\`."
echo
echo "_Source: \`$(basename "$record")\`_"
