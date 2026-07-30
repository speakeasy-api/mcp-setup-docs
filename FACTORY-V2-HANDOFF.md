# Handoff prompt — implement Factory v2 (pi + OpenRouter)

> Paste everything below the line into a fresh session started in the
> `sandcastle-factory` worktree.

---

## Your task

Replace the `@cursor/sdk` agent runtime in `pipeline/` with a direct `spawn` of
the `pi` coding CLI driven by OpenRouter. **The goal is removing the
`CURSOR_API_KEY` dependency.** Everything else is secondary and must not be
allowed onto the critical path.

## Read these first, in this order

1. `FACTORY-V2.md` — the design. Start with its "Start here" and
   "Definition of done" sections, then §6.1 (why direct spawn), §8 (what changes
   in `pipeline/`), §9 (staged plan, especially Stage 5b).
2. `pipeline/src/runtime.ts` — 182 lines, the single file you are replacing. It
   is the only seam; `workflow.ts` and everything else call `rt.agent(...)` and
   do not care what is behind it.
3. `factory-v2-evidence/probe-pi.md` — exact CLI flags, stream shape, and
   failure modes, all verified live.

`factory-v2-evidence/` holds nine reports from the research phase. Consult them
before re-deriving anything.

## Already settled — do not re-litigate without reading the evidence

| Question | Answer | Where |
| --- | --- | --- |
| Can `@cursor/sdk` take an OpenRouter key? | No. One credential env var, no public `baseUrl` | `FACTORY-V2.md` §0 |
| Use Matt Pocock's Sandcastle as the harness? | No — it blocks `--tools` and strips `--no-session` | `probe-sandcastle.md`, §6.1 |
| Use `@openrouter/agent`? | No — ships zero filesystem tools; it is an LLM loop, not a coding agent | `probe-orsdk.md` |
| Does pi + OpenRouter actually work? | Yes, verified: auth, file writes, structured output, resume | `probe-pi.md` |

## The three bugs most likely to bite you

From the probes — build tests for these before you trust anything:

1. **pi exits 0 on API errors.** An invalid model or a 400 yields exit code 0
   with the error only as `stopReason: "error"` / `errorMessage` *inside* the
   JSON stream. Naive exit-code checking reports a guide that never generated as
   a guide that generated empty. This is the highest-severity failure mode.
2. **Auth failures take a different path** — exit 1, one `session` line on
   stdout, a raw Node stack trace on stderr. You need both paths.
3. **Never parse by stream position.** On pi 0.57.1 the last line is `agent_end`;
   on 0.83.0 it is a contentless `agent_settled`. Key off `type === "agent_end"`.

## Hard constraints

- **Never commit or push during an agent run** (constitution I7). Agents write
  only inside `guides/<slug>/`. With no container, the `git status --porcelain`
  tripwire is doing all of this work — build it, do not defer it.
- **Build an explicit env for the subprocess.** Do not pass `process.env`
  through. `PULSE_REGISTRY_KEY`, `PULSE_REGISTRY_TENANT`, `GH_TOKEN`, and
  `AGENT_PAT` must not reach the agent.
- **Never print secret values.** `OPENROUTER_API_KEY` comes from `mise` — it is
  in `mise.local.toml` (gitignored) at the repo root and resolves inside this
  worktree because the worktree is nested under it. If `$OPENROUTER_API_KEY`
  reads empty, the shell snapshot is stale; use `mise exec -- <cmd>`. Confirm
  with `mise exec -- bash -c 'echo ${#OPENROUTER_API_KEY}'` — length only.
- **Nothing under `doctrine/` changes** (I8, human-approved only).
- Pin the pi package *and* version. The global `pi` is
  `@mariozechner/pi-coding-agent@0.57.1` via mise; the maintained line is
  `@earendil-works/pi-coding-agent@0.83.0`. Both can sit on `PATH` at once.
- The OpenRouter key in use is a **dev** key with a $1000/month cap. Do not put
  it in GitHub secrets — mint a separate, tightly-capped key at cutover.

## Definition of done

