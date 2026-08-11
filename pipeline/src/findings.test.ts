import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  dropRefutedFindings,
  isDossierRenderFix,
  shouldSalvageFinalization,
  type FindingLike,
} from './findings.ts'

describe('isDossierRenderFix', () => {
  it('accepts fidelity on external or speakeasy only', () => {
    assert.equal(
      isDossierRenderFix({
        dimension: 'fidelity',
        target: 'external',
      }),
      true,
    )
    assert.equal(
      isDossierRenderFix({
        dimension: 'fidelity',
        target: 'speakeasy',
      }),
      true,
    )
    assert.equal(
      isDossierRenderFix({
        dimension: 'fidelity',
        target: 'research',
      }),
      false,
    )
    assert.equal(
      isDossierRenderFix({
        dimension: 'fidelity',
        target: 'setup',
      }),
      false,
    )
    assert.equal(
      isDossierRenderFix({
        dimension: 'achievability',
        target: 'external',
      }),
      false,
    )
  })
})

describe('shouldSalvageFinalization', () => {
  it('salvages only when every blocker is a dossier render fix', () => {
    assert.equal(shouldSalvageFinalization([]), false)
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'external', where: 'opening' },
      ]),
      true,
    )
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'external' },
        { dimension: 'fidelity', target: 'speakeasy' },
      ]),
      true,
    )
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'external' },
        { dimension: 'fidelity', target: 'research' },
      ]),
      false,
    )
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'external' },
        { dimension: 'achievability', target: 'external' },
      ]),
      false,
    )
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'meta' },
      ]),
      false,
    )
  })
})

describe('dropRefutedFindings', () => {
  const record = JSON.parse(
    readFileSync(
      join(import.meta.dirname, 'factory', '__fixtures__', 'review-snowflake.json'),
      'utf8',
    ),
  ) as {
    unresolved: FindingLike[]
    history: Array<{ disputed?: string[] }>
  }
  const disputed = record.history.flatMap((h) => h.disputed ?? [])

  it('drops the two missing-file lint findings the run refuted', () => {
    assert.equal(record.unresolved.length, 5)
    assert.equal(disputed.length, 10)

    const kept = dropRefutedFindings(record.unresolved, disputed)
    assert.equal(kept.length, 3)
    assert.deepEqual(
      kept.map((f) => f.dimension),
      ['fidelity', 'fidelity', 'achievability'],
    )
    assert.ok(!kept.some((f) => /is missing\./.test(f.problem ?? '')))
  })

  it('changes nothing when the run disputed nothing', () => {
    assert.equal(dropRefutedFindings(record.unresolved, []).length, 5)
  })

  it('keeps a missing-file finding that no claim contradicts', () => {
    assert.equal(
      dropRefutedFindings(
        [{ dimension: 'lint', problem: 'meta.yaml.md is missing.' }],
        ['external.md exists'],
      ).length,
      1,
    )
  })

  it('does not use token overlap', () => {
    assert.equal(
      dropRefutedFindings([record.unresolved[0]!], disputed).length,
      1,
    )
  })

  it('drops lint findings only', () => {
    assert.equal(
      dropRefutedFindings(
        [{ dimension: 'fidelity', problem: 'external.md is missing.' }],
        ['external.md exists'],
      ).length,
      1,
    )
  })
})
