#!/usr/bin/env node
// Compare two arms of a drafting experiment and print a Markdown report.
//
//   node tools/experiment/compare-arms.mjs <slug>
//
// Reads tools/experiment/results/<slug>-a/ and <slug>-b/, each holding a
// guides/<slug>/ copy, a run-record JSON, and meta.json. The point of the
// report is section 2: an arm that saves tokens by dropping UI labels is a
// regression, not a win.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const RESULTS = join(HERE, 'results')
const GUIDE_FILES = ['research.md', 'external.md', 'speakeasy.md', 'meta.yaml']
const LABEL_FILES = ['external.md', 'speakeasy.md']
const TOKEN_METRICS = [
  ['inputTokens', 'input'],
  ['outputTokens', 'output'],
  ['cacheReadTokens', 'cache read'],
  ['cacheWriteTokens', 'cache write'],
  ['totalTokens', 'TOTAL'],
]
const BLOCKER_TARGETS = ['research', 'external', 'speakeasy']

// ---------------------------------------------------------------- utilities

const out = []
const say = (line = '') => out.push(line)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const num = (v) => (isNum(v) ? v : null)
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : '—')

// Sub-dollar runs are normal, so keep 4 decimals until the number gets big.
const money = (n) => `$${n.toFixed(Math.abs(n) >= 10 ? 2 : 4)}`
const fmtUsd = (n) => (isNum(n) ? money(n) : '—')

function deltaUsd(a, b) {
  if (!isNum(a) || !isNum(b)) return '—'
  const d = b - a
  return `${d > 0 ? '+' : d < 0 ? '-' : ''}${money(Math.abs(d))}`
}

function table(headers, rows) {
  say(`| ${headers.join(' | ')} |`)
  say(`| ${headers.map(() => '---').join(' | ')} |`)
  for (const row of rows) say(`| ${row.join(' | ')} |`)
}

function delta(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return '—'
  const d = b - a
  return `${d > 0 ? '+' : ''}${fmt(d)}`
}

function pct(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return '—'
  if (a === 0) return b === 0 ? '0%' : 'n/a (A = 0)'
  const p = ((b - a) / a) * 100
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`
}

const readIf = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null)

function readJsonIf(path) {
  const raw = readIf(path)
  if (raw === null) return { value: null, error: null }
  try {
    return { value: JSON.parse(raw), error: null }
  } catch (err) {
    return { value: null, error: err.message }
  }
}

const isDir = (p) => existsSync(p) && statSync(p).isDirectory()

// -------------------------------------------------------------- extraction

// Bold runs may wrap across a line, but never across a blank line — a match
// that spans one is unbalanced `**` rather than a label.
function boldLabels(markdown) {
  const found = []
  for (const match of markdown.matchAll(/\*\*([^*]+?)\*\*/g)) {
    const raw = match[1]
    if (/\n\s*\n/.test(raw)) continue
    const normalized = raw.replace(/\s+/g, ' ').trim()
    if (normalized) found.push({ normalized, display: normalized })
  }
  return found
}

const anchors = (markdown) => [...markdown.matchAll(/\{#([^}\s]+)\}/g)].map((m) => m[1])

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length

function provenanceUrls(research) {
  const lines = research.split('\n')
  const start = lines.findIndex((l) => /^##\s+Provenance\b/i.test(l))
  let scoped = start !== -1
  let body = research
  if (scoped) {
    let end = lines.length
    for (let i = start + 1; i < lines.length; i++) {
      if (/^##\s+/.test(lines[i])) {
        end = i
        break
      }
    }
    body = lines.slice(start, end).join('\n')
  }
  const urls = new Set()
  for (const match of body.matchAll(/https?:\/\/[^\s)>\]`"'*]+/g)) {
    urls.add(match[0].replace(/[.,;:]+$/, ''))
  }
  return { urls: [...urls], scoped }
}

