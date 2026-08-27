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

VALIDATOR="$ROOT/factory/scripts/validate.sh"
VALIDATE_TMP="$TMP/validate"
EXPORT="$VALIDATE_TMP/export"
REPO="$VALIDATE_TMP/repo"
REAL_GIT=$(command -v git)
REAL_CP=$(command -v cp)
REAL_MV=$(command -v mv)

reset_validation_fixture() {
  rm -rf "$VALIDATE_TMP"
  mkdir -p "$EXPORT/guide" "$REPO/guides" "$REPO/schema"
  cp "$ROOT/schema/guide.v1.schema.json" "$REPO/schema/"
  git -C "$REPO" init -q
  git -C "$REPO" config user.email test@example.com
  git -C "$REPO" config user.name Test
  git -C "$REPO" add .
  git -C "$REPO" commit -qm baseline
  mkdir -p "$VALIDATE_TMP/bin"
}

make_validation_fake() {
  local name=$1 body=$2
  {
    printf '%s\n' '#!/usr/bin/env bash' 'set -euo pipefail'
    printf '%s\n' "$body"
  } >"$VALIDATE_TMP/bin/$name"
  chmod +x "$VALIDATE_TMP/bin/$name"
}

run_validator() {
  export REAL_GIT REAL_CP REAL_MV REPO
  PATH="$VALIDATE_TMP/bin:$PATH" GITHUB_OUTPUT="$VALIDATE_TMP/outputs" \
    "$VALIDATOR" "$EXPORT" "$REPO"
}

make_export_report() {
  local outcome=$1 slug=${2-github} artifacts=${3-'["research.md","meta.yaml","external.md","speakeasy.md"]'}
  jq -n --arg outcome "$outcome" --arg slug "$slug" --argjson artifacts "$artifacts" '{schema_version:1,outcome:$outcome,provider:"GitHub",slug:(if $slug == "NULL" then null else $slug end),persona:"developer",summary:"test",open_questions:[],blockers:(if $outcome == "blocked" then ["blocked"] else [] end),nits:[],review_rounds:0,artifacts:$artifacts}' >"$EXPORT/run-report.json"
}

copy_valid_guide() {
  local name
  for name in research.md meta.yaml external.md speakeasy.md; do
    cp "$ROOT/guides/github/$name" "$EXPORT/guide/"
  done
}

expect_validation_failure() {
  rm -f "$VALIDATE_TMP/outputs"
  if run_validator >/dev/null 2>&1; then
    fail "validator accepted invalid export: $1"
  fi
  [[ ! -s "$VALIDATE_TMP/outputs" ]] || fail "failed validation wrote GitHub outputs: $1"
}

test_validation_rejects_malformed_and_traversal_reports() {
  reset_validation_fixture
  printf '{' >"$EXPORT/run-report.json"
  expect_validation_failure "malformed JSON"
  make_export_report converged ../doctrine
  copy_valid_guide
  expect_validation_failure "traversal slug"
  [[ ! -e "$REPO/doctrine" ]] || fail "traversal wrote outside guides"
}

test_validation_requires_outcome_files_and_exact_artifacts() {
  reset_validation_fixture
  make_export_report converged
  copy_valid_guide
  rm "$EXPORT/guide/speakeasy.md"
  expect_validation_failure "converged missing file"

  reset_validation_fixture
  make_export_report awaiting_scope github '["research.md","meta.yaml"]'
  cp "$ROOT/guides/github/research.md" "$EXPORT/guide/"
  expect_validation_failure "awaiting scope missing meta"

  reset_validation_fixture
  make_export_report blocked github '["research.md"]'
  cp "$ROOT/guides/github/research.md" "$EXPORT/guide/"
  printf 'extra
' >"$EXPORT/guide/external.md"
  expect_validation_failure "report artifact mismatch"

  reset_validation_fixture
  make_export_report blocked github '["research.md"]'
  expect_validation_failure "named artifact missing"
}

