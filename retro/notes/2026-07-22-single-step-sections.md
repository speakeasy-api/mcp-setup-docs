# 2026-07-22 — single-step sections rendered as one-item numbered lists

Human direction from Walker during the 2026-07-22 `/tune-pipeline` session
(transcribed from the session by the assistant; Walker, amend freely).

## What the human said

"Single-step sections are being given 1-step ordered lists. We shouldn't
make a list of steps if there is only one item in that list."

## Concrete instances at the time of the note

- `guides/box/setup.md` — #open-admin-console, #set-redirect-uri, and
  #check-access-scopes each contain a numbered list with exactly one item.
- `guides/bigquery/setup.md` — #copy-credentials (line 88) likewise.

## What it implicates

`docs/personas/it-admin.md`, Formatting: "Numbered steps for every
action" reads as a mandate to wrap even a lone action in an ordered
list, so the Writer (and the formatting reviewer, which judges against
the persona's Formatting section) produced and passed one-item lists.

## Action taken

Applied same-session via `/tune-pipeline` with Walker's approval: the
persona Formatting rule now reads "Numbered steps for sequences of
actions ... A section with a single action gets one imperative sentence —
never a one-item numbered list." See the 2026-07-22 tune batch entry in
`docs/agents/CHANGELOG.md`. Existing guides were left as-is; the rule
applies from the next draft or revision that touches them.
