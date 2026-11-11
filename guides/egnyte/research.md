---
research_version: 1
slug: egnyte
researched_at: "2026-11-11T00:13:00Z"
---

# Egnyte — Research Dossier

Source ruling for this Guide: Egnyte's developer portal page **Remote MCP
Server** is the primary source for the endpoint, transport, OAuth flow, and
plan list. The Egnyte Helpdesk article **Egnyte MCP Server - Overview** is the
primary source for the admin console path that allows MCP clients, because it
is the current product/admin documentation for that screen. Related Helpdesk
articles supply the allowed-apps change note, tool access controls, and AI
Safeguards. Live endpoint and OAuth metadata corroborate the endpoint and
establish Dynamic Client Registration (DCR) support. Observed `2026-11-11`.

## Server facts

- **Remote URL:** `https://mcp-server.egnyte.com/mcp`. The developer page
  says: "Use this URL when configuring any MCP-compatible AI client to connect
  to your Egnyte domain." It is one shared URL for every Egnyte domain; the
  user picks their domain during sign-in, so the remote is not tenanted.
- **Transport:** `streamable-http`. Egnyte's Claude Code example uses
  `claude mcp add --transport http egnyte https://mcp-server.egnyte.com/mcp`,
  and the official MCP registry entry `com.egnyte/mcp-server` lists the remote
  as `streamable-http`.
- **Authentication Option documented here:** OAuth 2.0 with dynamic client
  registration. Egnyte: "Any AI client that supports the Model Context
  Protocol with OAuth 2.0 authentication can connect to the Egnyte MCP Server.
  Configure your client with the server URL ... and follow the standard OAuth
  authentication flow." No Egnyte developer key, client ID, or client secret
  is created for this option.
- **OAuth discovery (probed 2026-11-11):** an unauthenticated JSON-RPC
  `initialize` POST to `https://mcp-server.egnyte.com/mcp` returns HTTP 401
  with `WWW-Authenticate: Bearer
  resource_metadata="https://mcp-server.egnyte.com/.well-known/oauth-protected-resource"`.
  That protected-resource metadata (PRM) names resource
  `https://mcp-server.egnyte.com/mcp`, bearer method `header`, and one
  authorization server, the path issuer
  `https://mcp-oauth.egnyte.com/egnyte-connect`. The PRM has no
  `scopes_supported`. The issuer's metadata at
  `https://mcp-oauth.egnyte.com/.well-known/oauth-authorization-server/egnyte-connect`
  advertises `registration_endpoint` `https://mcp-oauth.egnyte.com/clients`,
  authorization endpoint
  `https://mcp-oauth.egnyte.com/external/oauth2/authorize/egnyte-connect`,
  token endpoint `https://mcp-oauth.egnyte.com/egnyte-connect/oauth2/token`,
  grant types `authorization_code` and `refresh_token`, PKCE `S256`, and
  token endpoint auth methods `client_secret_basic` and `client_secret_post`.
  It does not advertise `client_id_metadata_document_supported` (no CIMD) and
  has no `scopes_supported`. The remote MCP URL is not the issuer.
- **Access model:** "All data access is limited to files and folders the
  authenticated user has permission to access in Egnyte." Access tokens are
  "managed automatically by the MCP server and refreshed as needed."
- **Plan gate (sources differ):** the developer page lists "Gen 4: Essential,
  Elite, or Ultimate" and "Gen 3: Platform Team, Platform Business, Platform
  Enterprise Lite, or Platform Enterprise on AFS (Advanced File System) or CFS
  (Cloud File System)". The Helpdesk overview says the feature is available
  for "Essential, Elite, and Ultimate plans OR Platform Enterprise or
  Enterprise Lite plans with the AI Add-on purchased", and separately lists the
  reduced tool set for Platform plans. Both agree that Gen 3 Platform plans
  without the AI Add-On get only `list_filesystem_by_path`, `advanced_search`,
  `get_file_content`, `get_upload_url`, `get_download_url`, and `whoami`. The
  Guide does not pick between the plan lists; it tells the admin how to check
  availability on the domain (the **MCP Server** page is visible) and what the
  unavailable error says.
