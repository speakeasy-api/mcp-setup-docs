#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/factory/tests/test-helper.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export PATH="$TMP/bin:$PATH"
mkdir -p "$TMP/bin"

output_value() {
  local key=$1 file=$2
  awk -v key="$key" '$0 == key "<<FACTORY_OUTPUT_EOF" { getline; print; exit }' "$file"
}

# shellcheck disable=SC2016
make_fake gh 'case "${1:-} ${2:-}" in
  "pr list") cat "$GH_PRS_FILE" ;;
  "issue view") cat "$GH_ISSUE_FILE" ;;
  "api repos/"*)
    login=${2##*/}
    status_file="$GH_STATUS_DIR/$login"
    if [[ -s "$status_file" ]]; then
      status=$(sed -n "1p" "$status_file")
      sed -n "2,$ p" "$status_file" >"$status_file.next"
      mv "$status_file.next" "$status_file"
    else
      case ",${GH_COLLABORATORS:-}," in *",$login,"*) status=204 ;; *) status=404 ;; esac
    fi
    [[ "$status" == network ]] && { printf "network failure\n" >&2; exit 1; }
    printf "HTTP/2.0 %s fake\r\n\r\n" "$status"
    [[ "$status" == 204 ]] ;;
  *) printf "unexpected gh call: %s\n" "$*" >&2; exit 2 ;;
esac'
make_fake sleep 'exit 0'
mkdir -p "$TMP/status"
export GH_STATUS_DIR="$TMP/status"

new_repo() {
  rm -rf "$TMP/remote.git" "$TMP/repo"
  git init -q --bare "$TMP/remote.git"
  git init -q "$TMP/repo"
  git -C "$TMP/repo" config user.name Test
  git -C "$TMP/repo" config user.email test@example.com
  git -C "$TMP/repo" remote add origin "$TMP/remote.git"
  printf base >"$TMP/repo/file"
  git -C "$TMP/repo" add file
  git -C "$TMP/repo" commit -qm base
  git -C "$TMP/repo" branch -M main
  git -C "$TMP/repo" push -q origin main
}

add_remote_branch() {
  local branch=$1 date=$2
  git -C "$TMP/repo" checkout -q -B "$branch" main
  printf '%s' "$branch" >>"$TMP/repo/file"
  git -C "$TMP/repo" add file
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git -C "$TMP/repo" commit -qm "$branch"
  git -C "$TMP/repo" push -q origin "HEAD:refs/heads/$branch"
}

set_collaborator_statuses() {
  local login=$1
  shift
  printf '%s\n' "$@" >"$GH_STATUS_DIR/$login"
}

run_preflight() {
  : >"$TMP/output"
  (cd "$TMP/repo" && GH_REPO=acme/docs ISSUE_NUMBER=42 GITHUB_OUTPUT="$TMP/output" \
    bash "$ROOT/factory/scripts/preflight.sh")
}

printf '[]\n' >"$TMP/prs.json"
export GH_PRS_FILE="$TMP/prs.json" GH_COLLABORATORS=alice
new_repo
run_preflight
assert_eq false "$(output_value refused "$TMP/output")"
assert_eq false "$(output_value resume "$TMP/output")"
assert_eq '' "$(output_value refused_pr_url "$TMP/output")"
assert_eq '' "$(output_value resume_branch "$TMP/output")"
assert_eq '' "$(output_value resume_pr_number "$TMP/output")"

# A delimiter line in an output value cannot inject a second GitHub output.
: >"$TMP/safe-output"
GITHUB_OUTPUT="$TMP/safe-output" bash -c 'source "$1"; write_output sample $'"'"'first\nFACTORY_OUTPUT_EOF\nsecond'"'"'' _ "$ROOT/factory/scripts/lib.sh"
assert_contains 'sample<<FACTORY_OUTPUT_EOF_X' "$(cat "$TMP/safe-output")"

cat >"$TMP/prs.json" <<'JSON'
[{"number":7,"url":"https://example/pr/7","headRefName":"guide/issue-42-asana","author":{"login":"alice"},"body":"Closes #42","isDraft":true}]
JSON
run_preflight
assert_eq true "$(output_value resume "$TMP/output")"
assert_eq guide/issue-42-asana "$(output_value resume_branch "$TMP/output")"
assert_eq 7 "$(output_value resume_pr_number "$TMP/output")"

