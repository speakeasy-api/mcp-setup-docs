import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { distill, type ChatCompletion } from './resolve-issue.ts'

/**
 * `distill` returns the decision, `main` maps it to the process exit code:
 * failure → 1, resolved+ok → 0, resolved+needs_clarification → 2. Each test
 * below therefore also pins an exit code.
 */

const PERSONAS = ['it-admin', 'developer']

/** A 200 whose single choice carries `text` as the assistant message. */
function completion(text: string): { status: number; body: string } {
  return {
    status: 200,
    body: JSON.stringify({
      id: 'gen-1',
      choices: [{ index: 0, message: { role: 'assistant', content: text } }],
    }),
  }
}

/** A stub OpenRouter that replays one canned response, recording the request. */
function stubChat(res: { status: number; body: string }) {
  const calls: Array<{ apiKey: string; model: string; prompt: string }> = []
  const chat: ChatCompletion = async (input) => {
    calls.push(input)
    return res
  }
  return { chat, calls }
}

function distillOnce(res: { status: number; body: string }, personas = PERSONAS) {
  return distill({
    prompt: 'distill this issue',
    personas,
    apiKey: 'sk-or-test',
    model: 'openai/gpt-5.6-sol',
    chat: stubChat(res).chat,
  })
}

describe('distill', () => {
  it('resolves a clean ok verdict', async () => {
    const out = await distillOnce(
      completion(
        '{"status":"ok","slug":"datadog","provider":"Datadog","persona":"it-admin","notes":"Prefer OAuth"}'
      )
    )
    assert.deepEqual(out, {
      kind: 'resolved',
      resolved: {
        status: 'ok',
        slug: 'datadog',
        provider: 'Datadog',
        persona: 'it-admin',
        notes: 'Prefer OAuth',
      },
    })
  })

  it('sends the model and prompt through to the transport', async () => {
    // --light-model has to reach the wire; a default silently applied at the
    // fetch layer would make the flag decorative.
    const { chat, calls } = stubChat(
      completion('{"status":"ok","slug":"asana","provider":"Asana"}')
    )
    await distill({
      prompt: 'distill this issue',
      personas: PERSONAS,
      apiKey: 'sk-or-test',
      model: 'anthropic/claude-sonnet-5',
      chat,
    })
    assert.equal(calls.length, 1)
    assert.equal(calls[0]!.model, 'anthropic/claude-sonnet-5')
    assert.equal(calls[0]!.prompt, 'distill this issue')
  })

  it('passes a needs_clarification verdict through untouched', async () => {
    const out = await distillOnce(
      completion(
        '{"status":"needs_clarification","reason":"Slack or HubSpot?","candidates":["slack","hubspot"]}'
      )
    )
    assert.deepEqual(out, {
      kind: 'resolved',
      resolved: {
        status: 'needs_clarification',
        reason: 'Slack or HubSpot?',
        candidates: ['slack', 'hubspot'],
      },
    })
  })

  it('fails on a non-2xx response without leaking the key', async () => {
    const out = await distillOnce({
      status: 429,
      body: '{"error":{"message":"rate limited"}}',
    })
    assert.equal(out.kind, 'failure')
    assert.match(out.kind === 'failure' ? out.message : '', /429/)
    assert.ok(
      !(out.kind === 'failure' ? out.message : '').includes('sk-or-test'),
      'the API key must never reach a log line'
    )
  })

  it('fails on a 200 whose body is not JSON', async () => {
    // A proxy or gateway can answer 200 with an HTML error page; that is a
    // broken call, not an ambiguous issue.
    const out = await distillOnce({ status: 200, body: '<html>upstream timeout</html>' })
    assert.equal(out.kind, 'failure')
  })

  it('fails on a 200 that carries no message content', async () => {
    // The failure mode that already bit the pi path: an empty result read as an
    // empty-but-successful answer. Exit 1, never exit 2.
    const out = await distillOnce({ status: 200, body: '{"id":"gen-1","choices":[]}' })
    assert.equal(out.kind, 'failure')
    assert.match(out.kind === 'failure' ? out.message : '', /no message content/)
  })

  it('clarifies when the assistant text is not JSON', async () => {
    // Distinct from a broken transport: the model answered, it just answered in
    // prose. That is a soft exit 2 the workflow can act on.
    const out = await distillOnce(completion('Did you mean Slack or HubSpot?'))
    assert.equal(out.kind, 'resolved')
    assert.equal(out.kind === 'resolved' ? out.resolved.status : '', 'needs_clarification')
  })

  it('clarifies when the JSON misses the schema', async () => {
    const out = await distillOnce(completion('{"status":"maybe","slug":"asana"}'))
    assert.equal(out.kind, 'resolved')
    assert.equal(out.kind === 'resolved' ? out.resolved.status : '', 'needs_clarification')
  })

  it('normalizes a slug the model returned in prose form', async () => {
    // Defense in depth: the prompt asks for kebab-case, the pipeline requires it.
    const out = await distillOnce(
      completion('{"status":"ok","slug":"Google Calendar!","provider":"Google Calendar"}')
    )
    assert.deepEqual(out, {
      kind: 'resolved',
      resolved: {
        status: 'ok',
        slug: 'google-calendar',
        provider: 'Google Calendar',
        persona: 'it-admin',
        notes: '',
      },
    })
  })

  it('clarifies when nothing kebab-case survives the slug', async () => {
    const out = await distillOnce(completion('{"status":"ok","slug":"???","provider":"X"}'))
    assert.deepEqual(out, {
      kind: 'resolved',
      resolved: {
        status: 'needs_clarification',
        reason: 'Could not derive a kebab-case slug from "???"',
        candidates: ['???'],
      },
    })
  })

  it('falls back to it-admin for a persona that does not exist', async () => {
    // Personas are files under doctrine/personas/; an invented id would send the
    // drafting agents looking for one that isn't there.
    const out = await distillOnce(
      completion('{"status":"ok","slug":"asana","provider":"Asana","persona":"wizard"}')
    )
    assert.equal(out.kind === 'resolved' ? (out.resolved as { persona: string }).persona : '', 'it-admin')
  })

  it('fails when the transport itself throws', async () => {
    const chat: ChatCompletion = async () => {
      throw new Error('getaddrinfo ENOTFOUND openrouter.ai')
    }
    const out = await distill({
      prompt: 'p',
      personas: PERSONAS,
      apiKey: 'sk-or-test',
      model: 'openai/gpt-5.6-sol',
      chat,
    })
    assert.equal(out.kind, 'failure')
    assert.match(out.kind === 'failure' ? out.message : '', /ENOTFOUND/)
  })
})
