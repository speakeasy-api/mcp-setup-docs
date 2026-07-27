export type MatchingPr = {
  number: number
  url: string
  body: string
  author: { login: string }
  headRefName: string
}

export type MatchingRef = {
  ref: string
  object: { sha: string }
}

export type PreflightInput = {
  issueNumber: string
  /** Open PRs that already Closes/Fixes/Resolves #N (collaborator-filtered later). */
  matchingPrs: MatchingPr[]
  /** Whether each author login is a repo collaborator. */
  isCollaborator: (login: string) => boolean
  /** Remote refs under heads/guide/issue-N- */
  orphanRefs: MatchingRef[]
  /** Optional committer date lookup for orphan branch tie-break. */
  committerDate?: (sha: string) => string | undefined
}

export type PreflightResult = {
  refused: boolean
  refused_pr_url: string
  resume: boolean
  resume_pr_url: string
  resume_pr_number: string
  resume_branch: string
  log?: string
}

function branchFromRef(ref: string): string {
  return ref.replace(/^refs\/heads\//, '')
}

/**
 * Pure preflight decision: resume factory PR/branch vs refuse human PR.
 * Side-effect-free for unit tests.
 */
export function decidePreflight(input: PreflightInput): PreflightResult {
  const prefix = `guide/issue-${input.issueNumber}-`
  let resume = false
  let resume_pr_url = ''
  let resume_pr_number = ''
  let resume_branch = ''
  let refused = false
  let refused_pr_url = ''
  let log: string | undefined

  for (const pr of input.matchingPrs) {
    const author = pr.author.login
    if (!input.isCollaborator(author)) continue
    const head = pr.headRefName
    if (head.startsWith(prefix)) {
      resume = true
      resume_pr_url = pr.url
      resume_pr_number = String(pr.number)
      resume_branch = head
      break
    }
    refused = true
    refused_pr_url = pr.url
    break
  }

  if (!resume && !refused) {
    const refs = input.orphanRefs
    if (refs.length === 1) {
      resume = true
      resume_branch = branchFromRef(refs[0]!.ref)
      log = `Resuming from orphan factory branch ${resume_branch} (no open PR)`
    } else if (refs.length > 1) {
      let best = ''
      let bestDate = ''
      for (const row of refs) {
        const b = branchFromRef(row.ref)
        const sha = row.object.sha
        if (!b || !sha) continue
        const date = input.committerDate?.(sha) ?? ''
        if (date && (!bestDate || date > bestDate)) {
          best = b
          bestDate = date
        }
      }
      if (best) {
        resume = true
        resume_branch = best
        log = `Resuming from newest orphan factory branch ${resume_branch} (${refs.length} matches)`
      }
    }
  }

  return {
    refused,
    refused_pr_url,
    resume,
    resume_pr_url,
    resume_pr_number,
    resume_branch,
    log,
  }
}

/** Filter gh pr list JSON to PRs that Closes/Fixes/Resolves #N. */
export function filterClosingPrs(
  prs: MatchingPr[],
  issueNumber: string,
): MatchingPr[] {
  const re = new RegExp(`(closes|fixes|resolves)\\s+#${issueNumber}\\b`, 'i')
  return prs.filter((p) => re.test(p.body ?? ''))
}
