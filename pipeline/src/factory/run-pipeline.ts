import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot } from './env.ts'

/**
 * Run a pipeline entrypoint with live stdio.
 * Prefer the local `tsx` binary over `npm run` — npm buffers script output
 * when stdout is not a TTY (GitHub Actions), so progress only appears at exit.
 */
export function runPipelineScript(
  scriptRel: string,
  args: string[],
  opts?: { env?: NodeJS.ProcessEnv },
): number {
  const root = repoRoot()
  const pipelineDir = join(root, 'pipeline')
  const tsxBin = join(pipelineDir, 'node_modules', '.bin', 'tsx')
  if (!existsSync(tsxBin)) {
    console.error(`factory: missing ${tsxBin}; run npm ci in pipeline/`)
    return 1
  }
  console.error(`factory: ${scriptRel} ${args.join(' ')}`)
  // Do not set `encoding` with inherit — it can suppress live streaming.
  const r = spawnSync(tsxBin, [scriptRel, ...args], {
    cwd: pipelineDir,
    env: opts?.env ?? process.env,
    stdio: 'inherit',
  })
  if (r.error) {
    console.error(`factory: failed to spawn ${tsxBin}: ${r.error.message}`)
    return 1
  }
  return r.status ?? 1
}
