#!/usr/bin/env bash
# Format a draft-guide run record as a human-readable GitHub issue comment.
# Usage: format-pipeline-review.sh <run-record.json> [pr-url] [guides/<slug> dir]
set -euo pipefail

record="${1:?run record json path required}"
pr_url="${2:-}"
guide_dir="${3:-}"

if [ ! -f "$record" ]; then
  echo "No run record at $record" >&2
  exit 1
fi

status=$(jq -r '.status // "unknown"' "$record")
rounds=$(jq -r '.rounds // "?"' "$record")
slug=$(jq -r '.slug // "?"' "$record")

# Prefer guide dir from arg, else infer from slug next to typical checkout layout.
if [ -z "$guide_dir" ] && [ -n "$slug" ] && [ -d "guides/${slug}" ]; then
  guide_dir="guides/${slug}"
fi

# Setup files to search for section quotes (external first, then speakeasy).
guide_mds=()
if [ -n "$guide_dir" ]; then
  [ -f "${guide_dir}/external.md" ] && guide_mds+=("${guide_dir}/external.md")
  [ -f "${guide_dir}/speakeasy.md" ] && guide_mds+=("${guide_dir}/speakeasy.md")
  # Legacy single-file guides (pre-split) still quoteable until migrated.
  if [ ${#guide_mds[@]} -eq 0 ] && [ -f "${guide_dir}/setup.md" ]; then
    guide_mds+=("${guide_dir}/setup.md")
  fi
fi

plain_dimension() {
  case "$1" in
    fidelity) echo "Fact check failed — setup and research disagree (or research is missing the fact)." ;;
    achievability) echo "A cold reader would get stuck — a click, field, or next step is not named clearly enough." ;;
    lint) echo "Guide grammar / schema rule broken (deterministic lint)." ;;
    voice) echo "Tone / persona mismatch." ;;
    formatting) echo "Guide structure / formatting rule broken." ;;
    concision) echo "Extra prose the reader does not need." ;;
    *) echo "$1" ;;
  esac
}

plain_target() {
  case "$1" in
    research) echo "Needs a fact in \`research.md\` (or drop the step that depends on it)." ;;
    external) echo "Needs a clearer step in \`external.md\` (the fact may already be in research)." ;;
    speakeasy) echo "Needs a clearer step in \`speakeasy.md\` (canonical Control Plane flow / Dossier)." ;;
    setup) echo "Needs a clearer step in the setup files (\`external.md\` / \`speakeasy.md\`)." ;;
    meta) echo "Needs a fix in \`meta.yaml\`." ;;
    *) echo "Target: \`$1\`" ;;
  esac
}

# Extract the H3 section whose closing anchor matches #foo from a setup file.
quote_section() {
  local md="$1" anchor="$2"
  [ -f "$md" ] || return 0
  [ -n "$anchor" ] || return 0
  # anchor like #copy-client-credentials
  local id="${anchor#\#}"
  python3 - "$md" "$id" <<'PY' 2>/dev/null || true
import sys
from pathlib import Path
md = Path(sys.argv[1]).read_text(encoding="utf-8")
needle = "{#" + sys.argv[2] + "}"
lines = md.splitlines()
start = None
for i, line in enumerate(lines):
    if needle in line and line.lstrip().startswith("#"):
        start = i
        break
if start is None:
    sys.exit(0)
# collect until next H2/H3
out = [lines[start]]
for line in lines[start + 1 :]:
    if line.startswith("## ") or (line.startswith("### ") and "{#" in line):
        break
    out.append(line)
# trim trailing blanks; cap length
while out and not out[-1].strip():
    out.pop()
text = "\n".join(out).strip()
if len(text) > 900:
    text = text[:900].rstrip() + "\n…"
print(text)
PY
}

# Prefer the file that defines the anchor; fall back across all guide mds.
quote_from_guides() {
  local anchor="$1"
  local md quote
  for md in "${guide_mds[@]+"${guide_mds[@]}"}"; do
    quote=$(quote_section "$md" "$anchor" || true)
    if [ -n "${quote}" ]; then
      printf '%s\n' "$quote"
      return 0
    fi
  done
  return 0
}

extract_anchor() {
  # Prefer first #kebab-case token in where
  echo "$1" | grep -oE '#[a-z0-9-]+' | head -n1 || true
}

echo "## Pipeline review (\`${slug}\`)"
echo
case "$status" in
  converged)
    echo "**Outcome:** Reviewers passed after ${rounds} round(s). Still skim the open questions below before merging."
    ;;
  unconverged)
    echo "**Outcome:** Did **not** fully converge after ${rounds} review round(s). The draft may still be useful — decide on each item below, then reply and re-run."
    ;;
  *)
    echo "**Outcome:** \`${status}\` after ${rounds} review round(s)."
    ;;
esac
if [ -n "$pr_url" ]; then
  echo
  echo "**Draft PR:** ${pr_url}"
fi
echo

