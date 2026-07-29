/**
 * Auto-route research cost on factory resume (same `guide:draft` label).
 *
 * - full  — cold start, force-research ask, or no new operator signal
 * - skip  — resume + only drop/omit Decisions; no substantive freeform
 * - patch — fact/hedge Decisions, unnumbered Decision:, numbered "N - …",
 *           or substantive freeform after the last factory review
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  extractDecisions,
  isSubstantiveFreeform,
  notesForceFullResearch,
  recentOperatorComments,
  summarizeDecisionKinds,
  type ExtractedDecision,
} from './decisions.ts'

export type ResearchMode = 'full' | 'skip' | 'patch'

export type ResearchModeInput = {
  /** Factory preflight resume (branch/PR already exists). */
  resume: boolean
  /** Absolute path to guides/<slug>/ */
  guideDir: string
  /** Distill + verbatim Decision notes (for force-research / prompts). */
  notes: string
  /**
   * Raw issue comment thread (bodies joined by `\n\n---\n\n`).
   * Used to find operator replies after the last factory review.
   */
  commentThread?: string
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
 * Classify research mode.
 *
 * Routing prefers *recent* operator comments (after the last factory
 * Scope check / Pipeline review). Distill prose alone must not force
 * patch — otherwise every resume looks freeform.
 */
export function resolveResearchMode(input: ResearchModeInput): ResearchModeResult {
  const allDecisions = extractDecisions(input.notes)

  if (input.explicit === 'full' || input.explicit === 'skip' || input.explicit === 'patch') {
    return {
      mode: input.explicit,
      reason: `explicit --research-mode=${input.explicit}`,
      decisions: allDecisions,
    }
  }

  if (!input.resume || !hasResearchArtifacts(input.guideDir)) {
    return {
      mode: 'full',
      reason: input.resume
        ? 'resume without research.md+meta.yaml — full research'
        : 'cold start — full research',
      decisions: allDecisions,
    }
  }

  // Factory always passes commentThread (possibly ''). Local CLI omits it and
  // classifies from --notes alone.
  const factoryRouted = input.commentThread !== undefined
  const recent = recentOperatorComments(input.commentThread || '')

  if (notesForceFullResearch(input.notes) || notesForceFullResearch(recent)) {
    return {
      mode: 'full',
      reason: 'notes request re-research / docs moved — full research',
      decisions: allDecisions,
    }
  }

  if (factoryRouted && !recent) {
    return {
      mode: 'full',
      reason:
        'resume with no new operator comments — full research (fail closed)',
      decisions: allDecisions,
    }
  }

  // Factory: classify from comments after the last factory review only.
  // Local: classify from notes.
  const routeText = factoryRouted ? recent : input.notes
  const decisions = extractDecisions(routeText)
  const kinds = summarizeDecisionKinds(decisions)
  const freeform = isSubstantiveFreeform(routeText)

  // Never skip when freeform dossier/scope corrections arrived.
  if (freeform) {
    return {
      mode: 'patch',
      reason:
        'resume with substantive freeform operator comment — patch research.md',
      decisions,
    }
  }

  // Scope-only drop/omit, no freeform remainder.
  if (decisions.length > 0 && kinds.fact === 0 && kinds.other === 0) {
    return {
      mode: 'skip',
      reason:
        input.priorStatus === 'awaiting_scope'
          ? 'awaiting_scope resume with drop/omit-only Decisions — skip research crawl'
          : 'resume with drop/omit-only Decisions — skip research crawl',
      decisions,
    }
  }

  // Fact / hedge / verified / unnumbered Decision: / "N - …"
  if (kinds.fact > 0 || kinds.other > 0) {
    return {
      mode: 'patch',
      reason:
        'resume with fact/hedge/dossier-update Decisions — patch research.md',
      decisions,
    }
  }

  return {
    mode: 'full',
    reason:
      'resume without classifiable Decisions or freeform — full research (fail closed)',
    decisions,
  }
}

export function researchModeLabel(mode: ResearchMode): string {
  switch (mode) {
    case 'skip':
      return 'skip (drop/omit-only; carry dossier forward)'
    case 'patch':
      return 'patch (amend dossier from operator Decisions/comments; no provider re-crawl)'
    default:
      return 'full (provider research)'
  }
}
