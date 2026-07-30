# Probe: can `pi` + OpenRouter replace the `@cursor/sdk` agent runtime?

Date: 2026-07-30
Probe dir: `/home/walker/github.com/speakeasy-api/mcp-setup-docs/.claude/worktrees/sandcastle-factory/.tmp-probe-pi/`
Model used for all live calls: `openrouter/openai/gpt-oss-20b` ($0.03/M in, $0.13/M out)

**Bottom line: pi works for this. All five functional questions are YES.** The Sandcastle argv form
runs unmodified on both 0.57.1 and 0.83.0, OpenRouter auth is a plain env var, and pi writes files
non-interactively with no permission flag required.

---

## Q1. What is the globally installed `pi`? — **`@mariozechner/pi-coding-agent` 0.57.1, via mise**

```
$ which pi
/home/walker/.local/share/mise/installs/npm-mariozechner-pi-coding-agent/0.57.1/bin/pi

$ pi --version
0.57.1

$ readlink -f "$(which pi)"
/home/walker/.local/share/mise/installs/npm-mariozechner-pi-coding-agent/0.57.1/bin/pi
```

Package identity confirmed from the launcher's own `NODE_PATH`/exec line:

```
$ cat /home/walker/.local/share/mise/installs/npm-mariozechner-pi-coding-agent/0.57.1/bin/pi
...
exec node "$basedir/../5/.pnpm/@mariozechner+pi-coding-agent@0.57.1_ws@8.19.0_zod@4.3.6/node_modules/@mariozechner/pi-coding-agent/dist/cli.js" "$@"
```

- **npm package:** `@mariozechner/pi-coding-agent` (the *old* scope — not `@earendil-works`)
- **Version:** 0.57.1
- **Installed where:** mise npm backend, tool name `npm:@mariozechner/pi-coding-agent`, at
  `/home/walker/.local/share/mise/installs/npm-mariozechner-pi-coding-agent/0.57.1/`. It is a
  pnpm-style store, not a flat `node_modules`. It is *not* a system `npm i -g` install.

Note: the package has since been renamed to `@earendil-works/pi-coding-agent` (see Q6). The
`@mariozechner` scope appears to stop at the 0.5x line.

---

## Q2. Does the argv form Sandcastle emits work? — **YES, all three flags exist on 0.57.1**

Sandcastle emits `pi -p --mode json --model <model>` with the prompt on stdin. Relevant excerpt of
`pi --help` on 0.57.1, verbatim:

```
Options:
  --provider <name>              Provider name (default: google)
  --model <pattern>              Model pattern or ID (supports "provider/id" and optional ":<thinking>")
  --api-key <key>                API key (defaults to env vars)
  --system-prompt <text>         System prompt (default: coding assistant prompt)
  --append-system-prompt <text>  Append text or file contents to the system prompt
  --mode <mode>                  Output mode: text (default), json, or rpc
  --print, -p                    Non-interactive mode: process prompt and exit
  --continue, -c                 Continue previous session
  --resume, -r                   Select a session to resume
  --session <path>               Use specific session file
  --session-dir <dir>            Directory for session storage and lookup
  --no-session                   Don't save session (ephemeral)
  --no-tools                     Disable all built-in tools
  --tools <tools>                Comma-separated list of tools to enable (default: read,bash,edit,write)
                                 Available: read, bash, edit, write, grep, find, ls
```

- `-p` — **exists**, as `--print, -p`, "Non-interactive mode: process prompt and exit".
- `--mode json` — **exists**. Valid values are `text` (default), `json`, `rpc`.
- `--model` — **exists**, accepts `provider/id` form.

Piping the prompt on stdin works (all live runs below did exactly that). The default tool set
already includes `write`, which is why Q5 passes without extra flags.

---

## Q3. How does pi authenticate to OpenRouter? — **Plain `OPENROUTER_API_KEY` env var. No config file, no login step.**

`pi --help` lists it explicitly among supported env vars:

```
  OPENROUTER_API_KEY               - OpenRouter API key
```