cat >"$TMP/prs.json" <<'JSON'
[{"number":8,"url":"https://example/pr/8","headRefName":"feature/asana","author":{"login":"alice"},"body":"fixes #42","isDraft":false}]
JSON
run_preflight
assert_eq true "$(output_value refused "$TMP/output")"
assert_eq https://example/pr/8 "$(output_value refused_pr_url "$TMP/output")"
assert_eq false "$(output_value resume "$TMP/output")"

cat >"$TMP/prs.json" <<'JSON'
[
 {"number":9,"url":"https://example/pr/9","headRefName":"feature/nope","author":{"login":"mallory"},"body":"Resolves #42","isDraft":false},
 {"number":10,"url":"https://example/pr/10","headRefName":"feature/wrong","author":{"login":"alice"},"body":"Closes #420 and fixes owner/repo#42 and closes #42x","isDraft":false}
]
JSON
run_preflight
assert_eq false "$(output_value refused "$TMP/output")"
assert_eq false "$(output_value resume "$TMP/output")"

# Authorless PRs are ignored; transient collaborator checks retry and recover.
cat >"$TMP/prs.json" <<'JSON'
[{"number":12,"url":"https://example/pr/12","headRefName":"feature/authorless","author":null,"body":"Closes #42","isDraft":false},{"number":13,"url":"https://example/pr/13","headRefName":"guide/issue-42-retry","author":{"login":"alice"},"body":"Closes #42","isDraft":false}]
JSON
set_collaborator_statuses alice 500 network 204
run_preflight
assert_eq true "$(output_value resume "$TMP/output")"
assert_eq guide/issue-42-retry "$(output_value resume_branch "$TMP/output")"

# Definitive 404 is ignored, but exhausted auth/server/network failures are fatal.
cat >"$TMP/prs.json" <<'JSON'
[{"number":14,"url":"https://example/pr/14","headRefName":"feature/nope","author":{"login":"mallory"},"body":"Closes #42","isDraft":false}]
JSON
set_collaborator_statuses mallory 404
run_preflight
assert_eq false "$(output_value refused "$TMP/output")"
set_collaborator_statuses mallory 401 401 401
if run_preflight >/dev/null 2>&1; then fail 'indeterminate collaborator status succeeded'; fi

# Refusal is stable across gh list order; mixed factory/human collaborator PRs fail safely.
cat >"$TMP/prs.json" <<'JSON'
[{"number":20,"url":"https://example/pr/20","headRefName":"feature/twenty","author":{"login":"alice"},"body":"Closes #42","isDraft":false},{"number":11,"url":"https://example/pr/11","headRefName":"feature/eleven","author":{"login":"alice"},"body":"Fixes #42","isDraft":false}]
JSON
run_preflight
assert_eq https://example/pr/11 "$(output_value refused_pr_url "$TMP/output")"
jq 'reverse' "$TMP/prs.json" >"$TMP/prs-reversed.json" && mv "$TMP/prs-reversed.json" "$TMP/prs.json"
run_preflight
assert_eq https://example/pr/11 "$(output_value refused_pr_url "$TMP/output")"
cat >"$TMP/prs.json" <<'JSON'
[{"number":21,"url":"https://example/pr/21","headRefName":"feature/human","author":{"login":"alice"},"body":"Closes #42","isDraft":false},{"number":22,"url":"https://example/pr/22","headRefName":"guide/issue-42-factory","author":{"login":"alice"},"body":"Closes #42","isDraft":false}]
JSON
if run_preflight >/dev/null 2>&1; then fail 'ambiguous factory/human PR set succeeded'; fi

printf '{"not":"an array"}\n' >"$TMP/prs.json"
if run_preflight >/dev/null 2>&1; then fail 'malformed PR response succeeded'; fi

printf '[]\n' >"$TMP/prs.json"
add_remote_branch guide/issue-42-one '2026-01-01T00:00:00Z'
run_preflight
assert_eq true "$(output_value resume "$TMP/output")"
assert_eq guide/issue-42-one "$(output_value resume_branch "$TMP/output")"

add_remote_branch guide/issue-42-newest '2026-02-01T00:00:00Z'
add_remote_branch guide/issue-420-wrong '2027-01-01T00:00:00Z'
run_preflight
assert_eq guide/issue-42-newest "$(output_value resume_branch "$TMP/output")"

