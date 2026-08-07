---
research_version: 1
slug: atlassian
researched_at: "2026-08-07T21:49:51Z"
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
  That document identifies the resource, supported scopes, bearer-header use,
  and an Atlassian authorization-server metadata URL. Following that discovery
  chain advertises authorization, token, and dynamic-registration endpoints,
  authorization-code and refresh-token grants, PKCE `S256`, and token endpoint
  authentication method `none` among its methods. Live checks verified
  `https://auth.atlassian.com/authorize`,
  `https://auth.atlassian.com/oauth/token`, and the advertised DCR endpoint;
  an empty POST to the DCR endpoint returned HTTP 400 rather than 404. These
  endpoints are metadata observations, not guessed URL constructions. The
  Speakeasy AI Control Plane can therefore use protected-resource discovery
  and DCR without a pasted issuer. The stable issuer/base auth URL is
  `https://auth.atlassian.com`; do not present the opaque authorization-server
  identifier as the base auth URL. Because the base issuer's own metadata does
  not advertise registration, prefer **Use Discovered** rather than attempting
  to reconstruct DCR from the base issuer alone.
- **Access model:** after setup, each user signs in to Atlassian, authorizes the
  client for an Atlassian Cloud site, and enables the intended Atlassian apps.
  Calls remain constrained by that user's product access and permissions.
- **Standing requirements:** an Atlassian Cloud site with Jira, Confluence,
  and/or Compass; the connecting user needs access to the intended Atlassian
  apps and a modern browser for OAuth. Atlassian documents no paid-plan gate
  for the MCP Server.
- **Organization controls that can block first connection:** OAuth client
  domains must be allowed in Atlassian Rovo MCP Server settings; applicable
  organization IP allowlists also apply to MCP requests. Atlassian notes that
  app-management policy can also affect access but does not document a
  complete approval path on the MCP client page, so this Guide does not supply
  approval clicks. For strict egress filtering, direct the organization's
  network/security owner to allow `*.atlassian.net` for interactive widgets;
  this is not an Atlassian Administration change.
- **Alternative authentication not rendered by this Guide:** Atlassian also
  supports personal API tokens via Basic authentication and, where available,
  service-account API keys via Bearer authentication, but only when an
  organization admin enables **API token**. This is intended for non-interactive
  or machine-to-machine use and can expose fewer tools. It is excluded because
  the assigned interactive Speakeasy setup is directly supported by OAuth 2.1
  DCR and Atlassian recommends OAuth for that scenario.
- **Speakeasy MCP Catalog:** unresolved for the current Rovo remote MCP
  Server. The operator's query `atlassian` produced one non-exact hit and no
  exact title/name match, so both add-server branches remain conditional; use
  the Custom remote server path unless a catalog result clearly identifies the
  current Rovo remote endpoint above.

## Credential flow

The selected Authentication Option does not require an Atlassian developer app
or pre-created credentials. The Speakeasy AI Control Plane follows the remote's
protected-resource metadata and dynamically registers its session client. Use
**Use Discovered** so that chain supplies Atlassian's verified DCR endpoint; do
not construct or substitute a registration endpoint. The stable issuer/base
auth URL is `https://auth.atlassian.com`, but its base metadata alone does not
advertise DCR. DCR registers the hosted callback URL
`https://app.getgram.ai/mcp/remote_login_callback`; the reader does not create
an OAuth app or paste `{{ gram.oauth.callback_url }}` into an Atlassian app
registration.

At first use, the intended user completes Atlassian's browser authorization
flow, grants access to the relevant Atlassian Cloud site, and enables the
intended Atlassian apps. The user must already have product access and the
necessary permissions; OAuth does not expand them.

Before connecting, an organization admin must ensure that the hosted OAuth
callback is allowed if it is not already covered by the organization's
Atlassian-supported or custom domain rules. Atlassian's current published
supported-domain list does not name the Speakeasy AI Control Plane. Add the
exact hosted callback `https://app.getgram.ai/mcp/remote_login_callback` as a
custom domain pattern when required; it includes the protocol, valid host, and
callback path Atlassian's documented pattern rules accept.

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
- Check whether the allowed domain rules already cover the hosted callback. If
  they do not, select **Add domain** and add this exact custom domain pattern:
  `https://app.getgram.ai/mcp/remote_login_callback`. Atlassian requires a
  protocol and a valid host; this value also limits the rule to the callback
  path. The public provider docs do not name the input field or final
  save-button label; after entering the pattern, use the submission control
  shown in the console.
