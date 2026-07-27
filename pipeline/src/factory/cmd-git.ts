import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { configureBotIdentity, git, gitSoft } from './git.ts'
import { setOutput } from './github-output.ts'
import { writeFailureReason } from './failure-reason.ts'
import { issueNumber, githubWorkspace } from './env.ts'
import { PATHS } from '../paths.ts'

function root(): string {
  return githubWorkspace()
}

export function runSyncMain(): void {
  const cwd = root()
  git(['fetch', 'origin', 'main'], { cwd })
  const ancestor = gitSoft(['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], cwd)
  if (ancestor.code === 0) {
    console.log('Resume branch already contains origin/main')
    return
  }
  configureBotIdentity(cwd)
  git(
    [
      'merge',
      'origin/main',
      '--no-edit',
      '-m',
      'Merge main into factory resume branch (workflow sync)',
    ],
    { cwd },
  )
}

/** After checkout of main + preflight resume: switch to resume branch. */
export function runCheckoutResume(): void {
  const branch = process.env.RESUME_BRANCH
  if (!branch) throw new Error('RESUME_BRANCH is not set')
  const cwd = root()
  git(['fetch', 'origin', branch], { cwd })
  git(['checkout', '-B', branch, `origin/${branch}`], { cwd })
  runSyncMain()
}

export function runCreateBranch(): void {
  const cwd = root()
  configureBotIdentity(cwd)
  const resume = process.env.RESUME === 'true'
  const resumeBranch = process.env.RESUME_BRANCH || ''
  if (resume) {
    setOutput('name', resumeBranch)
    console.log(`Resuming on ${resumeBranch}`)
    return
  }
  const slug = process.env.SLUG
  if (!slug) throw new Error('SLUG is not set')
  const branch = `guide/issue-${issueNumber()}-${slug}`
  setOutput('name', branch)
  git(['checkout', '-b', branch], { cwd })
}

export function runCommitPush(): void {
  const branch = process.env.BRANCH
  const slug = process.env.SLUG
  const outcome = process.env.OUTCOME || ''
  if (!branch || !slug) throw new Error('BRANCH and SLUG are required')

  const cwd = root()

  gitSoft(['add', `guides/${slug}/`], cwd)

  const retroDir = join(cwd, PATHS.retroRunsDir)
  if (existsSync(retroDir)) {
    const suffix = `-${slug}.json`
    const files = readdirSync(retroDir)
      .filter((f) => f.endsWith(suffix))
      .map((f) => join(PATHS.retroRunsDir, f))
    if (files.length) git(['add', ...files], { cwd })
  }

  const cached = gitSoft(['diff', '--cached', '--quiet'], cwd)
  if (cached.code === 0) {
    // No staged changes — resume after PR-create flake or lock skip.
    const remote = gitSoft(
      ['ls-remote', '--exit-code', 'origin', `refs/heads/${branch}`],
      cwd,
    )
    if (remote.code === 0) {
      console.log(`No new guide changes; keeping existing tip of ${branch}`)
      setOutput('pushed', 'true')
      return
    }
    writeFailureReason('No guide or run-record changes to commit')
    process.exit(1)
  }

  let msg = `Draft guide: ${slug} (issue #${issueNumber()})`
  if (outcome === 'awaiting_scope') {
    msg = `Research (awaiting scope): ${slug} (issue #${issueNumber()})`
  }
  git(['commit', '-m', msg], { cwd })
  git(['push', '--force-with-lease', 'origin', branch], { cwd })
  setOutput('pushed', 'true')
}
