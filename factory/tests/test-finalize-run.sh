#!/usr/bin/env bash
# Actual run-kit + real supervisor/finalizer; offline synthetic Kit/Docker fixture.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
tmp=$(cd "$tmp" && pwd -P)
mkdir "$tmp/bin" "$tmp/private"
chmod 700 "$tmp/private"
printf '{}\n' > "$tmp/issue.json"
printf '{}\n' > "$tmp/catalog.json"
printf 'outside sentinel\n' > "$tmp/outside"
cat > "$tmp/bin/docker" <<'PY'
#!/usr/bin/env python3
import json, os, pathlib, sys
args=sys.argv[1:]
state=pathlib.Path(os.environ['FAKE_STATE'])
command=args[0]
if command == 'image': print('synthetic-image'); sys.exit(0)
if command == 'create':
    record={'id':'b'*64,'removed':False,'mounts':{}}
    for i,arg in enumerate(args):
        if arg=='--label': record['owner']=args[i+1].split('=',1)[1]
        if arg=='--mount':
            fields=dict(v.split('=',1) for v in args[i+1].split(',') if '=' in v)
            record['mounts'][fields['dst']]=fields['src']
    state.write_text(json.dumps(record)); print(record['id']); sys.exit(0)
record=json.loads(state.read_text())
if command=='inspect': print(record['id'] if args[2]=='{{.Id}}' else record['owner'])
elif command=='start':
    home=pathlib.Path(record['mounts']['/kit-home'])
    work=pathlib.Path(record['mounts']['/workspace'])
    sessions=home/'.kit/sessions/w-synthetic'; sessions.mkdir(parents=True)
    item={'schema_version':3,'session_id':'synthetic-session','generation':1,'item':{'kind':'Assistant','parts':[{'Text':{'text':'Public fixture finding synthetic-provider-key','metadata':{}}}]}}
    (sessions/'fixture.jsonl').write_text(json.dumps(item)+'\n')
    (work/'.factory').mkdir()
    report=dict(schema_version=1,outcome='converged',provider='Example',slug='example',persona='admin',summary='Stale synthetic-provider-key',open_questions=[],blockers=[],nits=[],review_rounds=0,artifacts=['research.md','meta.yaml','external.md','speakeasy.md'])
    if os.environ.get('FAKE_CONVERGED') == '1': report['slug']='asana'
    (work/'.factory/run-report.json').write_text(json.dumps(report))
    guide=work/'guides'/report['slug']; guide.mkdir(parents=True)
    for name in report['artifacts']: (guide/name).write_text('Public synthetic draft')
    if os.environ.get('FAKE_CONVERGED') == '1':
        for name in report['artifacts']: (guide/name).write_bytes((pathlib.Path(record['mounts']['/repo'])/'guides/asana'/name).read_bytes())
    if os.environ.get('FAKE_BAD') == 'guide':
        with (guide/'research.md').open('a') as f: f.write('\nsynthetic-provider-key\n')
    if os.environ.get('FAKE_BAD') == 'transcript':
        (sessions/'fixture.jsonl').write_text('malformed complete record\n')
    (work/'outside-link').symlink_to(os.environ['OUTSIDE'])
elif command=='wait': print('0' if os.environ.get('FAKE_CONVERGED') == '1' else '7')
elif command=='logs': print('PRIVATE RAW FIXTURE MUST NOT BE EXPORTED')
elif command=='rm': record['removed']=True; state.write_text(json.dumps(record))
elif command=='ps':
    if not record['removed']: print(record['id'])
else: sys.exit(2)
PY
chmod 700 "$tmp/bin/docker"
# Nonzero lifecycle must still leave a validated host report, without installing
# the stale converged candidate or leaking private raw logs/provider key.
if PATH="$tmp/bin:$PATH" FACTORY_DOCKER="$tmp/bin/docker" FACTORY_PRIVATE_ROOT="$tmp/private" FAKE_STATE="$tmp/state" OUTSIDE="$tmp/outside" OPENROUTER_API_KEY=synthetic-provider-key bash "$ROOT/factory/scripts/run-kit.sh" "$tmp/issue.json" "$tmp/catalog.json" "$tmp/export" >"$tmp/stdout" 2>"$tmp/stderr"; then
  printf 'provider-exit wrapper incorrectly succeeded\n' >&2; exit 1
fi
bash "$ROOT/factory/scripts/validate-report.sh" "$tmp/export/run-report.json"
jq -e '.outcome == "failed" and .artifacts == []' "$tmp/export/run-report.json" >/dev/null
jq -e '.primary_outcome == "failed" and .readable_export == "ready" and .publication_ready == false' "$tmp/export/finalization.json" >/dev/null
[[ ! -e "$tmp/export/guide" ]]
if grep -R -q -E 'synthetic-provider-key|PRIVATE RAW FIXTURE' "$tmp/export"; then exit 1; fi
bash "$ROOT/factory/scripts/validate-diagnostics.sh" "$tmp/export/factory-diagnostics.json"
grep -qx 'outside sentinel' "$tmp/outside"
run=$(find "$tmp/private" -mindepth 1 -maxdepth 1 -type d)
[[ -n $run && ! -e "$run/home" && ! -e "$run/workspace" ]]
printf 'actual host wrapper offline finalization checks passed\n'

PATH="$tmp/bin:$PATH" FACTORY_DOCKER="$tmp/bin/docker" FACTORY_PRIVATE_ROOT="$tmp/private" FAKE_STATE="$tmp/state-success" FAKE_CONVERGED=1 OUTSIDE="$tmp/outside" OPENROUTER_API_KEY=synthetic-provider-key bash "$ROOT/factory/scripts/run-kit.sh" "$tmp/issue.json" "$tmp/catalog.json" "$tmp/success" >"$tmp/stdout" 2>"$tmp/stderr"
jq -e '.primary_outcome == "converged" and .readable_export == "ready" and .publication_ready == true' "$tmp/success/finalization.json" >/dev/null
for name in research.md meta.yaml external.md speakeasy.md; do
  cmp "$ROOT/guides/asana/$name" "$tmp/success/guide/$name"
done
jq -e ' .limited == true ' "$tmp/success/execution-transcript.json" >/dev/null
printf 'current host validation and byte-preserving frozen guide checks passed\n'

for bad in guide transcript; do
  if PATH="$tmp/bin:$PATH" FACTORY_DOCKER="$tmp/bin/docker" FACTORY_PRIVATE_ROOT="$tmp/private" FAKE_STATE="$tmp/state-$bad" FAKE_CONVERGED=1 FAKE_BAD="$bad" OUTSIDE="$tmp/outside" OPENROUTER_API_KEY=synthetic-provider-key bash "$ROOT/factory/scripts/run-kit.sh" "$tmp/issue.json" "$tmp/catalog.json" "$tmp/$bad" >"$tmp/stdout" 2>"$tmp/stderr"; then exit 1; fi
  jq -e '.primary_outcome == "converged" and .publication_ready == false' "$tmp/$bad/finalization.json" >/dev/null
  bash "$ROOT/factory/scripts/validate-report.sh" "$tmp/$bad/run-report.json"
  bash "$ROOT/factory/scripts/validate-diagnostics.sh" "$tmp/$bad/factory-diagnostics.json"
  [[ ! -e "$tmp/$bad/guide" ]]
done
printf 'changed-guide and failed-readable export remain ineligible\n'
