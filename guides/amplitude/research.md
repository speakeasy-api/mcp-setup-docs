---
research_version: 1
slug: amplitude
researched_at: 2026-11-03T04:40:00Z
---

# Amplitude — Research Dossier

Source ruling for this revision: Amplitude's public MCP documentation
(`https://amplitude.com/docs/amplitude-ai/amplitude-mcp` and its
**Connect other MCP clients** page) is authoritative for the regional server
URLs, transport, admin controls, role actions, and sign-in troubleshooting.
Live endpoint observations of both regions are authoritative for the OAuth
probe outcome, issuer, and advertised client registration methods. The
operator settled the add-server path for this Guide: both regional URLs are
tenanted, so only the Custom remote (**Hosted remotely**) path is rendered.
No provider console was accessed and no OAuth client was registered during
research.

## Server facts

- **Remote URLs:** choose the endpoint matching the organization's data
  region. Amplitude's MCP page lists them as:
  - United States Server (Default): `https://mcp.amplitude.com/mcp`
  - EU Residency Server: `https://mcp.eu.amplitude.com/mcp`
  Amplitude says to use the US URL unless the organization's data resides in
  the EU region, and that an EU connection must target the EU endpoint.
- **Region identification:** Amplitude's documentation says EU accounts use
  `app.eu.amplitude.com` and tells readers to check the URL while signed in.
  The region is chosen at sign-up (United States or European Union), so it is
  fixed for an organization.
- **EU availability:** Amplitude's FAQ says organizations provisioned in its
  EU data center can use MCP connectors.
- **Transport:** `streamable-http`. Amplitude's client instructions configure
  the `/mcp` URL as an HTTP MCP server. Amplitude also documents a
  `?discovery=progressive` query variant; this Guide uses the plain URL.
- **Authentication Option documented by this Guide:** OAuth, with each user
  signing in with their own Amplitude account. Amplitude documents OAuth as
  the connection method for its hosted MCP server. Amplitude also documents
  enterprise-managed auth (Cross App Access) for specific clients; this Guide
  does not use it.
- **Plan gates:** Amplitude's public MCP pages do not name a required plan.
- **Organization control:** Amplitude enables MCP access by default for all
  users. Organization admins can allow or block the Amplitude MCP server at
  **Settings > Content Access > MCP** "in your Amplitude organization
  settings"; the restriction applies to all MCP clients and all users, and
  only admins can change it.
- **Role actions:** two RBAC actions govern MCP per project: **Use MCP
  (read)** (`USE_MCP_READ`) and **Use MCP (write)** (`USE_MCP_WRITE`), set in
  **Org Settings > Role Management**, category **AI Features**. They apply to
  everyone, including organization admins. Every built-in role grants read;
  Member, Manager, and Admin also grant write. Write operations such as
  tracking-plan changes need **Use MCP (write)** plus the usual Amplitude
  permission for that change.
- **Settings area naming:** Amplitude's Settings page documentation says the
  gear icon opens **Settings**, which holds the organizational settings
  (including content access controls and user management); only
  organization admins and managers can edit them. Amplitude names the area
  inconsistently, including on its MCP page: the MCP page writes
  **Settings > Content Access > MCP** "in your Amplitude organization
  settings" and **Org Settings > Role Management**; the Manage RBAC roles
  page also writes **Org Settings > Role Management**; the sharing page
  writes **Settings > Organization Settings > Content Access**; and the
  Manage users page writes **Settings > Organization settings > Members &
  Groups**. The Guide follows the MCP page: it names the area once as the
  organization settings, opened from the gear icon's **Settings**, and uses
  the MCP page's page names verbatim: **Content Access > MCP** and **Role
  Management**.
- **Sign-in behavior:** Amplitude's troubleshooting says to be signed in to
  only one Amplitude organization during the OAuth flow, and that the
  authorization page may keep spinning after authentication is complete;
  closing the tab is safe.

## Credential flow

Nothing is created in Amplitude. Speakeasy registers its own OAuth client
with the regional Amplitude authorization server (Auto-Configure), and each
user authorizes it in the browser on first use.

