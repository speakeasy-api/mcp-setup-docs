# Verified Kit v0.2.2 release integration

Official release commit: `bf347453982d0d62f57d4f4c38d2541537f967f9`.
Includes PR 224: `b4d204e76d5422410c728364eb614b9205878e6a`.

- Public archive: https://github.com/speakeasy-api/kit/releases/download/v0.2.2/kit-v0.2.2-x86_64-unknown-linux-gnu.tar.gz
- Archive SHA256: `1371a3d708ed5a897d15bbe3a76fb92c9ee20d69eeb5bb7d6626fee1e914310f`
- Published checksums: https://github.com/speakeasy-api/kit/releases/download/v0.2.2/SHA256SUMS
- Previously isolated release binary output: `kit 0.2.2` (no provider).
- Cargo.lock: https://raw.githubusercontent.com/speakeasy-api/kit/bf347453982d0d62f57d4f4c38d2541537f967f9/Cargo.lock
- Lock SHA256: `5b01623c86d10beebf7089d81ec39bca1b03870e4817001c65cd3a77f1752be1`
- All 31 registry name/version/source/checksum tuples in the executor lock
  match the verified release lock. Runlet 0.6.0, serde_json 1.0.151 and Rust
  1.94.0 are unchanged. No dependency updates.

Historical `kit-v0.1.134` normal schema-3 synthetic fixtures apply to both
releases; they are not new runtime acceptance evidence. Schema-5 child/snapshot
source 735409e is included in this release. No decoder or prompt behavior changed.

RED: release and container assertions failed expecting 0.2.2, actual 0.1.134.
Image build and image-dependent/full-suite checks await the new 0.2.2 image;
the existing 0.1.134 image/tag is untouched. The native builder uses the unchanged
release-compatible subset with fresh Cargo downloads and `--locked`.

GREEN: `bash factory/tests/test-kit-release.sh` and the static
`bash factory/tests/test-container.sh` passed using the verified cached public
archive (no download or image build). `git diff --check` passed. The builder
contains no old Kit URL or lock checksum pin to replace; its only compiler pin
remains Rust 1.94.0 and its `--locked` input graph is unchanged apart from the
release-provenance comment.
