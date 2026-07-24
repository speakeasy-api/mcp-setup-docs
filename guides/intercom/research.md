---
research_version: 1
slug: intercom
researched_at: 2026-07-24T19:28:08Z
---

# Intercom — Research Dossier

Source ruling for this guide: Intercom's developer guide **Model Context
Protocol (MCP)** is authoritative for regional endpoints, transport,
authentication choices, and required permissions. The Intercom Help Center
corroborates how to identify a workspace's region. Live endpoint observations
establish the OAuth discovery behavior. Public Speakeasy AI Control Plane
source at commit `f1d60da92f71315297941d7ee394a8d3241b1043` establishes the
dynamic-registration controls needed because the canonical Speakeasy setup
does not yet describe this variant.

## Server facts

- **Remote URLs:** choose the endpoint matching the Intercom workspace:
  - US: `https://mcp.intercom.com/mcp`
  - EU: `https://mcp.eu.intercom.com/mcp`
  Intercom says `app.intercom.com` identifies a US-hosted workspace and
  `app.eu.intercom.com` identifies an EU-hosted workspace.
- **Region availability:** the server is available for US- and EU-hosted
  workspaces. Australian-hosted workspaces are not supported. Requests to the
  EU endpoint are processed within the EU.
- **Transport:** `streamable-http`, called **Streamable HTTP** by Intercom and
  recommended over the deprecated SSE endpoints.
- **Authentication Option documented by this Guide:** Intercom's recommended
  automatic browser-based OAuth flow with Dynamic Client Registration (DCR).
  No Intercom developer app, Client ID, Client Secret, access token, or
  callback registration is created manually.
  - Intercom also supports a Bearer access token, but this Guide does not use
    it. Intercom's general authentication guidance says an Access Token is for
    a private app accessing its own workspace, must be treated like a
    password, and must not be given to a third-party app provider. OAuth is
    therefore the safer documented path for the Speakeasy AI Control Plane.
  - Live US authorization-server metadata at
    `https://mcp.intercom.com/.well-known/oauth-authorization-server`
    advertises issuer `https://mcp.intercom.com`, authorization endpoint
    `https://mcp.intercom.com/authorize`, token endpoint
    `https://mcp.intercom.com/token`, registration endpoint
    `https://mcp.intercom.com/register`, authorization-code and refresh-token
    grants, `client_secret_basic`, `client_secret_post`, and `none` token
    endpoint authentication, plus PKCE `plain` and `S256`.
  - The EU metadata publishes the equivalent values on
    `https://mcp.eu.intercom.com`.
  - Both MCP endpoints return HTTP 401 to an unauthenticated initialize
    request. Their `WWW-Authenticate` challenges do not advertise
    `resource_metadata` or `auth_server_metadata`, and both origin- and
    path-style protected-resource metadata URLs return 404.
- **Speakeasy discovery consequence:** automatic authentication setup and
  **Use Discovered** currently require protected-resource metadata, so they do
  not activate for Intercom. The supported route is **Configure Manually**,
  enter the regional issuer origin, then click **Discover**. That discovery
  reads the authorization-server metadata directly and exposes
  **Dynamic Client Registration (DCR)**. Thus the Speakeasy AI Control Plane
  can discover Intercom's authorization-server metadata without
  protected-resource metadata only after the issuer URL is supplied; it does
  not infer that issuer automatically from the Intercom MCP endpoint.
- **Permissions requested by the MCP server:** **Read and list users and
  companies**, **Read conversations**, and **Read and write articles**.
  Intercom documents these as the permissions an access token needs for the
  server's contact/company, conversation, and Help Center article operations.
  The dynamic OAuth path has no manual scope field to complete; leave
  **Scope (override)** empty in the Speakeasy AI Control Plane.
- **Authorization model:** Intercom says authentication verifies the user's
  permissions. The public MCP documentation does not name an administrator
  role or plan tier required to authorize the server. No MCP-specific plan gate
  is documented.

## Credential flow

No provider-side credential is created. The Speakeasy AI Control Plane
dynamically registers itself at the regional Intercom registration endpoint
when the operator attaches the identity provider.

Per region, the values used in the Speakeasy AI Control Plane are:

