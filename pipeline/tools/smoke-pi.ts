/**
 * Live smoke test of the pi runtime: real spawn, real OpenRouter, cheap model.
 * Verifies the whole adapter path that the unit tests stub out.
 */
import { z } from 'zod'
import { createPiRuntime } from '../src/runtime-pi.ts'
import { withSchemaHint } from '../src/schema-hint.ts'

// Defaults to the cwd, so run this from the repo root (or pass the root as argv[2]).
const REPO = process.argv[2] ?? process.cwd()
const PI = REPO + '/pipeline/node_modules/.bin/pi'

const Report = withSchemaHint(
  z.object({ status: z.enum(['ok', 'blocked']), notes: z.string() }).strict(),
  {
    type: 'object',
    required: ['status', 'notes'],
    properties: {
      status: { type: 'string', enum: ['ok', 'blocked'] },
      notes: { type: 'string' },
    },
  }
)

const apiKey = process.env.OPENROUTER_API_KEY?.trim()
if (!apiKey) {
  console.error('OPENROUTER_API_KEY missing')
  process.exit(1)
}

const rt = createPiRuntime({
  apiKey,
  repoRoot: REPO,
  model: 'openai/gpt-oss-20b',
  piBin: PI,
  allowedPrefixes: ['guides/smoke-test/', 'retro/runs/'],
})

async function main() {
  console.error('--- case 1: read-only phase, structured report ---')
  const ok = await rt.agent(
    'Reply with a structured report. Set status to "ok" and notes to the single word SMOKE.',
    { label: 'smoke judge', phase: 'smoke: research-judge', schema: Report }
  )
  console.error('case 1 result:', JSON.stringify(ok))

  console.error('--- case 2: remediation resumes the same conversation ---')
  let asked = false
  const resumed = await rt.agent(
    'Remember this build tag: PLUM-47-QUARTZ. Reply with a structured report, status "ok", notes "stored".',
    {
      label: 'smoke resume',
      phase: 'smoke: research-judge',
      schema: Report,
      remediation: () => {
        if (asked) return null
        asked = true
        return 'What was the build tag I gave you earlier in this conversation? Reply with a structured report where notes is exactly that tag.'
      },
    }
  )
  console.error('case 2 result:', JSON.stringify(resumed))
  const carried = resumed?.notes.includes('PLUM-47-QUARTZ')
  console.error(carried ? 'CONTINUITY: PASS' : 'CONTINUITY: FAIL')

  console.error('--- case 3: invalid model must fail loudly despite exit 0 ---')
  const badRt = createPiRuntime({
    apiKey,
    repoRoot: REPO,
    model: 'not/a-real-model',
    piBin: PI,
    allowedPrefixes: ['guides/smoke-test/'],
  })
  const bad = await badRt.agent('Say hi.', {
    label: 'smoke bad-model',
    phase: 'smoke: research-judge',
    schema: Report,
  })
  console.error('case 3 result:', JSON.stringify(bad))
  console.error(bad === null ? 'BAD-MODEL: PASS (null)' : 'BAD-MODEL: FAIL (not null)')
}

main().catch((err) => {
  console.error('smoke threw:', err)
  process.exit(1)
})
