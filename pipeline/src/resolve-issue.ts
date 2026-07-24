#!/usr/bin/env node
/**
 * Light distill step: freeform GitHub issue title+body → structured guide intent.
 * Uses Agent.prompt with the light model; does not run the draft-guide pipeline.
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent, CursorAgentError } from '@cursor/sdk'
import { z } from 'zod'
import { extractJson } from './json.ts'
import { PATHS, abs } from './paths.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const OkSchema = z.object({
  status: z.literal('ok'),
  slug: z.string().min(1),
  provider: z.string().min(1),
  persona: z.string().optional(),
  notes: z.string().optional(),
})

const ClarificationSchema = z.object({
  status: z.literal('needs_clarification'),
  reason: z.string().min(1),
  candidates: z.array(z.string()).optional(),
})

const ResolvedSchema = z.discriminatedUnion('status', [OkSchema, ClarificationSchema])

export type ResolvedIssue = z.infer<typeof ResolvedSchema>

function usage(): never {
  console.error(`Usage:
  npm run resolve-issue -- [options]

Options:
  --title <text>     Issue title (or ISSUE_TITLE env)
  --body <text>      Issue body (or ISSUE_BODY env)
  --output <path>    Write resolved JSON here (also printed to stdout)
  --repo-root <path> Repo root (default: two levels above this package)
  --light-model <id> Model id (default: CURSOR_MODEL_LIGHT or composer-2.5)

Env:
  CURSOR_API_KEY     Required
  ISSUE_TITLE        Fallback for --title
  ISSUE_BODY         Fallback for --body
  CURSOR_MODEL_LIGHT Fallback for --light-model

Exit codes:
  0  status=ok
  2  status=needs_clarification (or empty/unparseable slug)
  1  hard failure (missing key, agent error, etc.)
`)
  process.exit(64)
}

/** Same rules as cli.ts — defense in depth after the agent returns. */
function toSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function defaultRepoRoot(): string {
  // pipeline/src → repo root
  return resolve(__dirname, '../..')
}

