import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatScopeCheck, type ScopeRecord } from './format-scope-check.ts'

const fixture = (name: string): ScopeRecord =>
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', '__fixtures__', name), 'utf8'),
  ) as ScopeRecord

/** Count the soft-question checkbox lines that the comment prints. */
const softLines = (md: string): number =>
  md.split('\n').filter((l) => l.startsWith('- [ ] ')).length

describe('formatScopeCheck duplicate suppression', () => {
  it('drops the dossier copies from the real hubspot record', () => {
    const record = fixture('scope-hubspot.json')
    const unanswered = record.scope?.unanswered ?? []
    const soft = record.scope?.soft ?? []
    assert.equal(unanswered.length, 1)
    assert.equal(soft.length, 9)

    const md = formatScopeCheck(record, 'https://example/pr/143', 'x-hubspot.json')

    assert.match(md, /### Decisions needed \(1\)/)
    assert.match(md, /### Soft open questions \(4\) — no pause/)
    assert.equal(softLines(md), 4)

    // The five suppressed entries are the truncated dossier copies.
    assert.doesNotMatch(md, /\*\*Which permission gates the Development workspace/)
    assert.doesNotMatch(md, /\*\*Admin-connects-first mechanics\.\*\*/)
    assert.doesNotMatch(md, /\*\*End-user authorization control labels\.\*\*/)

    // The four survivors are the report paraphrases.
    assert.match(
      md,
      /The admin-connects-first requirement is documented only on the partially stale overview page/,
    )
  })

  it('drops a soft entry that repeats the decision', () => {
    const record = fixture('scope-hubspot.json')
    const md = formatScopeCheck(record, 'https://example/pr/143', 'x-hubspot.json')
    assert.doesNotMatch(md, /New HubSpot Developer Platform" prerequisite/)
  })

  it('keeps all nine soft entries of the real salesforce record', () => {
    const record = fixture('scope-salesforce.json')
    const unanswered = record.scope?.unanswered ?? []
    const soft = record.scope?.soft ?? []
    assert.equal(unanswered.length, 1)
    assert.equal(soft.length, 9)

    const md2 = formatScopeCheck(
      record,
      'https://example/pr/144',
      'x-salesforce.json',
    )

    assert.match(md2, /### Soft open questions \(9\) — no pause/)
    assert.equal(softLines(md2), 9)
  })

  it('hides the soft block when every soft entry repeats the decision', () => {
    const md3 = formatScopeCheck({
      slug: 'box',
      scope: {
        unanswered: [
          {
            index: 1,
            question: 'Which recovery path does the admin use?',
            why_material: 'Changes Writer scope',
          },
        ],
        soft: ['Which recovery path does the admin use?'],
      },
    })
    assert.doesNotMatch(md3, /Soft open questions/)
  })

  it('keeps two different soft entries beside an unrelated decision', () => {
    const md4 = formatScopeCheck({
      slug: 'box',
      scope: {
        unanswered: [
          {
            index: 1,
            question: 'Which recovery path does the admin use?',
            why_material: 'Changes Writer scope',
          },
        ],
        soft: [
          'The console shows no version number for the connector build.',
          'Regional data residency remains undocumented for European tenants.',
        ],
      },
    })
    assert.match(md4, /### Soft open questions \(2\) — no pause/)
    assert.equal(softLines(md4), 2)
  })
})
