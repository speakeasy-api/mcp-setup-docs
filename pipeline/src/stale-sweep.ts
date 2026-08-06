/**
 * Offline staleness detection: which committed guides would re-run work?
 *
 * Answers one question per guide — if the factory drafted it today, would any
 * lock entry go cold? Every input a lock entry records is re-derived from disk
 * and compared to the recorded value. No network call, no model call.
 *
 * One input is deliberately not checked: `inputs.params`. Notes carry operator
 * text from the issue and a PulseMCP catalog token resolved at run time, so
 * they cannot be reproduced offline. A sweep that guessed at them would report
 * drift on every guide on every run. Params drift still busts the lock during
 * a real run; this sweep just does not claim to predict it.
 *
 * Normative lock semantics: PATHS.pipelineLockDoc
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  DRAFT_OUTPUT_FILES,
  RESEARCH_OUTPUT_FILES,
  digestGuideFile,
  digestRepoFile,
  missingGuideFiles,
  promptDigest,
  readLock,
  stableDigestFile,
  type StepId,
} from './lock.ts'
import { DIMENSIONS, createPrompts } from './prompts.ts'
import { PATHS, abs } from './paths.ts'

/** Guide files a sweep expects to find committed. */
const EXPECTED_FILES = [...RESEARCH_OUTPUT_FILES, ...DRAFT_OUTPUT_FILES]

/**
 * One cause of drift, with every step it invalidates.
 *
 * Deduped by `key` because a single doctrine edit reaches several steps — an
 * edit to writer.md busts draft and review.achievability alike. Reporting it
 * once with both steps keeps a ticket readable; the naive per-step list runs
 * to 28 lines for a guide with one real problem.
 */
export type Reason = {
  key: string
  text: string
  steps: StepId[]
}

export type GuideDrift = {
  slug: string
  /** Lock `updated_at`, or null when the guide has no lockfile. */
  lockedAt: string | null
  runtime: string | null
  reasons: Reason[]
}

export type DetectOptions = {
  /** Model id the next run would use, already `openrouter/`-prefixed. */
  modelToday: string
  /** Round count the prompts render at. Stripped from the digest; any value. */
  maxRounds?: number
}

