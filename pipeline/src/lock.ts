/**
 * Pipeline lockfile helpers — digests, skip predicates, read/write.
 * Normative semantics: PATHS.pipelineLockDoc
 * Schema: PATHS.pipelineLockSchema
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  PATHS,
  personaFile,
  roleDoc,
} from './paths.ts'

export const LOCK_FILENAME = 'pipeline.lock.json'

/** Guide-relative research outputs compared for "unchanged". */
export const RESEARCH_OUTPUT_FILES = ['research.md', 'meta.yaml'] as const

/** Guide-relative Writer outputs required after a successful draft. */
export const DRAFT_OUTPUT_FILES = ['external.md', 'speakeasy.md'] as const

export type ResearchSnapshot = {
  'research.md'?: string
  'meta.yaml'?: string
}

/** Guide-relative files from `files` that are not present on disk. */
export function missingGuideFiles(
  guideDir: string,
  files: readonly string[]
): string[] {
  return files.filter((name) => !existsSync(join(guideDir, name)))
}

/** Guide-relative research outputs that are not present on disk. */
export function missingResearchOutputs(guideDir: string): string[] {
  return missingGuideFiles(guideDir, RESEARCH_OUTPUT_FILES)
}

/** Guide-relative draft outputs that are not present on disk. */
export function missingDraftOutputs(guideDir: string): string[] {
  return missingGuideFiles(guideDir, DRAFT_OUTPUT_FILES)
}

export type ReviewDimension =
  | 'fidelity'
  | 'achievability'
  | 'lint'
  // Legacy keys may appear in older pipeline.lock.json files; the workflow
  // no longer runs these dimensions (Writer self-check owns them).
  | 'voice'
  | 'formatting'
  | 'concision'

export type StepId =
  | 'research'
  | 'draft'
  | `review.${ReviewDimension}`

export type PathDigest = {
  path: string
  digest: string
}

export type StepParams = {
  provider: string
  notes: string
  persona?: string
  dimension?: ReviewDimension
}

export type StepInputs = {
  model: string
  prompt_digest: string
  reading_list: PathDigest[]
  artifacts: PathDigest[]
  params: StepParams
}

export type StepRecord = {
  input_digest: string
  inputs: StepInputs
  outputs: PathDigest[]
  completed_at: string
}

export type PipelineLock = {
  schema_version: 1
  slug: string
  persona: string
  runtime?: string
  updated_at: string
  steps: Partial<Record<StepId, StepRecord>>
}

const DIGEST_RE = /^sha256:[0-9a-f]{64}$/

/**
 * A prompt exactly as sent to the agent, plus the spans of it that must not
 * reach `prompt_digest`.
 *
 * Hashing the *rendered* prompt is what makes editing a prompt builder bust the
 * lock. The predecessor of this type was a hand-maintained shadow copy of each
 * prompt, which nothing forced to stay in step with the real one — a prompt
 * could change while its digest did not, and the pipeline would skip a step it
 * should have re-run.
 *
 * `volatile` is ordered outer-first: spans are matched literally, so a span
 * that contains another must be listed first.
 */
export type RenderedPrompt = {
  text: string
  volatile: readonly string[]
}

/**
 * Replace each volatile span with a positional placeholder.
 *
 * Throws when a span is absent rather than skipping it. A span that silently
 * failed to match would leave per-run context — above all the run timestamp —
 * inside `prompt_digest`, so every run would bust every lock entry while the
 * pipeline still looked healthy. That failure costs money on every run and
 * shows up nowhere; this one shows up immediately.
 */
export function stripVolatile(
  text: string,
  volatile: readonly string[]
): string {
  let out = text
  volatile.forEach((span, i) => {
    if (span === '') {
      throw new Error(`volatile span ${i} is empty; it would match everywhere`)
    }
    if (!out.includes(span)) {
      throw new Error(
        `volatile span ${i} is not in the rendered prompt: ` +
          JSON.stringify(span.length > 80 ? span.slice(0, 80) + '…' : span)
      )
    }
    out = out.split(span).join(`<VOLATILE:${i}>`)
  })
  return out
}

export function digestBytes(data: Buffer | string): string {
  const hash = createHash('sha256')
  hash.update(typeof data === 'string' ? Buffer.from(data, 'utf8') : data)
  return 'sha256:' + hash.digest('hex')
}

