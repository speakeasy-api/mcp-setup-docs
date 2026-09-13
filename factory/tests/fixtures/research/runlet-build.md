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
