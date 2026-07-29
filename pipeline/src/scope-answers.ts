/**
 * Persisted scope answers for factory resume (C2).
 *
 * Decision indices reset per Scope check listing, so answers are keyed by
 * normalized question text — not by Decision N. Recency still governs
 * research-mode routing; this ledger governs scope-gate answeredness across
 * rounds so answering Decision 2 after Decision 1 does not forget Decision 1.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ExtractedDecision } from './decisions.ts'

export const SCOPE_ANSWERS_FILENAME = 'scope-answers.json'

export type ScopeAnswer = {
  /** Normalized question key */
  question_key: string
  /** Original question text (best-effort) */
  question: string
  /** Decision body (e.g. "drop this branch") */
  body: string
  kind: ExtractedDecision['kind']
  /** ISO timestamp when recorded */
  answered_at: string
}

export type ScopeAnswersFile = {
  schema_version: 1
  slug: string
  answers: ScopeAnswer[]
}

export function normalizeQuestionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s?-]/g, '')
    .trim()
}

export function scopeAnswersPath(guideDirectory: string): string {
  return join(guideDirectory, SCOPE_ANSWERS_FILENAME)
}

export function readScopeAnswers(
  guideDirectory: string,
  slug: string
): ScopeAnswersFile {
  const path = scopeAnswersPath(guideDirectory)
  if (!existsSync(path)) {
    return { schema_version: 1, slug, answers: [] }
  }
  try {
    const data = JSON.parse(readFileSync(path, 'utf8')) as ScopeAnswersFile
    if (!data || data.schema_version !== 1 || !Array.isArray(data.answers)) {
      return { schema_version: 1, slug, answers: [] }
    }
    return {
      schema_version: 1,
      slug: data.slug || slug,
      answers: data.answers.filter(
        (a) => a && typeof a.question_key === 'string' && typeof a.body === 'string'
      ),
    }
  } catch {
    return { schema_version: 1, slug, answers: [] }
  }
}

export function writeScopeAnswers(
  guideDirectory: string,
  file: ScopeAnswersFile
): void {
  writeFileSync(
    scopeAnswersPath(guideDirectory),
    JSON.stringify(file, null, 2) + '\n'
  )
}

/** True when the ledger already answers this open question. */
export function ledgerAnswersQuestion(
  file: ScopeAnswersFile,
  question: string
): boolean {
  const key = normalizeQuestionKey(question)
  if (!key) return false
  return file.answers.some((a) => a.question_key === key)
}

/**
 * Merge Decision N answers onto the current material-question list.
 * Index N maps to material[N-1] for this run's numbering.
 */
export function mergeDecisionsIntoLedger(
  file: ScopeAnswersFile,
  materialQuestions: string[],
  decisions: ExtractedDecision[],
  answeredAt: string
): ScopeAnswersFile {
  const byKey = new Map(file.answers.map((a) => [a.question_key, a]))
  for (const d of decisions) {
    if (d.index < 1) continue
    const question = materialQuestions[d.index - 1]
    if (!question) continue
    const key = normalizeQuestionKey(question)
    if (!key) continue
    byKey.set(key, {
      question_key: key,
      question,
      body: d.body,
      kind: d.kind,
      answered_at: answeredAt,
    })
  }
  return {
    schema_version: 1,
    slug: file.slug,
    answers: [...byKey.values()].sort((a, b) =>
      a.question_key.localeCompare(b.question_key)
    ),
  }
}

/** Format ledger for agent notes (skip path still needs dispositions). */
export function formatLedgerNotes(file: ScopeAnswersFile): string {
  if (file.answers.length === 0) return ''
  const lines = [
    '## Persisted scope answers',
    ...file.answers.map((a) => `- ${a.question} → ${a.body}`),
  ]
  return lines.join('\n')
}