export function promptDigest(prompt: RenderedPrompt): string {
  return digestBytes(stripVolatile(prompt.text, prompt.volatile))
}

/** Full ISO-8601 instants ending in Z — provenance stamps, not bare dates. */
const ISO8601Z_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g

/**
 * Normalize research.md for stable digests: drop frontmatter researched_at
 * and replace ISO-8601-Z provenance stamp tokens. Bare calendar dates stay.
 */
export function normalizeResearchMdForDigest(content: string): string {
  const withoutResearchedAt = content.replace(
    /^researched_at:\s*.+$/m,
    'researched_at: <PROVENANCE_STAMP>'
  )
  return withoutResearchedAt.replace(ISO8601Z_RE, '<ISO8601Z>')
}

export function stableDigestResearchMd(content: string): string {
  return digestBytes(normalizeResearchMdForDigest(content))
}

/** Recursively omit observed_at keys (for stable meta.yaml digests). */
export function omitObservedAt(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(omitObservedAt)
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'observed_at') continue
      out[k] = omitObservedAt(v)
    }
    return out
  }
  return value
}

/** Canonical JSON: sorted keys, omit null, compact, array order preserved. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(normalizeForCanonical(value))
}

function normalizeForCanonical(value: unknown): unknown {
  if (value === null) return undefined
  if (Array.isArray(value)) {
    return value.map((item) => {
      const n = normalizeForCanonical(item)
      return n === undefined ? null : n
    })
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    const out: Record<string, unknown> = {}
    for (const k of keys) {
      const n = normalizeForCanonical(obj[k])
      if (n !== undefined) out[k] = n
    }
    return out
  }
  return value
}

export function inputDigest(inputs: StepInputs): string {
  return digestBytes(canonicalize(inputs))
}

/**
 * Stable content digest for a file on disk.
 * guideRel: guide-relative name used to decide meta.yaml / research.md rules
 *   (e.g. "meta.yaml"); when omitted, basename of absPath is used.
 */
export function stableDigestFile(absPath: string, guideRel?: string): string {
  const name = guideRel || absPath.split(/[/\\]/).pop() || ''
  const raw = readFileSync(absPath)
  if (name === 'meta.yaml') {
    const parsed = parseYaml(raw.toString('utf8'))
    return digestBytes(canonicalize(omitObservedAt(parsed)))
  }
  if (name === 'research.md') {
    return stableDigestResearchMd(raw.toString('utf8'))
  }
  return digestBytes(raw)
}

export function digestRepoFile(repoRoot: string, repoRel: string): PathDigest {
  return {
    path: repoRel,
    digest: stableDigestFile(join(repoRoot, repoRel)),
  }
}

export function digestGuideFile(
  guideDir: string,
  guideRel: string
): PathDigest {
  const abs = join(guideDir, guideRel)
  if (!existsSync(abs)) {
    throw new Error(
      `missing required guide file: ${guideRel} (under ${guideDir})`
    )
  }
  return {
    path: guideRel,
    digest: stableDigestFile(abs, guideRel),
  }
}

export function lockPath(guideDir: string): string {
  return join(guideDir, LOCK_FILENAME)
}

export function readLock(guideDir: string): PipelineLock | null {
  const path = lockPath(guideDir)
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as PipelineLock
    if (raw.schema_version !== 1) return null
    return raw
  } catch {
    return null
  }
}

export function writeLock(guideDir: string, lock: PipelineLock): void {
  writeFileSync(lockPath(guideDir), JSON.stringify(lock, null, 2) + '\n')
}

export function outputsMatch(
  guideDir: string,
  outputs: PathDigest[] | undefined
): boolean {
  if (!outputs || outputs.length === 0) return false
  for (const o of outputs) {
    const abs = join(guideDir, o.path)
    if (!existsSync(abs)) return false
    if (!DIGEST_RE.test(o.digest)) return false
    if (stableDigestFile(abs, o.path) !== o.digest) return false
  }
  return true
}

