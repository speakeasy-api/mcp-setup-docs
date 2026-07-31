import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import {
  buildDraftInputs,
  buildResearchInputs,
  buildReviewInputs,
  canSkipStep,
  digestBytes,
  digestGuideFile,
  isResearchUnchanged,
  makeStepRecord,
  missingResearchOutputs,
  missingDraftOutputs,
  readLock,
  rebaselineLockResearchArtifacts,
  researchMatchesSnapshot,
  researchNotesMatchLock,
  snapshotResearchOutputs,
  writeLock,
  type PipelineLock,
  type ResearchSnapshot,
  type ReviewDimension,
  type StepId,
  type StepRecord,
} from './lock.ts'
import { shouldSalvageFinalization } from './findings.ts'
import { lintGuide } from './lint-guide.ts'
import { withSchemaHint } from './schema-hint.ts'
import { type PiRuntime as Runtime } from './runtime-pi.ts'
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
  resolveAddServerPath,
  stableCatalogLockNote,
  type CatalogLookupResult,
  type SpeakeasyAddServerMode,
} from './pulse-catalog.ts'
import { PATHS, abs, personaFile } from './paths.ts'
import {
  DIMENSIONS,
  createPrompts,
  type Dimension,
  type GuideInput,
} from './prompts.ts'

// The hashed prompts live in prompts.ts so a test can render one; see the
// header there.

export type GuideAddServerHints = {
  tenanted: boolean
  addServer: SpeakeasyAddServerMode
  /** Set when meta.yaml could not be read/parsed; path treats as non-override. */
  error?: string
}

function ensureMetaAlias(
  guideDirectory: string,
  slug: string,
  alias: string | undefined
): { changed: boolean; reason?: string } {
  const nextAlias = (alias ?? '').trim()
  if (!nextAlias || nextAlias === slug) return { changed: false }

  const metaPath = join(guideDirectory, 'meta.yaml')
  if (!existsSync(metaPath)) {
    return { changed: false, reason: 'meta.yaml missing' }
  }

  const text = readFileSync(metaPath, 'utf8')
  if (text.includes(`\n  - ${nextAlias}\n`) || text.endsWith(`\n  - ${nextAlias}`)) {
    return { changed: false }
  }

  const aliasBlock = /^aliases:\n((?:  - .*\n)*)/m.exec(text)
  if (aliasBlock && aliasBlock.index !== undefined) {
    const insertAt = aliasBlock.index + aliasBlock[0].length
    const updated = text.slice(0, insertAt) + `  - ${nextAlias}\n` + text.slice(insertAt)
    writeFileSync(metaPath, updated)
    return { changed: true }
  }

  const summaryLine = /^summary:.*\n/m.exec(text)
  if (!summaryLine || summaryLine.index === undefined) {
    return { changed: false, reason: 'summary line not found' }
  }
  const insertAt = summaryLine.index + summaryLine[0].length
  const updated =
    text.slice(0, insertAt) + `aliases:\n  - ${nextAlias}\n` + text.slice(insertAt)
  writeFileSync(metaPath, updated)
  return { changed: true }
}

