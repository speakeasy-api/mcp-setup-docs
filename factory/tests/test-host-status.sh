#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
python3 - "$ROOT" <<'PY'
import contextlib, io, pathlib, subprocess, sys, tempfile, types
from unittest.mock import Mock
root = pathlib.Path(sys.argv[1])
source = (root/'factory/scripts/run-kit.sh').read_text().split("<<'PY'\n", 1)[1].rsplit('\nPY', 1)[0]
# Execute the actual supervisor/finally tail, replacing only process/OS boundaries.
tail = 'try:\n' + source[source.index("    result = private + '/host/result.json'"):]
for status in (0, 7, -15, None):
    with tempfile.TemporaryDirectory() as tmp:
        pathlib.Path(tmp, 'host').mkdir()
        proc = Mock(returncode=status)
        proc.wait.return_value = status
        popen = Mock(return_value=proc)
        if status is None: popen.side_effect = OSError('secret exception')
        sig = types.SimpleNamespace(signal=Mock(), SIGINT=2, SIGTERM=15, SIG_IGN=1)
        ns = dict(private=tmp, native='fixture', container='fixture', run_id='a'*32,
                  export=tmp, supervisor=None, supervisor_status=None, supervised=False,
                  exit_code=1, sys=sys, signal=sig, cleanup_owned=Mock(),
                  subprocess=types.SimpleNamespace(Popen=popen, TimeoutExpired=subprocess.TimeoutExpired))
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            try: exec(compile(tail, '<run-kit-tail>', 'exec'), ns)
            except SystemExit as e: code = e.code
        assert code == (0 if status == 0 else 1), (status, code)
        assert out.getvalue() == (f'FACTORY_SUPERVISOR_STATUS={status}\n' if status is not None else ''), out.getvalue()
        assert sig.signal.call_count == 2, 'finally must always run'
        if status is None: ns['cleanup_owned'].assert_called_once()
        else: ns['cleanup_owned'].assert_not_called()
        assert 'fixture' not in err.getvalue() and 'secret' not in err.getvalue()
print('PASS: host success/nonzero/raw signal status, exit contract and finally')
PY
