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
    case ",${GH_COLLABORATORS:-}," in *",$login,"*) exit 0 ;; *) exit 1 ;; esac ;;
  *) printf "unexpected gh call: %s\n" "$*" >&2; exit 2 ;;
esac'

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

# Catalog pages overlap; output is normalized, sorted, credential-free, and atomic.
# shellcheck disable=SC2016
make_fake curl 'printf "%s\n" "$*" >>"$CURL_LOG"
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

# A continuing cursor is hard-capped at 20 pages.
printf '{"servers":[],"metadata":{"nextCursor":"loop"}}\n' >"$TMP/page1.json"
: >"$TMP/curl.log"
PULSE_REGISTRY_KEY=key PULSE_REGISTRY_TENANT=tenant bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/capped.json"
assert_eq 20 "$(wc -l <"$TMP/curl.log" | tr -d ' ')"
jq -e '.status == "ready" and .servers == []' "$TMP/capped.json" >/dev/null

printf '{"servers":"wrong","metadata":{}}\n' >"$TMP/page1.json"
printf 'keep catalog\n' >"$TMP/catalog.json"
if PULSE_REGISTRY_KEY=key PULSE_REGISTRY_TENANT=tenant bash "$ROOT/factory/scripts/prepare-catalog.sh" "$TMP/catalog.json" >/dev/null 2>&1; then fail 'malformed catalog response succeeded'; fi
assert_eq 'keep catalog' "$(cat "$TMP/catalog.json")"

printf 'PASS: preflight and input preparation\n'
