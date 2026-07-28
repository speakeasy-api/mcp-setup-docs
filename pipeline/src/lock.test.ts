import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  digestGuideFile,
  missingResearchOutputs,
} from './lock.ts'

function tempGuide(): { root: string; guideDir: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'lock-research-'))
  const guideDir = join(root, 'guides', 'snowflake')
  mkdirSync(guideDir, { recursive: true })
  return {
    root,
    guideDir,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

describe('missingResearchOutputs', () => {
  it('lists both files when the guide dir is empty', () => {
    const { guideDir, cleanup } = tempGuide()
    try {
      assert.deepEqual(missingResearchOutputs(guideDir), [
        'research.md',
        'meta.yaml',
      ])
    } finally {
      cleanup()
    }
  })

  it('lists only the missing file when one exists', () => {
    const { guideDir, cleanup } = tempGuide()
    try {
      writeFileSync(join(guideDir, 'research.md'), '# dossier\n')
      assert.deepEqual(missingResearchOutputs(guideDir), ['meta.yaml'])
    } finally {
      cleanup()
    }
  })

  it('returns empty when research.md and meta.yaml exist', () => {
    const { guideDir, cleanup } = tempGuide()
    try {
      writeFileSync(join(guideDir, 'research.md'), '# dossier\n')
      writeFileSync(join(guideDir, 'meta.yaml'), 'provider: snowflake\n')
      assert.deepEqual(missingResearchOutputs(guideDir), [])
    } finally {
      cleanup()
    }
  })
})

describe('digestGuideFile missing outputs', () => {
  it('throws a clear error instead of raw ENOENT when research.md is missing', () => {
    const { guideDir, cleanup } = tempGuide()
    try {
      writeFileSync(join(guideDir, 'meta.yaml'), 'provider: snowflake\n')
      assert.throws(
        () => digestGuideFile(guideDir, 'research.md'),
        /missing required guide file: research\.md/
      )
    } finally {
      cleanup()
    }
  })
})
