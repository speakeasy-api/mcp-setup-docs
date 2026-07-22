# 2026-07-22 — Workflow `args` arrive as a JSON string, breaking the launch

Observed by the assistant during the 2026-07-22 `/draft-guide box`
(overwrite) run; Walker, amend freely.

## What happened

The `/draft-guide` skill launched the doctrine workflow at
`scripts/draft-guide-workflow.js` with `args` passed as an object in the
Workflow tool call (per the tool's own contract: "Pass arrays/objects as
actual JSON values ... NOT as a JSON-encoded string"). It failed instantly,
twice:

```
Error: args.guides must be a non-empty array of {slug, provider, notes?}
```

A diagnostic probe workflow showed why: in this session the Workflow
harness delivers `args` to the **top-level** script as a JSON **string**,
not a parsed object — `typeof args === "string"`. The doctrine workflow's
guard at `scripts/draft-guide-workflow.js:17` does
`Array.isArray(args.guides)`, which is false for a string, so every launch
is rejected before any agent runs.

## Workaround used this run (no doctrine touched)

A throwaway shim in the session scratchpad
(`draft-guide-args-shim.js`) parses `args` when it is a string and runs the
**unmodified** doctrine workflow via the `workflow()` hook. Confirmed by
probe: `workflow(ref, obj)` delivers `args` to the child as a real object,
so the doctrine guard passes. The shim is scratchpad-only and disposable —
it was not committed and changes no pipeline behavior.

## What it implicates

Two candidate fixes for `/tune-pipeline` to weigh — the human decides:

- **The `/draft-guide` skill** (`.claude/skills/draft-guide`): its launch
  step (step 5) could pass `args` in a form the harness delivers as an
  object, or the skill could carry a documented shim so runs don't fail on
  a fresh session.
- **The doctrine workflow** (`scripts/draft-guide-workflow.js`): the arg
  guard could tolerate a string by parsing it first
  (`typeof args === 'string' ? JSON.parse(args) : args`) before the
  `Array.isArray` check. One line, and every future run is immune
  regardless of how the harness encodes `args`.

Unclear whether the string-encoding is session-specific or universal to
this harness version; if the "box - first pass" run (commit `bff50c3`)
launched cleanly, something about the launch or harness changed since.

## Status

Not fixed in doctrine — captured only, per the `/draft-guide` hard rules.
The box re-draft ran to completion via the shim: converged in 1 round with
9 nits, 0 blockers (Run Record `retro/runs/2026-07-22T21:57:12Z-box.json`).
