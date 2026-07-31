// Check 14: does a regenerated guide sit inside the envelope of the 7
// pure-bot reference guides? Outside is a flag for a human, not a failure.
import { readFileSync, existsSync } from 'node:fs'

const ROOT = '/home/walker/github.com/speakeasy-api/mcp-setup-docs/.claude/worktrees/sandcastle-factory'
const SNAPSHOT = '/tmp/claude-501/-home-walker-github-com-speakeasy-api-mcp-setup-docs/5fd6fe7d-c9cd-4bed-b8ee-98dff5882d38/scratchpad/before-google-calendar'

const REFERENCES = [
  'google-calendar', 'google-docs', 'google-drive', 'google-people',
  'google-sheets', 'google-slides', 'x-docs',
]

type Stats = {
  externalLines: number
  externalWords: number
  researchLines: number
  speakeasyLines: number
  metaLines: number
  anchors: number
  h3Sections: number
  setupSteps: number
}

function read(dir: string, name: string): string {
  const p = `${dir}/${name}`
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

function stats(dir: string): Stats {
  const external = read(dir, 'external.md')
  return {
    externalLines: external.split('\n').length,
    externalWords: external.split(/\s+/).filter(Boolean).length,
    researchLines: read(dir, 'research.md').split('\n').length,
    speakeasyLines: read(dir, 'speakeasy.md').split('\n').length,
    metaLines: read(dir, 'meta.yaml').split('\n').length,
    anchors: (external.match(/\{#[a-z0-9-]+\}/g) ?? []).length,
    h3Sections: (external.match(/^### /gm) ?? []).length,
    // Ordered steps the reader performs, the closest proxy for setup burden.
    setupSteps: (external.match(/^\d+\. /gm) ?? []).length,
  }
}

const KEYS = Object.keys(stats(SNAPSHOT)) as (keyof Stats)[]

// google-calendar's reference values come from the pre-run snapshot, since the
// working tree copy is the thing being regenerated.
const refs = REFERENCES.map((slug) => ({
  slug,
  s: stats(slug === 'google-calendar' ? SNAPSHOT : `${ROOT}/guides/${slug}`),
}))

console.log('=== 7 pure-bot reference guides ===')
console.log(['guide'.padEnd(17), ...KEYS.map((k) => k.padStart(15))].join(''))
for (const { slug, s } of refs) {
  console.log([slug.padEnd(17), ...KEYS.map((k) => String(s[k]).padStart(15))].join(''))
}

function envelopeOf(from: typeof refs) {
  return Object.fromEntries(
    KEYS.map((k) => {
      const vals = from.map((r) => r.s[k]).sort((a, b) => a - b)
      return [k, { min: vals[0]!, max: vals[vals.length - 1]! }]
    })
  ) as Record<keyof Stats, { min: number; max: number }>
}

const wide = envelopeOf(refs)
// x-docs is a no-setup provider: 14 lines, 0 setup steps. Keeping it in
// stretches externalLines to 14..140, which almost anything satisfies. For a
// setup-heavy guide the honest comparison is against the other six.
const core = envelopeOf(refs.filter((r) => r.slug !== 'x-docs'))

console.log('\n=== envelope (all 7) vs (6, excluding the x-docs outlier) ===')
for (const k of KEYS) {
  console.log(
    `  ${k.padEnd(16)} all7 ${String(wide[k].min).padStart(4)}..${String(wide[k].max).padEnd(5)}` +
      `  core6 ${String(core[k].min).padStart(4)}..${core[k].max}`
  )
}

const envelope = core

const candidateDir = process.argv[2]
if (candidateDir) {
  const c = stats(candidateDir)
  console.log(`\n=== candidate: ${candidateDir} ===`)
  let outside = 0
  for (const k of KEYS) {
    const { min, max } = envelope[k]
    const inside = c[k] >= min && c[k] <= max
    if (!inside) outside++
    console.log(
      `  ${k.padEnd(16)} ${String(c[k]).padStart(6)}  ${inside ? 'inside' : 'OUTSIDE'} (${min}..${max})`
    )
  }
  console.log(outside === 0 ? '\nENVELOPE: all metrics inside' : `\nENVELOPE: ${outside} metric(s) outside — flag for a human`)
}
