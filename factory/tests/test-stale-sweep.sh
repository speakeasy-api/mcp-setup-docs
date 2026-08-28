#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
REPO="$TMP/repo"
SCRIPT="$ROOT/factory/scripts/stale-sweep.sh"
mkdir -p "$REPO" "$TMP/bin"
git -C "$REPO" init -q
git -C "$REPO" config user.email test@example.com
git -C "$REPO" config user.name Test

commit_file() {
  local when=$1 path=$2 contents=${3:-x}
  mkdir -p "$REPO/$(dirname "$path")"
  printf '%s\n' "$contents" >"$REPO/$path"
  git -C "$REPO" add "$path"
  GIT_AUTHOR_DATE="@$when +0000" GIT_COMMITTER_DATE="@$when +0000" \
    git -C "$REPO" commit -q -m "update $path"
}

# Only the exact factory input path set contributes to the factory timestamp.
commit_file 100 factory/config.env
commit_file 150 unrelated/newer.txt
commit_file 200 guides/current/guide.md
commit_file 9 guides/zeta/guide.md
commit_file 10 guides/beta/guide.md
commit_file 10 guides/alpha/guide.md
mkdir -p "$REPO/guides/uncommitted" "$REPO/guides/current/nested"
printf 'not an immediate guide\n' >"$REPO/guides/current/nested/README.md"

run_sweep() {
  (cd "$REPO" && PATH="$TMP/bin:$PATH" bash "$SCRIPT" "$@")
}

expected_report='Stale guides (4), oldest first:
- uncommitted (last guide change: never committed)
- zeta (last guide change: 9)
- alpha (last guide change: 10)
- beta (last guide change: 10)'
report=$(run_sweep)
assert_eq "$expected_report" "$report"
if grep -q -- '^- current ' <<<"$report"; then
  fail 'current guide was reported stale'
fi

# A newer commit to each supported input path makes a currently-newer guide stale.
commit_file 300 schema/guide.v1.schema.json
report=$(run_sweep)
assert_contains '- current (last guide change: 200)' "$report"

cat >"$TMP/bin/gh" <<'FAKE_GH'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$GH_LOG"
if [[ "$1 $2" == 'issue list' ]]; then
  case ${GH_LIST_MODE:-normal} in
    normal) printf '%s\n' '[{"body":"edited title\n<!-- stale-sweep:zeta -->"},{"body":"<!-- stale-sweep:alpha -->"}]' ;;
    fail) exit 1 ;;
    malformed) printf '%s\n' '{not json' ;;
    mistyped) printf '%s\n' '[{"body":42}]' ;;
    no_markers) printf '%s\n' '[{"body":"ordinary issue body"}]' ;;
  esac
elif [[ "$1 $2" == 'issue create' ]]; then
  printf 'https://example.test/issues/1\n'
else
  exit 64
fi
FAKE_GH
chmod +x "$TMP/bin/gh"
export GH_LOG="$TMP/gh.log" GH_REPO=owner/repo
create_count() {
  grep -c '^issue create ' "$GH_LOG" || true
}
: >"$GH_LOG"
create_report=$(run_sweep --create --limit 2)
assert_eq "$(run_sweep)" "$create_report"
assert_contains 'issue list --repo owner/repo --state open --label guide:stale --limit 200 --json body' "$(cat "$GH_LOG")"
assert_eq '2' "$(create_count)"
assert_contains '<!-- stale-sweep:uncommitted -->' "$(cat "$GH_LOG")"
assert_contains '<!-- stale-sweep:beta -->' "$(cat "$GH_LOG")"
if grep '^issue create ' "$GH_LOG" | grep -q 'stale-sweep:zeta'; then
  fail 'marker-covered zeta issue was created despite its edited title'
fi

for mode in fail malformed mistyped; do
  : >"$GH_LOG"
  if GH_LIST_MODE=$mode run_sweep --create --limit 2 >/dev/null 2>&1; then
    fail "issue discovery unexpectedly succeeded in $mode mode"
  fi
  assert_eq '0' "$(create_count)"
done

: >"$GH_LOG"
GH_LIST_MODE=no_markers run_sweep --create --limit 1 >/dev/null
assert_eq '1' "$(create_count)"

for bad_slug in 'bad slug' $'bad\tslug' $'bad\nslug'; do
  mkdir -p "$REPO/guides/$bad_slug"
  : >"$GH_LOG"
  if invalid_output=$(run_sweep --create --limit 2 2>&1); then
    fail 'invalid guide slug unexpectedly succeeded'
  fi
  assert_contains 'invalid guide slug' "$invalid_output"
  assert_eq '0' "$(create_count)"
  rm -rf "$REPO/guides/$bad_slug"
done

: >"$GH_LOG"
if (unset GH_REPO; run_sweep --create) >/dev/null 2>&1; then
  fail 'create succeeded without GH_REPO'
fi
assert_eq '0' "$(create_count)"

: >"$GH_LOG"
if GH_REPO=not-a-repo run_sweep --create >/dev/null 2>&1; then
  fail 'create succeeded with malformed GH_REPO'
fi
assert_eq '0' "$(create_count)"

: >"$GH_LOG"
run_sweep --limit 2 >/dev/null
[[ ! -s "$GH_LOG" ]] || fail 'dry run invoked gh'

missing_limit_output=$(run_sweep --limit 2>&1 || true)
assert_contains 'error: --limit requires a non-negative integer' "$missing_limit_output"

for args in '--limit' '--limit nope' '--limit -1' '--unknown' '--create extra'; do
  # shellcheck disable=SC2086
  if run_sweep $args >/dev/null 2>&1; then
    fail "invalid arguments succeeded: $args"
  fi
done

workflow=$(cat "$ROOT/.github/workflows/guide-stale-sweep.yml")
assert_contains 'bash factory/scripts/stale-sweep.sh' "$workflow"
assert_contains $'- uses: actions/checkout@v4\n        with:\n          persist-credentials: false' "$workflow"
if grep -Eq 'setup-node|npm (ci|run)' <<<"$workflow"; then
  fail 'stale workflow still depends on Node/npm'
fi

printf 'PASS: stale sweep uses Git history, stable ordering, and marker deduplication\n'
