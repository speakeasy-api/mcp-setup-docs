#!/usr/bin/env bash
set -uo pipefail

invalid() {
  printf 'factory: invalid diagnostics\n' >&2
  exit 1
}

[[ $# -eq 1 ]] || invalid
manifest=$1
[[ -f "$manifest" && ! -L "$manifest" ]] || invalid

jq -e '
  def integer: type == "number" and floor == .;
  def exact($wanted): type == "object" and (keys | sort) == ($wanted | sort);
  def tool_operation:
    if .tool == "kit_prompt" then .call_ref == 0 and .operation == "kit_prompt"
    elif .tool == "shell" then
      .call_ref >= 1 and (.operation | IN("inspect_inputs", "inspect_guide_context", "inspect_guide_artifacts", "lint_guide", "validate_report", "unrecognized"))
    else .call_ref >= 1 and .operation == .tool
    end;
  def valid_report:
    exact(["exists", "valid", "outcome", "review_rounds"])
    and (.exists | type == "boolean")
    and (.valid | type == "boolean")
    and (.outcome == null or (.outcome | IN("converged", "awaiting_scope", "blocked", "failed")))
    and (.review_rounds == null or (.review_rounds | integer and . >= 0 and . <= 3))
    and (if .valid then .exists and .outcome != null and .review_rounds != null else .outcome == null and .review_rounds == null end)
    and (if .exists then true else (.valid | not) end);
  def valid_reqwest:
    exact(["timeout", "connect", "request", "body", "decode"])
    and all(.[]; type == "boolean");
  def valid_kit_diagnostics:
    exact(["stage", "retryable", "attempt", "response_request_id", "reqwest", "source_chain_unknown", "source_chain_truncated"])
    and (.stage | IN("request", "stream"))
    and (.retryable | type == "boolean")
    and (.attempt | integer and . >= 1 and . <= 1000)
    and (.response_request_id == null or (.response_request_id | type == "string" and test("^[A-Za-z0-9_.:-]{1,128}$")))
    and (.reqwest | valid_reqwest)
    and (.source_chain_unknown | type == "boolean")
    and (.source_chain_truncated | type == "boolean");
  def valid_kit_record:
    exact(["schema_version", "kind", "code", "diagnostics"])
    and .schema_version == 2
    and (.kind | type == "string" and test("^[a-z0-9_]{1,64}$"))
    and (.code | type == "string" and test("^[a-z0-9_]{1,64}$"))
    and (.diagnostics == null or (.diagnostics | valid_kit_diagnostics));
  def valid_kit_errors:
    exact(["schema_version", "records"])
    and .schema_version == 1
    and (.records | type == "array" and all(.[]; valid_kit_record));
  def valid_event:
    exact(["sequence", "call_ref", "event", "tool", "operation", "success", "duration_ms"])
    and (.sequence | integer and . >= 1 and . <= 512)
    and (.call_ref | integer and . >= 0)
    and (.event | IN("started", "finished"))
    and (.tool | IN("kit_prompt", "shell", "edit", "subagent", "prompt", "fork", "close", "a2a", "docs", "skill", "tool_search", "tool", "auth", "unknown"))
    and (.operation | IN("kit_prompt", "inspect_inputs", "inspect_guide_context", "inspect_guide_artifacts", "lint_guide", "validate_report", "unrecognized", "edit", "subagent", "prompt", "fork", "close", "a2a", "docs", "skill", "tool_search", "tool", "auth", "unknown"))
    and tool_operation
    and (if .event == "started" then
      .success == null and .duration_ms == null
    else
      (.success | type == "boolean")
      and (.duration_ms | integer and . >= 0 and . <= 10800000)
    end);
  def valid_lifecycle:
    reduce .[] as $event (
      {valid: true, next: 1, calls: {}};
      ($event.call_ref | tostring) as $ref
      | .valid = (.valid and ($event.sequence == .next))
      | .next += 1
      | if $event.event == "started" then
          .valid = (.valid and ((.calls | has($ref)) | not))
          | if ((.calls | has($ref)) | not) then
              .calls[$ref] = {tool: $event.tool, operation: $event.operation, finished: false}
            else . end
        else
          .valid = (.valid
            and (.calls | has($ref))
            and (.calls[$ref].finished == false)
            and (.calls[$ref].tool == $event.tool)
            and (.calls[$ref].operation == $event.operation))
          | if (.calls | has($ref)) then .calls[$ref].finished = true else . end
        end
    )
    | .valid;

  exact(["schema_version", "kind", "status", "stage", "classification", "report", "events", "kit_errors"])
  and .schema_version == 1
  and .kind == "guide_factory_diagnostics"
  and .status == "failed"
  and (.stage | IN("docker_build", "container_run", "kit_prompt", "report_validation", "factory_outcome"))
  and (.classification | IN("docker_build_failed", "container_run_failed", "kit_fatal", "kit_prompt_failed", "missing_run_report", "invalid_run_report", "factory_reported_failure", "unknown_failure"))
  and (.report | valid_report)
  and (.events | type == "array" and length <= 512 and all(.[]; valid_event) and valid_lifecycle)
  and (.kit_errors | valid_kit_errors)
' "$manifest" >/dev/null 2>&1 || invalid
