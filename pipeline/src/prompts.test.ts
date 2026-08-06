import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildDraftInputs,
  buildResearchInputs,
  buildReviewInputs,
  inputDigest,
  promptDigest,
  stripVolatile,
} from './lock.ts'
import { DIMENSIONS, createPrompts, type GuideInput } from './prompts.ts'

const GUIDE: GuideInput = {
  slug: 'snowflake',
  provider: 'Snowflake',
  notes: 'Decision 1: use the remote.\nDecision 2: it-admin persona.',
  catalogPromptNote: 'Catalog: present as "snowflake" (matched 2026-07-31).',
  lockNotes: 'catalog:present:snowflake',
}

const FIDELITY = DIMENSIONS.find((d) => d.role === 'fidelity')!
const ACHIEVABILITY = DIMENSIONS.find((d) => d.role === 'achievability')!

/** A repo root with just enough doctrine and guide files to digest. */
function tempRepo(): { root: string; guideDir: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'prompts-'))
  mkdirSync(join(root, 'doctrine', 'roles'), { recursive: true })
  mkdirSync(join(root, 'doctrine', 'personas'), { recursive: true })
  for (const rel of [
    'doctrine/glossary.md',
    'doctrine/shared.md',
    'doctrine/speakeasy-setup.md',
    'doctrine/roles/technical-research.md',
    'doctrine/roles/writer.md',
    'doctrine/roles/fidelity.md',
    'doctrine/roles/review.md',
    'doctrine/personas/it-admin.md',
  ]) {
    writeFileSync(join(root, rel), '# stub\n')
  }
  const guideDir = join(root, 'guides', GUIDE.slug)
  mkdirSync(guideDir, { recursive: true })
  writeFileSync(join(guideDir, 'research.md'), '# dossier\n')
  writeFileSync(join(guideDir, 'meta.yaml'), 'provider: Snowflake\n')
  writeFileSync(join(guideDir, 'external.md'), '# External\n')
  writeFileSync(join(guideDir, 'speakeasy.md'), '# Speakeasy\n')
  return {
    root,
    guideDir,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

function prompts(root: string, over?: { timestamp?: string; maxRounds?: number }) {
  return createPrompts({
    repoRoot: root,
    timestamp: over?.timestamp ?? '2026-07-31T12:00:00Z',
    persona: 'it-admin',
    maxRounds: over?.maxRounds ?? 3,
  })
}

describe('stripVolatile', () => {
  it('replaces each span with its own positional placeholder', () => {
    assert.equal(
      stripVolatile('a B c B d C', ['B', 'C']),
      'a <VOLATILE:0> c <VOLATILE:0> d <VOLATILE:1>'
    )
  })

  it('throws when a span is absent rather than leaving it unstripped', () => {
    // The failure this guards: a span that quietly stops matching leaves the
    // run timestamp inside prompt_digest, and every run busts every lock.
    assert.throws(
      () => stripVolatile('hello world', ['nope']),
      /volatile span 0 is not in the rendered prompt/
    )
  })

  it('throws on an empty span, which would match everywhere', () => {
    assert.throws(() => stripVolatile('hello', ['']), /would match everywhere/)
  })
})

describe('prompt_digest excludes per-run context', () => {
  it('is identical for two runs differing only in NOW', () => {
    const { root, cleanup } = tempRepo()
    try {
      const a = prompts(root, { timestamp: '2026-07-31T12:00:00Z' })
      const b = prompts(root, { timestamp: '2027-01-01T00:00:00Z' })

      assert.notEqual(a.assign(GUIDE), b.assign(GUIDE), 'fixture sanity')
      assert.equal(
        promptDigest(a.researchLockPrompt(GUIDE)),
        promptDigest(b.researchLockPrompt(GUIDE))
      )
      assert.equal(
        promptDigest(a.draftLockPrompt(GUIDE)),
        promptDigest(b.draftLockPrompt(GUIDE))
      )
      for (const dim of DIMENSIONS) {
        assert.equal(
          promptDigest(a.reviewLockPrompt(GUIDE, dim)),
          promptDigest(b.reviewLockPrompt(GUIDE, dim)),
          dim.role
        )
      }
    } finally {
      cleanup()
    }
  })

  it('leaves input_digest identical for two runs differing only in NOW', () => {
    const { root, guideDir, cleanup } = tempRepo()
    try {
      const a = prompts(root, { timestamp: '2026-07-31T12:00:00Z' })
      const b = prompts(root, { timestamp: '2027-01-01T00:00:00Z' })
      const common = {
        model: 'test-model',
        repoRoot: root,
        provider: GUIDE.provider,
        notes: GUIDE.lockNotes!,
      }

      assert.equal(
        inputDigest(
          buildResearchInputs({ ...common, prompt: a.researchLockPrompt(GUIDE) })
        ),
        inputDigest(
          buildResearchInputs({ ...common, prompt: b.researchLockPrompt(GUIDE) })
        )
      )

      const draft = { ...common, guideDir, persona: 'it-admin' }
      assert.equal(
        inputDigest(
          buildDraftInputs({ ...draft, prompt: a.draftLockPrompt(GUIDE) })
        ),
        inputDigest(
          buildDraftInputs({ ...draft, prompt: b.draftLockPrompt(GUIDE) })
        )
      )

      const review = {
        ...draft,
        dimension: ACHIEVABILITY.role,
        roleDoc: ACHIEVABILITY.doc,
        withPersona: ACHIEVABILITY.persona,
      }
      assert.equal(
        inputDigest(
          buildReviewInputs({
            ...review,
            prompt: a.reviewLockPrompt(GUIDE, ACHIEVABILITY),
          })
        ),
        inputDigest(
          buildReviewInputs({
            ...review,
            prompt: b.reviewLockPrompt(GUIDE, ACHIEVABILITY),
          })
        )
      )
    } finally {
      cleanup()
    }
  })

  it('is identical across repo roots, so locks stay portable', () => {
    const one = tempRepo()
    const two = tempRepo()
    try {
      assert.notEqual(one.root, two.root, 'fixture sanity')
      assert.equal(
        promptDigest(prompts(one.root).draftLockPrompt(GUIDE)),
        promptDigest(prompts(two.root).draftLockPrompt(GUIDE))
      )
    } finally {
      one.cleanup()
      two.cleanup()
    }
  })

  it('ignores the review round line, so --max-rounds does not bust locks', () => {
    const { root, cleanup } = tempRepo()
    try {
      assert.equal(
        promptDigest(prompts(root, { maxRounds: 3 }).reviewLockPrompt(GUIDE, FIDELITY)),
        promptDigest(prompts(root, { maxRounds: 9 }).reviewLockPrompt(GUIDE, FIDELITY))
      )
    } finally {
      cleanup()
    }
  })

  it('strips the assignment whole — timestamp, slug, notes and paths all go', () => {
    const { root, cleanup } = tempRepo()
    try {
      const P = prompts(root, { timestamp: '2026-07-31T12:00:00Z' })
      const p = P.draftLockPrompt(GUIDE)
      const stripped = stripVolatile(p.text, p.volatile)

      for (const leak of [
        '2026-07-31T12:00:00Z',
        root,
        'snowflake',
        'Snowflake',
        'Decision 1',
        'it-admin',
      ]) {
        assert.equal(stripped.includes(leak), false, `leaked: ${leak}`)
      }
      // …but the instruction body, which is the whole point, survives.
      assert.match(stripped, /You are the Writer Agent/)
      assert.match(stripped, /Silent restyling is a defect/)
    } finally {
      cleanup()
    }
  })
})

describe('prompt_digest tracks the prompt body', () => {
  it('changes when the rendered prompt changes', () => {
    // The regression that motivated the scheme: prompt_digest used to hash a
    // hand-maintained shadow of each prompt, so editing the real builder left
    // the digest untouched and the pipeline skipped a step it should re-run.
    const { root, cleanup } = tempRepo()
    try {
      const P = prompts(root)
      const base = P.researchLockPrompt(GUIDE)
      const edited = {
        text: base.text + '\nAlso verify the OAuth scopes against the provider.',
        volatile: base.volatile,
      }
      assert.notEqual(promptDigest(base), promptDigest(edited))
    } finally {
      cleanup()
    }
  })

  it('distinguishes the two draft variants', () => {
    const { root, guideDir, cleanup } = tempRepo()
    try {
      const P = prompts(root)
      const revise = promptDigest(P.draftLockPrompt(GUIDE))
      rmSync(join(guideDir, 'external.md'))
      rmSync(join(guideDir, 'speakeasy.md'))
      const write = promptDigest(P.draftLockPrompt(GUIDE))
      assert.notEqual(revise, write)
    } finally {
      cleanup()
    }
  })

  it('distinguishes the review dimensions', () => {
    const { root, cleanup } = tempRepo()
    try {
      const P = prompts(root)
      assert.notEqual(
        promptDigest(P.reviewLockPrompt(GUIDE, FIDELITY)),
        promptDigest(P.reviewLockPrompt(GUIDE, ACHIEVABILITY))
      )
    } finally {
      cleanup()
    }
  })

  it('ignores prior-round context, which is never a lock input', () => {
    const { root, cleanup } = tempRepo()
    try {
      const P = prompts(root)
      const sent = P.reviewerPrompt(GUIDE, FIDELITY, 2, [{ problem: 'x' }])
      assert.match(sent, /Prior round context/)
      // The hashed rendering is round 1 with no prior, so it carries neither.
      const hashed = P.reviewLockPrompt(GUIDE, FIDELITY)
      assert.equal(hashed.text.includes('Prior round context'), false)
    } finally {
      cleanup()
    }
  })
})
