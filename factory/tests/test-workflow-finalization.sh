#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
python3 - "$ROOT" <<'PY'
import os
import json
import shutil
import pathlib
import subprocess
import sys
import tempfile

root = pathlib.Path(sys.argv[1])
workflow = (root / '.github/workflows/guide-draft.yml').read_text()
def step(name):
    return workflow.split('      - name: ' + name + '\n', 1)[1].split('      - name:', 1)[0]

upload = step('Upload readable session transcript')
assert 'id: readable_upload' in upload
assert 'path: ${{ runner.temp }}/export/session-transcript.json' in upload
assert 'retention-days: 7' in upload and 'if-no-files-found: error' in upload
assert 'steps.publication_gate.outputs.ready == \'true\'' in step('Validate export')
assert 'steps.validate.outcome == \'success\'' in step('Publish guide')
assert 'notify-publication' in step('Report outcome')
assert 'publication-state.py' in step('Set up publisher')
assert 'validate-report.sh' in step('Set up publisher')
assert 'guide-draft-issue-${{ github.event.issue.number }}' in workflow
assert all('        timeout-minutes:' in chunk for chunk in workflow.split('      - name: ')[1:])
# Run the actual workflow shell handoff with a nonzero fake host; don't merely
# search for a success-only copy. No GitHub/provider process is invoked.
body = step('Run Kit').split('        run: |\n', 1)[1]
script = '\n'.join(line[10:] for line in body.splitlines())
with tempfile.TemporaryDirectory() as tmp:
    cwd = pathlib.Path(tmp)
    (cwd / 'factory/scripts').mkdir(parents=True)
    fake = cwd / 'factory/scripts/run-kit.sh'
    fake.write_text('mkdir -p "$3"\nprintf \'{"outcome":"failed"}\' >"$3/run-report.json"\nexit 7\n')
    env = dict(os.environ, RUNNER_TEMP=tmp)
    result = subprocess.run(['bash', '-e', '-c', script], cwd=cwd, env=env, capture_output=True)
    assert result.returncode == 7
    assert (cwd / 'run-report.json').read_text() == '{"outcome":"failed"}'
# Exercise actual bootstrap shell and actual gate shell, not only YAML strings.
with tempfile.TemporaryDirectory() as temp:
    cwd = pathlib.Path(temp).resolve()
    (cwd/'bin').mkdir()
    gh = cwd/'bin/gh'
    gh.write_text("#!/bin/bash\nif [[ $1 == issue && $2 == view ]]; then echo guide:blocked; fi\nif [[ $1 == issue && $2 == comment ]]; then while (($#)); do if [[ $1 == --body-file ]]; then cat \"$2\" >\"$RUNNER_TEMP/comment\"; break; fi; shift; done; fi\n")
    gh.chmod(0o700)
    env = dict(os.environ, RUNNER_TEMP=str(cwd), GH_REPO='acme/docs', ISSUE_NUMBER='42',
               RUN_URL='https://github.com/acme/docs/actions/runs/9001', GH_TOKEN='NEVER_LOG_TOKEN',
               PATH=str(cwd/'bin')+':'+os.environ['PATH'])
    script = '\n'.join(line[10:] for line in step('Bootstrap failure fallback').split('        run: |\n',1)[1].splitlines())
    result = subprocess.run(['bash','-e','-c',script], cwd=cwd, env=env, capture_output=True)
    assert result.returncode == 0, result.stderr
    comment = (cwd/'comment').read_text()
    assert 'publisher setup' in comment and env['RUN_URL'] in comment
    assert 'NEVER_LOG_TOKEN' not in comment + result.stdout.decode() + result.stderr.decode()

    host=cwd/'guide-factory-publisher/factory/scripts'; host.mkdir(parents=True)
    shutil.copy(root/'factory/scripts/publication-state.py', host)
    export=cwd/'export'; (export/'guide').mkdir(parents=True)
    report=dict(schema_version=1,outcome='converged',provider='Fixture',slug='fixture',persona='admin',summary='Fixture',open_questions=[],blockers=[],nits=[],review_rounds=0,artifacts=['research.md','meta.yaml','external.md','speakeasy.md'])
    (cwd/'run-report.json').write_text(json.dumps(report))
    (export/'run-report.json').write_text(json.dumps(report))
    files=[dict(name='run-report.json',text=json.dumps(report))]
    for name in report['artifacts']:
        (export/'guide'/name).write_text('Trusted '+name)
        files.append(dict(name='guide/'+name,text='Trusted '+name))
    (export/'session-transcript.json').write_text(json.dumps(dict(schema_version=1,kind='guide_factory_readable_transcript',files=files)))
    env.update(GITHUB_RUN_ID='9001',GITHUB_RUN_ATTEMPT='1',FACTORY_PUBLICATION_RECEIPT=str(cwd/'guide-factory-publication/publication-receipt.json'),GITHUB_ENV=str(cwd/'env'),GITHUB_OUTPUT=str(cwd/'output'))
    script='\n'.join(line[10:] for line in step('Check publication gates').split('        run: |\n',1)[1].splitlines())
    for case in ('ready','upload-failed','missing-url','unready','mutated'):
        (cwd/'output').write_text('')
        (export/'finalization.json').write_text(json.dumps(dict(version=1,primary_outcome='converged',readable_export='ready',partial=False,publication_ready=case!='unready')))
        env.update(READABLE_UPLOAD_OUTCOME='failure' if case=='upload-failed' else 'success',READABLE_ARTIFACT_URL='' if case=='missing-url' else 'https://github.com/acme/docs/actions/runs/9001/artifacts/123')
        if case=='mutated': (export/'guide/research.md').write_text('Late candidate')
        result=subprocess.run(['bash','-e','-c',script],cwd=cwd,env=env,capture_output=True)
        assert result.returncode==0, result.stderr
        assert (cwd/'output').read_text().strip() == 'ready='+('true' if case=='ready' else 'false')
print('PASS: actual nonzero handoff, bootstrap fallback, upload/readiness/byte-identity gate matrix and step bounds')
PY
