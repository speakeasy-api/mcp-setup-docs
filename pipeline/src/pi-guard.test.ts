import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  allowedPrefixesFor,
  buildAgentEnv,
  DENIED_ENV,
  writesOutsideAllowed,
} from './pi-guard.ts'

describe('buildAgentEnv', () => {
  it('passes through what pi needs', () => {
    const env = buildAgentEnv({
      PATH: '/usr/bin',
      HOME: '/home/x',
      OPENROUTER_API_KEY: 'sk-or-test',
    })
    assert.equal(env.PATH, '/usr/bin')
    assert.equal(env.HOME, '/home/x')
    assert.equal(env.OPENROUTER_API_KEY, 'sk-or-test')
  })

  it('keeps every orchestrator secret out of the subprocess', () => {
    const source: NodeJS.ProcessEnv = { PATH: '/usr/bin' }
    for (const name of DENIED_ENV) source[name] = 'leaked-' + name
    const env = buildAgentEnv(source)
    for (const name of DENIED_ENV) {
      assert.equal(env[name], undefined, `${name} must not reach the agent`)
    }
  })

  it('is an allowlist — an unknown variable is dropped, not passed', () => {
    // The point of allowlisting: a secret added to CI later is excluded by
    // default rather than leaking until someone remembers to deny it.
    const env = buildAgentEnv({ PATH: '/usr/bin', SOME_FUTURE_SECRET: 'oops' })
    assert.equal(env.SOME_FUTURE_SECRET, undefined)
  })

  it('drops empty values so pi sees an absent key, not a blank one', () => {
    const env = buildAgentEnv({ PATH: '/usr/bin', OPENROUTER_API_KEY: '' })
    assert.equal('OPENROUTER_API_KEY' in env, false)
  })

  it('applies overrides last', () => {
    const env = buildAgentEnv(
      { PATH: '/usr/bin', OPENROUTER_API_KEY: 'from-env' },
      { OPENROUTER_API_KEY: 'from-config' }
    )
    assert.equal(env.OPENROUTER_API_KEY, 'from-config')
  })
})

describe('writesOutsideAllowed', () => {
  const allowed = allowedPrefixesFor('asana')

  it('accepts writes confined to the guide directory', () => {
    const porcelain = [
      ' M guides/asana/external.md',
      '?? guides/asana/research.md',
      ' M retro/runs/2026-07-30-asana.json',
    ].join('\n')
    assert.deepEqual(writesOutsideAllowed(porcelain, allowed), [])
  })

  it('catches a write to doctrine (I8)', () => {
    const porcelain = ' M doctrine/constitution.md'
    assert.deepEqual(writesOutsideAllowed(porcelain, allowed), [
      'doctrine/constitution.md',
    ])
  })

  it('catches a write to another guide', () => {
    const porcelain = ' M guides/box/external.md'
    assert.deepEqual(writesOutsideAllowed(porcelain, allowed), ['guides/box/external.md'])
  })

  it('catches a workflow edit', () => {
    const porcelain = '?? .github/workflows/evil.yml'
    assert.deepEqual(writesOutsideAllowed(porcelain, allowed), [
      '.github/workflows/evil.yml',
    ])
  })

  it('reports both sides of a rename', () => {
    // Moving a doctrine file out is as much a breach as writing one in.
    const porcelain = 'R  doctrine/shared.md -> guides/asana/shared.md'
    assert.deepEqual(writesOutsideAllowed(porcelain, allowed), ['doctrine/shared.md'])
  })

  it('handles quoted paths with spaces', () => {
    const porcelain = '?? "doctrine/a file.md"'
    assert.deepEqual(writesOutsideAllowed(porcelain, allowed), ['doctrine/a file.md'])
  })

  it('is empty for a clean tree', () => {
    assert.deepEqual(writesOutsideAllowed('', allowed), [])
    assert.deepEqual(writesOutsideAllowed('\n  \n', allowed), [])
  })

  it('does not let a sibling directory prefix-match the guide dir', () => {
    const porcelain = ' M guides/asana-old/external.md'
    assert.deepEqual(writesOutsideAllowed(porcelain, allowed), [
      'guides/asana-old/external.md',
    ])
  })
})
