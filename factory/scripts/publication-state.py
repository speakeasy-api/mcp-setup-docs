#!/usr/bin/env python3
"""Fixed-root host publication state; no model paths, no external dependencies."""
import json
import os
import re
import stat
import sys


def directory(path):
    if not path.startswith('/') or any(p in ('.', '..') for p in path.split('/')):
        raise ValueError()
    fd = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in filter(None, path.split('/')):
            nxt = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = nxt
        return fd
    except Exception:
        os.close(fd)
        raise


def contents(fd, name):
    f = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
    with os.fdopen(f, 'rb') as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > 2 << 20:
            raise ValueError()
        return stream.read((2 << 20) + 1)


def read(fd, name):
    return json.loads(contents(fd, name))


def candidate(export, path, report):
    # Task 4 already ran full prebuilt validation on these exact transcript bytes.
    # Recheck identity, not semantics; do not rebuild or rerun model-time tooling.
    transcript = read(export, 'session-transcript.json')
    if type(transcript.get('schema_version')) is not int or transcript['schema_version'] != 1 or transcript.get('kind') != 'guide_factory_readable_transcript':
        raise ValueError()
    selected = {}
    names = ('research.md', 'meta.yaml', 'external.md', 'speakeasy.md')
    for item in transcript['files']:
        if item['name'] in ['run-report.json'] + ['guide/' + n for n in names]:
            if item['name'] in selected or type(item['text']) is not str:
                raise ValueError()
            selected[item['name']] = item['text']
    if json.loads(selected['run-report.json']) != report:
        raise ValueError()
    fd = directory(os.path.abspath(path))
    for name in names:
        if contents(fd, name) != selected['guide/' + name].encode('utf-8'):
            raise ValueError()


def write(fd, name, data):
    try:
        info = os.stat(name, dir_fd=fd, follow_symlinks=False)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise ValueError()
    except FileNotFoundError:
        pass
    pending = name + '.pending'
    f = os.open(pending, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd)
    try:
        with os.fdopen(f, 'w') as stream:
            json.dump(data, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(pending, name, src_dir_fd=fd, dst_dir_fd=fd)
        os.fsync(fd)
    finally:
        try:
            os.unlink(pending, dir_fd=fd)
        except FileNotFoundError:
            pass


def main():
    command = sys.argv[1]
    run = os.environ['GITHUB_RUN_ID']
    attempt = os.environ['GITHUB_RUN_ATTEMPT']
    repo = os.environ['GH_REPO']
    if not re.fullmatch(r'[1-9][0-9]*', run) or not re.fullmatch(r'[1-9][0-9]*', attempt):
        raise ValueError()
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
        raise ValueError()
    root = os.environ['RUNNER_TEMP'].rstrip('/')
    expected = root + '/guide-factory-publication/publication-receipt.json'
    if os.environ['FACTORY_PUBLICATION_RECEIPT'] != expected:
        raise ValueError()
    base = directory(root)
    try:
        os.mkdir('guide-factory-publication', 0o700, dir_fd=base)
    except FileExistsError:
        pass
    fd = os.open('guide-factory-publication', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=base)
    info = os.fstat(fd)
    if info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise ValueError()
    name = 'publication-receipt.json'
    if command in ('gate', 'candidate'):
        # An interrupted or ambiguous mutation requires explicit read-only repair,
        # never a second invocation of publish.
        for entry in (name, 'publication-started.json', name + '.pending'):
            try:
                os.stat(entry, dir_fd=fd, follow_symlinks=False)
            except FileNotFoundError:
                continue
            raise ValueError()
        export = os.open('export', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=base)
        state = read(export, 'finalization.json')
        if type(state.get('version')) is not int or state.get('publication_ready') is not True or state != {'version': 1, 'primary_outcome': 'converged', 'readable_export': 'ready',
                     'partial': state.get('partial'), 'publication_ready': True} or type(state['partial']) is not bool:
            raise ValueError()
        frozen = read(export, 'run-report.json')
        report_fd = directory(os.path.dirname(os.path.abspath(sys.argv[2])))
        if frozen != read(report_fd, os.path.basename(sys.argv[2])) or frozen['outcome'] != 'converged':
            raise ValueError()
        candidate(export, root + '/export/guide', frozen)
        if command == 'candidate':
            candidate(export, sys.argv[3], frozen)
        if os.environ.get('READABLE_UPLOAD_OUTCOME') != 'success':
            raise ValueError()
        url = os.environ.get('READABLE_ARTIFACT_URL', '')
        if not re.fullmatch(re.escape(f'https://github.com/{repo}/actions/runs/{run}/artifacts/') + r'[1-9][0-9]*', url):
            raise ValueError()
        if os.environ.get('READABLE_LOG_STATUS') != ('partial' if state['partial'] else 'complete'):
            raise ValueError()
    elif command == 'begin':
        # Exclusive reservation persists even if receipt persistence later fails.
        f = os.open('publication-started.json', os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd)
        with os.fdopen(f, 'w') as stream:
            json.dump({'run_id': run, 'run_attempt': int(attempt)}, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.fsync(fd)
    elif command == 'record':
        url, publication = sys.argv[2:]
        prefix = f'https://github.com/{repo}/pull/'
        if not re.fullmatch(re.escape(prefix) + r'[1-9][0-9]*', url) or publication not in ('created', 'updated'):
            raise ValueError()
        write(fd, name, dict(version=1, run_id=run, run_attempt=int(attempt), pr_url=url,
                            pr_number=int(url[len(prefix):]), publication=publication, notification='pending'))
    elif command in ('read', 'notification'):
        if sys.argv[2] != expected:
            raise ValueError()
        receipt = read(fd, name)
        if set(receipt) != {'version', 'run_id', 'run_attempt', 'pr_url', 'pr_number', 'publication', 'notification'}:
            raise ValueError()
        if type(receipt['version']) is not int or receipt['version'] != 1 or receipt['run_id'] != run or type(receipt['run_attempt']) is not int or receipt['run_attempt'] != int(attempt):
            raise ValueError()
        if type(receipt['pr_number']) is not int or receipt['pr_number'] < 1 or receipt['pr_url'] != f"https://github.com/{repo}/pull/{receipt['pr_number']}":
            raise ValueError()
        if receipt['publication'] not in ('created', 'updated') or receipt['notification'] not in ('pending', 'sent', 'failed'):
            raise ValueError()
        if command == 'read':
            print(receipt['pr_url'])
        else:
            if sys.argv[3] not in ('sent', 'failed'):
                raise ValueError()
            receipt['notification'] = sys.argv[3]
            write(fd, name, receipt)
    else:
        raise ValueError()


try:
    main()
except Exception:
    print('factory: publication state rejected; preserve state and reconcile read-only before retry', file=sys.stderr)
    sys.exit(1)
