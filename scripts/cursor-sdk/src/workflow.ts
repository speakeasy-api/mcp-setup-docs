import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import {
  buildDraftInputs,
  buildResearchInputs,
  buildReviewInputs,
  canSkipStep,
  digestGuideFile,
  isResearchUnchanged,
  makeStepRecord,
  readLock,
  researchMatchesSnapshot,
  restoreResearchSnapshot,
  snapshotResearchOutputs,
  writeLock,
  type PipelineLock,
  type ResearchSnapshot,
  type ReviewDimension,
  type StepId,
  type StepRecord,
} from './lock.ts'
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

/** LLM judge: did research rewrite anything draft-relevant? */
export const ResearchChangeJudgment = withSchemaHint(
  z
    .object({
      materially_changed: z.boolean(),
      notes: z.string(),
    })
    .strict(),
  {
    type: 'object',
    additionalProperties: false,
    required: ['materially_changed', 'notes'],
    properties: {
      materially_changed: {
        type: 'boolean',
        description:
          'True if draft-relevant facts, anchors, credentials, remotes, prerequisites, or structure changed. False for wording-only, ordering-only, or observed_at-only churn.',
      },
      notes: {
        type: 'string',
        description: 'Brief rationale; cite the material deltas when true.',
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
  /** Bypass lock skip checks (also used by CLI --force). */
  force?: boolean
}

export type ResearchChangeInfo = {
  method: 'digest' | 'judge' | 'none'
  unchanged: boolean
  notes?: string
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
  /** Steps skipped via pipeline.lock.json this run. */
  skipped?: string[]
  /** How research_unchanged was decided this run. */
  research_change?: ResearchChangeInfo
}

type Dimension = {
  role: ReviewDimension
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
  const FORCE = input.force === true
  const { log, agent, parallel, pipeline, modelId } = rt

  function guideDir(slug: string): string {
    return join(ROOT, 'guides', slug)
  }

  function notesOf(g: GuideInput): string {
    return g.notes || ''
  }

  function writeConvergedLock(
    g: GuideInput,
    completedAt: string
  ): void {
    const dir = guideDir(g.slug)
    mkdirSync(dir, { recursive: true })
    const steps: Partial<Record<StepId, StepRecord>> = {}

    const researchInputs = buildResearchInputs({
      model: modelId(),
      repoRoot: ROOT,
      provider: g.provider,
      notes: notesOf(g),
    })
    steps.research = makeStepRecord(
      researchInputs,
      [
        digestGuideFile(dir, 'research.md'),
        digestGuideFile(dir, 'meta.yaml'),
      ],
      completedAt
    )

    if (existsSync(join(dir, 'setup.md'))) {
      const draftInputs = buildDraftInputs({
        model: modelId(),
        repoRoot: ROOT,
        guideDir: dir,
        provider: g.provider,
        notes: notesOf(g),
        persona: PERSONA,
      })
      steps.draft = makeStepRecord(
        draftInputs,
        [digestGuideFile(dir, 'setup.md')],
        completedAt
      )

      for (const dim of DIMENSIONS) {
        const stepId = ('review.' + dim.role) as StepId
        const reviewInputs = buildReviewInputs({
          model: modelId(dim.model),
          repoRoot: ROOT,
          guideDir: dir,
          provider: g.provider,
          notes: notesOf(g),
          persona: PERSONA,
          dimension: dim.role,
          roleDoc: dim.doc,
          withPersona: dim.persona,
        })
        steps[stepId] = makeStepRecord(
          reviewInputs,
          [digestGuideFile(dir, 'setup.md')],
          completedAt
        )
      }
    }

    const lock: PipelineLock = {
      schema_version: 1,
      slug: g.slug,
      persona: PERSONA,
      runtime: 'cursor-sdk',
      updated_at: completedAt,
      steps,
    }
    writeLock(dir, lock)
    log('[' + g.slug + '] wrote ' + LOCK_FILENAME_REL)
  }

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

  function researchChangeJudgePrompt(
    g: GuideInput,
    before: ResearchSnapshot,
    afterResearch: string,
    afterMeta: string
  ): string {
    return [
      'You are judging whether a fresh Technical Research pass produced',
      'materially new guide inputs for the mcp-setup-docs drafting pipeline.',
      'Repo root: ' + ROOT,
      '',
      'Read first, in order:',
      readingList(ROOT, PERSONA_FILE, ['technical-research.md'], false),
      '',
      assign(g),
      '',
      'Compare BEFORE (previous on-disk research outputs) to AFTER (just written).',
      'Ignore observed_at timestamp churn and pure wording/reordering that does',
      'not change draft-relevant facts: anchors, credential flows, remotes,',
      'transports, prerequisites, Speakeasy setup facts, or provenance-backed',
      'claims the Writer would need to re-render.',
      '',
      'Set materially_changed=true only when AFTER would justify re-drafting',
      'setup.md or would invalidate a prior review of the current setup.md.',
      'Set materially_changed=false when AFTER is equivalent for drafting.',
      '',
      '=== BEFORE research.md ===',
      before['research.md'] ?? '(missing)',
      '=== BEFORE meta.yaml ===',
      before['meta.yaml'] ?? '(missing)',
      '=== AFTER research.md ===',
      afterResearch,
      '=== AFTER meta.yaml ===',
      afterMeta,
      '',
      'Report via structured output: materially_changed (boolean) and notes.',
    ].join('\n')
  }

  async function decideResearchUnchanged(
    g: GuideInput,
    dir: string,
    prevLock: PipelineLock | null,
    before: ResearchSnapshot | null
  ): Promise<ResearchChangeInfo> {
    // --force: skip judge cost; downstream skips are already bypassed.
    if (FORCE) {
      return {
        method: 'none',
        unchanged: false,
        notes: 'force: treating research as changed for skip purposes',
      }
    }
    if (!before) {
      return {
        method: 'none',
        unchanged: false,
        notes: 'no prior research outputs to compare',
      }
    }
    if (researchMatchesSnapshot(dir, before)) {
      return {
        method: 'digest',
        unchanged: true,
        notes: 'stable digests match pre-research snapshot',
      }
    }
    // Digest match against lock is a fast path when snapshot somehow diverged
    // from lock but current files still match locked outputs (shouldn't happen
    // if we snapshotted from disk, but keep lock check as secondary).
    if (isResearchUnchanged(prevLock, dir)) {
      return {
        method: 'digest',
        unchanged: true,
        notes: 'stable digests match lock research.outputs',
      }
    }

    const afterResearch = existsSync(join(dir, 'research.md'))
      ? readFileSync(join(dir, 'research.md'), 'utf8')
      : ''
    const afterMeta = existsSync(join(dir, 'meta.yaml'))
      ? readFileSync(join(dir, 'meta.yaml'), 'utf8')
      : ''

    log('[' + g.slug + '] research digests differ; judging material change')
    const judgment = await agent(
      researchChangeJudgePrompt(g, before, afterResearch, afterMeta),
      {
        label: g.slug + ' research-change judge',
        phase: g.slug + ': research-judge',
        schema: ResearchChangeJudgment,
      }
    )
    if (!judgment) {
      return {
        method: 'judge',
        unchanged: false,
        notes:
          'research-change judge returned no verdict; treating as materially changed',
      }
    }
    if (!judgment.materially_changed) {
      restoreResearchSnapshot(dir, before)
      log(
        '[' +
          g.slug +
          '] research not material; restored prior research.md/meta.yaml'
      )
      return {
        method: 'judge',
        unchanged: true,
        notes: judgment.notes,
      }
    }
    return {
      method: 'judge',
      unchanged: false,
      notes: judgment.notes,
    }
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
      lines.push(
        'Your assigned dimension: ' + dim.role + '. Judge only this dimension.',
        ''
      )
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

  type Finding = z.infer<typeof ReviewFinding> & { dimension: string }

  async function reviewRound(
    g: GuideInput,
    round: number,
    prior: unknown,
    lockOpts: {
      lock: PipelineLock | null
      /** When false, run every dimension (mid-loop or invalidated). */
      allowSkip: boolean
    }
  ): Promise<{ blockers: Finding[]; nits: Finding[]; skippedDims: string[] }> {
    const dir = guideDir(g.slug)

    const results = await parallel(
      DIMENSIONS.map((dim) => async () => {
        const stepId = ('review.' + dim.role) as StepId
        if (lockOpts.allowSkip) {
          const inputs = buildReviewInputs({
            model: modelId(dim.model),
            repoRoot: ROOT,
            guideDir: dir,
            provider: g.provider,
            notes: notesOf(g),
            persona: PERSONA,
            dimension: dim.role,
            roleDoc: dim.doc,
            withPersona: dim.persona,
          })
          if (
            canSkipStep(lockOpts.lock, g.slug, stepId, inputs, dir, {
              force: FORCE,
              invalidated: false,
            })
          ) {
            log('[' + g.slug + '] skip review:' + dim.role + ' (lock)')
            return { skipped: true as const, stepId }
          }
        }

        const report = await agent(reviewerPrompt(g, dim, round, prior), {
          label: g.slug + ' review:' + dim.role + ' r' + round,
          phase: g.slug + ': review',
          schema: Review,
          ...(dim.model ? { model: dim.model } : {}),
        })
        return { skipped: false as const, report, dim }
      })
    )

    const skippedDims: string[] = []
    const findings: Finding[] = []
    for (const r of results) {
      if (r.skipped) {
        skippedDims.push(r.stepId)
        continue
      }
      const dim = r.dim!
      if (!r.report) {
        findings.push({
          severity: 'blocker',
          target: 'setup',
          where: '(pipeline)',
          problem:
            'The ' + dim.role + ' reviewer returned no verdict this round.',
          suggestion:
            'Treat as unreviewed; the next round retries this dimension.',
          dimension: dim.role,
        })
        continue
      }
      for (const f of r.report.findings) {
        findings.push({ ...f, dimension: dim.role })
      }
    }
    return {
      blockers: findings.filter((f) => f.severity === 'blocker'),
      nits: findings.filter((f) => f.severity === 'nit'),
      skippedDims,
    }
  }

  async function draftOne(g: GuideInput): Promise<GuideResult> {
    const dir = guideDir(g.slug)
    mkdirSync(dir, { recursive: true })
    const prevLock = readLock(dir)
    const skipped: string[] = []
    const beforeResearch = snapshotResearchOutputs(dir)

    log('[' + g.slug + '] researching ' + g.provider)
    const research = await agent(researchPrompt(g), {
      label: g.slug + ' research',
      phase: g.slug + ': research',
      schema: PhaseResult,
    })
    if (!research) {
      return { slug: g.slug, status: 'failed', failed_phase: 'research' }
    }
    if (research.status === 'blocked') {
      return {
        slug: g.slug,
        status: 'blocked',
        failed_phase: 'research',
        notes: research.notes,
        open_questions: research.open_questions,
      }
    }

    const researchChange = await decideResearchUnchanged(
      g,
      dir,
      prevLock,
      beforeResearch
    )
    const researchUnchanged = researchChange.unchanged
    log(
      '[' +
        g.slug +
        '] research_change method=' +
        researchChange.method +
        ' unchanged=' +
        researchUnchanged +
        (researchChange.notes ? ' — ' + researchChange.notes : '')
    )

    let draftRan = false
    let draftOpenQuestions: string[] = []
    const draftInputs = buildDraftInputs({
      model: modelId(),
      repoRoot: ROOT,
      guideDir: dir,
      provider: g.provider,
      notes: notesOf(g),
      persona: PERSONA,
    })
    const skipDraft = canSkipStep(
      prevLock,
      g.slug,
      'draft',
      draftInputs,
      dir,
      {
        force: FORCE,
        invalidated: !researchUnchanged,
        researchUnchanged,
      }
    )

    if (skipDraft) {
      log('[' + g.slug + '] skip draft (lock)')
      skipped.push('draft')
    } else {
      log('[' + g.slug + '] drafting setup.md for persona ' + PERSONA)
      const draft = await agent(draftPrompt(g), {
        label: g.slug + ' draft',
        phase: g.slug + ': draft',
        schema: PhaseResult,
      })
      if (!draft) {
        return {
          slug: g.slug,
          status: 'failed',
          failed_phase: 'draft',
          research_change: researchChange,
        }
      }
      if (draft.status === 'blocked') {
        return {
          slug: g.slug,
          status: 'blocked',
          failed_phase: 'draft',
          notes: draft.notes,
          open_questions: draft.open_questions,
          research_change: researchChange,
        }
      }
      draftRan = true
      draftOpenQuestions = draft.open_questions || []
    }

    const openQuestions = (research.open_questions || []).concat(
      draftOpenQuestions
    )

    // Round-1 review may use the lock only when research is unchanged and
    // draft did not run (artifacts still match locked review inputs).
    const reviewInvalidated = !researchUnchanged || draftRan

    const history: unknown[] = []
    let prior: unknown = null
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const allowSkip = round === 1 && !reviewInvalidated && prior === null
      log(
        '[' +
          g.slug +
          '] review round ' +
          round +
          '/' +
          MAX_ROUNDS +
          (allowSkip ? ' (lock skips allowed)' : '')
      )
      const { blockers, nits, skippedDims } = await reviewRound(g, round, prior, {
        lock: prevLock,
        allowSkip,
      })
      if (allowSkip) {
        for (const id of skippedDims) {
          if (!skipped.includes(id)) skipped.push(id)
        }
      }

      // Draft skipped + every review dimension skipped → already satisfied.
      if (
        round === 1 &&
        skipDraft &&
        skippedDims.length === DIMENSIONS.length &&
        blockers.length === 0 &&
        nits.length === 0
      ) {
        log(
          '[' +
            g.slug +
            '] converged (lock): draft and all reviews skipped'
        )
        const finishedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
        writeConvergedLock(g, finishedAt)
        return {
          slug: g.slug,
          status: 'converged',
          rounds: 0,
          nits: [],
          open_questions: openQuestions,
          history: [],
          skipped,
          research_change: researchChange,
        }
      }

      const entry: Record<string, unknown> = {
        round,
        blockers,
        nits,
        ...(skippedDims.length ? { skipped_dimensions: skippedDims } : {}),
      }
      history.push(entry)

      if (blockers.length === 0) {
        let checklist: unknown[] = nits
        if (nits.length > 0) {
          log(
            '[' + g.slug + '] polishing ' + nits.length + ' nit(s) before convergence'
          )
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
              const reblockers = recheck.findings.filter(
                (f) => f.severity === 'blocker'
              )
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
                  research_change: researchChange,
                  ...(skipped.length ? { skipped } : {}),
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
        const finishedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
        writeConvergedLock(g, finishedAt)
        return {
          slug: g.slug,
          status: 'converged',
          rounds: round,
          nits: checklist,
          open_questions: openQuestions,
          history,
          research_change: researchChange,
          ...(skipped.length ? { skipped } : {}),
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
          research_change: researchChange,
          ...(skipped.length ? { skipped } : {}),
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

    return {
      slug: g.slug,
      status: 'failed',
      failed_phase: 'review',
      research_change: researchChange,
    }
  }

  const results = (await pipeline(input.guides, draftOne)).filter(Boolean)
  return { persona: PERSONA, timestamp: NOW, results }
}

const LOCK_FILENAME_REL = 'pipeline.lock.json'
