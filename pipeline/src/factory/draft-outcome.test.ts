import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mapDraftOutcome } from './draft-outcome.ts'

describe('mapDraftOutcome', () => {
  it('maps exit 0 to converged', () => {
    const r = mapDraftOutcome({ exitCode: 0, slug: 'box', workspace: '/tmp' })
    assert.deepEqual(r, { ok: true, outcome: 'converged' })
  })

  it('maps exit 3 to awaiting_scope when research.md exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'factory-draft-'))
    try {
      mkdirSync(join(root, 'guides', 'box'), { recursive: true })
      writeFileSync(join(root, 'guides', 'box', 'research.md'), '# r\n')
      const r = mapDraftOutcome({ exitCode: 3, slug: 'box', workspace: root })
      assert.deepEqual(r, { ok: true, outcome: 'awaiting_scope' })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('fails exit 3 without research.md', () => {
    const root = mkdtempSync(join(tmpdir(), 'factory-draft-'))
    try {
      mkdirSync(join(root, 'guides', 'box'), { recursive: true })
      const r = mapDraftOutcome({ exitCode: 3, slug: 'box', workspace: root })
      assert.equal(r.ok, false)
      if (!r.ok) assert.equal(r.exitCode, 1)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('maps exit 2 to unconverged when guide dir exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'factory-draft-'))
    try {
      mkdirSync(join(root, 'guides', 'box'), { recursive: true })
      const r = mapDraftOutcome({ exitCode: 2, slug: 'box', workspace: root })
      assert.deepEqual(r, { ok: true, outcome: 'unconverged' })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('passes through hard failure exit codes', () => {
    const r = mapDraftOutcome({ exitCode: 1, slug: 'box', workspace: '/tmp' })
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.exitCode, 1)
  })
})
