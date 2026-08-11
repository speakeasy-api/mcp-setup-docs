import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  evaluateScopeGate,
  extractOpenQuestionsFromResearch,
  mergeOpenQuestions,
} from './scope-gate.ts'

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, '__fixtures__', name), 'utf8')

describe('extractOpenQuestionsFromResearch', () => {
  it('joins a wrapped bullet into one entry', () => {
    const bullets = extractOpenQuestionsFromResearch(
      '## Open questions\n\n- First line of the question\n  and the second line.\n',
    )
    assert.equal(bullets.length, 1)
    assert.deepEqual(bullets, ['First line of the question and the second line.'])
  })

  it('ends a bullet at a blank line', () => {
    const bullets = extractOpenQuestionsFromResearch(
      '## Open questions\n\n- Question one\n  continued.\n\n  Orphan paragraph.\n',
    )
    assert.equal(bullets.length, 1)
    assert.deepEqual(bullets, ['Question one continued.'])
  })

  it('starts a new bullet at the next marker', () => {
    const bullets = extractOpenQuestionsFromResearch(
      '## Open questions\n\n- Question one\n  continued.\n- Question two\n  continued.\n',
    )
    assert.equal(bullets.length, 2)
    assert.deepEqual(bullets, [
      'Question one continued.',
      'Question two continued.',
    ])
  })

  it('ends the section at the next heading', () => {
    const bullets = extractOpenQuestionsFromResearch(
      '## Open questions\n\n- Question one\n  continued.\n\n## Provenance\n\n- Source one\n  continued.\n',
    )
    assert.equal(bullets.length, 1)
    assert.deepEqual(bullets, ['Question one continued.'])
  })

  it('returns nothing for a None. paragraph', () => {
    const bullets = extractOpenQuestionsFromResearch(
      '## Open questions\n\nNone.\n\n## Provenance\n',
    )
    assert.equal(bullets.length, 0)
    assert.deepEqual(bullets, [])
  })

  it('keeps the whole bullet on the real HubSpot dossier', () => {
    const bullets = extractOpenQuestionsFromResearch(
      fixture('hubspot-research-open-questions.md'),
    )
    assert.equal(bullets.length, 5)
    assert.deepEqual(
      bullets.map((b) => b.length),
      [572, 531, 279, 414, 351],
    )
    assert.ok(
      bullets[0]!.startsWith(
        '**Which permission gates the Development workspace / MCP Auth Apps.**',
      ),
    )
    assert.ok(!bullets.some((b) => /\n/.test(b)))
    // The old one-line capture gave 69, 68, 69, 68 and 69 characters.
    assert.ok(bullets.every((b) => b.length > 69))
  })

  it('produces the full form of the strings the old extractor truncated', () => {
    const bullets = extractOpenQuestionsFromResearch(
      fixture('hubspot-research-open-questions.md'),
    )
    const record = JSON.parse(fixture('scope-hubspot.json')) as {
      scope: { soft: string[] }
    }
    assert.equal(record.scope.soft.length, 9)
    for (let i = 0; i < 5; i++) {
      const truncated = record.scope.soft[i + 4]!
      assert.ok(bullets[i]!.startsWith(truncated))
      assert.ok(bullets[i]!.length > truncated.length)
    }
  })
})

describe('mergeOpenQuestions', () => {
  const record = JSON.parse(fixture('scope-hubspot.json')) as {
    scope: { soft: string[]; material: { question: string }[] }
  }
  /** The five entries a real report gave: four soft plus the material one. */
  const fromReport = [
    ...record.scope.soft.slice(0, 4),
    record.scope.material[0]!.question,
  ]
  /** The five whole bullets the dossier gave. */
  const fromDossier = extractOpenQuestionsFromResearch(
    fixture('hubspot-research-open-questions.md'),
  )

  it('collapses two entries with the same text', () => {
    assert.deepEqual(mergeOpenQuestions(['Same question'], ['same question']), [
      'Same question',
    ])
  })

  it('merges every dossier bullet into the report question that says it', () => {
    assert.equal(fromReport.length, 5)
    assert.equal(fromDossier.length, 5)
    assert.equal(mergeOpenQuestions(fromReport, fromDossier).length, 5)
  })

  it('keeps the report text and the report order', () => {
    assert.deepEqual(mergeOpenQuestions(fromReport, fromDossier), fromReport)
  })

  it('keeps the scope gate pause after the merge', () => {
    const merged = mergeOpenQuestions(fromReport, fromDossier)
    const gate = evaluateScopeGate(merged, '')
    assert.equal(gate.material.length, 1)
    assert.equal(gate.soft.length, 4)
    assert.equal(gate.unanswered.length, 1)
    assert.equal(gate.pause, true)
  })

  it('never compares one dossier bullet against another', () => {
    assert.equal(mergeOpenQuestions([], fromDossier).length, 5)
  })

  it('does not use an already merged dossier entry as a match target', () => {
    // The five real dossier bullets score at most 0.1786 against each other,
    // so the test above passes with or without the snapshot. This pair scores
    // 0.8750. A comparison inside one list collapses it to one entry. The
    // snapshot of the report entries keeps both.
    const pair = [fromReport[0]!, fromDossier[0]!]
    assert.equal(mergeOpenQuestions([], pair).length, 2)
  })

  it('does nothing when the dossier gives no questions', () => {
    assert.deepEqual(mergeOpenQuestions(fromReport, []), fromReport)
  })

  it('keeps two different questions apart', () => {
    assert.equal(
      mergeOpenQuestions(
        [
          'X public Developer Console documentation does not publish the exact field labels or final submit-button label in the first-time developer enrollment flow.',
        ],
        [
          'X public documentation says to enter an app name, description, and use case after clicking New App, but does not publish the exact field labels or the final create-button label.',
        ],
      ).length,
      2,
    )
  })
})
