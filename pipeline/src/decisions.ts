/**
 * Deterministic Decision extraction and classification for factory notes.
 *
 * Issue threads fold Scope check / Pipeline review templates that contain
 * example `Decision N: …` lines. Those must not count as human answers.
 * Real replies are extracted verbatim so distill's LLM cannot drop them.
 */

export type DecisionKind = 'scope' | 'fact' | 'other'

export type ExtractedDecision = {
  /** 1-based index from `Decision N:` */
  index: number
  /** Full line without leading list markers, trimmed */
  line: string
  /** Text after `Decision N:` */
  body: string
  kind: DecisionKind
}

/** Template / placeholder bodies from factory comments — not human answers. */
const TEMPLATE_BODY_RE =
  /^(?:verified|drop this branch|hedge)\s*[—–-]\s*(?:…|\.{2,}|…)\s*$/i

const BARE_TEMPLATE_RE =
  /^(?:verified|drop this branch|hedge)\s*[—–-]\s*$/i

/** Scope-only dispositions — safe to skip a research crawl. */
const SCOPE_BODY_RE =
  /^(?:drop(?:\s+this)?(?:\s+branch)?|omit(?:\s+this)?(?:\s+branch)?|hedge\b|skip(?:ping)?(?:\s+this)?(?:\s+branch)?|out of (?:band|scope))\b/i

/** Fact-bearing / dossier-patch dispositions. */
const FACT_BODY_RE =
  /^(?:verified\b|confirm\b|use\b|keep\b|prefer\b|force\b|set\b|switch\b|document\b)/i

/** Explicit full re-research asks in freeform notes. */
const FORCE_RESEARCH_RE =
  /\b(?:re-?research|force(?:\s+full)?\s+research|docs?\s+moved|re-?crawl|from\s+source(?:\s+docs?)?)\b/i

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
  if (/^[-*]\s+`Decision\s+\d+\s*:/i.test(line)) return true
  // Bullet Decision with trailing parenthetical explanation
  if (
    /^[-*]\s+`?Decision\s+\d+\s*:/i.test(line) &&
    /\)\s*$/.test(line) &&
    /\(/.test(line)
  ) {
    return true
  }
  return false
}

/**
 * Extract real Decision lines from issue body / comment thread text.
 * Keeps the last body per index when duplicates appear (human reply wins
 * over earlier template noise once templates are filtered).
 */
export function extractDecisions(text: string): ExtractedDecision[] {
  if (!text.trim()) return []
  const byIndex = new Map<number, ExtractedDecision>()
  for (const rawLine of text.split(/\r?\n/)) {
    if (isFactoryPromptLine(rawLine)) continue
    const m = /^\s*Decision\s+(\d+)\s*:\s*(.+?)\s*$/i.exec(rawLine)
    if (!m) continue
    const index = Number(m[1])
    if (!Number.isFinite(index) || index < 1) continue
    let body = (m[2] || '').trim()
    body = body.replace(/^`+|`+$/g, '').trim()
    if (isTemplateDecisionBody(body)) continue
    const line = `Decision ${index}: ${body}`
    byIndex.set(index, {
      index,
      line,
      body,
      kind: classifyDecisionBody(body),
    })
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index)
}

/** Append verbatim Decision lines to distill notes if missing. */
export function mergeDecisionNotes(
  notes: string,
  decisions: ExtractedDecision[]
): string {
  if (decisions.length === 0) return notes || ''
  const existing = new Set(
    extractDecisions(notes).map((d) => d.index)
  )
  const missing = decisions.filter((d) => !existing.has(d.index))
  if (missing.length === 0) {
    // Still ensure notes contain the canonical lines when distill paraphrased
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
    // Replace prior verbatim block
    return base.replace(
      /##\s*Operator decisions \(verbatim\)[\s\S]*?(?=##\s|\s*$)/i,
      block + '\n\n'
    ).trim()
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
