import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatScopeCheck } from './format-scope-check.ts'
import { formatPipelineReview, partitionFindings } from './format-pipeline-review.ts'

describe('formatScopeCheck', () => {
  it('renders structured unanswered decisions', () => {
    const md = formatScopeCheck(
      {
        slug: 'box',
        scope: {
          unanswered: [
            {
              index: 1,
              question: 'Which recovery path?',
              why_material: 'Changes Writer scope',
            },
          ],
          soft: ['UI label unknown'],
        },
      },
      'https://example/pr/1',
      'retro/runs/x-box.json',
    )
    assert.match(md, /## Scope check \(`box`\)/)
    assert.match(md, /Decision 1: verified/)
    assert.match(md, /Soft open questions/)
    assert.match(md, /Draft PR \(research only\)/)
    assert.match(md, /x-box\.json/)
  })
})

describe('partitionFindings', () => {
  it('dedupes gate findings preferring fidelity', () => {
    const { decisions, legacy } = partitionFindings([
      {
        dimension: 'achievability',
        target: 'external',
        where: 'step #foo',
        problem: 'a',
      },
      {
        dimension: 'fidelity',
        target: 'external',
        where: 'step #foo',
        problem: 'f',
      },
      {
        dimension: 'voice',
        target: 'external',
        where: 'elsewhere',
        problem: 'v',
      },
    ])
    assert.equal(decisions.length, 1)
    assert.equal(decisions[0]!.dimension, 'fidelity')
    assert.equal(legacy.length, 1)
    assert.equal(legacy[0]!.dimension, 'voice')
  })
})

describe('formatPipelineReview', () => {
  it('renders converged outcome and decisions', () => {
    const md = formatPipelineReview(
      {
        slug: 'box',
        status: 'converged',
        rounds: 1,
        unresolved: [
          {
            dimension: 'fidelity',
            target: 'research',
            where: 'auth #copy-creds',
            problem: 'missing secret name',
            suggestion: 'name the field',
          },
        ],
        open_questions: ['What is the exact button label?'],
        nits: ['typo in intro'],
      },
      'https://example/pr/2',
      '',
      'run.json',
    )
    assert.match(md, /## Pipeline review \(`box`\)/)
    assert.match(md, /Reviewers passed/)
    assert.match(md, /Decisions needed \(1\)/)
    assert.match(md, /Open questions \(1\)/)
    assert.match(md, /Optional nits/)
    assert.match(md, /How to retry/)
  })
})