- Do not disable **Allow Atlassian supported domains** merely to add a custom
  domain. Atlassian documents that deselecting it blocks its supported-domain
  set.
- If the organization enforces Atlassian IP allowlists, ask the
  network/security owner to confirm that hosted Speakeasy requests comply with
  them. Atlassian says an MCP client's outbound addresses can matter, but no
  exact Speakeasy ranges are established by the public sources for this Guide.
- If strict egress filtering is enabled, ask the network/security owner to
  allow `*.atlassian.net` so interactive Jira and Confluence widgets can
  render. This change is made in the organization's network controls, not in
  Atlassian Administration.
- Value entered: the exact hosted OAuth callback above.
- Screenshot note: **Rovo** > **Rovo MCP server** showing the domain list and
  **Add domain**, with organization-specific domains redacted.
- Recovery on first connection: if Atlassian denies the OAuth redirect, return
  to this page and verify the client origin matches an allowed domain or
  pattern. If authorization appears but tool calls return an IP permission
  error, update the relevant organization IP allowlist; the consent screen can
  still appear when subsequent tool calls are blocked.

If app-management policy blocks authorization, hand the failure to the site
admin who owns Marketplace and third-party app policy. Atlassian documents the
possible gate but not a complete approval path for this MCP client, so this
Guide does not prescribe clicks.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md`, observed
`2026-08-07T21:49:51Z`.

Per-guide values:

- Remote URL: `https://mcp.atlassian.com/v1/mcp/authv2`
- Transport: `streamable-http` (the add form's **Transport** field is
  read-only)
- Authentication Option: OAuth with DCR; protected-resource metadata makes
  discovery available, and there are no provider credentials. Use **Use
  Discovered**. The issuer/base auth URL is `https://auth.atlassian.com`, while
  DCR availability and the registration endpoint come from the verified
  protected-resource discovery chain, not from a constructed URL
