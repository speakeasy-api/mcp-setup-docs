#!/usr/bin/env bash
# Offline local slice: actual local wrapper + common validator + publication gate.
# This is not yet the complete Docker-to-fake-gh lifecycle acceptance matrix.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
TMP=$(mktemp -d)
TMP=$(cd "$TMP" && pwd -P)
trap 'rm -rf -- "$TMP"' EXIT
mkdir -p "$TMP/bin" "$TMP/repo/guides" "$TMP/runs"
ln -s "$TMP/runs" "$TMP/run-alias"
git -C "$TMP/repo" init -q
git -C "$TMP/repo" -c user.name=Fixture -c user.email=fixture@example.invalid commit --allow-empty -qm fixture
export FIXTURE_ROOT="$ROOT" FIXTURE_REPO="$TMP/repo" FIXTURE_LOG="$TMP/gh.log"
cat > "$TMP/bin/gh" <<'SH'
#!/bin/sh
echo unexpected-gh >> "$FIXTURE_LOG"
exit 99
SH
cat > "$TMP/bin/validate" <<'SH'
#!/bin/bash
set -euo pipefail
[[ $1 == --local && $4 =~ ^[a-f0-9]{32}$ ]]
exec bash "$FIXTURE_ROOT/factory/scripts/validate.sh" "$1" "$2" "$FIXTURE_REPO" "$4"
SH
cat > "$TMP/bin/run-kit" <<'PY'
#!/usr/bin/env python3
import json, os, pathlib, sys
assert not any(os.environ.get(k) for k in ('GH_TOKEN','GITHUB_TOKEN','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','READABLE_UPLOAD_OUTCOME','READABLE_ARTIFACT_URL'))
out=pathlib.Path(sys.argv[3]); assert out.resolve()==out
guide=out/'guide'; guide.mkdir()
report=dict(schema_version=1,outcome='converged',provider='Asana',slug='asana',persona='admin',summary='Offline fixture',open_questions=[],blockers=[],nits=[],review_rounds=0,artifacts=['research.md','meta.yaml','external.md','speakeasy.md'])
(out/'run-report.json').write_text(json.dumps(report))
files=[dict(name='run-report.json',text=json.dumps(report))]
for name in report['artifacts']:
    data=(pathlib.Path(os.environ['FIXTURE_ROOT'])/'guides/asana'/name).read_text()
    (guide/name).write_text(data); files.append(dict(name='guide/'+name,text=data))
(out/'session-transcript.json').write_text(json.dumps(dict(schema_version=1,kind='guide_factory_readable_transcript',files=files)))
state=dict(version=1,host_run_id=os.environ['FACTORY_HOST_RUN_ID'],workflow_run_id='',workflow_run_attempt=0,primary_outcome='converged',readable_export='ready',partial=False,publication_ready=True)
mode=os.environ['FIXTURE_MODE']
if mode=='failed': state['publication_ready']=False
if mode=='host-failed': state['primary_outcome']='failed'
if mode=='workflow': state['workflow_run_id']='9001'
if mode=='report-changed':
    (out/'run-report.json').write_text(json.dumps(dict(report,summary='Changed after freeze')))
if mode=='stale': state['host_run_id']='0'*32
if mode=='changed': (guide/'research.md').write_text('Changed after freeze')
if mode!='missing': (out/'finalization.json').write_text(json.dumps(state))
if mode=='success':
    # Publication remains forbidden even when local installation is eligible.
    import subprocess
    env=dict(os.environ,RUNNER_TEMP=str(out.parent),GITHUB_RUN_ID='9001',GITHUB_RUN_ATTEMPT='1',GH_REPO='acme/docs',ISSUE_NUMBER='42',FACTORY_PUBLICATION_RECEIPT=str(out.parent/'guide-factory-publication/publication-receipt.json'))
    publication=dict(state,workflow_run_id='9001',workflow_run_attempt=1)
    (out/'finalization.json').write_text(json.dumps(publication))
    result=subprocess.run(['python3',os.environ['FIXTURE_ROOT']+'/factory/scripts/publication-state.py','gate',str(out/'run-report.json')],env=env,capture_output=True)
    assert result.returncode!=0, 'production accepted missing readable upload'
    result=subprocess.run(['bash',os.environ['FIXTURE_ROOT']+'/factory/scripts/publish.sh','publish',str(out/'run-report.json')],env=env,capture_output=True)
    assert result.returncode!=0 and b'publication gates failed' in result.stderr, 'publisher did not reject missing upload at gate'
    (out/'finalization.json').write_text(json.dumps(state))
PY
chmod +x "$TMP/bin/"*
for mode in success failed host-failed stale changed report-changed workflow missing; do
  rm -rf "$TMP/repo/guides/asana"
  set +e
  PATH="$TMP/bin:$PATH" TMPDIR="$TMP/run-alias" FIXTURE_MODE="$mode" \
    FACTORY_LOCAL_RUN_KIT="$TMP/bin/run-kit" FACTORY_LOCAL_VALIDATE="$TMP/bin/validate" \
    GH_TOKEN=must-not-pass GITHUB_RUN_ID=9001 GITHUB_RUN_ATTEMPT=1 \
    READABLE_UPLOAD_OUTCOME=success READABLE_ARTIFACT_URL=https://must-not-pass.invalid \
    bash "$ROOT/factory/scripts/local-draft.sh" --title 'Draft Asana' --body 'Offline fixture' --slug asana >"$TMP/$mode.log" 2>&1
  code=$?
  set -e
  if [[ $mode == success ]]; then
    [[ $code == 0 ]] || { printf 'FAIL: local success rejected\n' >&2; exit 1; }
    cmp "$ROOT/guides/asana/research.md" "$TMP/repo/guides/asana/research.md"
  else
    [[ $code != 0 && ! -e "$TMP/repo/guides/asana" ]]
  fi
  [[ ! -e "$FIXTURE_LOG" ]]
  [[ -z $(find "$TMP/runs" -mindepth 1 -print -quit) ]]
  printf 'PASS: local lifecycle %s; no GitHub calls\n' "$mode"
done