Proof it is genuinely read from the environment and not from stored credentials — same command with
only that one variable removed:

```
$ echo 'hi' | env -u OPENROUTER_API_KEY pi -p --mode json --model openrouter/openai/gpt-oss-20b
EXIT=1
```

stdout (complete — one line, then nothing):

```json
{"type":"session","version":3,"id":"71a55d3b-...","timestamp":"2026-07-30T20:22:00.268Z","cwd":"/home/.../.tmp-probe-pi"}
```

stderr:

```
Error: No API key found for openrouter.

Use /login or set an API key environment variable. See .../docs/providers.md
    at AgentSession.prompt (.../dist/core/agent-session.js:638:19)
    at async runPrintMode (.../dist/modes/print-mode.js:69:9)
```

`~/.pi/` contains only `agent/` (session storage). No credential file exists, and none was created
by any successful run. A `/login` path exists as an *alternative*, but the env var alone is
sufficient — every successful call in this probe used nothing but `OPENROUTER_API_KEY`.

**Model slug format:** `openrouter/<openrouter-slug>` — i.e. pi's `provider/id` where `id` is
OpenRouter's own two-segment slug. So `openrouter/openai/gpt-oss-20b`, three segments total.
Confirmed against pi's own catalog:

```
$ pi --list-models gpt-oss
provider    model                         context  max-out  thinking  images
openrouter  openai/gpt-oss-120b           131.1K   4.1K     yes       no
openrouter  openai/gpt-oss-20b            131.1K   4.1K     yes       no
openrouter  openai/gpt-oss-20b:free       131.1K   131.1K   yes       no
```

Alternatively `--provider openrouter --model openai/gpt-oss-20b`. pi ships a baked-in OpenRouter
model catalog (hundreds of entries, including `anthropic/*` and `google/*` routed via OpenRouter).

⚠️ One correction to the brief's premise: this shell's `$OPENROUTER_API_KEY` is **not** stale —
`echo ${#OPENROUTER_API_KEY}` printed `73` directly, without `mise exec`. `mise exec --` was still
used for every metered call as instructed, and it works, but the plain env is also populated.

---

## Q4. Does a real call succeed? — **YES**

```
$ echo 'Reply with exactly: PONG' | mise exec -- pi -p --mode json --model openrouter/openai/gpt-oss-20b
EXIT=0
```

stderr was **empty**. stdout is **NDJSON / JSON Lines** — one complete JSON object per line, each
with a `type` discriminator. 108 lines for this trivial prompt.

### Exact stdout shape

Event sequence (counts from the Q5 run, which is representative):

```
session              x1    ← always first line
agent_start          x1
turn_start           x2
message_start        x4
message_update       x89   ← streaming deltas; 82% of all output
message_end          x4
tool_execution_start x1
tool_execution_end   x1
turn_end             x2
agent_end            x1    ← last line on 0.57.1
```

Structural facts an adapter must handle:

1. **`session`** is always line 1: `{type, version, id, timestamp, cwd}` (`version: 3` on both
   0.57.1 and 0.83.0).

2. **`message_update` is enormously redundant.** Each delta carries *both* an
   `assistantMessageEvent.partial` **and** a full `message` object containing the entire cumulative
   content so far. A 4-character reply produced 89 of these. **An adapter should ignore
   `message_update` entirely** and read only terminal events — it is pure streaming noise and it
   dominates the byte count.

3. **The final answer lives in `agent_end`**:
   `agent_end.messages[last].content[]`, filtered to parts where `type === "text"`, joined. The
   `content` array also contains `{type:"thinking", thinking, thinkingSignature}` parts that must be
   filtered out — gpt-oss emits reasoning inline as a content part, not a separate field.

4. **Usage and cost are attached to messages**, at `message.usage`:

```json
{"input":3510,"output":43,"cacheRead":0,"cacheWrite":0,"totalTokens":3553,
 "cost":{"input":0.0001053,"output":0.00000602,"cacheRead":0,"cacheWrite":0,"total":0.00011132}}
```

   `cost.total` is USD, computed by pi. Summing `turn_end.message.usage.cost.total` across turns
   gives whole-run spend. Note a multi-turn run has multiple `turn_end`s — do not read only the last.

