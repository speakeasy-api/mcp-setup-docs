import type {
  AuthorizationServerMetadata,
  ClientRegistration,
  ProbeResult,
  ProbeStep,
  ProtectedResourceMetadata,
} from './types.ts'

const PROTOCOL_VERSION = '2025-11-25'

const INITIALIZE_BODY = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'mcp-oauth-probe', version: '0.1.0' },
  },
})

/** RFC9728 / MCP: insert `/.well-known/<name>` before the issuer/resource path. */
export function wellKnownWithPathInsertion(
  resourceOrIssuerUrl: string,
  wellKnownName: string,
): string {
  const u = new URL(resourceOrIssuerUrl)
  const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')
  u.pathname = `/.well-known/${wellKnownName}${path}`
  u.search = ''
  u.hash = ''
  return u.href
}

export function wellKnownAtRoot(
  resourceOrIssuerUrl: string,
  wellKnownName: string,
): string {
  const u = new URL(resourceOrIssuerUrl)
  u.pathname = `/.well-known/${wellKnownName}`
  u.search = ''
  u.hash = ''
  return u.href
}

/** OpenID path-appending form: `{issuer}/.well-known/openid-configuration`. */
export function oidcAppended(issuerUrl: string): string {
  const u = new URL(issuerUrl)
  const basePath = u.pathname.replace(/\/$/, '')
  u.pathname = `${basePath}/.well-known/openid-configuration`
  u.search = ''
  u.hash = ''
  return u.href
}

/**
 * Parse `resource_metadata` from a WWW-Authenticate header (RFC9728 §5.1).
 * Handles Bearer challenges with quoted or bare parameter values.
 */
export function parseResourceMetadataUrl(
  wwwAuthenticate: string | null,
): string | null {
  if (!wwwAuthenticate) return null
  // Match resource_metadata="..." or resource_metadata=...
  const m = wwwAuthenticate.match(
    /resource_metadata\s*=\s*(?:"([^"]+)"|([^\s,]+))/i,
  )
  return m?.[1] ?? m?.[2] ?? null
}

function issuerHasPath(issuerUrl: string): boolean {
  const path = new URL(issuerUrl).pathname
  return path !== '/' && path !== ''
}

/** AS metadata discovery URLs in MCP client priority order. */
export function authorizationServerMetadataCandidates(
  issuerUrl: string,
): string[] {
  if (issuerHasPath(issuerUrl)) {
    return [
      wellKnownWithPathInsertion(issuerUrl, 'oauth-authorization-server'),
      wellKnownWithPathInsertion(issuerUrl, 'openid-configuration'),
      oidcAppended(issuerUrl),
    ]
  }
  return [
    wellKnownAtRoot(issuerUrl, 'oauth-authorization-server'),
    wellKnownAtRoot(issuerUrl, 'openid-configuration'),
  ]
}

/** PRM well-known fallbacks when WWW-Authenticate has no resource_metadata. */
export function protectedResourceMetadataCandidates(mcpUrl: string): string[] {
  const pathInserted = wellKnownWithPathInsertion(
    mcpUrl,
    'oauth-protected-resource',
  )
  const root = wellKnownAtRoot(mcpUrl, 'oauth-protected-resource')
  // If MCP is at root, path-inserted === root; dedupe.
  return pathInserted === root ? [root] : [pathInserted, root]
}

async function fetchJson(
  url: string,
  init: RequestInit,
  steps: ProbeStep[],
  step: string,
): Promise<{ status: number; json: unknown | null; headers: Headers }> {
  try {
    const res = await fetch(url, {
      ...init,
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    })
    const contentType = res.headers.get('content-type') ?? ''
    let json: unknown | null = null
    if (contentType.includes('json')) {
      try {
        json = await res.json()
      } catch {
        json = null
      }
    } else {
      // Some servers return JSON without a content-type; try anyway on 2xx.
      const text = await res.text()
      if (res.ok && text.trim().startsWith('{')) {
        try {
          json = JSON.parse(text)
        } catch {
          json = null
        }
      }
    }
    steps.push({
      step,
      url,
      status: res.status,
      ok: res.ok,
      detail: res.ok ? undefined : res.statusText,
    })
    return { status: res.status, json, headers: res.headers }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    steps.push({ step, url, ok: false, detail })
    throw err
  }
}

function classifyRegistration(
  as: AuthorizationServerMetadata | null,
  oauthDiscovered: boolean,
): { cimd: boolean; dcr: boolean; clientRegistration: ClientRegistration } {
  if (!oauthDiscovered || !as) {
    return { cimd: false, dcr: false, clientRegistration: 'none' }
  }
  const cimd = as.client_id_metadata_document_supported === true
  const dcr =
    typeof as.registration_endpoint === 'string' &&
    as.registration_endpoint.length > 0
  // MCP client priority: CIMD before DCR when both advertised.
  let clientRegistration: ClientRegistration = 'manual'
  if (cimd) clientRegistration = 'cimd'
  else if (dcr) clientRegistration = 'dynamic'
  return { cimd, dcr, clientRegistration }
}

