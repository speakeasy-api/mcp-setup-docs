# 2026-07-22 — screenshot exceptions rendered visibly to readers

Human observation from Walker while reviewing the corrected box draft
(2026-07-22T20:55:13Z run; transcribed from the session by the assistant —
amend freely).

## What the human noticed

setup.md contained blockquotes like "> Screenshot exception: a standard
button click with no unique state…" and Walker asked what they were for and
whether they should be there. The two screenshot markers had asymmetric
rendering: the placeholder (`<!-- screenshot: ... -->`) is an HTML comment
and invisible in rendered Markdown, but the exception
(`> Screenshot exception: reason`) was a blockquote — so internal
capture-pass bookkeeping rendered visibly in the reader-facing guide.

## Decision and status

Walker decided exceptions should be comments too. **Already applied** as a
direct human edit per constitution I8 — see the 2026-07-22 "screenshot
exceptions become comments" entry in `docs/agents/CHANGELOG.md`
(`docs/agents/writer.md`, `docs/agents/drafting.md`, plus conversion of the
five existing instances in the box, hubspot, and bigquery guides). Do not
re-propose this change; this note exists as the durable evidence behind
that changelog entry.

## Generalizable signal for /tune-pipeline

The defect class is broader than the one rule: author-facing pipeline
metadata leaking into reader-facing rendering. Worth a one-time audit of
the setup.md grammar for any other construct that addresses the pipeline
(capture pass, reviewers) rather than the reader, and a doctrine principle
if any turn up — anything meant for the pipeline must not render.
