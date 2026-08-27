#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

RUN_SCHEMA="$ROOT/factory/schemas/run-report.schema.json"
REVIEW_SCHEMA="$ROOT/factory/schemas/review-findings.schema.json"
RESEARCH_SCHEMA="$ROOT/factory/schemas/research-status.schema.json"

python3 - "$RUN_SCHEMA" "$REVIEW_SCHEMA" "$RESEARCH_SCHEMA" <<'PY'
import json
import sys

for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as handle:
        json.load(handle)
PY

jq -e '
  def durable: ["research.md","meta.yaml","external.md","speakeasy.md"];
  def outcome_rule($name): [.allOf[] | select(.if.properties.outcome.const == $name and .if.required == ["outcome"])] | if length == 1 then .[0].then else null end;
  def null_identity_rules: [.allOf[] | select(.then["$ref"] == "#/$defs/preArtifactFailure")];
  .type == "object" and .additionalProperties == false and
  (.required | sort) == (["artifacts","blockers","nits","open_questions","outcome","persona","provider","review_rounds","schema_version","slug","summary"] | sort) and
  .properties.schema_version.const == 1 and
  (.properties.outcome.enum | sort) == (["converged","awaiting_scope","blocked","failed"] | sort) and
  all(.properties.provider, .properties.slug, .properties.persona; (.type | sort) == (["string","null"] | sort)) and
  .properties.slug.pattern == "^[a-z0-9]+(-[a-z0-9]+)*$" and
  (.properties.review_rounds | .type == "integer" and .minimum == 0 and .maximum == 3) and
  (.properties.artifacts | .type == "array" and .uniqueItems == true and (.items.enum | sort) == (durable | sort)) and
  (null_identity_rules |
    length == 3 and
    ([.[].if.required[]] | sort) == (["provider","slug","persona"] | sort) and
    all(.[]; (.if.required | length) == 1 and .if.properties[.if.required[0]].type == "null")) and
  (."$defs".preArtifactFailure.properties.outcome.enum | sort) == (["blocked","failed"] | sort) and
  ."$defs".preArtifactFailure.properties.artifacts.maxItems == 0 and
  (outcome_rule("converged") |
    .properties.blockers.maxItems == 0 and
    ([.properties.artifacts.allOf[].contains.const] | sort) == (durable | sort)) and
  (outcome_rule("awaiting_scope") |
    ([.properties.artifacts.allOf[].contains.const] | sort) == (["research.md","meta.yaml"] | sort)) and
  (outcome_rule("failed") | .properties.artifacts.maxItems == 0)
' "$RUN_SCHEMA" >/dev/null

jq -e '
  def durable: ["research.md","meta.yaml","external.md","speakeasy.md"];
  .type == "array" and .items.type == "object" and .items.additionalProperties == false and
  (.items.required | sort) == (["severity","target","where","problem","suggestion"] | sort) and
  (.items.properties.severity.enum | sort) == (["blocker","nit"] | sort) and
  (.items.properties.target.enum | sort) == (durable | sort) and
  all(.items.properties.where, .items.properties.problem, .items.properties.suggestion;
    .type == "string" and .pattern == "\\S")
' "$REVIEW_SCHEMA" >/dev/null

jq -e '
  .type == "object" and .additionalProperties == false and
  (.required | sort) == (["metadata_validation","notes","open_questions","sources_used","status"] | sort) and
  (.properties.status.enum | sort) == (["complete","awaiting_scope","blocked","failed"] | sort) and
  all(.properties.notes, .properties.open_questions, .properties.metadata_validation;
    .type == "array" and .items.type == "string" and .items.minLength == 1) and
  (.properties.sources_used |
    .type == "array" and .uniqueItems == true and .items.type == "string" and .items.format == "uri")
' "$RESEARCH_SCHEMA" >/dev/null

validate_report() {
  jq -e '
    def strings: type == "array" and all(.[]; type == "string");
    def durable: ["research.md","meta.yaml","external.md","speakeasy.md"];
    (keys | sort) == (["artifacts","blockers","nits","open_questions","outcome","persona","provider","review_rounds","schema_version","slug","summary"] | sort) and
    .schema_version == 1 and
    (.outcome | IN("converged","awaiting_scope","blocked","failed")) and
    (.summary | type == "string" and length > 0) and
    (.open_questions | strings) and (.blockers | strings) and (.nits | strings) and
    (.review_rounds | type == "number" and . == floor) and (.review_rounds >= 0 and .review_rounds <= 3) and
    (.artifacts | strings) and (.artifacts | length == (unique | length)) and
    all(.artifacts[]; IN(durable[])) and
    (.slug == null or (.slug | test("^[a-z0-9]+(-[a-z0-9]+)*$"))) and
    all([.provider,.slug,.persona][]; . == null or type == "string") and
    (if any([.provider,.slug,.persona][]; . == null) then
       (.outcome | IN("blocked","failed")) and (.artifacts | length) == 0
     else true end) and
    (if .outcome == "converged" then
       (.blockers | length) == 0 and (durable - .artifacts | length) == 0
     else true end) and
    (if .outcome == "awaiting_scope" then
       (["research.md","meta.yaml"] - .artifacts | length) == 0
     else true end) and
    (if .outcome == "failed" then (.artifacts | length) == 0 else true end)
  ' "$1" >/dev/null
}

