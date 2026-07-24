---
name: tune-pipeline
description: Distill retro signal (Run Records, Retro Notes) from the draft-guide pipeline into human-approved doctrine changes — evidence-cited proposals against role docs, personas, skills, or the workflow. Use when asked to tune, improve, or retro the drafting pipeline.
---

# /tune-pipeline

Turns accumulated pipeline signal into doctrine improvements without
letting doctrine drift. The rules this skill operates under are in
`doctrine/constitution.md` — read it first, in full, every run. The
short version: propose, never impose; cite evidence; prefer sharpening to
adding; no-change is a valid outcome.

## Steps

1. **Read the ground truth**: `doctrine/constitution.md`,
   `doctrine/CHANGELOG.md` (what already changed, what was rejected —
   do not re-propose either without new evidence), then the current
   doctrine: every file in `doctrine/`, `doctrine/personas/`, and the
   Cursor SDK workflow under `pipeline/`.
2. **Read the signal**: everything in `retro/runs/` and `retro/notes/`
   not already cited by a changelog entry. If the corpus is large (more
   than ~10 run records), fan out reader subagents — one per review
   dimension plus one for disputes and open questions — and work from
   their summaries; otherwise read directly.
3. **Distill patterns**, looking for:
   - the same blocker category recurring across runs (which role doc or
     persona rule failed to prevent it?);
   - findings disputed and then re-raised — or disputed and dropped —
     repeatedly (ambiguous doctrine; two docs may disagree);
   - open questions recurring across providers (a gap in the Technical
     Research loop, not in any one guide);
   - rounds-to-convergence trending up, or reviewers passing things
     humans later corrected in `retro/notes/` (the strongest signal —
     weight it highest);
   - unresolved blockers the human settled — their resolution is doctrine
     the docs don't state yet.
4. **Draft proposals** — only for patterns clearing the constitution's
   evidence threshold. Each proposal: the target file, the exact diff (or
   tight sketch), the evidence (run record filenames / note files), the
   invariants touched and why the change preserves or strengthens them,
   and what it removes or merges if it grows a doc. A pattern that
   implicates an invariant itself becomes a **flagged tension** for the
   human, never a proposal.
5. **Present and apply**: show each proposal (AskUserQuestion works well —
   approve / reject / edit per proposal). Apply exactly the approved
   diffs, nothing more. Append one `doctrine/CHANGELOG.md` entry for
   the batch: date, files, changes, evidence — and list rejected
   proposals with a line of reasoning so future tune runs do not nag.
6. **Offer a regression check**: suggest re-running
   `mise run draft-guide -- <slug> --overwrite` on a reference provider
   (e.g. `box`) and comparing rounds-to-convergence and blocker counts
   against its last Run Record before trusting a doctrine change that
   touched reviewer or writer behavior.

## Hard rules

- Never edit `doctrine/constitution.md`. Tensions with it are reported,
  not resolved here.
- Never apply an unapproved diff, and never batch-approve ("apply all"
  from the user still means: show what will change first).
- Every applied change lands in the changelog with evidence, same turn.
- Do not propose from a single run's noise, from taste, or from this
  conversation's momentum — evidence lives in `retro/`, not in vibes.
- Leave `retro/` untouched apart from reading it; records are
  append-only history.
- Never commit or push; leave doctrine diffs in the working tree for
  human review like any other change.