/** Compare research.md + meta.yaml stable digests to lock research.outputs. */
export function isResearchUnchanged(
  lock: PipelineLock | null,
  guideDir: string
): boolean {
  if (!lock?.steps.research) return false
  const outs = lock.steps.research.outputs
  const byPath = new Map(outs.map((o) => [o.path, o.digest]))
  for (const name of RESEARCH_OUTPUT_FILES) {
    const abs = join(guideDir, name)
    if (!existsSync(abs)) return false
    const expected = byPath.get(name)
    if (!expected) return false
    if (stableDigestFile(abs, name) !== expected) return false
  }
  return true
}

/** Read research outputs before a research run overwrites them. */
export function snapshotResearchOutputs(guideDir: string): ResearchSnapshot | null {
  const snap: ResearchSnapshot = {}
  let any = false
  for (const name of RESEARCH_OUTPUT_FILES) {
    const abs = join(guideDir, name)
    if (!existsSync(abs)) continue
    snap[name] = readFileSync(abs, 'utf8')
    any = true
  }
  return any ? snap : null
}

export function restoreResearchSnapshot(
  guideDir: string,
  snap: ResearchSnapshot
): void {
  for (const name of RESEARCH_OUTPUT_FILES) {
    const content = snap[name]
    if (content === undefined) continue
    writeFileSync(join(guideDir, name), content)
  }
}

/** Stable digests of snapshot contents (same rules as on-disk files). */
export function snapshotStableDigests(
  snap: ResearchSnapshot
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of RESEARCH_OUTPUT_FILES) {
    const content = snap[name]
    if (content === undefined) continue
    if (name === 'meta.yaml') {
      out[name] = digestBytes(canonicalize(omitObservedAt(parseYaml(content))))
    } else if (name === 'research.md') {
      out[name] = stableDigestResearchMd(content)
    } else {
      out[name] = digestBytes(content)
    }
  }
  return out
}

/**
 * True when operator/lock notes match the previous research step's params.notes.
 * Missing research step → false (cannot claim note continuity).
 */
export function researchNotesMatchLock(
  lock: PipelineLock | null,
  notes: string
): boolean {
  const locked = lock?.steps.research?.inputs.params.notes
  if (locked === undefined) return false
  return locked === notes
}

/**
 * After a non-material research refresh, keep AFTER on disk and rewrite
 * in-memory lock digests so draft/review skip checks compare against the
 * current research artifacts. Setup-file outputs are left unchanged.
 */
export function rebaselineLockResearchArtifacts(
  lock: PipelineLock,
  guideDir: string
): PipelineLock {
  const researchOutputs = RESEARCH_OUTPUT_FILES.map((name) =>
    digestGuideFile(guideDir, name)
  )
  const byPath = new Map(researchOutputs.map((o) => [o.path, o.digest]))

  const steps: Partial<Record<StepId, StepRecord>> = { ...lock.steps }

  if (steps.research) {
    steps.research = {
      ...steps.research,
      outputs: researchOutputs,
    }
  }

  for (const stepId of Object.keys(steps) as StepId[]) {
    if (stepId === 'research') continue
    const entry = steps[stepId]
    if (!entry) continue
    let touched = false
    const newArtifacts = entry.inputs.artifacts.map((a) => {
      const next = byPath.get(a.path)
      if (next === undefined || next === a.digest) return a
      touched = true
      return { path: a.path, digest: next }
    })
    if (!touched) continue
    const newInputs: StepInputs = {
      ...entry.inputs,
      artifacts: newArtifacts,
    }
    steps[stepId] = {
      ...entry,
      inputs: newInputs,
      input_digest: inputDigest(newInputs),
    }
  }

  return {
    ...lock,
    steps,
  }
}

/** True when every research output present in the snapshot matches on disk. */
export function researchMatchesSnapshot(
  guideDir: string,
  snap: ResearchSnapshot
): boolean {
  const snapDigests = snapshotStableDigests(snap)
  for (const name of RESEARCH_OUTPUT_FILES) {
    const abs = join(guideDir, name)
    const expected = snapDigests[name]
    if (expected === undefined) {
      if (existsSync(abs)) return false
      continue
    }
    if (!existsSync(abs)) return false
    if (stableDigestFile(abs, name) !== expected) return false
  }
  return true
}

