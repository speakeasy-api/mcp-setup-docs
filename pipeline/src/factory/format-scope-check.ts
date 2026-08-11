import { basename } from 'node:path'
import { isDuplicateQuestion } from '../text-similarity.ts'

export type ScopeUnanswered = {
  index?: number
  question?: string
  why_material?: string
}

export type ScopeRecord = {
  slug?: string
  open_questions?: string[]
  scope?: {
    unanswered?: ScopeUnanswered[] | string[]
    soft?: string[]
  }
}

function hasStructuredUnanswered(
  unanswered: ScopeUnanswered[] | string[] | undefined,
): boolean {
  return (
    Array.isArray(unanswered) &&
    unanswered.length > 0 &&
    typeof unanswered[0] === 'object' &&
    unanswered[0] !== null
  )
}

/**
 * The decision questions that `formatScopeCheck` prints in
 * `### Decisions needed`. The record holds them in one of three shapes.
 * This function is the only place that selects between the three shapes,
 * so the formatter and the short summary always agree.
 */
export function decisionQuestions(record: ScopeRecord): string[] {
  const unanswered = record.scope?.unanswered
  if (hasStructuredUnanswered(unanswered)) {
    return (unanswered as ScopeUnanswered[]).map(
      (row) => row.question ?? (typeof row === 'string' ? row : ''),
    )
  }
  if (Array.isArray(unanswered) && unanswered.length > 0) {
    return unanswered as string[]
  }
  return record.open_questions ?? []
}

/**
 * The soft questions to print, with the duplicates removed.
 *
 * Drop each soft question that repeats a decision, or that repeats a soft
 * question already kept. The scope path carries bare strings with no target
 * and no location, so the finding-level dedupe cannot apply here. The shared
 * similarity module is the only test available.
 *
 * Limitation: this repair works on the record only. It cannot repair a
 * record whose soft entries were truncated before they arrived. In the
 * salesforce record the truncated entries share too few tokens, and the
 * highest score between any two of them is 0.4286. The extractor fix
 * repairs that record, and it repairs it for later runs only.
 */
export function dedupeSoftQuestions(record: ScopeRecord): string[] {
  const decisionTexts = decisionQuestions(record)
  const soft: string[] = []
  for (const q of record.scope?.soft ?? []) {
    if (decisionTexts.some((d) => isDuplicateQuestion(q, d))) continue
    if (soft.some((k) => isDuplicateQuestion(q, k))) continue
    soft.push(q)
  }
  return soft
}

/** Format a Scope check comment from a run record (awaiting_scope). */
export function formatScopeCheck(record: ScopeRecord, prUrl = '', recordPath = ''): string {
  const slug = record.slug ?? '?'
  const unanswered = record.scope?.unanswered
  const openQuestions = record.open_questions ?? []
  const lines: string[] = []

  lines.push(`## Scope check (\`${slug}\`)`)
  lines.push('')
  lines.push(
    'Research finished with **material open questions** that change what the guide should document. Drafting is paused until you answer — then re-add `guide:draft`.',
  )
  lines.push('')
  if (prUrl) {
    lines.push(`**Draft PR (research only):** ${prUrl}`)
    lines.push('')
  }

  const hasStructured = hasStructuredUnanswered(unanswered)

  const count = hasStructured
    ? (unanswered as ScopeUnanswered[]).length
    : unanswered && unanswered.length > 0
      ? unanswered.length
      : openQuestions.length

  if (count > 0) {
    lines.push(`### Decisions needed (${count})`)
    lines.push('')

    if (hasStructured) {
      let i = 0
      for (const row of unanswered as ScopeUnanswered[]) {
        i++
        const idx = row.index ?? i
        const question =
          row.question ?? (typeof row === 'string' ? row : '')
        const why =
          row.why_material ??
          'Scope choice that changes what the Writer should document.'
        lines.push(`#### ${idx}. ${question}`)
        lines.push('')
        lines.push(`- **Why this blocks draft:** ${why}`)
        lines.push('')
        lines.push('**Reply with one of:**')
        lines.push(
          `- \`Decision ${idx}: verified — …\` (paste exact labels / path to document)`,
        )
        lines.push(
          `- \`Decision ${idx}: drop this branch\` (omit the recovery/optional path)`,
        )
        lines.push(
          `- \`Decision ${idx}: hedge — …\` (keep a soft line; do not invent chrome)`,
        )
        lines.push('')
      }
    } else if (Array.isArray(unanswered) && unanswered.length > 0) {
      let i = 0
      for (const q of unanswered as string[]) {
        i++
        lines.push(`#### ${i}. ${q}`)
        lines.push('')
        lines.push(
          '- **Why this blocks draft:** Scope choice that changes what the Writer should document.',
        )
        lines.push('')
        lines.push('**Reply with one of:**')
        lines.push(`- \`Decision ${i}: verified — …\``)
        lines.push(`- \`Decision ${i}: drop this branch\``)
        lines.push(`- \`Decision ${i}: hedge — …\``)
        lines.push('')
      }
    } else {
      let i = 0
      for (const q of openQuestions) {
        i++
        lines.push(`#### ${i}. ${q}`)
        lines.push('')
        lines.push(
          '- **Why this blocks draft:** Scope choice that changes what the Writer should document.',
        )
        lines.push('')
        lines.push('**Reply with one of:**')
        lines.push(`- \`Decision ${i}: verified — …\``)
        lines.push(`- \`Decision ${i}: drop this branch\``)
        lines.push(`- \`Decision ${i}: hedge — …\``)
        lines.push('')
      }
    }
  }

  // The duplicate suppression lives in `dedupeSoftQuestions` above. The short
  // summary in `format-summary.ts` calls the same helper, so the two comments
  // always print the same count.
  const soft = dedupeSoftQuestions(record)
  if (soft.length > 0) {
    lines.push(`### Soft open questions (${soft.length}) — no pause`)
    lines.push('')
    lines.push(
      'These stay as dossier hedges / conditionals. No reply required to continue.',
    )
    lines.push('')
    for (const s of soft) lines.push(`- [ ] ${s}`)
    lines.push('')
  }

  lines.push('### How to continue')
  lines.push('')
  lines.push('1. Reply on **this issue** using the `Decision N: …` lines above.')
  lines.push(
    '2. Re-add the `guide:draft` label. Distill folds your replies into pipeline notes.',
  )
  lines.push(
    '3. The next run resumes on the factory branch, revises research if needed, then **drafts**.',
  )
  lines.push('')
  if (recordPath) {
    lines.push(`_Source: \`${basename(recordPath)}\`_`)
  }
  return lines.join('\n')
}
