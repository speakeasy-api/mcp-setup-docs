/**
 * Containment for the spawned pi agent.
 *
 * There is no container on this path, so these two pure functions are the whole
 * boundary:
 *
 *  - `writesOutsideAllowed` enforces I7 (the agent writes only inside its own
 *    guide directory, and never commits or pushes). Under `@cursor/sdk` this
 *    was prompt text; here it is a post-run assertion against `git status`.
 *  - `buildAgentEnv` keeps orchestrator secrets out of the subprocess. Spawning
 *    with `process.env` would hand the agent every credential in the shell.
 */
import { PATHS, guideDir } from './paths.ts'

/**
 * Secrets the orchestrator holds that the agent has no use for. `PULSE_REGISTRY_*`
 * are read by `pulse-catalog.ts` in-process; `GH_TOKEN` / `AGENT_PAT` drive the
 * factory's git and gh glue, which runs outside the agent entirely.
 */
export const DENIED_ENV = [
  'PULSE_REGISTRY_KEY',
  'PULSE_REGISTRY_TENANT',
  'GH_TOKEN',
  'GITHUB_TOKEN',
  'AGENT_PAT',
  'CURSOR_API_KEY',
] as const

/** Everything pi needs to run and reach OpenRouter, and nothing else. */
const ALLOWED_ENV = [
  'PATH',
  'HOME',
  'LANG',
  'LC_ALL',
  'TERM',
  'TMPDIR',
  'NODE_OPTIONS',
  'OPENROUTER_API_KEY',
] as const

/**
 * Build an explicit environment for the agent subprocess.
 *
 * An allowlist rather than a denylist: a new secret added to CI later is then
 * excluded by default instead of leaking until someone remembers to deny it.
 */
export function buildAgentEnv(
  source: NodeJS.ProcessEnv,
  overrides: Record<string, string> = {}
): Record<string, string> {
  const env: Record<string, string> = {}
  for (const name of ALLOWED_ENV) {
    const value = source[name]
    if (typeof value === 'string' && value !== '') env[name] = value
  }
  return { ...env, ...overrides }
}

/**
 * Paths touched by a `git status --porcelain` run that fall outside the
 * allowlist. An empty result means the agent stayed where it was told.
 *
 * Renames report both sides, since moving a doctrine file out is as much a
 * breach as writing one in.
 */
export function writesOutsideAllowed(
  porcelain: string,
  allowedPrefixes: readonly string[]
): string[] {
  const offenders: string[] = []
  for (const line of porcelain.split('\n')) {
    if (!line.trim()) continue
    // Porcelain v1: two status columns, a space, then the path(s).
    const payload = line.slice(3)
    for (const path of splitRename(payload)) {
      const clean = unquote(path)
      if (!clean) continue
      if (!allowedPrefixes.some((prefix) => clean.startsWith(prefix))) {
        offenders.push(clean)
      }
    }
  }
  return offenders
}

function splitRename(payload: string): string[] {
  const arrow = payload.indexOf(' -> ')
  if (arrow === -1) return [payload]
  return [payload.slice(0, arrow), payload.slice(arrow + 4)]
}

function unquote(path: string): string {
  const trimmed = path.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    try {
      return JSON.parse(trimmed) as string
    } catch {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

/** The only paths a drafting agent may touch. */
export function allowedPrefixesFor(slug: string): string[] {
  return [guideDir(slug) + '/', PATHS.retroRunsDir + '/']
}
