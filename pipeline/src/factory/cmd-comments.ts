import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { issueNumber, runnerTemp, githubWorkspace } from './env.ts'
import { issueCommentFile } from './gh.ts'
import { addBlockedLabel } from './labels.ts'
import { readFailureReason } from './failure-reason.ts'
import { formatScopeCheck, type ScopeRecord } from './format-scope-check.ts'
import {
  formatPipelineReview,
  type ReviewRecord,
} from './format-pipeline-review.ts'
import { newestRunRecord } from './run-record.ts'

export function runCommentResolved(): void {
  const slug = process.env.SLUG || ''
  const provider = process.env.PROVIDER || ''
  const persona = process.env.PERSONA || 'it-admin'
  const notes = process.env.NOTES || ''
  const resume = process.env.RESUME === 'true'
  const resumePrUrl = process.env.RESUME_PR_URL || ''
  const resumeBranch = process.env.RESUME_BRANCH || ''
  const researchMode = process.env.RESEARCH_MODE || 'full'
  const researchModeLabel =
    process.env.RESEARCH_MODE_LABEL || researchMode
  const researchModeReason = process.env.RESEARCH_MODE_REASON || ''

  const lines: string[] = []
  if (resume) {
    if (resumePrUrl) {
      lines.push(`Resuming on existing factory PR: ${resumePrUrl}`)
    } else {
      lines.push(
        `Resuming on factory branch \`${resumeBranch}\` (no open PR yet — will open one after this run).`,
      )
    }
    lines.push('')
    lines.push(`Resolved as \`${slug}\` (${provider}), persona \`${persona}\`.`)
    lines.push(
      `Prior \`guides/${slug}/\` stays on the branch — research/draft will revise from those artifacts (lock skips when inputs match).`,
    )
  } else {
    lines.push(`Resolved as \`${slug}\` (${provider}), persona \`${persona}\`.`)
  }
  lines.push('')
  lines.push(
    `**Research mode:** \`${researchMode}\` — ${researchModeLabel}`,
  )
  if (researchModeReason) {
    lines.push(`_${researchModeReason}_`)
  }
  if (notes) {
    lines.push('')
    lines.push('Notes handed to the pipeline:')
    lines.push('')
    lines.push(`> ${notes}`)
  }
  lines.push('')
  lines.push('Starting `draft-guide`…')

  const bodyFile = join(runnerTemp(), 'resolved-comment.md')
  writeFileSync(bodyFile, lines.join('\n'))
  issueCommentFile(issueNumber(), bodyFile)
}

export function runCommentReview(): void {
  const prUrl = process.env.PR_URL || ''
  const outcome = process.env.OUTCOME || ''
  const slug = process.env.SLUG || ''
  const workspace = githubWorkspace()
  const recordPath = join(runnerTemp(), 'run-record.json')
  const bodyFile = join(runnerTemp(), 'pipeline-review-comment.md')

  if (outcome === 'awaiting_scope') {
    let body: string
    if (existsSync(recordPath)) {
      const record = JSON.parse(readFileSync(recordPath, 'utf8')) as ScopeRecord
      body = formatScopeCheck(record, prUrl, recordPath)
    } else {
      body = [
        '## Scope check',
        '',
        `Research paused before draft (awaiting scope). Draft PR: ${prUrl}`,
        '',
        '_No run record found to list Decisions._',
      ].join('\n')
    }
    writeFileSync(bodyFile, body)
    issueCommentFile(issueNumber(), bodyFile)
    addBlockedLabel()
    return
  }

  let body: string
  if (existsSync(recordPath)) {
    const record = JSON.parse(readFileSync(recordPath, 'utf8')) as ReviewRecord
    body = formatPipelineReview(
      record,
      prUrl,
      join(workspace, 'guides', slug),
      recordPath,
    )
  } else {
    const lines = ['## Pipeline review', '']
    if (outcome === 'unconverged') {
      lines.push(`Draft PR opened (pipeline **unconverged**): ${prUrl}`)
    } else {
      lines.push(`Draft PR opened: ${prUrl}`)
    }
    lines.push('')
    lines.push('_No run record found to summarize blockers / open questions._')
    body = lines.join('\n')
  }
  writeFileSync(bodyFile, body)
  issueCommentFile(issueNumber(), bodyFile)
}

export function runMarkBlocked(): void {
  const runUrl = process.env.RUN_URL || ''
  const slug = process.env.SLUG || ''
  const pushed = process.env.PUSHED === 'true'
  const branch = process.env.BRANCH || ''
  const n = issueNumber()
  const workspace = githubWorkspace()
  const reason = readFailureReason()

  const lines: string[] = []
  if (pushed) {
    const branchLabel = branch || `guide/issue-${n}-…`
    lines.push(
      `\`guide:draft\` run failed after pushing \`${branchLabel}\`.`,
    )
    lines.push('')
    lines.push(reason)
    lines.push('')
    lines.push(
      'The guide branch is on the remote — re-add `guide:draft` to resume from it (skipping a blank-tree restart).',
    )
  } else {
    lines.push('`guide:draft` run failed (no PR opened).')
    lines.push('')
    lines.push(reason)
  }
  lines.push('')
  lines.push(`**Workflow run:** ${runUrl}`)
  lines.push('')

  const recordPath = join(runnerTemp(), 'run-record.json')
  if (existsSync(recordPath)) {
    lines.push('')
    try {
      const record = JSON.parse(readFileSync(recordPath, 'utf8')) as ReviewRecord
      lines.push(
        formatPipelineReview(record, '', join(workspace, 'guides', slug), recordPath),
      )
    } catch {
      /* ignore */
    }
  } else if (slug) {
    const record = newestRunRecord(workspace, slug)
    if (record) {
      lines.push('')
      try {
        const parsed = JSON.parse(readFileSync(record, 'utf8')) as ReviewRecord
        lines.push(
          formatPipelineReview(parsed, '', join(workspace, 'guides', slug), record),
        )
      } catch {
        /* ignore */
      }
    } else {
      lines.push('Reply on this issue with clarifications, then re-add `guide:draft`.')
    }
  } else {
    lines.push('Reply on this issue with clarifications, then re-add `guide:draft`.')
  }

  const bodyFile = join(runnerTemp(), 'failure-comment.md')
  writeFileSync(bodyFile, lines.join('\n'))
  addBlockedLabel()
  issueCommentFile(n, bodyFile)
}
