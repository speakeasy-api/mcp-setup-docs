#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
python3 - "$ROOT" <<'PY'
import ast,json,os,pathlib,signal,subprocess,sys,tempfile,shutil
root=pathlib.Path(sys.argv[1]); tmp=pathlib.Path(tempfile.mkdtemp()).resolve(); log=tmp/'log'
image='mcp-setup-docs-kit:0.1.134'
(tmp/'probe').mkdir()
# Exercise the actual fixture helpers without running its acceptance matrix.
source=(root/'factory/tests/fixtures/lifecycle/connected.py').read_text()
for node in ast.parse(source).body:
    if isinstance(node,ast.FunctionDef) and node.name in ('call','cleanup_containers'):
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<fixture-helper>','exec'))
try:
    cid=subprocess.check_output(['docker','create','--platform','linux/amd64','--label','factory.run-id='+'a'*32,'--mount','type=bind,src='+str(tmp/'probe')+',dst=/fixture','--entrypoint','/bin/sh',image,'-c','sleep 60'],text=True,timeout=15).strip()
    try:
        call(['docker','start','--attach',cid],timeout=.5)
        raise AssertionError('expected fixture timeout')
    except subprocess.TimeoutExpired: pass
    assert cleanup_containers()==1
    print('PASS: actual fixture timeout reaps CLI and removes owned Docker container')
finally:
    cleanup_containers()
    shutil.rmtree(tmp)
PY
