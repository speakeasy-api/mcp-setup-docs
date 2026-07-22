---
name: draft-guide
description: Draft one or more persona-voiced MCP server Setup Guides via the multi-agent pipeline (Technical Research → Writer → Fidelity + Editorial review → revision rounds). Use when asked to draft, create, or re-draft a Guide for an MCP server.
---

# /draft-guide

Drives `scripts/draft-guide-workflow.js` — the pipeline that researches an
MCP Server, drafts `guides/<slug>/` (Research Dossier, Metadata, Setup
Guide), and reviews it to convergence. Roles and rules live in
`docs/agents/`; personas in `docs/personas/`.

## Input

`$ARGUMENTS` is free text naming one or more providers (e.g. `box`,
`"Google BigQuery"`), optionally a persona (`--persona <id>` or prose like
"for the it-admin persona"), and any extra context to hand the agents
(candidate docs URLs, plan constraints, scope notes).

## Steps

1. **Resolve the repo root**: the project root containing `guides/` and
   `docs/agents/`. All paths passed to the workflow must be absolute.
2. **Resolve the persona**: list `docs/personas/*.md`. Default to
   `it-admin` when none was named. If a named persona has no file, show
   the available ids and ask the user — do not guess or invent one.
3. **Resolve each provider to a slug** (kebab-case, `^[a-z0-9]+(-[a-z0-9]+)*$`).
   If `guides/<slug>/` already exists with content, ask the user before
   proceeding — a run overwrites `research.md`, `meta.yaml`, and
   `setup.md` for that slug.
4. **Timestamp**: run `date -u +%Y-%m-%dT%H:%M:%SZ` (workflow scripts
   cannot read the clock; this becomes provenance `observed_at`).
5. **Launch** the Workflow tool with:

   ```json
   {
     "scriptPath": "<repoRoot>/scripts/draft-guide-workflow.js",
     "args": {
       "guides": [{ "slug": "...", "provider": "...", "notes": "..." }],
       "persona": "<persona id>",
       "timestamp": "<step-4 timestamp>",
       "repoRoot": "<absolute repo root>"
     }
   }
   ```

   `notes` carries any per-provider context from the user's request.
   Optional `maxRounds` (default 3) caps review/revise rounds. The
   workflow runs in the background; tell the user it is running and that
   `/workflows` shows live progress. Do not poll.
6. **Report** when the completion notification arrives, per slug by
   `status`:
   - `converged` — done in `rounds` round(s); mechanical nits were
     applied by the in-loop polish pass, so `nits` holds only its
     skipped/disputed leftovers (and any fidelity re-check notes) — list
     those and `open_questions` as the human-review checklist.
   - `unconverged` — relay every `unresolved` blocker verbatim (dimension,
     where, problem, suggestion); these are the human's decisions now.
   - `blocked` / `failed` — say which phase and why (`notes`); the guide
     directory may be partial.

   Point at the produced files, and remind the user that screenshots are a
   later enrichment pass and that nothing was committed (drafts are left
   in the working tree for human review — never commit or push from this
   skill).
7. **Write the Run Record**: for each slug in the workflow's return value,
   write `retro/runs/<timestamp>-<slug>.json` (the step-4 timestamp) with
   the slug, provider, persona, timestamp, and that slug's full result —
   `status`, `rounds`, `history`, `nits`, `unresolved`, `open_questions`
   (format in `retro/README.md`). This is capture only — never edit role
   docs, personas, or the workflow in response to a run; improvement flows
   through `/tune-pipeline`. Close by inviting the user to drop
   post-review corrections in `retro/notes/` — that human signal is what
   `/tune-pipeline` weighs highest.

## Hard rules

- Never run the pipeline for a slug outside `guides/`.
- Never commit, push, or delete guide directories.
- Never modify doctrine (`docs/agents/`, `docs/personas/`, `.claude/`)
  from this skill — not even to "fix" a prompt a run stumbled on. Record
  the stumble; `/tune-pipeline` proposes, the human decides
  (constitution I7/I8).
- If the user asks for a persona that does not exist yet, offer to draft a
  persona file in `docs/personas/` first (mirror `it-admin.md`'s
  structure), get their sign-off on it, then run the pipeline.
