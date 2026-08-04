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
| [`go-module-consumer-bump.yml`](.github/workflows/go-module-consumer-bump.yml) | A `go/v*` tag is pushed | Open/update a `go.mod` bump PR on the consumer repo (`speakeasy-api/gram`) |

## One-time setup

### Secrets

| Secret | Required? | What it is |
| --- | --- | --- |
| `AGENT_PAT` | **Yes** for regen | PAT with `contents` + `pull-requests` + `issues` write. Regen PRs authored with `GITHUB_TOKEN` do not trigger `pull_request` CI. Same secret as [`FACTORY.md`](FACTORY.md). The release workflow also pushes the `go/vX.Y.Z` tag with it, which is what makes the tag event fire the consumer bump. |
| `GRAM_BOT_APP_ID` | **Yes** for consumer bump | App id of the `gram-bot` GitHub App. Copy it from `speakeasy-api/gram`, which stores it as a repo variable and a repo secret. |
| `GRAM_BOT_PRIVATE_KEY` | **Yes** for consumer bump | Private key of the same App. The workflow mints a token scoped to `speakeasy-api/gram`, with `contents` + `pull-requests` write, valid for an hour. Generate a second key in the App settings if the value is lost; existing keys stay valid. |

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
5. **Release** — `go-module-release` re-verifies the module, bumps to the next `go/vX.Y.Z` (patch, unless the merge commit message carries `[minor]` or `[major]`), creates a GitHub Release (notes list guide-level added/updated/removed since the previous tag), and best-effort primes `proxy.golang.org`.
6. **Consumer bump** — the `go/vX.Y.Z` tag fires `go-module-consumer-bump`. It waits for the module proxy, runs `go get` + `go mod tidy` on `speakeasy-api/gram`, and opens or refreshes [`chore/bump-mcp-setup-docs-go`](https://github.com/speakeasy-api/gram/compare/main...chore/bump-mcp-setup-docs-go) there. That branch is **machine-owned** too: the next release rebuilds it from the consumer default branch and force-pushes. A human on that repo reviews and merges.

```text
guides PR ──validate──► main ──regen──► chore/go-module-regen PR
                                              │
                                              ▼ human merge
                                         main (go/ synced)
                                              │
                                              ▼ release
                                         go/vX.Y.Z + GitHub Release
                                              │
                                              ▼ consumer bump
                                   speakeasy-api/gram go.mod PR
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
| Minor / major | Put `[minor]` or `[major]` in the **merge commit message**; the automatic run reads it |
| Minor / major (after the fact) | Actions → **Go module release** → `workflow_dispatch` → choose bump |

Prefer the merge-commit marker for an API change. A `workflow_dispatch` after
the automatic run leaves a throwaway patch tag behind, because the push-triggered
run already tagged before you dispatched.

A merge is publishable when it touches `go/` outside tests, `go/internal/`,
`go/README.md`, and `go/check.sh`. The release workflow states this as
`go/**` minus those paths, so a new source file releases without anyone
remembering to add it to a list.

Remote ids are append-only after the first tag (`go/published_server_refs.txt`). Removing a published `slug/remote-id` fails generation until restored or the manifest is intentionally rewritten after review.

## Failure modes

| Symptom | What to do |
| --- | --- |
| Guide validate fails | Fix `meta.yaml` / assets / aliases; generator error text is the source of truth |
| Regen fails / `go-module:regen-failed` issue | Fix guides or generator on `main`, then **workflow_dispatch** `Go module regen` (or merge another guides change) |
| Regen PR has no CI | Confirm `AGENT_PAT` is set on the repo |
| Release says no tags yet | Cut `go/v0.1.0` manually (see above) |
| Release refuses drift on main | Something landed on `main` without a clean embed — run regen and merge before tagging |
| No consumer bump PR after a release | Confirm `GRAM_BOT_APP_ID` + `GRAM_BOT_PRIVATE_KEY` are set, then Actions → **Go module consumer bump** → `workflow_dispatch` |
| Bump PR cannot use `review:bypass` | `gram-bot` authored it, and GitHub blocks self-approval. Ask a human for the review. |
| Consumer bump says the version never resolved | `proxy.golang.org` was still indexing — re-dispatch the workflow with the version |
| Consumer bump says `go.mod` does not require the module | The consumer dropped the dependency; add it back there or retire this workflow |

## Out of scope here

- Drafting guides — [`FACTORY.md`](FACTORY.md)
- Module API (`Lookup` / `Resolve` / `ByURL`) — [`go/README.md`](go/README.md)
