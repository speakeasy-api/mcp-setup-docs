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

  function thread(...comments: string[]): string {
    return comments.join('\n\n---\n\n')
  }

  it('cold start → full', () => {
    const r = resolveResearchMode({
      resume: false,
      guideDir: dir,
      notes: 'Decision 1: drop this branch',
    })
    assert.equal(r.mode, 'full')
  })

  it('resume + drop/omit-only (no freeform) → skip', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: drop this branch\nDecision 2: omit this branch',
      commentThread: thread(
        '## Scope check (`box`)',
        'Decision 1: drop this branch\nDecision 2: omit this branch'
      ),
      priorStatus: 'awaiting_scope',
    })
    assert.equal(r.mode, 'skip')
    assert.equal(hasResearchArtifacts(dir), true)
  })

  it('resume + bare hedge → patch (not skip)', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: hedge',
      commentThread: thread('## Pipeline review (`snowflake`)', 'Decision 1: hedge'),
    })
    assert.equal(r.mode, 'patch')
  })

  it('resume + verified fact → patch', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes:
        'Decision 1: drop this branch\nDecision 2: verified — button is Reset',
      commentThread: thread(
        '## Pipeline review (`box`)',
        'Decision 1: drop this branch\nDecision 2: verified — button is Reset'
      ),
    })
    assert.equal(r.mode, 'patch')
  })

  it('resume + freeform catalog ignore → patch', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Snowflake MCP; distill paraphrase of whole thread…',
      commentThread: thread(
        '## Pipeline review (`snowflake`)',
        'For this guide, we should ignore the catalog MCP server. We should act as if it doesn\'t exist.'
      ),
    })
    assert.equal(r.mode, 'patch')
    assert.match(r.reason, /freeform/)
  })

  it('resume + numbered dash reply → patch', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'distill notes',
      commentThread: thread(
        '## Pipeline review (`snowflake`)',
        '1 - ignore the catalog mcp server. Follow the docs for this mcp server.'
      ),
    })
    assert.equal(r.mode, 'patch')
  })

  it('resume + unnumbered Decision: → patch', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'distill notes',
      commentThread: thread(
        '## Pipeline review (`snowflake`)',
        'Decision: ignore the Speakeasy MCP Catalog entry entirely for this guide.'
      ),
    })
    assert.equal(r.mode, 'patch')
  })

  it('never skip when drop Decision coexists with freeform correction', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: drop this branch',
      commentThread: thread(
        '## Pipeline review (`snowflake`)',
        'Decision 1: drop this branch\n\nFor this guide, we should ignore the catalog MCP server entirely.'
      ),
    })
    assert.equal(r.mode, 'patch')
  })

  it('stale drop in older comment does not skip over new freeform', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: drop this branch\nignore catalog',
      commentThread: thread(
        '## Pipeline review (`snowflake`)',
        'Decision 1: drop this branch',
        '## Pipeline review (`snowflake`)\n\nmore review',
        'For this guide, ignore the catalog MCP server.'
      ),
    })
    assert.equal(r.mode, 'patch')
    assert.equal(r.decisions.length, 0) // recent has freeform only
  })

  it('force re-research → full', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: drop this branch\nPlease re-research; docs moved',
      commentThread: thread(
        '## Scope check (`box`)',
        'Decision 1: drop this branch\nPlease re-research; docs moved'
      ),
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

  it('resume with only thanks → full (fail closed)', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'thanks',
      commentThread: thread('## Pipeline review (`box`)', 'thanks'),
    })
    assert.equal(r.mode, 'full')
  })

  it('resume with no new comments → full (fail closed)', () => {
    const r = resolveResearchMode({
      resume: true,
      guideDir: dir,
      notes: 'Decision 1: drop this branch',
      commentThread: thread('## Pipeline review (`box`)'),
    })
    assert.equal(r.mode, 'full')
  })
})
