/**
 * Shared review-finding helpers used by the workflow (finalization salvage)
 * and the factory Pipeline review formatter.
 */

export type FindingLike = {
  dimension?: string
  target?: string
  where?: string
  problem?: string
  suggestion?: string
}

/**
 * Setup-file fidelity miss: the Dossier already has the fact; render it.
 * Targets match ReviewFinding (`external` | `speakeasy`); legacy `setup`
 * is not emitted by the Cursor SDK workflow.
 */
export function isDossierRenderFix(f: FindingLike): boolean {
  return (
    f.dimension === 'fidelity' &&
    (f.target === 'external' || f.target === 'speakeasy')
  )
}

/**
 * True when every remaining finalization blocker is a dossier-backed
 * setup-file fidelity miss — one salvage revise is safe; research/meta/
 * achievability gaps still escalate to a human.
 */
export function shouldSalvageFinalization(blockers: FindingLike[]): boolean {
  return blockers.length > 0 && blockers.every(isDossierRenderFix)
}
