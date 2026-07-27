import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runnerTemp } from './env.ts'

export type GhResult = {
  code: number
  stdout: string
  stderr: string
}

export function gh(args: string[], opts?: { check?: boolean }): GhResult {
  const r = spawnSync('gh', args, {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  })
  const result: GhResult = {
    code: r.status ?? 1,
    stdout: (r.stdout ?? '').trimEnd(),
    stderr: (r.stderr ?? '').trimEnd(),
  }
  if (opts?.check !== false && result.code !== 0) {
    const msg = result.stderr || result.stdout || `gh ${args[0]} failed (${result.code})`
    throw new Error(msg)
  }
  return result
}

/** Soft gh: never throws; returns result even on non-zero. */
export function ghSoft(args: string[]): GhResult {
  return gh(args, { check: false })
}

const TRANSIENT_RE =
  /GraphQL: Something went wrong|HTTP 50[0-9]|timed out|timeout|ECONNRESET|ECONNREFUSED|secondary rate limit|API rate limit/i

export function isTransientGhError(err: string): boolean {
  return TRANSIENT_RE.test(err)
}

export type RetryGhOpts = {
  max?: number
  delayMs?: number
  /**
   * Called when retries are exhausted or the error is non-transient.
   * Return a GhResult to recover (e.g. PR create flake → list by head);
   * return undefined to throw.
   */
  onExhausted?: (err: string, last: GhResult) => GhResult | undefined
}

/** Retry gh on transient GraphQL / 5xx / network flakes. */
export async function retryGh(
  args: string[],
  opts?: RetryGhOpts,
): Promise<GhResult> {
  const max = opts?.max ?? 5
  let delay = opts?.delayMs ?? 10_000
  let attempt = 1

  while (true) {
    const r = ghSoft(args)
    if (r.code === 0) return r
    const err = r.stderr || r.stdout
    if (attempt >= max || !isTransientGhError(err)) {
      const recovered = opts?.onExhausted?.(err, r)
      if (recovered) return recovered
      throw new Error(err || `gh failed (${r.code})`)
    }
    console.error(
      `Transient GitHub error on attempt ${attempt}/${max}; retrying in ${delay / 1000}s…`,
    )
    console.error(err)
    await sleep(delay)
    attempt++
    delay *= 2
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function issueEdit(issue: string, args: string[]): void {
  ghSoft(['issue', 'edit', issue, ...args])
}

export function issueComment(issue: string, body: string): void {
  const bodyFile = join(runnerTemp(), `issue-comment-${Date.now()}.md`)
  writeFileSync(bodyFile, body)
  gh(['issue', 'comment', issue, '--body-file', bodyFile])
}

export function issueCommentFile(issue: string, bodyFile: string): void {
  gh(['issue', 'comment', issue, '--body-file', bodyFile])
}
