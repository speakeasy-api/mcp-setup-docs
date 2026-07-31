# Research

A record of research initiatives against the drafting pipeline. Each initiative asks one
question, runs one test, and writes down what it found — including a negative result.

This directory does not change pipeline behaviour. It holds evidence. A change to doctrine
must go through `/tune-pipeline` and the rules in
[`../doctrine/constitution.md`](../doctrine/constitution.md).

## Layout

One numbered directory for each initiative: `NNNN-short-slug/`.

| File | Content |
|---|---|
| `README.md` | The hypothesis, the status, and a short summary of the outcome. Read this first. |
| `PROCESS.md` | How the test ran. Names the branch, the commit, and the exact commands. |
| `FINDINGS.md` | What the test measured, and what the numbers support. |
| `data/` | The raw measurements. Keep these, or the numbers become unverifiable. |

## Status values

Put a `**Status:**` line at the top of each `README.md`. Use one of these values:

| Status | Meaning |
|---|---|
| `In progress` | The test runs now. |
| `Complete — supported` | The evidence supports the hypothesis. |
| `Complete — not supported` | The evidence contradicts the hypothesis. |
| `Complete — inconclusive` | The measurement noise is larger than the effect. |
| `Superseded by NNNN` | A later initiative replaces this one. |

## Rules

1. **Do not edit a complete initiative.** If the conclusion changes, write a new initiative.
   Then set the old status to `Superseded by NNNN` and link to the new directory. This follows
   the [ADR convention](https://adr.github.io/).

2. **Record negative results.** A test that fails is evidence. It stops the next person from
   spending the same money on the same question.

3. **Record the faults in the procedure.** If an instrument was wrong, or a run was an
   outlier, write that in `FINDINGS.md`. A later reader must be able to explain an odd number.
   This follows standard [lab-notebook practice](https://colinpurrington.com/tips/lab-notebooks/).

4. **Name the branch and the commit in `PROCESS.md`.** A result is not reproducible without
   them.

5. **Keep the raw data.** Put it in `data/`. Summaries in the markdown files are for the
   reader. The data is for the person who does not believe the summary.

## Initiatives

| # | Initiative | Status |
|---|---|---|
| [0001](0001-north-star-research-methodology/) | North-star research methodology | `Complete — not supported` |
