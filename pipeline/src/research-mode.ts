/**
 * Auto-route research cost on factory resume (same `guide:draft` label).
 *
 * - full  — cold start, force-research ask, or fail-closed default
 * - skip  — resume + only scope dispositions (drop/hedge/omit); no crawl
 * - patch — resume + fact-bearing Decisions / dossier corrections; amend
 *           research.md without a provider-docs re-spree
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  extractDecisions,
  notesForceFullResearch,
  summarizeDecisionKinds,
  type ExtractedDecision,
} from './decisions.ts'

export type ResearchMode = 'full' | 'skip' | 'patch'

export type ResearchModeInput = {
  /** Factory preflight resume (branch/PR already exists). */
  resume: boolean
  /** Absolute path to guides/<slug>/ */
  guideDir: string
  /** Distill + verbatim Decision notes. */
  notes: string
  /**
   * Prior run status from newest run record when known.
   * awaiting_scope + scope-only Decisions → strongest skip candidate.
   */
  priorStatus?: string
  /** Explicit CLI override. */
  explicit?: ResearchMode
}

export type ResearchModeResult = {
  mode: ResearchMode
  reason: string
  decisions: ExtractedDecision[]
}

export function hasResearchArtifacts(guideDirectory: string): boolean {
  return (
    existsSync(join(guideDirectory, 'research.md')) &&
    existsSync(join(guideDirectory, 'meta.yaml'))
  )
}

/** Optional: read status from a run-record JSON path. */
export function priorStatusFromRecord(
  recordPath: string | undefined
): string | undefined {
  if (!recordPath || !existsSync(recordPath)) return undefined
  try {
    const data = JSON.parse(readFileSync(recordPath, 'utf8')) as {
      status?: unknown
    }
    return typeof data.status === 'string' ? data.status : undefined
  } catch {
    return undefined
  }
}

/**
 * Classify research mode. Fail closed to `full` when signals are ambiguous.
 */
export function resolveResearchMode(input: ResearchModeInput): ResearchModeResult {
  if (input.explicit === 'full' || input.explicit === 'skip' || input.explicit === 'patch') {
    return {
      mode: input.explicit,
      reason: `explicit --research-mode=${input.explicit}`,
      decisions: extractDecisions(input.notes),
    }
  }

  const decisions = extractDecisions(input.notes)
  const kinds = summarizeDecisionKinds(decisions)

  if (!input.resume || !hasResearchArtifacts(input.guideDir)) {
    return {
      mode: 'full',
      reason: input.resume
        ? 'resume without research.md+meta.yaml — full research'
        : 'cold start — full research',
      decisions,
    }
  }

  if (notesForceFullResearch(input.notes)) {
    return {
      mode: 'full',
      reason: 'notes request re-research / docs moved — full research',
      decisions,
    }
  }

  // Scope-only: every extracted Decision is drop/hedge/omit, and at least one exists.
  if (decisions.length > 0 && kinds.fact === 0 && kinds.other === 0) {
    return {
      mode: 'skip',
      reason:
        input.priorStatus === 'awaiting_scope'
          ? 'awaiting_scope resume with scope-only Decisions — skip research crawl'
          : 'resume with scope-only Decisions — skip research crawl',
      decisions,
    }
  }

  // Fact / keep / verified / freeform dossier corrections → patch
  if (kinds.fact > 0 || kinds.other > 0) {
    return {
      mode: 'patch',
      reason:
        'resume with fact-bearing or dossier-update Decisions — patch research.md',
      decisions,
    }
  }

  // Resume with no Decision lines — could be label re-add noise; fail closed.
  return {
    mode: 'full',
    reason: 'resume without classifiable Decisions — full research (fail closed)',
    decisions,
  }
}

export function researchModeLabel(mode: ResearchMode): string {
  switch (mode) {
    case 'skip':
      return 'skip (scope-only; carry dossier forward)'
    case 'patch':
      return 'patch (amend dossier from operator Decisions; no provider re-crawl)'
    default:
      return 'full (provider research)'
  }
}
