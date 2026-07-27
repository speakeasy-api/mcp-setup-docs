import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Required GitHub Actions / factory env. */
export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

export function issueNumber(): string {
  return requireEnv('ISSUE_NUMBER')
}

export function ghRepo(): string {
  return requireEnv('GH_REPO')
}

export function runnerTemp(): string {
  return process.env.RUNNER_TEMP || '/tmp'
}

export function githubWorkspace(): string {
  return process.env.GITHUB_WORKSPACE || resolve(process.cwd(), '..')
}

/** Repo root: GITHUB_WORKSPACE in CI, otherwise parent of pipeline/. */
export function repoRoot(): string {
  if (process.env.GITHUB_WORKSPACE) return process.env.GITHUB_WORKSPACE
  // pipeline/src/factory → repo root
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
}
