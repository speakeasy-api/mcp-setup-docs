import { z } from 'zod'
import { withSchemaHint, type Runtime } from './runtime.ts'

export const PhaseResult = withSchemaHint(
  z
    .object({
      status: z.enum(['ok', 'blocked']),
      notes: z.string(),
      open_questions: z.array(z.string()),
    })
    .strict(),
  {
    type: 'object',
    additionalProperties: false,
    required: ['status', 'notes', 'open_questions'],
    properties: {
      status: { type: 'string', enum: ['ok', 'blocked'] },
      notes: {
        type: 'string',
        description:
          'Decisions made, uncertainty, and (for research) the meta.yaml validation method used.',
      },
      open_questions: { type: 'array', items: { type: 'string' } },
    },
  }
)

export const ReviewFinding = z
  .object({
    severity: z.enum(['blocker', 'nit']),
    target: z.enum(['setup', 'research', 'meta']),
    where: z.string(),
    problem: z.string(),
    suggestion: z.string(),
  })
  .strict()

export const Review = withSchemaHint(
  z
    .object({
      pass: z.boolean(),
      findings: z.array(ReviewFinding),
    })
    .strict(),
  {
    type: 'object',
    additionalProperties: false,
    required: ['pass', 'findings'],
    properties: {
      pass: {
        type: 'boolean',
        description: 'True only with zero blocker findings.',
      },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['severity', 'target', 'where', 'problem', 'suggestion'],
          properties: {
            severity: { type: 'string', enum: ['blocker', 'nit'] },
            target: { type: 'string', enum: ['setup', 'research', 'meta'] },
            where: {
              type: 'string',
              description: 'Anchor id, section, or quoted text.',
            },
            problem: { type: 'string', description: 'One factual sentence.' },
            suggestion: { type: 'string', description: 'A concrete fix.' },
          },
        },
      },
    },
  }
)

export const RevisionResult = withSchemaHint(
  z
    .object({
      notes: z.string(),
      disputed: z.array(z.string()),
      skipped: z.array(z.string()),
    })
    .strict(),
  {
    type: 'object',
    additionalProperties: false,
    required: ['notes', 'disputed', 'skipped'],
    properties: {
      notes: {
        type: 'string',
        description: 'What changed, per finding addressed.',
      },
      disputed: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Findings believed wrong, each restated with a one-line reason.',
      },
      skipped: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Nit findings not applied (judgment call or missing facts), each restated with a one-line reason.',
      },
    },
  }
)

export type GuideInput = {
  slug: string
  provider: string
  notes?: string
}

export type WorkflowInput = {
  guides: GuideInput[]
  persona: string
  timestamp: string
  repoRoot: string
  maxRounds?: number
}

export type GuideResult = {
  slug: string
  status: 'converged' | 'unconverged' | 'blocked' | 'failed'
  rounds?: number
  failed_phase?: string
  notes?: string
  nits?: unknown[]
  unresolved?: unknown[]
  open_questions?: string[]
  history?: unknown[]
}

type Dimension = {
  role: string
  doc: string
  persona: boolean
  model?: 'sonnet'
}

const DIMENSIONS: Dimension[] = [
  { role: 'fidelity', doc: 'fidelity.md', persona: false },
  { role: 'voice', doc: 'review.md', persona: true },
  { role: 'formatting', doc: 'review.md', persona: true, model: 'sonnet' },
  { role: 'achievability', doc: 'review.md', persona: true },
  { role: 'concision', doc: 'review.md', persona: true, model: 'sonnet' },
]

function readingList(
  root: string,
  personaFile: string,
  roleDocs: string[],
  withPersona: boolean
): string {
  const docs = [root + '/CONTEXT.md', root + '/docs/agents/shared.md'].concat(
    roleDocs.map((d) => root + '/docs/agents/' + d)
  )
  if (withPersona) docs.push(personaFile)
  return docs.map((d, i) => i + 1 + '. ' + d).join('\n')
}

