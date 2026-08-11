import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyPiRun,
  finalText,
  parsePiStream,
  streamError,
  formatToolCalls,
  formatTokenUsage,
  toolCallCounts,
  totalCostUsd,
  totalTokenUsage,
} from './pi-stream.ts'

const SESSION = JSON.stringify({
  type: 'session',
  version: 3,
  id: 'abc',
  cwd: '/repo',
})

function agentEnd(text: string): string {
  return JSON.stringify({
    type: 'agent_end',
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'go' }] },
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'reasoning that must not leak', thinkingSignature: 'x' },
          { type: 'text', text },
        ],
      },
    ],
  })
}

function turnEnd(cost: number): string {
  return JSON.stringify({
    type: 'turn_end',
    message: { usage: { input: 10, output: 2, cost: { total: cost } } },
  })
}

describe('parsePiStream', () => {
  it('drops message_update noise without parsing it', () => {
    const stdout = [
      SESSION,
      '{"type":"message_update","message":{"content":"cumulative"}}',
      '{"type":"message_update","message":{"content":"cumulative more"}}',
      agentEnd('done'),
    ].join('\n')
    const types = parsePiStream(stdout).map((e) => e.type)
    assert.deepEqual(types, ['session', 'agent_end'])
  })

  it('skips blank and unparseable lines rather than throwing', () => {
    const stdout = ['', SESSION, 'not json at all', '   ', agentEnd('ok')].join('\n')
    const types = parsePiStream(stdout).map((e) => e.type)
    assert.deepEqual(types, ['session', 'agent_end'])
  })
})

describe('finalText', () => {
  it('reads agent_end by type, not by stream position', () => {
    // 0.83.0 appends a contentless agent_settled after agent_end. Reading the
    // last line works on 0.57.1 and silently returns nothing here.
    const stdout = [SESSION, agentEnd('the answer'), '{"type":"agent_settled"}'].join('\n')
    assert.equal(finalText(parsePiStream(stdout)), 'the answer')
  })

  it('filters thinking parts out of the content array', () => {
    const text = finalText(parsePiStream([SESSION, agentEnd('visible')].join('\n')))
    assert.equal(text, 'visible')
    assert.ok(!text!.includes('reasoning that must not leak'))
  })

  it('returns null when there is no agent_end', () => {
    assert.equal(finalText(parsePiStream(SESSION)), null)
  })
})

describe('totalCostUsd', () => {
  it('sums every turn_end, not just the last', () => {
    const stdout = [SESSION, turnEnd(0.01), turnEnd(0.02), agentEnd('x')].join('\n')
    assert.equal(
      Math.round(totalCostUsd(parsePiStream(stdout)) * 1000) / 1000,
      0.03
    )
  })
})

describe('totalTokenUsage', () => {
  function usageTurn(usage: Record<string, number>): string {
    return JSON.stringify({
      type: 'turn_end',
      message: { usage: { ...usage, cost: { total: 0.01 } } },
    })
  }

  it('sums every turn_end, not just the last', () => {
    const stdout = [
      SESSION,
      usageTurn({ input: 10, output: 2, cacheRead: 100, cacheWrite: 40 }),
      usageTurn({ input: 5, output: 3, cacheRead: 200, cacheWrite: 0 }),
      agentEnd('x'),
    ].join('\n')
    assert.deepEqual(totalTokenUsage(parsePiStream(stdout)), {
      input: 15,
      output: 5,
      cacheRead: 300,
      cacheWrite: 40,
    })
  })

  it('treats a turn with no usage as zero rather than throwing', () => {
    const stdout = [SESSION, '{"type":"turn_end","message":{}}', agentEnd('x')].join('\n')
    assert.deepEqual(totalTokenUsage(parsePiStream(stdout)), {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    })
  })

  it('ignores non-numeric usage fields', () => {
    const stdout = [
      SESSION,
      '{"type":"turn_end","message":{"usage":{"input":"lots","cacheRead":7}}}',
      agentEnd('x'),
    ].join('\n')
    const usage = totalTokenUsage(parsePiStream(stdout))
    assert.equal(usage.input, 0)
    assert.equal(usage.cacheRead, 7)
  })

  it('carries usage onto a successful outcome', () => {
    const stdout = [
      SESSION,
      usageTurn({ input: 1, output: 2, cacheRead: 3, cacheWrite: 4 }),
      agentEnd('done'),
    ].join('\n')
    const out = classifyPiRun({ exitCode: 0, stdout, stderr: '' })
    assert.ok(out.ok)
    assert.deepEqual(out.tokens, { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 })
  })
})

