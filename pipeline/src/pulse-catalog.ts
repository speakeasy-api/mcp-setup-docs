/**
 * PulseMCP tenant catalog lookup — resolves Speakeasy MCP Catalog presence
 * via the same Sub-Registry API the Control Plane uses.
 *
 * Env (same as tools/pulse-catalog/pull-pulse-catalog.mjs):
 *   PULSE_REGISTRY_KEY     required to run (else skipped)
 *   PULSE_REGISTRY_TENANT  required to run (else skipped)
 *   PULSE_REGISTRY_URL     optional, default https://api.pulsemcp.com
 *
 * Notes written for agents/locks are stable across runs for the same
 * status+match (no per-run timestamps) so pipeline.lock.json digests still
 * skip. Verbose tenant/time/error detail stays in the workflow log.
 */

export type CatalogMatch = {
  name: string
  title?: string
}

export type CatalogLookupStatus =
  | 'present'
  | 'absent'
  | 'ambiguous'
  | 'skipped'

export type CatalogLookupResult = {
  status: CatalogLookupStatus
  match?: CatalogMatch
  queries: string[]
  observedAt: string
  tenant: string
  /** Safe for notes/locks — no registry response bodies or server-name dumps. */
  reason?: string
  /** Verbose detail for logs only (may include HTTP bodies). */
  logDetail?: string
}

type ServerEntry = {
  server?: {
    name?: string
    title?: string
  }
}

const DEFAULT_BASE = 'https://api.pulsemcp.com'
const SEARCH_LIMIT = 30

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Distinct search strings: provider display name, then slug with hyphens → spaces. */
export function buildCatalogQueries(provider: string, slug: string): string[] {
  const queries: string[] = []
  const p = provider.trim()
  if (p) queries.push(p)
  const fromSlug = slug.replace(/-/g, ' ').trim()
  if (fromSlug && fromSlug.toLowerCase() !== p.toLowerCase()) {
    queries.push(fromSlug)
  }
  return queries
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-')
}

/** Exact title, full registry name, or last name segment vs query. */
export function isExactCatalogMatch(
  entry: ServerEntry,
  query: string
): boolean {
  const name = (entry.server?.name ?? '').trim()
  const title = (entry.server?.title ?? '').trim()
  const qNorm = normalizeKey(query)
  if (!qNorm) return false

  if (title && normalizeKey(title) === qNorm) return true
  if (name && name.toLowerCase() === query.trim().toLowerCase()) return true
  if (name && normalizeKey(name) === qNorm) return true

  const lastSeg = name.split('/').pop() ?? ''
  if (lastSeg && normalizeKey(lastSeg) === qNorm) return true

  return false
}

function toMatch(entry: ServerEntry): CatalogMatch | undefined {
  const name = entry.server?.name?.trim()
  if (!name) return undefined
  const title = entry.server?.title?.trim()
  return title ? { name, title } : { name }
}

async function searchServers(
  baseUrl: string,
  tenant: string,
  apiKey: string,
  query: string
): Promise<ServerEntry[]> {
  const url = new URL('/v0.1/servers', baseUrl)
  url.searchParams.set('version', 'latest')
  url.searchParams.set('limit', String(SEARCH_LIMIT))
  url.searchParams.set('search', query)

  const res = await fetch(url, {
    headers: { 'X-Tenant-ID': tenant, 'X-API-Key': apiKey },
  })
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500)
    const err = new Error(`HTTP ${res.status}`) as Error & { logDetail?: string }
    err.logDetail = `registry returned ${res.status} for ${url}: ${body}`
    throw err
  }
  const data = (await res.json()) as { servers?: ServerEntry[] }
  if (!Array.isArray(data.servers)) {
    const err = new Error('malformed registry response') as Error & {
      logDetail?: string
    }
    err.logDetail = 'registry JSON missing servers array'
    throw err
  }
  return data.servers
}

/**
 * Look up whether the provider appears in the Pulse tenant catalog.
 * Never throws — missing env or HTTP errors yield status skipped.
 * Only exact title/name matches yield present; a sole fuzzy hit is ambiguous.
 */