/** Guide slugs with a directory under `guides/`, sorted. */
export function guideSlugs(repoRoot: string): string[] {
  const dir = abs(repoRoot, PATHS.guidesDir)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

/** Collects reasons, merging steps into one entry per distinct cause. */
class ReasonSet {
  private readonly byKey = new Map<string, Reason>()

  add(key: string, text: string, step?: StepId): void {
    const existing = this.byKey.get(key)
    if (!existing) {
      this.byKey.set(key, { key, text, steps: step ? [step] : [] })
      return
    }
    if (step && !existing.steps.includes(step)) existing.steps.push(step)
  }

  list(): Reason[] {
    return [...this.byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
  }
}

/**
 * Prompt digests the three hashed prompts render to today.
 *
 * Every guide-specific span — the assignment block, the persona path, the repo
 * root, the round line — is volatile, so the result depends only on the prompt
 * templates and on which artifacts already exist on disk.
 */
function promptDigestsToday(
  repoRoot: string,
  slug: string,
  persona: string,
  maxRounds: number
): Partial<Record<StepId, string>> {
  const prompts = createPrompts({
    repoRoot,
    timestamp: '<sweep>',
    persona,
    maxRounds,
  })
  const guide = { slug, provider: slug }
  const out: Partial<Record<StepId, string>> = {
    research: promptDigest(prompts.researchLockPrompt(guide)),
    draft: promptDigest(prompts.draftLockPrompt(guide)),
  }
  for (const dim of DIMENSIONS) {
    out[`review.${dim.role}`] = promptDigest(
      prompts.reviewLockPrompt(guide, dim)
    )
  }
  return out
}

/** Drift for one guide. */
export function detectGuideDrift(
  repoRoot: string,
  slug: string,
  opts: DetectOptions
): GuideDrift {
  const dir = join(abs(repoRoot, PATHS.guidesDir), slug)
  const missing = missingGuideFiles(dir, EXPECTED_FILES)
  const lock = readLock(dir)

  if (!lock) {
    const reasons = new ReasonSet()
    reasons.add('no-lock', 'No pipeline.lock.json — the guide has never converged.')
    if (missing.length > 0) {
      reasons.add('missing', `Guide files absent: ${missing.join(', ')}.`)
    }
    return { slug, lockedAt: null, runtime: null, reasons: reasons.list() }
  }

  const reasons = new ReasonSet()
  if (missing.length > 0) {
    reasons.add('missing', `Guide files absent: ${missing.join(', ')}.`)
  }
  if (lock.runtime && lock.runtime !== 'pi') {
    reasons.add(
      'runtime',
      `Locked under the retired \`${lock.runtime}\` runtime, not \`pi\`.`
    )
  }

  const digests = promptDigestsToday(
    repoRoot,
    slug,
    lock.persona || 'it-admin',
    opts.maxRounds ?? 3
  )

  for (const [rawStep, entry] of Object.entries(lock.steps)) {
    if (!entry) continue
    const step = rawStep as StepId

    if (entry.inputs.model !== opts.modelToday) {
      reasons.add(
        `model:${entry.inputs.model}`,
        `Locked against model \`${entry.inputs.model}\`; the next run uses \`${opts.modelToday}\`.`,
        step
      )
    }

    const today = digests[step]
    if (today && entry.inputs.prompt_digest !== today) {
      // One key for every template. Editing prompts.ts usually moves several at
      // once, and `steps` already says which. Four near-identical bullets in a
      // ticket read as four problems when they are one edit.
      reasons.add('prompt', 'The prompt templates changed.', step)
    }

    for (const read of entry.inputs.reading_list) {
      if (digestRepoFile(repoRoot, read.path).digest !== read.digest) {
        reasons.add(`doctrine:${read.path}`, `\`${read.path}\` changed.`, step)
      }
    }

    // Artifacts and outputs are the same files seen from two sides — a step
    // consumes what an earlier step wrote. One changed file must not surface as
    // two findings, so both fold into one key per path.
    const guideFiles = [...entry.inputs.artifacts, ...entry.outputs]
    for (const file of guideFiles) {
      if (digestOrNull(dir, file.path) !== file.digest) {
        reasons.add(
          `file:${file.path}`,
          `\`${file.path}\` changed since this lock was written.`,
          step
        )
      }
    }
  }

  return {
    slug,
    lockedAt: lock.updated_at ?? null,
    runtime: lock.runtime ?? null,
    reasons: reasons.list(),
  }
}

/** Stable digest of a guide file, or null when it is absent or unreadable. */
function digestOrNull(guideDir: string, guideRel: string): string | null {
  const path = join(guideDir, guideRel)
  try {
    if (!statSync(path).isFile()) return null
    return stableDigestFile(path, guideRel)
  } catch {
    return null
  }
}

/**
 * Stale guides, most overdue first.
 *
 * A guide with no lock sorts ahead of every locked guide: it never converged,
 * so it is the oldest debt in the corpus. Locked guides follow by `updated_at`
 * ascending, so a capped sweep always drains the longest-neglected first and a
 * guide can never be starved by a newer one.
 */
export function detectDrift(
  repoRoot: string,
  opts: DetectOptions
): GuideDrift[] {
  return guideSlugs(repoRoot)
    .map((slug) => detectGuideDrift(repoRoot, slug, opts))
    .filter((d) => d.reasons.length > 0)
    .sort((a, b) => {
      if (a.lockedAt === b.lockedAt) return a.slug.localeCompare(b.slug)
      if (a.lockedAt === null) return -1
      if (b.lockedAt === null) return 1
      return a.lockedAt.localeCompare(b.lockedAt)
    })
}

/** Guides that carry a cause, keyed by reason. Used for the sweep summary. */
export function groupByCause(drifts: GuideDrift[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const drift of drifts) {
    for (const reason of drift.reasons) {
      const slugs = out.get(reason.text) ?? []
      slugs.push(drift.slug)
      out.set(reason.text, slugs)
    }
  }
  return new Map(
    [...out.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  )
}
