/**
 * Deterministic Decision extraction and classification for factory notes.
 *
 * Issue threads fold Scope check / Pipeline review templates that contain
 * example `Decision N: …` lines. Those must not count as human answers.
 * Real replies are extracted verbatim so distill's LLM cannot drop them.
 *
 * Accepted reply shapes (Snowflake-hardened):
 *   Decision 1: drop this branch
 *   `Decision 1: verified — …` / > Decision 1: … / **Decision 1:** …
 *   Decision 1: hedge
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
  /^(?:verified|drop this branch|hedge)\s*[—–-]\s*(?:…|\.{2,})\s*$/i

const BARE_TEMPLATE_RE =
  /^(?:verified|drop this branch|hedge)\s*[—–-]\s*$/i

const SCOPE_VERB_RE =
  /^(drop(?:\s+this)?(?:\s+branch)?|omit(?:\s+this)?(?:\s+branch)?|skip(?:ping)?(?:\s+this)?(?:\s+branch)?|out of (?:band|scope))\b(.*)$/i

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

/**
 * Classify a Decision body.
 * - bare drop/omit → scope (skip-safe)
 * - drop/omit with extra instructions → fact (must patch dossier — C3)
 * - hedge / verified / ignore / … → fact
 */
export function classifyDecisionBody(body: string): DecisionKind {
  const b = body.trim()
  if (!b) return 'other'
  // hedge → patch (fact): bare or with soft wording; never skip-carry-forward
  if (/^hedge\b/i.test(b)) return 'fact'

  const scopeMatch = SCOPE_VERB_RE.exec(b)
  if (scopeMatch) {
    const rest = (scopeMatch[2] || '')
      .replace(/^[—–\-:.,\s]+/, '')
      .trim()
    // Fat drop: "drop this branch — instead document Settings > …"
    if (
      rest &&
      !isTemplateDecisionBody(rest) &&
      rest !== '…' &&
      rest !== '...'
    ) {
      return 'fact'
    }
    return 'scope'
  }

  if (FACT_BODY_RE.test(b)) return 'fact'
  // "Decision N: custom-remote only" etc. — treat as dossier patch
  if (b.length >= 8) return 'fact'
  return 'other'
}

/**
 * Factory Scope check / Pipeline review lines look like:
 *   - `Decision 1: drop this branch` (omit the recovery/optional path)
 * Those are prompts, not answers.
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
  if (/^\d+\.\s+(?:Reply on|Re-add the|If a factory)/i.test(line)) {
    return true
  }
  return false
}

/**
 * Strip common markdown decoration so copy-pasted Scope check replies still
 * parse (C1): backticks, blockquotes, bold, list markers.
 */
export function normalizeDecisionLine(rawLine: string): string {
  let line = rawLine.trim()
  // blockquote
  line = line.replace(/^>\s*/, '')
  // unordered list marker (human "- Decision 1: …" without template paren)
  line = line.replace(/^[-*]\s+/, '')
  // wrap whole line in backticks
  if (line.startsWith('`') && line.endsWith('`') && line.length >= 2) {
    line = line.slice(1, -1).trim()
  }
  // **Decision 1:** body  or  **Decision 1: body**
  line = line.replace(
    /^\*\*(Decision\s+\d*\s*:)\*\*\s*/i,
    '$1 '
  )
  line = line.replace(/^\*\*(Decision\s+\d*\s*:[^*]+)\*\*\s*$/i, '$1')
  // trailing/leading stray backticks around the Decision token
  line = line.replace(/^`+(Decision\b)/i, '$1').replace(/(Decision\s+\d*\s*:[^`]*)`+\s*$/i, '$1')
  return line.trim()
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
    const line = normalizeDecisionLine(rawLine)
    if (!line) continue

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

/** Strip extracted Decision lines from text (for freeform remainder / C2). */
export function stripDecisionLines(text: string): string {
  if (!text.trim()) return ''
  const out: string[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    if (isFactoryPromptLine(rawLine)) continue
    // Drop the verbatim block header so re-merge is clean
    if (/^##\s*Operator decisions\b/i.test(rawLine.trim())) continue

    const line = normalizeDecisionLine(rawLine)
    if (/^Decision\s+(\d+\s*)?:\s*.+/i.test(line)) continue
    if (/^\d+\s+[—–-]\s+.+/.test(line)) continue

    // Distill often pastes "Decision N: …" mid-prose. Strip those clauses so
    // stale ids cannot leak into NOTES and satisfy the scope gate (C2).
    let prose = rawLine
      .replace(/\bDecision\s+\d+\s*:\s*[^.\n|;]+[.\n|;]?/gi, '')
      .replace(/\bDecision\s*:\s*[^.\n|;]+[.\n|;]?/gi, '')
      .replace(/(?:^|\s)\d+\s+[—–-]\s+[^.\n|;]+[.\n|;]?/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (prose) out.push(prose)
  }
  return out.join('\n').trim()
}

/**
 * True when leftover operator text looks like a dossier/scope correction
 * (not just "thanks" / empty). No length escape hatch (C3) — any non-trivial
 * remainder after stripping Decisions is substantive.
 */
export function isSubstantiveFreeform(text: string): boolean {
  const stripped = stripDecisionLines(text)
    .replace(/##\s*Operator decisions[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!stripped) return false
  if (TRIVIAL_FREEFORM_RE.test(stripped)) return false
  return true
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
  if (/^`guide:draft`\s+bootstrap failed/i.test(t)) return true
  if (/^Refused to run:/i.test(t)) return true
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

/**
 * Build operator notes for the pipeline (C2):
 * strip any Decision lines distill copied from the full thread, then append
 * only Decisions from *recent* operator comments so stale N ids cannot
 * satisfy the scope gate for new material questions.
 */
export function buildOperatorNotes(
  distillNotes: string,
  recentCommentText: string
): string {
  const cleaned = stripDecisionLines(distillNotes || '')
  const recentDecisions = extractDecisions(recentCommentText || '')
  return mergeDecisionNotes(cleaned, recentDecisions)
}

/** Append verbatim Decision lines to distill notes if missing. */
export function mergeDecisionNotes(
  notes: string,
  decisions: ExtractedDecision[]
): string {
  if (decisions.length === 0) return notes || ''
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