export type SkipContext = {
  force: boolean
  /** Upstream this run invalidated this step. */
  invalidated: boolean
  /** Required for draft skips. */
  researchUnchanged?: boolean
}

/**
 * Skip predicate from PATHS.pipelineLockDoc.
 * Does not check researchUnchanged for review.* — caller passes invalidated.
 */
export function canSkipStep(
  lock: PipelineLock | null,
  slug: string,
  stepId: StepId,
  inputs: StepInputs,
  guideDir: string,
  ctx: SkipContext
): boolean {
  if (ctx.force || ctx.invalidated) return false
  if (stepId === 'draft' && ctx.researchUnchanged !== true) return false
  if (!lock || lock.schema_version !== 1 || lock.slug !== slug) return false
  const entry = lock.steps[stepId]
  if (!entry) return false
  const digest = inputDigest(inputs)
  if (digest !== entry.input_digest) return false
  // Defensive: stored inputs should re-hash to input_digest
  if (inputDigest(entry.inputs) !== entry.input_digest) return false
  return outputsMatch(guideDir, entry.outputs)
}

export function makeStepRecord(
  inputs: StepInputs,
  outputs: PathDigest[],
  completedAt: string
): StepRecord {
  return {
    input_digest: inputDigest(inputs),
    inputs,
    outputs,
    completed_at: completedAt,
  }
}

export function researchReadingList(repoRoot: string): PathDigest[] {
  return [
    PATHS.glossary,
    PATHS.shared,
    roleDoc('technical-research.md'),
    PATHS.speakeasySetup,
  ].map((p) => digestRepoFile(repoRoot, p))
}

export function draftReadingList(
  repoRoot: string,
  persona: string
): PathDigest[] {
  return [
    PATHS.glossary,
    PATHS.shared,
    roleDoc('writer.md'),
    personaFile(persona),
  ].map((p) => digestRepoFile(repoRoot, p))
}

export function reviewReadingList(
  repoRoot: string,
  persona: string,
  roleDocName: string,
  withPersona: boolean
): PathDigest[] {
  const paths = [PATHS.glossary, PATHS.shared, roleDoc(roleDocName)]
  if (withPersona) paths.push(personaFile(persona))
  return paths.map((p) => digestRepoFile(repoRoot, p))
}

export function buildResearchInputs(opts: {
  model: string
  repoRoot: string
  provider: string
  notes: string
  prompt: RenderedPrompt
}): StepInputs {
  return {
    model: opts.model,
    prompt_digest: promptDigest(opts.prompt),
    reading_list: researchReadingList(opts.repoRoot),
    artifacts: [],
    params: {
      provider: opts.provider,
      notes: opts.notes,
    },
  }
}

export function buildDraftInputs(opts: {
  model: string
  repoRoot: string
  guideDir: string
  provider: string
  notes: string
  persona: string
  prompt: RenderedPrompt
}): StepInputs {
  return {
    model: opts.model,
    prompt_digest: promptDigest(opts.prompt),
    reading_list: draftReadingList(opts.repoRoot, opts.persona),
    artifacts: [
      digestGuideFile(opts.guideDir, 'research.md'),
      digestGuideFile(opts.guideDir, 'meta.yaml'),
    ],
    params: {
      provider: opts.provider,
      notes: opts.notes,
      persona: opts.persona,
    },
  }
}

export function buildReviewInputs(opts: {
  model: string
  repoRoot: string
  guideDir: string
  provider: string
  notes: string
  persona: string
  dimension: ReviewDimension
  roleDoc: string
  withPersona: boolean
  prompt: RenderedPrompt
}): StepInputs {
  return {
    model: opts.model,
    prompt_digest: promptDigest(opts.prompt),
    reading_list: reviewReadingList(
      opts.repoRoot,
      opts.persona,
      opts.roleDoc,
      opts.withPersona
    ),
    artifacts: [
      digestGuideFile(opts.guideDir, 'research.md'),
      digestGuideFile(opts.guideDir, 'meta.yaml'),
      digestGuideFile(opts.guideDir, 'external.md'),
      digestGuideFile(opts.guideDir, 'speakeasy.md'),
    ],
    params: {
      provider: opts.provider,
      notes: opts.notes,
      persona: opts.persona,
      dimension: opts.dimension,
    },
  }
}