// Usage totals may omit totalTokens; derive it from the parts when they exist.
function usageTotal(node) {
  if (typeof node === 'number') return node
  if (!node || typeof node !== 'object') return null
  if (typeof node.totalTokens === 'number') return node.totalTokens
  const parts = ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']
    .map((k) => node[k])
    .filter((v) => typeof v === 'number')
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null
}

const costOf = (node) => num(node?.costUsd)

// A run that reported nothing serializes as zeros; that is "unknown", not "free".
const tokensPresent = (node) => TOKEN_METRICS.some(([key]) => isNum(node?.[key]) && node[key] > 0)

// by_phase is {phase: usage} here; older records used [{phase, ...usage}].
function phaseUsage(byPhase) {
  const phases = new Map()
  if (Array.isArray(byPhase)) {
    for (const entry of byPhase) {
      const name = entry?.phase ?? entry?.name ?? entry?.step
      if (name) phases.set(String(name), entry.usage ?? entry)
    }
  } else if (byPhase && typeof byPhase === 'object') {
    for (const [name, value] of Object.entries(byPhase)) phases.set(name, value)
  }
  return phases
}

// Blockers are recorded per round; entries are findings (objects with a
// target) in newer records and bare strings in older ones.
function processFacts(record) {
  const facts = {
    status: record?.status ?? null,
    rounds: typeof record?.rounds === 'number' ? record.rounds : null,
    blockers: { total: 0, unattributed: 0 },
    nits: 0,
    openQuestions: Array.isArray(record?.open_questions) ? record.open_questions.length : null,
  }
  for (const target of BLOCKER_TARGETS) facts.blockers[target] = 0

  const history = Array.isArray(record?.history) ? record.history : []
  for (const round of history) {
    for (const blocker of Array.isArray(round?.blockers) ? round.blockers : []) {
      facts.blockers.total++
      const target = String(blocker?.target ?? '').toLowerCase()
      if (BLOCKER_TARGETS.includes(target)) facts.blockers[target]++
      else facts.blockers.unattributed++
    }
    if (Array.isArray(round?.nits)) facts.nits += round.nits.length
  }
  facts.hasHistory = history.length > 0
  return facts
}

// ------------------------------------------------------------- arm loading

function findRunRecord(dir, slug) {
  const candidates = readdirSync(dir)
    .filter((name) => name.endsWith('.json') && name !== 'meta.json')
    .sort((a, b) => Number(b.includes(slug)) - Number(a.includes(slug)))
  for (const name of candidates) {
    const { value } = readJsonIf(join(dir, name))
    if (value && typeof value === 'object' && ('status' in value || 'rounds' in value || 'usage' in value)) {
      return { name, record: value, error: null }
    }
  }
  if (candidates.length === 0) return { name: null, record: null, error: 'no run-record JSON found' }
  const first = candidates[0]
  const { error } = readJsonIf(join(dir, first))
  return { name: first, record: null, error: error ?? `${first} does not look like a run record` }
}

function guideDir(armDir, slug) {
  const direct = join(armDir, 'guides', slug)
  if (isDir(direct)) return direct
  const guides = join(armDir, 'guides')
  if (isDir(guides)) {
    const only = readdirSync(guides).filter((n) => isDir(join(guides, n)))
    if (only.length === 1) return join(guides, only[0])
  }
  return null
}

