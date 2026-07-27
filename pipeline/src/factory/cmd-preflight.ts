import { gh, ghSoft } from './gh.ts'
import { setOutput } from './github-output.ts'
import { issueNumber, ghRepo } from './env.ts'
import {
  decidePreflight,
  filterClosingPrs,
  type MatchingPr,
  type MatchingRef,
} from './preflight.ts'

export function runPreflight(): void {
  const n = issueNumber()
  const repo = ghRepo()
  console.error(`factory: preflight for issue #${n} in ${repo}`)

  const list = gh([
    'pr',
    'list',
    '--state',
    'open',
    '--search',
    `in:body "#${n}"`,
    '--json',
    'number,url,body,author,headRefName',
  ])
  let prs: MatchingPr[] = []
  try {
    prs = JSON.parse(list.stdout || '[]') as MatchingPr[]
  } catch {
    prs = []
  }
  const matching = filterClosingPrs(prs, n)
  console.error(`factory: preflight — ${matching.length} open PR(s) closing #${n}`)

  const isCollaborator = (login: string): boolean => {
    const r = ghSoft(['api', `repos/${repo}/collaborators/${login}`, '--silent'])
    return r.code === 0
  }

  let orphanRefs: MatchingRef[] = []
  const refsRes = ghSoft([
    'api',
    `repos/${repo}/git/matching-refs/heads/guide/issue-${n}-`,
  ])
  if (refsRes.code === 0 && refsRes.stdout) {
    try {
      orphanRefs = JSON.parse(refsRes.stdout) as MatchingRef[]
    } catch {
      orphanRefs = []
    }
  }

  const committerDate = (sha: string): string | undefined => {
    const r = ghSoft(['api', `repos/${repo}/git/commits/${sha}`, '--jq', '.committer.date'])
    return r.code === 0 ? r.stdout.trim() || undefined : undefined
  }

  const result = decidePreflight({
    issueNumber: n,
    matchingPrs: matching,
    isCollaborator,
    orphanRefs,
    committerDate,
  })

  if (result.log) console.error(result.log)
  console.error(
    `factory: preflight → resume=${result.resume} refused=${result.refused}` +
      (result.resume_branch ? ` branch=${result.resume_branch}` : ''),
  )

  setOutput('refused', String(result.refused))
  setOutput('refused_pr_url', result.refused_pr_url)
  setOutput('resume', String(result.resume))
  setOutput('resume_pr_url', result.resume_pr_url)
  setOutput('resume_pr_number', result.resume_pr_number)
  setOutput('resume_branch', result.resume_branch)
}
