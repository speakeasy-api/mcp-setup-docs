import { spawnSync } from 'node:child_process'

export type GitResult = {
  code: number
  stdout: string
  stderr: string
}

export function git(args: string[], opts?: { check?: boolean; cwd?: string }): GitResult {
  const r = spawnSync('git', args, {
    encoding: 'utf8',
    env: process.env,
    cwd: opts?.cwd,
    maxBuffer: 20 * 1024 * 1024,
  })
  const result: GitResult = {
    code: r.status ?? 1,
    stdout: (r.stdout ?? '').trimEnd(),
    stderr: (r.stderr ?? '').trimEnd(),
  }
  if (opts?.check !== false && result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args[0]} failed (${result.code})`)
  }
  return result
}

export function gitSoft(args: string[], cwd?: string): GitResult {
  return git(args, { check: false, cwd })
}

export function configureBotIdentity(cwd?: string): void {
  git(['config', 'user.name', 'guide-factory[bot]'], { cwd })
  git(['config', 'user.email', 'guide-factory[bot]@users.noreply.github.com'], { cwd })
}
