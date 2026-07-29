import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  formatLedgerNotes,
  ledgerAnswersQuestion,
  mergeDecisionsIntoLedger,
  normalizeQuestionKey,
  readScopeAnswers,
  writeScopeAnswers,
} from './scope-answers.ts'
import { evaluateScopeGate } from './scope-gate.ts'
import {
  buildOperatorNotes,
  stripDecisionLines,
  type ExtractedDecision,
} from './decisions.ts'

function dec(
  index: number,
  body: string,
  kind: ExtractedDecision['kind'] = 'scope'
): ExtractedDecision {
  return {
    index,
    body,
    kind,
    line: index >= 1 ? `Decision ${index}: ${body}` : `Decision: ${body}`,
  }
}

describe('scope-answers ledger (C2)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'scope-answers-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('normalizes question keys stably', () => {
    assert.equal(
      normalizeQuestionKey('Which auth path?'),
      normalizeQuestionKey('  which  auth path?  ')
    )
  })

  it('persists answers across rounds when Decision indices renumber', () => {
    const q1 = 'Which auth path to document when sources conflict?'
    const q2 = 'What happens if the one-time secret is missed?'
    const q3 = 'Is destructive rotation in scope?'
    const oqs = [q1, q2, q3]

    // Round 1 listing (empty ledger): Decision 1 → q1
    let ledger = readScopeAnswers(dir, 'demo')
    const listing1 = evaluateScopeGate(oqs, '', ledger)
    assert.equal(listing1.unanswered.length, 3)
    ledger = mergeDecisionsIntoLedger(
      ledger,
      listing1.unanswered.map((d) => d.question),
      [dec(1, 'drop this branch')],
      '2026-07-29T00:00:00Z'
    )
    writeScopeAnswers(dir, ledger)

    // Round 2: only recent Decision 1 (maps to former q2); q1 remembered
    const notes2 = buildOperatorNotes('prefer OAuth', 'Decision 1: drop this branch')
    const listing2 = evaluateScopeGate(oqs, '', ledger)
    assert.deepEqual(
      listing2.unanswered.map((d) => d.question),
      [q2, q3]
    )
    ledger = mergeDecisionsIntoLedger(
      ledger,
      listing2.unanswered.map((d) => d.question),
      [dec(1, 'drop this branch')],
      '2026-07-29T01:00:00Z'
    )
    // After merge, gate must not re-apply Decision N against renumbered pending.
    const gate2 = evaluateScopeGate(oqs, stripDecisionLines(notes2), ledger)
    assert.equal(gate2.unanswered.length, 1)
    assert.equal(gate2.unanswered[0]!.question, q3)
    assert.equal(ledgerAnswersQuestion(ledger, q1), true)
    assert.equal(ledgerAnswersQuestion(ledger, q2), true)

    // Round 3: Decision 1 clears last remaining — no ping-pong on q1/q2
    ledger = mergeDecisionsIntoLedger(
      ledger,
      evaluateScopeGate(oqs, '', ledger).unanswered.map((d) => d.question),
      [dec(1, 'hedge — soft line only', 'fact')],
      '2026-07-29T02:00:00Z'
    )
    writeScopeAnswers(dir, ledger)
    const gate3 = evaluateScopeGate(
      oqs,
      stripDecisionLines('Decision 1: hedge — soft line only'),
      ledger
    )
    assert.equal(gate3.pause, false)
    assert.equal(gate3.unanswered.length, 0)

    const reloaded = readScopeAnswers(dir, 'demo')
    assert.equal(reloaded.answers.length, 3)
    assert.match(formatLedgerNotes(reloaded), /Persisted scope answers/)
  })

  it('does not let this-round notes shift Decision 1 onto the next OQ', () => {
    const q1 = 'Should we drop the optional recovery path?'
    const q2 = 'Which auth path to document when sources conflict?'
    const notes = 'Decision 1: drop this branch'
    const ledger = mergeDecisionsIntoLedger(
      { schema_version: 1, slug: 'demo', answers: [] },
      // Listing must ignore current notes (empty notes + empty ledger).
      evaluateScopeGate([q1, q2], '', null).unanswered.map((d) => d.question),
      [dec(1, 'drop this branch')],
      '2026-07-29T00:00:00Z'
    )
    assert.equal(ledgerAnswersQuestion(ledger, q1), true)
    assert.equal(ledgerAnswersQuestion(ledger, q2), false)
    // If we had wrongly used evaluateScopeGate(..., notes) for the listing,
    // Decision 1 would land on q2.
    const wrongListing = evaluateScopeGate([q1, q2], notes, null)
    assert.equal(wrongListing.unanswered[0]!.question, q2)
  })
})
