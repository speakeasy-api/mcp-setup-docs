/**
 * PulseMCP tenant catalog lookup — resolves Speakeasy MCP Catalog presence
 * via the same Sub-Registry API the Control Plane uses.
 *
 * Env (same as tools/pulse-catalog/pull-pulse-catalog.mjs):
 *   PULSE_REGISTRY_KEY     required to run (else skipped)
 *   PULSE_REGISTRY_TENANT  required to run (else skipped)
 *   PULSE_REGISTRY_URL     optional, default https://api.pulsemcp.com
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
  reason?: string
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
    throw new Error(`registry returned ${res.status} for ${url}: ${body}`)
  }
  const data = (await res.json()) as { servers?: ServerEntry[] }
  return data.servers ?? []
}

/**
 * Look up whether the provider appears in the Pulse tenant catalog.
 * Never throws — missing env or HTTP errors yield status skipped.
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
        const name = entry.server?.name
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
        reason: `multiple exact matches: ${exact.map((m) => m.name).join(', ')}`,
      }
    }

    if (entries.length === 0) {
      return { status: 'absent', queries, observedAt, tenant }
    }
    if (entries.length === 1) {
      const match = toMatch(entries[0])
      if (!match) {
        return {
          status: 'absent',
          queries,
          observedAt,
          tenant,
          reason: 'sole hit lacked server.name',
        }
      }
      return {
        status: 'present',
        match,
        queries,
        observedAt,
        tenant,
      }
    }

    return {
      status: 'ambiguous',
      queries,
      observedAt,
      tenant,
      reason: `multiple non-exact hits (${entries.length}): ${entries
        .map((e) => e.server?.name)
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')}`,
    }
  } catch (err) {
    return {
      status: 'skipped',
      queries,
      observedAt,
      tenant,
      reason: (err as Error).message,
    }
  }
}

/** Operator note injected into research/draft assignment. */
export function formatCatalogNote(result: CatalogLookupResult): string {
  const header = `Speakeasy MCP Catalog (Pulse tenant ${result.tenant}, observed ${result.observedAt}): ${result.status}`
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
      `Matched name=${result.match.name}${title}`,
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