/** Read remotes[].tenanted + speakeasy_add_server from meta.yaml. */
export function readGuideAddServerHints(
  guideDirectory: string
): GuideAddServerHints {
  const metaPath = join(guideDirectory, 'meta.yaml')
  if (!existsSync(metaPath)) {
    return { tenanted: false, addServer: 'auto' }
  }
  try {
    const data = parseYaml(readFileSync(metaPath, 'utf8')) as {
      remotes?: Array<{ tenanted?: unknown }>
      speakeasy_add_server?: unknown
    } | null
    if (!data || typeof data !== 'object') {
      return {
        tenanted: false,
        addServer: 'auto',
        error: 'meta.yaml parsed to a non-object',
      }
    }
    const tenanted =
      Array.isArray(data.remotes) &&
      data.remotes.some((r) => r && r.tenanted === true)
    const raw = data.speakeasy_add_server
    let addServer: SpeakeasyAddServerMode = 'auto'
    if (raw === 'auto' || raw === 'catalog' || raw === 'custom-remote') {
      addServer = raw
    } else if (raw !== undefined && raw !== null) {
      return {
        tenanted,
        addServer: 'auto',
        error: `invalid speakeasy_add_server: ${JSON.stringify(raw)}`,
      }
    }
    return { tenanted, addServer }
  } catch (err) {
    return {
      tenanted: false,
      addServer: 'auto',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function applyCatalogNotes(
  raw: GuideInput,
  catalog: CatalogLookupResult,
  hints: GuideAddServerHints
): GuideInput {
  const opts = { tenanted: hints.tenanted, addServer: hints.addServer }
  return {
    ...raw,
    catalogPromptNote: formatCatalogNote(catalog, opts),
    lockNotes: mergeCatalogNotes(
      raw.notes,
      stableCatalogLockNote(catalog, opts)
    ),
  }
}

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
      status: {
        type: 'string',
        enum: ['ok', 'blocked'],
        description:
          'ok = required artifacts written and complete enough to draft from; blocked = cannot produce them from public sources.',
      },
      notes: {
        type: 'string',
        description:
          'Decisions made, uncertainty, and (for research) the meta.yaml validation method used. For research, status "ok" is only valid after research.md and meta.yaml exist on disk in the guide directory.',
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
  /**
   * When true, caller should rebaseline in-memory lock research artifact
   * digests to on-disk AFTER so draft/review skips can fire.
   */
  rebaseline?: boolean
}

export type SetupChurn = {
  external_md_lines?: number
  speakeasy_md_lines?: number
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
  /** sha256 of lock notes (operator + stable catalog token). */
  notes_digest?: string
  /** Line churn in setup files when draft ran (before → after). */
  setup_churn?: SetupChurn
  /** Present when status is awaiting_scope. */
  scope?: ScopeGateResult
}

export async function runWorkflow(
  rt: Runtime,
  input: WorkflowInput
): Promise<{ persona: string; timestamp: string; results: GuideResult[] }> {
  const ROOT = input.repoRoot
  const NOW = input.timestamp
  const PERSONA = input.persona
  const MAX_ROUNDS = input.maxRounds || 3
  const FORCE = input.force === true
  const PAUSE_ON_SCOPE = input.pauseOnScope === true
  const { log, agent, pipeline, modelId } = rt
  const P = createPrompts({
    repoRoot: ROOT,
    timestamp: NOW,
    persona: PERSONA,
    maxRounds: MAX_ROUNDS,
  })

  function guideDir(slug: string): string {
    return join(ROOT, 'guides', slug)
  }

  function notesOf(g: GuideInput): string {
    // Lock digests: operator notes + stable catalog token (no timestamps).
    if (g.lockNotes !== undefined) return g.lockNotes
    return g.notes || ''
  }

  function snapshotSetupFiles(dir: string): {
    'external.md'?: string
    'speakeasy.md'?: string
  } {
    const snap: { 'external.md'?: string; 'speakeasy.md'?: string } = {}
    for (const name of ['external.md', 'speakeasy.md'] as const) {
      const absPath = join(dir, name)
      if (existsSync(absPath)) snap[name] = readFileSync(absPath, 'utf8')
    }
    return snap
  }

  function lineCount(text: string | undefined): number {
    if (text === undefined || text.length === 0) return 0
    return text.split('\n').length
  }

  /** Absolute line-count delta for setup files (before → after). */
  function measureSetupChurn(
    before: { 'external.md'?: string; 'speakeasy.md'?: string },
    dir: string
  ): SetupChurn {
    const afterExt = existsSync(join(dir, 'external.md'))
      ? readFileSync(join(dir, 'external.md'), 'utf8')
      : undefined
    const afterSp = existsSync(join(dir, 'speakeasy.md'))
      ? readFileSync(join(dir, 'speakeasy.md'), 'utf8')
      : undefined
    return {
      external_md_lines: Math.abs(
        lineCount(afterExt) - lineCount(before['external.md'])
      ),
      speakeasy_md_lines: Math.abs(
        lineCount(afterSp) - lineCount(before['speakeasy.md'])
      ),
    }
  }

  function operatorNotesOf(g: GuideInput): string {
    // Scope gate: distill/operator decisions only — catalog note must not
    // contribute tokens to notesDisposeOfQuestion.
    return g.notes || ''
  }

  function writeConvergedLock(
    g: GuideInput,
    completedAt: string,
    opts?: { researchNotes?: string }
  ): void {
    const dir = guideDir(g.slug)
    mkdirSync(dir, { recursive: true })
    const steps: Partial<Record<StepId, StepRecord>> = {}

    const researchInputs = buildResearchInputs({
      model: modelId(),
      repoRoot: ROOT,
      provider: g.provider,
      // Prefer the notes actually sent to research (pre-refresh).
      notes: opts?.researchNotes ?? notesOf(g),
      prompt: P.researchLockPrompt(g),
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
        prompt: P.draftLockPrompt(g),
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
          model: modelId(),
          repoRoot: ROOT,
          guideDir: dir,
          provider: g.provider,
          notes: notesOf(g),
          persona: PERSONA,
          dimension: dim.role,
          roleDoc: dim.doc,
          withPersona: dim.persona,
          prompt: P.reviewLockPrompt(g, dim),
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
      runtime: 'pi',
      updated_at: completedAt,
      steps,
    }
    writeLock(dir, lock)
    log('[' + g.slug + '] wrote ' + LOCK_FILENAME_REL)
  }

  function researchWriteRemediationPrompt(
    g: GuideInput,
    missing: string[]
  ): string {
    const dir = guideDir(g.slug)
    return [
      'Your previous report claimed research was complete, but these required',
      'files are still missing from the guide directory:',
      ...missing.map((f) => '- ' + join(dir, f)),
      '',
      'Write them now (research.md and meta.yaml). Use the research you',
      'already gathered in this conversation; re-read the role docs only if',
      'needed. Do not write external.md or speakeasy.md.',
      '',
      P.assign(g),
      '',
      'Then report status/notes/open_questions again. status "ok" only after',
      'both files exist on disk.',
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
      P.readingList(['technical-research.md'], false),
      '',
      P.assign(g),
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
      // Keep AFTER on disk. When notes match the lock, caller rebases in-memory
      // lock digests so draft/review skips can fire without discarding soft
      // research improvements or note incorporations.
      if (!researchNotesMatchLock(prevLock, notesOf(g))) {
        log(
          '[' +
            g.slug +
            '] research not material but notes changed; keeping AFTER, no skip'
        )
        return {
          method: 'judge',
          unchanged: false,
          notes:
            'operator notes changed since lock; keeping AFTER and treating as changed for skip. judge: ' +
            judgment.notes,
        }
      }
      log(
        '[' +
          g.slug +
          '] research not material; keeping AFTER and rebasing lock digests'
      )
      return {
        method: 'judge',
        unchanged: true,
        rebaseline: true,
        notes: judgment.notes,
      }
    }
    return {
      method: 'judge',
      unchanged: false,
      notes: judgment.notes,
    }
  }

  function draftWriteRemediationPrompt(
    g: GuideInput,
    missing: string[]
  ): string {
    const dir = guideDir(g.slug)
    return [
      'Your previous report claimed the draft was complete, but these required',
      'files are still missing from the guide directory:',
      ...missing.map((f) => '- ' + join(dir, f)),
      '',
      'Write them now (external.md and speakeasy.md) from research.md /',
      'meta.yaml and the Writer role doc. Use work already done in this',
      'conversation; re-read role docs only if needed. Do not touch any other',
      'path.',
      '',
      P.assign(g),
      '',
      'Then report status/notes/open_questions again. status "ok" only after',
      'both files exist on disk.',
    ].join('\n')
  }

  function reviseWriteRemediationPrompt(
    g: GuideInput,
    missing: string[]
  ): string {
    const dir = guideDir(g.slug)
    return [
      'Required guide files are still missing after your revision:',
      ...missing.map((f) => '- ' + join(dir, f)),
      '',
      'Write every missing file now. Use research.md and meta.yaml as the fact',
      'ceiling for external.md / speakeasy.md. Do not touch any path outside',
      'the guide directory. Do not claim a file exists unless it is on disk.',
      '',
      P.assign(g),
      '',
      'Then report notes/disputed/skipped again. notes must name which missing',
      'files you wrote.',
    ].join('\n')
  }

  function revisionPrompt(
    g: GuideInput,
    round: number,
    blockers: unknown[],
    nits: unknown[],
    extraNote?: string | null
  ): string {
    const lines = [
      'You are a Revision Agent in the mcp-setup-docs drafting pipeline.',
      'Repo root: ' + ROOT,
      '',
      'Read first, in order:',
      P.readingList(['technical-research.md', 'writer.md'], true),
      '',
      P.assign(g),
      '',
    ]
    if (extraNote) {
      lines.push(extraNote, '')
    }
    lines.push(
      'Review round ' + round + ' reported the blocker findings below. Fix them',
      'in the guide directory: findings targeting "research" or "meta" first,',
      'following the Technical Research role doc (facts need provenance; use',
      'the observed_at timestamp above), then findings targeting "external"',
      'or "speakeasy", following the Writer role doc (grammar, persona voice,',
      'the Dossier as fact ceiling). Honor the anchor contract in shared.md.',
      'If a finding says a required file is missing, write that file — do not',
      'dispute or skip it as already present unless it exists on disk.',
      'Do not touch any path outside the guide directory.',
      'Apply a minimal diff: change only what each finding requires; leave',
      'unaffected prose, ordering, and titles alone.',
      '',
      'Blocker findings (JSON):',
      JSON.stringify(blockers, null, 2),
      '',
    )
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

    const results = await Promise.all(
      DIMENSIONS.map(async (dim) => {
        const stepId = ('review.' + dim.role) as StepId
        if (lockOpts.allowSkip) {
          const inputs = buildReviewInputs({
            model: modelId(),
            repoRoot: ROOT,
            guideDir: dir,
            provider: g.provider,
            notes: notesOf(g),
            persona: PERSONA,
            dimension: dim.role,
            roleDoc: dim.doc,
            withPersona: dim.persona,
            prompt: P.reviewLockPrompt(g, dim),
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

        const report = await agent(P.reviewerPrompt(g, dim, round, prior), {
          label: g.slug + ' review:' + dim.role + ' r' + round,
          phase: g.slug + ': review',
          schema: Review,
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
    const dir = guideDir(raw.slug)
    mkdirSync(dir, { recursive: true })

    const catalog = await lookupCatalogPresence({
      provider: raw.provider,
      slug: raw.slug,
    })
    let hints = readGuideAddServerHints(dir)
    if (hints.error) {
      log(
        '[' +
          raw.slug +
          '] add-server hints: meta read warning — ' +
          hints.error +
          ' (treating as auto / non-tenanted)'
      )
    }
    const path = resolveAddServerPath({
      catalog,
      tenanted: hints.tenanted,
      addServer: hints.addServer,
    })
    log(
      '[' +
        raw.slug +
        '] catalog: ' +
        catalog.status +
        (catalog.match
          ? ' name=' + catalog.match.name
          : '') +
        ' tenanted=' +
        hints.tenanted +
        ' add_server=' +
        hints.addServer +
        ' path=' +
        path +
        ' tenant=' +
        catalog.tenant +
        ' observed=' +
        catalog.observedAt +
        (catalog.reason ? ' — ' + catalog.reason : '') +
        (catalog.logDetail ? ' detail=' + catalog.logDetail : '')
    )
    let g: GuideInput = applyCatalogNotes(raw, catalog, hints)
    // Notes actually sent to research — preserve for lock digests if hints refresh.
    const researchLockNotes = notesOf(g)

    const prevLock = readLock(dir)
    let workingLock: PipelineLock | null = prevLock
    const skipped: string[] = []
    const beforeResearch = snapshotResearchOutputs(dir)
    const beforeSetup = snapshotSetupFiles(dir)

    log('[' + g.slug + '] researching ' + g.provider)
    const research = await agent(P.researchPrompt(g), {
      label: g.slug + ' research',
      phase: g.slug + ': research',
      schema: PhaseResult,
      remediation: (parsed) => {
        if (parsed.status === 'blocked') return null
        const missing = missingResearchOutputs(dir)
        if (missing.length === 0) return null
        log(
          '[' +
            g.slug +
            '] research reported ' +
            parsed.status +
            ' but missing ' +
            missing.join(', ') +
            '; requesting write remediation'
        )
        return researchWriteRemediationPrompt(g, missing)
      },
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

    // After remediation (if any), still require on-disk artifacts before draft.
    const missingOutputs = missingResearchOutputs(dir)
    if (missingOutputs.length > 0) {
      const missing = missingOutputs.join(', ')
      log(
        '[' +
          g.slug +
          '] research finished without required outputs: ' +
          missing
      )
      return {
        slug: g.slug,
        status: 'failed',
        failed_phase: 'research',
        notes:
          (research.notes ? research.notes + '\n' : '') +
          'research completed without writing: ' +
          missing,
        open_questions: research.open_questions,
      }
    }

    // Research may have set remotes[].tenanted / speakeasy_add_server — refresh for draft/lock.
    const hintsAfter = readGuideAddServerHints(dir)
    if (hintsAfter.error) {
      log(
        '[' +
          g.slug +
          '] add-server hints after research: meta read warning — ' +
          hintsAfter.error
      )
    }
    if (
      hintsAfter.tenanted !== hints.tenanted ||
      hintsAfter.addServer !== hints.addServer
    ) {
      hints = hintsAfter
      g = applyCatalogNotes(raw, catalog, hints)
      log(
        '[' +
          g.slug +
          '] catalog path refreshed after research: tenanted=' +
          hints.tenanted +
          ' add_server=' +
          hints.addServer +
          ' path=' +
          resolveAddServerPath({
            catalog,
            tenanted: hints.tenanted,
            addServer: hints.addServer,
          })
      )
    }

    if (catalog.match?.name) {
      const aliasResult = ensureMetaAlias(dir, g.slug, catalog.match.name)
      if (aliasResult.changed) {
        log(
          '[' +
            g.slug +
            '] added catalog alias to meta.yaml: ' +
            JSON.stringify(catalog.match.name)
        )
      } else if (aliasResult.reason) {
        log(
          '[' +
            g.slug +
            '] catalog alias not applied: ' +
            aliasResult.reason
        )
      }
    }

    let researchChange = await decideResearchUnchanged(
      g,
      dir,
      prevLock,
      beforeResearch
    )
    let researchUnchanged = researchChange.unchanged
    const notesDigest = digestBytes(notesOf(g))
    let setupChurn: SetupChurn | undefined
    function resultExtras(): Partial<GuideResult> {
      return {
        notes_digest: notesDigest,
        ...(setupChurn ? { setup_churn: setupChurn } : {}),
        ...(skipped.length ? { skipped } : {}),
      }
    }

    // Notes guard: never skip via research equivalence when the operator ask changed.
    if (
      researchUnchanged &&
      prevLock &&
      !researchNotesMatchLock(prevLock, notesOf(g))
    ) {
      researchUnchanged = false
      researchChange = {
        ...researchChange,
        unchanged: false,
        rebaseline: false,
        notes:
          'operator notes changed since lock; treating as changed for skip. ' +
          (researchChange.notes || ''),
      }
    } else if (
      researchUnchanged &&
      workingLock &&
      (researchChange.rebaseline || researchChange.method === 'digest')
    ) {
      // Align lock research artifact digests with on-disk AFTER so draft/review
      // skips work (stamp-normalized digests + soft non-material wording).
      workingLock = rebaselineLockResearchArtifacts(workingLock, dir)
      log('[' + g.slug + '] rebaselined lock research artifact digests')
    }

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
          ...resultExtras(),
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
      prompt: P.draftLockPrompt(g),
    })
    const skipDraft = canSkipStep(
      workingLock,
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
      const draft = await agent(P.draftPrompt(g), {
        label: g.slug + ' draft',
        phase: g.slug + ': draft',
        schema: PhaseResult,
        remediation: (parsed) => {
          if (parsed.status === 'blocked') return null
          const missing = missingDraftOutputs(dir)
          if (missing.length === 0) return null
          log(
            '[' +
              g.slug +
              '] draft reported ' +
              parsed.status +
              ' but missing ' +
              missing.join(', ') +
              '; requesting write remediation'
          )
          return draftWriteRemediationPrompt(g, missing)
        },
      })
      if (!draft) {
        return {
          slug: g.slug,
          status: 'failed',
          failed_phase: 'draft',
          research_change: researchChange,
          ...resultExtras(),
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
          ...resultExtras(),
        }
      }

      const missingDraft = missingDraftOutputs(dir)
      if (missingDraft.length > 0) {
        const missing = missingDraft.join(', ')
        log(
          '[' +
            g.slug +
            '] draft finished without required outputs: ' +
            missing
        )
        return {
          slug: g.slug,
          status: 'failed',
          failed_phase: 'draft',
          notes:
            (draft.notes ? draft.notes + '\n' : '') +
            'draft completed without writing: ' +
            missing,
          open_questions: draft.open_questions,
          research_change: researchChange,
          ...resultExtras(),
        }
      }

      draftRan = true
      draftOpenQuestions = draft.open_questions || []
      setupChurn = measureSetupChurn(beforeSetup, dir)
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
        lock: workingLock,
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
        writeConvergedLock(g, finishedAt, { researchNotes: researchLockNotes })
        return {
          slug: g.slug,
          status: 'converged',
          rounds: 0,
          nits: [],
          open_questions: openQuestions,
          history: [],
          skipped,
          research_change: researchChange,
          ...resultExtras(),
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
            remediation: () => {
              // After draft, setup files must stay on disk. Revision agents
              // have claimed they exist while lint still saw ENOENT.
              const missing = missingResearchOutputs(dir).concat(
                missingDraftOutputs(dir)
              )
              if (missing.length === 0) return null
              log(
                '[' +
                  g.slug +
                  '] revise r' +
                  round +
                  ' missing ' +
                  missing.join(', ') +
                  '; requesting write remediation'
              )
              return reviseWriteRemediationPrompt(g, missing)
            },
          }
        )
        const stillMissing = missingResearchOutputs(dir).concat(
          missingDraftOutputs(dir)
        )
        if (stillMissing.length > 0) {
          log(
            '[' +
              g.slug +
              '] revise r' +
              round +
              ' finished without required outputs: ' +
              stillMissing.join(', ')
          )
        }
        entry.revision_notes = revision
          ? revision.notes
          : '(revision agent returned no report)'
        entry.disputed = revision ? revision.disputed : []
        entry.skipped = revision ? revision.skipped : []
        if (stillMissing.length > 0) {
          entry.missing_outputs = stillMissing
        }
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
        // Narrow salvage: when every remaining blocker is a setup-file
        // fidelity miss (Dossier already has the fact), one revise +
        // recheck. Research/meta/achievability gaps still surface to a human.
        // No polish pass.
        log(
          '[' +
            g.slug +
            '] finalization review after last-round revise (' +
            blockers.length +
            ' blocker(s) were addressed)'
        )
        const fin = await reviewRound(g, round, prior, {
          lock: workingLock,
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
          if (shouldSalvageFinalization(fin.blockers)) {
            log(
              '[' +
                g.slug +
                '] finalization salvage revise (' +
                fin.blockers.length +
                ' dossier-backed render fix(es))'
            )
            const salvageNote =
              'Finalization salvage: every remaining blocker is a setup-file ' +
              'fidelity miss. The Dossier already has the fact — apply the ' +
              'suggestion wording into external.md / speakeasy.md. Do not ' +
              'invent new research, do not expand scope, do not demand console ' +
              'capture. Do not apply nits in this salvage pass.'
            // Blockers only — nits of any target must not widen salvage.
            const salvage = await agent(
              revisionPrompt(g, round, fin.blockers, [], salvageNote),
              {
                label: g.slug + ' revise finalization',
                phase: g.slug + ': revise',
                schema: RevisionResult,
                remediation: () => {
                  const missing = missingResearchOutputs(dir).concat(
                    missingDraftOutputs(dir)
                  )
                  if (missing.length === 0) return null
                  return reviseWriteRemediationPrompt(g, missing)
                },
              }
            )
            finEntry.revision_notes = salvage
              ? salvage.notes
              : '(revision agent returned no report)'
            finEntry.disputed = salvage ? salvage.disputed : []
            finEntry.skipped = salvage ? salvage.skipped : []
            prior = {
              round,
              finalization: true,
              blockers: fin.blockers,
              nits: fin.nits,
              revision_notes: finEntry.revision_notes,
              disputed: finEntry.disputed,
              skipped_nits: finEntry.skipped,
            }

            log('[' + g.slug + '] finalization recheck after salvage revise')
            const recheck = await reviewRound(g, round, prior, {
              lock: workingLock,
              allowSkip: false,
            })
            const recheckEntry: Record<string, unknown> = {
              round,
              finalization_recheck: true,
              blockers: recheck.blockers,
              nits: recheck.nits,
              ...(recheck.skippedDims.length
                ? { skipped_dimensions: recheck.skippedDims }
                : {}),
            }
            history.push(recheckEntry)

            if (recheck.blockers.length > 0) {
              log(
                '[' +
                  g.slug +
                  '] not converged: ' +
                  recheck.blockers.length +
                  ' blocker(s) after finalization salvage'
              )
              return {
                slug: g.slug,
                status: 'unconverged',
                rounds: round,
                unresolved: recheck.blockers,
                nits: recheck.nits,
                open_questions: openQuestions,
                history,
                research_change: researchChange,
                ...resultExtras(),
              }
            }

            blockers = recheck.blockers
            nits = recheck.nits
            entry = recheckEntry
          } else {
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
              ...resultExtras(),
            }
          }
        } else {
          blockers = fin.blockers
          nits = fin.nits
          entry = finEntry
        }
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
        writeConvergedLock(g, finishedAt, { researchNotes: researchLockNotes })
        return {
          slug: g.slug,
          status: 'converged',
          rounds: round,
          nits: checklist,
          open_questions: openQuestions,
          history,
          research_change: researchChange,
          ...resultExtras(),
        }
      }
    }

    return {
      slug: g.slug,
      status: 'failed',
      failed_phase: 'review',
      research_change: researchChange,
      ...resultExtras(),
    }
  }

  const results = (await pipeline(input.guides, draftOne)).filter(Boolean)
  return { persona: PERSONA, timestamp: NOW, results }
}

const LOCK_FILENAME_REL = 'pipeline.lock.json'