- External governance step when required: {#allow-speakeasy-domain}
- Scope override: leave empty; discovery advertises the server's supported
  scopes and Atlassian's authorization screen determines the granted apps and
  scopes
- Further reading:
  `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If an **Atlassian Rovo** result in the catalog clearly identifies the current
  remote URL above: choose **3rd-party server**. On the **MCP Catalog** page,
  find Atlassian using **Search MCP servers...**, open that result with
  **View**, and click **Add**. In **Add to Project**, click **Add to Project**.
- If no clearly current Rovo result appears: choose **Custom remote server**.
  On **Add a custom remote MCP server**, paste
  `https://mcp.atlassian.com/v1/mcp/authv2` into **Remote MCP server URL** and
  click **Add server**.

Either branch creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the **Add Source** menu open on the **Sources** page,
or the exact current Atlassian Rovo catalog result if one is present.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**, use
**Use Discovered**. In **Attach Remote Identity Provider**, confirm the
issuer/base auth URL is `https://auth.atlassian.com`. Keep the auto-derived
**Slug** and **Display name (optional)**. Under **Endpoints**, click **Discover**
so the authorization, token, and registration endpoints fill from Atlassian's
discovery chain. Under **Session Client**, keep **Client Type** set to **Dynamic
Client Registration (DCR)** and keep the discovered **Token Endpoint Auth
Method**. Leave **Scope
(override)** and **Audience (optional)** empty. Click **Attach Identity
Provider**.

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

- Does the Speakeasy MCP Catalog contain an exact result for the current
  Atlassian Rovo remote MCP Server? The supplied lookup was ambiguous, so both
  add-server paths remain conditional.
- If **Use Discovered** is unavailable, can the current manual sheet retain the
  protected-resource-discovered registration endpoint while showing
  `https://auth.atlassian.com` as the issuer/base auth URL? The base issuer's
  metadata does not itself advertise registration, so this Guide does not
  claim a manual fallback that public sources cannot complete.

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
- **Workflow operator observations:** used for Speakeasy-specific facts that
  Atlassian cannot publish: the hosted callback URL and the ambiguous current
  catalog lookup.

Sources drawn from:

- Workflow operator notes for assignment `atlassian` — observed
  `2026-08-07T21:49:51Z`. Back the hosted callback URL
  `https://app.getgram.ai/mcp/remote_login_callback`, the unresolved current
  catalog presence, and the absence of published exact hosted outbound IP
  ranges.

- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/`
  ("Getting started with the Atlassian Rovo MCP Server") — observed
  `2026-08-07T21:49:51Z`. Backs current remote URL, broad MCP-client support,
  OAuth 2.1 primary authentication, API-token availability, sign-in flow, and
  permissions warning.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-clients/`
  ("Setting up clients") — observed `2026-08-07T21:49:51Z`. Backs standing
  Cloud-site, product-access, browser, and OAuth requirements; API-token admin
  gate; and the legacy SSE retirement date.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/authentication-and-authorization/`
  ("Authentication and authorization") — observed `2026-08-07T21:49:51Z`.
  Backs OAuth recommendation, interactive consent, API-token alternatives,
  header methods, and organization-admin enablement.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-oauth-2-1/`
  ("Configuring OAuth 2.1") — observed `2026-08-07T21:49:51Z`. Backs OAuth
  bearer presentation, app/scope consent, site binding, permission enforcement,
  and first-connect OAuth recovery.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-authentication-via-api-token/`
  ("Configuring authentication via API token") — observed
  `2026-08-07T21:49:51Z`. Backs excluded Basic/Bearer alternatives, their
  non-interactive purpose, admin gate, and reduced tool availability.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/using-with-other-supported-mcp-clients/`
  ("Using with other supported MCP clients") — observed
  `2026-08-07T21:49:51Z`. Backs custom-client requirements, OAuth login, site
  authorization, app enablement, and the possible app-management-policy gate.
- `https://support.atlassian.com/security-and-access-policies/docs/control-atlassian-rovo-mcp-server-settings/`
  ("Control Atlassian Rovo MCP server settings") — observed
  `2026-08-07T21:49:51Z`. Backs **Rovo** > **Rovo MCP server**, **Add domain**,
  **Allow Atlassian supported domains**, IP-allowlist behavior, `*.atlassian.net`
  egress, and the **API token** toggle.
- `https://support.atlassian.com/security-and-access-policies/docs/specify-ip-addresses-for-product-access/`
  ("Specify IP addresses for product access") — observed
  `2026-08-07T21:49:51Z`. Backs the Atlassian Administration URL, **Security** >
  **IP allowlists** route, **Create IP allowlist**, source-address/CIDR entry,
  and selection of the sites and apps to which an allowlist applies.
- `https://support.atlassian.com/security-and-access-policies/docs/available-atlassian-rovo-mcp-server-domains/`
  ("Available Atlassian Rovo MCP server domains") — observed
  `2026-08-07T21:49:51Z`. Backs the published default-domain list, domain-rule
  purpose, and protocol/host/pattern requirements; Speakeasy is not named.
- `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/troubleshooting-and-verifying-your-setup/`
  ("Troubleshooting and verifying your setup") — observed
  `2026-08-07T21:49:51Z`. Backs first-connect symptoms and recovery for access,
  scopes, redirects, browser pop-ups, and network filters.
- `https://www.atlassian.com/platform/remote-mcp-server` — observed
  `2026-08-07T21:49:51Z`. Corroborates that Atlassian operates the Rovo MCP
  Server for external AI clients.
- `https://mcp.atlassian.com/v1/mcp/authv2` — direct unauthenticated endpoint
  observation at `2026-08-07T21:49:51Z`. Returned HTTP 401 with a Bearer
  challenge naming the protected-resource metadata URL.
- `https://mcp.atlassian.com/.well-known/oauth-protected-resource/v1/mcp/authv2`
  — observed `2026-08-07T21:49:51Z`. Backs exact resource URL, authorization
  issuer, scopes, bearer header method, and provider documentation URL.
- Atlassian authorization-server metadata discovered from the protected
  resource — observed `2026-08-07T21:49:51Z`. Backs the exact authorization,
  token, and dynamic-registration endpoints, grants, PKCE, and token endpoint
  methods. The opaque discovery locator is intentionally not presented as the
  user-entered issuer/base auth URL.
- `https://auth.atlassian.com/.well-known/oauth-authorization-server` — observed
  `2026-08-07T21:49:51Z`. Backs the stable base issuer and exact authorization
  and token endpoints. This base document does not advertise registration;
  DCR support is established only by the protected-resource discovery chain.
- `doctrine/speakeasy-setup.md` — observed `2026-08-07T21:49:51Z`. Backs the
  transcluded Speakeasy flow, fixed anchors, exact product labels, DCR behavior,
  dual conditional under ambiguous catalog presence, and closing-pointer form.