# Stale tracking refs are pruned, and equal dates use lexical branch order.
newest_sha="$(git -C "$TMP/repo" rev-parse guide/issue-420-wrong)"
git -C "$TMP/repo" update-ref refs/remotes/origin/guide/issue-42-stale "$newest_sha"
add_remote_branch guide/issue-42-equal-b '2026-03-01T00:00:00Z'
add_remote_branch guide/issue-42-equal-a '2026-03-01T00:00:00Z'
run_preflight
assert_eq guide/issue-42-equal-a "$(output_value resume_branch "$TMP/output")"
if git -C "$TMP/repo" show-ref --verify --quiet refs/remotes/origin/guide/issue-42-stale; then fail 'stale remote ref was not pruned'; fi

# Issue JSON is data, comments are newest-100 in source order, and writes are atomic.
export GH_REPO=acme/docs GH_ISSUE_FILE="$TMP/issue.json"
jq -n '{number:42,title:"Asana",body:"line one\n$(touch should-not-exist)",url:"https://example/issues/42",author:{login:"bob"},comments:[range(1;106) as $n | {author:{login:("u"+($n|tostring))},createdAt:"2026-01-01T00:00:00Z",body:("comment "+($n|tostring)+"\nnext")}]}' >"$TMP/issue.json"
(cd "$TMP" && bash "$ROOT/factory/scripts/prepare-input.sh" 42 "$TMP/prepared.json")
jq -e '.schema_version == 1 and .repository == "acme/docs" and .issue.body == "line one\n$(touch should-not-exist)" and (.comments|length) == 100 and .comments[0].author == "u6" and .comments[99].author == "u105" and .comments[0].body == "comment 6\nnext"' "$TMP/prepared.json" >/dev/null
[[ ! -e "$TMP/should-not-exist" ]] || fail 'issue body was evaluated by the shell'
printf 'keep me\n' >"$TMP/prepared.json"
printf '{bad json\n' >"$TMP/issue.json"
if bash "$ROOT/factory/scripts/prepare-input.sh" 42 "$TMP/prepared.json" >/dev/null 2>&1; then fail 'malformed issue response succeeded'; fi
assert_eq 'keep me' "$(cat "$TMP/prepared.json")"
jq -n '{number:42,title:"Asana",body:"",url:"https://example/issues/42",author:null,comments:[{author:null,createdAt:"2026-01-01T00:00:00Z",body:"author removed"}]}' >"$TMP/issue.json"
bash "$ROOT/factory/scripts/prepare-input.sh" 42 "$TMP/prepared-null-author.json"
jq -e '.issue.author == null and .comments[0].author == null' "$TMP/prepared-null-author.json" >/dev/null

# Catalog pages overlap; output is normalized, sorted, credential-free, and atomic.
# shellcheck disable=SC2016
make_fake curl 'printf "%s\n" "$*" >>"$CURL_LOG"
case "${CATALOG_MODE:-normal}" in
  http) printf "service unavailable\n"; exit 22 ;;
  signal) : >"$SIGNAL_MARKER"; kill -TERM "$PPID"; exit 143 ;;
  cap) count=$(wc -l <"$CURL_LOG" | tr -d " " ); printf "{\"servers\":[],\"metadata\":{\"nextCursor\":\"cursor-%s\"}}\n" "$count"; exit 0 ;;
esac
case "$*" in
  *cursor=page2*) cat "$CATALOG_PAGE2" ;;
  *) cat "$CATALOG_PAGE1" ;;
esac'
export CURL_LOG="$TMP/curl.log" CATALOG_PAGE1="$TMP/page1.json" CATALOG_PAGE2="$TMP/page2.json"
cat >"$TMP/page1.json" <<'JSON'
{"servers":[{"server":{"name":"zeta","title":"Zeta","description":"Z","extra":"secret"},"remotes":[{"transport":"sse","url":"https://z"}],"registrySecret":"drop"},{"server":{"name":"alpha","title":"Alpha","description":"A"},"remotes":[]}],"metadata":{"nextCursor":"page2"}}
JSON
cat >"$TMP/page2.json" <<'JSON'
{"servers":[{"server":{"name":"zeta","title":"duplicate","description":"drop"},"remotes":[]},{"server":{"name":"beta","title":"Beta","description":null},"remotes":[{"transport":"streamable-http","url":"https://b","headers":{"x":"drop"}}]}],"metadata":{"nextCursor":null}}
JSON
PULSE_REGISTRY_KEY='key value' PULSE_REGISTRY_TENANT='tenant value' PULSE_REGISTRY_URL='https://pulse.test/' \
  bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/catalog.json"
