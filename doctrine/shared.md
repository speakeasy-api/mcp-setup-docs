# Shared rules for drafting-pipeline agents

Every agent in the drafting pipeline reads this file plus `doctrine/glossary.md` (the
vocabulary) before its own role doc. The pipeline is orchestrated by
`pipeline/` (`mise run draft-guide` / factory Action).

## The pipeline

One Guide (`guides/<slug>/`) moves through four roles:

| Role | Doc | Writes | Reads |
| --- | --- | --- | --- |
| Technical Research | `doctrine/roles/technical-research.md` | `guides/<slug>/research.md`, `guides/<slug>/meta.yaml` | provider public docs, `doctrine/speakeasy-setup.md` |
| Writer | `doctrine/roles/writer.md` | `guides/<slug>/setup.md` | Research Dossier, Metadata, persona file |
| Fidelity | `doctrine/roles/fidelity.md` | nothing (report only) | all three guide files |
| Editorial | `doctrine/roles/review.md` | nothing (report only) | all three guide files, persona file |

After research, the factory may pause on material open questions (scope
gate) before Writer runs. Review rounds also run a deterministic lint
pass (`dimension: lint`) for setup.md grammar and `meta.yaml` schema.

Revision agents (spawned between review rounds) may touch all three guide
files, following the Technical Research and Writer role docs for whichever
file they edit.

Skip-if-unchanged for draft and per-dimension review is defined by the
pipeline lockfile contract (`guides/<slug>/pipeline.lock.json`); see
[`pipeline-lock.md`](pipeline-lock.md). Research always runs. Lock semantics
are for orchestrators — agents do not read or write the lockfile.

## The anchor contract

Anchor IDs enter a guide once, through the Dossier — provider-step IDs
minted there by Technical Research (document-unique, kebab-case, one per
step), Speakeasy-section IDs fixed in `doctrine/speakeasy-setup.md` and
carried in by its transclusion. Downstream:

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

Cross-dimension conflicts must be disputed, not silently expanded. When
achievability demands documenting a path that the critical-path ceiling
in `review.md` says to cut or hedge — especially when public docs cannot
complete the path — the revision agent disputes the achievability finding
with a one-line reason rather than growing the guide forever. Skipping a
conflicting nit while still accepting the opposing blocker is fine only
when the blocker stays inside the critical-path ceiling; otherwise
dispute the blocker.

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
  name "Gram" in prose. The `{{ gram.oauth.callback_url }}` template key is
  the only surface where the legacy token still appears, pending a
  coordinated rename.

## Reporting

Each agent returns its report through the structured output the workflow
requests — status, findings, or notes as its role doc specifies. The final
text of your turn is that report; write data, not a message to a human.
