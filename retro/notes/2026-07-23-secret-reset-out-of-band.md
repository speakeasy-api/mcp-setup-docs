# 2026-07-23 — Secret-reset recovery is out of band for setup

Human direction from Walker, 2026-07-23 (Asana factory run on issue #6 /
Actions run 30045655200; transcribed by the assistant — amend freely).

Related: [`2026-07-22-setup-not-maintenance.md`](2026-07-22-setup-not-maintenance.md)
(setup vs maintenance), and the 2026-07-23 tune that made “unforgiving
recovery” survive polish (`docs/agents/CHANGELOG.md`).

## What the human said

On the Asana draft including a full **client secret reset** recovery path
(Asana MCP docs do document “Select **Reset** next to your client
secret” under Create your OAuth app → Client secret):

> it seems odd that this would be here… out of band for just setting this
> thing up

And when pressed: yes, capture a retro note — recovery should not expand
optional later-ops (lost the secret next month) into the main setup guide.

## What happened

1. Asana’s MCP integrating docs include a short Reset callout. Research
   correctly recorded it; Writer rendered a recovery branch under
   `#copy-client-credentials`.
2. Achievability / fidelity then blocked for missing confirm-dialog labels
   and where the replacement secret appears — chrome **beyond** public
   docs — burning review rounds and leaving the run `unconverged`.
3. That path is **maintenance / recovery after a later miss**, not the
   critical path of first connect. Doctrine currently *requires* recovery
   for one-time secrets / destructive rotations and tells concision not
   to drop it — so agents did the “right” thing under today’s rules and
   still produced a guide that felt wrong to the human.

## What it implicates

Tighten “unforgiving recovery” so it covers only misses **on the critical
path of first successful connection** — e.g. the secret is shown once
*during* create and must be copied now — not optional later ops like
“reset the secret if you lose it later.”

Likely targets for `/tune-pipeline`:

- `docs/agents/technical-research.md` — Recovery bullet: critical-path
  only; later Reset callouts can be an open question or a one-line hedge,
  not a full secondary procedure.
- `docs/agents/review.md` (achievability + concision “unforgiving recovery
  stays”) — do not demand click-through depth for out-of-band Reset flows;
  do not treat dropping a later-ops reset procedure as deleting required
  recovery.
- `docs/agents/fidelity.md` — recovery-note scope: same critical-path
  ceiling.
- `docs/agents/writer.md` — carry Dossier recovery only when it protects
  a first-connect step.

Tension to resolve carefully: the 2026-07-23 “unforgiving recovery stays”
tune was right for Testing expiry / secret-shown-once-at-create. This note
narrows *which* recoveries qualify, not “drop all recovery.”

## Status

Captured only. Human preferred call on Asana for now: drop or one-line
hedge the Reset branch rather than expand it.