5. **Tool calls are clean, discrete events** — the most adapter-friendly part of the format:

```json
{"type":"tool_execution_start","toolCallId":"chatcmpl-tool-e143d245...","toolName":"write",
 "args":{"path":"probe-write.txt","content":"PROBE_OK"}}
{"type":"tool_execution_end","toolCallId":"chatcmpl-tool-e143d245...","toolName":"write",
 "result":{"content":[{"type":"text","text":"Successfully wrote 8 bytes to probe-write.txt"}]},
 "isError":false}
```

6. **Errors do NOT arrive as JSON.** As shown in Q3, a failure emits the `session` line to stdout
   and then a raw Node stack trace to **stderr**, exiting 1. An adapter must check the exit code and
   read stderr; it cannot rely on an error event in the JSON stream.

---

## Q5. Can it write a file? — **YES. It wrote it. No permission flag required.**

Run from `.tmp-probe-pi/q5-057/` (empty dir, `probe-write.txt` removed beforehand):

```
$ echo 'Create a file named probe-write.txt in the current directory containing exactly: PROBE_OK' \
    | mise exec -- pi -p --mode json --model openrouter/openai/gpt-oss-20b
EXIT=0
```

stderr empty. Verification on disk:

```
$ test -f probe-write.txt && echo YES
YES
$ stat -c '%n size=%s bytes' probe-write.txt
probe-write.txt size=8 bytes
$ od -c probe-write.txt
0000000   P   R   O   B   E   _   O   K
0000010
```

**Exactly 8 bytes, `PROBE_OK`, no trailing newline.** Byte-for-byte what was asked.

Which of the four outcomes: **wrote it.** Not refused, did not hang, did not falsely claim success.
The tool-execution events confirm a real `write` call, and the on-disk bytes confirm it landed.

**Permission-bypass flag required: none.** There is no `--yolo` / `--dangerously-skip-permissions` /
`--approve` flag in `pi --help` on either version, and none was needed. `-p` (print mode) executes
tools directly with no approval gate. `write` is in the **default** tool set
(`read,bash,edit,write`). This is the opposite of the Claude Code / Cursor posture — pi in `-p` mode
is unsandboxed and auto-approving by default.

The corresponding tightening lever is `--tools`: `--tools read,grep,find,ls` gives a read-only run.
There is no flag to *loosen* because nothing is locked.

---

## Q6. Does 0.83.0 behave differently? — **PARTIAL — it exists and works identically, with one additive JSON change**

`0.83.0` exists and is the latest published version:

```
$ npm view @earendil-works/pi-coding-agent versions --json
[... "0.82.0", "0.82.1", "0.83.0"]
```

The `@earendil-works` scope starts at **0.74.0** — there is no 0.57.x under this name, so 0.57.1 →
0.83.0 is both a rename and a 26-minor-version jump.

Installed locally, global left untouched:

```
$ npm install @earendil-works/pi-coding-agent@0.83.0 --no-audit --no-fund
added 140 packages in 4s

$ ./node_modules/.bin/pi --version
0.83.0
$ pi --version          # global, unchanged
0.57.1
```

### Q2 re-run against 0.83.0 — **identical**

```
$ ./node_modules/.bin/pi --help | grep -E '^\s+--(print|mode|model|provider|api-key|tools)'
  --provider <name>              Provider name (default: google)
  --model <pattern>              Model pattern or ID (supports "provider/id" and optional ":<thinking>")
  --api-key <key>                API key (defaults to env vars)
  --mode <mode>                  Output mode: text (default), json, or rpc
  --print, -p                    Non-interactive mode: process prompt and exit
  --tools, -t <tools>            Comma-separated allowlist of tool names to enable
```

`-p`, `--mode json`, `--model` all unchanged. Only cosmetic drift: `--tools` gained a `-t` alias and
its help text now says "allowlist".

### Q5 re-run against 0.83.0 — **identical, wrote the file**

