import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyDecisionBody,
  extractDecisions,
  isTemplateDecisionBody,
  mergeDecisionNotes,
  notesForceFullResearch,
} from './decisions.ts'

describe('isTemplateDecisionBody', () => {
  it('rejects factory Scope check examples', () => {
    assert.equal(isTemplateDecisionBody('verified — …'), true)
    assert.equal(isTemplateDecisionBody('drop this branch'), false)
    assert.equal(isTemplateDecisionBody('hedge — …'), true)
    assert.equal(
      isTemplateDecisionBody('verified — confirm button is "**Reset secret**"'),
      false
    )
  })
})

describe('classifyDecisionBody', () => {
  it('classifies scope vs fact', () => {
    assert.equal(classifyDecisionBody('drop this branch'), 'scope')
    assert.equal(classifyDecisionBody('hedge — if you see X, ask admin'), 'scope')
    assert.equal(
      classifyDecisionBody('verified — button is "**Reset secret**"'),
      'fact'
    )
    assert.equal(classifyDecisionBody('keep the PrivateLink note'), 'fact')
    assert.equal(classifyDecisionBody('use custom-remote only'), 'fact')
  })
})

describe('extractDecisions', () => {
  it('ignores factory prompt bullets and keeps human replies', () => {
    const text = `
## Scope check
- \`Decision 1: verified — …\` (paste exact labels / path to document)
- \`Decision 1: drop this branch\` (omit the recovery/optional path)
- \`Decision 1: hedge — …\` (keep a soft line; do not invent chrome)

Decision 1: drop this branch
Decision 2: verified — confirm button is "**Reset secret**"
`
    const ds = extractDecisions(text)
    assert.equal(ds.length, 2)
    assert.equal(ds[0]!.index, 1)
    assert.equal(ds[0]!.kind, 'scope')
    assert.equal(ds[0]!.body, 'drop this branch')
    assert.equal(ds[1]!.kind, 'fact')
  })

  it('does not treat bare template drop option inside bullets as an answer', () => {
    const ds = extractDecisions(`
- \`Decision 1: drop this branch\` (omit the recovery/optional path)
`)
    assert.equal(ds.length, 0)
  })

  it('last real body wins per index', () => {
    const ds = extractDecisions(`
Decision 1: drop this branch
Decision 1: hedge — soft line only
`)
    assert.equal(ds.length, 1)
    assert.equal(ds[0]!.kind, 'scope')
    assert.match(ds[0]!.body, /^hedge/)
  })
})

describe('mergeDecisionNotes', () => {
  it('appends verbatim block when distill omitted Decisions', () => {
    const merged = mergeDecisionNotes('prefer OAuth', [
      {
        index: 1,
        line: 'Decision 1: drop this branch',
        body: 'drop this branch',
        kind: 'scope',
      },
    ])
    assert.match(merged, /prefer OAuth/)
    assert.match(merged, /## Operator decisions \(verbatim\)/)
    assert.match(merged, /Decision 1: drop this branch/)
  })
})

describe('notesForceFullResearch', () => {
  it('detects re-research asks', () => {
    assert.equal(notesForceFullResearch('re-research from source docs'), true)
    assert.equal(notesForceFullResearch('drop this branch'), false)
  })
})
