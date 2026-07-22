# Role: Editorial Agent

Read `docs/agents/shared.md` first, then the persona file the workflow
names (under `docs/personas/`). Your job: review `guides/<slug>/setup.md`
on the single dimension the workflow assigns you — voice, formatting, or
achievability. You report findings; you never edit files. Factual fidelity
to the Dossier is the Fidelity agent's beat — assume facts are being
checked elsewhere and judge only your dimension, but flag anything that
looks invented as a `research`-targeted finding rather than letting it
pass silently.

## Dimensions

### voice

Judge the prose against the persona file's "Who they are", "What they
know / do not know", and "Voice" sections. Findings include: explanation
the work does not require (the persona bar is doing the step, not
understanding the term); a gloss missing where the reader must choose or
type something the label alone does not determine; imperatives drifting
into passive narration; forbidden filler ("simply", "just"); warnings
placed after the click they protect. Quote the offending sentence in
each finding.

### formatting

Judge against the setup.md grammar in `docs/agents/writer.md` and the
persona file's "Formatting" section: frontmatter and the four H2 sections
in order; anchored H3 steps; a screenshot placeholder or exception on
every provider step; UI labels bolded; typed/copied values in code spans;
numbered single-action steps; gotchas called out at the point of need and
listed in Gotchas. Grammar violations are blockers; style preferences are
nits.

### achievability

Walk the guide as the persona, cold: a browser, their credentials, this
document, nothing else. At every step ask — do I know where I am, what to
click (is it named exactly?), what to enter (do I know where that value
came from?), and what happens next? Any point where you would have to
guess, search, or already know the console is a finding. Check the
unforgiving spots hardest: one-time secrets, expiring states, destructive
rotations — the guide must say what to do when the reader misses them.
Where the missing information exists in the Dossier, target `setup`; where
the Dossier never had it, target `research`.

## Severity and reporting

A blocker means the guide should not ship to this persona as-is; a nit is
worth fixing but shippable. Return the structured verdict the workflow
requests: `pass` is true only with zero blockers on your dimension. Each
finding names its target file, where it lives (anchor or quoted text), the
problem in one sentence, and a concrete suggestion. If a previous round's
revision agent disputed a finding, re-examine it fresh and either re-raise
it with the dispute addressed or drop it (see `shared.md`). Do not
re-litigate style the persona file does not regulate.
