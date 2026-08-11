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
 * is not emitted by the drafting pipeline.
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

/**
 * A missing-file lint finding that a review round refuted.
 * Narrow on purpose: only a `<name>.md is missing.` problem, and only when a
 * disputed line claims that same file exists.
 */
export function isRefutedByDisputed(
  f: FindingLike,
  disputed: string[],
): boolean {
  if (f.dimension !== 'lint') return false
  const m = /^(\S+\.md) is missing\.$/.exec((f.problem ?? '').trim())
  if (!m) return false
  const re = new RegExp(
    `${m[1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+exists`,
    'i',
  )
  return disputed.some((d) => re.test(d))
}

/**
 * Remove the unresolved findings that a disputed line in the same run
 * refuted. An empty `disputed` list changes nothing.
 */
export function dropRefutedFindings(
  unresolved: FindingLike[],
  disputed: string[],
): FindingLike[] {
  if (disputed.length === 0) return unresolved
  return unresolved.filter((f) => !isRefutedByDisputed(f, disputed))
}
