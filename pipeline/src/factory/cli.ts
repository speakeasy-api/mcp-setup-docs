#!/usr/bin/env node
/**
 * Factory CI CLI — GitHub Action step implementations for guide-draft.yml.
 * Agents never commit (I7); this CLI owns labels, git, and PRs.
 */
import { ensureLabels, transitionLabels, cleanupInProgress, refuseNonFactoryPr } from './labels.ts'
import { runPreflight } from './cmd-preflight.ts'
import { runDistill } from './cmd-distill.ts'
import { runDraft } from './cmd-draft.ts'
import {
  runSyncMain,
  runCheckoutResume,
  runCreateBranch,
  runCommitPush,
} from './cmd-git.ts'
import { runOpenPr } from './cmd-pr.ts'
import {
  runCommentResolved,
  runCommentReview,
  runMarkBlocked,
} from './cmd-comments.ts'

const COMMANDS: Record<string, () => void | Promise<void>> = {
  'ensure-labels': ensureLabels,
  preflight: runPreflight,
  refuse: refuseNonFactoryPr,
  'transition-labels': transitionLabels,
  'checkout-resume': runCheckoutResume,
  'sync-main': runSyncMain,
  distill: runDistill,
  'comment-resolved': runCommentResolved,
  'create-branch': runCreateBranch,
  draft: runDraft,
  'commit-push': runCommitPush,
  'open-pr': runOpenPr,
  'comment-review': runCommentReview,
  'mark-blocked': runMarkBlocked,
  cleanup: cleanupInProgress,
}

function usage(): never {
  console.error(`Usage: npm run factory -- <command>

Commands:
  ensure-labels       Create guide:* labels if missing
  preflight           Resume / refuse decision → GITHUB_OUTPUT
  refuse              Comment + block on non-factory PR
  transition-labels   draft/blocked → in-progress
  checkout-resume     Fetch resume branch, checkout, merge main
  sync-main           Merge origin/main into current branch if needed
  distill             Fold comments + resolve-issue → outputs
  comment-resolved    Issue comment with resolved slug/persona
  create-branch       New guide/issue-N-slug or reuse resume
  draft               Run draft-guide; map exit → outcome
  commit-push         Stage guides + retro; commit; push
  open-pr             Create or update PR (with GraphQL retry)
  comment-review      Scope check or Pipeline review on issue
  mark-blocked        Failure comment + guide:blocked
  cleanup             Remove guide:in-progress
`)
  process.exit(64)
}

async function main(): Promise<void> {
  const cmd = process.argv[2]
  if (!cmd || cmd === '--help' || cmd === '-h') usage()
  const fn = COMMANDS[cmd]
  if (!fn) {
    console.error(`Unknown command: ${cmd}`)
    usage()
  }
  await fn()
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
