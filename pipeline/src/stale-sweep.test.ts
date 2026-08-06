import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectDrift, detectGuideDrift, groupByCause, guideSlugs } from './stale-sweep.ts'
import { marker, ticketBody, ticketTitle } from './stale-sweep-cli.ts'
import {
  digestGuideFile,
  digestRepoFile,
  promptDigest,
  type PipelineLock,
} from './lock.ts'
import { DIMENSIONS, createPrompts } from './prompts.ts'

const MODEL = 'openrouter/openai/gpt-5.6-sol'

/** Doctrine files every reading list references, plus the two role docs used. */
const DOCTRINE = [
  'doctrine/glossary.md',
  'doctrine/shared.md',
  'doctrine/speakeasy-setup.md',
  'doctrine/roles/technical-research.md',
  'doctrine/roles/writer.md',
  'doctrine/roles/fidelity.md',
  'doctrine/roles/review.md',
  'doctrine/personas/it-admin.md',
]

const GUIDE_FILES = ['research.md', 'meta.yaml', 'external.md', 'speakeasy.md']

/**
 * A repo whose single guide is exactly in sync with its lock, so any drift a
 * test reports is the drift that test introduced.
 */
function makeRepo(slug = 'acme'): string {
  const root = mkdtempSync(join(tmpdir(), 'stale-sweep-'))
  for (const rel of DOCTRINE) {
    mkdirSync(join(root, rel, '..'), { recursive: true })
    writeFileSync(join(root, rel), `# ${rel}\nbaseline\n`)
  }
  const dir = join(root, 'guides', slug)
  mkdirSync(dir, { recursive: true })
  for (const name of GUIDE_FILES) {
    writeFileSync(join(dir, name), `# ${name}\nbaseline\n`)
  }
  writeFileSync(join(dir, 'pipeline.lock.json'), JSON.stringify(lockFor(root, slug), null, 2))
  return root
}

/** A lock matching the repo makeRepo just wrote. */
function lockFor(root: string, slug: string): PipelineLock {
  const dir = join(root, 'guides', slug)
  const prompts = createPrompts({
    repoRoot: root,
    timestamp: '<test>',
    persona: 'it-admin',
    maxRounds: 3,
  })
  const guide = { slug, provider: slug }
  const read = (p: string) => digestRepoFile(root, p)
  const file = (n: string) => digestGuideFile(dir, n)
  const base = { model: MODEL, params: { provider: slug, notes: '' } }
  const at = '2026-08-01T00:00:00Z'

  const steps: PipelineLock['steps'] = {
    research: {
      input_digest: 'unused-by-sweep',
      inputs: {
        ...base,
        prompt_digest: promptDigest(prompts.researchLockPrompt(guide)),
        reading_list: [
          'doctrine/glossary.md',
          'doctrine/shared.md',
          'doctrine/roles/technical-research.md',
          'doctrine/speakeasy-setup.md',
        ].map(read),
        artifacts: [],
      },
      outputs: [file('research.md'), file('meta.yaml')],
      completed_at: at,
    },
    draft: {
      input_digest: 'unused-by-sweep',
      inputs: {
        ...base,
        params: { ...base.params, persona: 'it-admin' },
        prompt_digest: promptDigest(prompts.draftLockPrompt(guide)),
        reading_list: [
          'doctrine/glossary.md',
          'doctrine/shared.md',
          'doctrine/roles/writer.md',
          'doctrine/personas/it-admin.md',
        ].map(read),
        artifacts: [file('research.md'), file('meta.yaml')],
      },
      outputs: [file('external.md'), file('speakeasy.md')],
      completed_at: at,
    },
  }
  for (const dim of DIMENSIONS) {
    const docs = ['doctrine/glossary.md', 'doctrine/shared.md', `doctrine/roles/${dim.doc}`]
    if (dim.persona) docs.push('doctrine/personas/it-admin.md')
    steps[`review.${dim.role}`] = {
      input_digest: 'unused-by-sweep',
      inputs: {
        ...base,
        params: { ...base.params, persona: 'it-admin', dimension: dim.role },
        prompt_digest: promptDigest(prompts.reviewLockPrompt(guide, dim)),
        reading_list: docs.map(read),
        artifacts: GUIDE_FILES.map(file),
      },
      outputs: [file('external.md'), file('speakeasy.md')],
      completed_at: at,
    }
  }

  return {
    schema_version: 1,
    slug,
    persona: 'it-admin',
    runtime: 'pi',
    updated_at: at,
    steps,
  }
}

function drift(root: string, slug = 'acme') {
  return detectGuideDrift(root, slug, { modelToday: MODEL })
}

