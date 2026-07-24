#!/usr/bin/env node
import { probeMcpOAuth } from './discover.ts'
import type { ProbeResult } from './types.ts'

function usage(): never {
  console.error(`Usage:
  npm run probe -- <mcp-url> [--json]

Discover OAuth Protected Resource + Authorization Server metadata for an
MCP server URL (same path first-class clients use), then report whether
the AS advertises CIMD and/or DCR.

Options:
  --json    Print the full ProbeResult as JSON
  --help    Show this help

Examples:
  npm run probe -- https://mcp.hubspot.com
  npm run probe -- https://mcp.box.com --json
  mise run probe-mcp-oauth -- https://mcp.hubspot.com
`)
  process.exit(64)
}

function parseArgs(argv: string[]): { url: string; json: boolean } {
  let json = false
  const positionals: string[] = []
  for (const a of argv) {
    if (a === '--help' || a === '-h') usage()
    if (a === '--json') {
      json = true
      continue
    }
    if (a.startsWith('-')) {
      console.error(`Unknown option: ${a}`)
      usage()
    }
    positionals.push(a)
  }
  if (positionals.length !== 1) usage()
  const url = positionals[0]!
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('URL must be http(s)')
    }
  } catch {
    console.error(`Invalid MCP URL: ${url}`)
    process.exit(64)
  }
  return { url, json }
}

function formatHuman(r: ProbeResult): string {
  const lines: string[] = []
  lines.push(`MCP:  ${r.mcpUrl}`)
  if (r.mcpStatus !== null) {
    lines.push(`POST: ${r.mcpStatus}${r.wwwAuthenticate ? `  WWW-Authenticate: ${r.wwwAuthenticate}` : ''}`)
  }
  if (!r.oauthDiscovered) {
    lines.push(`auth: not discovered`)
    for (const e of r.errors) lines.push(`  ! ${e}`)
    lines.push(`CIMD: unknown`)
    lines.push(`DCR:  unknown`)
    lines.push(`→ client_registration: ${r.clientRegistration}`)
    return lines.join('\n')
  }

  lines.push(`auth: oauth (PRM via ${r.prmSource})`)
  lines.push(`PRM:  ${r.prmUrl}`)
  const as = r.authorizationServerMetadata!
  lines.push(
    `AS:   ${r.authorizationServerUrl}  (via ${r.asMetadataUrl})`,
  )
  if (as.issuer) lines.push(`      issuer: ${as.issuer}`)
  if (as.authorization_endpoint) {
    lines.push(`      authorization_endpoint: ${as.authorization_endpoint}`)
  }
  if (as.token_endpoint) {
    lines.push(`      token_endpoint: ${as.token_endpoint}`)
  }
  if (as.code_challenge_methods_supported) {
    lines.push(
      `      code_challenge_methods_supported: ${as.code_challenge_methods_supported.join(', ')}`,
    )
  }
  if (as.grant_types_supported) {
    lines.push(
      `      grant_types_supported: ${as.grant_types_supported.join(', ')}`,
    )
  }

  const cimdReason = r.cimd
    ? 'client_id_metadata_document_supported=true'
    : 'client_id_metadata_document_supported absent/false'
  const dcrReason = r.dcr
    ? `registration_endpoint=${as.registration_endpoint}`
    : 'registration_endpoint absent'
  lines.push(`CIMD: ${r.cimd ? 'yes' : 'no'}   (${cimdReason})`)
  lines.push(`DCR:  ${r.dcr ? 'yes' : 'no'}   (${dcrReason})`)
  lines.push(`→ client_registration: ${r.clientRegistration}`)

  if (r.errors.length > 0) {
    lines.push('notes:')
    for (const e of r.errors) lines.push(`  - ${e}`)
  }
  return lines.join('\n')
}

async function main() {
  const { url, json } = parseArgs(process.argv.slice(2))
  const result = await probeMcpOAuth(url)
  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(formatHuman(result))
  }
  // Exit 0 on successful discovery (even if neither CIMD nor DCR);
  // exit 1 if we could not obtain AS metadata.
  process.exit(result.oauthDiscovered ? 0 : 1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