- **Standing requirements:** an Egnyte domain on an eligible plan; "An active
  Egnyte domain with appropriate administrative access"; "OAuth 2.0 enabled for
  the Egnyte domain"; users "must have valid Egnyte accounts and permissions
  for the content they intend to access". Tool access controls state "Only
  administrators can view and change Tool access settings", and the allowed-apps
  controls are described as admin controls.
- **Organization control that blocks first connection:** an Egnyte admin
  controls which MCP clients may connect. "ChatGPT, Claude, Microsoft Copilot,
  Gemini Enterprise and Local AI Apps are checked by default." Other web-based
  clients need either a custom allowed app with their redirect URLs or the
  **Other web-based AI Apps (unverified)** option, which is "disabled by
  default" and "highly permissive". The Guide uses the custom allowed app.
- **Speakeasy MCP Catalog:** gram `main` has no seeded Egnyte entry in
  `server/internal/mcpregistry/oktaseed/oktaseed.go`, and no Pulse lookup was
  available to this run. The Guide sets `speakeasy_add_server: custom-remote`
  so the reader always takes the **Hosted remotely** path with the shared URL
  above, which needs no catalog entry.
- **Registry identity:** the official MCP registry lists
  `com.egnyte/mcp-server` ("Egnyte Remote MCP Server", status active) with the
  same remote URL; recorded as the Guide's alias.

## Credential flow

The selected Authentication Option creates no Egnyte credentials. The
Speakeasy AI Control Plane follows the remote's PRM to the path issuer
`https://mcp-oauth.egnyte.com/egnyte-connect` and registers its own client
through the advertised registration endpoint (**Auto-Configure**; the issuer
advertises DCR only, so no registration method choice applies).

Egnyte only lets allowed apps connect. Before anyone connects, an Egnyte
administrator adds a custom allowed app whose redirect URL is the Speakeasy
callback `{{ gram.oauth.callback_url }}`. Egnyte's instructions for a custom
app: "Enter the client name (required), description (optional), and redirect
URLs (required). Redirect URLs differ depending on the application and must
be taken from that app's documentation." The paste locus is that custom app's
redirect URL field, during External setup.