```
$ echo 'Create a file named probe-write.txt in the current directory containing exactly: PROBE_OK' \
    | mise exec -- .../node_modules/.bin/pi -p --mode json --model openrouter/openai/gpt-oss-20b
EXIT=0
$ od -c probe-write.txt
0000000   P   R   O   B   E   _   O   K
0000010
```

8 bytes, correct, stderr empty, no permission flag. Same default-allow posture.

### The differences that matter to an adapter

| | 0.57.1 | 0.83.0 |
|---|---|---|
| `session` event `version` | 3 | 3 |
| Event types | ends at `agent_end` | **adds `agent_settled` after `agent_end`** |
| Last line of stream | `agent_end` | **`agent_settled`** (`{type:"agent_settled"}`, no other keys) |
| `usage` fields | `input,output,cacheRead,cacheWrite,totalTokens,cost` | **adds `reasoning`** |
| `message_update` volume | 89 events | 32 events (less chatty) |
| Tool event shape | same | same |
| `agent_end.messages` shape | same | same |

**The one real trap:** an adapter that does "parse the last line of stdout as the result" works on
0.57.1 and **breaks on 0.83.0**, where the last line is the contentless `agent_settled`. Key off
`type === "agent_end"` explicitly, not on line position. Everything else is additive and
backward-compatible.

---

## Blockers

Nothing here blocks building on pi. Ranked list of what to design around:

1. **`agent_end` is not the last line on 0.83.0.** Parse by `type`, never by position. This is the
   single concrete way a naive adapter silently breaks across the version gap.
2. **Errors bypass the JSON stream.** Auth failures, and presumably network/model failures, produce
   a raw Node stack trace on stderr with exit 1, after a lone `session` line on stdout. The adapter
   needs an exit-code + stderr path; there is no error event to catch. Any "parse stdout, done"
   design will report an empty success on failure.
3. **`-p` auto-approves every tool, including `bash`, with no sandbox.** Defaults are
   `read,bash,edit,write`. This is strictly more permissive than the Cursor runtime being replaced.
   For a docs pipeline, pass an explicit `--tools` allowlist rather than accepting defaults, and be
   deliberate about whether `bash` belongs in it.
4. **Version/scope split is a real migration, not a bump.** Global is `@mariozechner/...@0.57.1`
   under mise; the maintained line is `@earendil-works/...@0.83.0`. Pin the package *and* version in
   the pipeline and don't rely on whatever `pi` resolves to on a given machine — the two names can
   coexist on PATH, as they did throughout this probe.
5. **`message_update` is 80%+ of stream volume and fully redundant.** Not a blocker, but for
   long-running doc generation it is a lot of wasted parsing. Filter it at the line level before
   `JSON.parse`.
6. **Model quality is the open question, not plumbing.** `gpt-oss-20b` handled a one-file write
   correctly. Nothing in this probe says anything about whether a cheap model can do real
   guide-drafting work — that is a separate evaluation.
7. **Minor:** every run wrote a session file under `~/.pi/agent/`. Use `--no-session` in the
   pipeline unless session persistence is wanted.

Not blockers, confirmed working: the exact Sandcastle argv form, stdin prompt delivery,
`OPENROUTER_API_KEY` env auth, three-segment model slugs, non-interactive file writes, per-run cost
accounting in the stream.

---

## Cost

**Total: $0.000578** (~0.06¢), summed from `turn_end.message.usage.cost.total` across the three
metered runs:

| Run | Cost |
|---|---|
| Q4 ping | $0.000111 |
| Q5 write, 0.57.1 | $0.000240 |
| Q5 write, 0.83.0 | $0.000228 |

Two additional runs cost $0 (the no-API-key failures never reached the model). Figures are pi's own
computed cost from the JSON stream, not billing-confirmed against the OpenRouter dashboard.

Note the token floor: the trivial "reply PONG" prompt still billed **3,510 input tokens** — pi's
system prompt plus tool definitions dominate any short prompt. Per-call cost is roughly constant
until real content is added.
