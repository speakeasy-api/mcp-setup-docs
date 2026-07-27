import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { issueNumber, runnerTemp, githubWorkspace } from './env.ts'
import { ghSoft, retryGh } from './gh.ts'
import { setOutput } from './github-output.ts'
import { writeFailureReason } from './failure-reason.ts'
import { formatScopeCheck, type ScopeRecord } from './format-scope-check.ts'
import {
  formatPipelineReview,
  type ReviewRecord,
} from './format-pipeline-review.ts'

function buildPrBody(opts: {
  issueNumber: string
  slug: string
  outcome: string
  resume: boolean
  needsHuman: boolean
}): string {
  const lines: string[] = []
  lines.push(`Closes #${opts.issueNumber}`)
  lines.push('')
  if (opts.outcome === 'awaiting_scope') {
    lines.push(
      `Factory **research-only** pause for \`guides/${opts.slug}/\` — material open questions need Decisions before draft.`,
    )
    lines.push('')
    lines.push(
      '**Pipeline status:** awaiting scope. See the issue comment **Scope check**.',
    )
    lines.push(
      'Answer with `Decision N: …`, then re-add `guide:draft` to continue.',
    )
    lines.push('')
  } else {
    lines.push(
      `Factory draft of \`guides/${opts.slug}/\` via \`draft-guide\` (Cursor SDK).`,
    )
    lines.push('')
  }
  if (opts.outcome === 'unconverged') {
    lines.push(
      '**Pipeline status:** unconverged (reviewers still had blockers after max rounds).',
    )
    lines.push(
      'See the issue comment **Pipeline review** for unresolved blockers and open questions.',
    )
    lines.push('Do not merge until those are settled.')
    lines.push('')
  }
  if (opts.resume) {
    lines.push(
      '_Updated by a factory re-run (resume) — prior research/setup on this branch were reused where the lock allowed._',
    )
    lines.push('')
  }
  if (opts.needsHuman) {
    lines.push(
      'This PR is a **draft** until the issue Decisions / blockers are settled.',
    )
  } else {
    lines.push(
      'Pipeline **converged** — ready for human review (agents never commit; this Action did).',
    )
  }
  return lines.join('\n')
}

export async function runOpenPr(): Promise<void> {
  const branch = process.env.BRANCH || ''
  const slug = process.env.SLUG || ''
  const provider = process.env.PROVIDER || ''
  const outcome = process.env.OUTCOME || ''
  const resume = process.env.RESUME === 'true'
  const resumePrNumber = process.env.RESUME_PR_NUMBER || ''
  const resumePrUrl = process.env.RESUME_PR_URL || ''
  const n = issueNumber()
  const workspace = githubWorkspace()

  let title = `guide: ${provider}`
  if (title.length > 256) title = title.slice(0, 256)

  const needsHuman = outcome === 'awaiting_scope' || outcome === 'unconverged'
  const bodyFile = join(runnerTemp(), 'pr-body.md')
  let body = buildPrBody({
    issueNumber: n,
    slug,
    outcome,
    resume,
    needsHuman,
  })

  const recordPath = join(runnerTemp(), 'run-record.json')
  if (existsSync(recordPath)) {
    const record = JSON.parse(readFileSync(recordPath, 'utf8')) as ScopeRecord &
      ReviewRecord
    body += '\n\n'
    if (outcome === 'awaiting_scope') {
      body += formatScopeCheck(record, '', recordPath)
    } else {
      body += formatPipelineReview(
        record,
        '',
        join(workspace, 'guides', slug),
        recordPath,
      )
    }
  }
  writeFileSync(bodyFile, body)

  if (resume && resumePrNumber) {
    try {
      await retryGh([
        'pr',
        'edit',
        resumePrNumber,
        '--title',
        title,
        '--body-file',
        bodyFile,
      ])
    } catch {
      writeFailureReason(
        [
          `Pushed \`${branch}\` but failed to update PR #${resumePrNumber} after retries.`,
          'Re-add `guide:draft` to resume from that branch/PR.',
        ].join('\n'),
      )
      process.exit(1)
    }
    if (needsHuman) {
      ghSoft(['pr', 'ready', resumePrNumber, '--undo'])
    } else {
      ghSoft(['pr', 'ready', resumePrNumber])
    }
    setOutput('pr_url', resumePrUrl)
    return
  }

  const createArgs = [
    'pr',
    'create',
    '--base',
    'main',
    '--head',
    branch,
    '--title',
    title,
    '--body-file',
    bodyFile,
  ]
  if (needsHuman) createArgs.push('--draft')

  let createResult
  try {
    createResult = await retryGh(createArgs, {
      onExhausted: (err) => {
        const existing = ghSoft([
          'pr',
          'list',
          '--head',
          branch,
          '--state',
          'open',
          '--json',
          'url',
          '--jq',
          '.[0].url // empty',
        ])
        const url = existing.stdout.trim()
        if (url) {
          console.log(
            `gh pr create failed but open PR exists for ${branch}: ${url}`,
          )
          return { code: 0, stdout: url, stderr: '' }
        }
        console.error(err)
        return undefined
      },
    })
  } catch {
    writeFailureReason(
      [
        `Guide was pushed to \`${branch}\` but opening the PR failed after retries (likely a GitHub API flake).`,
        '',
        'Re-add `guide:draft` — the next run will resume from that branch and retry PR create (without a blank-tree restart).',
      ].join('\n'),
    )
    process.exit(1)
  }

  const lines = createResult.stdout.trim().split('\n').filter(Boolean)
  const prUrl = lines[lines.length - 1] || createResult.stdout.trim()
  setOutput('pr_url', prUrl)
}