| Value | Origin |
| --- | --- |
| Remote MCP server URL | The regional endpoint selected in {#identify-workspace-region} |
| Issuer URL | The origin of that endpoint: `https://mcp.intercom.com` for US or `https://mcp.eu.intercom.com` for EU |
| Client type | **Dynamic Client Registration (DCR)**, offered after **Discover** reads the regional authorization-server metadata |

`{{ gram.oauth.callback_url }}` is not pasted into Intercom. DCR sends the
Speakeasy callback automatically during client registration. Leave
**Scope (override)** and **Audience (optional)** empty; neither Intercom nor
its live metadata documents a value to enter.

When an MCP client first needs Intercom access, Intercom's recommended OAuth
path opens a browser so the signed-in user can authorize access. The provider
documentation says the browser flow is automatic, but does not document the
screen sequence or its exact button labels. Access remains subject to the
authorizing user's Intercom permissions.

## Console walkthrough

There is no Intercom Developer Hub or admin-console preparation for the
recommended dynamic OAuth path. The only provider-side decision before adding
the server is selecting the endpoint that matches the workspace's hosted
region.

### Identify the workspace region {#identify-workspace-region}

- Open the intended Intercom workspace and inspect its browser URL.
- If the host is `app.intercom.com`, record the US remote
  `https://mcp.intercom.com/mcp` and issuer
  `https://mcp.intercom.com`.
- If the host is `app.eu.intercom.com`, record the EU remote
  `https://mcp.eu.intercom.com/mcp` and issuer
  `https://mcp.eu.intercom.com`.
- If the host is `app.au.intercom.com`, stop: Intercom says the MCP server is
  not yet supported for Australian-hosted workspaces.
- Values copied: the matching remote URL and issuer URL for the Speakeasy
  setup below.
- Screenshot exception: the only relevant state is the workspace hostname in
  the browser address bar; no Intercom MCP settings screen exists for this
  authentication path.

## Speakeasy setup

Canonical source: `docs/speakeasy-setup.md`, observed
`2026-07-24T19:28:08Z`.

Per-guide values:

- Remote URL: the US or EU URL selected in
  {#identify-workspace-region}
- Transport: `streamable-http` (the add form's **Transport** field is
  read-only)
- Authentication Option: OAuth with dynamic client registration
- Provider credential fields: none
- Provider callback registration: none; DCR registers the callback
  automatically
- Provider scopes to type: none; leave **Scope (override)** empty
- Further reading:
  `https://developers.intercom.com/docs/guides/mcp`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On **Add a custom remote MCP server**, paste
the regional remote URL selected in {#identify-workspace-region} into
**Remote MCP server URL**, then click **Add server**. This creates the hosted
MCP server and opens its **Overview** page.

Screenshot note: capture the **Add Source** menu and, for the deterministic
regional path, the **Add a custom remote MCP server** page with the matching
Intercom remote URL.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings** and locate
**Authentication**.

Intercom does not publish protected-resource metadata. **Use Discovered** is
therefore unavailable; click **Configure Manually**. In **Attach Remote
Identity Provider**:

1. Enter the regional issuer origin from {#identify-workspace-region} in
   **Issuer URL**.
2. Keep the auto-derived **Slug** and optional **Display name (optional)**,
   unless project naming policy requires different values.
3. Under **Endpoints**, click **Discover**. The regional authorization,
   token, and registration endpoints are filled from Intercom's RFC 8414
   metadata.
4. Under **Session Client**, keep **Client Type** set to **Dynamic Client
   Registration (DCR)**. DCR is the first and default choice when a
   registration endpoint is discovered.
5. Keep **Token Endpoint Auth Method** at the discovered default
   `client_secret_basic`.
6. Leave **Scope (override)** and **Audience (optional)** empty.
7. Click **Attach Identity Provider**. The Speakeasy AI Control Plane
   dynamically registers the OAuth client with Intercom; there is no Client ID
   or Client Secret to paste.

Screenshot note: capture **Attach Remote Identity Provider** after
**Discover**, showing the regional issuer and endpoints plus **Client Type**
set to **Dynamic Client Registration (DCR)**. No secret values are present.

When a client initiates Intercom access, complete the browser-based Intercom
authorization using the intended workspace account. Public Intercom
documentation says to use the on-screen OAuth prompts but does not publish
their exact labels.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Intercom's MCP documentation at
https://developers.intercom.com/docs/guides/mcp."

## Open questions

- **Catalog handling for US versus EU.** Public Speakeasy product source does
  not reveal the runtime Intercom catalog record or whether its install dialog
  offers both regional remotes. Until confirmed, the custom-remote route is the
  only documented way to guarantee that the selected endpoint matches the
  workspace region.
- **Intercom authorization-screen labels.** Intercom documents an automatic
  browser OAuth flow and says the user authorizes access, but publishes no
  MCP-specific screenshot, screen sequence, or exact button labels. The Guide
  must say to complete the on-screen prompts without inventing a label.

## Provenance

Source inventory from the sweep:

- **Developer documentation — `developers.intercom.com`:** primary MCP and
  OAuth documentation. `https://developers.intercom.com/llms.txt` exists and
  was searched this run.
- **Product/admin support — `www.intercom.com/help/en`:** regional-hosting and
  account-permission articles. `/help/en/llms.txt` returned 404; targeted
  search was used.
- **Official GitHub documentation mirror —
  `github.com/intercom/intercom-mcp-server`:** found in the sweep but not used
  for current facts because its README is stale: it says US only and lists an
  older, smaller server surface, while the live developer guide adds EU.
- **Speakeasy public product source — `github.com/speakeasy-api/gram`:**
  consulted only for Speakeasy-side dynamic OAuth behavior and exact labels
  absent from `docs/speakeasy-setup.md`.

Sources drawn from:

- `https://developers.intercom.com/docs/guides/mcp` ("Model Context Protocol
  (MCP)") — observed `2026-07-24T19:28:08Z`. Backs US/EU availability and
  endpoint mapping, Australian exclusion, Streamable HTTP recommendation,
  deprecated SSE alternatives, automatic OAuth recommendation, Bearer-token
  alternative, required permissions, and automatic browser authentication.
- `https://developers.intercom.com/llms.txt` — observed
  `2026-07-24T19:28:08Z`. Backs developer-property sweep coverage.
- `https://developers.intercom.com/docs/build-an-integration/learn-more/authentication`
  ("Authentication") — observed `2026-07-24T19:28:08Z`. Backs the distinction
  between private-app Access Tokens and OAuth, the Developer Hub token path,
  and warnings to treat Access Tokens as passwords and not give them to
  third-party app providers.
- `https://developers.intercom.com/docs/build-an-integration/learn-more/authentication/setting-up-oauth`
  ("Setting up OAuth") — observed `2026-07-24T19:28:08Z`. Backs general
  Intercom OAuth permission behavior and regional authorization-host behavior;
  its manually registered public-app flow is not the MCP DCR path.
- `https://www.intercom.com/help/en/articles/6124430-regional-data-hosting`
  ("Regional Data Hosting") — observed `2026-07-24T19:28:08Z`. Corroborates
  workspace-host mapping for US, EU, and Australia.
- `https://mcp.intercom.com/mcp` and
  `https://mcp.eu.intercom.com/mcp` — direct unauthenticated GET and JSON-RPC
  initialize observations at `2026-07-24T19:28:08Z`. Both returned HTTP 401
  with a Bearer challenge lacking protected-resource and authorization-server
  metadata pointers.
- `https://mcp.intercom.com/.well-known/oauth-authorization-server` and
  `https://mcp.eu.intercom.com/.well-known/oauth-authorization-server` —
  observed `2026-07-24T19:28:08Z`. Back regional issuers, authorization/token/
  registration endpoints, grants, endpoint-authentication methods, and PKCE.
- `https://mcp.intercom.com/.well-known/oauth-protected-resource`,
  `https://mcp.intercom.com/.well-known/oauth-protected-resource/mcp`,
  and EU equivalents — observed `2026-07-24T19:28:08Z`; all returned 404.
- `docs/speakeasy-setup.md` — observed `2026-07-24T19:28:08Z`. Backs the
  canonical Speakeasy-side skeleton, fixed anchors, and exact common labels.
- `https://github.com/speakeasy-api/gram/tree/f1d60da92f71315297941d7ee394a8d3241b1043/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication`
  — observed `2026-07-24T19:28:08Z`. `AuthenticationSetupActions.tsx`,
  `AuthenticationSection.tsx`, `AttachRemoteIdentityProviderSheet.tsx`,
  `IssuerFormFields.tsx`, `issuerFormUtils.ts`, and
  `useIssuerDiscovery.ts` back **Use Discovered**, **Configure Manually**,
  **Issuer URL**, **Discover**, the endpoint fields, **Client Type**,
  **Dynamic Client Registration (DCR)** defaulting, the token-endpoint
  authentication default, overrides, and **Attach Identity Provider**.
- `https://github.com/speakeasy-api/gram/blob/f1d60da92f71315297941d7ee394a8d3241b1043/client/dashboard/src/pages/sources/remote-mcp/autoConfigureAuth.ts`
  — observed `2026-07-24T19:28:08Z`. Backs that automatic authentication
  configuration first requires protected-resource metadata and silently skips
  when none is found.
