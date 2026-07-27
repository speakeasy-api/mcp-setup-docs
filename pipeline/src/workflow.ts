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
  snapshotResearchOutputs,
  writeLock,
  type PipelineLock,
  type ResearchSnapshot,
  type ReviewDimension,
  type StepId,
  type StepRecord,
} from './lock.ts'
import { lintGuide } from './lint-guide.ts'
import { withSchemaHint, type Runtime } from './runtime.ts'
import {
  evaluateScopeGate,
  extractOpenQuestionsFromResearch,
  mergeOpenQuestions,
  type ScopeGateResult,
} from './scope-gate.ts'
import {
  formatCatalogNote,
  lookupCatalogPresence,
  mergeCatalogNotes,
  stableCatalogLockNote,
} from './pulse-catalog.ts'
import { PATHS, abs, guideDir, personaFile, roleDoc } from './paths.ts'

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
    target: z.enum(['external', 'speakeasy', 'research', 'meta']),
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
            target: {
              type: 'string',
              enum: ['external', 'speakeasy', 'research', 'meta'],
            },
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
  /** Operator / distill notes (no catalog lookup). Used by the scope gate. */
  notes?: string
  /**
   * Full catalog presence note for agent prompts only. Lock digests use
   * {@link lockNotes} instead so per-run timestamps never appear there.
   */
  catalogPromptNote?: string
  /**
   * Stable catalog token merged into lock input digests (status + match name).
   */
  lockNotes?: string
}

export type WorkflowInput = {
  guides: GuideInput[]
  persona: string
  timestamp: string
  repoRoot: string
  maxRounds?: number
  /** Bypass lock skip checks (CLI --force). */
  force?: boolean
  /**
   * Factory / --pause-on-scope: after research, stop before draft when
   * material open questions lack Decision N replies in notes.
   */
  pauseOnScope?: boolean
}

export type ResearchChangeInfo = {
  method: 'digest' | 'judge' | 'none'
  unchanged: boolean
  notes?: string
}

export type GuideResult = {
  slug: string
  status:
    | 'converged'
    | 'unconverged'
    | 'blocked'
    | 'failed'
    | 'awaiting_scope'
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
  /** Present when status is awaiting_scope. */
  scope?: ScopeGateResult
}

type Dimension = {
  role: ReviewDimension
  doc: string
  persona: boolean
  model?: 'sonnet'
}

/** Review gates only — voice/formatting/concision are Writer self-check. */
const DIMENSIONS: Dimension[] = [
  { role: 'fidelity', doc: 'fidelity.md', persona: false },
  { role: 'achievability', doc: 'review.md', persona: true },
]

function readingList(
  root: string,
  personaPath: string,
  roleDocs: string[],
  withPersona: boolean
): string {
  const docs = [abs(root, PATHS.glossary), abs(root, PATHS.shared)].concat(
    roleDocs.map((d) => abs(root, roleDoc(d)))
  )
  if (withPersona) docs.push(personaPath)
  return docs.map((d, i) => i + 1 + '. ' + d).join('\n')
}