At first use, the person is redirected to Egnyte's authorization page, enters
their Egnyte domain, signs in with their Egnyte credentials, and approves the
requested permissions ("Enter your Egnyte domain and authenticate with your
credentials"; "Review and approve the requested permissions").

## Console walkthrough

The admin signs in to the Egnyte domain with an administrator account and
opens **Settings**. The Helpdesk overview gives the path "Settings -> AI
Powered Features -> MCP Server". A Helpdesk release note says the MCP server
settings "are now present under the AI Powered Features section of Admin
settings" and were previously under **Configuration -> AI**. The articles do
not show where the **Settings** entry sits in the Egnyte web interface; the
Writer names **Settings** without placing it.

### Allow Speakeasy to connect {#allow-speakeasy-app}

- Navigation: **Settings** > **AI Powered Features** > **MCP Server**.
- Availability check: "If the MCP Server page is visible, MCP Server is
  available for the domain. If the MCP Server page is not visible, MCP Server
  is not available for the domain." Domains without the feature return
  "MCP Server Access Unavailable: MCP Server connectivity is not enabled for
  your domain. Contact your account executive or Egnyte Support to enable this
  feature."
- Toggle: admins "can enable or disable the toggle for **Allow external LLM
  clients to connect to Egnyte via MCP**". It must be on.
- Add the custom app: "To add a custom app, click **Add**. Enter the client
  name (required), description (optional), and redirect URLs (required)....
  Click on **Save**." Values entered: client name `Speakeasy AI Control
  Plane` (any recognizable name; Egnyte requires one); description optional;
  redirect URL `{{ gram.oauth.callback_url }}`. Egnyte does not publish the
  exact field labels in the dialog; the Writer uses the documented field
  names (client name, description, redirect URLs) without bolding them as
  labels.
- After save: "The custom app will then be present on the list." Egnyte does
  not say whether a new custom app is selected by default, so the Guide tells
  the admin to make sure it is selected among the allowed apps before saving
  the page.
- Save the settings page: "Click on **Save changes**. If any of the default
  allowed apps are unchecked, an additional confirmation to revoke app access
  will appear. Click on **Revoke & Save** to confirm." The Guide tells the
  admin to leave the other allowed apps as they are, so this confirmation
  should not appear; if it does, an allowed app was unchecked.
- Do not enable **Other web-based AI Apps (unverified)**; the custom app is
  the scoped alternative.
- Screenshot note: **Settings** > **AI Powered Features** > **MCP Server**
  with **Allow external LLM clients to connect to Egnyte via MCP** on and the
  allowed-apps list showing the Speakeasy custom app; a second capture of the
  custom-app dialog with the client name and redirect URL filled in.
- Recovery on first connection:
  - If AI Safeguards block the client, "the client displays an error
    indicating that access is restricted. In this case, the administrator must
    update the AI Safeguards configuration to allow the client." AI Safeguards
    policies are "managed in Settings -> Configuration -> AI -> AI Safeguards
    section." Egnyte does not document the exact change that allows one client,
    so the Guide points the admin to that section without prescribing clicks.
  - Tool access on the same **MCP Server** page can be **Public** (default) or
    **Restricted**. "Switching to Restricted with no users or groups in the
    list removes MCP Server tools from every non-admin user right away." If
    users connect but see no tools, the admin checks **Tool access** on this
    page.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
observed `2026-11-11`.

Per-guide values:

- Remote URL: `https://mcp-server.egnyte.com/mcp` (shared public URL, not
  tenanted)
- `speakeasy_add_server`: `custom-remote`; no Speakeasy-seeded Egnyte catalog
  entry and no Pulse lookup, so only the **Hosted remotely** path is rendered
- Authentication Option: OAuth, no provider credentials. Identity mode:
  **User Identity**
- Probe outcome: 401 with a `resource_metadata` challenge, so **Hosted
  remotely** preselects **User Identity** after **Verify connectivity**
- PRM issuer: `https://mcp-oauth.egnyte.com/egnyte-connect`
- CIMD / DCR: DCR advertised (`registration_endpoint`
  `https://mcp-oauth.egnyte.com/clients`); CIMD not advertised. Anonymous DCR
  was not exercised, to avoid registering a client at Egnyte from research
- Registration choice: **Auto-Configure** (dashboard default when DCR is
  advertised); creation normally configures the identity, so the credential
  section is a confirmation plus the fallback
- Scope: none entered. **Auto-Configure** has no **Scope** control; neither
  the PRM nor the issuer advertises scopes
