import { readdirSync, statSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PATHS } from '../paths.ts'

/** Newest retro/runs/*-{slug}.json by mtime, or undefined. */
export function newestRunRecord(workspace: string, slug: string): string | undefined {
  const dir = join(workspace, PATHS.retroRunsDir)
  if (!existsSync(dir)) return undefined
  const suffix = `-${slug}.json`
  const matches = readdirSync(dir)
    .filter((f) => f.endsWith(suffix))
    .map((f) => join(dir, f))
    .map((p) => ({ p, mtime: statSync(p).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  return matches[0]?.p
}

export function copyRunRecordToTemp(recordPath: string, dest: string): void {
  copyFileSync(recordPath, dest)
}
