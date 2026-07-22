export const meta = {
  name: 'draft-guide',
  description: 'Research MCP servers and produce persona-voiced Setup Guides: research → draft → fidelity + editorial review → revise until convergence',
  whenToUse: 'Invoked by the /draft-guide skill with {guides, persona, timestamp, repoRoot} args; drafts one guides/<slug>/ bundle per entry',
}

// ---------------------------------------------------------------------------
// Args — supplied by the /draft-guide skill:
//   guides:    [{ slug, provider, notes? }]  one entry per Guide to draft
//   persona:   id of a file under docs/personas/ (e.g. 'it-admin')
//   timestamp: ISO 8601 UTC, used for provenance observed_at (scripts cannot
//              read the clock)
//   repoRoot:  absolute path to the mcp-setup-docs checkout
//   maxRounds: optional, review/revise rounds before giving up (default 3)
// ---------------------------------------------------------------------------

if (!args || !Array.isArray(args.guides) || args.guides.length === 0) {
  throw new Error('args.guides must be a non-empty array of {slug, provider, notes?}')
}
for (const g of args.guides) {
  if (!g || typeof g.slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug)) {
    throw new Error('every guide entry needs a kebab-case slug')
  }
  if (!g.provider) throw new Error('guide "' + g.slug + '" needs a provider name')
}
if (!args.persona) throw new Error('args.persona is required (a file id under docs/personas/)')
if (!args.timestamp) throw new Error('args.timestamp (ISO 8601 UTC) is required')
if (!args.repoRoot) throw new Error('args.repoRoot (absolute path to the repo) is required')

const ROOT = args.repoRoot
const NOW = args.timestamp
const PERSONA = args.persona
const PERSONA_FILE = ROOT + '/docs/personas/' + PERSONA + '.md'
const MAX_ROUNDS = args.maxRounds || 3

// ---------------------------------------------------------------------------
// Structured-output schemas
// ---------------------------------------------------------------------------

const PHASE_RESULT = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'notes', 'open_questions'],
  properties: {
    status: { type: 'string', enum: ['ok', 'blocked'] },
    notes: {
      type: 'string',
      description: 'Decisions made, uncertainty, and (for research) the meta.yaml validation method used.',
    },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
}

const REVIEW = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'findings'],
  properties: {
    pass: { type: 'boolean', description: 'True only with zero blocker findings.' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'target', 'where', 'problem', 'suggestion'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'nit'] },
          target: { type: 'string', enum: ['setup', 'research', 'meta'] },
          where: { type: 'string', description: 'Anchor id, section, or quoted text.' },
          problem: { type: 'string', description: 'One factual sentence.' },
          suggestion: { type: 'string', description: 'A concrete fix.' },
        },
      },
    },
  },
}

