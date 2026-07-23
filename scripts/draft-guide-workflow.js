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

// The harness may deliver args as a JSON string; tolerate both encodings.
const input = typeof args === 'string' ? JSON.parse(args) : args

if (!input || !Array.isArray(input.guides) || input.guides.length === 0) {
  throw new Error('args.guides must be a non-empty array of {slug, provider, notes?}')
}
for (const g of input.guides) {
  if (!g || typeof g.slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug)) {
    throw new Error('every guide entry needs a kebab-case slug')
  }
  if (!g.provider) throw new Error('guide "' + g.slug + '" needs a provider name')
}
if (!input.persona) throw new Error('args.persona is required (a file id under docs/personas/)')
if (!input.timestamp) throw new Error('args.timestamp (ISO 8601 UTC) is required')
if (!input.repoRoot) throw new Error('args.repoRoot (absolute path to the repo) is required')

const ROOT = input.repoRoot
const NOW = input.timestamp
const PERSONA = input.persona
const PERSONA_FILE = ROOT + '/docs/personas/' + PERSONA + '.md'
const MAX_ROUNDS = input.maxRounds || 3

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
  required: ['notes', 'disputed', 'skipped'],
  properties: {
    notes: { type: 'string', description: 'What changed, per finding addressed.' },
    disputed: {
      type: 'array',
      items: { type: 'string' },
      description: 'Findings believed wrong, each restated with a one-line reason.',
    },
    skipped: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Nit findings not applied (judgment call or missing facts), each restated with a one-line reason.',
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
  // formatting checks the documented setup.md grammar — checklist work;
  // fact-gating dimensions stay on the session model.
  { role: 'formatting', doc: 'review.md', persona: true, model: 'sonnet' },
  { role: 'achievability', doc: 'review.md', persona: true },
  // concision hunts removable content; its findings default to nits, and
  // removals are guarded by fidelity's bar and the polish re-check.
  { role: 'concision', doc: 'review.md', persona: true, model: 'sonnet' },
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
      'Prior round context (findings previously reported — the revision',
      'agent fixes blockers and applies mechanical nits — what it says it',
      'changed, nits it skipped, and findings it disputed). Re-verify',
      'claimed fixes against the current files, re-examine each disputed',
      'finding fresh per shared.md, then sweep for new issues:',
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

function revisionPrompt(g, round, blockers, nits, spiralNote) {
  const lines = [
    'You are a Revision Agent in the mcp-setup-docs drafting pipeline.',
    'Repo root: ' + ROOT,
    '',
    'Read first, in order:',
    readingList(['technical-research.md', 'writer.md'], true),
    '',
    assignment(g),
    '',
  ]
  if (spiralNote) {
    lines.push(spiralNote, '')
  }
  if (blockers.length > 0) {
    lines.push(
      'Review round ' + round + ' reported the blocker findings below. Fix them',
      'in the guide directory: findings targeting "research" or "meta" first,',
      'following the Technical Research role doc (facts need provenance; use',
      'the observed_at timestamp above), then findings targeting "setup",',
      'following the Writer role doc (grammar, persona voice, the Dossier as',
      'fact ceiling). Honor the anchor contract in shared.md. Do not touch any',
      'path outside the guide directory.',
      '',
      'Blocker findings (JSON):',
      JSON.stringify(blockers, null, 2),
      ''
    )
  } else {
    lines.push(
      'Review round ' + round + ' reported zero blockers; this is the final',
      'polish pass before the guide converges. Honor the anchor contract in',
      'shared.md and do not touch any path outside the guide directory.',
      'Conditional gates from the Dossier must survive polish: when a nit',
      'asks to collapse repeated If/When prose, keep one explicit',
      'conditional per branch — never replace it with an unconditional',
      'heading or imperative. Unforgiving first-connect recovery must also',
      'survive: never drop Testing expiry re-authorization, one-time-secret',
      'at create, or mid-setup destructive-rotation recovery — shorten or',
      'cross-link at most. Later-ops reset/maintenance branches are not',
      'protected. Skip (with reason) any nit whose suggestion would drop a',
      'fidelity-backed condition or first-connect recovery note.',
      ''
    )
  }
  if (nits.length > 0) {
    lines.push(
      (blockers.length > 0 ? 'After the blockers, also apply' : 'Apply') +
        ' each nit finding below whose',
      'suggestion is a concrete mechanical remedy, following the same role',
      'docs. Skip a nit when applying it needs new facts or a judgment call',
      'a human should make — restate each skipped nit in "skipped" with a',
      'one-line reason.',
      '',
      'Nit findings (JSON):',
      JSON.stringify(nits, null, 2),
      ''
    )
  }
  lines.push(
    'If you believe a finding is wrong, do not silently ignore it: leave the',
    'files as they are for that finding and record it in "disputed" with a',
    'one-line reason (see the disputed-findings protocol in shared.md).',
    'Cross-dimension conflicts count: when achievability demands documenting',
    'a path that concision or the critical-path ceiling says to cut or hedge',
    '(especially when public docs cannot complete it), dispute one finding',
    'rather than expanding the guide to satisfy both.',
    '',
    'Report via structured output: notes (what changed, per finding),',
    'skipped (nits not applied, with reasons), and disputed (findings you',
    'believe are wrong, with reasons).'
  )
  return lines.join('\n')
}

function blockerLocus(f) {
  const where = String(f.where || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const anchor = where.match(/#[a-z0-9-]+/)
  const loc = anchor ? anchor[0] : where.slice(0, 80)
  return String(f.target || '') + ':' + loc
}

function detectReviewSpiral(priorHistory, currentBlockers) {
  if (!priorHistory.length || !currentBlockers.length) return null
  const priorLoci = new Set()
  for (const entry of priorHistory) {
    for (const b of entry.blockers || []) {
      priorLoci.add(blockerLocus(b))
    }
  }
  const novelCount = currentBlockers.filter((b) => !priorLoci.has(blockerLocus(b))).length
  const novelShare = novelCount / currentBlockers.length
  const prevCount = (priorHistory[priorHistory.length - 1].blockers || []).length
  if (currentBlockers.length >= prevCount && novelShare >= 1 / 2) {
    return (
      "Review spiral signal: this round's " +
      currentBlockers.length +
      ' blocker(s) did not drop from the prior round (' +
      prevCount +
      ') and ' +
      novelCount +
      '/' +
      currentBlockers.length +
      ' loci are new. Prefer disputing findings that expand beyond the critical-path ceiling or rewrite the Speakeasy canonical skeleton rather than researching unbounded vendor UI depth.'
    )
  }
  return null
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
        ...(dim.model ? { model: dim.model } : {}),
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
    let { blockers, nits } = await reviewRound(g, round, prior)
    let entry = { round: round, blockers: blockers, nits: nits }
    const spiralNote =
      round > 1 ? detectReviewSpiral(history, blockers) : null
    if (spiralNote) {
      log('[' + g.slug + '] ' + spiralNote)
      entry.spiral_warning = spiralNote
    }
    history.push(entry)

    if (blockers.length > 0) {
      log('[' + g.slug + '] revising ' + blockers.length + ' blocker(s) and ' + nits.length + ' nit(s)')
      const revision = await agent(revisionPrompt(g, round, blockers, nits, spiralNote), {
        label: g.slug + ' revise r' + round,
        phase: g.slug + ': revise',
        schema: REVISION_RESULT,
      })
      entry.revision_notes = revision ? revision.notes : '(revision agent returned no report)'
      entry.disputed = revision ? revision.disputed : []
      entry.skipped = revision ? revision.skipped : []
      prior = {
        round: round,
        blockers: blockers,
        nits: nits,
        revision_notes: entry.revision_notes,
        disputed: entry.disputed,
        skipped_nits: entry.skipped,
      }

      if (round < MAX_ROUNDS) {
        continue
      }

      log(
        '[' +
          g.slug +
          '] finalization review after last-round revise (' +
          blockers.length +
          ' blocker(s) were addressed)'
      )
      const fin = await reviewRound(g, round, prior)
      const finSpiral = detectReviewSpiral(history, fin.blockers)
      const finEntry = {
        round: round,
        finalization: true,
        blockers: fin.blockers,
        nits: fin.nits,
      }
      if (finSpiral) {
        log('[' + g.slug + '] ' + finSpiral)
        finEntry.spiral_warning = finSpiral
      }
      history.push(finEntry)

      if (fin.blockers.length > 0) {
        log(
          '[' +
            g.slug +
            '] finalization salvage revise (' +
            fin.blockers.length +
            ' blocker(s)' +
            (finSpiral ? '; spiral signal' : '') +
            ')'
        )
        const salvage = await agent(
          revisionPrompt(g, round, fin.blockers, fin.nits, finSpiral),
          {
            label: g.slug + ' revise finalization',
            phase: g.slug + ': revise',
            schema: REVISION_RESULT,
          }
        )
        finEntry.revision_notes = salvage
          ? salvage.notes
          : '(revision agent returned no report)'
        finEntry.disputed = salvage ? salvage.disputed : []
        finEntry.skipped = salvage ? salvage.skipped : []
        prior = {
          round: round,
          finalization: true,
          blockers: fin.blockers,
          nits: fin.nits,
          revision_notes: finEntry.revision_notes,
          disputed: finEntry.disputed,
          skipped_nits: finEntry.skipped,
          ...(finSpiral ? { spiral_warning: finSpiral } : {}),
        }

        log('[' + g.slug + '] finalization recheck after salvage revise')
        const recheck = await reviewRound(g, round, prior)
        const recheckEntry = {
          round: round,
          finalization_recheck: true,
          blockers: recheck.blockers,
          nits: recheck.nits,
        }
        history.push(recheckEntry)

        if (recheck.blockers.length > 0) {
          log(
            '[' +
              g.slug +
              '] not converged: ' +
              recheck.blockers.length +
              ' blocker(s) after finalization recheck'
          )
          return {
            slug: g.slug,
            status: 'unconverged',
            rounds: round,
            unresolved: recheck.blockers,
            nits: recheck.nits,
            open_questions: openQuestions,
            history: history,
          }
        }

        blockers = recheck.blockers
        nits = recheck.nits
        entry = recheckEntry
      } else {
        blockers = fin.blockers
        nits = fin.nits
        entry = finEntry
      }
    }

    {
      // Converged. Mechanical nits are applied by a polish pass, then a
      // single fidelity-only re-check guards the polished files; the
      // returned nits checklist holds only what a human still has to weigh.
      let checklist = nits
      if (nits.length > 0) {
        log('[' + g.slug + '] polishing ' + nits.length + ' nit(s) before convergence')
        // polish applies only concrete mechanical nits, and the session-model
        // fidelity re-check below gates its output — safe on a smaller model.
        const polish = await agent(revisionPrompt(g, round, [], nits), {
          label: g.slug + ' polish',
          phase: g.slug + ': revise',
          schema: REVISION_RESULT,
          model: 'sonnet',
        })
        if (!polish) {
          entry.polish_notes = '(polish agent returned no report; nits were not applied)'
        } else {
          entry.polish_notes = polish.notes
          entry.polish_skipped = polish.skipped
          entry.polish_disputed = polish.disputed
          checklist = polish.skipped.concat(polish.disputed)

          log('[' + g.slug + '] fidelity re-check of polished files')
          const recheck = await agent(
            reviewerPrompt(g, DIMENSIONS[0], round, {
              round: round,
              blockers: [],
              revision_notes:
                'Converged with zero blockers; a polish pass then applied these nit findings: ' + polish.notes,
              disputed: polish.disputed,
            }),
            {
              label: g.slug + ' fidelity re-check',
              phase: g.slug + ': review',
              schema: REVIEW,
            }
          )
          if (!recheck) {
            checklist = checklist.concat([
              '(the fidelity re-check returned no verdict; the polished files are unverified)',
            ])
          } else {
            entry.recheck = recheck
            const reblockers = recheck.findings.filter((f) => f.severity === 'blocker')
            if (reblockers.length > 0) {
              log(
                '[' +
                  g.slug +
                  '] polish broke fidelity: ' +
                  reblockers.length +
                  ' blocker(s); running polish salvage revise'
              )
              const salvageNote =
                'Polish fidelity salvage: restore any Dossier-required conditional gates or unforgiving recovery notes the polish pass removed. Do not re-apply concision cuts that drop those facts.'
              const salvage = await agent(
                revisionPrompt(g, round, reblockers, [], salvageNote),
                {
                  label: g.slug + ' polish salvage',
                  phase: g.slug + ': revise',
                  schema: REVISION_RESULT,
                }
              )
              entry.polish_salvage_notes = salvage
                ? salvage.notes
                : '(polish salvage returned no report)'
              entry.polish_salvage_disputed = salvage ? salvage.disputed : []
              log('[' + g.slug + '] fidelity re-check after polish salvage')
              const salvageRecheck = await agent(
                reviewerPrompt(g, DIMENSIONS[0], round, {
                  round: round,
                  blockers: reblockers,
                  revision_notes: entry.polish_salvage_notes,
                  disputed: entry.polish_salvage_disputed,
                }),
                {
                  label: g.slug + ' fidelity re-check salvage',
                  phase: g.slug + ': review',
                  schema: REVIEW,
                }
              )
              if (!salvageRecheck) {
                return {
                  slug: g.slug,
                  status: 'unconverged',
                  rounds: round,
                  unresolved: reblockers,
                  nits: checklist.concat([
                    '(polish salvage fidelity re-check returned no verdict)',
                  ]),
                  open_questions: openQuestions,
                  history: history,
                }
              }
              entry.recheck = salvageRecheck
              const stillBroken = salvageRecheck.findings.filter(
                (f) => f.severity === 'blocker'
              )
              if (stillBroken.length > 0) {
                log(
                  '[' +
                    g.slug +
                    '] polish salvage failed: ' +
                    stillBroken.length +
                    ' blocker(s) remain'
                )
                return {
                  slug: g.slug,
                  status: 'unconverged',
                  rounds: round,
                  unresolved: stillBroken,
                  nits: checklist,
                  open_questions: openQuestions,
                  history: history,
                }
              }
              checklist = checklist.concat(
                salvageRecheck.findings.map(
                  (f) =>
                    '(' +
                    f.target +
                    ' ' +
                    f.where +
                    ') ' +
                    f.problem +
                    ' Suggestion: ' +
                    f.suggestion
                )
              )
            } else {
              checklist = checklist.concat(
                recheck.findings.map((f) => '(' + f.target + ' ' + f.where + ') ' + f.problem + ' Suggestion: ' + f.suggestion)
              )
            }
          }
        }
      }
      log('[' + g.slug + '] converged after ' + round + ' round(s); ' + checklist.length + ' checklist item(s) remain')
      return { slug: g.slug, status: 'converged', rounds: round, nits: checklist, open_questions: openQuestions, history: history }
    }
  }
}

// Guides do not share files (each owns guides/<slug>/), so drafting them
// concurrently in one working tree is safe.
const results = await pipeline(input.guides, (g) => draftOne(g))

return {
  persona: PERSONA,
  timestamp: NOW,
  results: results.filter(Boolean),
}