function listGuideSlugs(root: string): string[] {
  const dir = abs(root, PATHS.guidesDir)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

function listPersonas(root: string): string[] {
  const dir = abs(root, PATHS.personasDir)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}

function parseArgs(argv: string[]) {
  let title = process.env.ISSUE_TITLE || ''
  let body = process.env.ISSUE_BODY || ''
  let output: string | undefined
  let repoRoot: string | undefined
  let lightModel = process.env.CURSOR_MODEL_LIGHT || 'composer-2.5'

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--help' || a === '-h') usage()
    if (a === '--title') {
      title = argv[++i] || usage()
      continue
    }
    if (a === '--body') {
      body = argv[++i] || usage()
      continue
    }
    if (a === '--output') {
      output = resolve(argv[++i] || usage())
      continue
    }
    if (a === '--repo-root') {
      repoRoot = resolve(argv[++i] || usage())
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
    console.error('Unexpected argument: ' + a)
    usage()
  }

  return { title, body, output, repoRoot, lightModel }
}

function buildPrompt(opts: {
  title: string
  body: string
  guideSlugs: string[]
  personas: string[]
}): string {
  const guides =
    opts.guideSlugs.length > 0
      ? opts.guideSlugs.map((s) => `- ${s}`).join('\n')
      : '(none yet)'
  const personas =
    opts.personas.length > 0
      ? opts.personas.map((p) => `- ${p}`).join('\n')
      : '- it-admin'

  return `You distill a freeform GitHub issue into structured intent for drafting
an MCP server Setup Guide in this repository.

Existing guide slugs under guides/ (prefer matching one when the issue clearly
refers to that server; otherwise invent a kebab-case slug for a new server):
${guides}

Known persona ids under doctrine/personas/ (default to it-admin unless the issue
confidently names one of these):
${personas}

Issue title:
${opts.title || '(empty)'}

Issue body:
${opts.body || '(empty)'}

Decide:
- If you can confidently identify a single MCP server / provider to draft a
  guide for, return status "ok".
- If the issue is ambiguous (multiple servers, no identifiable server, or
  contradictory requests), return status "needs_clarification" with a short
  reason and optional candidate slugs — do not guess.

Return ONLY a single JSON object, no markdown fences, no commentary.

On success:
{
  "status": "ok",
  "slug": "datadog",
  "provider": "Datadog",
  "persona": "it-admin",
  "notes": "Prefer OAuth; docs: https://…"
}

On clarification needed:
{
  "status": "needs_clarification",
  "reason": "Title mentions both Slack and HubSpot; which server should we draft?",
  "candidates": ["slack", "hubspot"]
}

Rules:
- slug: kebab-case, letters/digits/hyphens only (e.g. dbt-cloud, hugging-face).
- provider: human display name for the product/server.
- persona: only a known id from the list above; omit or use it-admin if unsure.
- notes: concise extra context for the drafting agents (URLs, auth preference,
  scope constraints). Empty string or omit if none.
- Prefer an existing guide slug when the issue clearly means that server.`
}

function writeOutput(path: string | undefined, value: unknown) {
  const text = JSON.stringify(value, null, 2) + '\n'
  process.stdout.write(text)
  if (path) writeFileSync(path, text)
}

function normalizeOk(
  raw: z.infer<typeof OkSchema>,
  personas: string[]
): ResolvedIssue {
  const slug = toSlug(raw.slug)
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return {
      status: 'needs_clarification',
      reason: `Could not derive a kebab-case slug from "${raw.slug}"`,
      candidates: raw.slug ? [raw.slug] : [],
    }
  }

  let persona = (raw.persona || 'it-admin').trim()
  if (!personas.includes(persona)) {
    persona = 'it-admin'
  }

  return {
    status: 'ok',
    slug,
    provider: raw.provider.trim() || slug,
    persona,
    notes: (raw.notes || '').trim(),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const apiKey = process.env.CURSOR_API_KEY?.trim()
  if (!apiKey) {
    console.error('CURSOR_API_KEY is required')
    process.exit(1)
  }

  if (!args.title.trim() && !args.body.trim()) {
    console.error('Issue title or body is required (--title/--body or ISSUE_TITLE/ISSUE_BODY)')
    process.exit(1)
  }

  const repoRoot = args.repoRoot || defaultRepoRoot()
  const guideSlugs = listGuideSlugs(repoRoot)
  const personas = listPersonas(repoRoot)
  const prompt = buildPrompt({
    title: args.title,
    body: args.body,
    guideSlugs,
    personas,
  })

  console.error(
    `resolve-issue: model=${args.lightModel} guides=${guideSlugs.length} personas=${personas.join(',')}`
  )

  let resultText = ''
  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: args.lightModel },
      name: 'resolve-issue',
      local: {
        cwd: repoRoot,
        settingSources: [],
      },
    })

    if (result.status !== 'finished') {
      console.error(
        `resolve-issue: run ended status=${result.status}` +
          (result.error ? ` error=${result.error.message}` : '')
      )
      process.exit(1)
    }
    resultText = result.result ?? ''
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        `resolve-issue: Agent.prompt failed: ${err.message} retryable=${err.isRetryable}`
      )
      process.exit(1)
    }
    throw err
  }

  let parsed: unknown
  try {
    parsed = extractJson(resultText)
  } catch (err) {
    const clarification: ResolvedIssue = {
      status: 'needs_clarification',
      reason: `Could not parse distill JSON: ${(err as Error).message}`,
    }
    writeOutput(args.output, clarification)
    process.exit(2)
  }

  const checked = ResolvedSchema.safeParse(parsed)
  if (!checked.success) {
    const clarification: ResolvedIssue = {
      status: 'needs_clarification',
      reason: `Distill JSON failed schema validation: ${checked.error.message}`,
    }
    writeOutput(args.output, clarification)
    process.exit(2)
  }

  const resolved =
    checked.data.status === 'ok'
      ? normalizeOk(checked.data, personas)
      : checked.data

  writeOutput(args.output, resolved)
  process.exit(resolved.status === 'ok' ? 0 : 2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
