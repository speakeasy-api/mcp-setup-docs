#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 3 ]]; then
  printf 'usage: %s <issue-json> <catalog-json> <export-dir>\n' "${0##*/}" >&2
  exit 2
fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
# shellcheck disable=SC1091
source "$ROOT/factory/config.env"
export KIT_IMAGE KIT_VERSION KIT_SHA256 KIT_MODEL KIT_REASONING_EFFORT KIT_REQUEST_BUDGET_SECONDS
# Python's stdlib supplies portable bounded subprocesses and fd-relative cleanup;
# all model work/deadlines remain in the existing Go supervisor, not here.
exec python3 - "$ROOT" "$@" <<'PY'
import json, os, pathlib, secrets, shutil, signal, stat, subprocess, sys, tempfile
root, issue, catalog, export = sys.argv[1:]
container = None
create_attempted = False
supervisor = None
private = None
supervised = False
exit_code = 1
supervisor_status = None
run_id = os.environ.get('FACTORY_HOST_RUN_ID') or secrets.token_hex(16)
os.environ['FACTORY_HOST_RUN_ID'] = run_id
docker = os.environ.get('FACTORY_DOCKER', 'docker')

def safe_path(path, directory=False):
    p = pathlib.Path(path).absolute()
    if p.resolve(strict=True) != p:
        raise ValueError('symlink path')
    st = p.stat()
    if not (stat.S_ISDIR(st.st_mode) if directory else stat.S_ISREG(st.st_mode)):
        raise ValueError('unsafe path type')
    if any(c in str(p) for c in (',', '\n', '\r')):
        raise ValueError('unsafe mount path')
    return str(p)