function keys(root: string, slug = 'acme'): string[] {
  return drift(root, slug).reasons.map((r) => r.key)
}

describe('detectGuideDrift', () => {
  it('reports nothing when the guide matches its lock', () => {
    const root = makeRepo()
    try {
      assert.deepEqual(keys(root), [])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reports a doctrine edit and names every step it invalidates', () => {
    const root = makeRepo()
    try {
      writeFileSync(join(root, 'doctrine/personas/it-admin.md'), 'edited\n')
      const found = drift(root).reasons.find((r) => r.key.endsWith('it-admin.md'))
      assert.ok(found, 'expected a reason for the persona edit')
      // The persona is on the draft and achievability reading lists, not fidelity.
      assert.deepEqual([...found.steps].sort(), ['draft', 'review.achievability'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('folds one changed guide file into a single reason', () => {
    const root = makeRepo()
    try {
      writeFileSync(join(root, 'guides/acme/external.md'), '# changed\n')
      const fileKeys = keys(root).filter((k) => k === 'file:external.md')
      assert.equal(fileKeys.length, 1, 'artifact and output roles must not double-report')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reports a model change', () => {
    const root = makeRepo()
    try {
      const found = detectGuideDrift(root, 'acme', { modelToday: 'openrouter/other' })
      assert.ok(found.reasons.some((r) => r.key.startsWith('model:')))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reports a retired runtime', () => {
    const root = makeRepo()
    try {
      const path = join(root, 'guides/acme/pipeline.lock.json')
      const lock = JSON.parse(readFileSync(path, 'utf8'))
      lock.runtime = 'cursor-sdk'
      writeFileSync(path, JSON.stringify(lock))
      assert.ok(keys(root).includes('runtime'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reports a missing lockfile without crashing on the absent steps', () => {
    const root = makeRepo()
    try {
      rmSync(join(root, 'guides/acme/pipeline.lock.json'))
      const found = drift(root)
      assert.deepEqual(keys(root), ['no-lock'])
      assert.equal(found.lockedAt, null)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reports absent guide files', () => {
    const root = makeRepo()
    try {
      rmSync(join(root, 'guides/acme/external.md'))
      assert.ok(keys(root).includes('missing'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('detectDrift ordering', () => {
  it('puts a never-locked guide ahead of every locked guide', () => {
    const root = makeRepo('alpha')
    try {
      // A second guide with no lock at all, alphabetically last.
      const zulu = join(root, 'guides', 'zulu')
      mkdirSync(zulu, { recursive: true })
      for (const name of GUIDE_FILES) writeFileSync(join(zulu, name), 'x\n')
      writeFileSync(join(root, 'doctrine/shared.md'), 'edited\n')

      const order = detectDrift(root, { modelToday: MODEL }).map((d) => d.slug)
      assert.deepEqual(order, ['zulu', 'alpha'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('omits guides that are in sync', () => {
    const root = makeRepo()
    try {
      assert.deepEqual(detectDrift(root, { modelToday: MODEL }), [])
      assert.deepEqual(guideSlugs(root), ['acme'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('groupByCause', () => {
  it('lists the guides sharing each cause, commonest first', () => {
    const grouped = groupByCause([
      { slug: 'a', lockedAt: null, runtime: null, reasons: [{ key: 'k1', text: 'shared', steps: [] }] },
      { slug: 'b', lockedAt: null, runtime: null, reasons: [{ key: 'k1', text: 'shared', steps: [] }] },
      { slug: 'c', lockedAt: null, runtime: null, reasons: [{ key: 'k2', text: 'lone', steps: [] }] },
    ])
    assert.deepEqual([...grouped.keys()], ['shared', 'lone'])
    assert.deepEqual(grouped.get('shared'), ['a', 'b'])
  })
})

describe('ticket formatting', () => {
  it('carries the slug so distill resolves it, and never applies guide:draft', () => {
    const root = makeRepo()
    try {
      writeFileSync(join(root, 'doctrine/shared.md'), 'edited\n')
      const body = ticketBody(drift(root))
      assert.match(body, /\*\*slug:\*\* `acme`/)
      assert.ok(body.includes(marker('acme')))
      assert.equal(ticketTitle('acme'), 'Refresh guide: acme')
      // The body may tell a human to add the label; it must not claim to do it.
      assert.match(body, /does not start a run on its own/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('round-trips the marker so a retitled ticket is still matched', () => {
    const body = ticketBody({
      slug: 'my-guide',
      lockedAt: null,
      runtime: null,
      reasons: [{ key: 'no-lock', text: 'never converged', steps: [] }],
    })
    const found = /<!-- stale-sweep:([a-z0-9-]+) -->/.exec(body)
    assert.equal(found?.[1], 'my-guide')
  })
})
