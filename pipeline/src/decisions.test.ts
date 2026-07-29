import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyDecisionBody,
  extractDecisions,
  isFactoryComment,
  isSubstantiveFreeform,
  isTemplateDecisionBody,
  mergeDecisionNotes,
  notesForceFullResearch,
  recentOperatorComments,
  stripDecisionLines,
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
  it('classifies drop as scope and hedge/verified as fact (patch)', () => {
    assert.equal(classifyDecisionBody('drop this branch'), 'scope')
    assert.equal(classifyDecisionBody('omit this branch'), 'scope')
    assert.equal(classifyDecisionBody('hedge'), 'fact')
    assert.equal(classifyDecisionBody('hedge — if you see X, ask admin'), 'fact')
    assert.equal(
      classifyDecisionBody('verified — button is "**Reset secret**"'),
      'fact'
    )
    assert.equal(classifyDecisionBody('keep the PrivateLink note'), 'fact')
    assert.equal(classifyDecisionBody('ignore the catalog'), 'fact')
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

  it('accepts unnumbered Decision: lines', () => {
    const ds = extractDecisions(
      'Decision: ignore the Speakeasy MCP Catalog entry entirely for this guide.'
    )
    assert.equal(ds.length, 1)
    assert.equal(ds[0]!.index, 0)
    assert.equal(ds[0]!.kind, 'fact')
    assert.match(ds[0]!.line, /^Decision: ignore/)
  })

  it('accepts numbered dash replies (Snowflake style)', () => {
    const ds = extractDecisions(`
1 - ignore the catalog mcp server. Follow the docs.
2 - Ignore this.
3 - not sure what to make of this? follow the oauth setup per #1.
`)
    assert.equal(ds.length, 3)
    assert.equal(ds[0]!.index, 1)
    assert.equal(ds[0]!.kind, 'fact')
    assert.match(ds[0]!.body, /ignore the catalog/i)
  })

  it('does not treat factory how-to "1. Reply on" as a Decision', () => {
    const ds = extractDecisions(`
1. Reply on **this issue** using the Decision lines.
2. Re-add the \`guide:draft\` label.
`)
    assert.equal(ds.length, 0)
  })

  it('last real body wins per index; bare hedge is fact', () => {
    const ds = extractDecisions(`
Decision 1: drop this branch
Decision 1: hedge
`)
    assert.equal(ds.length, 1)
    assert.equal(ds[0]!.kind, 'fact')
    assert.equal(ds[0]!.body, 'hedge')
  })
})

describe('isSubstantiveFreeform / recentOperatorComments', () => {
  it('detects freeform catalog corrections', () => {
    assert.equal(
      isSubstantiveFreeform(
        'For this guide, we should ignore the catalog MCP server.'
      ),
      true
    )
    assert.equal(isSubstantiveFreeform('thanks'), false)
    assert.equal(isSubstantiveFreeform('Decision 1: drop this branch'), false)
  })

  it('returns only comments after the last factory review', () => {
    const thread = [
      '## Pipeline review (`snowflake`)',
      '',
      '### Decisions needed',
      '',
      '---',
      '',
      '1 - ignore the catalog mcp server.',
      '',
      '---',
      '',
      'Resuming on existing factory PR: https://example/pr/1',
      '',
      'Resolved as `snowflake`.',
      '',
      '---',
      '',
      'Decision 1: hedge',
    ].join('\n')
    // Split the way gh join does
    const joined = [
      '## Pipeline review (`snowflake`)\n\n### Decisions needed',
      '1 - ignore the catalog mcp server.',
      'Resuming on existing factory PR: https://example/pr/1\n\nResolved as `snowflake`.',
      'Decision 1: hedge',
    ].join('\n\n---\n\n')
    const recent = recentOperatorComments(joined)
    assert.match(recent, /Decision 1: hedge/)
    assert.equal(recent.includes('ignore the catalog'), false)
    assert.equal(isFactoryComment('## Pipeline review (`x`)'), true)
    assert.equal(stripDecisionLines('Decision 1: drop\nkeep this').includes('keep'), true)
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
