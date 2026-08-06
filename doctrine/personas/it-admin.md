---
persona_version: 1
id: it-admin
name: Semi-technical IT administrator
---

# Semi-technical IT administrator

The reader a Setup Guide is voiced for. The Writer renders `external.md`
and `speakeasy.md` for this person (voice, formatting, and concision are
the Writer's self-check); Fidelity and Achievability reviewers gate the
draft against this file. If a rule here conflicts with a fact in the
Research Dossier, the fact wins — voice shapes the prose around facts,
never the facts.

## Who they are

An IT administrator working a ticket: "connect <provider> to the Speakeasy
AI Control Plane." They administer SaaS accounts day to day — resetting
passwords, assigning licenses, managing groups — and they hold (or can
borrow) admin credentials for the provider. They have very likely never
opened this provider's developer console, admin API settings, or anything
labeled "OAuth". They are careful, literal, and busy: they will follow
exact instructions well and improvise badly.

## What they know

- Browsers, tabs, copy/paste, and a password manager.
- What an admin account is and why they have one.
- How to file a ticket when they hit a wall.

## What they do not know

- OAuth vocabulary: client ID, client secret, redirect URI, scope, consent
  screen. Don't assume it — and don't teach it. They need the values in
  the right fields, not the concepts.
- Developer consoles, API enablement, service accounts, or app registration
  flows — assume zero prior visits.
- JSON, YAML, CLIs, or anything that is not a browser.

## Voice

- Second person, imperative, present tense: "Select **Integrations**."
- One action per numbered step. A step that says "and" twice is two steps.
- Terse beats taught. A console term appears as its verbatim bolded
  label, unexplained. Gloss only where misunderstanding would block the
  work — the reader must pick or type something the label alone doesn't
  determine (e.g. matching scopes to the tool areas users need). For
  organization-specific values (emails, logos, policy URLs,
  justifications), one "obtain from the application or cloud security
  owner" hedge per section is enough; do not gloss every adjacent field
  the same way.
- Say where the reader will end up before saying why: "This opens the
  **Additional Configuration** panel, where the credentials live."
- Never "simply", "just", "obviously", or "as you know".
- Warn *before* one-way doors: one-time secret displays, destructive token
  rotation, anything unrecoverable — the warning comes in the step above
  the click, not after it.

## Formatting

- Numbered steps for sequences of actions; prose only between step
  groups. A section with a single action gets one imperative sentence —
  never a one-item numbered list.
- Exact UI labels in **bold**, verbatim from the console.
- Values the reader types or copies in `code spans`. A span holding an
  unbroken run of more than ~30 characters — a URL, a scope, an endpoint —
  wraps mid-token in a narrow panel and stops being copyable: put that
  value in a fenced code block under its step, exactly as the field
  receives it. Never split a copied value across lines; never comma-join
  several values inside one span. Where the reader enters values one at a
  time, each gets its own line in one block. Values that contain spaces
  wrap cleanly and stay inline. Measure the value the reader sees, not the
  source text: `{{ gram.oauth.callback_url }}` is short and spaced, but it
  renders as an unbroken callback URL, so a step that has the reader enter
  it uses a block.
- The ceiling applies where the reader takes the value **from the guide**.
  Where the value comes from the screen or the clipboard and the guide only
  names it — "Confirm that **Redirect URI** matches …" — it stays inline.
- A URL the reader opens is a link, never a code span and never bare
  text. In a step, the link text is the URL without `https://`; in the
  closing pointer, it names the document.

## Achievability bar

The reader can finish with only this guide, their credentials, and a
browser — no searching, no guessing, no prior console experience. Every
screen transition is named. Every field they must fill has its exact label
and its value's origin. Everywhere the console is unforgiving (secrets
shown once, publish states that expire), the guide says what to do if they
missed it.
