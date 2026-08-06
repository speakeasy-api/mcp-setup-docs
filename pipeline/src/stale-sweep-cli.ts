#!/usr/bin/env node
/**
 * Stale guide sweep: report guides whose lockfile went cold, and queue tickets.
 *
 * Detection is offline (see stale-sweep.ts). This file owns only the reporting
 * and the GitHub side.
 *
 * Two rules keep the sweep from flooding the tracker:
 *   - It opens at most `--limit` tickets per run, oldest lock first.
 *   - It never opens a second ticket for a slug that already has one open,
 *     matched on a hidden marker rather than the title, so an operator may
 *     retitle a ticket freely.
 *
 * It never applies `guide:draft`. Refreshing a guide costs an agent run and
 * OpenRouter credits, so a human adds that label when they want it to fire.
 */
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gh } from './factory/gh.ts'
import { ensureLabels } from './factory/labels.ts'
import { piModelSlug } from './runtime-pi.ts'
import {
  detectDrift,
  groupByCause,
  guideSlugs,
  type GuideDrift,
} from './stale-sweep.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

function defaultRepoRoot(): string {
  // pipeline/src → repo root is ../..
  return resolve(__dirname, '../..')
}

const STALE_LABEL = 'guide:stale'
const DEFAULT_LIMIT = 5

function usage(): never {
  console.log(
    `Usage: npm run stale-sweep -- [options]

Reports guides whose pipeline.lock.json no longer matches the repo, and
optionally opens one refresh ticket per guide.

Options:
  --create          Open tickets. Without it the sweep only prints.
  --limit N         Open at most N tickets this run (default ${DEFAULT_LIMIT}).
  --repo-root PATH  Repo root (default: the checkout this file lives in).
  --help, -h        Show this message.

Tickets carry the \`${STALE_LABEL}\` label. They never carry \`guide:draft\`,
so no ticket starts a draft run on its own. Add \`guide:draft\` to fire one.`
  )
  process.exit(0)
}

function parseArgs(argv: string[]) {
  let create = false
  let limit = DEFAULT_LIMIT
  let repoRoot = defaultRepoRoot()

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '--help' || arg === '-h') usage()
    if (arg === '--create') {
      create = true
      continue
    }
    if (arg === '--limit') {
      const raw = argv[++i]
      const parsed = Number(raw)
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`--limit needs a non-negative integer, got ${raw}`)
      }
      limit = parsed
      continue
    }
    if (arg === '--repo-root') {
      const raw = argv[++i]
      if (!raw) throw new Error('--repo-root needs a path')
      repoRoot = raw
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }
  return { create, limit, repoRoot }
}

/** Hidden marker that ties a ticket to a slug across retitles and edits. */
export function marker(slug: string): string {
  return `<!-- stale-sweep:${slug} -->`
}

/** Slugs that already have an open sweep ticket. */
function openTicketSlugs(): Set<string> {
  const res = gh([
    'issue',
    'list',
    '--label',
    STALE_LABEL,
    '--state',
    'open',
    '--limit',
    '200',
    '--json',
    'body',
  ])
  const issues = JSON.parse(res.stdout || '[]') as Array<{ body?: string }>
  const found = new Set<string>()
  for (const issue of issues) {
    const match = /<!-- stale-sweep:([a-z0-9-]+) -->/.exec(issue.body ?? '')
    if (match) found.add(match[1]!)
  }
  return found
}

export function ticketTitle(slug: string): string {
  return `Refresh guide: ${slug}`
}

