// Test-only adapter to the real Runlet 0.6.0 Runtime, not an interpreter.
// Retained context/report/dossier contracts; tool outcomes are simulated.
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
// Execute the exact coordinator context literal, not a retyped substitute.
fn context_contract(root: &str) {
    let document = fs::read_to_string(format!("{root}/factory/coordinator.md")).unwrap();
    let source = document
        .split("```runlet\n")
        .nth(1)
        .unwrap()
        .split("```")
        .next()
        .unwrap()
        .replace("<slug>", "box");
    let out = Command::new("bash")
        .arg(format!("{root}/factory/scripts/inspect-guide-context.sh"))
        .arg("box")
        .current_dir(root)
        .output()
        .unwrap();
    assert!(out.status.success());
    let stdout = String::from_utf8(out.stdout).unwrap();
    assert!(stdout.ends_with('\n'));
    let successful = json!({"success":true,"exit_code":0,"stdout":stdout,"stderr":""});
    for case in ["success", "nonzero", "throw", "malformed"] {
        let mut registry = ToolRegistry::default();
        registry
            .register(ToolDescriptor {
                name: "shell".into(),
                summary: String::new(),
                input: CallSchema::positional(vec![Schema::Any]),
                output: Schema::Any,
                execution: ExecutionPolicy::Unsafe,
                schema_version: "1".into(),
            })
            .unwrap();
        let calls = Arc::new(Mutex::new(0));
        let observed = calls.clone();
        let result = successful.clone();
        let runtime = Runtime::builder().registry(registry).with_prelude().tool("shell", move |args,_| {
            *observed.lock().unwrap() += 1;
            assert_eq!(j(&args[0]), json!({"command":"bash factory/scripts/inspect-guide-context.sh box"}));
            if case == "throw" { return Err(ToolError::new("TEST", "synthetic shell failure")); }
            if case == "nonzero" { return Ok(cv(json!({"success":false,"exit_code":1,"stdout":"","stderr":"synthetic rejection"}))); }
            Ok(cv(result.clone()))
        }).build().unwrap();
        if case == "malformed" {
            assert!(runtime.compile("return {").is_err());
            assert_eq!(*calls.lock().unwrap(), 0);
            continue;
        }
        let program = runtime
            .compile(&source)
            .unwrap_or_else(|d| panic!("context compile: {d:?}"));
        let value = j(&runtime.run(&program).unwrap().value);
        assert_eq!(
            *calls.lock().unwrap(),
            1,
            "no retry or extra validation dispatch"
        );
        if case == "success" {
            assert_eq!(
                value, successful,
                "complete shell output including exact stdout bytes"
            );
        } else {
            assert_eq!(
                value,
                json!({"factory_status":"guide_context_inspection_failed"})
            );
        }
    }
    println!("PASS: Runlet 0.6 context success/exact bytes/nonzero/throw/predispatch rejection");
}
fn report_contract(root: &str) {
    let source = fs::read_to_string(format!(
        "{root}/factory/tests/fixtures/research/report.runlet"
    ))
    .unwrap();
    let document = fs::read_to_string(format!("{root}/factory/coordinator.md")).unwrap();
    assert!(
        document.contains(&format!("```runlet\n{source}```")),
        "canonical reporting literal drifted"
    );
    let report = json!({"summary":"quotes ' \" $(printf PWNED) `printf PWNED` \\ \n雪"});
    for case in ["success", "nonzero", "invalid", "throw"] {
        let mut registry = ToolRegistry::default();
        registry
            .register(ToolDescriptor {
                name: "shell".into(),
                summary: String::new(),
                input: CallSchema::positional(vec![Schema::Any]),
                output: Schema::Any,
                execution: ExecutionPolicy::Unsafe,
                schema_version: "1".into(),
            })
            .unwrap();
        let calls = Arc::new(Mutex::new(0));
        let observed = calls.clone();
        let expected = report.clone();
        let runtime = Runtime::builder().registry(registry).with_prelude().input("input", Schema::Any, cv(json!({"report":report}))).tool("shell", move |args,_| {
            *observed.lock().unwrap() += 1;
            let arg = j(&args[0]);
            let command = arg["command"].as_str().unwrap();
            let quoted = command.strip_prefix("bash /workspace/factory/scripts/write-report.sh ").expect("fixed trusted helper");
            // Real shell parsing proves hostile JSON is one literal argument, not code.
            let out = Command::new("bash").args(["-c", &format!("set -- {quoted}; test $# -eq 1 || exit 9; printf '%s' \"$1\"")]).output().unwrap();
            assert!(out.status.success());
            assert_eq!(serde_json::from_slice::<Value>(&out.stdout).unwrap(), expected);
            if case == "throw" { return Err(ToolError::new("TEST", "synthetic shell failure")); }
            Ok(cv(json!({"success":case == "success","exit_code":if case == "invalid" {2} else {1},"stdout":"","stderr":""})))
        }).build().unwrap();
        let program = runtime
            .compile(&source)
            .unwrap_or_else(|d| panic!("report compile: {d:?}"));
        let value = j(&runtime.run(&program).unwrap().value);
        assert_eq!(*calls.lock().unwrap(), 1, "no reporting retry");
        let status = match case {
            "success" => "report_saved",
            "invalid" => "report_validation_failed",
            _ => "report_creation_failed",
        };
        assert_eq!(value, json!({"factory_status":status}));
    }
    println!(
        "PASS: Runlet 0.6 reporting success/nonzero/throw/one invocation/hostile JSON quoting"
    );
}
fn dossier_contract(root: &str) {
    let source = fs::read_to_string(format!("{root}/factory/tests/fixtures/research/dossier.runlet")).unwrap();
    let document = fs::read_to_string(format!("{root}/factory/coordinator.md")).unwrap();
    assert!(document.contains(&format!("```runlet\n{source}```")), "canonical dossier literal missing");
    for case in ["success", "check_failed", "edit_failed", "gate_failed", "empty"] {
        let text = if case == "empty" { "" } else { "quotes ' \" \\n $(touch BAD) `id`\n雪\n" };
        let mut registry = ToolRegistry::default();
        for name in ["shell", "edit"] {
            registry.register(ToolDescriptor { name:name.into(), summary:String::new(), input:CallSchema::positional(vec![Schema::Any]), output:Schema::Any, execution:ExecutionPolicy::Unsafe, schema_version:"1".into() }).unwrap();
        }
        let calls = Arc::new(Mutex::new(Vec::<String>::new()));
        let shell_calls = calls.clone();
        let edit_calls = calls.clone();
        let runtime = Runtime::builder().registry(registry).with_prelude()
            .input("input", Schema::Any, cv(json!({"dossier":text})))
            .tool("shell", move |args,_| {
                let arg=j(&args[0]); let cmd=arg["command"].as_str().unwrap();
                let gate=cmd.starts_with("/usr/local/bin/begin-writing ");
                let mut seen=shell_calls.lock().unwrap();
                if gate { assert_eq!(seen.as_slice(), ["check", "edit"]); }
                else { assert!(seen.is_empty()); assert!(cmd.starts_with("test -d /workspace/.factory/research")); }
                seen.push(if gate {"gate"} else {"check"}.into());
                Ok(cv(json!({"success": !(case=="check_failed" && !gate || case=="gate_failed" && gate)})))
            })
            .tool("edit", move |args,_| {
                let mut seen=edit_calls.lock().unwrap(); assert_eq!(seen.as_slice(), ["check"]); seen.push("edit".into());
                assert_eq!(j(&args[0]),json!({"op":"add","path":"/workspace/.factory/research/dossier.md","content":text}));
                if case=="edit_failed" { return Err(ToolError::new("TEST","synthetic")); }
                Ok(cv(json!({"status":"added"})))
            }).build().unwrap();
        let program=runtime.compile(&source).unwrap_or_else(|d|panic!("dossier compile: {d:?}"));
        let result=j(&runtime.run(&program).unwrap().value);
        assert_eq!(result,json!({"status":if case=="success" {"writing_ready"} else {"failed"}}));
        assert_eq!(calls.lock().unwrap().len(),match case {"empty"=>0,"check_failed"=>1,"edit_failed"=>2,_=>3});
    }
    println!("PASS: dossier bytes, ordered write/gate, failure stops, no replay");
}
fn main() {
    let a: Vec<String> = std::env::args().collect();
    dossier_contract(&a[1]);
    context_contract(&a[1]);
    report_contract(&a[1]);
}
