import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildOperatorNotes,
  classifyDecisionBody,
  extractDecisions,
  isFactoryComment,
  isSubstantiveFreeform,
  isTemplateDecisionBody,
  mergeDecisionNotes,
  normalizeDecisionLine,
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

describe('classifyDecisionBody (C3)', () => {
  it('classifies bare drop as scope and fat drop / hedge as fact', () => {
    assert.equal(classifyDecisionBody('drop this branch'), 'scope')
    assert.equal(classifyDecisionBody('omit this branch'), 'scope')
    assert.equal(
      classifyDecisionBody(
        'drop this branch — instead document Settings > Admin > MCP'
      ),
      'fact'
    )
    assert.equal(classifyDecisionBody('hedge'), 'fact')
    assert.equal(classifyDecisionBody('hedge — if you see X, ask admin'), 'fact')
    assert.equal(
      classifyDecisionBody('verified — button is "**Reset secret**"'),
      'fact'
    )
    assert.equal(classifyDecisionBody('ignore the catalog'), 'fact')
  })
})

describe('extractDecisions (C1 decoration)', () => {
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
    assert.equal(ds[0]!.kind, 'scope')
    assert.equal(ds[1]!.kind, 'fact')
  })

  it('accepts backticked, bold, blockquoted, and list-decorated replies', () => {
    assert.equal(
      extractDecisions('`Decision 1: verified — Admin ▸ MCP`')[0]?.kind,
      'fact'
    )
    assert.equal(
      extractDecisions('**Decision 1:** verified — Admin')[0]?.body,
      'verified — Admin'
    )
    assert.equal(
      extractDecisions('> Decision 1: drop this branch')[0]?.kind,
      'scope'
    )
    assert.equal(
      extractDecisions('- Decision 1: drop this branch')[0]?.kind,
      'scope'
    )
  })

  it('still ignores template bullets with trailing parentheticals', () => {
    const ds = extractDecisions(`
- \`Decision 1: drop this branch\` (omit the recovery/optional path)
`)
    assert.equal(ds.length, 0)
  })

  it('accepts unnumbered Decision: and numbered dash replies', () => {
    assert.equal(
      extractDecisions(
        'Decision: ignore the Speakeasy MCP Catalog entry entirely.'
      )[0]?.index,
      0
    )
    const dash = extractDecisions('1 - ignore the catalog mcp server.')
    assert.equal(dash[0]?.kind, 'fact')
  })

  it('normalizeDecisionLine strips decoration', () => {
    assert.equal(
      normalizeDecisionLine('`Decision 1: drop this branch`'),
      'Decision 1: drop this branch'
    )
  })
})

describe('isSubstantiveFreeform (C3)', () => {
  it('treats any non-trivial remainder as substantive (no length hatch)', () => {
    assert.equal(
      isSubstantiveFreeform('The button is now called Reset key.'),
      true
    )
    assert.equal(isSubstantiveFreeform('Also the PAT expires.'), true)
    assert.equal(isSubstantiveFreeform('thanks'), false)
    assert.equal(isSubstantiveFreeform('Decision 1: drop this branch'), false)
  })
})

describe('buildOperatorNotes (C2)', () => {
  it('keeps only recent Decisions — strips distill leaks of stale N ids', () => {
    const distill =
      'Prefer OAuth. Decision 2: Ignore this. Decision 3: follow oauth per #1.'
    const recent = 'Decision 1: drop this branch'
    const notes = buildOperatorNotes(distill, recent)
    assert.match(notes, /Prefer OAuth/)
    assert.match(notes, /Decision 1: drop this branch/)
    assert.equal(extractDecisions(notes).map((d) => d.index).join(','), '1')
    assert.equal(notes.includes('Decision 2:'), false)
    assert.equal(notes.includes('Decision 3:'), false)
  })

  it('recentOperatorComments scopes after last factory review', () => {
    const joined = [
      '## Pipeline review (`snowflake`)',
      'Decision 1: drop this branch',
      '## Pipeline review (`snowflake`)\n\nround 2',
      'Decision 1: hedge',
    ].join('\n\n---\n\n')
    const recent = recentOperatorComments(joined)
    assert.equal(recent, 'Decision 1: hedge')
    assert.equal(isFactoryComment('`guide:draft` bootstrap failed before'), true)
    assert.equal(isFactoryComment('Refused to run: https://example'), true)
  })
})

describe('mergeDecisionNotes', () => {
  it('appends verbatim block', () => {
    const merged = mergeDecisionNotes('prefer OAuth', [
      {
        index: 1,
        line: 'Decision 1: drop this branch',
        body: 'drop this branch',
        kind: 'scope',
      },
    ])
    assert.match(merged, /## Operator decisions \(verbatim\)/)
  })
})

describe('notesForceFullResearch', () => {
  it('detects re-research asks', () => {
    assert.equal(notesForceFullResearch('re-research from source docs'), true)
    assert.equal(notesForceFullResearch('drop this branch'), false)
  })
})

describe('stripDecisionLines', () => {
  it('removes Decision lines including decorated ones', () => {
    const left = stripDecisionLines(
      '`Decision 1: drop this branch`\nkeep the PrivateLink note'
    )
    assert.match(left, /PrivateLink/)
    assert.equal(left.includes('Decision'), false)
  })
})
