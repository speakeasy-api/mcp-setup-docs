# Process — 0001 North-star research methodology

## 1. Where the test ran

| Item | Value |
|---|---|
| Branch | `experiment/north-star-pi` |
| Commit | `faa4d4a` |
| Base | `origin/main` @ `42a88eb` |
| Runtime | pi + OpenRouter |
| Date | 2026-07-31, 20:38Z to 21:00Z |

Two commits built the test equipment:

- `360bbd9` — usage instrumentation, the treatment doctrine, and both experiment tools.
- `faa4d4a` — a fix to the run marker. See "Faults in the procedure" below.

## 2. The two arms

Both arms run the same pipeline. Only one file differs.

| Arm | File used as `doctrine/roles/technical-research.md` | sha256 |
|---|---|---|
| A (control) | `doctrine/roles/technical-research.md` | `88f093f873c705128a0a31eb38be298a2ee11f4d50815552739925337f8ac3ad` |
| B (treatment) | `doctrine/roles/technical-research.northstar.md` | `2851009a5d878336b622dffa153d376fb6efe970a4bd26fde893dc36ccebb834` |

The treatment changes **55 lines in 4 hunks**. The runner copies the treatment file over the
control path, so the pipeline reads the same filename in both arms.

The treatment tells the research role to do four things:

1. Use the north-star document to set the order of the steps.
2. Let the north star win a conflict with another source.
3. Never read a reference index from start to end.
4. Look for three facts that the north star usually omits: the role grant, the administrator
   toggle, and the labels in the credential dialog.

## 3. Step 1 — measure the sources (before the test)

We read all 237 URLs that the 18 shipped guides cite in the provenance section of
`research.md`. We counted the words of extracted page text. One word is approximately 1.35
tokens.

The raw output is in [`data/source-measurement/`](data/source-measurement/):

| File | Content |
|---|---|
| `urls.tsv` | Every cited URL, with its guide slug. 311 lines. |
| `fetched.tsv` | The HTTP status, word count, and content hash for each URL. 237 lines. |
| `source-sizes.md` | Word counts per guide, grouped by source. 350 lines. |

This step produced the prediction that the test then checked: a ~72 percent cut in research
spend.

## 4. Step 2 — the A/B rig

**Runner** — `tools/experiment/run-ab.sh <slug> <a|b>`.

For each cell the runner does this:

1. Creates a detached git worktree at the current commit, under `/tmp/ns-exp/`.
2. Deletes `guides/<slug>/`. This forces a cold start. Without the deletion the pipeline
   *revises* the existing guide instead of researching it, because `researchPrompt` branches
   on `hasPrior`.
3. Copies the treatment doctrine over the control path, for arm B only.
4. Installs the pipeline dependencies. This time is not measured.
5. Runs `npm run draft-guide -- <slug> --overwrite` and measures the time.
6. Copies the guide, the run record, and a `meta.json` into `tools/experiment/results/`.

The runner writes its start marker beside the worktree, not inside it. A file inside the
worktree counts as a change outside the guide directory, and it weakens the I7 tripwire.

**Cost measurement** — the pi stream reports usage on each `turn_end` event:

```
message.usage = { input, output, cacheRead, cacheWrite, totalTokens, cost: { ... } }
```

`360bbd9` sums these into a ledger keyed by `label :: phase`, and writes a `usage` block into
the run record. The runtime charges usage before it judges the outcome. Therefore a failed
turn still counts, which is correct.

**Scorer** — `tools/experiment/compare-arms.mjs <slug>`. It reports cost per phase, the user
interface labels, the structure of each file, and the process record. **This tool has a
defect. See section 7.**

## 5. Step 3 — the matrix

Seven cells, in three parallel lanes. One earlier control run of `hubspot` gave the eighth
cell. The lane driver is preserved at [`data/matrix.sh`](data/matrix.sh).

| Lane | Cells | Why this provider |
|---|---|---|
| `gs-a` | google-sheets arm A, 2 runs | The target case. It cites a 42,308-word release-notes page. |
| `gs-b` | google-sheets arm B, 2 runs | Replicates measure the noise. |
| `mixed` | github A, github B, hubspot B | github is the guardrail. Its north star gave zero labels. |
| (earlier) | hubspot A | hubspot is the clean case. Its north star is sufficient alone. |

The lanes start 0, 45, and 90 seconds apart. The stagger stops the three `git worktree add`
calls from contending on the repository lock.

**Only google-sheets has replicates.** This choice decided the outcome of the test. The
replicates showed that the noise exceeds the effect. Without them we would have reported a
false 16 percent saving and a false loss of 8 labels.

## 6. Commands

Every command needs `mise exec --`. `OPENROUTER_API_KEY` reads empty in a stale shell
snapshot. The values live in `mise.local.toml`, which git ignores.

```bash
cd <repo>/.claude/worktrees/ns-pi

# one cell
mise exec -- tools/experiment/run-ab.sh google-sheets a

# the whole matrix, three lanes
mise exec -- bash research/0001-north-star-research-methodology/data/matrix.sh

# score one provider
node tools/experiment/compare-arms.mjs google-sheets
```

A cell takes 5 to 11 minutes. The pipeline exit code is 0 when the guide converged, and 2 when
it did not.

## 7. Faults in the procedure

Record these. A later reader needs them to explain the numbers.

**Fault 1 — the scorer reads only the first run of each arm.** `compare-arms.mjs` detects that
re-runs exist and prints a note, but it still scores run 1 alone. It then prints a confident
verdict and a red "LABELS LOST" block. **Both of its headline claims were wrong on this data.**
Before anyone reuses this tool, it must average the replicates, show a variance band, and hide
the label verdict when the difference is smaller than the measured noise.

**Fault 2 — the `hubspot-a` cell ran at an earlier commit.** It ran at `360bbd9`, before the
marker fix. Its worktree carried a `.ns-exp-start` marker that weakened the I7 tripwire. The
cell is valid, but it is not strictly comparable to the other seven.

**Fault 3 — the first cost estimate was low by 18 percent.** The estimate used `hubspot` at
$2.42 per run. google-sheets costs more. The matrix cost $19.98 against a $17 estimate.

**Fault 4 — the round count cannot be compared.** `MAX_ROUNDS` is 3. A run that does not
converge reports 3 rounds, and so does a run that converges on round 3. The metric is censored
at the ceiling.

## 8. What we measured

| Metric | Source | Useful? |
|---|---|---|
| Cost per phase, in dollars | `usage.by_phase` in the run record | Yes, for the research phase |
| Total cost | `usage.total.costUsd` | No. The noise is 36 percent. |
| Tokens per phase | `usage.by_phase` | Yes. It shows how much the role read. |
| User interface labels | Bold text in `external.md` and `speakeasy.md` | Only against a fixed reference |
| Reference coverage | The same labels, compared to the shipped guide | Yes. This is the better metric. |
| Rounds and status | The run record | No. See Fault 4. |

The label metric needs care. A comparison of arm A against arm B counts the churn between two
samples, and that churn is large. A comparison of each arm against the **shipped guide** uses
a fixed reference, so it is stable. Use the second method.
