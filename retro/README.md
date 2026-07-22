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
  "status": "converged | unconverged | blocked | failed",
  "rounds": 2,
  "history": [
    {
      "round": 1,
      "blockers": ["… findings, each with dimension/target/where/problem/suggestion …"],
      "nits": ["…"],
      "revision_notes": "…",
      "disputed": ["…"]
    }
  ],
  "unresolved": ["… only when unconverged …"],
  "open_questions": ["…"]
}
```

## `notes/` — Retro Notes (human-written)

Freeform markdown, one file per observation batch:
`notes/<date>-<slug-or-topic>.md`. This is where the highest-value signal
lives — what a human corrected after reviewing a draft, what a real user
stumbled on, what a reviewer keeps getting wrong. No format is enforced;
say what happened and which guide or role it implicates.
