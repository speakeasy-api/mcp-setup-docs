# Matches Kit session Record / agentkit-core externally tagged Part and ToolOutput.
def toolname: if IN("shell","compose","tool","tool_search","subagent","prompt","fork","close","skill","docs","edit","a2a","auth","subagents") then . else "unknown" end;
def role: if IN("System","Developer","User","Assistant","Tool","Context","Notification") then . else "unknown" end;
def stream:
  if type != "string" then {present:false,json_valid:false,json_count:null}
  else {present:(length > 0)} +
    (try (fromjson | {json_valid:true,json_count:(if type == "array" or type == "object" then length else null end)})
     catch {json_valid:false,json_count:null}) end;
def shells:
  (if .Structured != null then .Structured elif (.Text | type) == "string" then (try (.Text | fromjson) catch null) else null end)
  | [.. | objects | select(has("exit_code") and has("stdout") and has("stderr")) |
      {exit_code:(.exit_code | if type == "number" then if floor == . and . >= 0 and . <= 255 then . else null end else null end),
       stdout:(.stdout | stream),stderr:(.stderr | stream)}][0:16];
# Only verified fixed prefixes/codes cross the boundary; never copy error prose.
def bounded_uint: type == "number" and floor == . and . >= 0 and . <= 8388608;
def decoded:
  if type != "object" then null
  elif has("Structured") then .Structured
  elif (.Text | type) == "string" then (try (.Text | fromjson) catch null)
  else null end;
def text_error_details:
  if (.Text | type) != "string" then [] else .Text |
  if startswith("invalid tool input: runlet program rejected before execution; fix the errors and retry (warnings are advisory and do not block execution):\n") then
    [scan("\nerror (RL1003) [[]invalid string escape[]] at ([0-9]{1,7})[.][.]([0-9]{1,7}):") |
      {category:"runlet_compile",code:.[0],start:(.[1]|tonumber),end:(.[2]|tonumber)}][0:8]
  elif test("^tool execution failed: RL5201: INVALID_NUMERIC_OPERANDS(\n|$)") then [{category:"runlet_type",code:"RL5201"}]
  elif test("^tool execution failed: RL6102: TOOL_INPUT_SCHEMA_MISMATCH(\n|$)") then [{category:"tool_input_schema",code:"RL6102"}]
  elif test("^tool execution failed: RL6103: TOOL_OUTPUT_SCHEMA_MISMATCH(\n|$)") then [{category:"tool_output_schema",code:"RL6103"}]
  elif startswith("invalid tool input: invalid output_schema: ") then [{category:"output_schema_invalid"}]
  elif startswith("tool execution failed: ACP harness handshake timeout: ") then [{category:"acp_transport",phase:"handshake_timeout"}]
  elif startswith("tool execution failed: ACP harness protocol handshake failure: ") then [{category:"acp_transport",phase:"handshake_failure"}]
  elif . == "tool execution cancelled" then [{category:"cancelled"}]
  else [] end end;
def error_category:
  if . == "RL5201" then "runlet_type"
  elif . == "RL6102" then "tool_input_schema"
  elif . == "RL6103" then "tool_output_schema" else null end;
def error_details:
  (text_error_details) +
  (decoded | [.. | objects | select((.code | error_category) != null and (.message | type) == "string" and (.retryable | type) == "boolean" and (.uncertain | type) == "boolean" and (.attempt | bounded_uint)) |
    {category:(.code | error_category),code:.code,retryable:.retryable,uncertain:.uncertain,attempt:.attempt} +
    (if (.span | type) == "object" and (.span.start | bounded_uint) and (.span.end | bounded_uint) then {start:.span.start,end:.span.end} else {} end)][0:8]);
def subagent_results:
  decoded | [.. | objects | select((.id | type) == "string" and (.generation | bounded_uint) and has("output")) |
    {completed:true, generation:.generation, output_kind:(.output | type), schema_validation:"not_observable"} +
    (if (.updates | type) == "object" and (.updates.items | type) == "array" and (.updates.truncated | type) == "boolean" then
      {updates_truncated:.updates.truncated,
       statuses:[.updates.items[] | objects | select(.sessionUpdate | IN("tool_call","tool_call_update")) | .status | select(IN("pending","in_progress","completed","failed"))][0:16]}
     else {} end)][0:16];
def parts:
  if type != "object" then {role:"unknown",part:"malformed"}
  elif (.schema_version | IN(1,2,3)) and
       ((.item | type) == "object" or (.replacement | type) == "array") then
    (if .item != null then [.item] else .replacement end)[] |
    . as $item | if (.parts | type) != "array" then {role:"unknown",part:"malformed"}
    else .parts[] | . as $part |
      {role:($item.kind | role)} +
      (if type != "object" or length != 1 then {part:"unknown"}
       else keys[0] as $k |
         {part:($k | if IN("Text","Media","File","Structured","Reasoning","ToolCall","ToolResult","Custom") then . else "unknown" end)} +
         (if $k == "ToolCall" then {id:$part.ToolCall.id,tool:($part.ToolCall.name | toolname)}
          elif $k == "ToolResult" then
            $part.ToolResult as $result | ($result.output | error_details) as $details |
            {id:$result.call_id,
             is_error:($result.is_error | if type == "boolean" then . else null end),
             shell_results:($result.output | shells),
             error_details:$details,
             error_details_omitted:($result.is_error == true and ($details | length) == 0),
             subagent_results:($result.output | subagent_results)}
          else {} end) end)
    end
  else {role:"unknown",part:"malformed"} end;
reduce (inputs | (try fromjson catch null) | (try parts catch {role:"unknown",part:"malformed"})) as $event
  ({calls:{},next:0,events:[]};
   (if ($event.id | type) == "string" then
      if .calls[$event.id] == null then .next += 1 | .calls[$event.id] = .next else . end
    else . end) |
   .events += [($event | del(.id)) + {session_ref:$session} +
     (if ($event.id | type) == "string" then {call_ref:.calls[$event.id]} else {} end)] | if (.events | length) > 4097 then .events = .events[0:2048] + .events[-2049:] else . end)
| .events[]