def local_evidence(host_path, expected_id):
    # Re-project only bounded host observations for retention in a local log.
    # Neither arbitrary JSON keys nor worker strings are ever printed.
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('duplicate')
            result[key] = value
        return result
    try:
        if len(expected_id) != 32 or any(c not in '0123456789abcdef' for c in expected_id):
            return None
        path = pathlib.Path(host_path)
        if not path.is_absolute() or path.resolve(strict=True) != path:
            return None
        fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            parent = os.fstat(fd)
            if parent.st_uid != os.geteuid() or stat.S_IMODE(parent.st_mode) != 0o700:
                return None
            file = os.open('host-reason.json', os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
            try:
                before = os.fstat(file)
                if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_uid != os.geteuid() or stat.S_IMODE(before.st_mode) != 0o600 or not 0 < before.st_size <= 2048:
                    return None
                raw = os.read(file, 2049)
                after = os.fstat(file)
                named = os.stat('host-reason.json', dir_fd=fd, follow_symlinks=False)
                identity = lambda st: (st.st_dev, st.st_ino, st.st_mode, st.st_uid, st.st_nlink, st.st_size, st.st_mtime_ns, st.st_ctime_ns)
                if identity(before) != identity(after) or identity(before) != identity(named) or len(raw) != before.st_size:
                    return None
            finally:
                os.close(file)
        finally:
            os.close(fd)
        data = json.loads(raw, object_pairs_hook=unique)
        if type(data) is not dict or type(data.get('version')) is not int or data['version'] != 1 or data.get('run_id') != expected_id:
            return None
        reasons = ('none', 'prerequisite_failed', 'worker_failed', 'worker_input_failed', 'worker_store_failed', 'worker_decode_failed', 'worker_export_failed', 'worker_guide_failed', 'worker_metadata_failed', 'worker_cleanup_failed', 'worker_state_failed', 'worker_limits_failed', 'context_deadline', 'context_cancelled')
        terms = ('completed', 'research_timeout', 'writing_timeout', 'provider_exit', 'lifecycle_invalid', 'cleanup_failed')
        if data.get('host_reason') not in reasons or data.get('termination') not in terms:
            return None
        result = dict(version=1, run_id=expected_id, host_reason=data['host_reason'], termination=data['termination'])
        if 'timings' in data:
            timings = data['timings']
            if type(timings) is not dict or not timings or not set(timings) <= {'research_ms', 'writing_ms', 'finalization_ms'}:
                return None
            if any(type(value) is not int or not 1 <= value <= 3600000 for value in timings.values()):
                return None
            result['timings'] = timings
        if 'limit' in data:
            limit = data['limit']
            caps = dict(source_bytes=16777216, total_bytes=67108864, entries=4096, session_dirs=64, session_files=64, events=4096, assembled_bytes=2097152)
            if type(limit) is not dict or set(limit) != {'category', 'observed', 'allowed'} or type(limit['category']) is not str:
                return None
            cap = caps.get(limit['category'])
            if cap is None or type(limit['allowed']) is not int or type(limit['observed']) is not int or limit['allowed'] != cap or not cap < limit['observed'] <= 2**53-1:
                return None
            result['limit'] = limit
        if 'native_fatal' in data:
            fatal = data['native_fatal']
            if type(fatal) is not dict:
                return None
            if fatal == {'status': 'unavailable'}:
                result['native_fatal'] = fatal
            else:
                if set(fatal) != {'status', 'evidence', 'kind', 'code'} or any(type(v) is not str for v in fatal.values()):
                    return None
                codes = {
                    'provider': ('stream_transport', 'request_transport', 'stream_idle_timeout', 'stream_closed', 'authentication', 'retry_exhausted', 'response_transient', 'response_failed', 'protocol_error', 'credential_error', 'http_error', 'provider_error'),
                    'tool': ('tool_error',),
                    'runtime': ('mutator_error', 'invalid_state', 'unsupported', 'session_open', 'compactor_build', 'subagent_restore', 'agent_build'),
                }
                if fatal['status'] != 'classified' or fatal['evidence'] != 'native_reported' or fatal['code'] not in codes.get(fatal['kind'], ()):
                    return None
                result['native_fatal'] = fatal
        return result
    except (OSError, ValueError, TypeError, KeyError):
        return None

def command(args, timeout=30, capture=False):
    with open(private + '/host/commands.stderr', 'ab') as err:
        if capture:
            # Docker create/inspect/list outputs are small; never expose them.
            p = subprocess.run(args, stdout=subprocess.PIPE, stderr=err, timeout=timeout, check=True)
            if len(p.stdout) > 4096:
                raise ValueError('oversized docker response')
            return p.stdout.decode().strip()
        with open(private + '/host/commands.stdout', 'ab') as out:
            subprocess.run(args, stdout=out, stderr=err, timeout=timeout, check=True)

def cleanup_owned():
    global container
    if container is None:
        if not create_attempted:
            return True
        try:
            container = command([docker, 'inspect', '--format', '{{.Id}}', 'factory-'+run_id], 10, True)
            if len(container) != 64 or any(c not in '0123456789abcdef' for c in container):
                return False
        except Exception:
            return False # ambiguous create is not proof of absence
    try:
        owner = command([docker, 'inspect', '--format', '{{index .Config.Labels "factory.run-id"}}', container], 10, True)
        if owner != run_id:
            return False
        command([docker, 'rm', '--force', container], 10)
        return not command([docker, 'ps', '--all', '--no-trunc', '--filter', 'id='+container, '--format', '{{.ID}}'], 10, True)
    except (OSError, ValueError, subprocess.SubprocessError):
        # An already-supervised container may be gone. Only successful listing
        # can confirm absence; daemon errors never count as removed.
        try:
            return not command([docker, 'ps', '--all', '--no-trunc', '--filter', 'id='+container, '--format', '{{.ID}}'], 10, True)
        except (OSError, ValueError, subprocess.SubprocessError):
            return False

def interrupted(signum, frame):
    if supervisor is not None:
        supervisor.send_signal(signal.SIGTERM)
        try:
            supervisor.wait(timeout=305)
        except subprocess.TimeoutExpired:
            supervisor.kill()
            supervisor.wait(timeout=5)
    raise InterruptedError('host cancelled')

signal.signal(signal.SIGINT, interrupted)
signal.signal(signal.SIGTERM, interrupted)
try:
    if len(run_id) != 32 or any(c not in '0123456789abcdef' for c in run_id):
        raise ValueError('invalid invocation identity')
    print('FACTORY_HOST_RUN_ID=' + run_id, flush=True)
    issue, catalog = safe_path(issue), safe_path(catalog)
    parent = os.environ.get('FACTORY_PRIVATE_ROOT')
    if parent:
        parent = safe_path(parent, True)
        if stat.S_IMODE(os.stat(parent).st_mode) != 0o700:
            raise ValueError('private parent required')
    private = str(pathlib.Path(tempfile.mkdtemp(prefix='factory-run-', dir=parent)).resolve())
    os.chmod(private, 0o700)
    for name in ('host', 'home', 'workspace', 'control', 'source', 'input'):
        os.mkdir(private + '/' + name, 0o700)
    # Refuse unsafe existing exports, then remove only established contracts via
    # a directory handle. Never rm -rf a model-chosen or re-resolved path.
    safe_path(str(pathlib.Path(export).absolute().parent), True)
    pathlib.Path(export).mkdir(mode=0o700, exist_ok=True)
    export = safe_path(export, True)
    fd = os.open(export, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for name in ('guide', 'run-report.json', 'kit-error-summary.json', 'factory-diagnostics.json', 'execution-transcript.json', 'session-transcript.json', 'finalization.json'):
            try:
                st = os.stat(name, dir_fd=fd, follow_symlinks=False)
            except FileNotFoundError:
                continue
            if stat.S_ISDIR(st.st_mode) and name == 'guide':
                os.rename(name, private+'/host/stale-guide', src_dir_fd=fd)
            elif stat.S_ISREG(st.st_mode):
                os.unlink(name, dir_fd=fd)
            else:
                raise ValueError('unsafe stale export')
    finally:
        os.close(fd)
    if not os.environ.get('OPENROUTER_API_KEY'):
        raise ValueError('provider configuration missing')
    # Inputs are copied before any model starts; private input/source mounts are RO.
    shutil.copyfile(issue, private + '/input/issue.json')
    shutil.copyfile(catalog, private + '/input/catalog.json')
    archive = private + '/host/source.tar'
    command(['tar', '-cf', archive, '--exclude-from='+root+'/.dockerignore', '-C', root, '.'], 60)
    command(['tar', '-xf', archive, '-C', private+'/source'], 60)
    native = os.environ.get('FACTORY_SUPERVISOR')
    if native:
        native = safe_path(native)
    else:
        native = private + '/host/supervise-factory'
        env = dict(os.environ, GOTOOLCHAIN='go1.27.0', CGO_ENABLED='0')
        with open(private+'/host/build.log', 'ab') as log:
            subprocess.run(['go', 'build', '-o', native, './cmd/supervise-factory'], cwd=root+'/go', env=env, stdout=log, stderr=log, timeout=120, check=True)
    # Build all postmortem tools BEFORE any model execution. No model-controlled
    # workspace scripts/binaries are used during host finalization.
    env = dict(os.environ, GOTOOLCHAIN='go1.27.0', CGO_ENABLED='0')
    with open(private+'/host/build.log', 'ab') as log:
        subprocess.run(['go', 'build', '-o', private+'/host/', './cmd/export-transcript', './cmd/finalize-factory', './cmd/lint-guide'], cwd=root+'/go', env=env, stdout=log, stderr=log, timeout=120, check=True)
    with open(private+'/host/build.log', 'ab') as log:
        subprocess.run(['go', 'build', '-o', private+'/host/factory-generate', '.'], cwd=root+'/go/internal/gen', env=env, stdout=log, stderr=log, timeout=120, check=True)
    goroot = subprocess.check_output(['go', 'env', 'GOROOT'], cwd=root+'/go', env=env, timeout=10, text=True).strip()
    shutil.copyfile(goroot+'/bin/gofmt', private+'/host/gofmt')
    os.chmod(private+'/host/gofmt', 0o700)
    # Fixed reporting survives supervisor interruption; never contains model data.
    fallback = dict(schema_version=1, outcome='failed', provider=None, slug=None, persona=None, summary='Factory model execution failed.', open_questions=[], blockers=['Factory model execution failed.'], nits=[], review_rounds=0, artifacts=[])
    with open(export+'/run-report.json.pending', 'x') as report:
        json.dump(fallback, report)
    os.chmod(export+'/run-report.json.pending', 0o600)
    os.replace(export+'/run-report.json.pending', export+'/run-report.json')
    image = os.environ.get('FACTORY_KIT_IMAGE', os.environ['KIT_IMAGE'])
    try:
        command([docker, 'image', 'inspect', '--format', '{{.Id}}', image], 10, True)
    except subprocess.CalledProcessError:
        command([docker, 'build', '--file', root+'/factory/Dockerfile', '--build-arg', 'KIT_VERSION='+os.environ['KIT_VERSION'], '--build-arg', 'KIT_SHA256='+os.environ['KIT_SHA256'], '--tag', image, root], 120)
    args = [docker, 'create', '--user', str(os.getuid())+':'+str(os.getgid()), '--name', 'factory-'+run_id, '--label', 'factory.run-id='+run_id]
    for key in ('OPENROUTER_API_KEY', 'KIT_MODEL', 'KIT_REASONING_EFFORT', 'KIT_REQUEST_BUDGET_SECONDS'):
        args += ['--env', key]
    args += ['--env', 'FACTORY_RUN_ID='+run_id]
    for source, target, readonly in [('source','/repo',True),('input','/input',True),('home','/kit-home',False),('workspace','/workspace',False),('control','/control',False)]:
        path = safe_path(private+'/'+source, True)
        args += ['--mount', 'type=bind,src='+path+',dst='+target+(',readonly' if readonly else '')]
    # Use the checked-out entrypoint with the cached owning image's real tools.
    args += ['--entrypoint', '/repo/factory/scripts/container-entrypoint.sh', image]
    create_attempted = True
    container = command(args, 30, True)
    if len(container) != 64 or any(c not in '0123456789abcdef' for c in container):
        container = None
        raise ValueError('invalid create identity')
    result = private + '/host/result.json'
    with open(private+'/host/supervisor.stdout','ab') as out, open(private+'/host/supervisor.stderr','ab') as err:
        supervisor = subprocess.Popen([native, '--container-id', container, '--control-dir', private+'/control', '--run-id', run_id, '--result', result, '--finalizer', private+'/host/finalize-factory', '--export-dir', export], stdout=out, stderr=err)
        supervised = True
        exit_code = supervisor.wait(timeout=3030)
        supervisor_status = exit_code
    evidence = local_evidence(private + '/host', run_id)
    if evidence is not None:
        print('FACTORY_HOST_REASON=' + evidence['host_reason'])
        print('FACTORY_HOST_DIAGNOSTIC=' + json.dumps(evidence, separators=(',', ':')))
    supervisor = None
    # Reports live directly in the host export directory even on nonzero status.
    # Host readiness includes current validation and frozen output; Task 5 upload
    # remains a separate mandatory gate, never implied by this process status.
    print('factory: host finalization ended; inspect trusted run report', file=sys.stderr)
except subprocess.TimeoutExpired:
    # The outer watchdog already includes model + finalization allowance. Do not
    # grant a stalled supervisor another 300 seconds in the finally handler.
    if supervisor is not None and supervisor.poll() is None:
        supervisor.kill()
        supervisor.wait(timeout=5)
    print('factory: host watchdog expired; fallback report retained', file=sys.stderr)
except Exception:
    print('factory: lifecycle failed or unready; no output installed', file=sys.stderr)
finally:
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    if supervisor is not None and supervisor.poll() is None:
        supervisor.terminate()
        try:
            supervisor.wait(timeout=305)
        except subprocess.TimeoutExpired:
            supervisor.kill()
            supervisor.wait(timeout=5)
    # Preserve Python's raw negative signal status; never reinterpret it as success.
    if supervisor is not None and supervisor.returncode is not None:
        supervisor_status = supervisor.returncode
    if private and not supervised and not cleanup_owned():
        print('factory: cleanup failed; private state withheld', file=sys.stderr)
    # Once supervised, do not grant another cleanup/finalization budget here.
    # The deadline-owning supervisor/finalizer removes only owned home/workspace.
    # Abrupt supervisor loss may leave private state withheld for host recovery.
    if supervisor_status is not None:
        print('FACTORY_SUPERVISOR_STATUS=%d' % supervisor_status)
sys.exit(0 if exit_code == 0 else 1)
PY
