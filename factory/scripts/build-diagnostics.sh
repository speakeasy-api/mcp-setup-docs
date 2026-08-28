#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIAGNOSTICS_VALIDATOR=${FACTORY_DIAGNOSTICS_VALIDATOR:-$ROOT/factory/scripts/validate-diagnostics.sh}
REPORT_VALIDATOR=${FACTORY_REPORT_VALIDATOR:-$ROOT/factory/scripts/validate-report.sh}
[[ -x $DIAGNOSTICS_VALIDATOR ]] || DIAGNOSTICS_VALIDATOR="$SCRIPT_DIR/validate-diagnostics"
[[ -x $REPORT_VALIDATOR ]] || REPORT_VALIDATOR="$SCRIPT_DIR/validate-report"
output=
temporary=
empty_events=
empty_kit_errors=
succeeded=false

cleanup() {
  local status=$?
  rm -f -- "${temporary:-}" "${empty_events:-}" "${empty_kit_errors:-}" 2>/dev/null || true
  if [[ $succeeded != true ]]; then
    [[ -z ${output:-} ]] || rm -f -- "$output" 2>/dev/null || true
    printf '%s\n' 'factory: diagnostics unavailable' >&2
  fi
  return "$status"
}
trap cleanup EXIT

[[ $# -eq 6 ]] || exit 1
stage=$1
kit_status=$2
events_path=$3
report_path=$4
kit_errors_path=$5
output=$6

case $stage in
  docker_build | container_run | kit_prompt | report_validation | factory_outcome) ;;
  *) exit 1 ;;
esac
[[ $kit_status =~ ^(0|[1-9][0-9]{0,2})$ ]] || exit 1
((10#$kit_status <= 255)) || exit 1
if [[ $stage == docker_build || $stage == container_run ]]; then
  ((10#$kit_status != 0)) || exit 1
elif [[ $events_path == - ]]; then
  exit 1
fi

output_dir=$(dirname -- "$output")
[[ -d $output_dir && ! -d $output ]] || exit 1
temporary=$(mktemp "$output.tmp.XXXXXX" 2>/dev/null) || exit 1
empty_events="$temporary.events"
empty_kit_errors="$temporary.kit-errors"
printf '%s\n' '[]' >"$empty_events" || exit 1
printf '%s\n' '{"schema_version":1,"records":[]}' >"$empty_kit_errors" || exit 1

events_source=$empty_events
if [[ $events_path != - ]]; then
  [[ -f $events_path && ! -L $events_path ]] || exit 1
  jq -e 'type == "array"' "$events_path" >/dev/null 2>&1 || exit 1
  events_source=$events_path
fi

kit_errors_source=$empty_kit_errors
if [[ $kit_errors_path != - ]]; then
  [[ -f $kit_errors_path && ! -L $kit_errors_path ]] || exit 1
  jq -e '
    def exact($keys): type == "object" and (keys | sort) == ($keys | sort);
    def integer: type == "number" and floor == .;
    def valid_reqwest:
      exact(["timeout", "connect", "request", "body", "decode"])
      and all(.[]; type == "boolean");
    def valid_diagnostics:
      exact(["stage", "retryable", "attempt", "response_request_id", "reqwest", "source_chain_unknown", "source_chain_truncated"])
      and (.stage | IN("request", "stream"))
      and (.retryable | type == "boolean")
      and (.attempt | integer and . >= 1 and . <= 1000)
      and (.response_request_id == null or (.response_request_id | type == "string" and test("^[A-Za-z0-9_.:-]{1,128}$")))
      and (.reqwest | valid_reqwest)
      and (.source_chain_unknown | type == "boolean")
      and (.source_chain_truncated | type == "boolean");
    def valid_record:
      exact(["schema_version", "kind", "code", "diagnostics"])
      and .schema_version == 2
      and (.kind | type == "string" and test("^[a-z0-9_]{1,64}$"))
      and (.code | type == "string" and test("^[a-z0-9_]{1,64}$"))
      and (.diagnostics == null or (.diagnostics | valid_diagnostics));
    exact(["schema_version", "records"])
    and .schema_version == 1
    and (.records | type == "array" and all(.[]; valid_record))
  ' "$kit_errors_path" >/dev/null 2>&1 || exit 1
  kit_errors_source=$kit_errors_path
fi

report_exists=false
report_valid=false
report_source=/dev/null
if [[ $report_path != - && -e $report_path ]]; then
  report_exists=true
  if [[ -f $report_path && ! -L $report_path ]] \
    && "$REPORT_VALIDATOR" "$report_path" >/dev/null 2>&1; then
    report_valid=true
    report_source=$report_path
  fi
fi

records_count=$(jq -r '.records | length' "$kit_errors_source" 2>/dev/null) || exit 1
if [[ $stage == docker_build ]]; then
  classification=docker_build_failed
elif [[ $stage == container_run ]]; then
  classification=container_run_failed
elif ((records_count > 0)); then
  classification=kit_fatal
elif ((10#$kit_status != 0)); then
  classification=kit_prompt_failed
elif [[ $report_exists == false ]]; then
  classification=missing_run_report
elif [[ $report_valid == false ]]; then
  classification=invalid_run_report
elif [[ $(jq -r '.outcome' "$report_source" 2>/dev/null) == failed ]]; then
  classification=factory_reported_failure
else
  classification=unknown_failure
fi

if ! jq -n \
  --arg stage "$stage" \
  --arg classification "$classification" \
  --argjson report_exists "$report_exists" \
  --argjson report_valid "$report_valid" \
  --slurpfile events "$events_source" \
  --slurpfile report "$report_source" \
  --slurpfile kit_errors "$kit_errors_source" '
    {
      schema_version: 1,
      kind: "guide_factory_diagnostics",
      status: "failed",
      stage: $stage,
      classification: $classification,
      report: {
        exists: $report_exists,
        valid: $report_valid,
        outcome: (if $report_valid then $report[0].outcome else null end),
        review_rounds: (if $report_valid then $report[0].review_rounds else null end)
      },
      events: $events[0],
      kit_errors: $kit_errors[0]
    }
  ' >"$temporary" 2>/dev/null; then
  exit 1
fi

"$DIAGNOSTICS_VALIDATOR" "$temporary" >/dev/null 2>&1 || exit 1
mv -f -- "$temporary" "$output" 2>/dev/null || exit 1
temporary=
succeeded=true
