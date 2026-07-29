/**
 * Deterministic Decision extraction and classification for factory notes.
 *
 * Issue threads fold Scope check / Pipeline review templates that contain
 * example `Decision N: …` lines. Those must not count as human answers.
 * Real replies are extracted verbatim so distill's LLM cannot drop them.
 *
 * Accepted reply shapes (Snowflake-hardened):
 *   Decision 1: drop this branch
 *   Decision 1: hedge
 *   Decision 1: verified — …
 *   Decision: ignore the catalog …          (unnumbered)
 *   1 - ignore the catalog mcp server       (numbered dash replies)
 */

export type DecisionKind = 'scope' | 'fact' | 'other'

export type ExtractedDecision = {
  /**
   * 1-based index from `Decision N:` / `N - …`.
   * `0` means unnumbered (`Decision: …`).
   */
  index: number
  /** Canonical line for notes / prompts */
  line: string
  /** Text after the Decision prefix */
  body: string
  kind: DecisionKind
}

/** Template / placeholder bodies from factory comments — not human answers. */
const TEMPLATE_BODY_RE =
  /^(?:verified|drop this branch|hedge)\s*[—–-]\s*(?:…|\.{2,}|…)\s*$/i

const BARE_TEMPLATE_RE =
  /^(?:verified|drop this branch|hedge)\s*[—–-]\s*$/i

/**
 * Scope-only dispositions — safe to skip a research crawl.
 * Bare `hedge` is NOT scope: it usually asks to add soft wording to the dossier.
 */
const SCOPE_BODY_RE =
  /^(?:drop(?:\s+this)?(?:\s+branch)?|omit(?:\s+this)?(?:\s+branch)?|skip(?:ping)?(?:\s+this)?(?:\s+branch)?|out of (?:band|scope))\b/i

/** Fact-bearing / dossier-patch dispositions (includes hedge). */
const FACT_BODY_RE =
  /^(?:verified\b|confirm\b|use\b|keep\b|prefer\b|force\b|set\b|switch\b|document\b|ignore\b|treat\b|revise\b|hedge\b)/i

/** Explicit full re-research asks in freeform notes. */
const FORCE_RESEARCH_RE =
  /\b(?:re-?research|force(?:\s+full)?\s+research|docs?\s+moved|re-?crawl|from\s+source(?:\s+docs?)?)\b/i

/** Trivial acknowledgments — not dossier updates. */
const TRIVIAL_FREEFORM_RE =
  /^(?:thanks|thank you|lgtm|sgtm|ok|okay|sounds good|👍|🙏|\+1)\.?$/i

/**
 * True when a Decision body is clearly a factory template example, not a reply.
 */
export function isTemplateDecisionBody(body: string): boolean {
  const b = body.trim()
  if (!b) return true
  if (TEMPLATE_BODY_RE.test(b) || BARE_TEMPLATE_RE.test(b)) return true
  // Ellipsis-only placeholder after a verb, e.g. "verified — …"
  if (/[—–-]\s*(?:…|\.{3})\s*$/.test(b) && b.length < 80) return true
  return false
}

export function classifyDecisionBody(body: string): DecisionKind {
  const b = body.trim()
  if (!b) return 'other'
  // hedge → patch (fact): bare or with soft wording; never skip-carry-forward
  if (/^hedge\b/i.test(b)) return 'fact'
  if (SCOPE_BODY_RE.test(b)) return 'scope'
  if (FACT_BODY_RE.test(b)) return 'fact'
  // "Decision N: custom-remote only" etc. — treat as dossier patch
  if (b.length >= 8) return 'fact'
  return 'other'
}

/**
 * Factory Scope check / Pipeline review lines look like:
 *   - `Decision 1: drop this branch` (omit the recovery/optional path)
 * Those are prompts, not answers. Human replies are bare lines:
 *   Decision 1: drop this branch
 */
function isFactoryPromptLine(rawLine: string): boolean {
  const line = rawLine.trim()
  // Bullet + backtick-wrapped Decision (template option)
  if (/^[-*]\s+`Decision\s+\d*\s*:/i.test(line)) return true
  // Bullet Decision with trailing parenthetical explanation
  if (
    /^[-*]\s+`?Decision\s+\d*\s*:/i.test(line) &&
    /\)\s*$/.test(line) &&
    /\(/.test(line)
  ) {
    return true
  }
  // Factory how-to numbered list ("1. Reply on **this issue**…")
  if (
    /^\d+\.\s+(?:Reply on|Re-add the|If a factory)/i.test(line)
  ) {
    return true
  }
  return false
}

function canonicalDecisionLine(index: number, body: string): string {
  return index >= 1 ? `Decision ${index}: ${body}` : `Decision: ${body}`
}

function recordDecision(
  byKey: Map<string, ExtractedDecision>,
  index: number,
  body: string
): void {
  const cleaned = body.replace(/^`+|`+$/g, '').trim()
  if (isTemplateDecisionBody(cleaned)) return
  const kind = classifyDecisionBody(cleaned)
  const line = canonicalDecisionLine(index, cleaned)
  // Key by index for numbered; unnumbered accumulate by line body
  const key = index >= 1 ? `n:${index}` : `u:${cleaned.toLowerCase()}`
  byKey.set(key, { index, line, body: cleaned, kind })
}

