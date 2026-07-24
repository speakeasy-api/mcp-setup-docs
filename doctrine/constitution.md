# Constitution

The fixed point the drafting pipeline improves *toward*, never *away from*.
Doctrine — the role docs, personas, skills, and workflow — may change over
time through `/tune-pipeline`; this file changes only by direct human edit.
The tune skill may flag tension with an invariant for a human to resolve,
but it never edits this file.

## The goal

Produce Guides — accurate, provenance-backed documentation bundles — that
let a specific persona configure an MCP Server behind the Speakeasy AI
Control Plane using only the guide, their credentials, and a browser.
Guides are authored from providers' public documentation. Everything else
in this repository exists to serve that sentence.

## Invariants

Numbered so proposals can cite them. A doctrine change that weakens one of
these is invalid regardless of the evidence behind it.

- **I1 — Facts flow one way.** Provider documentation → Research Dossier →
  Setup Guide. The Dossier is the fact ceiling; no downstream role invents,
  paraphrases, or fills a gap with a plausible guess. Visible gaps beat
  invisible patches.
- **I2 — Every fact has provenance.** A documentation locator and an
  observed date, recorded where the fact first lands.
- **I3 — The anchor contract holds.** Anchors are minted once, in the
  Dossier, and reused verbatim by `setup.md` and `meta.yaml`.
- **I4 — The setup.md grammar holds.** `setup_version` frontmatter, one H1,
  the three H2 sections in order, anchored H3 steps, the screenshot rule on
  every provider step, `{{ gram.oauth.callback_url }}` as the only template
  key, and `meta.yaml` validating against the schema.
- **I5 — Personas define voice.** The Writer applies the named persona
  file; reviewers judge achievability against it, not personal taste.
  Voice never alters facts.
- **I6 — Review converges by agreement.** Structured findings, the
  disputed-findings protocol, capped rounds, and unresolved blockers
  surfacing to a human — never silently dropped, never settled by rank.
- **I7 — Pipeline agents stay in their lane.** During a drafting run:
  touch only the assigned `guides/<slug>/` directory, never commit or
  push, never handle secret values, and never edit doctrine.
- **I8 — Doctrine changes are human-approved.** Role docs, personas,
  skills, and the workflow change only when a human approves a concrete
  diff. Every applied change gets a `doctrine/CHANGELOG.md` entry
  citing its evidence.

## Rules for evolving doctrine

How `/tune-pipeline` must behave when proposing changes:

- **Evidence threshold.** A proposal needs the same failure pattern in at
  least two independent runs (different providers, or the same provider
  re-drafted after unrelated changes), or one explicit human retro note.
  A one-off defect is fixed in the guide that has it, not in doctrine.
- **Rule provenance.** Every proposal names the run records and notes
  behind it, and every applied change carries that evidence into the
  changelog — so a future prune can find rules whose justification no
  longer holds.
- **Size discipline.** Prefer sharpening an existing rule to adding a new
  one. A proposal that grows a role doc should say what it tried to remove
  or merge first. Prompt bloat is drift with good intentions.
- **Invariant check.** Every proposal states which invariants it touches
  and why it strengthens or preserves them. Anything that would weaken one
  is presented only as a flagged tension for the human, never as a
  proposal.
- **No-change is a valid outcome.** If no pattern clears the threshold,
  the tune run reports that and stops.
