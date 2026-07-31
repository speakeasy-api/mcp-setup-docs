import { Agent, CursorAgentError, type ModelSelection } from '@cursor/sdk'
import { type z } from 'zod'
import { extractJson } from './json.ts'
import { type AnyZod, schemaInstruction, withSchemaHint } from './schema-hint.ts'

// Re-exported so `workflow.ts` keeps importing it from here while both runtimes
// share one hint map.
export { withSchemaHint }

export type AgentOptions<S extends AnyZod> = {
  label: string
  phase: string
  schema: S
  /** Workflow may pass 'sonnet' for optional light slots (unused by current gates). */
  model?: 'sonnet' | string
  /**
   * After a successful parse, return a follow-up prompt to send once on the
   * same agent (keeps conversation context), or null/undefined to accept.
   * Used when the model reports ok without finishing required file work.
   */
  remediation?: (
    parsed: z.infer<S>
  ) => string | null | undefined | Promise<string | null | undefined>
}

export type RuntimeConfig = {
  apiKey: string
  repoRoot: string
  /** Heavy slots: research, draft, fidelity, achievability, revision. */
  defaultModel: ModelSelection
  /** Light model for optional `model: 'sonnet'` overrides (CLI still accepts it). */
  lightModel: ModelSelection
}

function resolveModel(cfg: RuntimeConfig, model?: string): ModelSelection {
  if (!model || model === 'default') return cfg.defaultModel
  if (model === 'sonnet') return cfg.lightModel
  // Explicit override id — keep default effort params so --model still thinks hard.
  return {
    id: model,
    params: cfg.defaultModel.params,
  }
}

function modelLabel(selection: ModelSelection): string {
  const effort = selection.params?.find((p) => p.id === 'effort')?.value
  return effort ? `${selection.id} (effort=${effort})` : selection.id
}

export function createRuntime(cfg: RuntimeConfig) {
  function log(message: string) {
    const ts = new Date().toISOString()
    console.error(`[${ts}] ${message}`)
  }

  async function agent<S extends AnyZod>(
    prompt: string,
    opts: AgentOptions<S>
  ): Promise<z.infer<S> | null> {
    const selection = resolveModel(cfg, opts.model)
    const fullPrompt = prompt + schemaInstruction(opts.schema)

    log(`[${opts.label}] starting (model=${modelLabel(selection)}, phase=${opts.phase})`)

    try {
      await using agentHandle = await Agent.create({
        apiKey: cfg.apiKey,
        model: selection,
        name: opts.label,
        local: {
          cwd: cfg.repoRoot,
          // Inline-only: don't pull ambient IDE MCP/settings into headless runs.
          settingSources: [],
        },
      })

      const run = await agentHandle.send(fullPrompt)
      log(`[${opts.label}] run=${run.id} agent=${agentHandle.agentId}`)

      let parsed = await waitAndParse(run, opts)
      if (!parsed) return null

      if (opts.remediation) {
        const followUp = await opts.remediation(parsed)
        if (followUp) {
          log(`[${opts.label}] sending remediation follow-up`)
          const remRun = await agentHandle.send(
            followUp + schemaInstruction(opts.schema)
          )
          log(`[${opts.label}] remediation run=${remRun.id}`)
          const remediated = await waitAndParse(remRun, {
            ...opts,
            label: opts.label + ' remediation',
          })
          if (remediated) parsed = remediated
        }
      }

      return parsed
    } catch (err) {
      if (err instanceof CursorAgentError) {
        log(
          `[${opts.label}] startup failed: ${err.message} retryable=${err.isRetryable}`
        )
        return null
      }
      throw err
    }
  }

  async function waitAndParse<S extends AnyZod>(
    run: Awaited<ReturnType<Awaited<ReturnType<typeof Agent.create>>['send']>>,
    opts: Pick<AgentOptions<S>, 'label' | 'schema'>
  ): Promise<z.infer<S> | null> {
    const result = await run.wait()
    if (result.status !== 'finished') {
      log(
        `[${opts.label}] run ended status=${result.status}` +
          (result.error ? ` error=${result.error.message}` : '')
      )
      return null
    }

    const text = result.result ?? ''
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

  async function parallel<T>(thunks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(thunks.map((fn) => fn()))
  }

  async function pipeline<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>
  ): Promise<R[]> {
    // Guides own disjoint directories — safe to run concurrently (matches harness).
    return Promise.all(items.map((item) => fn(item)))
  }

  function modelId(model?: string): string {
    return resolveModel(cfg, model).id
  }

  return { log, agent, parallel, pipeline, modelId }
}

export type Runtime = ReturnType<typeof createRuntime>
