#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
python3 -B - "$ROOT" <<'PY'
import copy, json, pathlib, sys, textwrap
root = pathlib.Path(sys.argv[1]) / 'factory/tests'
connected = (root / 'fixtures/lifecycle/connected.py').read_text()
finalize = (root / 'test-finalize-run.sh').read_text()
blocks = {
    'connected': textwrap.dedent(connected[connected.index('\n        initial_timings,') + 1:connected.index("\n        assert state['host_reason']")]),
    'finalize': finalize[finalize.index('initial_timings, observed_timings ='):finalize.index('\nPY_ASSERT')],
}
result = dict(exit_code=0, container_removed=True, timings=dict(research_ms=1, writing_ms=2))
failures = []
for source, block in blocks.items():
    code = compile(block, source, 'exec')
    for case in ('valid', 'exit_bool', 'removed_int', 'research_bool', 'both_writing_bool'):
        initial = copy.deepcopy(result)
        diagnostic = dict(copy.deepcopy(result), host_reason='none')
        diagnostic['timings']['finalization_ms'] = 3
        if case == 'exit_bool': diagnostic['exit_code'] = False
        if case == 'removed_int': diagnostic['container_removed'] = 1
        if case == 'research_bool': diagnostic['timings']['research_ms'] = True
        if case == 'both_writing_bool':
            initial['timings']['writing_ms'] = diagnostic['timings']['writing_ms'] = True
        accepted = True
        try:
            exec(code, dict(json=json, result=initial, diagnostic=diagnostic))
        except AssertionError:
            accepted = False
        if accepted != (case == 'valid'):
            failures.append(source + ':' + case)
assert not failures, 'incorrect acceptance: ' + ', '.join(failures)
print('PASS: actual host assertions, 10 cases')
PY