# Gate dimensions: fidelity, achievability, lint. Dedupe by target + anchor
# (or where prefix), preferring fidelity > lint > achievability for the same locus.
# Non-gate leftovers (legacy voice/formatting/concision) become optional nits.
decisions_json=$(jq -c '
  def locus:
    ((.where // "") | capture("(?<a>#[a-z0-9-]+)")? | .a)
    // ((.where // "") | .[0:80]);
  def rank:
    if .dimension == "fidelity" then 0
    elif .dimension == "lint" then 1
    elif .dimension == "achievability" then 2
    else 9 end;
  def is_gate:
    .dimension == "fidelity" or .dimension == "achievability" or .dimension == "lint";
  (.unresolved // []) as $u
  | ($u
      | map(select(is_gate))
      | sort_by([(.target // ""), locus, rank])
      | group_by([(.target // ""), locus])
      | map(.[0])
    ) as $decisions
  | ($u
      | map(select(is_gate | not))
    ) as $legacy
  | {decisions: $decisions, legacy: $legacy}
' "$record")

unresolved_n=$(echo "$decisions_json" | jq '.decisions | length')
legacy_n=$(echo "$decisions_json" | jq '.legacy | length')

if [ "$unresolved_n" -gt 0 ]; then
  echo "### Decisions needed (${unresolved_n})"
  echo
  i=0
  while IFS= read -r row; do
    i=$((i + 1))
    dim=$(echo "$row" | jq -r '.dimension // "?"')
    target=$(echo "$row" | jq -r '.target // "?"')
    where=$(echo "$row" | jq -r '.where // "?"')
    problem=$(echo "$row" | jq -r '.problem // ""')
    suggestion=$(echo "$row" | jq -r '.suggestion // ""')
    anchor=$(extract_anchor "$where")

    echo "#### ${i}. $(plain_dimension "$dim")"
    echo
    echo "- **Where in the guide:** \`${where}\`"
    if [ -n "$anchor" ]; then
      echo "- **Section anchor:** \`${anchor}\`"
    fi
    echo "- **What's wrong:** ${problem}"
    echo "- **What would unblock it:** ${suggestion}"
    echo "- **$(plain_target "$target")**"
    echo
    if [ ${#guide_mds[@]} -gt 0 ] && [ -n "$anchor" ]; then
      quote=$(quote_from_guides "$anchor" || true)
      if [ -n "${quote}" ]; then
        echo "<details><summary>Current guide text for this section</summary>"
        echo
        echo '```markdown'
        echo "$quote"
        echo '```'
        echo
        echo "</details>"
        echo
      fi
    fi
    echo "**Reply with one of:**"
    echo "- \`Decision ${i}: verified — …\` (paste the exact button / field / nav labels)"
    echo "- \`Decision ${i}: drop this branch\` (remove the recovery/optional path until we can verify it)"
    echo "- \`Decision ${i}: hedge — …\` (keep a softer “if you see X, ask your admin” line instead of exact clicks)"
    echo
  done < <(echo "$decisions_json" | jq -c '.decisions[]')
fi

oq_n=$(jq '(.open_questions // []) | length' "$record")
if [ "$oq_n" -gt 0 ]; then
  echo "### Open questions (${oq_n})"
  echo
  echo "Research could not prove these from public docs. Check the boxes by replying with answers, or say “unknown / omit”. Silence + an existing hedge in the guide usually means **omit / keep hedge** — not a console capture."
  echo
  jq -r '(.open_questions // [])[] | "- [ ] \(.)"' "$record"
  echo
fi

# Merge leftover nits with any non-gate unresolved findings.
nits_n=$(jq '(.nits // []) | length' "$record")
extra_nits=$((nits_n + legacy_n))
if [ "$extra_nits" -gt 0 ] && [ "$extra_nits" -le 12 ]; then
  echo "### Optional nits (${extra_nits})"
  echo
  if [ "$legacy_n" -gt 0 ]; then
    echo "$decisions_json" | jq -r '
      .legacy[] |
      "- `\(.where // "?")` (\(.dimension // "?")): \(.problem // "") → \(.suggestion // "—")"
    '
  fi
  if [ "$nits_n" -gt 0 ]; then
    jq -r '
      (.nits // [])[] |
      if type == "object" then
        "- `\(.where // "?")`: \(.problem // "") → \(.suggestion // "—")"
      else
        "- \(.)"
      end
    ' "$record"
  fi
  echo
elif [ "$extra_nits" -gt 12 ]; then
  echo "### Optional nits"
  echo
  echo "_${extra_nits} optional nits — see the run record in the PR if you care._"
  echo
fi

echo "### How to retry"
echo
echo "1. Reply on **this issue** using the \`Decision N: …\` lines above (and answer open questions)."
echo "2. Re-add the \`guide:draft\` label. Distill reads the issue body **and** comments into pipeline notes."
echo "3. If a factory draft PR already exists (\`guide/issue-<N>-*\`), the next run **resumes on that branch** and revises prior research/setup instead of starting blank."
echo
echo "_Source: \`$(basename "$record")\`_"