/**
 * Extract real Decision lines from issue body / comment thread text.
 * Keeps the last body per index when duplicates appear (human reply wins
 * over earlier template noise once templates are filtered).
 */
export function extractDecisions(text: string): ExtractedDecision[] {
  if (!text.trim()) return []
  const byKey = new Map<string, ExtractedDecision>()
  for (const rawLine of text.split(/\r?\n/)) {
    if (isFactoryPromptLine(rawLine)) continue
    const line = rawLine.trim()

    // Decision N: body
    let m = /^Decision\s+(\d+)\s*:\s*(.+)$/i.exec(line)
    if (m) {
      recordDecision(byKey, Number(m[1]), m[2] || '')
      continue
    }

    // Decision: body (unnumbered — Snowflake catalog essay style)
    m = /^Decision\s*:\s*(.+)$/i.exec(line)
    if (m) {
      recordDecision(byKey, 0, m[1] || '')
      continue
    }

    // "1 - ignore the catalog…" (human numbered dash replies; not "1. Reply on")
    m = /^(\d+)\s+[—–-]\s+(.+)$/.exec(line)
    if (m) {
      recordDecision(byKey, Number(m[1]), m[2] || '')
      continue
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index
    return a.line.localeCompare(b.line)
  })
}

/** Strip extracted Decision lines from text (for freeform remainder). */
export function stripDecisionLines(text: string): string {
  if (!text.trim()) return ''
  const out: string[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    if (isFactoryPromptLine(rawLine)) continue
    const line = rawLine.trim()
    if (/^Decision\s+(\d+\s*)?:\s*.+/i.test(line)) continue
    if (/^\d+\s+[—–-]\s+.+/.test(line)) continue
    out.push(rawLine)
  }
  return out.join('\n').trim()
}

/**
 * True when leftover operator text looks like a dossier/scope correction
 * (not just "thanks" / empty).
 */
export function isSubstantiveFreeform(text: string): boolean {
  const stripped = stripDecisionLines(text)
    .replace(/##\s*Operator decisions[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!stripped) return false
  if (TRIVIAL_FREEFORM_RE.test(stripped)) return false
  // Short but intentional directives
  if (
    /\b(?:ignore|keep|omit|drop|use|prefer|custom-remote|catalog|tenanted|revise|patch|hedge)\b/i.test(
      stripped
    ) &&
    stripped.length >= 12
  ) {
    return true
  }
  // Otherwise require a bit of prose
  return stripped.length >= 40
}

/** Factory-authored issue comments (not human operator signal). */
export function isFactoryComment(body: string): boolean {
  const t = body.trim()
  if (!t) return true
  if (/^Resolved as\s+`/i.test(t)) return true
  if (/^Resuming on (?:existing factory PR|factory branch)/i.test(t)) return true
  if (/^##\s*Scope check\b/i.test(t)) return true
  if (/^##\s*Pipeline review\b/i.test(t)) return true
  if (/^`guide:draft`\s+run failed/i.test(t)) return true
  if (/^Starting `draft-guide`/i.test(t)) return true
  return false
}

/**
 * Human comments after the latest factory Scope check / Pipeline review /
 * Resolved comment. Empty when the operator re-labeled without new replies.
 */
export function recentOperatorComments(commentThread: string): string {
  if (!commentThread.trim()) return ''
  const parts = commentThread.split(/\n\n---\n\n/)
  let lastFactory = -1
  for (let i = 0; i < parts.length; i++) {
    if (isFactoryComment(parts[i] || '')) lastFactory = i
  }
  return parts
    .slice(lastFactory + 1)
    .filter((p) => !isFactoryComment(p || ''))
    .join('\n\n')
    .trim()
}

/** Append verbatim Decision lines to distill notes if missing. */
export function mergeDecisionNotes(
  notes: string,
  decisions: ExtractedDecision[]
): string {
  if (decisions.length === 0) return notes || ''
  const existingKeys = new Set(
    extractDecisions(notes).map((d) =>
      d.index >= 1 ? `n:${d.index}` : `u:${d.body.toLowerCase()}`
    )
  )
  const missing = decisions.filter((d) => {
    const key = d.index >= 1 ? `n:${d.index}` : `u:${d.body.toLowerCase()}`
    return !existingKeys.has(key)
  })
  if (missing.length === 0) {
    const fromNotes = extractDecisions(notes)
    if (fromNotes.length >= decisions.length) return notes || ''
  }
  const block = [
    '## Operator decisions (verbatim)',
    ...decisions.map((d) => d.line),
  ].join('\n')
  const base = (notes || '').trim()
  if (!base) return block
  if (/##\s*Operator decisions/i.test(base)) {
    return base
      .replace(
        /##\s*Operator decisions \(verbatim\)[\s\S]*?(?=##\s|\s*$)/i,
        block + '\n\n'
      )
      .trim()
  }
  return `${base}\n\n${block}`
}

export function notesForceFullResearch(notes: string): boolean {
  return FORCE_RESEARCH_RE.test(notes || '')
}

export function summarizeDecisionKinds(decisions: ExtractedDecision[]): {
  scope: number
  fact: number
  other: number
} {
  const out = { scope: 0, fact: 0, other: 0 }
  for (const d of decisions) out[d.kind]++
  return out
}
