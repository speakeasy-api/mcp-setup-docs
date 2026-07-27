import { join } from 'node:path'
import { runnerTemp, githubWorkspace } from './env.ts'
import { setOutput } from './github-output.ts'
import { writeFailureReason } from './failure-reason.ts'
import { mapDraftOutcome } from './draft-outcome.ts'
import { newestRunRecord, copyRunRecordToTemp } from './run-record.ts'
import { runPipelineScript } from './run-pipeline.ts'

export function runDraft(): void {
  const slug = process.env.SLUG
  if (!slug) {
    writeFailureReason('SLUG is not set')
    process.exit(1)
  }
  const persona = process.env.PERSONA || 'it-admin'
  const notes = process.env.NOTES || ''
  const workspace = githubWorkspace()

  const args = [slug, '--overwrite', '--pause-on-scope']
  if (persona && persona !== 'it-admin') {
    args.push('--persona', persona)
  }
  if (notes) {
    args.push('--notes', notes)
  }

  console.error(
    `factory: draft starting slug=${slug} persona=${persona} pause-on-scope=true`,
  )
  const code = runPipelineScript('src/cli.ts', args)
  console.error(`factory: draft-guide exited ${code}`)

  const record = newestRunRecord(workspace, slug)
  if (record) {
    setOutput('record', record)
    copyRunRecordToTemp(record, join(runnerTemp(), 'run-record.json'))
    console.error(`factory: run record → ${record}`)
  } else {
    console.error(`factory: no run record found for ${slug}`)
  }

  const mapped = mapDraftOutcome({ exitCode: code, slug, workspace })
  if (mapped.ok) {
    setOutput('outcome', mapped.outcome)
    console.error(`factory: outcome=${mapped.outcome}`)
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
