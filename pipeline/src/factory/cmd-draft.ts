import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { repoRoot, runnerTemp, githubWorkspace } from './env.ts'
import { setOutput } from './github-output.ts'
import { writeFailureReason } from './failure-reason.ts'
import { mapDraftOutcome } from './draft-outcome.ts'
import { newestRunRecord, copyRunRecordToTemp } from './run-record.ts'

export function runDraft(): void {
  const slug = process.env.SLUG
  if (!slug) {
    writeFailureReason('SLUG is not set')
    process.exit(1)
  }
  const persona = process.env.PERSONA || 'it-admin'
  const notes = process.env.NOTES || ''
  const root = repoRoot()
  const workspace = githubWorkspace()

  const args = ['run', 'draft-guide', '--', slug, '--overwrite', '--pause-on-scope']
  if (persona && persona !== 'it-admin') {
    args.push('--persona', persona)
  }
  if (notes) {
    args.push('--notes', notes)
  }

  const r = spawnSync('npm', args, {
    encoding: 'utf8',
    env: process.env,
    cwd: join(root, 'pipeline'),
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  const code = r.status ?? 1

  const record = newestRunRecord(workspace, slug)
  if (record) {
    setOutput('record', record)
    copyRunRecordToTemp(record, join(runnerTemp(), 'run-record.json'))
  }

  const mapped = mapDraftOutcome({ exitCode: code, slug, workspace })
  if (mapped.ok) {
    setOutput('outcome', mapped.outcome)
    if (mapped.outcome === 'unconverged') {
      writeFailureReason(
        'draft-guide exited 2 (unconverged/blocked/failed). Opening a draft PR with whatever was written for human review.',
      )
    }
    process.exit(0)
  }
  writeFailureReason(mapped.reason)
  process.exit(mapped.exitCode)
}
