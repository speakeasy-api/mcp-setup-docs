#!/usr/bin/env python3
"""Offline real-Docker lifecycle, actual workflow shell and publisher; no provider/GH."""
import json, os, pathlib, shutil, signal, subprocess, tempfile
root=pathlib.Path(__file__).resolve().parents[4]
tmp=pathlib.Path(tempfile.mkdtemp()).resolve(); tmp.chmod(0o700)
log=tmp/'commands.log'
image=None
completed=False
def call(args, env=None, cwd=None, ok=True, timeout=90):
    with log.open('ab') as out:
        p=subprocess.Popen(args,env=env,cwd=cwd or root,stdout=out,stderr=out,start_new_session=True)
        try:
            code=p.wait(timeout=timeout)
        except BaseException:
            if p.poll() is None:
                os.killpg(p.pid,signal.SIGTERM)
                try: p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(p.pid,signal.SIGKILL); p.wait(timeout=5)
            raise
    if ok and code: raise AssertionError('command failed: '+str(args[:2]))
    return code

def cleanup_containers():
    if image is None: return 0
    removed=0
    ids=subprocess.check_output(['docker','ps','--all','--filter','ancestor='+image,'--format','{{.ID}}'],timeout=10,text=True).split()
    for cid in ids:
        v=json.loads(subprocess.check_output(['docker','inspect',cid],timeout=10))[0]
        mounts=v['Mounts']
        if v['Config']['Image']!=image or not mounts or not all(m['Source'].startswith(str(tmp)+'/') for m in mounts): continue
        owner=v['Config']['Labels'].get('factory.run-id','')
        assert len(owner)==32 and all(c in '0123456789abcdef' for c in owner)
        subprocess.run(['docker','rm','--force',v['Id']],check=True,stdout=subprocess.DEVNULL,timeout=10)
        assert not subprocess.check_output(['docker','ps','--all','--filter','id='+v['Id'],'--format','{{.ID}}'],timeout=10).strip()
        removed+=1
    return removed

def interrupted(signum, frame):
    raise KeyboardInterrupt('fixture interrupted')
signal.signal(signal.SIGTERM, interrupted)
signal.signal(signal.SIGINT, interrupted)
workflow=(root/'.github/workflows/guide-draft.yml').read_text()
def step(name):
    block=workflow.split('      - name: '+name+'\n',1)[1].split('\n      - name:',1)[0]
    return '\n'.join(line[10:] for line in block.split('        run: |\n',1)[1].splitlines())
