import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatScopeCheck } from './format-scope-check.ts'
import {
  formatPipelineReview,
  partitionFindings,
  type ReviewRecord,
} from './format-pipeline-review.ts'

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
    const { renderFixes, decisions, legacy } = partitionFindings([
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
    assert.equal(renderFixes.length, 1)
    assert.equal(renderFixes[0]!.dimension, 'fidelity')
    assert.equal(decisions.length, 0)
    assert.equal(legacy.length, 1)
    assert.equal(legacy[0]!.dimension, 'voice')
  })

  it('splits dossier render fixes from research decisions', () => {
    const { renderFixes, decisions } = partitionFindings([
      {
        dimension: 'fidelity',
        target: 'external',
        where: 'opening prerequisites',
        problem: 'roles only; permission name omitted',
        suggestion: 'state serviceusage.services.enable, normally via those roles',
      },
      {
        dimension: 'fidelity',
        target: 'research',
        where: 'auth #copy-creds',
        problem: 'missing secret name',
        suggestion: 'name the field',
      },
      {
        dimension: 'achievability',
        target: 'external',
        where: 'step #recover',
        problem: 'recovery path unclear',
        suggestion: 'name the control or hedge',
      },
    ])
    assert.equal(renderFixes.length, 1)
    assert.equal(renderFixes[0]!.target, 'external')
    assert.equal(decisions.length, 2)
  })
})

describe('formatPipelineReview', () => {
  it('renders render-fix apply UX separately from research decisions', () => {
    const md = formatPipelineReview(
      {
        slug: 'google-calendar',
        status: 'unconverged',
        rounds: 3,
        unresolved: [
          {
            dimension: 'fidelity',
            target: 'external',
            where: 'opening prerequisites',
            problem:
              'The guide says enabling requires Service Usage Admin or Owner, while the Dossier names serviceusage.services.enable.',
            suggestion:
              'State that enabling requires serviceusage.services.enable, normally provided by Service Usage Admin or Owner.',
          },
          {
            dimension: 'fidelity',
            target: 'research',
            where: 'auth #copy-creds',
            problem: 'missing secret name',
            suggestion: 'name the field',
          },
        ],
        open_questions: ['What is the exact button label?'],
        nits: [],
      },
      '',
      '',
      'run.json',
    )
    assert.match(md, /## Pipeline review \(`google-calendar`\)/)
    assert.match(md, /Render fixes \(1\)/)
    assert.match(md, /Dossier already has the wording/)
    assert.match(md, /Decision 1: apply/)
    assert.doesNotMatch(md, /Decision 1: verified/)
    assert.match(md, /Decisions needed \(1\)/)
    assert.match(md, /Decision 2: verified/)
    assert.doesNotMatch(md, /the fact may already be in research/)
  })

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

  it('does not ask about a finding the same run refuted', () => {
    const record = JSON.parse(
      readFileSync(
        join(import.meta.dirname, '__fixtures__', 'review-snowflake.json'),
        'utf8',
      ),
    ) as ReviewRecord
    const md = formatPipelineReview(record, '', '', 'run.json')
    assert.match(md, /Render fixes \(1\)/)
    assert.match(md, /Decisions needed \(1\)/)
    assert.doesNotMatch(md, /is missing\./)
    assert.match(md, /Open questions \(3\)/)
  })

  /** Read a committed run record that the fixtures directory copies verbatim. */
  function loadFixture(name: string): ReviewRecord {
    return JSON.parse(
      readFileSync(join(import.meta.dirname, '__fixtures__', name), 'utf8'),
    ) as ReviewRecord
  }

  /** Collect the bullet lines between the nit `<details>` and its `</details>`. */
  function nitBullets(md: string): string[] {
    const start = md.indexOf('<details><summary>Optional nits')
    if (start === -1) return []
    const end = md.indexOf('</details>', start)
    assert.notEqual(end, -1, 'the nit <details> element must be closed')
    return md
      .slice(start, end)
      .split('\n')
      .filter((line) => line.startsWith('- '))
  }

  it('collapses the largest real nit list into one details element', () => {
    const record = loadFixture('review-box-nits.json')
    assert.equal(record.nits!.length, 9)
    const md = formatPipelineReview(record, '', '', 'run.json')
    assert.match(md, /<details><summary>Optional nits \(9\)<\/summary>/)
    // `guideDir` is empty, so the guide-text block never renders. One element only.
    assert.equal(md.split('<details>').length - 1, 1)
    assert.equal(md.split('</details>').length - 1, 1)
    assert.equal(nitBullets(md).length, 9)
  })

  it('collapses a small real nit list', () => {
    const record = loadFixture('review-snowflake.json')
    assert.equal(record.nits!.length, 2)
    const md = formatPipelineReview(record, '', '', 'run.json')
    assert.match(md, /<details><summary>Optional nits \(2\)<\/summary>/)
  })

  it('keeps legacy blocker text readable inside the collapsed list', () => {
    const record = loadFixture('review-gbq-legacy.json')
    assert.equal(record.nits?.length ?? 0, 0)
    assert.equal(record.unresolved!.length, 2)
    for (const f of record.unresolved!) {
      // `FindingLike` does not declare `severity`, but the record carries it.
      assert.equal((f as Record<string, unknown>).severity, 'blocker')
      assert.equal(f.dimension, undefined)
    }
    const md = formatPipelineReview(record, '', '', 'run.json')
    assert.match(md, /<details><summary>Optional nits \(2\)<\/summary>/)
    // The finding text survives the collapse; nothing is dropped.
    assert.match(md, /configure-oauth-consent/)
    // Records today's wrong behaviour. `isGate` misses a blocker that has no
    // `dimension`, so these blockers never reach the decision list. A later fix
    // to `isGate` shows up here as a test change.
    assert.doesNotMatch(md, /Decisions needed/)
  })

  it('renders no nit block when there are no nits', () => {
    const md = formatPipelineReview(
      { slug: 'box', status: 'converged', rounds: 1, unresolved: [], nits: [] },
      '',
      '',
      'run.json',
    )
    assert.doesNotMatch(md, /Optional nits/)
    assert.doesNotMatch(md, /<details>/)
  })

  it('falls back to a count only above the cap', () => {
    const nits = Array.from({ length: 13 }, (_, i) => `nit ${i + 1}`)
    const md = formatPipelineReview(
      { slug: 'box', status: 'converged', rounds: 1, unresolved: [], nits },
      '',
      '',
      'run.json',
    )
    assert.match(
      md,
      /_13 optional nits — see the run record in the PR if you care\._/,
    )
    assert.doesNotMatch(md, /<details><summary>Optional nits/)
    assert.equal(
      md.split('\n').filter((line) => line.startsWith('- ')).length,
      0,
    )
  })

  it('puts 12 nits in the details form and 13 in the count-only form', () => {
    const render = (count: number) =>
      formatPipelineReview(
        {
          slug: 'box',
          status: 'converged',
          rounds: 1,
          unresolved: [],
          nits: Array.from({ length: count }, (_, i) => `nit ${i + 1}`),
        },
        '',
        '',
        'run.json',
      )
    const twelve = render(12)
    assert.match(twelve, /<details><summary>Optional nits \(12\)<\/summary>/)
    assert.equal(nitBullets(twelve).length, 12)
    const thirteen = render(13)
    assert.doesNotMatch(thirteen, /<details><summary>Optional nits/)
    assert.match(thirteen, /_13 optional nits/)
  })
})
