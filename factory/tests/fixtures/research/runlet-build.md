# Canonical dispatch executor (test only)

Run `FACTORY_PROMPT_ASSEMBLER=/absolute/path/to/prepare-research-prompt bash
factory/tests/test-native-dispatch.sh --execute` from the repository root (join
these two lines). Build the assembler with `go build` in `go/cmd/prepare-research-prompt`.
The default shell invocation remains explicitly static; CI additionally requires
execution. Missing compiler, download, checksum, build or runtime errors fail CI.

## Immutable release provenance

Kit **0.1.134**, commit **5eb76012530cc374a37ed6ebb0ddea965e116c18**:

- `https://raw.githubusercontent.com/speakeasy-api/kit/5eb76012530cc374a37ed6ebb0ddea965e116c18/Cargo.lock`
  SHA-256: `f87846b20a6e42624fb47b3eeef5b9b3e43cc0d80e6f096fc5fa9487f3b23678`.
- The same commit's `mise.toml` pins Rust **1.94.0**; `Cargo.toml`
  declares that minimum compiler. There is no release `rust-toolchain.toml`.
- Runlet **0.6.0** archive SHA-256:
  `057e0864428c5a79a68683942d3750d05e9ffae541aa0185fde9ae1c87eca100`.
- serde_json **1.0.151** archive SHA-256:
  `c841b55ecdae098c80dcae9cf767f6f8a0c2cdb3416bbef72181df4d0fe73f14`.

The adjacent Cargo.lock is the transitive subset for those two dependencies,
not a newly selected graph. It was extracted from the release lock by following
package dependencies; Cargo 1.94.0 pruned unused feature dependencies offline.
Every resulting registry name/version/source/checksum tuple was compared with
the original release lock. No dependency version was updated. To audit, verify
the original lock's SHA-256, then compare these tuples for every registry package
in the fixture lock. The fixture root is the only non-registry package.

The build script copies the manifest, lock and adapter into an empty temporary
context, runs `cargo +1.94.0 build --locked`, and uses a fresh Cargo home. Thus
Cargo downloads and checksum-verifies archives rather than trusting existing
extracted source directories or arbitrary precompiled workstation libraries.
Requires rustup with Rust 1.94.0, a system linker, registry network access and
the real Go assembler; no Kit audio/native dependencies or production Rust
module are needed. CI bounds installation/build/execution to eight minutes.

The adapter uses actual Runlet Runtime APIs to compile and execute the canonical
production-matched dispatch. Only native tools and private filesystem persistence
are fake. Assertions cover exact assembler stdout including its trailing newline,
distinct topic handles, complete same-session continuation handles, prior evidence
preservation after an uncertain failure without retry, empty-output rejection,
and hostile issue data kept out of shell command syntax. This is not live native
agent/provider or whole-factory acceptance.

## Focused coordinator context regression

`bash factory/tests/test-native-dispatch.sh --execute-context` uses the same
fresh, release-locked build without requiring the research assembler. It extracts
the first Runlet literal directly from the coordinator, replaces only the slug,
and exercises success (real helper stdout, exact bytes and complete shell result),
nonzero shell exit, and thrown tool failure. It asserts exactly one shell call,
the fixed failure sentinel, and zero dispatch for a synthetic malformed program.
The normal `--execute` path runs these checks too. Tool execution is simulated;
this is not evidence about the omitted live-trial literals or model compliance.

The same focused and normal executor modes also execute `report.runlet`, requiring
an exact fenced copy in the coordinator. Actual Bash argument parsing verifies
hostile JSON remains one unchanged data argument. Simulated shell success,
validation rejection, other nonzero exits and throws each dispatch once, without
retry. `bash factory/tests/test-write-report.sh` separately runs the real writer
and validator, checking exact persisted bytes, private permissions, rejection of
unsafe entries and preservation of the previous final on validator failure.
The production helper uses existing Bash/coreutils/jq only (no Python runtime).
These tests do not reproduce the omitted live-trial programs or prove model compliance.

## Private predecessor handles

Follow-ups no longer accept `existingHandle` input. The canonical program calls
`read-research-handle.sh` with validated numeric topic/index and passes
`json.parse(handleRead.stdout)` directly to native `prompt`. The helper reads only
the exact predecessor, validates its assignment and original session ID, and
returns every byte without projecting output or updates. Missing predecessors
(including failed prior attempts) fail closed; no arbitrary latest-file search.
The return contract still includes the complete native handle.

`test-read-research-handle.sh` covers a 36 KB opaque handle, both predecessor
indexes, malformed/missing records, foreign identity, changed paths, permissions,
symlinks, hardlinks and the 64 KiB cap. This conservative cap rejects oversized
records rather than truncating them. It is below the inspected development Kit
shell's 64 MiB internal output limit; model-facing artifact previews are not used.

Local synthetic native verification used the existing
`.tmp-kit-dev-9829cc2-a1128c8/latestE-native/{repro.py,verify.py}` harness, with the
canonical script unchanged, no handle inputs and production `umask 077`. Four
concurrent original sessions completed initial dispatch plus two follow-ups
(generations 1, 2, 3; 12 successful dispatches). Verification checked exact prompt
bytes, complete persisted handle/report equality, durable idle generations, and
model-facing artifact wrappers. The first mock run omitted the production umask;
its 0644 records were correctly rejected. This is a local mock-provider result,
not live provider acceptance or proof of the original failure's cause. It removes
the fragile model-copy boundary; it does not establish that boundary caused the
original failure. Release pins and privacy/frozen-export rules are unchanged.
