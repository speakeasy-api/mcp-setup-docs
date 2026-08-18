import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import {
  buildPiArgs,
  createPiRuntime,
  piModelSlug,
  toolsForPhase,
  type PiRuntimeConfig,
  type RunPi,
} from './runtime-pi.ts'
import { withSchemaHint } from './schema-hint.ts'

const Report = z.object({ status: z.enum(['ok', 'blocked']), notes: z.string() }).strict()

function agentEndWith(text: string): string {
  return [
    '{"type":"session","version":3,"id":"s","cwd":"/repo"}',
    JSON.stringify({
      type: 'turn_end',
      message: { usage: { cost: { total: 0.001 } } },
    }),
    JSON.stringify({
      type: 'agent_end',
      messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
    }),
  ].join('\n')
}

/** A stub pi that replays one canned stdout per turn, recording what it was given. */
function stubPi(turns: string[]) {
  const calls: Array<{ args: string[]; prompt: string; env: Record<string, string> }> = []
  const runPi: RunPi = async ({ args, prompt, env }) => {
    calls.push({ args, prompt, env })
    const stdout = turns[calls.length - 1] ?? turns[turns.length - 1]!
    return { exitCode: 0, stdout, stderr: '' }
  }
  return { runPi, calls }
}

function config(over: Partial<PiRuntimeConfig> & Pick<PiRuntimeConfig, 'runPi'>): PiRuntimeConfig {
  return {
    apiKey: 'sk-or-test',
    repoRoot: '/repo',
    model: 'openai/gpt-5.6-sol',
    piBin: '/bin/pi',
    allowedPrefixes: ['guides/asana/', 'retro/runs/'],
    porcelain: () => '',
    ...over,
  }
}

describe('factory Exa MCP config', () => {
  it('uses only the hosted Exa research tools and disables MCP scripting', async () => {
    const extensionUrl = new URL('./pi-exa-mcp.mjs', import.meta.url).href
    const { exaMcpConfig } = (await import(extensionUrl)) as {
      exaMcpConfig: {
        settings: { scriptMode: boolean }
        mcpServers: Record<
          string,
          { url: string; lifecycle: string; includeTools: readonly string[] }
        >
      }
    }
    assert.equal(exaMcpConfig.settings.scriptMode, false)
    assert.deepEqual(Object.keys(exaMcpConfig.mcpServers), ['exa'])
    assert.deepEqual(exaMcpConfig.mcpServers.exa, {
      url: 'https://mcp.exa.ai/mcp',
      lifecycle: 'lazy',
      includeTools: ['web_search_exa', 'get_code_context_exa'],
    })
  })
})

describe('toolsForPhase', () => {
  it('gives reviewers and the judge a read-only set', () => {
    assert.deepEqual(toolsForPhase('asana: review'), ['read', 'grep', 'find', 'ls'])
    assert.deepEqual(toolsForPhase('asana: research-judge'), ['read', 'grep', 'find', 'ls'])
  })

  it('keeps bash for research only', () => {
    // pi ships no web-fetch tool, and research builds the dossier from fetched
    // provider docs. Removing bash here disables research rather than tightening it.
    assert.ok(toolsForPhase('asana: research').includes('bash'))
    assert.ok(toolsForPhase('asana: research').includes('mcp'))
    assert.ok(!toolsForPhase('asana: draft').includes('bash'))
    assert.ok(!toolsForPhase('asana: draft').includes('mcp'))
    assert.ok(!toolsForPhase('asana: revise').includes('bash'))
  })

  it('never grants write to a read-only phase', () => {
    for (const phase of ['x: review', 'x: research-judge']) {
      const tools = toolsForPhase(phase)
      assert.ok(!tools.includes('write'))
      assert.ok(!tools.includes('edit'))
      assert.ok(!tools.includes('bash'))
    }
  })
})

