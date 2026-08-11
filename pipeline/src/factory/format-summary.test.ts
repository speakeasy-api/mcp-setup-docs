import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  formatReviewSummary,
  formatScopeSummary,
  type ReviewRecord,
  type ScopeRecord,
} from './format-summary.ts'
import { formatPipelineReview } from './format-pipeline-review.ts'

const reviewFixture = (name: string): ReviewRecord =>
  JSON.parse(
    readFileSync(join(import.meta.dirname, '__fixtures__', name), 'utf8'),
  ) as ReviewRecord

const scopeFixture = (name: string): ScopeRecord =>
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', '__fixtures__', name), 'utf8'),
  ) as ScopeRecord

describe('formatReviewSummary', () => {
  it('summarizes the real unconverged snowflake record', () => {
    const record = reviewFixture('review-snowflake.json')
    const md = formatReviewSummary(
      record,
      'https://example/pr/143',
      'x-snowflake.json',
    )

    assert.match(md, /## Pipeline review \(`snowflake`\)/)
    assert.match(md, /1 render fix, 1 decision, 3 open questions, 2 optional nits\./)
    assert.match(md, /https:\/\/example\/pr\/143/)
    assert.match(md, /Did \*\*not\*\* fully converge/)
  })

  it('stays a summary and never repeats the full comment', () => {
    const record = reviewFixture('review-snowflake.json')
    const md = formatReviewSummary(
      record,
      'https://example/pr/143',
      'x-snowflake.json',
    )

    assert.doesNotMatch(md, /^#### /m)
    assert.doesNotMatch(md, /\*\*Reply with one of:\*\*/)
    assert.doesNotMatch(md, /<details>/)
    assert.ok(md.length < 1200)

    const full = formatPipelineReview(record, '', '', 'x-snowflake.json')
    assert.ok(
      md.length <= full.length / 4,
      `summary ${md.length} chars, full ${full.length} chars`,
    )
  })

  it('uses the singular and the plural forms', () => {
    const record: ReviewRecord = {
      slug: 'box',
      status: 'unconverged',
      rounds: 2,
      unresolved: [
        {
          dimension: 'fidelity',
          target: 'external',
          where: 'external.md#create-app',
          problem: 'The Dossier names a different button.',
          suggestion: 'Use the Dossier wording.',
        },
        {
          dimension: 'fidelity',
          target: 'speakeasy',
          where: 'speakeasy.md#add-server',
          problem: 'The Dossier names a different field.',
          suggestion: 'Use the Dossier wording.',
        },
        {
          dimension: 'fidelity',
          target: 'research',
          where: 'research.md#scopes',
          problem: 'The scope list is not verified.',
          suggestion: 'Verify the scope list.',
        },
        {
          dimension: 'achievability',
          target: 'meta',
          where: 'meta.yaml#persona',
          problem: 'A cold reader cannot find the next step.',
          suggestion: 'Name the next step.',
        },
      ],
      open_questions: ['Which plan includes the connector?'],
      nits: ['Shorten the intro sentence.'],
    }

    const md = formatReviewSummary(record, 'https://example/pr/9')
    assert.match(md, /2 render fixes, 2 decisions, 1 open question, 1 optional nit\./)
  })

  it('reports the empty record and still prints the link', () => {
    const record: ReviewRecord = {
      slug: 'box',
      status: 'converged',
      rounds: 1,
      unresolved: [],
      open_questions: [],
      nits: [],
    }

    const md = formatReviewSummary(record, 'https://example/pr/9')
    assert.match(md, /No blockers, open questions or nits\./)
    assert.match(md, /\*\*Full detail:\*\* https:\/\/example\/pr\/9/)
  })

  it('agrees with the counts that the full formatter prints', () => {
    const record = reviewFixture('review-snowflake.json')
    const full = formatPipelineReview(record, '', '', 'x.json')
    const md = formatReviewSummary(record, 'https://example/pr/143')

    const renderFixes = full.match(/Render fixes \((\d+)\)/)
    const decisions = full.match(/Decisions needed \((\d+)\)/)
    assert.ok(renderFixes, 'the full comment prints a render-fix count')
    assert.ok(decisions, 'the full comment prints a decision count')

    const n = Number(renderFixes[1])
    const m = Number(decisions[1])
    // Bound both ends of the number. Without the leading `\b` a summary that
    // said `11 render fixes` would match a full comment that said 1.
    assert.match(md, new RegExp(`\\b${n} render fix(es)?\\b`))
    assert.match(md, new RegExp(`\\b${m} decision(s)?\\b`))
  })
})

describe('formatScopeSummary', () => {
  it('summarizes the real hubspot scope record with the deduplicated count', () => {
    const record = scopeFixture('scope-hubspot.json')
    const md = formatScopeSummary(
      record,
      'https://example/pr/143',
      'x-hubspot.json',
    )

    assert.match(md, /## Scope check \(`hubspot`\)/)
    // 4, not 9. The count comes from the shared deduplication helper.
    assert.match(md, /1 decision, 4 soft questions\./)
    assert.match(md, /https:\/\/example\/pr\/143/)
  })
})
