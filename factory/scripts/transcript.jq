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
          elif $k == "ToolResult" then {id:$part.ToolResult.call_id,is_error:($part.ToolResult.is_error | if type == "boolean" then . else null end),shell_results:($part.ToolResult.output | shells)}
          else {} end) end)
    end
  else {role:"unknown",part:"malformed"} end;
reduce (inputs | (try fromjson catch null) | (try parts catch {role:"unknown",part:"malformed"})) as $event
  ({calls:{},next:0,events:[]};
   if (.events | length) >= 4097 then . else
   (if ($event.id | type) == "string" then
      if .calls[$event.id] == null then .next += 1 | .calls[$event.id] = .next else . end
    else . end) |
   .events += [($event | del(.id)) + {session_ref:$session} +
     (if ($event.id | type) == "string" then {call_ref:.calls[$event.id]} else {} end)] end)
| .events[]
