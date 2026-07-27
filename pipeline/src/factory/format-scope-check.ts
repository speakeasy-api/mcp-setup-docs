import { basename } from 'node:path'

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

  const hasStructured =
    Array.isArray(unanswered) &&
    unanswered.length > 0 &&
    typeof unanswered[0] === 'object' &&
    unanswered[0] !== null

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

  const soft = record.scope?.soft ?? []
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
