# Native safety executor (test only)

Run `bash factory/tests/test-native-dispatch.sh --execute` from the repository
root. The historical harness and binary filenames are retained to minimize churn;
research dispatch is now owned by the Go controller. The default shell invocation
checks retirement and retained entrypoints statically; CI requires execution.
Missing compiler, download, checksum, build or runtime errors fail CI.

## Immutable release provenance

Kit **0.2.2**, commit **bf347453982d0d62f57d4f4c38d2541537f967f9**:

- `https://raw.githubusercontent.com/speakeasy-api/kit/bf347453982d0d62f57d4f4c38d2541537f967f9/Cargo.lock`
  SHA-256: `5b01623c86d10beebf7089d81ec39bca1b03870e4817001c65cd3a77f1752be1`.
- The same commit's `mise.toml` pins Rust **1.94.0**; `Cargo.toml`
  declares that minimum compiler. There is no release `rust-toolchain.toml`.
- Runlet **0.6.0** archive SHA-256:
  `057e0864428c5a79a68683942d3750d05e9ffae541aa0185fde9ae1c87eca100`.
- serde_json **1.0.151** archive SHA-256:
  `c841b55ecdae098c80dcae9cf767f6f8a0c2cdb3416bbef72181df4d0fe73f14`.

The adjacent Cargo.lock is the transitive subset for those two dependencies,
not a newly selected graph. It was extracted from the release lock by following
package dependencies; Cargo 1.94.0 pruned unused feature dependencies offline.
All 31 registry name/version/source/checksum tuples were compared with
the original release lock. No dependency version was updated. To audit, verify
the original lock's SHA-256, then compare these tuples for every registry package
in the fixture lock. The fixture root is the only non-registry package.

The build script copies the manifest, lock and adapter into an empty temporary
context, runs `cargo +1.94.0 build --locked`, and uses a fresh Cargo home. Thus
Cargo downloads and checksum-verifies archives rather than trusting existing
extracted source directories or arbitrary precompiled workstation libraries.
Requires rustup with Rust 1.94.0, a system linker, registry network access and
Bash and the repository context helper; no Kit audio/native dependencies or production Rust
module are needed. CI bounds installation/build/execution to eight minutes.

The adapter uses actual Runlet Runtime APIs to compile and execute the retained
canonical context, report, and dossier literals. All three contracts run in both
`--execute` and the compatibility alias `--execute-context` modes.

Context checks use real helper stdout and assert exact complete result bytes,
nonzero and thrown failures, one call without retry, and no tool calls for a
synthetic malformed program. Report checks require the exact embedded literal,
verify hostile JSON remains one Bash argument, and exercise success, validation
rejection, other nonzero exits and throws. Dossier checks preserve exact data
bytes, require persistence before the writing gate, and stop on write/gate failure
without replay. Tool outcomes are simulated: this is not live provider acceptance.

The former dispatch program, assembler CLI, predecessor reader, and dispatch
adapter/diagnostics have been retired. The assembler library and its seven input
fixtures remain covered by Go prompt-byte and controller tests.
