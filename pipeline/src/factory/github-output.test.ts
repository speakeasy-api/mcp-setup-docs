import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setOutput, setMultilineOutput } from './github-output.ts'

describe('setOutput', () => {
  it('rejects CR/LF in scalar values', () => {
    assert.throws(() => setOutput('slug', 'a\nb'), /must not contain CR\/LF/)
    assert.throws(() => setOutput('slug', 'a\rb'), /must not contain CR\/LF/)
  })

  it('writes key=value to GITHUB_OUTPUT', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gha-out-'))
    const path = join(dir, 'out')
    const prev = process.env.GITHUB_OUTPUT
    try {
      process.env.GITHUB_OUTPUT = path
      setOutput('slug', 'box')
      assert.equal(readFileSync(path, 'utf8'), 'slug=box\n')
    } finally {
      if (prev === undefined) delete process.env.GITHUB_OUTPUT
      else process.env.GITHUB_OUTPUT = prev
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('setMultilineOutput', () => {
  it('uses a random delimiter not present in the value', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gha-out-'))
    const path = join(dir, 'out')
    const prev = process.env.GITHUB_OUTPUT
    try {
      process.env.GITHUB_OUTPUT = path
      const notes = 'line1\nEOF\nline3'
      setMultilineOutput('notes', notes)
      const body = readFileSync(path, 'utf8')
      const m = body.match(/^notes<<(\S+)\n/)
      assert.ok(m, 'expected delimiter header')
      const delim = m[1]!
      assert.notEqual(delim, 'EOF')
      assert.ok(!notes.includes(delim))
      assert.ok(body.endsWith(`\n${delim}\n`))
      assert.ok(body.includes(notes))
    } finally {
      if (prev === undefined) delete process.env.GITHUB_OUTPUT
      else process.env.GITHUB_OUTPUT = prev
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