- External credential fields: none. External governance step:
  {#allow-speakeasy-app}
- Server Availability: rendered as a conditional final step when creation
  left the server **Disabled**
- Further reading:
  `https://developers.egnyte.com/integration/cfs/api-docs/remote-mcp-server`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **Hosted
remotely**. On **New remote MCP server**, paste
`https://mcp-server.egnyte.com/mcp` into **MCP server URL**. Optionally enter
**Display name (optional)**. Leave **User session issuer** at its default.
Click **Verify connectivity**. After verification succeeds, keep the
preselected **User Identity**, leave **Guardrails** off, then click **Save**.
This creates the server and opens its **Overview** page.

On save, Speakeasy configures the identity provider and registers a client
automatically. When that cannot complete, the server is kept **Disabled** and
the result says to finish setup in **Settings > Identity**.

Screenshot note: **New remote MCP server** with the Egnyte URL and **User
Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. When
creation already configured the identity, confirm **User Identity**, the
`https://mcp-oauth.egnyte.com/egnyte-connect` provider, and
**Auto-Configure**, and keep only the Server Availability step. Otherwise:
select **User Identity**; under **Choose an identity provider**, confirm the
preselected provider is `https://mcp-oauth.egnyte.com/egnyte-connect` (a new
one is badged **Will be created**), or open the picker (**Search identity
providers…**) and choose it; keep **Auto-Configure**; click **Save**. There is
no **Client ID** or secret to paste. If the server shows **Disabled**, open
**Settings > Danger Zone > Server Availability** and turn on **Enable MCP
server** so it shows **Enabled**.

When a person first uses the server, Egnyte's authorization page asks for
their Egnyte domain, then their Egnyte credentials, then approval of the
requested permissions. If Egnyte rejects the connection, recheck
{#allow-speakeasy-app}.

Screenshot note: **Settings > Identity** with **User Identity** selected, the
Egnyte provider, and **Auto-Configure**; values redacted.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Egnyte's MCP documentation at
https://developers.egnyte.com/integration/cfs/api-docs/remote-mcp-server."

## Research limitations

- Egnyte does not document how it matches a dynamically registered client to
  an allowed app. Speakeasy's DCR registration lists several redirect URIs
  (`/oauth/callback`, `/mcp/remote_login_callback`,
  `/x/mcp/remote_login_callback` on the deployment origin) and authorizes with
  the canonical `/mcp/remote_login_callback`, which is what
  `{{ gram.oauth.callback_url }}` renders. Whether Egnyte accepts the
  connection when the custom app lists only that callback was not verified by
  a live connection.
- Anonymous DCR against `https://mcp-oauth.egnyte.com/clients` was not
  exercised, so acceptance of Speakeasy's registration request is inferred
  from the advertised metadata only.
- The exact field labels in the custom-app dialog, and whether a newly added
  custom app is selected in the allowed-apps list by default, are not
  published.
- Where **Settings** sits in the Egnyte web interface is not shown in the
  cited articles.
- The two plan lists differ (see Server facts). The Guide relies on the
  **MCP Server** page visibility check instead.
- Egnyte notes binary transfers need the AI client's sandbox to reach
  `*.egnyte.com`. That applies to client-side code execution and is outside
  setup for the Speakeasy AI Control Plane; not rendered.
- The authorization page's labels were not captured beyond Egnyte's
  description (domain, credentials, permission approval).

## Operator decisions

None

## Provenance

Source inventory from the sweep:

- **Developer documentation — `developers.egnyte.com`:** the **Remote MCP
  Server** page (endpoint, OAuth flow, plans, tools, rate limits).
  `/llms.txt` returned the portal's HTML shell, not an index.
- **Support KB — `helpdesk.egnyte.com`:** MCP Server overview, allowed-apps
  release note, tool access controls, AI Safeguards overview and admin guide,
  and the release note on settings moving to **AI Powered Features**.
  `/llms.txt` returned 404.
- **Marketing site — `www.egnyte.com`:** `/llms.txt` is a general company
  index; not drawn from.
- **Official MCP registry — `registry.modelcontextprotocol.io`:** the
  `com.egnyte/mcp-server` entry.
- **Live service metadata — `mcp-server.egnyte.com` and
  `mcp-oauth.egnyte.com`:** endpoint challenge, PRM, and issuer metadata.
- **Speakeasy product source — `speakeasy-api/gram` `main`:** catalog seed
  (no Egnyte entry), the remote-session callback path, and RFC 8414
  path-inserted issuer discovery.

Sources drawn from:

- `https://developers.egnyte.com/integration/cfs/api-docs/remote-mcp-server`
  ("Remote MCP Server") — observed `2026-11-11`. Backs the remote URL, HTTP
  transport example, OAuth 2.0 flow (domain entry, sign-in, permission
  approval), automatic token refresh, permission-scoped access, Gen 4 and
  Gen 3 plan list, Gen 3 reduced tool set, and the further-reading pointer.
- `https://helpdesk.egnyte.com/hc/en-us/articles/43305899030797-Egnyte-MCP-Server-Overview`
  ("Egnyte MCP Server - Overview") — observed `2026-11-11`. Backs the
  prerequisites, **Settings** > **AI Powered Features** > **MCP Server**,
  **Allow external LLM clients to connect to Egnyte via MCP**, default allowed
  apps, **Add**, custom-app fields, **Save**, **Save changes**, **Revoke &
  Save**, **Other web-based AI Apps (unverified)**, the availability check and
  unavailable error, the AI Safeguards restriction, and the alternate plan
  statement.
- `https://helpdesk.egnyte.com/hc/en-us/articles/44361750683661-Egnyte-s-AI-Assistant-AI-Powered-Smart-Search-and-Admin-Controls-for-Allowed-Apps-in-MCP-Server`
  ("Admin Controls for Allowed Apps in MCP Server") — observed `2026-11-11`.
  Corroborates admin control over allowed apps and the default-disabled
  unregistered web client option.
- `https://helpdesk.egnyte.com/hc/en-us/articles/47225562492173-AI-Assistant-Model-List-Upgrade`
  ("AI Assistant - Model List Upgrade") — observed `2026-11-11`. Backs that
  MCP server settings moved from **Configuration -> AI** to **AI Powered
  Features** in Admin settings.
- `https://helpdesk.egnyte.com/hc/en-us/articles/49496934262285-Egnyte-MCP-Server-Tool-Access-Controls`
  ("Egnyte MCP Server - Tool Access Controls") — observed `2026-11-11`. Backs
  **Tool access**, **Public** / **Restricted**, admin-only control, and the
  empty-Restricted behavior.
- `https://helpdesk.egnyte.com/hc/en-us/articles/43288758481293-AI-Safeguards-Overview`
  ("AI Safeguards - Overview") — observed `2026-11-11`. Backs the AI
  Safeguards location and that policies apply to MCP Server requests.
- `https://helpdesk.egnyte.com/hc/en-us/articles/45080323954829-AI-Safeguards-Admin-Guide`
  ("AI Safeguards – Admin Guide") — observed `2026-11-11`. Corroborates
  **Settings** → **Configuration** → **AI** for AI Safeguards.
- `https://registry.modelcontextprotocol.io/v0/servers?search=egnyte` — entry
  `com.egnyte/mcp-server`, observed `2026-11-11`. Backs the registry identity
  and `streamable-http` transport.
- `https://mcp-server.egnyte.com/mcp` — unauthenticated JSON-RPC `initialize`
  POST at `2026-11-11`. Returned HTTP 401 with a Bearer challenge naming the
  PRM URL.
- `https://mcp-server.egnyte.com/.well-known/oauth-protected-resource` —
  observed `2026-11-11`. Backs the resource URL, header bearer method, the
  path issuer, and the absence of advertised scopes.
- `https://mcp-oauth.egnyte.com/.well-known/oauth-authorization-server/egnyte-connect`
  — observed `2026-11-11`. Backs the issuer, registration endpoint,
  authorization and token endpoints, grants, PKCE, token endpoint auth
  methods, and absence of CIMD and scopes.
- `speakeasy-api/gram` `main` — observed `2026-11-11`:
  `server/internal/mcpregistry/oktaseed/oktaseed.go` (no Egnyte entry),
  `server/internal/remotesessions/callbackorigin.go` (canonical
  `/mcp/remote_login_callback`), and
  `server/internal/remotesessions/issuerhandlers.go` (path-inserted issuer
  metadata URL tried first).
- `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`) — observed
  `2026-11-11`. Backs the transcluded Speakeasy flow, fixed anchors, product
  labels, **Auto-Configure**, Server Availability, and closing-pointer form.
- `doctrine/ai-control-plane-oauth.md` — observed `2026-11-11`. Backs PKCE,
  DCR registration of the callback paths, and confidential-client support for
  `client_secret_basic` / `client_secret_post`.
