/**
 * Agent runtime backed by a direct `spawn` of the `pi` CLI over OpenRouter.
 *
 * Exposes the same surface as `runtime.ts` — `{ log, agent, parallel, pipeline,
 * modelId }` — so `workflow.ts` is untouched. Three things make this more than
 * a spawn wrapper:
 *
 *  - **Session continuity.** Remediation sends one follow-up that must land in
 *    the *same* conversation ("use the research you already gathered"). pi has
 *    no daemon, so continuity comes from `--session <path>`: the same flag
 *    creates the file on turn 1 and resumes it on turn 2. This is why
 *    `--no-session` is not used — verified live, the two are mutually exclusive.
 *  - **Post-hoc validity.** pi exits 0 on API errors, so success is decided by
 *    `classifyPiRun`, never by the exit code.
 *  - **Containment.** No container here, so the env allowlist and the
 *    `git status` tripwire are the whole I7/secret boundary.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type z } from 'zod'
import { extractJson } from './json.ts'
import { type AnyZod, schemaInstruction } from './schema-hint.ts'
import { buildAgentEnv, writesOutsideAllowed } from './pi-guard.ts'
import {
  classifyPiRun,
  formatToolCalls,
  parsePiStream,
  toolCallCounts,
  type PiRun,
} from './pi-stream.ts'
import { gitSoft } from './factory/git.ts'

export type AgentOptions<S extends AnyZod> = {
  label: string
  phase: string
  schema: S
  remediation?: (
    parsed: z.infer<S>
  ) => string | null | undefined | Promise<string | null | undefined>
}

export type PiRuntimeConfig = {
  /** OpenRouter key. Never logged, never passed via argv. */
  apiKey: string
  repoRoot: string
  /** OpenRouter slug; `openrouter/` is prepended if absent. */
  model: string
  /** Path to the pinned pi binary. */
  piBin: string
  /** Repo-relative prefixes the agent may write to, for the tripwire. */
  allowedPrefixes: readonly string[]
  /** Injected for tests. Defaults to a real `spawn` of `piBin`. */
  runPi?: RunPi
  /** Injected for tests. Defaults to `git status --porcelain` in `repoRoot`. */
  porcelain?: (repoRoot: string) => string
}

export type RunPi = (input: {
  args: string[]
  prompt: string
  env: Record<string, string>
  cwd: string
}) => Promise<PiRun>

/**
 * Tools each phase may use. Narrower than pi's default `read,bash,edit,write`
 * for every phase, and read-only for the two that write nothing.
 *
 * `research` keeps `bash` deliberately: pi ships no web-fetch tool on either
 * version, and the research role builds the dossier from fetched provider docs
 * (`doctrine/roles/technical-research.md:32`). It is also the documented way to
 * run `npx ajv-cli` for meta.yaml validation. Removing `bash` here does not
 * tighten research, it disables it.
 */
export function toolsForPhase(phase: string): string[] {
  const kind = phase.includes(':') ? phase.split(':').pop()!.trim() : phase.trim()
  if (kind === 'review' || kind === 'research-judge') {
    return ['read', 'grep', 'find', 'ls']
  }
  if (kind === 'research') {
    return ['read', 'edit', 'write', 'grep', 'find', 'ls', 'bash']
  }
  // draft, revise — write guide files from a dossier already on disk.
  return ['read', 'edit', 'write', 'grep', 'find', 'ls']
}

/**
 * Restates where the agent is standing, appended to every prompt.
 *
 * `workflow.ts`'s `assign()` hands the agent an *absolute* guide directory while
 * pi runs with `cwd = repoRoot`, so the two encodings are both valid and the
 * model has to pick one. On the first fresh-draft run it picked neither cleanly:
 * it rendered the absolute path with the leading slash missing, and pi — which
 * resolves genuine absolute paths correctly, verified live — read that as
 * relative and built a shadow tree at `<repoRoot>/home/walker/…/research.md`.
 *
 * The I7 tripwire failed the phase, so this was never silent corruption. This
 * removes the ambiguity that produced it; the tripwire remains the backstop.
 */
const PATH_CONTRACT = [
  '',
  '',
  'Filesystem contract: your working directory is the repo root. Every path you',
  'give a tool must either begin with "/" (a true absolute path) or be relative',
  'to the repo root, e.g. "guides/<slug>/research.md". A path that begins with a',
  'bare "home/" is neither: it creates a shadow copy of the tree inside the repo',
  'and fails the run.',
].join('\n')

/** OpenRouter slugs are `provider/model`; pi wants them under its `openrouter` provider. */
export function piModelSlug(model: string): string {
  return model.startsWith('openrouter/') ? model : `openrouter/${model}`
}

export function buildPiArgs(input: {
  model: string
  tools: string[]
  sessionPath: string
}): string[] {
  return [
    '-p',
    '--mode',
    'json',
    '--model',
    piModelSlug(input.model),
    '--tools',
    input.tools.join(','),
    // Same flag on both turns: creates the session, then resumes it.
    '--session',
    input.sessionPath,
  ]
}

function defaultRunPi(piBin: string): RunPi {
  return ({ args, prompt, env, cwd }) =>
    new Promise<PiRun>((resolve) => {
      // stdout must be piped (we parse it), so pi's progress cannot simply be
      // inherited; the phase-level `log` lines carry progress instead.
      const child = spawn(piBin, args, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      let spawnError: string | undefined
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk
      })
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk
      })
      child.on('error', (err) => {
        spawnError = err.message
      })
      child.on('close', (code) => {
        resolve({ exitCode: code, stdout, stderr, spawnError })
      })
      child.stdin.on('error', () => {
        // pi can exit before draining stdin (e.g. auth failure); the close
        // handler reports the real outcome, so EPIPE here is not the story.
      })
      child.stdin.end(prompt)
    })
}

