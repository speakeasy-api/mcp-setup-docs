# 2026-07-22 — box: drop the "no prior experience" note; be terser, gloss less

Human feedback from Walker after reviewing the corrected box draft
(2026-07-22T20:55:13Z run; transcribed from the session by the assistant —
amend freely).

## What the human said

1. The guide says "no prior experience … is assumed"
   (setup.md Prerequisites: "no prior experience with the console's
   Integrations area, or with anything labeled OAuth, is assumed") — omit
   that note.
2. Aim to be terse. We don't expect readers to know what much of this is,
   but we don't have to explain every little thing — e.g. no need to explain
   that Box's "Integration Credentials" term maps to client credentials.
   "We don't have to explain, we just need folks to be able to do the work."

## Concrete instances in the draft

The glossing pattern is pervasive in setup.md — examples:

- "MCP tools (the individual operations the server offers, such as
  searching files or asking Box AI questions)"
- "the Doc Gen scope (a scope defines the maximum set of actions the
  connection can perform — you review scopes in …)"
- "a Redirect URI is the callback …"
- "the **Client ID** (a public identifier for this integration — …)"
- "the **Client Secret** (the connection's password — …)"

## What it implicates

- `docs/personas/it-admin.md` — the define-at-first-use rule (and whatever
  produces the "no prior experience" framing) is generating explanation the
  human doesn't want. The persona's bar should shift from *reader
  understands each term* to *reader can perform each step*: exact UI labels,
  exact values, exact clicks — a term can appear as a verbatim console label
  without a conceptual gloss.
- Editorial (voice) review — both box runs produced nits demanding *more*
  glossing, the opposite of this correction: r1 asked to gloss "Integration
  Credentials" at first mention and explain "OAuth"; the redraft's nits
  asked to gloss **Client ID**/**Client Secret** at first use. Under current
  doctrine the reviewers are correctly enforcing a rule the human has now
  overridden — the rule itself is the target, not reviewer behavior.
- Writer — shorter guides: cut appositive definitions unless the reader must
  choose or type something where misunderstanding blocks the work (e.g.
  scope-to-tool-area mapping can stay; "what a Redirect URI is" can go).

## Action taken

The flagged "no prior experience …" sentence was removed from
guides/box/setup.md at Walker's direction. No other de-glossing was applied —
the terseness principle is doctrine-level and flows through `/tune-pipeline`.