export async function lookupCatalogPresence(opts: {
  provider: string
  slug: string
  env?: NodeJS.ProcessEnv
}): Promise<CatalogLookupResult> {
  const env = opts.env ?? process.env
  const observedAt = nowIso()
  const tenant = (env.PULSE_REGISTRY_TENANT ?? '').trim()
  const apiKey = (env.PULSE_REGISTRY_KEY ?? '').trim()
  const baseUrl = (env.PULSE_REGISTRY_URL ?? DEFAULT_BASE).replace(/\/$/, '')
  const queries = buildCatalogQueries(opts.provider, opts.slug)

  if (!apiKey || !tenant) {
    return {
      status: 'skipped',
      queries,
      observedAt,
      tenant: tenant || '(unset)',
      reason: !apiKey
        ? 'PULSE_REGISTRY_KEY is not set'
        : 'PULSE_REGISTRY_TENANT is not set',
    }
  }

  if (queries.length === 0) {
    return {
      status: 'skipped',
      queries,
      observedAt,
      tenant,
      reason: 'no provider or slug to search',
    }
  }

  try {
    const byName = new Map<string, ServerEntry>()
    for (const q of queries) {
      const page = await searchServers(baseUrl, tenant, apiKey, q)
      for (const entry of page) {
        const name = entry.server?.name?.trim()
        if (!name || byName.has(name)) continue
        byName.set(name, entry)
      }
    }

    const entries = [...byName.values()]
    const exact: CatalogMatch[] = []
    const seenExact = new Set<string>()
    for (const entry of entries) {
      for (const q of queries) {
        if (!isExactCatalogMatch(entry, q)) continue
        const m = toMatch(entry)
        if (!m || seenExact.has(m.name)) continue
        seenExact.add(m.name)
        exact.push(m)
      }
    }

    if (exact.length === 1) {
      return {
        status: 'present',
        match: exact[0],
        queries,
        observedAt,
        tenant,
      }
    }
    if (exact.length > 1) {
      return {
        status: 'ambiguous',
        queries,
        observedAt,
        tenant,
        reason: `multiple exact matches (${exact.length})`,
      }
    }

    if (entries.length === 0) {
      return { status: 'absent', queries, observedAt, tenant }
    }

    // Non-exact hits only — never promote a sole fuzzy hit to present.
    return {
      status: 'ambiguous',
      queries,
      observedAt,
      tenant,
      reason: `non-exact search hits (${entries.length}); no exact title/name match`,
    }
  } catch (err) {
    const e = err as Error & { logDetail?: string }
    const http = /^HTTP (\d+)$/.exec(e.message)
    return {
      status: 'skipped',
      queries,
      observedAt,
      tenant,
      reason: http
        ? `registry request failed (HTTP ${http[1]})`
        : 'registry request failed',
      logDetail: e.logDetail || e.message,
    }
  }
}

/**
 * Stable lock-digest token — status + match name only.
 * Must not include timestamps, tenants, or volatile reason text.
 */
export function stableCatalogLockNote(result: CatalogLookupResult): string {
  if (result.status === 'present' && result.match) {
    return `Speakeasy MCP Catalog: present name=${JSON.stringify(result.match.name)}`
  }
  return `Speakeasy MCP Catalog: ${result.status}`
}

/** Operator note injected into research/draft assignment (stable across runs). */
export function formatCatalogNote(result: CatalogLookupResult): string {
  const header = `Speakeasy MCP Catalog: ${result.status}`
  const queried =
    result.queries.length > 0
      ? `Queries: ${result.queries.map((q) => JSON.stringify(q)).join(', ')}`
      : 'Queries: (none)'

  if (result.status === 'present' && result.match) {
    const title = result.match.title
      ? ` title=${JSON.stringify(result.match.title)}`
      : ''
    return [
      header,
      `Matched name=${JSON.stringify(result.match.name)}${title}`,
      queried,
      'Render only the catalog add-server path; do not leave catalog presence as an open question.',
    ].join('\n')
  }

  if (result.status === 'absent') {
    return [
      header,
      queried,
      'Render only the Custom remote server add-server path; do not leave catalog presence as an open question.',
    ].join('\n')
  }

  if (result.status === 'ambiguous') {
    return [
      header,
      queried,
      result.reason ? `Reason: ${result.reason}` : '',
      'Catalog presence is unresolved — keep both add-server conditionals and a soft open question.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    header,
    queried,
    result.reason ? `Reason: ${result.reason}` : '',
    'Pulse lookup unavailable — keep both add-server conditionals and a soft open question.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Merge catalog note into existing operator notes. */
export function mergeCatalogNotes(
  existing: string | undefined,
  catalogNote: string
): string {
  const base = (existing || '').trim()
  if (!base) return catalogNote
  return `${base}\n\n${catalogNote}`
}