function loadArm(slug, arm) {
  const dir = join(RESULTS, `${slug}-${arm}`)
  const loaded = {
    arm,
    label: `arm ${arm.toUpperCase()}`,
    dir,
    present: isDir(dir),
    problems: [],
    files: {},
    labels: new Map(),
    labelCount: 0,
    anchors: null,
    provenance: null,
    process: null,
  }
  // run-ab.sh never clobbers: a re-run lands in <slug>-<arm>-<stamp>. Reading
  // the unstamped dir would then compare a stale run without saying so.
  const stamped = isDir(RESULTS)
    ? readdirSync(RESULTS).filter((n) => n.startsWith(`${slug}-${arm}-`) && isDir(join(RESULTS, n)))
    : []
  if (stamped.length) {
    loaded.problems.push(
      `re-runs exist (${stamped.map((n) => `\`${n}\``).join(', ')}) — this report reads \`${slug}-${arm}\`, the FIRST run`,
    )
  }

  if (!loaded.present) {
    loaded.problems.push(`missing directory \`${dir}\``)
    return loaded
  }

  const run = findRunRecord(dir, slug)
  loaded.record = run.record
  loaded.recordName = run.name
  if (run.error) loaded.problems.push(run.error)

  const meta = readJsonIf(join(dir, 'meta.json'))
  loaded.meta = meta.value
  if (meta.error) loaded.problems.push(`meta.json is not valid JSON: ${meta.error}`)
  else if (!meta.value) loaded.problems.push('no meta.json')

  loaded.guideDir = guideDir(dir, slug)
  if (!loaded.guideDir) {
    loaded.problems.push(`no guides/${slug}/ directory`)
  } else {
    for (const name of GUIDE_FILES) {
      const text = readIf(join(loaded.guideDir, name))
      if (text === null) loaded.problems.push(`missing ${name}`)
      loaded.files[name] = text
    }
  }

  // Labels, tagged with the file they came from so a drop is traceable.
  for (const name of LABEL_FILES) {
    const text = loaded.files[name]
    if (!text) continue
    for (const { normalized, display } of boldLabels(text)) {
      loaded.labelCount++
      if (!loaded.labels.has(normalized)) loaded.labels.set(normalized, { display, file: name })
    }
  }

  const external = loaded.files['external.md']
  loaded.anchors = external ? anchors(external) : null
  const research = loaded.files['research.md']
  loaded.provenance = research ? provenanceUrls(research) : null
  loaded.process = loaded.record ? processFacts(loaded.record) : null
  return loaded
}

// ----------------------------------------------------------------- sections

function armStatusNotes(arms) {
  const noted = arms.filter((a) => a.problems.length)
  if (!noted.length) return
  say('> **Data gaps**')
  for (const arm of noted) say(`> - ${arm.label}: ${arm.problems.join('; ')}`)
  say()
}

