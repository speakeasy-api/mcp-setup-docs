#!/usr/bin/env node
/**
 * Light distill step: freeform GitHub issue title+body → structured guide intent.
 * One OpenRouter chat completion with the light model; no tools, no session, and
 * not the draft-guide pipeline. The prompt embeds the guide slugs and persona ids
 * inline, so this step never needs to read the filesystem on the model's behalf.
 */
import { existsSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const DEFAULT_LIGHT_MODEL = 'openai/gpt-5.6-sol'

/** One chat completion. Injected in tests; `openRouterChat` is the real one. */
export type ChatCompletion = (input: {
  apiKey: string
  model: string
  prompt: string
}) => Promise<{ status: number; body: string }>

/**
 * Either a verdict to write (exit 0 for ok, 2 for needs_clarification) or a hard
 * failure (exit 1). Split so a call that never produced an answer cannot be
 * written out as an empty-but-successful clarification.
 */
export type DistillOutcome =
  | { kind: 'resolved'; resolved: ResolvedIssue }
  | { kind: 'failure'; message: string }

/** Rejects on network failure; `distill` turns that into a `failure`. */
const openRouterChat: ChatCompletion = async ({ apiKey, model, prompt }) => {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      // The key travels in the header only — never argv, never a log line.
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  return { status: res.status, body: await res.text() }
}

/** Assistant text of a chat completion; '' when the body carries none. */
function messageText(body: string): string {
  const payload = JSON.parse(body) as {
    choices?: Array<{ message?: { content?: unknown } }>
  }
  const content = payload.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

function usage(): never {
  console.error(`Usage:
  npm run resolve-issue -- [options]

Options:
  --title <text>     Issue title (or ISSUE_TITLE env)
  --body <text>      Issue body (or ISSUE_BODY env)
  --output <path>    Write resolved JSON here (also printed to stdout)
  --repo-root <path> Repo root (default: two levels above this package)
  --light-model <id> Model id (default: OPENROUTER_MODEL_LIGHT or ${DEFAULT_LIGHT_MODEL})

Env:
  OPENROUTER_API_KEY     Required
  ISSUE_TITLE            Fallback for --title
  ISSUE_BODY             Fallback for --body
  OPENROUTER_MODEL_LIGHT Fallback for --light-model

Exit codes:
  0  status=ok
  2  status=needs_clarification (or empty/unparseable slug)
  1  hard failure (missing key, HTTP error, etc.)
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
  let lightModel = process.env.OPENROUTER_MODEL_LIGHT || DEFAULT_LIGHT_MODEL

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

/**
 * Ask the model, then parse what came back. Pure apart from `chat` — no env, no
 * filesystem, no process.exit — so the whole decision table is testable.
 */
export async function distill(input: {
  prompt: string
  personas: string[]
  apiKey: string
  model: string
  chat: ChatCompletion
}): Promise<DistillOutcome> {
  let res: { status: number; body: string }
  try {
    res = await input.chat({
      apiKey: input.apiKey,
      model: input.model,
      prompt: input.prompt,
    })
  } catch (err) {
    // DNS, TLS, socket: the question was never asked, so there is nothing to
    // clarify. Same for every branch below that returns a `failure`.
    return {
      kind: 'failure',
      message: `OpenRouter request failed: ${(err as Error).message}`,
    }
  }

  if (res.status < 200 || res.status >= 300) {
    return {
      kind: 'failure',
      message: `OpenRouter returned HTTP ${res.status}: ${res.body.slice(0, 500)}`,
    }
  }

  let text: string
  try {
    text = messageText(res.body)
  } catch {
    return {
      kind: 'failure',
      message: `OpenRouter returned 200 with a non-JSON body: ${res.body.slice(0, 500)}`,
    }
  }
  if (!text.trim()) {
    // A 200 carrying no content is a failed call wearing a success code. Letting
    // it fall through would write a hollow clarification and exit 2, which is
    // how the pi path once hid a broken run.
    return { kind: 'failure', message: 'OpenRouter returned 200 with no message content' }
  }

  let parsed: unknown
  try {
    parsed = extractJson(text)
  } catch (err) {
    return {
      kind: 'resolved',
      resolved: {
        status: 'needs_clarification',
        reason: `Could not parse distill JSON: ${(err as Error).message}`,
      },
    }
  }

  const checked = ResolvedSchema.safeParse(parsed)
  if (!checked.success) {
    return {
      kind: 'resolved',
      resolved: {
        status: 'needs_clarification',
        reason: `Distill JSON failed schema validation: ${checked.error.message}`,
      },
    }
  }

  return {
    kind: 'resolved',
    resolved:
      checked.data.status === 'ok'
        ? normalizeOk(checked.data, input.personas)
        : checked.data,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is required')
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

  const outcome = await distill({
    prompt,
    personas,
    apiKey,
    model: args.lightModel,
    chat: openRouterChat,
  })

  if (outcome.kind === 'failure') {
    console.error(`resolve-issue: ${outcome.message}`)
    process.exit(1)
  }

  writeOutput(args.output, outcome.resolved)
  process.exit(outcome.resolved.status === 'ok' ? 0 : 2)
}

/**
 * Only the CLI invocation runs main — resolve-issue.test.ts imports this module
 * for `distill`, and package.json still points the `resolve-issue` script at this
 * file, so the entrypoint cannot simply move to a `-cli.ts` sibling.
 */
function isCliEntry(): boolean {
  const entry = process.argv[1]
  return !!entry && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
}

if (isCliEntry()) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
