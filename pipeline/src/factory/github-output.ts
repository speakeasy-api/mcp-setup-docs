import { appendFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

function write(block: string): void {
  const path = process.env.GITHUB_OUTPUT
  if (path) appendFileSync(path, block)
  else process.stdout.write(block)
}

/** Append a single key=value to GITHUB_OUTPUT (or stdout when unset, for local). */
export function setOutput(name: string, value: string): void {
  if (/[\r\n]/.test(value)) {
    throw new Error(
      `GITHUB_OUTPUT scalar "${name}" must not contain CR/LF (got ${JSON.stringify(value.slice(0, 80))})`,
    )
  }
  write(`${name}=${value}\n`)
}

/**
 * Multiline GitHub Actions output using a random delimiter so model/issue
 * text cannot terminate the block early (fixed `EOF` was injectable).
 */
export function setMultilineOutput(name: string, value: string): void {
  let delim = `ghadelim_${randomUUID().replace(/-/g, '')}`
  // Extremely unlikely, but guarantee the delimiter is absent from the value.
  while (value.includes(delim)) {
    delim = `ghadelim_${randomUUID().replace(/-/g, '')}`
  }
  write(`${name}<<${delim}\n${value}\n${delim}\n`)
}
