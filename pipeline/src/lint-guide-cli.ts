#!/usr/bin/env node
/**
 * CLI: lint one or more guide directories for I4 grammar + meta schema.
 * Usage: tsx src/lint-guide-cli.ts [--json] <slug-or-path>…
 * Exit 0 if clean, 1 if findings, 2 on usage error.
 */
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintGuide, type LintFinding } from './lint-guide.ts'

function defaultRepoRoot(): string {
  // pipeline/src → repo root
  return resolve(dirname(fileURLToPath(import.meta.url)), '../..')
}

function usage(): never {
  console.error(
    'Usage: npm run lint-guide -- [--json] <slug|guides/<slug>|path>…'
  )
  process.exit(2)
}

function resolveGuideDir(repoRoot: string, arg: string): string {
  if (existsSync(join(arg, 'external.md')) || existsSync(join(arg, 'meta.yaml'))) {
    return resolve(arg)
  }
  const underGuides = join(repoRoot, 'guides', arg)
  if (existsSync(underGuides)) return underGuides
  const asGuidesPath = join(repoRoot, arg)
  if (existsSync(asGuidesPath)) return asGuidesPath
  console.error(`No guide directory for "${arg}"`)
  process.exit(2)
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.length === 0) usage()
  let json = false
  const targets: string[] = []
  for (const a of argv) {
    if (a === '--json') json = true
    else if (a === '--help' || a === '-h') usage()
    else targets.push(a)
  }
  if (targets.length === 0) usage()

  const repoRoot = defaultRepoRoot()
  let total = 0
  const all: { guide: string; findings: LintFinding[] }[] = []

  for (const t of targets) {
    const dir = resolveGuideDir(repoRoot, t)
    const findings = lintGuide(dir, repoRoot)
    total += findings.length
    all.push({ guide: dir, findings })
  }

  if (json) {
    console.log(JSON.stringify(all, null, 2))
  } else {
    for (const { guide, findings } of all) {
      const slug = guide.split(/[/\\]/).pop()
      if (findings.length === 0) {
        console.log(`${slug}: ok`)
        continue
      }
      console.log(`${slug}: ${findings.length} finding(s)`)
      for (const f of findings) {
        console.log(
          `  [${f.severity}] ${f.target} ${f.where}: ${f.problem}`
        )
        console.log(`    → ${f.suggestion}`)
      }
    }
  }

  process.exit(total > 0 ? 1 : 0)
}

main()
