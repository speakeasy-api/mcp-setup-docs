# Shared rules for drafting-pipeline agents

Every agent in the drafting pipeline reads this file plus `CONTEXT.md` (the
vocabulary) before its own role doc. The pipeline is orchestrated by
`scripts/draft-guide-workflow.js`, invoked via the `/draft-guide` skill.

## The pipeline

One Guide (`guides/<slug>/`) moves through four roles:

| Role | Doc | Writes | Reads |
| --- | --- | --- | --- |
| Technical Research | `technical-research.md` (this dir) | `guides/<slug>/research.md`, `guides/<slug>/meta.yaml` | provider public docs |
| Writer | `writer.md` | `guides/<slug>/setup.md` | Research Dossier, Metadata, persona file |
| Fidelity | `fidelity.md` | nothing (report only) | all three guide files |
| Editorial | `review.md` | nothing (report only) | all three guide files, persona file |

Revision agents (spawned between review rounds) may touch all three guide
files, following the Technical Research and Writer role docs for whichever
file they edit.

## The anchor contract

Anchor IDs are minted once, by Technical Research, in the Dossier — one
document-unique kebab-case ID per provider step and per gotcha. Downstream:

- Writer carries each ID verbatim into `setup.md` headings:
  `### Create credentials {#create-credentials}`.
- Metadata references them as `setup.md#<anchor-id>`.
- Fidelity verifies all three agree.

No role but Technical Research may invent, rename, or drop an anchor. If a
step must split or merge, the fix starts in the Dossier.

## Disputed findings

Review rounds converge by agreement, not by rank. A revision agent that
believes a finding is wrong does not silently ignore it — it records the
finding in its `disputed` list with a one-line reason. Next-round reviewers
re-examine each disputed finding with fresh eyes and either re-raise it
(with the dispute addressed) or drop it. A finding still disputed when
rounds run out goes to the human unresolved.

## Hard rules

- Never commit or push; leave the working tree for human review.
- Touch only your assigned `guides/<slug>/` directory. Shared files
  (schema, docs, other guides) are read-only to pipeline agents.
- Never edit doctrine — these role docs, the personas, the skills, or the
  workflow — during a drafting run, even when a rule seems wrong or is
  slowing you down. Note the friction in your report instead; runs feed
  Run Records in `retro/`, and `/tune-pipeline` turns recurring friction
  into human-approved doctrine changes. The goal and invariants behind
  this live in `constitution.md` (this directory).
- No secret values anywhere — not in files, argv, reports, or issues.
- Any private Pulse export under `~/.local/share/mcp-catalog/private/` is
  licensed data. Individual derived facts (remote URL, transport, version)
  with `source: pulsemcp` provenance are fine; never copy its content into
  the repository or a report.
- Do not invent tools or console paths. Record the documentation locator
  each fact came from, and flag uncertainty in your report instead of
  guessing.
- The product is the "Speakeasy AI Control Plane"; never write the legacy
  name "Gram" in prose. The enforced `Values from Gram` section title and
  the `{{ gram.oauth.callback_url }}` template key are the only surfaces
  where the legacy token still appears, pending a coordinated rename.

## Reporting

Each agent returns its report through the structured output the workflow
requests — status, findings, or notes as its role doc specifies. The final
text of your turn is that report; write data, not a message to a human.
