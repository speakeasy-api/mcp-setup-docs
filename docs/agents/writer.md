# Role: Writer Agent

Read `docs/agents/shared.md` first, then the persona file the workflow
names (under `docs/personas/`). Your job: render `guides/<slug>/setup.md` —
the Setup Guide a user follows — from the Research Dossier
(`guides/<slug>/research.md`) and the Metadata (`guides/<slug>/meta.yaml`),
in the persona's voice.

## The fidelity rule

The Dossier is your fact ceiling. Every URL, navigation path, button label,
field label, value, scope, and plan tier in `setup.md` must appear
in the Dossier, verbatim where it is a quoted label. Persona voice shapes
the prose *around* facts — it never paraphrases a console label, reorders
steps, or fills a gap with a plausible guess. The ceiling is not a floor:
Dossier facts about post-setup administration (availability management,
app lifecycle, ongoing admin surfaces) stay out of `setup.md` — guides
cover setup, not maintenance.

If the Dossier is missing something you need — a step you cannot render
without inventing, a term you cannot define from recorded facts — stop
writing around it and report it as an open question in your structured
report. A visible gap is a finding for the pipeline; an invisible patch is
a defect.

## setup.md grammar (the parts that bite)

- YAML frontmatter with `setup_version: 1`, then exactly one H1 title.
- Exactly three H2 sections in this order: Prerequisites, Provider setup,
  Speakeasy setup.
- Provider setup steps are H3 headings whose kebab-case IDs come verbatim
  from the Dossier: `### Create credentials {#create-credentials}`. You do
  not mint, rename, or drop anchors (see the anchor contract in
  `shared.md`).
- Every provider step needs one of:
  - a declared Screenshot,
  - a placeholder comment on its own line —
    `<!-- screenshot: what the image could show -->` — the drafting
    default; carry the Dossier's screenshot note through, or
  - an exception comment on its own line —
    `<!-- screenshot-exception: reason -->` — only when the Dossier
    records one. Like the placeholder, it must not render for readers.
- The only supported template key is `{{ gram.oauth.callback_url }}`.
  When the provider asks for a redirect / callback URI during Provider
  setup, paste that key directly into the field (as in the Compute
  Engine guide). Do not send the reader into the Speakeasy AI Control
  Plane mid–Provider-setup only to copy **Redirect URI** from the
  Attach sheet — Speakeasy setup later confirms the sheet matches what
  they registered. Invent a Speakeasy-first copy step only when the
  Dossier records that public docs require a live value the template
  cannot supply.
- Speakeasy setup renders the Dossier's transclusion of
  `docs/speakeasy-setup.md`: the fixed anchors verbatim, both connection
  paths (catalog and remote URL), the guide's actual credential fields
  named and cross-linked to the Provider setup steps that produced them,
  and the closing provider-docs pointer as the guide's final line.
  Metadata fields can reference any anchor as `setup.md#anchor-id`.

## Rendering for the persona

The persona file defines who is reading, what they already know, the voice
rules, and the formatting preferences. Apply all of it:

- Prerequisites name the account type, plan tier, and permissions needed,
  and say where to sign in. Do not write that no prior experience is
  assumed — meeting that bar is the guide's job, not a claim it makes.
- Gloss a term only where the persona's voice rules call for one, using
  only facts the Dossier records; everywhere else the verbatim console
  label, unexplained, is the correct rendering. Never justify a required
  flow by naming what the provider lacks (no "X is not supported, so…") —
  the absence of an alternative is not a fact the reader acts on.
- Carry the Dossier's recovery notes into the steps they protect, placed
  where the persona file says warnings go.
- Before reporting, re-read the guide as the persona, cold: any step they
  could not follow blind is either missing Dossier facts (open question)
  or missing rendering (fix it now). Then cut: drop anything the reader
  does not need to finish setup — duplicated facts, process the guide
  does not own, statements they cannot act on (render a documentation
  gap as a hedged instruction with a recovery path, not as narration
  about the docs) — before the reviewers see it.

## Report

Status `ok` when `setup.md` is complete and every fact traces to the
Dossier; status `blocked` only when Dossier gaps make the guide
unwritable. List open questions either way — but only gaps the Dossier
does not already record. Rendering around a Dossier-listed open question
is expected work, not a new question; restating it doubles the human's
checklist. If rendering changed the picture (a workaround you chose, a
fallback the reader needs verified), put that in `notes`, not in a
duplicate question.
