#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
python3 - "$ROOT" <<'PY'
import ast, os, pathlib, stat, sys, tempfile
root=pathlib.Path(sys.argv[1])
source=(root/'factory/scripts/run-kit.sh').read_text().split("<<'PY'\n",1)[1].rsplit('\nPY',1)[0]
tree=ast.parse(source)
nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('safe_path','local_provider')]
assert len(nodes)==2, 'local-only provider selector missing'
scope=dict(os=os,pathlib=pathlib,stat=stat)
exec(compile(ast.Module(body=nodes,type_ignores=[]),'<provider>', 'exec'),scope)
select=scope['local_provider']
assert select({},str(root)) == ('openrouter',None)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp).resolve()/'credential.json'; p.write_text('FAKE_TEST_ONLY'); p.chmod(0o600)
 valid={'FACTORY_LOCAL_RUN':'1','FACTORY_LOCAL_OPENAI_CREDENTIAL_FILE':str(p)}
 assert select(valid,str(root)) == ('openai-subscription',str(p))
 for change in ({'FACTORY_LOCAL_RUN':''},{'GITHUB_ACTIONS':'true'},{'GITHUB_RUN_ID':'1'}):
  try:select(valid|change,str(root))
  except ValueError:pass
  else:raise AssertionError('production override accepted')
 p.chmod(0o644)
 try:select(valid,str(root))
 except ValueError:pass
 else:raise AssertionError('public credential accepted')
 p.chmod(0o600); alias=p.parent/'alias'; alias.symlink_to(p)
 try:select(valid|{'FACTORY_LOCAL_OPENAI_CREDENTIAL_FILE':str(alias)},str(root))
 except ValueError:pass
 else:raise AssertionError('symlink accepted')
 os.unlink(alias);os.link(p,alias)
 try:select(valid,str(root))
 except ValueError:pass
 else:raise AssertionError('hardlink accepted')
 os.unlink(alias)
 try:select(valid,str(p.parent))
 except ValueError:pass
 else:raise AssertionError('credential inside build context accepted')
print('PASS: local subscription selection, production rejection, private-file boundary')
PY
TMP=$(mktemp -d)
TMP=$(cd "$TMP" && pwd -P)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/repo/factory" "$TMP/input" "$TMP/workspace"
printf 'fixture prompt' > "$TMP/repo/factory/coordinator.md"
printf '{}' > "$TMP/input/issue.json"
printf '{}' > "$TMP/input/catalog.json"
cat > "$TMP/mock-controller" <<'MOCK'
#!/usr/bin/env python3
import os,sys
args=sys.argv[1:]
expected={'--provider':os.environ['EXPECTED_PROVIDER'],'--workspace':os.environ['FACTORY_WORKSPACE_ROOT'],
          '--input-root':os.environ['FACTORY_INPUT_ROOT'],'--home':os.environ['FACTORY_KIT_HOME'],
          '--kit-binary':'/trusted/kit','--model':'fixture','--reasoning-effort':'medium','--request-budget-seconds':'300'}
assert len(args)==len(expected)*2
assert dict(zip(args[::2],args[1::2]))==expected
MOCK
chmod 700 "$TMP/mock-controller"
for provider in openrouter openai-subscription; do
  FACTORY_REPO_ROOT="$TMP/repo" FACTORY_INPUT_ROOT="$TMP/input" FACTORY_WORKSPACE_ROOT="$TMP/workspace" FACTORY_KIT_HOME="$TMP/home" GUIDE_FACTORY_BIN="$TMP/mock-controller" KIT_BIN=/trusted/kit KIT_MODEL=fixture KIT_REASONING_EFFORT=medium FACTORY_PROVIDER="$provider" EXPECTED_PROVIDER="$provider" bash "$ROOT/factory/scripts/container-entrypoint.sh"
done
# Actual controller configuration owns the credential flags, not the shell.
(cd "$ROOT/go" && go test ./cmd/guide-factory -run '^TestConfiguration' -count=1)
printf 'PASS: entrypoint forwarding and actual controller provider configuration\n'
