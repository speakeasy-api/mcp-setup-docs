/**
 * Decides when two open-question strings say the same thing.
 * This module is the single source of truth for that decision.
 * The scope gate merge and the scope-check formatter both use it.
 *
 * The score is a containment overlap. It divides the shared token count
 * by the smaller token count. It does not divide by the union count.
 * A measurement on the run corpus shows that Jaccard does not separate
 * the corpus, but that containment does.
 *
 * The measured band on the run corpus is narrow. The highest measured
 * score between two different questions is 0.5882. The lowest measured
 * score between two true duplicates is 0.6000. A threshold of 0.6
 * separates the band.
 *
 * Do not add a stop-word list. A measurement with a 44-word stop list
 * moves the highest different-question score up to 0.6000, and moves
 * the lowest true-duplicate score down to 0.5385. No threshold then
 * separates the two groups.
 */

/** Two questions are the same when this share of the smaller token set overlaps. */
export const DUPLICATE_THRESHOLD = 0.6

/** Keep only tokens with this many characters or more. */
const MIN_TOKEN_LENGTH = 4

/** Lowercase, drop markdown bold and quote marks, collapse whitespace. */
export function normalizeQuestion(s: string): string {
  return s
    .toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[`"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Split a normalized question into the set of tokens that the score uses. */
function tokenSet(s: string): Set<string> {
  return new Set(
    normalizeQuestion(s)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= MIN_TOKEN_LENGTH),
  )
}

/** Containment overlap: shared tokens divided by the smaller token count. */
export function similarity(a: string, b: string): number {
  const setA = tokenSet(a)
  const setB = tokenSet(b)
  if (setA.size === 0 || setB.size === 0) return 0
  let shared = 0
  for (const token of setA) {
    if (setB.has(token)) shared += 1
  }
  return shared / Math.min(setA.size, setB.size)
}

export function isDuplicateQuestion(a: string, b: string): boolean {
  return similarity(a, b) >= DUPLICATE_THRESHOLD
}
