/** Result of probing an MCP server URL for OAuth registration capabilities. */

export type ClientRegistration = 'cimd' | 'dynamic' | 'manual' | 'none'

export type ProbeStep = {
  step: string
  url: string
  status?: number
  ok: boolean
  detail?: string
}

export type ProtectedResourceMetadata = {
  resource?: string
  authorization_servers?: string[]
  scopes_supported?: string[]
  bearer_methods_supported?: string[]
  resource_documentation?: string
  [key: string]: unknown
}

export type AuthorizationServerMetadata = {
  issuer?: string
  authorization_endpoint?: string
  token_endpoint?: string
  registration_endpoint?: string
  client_id_metadata_document_supported?: boolean
  grant_types_supported?: string[]
  code_challenge_methods_supported?: string[]
  token_endpoint_auth_methods_supported?: string[]
  scopes_supported?: string[]
  [key: string]: unknown
}

export type ProbeResult = {
  mcpUrl: string
  /** Whether OAuth-protected-resource metadata was obtained. */
  oauthDiscovered: boolean
  /** How PRM was located, if at all. */
  prmSource:
    | 'www-authenticate'
    | 'well-known-path'
    | 'well-known-root'
    | null
  prmUrl: string | null
  protectedResourceMetadata: ProtectedResourceMetadata | null
  authorizationServerUrl: string | null
  asMetadataUrl: string | null
  authorizationServerMetadata: AuthorizationServerMetadata | null
  cimd: boolean
  dcr: boolean
  /** Preferred client registration path for this AS (CIMD > DCR > manual). */
  clientRegistration: ClientRegistration
  /** Initial MCP POST status, if the request completed. */
  mcpStatus: number | null
  wwwAuthenticate: string | null
  steps: ProbeStep[]
  errors: string[]
}