jq -e '.status == "ready" and .tenant == "tenant value" and (.observed_at|type) == "string" and [.servers[].name] == ["alpha","beta","zeta"] and .servers[2] == {name:"zeta",title:"Zeta",description:"Z",remotes:[{transport:"sse",url:"https://z"}]} and ([paths | map(tostring) | join(".")] | all(test("secret|headers|registrySecret"; "i") | not))' "$TMP/catalog.json" >/dev/null
assert_eq 2 "$(wc -l <"$TMP/curl.log" | tr -d ' ')"
assert_contains 'X-Tenant-ID: tenant value' "$(cat "$TMP/curl.log")"
assert_contains 'X-API-Key: key value' "$(cat "$TMP/curl.log")"

unset PULSE_REGISTRY_KEY
PULSE_REGISTRY_TENANT=tenant bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/skipped.json"
jq -e '.status == "skipped" and .tenant == "tenant" and .servers == [] and (.observed_at|type) == "string"' "$TMP/skipped.json" >/dev/null
PULSE_REGISTRY_KEY=key PULSE_REGISTRY_TENANT='' bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/skipped-no-tenant.json"
jq -e '.status == "skipped" and .tenant == "" and .servers == []' "$TMP/skipped-no-tenant.json" >/dev/null

# Cursor cycles and a still-continuing 20th page fail without replacing output.
printf '{"servers":[],"metadata":{"nextCursor":"loop"}}\n' >"$TMP/page1.json"
printf 'keep cycle\n' >"$TMP/cycle.json"
: >"$TMP/curl.log"
if PULSE_REGISTRY_KEY=key PULSE_REGISTRY_TENANT=tenant bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/cycle.json" >/dev/null 2>&1; then fail 'cursor cycle succeeded'; fi
assert_eq 'keep cycle' "$(cat "$TMP/cycle.json")"

printf 'keep cap\n' >"$TMP/capped.json"
: >"$TMP/curl.log"
if CATALOG_MODE=cap PULSE_REGISTRY_KEY=key PULSE_REGISTRY_TENANT=tenant bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/capped.json" >/dev/null 2>&1; then fail 'pagination cap succeeded'; fi
assert_eq 20 "$(wc -l <"$TMP/curl.log" | tr -d ' ')"
assert_eq 'keep cap' "$(cat "$TMP/capped.json")"

# HTTP failures preserve the destination and clean every raw/temp response.
printf 'keep http\n' >"$TMP/http.json"
if CATALOG_MODE=http PULSE_REGISTRY_KEY=key PULSE_REGISTRY_TENANT=tenant bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/http.json" >/dev/null 2>&1; then fail 'HTTP catalog failure succeeded'; fi
assert_eq 'keep http' "$(cat "$TMP/http.json")"
if compgen -G "$TMP/http.json.*" >/dev/null; then fail 'catalog HTTP failure left temporary response files'; fi

# Signal termination also removes the raw response and all sibling temporaries.
export SIGNAL_MARKER="$TMP/signal-started"
printf 'keep signal\n' >"$TMP/signal.json"
if CATALOG_MODE=signal PULSE_REGISTRY_KEY=key PULSE_REGISTRY_TENANT=tenant bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/signal.json" >/dev/null 2>&1; then fail 'signalled catalog request succeeded'; fi
[[ -e "$SIGNAL_MARKER" ]] || fail 'signal fixture did not run'
assert_eq 'keep signal' "$(cat "$TMP/signal.json")"
if compgen -G "$TMP/signal.json.*" >/dev/null; then fail 'signal left catalog temporary response files'; fi

printf '{"servers":"wrong","metadata":{}}\n' >"$TMP/page1.json"
printf 'keep catalog\n' >"$TMP/catalog.json"
if PULSE_REGISTRY_KEY=key PULSE_REGISTRY_TENANT=tenant bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/catalog.json" >/dev/null 2>&1; then fail 'malformed catalog response succeeded'; fi
assert_eq 'keep catalog' "$(cat "$TMP/catalog.json")"
if compgen -G "$TMP/catalog.json.*" >/dev/null; then fail 'malformed catalog left temporary response files'; fi

printf 'PASS: preflight and input preparation\n'
