# 0001 — North-star research methodology

**Status:** `Complete — not supported`
**Date:** 2026-07-31
**Branch tested:** `experiment/north-star-pi` @ `faa4d4a`
**Cost:** $22.40 across 8 pipeline runs

## The hypothesis

Many upstream providers publish a purpose-built document that tells a user how to set up
their MCP server. That document has the same audience as our guides. Call it the **north star**.

Three tests identify a north star:

1. The upstream provider publishes it on their own site.
2. The provider built it for this purpose. It is *the* document they wrote to instruct users.
3. It is recent. A newer document beats an older launch blog post.

The hypothesis: if the research role treats the north star as authoritative, and does not
sweep the supporting documentation, then the pipeline uses fewer tokens and the reader loses
nothing.

The concern behind the hypothesis, in the author's words:

> I'm not saying that we should forego additional/supporting documentation, but I'm concerned
> that it risks flooding our precious context with things that don't actually help the
> end-user quickly set up the mcp server.

## The outcome

**The evidence does not support the hypothesis. Do not change
[`doctrine/roles/technical-research.md`](../../doctrine/roles/technical-research.md).**

Three results, in order of importance:

1. **The predicted behaviour did not occur.** The treatment had to decrease research spend by
   approximately 72 percent. Research spend *increased* on two of the three providers. The
   research role read more, not less.

2. **The apparent cost saving is not real.** The scoring tool compared only the first run of
   each arm, and the first control run was an expensive outlier. When both replicates are
   used, the treatment costs 6 percent **more**.

3. **The apparent quality loss is also not real.** Two runs of the *same* arm differ by 8 user
   interface labels. That is the same number the tool reported as lost in the treatment arm.

The test cannot resolve the question at this sample size. The spread between two identical
runs is 36 percent. The effect is approximately 20 percent. **The noise is larger than the
signal.**

See [`FINDINGS.md`](FINDINGS.md) for the numbers and
[`PROCESS.md`](PROCESS.md) for the method.

## What is still true

The measurement that motivated the test is sound, and it is preserved in
[`data/source-measurement/`](data/source-measurement/). It shows that six citations, which are
4 percent of the sources, are 41 percent of all words read, and that they yielded two labels.
Those six citations are reference indexes, not procedure documents.

That finding did not translate into a saving, because the treatment doctrine did not change
the behaviour it was written to change. **The idea is untested, not disproved.** The test
measured one wording of the idea.

## Related work in this repository

- [`retro/notes/2026-07-22-setup-not-maintenance.md`](../../retro/notes/2026-07-22-setup-not-maintenance.md)
- [`retro/notes/2026-07-22-what-can-be-removed.md`](../../retro/notes/2026-07-22-what-can-be-removed.md)
- [`retro/notes/2026-07-23-trust-provider-documented-ui.md`](../../retro/notes/2026-07-23-trust-provider-documented-ui.md)

The hypothesis generalizes these three notes. Each note records a supporting-document fact
that became a distraction and cost a review round.