test_validation_rejects_symlinks_and_unexpected_files() {
  reset_validation_fixture
  make_export_report converged
  copy_valid_guide
  ln -s research.md "$EXPORT/guide/link"
  expect_validation_failure "symlink"
  rm "$EXPORT/guide/link"
  printf 'extra
' >"$EXPORT/guide/extra.txt"
  expect_validation_failure "unexpected file"
}

test_validation_preserves_stale_target_until_success() {
  reset_validation_fixture
  mkdir -p "$REPO/guides/github"
  printf 'keep
' >"$REPO/guides/github/stale.txt"
  git -C "$REPO" add . && git -C "$REPO" commit -qm stale
  make_export_report converged
  copy_valid_guide
  printf 'broken: [
' >"$EXPORT/guide/meta.yaml"
  expect_validation_failure "invalid metadata"
  assert_eq keep "$(cat "$REPO/guides/github/stale.txt")"

  cp "$ROOT/guides/github/meta.yaml" "$EXPORT/guide/meta.yaml"
  GITHUB_OUTPUT="$VALIDATE_TMP/outputs" "$VALIDATOR" "$EXPORT" "$REPO"
  [[ ! -e "$REPO/guides/github/stale.txt" ]] || fail "successful install retained stale target"
  cmp "$EXPORT/guide/meta.yaml" "$REPO/guides/github/meta.yaml"
  grep -q '^outcome<<' "$VALIDATE_TMP/outputs" || fail "missing safe GitHub output"
}

test_validation_validates_awaiting_scope_metadata() {
  reset_validation_fixture
  make_export_report awaiting_scope github '["research.md","meta.yaml"]'
  cp "$ROOT/guides/github/research.md" "$ROOT/guides/github/meta.yaml" "$EXPORT/guide/"
  GITHUB_OUTPUT="$VALIDATE_TMP/outputs" "$VALIDATOR" "$EXPORT" "$REPO"
  [[ -f "$REPO/guides/github/meta.yaml" ]] || fail "awaiting-scope metadata was not installed"

  reset_validation_fixture
  make_export_report awaiting_scope github '["research.md","meta.yaml"]'
  cp "$ROOT/guides/github/research.md" "$EXPORT/guide/"
  printf 'schema_version: [
' >"$EXPORT/guide/meta.yaml"
  expect_validation_failure "awaiting-scope invalid metadata"
}

test_validation_installs_safe_blocked_partial_only() {
  reset_validation_fixture
  make_export_report blocked github '["research.md"]'
  cp "$ROOT/guides/github/research.md" "$EXPORT/guide/"
  GITHUB_OUTPUT="$VALIDATE_TMP/outputs" "$VALIDATOR" "$EXPORT" "$REPO"
  [[ -f "$REPO/guides/github/research.md" ]] || fail "safe blocked artifact was not installed"

  reset_validation_fixture
  make_export_report blocked NULL '[]'
  GITHUB_OUTPUT="$VALIDATE_TMP/outputs" "$VALIDATOR" "$EXPORT" "$REPO"
  [[ -z "$(find "$REPO/guides" -mindepth 1 -print -quit)" ]] || fail "slugless blocked report installed files"

  reset_validation_fixture
  make_export_report failed NULL '[]'
  GITHUB_OUTPUT="$VALIDATE_TMP/outputs" "$VALIDATOR" "$EXPORT" "$REPO"
  [[ -z "$(find "$REPO/guides" -mindepth 1 -print -quit)" ]] || fail "failed report installed files"
}

test_validation_rejects_git_failure_and_restores_target() {
  reset_validation_fixture
  mkdir -p "$REPO/guides/github"
  printf 'keep\n' >"$REPO/guides/github/stale.txt"
  git -C "$REPO" add . && git -C "$REPO" commit -qm stale
  make_export_report converged
  copy_valid_guide
  # shellcheck disable=SC2016
  make_validation_fake git 'if [[ "$*" == *"diff --name-only"* ]]; then exit 71; fi; exec "$REAL_GIT" "$@"'
  expect_validation_failure "Git diff command failure"
  assert_eq keep "$(cat "$REPO/guides/github/stale.txt")"
}

