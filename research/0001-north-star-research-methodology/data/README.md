# Data — 0001 North-star research methodology

Raw measurements and the method. Keep these. Without them, no number in
[`FINDINGS.md`](../FINDINGS.md) can be checked.

**The test branch did not merge and may be deleted.** These files are the only surviving copy
of the tools and the treatment doctrine.

## The method

| File | Content |
|---|---|
| `treatment-doctrine.md` | The arm B research role, as tested. sha256 `28510098…ccebb834`. |
| `treatment.diff` | The change against the control. 55 lines, 4 hunks. Read this first. |
| `run-ab.sh` | The runner. One cell per invocation, in a cold isolated worktree. |
| `compare-arms.mjs` | The scorer. **Preserved as it ran, with its defect.** See `PROCESS.md` §7. |
| `matrix.sh` | The lane driver for the 7-cell matrix. |

The control doctrine is not copied here. It is on `main`, so git preserves it:

```bash
git show 42a88eb:doctrine/roles/technical-research.md
```

One dependency is missing on purpose: the usage instrumentation that produced the cost
numbers. It lived in `pipeline/src/` on the test branch and did not merge. Without it the run
records carry no `usage` block.

## `source-measurement/`

The measurement of every source that the 18 shipped guides cite. It produced the prediction
that the test then checked. Collected 2026-07-31 by fetching each URL and counting the words
of extracted page text. One word is approximately 1.35 tokens.

| File | Lines | Columns |
|---|---:|---|
| `urls.tsv` | 311 | guide slug, URL |
| `fetched.tsv` | 237 | URL, HTTP status, word count, content hash |
| `source-sizes.md` | 350 | word counts per guide, grouped by source |

A word count of 0 in `fetched.tsv` means the fetch returned a JavaScript shell, or the site
blocked it. **It does not mean the page is small.** The size is unknown.

## `arms/`

One directory for each of the 8 pipeline runs. The directory name is
`<slug>-<arm>[-<UTC timestamp>]`. A timestamp suffix marks a replicate; the runner adds it so
that a second run never overwrites the first.

| File | Content |
|---|---|
| `meta.json` | Slug, arm, exit code, wall-clock seconds, commit, doctrine sha256, worktree path |
| `<timestamp>-<slug>.json` | The pipeline run record, including the `usage` block |
| `run.log` | The pipeline output for the run |
| `guides/<slug>/` | The generated guide: `research.md`, `external.md`, `speakeasy.md`, `meta.yaml` |

The `usage` block holds the cost and token data:

```json
{
  "reported": true,
  "total":    { "costUsd": 0, "inputTokens": 0, "outputTokens": 0,
                "cacheReadTokens": 0, "cacheWriteTokens": 0, "totalTokens": 0 },
  "by_phase": { "<slug>: research": { } },
  "by_agent": [ { "label": "", "phase": "", "calls": 1, "usage_reported": true } ]
}
```

Read the arm from `meta.json`, not from the directory name alone. The `doctrine_sha256` field
is the authority:

| sha256 | Arm |
|---|---|
| `88f093f873c705128a0a31eb38be298a2ee11f4d50815552739925337f8ac3ad` | A, control |
| `2851009a5d878336b622dffa153d376fb6efe970a4bd26fde893dc36ccebb834` | B, treatment |

**`hubspot-a` ran at commit `360bbd9`, not `faa4d4a`.** Check `git_sha` in its `meta.json`.
See fault 2 in [`PROCESS.md`](../PROCESS.md).

## `matrix.sh`

The lane driver that ran the 7 new cells. It runs three lanes in parallel and staggers their
start times. It writes lane logs to `/tmp/ns-exp-logs/`, which are not preserved.
