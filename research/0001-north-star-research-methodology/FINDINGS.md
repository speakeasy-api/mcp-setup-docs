# Findings — 0001 North-star research methodology

**The evidence does not support the hypothesis.** The treatment did not decrease research
spend. The apparent saving and the apparent quality loss are both effects of the measurement
method, not of the doctrine change.

## 1. The raw cells

Eight pipeline runs. All at `faa4d4a`, except `hubspot-a`, which ran at `360bbd9`. Costs are
in US dollars. The raw records are in [`data/arms/`](data/arms/).

| Cell | status | rounds | research | draft | review | revise | **total** |
|---|---|---:|---:|---:|---:|---:|---:|
| `google-sheets-a` | unconverged | 3 | 1.0899 | 0.2185 | 1.6079 | 0.7764 | **3.6927** |
| `google-sheets-a` (run 2) | converged | 3 | 0.9128 | 0.2229 | 1.1390 | 0.4318 | **2.7065** |
| `google-sheets-b` | converged | 3 | 0.9971 | 0.2396 | 1.1937 | 0.6899 | **3.1202** |
| `google-sheets-b` (run 2) | converged | 3 | 1.4304 | 0.2503 | 1.4009 | 0.5911 | **3.6727** |
| `github-a` | converged | 3 | 0.8771 | 0.2288 | 1.0419 | 0.5424 | **2.6903** |
| `github-b` | converged | 2 | 1.0738 | 0.1921 | 0.6503 | 0.2725 | **2.1887** |
| `hubspot-a` | converged | 3 | 0.8295 | 0.2188 | 1.0302 | 0.3417 | **2.4203** |
| `hubspot-b` | converged | 2 | 0.7675 | 0.2368 | 0.7106 | 0.1910 | **1.9059** |

Total spend: **$22.40**.

## 2. Finding 1 — the treatment did not decrease reading

This is the most important result. The treatment had to decrease research spend by
approximately 72 percent. It did not decrease it at all.

**Research-phase tokens.** This measures how much the research role read.

| Provider | arm A | arm B | Δ |
|---|---:|---:|---:|
| google-sheets (mean of 2) | 734,077 | 1,148,857 | **+56%** |
| github (n=1) | 738,414 | 976,484 | **+32%** |
| hubspot (n=1) | 578,537 | 550,606 | -5% |

**Research-phase cost.**

| Provider | arm A | arm B | Δ |
|---|---:|---:|---:|
| google-sheets (mean of 2) | $1.0014 | $1.2138 | **+21%** |
| github (n=1) | $0.8771 | $1.0738 | **+22%** |
| hubspot (n=1) | $0.8295 | $0.7675 | -7% |

Two independent providers show the treatment reading **more**, not less. Only hubspot fell,
and it fell by 5 percent, not 72 percent.

The within-arm token spread is large (52 percent for arm A, 60 percent for arm B), so the
google-sheets number alone is weak. But no cell in the matrix shows the predicted decrease.
**The doctrine change did not produce the behaviour it was written to produce.** The test
therefore never reached the question it was built to answer.

## 3. Finding 2 — the cost saving is an effect of the method

`compare-arms.mjs` reported these total-cost deltas:

| Provider | reported Δ |
|---|---:|
| google-sheets | -15.5% |
| github | -18.6% |
| hubspot | -21.3% |

The tool compares the **first** run of each arm. The first google-sheets control run did not
converge, and it cost $3.6927. It is an outlier.

Use both replicates and the sign changes:

| google-sheets | arm A mean | arm B mean | Δ |
|---|---:|---:|---:|
| research | $1.0014 | $1.2138 | +21% |
| draft | $0.2207 | $0.2450 | +11% |
| review | $1.3735 | $1.2973 | -6% |
| revise | $0.6041 | $0.6405 | +6% |
| **total** | **$3.1996** | **$3.3965** | **+6%** |

**The treatment costs 6 percent more, not 16 percent less.** The github and hubspot cells have
no replicate. Their single-run deltas cannot be separated from the noise measured below.

## 4. Finding 3 — the quality loss is also an effect of the method

`compare-arms.mjs` printed this for google-sheets:

> ❌ 8 LABELS LOST IN ARM B

This is the control measurement that settles it. Both rows below use **the same doctrine, the
same commit, and the same slug**:

| Comparison | labels lost | labels gained |
|---|---:|---:|
| **arm A run 1 vs arm A run 2** | **8** | **8** |
| arm A run 1 vs arm B run 1 | 8 | 7 |
| arm A run 2 vs arm B run 1 | 3 | 2 |

Two identical runs differ by 8 labels. That is exactly the number reported as lost in the
treatment arm. Change which control run you compare against, and the loss falls from 8 to 3.

**Use a fixed reference instead.** Compare each run to the shipped guide, which does not
change:

| Provider | shipped labels | arm A coverage | arm B coverage |
|---|---:|---|---|
| google-sheets | 70 | 70%, 74% | 71%, **100%** |
| github | 48 | 29% | 29% |
| hubspot | 31 | 100% | 97% |

By this metric the treatment is equal or better. It is not worse anywhere.

One caution: coverage rewards a long document. The 100 percent cell produced 104 labels
against 56 or 57 for the others. Read that row as an outlier, not as a win.

## 5. Why the test cannot answer the question

The two identical control runs of google-sheets cost $2.7065 and $3.6927. **The spread is 36
percent.** One converged and one did not.

The effect we look for is approximately 20 percent of the total. **The noise is larger than
the signal.**

To resolve a 20 percent effect:

- Pooled standard deviation ≈ $0.565 on a mean of ~$3.20.
- n ≈ 16σ²/δ² ≈ **13 runs per arm**, which is approximately **$83 per provider**.

Treat this as an order of magnitude only. The standard deviation is itself estimated from two
runs.

Convergence is equally unusable at this sample size. The control converged in 1 of 2 identical
runs, so a single change in convergence proves nothing.

## 6. What did change, and what it points at

Every first-run comparison showed the same pattern: review down 26 to 38 percent, revise down
11 to 50 percent. The github and hubspot treatment cells converged in 2 rounds, not 3.

This signal is n=1 and unverified, and the google-sheets replicates do not reproduce it
(review -6 percent, revise +6 percent). Do not act on it.

It is worth recording for one reason. **Review and revise are 55 to 65 percent of the spend.
Research is 30 to 34 percent.** Any later work on cost should start with the larger phase.

This corrects an assumption that the earlier analysis carried. On the retired Cursor runtime,
`hubspot` converged in 1 round with research at 75 percent of spend. On pi it takes 3 rounds,
and review is the largest line item.

## 7. Recommendations

1. **Do not change
   [`doctrine/roles/technical-research.md`](../../doctrine/roles/technical-research.md).**
   There is no evidence for a change.

2. **Fix `tools/experiment/compare-arms.mjs` before anyone reuses it.** It must average the
   replicates, show a variance band, and hide the label verdict when the difference is smaller
   than the measured noise. In its present form it produces confident and wrong verdicts.

3. **If the question still matters, fix the treatment first.** The doctrine variant did not
   change the behaviour it targeted. Confirm that a new variant reduces research tokens on one
   provider before you buy a full matrix.

4. **Point later cost work at review and revise.** They are the larger share of spend.

## 8. What is preserved

| Path | Content |
|---|---|
| [`data/source-measurement/`](data/source-measurement/) | The 237-URL source measurement that produced the prediction. |
| [`data/arms/`](data/arms/) | All 8 cells: run record, `meta.json`, run log, and the generated guide. |
| [`data/matrix.sh`](data/matrix.sh) | The lane driver that ran the matrix. |
