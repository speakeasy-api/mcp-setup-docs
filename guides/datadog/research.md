---
research_version: 1
slug: datadog
researched_at: "2026-11-10T02:22:05Z"
---

# Datadog — Research Dossier

Source ruling for this Guide: Datadog's **Set Up the Datadog MCP Server** page
(`https://docs.datadoghq.com/mcp_server/setup/`, Markdown copy at the same path
with `.md`) is the primary setup source for endpoints, authentication, required
permissions, organization settings, and the OAuth redirect allowlist. The
**Datadog MCP Server** overview page supplies the access model, unsupported
sites, and the distinction from the separate Code Security MCP Server. The
older reference `https://docs.datadoghq.com/bits_ai/mcp_server/` now serves the
same content as the overview page. **Getting Started with Datadog Sites** and
**Organization Settings** supply site identification and console navigation.
Live endpoint and OAuth metadata, probed on every supported site, corroborate
the endpoints and establish dynamic client registration (DCR). Observed
`2026-11-10`.

## Server facts

- **Product in scope:** the remote Datadog MCP Server. Datadog's overview page
  calls it "the main Datadog MCP Server" and says it "provides remote access to
  most Datadog products". The separate **Code Security MCP Server** is "a
  local MCP server" that "communicates over STDIO" and is in Preview; it is
  out of scope for this Guide.
- **Remote URL: one per Datadog site.** "Each Datadog site has its own MCP
  Server endpoint. … Use the endpoint that matches the site where your Datadog
  organization is hosted":

  | Site | Site URL | MCP Server endpoint |
  | --- | --- | --- |
  | US1 | `https://app.datadoghq.com` | `https://mcp.datadoghq.com/v1/mcp` |
  | US3 | `https://us3.datadoghq.com` | `https://mcp.us3.datadoghq.com/v1/mcp` |
  | US5 | `https://us5.datadoghq.com` | `https://mcp.us5.datadoghq.com/v1/mcp` |
  | EU1 | `https://app.datadoghq.eu` | `https://mcp.datadoghq.eu/v1/mcp` |
  | AP1 | `https://ap1.datadoghq.com` | `https://mcp.ap1.datadoghq.com/v1/mcp` |
  | AP2 | `https://ap2.datadoghq.com` | `https://mcp.ap2.datadoghq.com/v1/mcp` |
  | UK1 | `https://uk1.datadoghq.com` | `https://mcp.uk1.datadoghq.com/v1/mcp` |
  | US1-FED | `https://app.ddog-gov.com` | Not supported |
  | US2-FED | `https://us2.ddog-gov.com` | Not supported |

  Site URLs come from **Getting Started with Datadog Sites**; endpoints from the
  setup page's **MCP Server endpoints** table. The overview page also says the
  server "is not GovCloud compatible". Because the reader must pick the
  endpoint for their site, every remote is `tenanted: true`.
- **Transport:** `streamable-http`. The setup page's **Test access** section
  selects "Streamable HTTP", and client examples use `"type": "http"`.
- **Authentication Option documented here:** OAuth 2.0 ("For most users, OAuth
  2.0 is the recommended authentication method, and your MCP client handles it
  during setup"). Header-based alternatives (a Personal or Service Access Token
  as a bearer token, or `DD_API_KEY` / `DD_APPLICATION_KEY` headers) are for
  cases "when you cannot complete the OAuth flow, for example on a server or in
  a CI environment"; they are not rendered.