describe('piModelSlug and buildPiArgs', () => {
  it('prefixes bare OpenRouter slugs with the pi provider', () => {
    assert.equal(piModelSlug('openai/gpt-5.6-sol'), 'openrouter/openai/gpt-5.6-sol')
    assert.equal(piModelSlug('openrouter/openai/x'), 'openrouter/openai/x')
  })

  it('passes the same --session path that enables resume', () => {
    const args = buildPiArgs({
      model: 'openai/gpt-5.6-sol',
      tools: ['read', 'write'],
      sessionPath: '/tmp/s/session.jsonl',
    })
    assert.deepEqual(args, [
      '-p',
      '--mode',
      'json',
      '--no-extensions',
      '--no-skills',
      '--no-prompt-templates',
      '--no-themes',
      '--no-context-files',
      '--model',
      'openrouter/openai/gpt-5.6-sol',
      '--tools',
      'read,write',
      '--session',
      '/tmp/s/session.jsonl',
    ])
  })

  it('disables ambient extensions and loads the explicit factory extension when requested', () => {
    const args = buildPiArgs({
      model: 'm',
      tools: ['read', 'mcp'],
      sessionPath: '/tmp/s',
      extensionPath: '/repo/pipeline/src/pi-exa-mcp.mjs',
    })
    assert.ok(args.includes('--no-extensions'))
    assert.deepEqual(args.slice(args.indexOf('--extension'), args.indexOf('--extension') + 2), [
      '--extension',
      '/repo/pipeline/src/pi-exa-mcp.mjs',
    ])
  })

  it('never puts --no-session on the argv', () => {
    // --no-session and remediation are mutually exclusive: with it, turn 2
    // starts a fresh conversation and the agent redoes the work.
    const args = buildPiArgs({ model: 'm', tools: ['read'], sessionPath: '/tmp/s' })
    assert.ok(!args.includes('--no-session'))
  })
})

