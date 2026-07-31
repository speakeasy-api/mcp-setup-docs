#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPiRuntime, type UsageReport } from './runtime-pi.ts'
import { allowedPrefixesFor } from './pi-guard.ts'
import { runWorkflow } from './workflow.ts'
import { type GuideInput } from './prompts.ts'
import { PATHS, abs, guideDir } from './paths.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Prefer the version pinned in this package over whatever `pi` a machine
 * happens to have on PATH — the two published scopes can coexist there, and
 * their stream formats differ.
 */
function resolvePiBin(): string {
  const pinned = join(__dirname, '..', 'node_modules', '.bin', 'pi')
  return pinned
}

function usage(): never {
  console.error(`Usage:
  npm run draft-guide -- <provider|slug> [<provider|slug> ...] [options]

Options:
  --persona <id>     Persona under doctrine personas dir (default: it-admin)
  --notes <text>     Extra context handed to every guide's agents
  --max-rounds <n>   Review/revise rounds before giving up (default: 3)
  --overwrite, -y    Overwrite existing guides/<slug>/ without prompting;
                     still honors pipeline.lock.json skip checks
  --force            Bypass pipeline.lock.json skips (implies --overwrite)
  --pause-on-scope   After research, pause before draft when material open
                     questions lack Decision N replies in --notes (factory)
  --repo-root <path> Repo root (default: two levels above this package)
  --model <id>       OpenRouter slug (provider/model) for every agent slot
                     (default: openai/gpt-5.6-sol)

Exit codes:
  0  all guides converged
  1  hard failure (exception / missing API key)
  2  unconverged / blocked / failed guide status
  3  awaiting_scope (--pause-on-scope; research written, no draft)

Env:
  OPENROUTER_API_KEY Required
  DRAFT_MODEL        Fallback for --model

Examples:
  npm run draft-guide -- box
  npm run draft-guide -- box --overwrite
  npm run draft-guide -- box hubspot --persona it-admin --force
  npm run draft-guide -- "Google BigQuery" --notes "prefer ADC docs"
  npm run draft-guide -- x --overwrite --pause-on-scope
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
  let overwrite = false
  let force = false
  let pauseOnScope = false
  let repoRoot: string | undefined
  // Every slot runs the same model; `runtime-pi.ts` prepends `openrouter/`.
  let model = process.env.DRAFT_MODEL || 'openai/gpt-5.6-sol'

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--help' || a === '-h') usage()
    if (a === '--overwrite' || a === '-y') {
      overwrite = true
      continue
    }
    if (a === '--force') {
      force = true
      continue
    }
    if (a === '--pause-on-scope') {
      pauseOnScope = true
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
    if (a.startsWith('-')) {
      console.error('Unknown flag: ' + a)
      usage()
    }
    positionals.push(a)
  }

  if (positionals.length === 0) usage()
  return {
    positionals,
    persona,
    notes,
    maxRounds,
    overwrite,
    force,
    pauseOnScope,
    repoRoot,
    model,
  }
}

function defaultRepoRoot(): string {
  // pipeline/src → repo root is ../..
  return resolve(__dirname, '../..')
}

function listPersonas(root: string): string[] {
  const dir = abs(root, PATHS.personasDir)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

function guideHasContent(root: string, slug: string): boolean {
  const dir = abs(root, guideDir(slug))
  if (!existsSync(dir)) return false
  return ['research.md', 'meta.yaml', 'external.md', 'speakeasy.md'].some((f) =>
    existsSync(join(dir, f))
  )
}

async function confirmOverwrite(slug: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error(
      `guides/${slug}/ already has content; pass --overwrite (or --force) in non-interactive mode`
    )
    return false
  }
  process.stderr.write(
    `guides/${slug}/ already exists. Overwrite research.md, meta.yaml, external.md, speakeasy.md? [y/N] `
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
  result: Record<string, unknown>,
  runtime: string,
  usage: UsageReport
) {
  const slug = String(result.slug)
  const dir = abs(root, PATHS.retroRunsDir)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${startedAt}-${slug}.json`)
  const body = {
    slug,
    provider,
    persona,
    timestamp: startedAt,
    started_at: startedAt,
    finished_at: finishedAt,
    runtime,
    ...result,
    // After the spread: what the run cost is the runtime's record, not the
    // workflow's, and must not be shadowed by a result key of the same name.
    usage,
  }
  writeFileSync(path, JSON.stringify(body, null, 2) + '\n')
  return path
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is required')
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
    if (!args.overwrite && !args.force && guideHasContent(repoRoot, slug)) {
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
  const rt = createPiRuntime({
    apiKey,
    repoRoot,
    model: args.model,
    piBin: resolvePiBin(),
    // Every guide in this invocation, so the tripwire does not flag a
    // sibling guide's legitimate output as a breach.
    allowedPrefixes: guides.flatMap((g) => allowedPrefixesFor(g.slug)),
  })

  console.error(
    `draft-guide (pi): persona=${args.persona} guides=${guides
      .map((g) => g.slug)
      .join(',')} model=${args.model}`
  )

  const out = await runWorkflow(rt, {
    guides,
    persona: args.persona,
    timestamp: startedAt,
    repoRoot,
    maxRounds: args.maxRounds,
    force: args.force,
    pauseOnScope: args.pauseOnScope,
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
      result as unknown as Record<string, unknown>,
      'pi',
      // Narrowed to this guide's phases (`"<slug>: <kind>"`), so a multi-guide
      // invocation does not bill every record for the whole run.
      rt.usage(result.slug)
    )
    console.error(`run record: ${path}`)
    console.log(JSON.stringify(result, null, 2))
  }

  const awaitingScope = out.results.some((r) => r.status === 'awaiting_scope')
  if (awaitingScope) {
    process.exit(3)
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