export async function runWorkflow(
  rt: Runtime,
  input: WorkflowInput
): Promise<{ persona: string; timestamp: string; results: GuideResult[] }> {
  const ROOT = input.repoRoot
  const NOW = input.timestamp
  const PERSONA = input.persona
  const PERSONA_FILE = abs(ROOT, personaFile(PERSONA))
  const MAX_ROUNDS = input.maxRounds || 3
  const FORCE = input.force === true
  const PAUSE_ON_SCOPE = input.pauseOnScope === true
  const { log, agent, parallel, pipeline, modelId } = rt

  function guideDir(slug: string): string {
    return join(ROOT, 'guides', slug)
  }

  function notesOf(g: GuideInput): string {
    // Lock digests: operator notes + stable catalog token (no timestamps).
    if (g.lockNotes !== undefined) return g.lockNotes
    return g.notes || ''
  }

  function promptNotesOf(g: GuideInput): string {
    // Agent assignment: operator notes + full catalog instructions.
    if (g.catalogPromptNote) {
      return mergeCatalogNotes(g.notes, g.catalogPromptNote)
    }
    return g.notes || ''
  }

  function operatorNotesOf(g: GuideInput): string {
    // Scope gate: distill/operator decisions only — catalog note must not
    // contribute tokens to notesDisposeOfQuestion.
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

    if (
      existsSync(join(dir, 'external.md')) &&
      existsSync(join(dir, 'speakeasy.md'))
    ) {
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
        [
          digestGuideFile(dir, 'external.md'),
          digestGuideFile(dir, 'speakeasy.md'),
        ],
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
          [
            digestGuideFile(dir, 'external.md'),
            digestGuideFile(dir, 'speakeasy.md'),
          ],
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
      '- guide directory: ' + abs(ROOT, guideDir(g.slug)) + '/',
      '- persona: ' + PERSONA + ' (' + PERSONA_FILE + ')',
      '- observed_at timestamp for provenance recorded this run: ' + NOW,
      '- operator notes: ' + (promptNotesOf(g) || '(none)'),
    ].join('\n')
  }

  function researchPrompt(g: GuideInput): string {
    const dir = guideDir(g.slug)
    const hasPrior =
      existsSync(join(dir, 'research.md')) || existsSync(join(dir, 'meta.yaml'))
    return [
      'You are the Technical Research Agent in the mcp-setup-docs drafting pipeline.',
      'Repo root: ' + ROOT,
      '',
      'Read first, in order, then follow your role doc exactly:',
      readingList(ROOT, PERSONA_FILE, ['technical-research.md'], false),
      '',
      assign(g),
      '',
      hasPrior
        ? [
            'Prior research artifacts already exist in the guide directory.',
            'Read research.md and meta.yaml first. Revise them in light of the',
            'operator notes and any newly verified public docs — do not discard',
            'sound prior work to rewrite from a blank slate. Keep stable anchors',
            'when facts are unchanged; update or remove only what the notes or',
            'fresh sources require.',
            '',
          ].join('\n')
        : '',
      'Write research.md and meta.yaml in the guide directory. Do not write',
      'external.md or speakeasy.md and do not touch any path outside the',
      'guide directory.',
      '',
      'Report via structured output per your role doc: status ("ok" when the',
      'Dossier is complete enough to draft from, "blocked" per the role doc),',
      'notes (decisions, uncertainty, validation method), open_questions.',
    ]
      .filter(Boolean)
      .join('\n')
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
      'external.md / speakeasy.md or would invalidate a prior review of the',
      'current setup files.',
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
      // Keep AFTER on disk. Restoring BEFORE used to throw away a legitimate
      // researched_at / observed_at refresh to this run's NOW, after which
      // fidelity burned a full round re-stamping provenance. Non-material
      // wording that sticks is acceptable; draft/review skips still use
      // unchanged=true.
      log(
        '[' +
          g.slug +
          '] research not material; keeping AFTER (incl. provenance stamps)'
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
      "Read the guide directory's research.md and meta.yaml, then write",
      'external.md (provider-side) and speakeasy.md (Control Plane) in the',
      "persona's voice. The Dossier is your fact ceiling.",
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
      'Review round ' + round + ' reported the blocker findings below. Fix them',
      'in the guide directory: findings targeting "research" or "meta" first,',
      'following the Technical Research role doc (facts need provenance; use',
      'the observed_at timestamp above), then findings targeting "external"',
      'or "speakeasy", following the Writer role doc (grammar, persona voice,',
      'the Dossier as fact ceiling). Honor the anchor contract in shared.md.',
      'Do not touch any path outside the guide directory.',
      '',
      'Blocker findings (JSON):',
      JSON.stringify(blockers, null, 2),
      '',
    ]
    if (nits.length > 0) {
      lines.push(
        'After the blockers, also apply each nit finding below whose',
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
      'a path that the critical-path ceiling says to cut or hedge (especially',
      'when public docs cannot complete it), dispute the achievability finding',
      'rather than expanding the guide to satisfy both. Public-docs silence',
      'with an existing hedge is not a missing-label invent mandate.',
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
          target: 'external',
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

    // Deterministic I4 / anchor / meta schema lint — no LLM, every round.
    const lintFindings = lintGuide(dir, ROOT)
    if (lintFindings.length > 0) {
      log(
        '[' +
          g.slug +
          '] lint: ' +
          lintFindings.filter((f) => f.severity === 'blocker').length +
          ' blocker(s), ' +
          lintFindings.filter((f) => f.severity === 'nit').length +
          ' nit(s)'
      )
    }
    for (const f of lintFindings) {
      findings.push({ ...f })
    }

    return {
      blockers: findings.filter((f) => f.severity === 'blocker'),
      nits: findings.filter((f) => f.severity === 'nit'),
      skippedDims,
    }
  }

  async function draftOne(raw: GuideInput): Promise<GuideResult> {
    const catalog = await lookupCatalogPresence({
      provider: raw.provider,
      slug: raw.slug,
    })
    log(
      '[' +
        raw.slug +
        '] catalog: ' +
        catalog.status +
        (catalog.match
          ? ' name=' + catalog.match.name
          : '') +
        ' tenant=' +
        catalog.tenant +
        ' observed=' +
        catalog.observedAt +
        (catalog.reason ? ' — ' + catalog.reason : '') +
        (catalog.logDetail ? ' detail=' + catalog.logDetail : '')
    )
    const g: GuideInput = {
      ...raw,
      catalogPromptNote: formatCatalogNote(catalog),
      lockNotes: mergeCatalogNotes(raw.notes, stableCatalogLockNote(catalog)),
    }

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

    if (PAUSE_ON_SCOPE) {
      const dossierOqs = existsSync(join(dir, 'research.md'))
        ? extractOpenQuestionsFromResearch(
            readFileSync(join(dir, 'research.md'), 'utf8')
          )
        : []
      const allOqs = mergeOpenQuestions(research.open_questions, dossierOqs)
      const gate = evaluateScopeGate(allOqs, operatorNotesOf(g))
      log(
        '[' +
          g.slug +
          '] scope gate: material=' +
          gate.material.length +
          ' unanswered=' +
          gate.unanswered.length +
          ' soft=' +
          gate.soft.length
      )
      if (gate.pause) {
        log(
          '[' +
            g.slug +
            '] awaiting_scope — pausing before draft (' +
            gate.unanswered.length +
            ' decision(s) needed)'
        )
        return {
          slug: g.slug,
          status: 'awaiting_scope',
          failed_phase: 'scope',
          notes: research.notes,
          open_questions: gate.unanswered.map((d) => d.question),
          scope: gate,
          research_change: researchChange,
          history: [
            {
              phase: 'scope_gate',
              material: gate.material,
              soft: gate.soft,
              unanswered: gate.unanswered,
            },
          ],
        }
      }
    }

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
      log('[' + g.slug + '] drafting external.md + speakeasy.md for persona ' + PERSONA)
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
      let { blockers, nits, skippedDims } = await reviewRound(g, round, prior, {
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

      let entry: Record<string, unknown> = {
        round,
        blockers,
        nits,
        ...(skippedDims.length ? { skipped_dimensions: skippedDims } : {}),
      }
      history.push(entry)

      if (blockers.length > 0) {
        log(
          '[' +
            g.slug +
            '] revising ' +
            blockers.length +
            ' blocker(s) and ' +
            nits.length +
            ' nit(s)'
        )
        const revision = await agent(
          revisionPrompt(g, round, blockers, nits),
          {
            label: g.slug + ' revise r' + round,
            phase: g.slug + ': revise',
            schema: RevisionResult,
          }
        )
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

        if (round < MAX_ROUNDS) {
          continue
        }

        // Last round: one confirmatory review after the final revise.
        // No salvage / polish tails — unresolved blockers surface to a human.
        log(
          '[' +
            g.slug +
            '] finalization review after last-round revise (' +
            blockers.length +
            ' blocker(s) were addressed)'
        )
        const fin = await reviewRound(g, round, prior, {
          lock: prevLock,
          allowSkip: false,
        })
        const finEntry: Record<string, unknown> = {
          round,
          finalization: true,
          blockers: fin.blockers,
          nits: fin.nits,
          ...(fin.skippedDims.length
            ? { skipped_dimensions: fin.skippedDims }
            : {}),
        }
        history.push(finEntry)

        if (fin.blockers.length > 0) {
          log(
            '[' +
              g.slug +
              '] not converged: ' +
              fin.blockers.length +
              ' blocker(s) after finalization review'
          )
          return {
            slug: g.slug,
            status: 'unconverged',
            rounds: round,
            unresolved: fin.blockers,
            nits: fin.nits,
            open_questions: openQuestions,
            history,
            research_change: researchChange,
            ...(skipped.length ? { skipped } : {}),
          }
        }

        blockers = fin.blockers
        nits = fin.nits
        entry = finEntry
      }

      {
        // Converged. Leftover nits stay on the human checklist — no polish
        // pass (polish previously broke fidelity on conditional gates /
        // recovery notes).
        const checklist: unknown[] = nits
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
