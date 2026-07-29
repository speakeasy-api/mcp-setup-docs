import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateScopeGate,
  parsedDecisionNumbers,
} from './scope-gate.ts'
import { buildOperatorNotes } from './decisions.ts'

describe('parsedDecisionNumbers', () => {
  it('counts bare and decorated replies but not factory template bullets', () => {
    const notes = `
- \`Decision 1: verified — …\` (paste exact labels)
- \`Decision 1: drop this branch\` (omit the recovery/optional path)

Decision 1: drop this branch
\`Decision 2: verified — Reset secret\`
`
    const nums = parsedDecisionNumbers(notes)
    assert.deepEqual([...nums].sort(), [1, 2])
  })

  it('ignores unnumbered Decision: for scope-gate indices', () => {
    const nums = parsedDecisionNumbers(
      'Decision: ignore catalog\nDecision 1: drop this branch'
    )
    assert.deepEqual([...nums], [1])
  })
})

describe('evaluateScopeGate + C2 notes hygiene', () => {
  it('stale Decision 2/3 stripped from distill cannot clear new material OQs', () => {
    const distillLeak =
      'Resume notes. Decision 2: Ignore this. Decision 3: follow oauth.'
    const recent = 'Decision 1: drop this branch'
    const notes = buildOperatorNotes(distillLeak, recent)

    const gate = evaluateScopeGate(
      [
        'Which auth path to document when sources conflict?',
        'What happens if the one-time secret is missed?',
        'Is destructive rotation in scope?',
      ],
      notes
    )
    assert.equal(gate.material.length, 3)
    assert.equal(gate.unanswered.length, 2) // only Decision 1 answered
    assert.equal(gate.pause, true)
    assert.deepEqual(
      gate.unanswered.map((d) => d.index),
      [2, 3]
    )
  })

  it('recent Decision 1 alone clears a single material OQ', () => {
    const notes = buildOperatorNotes('prefer OAuth', 'Decision 1: drop this branch')
    const gate = evaluateScopeGate(
      ['Should we drop the optional recovery path?'],
      notes
    )
    assert.equal(gate.pause, false)
    assert.equal(gate.unanswered.length, 0)
  })
})
