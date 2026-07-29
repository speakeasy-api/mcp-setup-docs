# Go module publish flow

Operator guide for shipping [`guides/`](guides/) as the embeddable Go module
`github.com/speakeasy-api/mcp-setup-docs/go`.

Consumer/dev API: [`go/README.md`](go/README.md).

| Workflow | When | What |
| --- | --- | --- |
| [`go-module-guide-validate.yml`](.github/workflows/go-module-guide-validate.yml) | PR touches `guides/**` or `schema/**` | Run the generator + size budget; **do not** require `go/` to be synced |
| [`go-module-ci.yml`](.github/workflows/go-module-ci.yml) | PR/push touches `go/**` (etc.) | Regenerate, fail on drift, vet/test |
| [`go-module-regen.yml`](.github/workflows/go-module-regen.yml) | Push to `main` on `guides/**` or `schema/**` | Regenerate embed; open/update `chore/go-module-regen` |
| [`go-module-release.yml`](.github/workflows/go-module-release.yml) | Publishable `go/` lands on `main` | Verify, then tag `go/vX.Y.Z` + GitHub Release |

## One-time setup

### Secrets

| Secret | Required? | What it is |
| --- | --- | --- |
| `AGENT_PAT` | **Yes** for regen | PAT with `contents` + `pull-requests` + `issues` write. Regen PRs authored with `GITHUB_TOKEN` do not trigger `pull_request` CI. Same secret as [`FACTORY.md`](FACTORY.md). |

### First tag (manual)

Release automation **no-ops** until this exists:

```bash
git checkout main && git pull
git tag -a go/v0.1.0 -m "mcp-setup-docs Go module v0.1.0"
git push origin go/v0.1.0
# optional: gh release create go/v0.1.0 --title go/v0.1.0 --generate-notes
```

Consumers install `@v0.1.0` (the `go/` prefix is the git tag namespace for the subdirectory module).

### Labels

Created automatically on regen failure if missing:

| Label | Meaning |
| --- | --- |
| `go-module:regen-failed` | Regen workflow failed on `main`; issue opened/commented with the run URL |

## Happy path

1. **Guide PR** — edit `guides/<slug>/` only. `Go module guide validate` must be green. Do **not** commit `go/` changes on the guide PR.
2. **Merge to `main`** — `go-module-regen` runs.
3. **Regen PR** — bot opens or updates [`chore/go-module-regen`](https://github.com/speakeasy-api/mcp-setup-docs/compare/main...chore/go-module-regen). Multiple guide merges while it is open are **aggregated** into that same PR. The PR body lists guide-level added/updated/removed drift (and other `go/` files) vs `main`.
4. **Human merge** — wait for `Go module CI` green, then merge. Branch is **machine-owned**; don’t push fixes there (they’ll be overwritten on the next regen).
5. **Release** — `go-module-release` re-verifies the module, patch-bumps to the next `go/vX.Y.Z`, creates a GitHub Release (notes list guide-level added/updated/removed since the previous tag), and best-effort primes `proxy.golang.org`.

```text
guides PR ──validate──► main ──regen──► chore/go-module-regen PR
                                              │
                                              ▼ human merge
                                         main (go/ synced)
                                              │
                                              ▼ release
                                         go/vX.Y.Z + GitHub Release
```

## Local develop

```bash
mise run generate-go   # sync guides → go/generated + regenerate index
mise run check-go      # regenerate, fail on drift, go test (+ generator tests)
```

## Semver

| Bump | How |
| --- | --- |
| Patch (default) | Automatic on each publishable `go/` merge after `go/v0.1.0` |
| Minor / major | Actions → **Go module release** → `workflow_dispatch` → choose bump |

Remote ids are append-only after the first tag (`go/published_server_refs.txt`). Removing a published `slug/remote-id` fails generation until restored or the manifest is intentionally rewritten after review.

## Failure modes

| Symptom | What to do |
| --- | --- |
| Guide validate fails | Fix `meta.yaml` / assets / aliases; generator error text is the source of truth |
| Regen fails / `go-module:regen-failed` issue | Fix guides or generator on `main`, then **workflow_dispatch** `Go module regen` (or merge another guides change) |
| Regen PR has no CI | Confirm `AGENT_PAT` is set on the repo |
| Release says no tags yet | Cut `go/v0.1.0` manually (see above) |
| Release refuses drift on main | Something landed on `main` without a clean embed — run regen and merge before tagging |

## Out of scope here

- Drafting guides — [`FACTORY.md`](FACTORY.md)
- Module API (`Lookup` / `Resolve` / `ByURL`) — [`go/README.md`](go/README.md)
