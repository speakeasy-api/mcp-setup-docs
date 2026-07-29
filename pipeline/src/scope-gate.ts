/**
 * Factory scope gate — classify research open questions as material
 * (pause before draft) vs soft (continue; list as FYI).
 *
 * Catalog-presence OQs stay soft for the Pulse lookup skip/ambiguous
 * fallback (dual add-server conditional). When lookup resolves
 * present/absent, research should not emit those OQs at all.
 */
import { extractDecisions } from './decisions.ts'
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

/** Parse "## Open questions" bullet list from a Research Dossier. */
export function extractOpenQuestionsFromResearch(md: string): string[] {
  const lines = md.split(/\r?\n/)
  let inSection = false
  const out: string[] = []
  for (const line of lines) {
    if (/^##\s+Open questions\s*$/i.test(line)) {
      inSection = true
      continue
    }
    if (inSection && /^##\s+/.test(line)) break
    if (!inSection) continue
    const m = /^\s*[-*]\s+(.+?)\s*$/.exec(line)
    if (m) out.push(m[1]!.trim())
  }
  return out
}

export function mergeOpenQuestions(
  fromReport: string[] | undefined,
  fromDossier: string[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const q of [...(fromReport || []), ...fromDossier]) {
    const key = q.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(q.trim())
  }
  return out
}

/**
 * Which Decision N lines appear in operator notes / issue thread text.
 * Returns the set of answered decision numbers (1-based).
 * Uses {@link extractDecisions} so factory template examples do not count.
 */
export function parsedDecisionNumbers(notes: string): Set<number> {
  // Unnumbered `Decision: …` uses index 0 — not a Scope check answer id.
  return new Set(
    extractDecisions(notes)
      .map((d) => d.index)
      .filter((n) => n >= 1)
  )
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
    /\b(?:hedge|omit|drop(?:ping)?(?:\s+this)?(?:\s+branch)?|skip(?:ping)?|out of (?:band|scope)|do not (?:invent|document)|unknown\s*\/\s*omit)\b/i.test(
      notes
    )
  if (!dispose) return false
  // Require at least one distinctive token overlap (≥4 chars) from the question.
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

export function formatScopeCheckComment(opts: {
  slug: string
  gate: ScopeGateResult
  prUrl?: string
}): string {
  const { slug, gate, prUrl } = opts
  const lines: string[] = [
    `## Scope check (\`${slug}\`)`,
    '',
    'Research finished with **material open questions** that change what the guide should document. Drafting is paused until you answer — then re-add `guide:draft`.',
    '',
  ]
  if (prUrl) {
    lines.push(`**Draft PR (research only):** ${prUrl}`, '')
  }

  lines.push(`### Decisions needed (${gate.unanswered.length})`, '')
  for (const d of gate.unanswered) {
    lines.push(`#### ${d.index}. ${d.question}`, '')
    lines.push(`- **Why this blocks draft:** ${d.why_material}`)
    lines.push('')
    lines.push('**Reply with one of:**')
    lines.push(
      `- \`Decision ${d.index}: verified — …\` (paste exact labels / path to document)`
    )
    lines.push(
      `- \`Decision ${d.index}: drop this branch\` (omit the recovery/optional path)`
    )
    lines.push(
      `- \`Decision ${d.index}: hedge — …\` (keep a soft line; do not invent chrome)`
    )
    lines.push('')
  }

  if (gate.soft.length > 0) {
    lines.push(`### Soft open questions (${gate.soft.length}) — no pause`, '')
    lines.push(
      'These stay as dossier hedges / conditionals. No reply required to continue.'
    )
    lines.push('')
    for (const q of gate.soft) {
      lines.push(`- [ ] ${q}`)
    }
    lines.push('')
  }

  lines.push('### How to continue', '')
  lines.push(
    '1. Reply on **this issue** with a **bare** line like `Decision 1: drop this branch` or `Decision 1: verified — …` (not the bulleted/backticked examples above).'
  )
  lines.push(
    '2. Re-add the `guide:draft` label. Distill extracts recent Decisions verbatim and auto-routes research mode (`skip` for drop/omit only, `patch` for verified/hedge/freeform, `full` if you ask to re-research).'
  )
  lines.push(
    '3. The next run resumes on the factory branch, applies that research mode, then **drafts**.'
  )
  lines.push('')
  lines.push('_Source: research open questions · scope gate_')
  return lines.join('\n')
}
