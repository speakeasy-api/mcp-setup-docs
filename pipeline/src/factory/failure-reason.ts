import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { runnerTemp } from './env.ts'

export function failureReasonPath(): string {
  return join(runnerTemp(), 'failure_reason.txt')
}

export function writeFailureReason(text: string): void {
  writeFileSync(failureReasonPath(), text)
}

export function readFailureReason(): string {
  const p = failureReasonPath()
  if (!existsSync(p)) return '(no reason file written; check workflow logs)'
  return readFileSync(p, 'utf8')
}
