# Titus transcript sanitization — feasibility spike

Status: evaluated in an isolated scratch module; not integrated or approved
for production rollout. No production workflow, Go module, or exporter changed.

## Recommendation

Titus v1.2.9 is a viable detection engine for a small transcript-redaction
wrapper, but the root `titus.NewScanner` API is not sufficient for a fail-closed
upload gate. Use the public `pkg/rule` loader and `pkg/matcher` API so regex
warnings can cause the readable export to be withheld. Do not instantiate a
credential validator. Keep existing metadata-only diagnostics as fallback.

## Verified

- Pinned dependency: `github.com/praetorian-inc/titus@v1.2.9`.
- Requires Go 1.27.0; the scratch build automatically selected Go 1.27.1.
  The repo module and factory lint builder currently use Go 1.22/1.22.12.
  Checked older tags v1.2.7 and v1.2.0 require Go 1.25.8 and 1.25.3.
- Builds with `CGO_ENABLED=0`; no Hyperscan/VectorScan native dependency needed.
- Loaded 534 bundled rules. Matcher initialization took about 23 ms in one
  local run; tiny synthetic inputs scanned in roughly 0.4–1.2 ms each. These
  are smoke-test observations, not representative transcript benchmarks.
- Synthetic GitHub token detection/redaction passed for plain text, repeated
  occurrences with a Unicode prefix, and JSON-escaped text after decoding.
- Clean public-source text remained unchanged; redacted fixtures rescanned
  with no findings.
- A synthetic catastrophic-backtracking rule produced a warning despite a
  nil scan error. The lower-level matcher warning callback observed it.
- Cross-compiled the test binary for Linux amd64 with CGO disabled. It is a
  static ELF executable. It was not executed in the factory container.

## Important findings

### Match offsets do not enumerate every secret occurrence

The first test failed: a token appeared twice but Titus returned one finding.
Source inspection confirmed deduplication by captured values. Masking only
reported byte ranges left a token visible.

The revised spike masks reported ranges plus every occurrence of each
nonempty captured value in the original decoded text, then rescans. This
passed the repeated-token fixture. Production code must also cover multiple
fields/records, overlapping findings, and escaped representations; this small
fixture set does not establish complete coverage.

### A nil scan error does not establish completion

The portable matcher can skip a rule after a regex timeout/error and report
that through `WarnFunc`. The root scanner does not supply this callback and
its `ScanBytes` does not drain timed-out work. Its context-taking scan method
uses the context for validation rather than bounding regex scanning itself.

Use `matcher.Config.WarnFunc` to mark the export unsafe on warnings; do not
log the warning arguments or matches. Retain a process-level deadline as well
as input bounds. No readable transcript upload after an incomplete scan.

## Proposed integration — pending approval

- Decode selected session text fields rather than scanning raw JSON alone.
- Redact exact known runtime secret values independently of detector rules.
- Load Titus rules once; scan bounded content sequentially via the matcher.
- Redact captured values across the export, not just one reported location.
- Recheck serialized output and withhold it on findings, warnings, or errors.
- Never publish raw sessions, matched values, or scanner findings as fallback.
- **Revised decision after the spike:** upgrade the repository to Go 1.27.0
  and use its existing module for the sanitizer. This supersedes the initial
  factory-only module/build-stage isolation decision. Align relevant CI and
  container references, pin Titus, and check existing builds/tests and consumer
  compatibility implications. Implementation is pending.
- Verify actual Kit session coverage and larger transcript performance before
  replacing the existing structural transcript.

## Reproduction and evidence

Throwaway test source and logs are at `/tmp/titus-library-spike.Z0Zx8a/`
(`titus_test.go`, `test.log`, `linux-build.log`, `dependency.log`). This path is
local scratch storage, not a durable repository test suite. Only synthetic
credential-shaped data was used; no live credential validation was enabled.

Commands run successfully after the repeated-value correction:

```sh
GOWORK=off CGO_ENABLED=0 go test -v -count=1 -timeout=60s ./...
GOWORK=off CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go test -c -o spike-linux.test .
```

Pinned sources:

- https://github.com/praetorian-inc/titus/blob/v1.2.9/go.mod
- https://github.com/praetorian-inc/titus/blob/v1.2.9/titus.go
- https://github.com/praetorian-inc/titus/blob/v1.2.9/pkg/matcher/matcher.go
- https://github.com/praetorian-inc/titus/blob/v1.2.9/pkg/matcher/crossrule.go
- https://github.com/praetorian-inc/titus/blob/v1.2.9/pkg/matcher/regexp_portable.go
