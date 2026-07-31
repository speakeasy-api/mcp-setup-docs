// Check 12: do google-calendar's recorded input digests still match the tree?
import { readFileSync } from 'node:fs'
import { digestRepoFile } from '../src/lock.ts'

const ROOT = '/home/walker/github.com/speakeasy-api/mcp-setup-docs/.claude/worktrees/sandcastle-factory'
const lock = JSON.parse(readFileSync(ROOT + '/guides/google-calendar/pipeline.lock.json', 'utf8'))

let checked = 0
let drifted = 0
for (const [step, rec] of Object.entries<any>(lock.steps)) {
  for (const entry of rec.inputs.reading_list) {
    const now = digestRepoFile(ROOT, entry.path)
    checked++
    if (now.digest !== entry.digest) {
      drifted++
      console.log(`DRIFT  ${step}  ${entry.path}`)
      console.log(`       recorded ${entry.digest}`)
      console.log(`       now      ${now.digest}`)
    }
  }
}
console.log(`\nchecked ${checked} reading_list entries across ${Object.keys(lock.steps).length} steps`)
console.log(drifted === 0 ? 'CHECK 12: PASS — inputs are equivalent today' : `CHECK 12: FAIL — ${drifted} drifted`)
