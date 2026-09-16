#!/usr/bin/env bash
# Actual run-kit/entrypoint regression; Docker absence is a hard failure.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
# shellcheck disable=SC1091
source "$ROOT/factory/config.env"
BASE=${FACTORY_BOUNDARY_IMAGE:-$KIT_IMAGE}
TMP=$(mktemp -d)
TMP=$(cd "$TMP" && pwd -P)
chmod 700 "$TMP"
# Retain private evidence on failure; no recursive cleanup of model mounts.
trap 'printf "boundary: private fixture retained\n" >&2' EXIT
mkdir -m 700 "$TMP/build" "$TMP/runs"
(cd "$ROOT/go" && GOTOOLCHAIN=go1.27.0 CGO_ENABLED=0 go test -c -o "$TMP/supervisor-test" ./cmd/supervise-factory)
printf '#!/bin/sh\nexec "%s" --factory-test-supervisor "$@"\n' "$TMP/supervisor-test" > "$TMP/supervisor"
chmod 700 "$TMP/supervisor"
cat > "$TMP/build/kit" <<'KIT'
#!/bin/bash
set -euo pipefail
[[ $1 == --workspace && $2 == /workspace && $3 == --input-root && $4 == /input ]] || exit 32
[[ $* == *'--request-budget-seconds 300'* ]] || exit 33
[[ $HOME == /kit-home && ! -e /export && ! -e /var/run/docker.sock ]] || exit 34
test ! -e /workspace/.git
for path in /repo /input; do if touch "$path/.write-probe" 2>/dev/null; then exit 36; fi; done
for path in /kit-home /workspace /control; do [[ $(stat -c %a "$path") == 700 ]] || exit 37; done
[[ -z ${GH_TOKEN:-} && -z ${GITHUB_TOKEN:-} ]] || exit 35
mode=$(jq -r .mode /input/issue.json)
read -r pid comm state ppid parent_group rest < /proc/$$/stat
export parent_group
setsid /bin/bash -c 'read -r pid comm state ppid group session rest < /proc/$$/stat; printf "%s %s %s\n" "$parent_group" "$group" "$session" > /workspace/groups; sleep 4; echo escaped > /workspace/canary' &
for ((i=0;i<100;i++)); do [[ -s /workspace/groups ]] && break; sleep .01; done
printf 'PRIVATE_RAW_CANARY\n'
printf '{"outcome":"converged"}\n' > /workspace/.factory/run-report.json.tmp
mv /workspace/.factory/run-report.json.tmp /workspace/.factory/run-report.json
if [[ $mode == timeout || $mode == cancel ]]; then exec sleep 30; fi
begin-writing --control-dir /control --run-id "$FACTORY_RUN_ID"
begin-writing --control-dir /control --run-id "$FACTORY_RUN_ID"
sleep 1 # Host fixture records safe boundary evidence before private cleanup.
KIT
chmod 755 "$TMP/build/kit"
printf 'FROM %s\nCOPY kit /usr/local/bin/guide-factory\n' "$BASE" > "$TMP/build/Dockerfile"
image="factory-boundary-$(basename "$TMP" | tr '[:upper:]' '[:lower:]')"
docker build --platform linux/amd64 --tag "$image" "$TMP/build" > "$TMP/build.log" 2>&1
printf '{}\n' > "$TMP/catalog.json"
for mode in timeout normal cancel; do
  mkdir -m 700 "$TMP/runs/$mode" "$TMP/export-$mode"
  mkdir "$TMP/export-$mode/guide"
  printf stale > "$TMP/export-$mode/guide/stale"
  printf '{"outcome":"converged"}' > "$TMP/export-$mode/run-report.json"
  printf '{"mode":"%s"}\n' "$mode" > "$TMP/issue.json"
  chosen_supervisor="$TMP/supervisor"
  [[ $mode != normal ]] || chosen_supervisor=
  set +e
  OPENROUTER_API_KEY=fixture-only GH_TOKEN=must-not-pass GITHUB_TOKEN=must-not-pass \
    FACTORY_KIT_IMAGE="$image" FACTORY_SUPERVISOR="$chosen_supervisor" \
    FACTORY_PRIVATE_ROOT="$TMP/runs/$mode" \
    "$ROOT/factory/scripts/run-kit.sh" "$TMP/issue.json" "$TMP/catalog.json" "$TMP/export-$mode" \
    > "$TMP/$mode.stdout" 2> "$TMP/$mode.stderr" &
  wrapper=$!
  capture_ready=0
  {
    # The child creates groups before the parent emits its marker. Synchronize
    # with host log capture, not merely child startup, to record evidence before cleanup.
    for ((i=0;i<100;i++)); do
      run=$(find "$TMP/runs/$mode" -mindepth 1 -maxdepth 1 -type d)
      if [[ -n $run && -f $run/workspace/groups ]] &&
        grep -q PRIVATE_RAW_CANARY "$run/host/container.stdout" 2>/dev/null; then
        cp "$run/workspace/groups" "$TMP/$mode.groups"
        if [[ $mode == normal ]]; then
          [[ -f $run/control/phase.json ]] || { sleep .05; continue; }
          cp "$run/control/phase.json" "$TMP/$mode.phase.json"
        fi
        capture_ready=1
        break
      fi
      sleep .05
    done
    # Always terminate and reap the wrapper, including synchronization failure.
    [[ $mode != cancel ]] || kill -TERM "$wrapper"
  }
  wait "$wrapper"
  code=$?
  set -e
  if [[ $capture_ready != 1 ]]; then
    echo 'private boundary evidence was not ready before cleanup' >&2
    exit 1
  fi
  [[ $code != 0 ]] || { echo 'invalid candidate wrapper reported success' >&2; exit 1; }
  run=$(find "$TMP/runs/$mode" -mindepth 1 -maxdepth 1 -type d)
  expected=completed
  [[ $mode != timeout ]] || expected=research_timeout
  [[ $mode != cancel ]] || expected=lifecycle_invalid
  jq -e --arg want "$expected" '.version==1 and .termination==$want and .container_removed==true' "$run/host/result.json" >/dev/null
  read -r parent group session < "$TMP/$mode.groups"
  [[ $parent != "$group" && $group == "$session" ]] || { echo 'separate group not proven' >&2; exit 1; }
  if [[ $mode == normal ]]; then
    jq -e '.version==1 and .phase=="writing" and (.run_id|length)==32' "$TMP/$mode.phase.json" >/dev/null
  fi
  sleep 4.5
  [[ ! -e "$run/workspace/canary" ]] || exit 1
  [[ -z $(docker ps --all --filter "label=factory.run-id=$(jq -r .run_id "$run/host/result.json")" --format '{{.ID}}') ]] || exit 1
  bash "$ROOT/factory/scripts/validate-report.sh" "$TMP/export-$mode/run-report.json"
  jq -e '.outcome == "failed" and .artifacts == []' "$TMP/export-$mode/run-report.json" >/dev/null
  jq -e '.publication_ready == false' "$TMP/export-$mode/finalization.json" >/dev/null
  [[ ! -e "$TMP/export-$mode/guide" ]] || exit 1
  [[ -z $(find "$run" -type f ! -path "$run/host/result.json" ! -path "$run/host/host-reason.json" -print -quit) ]] || exit 1
  if grep -q PRIVATE_RAW_CANARY "$TMP/$mode.stdout" "$TMP/$mode.stderr"; then exit 1; fi
done
printf '%s\n' 'PASS: actual run-kit timeout, normal-exit and TERM separate-group boundary; failed report and private cleanup'
