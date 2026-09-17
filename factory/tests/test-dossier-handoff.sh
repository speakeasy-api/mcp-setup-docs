#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
python3 - "$ROOT" <<'PY'
import pathlib,sys
r=pathlib.Path(sys.argv[1]);s=(r/'factory/tests/fixtures/research/dossier.runlet').read_text();d=(r/'factory/coordinator.md').read_text()
assert '```runlet\n'+s+'```' in d
assert 'content:input.dossier' in s and 'after saved' in s
assert 'text.replace' not in s and 'input.command' not in s
assert 'dossier_contract(&a[1]);' in (r/'factory/tests/fixtures/research/native_dispatch.rs').read_text()
print('PASS: exact data-only dossier handoff contract; native executor tests separately')
PY