function sectionCost(a, b) {
  say('## 1. Cost')
  say()

  const usageOf = (arm) => (arm.present ? arm.record?.usage ?? null : null)
  const [ua, ub] = [usageOf(a), usageOf(b)]

  const whyUnreported = (u) =>
    !u ? 'no `usage` block in the run record'
    : u.reported === false ? '`usage.reported` is false'
    : !u.total || typeof u.total !== 'object' ? 'no `usage.total` block'
    : null
  for (const arm of [a, b]) {
    if (!arm.present) continue
    const why = whyUnreported(usageOf(arm))
    if (!why) continue
    say(`> ### ⚠️ ${arm.label} REPORTED NO USAGE`)
    say(`> ${why} — cost and tokens for this arm are unknown, not zero.`)
    say()
  }
  const reported = [a, b].every((arm) => !arm.present || !whyUnreported(usageOf(arm)))

  // An arm that reported nothing contributes no numbers at all: a printed 0
  // would read as "this arm was free".
  const [ta, tb] = [ua, ub].map((u) => (whyUnreported(u) ? null : u.total))
  const [pa, pb] = [ua, ub].map((u) => phaseUsage(whyUnreported(u) ? null : u.by_phase))
  const phases = [...new Set([...pa.keys(), ...pb.keys()])]
  const [costA, costB] = [costOf(ta), costOf(tb)]

  // Dollars first: the headline. Total on top, then each phase.
  const costRows = [
    ['**total**', costA, costB],
    ...phases.map((p) => [p, costOf(pa.get(p)), costOf(pb.get(p))]),
  ]
  say('**Cost (USD)**')
  say()
  if (costRows.every(([, va, vb]) => va === null && vb === null)) {
    say('_No `costUsd` in either run record — cost comparison unavailable._')
  } else {
    table(
      ['Scope', a.label, b.label, 'Δ', '%'],
      costRows.map(([name, va, vb]) => [name, fmtUsd(va), fmtUsd(vb), deltaUsd(va, vb), pct(va, vb)]),
    )
  }
  say()

  // Tokens second: context for the dollar figure, not the verdict.
  say('**Tokens**')
  say()
  if (!tokensPresent(ta) && !tokensPresent(tb)) {
    say('_Token counts are absent or all zero in both run records — nothing to compare._')
    say()
    return { totalA: null, totalB: null, costA, costB, reported }
  }
  table(
    ['Metric', a.label, b.label, 'Δ', '%'],
    TOKEN_METRICS.map(([key, label]) => {
      const va = key === 'totalTokens' ? usageTotal(ta) : num(ta?.[key])
      const vb = key === 'totalTokens' ? usageTotal(tb) : num(tb?.[key])
      return [label === 'TOTAL' ? '**total**' : label, fmt(va), fmt(vb), delta(va, vb), pct(va, vb)]
    }),
  )
  say()
  if (!phases.length) {
    say('_No `usage.by_phase` data in either run record._')
  } else {
    say('**Tokens per phase** (total tokens)')
    say()
    table(
      ['Phase', a.label, b.label, 'Δ', '%'],
      phases.map((p) => {
        const va = usageTotal(pa.get(p))
        const vb = usageTotal(pb.get(p))
        return [p, fmt(va), fmt(vb), delta(va, vb), pct(va, vb)]
      }),
    )
  }
  say()
  return { totalA: usageTotal(ta), totalB: usageTotal(tb), costA, costB, reported }
}

function sectionQuality(a, b) {
  say('## 2. Quality guardrail — UI labels')
  say()

  if (!a.present || !b.present) {
    const missingArm = [a, b].filter((arm) => !arm.present).map((arm) => arm.label).join(' and ')
    say(`_${missingArm} not present — no label comparison is possible._`)
    say()
    return { missing: [], added: [], comparable: false }
  }
  if (!a.labels.size && !b.labels.size) {
    say('_No bolded labels found in either arm — check that `external.md` and `speakeasy.md` were copied._')
    say()
    return { missing: [], added: [], comparable: false }
  }

  table(
    ['Metric', a.label, b.label, 'Δ'],
    [
      ['unique labels', fmt(a.labels.size), fmt(b.labels.size), delta(a.labels.size, b.labels.size)],
      ['total occurrences', fmt(a.labelCount), fmt(b.labelCount), delta(a.labelCount, b.labelCount)],
    ],
  )
  say()

  const missing = [...a.labels.entries()].filter(([key]) => !b.labels.has(key))
  const added = [...b.labels.entries()].filter(([key]) => !a.labels.has(key))

  if (missing.length) {
    say(`> ## ❌ ${missing.length} LABEL${missing.length === 1 ? '' : 'S'} LOST IN ${b.label.toUpperCase()}`)
    say('>')
    say(`> Present in ${a.label}, absent from ${b.label}. Each one is a step a reader can no longer follow.`)
    say('>')
    for (const [, { display, file }] of missing) say(`> - **${display}** — was in \`${file}\``)
    say()
  } else {
    say(`✅ **No labels lost.** All ${a.labels.size} labels in ${a.label} are present in ${b.label}.`)
    say()
  }

  if (added.length) {
    say(`**${added.length} label${added.length === 1 ? '' : 's'} new in ${b.label}**`)
    say()
    for (const [, { display, file }] of added) say(`- **${display}** — in \`${file}\``)
    say()
  }

  return { missing, added, comparable: true }
}

