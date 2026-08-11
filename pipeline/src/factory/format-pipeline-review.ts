import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
  dropRefutedFindings,
  isDossierRenderFix,
  type FindingLike,
} from '../findings.ts'

export type Finding = FindingLike

export type ReviewRecord = {
  status?: string
  rounds?: number | string
  slug?: string
  unresolved?: Finding[]
  open_questions?: string[]
  nits?: Array<Finding | string>
  history?: Array<{ disputed?: string[] }>
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

function plainTargetRenderFix(target: string): string {
  switch (target) {
    case 'external':
      return 'Render fix in `external.md` — the Dossier already has the wording; apply the suggestion (no new research).'
    case 'speakeasy':
      return 'Render fix in `speakeasy.md` — the Dossier / Speakeasy canonical already has the wording; apply the suggestion.'
    default:
      return `Render fix in \`${target}\` — apply the Dossier wording (no new research).`
  }
}

function plainTargetDecision(target: string): string {
  switch (target) {
    case 'research':
      return 'Needs a fact in `research.md` (or drop the step that depends on it).'
    case 'external':
      return 'Needs a clearer step in `external.md`.'
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
  /** Setup-file fidelity: apply Dossier wording — not a chrome/scope Decision. */
  renderFixes: Finding[]
  /** Research/meta gaps, achievability judgment, lint — need a human reply. */
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
  const deduped: Finding[] = []
  const seen = new Set<string>()
  for (const f of gates) {
    const key = `${f.target ?? ''}\0${locus(f)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(f)
  }
  const renderFixes = deduped.filter(isDossierRenderFix)
  const decisions = deduped.filter((f) => !isDossierRenderFix(f))
  return { renderFixes, decisions, legacy }
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

function appendFindingSection(
  lines: string[],
  opts: {
    index: number
    row: Finding
    targetLine: string
    replyLines: string[]
    guideMds: string[]
  },
): void {
  const { index, row, targetLine, replyLines, guideMds } = opts
  const dim = row.dimension ?? '?'
  const where = row.where ?? '?'
  const problem = row.problem ?? ''
  const suggestion = row.suggestion ?? ''
  const anchor = extractAnchor(where)

  lines.push(`#### ${index}. ${plainDimension(dim)}`)
  lines.push('')
  lines.push(`- **Where in the guide:** \`${where}\``)
  if (anchor) lines.push(`- **Section anchor:** \`${anchor}\``)
  lines.push(`- **What's wrong:** ${problem}`)
  lines.push(`- **What would unblock it:** ${suggestion}`)
  lines.push(`- **${targetLine}**`)
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
  for (const r of replyLines) lines.push(r)
  lines.push('')
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

  const disputed = (record.history ?? []).flatMap((h) => h.disputed ?? [])
  const { renderFixes, decisions, legacy } = partitionFindings(
    dropRefutedFindings(record.unresolved ?? [], disputed),
  )

  let decisionIndex = 0

  if (renderFixes.length > 0) {
    lines.push(`### Render fixes (${renderFixes.length}) — Dossier already has the fact`)
    lines.push('')
    lines.push(
      'These are setup-file fidelity misses. Research already recorded the wording; the Writer (or a re-run) should apply the suggestion. Do **not** treat them as console-capture Decisions.',
    )
    lines.push('')
    for (const row of renderFixes) {
      decisionIndex++
      appendFindingSection(lines, {
        index: decisionIndex,
        row,
        targetLine: plainTargetRenderFix(row.target ?? '?'),
        replyLines: [
          `- \`Decision ${decisionIndex}: apply\` (use the suggestion / re-run — no new labels needed)`,
          `- \`Decision ${decisionIndex}: override — …\` (different wording than the suggestion)`,
        ],
        guideMds,
      })
    }
  }

  if (decisions.length > 0) {
    lines.push(`### Decisions needed (${decisions.length})`)
    lines.push('')
    for (const row of decisions) {
      decisionIndex++
      appendFindingSection(lines, {
        index: decisionIndex,
        row,
        targetLine: plainTargetDecision(row.target ?? '?'),
        replyLines: [
          `- \`Decision ${decisionIndex}: verified — …\` (paste the exact button / field / nav labels)`,
          `- \`Decision ${decisionIndex}: drop this branch\` (remove the recovery/optional path until we can verify it)`,
          `- \`Decision ${decisionIndex}: hedge — …\` (keep a softer “if you see X, ask your admin” line instead of exact clicks)`,
        ],
        guideMds,
      })
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
  // Always collapse the list. GitHub renders <details> closed, so the nits stay
  // one click away instead of pushing the retry steps off the screen.
  // Keep the blank lines after <summary> and before </details>. GitHub does not
  // render markdown inside a <details> element without them.
  //
  // Caution: `legacy` can hold real blockers. A finding with `severity:
  // "blocker"` but no `dimension` field fails `isGate`, so it lands here and
  // reads as an optional nit. Two committed run records show this:
  // `retro/runs/2026-07-23T18:50:25Z-google-big-query.json` (2 of 2 findings)
  // and `retro/runs/2026-07-23T19:12:45Z-google-big-query.json` (1 of 1).
  // The misclassification is in `isGate`, not here. Do not fix it in this block.
  if (extraNits > 0 && extraNits <= 12) {
    lines.push(`<details><summary>Optional nits (${extraNits})</summary>`)
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
    lines.push('</details>')
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
    '1. Reply on **this issue** using the `Decision N: …` lines above (render fixes: `apply` / `override`; scope gaps: verified / drop / hedge) and answer open questions.',
  )
  lines.push(
    '2. Re-add the `guide:draft` label. Distill reads the issue body **and** comments into pipeline notes.',
  )
  lines.push(
    '3. If a factory draft PR already exists (`guide/issue-<N>-*`), the next run **resumes on that branch** and revises prior research/setup instead of starting blank. Late setup-file fidelity misses get one automatic salvage revise at finalization before surfacing here.',
  )
  lines.push('')
  if (recordPath) {
    lines.push(`_Source: \`${basename(recordPath)}\`_`)
  }
  return lines.join('\n')
}