export function ticketBody(drift: GuideDrift): string {
  const lines: string[] = []
  lines.push(
    `The \`${drift.slug}\` guide drifted from its lockfile. A draft run today would redo work.`,
    ''
  )
  if (drift.lockedAt) {
    lines.push(
      `- **slug:** \`${drift.slug}\``,
      `- **last locked:** ${drift.lockedAt}`,
      `- **runtime:** \`${drift.runtime ?? 'unrecorded'}\``,
      ''
    )
  } else {
    lines.push(`- **slug:** \`${drift.slug}\``, '- **last locked:** never', '')
  }

  lines.push('## What drifted', '')
  for (const reason of drift.reasons) {
    const steps =
      reason.steps.length > 0
        ? ` _(invalidates ${reason.steps.map((s) => `\`${s}\``).join(', ')})_`
        : ''
    lines.push(`- ${reason.text}${steps}`)
  }

  lines.push(
    '',
    '## To refresh',
    '',
    `Add the \`guide:draft\` label to this issue. The factory reads the slug from`,
    'this body, drafts on a new branch, and opens a pull request for review.',
    '',
    'This ticket does not start a run on its own.',
    '',
    marker(drift.slug)
  )
  return lines.join('\n')
}

function createTicket(drift: GuideDrift): string {
  const dir = mkdtempSync(join(tmpdir(), 'stale-sweep-'))
  const bodyFile = join(dir, `${drift.slug}.md`)
  writeFileSync(bodyFile, ticketBody(drift))
  const res = gh([
    'issue',
    'create',
    '--title',
    ticketTitle(drift.slug),
    '--body-file',
    bodyFile,
    '--label',
    STALE_LABEL,
  ])
  return res.stdout.trim()
}

function printReport(drifts: GuideDrift[], total: number): void {
  console.log(`Stale guides: ${drifts.length} of ${total} checked.`)
  if (drifts.length === 0) return

  console.log('\nBy cause:')
  for (const [text, slugs] of groupByCause(drifts)) {
    const plain = text.replace(/`/g, '')
    console.log(`  ${String(slugs.length).padStart(2)}  ${plain}`)
    if (slugs.length <= 4) console.log(`      ${slugs.join(', ')}`)
  }

  console.log('\nBy guide, most overdue first:')
  for (const drift of drifts) {
    const when = drift.lockedAt ?? 'never locked'
    console.log(
      `  ${drift.slug.padEnd(24)} ${when.padEnd(22)} ${drift.reasons.length} cause(s)`
    )
  }
}

async function main(): Promise<void> {
  const { create, limit, repoRoot } = parseArgs(process.argv.slice(2))
  const modelToday = piModelSlug(process.env.DRAFT_MODEL || 'openai/gpt-5.6-sol')

  const all = detectDrift(repoRoot, { modelToday })
  printReport(all, guideSlugs(repoRoot).length)

  if (!create) {
    console.log(
      `\nDry run. Pass --create to open up to ${limit} ticket(s) with the \`${STALE_LABEL}\` label.`
    )
    return
  }

  ensureLabels()
  const alreadyOpen = openTicketSlugs()
  const queue = all.filter((d) => !alreadyOpen.has(d.slug))
  const skipped = all.length - queue.length
  const batch = queue.slice(0, limit)

  console.log(
    `\n${alreadyOpen.size} open ticket(s) already; ${skipped} stale guide(s) covered.`
  )
  // One failed create must not cost the rest of the batch. Creates are never
  // retried in-run: a create that failed after GitHub accepted it would leave a
  // marker the retry cannot see, and duplicate the ticket. The next sweep reads
  // the markers fresh and picks up whatever is genuinely still missing.
  let failed = 0
  for (const drift of batch) {
    try {
      console.log(`  opened ${createTicket(drift)}  (${drift.slug})`)
    } catch (err) {
      failed++
      console.error(
        `  FAILED ${drift.slug}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
  const held = queue.length - batch.length
  if (held > 0) {
    console.log(`  ${held} more held back until the next sweep.`)
  }
  if (failed > 0) {
    throw new Error(`${failed} ticket(s) failed to open; see the errors above.`)
  }
}

/** Only the CLI invocation runs main; the test imports the formatters. */
function isCliEntry(): boolean {
  const entry = process.argv[1]
  return (
    !!entry && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
  )
}

if (isCliEntry()) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