export async function probeMcpOAuth(mcpUrlInput: string): Promise<ProbeResult> {
  const mcpUrl = new URL(mcpUrlInput).href.replace(/\/$/, '') || mcpUrlInput
  const steps: ProbeStep[] = []
  const errors: string[] = []

  let mcpStatus: number | null = null
  let wwwAuthenticate: string | null = null
  let prmSource: ProbeResult['prmSource'] = null
  let prmUrl: string | null = null
  let protectedResourceMetadata: ProtectedResourceMetadata | null = null
  let authorizationServerUrl: string | null = null
  let asMetadataUrl: string | null = null
  let authorizationServerMetadata: AuthorizationServerMetadata | null = null

  // 1. Unauthenticated MCP initialize
  try {
    const res = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: INITIALIZE_BODY,
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    })
    mcpStatus = res.status
    wwwAuthenticate = res.headers.get('www-authenticate')
    // Drain body so the connection can close cleanly.
    await res.arrayBuffer().catch(() => undefined)
    steps.push({
      step: 'mcp-initialize',
      url: mcpUrl,
      status: res.status,
      ok: res.status === 401 || res.ok,
      detail:
        res.status === 401
          ? 'unauthorized (expected for protected servers)'
          : res.statusText,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    errors.push(`MCP initialize failed: ${detail}`)
    steps.push({ step: 'mcp-initialize', url: mcpUrl, ok: false, detail })
  }

  // 2. Protected Resource Metadata
  const headerPrm = parseResourceMetadataUrl(wwwAuthenticate)
  const prmCandidates: { url: string; source: NonNullable<ProbeResult['prmSource']> }[] =
    []
  if (headerPrm) {
    prmCandidates.push({ url: headerPrm, source: 'www-authenticate' })
  }
  for (const url of protectedResourceMetadataCandidates(mcpUrl)) {
    if (!prmCandidates.some((c) => c.url === url)) {
      prmCandidates.push({
        url,
        source:
          url === wellKnownAtRoot(mcpUrl, 'oauth-protected-resource')
            ? 'well-known-root'
            : 'well-known-path',
      })
    }
  }

  for (const candidate of prmCandidates) {
    try {
      const { status, json } = await fetchJson(
        candidate.url,
        { method: 'GET', headers: { Accept: 'application/json' } },
        steps,
        'protected-resource-metadata',
      )
      if (status >= 200 && status < 300 && json && typeof json === 'object') {
        protectedResourceMetadata = json as ProtectedResourceMetadata
        prmUrl = candidate.url
        prmSource = candidate.source
        break
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      errors.push(`PRM fetch ${candidate.url}: ${detail}`)
    }
  }

  if (!protectedResourceMetadata) {
    errors.push('No Protected Resource Metadata found')
  } else {
    const servers = protectedResourceMetadata.authorization_servers
    if (Array.isArray(servers) && servers.length > 0 && typeof servers[0] === 'string') {
      authorizationServerUrl = servers[0]
    } else {
      // Some deployments omit authorization_servers and co-locate AS at the resource.
      const resource =
        typeof protectedResourceMetadata.resource === 'string'
          ? protectedResourceMetadata.resource
          : mcpUrl
      authorizationServerUrl = resource
      errors.push(
        'PRM missing authorization_servers; falling back to resource URL as issuer',
      )
    }
  }

  // 3. Authorization Server Metadata
  if (authorizationServerUrl) {
    for (const url of authorizationServerMetadataCandidates(authorizationServerUrl)) {
      try {
        const { status, json } = await fetchJson(
          url,
          { method: 'GET', headers: { Accept: 'application/json' } },
          steps,
          'authorization-server-metadata',
        )
        if (status >= 200 && status < 300 && json && typeof json === 'object') {
          authorizationServerMetadata = json as AuthorizationServerMetadata
          asMetadataUrl = url
          break
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err)
        errors.push(`AS metadata fetch ${url}: ${detail}`)
      }
    }
    if (!authorizationServerMetadata) {
      errors.push(
        `No Authorization Server Metadata found for issuer ${authorizationServerUrl}`,
      )
    }
  }

  const oauthDiscovered = protectedResourceMetadata !== null
  const { cimd, dcr, clientRegistration } = classifyRegistration(
    authorizationServerMetadata,
    oauthDiscovered && authorizationServerMetadata !== null,
  )

  return {
    mcpUrl,
    oauthDiscovered: oauthDiscovered && authorizationServerMetadata !== null,
    prmSource,
    prmUrl,
    protectedResourceMetadata,
    authorizationServerUrl,
    asMetadataUrl,
    authorizationServerMetadata,
    cimd,
    dcr,
    clientRegistration,
    mcpStatus,
    wwwAuthenticate,
    steps,
    errors,
  }
}
