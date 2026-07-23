#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRuntime } from './runtime.ts'
import { runWorkflow, type GuideInput } from './workflow.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

function usage(): never {
  console.error(`Usage:
  npm run draft-guide -- <provider|slug> [<provider|slug> ...] [options]

Options:
  --persona <id>     Persona under docs/personas/ (default: it-admin)
  --notes <text>     Extra context handed to every guide's agents
  --max-rounds <n>   Review/revise rounds before giving up (default: 3)
  --force            Overwrite existing guides/<slug>/ without prompting
  --repo-root <path> Repo root (default: two levels above this package)
  --model <id>       Default Cursor model id (default: claude-fable-5)
  --light-model <id> Model for "sonnet" slots (default: composer-2.5)

Env:
  CURSOR_API_KEY     Required (user or team service-account key)
  CURSOR_MODEL       Fallback for --model
  CURSOR_MODEL_LIGHT Fallback for --light-model

Examples:
  npm run draft-guide -- box
  npm run draft-guide -- box hubspot --persona it-admin
  npm run draft-guide -- "Google BigQuery" --notes "prefer ADC docs"
`)
  process.exit(64)
}

function toSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseArgs(argv: string[]) {
  const positionals: string[] = []
  let persona = 'it-admin'
  let notes: string | undefined
  let maxRounds = 3
  let force = false
  let repoRoot: string | undefined
  // Research / fidelity / revision default to Fable; formatting, concision,
  // and polish use the cheaper Composer slot (workflow model: 'sonnet').
  let model = process.env.CURSOR_MODEL || 'claude-fable-5'
  let lightModel = process.env.CURSOR_MODEL_LIGHT || 'composer-2.5'

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--help' || a === '-h') usage()
    if (a === '--force') {
      force = true
      continue
    }
    if (a === '--persona') {
      persona = argv[++i] || usage()
      continue
    }
    if (a === '--notes') {
      notes = argv[++i] || usage()
      continue
    }
    if (a === '--max-rounds') {
      maxRounds = Number(argv[++i])
      if (!Number.isFinite(maxRounds) || maxRounds < 1) usage()
      continue
    }
    if (a === '--repo-root') {
      repoRoot = resolve(argv[++i] || usage())
      continue
    }
    if (a === '--model') {
      model = argv[++i] || usage()
      continue
    }
    if (a === '--light-model') {
      lightModel = argv[++i] || usage()
      continue
    }
    if (a.startsWith('-')) {
      console.error('Unknown flag: ' + a)
      usage()
    }
    positionals.push(a)
  }

  if (positionals.length === 0) usage()
  return { positionals, persona, notes, maxRounds, force, repoRoot, model, lightModel }
}

function defaultRepoRoot(): string {
  // scripts/cursor-sdk/src → repo root is ../../..
  return resolve(__dirname, '../../..')
}

function listPersonas(root: string): string[] {
  const dir = join(root, 'docs/personas')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

function guideHasContent(root: string, slug: string): boolean {
  const dir = join(root, 'guides', slug)
  if (!existsSync(dir)) return false
  return ['research.md', 'meta.yaml', 'setup.md'].some((f) =>
    existsSync(join(dir, f))
  )
}

async function confirmOverwrite(slug: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error(
      `guides/${slug}/ already has content; pass --force to overwrite in non-interactive mode`
    )
    return false
  }
  process.stderr.write(
    `guides/${slug}/ already exists. Overwrite research.md, meta.yaml, setup.md? [y/N] `
  )
  const buf = Buffer.alloc(16)
  const n = await new Promise<number>((resolve) => {
    process.stdin.once('data', (d) => resolve((d as Buffer).copy(buf)))
  })
  const answer = buf.slice(0, n).toString('utf8').trim().toLowerCase()
  return answer === 'y' || answer === 'yes'
}

function writeRunRecord(
  root: string,
  startedAt: string,
  finishedAt: string,
  provider: string,
  persona: string,
  result: Record<string, unknown>
) {
  const slug = String(result.slug)
  const dir = join(root, 'retro/runs')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${startedAt}-${slug}.json`)
  const body = {
    slug,
    provider,
    persona,
    timestamp: startedAt,
    started_at: startedAt,
    finished_at: finishedAt,
    runtime: 'cursor-sdk',
    ...result,
  }
  writeFileSync(path, JSON.stringify(body, null, 2) + '\n')
  return path
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const apiKey = process.env.CURSOR_API_KEY?.trim()
  if (!apiKey) {
    console.error('CURSOR_API_KEY is required')
    process.exit(1)
  }

  const repoRoot = args.repoRoot || defaultRepoRoot()
  const personas = listPersonas(repoRoot)
  if (!personas.includes(args.persona)) {
    console.error(
      `Unknown persona "${args.persona}". Available: ${personas.join(', ') || '(none)'}`
    )
    process.exit(1)
  }

  const guides: GuideInput[] = []
  for (const raw of args.positionals) {
    const slug = toSlug(raw)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      console.error(`Could not derive a kebab-case slug from "${raw}"`)
      process.exit(1)
    }
    if (!args.force && guideHasContent(repoRoot, slug)) {
      const ok = await confirmOverwrite(slug)
      if (!ok) process.exit(1)
    }
    guides.push({
      slug,
      provider: raw,
      notes: args.notes,
    })
  }

  const startedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const rt = createRuntime({
    apiKey,
    repoRoot,
    defaultModel: args.model,
    lightModel: args.lightModel,
  })

  console.error(
    `draft-guide (cursor-sdk): persona=${args.persona} guides=${guides
      .map((g) => g.slug)
      .join(',')} model=${args.model}`
  )

  const out = await runWorkflow(rt, {
    guides,
    persona: args.persona,
    timestamp: startedAt,
    repoRoot,
    maxRounds: args.maxRounds,
  })

  const finishedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  for (const result of out.results) {
    const g = guides.find((x) => x.slug === result.slug)
    const path = writeRunRecord(
      repoRoot,
      startedAt,
      finishedAt,
      g?.provider || result.slug,
      out.persona,
      result as unknown as Record<string, unknown>
    )
    console.error(`run record: ${path}`)
    console.log(JSON.stringify(result, null, 2))
  }

  const failed = out.results.some(
    (r) => r.status === 'failed' || r.status === 'blocked' || r.status === 'unconverged'
  )
  process.exit(failed ? 2 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
