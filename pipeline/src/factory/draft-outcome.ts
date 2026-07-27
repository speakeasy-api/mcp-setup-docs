import { existsSync } from 'node:fs'
import { join } from 'node:path'

export type DraftOutcome = 'converged' | 'awaiting_scope' | 'unconverged'

export type DraftOutcomeInput = {
  exitCode: number
  slug: string
  workspace: string
}

export type DraftOutcomeResult =
  | { ok: true; outcome: DraftOutcome }
  | { ok: false; reason: string; exitCode: number }

/**
 * Map draft-guide exit code + artifacts → factory outcome.
 * 0 = converged, 3 = awaiting_scope (needs research.md), 2 = unconverged (needs guides/slug).
 */
export function mapDraftOutcome(input: DraftOutcomeInput): DraftOutcomeResult {
  const { exitCode, slug, workspace } = input
  if (exitCode === 0) {
    return { ok: true, outcome: 'converged' }
  }
  if (exitCode === 3) {
    const research = join(workspace, 'guides', slug, 'research.md')
    if (existsSync(research)) {
      return { ok: true, outcome: 'awaiting_scope' }
    }
    return {
      ok: false,
      reason: 'draft-guide exited 3 (awaiting_scope) but research.md is missing',
      exitCode: 1,
    }
  }
  if (exitCode === 2) {
    const dir = join(workspace, 'guides', slug)
    if (existsSync(dir)) {
      return { ok: true, outcome: 'unconverged' }
    }
    return {
      ok: false,
      reason: `draft-guide exited 2 and guides/${slug}/ is missing`,
      exitCode: 1,
    }
  }
  return {
    ok: false,
    reason: `draft-guide exited ${exitCode} (hard failure; see workflow logs)`,
    exitCode,
  }
}