export function createPiRuntime(cfg: PiRuntimeConfig) {
  const runPi = cfg.runPi ?? defaultRunPi(cfg.piBin)
  const porcelain = cfg.porcelain ?? defaultPorcelain
  const env = buildAgentEnv(process.env, { OPENROUTER_API_KEY: cfg.apiKey })

  function log(message: string) {
    const ts = new Date().toISOString()
    console.error(`[${ts}] ${message}`)
  }

  /**
   * Paths already dirty outside the allowlist before any agent ran.
   *
   * Captured once, not per turn: a per-turn baseline would let a stray write in
   * the first turn be accepted as "pre-existing" by the remediation turn. In CI
   * the tree is clean so this is empty and the tripwire is strict; locally it
   * spares a developer's unrelated edits, which is announced rather than silent.
   */
  let baseline: Set<string> | null = null
  function baselineOffenders(): Set<string> {
    if (baseline) return baseline
    baseline = new Set(writesOutsideAllowed(porcelain(cfg.repoRoot), cfg.allowedPrefixes))
    if (baseline.size > 0) {
      log(
        `[tripwire] ${baseline.size} path(s) already modified outside the guide ` +
          `directory before the run; I7 enforcement is degraded for: ` +
          [...baseline].join(', ')
      )
    }
    return baseline
  }

  /** One pi turn. `sessionPath` is shared across turns to keep the conversation. */
  async function turn(
    prompt: string,
    opts: { label: string; phase: string; sessionPath: string }
  ): Promise<string | null> {
    const args = buildPiArgs({
      model: cfg.model,
      tools: toolsForPhase(opts.phase),
      sessionPath: opts.sessionPath,
    })
    const before = baselineOffenders()

    // In `turn` rather than `agent` so the remediation turn carries it too.
    const run = await runPi({ args, prompt: prompt + PATH_CONTRACT, env, cwd: cfg.repoRoot })
    const outcome = classifyPiRun(run)

    if (!outcome.ok) {
      log(`[${opts.label}] pi run failed (${outcome.kind}): ${outcome.message}`)
      return null
    }
    const tools = formatToolCalls(toolCallCounts(parsePiStream(run.stdout)))
    log(
      `[${opts.label}] cost $${outcome.costUsd.toFixed(4)} tools: ${tools || '(none)'}`
    )

    const strayWrites = writesOutsideAllowed(
      porcelain(cfg.repoRoot),
      cfg.allowedPrefixes
    ).filter((path) => !before.has(path))
    if (strayWrites.length > 0) {
      // I7: with no container this assertion is the boundary, so a breach fails
      // the phase rather than being logged and ignored.
      log(
        `[${opts.label}] I7 tripwire: agent wrote outside its guide directory: ` +
          strayWrites.join(', ')
      )
      return null
    }

    return outcome.text
  }

  function parse<S extends AnyZod>(
    text: string,
    opts: Pick<AgentOptions<S>, 'label' | 'schema'>
  ): z.infer<S> | null {
    let raw: unknown
    try {
      raw = extractJson(text)
    } catch (err) {
      log(`[${opts.label}] JSON parse failed: ${(err as Error).message}`)
      log(`[${opts.label}] raw result (first 500 chars): ${text.slice(0, 500)}`)
      return null
    }
    const checked = opts.schema.safeParse(raw)
    if (!checked.success) {
      log(`[${opts.label}] schema validation failed: ${checked.error.message}`)
      return null
    }
    return checked.data as z.infer<S>
  }

  async function agent<S extends AnyZod>(
    prompt: string,
    opts: AgentOptions<S>
  ): Promise<z.infer<S> | null> {
    log(`[${opts.label}] starting (model=${piModelSlug(cfg.model)}, phase=${opts.phase})`)

    const sessionDir = mkdtempSync(join(tmpdir(), 'pi-session-'))
    const sessionPath = join(sessionDir, 'session.jsonl')
    try {
      const text = await turn(prompt + schemaInstruction(opts.schema), {
        label: opts.label,
        phase: opts.phase,
        sessionPath,
      })
      if (text === null) return null

      let parsed = parse(text, opts)
      if (!parsed) return null

      if (opts.remediation) {
        const followUp = await opts.remediation(parsed)
        if (followUp) {
          log(`[${opts.label}] sending remediation follow-up`)
          // Same sessionPath — the follow-up resumes the conversation rather
          // than starting over, which is what makes "use the work you already
          // did" meaningful.
          const remText = await turn(followUp + schemaInstruction(opts.schema), {
            label: opts.label + ' remediation',
            phase: opts.phase,
            sessionPath,
          })
          if (remText !== null) {
            const remediated = parse(remText, {
              label: opts.label + ' remediation',
              schema: opts.schema,
            })
            // Soft failure: a bad remediation keeps the original report rather
            // than discarding it. The workflow re-checks disk itself.
            if (remediated) parsed = remediated
          }
        }
      }

      return parsed
    } finally {
      rmSync(sessionDir, { recursive: true, force: true })
    }
  }

  async function parallel<T>(thunks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(thunks.map((fn) => fn()))
  }

  async function pipeline<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
    // Serialized: every guide shares one .git index, and concurrent agents make
    // the tripwire's `git status` read another guide's writes as a breach.
    const out: R[] = []
    for (const item of items) out.push(await fn(item))
    return out
  }

  function modelId(): string {
    return piModelSlug(cfg.model)
  }

  return { log, agent, parallel, pipeline, modelId }
}

function defaultPorcelain(repoRoot: string): string {
  return gitSoft(['status', '--porcelain'], repoRoot).stdout
}

export type PiRuntime = ReturnType<typeof createPiRuntime>
