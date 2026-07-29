import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveResearchMode, hasResearchArtifacts } from './research-mode.ts'

describe('resolveResearchMode', () => {
  let dir: string

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'research-mode-'))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'research.md'), '# dossier\n')
    writeFileSync(join(dir, 'meta.yaml'), 'schema_version: 1\n')
  })

  after(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('cold start → full', () => {
    const r = resolveResearchMode({
      resume: false,
      guideDir: dir,
      notes: 'Decision 1: drop this branch',
    })
    assert.equal(r.mode, 'full')
  })

  it('resume + scope-only → skip', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: drop this branch\nDecision 2: hedge — soft',
      priorStatus: 'awaiting_scope',
    })
    assert.equal(r.mode, 'skip')
    assert.equal(hasResearchArtifacts(dir), true)
  })

  it('resume + verified fact → patch', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes:
        'Decision 1: drop this branch\nDecision 2: verified — button is Reset',
    })
    assert.equal(r.mode, 'patch')
  })

  it('resume + keep/dossier correction → patch', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: keep the PrivateLink note in research.md',
    })
    assert.equal(r.mode, 'patch')
  })

  it('force re-research → full', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: drop this branch\nPlease re-research; docs moved',
    })
    assert.equal(r.mode, 'full')
  })

  it('explicit override wins', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: drop this branch',
      explicit: 'patch',
    })
    assert.equal(r.mode, 'patch')
    assert.match(r.reason, /explicit/)
  })

  it('resume without decisions → full (fail closed)', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'thanks',
    })
    assert.equal(r.mode, 'full')
  })
})
