#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
python3 - "$ROOT" <<'PY'
import os
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
print('PASS: fixed readable upload, validation gate, receipt routing, nonzero host report forwarding')
PY
