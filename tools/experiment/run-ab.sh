#!/usr/bin/env bash
# A/B runner for the draft-guide pipeline: one arm per invocation, cold and isolated.
#   arm a = doctrine as committed        arm b = north-star research role swapped in
# Usage: tools/experiment/run-ab.sh <slug> <a|b>
set -euo pipefail

usage() { echo "usage: $0 <slug> <a|b>" >&2; exit 64; }
die()   { echo "run-ab: $*" >&2; exit 1; }
note()  { echo "run-ab: $*"; }
keep()  { echo "run-ab: worktree kept for debugging: $WT" >&2; }

[[ $# -eq 2 ]] || usage
SLUG=$1; ARM=$2
[[ $SLUG =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "slug must be lowercase alnum/dashes, got '$SLUG'"
[[ $ARM == a || $ARM == b ]] || usage
[[ -n ${OPENROUTER_API_KEY:-} ]] || die "OPENROUTER_API_KEY is unset. Export it first:
  export OPENROUTER_API_KEY=sk-or-...   # https://openrouter.ai/keys"

REPO=$(git rev-parse --show-toplevel)
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SHA=$(git -C "$REPO" rev-parse HEAD)
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
WT=/tmp/ns-exp/$SLUG-$ARM-$STAMP
ROLE_REL=doctrine/roles/technical-research.md
NORTHSTAR_REL=doctrine/roles/technical-research.northstar.md

# OPENROUTER_API_KEY and the optional PULSE_* vars pass through via the inherited env.
for v in PULSE_REGISTRY_KEY PULSE_REGISTRY_TENANT; do
  [[ -n ${!v:-} ]] && note "passing through $v" || note "$v unset (catalog presence may be unresolved)"
done

# --- results dir: never clobber a previous result silently -------------------
RESULTS=$HERE/results
OUT=$RESULTS/$SLUG-$ARM
if [[ -e $OUT ]]; then
  OUT=$OUT-$STAMP
  note "$RESULTS/$SLUG-$ARM already exists; writing this run to $OUT"
fi
mkdir -p "$OUT"
[[ -e $RESULTS/.gitignore ]] || printf '*\n!.gitignore\n' >"$RESULTS/.gitignore"
LOG=$OUT/run.log

# --- throwaway worktree at the current commit (invoking tree untouched) ------
mkdir -p /tmp/ns-exp
git -C "$REPO" worktree add --detach "$WT" "$SHA" >/dev/null
note "worktree $WT @ ${SHA:0:12}"

# Cold start: no prior dossier for research to revise.
rm -rf "${WT:?}/guides/$SLUG"

# Arm b: swap in the north-star research role (authored separately; may be
# uncommitted, so fall back to the invoking tree's copy).
if [[ $ARM == b ]]; then
  SRC=$WT/$NORTHSTAR_REL
  [[ -f $SRC ]] || SRC=$REPO/$NORTHSTAR_REL
  if [[ ! -f $SRC ]]; then
    keep
    die "arm b requires $NORTHSTAR_REL — not found in $WT or $REPO. Author it first."
  fi
  cp "$SRC" "$WT/$ROLE_REL"
  note "arm b doctrine sourced from $SRC"
fi
[[ -f $WT/$ROLE_REL ]] || { keep; die "missing $ROLE_REL in $WT"; }
DOCTRINE_SHA=$(sha256sum "$WT/$ROLE_REL" | cut -d' ' -f1)

# --- install deps (untimed), then run the pipeline (timed) -------------------
if [[ ! -d $WT/pipeline/node_modules ]]; then
  note "installing pipeline deps..."
  (cd "$WT/pipeline" && npm install --no-audit --no-fund) >>"$LOG" 2>&1 \
    || { keep; die "npm install failed; see $LOG"; }
fi

# Sibling of the run worktree, never inside it: a file under $WT counts as a
# pre-run modification outside the guide directory and degrades the I7 tripwire.
MARKER=${WT}.start
touch "$MARKER"
note "running: npm run draft-guide -- $SLUG --overwrite"
START=$(date +%s)
set +e
(cd "$WT/pipeline" && npm run draft-guide -- "$SLUG" --overwrite) 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}
set -e
ELAPSED=$(( $(date +%s) - START ))
note "pipeline exit=$RC (0 converged / 2 unconverged / 3 awaiting scope) in ${ELAPSED}s"

# --- collect ----------------------------------------------------------------
if [[ -d $WT/guides/$SLUG ]]; then
  mkdir -p "$OUT/guides"
  cp -R "$WT/guides/$SLUG" "$OUT/guides/$SLUG"
else
  note "no guides/$SLUG produced"
fi

RECORD=$(find "$WT/retro/runs" -maxdepth 1 -name "*-$SLUG.json" -newer "$MARKER" \
  -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2- || true)
if [[ -n $RECORD ]]; then
  cp "$RECORD" "$OUT/$(basename "$RECORD")"
else
  note "no new retro/runs/*-$SLUG.json written by this run"
fi

jq -n \
  --arg slug "$SLUG" --arg arm "$ARM" --argjson exit_code "$RC" \
  --argjson wall_clock_seconds "$ELAPSED" --arg git_sha "$SHA" \
  --arg doctrine_file "$ROLE_REL" --arg doctrine_sha256 "$DOCTRINE_SHA" \
  --arg started_at "$STAMP" --arg worktree "$WT" \
  --arg run_record "${RECORD:+$(basename "$RECORD")}" \
  '$ARGS.named' >"$OUT/meta.json"

# --- teardown ---------------------------------------------------------------
if [[ $RC -eq 0 ]]; then
  git -C "$REPO" worktree remove --force "$WT"
else
  keep
fi
note "results: $OUT"
exit "$RC"
