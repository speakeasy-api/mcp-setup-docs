import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildDraftInputs,
  canSkipStep,
  digestGuideFile,
  inputDigest,
  missingDraftOutputs,
  missingGuideFiles,
  missingResearchOutputs,
  normalizeResearchMdForDigest,
  rebaselineLockResearchArtifacts,
  researchNotesMatchLock,
  snapshotStableDigests,
  stableDigestFile,
  stableDigestResearchMd,
  stripVolatile,
  type PipelineLock,
  type RenderedPrompt,
  type StepRecord,
} from './lock.ts'

/** Stands in for a workflow-rendered prompt where the digest is not the point. */
const STUB_PROMPT: RenderedPrompt = {
  text: 'You are the Writer Agent.\nAssignment: <slug>\n',
  volatile: ['Assignment: <slug>'],
}

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

describe('missingGuideFiles', () => {
  it('filters to the requested names that are absent', () => {
    const { guideDir, cleanup } = tempGuide()
    try {
      writeFileSync(join(guideDir, 'research.md'), '# dossier\n')
      assert.deepEqual(
        missingGuideFiles(guideDir, ['research.md', 'external.md']),
        ['external.md']
      )
    } finally {
      cleanup()
    }
  })
})

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

describe('missingDraftOutputs', () => {
  it('lists external.md and speakeasy.md when absent', () => {
    const { guideDir, cleanup } = tempGuide()
    try {
      assert.deepEqual(missingDraftOutputs(guideDir), [
        'external.md',
        'speakeasy.md',
      ])
    } finally {
      cleanup()
    }
  })

  it('returns empty when both setup files exist', () => {
    const { guideDir, cleanup } = tempGuide()
    try {
      writeFileSync(join(guideDir, 'external.md'), '# ext\n')
      writeFileSync(join(guideDir, 'speakeasy.md'), '# sp\n')
      assert.deepEqual(missingDraftOutputs(guideDir), [])
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


describe('normalizeResearchMdForDigest', () => {
  it('normalizes researched_at and ISO-8601-Z stamps but keeps bare dates', () => {
    const a = [
      '---',
      'researched_at: "2026-07-27T16:51:38Z"',
      '---',
      '',
      'Available since 2026-07.',
      'Source — observed `2026-07-27T16:51:38Z`. Backs the URL.',
      '',
    ].join('\n')
    const b = [
      '---',
      'researched_at: "2026-07-29T12:00:00Z"',
      '---',
      '',
      'Available since 2026-07.',
      'Source — observed `2026-07-29T12:00:00Z`. Backs the URL.',
      '',
    ].join('\n')
    assert.equal(
      normalizeResearchMdForDigest(a),
      normalizeResearchMdForDigest(b)
    )
    assert.match(normalizeResearchMdForDigest(a), /Available since 2026-07\./)
    assert.doesNotMatch(normalizeResearchMdForDigest(a), /2026-07-27T/)
  })

  it('treats substantive body changes as digest-different', () => {
    const a = '---\nresearched_at: 2026-07-27T16:51:38Z\n---\n\nUse OAuth.\n'
    const b = '---\nresearched_at: 2026-07-27T16:51:38Z\n---\n\nUse PAT.\n'
    assert.notEqual(stableDigestResearchMd(a), stableDigestResearchMd(b))
  })
})

describe('stableDigestFile research.md', () => {
  it('ignores stamp-only churn on disk', () => {
    const { guideDir, cleanup } = tempGuide()
    try {
      const path = join(guideDir, 'research.md')
      writeFileSync(
        path,
        '---\nresearched_at: 2026-07-27T16:51:38Z\n---\n\nHello.\n'
      )
      const d1 = stableDigestFile(path, 'research.md')
      writeFileSync(
        path,
        '---\nresearched_at: 2026-07-29T01:02:03Z\n---\n\nHello.\n'
      )
      const d2 = stableDigestFile(path, 'research.md')
      assert.equal(d1, d2)
    } finally {
      cleanup()
    }
  })
})

describe('snapshotStableDigests research.md', () => {
  it('uses the same stamp normalization as on-disk digests', () => {
    const content =
      '---\nresearched_at: 2026-07-27T16:51:38Z\n---\n\nBody.\n'
    const snap = snapshotStableDigests({ 'research.md': content })
    assert.equal(snap['research.md'], stableDigestResearchMd(content))
  })
})

describe('researchNotesMatchLock', () => {
  it('returns false when research step is missing', () => {
    const lock: PipelineLock = {
      schema_version: 1,
      slug: 'x',
      persona: 'it-admin',
      updated_at: '2026-07-29T00:00:00Z',
      steps: {},
    }
    assert.equal(researchNotesMatchLock(lock, 'notes'), false)
    assert.equal(researchNotesMatchLock(null, 'notes'), false)
  })

  it('compares params.notes exactly', () => {
    const research: StepRecord = {
      input_digest: 'sha256:' + 'a'.repeat(64),
      inputs: {
        model: 'm',
        prompt_digest: 'sha256:' + 'b'.repeat(64),
        reading_list: [],
        artifacts: [],
        params: { provider: 'x', notes: 'Decision 1: OAuth' },
      },
      outputs: [],
      completed_at: '2026-07-29T00:00:00Z',
    }
    const lock: PipelineLock = {
      schema_version: 1,
      slug: 'x',
      persona: 'it-admin',
      updated_at: '2026-07-29T00:00:00Z',
      steps: { research },
    }
    assert.equal(researchNotesMatchLock(lock, 'Decision 1: OAuth'), true)
    assert.equal(researchNotesMatchLock(lock, 'Decision 1: DCR'), false)
  })
})

describe('rebaselineLockResearchArtifacts', () => {
  it('updates research/draft digests so draft can skip after soft wording change', () => {
    const { root, guideDir, cleanup } = tempGuide()
    try {
      const doctrine = join(root, 'doctrine')
      mkdirSync(join(doctrine, 'roles'), { recursive: true })
      mkdirSync(join(doctrine, 'personas'), { recursive: true })
      for (const rel of [
        'glossary.md',
        'shared.md',
        'roles/writer.md',
        'personas/it-admin.md',
      ]) {
        writeFileSync(join(doctrine, rel), '# stub\n')
      }

      writeFileSync(
        join(guideDir, 'research.md'),
        '---\nresearched_at: 2026-07-27T16:51:38Z\n---\n\nFacts.\n'
      )
      writeFileSync(join(guideDir, 'meta.yaml'), 'provider: snowflake\n')
      writeFileSync(join(guideDir, 'external.md'), '# External\n')
      writeFileSync(join(guideDir, 'speakeasy.md'), '# Speakeasy\n')

      const draftInputs = buildDraftInputs({
        model: 'test-model',
        repoRoot: root,
        guideDir,
        provider: 'snowflake',
        notes: 'same-notes',
        persona: 'it-admin',
        prompt: STUB_PROMPT,
      })
      const researchOut = [
        digestGuideFile(guideDir, 'research.md'),
        digestGuideFile(guideDir, 'meta.yaml'),
      ]
      const draftOut = [
        digestGuideFile(guideDir, 'external.md'),
        digestGuideFile(guideDir, 'speakeasy.md'),
      ]

      const lock: PipelineLock = {
        schema_version: 1,
        slug: 'snowflake',
        persona: 'it-admin',
        updated_at: '2026-07-27T16:51:38Z',
        steps: {
          research: {
            input_digest: 'sha256:' + 'c'.repeat(64),
            inputs: {
              model: 'test-model',
              prompt_digest: 'sha256:' + 'd'.repeat(64),
              reading_list: [],
              artifacts: [],
              params: { provider: 'snowflake', notes: 'same-notes' },
            },
            outputs: researchOut,
            completed_at: '2026-07-27T16:51:38Z',
          },
          draft: {
            input_digest: inputDigest(draftInputs),
            inputs: draftInputs,
            outputs: draftOut,
            completed_at: '2026-07-27T16:51:38Z',
          },
        },
      }

      writeFileSync(
        join(guideDir, 'research.md'),
        '---\nresearched_at: 2026-07-29T12:00:00Z\n---\n\nFacts (clarified).\n'
      )
      const softInputs = buildDraftInputs({
        model: 'test-model',
        repoRoot: root,
        guideDir,
        provider: 'snowflake',
        notes: 'same-notes',
        persona: 'it-admin',
        prompt: STUB_PROMPT,
      })
      assert.notEqual(inputDigest(softInputs), lock.steps.draft!.input_digest)
      assert.equal(
        canSkipStep(lock, 'snowflake', 'draft', softInputs, guideDir, {
          force: false,
          invalidated: false,
          researchUnchanged: true,
        }),
        false
      )

      const rebased = rebaselineLockResearchArtifacts(lock, guideDir)
      assert.equal(
        canSkipStep(rebased, 'snowflake', 'draft', softInputs, guideDir, {
          force: false,
          invalidated: false,
          researchUnchanged: true,
        }),
        true
      )
      assert.equal(
        rebased.steps.draft!.outputs[0]!.digest,
        lock.steps.draft!.outputs[0]!.digest
      )
      assert.equal(researchNotesMatchLock(rebased, 'different-notes'), false)
    } finally {
      cleanup()
    }
  })
})
