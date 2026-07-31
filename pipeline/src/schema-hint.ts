/**
 * The structured-report instruction appended to every agent prompt.
 *
 * Shared by both runtimes. `workflow.ts` calls `withSchemaHint` at module load,
 * before any runtime exists, and the hints are keyed by zod schema *identity* —
 * so both runtimes must read the same map, not their own copies.
 */
import { type ZodType, type z } from 'zod'

export type AnyZod = ZodType<unknown, z.ZodTypeDef, unknown>

const SCHEMA_HINTS = new WeakMap<AnyZod, string>()

/** Attach a JSON Schema (or example) shown to the model for structured reports. */
export function withSchemaHint<T extends AnyZod>(schema: T, hint: unknown): T {
  SCHEMA_HINTS.set(schema, JSON.stringify(hint, null, 2))
  return schema
}

export function schemaInstruction(schema: AnyZod): string {
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