describe('formatTokenUsage', () => {
  it('reports the cache hit share of all prompt tokens', () => {
    // 300 read of 400 prompt tokens (50 in + 300 read + 50 write).
    const line = formatTokenUsage({
      input: 50,
      output: 9,
      cacheRead: 300,
      cacheWrite: 50,
    })
    assert.equal(line, 'in=50 out=9 cache-r=300 cache-w=50 hit=75%')
  })

  it('reports hit=0% when the route serves no cache', () => {
    const line = formatTokenUsage({ input: 400, output: 9, cacheRead: 0, cacheWrite: 0 })
    assert.match(line, /hit=0%$/)
  })

  it('does not divide by zero on an empty run', () => {
    const line = formatTokenUsage({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
    assert.equal(line, 'in=0 out=0 cache-r=0 cache-w=0 hit=0%')
  })
})

describe('streamError', () => {
  it('finds stopReason=error on a top-level event', () => {
    const stdout = [
      SESSION,
      '{"type":"agent_end","stopReason":"error","errorMessage":"400 no such model"}',
    ].join('\n')
    assert.equal(streamError(parsePiStream(stdout)), '400 no such model')
  })

  it('finds stopReason=error nested on message', () => {
    const stdout = [
      SESSION,
      '{"type":"turn_end","message":{"stopReason":"error","errorMessage":"rate limited"}}',
    ].join('\n')
    assert.equal(streamError(parsePiStream(stdout)), 'rate limited')
  })

  it('is null for a clean run', () => {
    assert.equal(streamError(parsePiStream([SESSION, agentEnd('fine')].join('\n'))), null)
  })
})

describe('real pi payloads captured from a live probe', () => {
  // Verbatim from `pi -p --mode json --model openrouter/not/a-real-model` on
  // 0.57.1. The run exited **0**; this is the silent-corruption case.
  const BAD_MODEL_TURN_END =
    '{"type":"turn_end","message":{"role":"assistant","content":[],"api":"openai-completions","provider":"openrouter","model":"not/a-real-model","usage":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0,"totalTokens":0,"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0,"total":0}},"stopReason":"error","timestamp":1785449416263,"errorMessage":"400 not/a-real-model is not a valid model ID"},"toolResults":[]}'

  const BAD_MODEL_AGENT_END =
    '{"type":"agent_end","messages":[{"role":"user","content":[{"type":"text","text":"Say hi."}],"timestamp":1785449416262},{"role":"assistant","content":[],"api":"openai-completions","provider":"openrouter","model":"not/a-real-model","usage":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0,"totalTokens":0,"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0,"total":0}},"stopReason":"error","timestamp":1785449416263,"errorMessage":"400 not/a-real-model is not a valid model ID"}]}'

  const AUTH_FAILURE_STDOUT =
    '{"type":"session","version":3,"id":"5cebb7a3-102c-4668-b992-58a444d7d342","timestamp":"2026-07-30T22:11:37.978Z","cwd":"/repo"}'

  it('rejects the invalid-model run despite exit code 0', () => {
    const out = classifyPiRun({
      exitCode: 0,
      stdout: [SESSION, BAD_MODEL_TURN_END, BAD_MODEL_AGENT_END].join('\n'),
      stderr:
        'Warning: Model "not/a-real-model" not found for provider "openrouter". Using custom model id.',
    })
    assert.equal(out.ok, false)
    assert.equal(!out.ok && out.kind, 'api')
    assert.match(!out.ok ? out.message : '', /not a valid model ID/)
  })

  it('finds the error on agent_end.messages[-1] on its own', () => {
    // turn_end also carries it, so prove the terminal-event path independently.
    assert.match(
      streamError(parsePiStream([SESSION, BAD_MODEL_AGENT_END].join('\n'))) ?? '',
      /not a valid model ID/
    )
  })

  it('rejects the auth failure: exit 1, session line only, no agent_end', () => {
    const out = classifyPiRun({
      exitCode: 1,
      stdout: AUTH_FAILURE_STDOUT,
      stderr:
        'Error: No API key found for openrouter.\n\nUse /login or set an API key environment variable.',
    })
    assert.equal(out.ok, false)
    assert.equal(!out.ok && out.kind, 'auth')
  })

  it('rejects an agent_end whose content array is empty', () => {
    // A failed turn still emits agent_end with content: []. Without the
    // empty-text check this would read as a successful, empty phase.
    const emptyEnd = JSON.stringify({
      type: 'agent_end',
      messages: [{ role: 'assistant', content: [] }],
    })
    const out = classifyPiRun({
      exitCode: 0,
      stdout: [SESSION, emptyEnd].join('\n'),
      stderr: '',
    })
    assert.equal(out.ok, false)
    assert.equal(!out.ok && out.kind, 'truncated')
  })

  it('accepts 0.83.0 output, where agent_settled trails agent_end', () => {
    const out = classifyPiRun({
      exitCode: 0,
      stdout: [SESSION, turnEnd(0.002), agentEnd('{"status":"ok"}'), '{"type":"agent_settled"}'].join(
        '\n'
      ),
      stderr: '',
    })
    assert.equal(out.ok, true)
    assert.equal(out.ok && out.text, '{"status":"ok"}')
  })
})

describe('classifyPiRun', () => {
  it('accepts a clean run', () => {
    const out = classifyPiRun({
      exitCode: 0,
      stdout: [SESSION, turnEnd(0.005), agentEnd('report body')].join('\n'),
      stderr: '',
    })
    assert.equal(out.ok, true)
    assert.equal(out.ok && out.text, 'report body')
    assert.equal(out.ok && out.costUsd, 0.005)
  })

  it('fails an API error even though pi exits 0', () => {
    // The highest-severity failure mode: naive exit-code checking reports a
    // guide that never generated as a guide that generated empty.
    const out = classifyPiRun({
      exitCode: 0,
      stdout: [
        SESSION,
        '{"type":"agent_end","stopReason":"error","errorMessage":"400 invalid model"}',
      ].join('\n'),
      stderr: '',
    })
    assert.equal(out.ok, false)
    assert.equal(!out.ok && out.kind, 'api')
    assert.match(!out.ok ? out.message : '', /invalid model/)
  })

  it('fails an auth error: exit 1, lone session line, stack on stderr', () => {
    const out = classifyPiRun({
      exitCode: 1,
      stdout: SESSION,
      stderr:
        'Error: No API key found for openrouter.\n    at AgentSession.prompt (/x/agent-session.js:638:19)',
    })
    assert.equal(out.ok, false)
    assert.equal(!out.ok && out.kind, 'auth')
    assert.match(!out.ok ? out.message : '', /No API key found/)
  })

  it('fails a truncated run that exits 0 with no agent_end', () => {
    const out = classifyPiRun({ exitCode: 0, stdout: SESSION, stderr: '' })
    assert.equal(out.ok, false)
    assert.equal(!out.ok && out.kind, 'truncated')
  })

  it('reports a spawn failure distinctly', () => {
    const out = classifyPiRun({
      exitCode: null,
      stdout: '',
      stderr: '',
      spawnError: 'spawn pi ENOENT',
    })
    assert.equal(out.ok, false)
    assert.equal(!out.ok && out.kind, 'spawn')
  })

  it('never reports an empty-but-successful run', () => {
    // Every failure shape must be ok:false — this is the invariant that keeps a
    // failed phase from being written to disk as an empty guide.
    const failures = [
      { exitCode: 1, stdout: SESSION, stderr: 'boom' },
      { exitCode: 0, stdout: SESSION, stderr: '' },
      {
        exitCode: 0,
        stdout: [SESSION, '{"type":"agent_end","stopReason":"error"}'].join('\n'),
        stderr: '',
      },
    ]
    for (const run of failures) {
      assert.equal(classifyPiRun(run).ok, false)
    }
  })
})

describe('toolCallCounts', () => {
  it('counts tool_execution_start by name', () => {
    const stdout = [
      SESSION,
      '{"type":"tool_execution_start","toolName":"read","args":{}}',
      '{"type":"tool_execution_start","toolName":"bash","args":{}}',
      '{"type":"tool_execution_start","toolName":"read","args":{}}',
      '{"type":"tool_execution_end","toolName":"read","isError":false}',
      agentEnd('done'),
    ].join('\n')
    const counts = toolCallCounts(parsePiStream(stdout))
    assert.deepEqual(counts, { read: 2, bash: 1 })
    assert.equal(formatToolCalls(counts), 'read=2 bash=1')
  })

  it('is empty when the agent called nothing', () => {
    // The signal that distinguishes "fetched fresh docs" from "re-read a prior
    // dossier and touched nothing".
    assert.deepEqual(toolCallCounts(parsePiStream([SESSION, agentEnd('x')].join('\n'))), {})
    assert.equal(formatToolCalls({}), '')
  })
})
