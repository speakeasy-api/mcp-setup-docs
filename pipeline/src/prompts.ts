/**
 * The three prompts whose rendered text defines a lock entry's `prompt_digest`
 * — research, draft, review — and the spans of them that must not.
 *
 * They live apart from `workflow.ts` for one reason: `prompt_digest` is only
 * honest if it is taken from the prompt the agent actually receives, and that
 * is only checkable if a test can render one. The remediation, judge, and
 * revision prompts stay in `workflow.ts`; nothing hashes them.
 *
 * Normative semantics: PATHS.pipelineLockDoc
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { missingDraftOutputs, type RenderedPrompt, type ReviewDimension } from './lock.ts'
import { mergeCatalogNotes } from './pulse-catalog.ts'
import { PATHS, abs, personaFile, roleDoc } from './paths.ts'

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

export type Dimension = {
  role: ReviewDimension
  doc: string
  persona: boolean
}

/** Review gates only — voice/formatting/concision are Writer self-check. */
export const DIMENSIONS: Dimension[] = [
  { role: 'fidelity', doc: 'fidelity.md', persona: false },
  { role: 'achievability', doc: 'review.md', persona: true },
]

export function readingList(
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

export type PromptContext = {
  repoRoot: string
  /** The run's provenance stamp — the field the lock must never see. */
  timestamp: string
  persona: string
  maxRounds: number
}

export function createPrompts(ctx: PromptContext) {
  const ROOT = ctx.repoRoot
  const NOW = ctx.timestamp
  const PERSONA = ctx.persona
  const PERSONA_FILE = abs(ROOT, personaFile(PERSONA))
  const MAX_ROUNDS = ctx.maxRounds

  function guideDir(slug: string): string {
    return join(ROOT, 'guides', slug)
  }

  function promptNotesOf(g: GuideInput): string {
    // Agent assignment: operator notes + full catalog instructions.
    if (g.catalogPromptNote) {
      return mergeCatalogNotes(g.notes, g.catalogPromptNote)
    }
    return g.notes || ''
  }

  function assign(g: GuideInput): string {
    return [
      'Assignment:',
      '- slug: ' + g.slug,
      '- provider: ' + g.provider,
      '- guide directory: ' + guideDir(g.slug) + '/',
      '- persona: ' + PERSONA + ' (' + PERSONA_FILE + ')',
      '- observed_at timestamp for provenance recorded this run: ' + NOW,
      '- operator notes: ' + (promptNotesOf(g) || '(none)'),
    ].join('\n')
  }

  /** Shared so the hashed rendering cannot drift from the sent one. */
  function roundLine(round: number): string {
    return 'This is review round ' + round + ' of at most ' + MAX_ROUNDS + '.'
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
      'Write research.md and meta.yaml in the guide directory before you',
      'report. status "ok" is invalid unless both files exist on disk.',
      'Do not write external.md or speakeasy.md and do not touch any path',
      'outside the guide directory.',
      '',
      'Report via structured output per your role doc: status ("ok" when the',
      'Dossier is on disk and complete enough to draft from, "blocked" per',
      'the role doc), notes (decisions, uncertainty, validation method),',
      'open_questions.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  function draftPrompt(g: GuideInput): string {
    const dir = guideDir(g.slug)
    const existing = missingDraftOutputs(dir).length === 0
    const writeLines = existing
      ? [
          "Read the guide directory's research.md and meta.yaml, then revise",
          "existing external.md and speakeasy.md in place in the persona's",
          'voice before you report. Change only what the Dossier or operator',
          'notes require; do not rephrase, reorder, or re-title steps whose',
          'facts are unchanged. Silent restyling is a defect. Dossier facts',
          'and doctrine outrank preservation of stale prose. status "ok" is',
          'invalid unless both files exist on disk. The Dossier is your fact',
          'ceiling. Do not touch any other path.',
        ]
      : [
          "Read the guide directory's research.md and meta.yaml, then write",
          'external.md (provider-side) and speakeasy.md (Control Plane) in the',
          "persona's voice before you report. status \"ok\" is invalid unless",
          'both files exist on disk. The Dossier is your fact ceiling.',
          'Do not touch any other path.',
        ]
    return [
      'You are the Writer Agent in the mcp-setup-docs drafting pipeline.',
      'Repo root: ' + ROOT,
      '',
      'Read first, in order, then follow your role doc exactly:',
      readingList(ROOT, PERSONA_FILE, ['writer.md'], true),
      '',
      assign(g),
      '',
      ...writeLines,
      '',
      'Report via structured output: status ("ok" when both setup files are',
      'on disk and complete enough to review, "blocked" per your role doc),',
      'notes, open_questions (Dossier gaps you could not render around).',
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
      roundLine(round),
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

  /**
   * The round a review prompt is rendered at when it is hashed rather than
   * sent. Any value works — the line is stripped — but it must be fixed.
   */
  const LOCK_ROUND = 1

  /**
   * Spans of a rendered prompt that `prompt_digest` must ignore: everything the
   * lock already records in `params` / `reading_list`, plus per-run context.
   *
   * - `assign(g)` carries slug, provider, guide directory, persona, operator
   *   notes (catalog note merged in) and `NOW`. Taking the block whole is why
   *   notes containing newlines cost nothing here.
   * - `PERSONA_FILE` appears a second time in the reading list, but only when
   *   the prompt was built with `withPersona`, so `persona` below must match
   *   the flag its builder passed to `readingList`. `stripVolatile` throws when
   *   it does not.
   * - `ROOT` normalizes the reading list's absolute paths; digests have to be
   *   portable across machines.
   * - The round line carries `MAX_ROUNDS`, so `--max-rounds` would otherwise
   *   bust every guide's review entries.
   *
   * Ordered outer-first: the assignment block contains `PERSONA_FILE`, which
   * contains `ROOT`.
   */
  function volatileSpans(
    g: GuideInput,
    opts: { persona: boolean; round?: number }
  ): string[] {
    const spans = [assign(g)]
    if (opts.round !== undefined) spans.push(roundLine(opts.round))
    if (opts.persona) spans.push(PERSONA_FILE)
    spans.push(ROOT)
    return spans
  }

  function researchLockPrompt(g: GuideInput): RenderedPrompt {
    return {
      text: researchPrompt(g),
      volatile: volatileSpans(g, { persona: false }),
    }
  }

  function draftLockPrompt(g: GuideInput): RenderedPrompt {
    return {
      text: draftPrompt(g),
      volatile: volatileSpans(g, { persona: true }),
    }
  }

  function reviewLockPrompt(g: GuideInput, dim: Dimension): RenderedPrompt {
    // `prior` is per-round runtime context, never a lock input, so the hashed
    // rendering is always the round-1 one that has none.
    return {
      text: reviewerPrompt(g, dim, LOCK_ROUND, null),
      volatile: volatileSpans(g, { persona: dim.persona, round: LOCK_ROUND }),
    }
  }

  return {
    guideDir,
    promptNotesOf,
    assign,
    readingList: (roleDocs: string[], withPersona: boolean) =>
      readingList(ROOT, PERSONA_FILE, roleDocs, withPersona),
    researchPrompt,
    draftPrompt,
    reviewerPrompt,
    researchLockPrompt,
    draftLockPrompt,
    reviewLockPrompt,
  }
}
