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

/** Effective add-server path after overrides + Pulse. */
export type AddServerPath =
  | 'catalog'
  | 'custom-remote'
  | 'dual-conditional'

/** Guide-level speakeasy_add_server (omit/invalid → auto). */
export type SpeakeasyAddServerMode = 'auto' | 'catalog' | 'custom-remote'

export type AddServerPathInput = {
  catalog: CatalogLookupResult
  /** Any remotes[].tenanted: true */
  tenanted: boolean
  /** Guide-level speakeasy_add_server; default auto */
  addServer?: SpeakeasyAddServerMode
}

/**
 * Decision tree:
 * 1. tenanted remotes → Custom remote
 * 2. speakeasy_add_server: custom-remote → Custom remote
 * 3. speakeasy_add_server: catalog → catalog
 * 4. else Pulse present → catalog, absent → custom remote, ambiguous/skipped → dual
 */
export function resolveAddServerPath(opts: AddServerPathInput): AddServerPath {
  if (opts.tenanted) return 'custom-remote'
  const mode = opts.addServer ?? 'auto'
  if (mode === 'custom-remote') return 'custom-remote'
  if (mode === 'catalog') return 'catalog'
  if (opts.catalog.status === 'present' && opts.catalog.match) return 'catalog'
  if (opts.catalog.status === 'present') return 'dual-conditional'
  if (opts.catalog.status === 'absent') return 'custom-remote'
  return 'dual-conditional'
}

/**
 * Stable lock-digest token — effective path (+ match name when catalog).
 * Must not include timestamps, tenants, or volatile reason text.
 */
export function stableCatalogLockNote(
  result: CatalogLookupResult,
  opts?: { tenanted?: boolean; addServer?: SpeakeasyAddServerMode }
): string {
  const path = resolveAddServerPath({
    catalog: result,
    tenanted: opts?.tenanted === true,
    addServer: opts?.addServer,
  })
  if (opts?.tenanted) {
    return 'Speakeasy MCP Catalog: overridden-tenanted'
  }
  if (opts?.addServer === 'custom-remote') {
    return 'Speakeasy MCP Catalog: overridden-custom-remote'
  }
  if (opts?.addServer === 'catalog') {
    if (result.match) {
      return `Speakeasy MCP Catalog: forced-catalog name=${JSON.stringify(result.match.name)}`
    }
    return 'Speakeasy MCP Catalog: forced-catalog'
  }
  if (path === 'catalog' && result.match) {
    return `Speakeasy MCP Catalog: present name=${JSON.stringify(result.match.name)}`
  }
  if (path === 'custom-remote') {
    return 'Speakeasy MCP Catalog: absent'
  }
  return `Speakeasy MCP Catalog: ${result.status}`
}

/** Operator note injected into research/draft assignment (stable across runs). */
export function formatCatalogNote(
  result: CatalogLookupResult,
  opts?: { tenanted?: boolean; addServer?: SpeakeasyAddServerMode }
): string {
  return formatAddServerPathNote({
    catalog: result,
    tenanted: opts?.tenanted === true,
    addServer: opts?.addServer,
  })
}

/**
 * Single source for add-server path instructions (overrides + Pulse).
 */
export function formatAddServerPathNote(opts: AddServerPathInput): string {
  const { catalog, tenanted } = opts
  const addServer = opts.addServer ?? 'auto'
  const path = resolveAddServerPath(opts)
  const queried =
    catalog.queries.length > 0
      ? `Queries: ${catalog.queries.map((q) => JSON.stringify(q)).join(', ')}`
      : 'Queries: (none)'

  if (tenanted) {
    return [
      'Speakeasy MCP Catalog: overridden-tenanted',
      queried,
      'One or more remotes are tenanted (region/instance/org-specific URL).',
      'Render only the Custom remote server add-server path; do not leave catalog presence as an open question.',
    ].join('\n')
  }

  if (addServer === 'custom-remote') {
    return [
      'Speakeasy MCP Catalog: overridden-custom-remote',
      queried,
      'Guide sets speakeasy_add_server: custom-remote (force Custom remote; catalog mapping unreliable or unsuitable).',
      'Render only the Custom remote server add-server path; do not leave catalog presence as an open question.',
    ].join('\n')
  }

  if (addServer === 'catalog') {
    const header = 'Speakeasy MCP Catalog: forced-catalog'
    if (catalog.match) {
      const title = catalog.match.title
        ? ` title=${JSON.stringify(catalog.match.title)}`
        : ''
      return [
        header,
        `Matched name=${JSON.stringify(catalog.match.name)}${title}`,
        queried,
        'Guide sets speakeasy_add_server: catalog.',
        'Render only the catalog add-server path; do not leave catalog presence as an open question.',
      ].join('\n')
    }
    return [
      header,
      queried,
      'Guide sets speakeasy_add_server: catalog.',
      'Render only the catalog add-server path; do not leave catalog presence as an open question.',
    ].join('\n')
  }

  const header = `Speakeasy MCP Catalog: ${catalog.status}`

  switch (path) {
    case 'catalog': {
      if (!catalog.match) {
        return [
          header,
          queried,
          'Catalog path resolved without a match record — keep both add-server conditionals and a soft open question.',
        ].join('\n')
      }
      const title = catalog.match.title
        ? ` title=${JSON.stringify(catalog.match.title)}`
        : ''
      return [
        header,
        `Matched name=${JSON.stringify(catalog.match.name)}${title}`,
        queried,
        'Render only the catalog add-server path; do not leave catalog presence as an open question.',
      ].join('\n')
    }
    case 'custom-remote':
      return [
        header,
        queried,
        'Render only the Custom remote server add-server path; do not leave catalog presence as an open question.',
      ].join('\n')
    case 'dual-conditional':
      if (catalog.status === 'ambiguous') {
        return [
          header,
          queried,
          catalog.reason ? `Reason: ${catalog.reason}` : '',
          'Catalog presence is unresolved — keep both add-server conditionals and a soft open question.',
        ]
          .filter(Boolean)
          .join('\n')
      }
      return [
        header,
        queried,
        catalog.reason ? `Reason: ${catalog.reason}` : '',
        'Pulse lookup unavailable — keep both add-server conditionals and a soft open question.',
      ]
        .filter(Boolean)
        .join('\n')
  }
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
