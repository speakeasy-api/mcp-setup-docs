"""Offline tests for the launcher projection; never execute the launcher."""
import ast
import json
import os
import pathlib
import stat
import tempfile
import unittest
from unittest import mock

source = (pathlib.Path(__file__).parents[1] / 'scripts/run-kit.sh').read_text().split("<<'PY'\n", 1)[1].rsplit('\nPY', 1)[0]
tree = ast.parse(source)
functions = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'local_evidence']

class EvidenceTest(unittest.TestCase):
    def test_shell_discovery(self):
        tests = pathlib.Path(__file__).resolve().parent
        self.assertIn(tests / 'test-local-evidence.sh', tests.glob('test-*.sh'))

    def test_projection(self):
        self.assertEqual(len(functions), 1, 'bounded local evidence projection missing')
        scope = dict(json=json, os=os, pathlib=pathlib, stat=stat)
        exec(compile(ast.Module(body=functions, type_ignores=[]), '<projection>', 'exec'), scope)
        with tempfile.TemporaryDirectory() as directory:
            directory = str(pathlib.Path(directory).resolve())
            os.chmod(directory, 0o700)
            run_id = 'a' * 32
            record = dict(version=1, run_id=run_id, host_reason='worker_limits_failed', termination='writing_timeout', limit=dict(category='source_bytes', observed=1048577, allowed=1048576))
            record['timings'] = dict(research_ms=100, writing_ms=900000, finalization_ms=200)
            path = pathlib.Path(directory) / 'host-reason.json'
            for kind in ('valid', 'identity', 'canary', 'fraction', 'mode', 'symlink', 'timing_unknown', 'timing_bool', 'timing_fraction', 'timing_negative', 'timing_large', 'timing_empty', 'timing_zero', 'unknown_root', 'timing_absent', 'limit_nan', 'limit_infinity', 'limit_hugeint', 'timing_nan', 'timing_infinity', 'timing_hugeint', 'category_list', 'category_dict', 'duplicate_root', 'duplicate_limit', 'hardlink', 'replacement'):
                with self.subTest(kind=kind):
                    data = json.loads(json.dumps(record))
                    if kind == 'identity': data['run_id'] = 'b' * 32
                    if kind == 'canary': data['limit']['category'] = 'RAW_CANARY'
                    if kind == 'fraction': data['limit']['observed'] = 1048577.0
                    if kind == 'timing_unknown': data['timings']['RAW_CANARY'] = 1
                    if kind == 'timing_bool': data['timings']['research_ms'] = True
                    if kind == 'timing_fraction': data['timings']['research_ms'] = 1.5
                    if kind == 'timing_negative': data['timings']['research_ms'] = -1
                    if kind == 'timing_large': data['timings']['research_ms'] = 3600001
                    if kind == 'timing_empty': data['timings'] = {}
                    if kind == 'timing_zero': data['timings']['research_ms'] = 0
                    if kind == 'unknown_root': data['RAW_CANARY'] = 'secret'
                    if kind == 'timing_absent': del data['timings']
                    for prefix, field, key in (('limit', 'limit', 'observed'), ('timing', 'timings', 'research_ms')):
                        if kind == prefix + '_nan': data[field][key] = float('nan')
                        if kind == prefix + '_infinity': data[field][key] = float('inf')
                        if kind == prefix + '_hugeint': data[field][key] = 10**100
                    if kind == 'category_list': data['limit']['category'] = []
                    if kind == 'category_dict': data['limit']['category'] = {}
                    raw = json.dumps(data)
                    if kind == 'duplicate_root': raw = raw.replace('"version": 1', '"version": 1, "version": 1', 1)
                    if kind == 'duplicate_limit': raw = raw.replace('"observed": 1048577', '"observed": 1048577, "observed": 1048577', 1)
                    path.unlink(missing_ok=True)
                    path.write_text(raw); path.chmod(0o600)
                    if kind == 'mode': path.chmod(0o644)
                    if kind == 'symlink': path.rename(path.parent/'target'); path.symlink_to(path.parent/'target')
                    if kind == 'hardlink': os.link(path, path.parent / 'hardlink')
                    if kind == 'replacement':
                        original_read = os.read
                        def read_then_replace(fd, size):
                            result = original_read(fd, size)
                            replacement = path.parent / 'replacement'
                            replacement.write_text(raw); replacement.chmod(0o600)
                            os.replace(replacement, path)
                            return result
                        # Deterministically replace after the read and before the
                        # named-file check. This is not a general TOCTOU proof.
                        with mock.patch.object(os, 'read', side_effect=read_then_replace):
                            got = scope['local_evidence'](directory, run_id)
                    else:
                        got = scope['local_evidence'](directory, run_id)
                    if kind in ('valid', 'unknown_root', 'timing_absent'):
                        expected = dict(record)
                        if kind == 'timing_absent': del expected['timings']
                        self.assertEqual(got, expected)
                        self.assertNotIn('RAW_CANARY', json.dumps(got))
                        self.assertLess(len(json.dumps(got)), 512)
                    else: self.assertIsNone(got)

if __name__ == '__main__': unittest.main()
