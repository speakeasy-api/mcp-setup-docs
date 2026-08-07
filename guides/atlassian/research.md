---
research_version: 1
slug: atlassian
researched_at: "2026-08-07T18:48:21Z"
---

# Atlassian — Research Dossier

Source ruling for this Guide: the Atlassian Support collection for the
Atlassian Rovo MCP Server is the primary setup source. Its current getting
started page specifies the `/v1/mcp/authv2` endpoint. The security and access
policies collection supplies organization-admin controls. Live endpoint and
OAuth metadata corroborate the endpoint and establish that Dynamic Client
Registration (DCR) is available. The marketing site is corroborative only.

## Server facts

- **Remote URL:** `https://mcp.atlassian.com/v1/mcp/authv2`.
- **Transport:** `streamable-http`. Atlassian's current examples configure the
  URL with HTTP transport. The older SSE endpoint
  `https://mcp.atlassian.com/v1/sse` is unsupported after June 30, 2026.
- **Authentication Option documented here:** OAuth 2.1 with Dynamic Client
  Registration. OAuth is Atlassian's primary and recommended mechanism for an
  interactive user-driven connection. No Client ID or Client Secret is created
  in Atlassian Administration for this option.
- **OAuth discovery:** an unauthenticated request to the remote returns HTTP
  401 and names protected-resource metadata at
  `https://mcp.atlassian.com/.well-known/oauth-protected-resource/v1/mcp/authv2`.
  That document identifies the resource, its Atlassian authorization-server
  issuer, supported scopes, and header bearer method. The issuer's
  authorization-server metadata advertises authorization, token, and dynamic
  registration endpoints, authorization-code and refresh-token grants, PKCE
  `S256`, and token endpoint authentication method `none` among its methods.
  The Speakeasy AI Control Plane can therefore discover the issuer and perform
  DCR. The discovered path needs no pasted Issuer URL. If **Configure Manually**
  opens with **Issuer URL** empty, paste
  `https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3`.
- **Access model:** after setup, each user signs in to Atlassian, authorizes the
  client for an Atlassian Cloud site, and enables the intended Atlassian apps.
  Calls remain constrained by that user's product access and permissions.
- **Standing requirements:** an Atlassian Cloud site with Jira, Confluence,
  and/or Compass; the connecting user needs access to the intended Atlassian
  apps and a modern browser for OAuth. Atlassian documents no paid-plan gate
  for the MCP Server.
- **Organization controls that can block first connection:** OAuth client
  domains must be allowed in Atlassian Rovo MCP Server settings; applicable
  organization IP allowlists also apply to MCP requests. If the organization
  blocks **User Installed Apps**, a site admin might first need to install the
  Atlassian MCP app. Strict network egress controls must permit
  `*.atlassian.net` for interactive widgets.
- **Alternative authentication not rendered by this Guide:** Atlassian also
  supports personal API tokens via Basic authentication and, where available,
  service-account API keys via Bearer authentication, but only when an
  organization admin enables **API token**. This is intended for non-interactive
  or machine-to-machine use and can expose fewer tools. It is excluded because
  the assigned interactive Speakeasy setup is directly supported by OAuth 2.1
  DCR and Atlassian recommends OAuth for that scenario.
- **Speakeasy MCP Catalog:** unresolved. The operator's query `atlassian`
  produced one non-exact hit and no exact title/name match, so both add-server
  branches remain conditional.

## Credential flow

The selected Authentication Option does not require an Atlassian developer app
or pre-created credentials. The Speakeasy AI Control Plane discovers the OAuth
metadata and dynamically registers its session client. If the manual sheet does
not retain the discovered issuer, enter the Atlassian issuer
`https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3` and run endpoint
discovery. Do not paste `{{ gram.oauth.callback_url }}` into Atlassian: DCR
registers the redirect URI as part of client registration.

At first use, the intended user completes Atlassian's browser authorization
flow, grants access to the relevant Atlassian Cloud site, and enables the
intended Atlassian apps. The user must already have product access and the
necessary permissions; OAuth does not expand them.

Before connecting, an organization admin must ensure that the Speakeasy OAuth
client's redirect domain is allowed if it is not already covered by the
organization's Atlassian-supported or custom domain rules. Atlassian's current
published supported-domain list does not name Speakeasy. Public sources do not
expose the concrete Speakeasy redirect URI/domain used by this DCR flow, so the
exact domain value is an open question rather than a guessed field value.

## Console walkthrough