export async function runWorkflow(
  rt: Runtime,
  input: WorkflowInput
): Promise<{ persona: string; timestamp: string; results: GuideResult[] }> {
  const ROOT = input.repoRoot
  const NOW = input.timestamp
  const PERSONA = input.persona
  const PERSONA_FILE = ROOT + '/docs/personas/' + PERSONA + '.md'
  const MAX_ROUNDS = input.maxRounds || 3
  const { log, agent, parallel, pipeline } = rt

  function assign(g: GuideInput): string {
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

  function researchPrompt(g: GuideInput): string {
    return [
      'You are the Technical Research Agent in the mcp-setup-docs drafting pipeline.',
      'Repo root: ' + ROOT,
      '',
      'Read first, in order, then follow your role doc exactly:',
      readingList(ROOT, PERSONA_FILE, ['technical-research.md'], false),
      '',
      assign(g),
      '',
      'Write research.md and meta.yaml in the guide directory. Do not write',
      'setup.md and do not touch any path outside the guide directory.',
      '',
      'Report via structured output per your role doc: status ("ok" when the',
      'Dossier is complete enough to draft from, "blocked" per the role doc),',
      'notes (decisions, uncertainty, validation method), open_questions.',
    ].join('\n')
  }

  function draftPrompt(g: GuideInput): string {
    return [
      'You are the Writer Agent in the mcp-setup-docs drafting pipeline.',
      'Repo root: ' + ROOT,
      '',
      'Read first, in order, then follow your role doc exactly:',
      readingList(ROOT, PERSONA_FILE, ['writer.md'], true),
      '',
      assign(g),
      '',
      "Read the guide directory's research.md and meta.yaml, then write its",
      "setup.md in the persona's voice. The Dossier is your fact ceiling.",
      'Do not touch any other path.',
      '',
      'Report via structured output: status ("ok" or "blocked" per your role',
      'doc), notes, open_questions (Dossier gaps you could not render around).',
    ].join('\n')
  }

  function reviewerPrompt(
    g: GuideInput,
    dim: Dimension,
    round: number,
    prior: unknown
  ): string {
    const lines = [
      'You are the ' +
        (dim.role === 'fidelity' ? 'Fidelity' : 'Editorial') +
        ' Agent in the mcp-setup-docs drafting pipeline.',
      'Repo root: ' + ROOT,
      '',
      'Read first, in order, then follow your role doc exactly:',
      readingList(ROOT, PERSONA_FILE, [dim.doc], dim.persona),
      '',
      assign(g),
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

  function revisionPrompt(
    g: GuideInput,
    round: number,
    blockers: unknown[],
    nits: unknown[]
  ): string {
    const lines = [
      'You are a Revision Agent in the mcp-setup-docs drafting pipeline.',
      'Repo root: ' + ROOT,
      '',
      'Read first, in order:',
      readingList(ROOT, PERSONA_FILE, ['technical-research.md', 'writer.md'], true),
      '',
      assign(g),
      '',
    ]
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
      '',
      'Report via structured output: notes (what changed, per finding),',
      'skipped (nits not applied, with reasons), and disputed (findings you',
      'believe are wrong, with reasons).'
    )
    return lines.join('\n')
  }

  async function reviewRound(g: GuideInput, round: number, prior: unknown) {
    const results = await parallel(
      DIMENSIONS.map(
        (dim) => () =>
          agent(reviewerPrompt(g, dim, round, prior), {
            label: g.slug + ' review:' + dim.role + ' r' + round,
            phase: g.slug + ': review',
            schema: Review,
            ...(dim.model ? { model: dim.model } : {}),
          })
      )
    )

    type Finding = z.infer<typeof ReviewFinding> & { dimension: string }
    const findings: Finding[] = []
    DIMENSIONS.forEach((dim, i) => {
      const r = results[i] as z.infer<typeof Review> | null
      if (!r) {
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

  async function draftOne(g: GuideInput): Promise<GuideResult> {
    log('[' + g.slug + '] researching ' + g.provider)
    const research = await agent(researchPrompt(g), {
      label: g.slug + ' research',
      phase: g.slug + ': research',
      schema: PhaseResult,
    })
    if (!research) return { slug: g.slug, status: 'failed', failed_phase: 'research' }
    if (research.status === 'blocked') {
      return {
        slug: g.slug,
        status: 'blocked',
        failed_phase: 'research',
        notes: research.notes,
        open_questions: research.open_questions,
      }
    }

    log('[' + g.slug + '] drafting setup.md for persona ' + PERSONA)
    const draft = await agent(draftPrompt(g), {
      label: g.slug + ' draft',
      phase: g.slug + ': draft',
      schema: PhaseResult,
    })
    if (!draft) return { slug: g.slug, status: 'failed', failed_phase: 'draft' }
    if (draft.status === 'blocked') {
      return {
        slug: g.slug,
        status: 'blocked',
        failed_phase: 'draft',
        notes: draft.notes,
        open_questions: draft.open_questions,
      }
    }

    const openQuestions = (research.open_questions || []).concat(
      draft.open_questions || []
    )

    const history: unknown[] = []
    let prior: unknown = null
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      log('[' + g.slug + '] review round ' + round + '/' + MAX_ROUNDS)
      const { blockers, nits } = await reviewRound(g, round, prior)
      const entry: Record<string, unknown> = {
        round,
        blockers,
        nits,
      }
      history.push(entry)

      if (blockers.length === 0) {
        let checklist: unknown[] = nits
        if (nits.length > 0) {
          log('[' + g.slug + '] polishing ' + nits.length + ' nit(s) before convergence')
          const polish = await agent(revisionPrompt(g, round, [], nits), {
            label: g.slug + ' polish',
            phase: g.slug + ': revise',
            schema: RevisionResult,
            model: 'sonnet',
          })
          if (!polish) {
            entry.polish_notes =
              '(polish agent returned no report; nits were not applied)'
          } else {
            entry.polish_notes = polish.notes
            entry.polish_skipped = polish.skipped
            entry.polish_disputed = polish.disputed
            checklist = polish.skipped.concat(polish.disputed)

            log('[' + g.slug + '] fidelity re-check of polished files')
            const recheck = await agent(
              reviewerPrompt(g, DIMENSIONS[0]!, round, {
                round,
                blockers: [],
                revision_notes:
                  'Converged with zero blockers; a polish pass then applied these nit findings: ' +
                  polish.notes,
                disputed: polish.disputed,
              }),
              {
                label: g.slug + ' fidelity re-check',
                phase: g.slug + ': review',
                schema: Review,
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
                    ' blocker(s)'
                )
                return {
                  slug: g.slug,
                  status: 'unconverged',
                  rounds: round,
                  unresolved: reblockers,
                  nits: checklist,
                  open_questions: openQuestions,
                  history,
                }
              }
              checklist = checklist.concat(
                recheck.findings.map(
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
            }
          }
        }
        log(
          '[' +
            g.slug +
            '] converged after ' +
            round +
            ' round(s); ' +
            checklist.length +
            ' checklist item(s) remain'
        )
        return {
          slug: g.slug,
          status: 'converged',
          rounds: round,
          nits: checklist,
          open_questions: openQuestions,
          history,
        }
      }

      if (round === MAX_ROUNDS) {
        log(
          '[' +
            g.slug +
            '] not converged: ' +
            blockers.length +
            ' blocker(s) after ' +
            round +
            ' round(s)'
        )
        return {
          slug: g.slug,
          status: 'unconverged',
          rounds: round,
          unresolved: blockers,
          nits,
          open_questions: openQuestions,
          history,
        }
      }

      log(
        '[' +
          g.slug +
          '] revising ' +
          blockers.length +
          ' blocker(s) and ' +
          nits.length +
          ' nit(s)'
      )
      const revision = await agent(revisionPrompt(g, round, blockers, nits), {
        label: g.slug + ' revise r' + round,
        phase: g.slug + ': revise',
        schema: RevisionResult,
      })
      entry.revision_notes = revision
        ? revision.notes
        : '(revision agent returned no report)'
      entry.disputed = revision ? revision.disputed : []
      entry.skipped = revision ? revision.skipped : []
      prior = {
        round,
        blockers,
        nits,
        revision_notes: entry.revision_notes,
        disputed: entry.disputed,
        skipped_nits: entry.skipped,
      }
    }

    return { slug: g.slug, status: 'failed', failed_phase: 'review' }
  }

  const results = (await pipeline(input.guides, draftOne)).filter(Boolean)
  return { persona: PERSONA, timestamp: NOW, results }
}
