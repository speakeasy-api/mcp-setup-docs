import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { issueNumber, ghRepo, runnerTemp, repoRoot } from './env.ts'
import { ghSoft } from './gh.ts'
import { setOutput, setMultilineOutput } from './github-output.ts'
import { writeFailureReason } from './failure-reason.ts'

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
  }

  const outPath = join(runnerTemp(), 'resolved.json')
  const root = repoRoot()
  const r = spawnSync(
    'npm',
    ['run', 'resolve-issue', '--', '--output', outPath, '--repo-root', root],
    {
      encoding: 'utf8',
      env: { ...process.env, ISSUE_BODY: body },
      cwd: join(root, 'pipeline'),
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  )
  const code = r.status ?? 1

  if (!existsSync(outPath)) {
    writeFailureReason(`resolve-issue produced no resolved.json (exit ${code})`)
    process.exit(1)
  }

  const resolved = JSON.parse(readFileSync(outPath, 'utf8')) as Resolved

  if (resolved.status === 'ok') {
    const ok = resolved as ResolvedOk
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
