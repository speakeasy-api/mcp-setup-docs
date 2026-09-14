#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/factory/tests/test-helper.sh"
# Static prompt contract, not a model-compliance or executor test.
for document in factory/coordinator.md docs/research-prompt-draft.md; do
  common=$(sed -n '/^## Common instructions for every research subagent$/,/^## Return format$/p' "$ROOT/$document")
  while IFS= read -r fixture; do
    [[ $common == *"$fixture"* ]] || fail "$document missing failure-policy fixture: $fixture"
  done <<'FIXTURES'
optional fetch-helper: command-not-found (127), simple known read-only attempt before any mutation => use an already available read-only alternative
optional read-only sed extraction: malformed shell sed expression => correct or use a simpler available read-only alternative
optional read-only curl pipeline: downstream parser closes pipe, curl exits 23, no file/service mutation or uncertain side effects => correct or use a simpler available read-only alternative
repeated read-only failures => change approach within the existing 1800-second research deadline or report the blocker
mandatory validator: command-not-found (127) or any nonzero => gate closed; correction only where the existing workflow permits
ambiguous write or unknown partial side effects => fatal
ordinary research: successful harness-healed allowed read-only execution => accept under the same operation/result/evidence criteria as unrepaired execution
ordinary research: pre-execution rejection with authoritative zero-dispatch evidence => may correct the read-only program; otherwise stop
mandatory canonical dispatch/context/report program: any repair or byte mismatch => fatal trusted-literal corruption
ordinary research: healed execution with uncertain writes or unknown partial effects => unsafe; inspect/reconcile, never replay
A repair warning alone is neither execution failure nor evidence of zero effects
Do not re-execute solely because of a repair warning
Do not require proof of zero tool dispatch to accept already-executed allowed research
Read-only fetch, parsing, quoting, and tool-selection errors may be corrected
Repeated identical no-progress failures must stop that approach; try a different approach or report the blocker
HTTP source failure cannot invent source evidence or bypass the Topic 5 endpoint gate
No automatic service-write retries or broader authentication, access, or bypass changes
Errors outside this ordinary read-only research policy retain existing failure gates
Prefer installed shell/curl/jq/rg; do not knowingly invoke absent Python
Never install Python, dependencies, or new tools
A compound shell exit 127 cannot establish that earlier commands had no side effects
There is no fixed research failure or recovery count; the existing deadline and risk/evidence gates bound correction
Record failures, corrections, changed approaches, and results in the existing private research report evidence
Do not extend clocks or relax validation, filesystem/privacy, native handles, reporting, export, or publication gates
FIXTURES
done
grep -Fq 'Parent audit must apply the same classification' "$ROOT/factory/coordinator.md" || fail 'parent audit lacks recovery classification'
grep -Fq 'Except for the ordinary read-only research correction policy below' "$ROOT/factory/coordinator.md" || fail 'blanket fatal rule overrides fallback'
grep -Fq 'unavailable optional command or positively known read-only fetch/parsing failure' "$ROOT/factory/coordinator.md" || fail 'parent audit omits fetch/parsing recovery'
grep -Fq 'Parent audit must not fail successful allowed ordinary research solely for a harness repair warning' "$ROOT/factory/coordinator.md" || fail 'parent audit rejects healed research'
for document in factory/coordinator.md docs/research-prompt-draft.md factory/README.md; do
  if grep -Eq 'one shared recovery budget|One shared recovery budget|single shared budget|single shared recovery budget|failed recovery.*fatal|failed fallback execution remain fatal|one-recovery|never repair and resubmit' "$ROOT/$document"; then
    fail "$document retains blanket malformed-Runlet stop"
  fi
done
printf 'PASS: static optional research fallback policy (model compliance unproven)\n'
