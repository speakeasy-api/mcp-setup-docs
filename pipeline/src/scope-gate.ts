/**
 * Factory scope gate — classify research open questions as material
 * (pause before draft) vs soft (continue; list as FYI).
 *
 * Catalog-presence OQs stay soft for the Pulse lookup skip/ambiguous
 * fallback (dual add-server conditional). When lookup resolves
 * present/absent, research should not emit those OQs at all.
 */
import { isDuplicateQuestion, normalizeQuestion } from './text-similarity.ts'

export type ScopeDecision = {
  index: number // 1-based
  question: string
  why_material: string
}

export type ScopeGateResult = {
  /** True when the pipeline should stop before draft. */
  pause: boolean
  material: ScopeDecision[]
  soft: string[]
  /** Material questions still lacking a Decision N reply in notes. */
  unanswered: ScopeDecision[]
}

const SOFT_RE =
  /catalog|speakeasy mcp catalog|keep.*conditional|catalog[\s-]?vs[\s-]?custom|presence.*(unknown|unconfirmed|unobserved)|later-ops|maintenance|out of (band|scope)|post-setup|hedge already|already hedged/i

const MATERIAL_RE =
  /regenerat|recovery path|miss(?:ed)?\b.*\b(?:token|secret)|one-time secret|destructive.?rotat|reopen.*keys|keys and tokens|conflict|disagree|sources? (?:conflict|differ|contradict)|mutually exclusive|which (?:auth|path|flow|option) to document|drop (?:this |the )?(?:branch|path|recovery)/i

/** Exact UI silence alone is soft under Phase 1 (hedge + OQ). */
const SILENCE_ONLY_RE =
  /(?:exact|undocumented|does not publish|not publish|silent|unknown).*(?:label|button|field|control|chrome)|(?:label|button|field|control).*(?:undocumented|does not publish|not publish|silent|unknown)/i

export function isMaterialOpenQuestion(q: string): boolean {
  const s = q.trim()
  if (!s) return false
  if (SOFT_RE.test(s)) return false
  // UI silence / undocumented chrome is soft even when the sentence names a
  // recovery surface (e.g. "Keys and tokens") — hedge + OQ, don't pause.
  if (SILENCE_ONLY_RE.test(s)) return false
  if (MATERIAL_RE.test(s)) return true
  return false
}

export function whyMaterial(q: string): string {
  const s = q.toLowerCase()
  if (/regenerat|recovery|miss(?:ed)?|one-time|keys and tokens|destructive/.test(s)) {
    return 'First-connect recovery / one-time secret path — deepen vs drop needs a human call.'
  }
  if (/conflict|disagree|contradict|differ|mutually exclusive|which (?:auth|path|flow|option)/.test(s)) {
    return 'Conflicting or mutually exclusive setup paths — pick one before drafting.'
  }
  if (/drop (?:this |the )?(?:branch|path|recovery)/.test(s)) {
    return 'Optional recovery/branch may be in or out of guide scope.'
  }
  return 'Scope choice that changes what the Writer should document.'
}

/**
 * Parse the "## Open questions" bullet list from a Research Dossier.
 *
 * A bullet can wrap over many lines. A line that is indented more than its
 * bullet marker is a continuation of that bullet. A blank line, a new bullet
 * marker, a line at or below the marker indent, the next "## " heading and
 * the end of the file all end the bullet in progress.
 */
export function extractOpenQuestionsFromResearch(md: string): string[] {
  const lines = md.split(/\r?\n/)
  let inSection = false
  const out: string[] = []
  /** Text of the bullet in progress, or null when no bullet is open. */
  let current: string | null = null
  /** Leading-whitespace count of the marker of the bullet in progress. */
  let markerIndent = 0

  const flush = (): void => {
    if (current === null) return
    const text = current.replace(/\s+/g, ' ').trim()
    if (text) out.push(text)
    current = null
  }

  for (const line of lines) {
    if (/^##\s+Open questions\s*$/i.test(line)) {
      inSection = true
      continue
    }
    if (inSection && /^##\s+/.test(line)) {
      flush()
      break
    }
    if (!inSection) continue

    const marker = /^(\s*)[-*]\s+(.+?)\s*$/.exec(line)
    if (marker) {
      flush()
      markerIndent = marker[1]!.length
      current = marker[2]!
      continue
    }

    // Lines outside a bullet carry no question text.
    if (current === null) continue
    if (!line.trim()) {
      flush()
      continue
    }
    const indent = line.length - line.trimStart().length
    if (indent > markerIndent) {
      current += ' ' + line.trim()
    } else {
      flush()
    }
  }
  flush()
  return out
}

/**
 * Join the report open questions and the dossier open questions into one list.
 *
 * The report text always wins. A dossier entry that says the same thing as a
 * report entry is discarded, and the report entry keeps its exact text and its
 * position. The comparison is cross-list only: the function compares a dossier
 * entry against the report entries, and never against another dossier entry.
 * Two dossier bullets can score high against each other and still be different
 * questions, so `kept` holds a snapshot of the report entries.
 */
export function mergeOpenQuestions(
  fromReport: string[] | undefined,
  fromDossier: string[]
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const q of fromReport || []) {
    const text = q.trim()
    const key = normalizeQuestion(text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  const kept = [...out]
  for (const q of fromDossier) {
    const text = q.trim()
    const key = normalizeQuestion(text)
    if (!key || seen.has(key)) continue
    if (kept.some((r) => isDuplicateQuestion(text, r))) continue
    seen.add(key)
    out.push(text)
  }
  return out
}

/**
 * Which Decision N lines appear in operator notes / issue thread text.
 * Returns the set of answered decision numbers (1-based).
 */
export function parsedDecisionNumbers(notes: string): Set<number> {
  const found = new Set<number>()
  const re = /Decision\s+(\d+)\s*:/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(notes)) !== null) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n >= 1) found.add(n)
  }
  return found
}

/**
 * Freeform fallback: notes that clearly dispose of an OQ without Decision N.
 * Conservative — only matches strong dispose verbs + overlapping keywords.
 */
export function notesDisposeOfQuestion(notes: string, question: string): boolean {
  if (!notes.trim()) return false
  const n = notes.toLowerCase()
  const q = question.toLowerCase()
  const dispose =
    /\b(?:hedge|omit|drop(?:ping)?(?:\s+this)?(?:\s+branch)?|skip(?:ping)?|apply|override|out of (?:band|scope)|do not (?:invent|document)|unknown\s*\/\s*omit)\b/i.test(
      notes
    )
  if (!dispose) return false
  // Require at least two distinctive token overlaps (≥5 chars) from the question.
  const tokens = q
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 5)
    .slice(0, 12)
  const hits = tokens.filter((t) => n.includes(t)).length
  return hits >= 2
}

export function evaluateScopeGate(
  openQuestions: string[],
  notes: string
): ScopeGateResult {
  const material: ScopeDecision[] = []
  const soft: string[] = []
  for (const q of openQuestions) {
    if (isMaterialOpenQuestion(q)) {
      material.push({
        index: material.length + 1,
        question: q,
        why_material: whyMaterial(q),
      })
    } else {
      soft.push(q)
    }
  }

  const decisions = parsedDecisionNumbers(notes)
  const unanswered = material.filter((d) => {
    if (decisions.has(d.index)) return false
    if (notesDisposeOfQuestion(notes, d.question)) return false
    return true
  })

  return {
    pause: unanswered.length > 0,
    material,
    soft,
    unanswered,
  }
}