The only provider-side configuration is conditional organization governance.
If the Speakeasy redirect domain is already allowed and no relevant IP or app
policy blocks access, no provider console change is needed before adding the
server. Otherwise, follow the administration step below. The documented route
starts at [Atlassian Administration](https://admin.atlassian.com/); select the
organization if the account has more than one, then select **Rovo** > **Rovo MCP
server**.

### Allow the Speakeasy OAuth domain {#allow-speakeasy-domain}

- Open `https://admin.atlassian.com/` and select the organization if more than
  one is shown.
- Select **Rovo**, then **Rovo MCP server**.
- Obtain the exact Speakeasy OAuth redirect domain from the Speakeasy deployment
  owner, then check whether the allowed domain rules already cover it. If they
  do not, select **Add domain** and add the trusted redirect domain. Atlassian
  requires a protocol and a valid host; HTTPS is appropriate for a hosted
  client. The public provider docs do not name the input field or final
  save-button label; after entering the domain, use the submission control
  shown in the console.
- Do not disable **Allow Atlassian supported domains** merely to add a custom
  domain. Atlassian documents that deselecting it blocks its supported-domain
  set.
- If the organization uses IP allowlists, return to the organization in
  Atlassian Administration and select **Security** > **IP allowlists**. Open the
  applicable allowlist, or select **Create IP allowlist**. Enter a name and the
  source IP addresses or CIDR blocks supplied by the Speakeasy deployment
  owner, select the Atlassian sites and apps to which the allowlist applies,
  then use the console's submission control. Atlassian's public documentation
  does not publish stable field or final submission-control labels for every
  current console variant.
- If strict egress filtering is enabled, allow `*.atlassian.net` so interactive
  Jira and Confluence widgets can render.
- Values entered: the Speakeasy OAuth redirect domain, and only when required,
  applicable source IP ranges in the separate organization IP-allowlist
  settings. The exact Speakeasy values must come from the Speakeasy deployment
  owner because public docs do not publish them.
- Screenshot note: **Rovo** > **Rovo MCP server** showing the domain list and
  **Add domain**, with organization-specific domains redacted. A separate image
  could show the relevant organization IP-allowlist policy without exposing
  unrelated ranges.
- Recovery on first connection: if Atlassian denies the OAuth redirect, return
  to this page and verify the client origin matches an allowed domain or
  pattern. If authorization appears but tool calls return an IP permission
  error, update the relevant organization IP allowlist; the consent screen can
  still appear when subsequent tool calls are blocked.

If **User Installed Apps** is blocked and authorization reports that the app
must be installed, a site admin may need to install the Atlassian MCP app under
the organization's Marketplace and third-party app policy. The MCP client page
links to that policy but does not provide a transition-complete installation
flow, so this remains an open question rather than an invented walkthrough.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md`, observed
`2026-08-07T18:48:21Z`.

Per-guide values:

- Remote URL: `https://mcp.atlassian.com/v1/mcp/authv2`
- Transport: `streamable-http` (the add form's **Transport** field is
  read-only)
- Authentication Option: OAuth with DCR; protected-resource metadata makes
  discovery available, and there are no provider credentials. If **Configure
  Manually** opens with **Issuer URL** empty, enter
  `https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3` before endpoint
  discovery
- External governance step when required: {#allow-speakeasy-domain}
- Scope override: leave empty; discovery advertises the server's supported
  scopes and Atlassian's authorization screen determines the granted apps and
  scopes
- Further reading:
  `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If **Atlassian** is in the catalog: choose **3rd-party server**. On the
  **MCP Catalog** page, find Atlassian using **Search MCP servers...**, open its
  entry with **View**, and click **Add**. In **Add to Project**, click **Add to
  Project**.
- If it is not: choose **Custom remote server**. On **Add a custom remote MCP
  server**, paste `https://mcp.atlassian.com/v1/mcp/authv2` into **Remote MCP
  server URL** and click **Add server**.

Either branch creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the **Add Source** menu open on the **Sources** page,
or the Atlassian catalog entry if an exact entry is present.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**, use
**Use Discovered** when offered; otherwise, select **Configure Manually**. In
**Attach Remote Identity Provider**, if **Issuer URL** is empty, paste
`https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3`. Keep the
auto-derived **Slug** and **Display name (optional)**. Under **Endpoints**, click
**Discover** so the authorization, token, and registration endpoints fill from
Atlassian's authorization-server metadata. Under **Session Client**, keep
**Client Type** set to **Dynamic Client Registration (DCR)** and
keep the discovered **Token Endpoint Auth Method**. Leave **Scope (override)**
and **Audience (optional)** empty. Click **Attach Identity Provider**.

There is no **Client ID** or **Client Secret** to paste. When first prompted for
provider access, sign in with the intended Atlassian account, authorize the
intended Atlassian Cloud site, and enable the intended Atlassian apps. If the
flow is rejected by organization policy, complete {#allow-speakeasy-domain}
and retry.

Screenshot note: capture **Attach Remote Identity Provider** after discovery
with DCR selected and no secret values visible.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Atlassian's MCP documentation at
https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/."

## Open questions

- Does the Speakeasy MCP Catalog contain an exact Atlassian Rovo MCP Server
  entry? The supplied catalog lookup was ambiguous, so both add-server paths
  must remain conditional.
- After selecting **Configure Manually**, does the discovered Atlassian issuer
  remain populated in **Issuer URL**? The canonical Speakeasy source does not
  establish this state, so the walkthrough supplies the exact issuer when the
  field is empty.
- What exact Speakeasy OAuth redirect domain must an Atlassian organization
  admin allow for this DCR connection, and what hosted outbound IP ranges must
  be added when the organization enforces Atlassian IP allowlists? These values
  are not present in Atlassian's public docs or the canonical Speakeasy setup
  source.
- If **User Installed Apps** is blocked, what exact current Atlassian
  Administration clicks install or approve the Atlassian MCP app? The MCP
  client page states that a site admin might need to install it but delegates
  the procedure to a separate app-policy guide rather than documenting the
  complete path.

## Provenance

Source inventory from the sweep:

- **Support and product/admin documentation — `support.atlassian.com`:** the
  primary MCP setup, authentication, troubleshooting, and organization-policy
  documentation. `/llms.txt` returned a 404 page, so the MCP collection's
  linked articles and targeted page fetches were used instead.
- **Developer documentation — `developer.atlassian.com`:** searched for a
  machine-readable index; `/llms.txt` returned 404. No separate current Rovo
  MCP setup flow was found or used.
- **Marketing/platform site — `atlassian.com`:** `/llms.txt` was available and
  identified the official remote MCP page; the page corroborates the product
  but does not add setup details.
- **Live service metadata — `mcp.atlassian.com` and `auth.atlassian.com`:** used
  to validate the endpoint, OAuth resource discovery, and DCR support.

Sources drawn from:

- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/`
  ("Getting started with the Atlassian Rovo MCP Server") — observed
  `2026-08-07T18:48:21Z`. Backs current remote URL, broad MCP-client support,
  OAuth 2.1 primary authentication, API-token availability, sign-in flow, and
  permissions warning.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-clients/`
  ("Setting up clients") — observed `2026-08-07T18:48:21Z`. Backs standing
  Cloud-site, product-access, browser, and OAuth requirements; API-token admin
  gate; and the legacy SSE retirement date.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/authentication-and-authorization/`
  ("Authentication and authorization") — observed `2026-08-07T18:48:21Z`.
  Backs OAuth recommendation, interactive consent, API-token alternatives,
  header methods, and organization-admin enablement.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-oauth-2-1/`
  ("Configuring OAuth 2.1") — observed `2026-08-07T18:48:21Z`. Backs OAuth
  bearer presentation, app/scope consent, site binding, permission enforcement,
  and first-connect OAuth recovery.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-authentication-via-api-token/`
  ("Configuring authentication via API token") — observed
  `2026-08-07T18:48:21Z`. Backs excluded Basic/Bearer alternatives, their
  non-interactive purpose, admin gate, and reduced tool availability.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/using-with-other-supported-mcp-clients/`
  ("Using with other supported MCP clients") — observed
  `2026-08-07T18:48:21Z`. Backs custom-client requirements, OAuth login, site
  authorization, app enablement, and the conditional User Installed Apps gate.
- `https://support.atlassian.com/security-and-access-policies/docs/control-atlassian-rovo-mcp-server-settings/`
  ("Control Atlassian Rovo MCP server settings") — observed
  `2026-08-07T18:48:21Z`. Backs **Rovo** > **Rovo MCP server**, **Add domain**,
  **Allow Atlassian supported domains**, IP-allowlist behavior, `*.atlassian.net`
  egress, and the **API token** toggle.
- `https://support.atlassian.com/security-and-access-policies/docs/specify-ip-addresses-for-product-access/`
  ("Specify IP addresses for product access") — observed
  `2026-08-07T18:48:21Z`. Backs the Atlassian Administration URL, **Security** >
  **IP allowlists** route, **Create IP allowlist**, source-address/CIDR entry,
  and selection of the sites and apps to which an allowlist applies.
- `https://support.atlassian.com/security-and-access-policies/docs/available-atlassian-rovo-mcp-server-domains/`
  ("Available Atlassian Rovo MCP server domains") — observed
  `2026-08-07T18:48:21Z`. Backs the published default-domain list, domain-rule
  purpose, and protocol/host/pattern requirements; Speakeasy is not named.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/troubleshooting-and-verifying-your-setup/`
  ("Troubleshooting and verifying your setup") — observed
  `2026-08-07T18:48:21Z`. Backs first-connect symptoms and recovery for access,
  scopes, redirects, browser pop-ups, and network filters.
- `https://www.atlassian.com/platform/remote-mcp-server` — observed
  `2026-08-07T18:48:21Z`. Corroborates that Atlassian operates the Rovo MCP
  Server for external AI clients.
- `https://mcp.atlassian.com/v1/mcp/authv2` — direct unauthenticated endpoint
  observation at `2026-08-07T18:48:21Z`. Returned HTTP 401 with a Bearer
  challenge naming the protected-resource metadata URL.
- `https://mcp.atlassian.com/.well-known/oauth-protected-resource/v1/mcp/authv2`
  — observed `2026-08-07T18:48:21Z`. Backs exact resource URL, authorization
  issuer, scopes, bearer header method, and provider documentation URL.
- `https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3/.well-known/oauth-authorization-server`
  — observed `2026-08-07T18:48:21Z`. Backs authorization, token, and dynamic
  registration endpoints, grants, PKCE, and token endpoint methods.
- `doctrine/speakeasy-setup.md` — observed `2026-08-07T18:48:21Z`. Backs the
  transcluded Speakeasy flow, fixed anchors, exact product labels, DCR behavior,
  dual conditional under ambiguous catalog presence, and closing-pointer form.
