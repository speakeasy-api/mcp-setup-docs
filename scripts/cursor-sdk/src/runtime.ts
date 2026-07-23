import { Agent, CursorAgentError, type ModelSelection } from '@cursor/sdk'
import { type ZodType, type z } from 'zod'
import { extractJson } from './json.ts'

type AnyZod = ZodType<unknown, z.ZodTypeDef, unknown>

export type AgentOptions<S extends AnyZod> = {
  label: string
  phase: string
  schema: S
  /** Workflow uses 'sonnet' for lighter review/polish slots. */
  model?: 'sonnet' | string
}

export type RuntimeConfig = {
  apiKey: string
  repoRoot: string
  /** Heavy slots: research, draft, fidelity, voice, achievability, revision. */
  defaultModel: ModelSelection
  /** Light slots: formatting, concision, polish (workflow model: 'sonnet'). */
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

const SCHEMA_HINTS = new WeakMap<AnyZod, string>()

/** Attach a JSON Schema (or example) shown to the model for structured reports. */
export function withSchemaHint<T extends AnyZod>(schema: T, hint: unknown): T {
  SCHEMA_HINTS.set(schema, JSON.stringify(hint, null, 2))
  return schema
}

function schemaInstruction(schema: AnyZod): string {
  const hint =
    SCHEMA_HINTS.get(schema) ||
    '(see phase prompt for required keys; return a flat JSON object)'
  return [
    '',
    '---',
    'STRUCTURED REPORT (required):',
    'When your file work is done, end your final message with ONLY a single JSON',
    'object matching this schema. No markdown fences, no commentary before or',
    'after the JSON. The orchestrator parses your final message as JSON.',
    '',
    hint,
  ].join('\n')
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

      const result = await run.wait()
      if (result.status !== 'finished') {
        log(
          `[${opts.label}] run ended status=${result.status}` +
            (result.error ? ` error=${result.error.message}` : '')
        )
        return null
      }

      const text = result.result ?? ''
      let parsed: unknown
      try {
        parsed = extractJson(text)
      } catch (err) {
        log(`[${opts.label}] JSON parse failed: ${(err as Error).message}`)
        log(`[${opts.label}] raw result (first 500 chars): ${text.slice(0, 500)}`)
        return null
      }

      const checked = opts.schema.safeParse(parsed)
      if (!checked.success) {
        log(`[${opts.label}] schema validation failed: ${checked.error.message}`)
        return null
      }
      return checked.data as z.infer<S>
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
