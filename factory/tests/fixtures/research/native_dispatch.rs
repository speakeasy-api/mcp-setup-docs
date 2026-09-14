// Test-only adapter to the real Runlet 0.6.0 Runtime, not an interpreter.
// Native tools and persistence are fake; assembler and private snapshot reader are real.
use runlet::{
    CallSchema, CanonicalValue as V, ExecutionPolicy, Runtime, Schema, ToolDescriptor, ToolError,
    ToolRegistry,
};
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
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
#[derive(Default)]
struct Fake {
    files: BTreeMap<String, String>,
    stdout: String,
    calls: usize,
}
fn dispatch(
    root: &str,
    assembler: &str,
    temp: &str,
    state: Arc<Mutex<Fake>>,
    topic: i64,
    index: i64,
    prior: Value,
    fail: bool,
) -> Value {
    let kind = if index == 0 { "initial" } else { "follow-up" };
    let fixture = if index == 0 {
        format!("topic-{topic}")
    } else {
        format!("follow-up-{index}")
    };
    let path = format!("{root}/factory/tests/fixtures/research/{fixture}.input.json");
    // Replace only known fixture scalar spellings; retain assembler-required field order.
    let mut assignment = fs::read_to_string(path).unwrap();
    if index > 0 {
        let old: Value = serde_json::from_str(&assignment).unwrap();
        assignment = assignment.replace(
            &format!("\"topic_id\": {}", old["topic_id"]),
            &format!("\"topic_id\": {topic}"),
        );
    }
    // Hostile issue text remains structured data, never shell syntax.
    assignment = assignment.replace(
        "Fixture provider",
        "Fixture $(touch /tmp/dispatch-should-not-execute); provider",
    );
    let hash = Command::new("shasum")
        .args(["-a", "256", &format!("{root}/factory/coordinator.md")])
        .output()
        .unwrap();
    let hash = String::from_utf8(hash.stdout)
        .unwrap()
        .split_whitespace()
        .next()
        .unwrap()
        .to_string();
    let input = json!({"topic":topic,"index":index,"kind":kind,"documentHash":hash,
        "assignmentJSON":assignment});
    let mut registry = ToolRegistry::default();
    for name in ["shell", "edit", "subagent", "prompt"] {
        registry
            .register(ToolDescriptor {
                name: name.into(),
                summary: String::new(),
                input: CallSchema::positional(vec![Schema::Any]),
                output: Schema::Any,
                execution: ExecutionPolicy::Unsafe,
                schema_version: "1".into(),
            })
            .unwrap();
    }
    let mut builder =
        Runtime::builder()
            .registry(registry)
            .with_prelude()
            .input("input", Schema::Any, cv(input));
    for name in ["shell", "edit", "subagent", "prompt"] {
        let state = state.clone();
        let root = root.to_string();
        let assembler = assembler.to_string();
        let temp = temp.to_string();
        let prior = prior.clone();
        builder = builder.tool(name, move |args,_| {
            let a=j(&args[0]); let mut s=state.lock().unwrap();
            match name {
                "shell" => {
                    let command=a["command"].as_str().unwrap();
                    assert!(!command.contains("touch /tmp"),"issue text entered command");
                    if command.starts_with("test -d ") { return Ok(cv(json!({"success":true,"stdout":""}))); }
                    if command.starts_with("bash /workspace/factory/scripts/read-research-handle.sh ") {
                        assert_eq!(command,format!("bash /workspace/factory/scripts/read-research-handle.sh {topic} {index}"));
                        let path=format!("/workspace/.factory/research/topic-{topic}-{}.handle.json", index-1);
                        // Exercise the actual bounded reader, not a projected/mock stdout.
                        use std::os::unix::fs::PermissionsExt;
                        let sandbox=fs::canonicalize(&temp).unwrap().join(format!("handle-reader-{topic}-{index}"));
                        let private=sandbox.join(".factory/research");
                        fs::create_dir_all(&private).unwrap();
                        for dir in [sandbox.join(".factory"), private.clone()] {
                            fs::set_permissions(dir,fs::Permissions::from_mode(0o700)).unwrap();
                        }
                        for (name, content) in &s.files {
                            let file=sandbox.join(name.strip_prefix("/workspace/").unwrap());
                            fs::write(&file,content).unwrap();
                            fs::set_permissions(file,fs::Permissions::from_mode(0o600)).unwrap();
                        }
                        let out=Command::new("bash").arg(format!("{root}/factory/scripts/read-research-handle.sh"))
                            .args([topic.to_string(),index.to_string()]).env("FACTORY_REPO_ROOT",&sandbox).output().unwrap();
                        assert!(out.status.success(),"actual private reader failed");
                        assert!(out.stdout.len()>65536,"large handle fixture required");
                        let stdout=String::from_utf8(out.stdout).unwrap();
                        assert_eq!(stdout,s.files[&path],"reader changed complete handle bytes");
                        return Ok(cv(json!({"success":true,"stdout":stdout})));
                    }
                    let words:Vec<_>=command.split_whitespace().collect();
                    assert_eq!(words.len(),9); assert_eq!(words[0],"/usr/local/bin/prepare-research-prompt");
                    let source=s.files.get(words[8]).expect("input persisted before assembly");
                    let input_path=format!("{temp}/topic-{topic}-{index}.json"); fs::write(&input_path,source).unwrap();
                    let out=Command::new(&assembler).args(["--document",&format!("{root}/factory/coordinator.md"),"--sha256",words[4],"--kind",words[6],"--input",&input_path]).output().unwrap();
                    assert!(out.status.success(),"real assembler failed"); s.stdout=String::from_utf8(out.stdout).unwrap();
                    assert!(s.stdout.ends_with('\n')); return Ok(cv(json!({"success":true,"stdout":s.stdout})));
                },
                "edit" => {
                    let path=a["path"].as_str().unwrap().to_string(); let content=a["content"].as_str().unwrap().to_string();
                    assert!(path.starts_with("/workspace/.factory/research/topic-"));
                    assert!(!s.files.contains_key(&path),"complete evidence overwritten");
                    s.files.insert(path.clone(),content); return Ok(cv(json!({"path":path,"status":"added"})));
                },
                _ => {
                    s.calls+=1; assert_eq!(a["prompt"].as_str().unwrap(),s.stdout,"assembler stdout changed");
                    let base=format!("/workspace/.factory/research/topic-{topic}-{index}");
                    assert_eq!(s.files[&format!("{base}.prompt.md")],s.stdout);
                    if index>0 { assert_eq!(name,"prompt"); assert_eq!(a["subagent"],prior,"original complete handle changed"); }
                    else { assert_eq!(name,"subagent"); }
                    assert!(a.get("model").is_none() && a.get("harness").is_none());
                    if fail { let mut e=ToolError::new("UNCERTAIN","fake interrupted continuation");e.uncertain=true;return Err(e); }
                    return Ok(cv(json!({"id":format!("native-topic-{topic}"),"generation":if index==0 {17+topic} else {41},
                        "name":format!("topic-{topic}"),"output":if topic == 2 && index == 1 { String::new() } else { format!("complete topic {topic}, attempt {index}\n\n") },
                        "updates":{"items":[{"opaque":{"extra":[1,2,3],"data":"u".repeat(70000*(index as usize+1))}}],"truncated":false}})));
                }
            }
        });
    }
    let runtime = builder.build().unwrap();
    let source = fs::read_to_string(format!(
        "{root}/factory/tests/fixtures/research/dispatch.runlet"
    ))
    .unwrap();
    let program = runtime
        .compile(&source)
        .unwrap_or_else(|d| panic!("canonical dispatch compile: {d:?}"));
    j(&runtime.run(&program).unwrap().value)
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
fn main() {
    let a: Vec<String> = std::env::args().collect();
    context_contract(&a[1]);
    report_contract(&a[1]);
    if a.get(2).map(String::as_str) == Some("--context") {
        return;
    }
    let state = Arc::new(Mutex::new(Fake::default()));
    let mut handles = vec![];
    for topic in 1..=5 {
        let r = dispatch(
            &a[1],
            &a[2],
            &a[3],
            state.clone(),
            topic,
            0,
            Value::Null,
            false,
        );
        assert_eq!(r["status"], "returned");
        let base = format!("/workspace/.factory/research/topic-{topic}-0");
        let saved = state.lock().unwrap();
        let stored: Value =
            serde_json::from_str(&saved.files[&format!("{base}.handle.json")]).unwrap();
        assert_eq!(
            stored, r["handle"],
            "returned handle persistence changed fields"
        );
        assert_eq!(
            saved.files[&format!("{base}.report.md")],
            r["handle"]["output"].as_str().unwrap()
        );
        drop(saved);
        handles.push(r["handle"].clone());
    }
    for (i, h) in handles.iter().enumerate() {
        assert_eq!(h["id"], format!("native-topic-{}", i + 1));
    }
    let r = dispatch(
        &a[1],
        &a[2],
        &a[3],
        state.clone(),
        1,
        1,
        handles[0].clone(),
        false,
    );
    assert_eq!(r["handle"]["generation"], 41);
    assert_eq!(r["handle"]["id"], handles[0]["id"]);
    let before = state.lock().unwrap().files.clone();
    let calls = state.lock().unwrap().calls;
    let failed = dispatch(
        &a[1],
        &a[2],
        &a[3],
        state.clone(),
        1,
        2,
        r["handle"].clone(),
        true,
    );
    assert_eq!(failed["status"], "failed");
    let s = state.lock().unwrap();
    assert_eq!(s.calls, calls + 1, "failed continuation retried");
    for (p, c) in before {
        assert_eq!(s.files[&p], c, "prior complete evidence changed");
    }
    assert!(
        !s.files
            .contains_key("/workspace/.factory/research/topic-1-2.handle.json")
    );
    assert!(
        !s.files
            .contains_key("/workspace/.factory/research/topic-1-2.report.md")
    );
    drop(s);
    let malformed = dispatch(
        &a[1],
        &a[2],
        &a[3],
        state.clone(),
        2,
        1,
        handles[1].clone(),
        false,
    );
    assert_eq!(malformed["status"], "failed");
    let s = state.lock().unwrap();
    assert!(
        !s.files
            .contains_key("/workspace/.factory/research/topic-2-1.handle.json")
    );
    assert!(
        !s.files
            .contains_key("/workspace/.factory/research/topic-2-1.report.md")
    );
    println!("PASS: real Runlet executor + real assembler + actual large-handle reader; fake native tools/persistence");
}