- **OAuth discovery (probed 2026-11-10T02:22:05Z on all seven supported
  sites):** an unauthenticated JSON-RPC `initialize` POST to each endpoint
  returned HTTP 401 with `WWW-Authenticate: Bearer
  resource_metadata="https://mcp.<site>/.well-known/oauth-protected-resource/v1/mcp"`.
  Each protected-resource metadata (PRM) document names its endpoint as both
  `resource` and sole `authorization_servers` entry (for US1,
  `https://mcp.datadoghq.com/v1/mcp`) and bearer method `header`; it lists no
  `scopes_supported`. The issuer metadata at
  `https://mcp.<site>/.well-known/oauth-authorization-server/v1/mcp` (issuer
  equal to the PRM's) advertises, for US1: authorization endpoint
  `https://app.datadoghq.com/oauth2/v1/authorize`, token endpoint
  `https://app.datadoghq.com/api/v2/oauth2/token`, `registration_endpoint`
  `https://app.datadoghq.com/api/v2/oauth2/register`, `scopes_supported`
  `mcp_all`, grants `authorization_code`, `refresh_token`, and
  `urn:ietf:params:oauth:grant-type:jwt-bearer`, `code_challenge_methods_supported`
  `S256` with `pkce_required: true`, and `token_endpoint_auth_methods_supported`
  `none` only. No `client_id_metadata_document_supported` is advertised. The
  other six sites return the same shape with their own site host (for example,
  EU1's endpoints are on `https://app.datadoghq.eu`).
- **Speakeasy client fit:** Datadog accepts only public clients (`none`). The
  Speakeasy AI Control Plane supports public clients, PKCE S256, refresh
  tokens, and DCR (`doctrine/ai-control-plane-oauth.md`). No registration was
  attempted against Datadog, so acceptance is not verified end to end.
- **Access model:** "The MCP Server forwards the authenticated user's own
  credentials to Datadog APIs. Your existing access controls apply exactly as
  they do for direct API or UI access." When a user authorizes a client,
  "Datadog creates a consent grant scoped to your user, that client, and the
  organization you selected during the OAuth flow."
- **Organization-wide access:** "MCP Server tools also require global,
  organization-wide MCP access and write capabilities, which organization
  administrators manage in Organization Settings." **MCP Access**: "When
  disabled, users cannot access any MCP functionality, regardless of individual
  role permissions." **MCP Write Access**: "When disabled, the MCP Server hides
  write tools from all users." The docs do not state either setting's default.
- **User role permissions:** `mcp_read` (**MCP Read**) for tools that read data
  and `mcp_write` (**MCP Write**) for tools that create or modify resources
  ("for example, creating monitors, muting hosts"), plus the standard permission for the underlying resource (for example,
  **Monitors Read**). "Users with the Datadog Standard Role have both MCP
  Server permissions by default." The permissions reference lists **MCP Read**
  with default role **Datadog Read Only Role** and **MCP Write** with
  **Datadog Standard Role**. Custom roles need the permissions added by hand.
- **Network restriction:** with the organization's IP allowlist enabled, "only
  IP addresses or CIDR ranges in the allowlist can access" Datadog, and this
  includes "The Datadog MCP Server, including remote connections from AI agents
  and MCP clients".
- **Plan gates:** none documented. Fair-use limits are 50 requests per 10
  seconds and 100,000 monthly tool calls, "subject to change"; not rendered.
- **Speakeasy MCP Catalog:** the Speakeasy product seeds `com.datadoghq/mcp`
  (title **Datadog**) with only the US1 remote and `supportsDcr: true`
  (`speakeasy-api/gram`, `server/internal/mcpregistry/oktaseed/oktaseed.go`,
  commit `8554ffd`). No Pulse lookup was run. The remotes are tenanted, so this
  Guide uses only the Custom remote path, regardless of catalog presence.

## Credential flow

No credential is created at Datadog for this option. The Speakeasy AI Control
Plane follows each endpoint's PRM to its issuer (the endpoint URL itself) and
registers its own public client through DCR (**Auto-Configure**; only DCR is
advertised, so no registration method is named).

Before anyone connects, a Datadog administrator prepares the organization in
**Organization Settings > MCP Server**:

- **MCP Access** must be on ({#enable-mcp-access}). **MCP Write Access** is
  needed only for write tools.
- Paste `{{ gram.oauth.callback_url }}` under **MCP OAuth Redirect URLs** and
  select **Add URL** ({#add-oauth-redirect-url}). The setup page's **Adding
  OAuth clients** section says: "To allow-list a redirect URL, open MCP OAuth
  Redirect URLs in Organization Settings, enter the URL, and select Add URL."
  Operator note (issue #201) says the external steps must add Speakeasy's
  redirect URI to the Datadog account. The template key renders to the
  Speakeasy origin plus `/mcp/remote_login_callback`, which is the only
  redirect URI Speakeasy registers through DCR and sends at authorization
  (`server/internal/remotesessions/proxyregister.go`,
  `server/internal/externalmcp/setupdocs.go`, gram `8554ffd`).

Users also need the MCP role permissions ({#grant-mcp-permissions}) when their
role is custom. At first use, each person signs in to Datadog in the browser,
selects the organization, and authorizes access.

## Console walkthrough

Organization Settings "is available to Administrators by clicking Organization
Settings from the account menu in the bottom of the left side navigation".
Organization Settings has an **MCP Server** section that manages
organization-wide MCP access, write access, and "redirect URLs for OAuth
authentication with the MCP Server". On US1 the setup page links this page as
`https://app.datadoghq.com/organization-settings/mcp` (redirect list anchor
`#mcp-oauth-redirect-urls`); Datadog's docs site rewrites such links to the
selected site's host with the same path. **Roles** are also under Organization
Settings (`/organization-settings/roles`). The sequence is: identify the site →
Organization Settings → **MCP Server** → **MCP Access** → **MCP OAuth Redirect
URLs** → (custom roles only) **Roles**.

### Identify the Datadog site {#identify-datadog-site}

- Sign in to Datadog and read the browser address bar. Match its host to the
  **Site URL** column in Server facts and record the MCP Server endpoint on the
  same row.
- Custom domain (for example `demo.datadoghq.com`): "you can find your site
  listed at the top of the My Preferences page." Navigation: "click your
  profile avatar in the lower-left corner, then select My Preferences from the
  menu."
- If the site is US1-FED (`app.ddog-gov.com`) or US2-FED (`us2.ddog-gov.com`),
  stop: the MCP Server is not supported there.
- Values entered: none. Values copied: the MCP Server endpoint, for
  {#add-server-in-speakeasy}.
- Screenshot note: the top of **My Preferences** showing the organization name
  and site URL (Datadog publishes this image on the sites page); obscure the
  organization name.

### Open the MCP Server settings {#open-mcp-server-settings}

- As an administrator, open the account menu at the bottom of the left
  navigation and select **Organization Settings**.
- Select **MCP Server**.
- Values entered or copied: none.
- Screenshot note: **Organization Settings** with **MCP Server** selected,
  showing the **MCP Access**, **MCP Write Access**, and **MCP OAuth Redirect
  URLs** settings.

### Turn on MCP access {#enable-mcp-access}

- If **MCP Access** is off, turn it on. Without it, "users cannot access any
  MCP functionality, regardless of individual role permissions."
- Optional: turn on **MCP Write Access** to allow tools that create or modify
  resources. When off, "the MCP Server hides write tools from all users."
- The control type and any save or confirmation step are not documented.
- Values entered or copied: none.
- Screenshot note: the **MCP Access** and **MCP Write Access** settings, with
  **MCP Access** on.

### Add the Speakeasy redirect URL {#add-oauth-redirect-url}

- On the same page, under **MCP OAuth Redirect URLs**, enter
  `{{ gram.oauth.callback_url }}` and select **Add URL**.
- The input field's label is not documented.
- Values entered: `{{ gram.oauth.callback_url }}`. Values copied: none.
- Screenshot note: **MCP OAuth Redirect URLs** with the Speakeasy callback URL
  entered and **Add URL** visible.

### Grant MCP permissions to custom roles {#grant-mcp-permissions}

- Needed only when users hold custom roles; the Datadog Standard Role has both
  MCP permissions by default.
- In **Organization Settings**, open **Roles** and click the role to update.
  (US1 link: `https://app.datadoghq.com/organization-settings/roles`.)
- Click **Edit Role** (pencil icon).
- Under the permissions list, select the **MCP Read** and **MCP Write**
  checkboxes. Datadog's steps select both; **MCP Write** is only for write tools.
- Select any other resource-level permissions the role needs.
- Click **Save**.
- Values entered or copied: none.
- Screenshot note: the role editor with **MCP Read** and **MCP Write**
  selected.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
observed `2026-11-10T02:22:05Z`. Labels were re-checked against
`speakeasy-api/gram` `client/dashboard` at commit
`8554ffdae43a9a8f1acf727865fd26af538a527c`: **MCP Gateway**, **Add new**,
**Add MCP server**, **Hosted remotely**, **New remote MCP server**, **MCP
server URL**, **Display name (optional)**, **User session issuer**, **Verify
connectivity**, **User Identity**, **Will be created**, **Auto-Configure**,
**Choose an identity provider**, **Search authorization servers…**, **Danger
Zone**, **Server Availability**, and **Enable MCP server** are present.
**Search identity providers…** is not; the provider picker's search box reads
**Search authorization servers…**. This Guide avoids the absent label.

Per-guide values:

- Remote URL: the site's MCP Server endpoint from {#identify-datadog-site}
  (all seven remotes are tenanted)
- Add-server path: Custom remote only (**Hosted remotely**), because the
  remotes are tenanted
- Authentication Option: OAuth with DCR; no provider credentials. Identity
  mode: **User Identity**
- Probe outcome: 401 with a `resource_metadata` challenge on every site, so
  **Hosted remotely** preselects **User Identity** after **Verify
  connectivity**
- PRM issuer: the endpoint URL itself (for US1,
  `https://mcp.datadoghq.com/v1/mcp`)
- CIMD / DCR: DCR advertised; CIMD not advertised. Not exercised end to end;
  no registration was attempted
- Registration choice: **Auto-Configure** (dashboard default). Creation
  normally configures the identity, so the credential section is a
  confirmation plus the fallback
- Scope: none entered. **Auto-Configure** has no **Scope** control. The issuer
  advertises only `mcp_all`
- External credential fields: none. The redirect is registered at
  {#add-oauth-redirect-url}
- Server Availability: rendered as a conditional final step when creation left
  the server **Disabled**
- Further reading: `https://docs.datadoghq.com/mcp_server/`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **Hosted
remotely**. On **New remote MCP server**, paste the endpoint recorded in
{#identify-datadog-site} into **MCP server URL**. Optionally enter **Display
name (optional)**. Leave **User session issuer** at its default. Click **Verify
connectivity**. After verification succeeds, keep **User Identity** (preselected
because the server answered with a 401 naming its PRM), leave **Guardrails** off
unless wanted, then click **Save**. This creates the server and opens its
**Overview** page.

On save, Speakeasy discovers the issuer and registers a client automatically.
When it cannot, the server is kept **Disabled** and the result says to finish
setup in **Settings > Identity**.

Screenshot note: **New remote MCP server** after **Verify connectivity**, with a
Datadog endpoint entered and **User Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. When creation
configured the identity, **User Identity** shows the Datadog provider for the
site's endpoint with **Auto-Configure**; only the availability check remains.
Otherwise select **User Identity**, confirm the provider is the endpoint URL
(badged **Will be created** when new) or find it with **Search authorization
servers…**, keep **Auto-Configure**, and click **Save**. If the server shows
**Disabled**, open **Danger Zone > Server Availability** and turn on **Enable
MCP server** so it shows **Enabled**.

At first use, each person signs in to Datadog, selects the organization, and
authorizes access. They can reach only what their Datadog roles allow.

Screenshot note: **Settings > Identity** with **User Identity**, the
`mcp.datadoghq.com` provider, and **Auto-Configure**; values redacted.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Datadog's MCP documentation at
https://docs.datadoghq.com/mcp_server/."

## Research limitations

- Datadog's docs do not say whether authorization fails when the Speakeasy
  callback is missing from **MCP OAuth Redirect URLs**; the step is rendered
  because the docs describe allowlisting redirect URLs for OAuth clients and
  the operator note asks for it. The failure mode was not observed.
- DCR was confirmed from metadata only. No registration was attempted, because
  it would create a client at Datadog. Acceptance of the Speakeasy public
  client is not verified end to end.
- The defaults of **MCP Access** and **MCP Write Access**, their control type,
  and whether the page needs a separate save are not documented. The input
  label under **MCP OAuth Redirect URLs** is not documented.
- The Organization Settings sub-navigation label is documented as the **MCP
  Server** section heading; the exact sidebar label was not seen in a
  screenshot.
- Datadog's browser authorization and organization-selection labels are not
  published, so the Guide names neither.
- The IP allowlist applies to remote MCP connections. Speakeasy's egress
  addresses are not published in this repository, so the Guide only tells
  readers to confirm the allowlist with its owner.
- Not rendered: the optional `subdomain` query parameter for organizations that
  sign in through a custom subdomain (it avoids a second sign-in), the
  `toolsets` and `omit_tools` query parameters (without `toolsets` only `core`
  tools load), and header-based token or key authentication.
- Speakeasy source note: `doctrine/ai-control-plane-oauth.md` (gram `4e1fef3`)
  says DCR registers three callback URIs; at gram `8554ffd` it registers only
  `/mcp/remote_login_callback`. This does not change the Guide.

## Operator decisions

None.

## Provenance

Source inventory from the sweep:

- **Product docs — `docs.datadoghq.com`:** root `/llms.txt` and the
  `/datadog_mcp_server/llms.txt` subsection index (overview, setup, tools, and
  code execution pages) were read. Markdown copies were fetched with `.md`.
- **Account management docs — `docs.datadoghq.com/account_management/`:**
  Organization Settings, role permissions, and IP allowlist pages.
- **Code Security docs:** the separate local Code Security MCP Server page,
  used only to scope it out.
- **Docs site script:** the region selector script loaded by the setup page.
- **Live endpoints:** all seven supported MCP endpoints, their PRM, and their
  issuer metadata.
- **Speakeasy product source — `speakeasy-api/gram`:** native catalog seed,
  callback rendering, DCR request, and dashboard labels.
- **Tools page** (`/mcp_server/tools.md`) and **Code Execution** page: listed in
  the index; not drawn from (tool inventories are out of scope).

Sources drawn from:

- `https://docs.datadoghq.com/mcp_server/` ("Datadog MCP Server") — observed
  `2026-11-10T02:22:05Z`. Backs the hosted-server scope, unsupported
  government sites, GovCloud note, access model, RBAC controls, write
  permission checks, fair-use limits, and the Code Security distinction.
- `https://docs.datadoghq.com/bits_ai/mcp_server/` — observed
  `2026-11-10T02:22:05Z`. Its `.md` copy resolves to the overview page.
- `https://docs.datadoghq.com/mcp_server/setup/` ("Set Up the Datadog MCP
  Server") — observed `2026-11-10T02:22:05Z`. Backs the endpoint table,
  Streamable HTTP, OAuth recommendation, header-based alternatives, required
  role permissions and the custom-role steps (**Edit Role**, **MCP Read**,
  **MCP Write**, **Save**), **MCP Access** and **MCP Write Access**, IP
  allowlist pointer, consent-grant scope, `subdomain` and `toolsets`
  parameters, and **MCP OAuth Redirect URLs** with **Add URL**.
- `https://docs.datadoghq.com/getting_started/site/` ("Getting Started with
  Datadog Sites") — observed `2026-11-10T02:22:05Z`. Backs site URLs and
  **My Preferences** for custom domains.
- `https://docs.datadoghq.com/account_management/org_settings/`
  ("Organization Settings") — observed `2026-11-10T02:22:05Z`. Backs the
  administrator-only account-menu route and the **MCP Server** section.
- `https://docs.datadoghq.com/account_management/rbac/permissions/#mcp`
  ("Datadog Role Permissions") — observed `2026-11-10T02:22:05Z`. Backs
  **MCP Read** / **MCP Write** names and default roles.
- `https://docs.datadoghq.com/account_management/org_settings/ip_allowlist/`
  ("IP Allowlist") — observed `2026-11-10T02:22:05Z`. Backs that the allowlist
  covers remote MCP connections.
- `https://docs.datadoghq.com/security/code_security/dev_tool_int/mcp_server/`
  ("Code Security MCP Server") — observed `2026-11-10T02:22:05Z`. Backs that it
  is a local STDIO server in Preview.
- `https://docs.datadoghq.com/static/region-redirects.f5bcbb08ba8fb35917c018b3932a5355ae923acd11dd00b14bab1f88d73a9b98afbc137e3aa7c930f04873cbda8e50625e44e287ed20d431f1d64f16b43ee00a.js`
  — observed `2026-11-10T02:22:05Z`. Backs that docs links to a Datadog app
  host are rewritten to the selected site's host with the same path.
- `https://mcp.<site>/v1/mcp` for `datadoghq.com`, `us3.datadoghq.com`,
  `us5.datadoghq.com`, `datadoghq.eu`, `ap1.datadoghq.com`, `ap2.datadoghq.com`,
  and `uk1.datadoghq.com` — unauthenticated JSON-RPC observation at
  `2026-11-10T02:22:05Z`. Each returned 401 with its `resource_metadata`
  challenge.
- `https://mcp.<site>/.well-known/oauth-protected-resource/v1/mcp` (same seven
  sites) — observed `2026-11-10T02:22:05Z`. Backs resource, issuer, and bearer
  method.
- `https://mcp.<site>/.well-known/oauth-authorization-server/v1/mcp` (same
  seven sites) — observed `2026-11-10T02:22:05Z`. Backs issuer, endpoints, DCR,
  no CIMD, `mcp_all`, grants, `none` auth method, and required PKCE.
- `speakeasy-api/gram` at commit `8554ffdae43a9a8f1acf727865fd26af538a527c` —
  observed `2026-11-10T02:22:05Z`. `server/internal/mcpregistry/oktaseed/oktaseed.go`
  backs the `com.datadoghq/mcp` catalog entry;
  `server/internal/externalmcp/setupdocs.go` and
  `server/internal/remotesessions/proxyregister.go` back the callback value and
  the single registered redirect URI; `client/dashboard` backs the labels above.
- `https://github.com/speakeasy-api/mcp-setup-docs/issues/201` — operator note,
  observed `2026-11-10T02:22:05Z`. Asks that the external steps cover adding
  Speakeasy's redirect URI to the Datadog organization.
- `doctrine/speakeasy-setup.md` — observed `2026-11-10T02:22:05Z` (gram main
  `68b3f78`). Backs the transcluded Speakeasy-side flow, fixed anchors, and
  closing-pointer form.