| Speakeasy value | Origin |
| --- | --- |
| MCP server URL | Regional URL recorded in {#identify-data-region} |
| Identity mode | **User Identity** (OAuth) |
| Issuer | US `https://mcp.amplitude.com`; EU `https://mcp.eu.amplitude.com` (each region's PRM) |
| Client | Registered automatically on save (**Auto-Configure**); no Client ID or secret |
| Redirect URI | Not registered on the provider for the Auto-Configure path |

## Console walkthrough

### Identify your data region {#identify-data-region}

- Sign in to Amplitude, open the intended organization, and check the
  browser hostname.
- `app.amplitude.com` → record `https://mcp.amplitude.com/mcp`.
- `app.eu.amplitude.com` → record `https://mcp.eu.amplitude.com/mcp`.
- The two URLs are not interchangeable; an EU organization must use the EU
  URL.
- Screenshot note: the address bar with the hostname visible and
  organization or project details obscured.

### Confirm MCP access {#confirm-mcp-access}

- As an organization admin, click the gear icon to open **Settings**, open
  **Content Access > MCP** in the organization settings, and confirm the
  content access controls allow the Amplitude MCP server; allow it if
  blocked. Applies to every MCP client and user.
- For custom roles, open **Role Management** in the same organization
  settings, and in the **AI Features** category confirm **Use MCP (read)**;
  enable **Use MCP (write)** only where users should change data through
  the server.
- Built-in roles already grant read; Member, Manager, and Admin also grant
  write.
- Screenshot note: **Content Access > MCP** in the organization settings
  with the server allowed, and **AI Features** in a role with both actions
  visible.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram `main` commit
`68b3f78`), read 2026-11-03. Labels were spot-checked against gram `main`
commit `2ae3630` on 2026-11-03; see Research limitations for one drift.

Per-guide values:

- Remote URL: the US or EU URL selected in {#identify-data-region}.
- Add-server path: Custom remote only because both URLs are region-specific
  (`tenanted: true`); catalog presence is not consulted. Render **Hosted
  remotely**.
- Authentication Option: OAuth → **User Identity**.
- Probe outcome (2026-11-03, both regions): an `initialize` POST with
  `Accept: application/json, text/event-stream` returns 401 with
  `WWW-Authenticate: Bearer realm="OAuth", resource_metadata="https://<host>/.well-known/oauth-protected-resource"`.
  The create form therefore preselects **User Identity**.
- PRM (`/.well-known/oauth-protected-resource`): US resource and
  authorization server `https://mcp.amplitude.com`; EU resource and
  authorization server `https://mcp.eu.amplitude.com`. Both list
  `scopes_supported` `all:read`, `all:write`. The `/mcp`-suffixed PRM path
  returns 404; the challenge names the root path, which resolves.
- Issuer metadata (`/.well-known/oauth-authorization-server`, both regions):
  issuer equals the region host; each advertises its own `/authorize`,
  `/token`, and `/register` (`registration_endpoint`, so DCR is advertised),
  `client_id_metadata_document_supported: true` (CIMD is advertised),
  `token_endpoint_auth_methods_supported` `client_secret_post` and `none`,
  PKCE `S256`, and scopes `all:read`, `all:write`, `offline_access`.
- Registration choice: **Auto-Configure** (dashboard default when CIMD or
  DCR is advertised). No registration method is named because none is known
  to fail.
- Scope string: not applicable (Auto-Configure).
- Server Availability: when creation leaves the server **Disabled**, finish
  with **Settings > Danger Zone > Server Availability** → **Enable MCP
  server**.
- Further reading: `https://amplitude.com/docs/amplitude-ai/amplitude-mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **Hosted
remotely**. On **New remote MCP server**, paste the regional URL from
{#identify-data-region} into **MCP server URL**, leave **User session
issuer** at its default, and click **Verify connectivity**. Keep the
preselected **User Identity**, leave **Guardrails** off, and click **Save**.
Speakeasy tries to configure the identity provider and register a client on
save; when it cannot, the server is kept **Disabled** and the result points
to **Settings > Identity**.

Screenshot note: **New remote MCP server** after verification with an
Amplitude URL and **User Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

In **Settings > Identity**, select **User Identity**. Confirm the preselected
provider uses the region's issuer (`https://mcp.amplitude.com` or
`https://mcp.eu.amplitude.com`); a provider that does not exist yet is badged
**Will be created**. If the other region's provider is preselected, choose the
correct one in the picker. Keep **Auto-Configure**; there is no Client ID or
secret. Click **Save**. If the server is **Disabled**, turn on **Enable MCP
server** under **Settings > Danger Zone > Server Availability**.

On first use, Amplitude's browser authorization prompt appears. Stay signed in
to one Amplitude organization; if the page keeps spinning after approval,
close the tab. If tool calls fail, recheck {#confirm-mcp-access}.

Closing pointer: `https://amplitude.com/docs/amplitude-ai/amplitude-mcp`.

## Research limitations

- **Automatic registration not exercised:** CIMD and DCR are advertised in
  both regions, but no client was registered during research, so whether
  Speakeasy's Auto-Configure succeeds end to end is unverified. If it fails,
  the Dossier must switch to Manual and name the failing method.
- **Content Access control labels:** Amplitude says to "use the content
  access controls to allow or block" the server but does not name the
  control or its states; the Guide therefore does not name them. Whether
  the organization settings show as a separately labelled level of the
  **Settings** navigation is not confirmed; see Settings area naming for
  the variants Amplitude's pages use.
- **Wrong-region behavior:** Amplitude says an EU connection must use the EU
  endpoint but does not describe what a user sees when signing in to the
  wrong region's server.
- **Authorization prompt labels:** Amplitude does not document the consent
  screen's labels, so the Guide says only "approve the authorization request".
- **PRM documentation link:** both regions' PRM `resource_documentation`
  (`https://docs.amplitude.com/mcp`) redirects to the documentation home page
  rather than the MCP page; the Guide links the MCP page directly.
- **Dashboard label drift:** gram `main` (`2ae3630`) renders the provider
  picker as **Choose an authorization server** with search placeholder
  **Search authorization servers…**, while the doctrine still carries
  **Choose an identity provider** and **Search identity providers…**. The
  Guide avoids naming the picker control rather than invent a label; the
  doctrine owner should reconcile it.

## Operator decisions

- The add-server path is **Hosted remotely** for both regions (operator
  ruling on the intake ticket). The doctrine is unchanged.

## Provenance

- Amplitude MCP Server: `https://amplitude.com/docs/amplitude-ai/amplitude-mcp`
- Connect other MCP clients: `https://amplitude.com/docs/amplitude-ai/amplitude-mcp/other-clients`
- Enterprise-managed auth: `https://amplitude.com/docs/amplitude-ai/amplitude-mcp/enterprise-managed-auth`
- Create a new account (region choice): `https://amplitude.com/docs/get-started/create-a-new-account`
- Replay link reference (EU hostname): `https://amplitude.com/docs/session-replay/replay-link-reference`
- Role-based access controls: `https://amplitude.com/docs/admin/account-management/role-based-access-controls-rbac`
- Manage RBAC roles: `https://amplitude.com/docs/admin/account-management/manage-rbac-roles`
- Manage users and permissions: `https://amplitude.com/docs/admin/account-management/manage-users`
- The Settings page: `https://amplitude.com/docs/admin/account-management/account-settings`
- Share charts, dashboards, and notebooks with stakeholders outside your company (Content Access path): `https://amplitude.com/docs/analytics/share-external`
- Documentation index: `https://amplitude.com/docs/llms.txt`
- Endpoint observations, 2026-11-03: `https://mcp.amplitude.com/mcp`,
  `https://mcp.eu.amplitude.com/mcp`, each host's
  `/.well-known/oauth-protected-resource` and
  `/.well-known/oauth-authorization-server`
- Speakeasy registry entry `com.amplitude/mcp` (US remote only), from
  `server/internal/mcpregistry/oktaseed/oktaseed.go`
- `doctrine/speakeasy-setup.md`
