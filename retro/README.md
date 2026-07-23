# Retro

Append-only signal the drafting pipeline emits, distilled into doctrine
changes by `/tune-pipeline` (rules in
[`../docs/agents/constitution.md`](../docs/agents/constitution.md)).
Nothing in this directory changes pipeline behavior by existing — capture
is safe; only an approved tune proposal changes doctrine.

## `runs/` — Run Records (machine-written)

One JSON file per drafted Guide, written by the `/draft-guide` skill when a
run completes: `runs/<UTC timestamp>-<slug>.json`.

```json
{
  "slug": "box",
  "provider": "Box",
  "persona": "it-admin",
  "timestamp": "2026-07-22T18:00:00Z",
  "started_at": "2026-07-22T18:00:00Z",
  "finished_at": "2026-07-22T18:34:00Z",
  "status": "converged | unconverged | blocked | failed",
  "rounds": 2,
  "history": [
    {
      "round": 1,
      "blockers": ["… findings, each with dimension/target/where/problem/suggestion …"],
      "nits": ["…"],
      "revision_notes": "…",
      "disputed": ["…"],
      "skipped": ["… nits the revision agent did not apply, with reasons …"],
      "polish_notes": "… zero-blocker rounds only: what the polish pass changed …",
      "polish_skipped": ["…"],
      "polish_disputed": ["…"],
      "recheck": { "pass": true, "findings": ["…"] }
    }
  ],
  "unresolved": ["… only when unconverged …"],
  "open_questions": ["…"],
  "skipped": ["… optional: step ids skipped via pipeline.lock.json, e.g. draft, review.formatting …"],
  "research_change": {
    "method": "digest | judge | none",
    "unchanged": true,
    "notes": "… optional rationale from digest fast path or research-change judge …"
  }
}
```

`started_at` mirrors `timestamp` (the pre-launch capture that also stamps
provenance) so the timing pair reads standalone; `finished_at` is captured
when the record is written, so it is an upper bound on completion. Records
before 2026-07-22 carry neither. The history `skipped`/`polish_*`/`recheck`
fields appear only on runs since nits were applied in-loop. Top-level
`skipped` lists pipeline steps omitted by the lockfile contract;
`research_change` records how `research_unchanged` was decided (see
[`docs/agents/pipeline-lock.md`](../docs/agents/pipeline-lock.md)).

## `notes/` — Retro Notes (human-written)

Freeform markdown, one file per observation batch:
`notes/<date>-<slug-or-topic>.md`. This is where the highest-value signal
lives — what a human corrected after reviewing a draft, what a real user
stumbled on, what a reviewer keeps getting wrong. No format is enforced;
say what happened and which guide or role it implicates.