expect_invalid_report() {
  if validate_report "$1"; then
    fail "invalid report fixture was accepted: $1"
  fi
}

cat >"$TMP/converged.json" <<'JSON'
{
  "schema_version": 1,
  "outcome": "converged",
  "provider": "Asana",
  "slug": "asana",
  "persona": "it-admin",
  "summary": "Drafted and reviewed the Asana setup guide.",
  "open_questions": [],
  "blockers": [],
  "nits": [],
  "review_rounds": 2,
  "artifacts": ["research.md", "meta.yaml", "external.md", "speakeasy.md"]
}
JSON
cat >"$TMP/awaiting_scope.json" <<'JSON'
{"schema_version":1,"outcome":"awaiting_scope","provider":"Asana","slug":"asana","persona":"it-admin","summary":"Research needs a scope decision.","open_questions":["Which deployment model?"],"blockers":[],"nits":[],"review_rounds":0,"artifacts":["research.md","meta.yaml"]}
JSON
cat >"$TMP/blocked.json" <<'JSON'
{"schema_version":1,"outcome":"blocked","provider":null,"slug":null,"persona":null,"summary":"Provider could not be identified.","open_questions":[],"blockers":["Missing provider."],"nits":[],"review_rounds":0,"artifacts":[]}
JSON
cat >"$TMP/failed.json" <<'JSON'
{"schema_version":1,"outcome":"failed","provider":null,"slug":null,"persona":null,"summary":"Research agent failed.","open_questions":[],"blockers":["Agent failure."],"nits":[],"review_rounds":0,"artifacts":[]}
JSON

validate_report "$TMP/converged.json"
validate_report "$TMP/awaiting_scope.json"
validate_report "$TMP/blocked.json"
validate_report "$TMP/failed.json"

jq '.unexpected = true' "$TMP/converged.json" >"$TMP/unknown-field.json"
jq '.blockers = ["Unresolved review issue."]' "$TMP/converged.json" >"$TMP/converged-blocked.json"
jq '.artifacts = ["research.md"]' "$TMP/failed.json" >"$TMP/failed-artifacts.json"
jq '.slug = "Asana Guide"' "$TMP/converged.json" >"$TMP/non-kebab.json"
jq '.review_rounds = 1.5' "$TMP/converged.json" >"$TMP/fractional-review-rounds.json"
expect_invalid_report "$TMP/unknown-field.json"
expect_invalid_report "$TMP/converged-blocked.json"
expect_invalid_report "$TMP/failed-artifacts.json"
expect_invalid_report "$TMP/non-kebab.json"
expect_invalid_report "$TMP/fractional-review-rounds.json"

cat >"$TMP/review-valid.json" <<'JSON'
[{"severity":"blocker","target":"external.md","where":"Authentication","problem":"The callback URL is missing.","suggestion":"Add the exact callback URL from the provider documentation."}]
JSON
cat >"$TMP/review-no-suggestion.json" <<'JSON'
[{"severity":"blocker","target":"external.md","where":"Authentication","problem":"The callback URL is missing.","suggestion":"   "}]
JSON
jq -e 'all(.[]; (keys | sort) == (["problem","severity","suggestion","target","where"] | sort) and (.suggestion | type == "string" and test("\\S")))' "$TMP/review-valid.json" >/dev/null
if jq -e 'all(.[]; (keys | sort) == (["problem","severity","suggestion","target","where"] | sort) and (.suggestion | type == "string" and test("\\S")))' "$TMP/review-no-suggestion.json" >/dev/null; then
  fail "review finding without a concrete suggestion was accepted"
fi

# Keep this expression aligned with the host validator used by later tasks.
jq -e '
  .schema_version == 1 and
  (.outcome | IN("converged","awaiting_scope","blocked","failed")) and
  (.review_rounds >= 0 and .review_rounds <= 3) and
  (if .outcome == "converged" then
     (.blockers | length) == 0 and
     (["research.md","meta.yaml","external.md","speakeasy.md"] - .artifacts | length) == 0
   else true end)
' "$TMP/converged.json" >/dev/null
