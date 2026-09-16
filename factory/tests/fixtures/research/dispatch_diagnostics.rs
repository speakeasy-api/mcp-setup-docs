// Test-only adapter to the real Runlet 0.6.0 Runtime, not an interpreter.
// All tools are fake; validates dispatch control flow, not helper implementation.
use runlet::{
    CallSchema, CanonicalValue as V, ExecutionPolicy, Runtime, Schema, ToolDescriptor, ToolError,
    ToolRegistry,
};
use serde_json::{Value, json};
use std::{
    fs,
    process::Command,
    sync::{Arc, Mutex},
};
fn cv(v: Value) -> V {
    match v {
        Value::Null => V::Null,
        Value::Bool(x) => V::Boolean(x),
        Value::Number(x) => V::Integer(x.as_i64().unwrap()),
        Value::String(x) => V::String(x),
        Value::Array(x) => V::List(x.into_iter().map(cv).collect()),
        Value::Object(x) => V::Object(x.into_iter().map(|(k, v)| (k, cv(v))).collect()),
    }
}
fn j(v: &V) -> Value {
    serde_json::from_str(&v.presentation_json().unwrap()).unwrap()
}
fn main() {
 let candidate=std::env::args().nth(1).unwrap_or_else(|| "factory/tests/fixtures/research/dispatch.runlet".into());
 let source=fs::read_to_string(candidate).unwrap();
 let runtime=Runtime::builder().build().unwrap();
 for (code,want) in [("FIXED","FIXED"),("UNTRUSTED","native_dispatch_failed")] {
  let program=format!(r#"attempt = boundary {{
    return boundary {{ return fail("PRIVATE", "private text") }} catch err {{ return fail("{code}", "fixed text") }}
  }} catch err {{ return {{status:"failed", category:err.code if err.code in ["FIXED"] else "native_dispatch_failed"}} }}
  return attempt"#);
  let result=j(&runtime.run(&runtime.compile(&program).unwrap()).unwrap().value);
  assert_eq!(result,json!({"status":"failed","category":want}));
  println!("PASS nested_{code}: {want}");
 }
 let pinned=Command::new("shasum").args(["-a","256","factory/coordinator.md"]).output().unwrap();
 assert!(pinned.status.success());
 let hash=String::from_utf8(pinned.stdout).unwrap().split_whitespace().next().unwrap().to_string();
 let cases=[("invalid_input","input_validation",0), ("path_throw","path_threw",1),("path_nonzero","path_nonzero",1),("input_write","input_write",2),("helper_throw","helper_threw",3),("helper_nonzero","helper_nonzero",3),("prompt_write","prompt_write",4),("native_throw","child_execution",5),("child_invalid","child_validation",5),("empty_report","child_validation",5),("report_write","report_persistence",6),("handle_write","handle_persistence",7),("success","",7),("prior_throw","predecessor_threw",5),("prior_nonzero","predecessor_nonzero",5),("prior_invalid","predecessor_validation",5),("followup_throw","child_execution",6),("followup_success","",8)];
 for (case,category,count) in cases {
  let follow=case.starts_with("prior_") || case.starts_with("followup_");
  let index=if follow {1} else {0};
  let assignment=json!({"topic_id":1,"follow_up_index":index}).to_string();
  let input=json!({"topic":if case=="invalid_input" {9} else {1},"index":index,"kind":if follow {"follow-up"} else {"initial"},"documentHash":hash,"assignmentJSON":assignment});
  let calls=Arc::new(Mutex::new(Vec::<String>::new()));
  let mut registry=ToolRegistry::default();
  for name in ["shell","edit","subagent","prompt"] { registry.register(ToolDescriptor{name:name.into(),summary:String::new(),input:CallSchema::positional(vec![Schema::Any]),output:Schema::Any,execution:ExecutionPolicy::Unsafe,schema_version:"1".into()}).unwrap(); }
  let mut builder=Runtime::builder().registry(registry).with_prelude().input("input",Schema::Any,cv(input));
  for name in ["shell","edit","subagent","prompt"] {
   let calls=calls.clone(); let hash=hash.clone(); let assignment=assignment.clone();
   builder=builder.tool(name,move |args,_| {
    let a=j(&args[0]);
    let stage=match name {
     "shell" => {let cmd=a["command"].as_str().unwrap(); if cmd.starts_with("test -d ") {"path"} else if cmd.starts_with("/usr/local/bin/prepare-research-prompt ") {assert!(cmd.contains(&format!("--sha256 {hash} --kind "))); "helper"} else {assert!(cmd.starts_with("bash /workspace/factory/scripts/read-research-handle.sh ")); "prior"}},
     "edit" => {let path=a["path"].as_str().unwrap(); if path.ends_with(".input.json") {assert_eq!(a["content"],assignment); "input_write"} else if path.ends_with(".prompt.md") {assert_eq!(a["content"],"exact prompt\n\n"); "prompt_write"} else if path.ends_with(".report.md") {assert_eq!(a["content"],"exact report\n\n"); "report_write"} else {assert!(path.ends_with(".handle.json")); let h:Value=serde_json::from_str(a["content"].as_str().unwrap()).unwrap(); assert_eq!(h["updates"]["items"][0]["opaque"],"retain"); "handle_write"}},
     _ => {assert_eq!(a["prompt"],"exact prompt\n\n"); if name=="prompt" {assert_eq!(a["subagent"]["id"],"prior-id");} "native"}
    };
    calls.lock().unwrap().push(stage.into());
    if case==format!("{stage}_throw") || case==stage || (case=="followup_throw" && stage=="native") {return Err(ToolError::new("PRIVATE_ERROR_CODE","private message must never escape"));}
    let value=match stage {
     "path"|"helper"|"prior" => json!({"success":case!=format!("{stage}_nonzero"),"stdout":if stage=="helper" {"exact prompt\n\n".to_string()} else if stage=="prior" {if case=="prior_invalid" {"{".to_string()} else {json!({"id":"prior-id","generation":1,"output":"previous","updates":{"items":[],"truncated":false}}).to_string()}} else {String::new()},"stderr":"private stderr"}),
     "native" => json!({"id":if case=="child_invalid" {""} else {"child-id"},"generation":2,"output":if case=="empty_report" {""} else {"exact report\n\n"},"updates":{"items":[{"opaque":"retain"}],"truncated":false}}),
     _=>json!({"status":"added"})
    }; Ok(cv(value))
   });
  }
  let runtime=builder.build().unwrap(); let program=runtime.compile(&source).unwrap_or_else(|d| panic!("candidate compile: {d:?}"));
  let result=j(&runtime.run(&program).unwrap().value);
  let expected:Vec<&str>=if follow {vec!["path","input_write","helper","prompt_write","prior","native","report_write","handle_write"]} else {vec!["path","input_write","helper","prompt_write","native","report_write","handle_write"]};
  assert_eq!(*calls.lock().unwrap(),expected[..count],"{case}: no later operations/no retries");
  if category.is_empty() {assert_eq!(result["status"],"returned","{case}"); assert_eq!(result["handle"]["output"],"exact report\n\n");} else {assert_eq!(result,json!({"status":"failed","category":format!("native_dispatch_{category}")}),"{case}");}
  println!("PASS {case}: {} ({count} calls)",if category.is_empty() {"returned".to_string()} else {format!("native_dispatch_{category}")});
 }
}
