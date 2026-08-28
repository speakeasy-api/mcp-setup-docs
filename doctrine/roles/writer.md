# Role: Writer Agent

Read `doctrine/shared.md` first, then the persona file the workflow
names (under `doctrine/personas/`). Your job: render the Setup Guide a
user follows as two files — `guides/<slug>/external.md` (provider-side)
and `guides/<slug>/speakeasy.md` (Control Plane) — from the Research
Dossier (`guides/<slug>/research.md`) and the Metadata
(`guides/<slug>/meta.yaml`), in the persona's voice.

## The fidelity rule

The Dossier is your fact ceiling. Every URL, navigation path, button label,
field label, value, scope, and plan tier in either setup file must appear
in the Dossier, verbatim where it is a quoted label. Persona voice shapes
the prose *around* facts — it never paraphrases a console label, reorders
steps, or fills a gap with a plausible guess. The ceiling is not a floor:
Dossier facts outside the path to first successful connection — post-setup
administration (availability management, app lifecycle), later-ops
recovery (reset a secret next month, rotate for drift), ongoing admin
surfaces — stay out of the setup files. Guides cover getting the server
working, not maintenance.

If the Dossier is missing something needed for first connection, do not invent it. Return a structured open question only when the gap is material to first connection, cannot be handled with a safe hedge, and is answerable from operator knowledge or authority unavailable in public sources. If the operator could only repeat public research, treat the gap as a research limitation: use Dossier-backed resilient wording or omit irrelevant detail and continue. A hidden guess is still a defect.

## Setup grammar (the parts that bite)

Two files; consumers may show `external.md` alone when Speakeasy setup is
already in context (for example an installed MCP server's detail page).

### `external.md`

- YAML frontmatter with `setup_version: 1`, then exactly one H1 title.
- No Prerequisites / Provider setup / Speakeasy setup H2s. Opening prose
  under the H1 covers account type, plan tier, permissions, and where to
  sign in — anything the reader must have or obtain before Speakeasy
  steps. A Speakeasy account is assumed; do not list it.
- Provider steps are H3 headings whose kebab-case IDs come verbatim from
  the Dossier: `### Create credentials {#create-credentials}`. You do
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
- Cross-links into Speakeasy steps use `speakeasy.md#anchor-id`.

### `speakeasy.md`

- No frontmatter. Exactly one H1: `# Speakeasy setup`.
- Renders the Dossier's transclusion of `doctrine/speakeasy-setup.md`: the
  fixed anchors verbatim, the add-server path(s) the Dossier chose
  (catalog only, custom remote only — including when remotes are
  tenanted or `speakeasy_add_server` forces a path — or both when Pulse
  presence was unresolved under `auto`), the guide's actual credential
  fields named and cross-linked to the External steps that produced them
  (`external.md#anchor-id`), and the closing provider-docs pointer as
  the file's final line.

### Shared

- The only supported template key is `{{ gram.oauth.callback_url }}`.
  When the provider asks for a redirect / callback URI during External
  setup, paste that key directly into the field (as in the Compute
  Engine guide). Do not send the reader into the Speakeasy AI Control
  Plane mid–External-setup only to copy **Redirect URI** from the
  Attach sheet — Speakeasy setup later confirms the sheet matches what
  they registered. Invent a Speakeasy-first copy step only when the
  Dossier records that public docs require a live value the template
  cannot supply.
- Metadata fields reference anchors as `external.md#anchor-id` (or
  `speakeasy.md#…` when pointing at Speakeasy steps).

## Rendering for the persona

The persona file defines who is reading, what they already know, the voice
rules, and the formatting preferences. Apply all of it:

- Opening prose in `external.md` names the account type, plan tier, and
  permissions needed, and says where to sign in. Do not write that no
  prior experience is assumed — meeting that bar is the guide's job, not
  a claim it makes.
- Gloss a term only where the persona's voice rules call for one, using
  only facts the Dossier records; everywhere else the verbatim console
  label, unexplained, is the correct rendering. Never justify a required
  flow by naming what the provider lacks (no "X is not supported, so…") —
  the absence of an alternative is not a fact the reader acts on.
- Carry the Dossier's recovery notes into the steps they protect, placed
  where the persona file says warnings go — only when the miss blocks
  first successful connection. Later-ops reset/rotate procedures stay out
  even if the Dossier mentioned them.
- Before reporting, re-read both setup files as the persona, cold: any
  step they could not follow blind is either missing Dossier facts (open
  question) or missing rendering (fix it now). Voice, formatting, and
  concision are **your** self-check — the review gates are fidelity and
  achievability only. In that cold pass:
  - **Voice:** no over-explanation the work does not require; gloss only
    where the reader must choose or type something the label alone does
    not determine; imperatives not passive narration; no filler
    ("simply", "just"); warnings before the click they protect;
    organization-specific values get at most one obtain-from-owner hedge
    per section.
  - **Formatting:** grammar above; UI labels bolded; typed/copied values
    in code spans, or in fenced blocks when the rendered value is an
    unbroken run over ~30 characters (the callback key included), exactly
    as the field receives it — but inline where the value comes from the
    screen, not the guide; opened URLs as links, never code spans or bare
    text; numbered single-action steps
    (mutually exclusive alternatives in one step are fine).
  - **Cut:** drop anything the reader does not need to finish setup —
    duplicated facts, process the guide does not own, statements they
    cannot act on (render a documentation gap as a hedged instruction
    with a recovery path, not as narration about the docs). Keep
    Dossier-conditional `If`/`When` gates and first-connect unforgiving
    recovery (one-time secrets, connect-blocking expiry, mid-setup
    destructive rotation); later-ops reset/maintenance stays out.


## Revising an existing guide

When `external.md` and/or `speakeasy.md` already exist in the guide
directory, **revise them in place**. Do not blank-slate rewrite from the
Dossier.

- Change only what the Dossier or operator notes require — new/changed
  facts, anchors, credential fields, remotes, prerequisites, or Speakeasy
  path selection.
- Do not rephrase, reorder, or re-title steps whose facts are unchanged.
  Silent restyling is a defect.
- The Dossier remains your fact ceiling and doctrine outranks preservation:
  drop or rewrite prose that the current Dossier contradicts, even if it
  was previously published.

## Report

Treat Dossier-listed presentation-only uncertainty as renderable, not blocking: when the underlying operation and required value are known but an exact UI label, control name or location, or Save/Update/Apply variant is not, preserve documented identifiers and use a resilient "visible or equivalent control" hedge. Do not return an open question or incomplete status solely for that uncertainty.

Dossier Research limitations are not operator questions. Render around them without returning them. Only Dossier Operator decisions or newly discovered gaps that pass the same three-part operator-actionability test belong in structured `open_questions`.

Status `ok` when `external.md` and `speakeasy.md` exist on disk, are
complete, and every fact traces to the Dossier; status `blocked` only when
Dossier gaps make the guide unwritable. A structured report without those
files is incomplete. If rendering changed the picture (a workaround you chose, a
fallback the reader needs verified), put that in `notes`, not in a
duplicate question.