function sectionStructure(a, b) {
  say('## 3. Structure')
  say()

  const words = (arm, name) => {
    const text = arm.files?.[name]
    return typeof text === 'string' ? wordCount(text) : null
  }
  table(
    ['File (words)', a.label, b.label, 'Δ', '%'],
    GUIDE_FILES.map((name) => {
      const va = words(a, name)
      const vb = words(b, name)
      return [`\`${name}\``, fmt(va), fmt(vb), delta(va, vb), pct(va, vb)]
    }),
  )
  say()

  let droppedAnchors = []
  if (!a.anchors || !b.anchors) {
    say('_Step anchors: `external.md` missing from at least one arm, cannot compare._')
  } else {
    const [sa, sb] = [new Set(a.anchors), new Set(b.anchors)]
    droppedAnchors = [...sa].filter((x) => !sb.has(x))
    const addedAnchors = [...sb].filter((x) => !sa.has(x))
    say(`**Step anchors in \`external.md\`** — ${a.label}: ${sa.size}, ${b.label}: ${sb.size}`)
    say()
    if (droppedAnchors.length) say(`- ❌ dropped in ${b.label}: ${droppedAnchors.map((x) => `\`#${x}\``).join(', ')}`)
    if (addedAnchors.length) say(`- ➕ added in ${b.label}: ${addedAnchors.map((x) => `\`#${x}\``).join(', ')}`)
    if (!droppedAnchors.length && !addedAnchors.length) say(`- ✅ identical anchor set (${sa.size} steps)`)
  }
  say()

  const provLine = (arm) => {
    if (!arm.provenance) return `${arm.label}: — (no \`research.md\`)`
    const scope = arm.provenance.scoped ? '' : ' _(no `## Provenance` heading — counted across the whole file)_'
    return `${arm.label}: ${arm.provenance.urls.length} source URLs${scope}`
  }
  say('**Provenance source URLs in `research.md`**')
  say()
  say(`- ${provLine(a)}`)
  say(`- ${provLine(b)}`)
  say()

  return { droppedAnchors }
}

function sectionProcess(a, b) {
  say('## 4. Process')
  say()

  if (!a.process && !b.process) {
    say('_No run record readable in either arm — process comparison unavailable._')
    say()
    return {}
  }

  const cell = (arm, pick) => (arm.process ? pick(arm.process) : null)
  const str = (v) => (v === null || v === undefined ? '—' : String(v))
  const rows = [
    ['status', str(cell(a, (p) => p.status)), str(cell(b, (p) => p.status))],
    ['rounds', str(cell(a, (p) => p.rounds)), str(cell(b, (p) => p.rounds))],
    ['blockers (all)', str(cell(a, (p) => p.blockers.total)), str(cell(b, (p) => p.blockers.total))],
    ...BLOCKER_TARGETS.map((t) => [
      `blockers → ${t}`,
      str(cell(a, (p) => p.blockers[t])),
      str(cell(b, (p) => p.blockers[t])),
    ]),
    ['blockers → unattributed', str(cell(a, (p) => p.blockers.unattributed)), str(cell(b, (p) => p.blockers.unattributed))],
    ['nits', str(cell(a, (p) => p.nits)), str(cell(b, (p) => p.nits))],
    ['open questions', str(cell(a, (p) => p.openQuestions)), str(cell(b, (p) => p.openQuestions))],
  ]
  table(['Metric', a.label, b.label], rows)
  say()

  for (const arm of [a, b]) {
    if (arm.process && !arm.process.hasHistory) {
      say(`_${arm.label}: run record has no \`history\`, so blocker and nit counts are 0 by absence, not by cleanliness._`)
    }
  }
  say()
  return {}
}

