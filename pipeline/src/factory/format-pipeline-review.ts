import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

export type Finding = {
  dimension?: string
  target?: string
  where?: string
  problem?: string
  suggestion?: string
}

export type ReviewRecord = {
  status?: string
  rounds?: number | string
  slug?: string
  unresolved?: Finding[]
  open_questions?: string[]
  nits?: Array<Finding | string>
}

function plainDimension(dim: string): string {
  switch (dim) {
    case 'fidelity':
      return 'Fact check failed — setup and research disagree (or research is missing the fact).'
    case 'achievability':
      return 'A cold reader would get stuck — a click, field, or next step is not named clearly enough.'
    case 'lint':
      return 'Guide grammar / schema rule broken (deterministic lint).'
    case 'voice':
      return 'Tone / persona mismatch.'
    case 'formatting':
      return 'Guide structure / formatting rule broken.'
    case 'concision':
      return 'Extra prose the reader does not need.'
    default:
      return dim
  }
}

function plainTarget(target: string): string {
  switch (target) {
    case 'research':
      return 'Needs a fact in `research.md` (or drop the step that depends on it).'
    case 'external':
      return 'Needs a clearer step in `external.md` (the fact may already be in research).'
    case 'speakeasy':
      return 'Needs a clearer step in `speakeasy.md` (canonical Control Plane flow / Dossier).'
    case 'setup':
      return 'Needs a clearer step in the setup files (`external.md` / `speakeasy.md`).'
    case 'meta':
      return 'Needs a fix in `meta.yaml`.'
    default:
      return `Target: \`${target}\``
  }
}

function extractAnchor(where: string): string {
  const m = where.match(/#[a-z0-9-]+/)
  return m?.[0] ?? ''
}

function locus(f: Finding): string {
  const where = f.where ?? ''
  const a = extractAnchor(where)
  return a || where.slice(0, 80)
}

function rank(f: Finding): number {
  switch (f.dimension) {
    case 'fidelity':
      return 0
    case 'lint':
      return 1
    case 'achievability':
      return 2
    default:
      return 9
  }
}

function isGate(f: Finding): boolean {
  return (
    f.dimension === 'fidelity' ||
    f.dimension === 'achievability' ||
    f.dimension === 'lint'
  )
}

/** Dedupe gate findings by target + locus; prefer fidelity > lint > achievability. */
export function partitionFindings(unresolved: Finding[]): {
  decisions: Finding[]
  legacy: Finding[]
} {
  const gates = unresolved.filter(isGate)
  const legacy = unresolved.filter((f) => !isGate(f))
  gates.sort((a, b) => {
    const ta = a.target ?? ''
    const tb = b.target ?? ''
    if (ta !== tb) return ta < tb ? -1 : 1
    const la = locus(a)
    const lb = locus(b)
    if (la !== lb) return la < lb ? -1 : 1
    return rank(a) - rank(b)
  })
  const decisions: Finding[] = []
  const seen = new Set<string>()
  for (const f of gates) {
    const key = `${f.target ?? ''}\0${locus(f)}`
    if (seen.has(key)) continue
    seen.add(key)
    decisions.push(f)
  }
  return { decisions, legacy }
}

function quoteSection(mdPath: string, anchor: string): string {
  if (!existsSync(mdPath) || !anchor) return ''
  const id = anchor.replace(/^#/, '')
  const needle = `{#${id}}`
  const md = readFileSync(mdPath, 'utf8')
  const lines = md.split('\n')
  let start: number | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.includes(needle) && line.trimStart().startsWith('#')) {
      start = i
      break
    }
  }
  if (start === null) return ''
  const out = [lines[start]!]
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!
    if (line.startsWith('## ') || (line.startsWith('### ') && line.includes('{#'))) {
      break
    }
    out.push(line)
  }
  while (out.length && !out[out.length - 1]!.trim()) out.pop()
  let text = out.join('\n').trim()
  if (text.length > 900) text = text.slice(0, 900).replace(/\s+$/, '') + '\n…'
  return text
}

function guideMdPaths(guideDir: string): string[] {
  if (!guideDir) return []
  const paths: string[] = []
  for (const name of ['external.md', 'speakeasy.md']) {
    const p = join(guideDir, name)
    if (existsSync(p)) paths.push(p)
  }
  if (paths.length === 0) {
    const legacy = join(guideDir, 'setup.md')
    if (existsSync(legacy)) paths.push(legacy)
  }
  return paths
}

function quoteFromGuides(guideMds: string[], anchor: string): string {
  for (const md of guideMds) {
    const q = quoteSection(md, anchor)
    if (q) return q
  }
  return ''
}

