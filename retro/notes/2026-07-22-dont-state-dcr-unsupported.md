# 2026-07-22 — Don't state that a provider lacks Dynamic Client Registration

Human direction from Walker, 2026-07-22 (reviewing the box re-draft;
transcribed by the assistant — amend freely).

## What the human said

On the setup intro sentence "Box does not support Dynamic Client
Registration, meaning clients cannot register themselves, so this manual
flow is required": "the presence of oauth setup stuff in this guide is
evidence enough that DCR isn't supported. We shouldn't mention that it's not
supported at all — the guide already remedies that by having the oauth 2.0
setup."

## What it implicates

The manual OAuth credential flow's existence is self-evidence that DCR
isn't available; stating the non-support (a) teaches a concept the it-admin
persona doesn't need and (b) states a negative the reader takes no action
on. The Writer should not surface DCR non-support in prose, and the
Dossier's `#no-dynamic-client-registration` gotcha should be reconsidered —
a "gotcha" that only explains why the required flow is required isn't
actionable.

General principle: don't explain the absence of an alternative the reader
was never going to take. Implicates `docs/agents/writer.md` and the
gotcha-selection guidance in `docs/agents/technical-research.md`.

## Status

Captured only.