`FACTORY-V2.md` → "Definition of done", 20 checks. Do not report success on the
mechanical ones alone: check 15 requires a human to actually read a regenerated
guide, because checks 5–14 are all structural.

The regression baseline is already in git — no new baseline run is needed. Seven
guides are pure `guide-factory[bot]` output, never hand-edited. See Stage 5b.

---

## Managing your own context

**Keep total context under ~175k.** Past that, quality degrades and you start
re-deriving things you already established. The work below is bigger than one
context window, so plan for that from the start rather than discovering it late.

**Delegate anything that means reading a lot to produce a little.** Auditing a
subsystem, mapping call sites, verifying a library's behaviour, checking a
version's flags — all of that burns context to yield a paragraph. Hand it to a
subagent and keep the paragraph.

Do the work inline when it is a targeted edit you already understand.

### Spinning up workers with herdr

Verify you are inside herdr first; if this fails, stop and say so rather than
touching the user's terminal:

```bash
test "${HERDR_ENV:-}" = 1
```

Then create a sibling pane and start a named agent in it:

```bash
# Split a sibling pane, preserving cwd, without stealing focus
herdr pane split --current --direction right --cwd "$PWD" --no-focus
# -> read .result.pane.pane_id from the JSON

herdr agent start adapter-tests --kind claude --pane <pane_id>
herdr agent prompt adapter-tests "$(cat /path/to/brief.md)"
```

Use descriptive role names (`adapter-tests`, `stream-parser`) — never "agent A/B/C".

**Three gotchas that will cost you time:**

1. **The prompt often pastes without submitting.** The pane shows
   `[Pasted text #1]` and the agent sits idle. Fix:
   `herdr agent send-keys <name> enter`. Check with
   `herdr agent read <name> --source detection --lines 25`.
2. **Long output is unreadable from the pane.** Agents run on the terminal's
   alternate screen, so rows that scroll off never enter scrollback and
   `--lines 1500` will not recover them. Always ask workers to **write a
   Markdown report to a file and reply with only that path**, then read the file.
3. **Workers block on permission prompts.** Either accept that you will approve
   them by hand, or run a small approver loop that polls
   `herdr agent get <name>` for `blocked`, reads the pane, and sends `1` (or `2`
   for "don't ask again"). If you write one, make its deny-list match what
   actually breaches the constraints — `git commit|push|add|checkout`,
   `npm i -g`, `rm -rf /`, writes under `pipeline/`|`doctrine/`|`.github/` — and
   **filter read-only lines out first**, or a worker grepping *for* the string
   "git commit" will stall the whole run. Blanket-denying writes deadlocks
   workers whose job is to write code.

Close panes when their work is done: `herdr pane close <pane_id>`. Do not close
panes you did not create.

### What to delegate here

Good candidates, each self-contained enough for a fresh worker:

- Map every call site of `rt.agent` in `workflow.ts` (1735 lines) and report the
  exact shape each phase needs back.
- Determine whether pi exposes an OpenRouter response-format passthrough. If it
  does, `extractJson` plus the `withSchemaHint`/`SCHEMA_HINTS` prose (~165 lines)
  can be deleted — see the note at the end of §0.
- Build the envelope statistics for the 7 reference guides (check 14).
- Audit the lock-digest change in Stage 5 against `lock.test.ts`.

Keep the adapter itself inline. It is ~150 lines, it is the heart of the change,
and it is where your own judgement is worth the most.

---

## Repo state you are inheriting

- Branch `worktree-sandcastle-factory`. `FACTORY-V2.md`,
  `FACTORY-V2-HANDOFF.md`, and `factory-v2-evidence/` may be uncommitted —
  check `git status` first and commit them before starting work if so.
- `pipeline/node_modules` is installed (24 packages).
- `.tmp-probe-pi/`, `.tmp-probe-sandcastle/`, `.tmp-probe-orsdk/` hold ~230MB of
  probe artifacts. Gitignored. Safe to delete — the findings are all in
  `factory-v2-evidence/`.
- Verified green on 2026-07-30: 18/18 guides lint clean, 34/34 unit tests pass.
  Any failure is a regression you introduced, not pre-existing debt.