/** Format a Pipeline review comment from a run record. */
export function formatPipelineReview(
  record: ReviewRecord,
  prUrl = '',
  guideDir = '',
  recordPath = '',
): string {
  const status = record.status ?? 'unknown'
  const rounds = record.rounds ?? '?'
  const slug = record.slug ?? '?'
  const guideMds = guideMdPaths(guideDir)
  const lines: string[] = []

  lines.push(`## Pipeline review (\`${slug}\`)`)
  lines.push('')
  if (status === 'converged') {
    lines.push(
      `**Outcome:** Reviewers passed after ${rounds} round(s). Still skim the open questions below before merging.`,
    )
  } else if (status === 'unconverged') {
    lines.push(
      `**Outcome:** Did **not** fully converge after ${rounds} review round(s). The draft may still be useful — decide on each item below, then reply and re-run.`,
    )
  } else {
    lines.push(`**Outcome:** \`${status}\` after ${rounds} review round(s).`)
  }
  if (prUrl) {
    lines.push('')
    lines.push(`**Draft PR:** ${prUrl}`)
  }
  lines.push('')

  const { decisions, legacy } = partitionFindings(record.unresolved ?? [])

  if (decisions.length > 0) {
    lines.push(`### Decisions needed (${decisions.length})`)
    lines.push('')
    let i = 0
    for (const row of decisions) {
      i++
      const dim = row.dimension ?? '?'
      const target = row.target ?? '?'
      const where = row.where ?? '?'
      const problem = row.problem ?? ''
      const suggestion = row.suggestion ?? ''
      const anchor = extractAnchor(where)

      lines.push(`#### ${i}. ${plainDimension(dim)}`)
      lines.push('')
      lines.push(`- **Where in the guide:** \`${where}\``)
      if (anchor) lines.push(`- **Section anchor:** \`${anchor}\``)
      lines.push(`- **What's wrong:** ${problem}`)
      lines.push(`- **What would unblock it:** ${suggestion}`)
      lines.push(`- **${plainTarget(target)}**`)
      lines.push('')

      if (guideMds.length > 0 && anchor) {
        const quote = quoteFromGuides(guideMds, anchor)
        if (quote) {
          lines.push('<details><summary>Current guide text for this section</summary>')
          lines.push('')
          lines.push('```markdown')
          lines.push(quote)
          lines.push('```')
          lines.push('')
          lines.push('</details>')
          lines.push('')
        }
      }

      lines.push('**Reply with one of:**')
      lines.push(
        `- \`Decision ${i}: verified — …\` (paste the exact button / field / nav labels)`,
      )
      lines.push(
        `- \`Decision ${i}: drop this branch\` (remove the recovery/optional path until we can verify it)`,
      )
      lines.push(
        `- \`Decision ${i}: hedge — …\` (keep a softer “if you see X, ask your admin” line instead of exact clicks)`,
      )
      lines.push('')
    }
  }

  const oqs = record.open_questions ?? []
  if (oqs.length > 0) {
    lines.push(`### Open questions (${oqs.length})`)
    lines.push('')
    lines.push(
      'Research could not prove these from public docs. Check the boxes by replying with answers, or say “unknown / omit”. Silence + an existing hedge in the guide usually means **omit / keep hedge** — not a console capture.',
    )
    lines.push('')
    for (const q of oqs) lines.push(`- [ ] ${q}`)
    lines.push('')
  }

  const nits = record.nits ?? []
  const extraNits = nits.length + legacy.length
  if (extraNits > 0 && extraNits <= 12) {
    lines.push(`### Optional nits (${extraNits})`)
    lines.push('')
    for (const f of legacy) {
      lines.push(
        `- \`${f.where ?? '?'}\` (${f.dimension ?? '?'}): ${f.problem ?? ''} → ${f.suggestion ?? '—'}`,
      )
    }
    for (const n of nits) {
      if (typeof n === 'object' && n !== null) {
        lines.push(
          `- \`${n.where ?? '?'}\`: ${n.problem ?? ''} → ${n.suggestion ?? '—'}`,
        )
      } else {
        lines.push(`- ${n}`)
      }
    }
    lines.push('')
  } else if (extraNits > 12) {
    lines.push('### Optional nits')
    lines.push('')
    lines.push(`_${extraNits} optional nits — see the run record in the PR if you care._`)
    lines.push('')
  }

  lines.push('### How to retry')
  lines.push('')
  lines.push(
    '1. Reply on **this issue** using the `Decision N: …` lines above (and answer open questions).',
  )
  lines.push(
    '2. Re-add the `guide:draft` label. Distill reads the issue body **and** comments into pipeline notes.',
  )
  lines.push(
    '3. If a factory draft PR already exists (`guide/issue-<N>-*`), the next run **resumes on that branch** and revises prior research/setup instead of starting blank.',
  )
  lines.push('')
  if (recordPath) {
    lines.push(`_Source: \`${basename(recordPath)}\`_`)
  }
  return lines.join('\n')
}
