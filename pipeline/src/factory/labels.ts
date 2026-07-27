import { issueNumber } from './env.ts'
import { gh, issueComment, issueEdit } from './gh.ts'

const LABELS = [
  { name: 'guide:draft', color: '1D76DB', desc: 'Trigger guide draft factory' },
  { name: 'guide:in-progress', color: 'FBCA04', desc: 'Guide draft factory running' },
  { name: 'guide:blocked', color: 'D73A4A', desc: 'Guide draft factory blocked' },
] as const

export function ensureLabels(): void {
  const listed = gh(['label', 'list', '--limit', '100', '--json', 'name', '--jq', '.[].name'])
  const existing = new Set(listed.stdout.split('\n').filter(Boolean))
  for (const l of LABELS) {
    if (existing.has(l.name)) continue
    gh(['label', 'create', l.name, '--color', l.color, '--description', l.desc])
  }
}

export function transitionLabels(): void {
  const n = issueNumber()
  issueEdit(n, ['--remove-label', 'guide:draft'])
  issueEdit(n, ['--remove-label', 'guide:blocked'])
  gh(['issue', 'edit', n, '--add-label', 'guide:in-progress'])
}

export function cleanupInProgress(): void {
  issueEdit(issueNumber(), ['--remove-label', 'guide:in-progress'])
}

export function refuseNonFactoryPr(): void {
  const n = issueNumber()
  const url = process.env.REFUSED_PR_URL || ''
  issueEdit(n, ['--remove-label', 'guide:draft'])
  issueEdit(n, ['--add-label', 'guide:blocked'])
  issueComment(
    n,
    `Refused to run: ${url} already targets this issue and is not a factory branch (\`guide/issue-${n}-*\`). Close it or finish that PR first, then re-add \`guide:draft\`.`,
  )
}

export function addBlockedLabel(): void {
  issueEdit(issueNumber(), ['--add-label', 'guide:blocked'])
}
