import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { issueNumber, ghRepo, runnerTemp, repoRoot } from './env.ts'
import { ghSoft } from './gh.ts'
import { setOutput, setMultilineOutput } from './github-output.ts'
import { writeFailureReason } from './failure-reason.ts'
import { runPipelineScript } from './run-pipeline.ts'

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
  // Trimmed, to match resolve-issue.ts's own check: a whitespace-only secret must
  // fail here with this message rather than clear the gate and die inside the
  // subprocess as "resolve-issue produced no resolved.json".
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    writeFailureReason('OPENROUTER_API_KEY secret is not set')
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
    console.error(
      `factory: distill ok — slug=${ok.slug} provider=${ok.provider} persona=${ok.persona ?? 'it-admin'}`,
    )
    setOutput('slug', ok.slug)
    setOutput('provider', ok.provider)
    setOutput('persona', ok.persona ?? 'it-admin')
    setMultilineOutput('notes', ok.notes ?? '')
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
