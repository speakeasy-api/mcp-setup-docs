#!/usr/bin/env bash
# Format a Scope check comment from a run record with status awaiting_scope.
# Usage: format-scope-check.sh <run-record.json> [pr-url]
set -euo pipefail

record="${1:?run record json path required}"
pr_url="${2:-}"

if [ ! -f "$record" ]; then
  echo "No run record at $record" >&2
  exit 1
fi

slug=$(jq -r '.slug // "?"' "$record")
# Prefer unanswered material decisions; fall back to open_questions list.
unanswered_n=$(jq '(.scope.unanswered // .open_questions // []) | length' "$record")

echo "## Scope check (\`${slug}\`)"
echo
echo "Research finished with **material open questions** that change what the guide should document. Drafting is paused until you answer — then re-add \`guide:draft\`."
echo
if [ -n "$pr_url" ]; then
  echo "**Draft PR (research only):** ${pr_url}"
  echo
fi

if [ "$unanswered_n" -gt 0 ]; then
  echo "### Decisions needed (${unanswered_n})"
  echo
  i=0
  if jq -e '.scope.unanswered | type == "array" and length > 0' "$record" >/dev/null 2>&1; then
    while IFS= read -r row; do
      i=$((i + 1))
      idx=$(echo "$row" | jq -r '.index // empty')
      [ -n "$idx" ] || idx=$i
      question=$(echo "$row" | jq -r '.question // . // ""')
      why=$(echo "$row" | jq -r '.why_material // "Scope choice that changes what the Writer should document."')
      echo "#### ${idx}. ${question}"
      echo
      echo "- **Why this blocks draft:** ${why}"
      echo
      echo "**Reply with one of:**"
      echo "- \`Decision ${idx}: verified — …\` (paste exact labels / path to document)"
      echo "- \`Decision ${idx}: drop this branch\` (omit the recovery/optional path)"
      echo "- \`Decision ${idx}: hedge — …\` (keep a soft line; do not invent chrome)"
      echo
    done < <(jq -c '.scope.unanswered[]' "$record")
  else
    while IFS= read -r q; do
      i=$((i + 1))
      echo "#### ${i}. ${q}"
      echo
      echo "- **Why this blocks draft:** Scope choice that changes what the Writer should document."
      echo
      echo "**Reply with one of:**"
      echo "- \`Decision ${i}: verified — …\`"
      echo "- \`Decision ${i}: drop this branch\`"
      echo "- \`Decision ${i}: hedge — …\`"
      echo
    done < <(jq -r '.open_questions[]' "$record")
  fi
fi

soft_n=$(jq '(.scope.soft // []) | length' "$record")
if [ "$soft_n" -gt 0 ]; then
  echo "### Soft open questions (${soft_n}) — no pause"
  echo
  echo "These stay as dossier hedges / conditionals. No reply required to continue."
  echo
  jq -r '.scope.soft[] | "- [ ] \(.)"' "$record"
  echo
fi

echo "### How to continue"
echo
echo "1. Reply on **this issue** using the \`Decision N: …\` lines above."
echo "2. Re-add the \`guide:draft\` label. Distill folds your replies into pipeline notes."
echo "3. The next run resumes on the factory branch, revises research if needed, then **drafts**."
echo
echo "_Source: \`$(basename "$record")\`_"