describe('createPiRuntime.agent', () => {
  it('loads Exa only for research turns', async () => {
    const { runPi, calls } = stubPi([
      agentEndWith('{"status":"ok","notes":"research"}'),
      agentEndWith('{"status":"ok","notes":"draft"}'),
    ])
    const rt = createPiRuntime(config({ runPi }))

    await rt.agent('research', {
      label: 'asana research',
      phase: 'asana: research',
      schema: Report,
    })
    await rt.agent('draft', { label: 'asana draft', phase: 'asana: draft', schema: Report })

    const extensionOf = (args: string[]) => {
      const index = args.indexOf('--extension')
      return index === -1 ? undefined : args[index + 1]
    }
    assert.equal(extensionOf(calls[0]!.args), '/repo/pipeline/src/pi-exa-mcp.mjs')
    assert.equal(extensionOf(calls[1]!.args), undefined)
    assert.match(calls[0]!.args[calls[0]!.args.indexOf('--tools') + 1]!, /(?:^|,)mcp(?:,|$)/)
    assert.doesNotMatch(
      calls[1]!.args[calls[1]!.args.indexOf('--tools') + 1]!,
      /(?:^|,)mcp(?:,|$)/
    )
    for (const call of calls) {
      for (const flag of [
        '--no-extensions',
        '--no-skills',
        '--no-prompt-templates',
        '--no-themes',
        '--no-context-files',
      ]) {
        assert.ok(call.args.includes(flag), `missing ${flag}`)
      }
      assert.ok(call.env.PI_CODING_AGENT_DIR!.includes('/pi-session-'))
      assert.ok(call.env.PI_CODING_AGENT_DIR!.endsWith('/agent'))
      assert.notEqual(call.env.PI_CODING_AGENT_DIR, process.env.HOME)
    }
  })

  it('parses a clean structured report', async () => {
    const { runPi } = stubPi([agentEndWith('{"status":"ok","notes":"done"}')])
    const rt = createPiRuntime(config({ runPi }))
    const out = await rt.agent('do the thing', {
      label: 'asana draft',
      phase: 'asana: draft',
      schema: Report,
    })
    assert.deepEqual(out, { status: 'ok', notes: 'done' })
  })

  it('appends the schema instruction to the prompt', async () => {
    const hinted = withSchemaHint(Report, { type: 'object' })
    const { runPi, calls } = stubPi([agentEndWith('{"status":"ok","notes":"n"}')])
    const rt = createPiRuntime(config({ runPi }))
    await rt.agent('base prompt', {
      label: 'l',
      phase: 'asana: draft',
      schema: hinted,
    })
    assert.match(calls[0]!.prompt, /^base prompt/)
    assert.match(calls[0]!.prompt, /STRUCTURED REPORT \(required\)/)
  })

  it('keeps orchestrator secrets out of the spawned env', async () => {
    const { runPi, calls } = stubPi([agentEndWith('{"status":"ok","notes":"n"}')])
    process.env.PULSE_REGISTRY_KEY = 'must-not-leak'
    process.env.GH_TOKEN = 'must-not-leak'
    try {
      const rt = createPiRuntime(config({ runPi }))
      await rt.agent('p', { label: 'l', phase: 'asana: draft', schema: Report })
      assert.equal(calls[0]!.env.PULSE_REGISTRY_KEY, undefined)
      assert.equal(calls[0]!.env.GH_TOKEN, undefined)
      assert.equal(calls[0]!.env.OPENROUTER_API_KEY, 'sk-or-test')
    } finally {
      delete process.env.PULSE_REGISTRY_KEY
      delete process.env.GH_TOKEN
    }
  })

  it('states the filesystem contract on every turn, including remediation', async () => {
    // Regression: `assign()` hands the agent an absolute guide directory while pi
    // runs with cwd = repoRoot. On the first fresh-draft run the model rendered
    // that path without its leading slash, and pi resolved it relative to cwd,
    // building `<repoRoot>/home/walker/.../research.md`. The tripwire caught it;
    // this keeps it from happening.
    const { runPi, calls } = stubPi([
      agentEndWith('{"status":"ok","notes":"first"}'),
      agentEndWith('{"status":"ok","notes":"second"}'),
    ])
    const rt = createPiRuntime(config({ runPi }))
    await rt.agent('base prompt', {
      label: 'asana research',
      phase: 'asana: research',
      schema: Report,
      remediation: (parsed) => (parsed.notes === 'first' ? 'follow up' : null),
    })
    assert.equal(calls.length, 2)
    for (const call of calls) {
      assert.match(call.prompt, /working directory is the repo root/)
      assert.match(call.prompt, /bare "home\/"/)
    }
    // Appended, not substituted for the caller's prompt.
    assert.match(calls[0]!.prompt, /^base prompt/)
    assert.match(calls[1]!.prompt, /^follow up/)
  })

  it('reuses one session path across the remediation turn', async () => {
    // The follow-up must resume the same conversation, not start over.
    const { runPi, calls } = stubPi([
      agentEndWith('{"status":"ok","notes":"first"}'),
      agentEndWith('{"status":"ok","notes":"after remediation"}'),
    ])
    const rt = createPiRuntime(config({ runPi }))
    const out = await rt.agent('p', {
      label: 'asana research',
      phase: 'asana: research',
      schema: Report,
      remediation: (parsed) => (parsed.notes === 'first' ? 'you forgot meta.yaml' : null),
    })
    assert.equal(calls.length, 2)
    const sessionOf = (args: string[]) => args[args.indexOf('--session') + 1]
    assert.equal(sessionOf(calls[0]!.args), sessionOf(calls[1]!.args))
    assert.equal(calls[0]!.env.PI_CODING_AGENT_DIR, calls[1]!.env.PI_CODING_AGENT_DIR)
    assert.deepEqual(out, { status: 'ok', notes: 'after remediation' })
  })

  it('fires remediation at most once', async () => {
    const { runPi, calls } = stubPi([
      agentEndWith('{"status":"ok","notes":"still missing"}'),
      agentEndWith('{"status":"ok","notes":"still missing"}'),
    ])
    const rt = createPiRuntime(config({ runPi }))
    await rt.agent('p', {
      label: 'l',
      phase: 'asana: research',
      schema: Report,
      remediation: () => 'fix it',
    })
    assert.equal(calls.length, 2)
  })

  it('keeps the original report when remediation fails to parse', async () => {
    const { runPi } = stubPi([
      agentEndWith('{"status":"ok","notes":"original"}'),
      agentEndWith('not json at all'),
    ])
    const rt = createPiRuntime(config({ runPi }))
    const out = await rt.agent('p', {
      label: 'l',
      phase: 'asana: research',
      schema: Report,
      remediation: () => 'fix it',
    })
    assert.deepEqual(out, { status: 'ok', notes: 'original' })
  })

  it('returns null on an API error that exits 0', async () => {
    const runPi: RunPi = async () => ({
      exitCode: 0,
      stdout:
        '{"type":"session","version":3}\n{"type":"turn_end","message":{"stopReason":"error","errorMessage":"400 bad model"}}',
      stderr: '',
    })
    const rt = createPiRuntime(config({ runPi }))
    const out = await rt.agent('p', { label: 'l', phase: 'asana: draft', schema: Report })
    assert.equal(out, null)
  })

  it('fails the phase when the agent writes outside its guide directory', async () => {
    // Clean before the agent runs, dirty after — the real sequence.
    const { runPi } = stubPi([agentEndWith('{"status":"ok","notes":"n"}')])
    let seen = 0
    const rt = createPiRuntime(
      config({ runPi, porcelain: () => (seen++ === 0 ? '' : ' M doctrine/constitution.md') })
    )
    const out = await rt.agent('p', { label: 'l', phase: 'asana: draft', schema: Report })
    assert.equal(out, null, 'an I8 breach must fail the phase, not just log')
  })

  it('does not blame the agent for pre-existing uncommitted edits', async () => {
    // The repo legitimately carries unrelated changes; only what the agent
    // added counts.
    const { runPi } = stubPi([agentEndWith('{"status":"ok","notes":"n"}')])
    const rt = createPiRuntime(
      config({ runPi, porcelain: () => ' M pipeline/src/runtime-pi.ts' })
    )
    const out = await rt.agent('p', { label: 'l', phase: 'asana: draft', schema: Report })
    assert.deepEqual(out, { status: 'ok', notes: 'n' })
  })

  it('does not let a first-turn breach become the remediation turn baseline', async () => {
    // A per-turn baseline would recapture the stray write between turns and
    // wave it through on the follow-up.
    const { runPi } = stubPi([
      agentEndWith('{"status":"ok","notes":"first"}'),
      agentEndWith('{"status":"ok","notes":"second"}'),
    ])
    let seen = 0
    const rt = createPiRuntime(
      config({
        runPi,
        porcelain: () => (seen++ === 0 ? '' : ' M .github/workflows/guide-draft.yml'),
      })
    )
    const out = await rt.agent('p', {
      label: 'l',
      phase: 'asana: research',
      schema: Report,
      remediation: () => 'follow up',
    })
    assert.equal(out, null)
  })

  it('accepts writes inside the guide directory', async () => {
    const { runPi } = stubPi([agentEndWith('{"status":"ok","notes":"n"}')])
    const rt = createPiRuntime(
      config({ runPi, porcelain: () => '?? guides/asana/research.md' })
    )
    const out = await rt.agent('p', { label: 'l', phase: 'asana: draft', schema: Report })
    assert.deepEqual(out, { status: 'ok', notes: 'n' })
  })
})

describe('createPiRuntime.pipeline', () => {
  it('runs guides one at a time', async () => {
    const { runPi } = stubPi([agentEndWith('{"status":"ok","notes":"n"}')])
    const rt = createPiRuntime(config({ runPi }))
    let inFlight = 0
    let peak = 0
    const out = await rt.pipeline([1, 2, 3], async (n) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight--
      return n * 2
    })
    assert.deepEqual(out, [2, 4, 6])
    assert.equal(peak, 1, 'concurrent guides race on one .git index')
  })
})