function sectionVerdict(a, b, cost, quality, structure) {
  say('## 5. Verdict')
  say()

  if (!a.present || !b.present) {
    const which = [a, b].filter((arm) => !arm.present).map((arm) => arm.label).join(' and ')
    say(`**No verdict — ${which} ${which.includes('and') ? 'are' : 'is'} missing.** Nothing to compare.`)
    say()
    return
  }

  const parts = []
  const costsKnown = cost.reported && isNum(cost.costA) && isNum(cost.costB)
  let cheaper = costsKnown && cost.costB < cost.costA
  if (!costsKnown) {
    parts.push('has no reported cost')
  } else {
    const change = cost.costA === 0 ? null : ((cost.costB - cost.costA) / cost.costA) * 100
    const swing = change === null ? '' : ` (${change > 0 ? '+' : ''}${change.toFixed(0)}%)`
    parts.push(`cost ${fmtUsd(cost.costB)} vs ${fmtUsd(cost.costA)}${swing}`)
  }

  if (!cost.reported || typeof cost.totalA !== 'number' || typeof cost.totalB !== 'number') {
    parts.push('has no reported token usage')
  } else if (cost.totalA === cost.totalB) {
    parts.push('used the same tokens')
  } else {
    const change = ((cost.totalB - cost.totalA) / cost.totalA) * 100
    if (!costsKnown) cheaper = change < 0
    parts.push(`used ${Math.abs(change).toFixed(0)}% ${change < 0 ? 'fewer' : 'more'} tokens`)
  }

  if (!quality.comparable) parts.push('UI labels could not be compared')
  else {
    parts.push(`lost ${quality.missing.length} UI label${quality.missing.length === 1 ? '' : 's'}`)
    if (quality.added.length) parts.push(`added ${quality.added.length} new`)
  }

  const dropped = structure.droppedAnchors?.length ?? 0
  if (dropped) parts.push(`dropped ${dropped} step anchor${dropped === 1 ? '' : 's'}`)

  const [ra, rb] = [a.process?.rounds ?? null, b.process?.rounds ?? null]
  if (typeof ra === 'number' && typeof rb === 'number') {
    if (ra === rb) parts.push(`converged in the same rounds (${rb})`)
    else parts.push(`needed ${rb} round${rb === 1 ? '' : 's'} vs ${ra}`)
  }

  const sa = a.process?.status ?? null
  const sb = b.process?.status ?? null
  if (sa && sb && sa !== sb) parts.push(`status \`${sb}\` vs \`${sa}\``)

  say(`**${b.label} ${parts.join(', ')}.**`)
  say()

  const failures = []
  if (quality.missing?.length) failures.push('labels lost')
  if (structure.droppedAnchors?.length) failures.push('anchors dropped')
  if (failures.length) {
    const bought = cheaper ? ' The saving was bought with fidelity.' : ''
    say(`⚠️ Not a clean win: ${failures.join(' and ')}.${bought}`)
  }
  say()
}

// --------------------------------------------------------------------- main

function main() {
  const slug = process.argv[2]
  if (!slug || slug.startsWith('-')) {
    console.error('usage: node tools/experiment/compare-arms.mjs <slug>')
    console.error(`reads ${RESULTS}/<slug>-a and <slug>-b`)
    return 2
  }

  if (!isDir(RESULTS)) {
    console.error(`No results directory at ${RESULTS} — run both arms first.`)
    return 1
  }

  const a = loadArm(slug, 'a')
  const b = loadArm(slug, 'b')

  say(`# Arm comparison — \`${slug}\``)
  say()
  for (const arm of [a, b]) {
    const record = arm.recordName ? `\`${arm.recordName}\`` : '_no run record_'
    const note = arm.meta && typeof arm.meta === 'object'
      ? Object.entries(arm.meta)
          .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : ''
    say(`- **${arm.label}** — \`${arm.present ? arm.dir : arm.dir + ' (missing)'}\`, ${record}${note ? ` · ${note}` : ''}`)
  }
  say()
  armStatusNotes([a, b])

  const cost = sectionCost(a, b)
  const quality = sectionQuality(a, b)
  const structure = sectionStructure(a, b)
  sectionProcess(a, b)
  sectionVerdict(a, b, cost, quality, structure)

  console.log(out.join('\n'))
  return a.present && b.present ? 0 : 1
}

process.exitCode = main()