try:
    env=dict(os.environ,GOTOOLCHAIN='go1.27.0',CGO_ENABLED='0')
    image='factory-connected-'+tmp.name.lower().replace('_','-')+'-fixture'
    shutil.copy(root/'factory/tests/fixtures/lifecycle/kit',tmp/'kit')
    (tmp/'Dockerfile').write_text('FROM mcp-setup-docs-kit:0.1.134\nCOPY kit /usr/local/bin/kit\n')
    call(['docker','image','inspect','mcp-setup-docs-kit:0.1.134'])
    call(['docker','build','--platform','linux/amd64','-t',image,str(tmp)],timeout=120)
    # Build-only overlay: instrument exact host terminal callback and return,
    # including all deferred CompleteHost cleanup. Production source is unchanged.
    source=root/'go/cmd/supervise-factory/main.go'; text=source.read_text()
    needle='func supervise(ctx context.Context, o options, s settings) (status int) {'
    assert text.count(needle)==1
    text=text.replace(needle,needle+'\n var terminal time.Time\n defer func(){ if !terminal.IsZero(){ _ = os.WriteFile(os.Getenv("FACTORY_TEST_TIMING"), []byte(strconv.FormatInt(time.Since(terminal).Nanoseconds(),10)),0600) } }()')
    needle='deadline = at.Add(budget)'; assert text.count(needle)==1
    observer = """terminal = at
 logs, _ := os.ReadFile(filepath.Join(filepath.Dir(o.result), "container.stdout"))
 if bytes.Contains(logs, []byte("SEPARATE_GROUP_PROVEN")) { _ = os.WriteFile(os.Getenv("FACTORY_TEST_TIMING")+".group", []byte("proven"),0600) }
 var selected int64
 base := filepath.Dir(filepath.Dir(o.result))
 _ = filepath.Walk(filepath.Join(base,"home/.kit/sessions"),func(path string, info os.FileInfo, err error) error { if err==nil && info.Mode().IsRegular() && strings.HasSuffix(path,".jsonl") { selected += info.Size() }; return nil })
 for _, path := range []string{".factory/run-report.json","guides/asana/research.md","guides/asana/meta.yaml","guides/asana/external.md","guides/asana/speakeasy.md"} { if info, err := os.Stat(filepath.Join(base,"workspace",path)); err==nil { selected += info.Size() } }
 _ = os.WriteFile(os.Getenv("FACTORY_TEST_TIMING")+".bytes", []byte(strconv.FormatInt(selected,10)),0600)
 """
    text=text.replace(needle,observer+needle)
    assert text.count('1800 * time.Second')==1
    text=text.replace('1800 * time.Second','2 * time.Second')
    (tmp/'main.go').write_text(text)
    (tmp/'overlay.json').write_text(json.dumps(dict(Replace={str(source):str(tmp/'main.go')})))
    call(['go','build','-overlay',str(tmp/'overlay.json'),'-o',str(tmp/'supervisor'),'./cmd/supervise-factory'],env,root/'go',timeout=120)
    timings=[]
    for mode in ('success','blocked','awaiting_scope','crash','timeout','sanitizer','malformed','truncated','maximum','upload-failure','comment-failure'):
        row=tmp/mode; row.mkdir(mode=0o700); (row/'private').mkdir(mode=0o700)
        repo=row/'repo'; (repo/'guides').mkdir(parents=True); (repo/'guides/.keep').touch()
        call(['git','init','-q',str(repo)])
        # Match checkout's trusted remote; the git shim below still intercepts pushes.
        call(['git','remote','add','origin','https://github.com/acme/docs.git'],cwd=repo)
        call(['git','config','user.name','Fixture'],cwd=repo); call(['git','config','user.email','fixture@example.invalid'],cwd=repo)
        call(['git','add','.'],cwd=repo); call(['git','commit','-qm','fixture'],cwd=repo)
        (row/'bin').mkdir(); shutil.copy(root/'factory/tests/fixtures/lifecycle/gh',row/'bin/gh')
        realgit=shutil.which('git')
        (row/'bin/git').write_text('#!/bin/sh\n[ "$1" != push ] || exit 0\nexec '+realgit+' "$@"\n'); (row/'bin/git').chmod(0o700)
        (row/'gh.json').write_text('{"prs":0,"comments":[]}')
        (row/'issue.json').write_text(json.dumps(dict(mode=mode))); (row/'catalog.json').write_text('{}')
        (row/'env').touch(); (row/'output').touch()
        host=row/'guide-factory-publisher/factory/scripts'; host.mkdir(parents=True)
        for name in ('publication-state.py','validate-report.sh'): shutil.copy(root/'factory/scripts'/name,host/name)
        e=dict(env,RUNNER_TEMP=str(row),GITHUB_RUN_ID='9001',GITHUB_RUN_ATTEMPT='1',GH_REPO='acme/docs',ISSUE_NUMBER='42',GITHUB_ENV=str(row/'env'),GITHUB_OUTPUT=str(row/'output'),FACTORY_KIT_IMAGE=image,FACTORY_SUPERVISOR=str(tmp/'supervisor'),FACTORY_PRIVATE_ROOT=str(row/'private'),FACTORY_TEST_TIMING=str(row/'timing'),OPENROUTER_API_KEY='fixture-provider-key',FACTORY_PUBLICATION_RECEIPT=str(row/'guide-factory-publication/publication-receipt.json'),PUBLISHER_PATH=str(root/'factory/scripts/publish.sh'),FAKE_GH=str(row/'gh.json'),PATH=str(row/'bin')+':'+env['PATH'],FACTORY_RETRY_DELAY='0')
        code=call(['bash','-e','-c',step('Run Kit')],e,ok=False,timeout=120)
        e.update(line.split('=',1) for line in (row/'env').read_text().splitlines())
        report=json.loads((row/'run-report.json').read_text()); state=json.loads((row/'export/finalization.json').read_text())
        duration=int((row/'timing').read_text())/1e9; assert duration<300
        timings.append((mode,duration))
        run=next((row/'private').iterdir()); result=json.loads((run/'host/result.json').read_text())
        assert result['container_removed'] is True
        assert result['model_termination']==('research_timeout' if mode=='timeout' else 'provider_exit' if mode=='crash' else 'completed')
        with (row/'remaining').open('w') as out:
            subprocess.run(['docker','ps','--all','--filter','label=factory.run-id='+e['FACTORY_HOST_RUN_ID'],'--format','{{.ID}}'],stdout=out,check=True,timeout=10)
        assert not (row/'remaining').read_text().strip()
        assert [p for p in run.rglob('*') if p.is_file()]==[run/'host/result.json']
        assert not (run/'workspace/canary').exists()
        if mode=='timeout': assert (row/'timing.group').read_text()=='proven'
        if mode=='maximum': assert int((row/'timing.bytes').read_text())==8<<20
        if mode in ('crash','timeout'): assert report['outcome']=='failed' and code!=0
        if mode in ('blocked','awaiting_scope'): assert report['outcome']==mode
        # Upload fixture transfers ONLY the real sanitized artifact, not a made-up
        # frozen report. The production workflow's shell gate consumes its result.
        readable=row/'export/session-transcript.json'
        upload=readable.is_file() and mode!='upload-failure'
        if upload:
            shutil.copy(readable,row/'uploaded-readable.json')
            public=readable.read_text()
            assert 'fixture-provider-key' not in public and 'HOSTILE_PRIVATE_CANARY' not in public
        e.update(READABLE_UPLOAD_OUTCOME='success' if upload else 'failure',READABLE_ARTIFACT_URL='https://github.com/acme/docs/actions/runs/9001/artifacts/123' if upload else '')
        call(['bash','-e','-c',step('Check publication gates')],e)
        e.update(line.split('=',1) for line in (row/'env').read_text().splitlines())
        ready='ready=true' in (row/'output').read_text()
        expected_pr=mode in ('success','truncated','maximum','comment-failure')
        assert ready==expected_pr, (mode,'unexpected publication eligibility')
        expected_report=mode if mode in ('blocked','awaiting_scope') else ('failed' if mode in ('crash','timeout','sanitizer','malformed') else 'converged')
        assert report['outcome']==expected_report, (mode,'unexpected report')
        assert state['primary_outcome']==(mode if mode in ('blocked','awaiting_scope') else 'failed' if mode in ('crash','timeout') else 'converged')
        assert state['readable_export']==('failed' if mode=='malformed' else 'ready')
        if mode=='truncated': assert state['partial'] is True
        if ready:
            call(['bash',str(root/'factory/scripts/validate.sh'),str(row/'export'),str(repo)],e)
            if mode=='comment-failure': e['FAIL_COMMENT']='1'
            publication=call(['bash','-e','-c',step('Publish guide')],e,repo,ok=False)
            if mode=='comment-failure':
                assert publication!=0 and pathlib.Path(e['FACTORY_PUBLICATION_RECEIPT']).is_file()
                e.pop('FAIL_COMMENT')
                call(['bash','-e','-c',step('Report outcome')],e,repo)
                call(['bash','-e','-c',step('Report outcome')],e,repo)
            else: assert publication==0
        else: call(['bash','-e','-c',step('Report outcome')],e,repo)
        gh=json.loads((row/'gh.json').read_text()); assert gh['prs']==int(ready)
        assert pathlib.Path(e['FACTORY_PUBLICATION_RECEIPT']).exists()==ready
        if ready:
            receipt=json.loads(pathlib.Path(e['FACTORY_PUBLICATION_RECEIPT']).read_text())
            assert receipt['publication']=='created' and receipt['notification']=='sent' and receipt['pr_url']=='https://github.com/acme/docs/pull/77'
        assert len(gh['comments'])==1
        comment=gh['comments'][0]['body']
        assert 'actions/runs/9001' in comment and 'fixture-provider-key' not in comment
        if mode=='awaiting_scope': assert '1. Which account' in comment
        if mode=='comment-failure': assert '/pull/77' in comment
        if mode=='upload-failure': assert not ready and 'unavailable' in comment
        print(f'PASS: connected {mode} primary={state["primary_outcome"]} readable={state["readable_export"]} prs={gh["prs"]} finalization_seconds={duration:.3f}',flush=True)
    maximum=max(x[1] for x in timings)
    print(f'MEASURED maximum finalization seconds={maximum:.6f}; original_300s_headroom={300-maximum:.6f}',flush=True)
    completed=True
except BaseException:
    print('Connected fixture failed; private evidence: '+str(tmp),flush=True)
    raise
finally:
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    cleanup_containers()
    if completed:
        call(['docker','image','rm',image])
        shutil.rmtree(tmp)