const REVISION_RESULT = {
  type: 'object',
  additionalProperties: false,
  required: ['notes', 'disputed'],
  properties: {
    notes: { type: 'string', description: 'What changed, per finding addressed.' },
    disputed: {
      type: 'array',
      items: { type: 'string' },
      description: 'Findings believed wrong, each restated with a one-line reason.',
    },
  },
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function readingList(roleDocs, withPersona) {
  const docs = [ROOT + '/CONTEXT.md', ROOT + '/docs/agents/shared.md']
    .concat(roleDocs.map((d) => ROOT + '/docs/agents/' + d))
  if (withPersona) docs.push(PERSONA_FILE)
  return docs.map((d, i) => (i + 1) + '. ' + d).join('\n')
}

function assignment(g) {
  return [
    'Assignment:',
    '- slug: ' + g.slug,
    '- provider: ' + g.provider,
    '- guide directory: ' + ROOT + '/guides/' + g.slug + '/',
    '- persona: ' + PERSONA + ' (' + PERSONA_FILE + ')',
    '- observed_at timestamp for provenance recorded this run: ' + NOW,
    '- operator notes: ' + (g.notes || '(none)'),
  ].join('\n')
}

function researchPrompt(g) {
  return [
    'You are the Technical Research Agent in the mcp-setup-docs drafting pipeline.',
    'Repo root: ' + ROOT,
    '',
    'Read first, in order, then follow your role doc exactly:',
    readingList(['technical-research.md'], false),
    '',
    assignment(g),
    '',
    'Write research.md and meta.yaml in the guide directory. Do not write',
    'setup.md and do not touch any path outside the guide directory.',
    '',
    'Report via structured output per your role doc: status ("ok" when the',
    'Dossier is complete enough to draft from, "blocked" per the role doc),',
    'notes (decisions, uncertainty, validation method), open_questions.',
  ].join('\n')
}

function draftPrompt(g) {
  return [
    'You are the Writer Agent in the mcp-setup-docs drafting pipeline.',
    'Repo root: ' + ROOT,
    '',
    'Read first, in order, then follow your role doc exactly:',
    readingList(['writer.md'], true),
    '',
    assignment(g),
    '',
    'Read the guide directory\'s research.md and meta.yaml, then write its',
    'setup.md in the persona\'s voice. The Dossier is your fact ceiling.',
    'Do not touch any other path.',
    '',
    'Report via structured output: status ("ok" or "blocked" per your role',
    'doc), notes, open_questions (Dossier gaps you could not render around).',
  ].join('\n')
}

const DIMENSIONS = [
  { role: 'fidelity', doc: 'fidelity.md', persona: false },
  { role: 'voice', doc: 'review.md', persona: true },
  { role: 'formatting', doc: 'review.md', persona: true },
  { role: 'achievability', doc: 'review.md', persona: true },
]

function reviewerPrompt(g, dim, round, prior) {
  const lines = [
    'You are the ' + (dim.role === 'fidelity' ? 'Fidelity' : 'Editorial') +
      ' Agent in the mcp-setup-docs drafting pipeline.',
    'Repo root: ' + ROOT,
    '',
    'Read first, in order, then follow your role doc exactly:',
    readingList([dim.doc], dim.persona),
    '',
    assignment(g),
    '',
  ]
  if (dim.role !== 'fidelity') {
    lines.push('Your assigned dimension: ' + dim.role + '. Judge only this dimension.', '')
  }
  lines.push(
    'This is review round ' + round + ' of at most ' + MAX_ROUNDS + '.',
    'Review the current files in the guide directory. You never edit files.'
  )
  if (prior) {
    lines.push(
      '',
      'Prior round context (blockers previously reported, what the revision',
      'agent says it changed, and findings it disputed). Re-verify claimed',
      'fixes against the current files, re-examine each disputed finding',
      'fresh per shared.md, then sweep for new issues:',
      JSON.stringify(prior)
    )
  }
  lines.push(
    '',
    'Report via structured output: pass (true only with zero blockers) and',
    'findings, each with severity, target file, where, problem, suggestion.'
  )
  return lines.join('\n')
}

function revisionPrompt(g, round, blockers) {
  return [
    'You are a Revision Agent in the mcp-setup-docs drafting pipeline.',
    'Repo root: ' + ROOT,
    '',
    'Read first, in order:',
    readingList(['technical-research.md', 'writer.md'], true),
    '',
    assignment(g),
    '',
    'Review round ' + round + ' reported the blocker findings below. Fix them',
    'in the guide directory: findings targeting "research" or "meta" first,',
    'following the Technical Research role doc (facts need provenance; use',
    'the observed_at timestamp above), then findings targeting "setup",',
    'following the Writer role doc (grammar, persona voice, the Dossier as',
    'fact ceiling). Honor the anchor contract in shared.md. Do not touch any',
    'path outside the guide directory.',
    '',
    'If you believe a finding is wrong, do not silently ignore it: leave the',
    'files as they are for that finding and record it in "disputed" with a',
    'one-line reason (see the disputed-findings protocol in shared.md).',
    '',
    'Blocker findings (JSON):',
    JSON.stringify(blockers, null, 2),
    '',
    'Report via structured output: notes (what changed, per finding) and',
    'disputed (findings you believe are wrong, with reasons).',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

async function reviewRound(g, round, prior) {
  const results = await parallel(
    DIMENSIONS.map((dim) => () =>
      agent(reviewerPrompt(g, dim, round, prior), {
        label: g.slug + ' review:' + dim.role + ' r' + round,
        phase: g.slug + ': review',
        schema: REVIEW,
      })
    )
  )
  const findings = []
  DIMENSIONS.forEach((dim, i) => {
    const r = results[i]
    if (!r) {
      // A dead reviewer must not silently count as a pass.
      findings.push({
        severity: 'blocker',
        target: 'setup',
        where: '(pipeline)',
        problem: 'The ' + dim.role + ' reviewer returned no verdict this round.',
        suggestion: 'Treat as unreviewed; the next round retries this dimension.',
        dimension: dim.role,
      })
      return
    }
    for (const f of r.findings) findings.push({ ...f, dimension: dim.role })
  })
  return {
    blockers: findings.filter((f) => f.severity === 'blocker'),
    nits: findings.filter((f) => f.severity === 'nit'),
  }
}

async function draftOne(g) {
  log('[' + g.slug + '] researching ' + g.provider)
  const research = await agent(researchPrompt(g), {
    label: g.slug + ' research',
    phase: g.slug + ': research',
    schema: PHASE_RESULT,
  })
  if (!research) return { slug: g.slug, status: 'failed', failed_phase: 'research' }
  if (research.status === 'blocked') {
    return { slug: g.slug, status: 'blocked', failed_phase: 'research', notes: research.notes, open_questions: research.open_questions }
  }

  log('[' + g.slug + '] drafting setup.md for persona ' + PERSONA)
  const draft = await agent(draftPrompt(g), {
    label: g.slug + ' draft',
    phase: g.slug + ': draft',
    schema: PHASE_RESULT,
  })
  if (!draft) return { slug: g.slug, status: 'failed', failed_phase: 'draft' }
  if (draft.status === 'blocked') {
    return { slug: g.slug, status: 'blocked', failed_phase: 'draft', notes: draft.notes, open_questions: draft.open_questions }
  }

  const openQuestions = (research.open_questions || []).concat(draft.open_questions || [])

  // history feeds the Run Record the /draft-guide skill writes to retro/runs/
  // — per-round blockers, nits, revision notes, and disputes.
  const history = []
  let prior = null
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    log('[' + g.slug + '] review round ' + round + '/' + MAX_ROUNDS)
    const { blockers, nits } = await reviewRound(g, round, prior)
    const entry = { round: round, blockers: blockers, nits: nits }
    history.push(entry)

    if (blockers.length === 0) {
      log('[' + g.slug + '] converged after ' + round + ' round(s); ' + nits.length + ' nit(s) remain')
      return { slug: g.slug, status: 'converged', rounds: round, nits, open_questions: openQuestions, history: history }
    }
    if (round === MAX_ROUNDS) {
      log('[' + g.slug + '] not converged: ' + blockers.length + ' blocker(s) after ' + round + ' round(s)')
      return { slug: g.slug, status: 'unconverged', rounds: round, unresolved: blockers, nits, open_questions: openQuestions, history: history }
    }

    log('[' + g.slug + '] revising ' + blockers.length + ' blocker(s)')
    const revision = await agent(revisionPrompt(g, round, blockers), {
      label: g.slug + ' revise r' + round,
      phase: g.slug + ': revise',
      schema: REVISION_RESULT,
    })
    entry.revision_notes = revision ? revision.notes : '(revision agent returned no report)'
    entry.disputed = revision ? revision.disputed : []
    prior = {
      round: round,
      blockers: blockers,
      revision_notes: entry.revision_notes,
      disputed: entry.disputed,
    }
  }
}

// Guides do not share files (each owns guides/<slug>/), so drafting them
// concurrently in one working tree is safe.
const results = await pipeline(args.guides, (g) => draftOne(g))

return {
  persona: PERSONA,
  timestamp: NOW,
  results: results.filter(Boolean),
}
