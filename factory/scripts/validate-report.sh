#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 1 ]] || { printf 'usage: validate-report.sh <run-report.json>\n' >&2; exit 2; }
report=$1
[[ -f "$report" && ! -L "$report" ]] || { printf 'run report must be a regular file\n' >&2; exit 1; }

jq -e '
  def nonempty_strings:
    type == "array" and all(.[]; type == "string" and length > 0);
  def durable: ["research.md","meta.yaml","external.md","speakeasy.md"];
  type == "object" and
  (keys | sort) == (["schema_version","outcome","provider","slug","persona","summary","open_questions","blockers","nits","review_rounds","artifacts"] | sort) and
  .schema_version == 1 and
  (.outcome | IN("converged","awaiting_scope","blocked","failed")) and
  ((.provider == null) or (.provider | type == "string" and length > 0)) and
  ((.slug == null) or (.slug | type == "string" and test("^[a-z0-9]+(-[a-z0-9]+)*$"))) and
  ((.persona == null) or (.persona | type == "string" and length > 0)) and
  (.summary | type == "string" and length > 0) and
  (.open_questions | nonempty_strings) and
  (.blockers | nonempty_strings) and
  (.nits | nonempty_strings) and
  (.review_rounds | type == "number" and floor == . and . >= 0 and . <= 3) and
  (.artifacts | type == "array" and length == (unique | length) and all(.[]; IN(durable[]))) and
  (if (.provider == null or .slug == null or .persona == null) then
     (.outcome | IN("blocked","failed")) and (.artifacts | length == 0)
   else true end) and
  (if .outcome == "converged" then
     (.blockers | length == 0) and (durable - .artifacts | length == 0)
   elif .outcome == "awaiting_scope" then
     (["research.md","meta.yaml"] - .artifacts | length == 0)
   elif .outcome == "failed" then
     (.artifacts | length == 0)
   else true end)
' "$report" >/dev/null || { printf 'run report failed validation\n' >&2; exit 1; }
