"""Offline regression: failed local handoff is not a successful guide."""
import json, os, pathlib, subprocess, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[2]
HOST = 'a' * 32
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp).resolve()
    export = base / 'export'; export.mkdir(mode=0o700)
    report = dict(schema_version=1,outcome='failed',provider=None,slug=None,persona=None,summary='Factory model execution failed.',open_questions=[],blockers=['Factory model execution failed.'],nits=[],review_rounds=0,artifacts=[])
    state = dict(version=1,host_run_id=HOST,workflow_run_id='',workflow_run_attempt=0,primary_outcome='failed',readable_export='ready',partial=True,publication_ready=False)
    (export/'run-report.json').write_text(json.dumps(report, separators=(',', ':')))
    (export/'session-transcript.json').write_text(json.dumps(dict(schema_version=1,kind='guide_factory_readable_transcript',limited=True,omissions=['missing_candidate_report'],files=[])))
    def gate(ok):
        (export/'finalization.json').write_text(json.dumps(state))
        r = subprocess.run(['python3',str(ROOT/'factory/scripts/publication-state.py'),'local-gate',str(export),HOST],capture_output=True,timeout=5)
        assert (r.returncode == 0) == ok, 'local failure identity gate'
    gate(True)
    repo=base/'repo'; repo.mkdir(); (repo/'guides').mkdir(); (repo/'guides/.gitkeep').touch()
    subprocess.run(['git','init','-q',str(repo)],check=True,timeout=5)
    subprocess.run(['git','-C',str(repo),'add','.'],check=True,timeout=5)
    subprocess.run(['git','-C',str(repo),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture'],check=True,timeout=5)
    r=subprocess.run([str(ROOT/'factory/scripts/validate.sh'),'--local',str(export),str(repo),HOST],capture_output=True,timeout=10)
    assert r.returncode == 0, 'real noninstalling validation failed'
    state['host_run_id']='b'*32; gate(False)
    state['host_run_id']=HOST; state['publication_ready']=True; gate(False)
    state['publication_ready']=False
    report['summary']='synthetic-untrusted-text'; (export/'run-report.json').write_text(json.dumps(report)); gate(False)
    runner=base/'run'; runner.write_text('#!/bin/bash\nprintf \'{"outcome":"%s","slug":%s}\\n\' "$CASE_OUTCOME" "$CASE_SLUG" > "$3/run-report.json"\n'); runner.chmod(0o700)
    validator=base/'validate'; validator.write_text('#!/bin/bash\ntouch "$VALIDATED"\n'); validator.chmod(0o700)
    for outcome,slug,ok in [('failed','null',True),('blocked','null',True),('awaiting_scope','null',True),('failed','"other"',False),('converged','null',False)]:
        marker=base/'validated'; marker.unlink(missing_ok=True)
        env=dict(os.environ,FACTORY_LOCAL_RUN_KIT=str(runner),FACTORY_LOCAL_VALIDATE=str(validator),CASE_OUTCOME=outcome,CASE_SLUG=slug,VALIDATED=str(marker))
        r=subprocess.run([str(ROOT/'factory/scripts/local-draft.sh'),'--title','T','--body','B','--slug','acme'],env=env,capture_output=True,text=True,timeout=5)
        assert (r.returncode==0)==ok, ('local slug contract',outcome,slug)
        if ok: assert marker.exists() and f'validated outcome={outcome} slug=none' in r.stdout
print('PASS: local failure identity, fixed fallback, and slug contracts')
