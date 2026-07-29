import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { issueNumber, ghRepo, runnerTemp, repoRoot, githubWorkspace } from './env.ts'
import { ghSoft } from './gh.ts'
import { setOutput, setMultilineOutput } from './github-output.ts'
import { writeFailureReason } from './failure-reason.ts'
import { runPipelineScript } from './run-pipeline.ts'
import {
  buildOperatorNotes,
  extractDecisions,
  recentOperatorComments,
} from '../decisions.ts'
import {
  priorStatusFromRecord,
  resolveResearchMode,
  researchModeLabel,
  type ResearchMode,
} from '../research-mode.ts'
import { newestRunRecord } from './run-record.ts'
import { guideDir } from '../paths.ts'

type ResolvedOk = {
  status: 'ok'
  slug: string
  provider: string
  persona?: string
  notes?: string
}

type ResolvedClarify = {
  status: 'needs_clarification'
  reason: string
  candidates?: string[]
}

type Resolved = ResolvedOk | ResolvedClarify | { status: string }

export function runDistill(): void {
  if (!process.env.CURSOR_API_KEY) {
    writeFailureReason('CURSOR_API_KEY secret is not set')
    process.exit(1)
  }

  const n = issueNumber()
  const repo = ghRepo()
  let body = process.env.ISSUE_BODY || ''

  console.error(`factory: distill — folding issue #${n} comments into body`)
  const commentsRes = ghSoft([
    'api',
    `repos/${repo}/issues/${n}/comments`,
    '--jq',
    '[.[].body] | join("\n\n---\n\n")',
  ])
  const comments = commentsRes.code === 0 ? commentsRes.stdout : ''
  if (comments) {
    const combined = `${body}\n\n## Issue thread (for clarifications)\n${comments}\n`
    const bodyFile = join(runnerTemp(), 'issue-body-with-thread.txt')
    writeFileSync(bodyFile, combined)
    body = combined
    process.env.ISSUE_BODY = combined
    console.error('factory: distill — included issue comment thread')
  } else {
    console.error('factory: distill — no issue comments (body only)')
  }

  // Only Decisions from comments after the latest factory review enter notes
  // (C2). Whole-thread extraction would let stale Decision 2/3 satisfy new OQs.
  const recent = recentOperatorComments(comments)
  const recentDecisions = extractDecisions(recent)
  if (recentDecisions.length > 0) {
    console.error(
      `factory: distill — recent Decision line(s): ` +
        recentDecisions.map((d) => `D${d.index}/${d.kind}`).join(', '),
    )
  } else {
    console.error('factory: distill — no recent Decision lines after last factory comment')
  }

  const outPath = join(runnerTemp(), 'resolved.json')
  const root = repoRoot()
  const code = runPipelineScript(
    'src/resolve-issue.ts',
    ['--output', outPath, '--repo-root', root],
    { env: { ...process.env, ISSUE_BODY: body } },
  )

  if (!existsSync(outPath)) {
    writeFailureReason(`resolve-issue produced no resolved.json (exit ${code})`)
    process.exit(1)
  }

  const resolved = JSON.parse(readFileSync(outPath, 'utf8')) as Resolved

  if (resolved.status === 'ok') {
    const ok = resolved as ResolvedOk
    // Strip Decision lines distill copied from the full thread, then append
    // only recent verbatim Decisions.
    const notes = buildOperatorNotes(ok.notes ?? '', recent)

    const resume = process.env.RESUME === 'true'
    const workspace = githubWorkspace()
    const slug = ok.slug
    const guideDirectory = join(workspace, guideDir(slug))
    const priorRecord = newestRunRecord(workspace, slug)
    const priorStatus = priorStatusFromRecord(priorRecord)

    const explicitEnv = process.env.RESEARCH_MODE as ResearchMode | undefined
    const explicit =
      explicitEnv === 'full' || explicitEnv === 'patch' || explicitEnv === 'skip'
        ? explicitEnv
        : undefined

    const routed = resolveResearchMode({
      resume,
      guideDir: guideDirectory,
      notes,
      commentThread: comments,
      priorStatus,
      explicit,
    })

    console.error(
      `factory: distill ok — slug=${ok.slug} provider=${ok.provider} persona=${ok.persona ?? 'it-admin'} research_mode=${routed.mode} (${routed.reason})`,
    )
    setOutput('slug', ok.slug)
    setOutput('provider', ok.provider)
    setOutput('persona', ok.persona ?? 'it-admin')
    setOutput('research_mode', routed.mode)
    setOutput('research_mode_reason', routed.reason)
    setOutput('research_mode_label', researchModeLabel(routed.mode))
    setMultilineOutput('notes', notes)
    process.exit(0)
  }

  if (resolved.status === 'needs_clarification') {
    const c = resolved as ResolvedClarify
    const candidates = (c.candidates ?? []).join(', ')
    const parts = [
      'Distill needs clarification before drafting.',
      '',
      `**Reason:** ${c.reason}`,
    ]
    if (candidates) {
      parts.push('', `**Candidates:** ${candidates}`)
    }
    parts.push(
      '',
      'Reply on this issue (or edit the body) clarifying which MCP server, then re-add `guide:draft`.',
    )
    writeFailureReason(parts.join('\n'))
    process.exit(1)
  }

  writeFailureReason(`Unexpected distill status: ${resolved.status}`)
  process.exit(1)
}
