/**
 * Short issue-comment bodies for the factory.
 *
 * Today the pipeline posts the same long text twice: once in the pull request
 * body (`cmd-pr.ts`) and once as an issue comment (`cmd-comments.ts`). These
 * two functions replace the issue-comment copy with a summary and a link.
 *
 * Disagreement with design section 5.5: 5.5 asks to reduce **both** copies to
 * a summary plus a link. Only the issue comment can shrink. `cmd-pr.ts` calls
 * the full formatter with an empty `prUrl`, because the same call creates the
 * pull request, so at that moment there is nothing to link to. If both copies
 * shrink, the detail exists nowhere. The pull request body stays the canonical
 * home for the detail. Do not shrink it.
 *
 * The counts come from the same helpers as the full formatter. Do not
 * re-implement them here. If the two paths use different helpers, the summary
 * shows a different number than the pull request body.
 */

import { basename } from 'node:path'
import { dropRefutedFindings } from '../findings.ts'
import {
  partitionFindings,
  type ReviewRecord,
} from './format-pipeline-review.ts'
import {
  decisionQuestions,
  dedupeSoftQuestions,
  type ScopeRecord,
} from './format-scope-check.ts'

export type { ReviewRecord, ScopeRecord }

type CountTerm = {
  n: number
  /** The word to use when the count is 1. */
  one: string
  /** The word to use for every other count. */
  many: string
}

/**
 * One sentence that lists each count. Omit a term whose count is 0.
 * Use `emptyText` when every count is 0.
 */
function countsSentence(terms: CountTerm[], emptyText: string): string {
  const said = terms
    .filter((t) => t.n > 0)
    .map((t) => `${t.n} ${t.n === 1 ? t.one : t.many}`)
  if (said.length === 0) return emptyText
  return `${said.join(', ')}.`
}

function sourceLine(lines: string[], recordPath: string): void {
  if (!recordPath) return
  lines.push('')
  lines.push(`_Source: \`${basename(recordPath)}\`_`)
}

/**
 * A short Pipeline review comment. It gives the outcome, the counts and a link
 * to the pull request body, which holds the numbered findings.
 */
export function formatReviewSummary(
  record: ReviewRecord,
  prUrl: string,
  recordPath = '',
): string {
  const status = record.status ?? 'unknown'
  const rounds = record.rounds ?? '?'
  const slug = record.slug ?? '?'

  // Same helpers and same order as `formatPipelineReview`. Drop the refuted
  // findings first, then partition. A different order gives a different count
  // than the pull request body.
  const disputed = (record.history ?? []).flatMap((h) => h.disputed ?? [])
  const { renderFixes, decisions, legacy } = partitionFindings(
    dropRefutedFindings(record.unresolved ?? [], disputed),
  )
  const openQuestions = (record.open_questions ?? []).length
  const nits = (record.nits ?? []).length + legacy.length

  const lines: string[] = []
  lines.push(`## Pipeline review (\`${slug}\`)`)
  lines.push('')
  if (status === 'converged') {
    lines.push(
      `**Outcome:** Reviewers passed after ${rounds} round(s). Read the open questions in the pull request body before you merge.`,
    )
  } else if (status === 'unconverged') {
    lines.push(
      `**Outcome:** Did **not** fully converge after ${rounds} review round(s). The draft can still be useful. Decide on each item in the pull request body, then reply here.`,
    )
  } else {
    lines.push(`**Outcome:** \`${status}\` after ${rounds} review round(s).`)
  }
  lines.push('')
  lines.push(`**Full detail:** ${prUrl}`)
  lines.push('')
  lines.push(
    countsSentence(
      [
        { n: renderFixes.length, one: 'render fix', many: 'render fixes' },
        { n: decisions.length, one: 'decision', many: 'decisions' },
        { n: openQuestions, one: 'open question', many: 'open questions' },
        { n: nits, one: 'optional nit', many: 'optional nits' },
      ],
      'No blockers, open questions or nits.',
    ),
  )
  lines.push('')
  lines.push(
    'Reply on **this issue** with the `Decision N: …` lines from the pull request body, then re-add the `guide:draft` label.',
  )
  sourceLine(lines, recordPath)
  return lines.join('\n')
}

/**
 * A short Scope check comment for the paused path. The draft pull request
 * holds the research and the numbered decisions.
 */
export function formatScopeSummary(
  record: ScopeRecord,
  prUrl: string,
  recordPath = '',
): string {
  const slug = record.slug ?? '?'
  // The soft count must match the full comment, so use the shared helper.
  const decisions = decisionQuestions(record).length
  const soft = dedupeSoftQuestions(record).length

  const lines: string[] = []
  lines.push(`## Scope check (\`${slug}\`)`)
  lines.push('')
  lines.push(
    'Research finished with **material open questions**. These questions change what the guide must document. The draft stays paused until you answer them.',
  )
  lines.push('')
  lines.push(`**Draft PR (research only):** ${prUrl}`)
  lines.push('')
  lines.push(
    countsSentence(
      [
        { n: decisions, one: 'decision', many: 'decisions' },
        { n: soft, one: 'soft question', many: 'soft questions' },
      ],
      'No decisions or soft questions.',
    ),
  )
  lines.push('')
  lines.push(
    'Reply on **this issue** with the `Decision N: …` lines from the pull request body, then re-add the `guide:draft` label.',
  )
  sourceLine(lines, recordPath)
  return lines.join('\n')
}