test_validation_restores_after_install_move_failure() {
  reset_validation_fixture
  mkdir -p "$REPO/guides/github"
  printf 'keep\n' >"$REPO/guides/github/stale.txt"
  git -C "$REPO" add . && git -C "$REPO" commit -qm stale
  make_export_report converged
  copy_valid_guide
  # shellcheck disable=SC2016
  make_validation_fake mv 'dest=${!#}; if [[ "$*" == *".factory-stage."* && "$dest" == "github" ]]; then exit 72; fi; exec "$REAL_MV" "$@"'
  expect_validation_failure "install move after target displacement"
  assert_eq keep "$(cat "$REPO/guides/github/stale.txt")"
}

test_validation_rejects_tracked_guides_symlink_escape() {
  reset_validation_fixture
  escape="$VALIDATE_TMP/escape"
  rmdir "$REPO/guides"
  mkdir "$escape"
  ln -s "$escape" "$REPO/guides"
  git -C "$REPO" add guides && git -C "$REPO" commit -qm symlink
  make_export_report converged
  copy_valid_guide
  expect_validation_failure "tracked guides symlink escape"
  [[ ! -e "$escape/github" ]] || fail "guides symlink redirected installation"
}

test_validation_revalidates_staged_snapshot() {
  reset_validation_fixture
  make_export_report converged
  copy_valid_guide
  # shellcheck disable=SC2016
  make_validation_fake cp '"$REAL_CP" "$@"; dest=${!#}; case "$dest" in *factory-stage*) ln -s research.md "$dest/late-link" ;; esac'
  expect_validation_failure "staged snapshot mutation"
  [[ ! -e "$REPO/guides/github" ]] || fail "mutated stage was installed"
}

test_validation_rejects_no_install_guide_symlink() {
  reset_validation_fixture
  make_export_report failed NULL '[]'
  rmdir "$EXPORT/guide"
  mkdir "$VALIDATE_TMP/empty-external"
  ln -s "$VALIDATE_TMP/empty-external" "$EXPORT/guide"
  expect_validation_failure "failed export guide symlink"
}

test_validation_blocked_full_lint_requires_research() {
  reset_validation_fixture
  make_export_report blocked github '["meta.yaml","external.md","speakeasy.md"]'
  cp "$ROOT/guides/github/meta.yaml" "$EXPORT/guide/"
  printf 'invalid setup\n' >"$EXPORT/guide/external.md"
  printf 'invalid setup\n' >"$EXPORT/guide/speakeasy.md"
  run_validator
  [[ -f "$REPO/guides/github/meta.yaml" ]] || fail "blocked metadata-only validation did not install"

  reset_validation_fixture
  make_export_report blocked github '["research.md","meta.yaml","external.md","speakeasy.md"]'
  cp "$ROOT/guides/github/research.md" "$ROOT/guides/github/meta.yaml" "$EXPORT/guide/"
  printf 'invalid setup\n' >"$EXPORT/guide/external.md"
  printf 'invalid setup\n' >"$EXPORT/guide/speakeasy.md"
  expect_validation_failure "blocked complete guide skipped full lint"
}

test_validation_rejects_preexisting_out_of_scope_diff() {
  reset_validation_fixture
  printf 'changed
' >>"$REPO/schema/guide.v1.schema.json"
  make_export_report converged
  copy_valid_guide
  expect_validation_failure "changed path outside target"
  [[ ! -e "$REPO/guides/github" ]] || fail "diff guard left an installed guide"
}

test_validation_rejects_malformed_and_traversal_reports
test_validation_requires_outcome_files_and_exact_artifacts
test_validation_rejects_symlinks_and_unexpected_files
test_validation_preserves_stale_target_until_success
test_validation_validates_awaiting_scope_metadata
test_validation_installs_safe_blocked_partial_only
test_validation_rejects_git_failure_and_restores_target
test_validation_restores_after_install_move_failure
test_validation_rejects_tracked_guides_symlink_escape
test_validation_revalidates_staged_snapshot
test_validation_rejects_no_install_guide_symlink
test_validation_blocked_full_lint_requires_research
test_validation_rejects_preexisting_out_of_scope_diff
