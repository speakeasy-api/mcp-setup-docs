---
research_version: 1
slug: atlassian
researched_at: "2026-09-30T00:00:00Z"
---

# Atlassian — Research Dossier

Source ruling for this Guide: the Atlassian Support collection for the
Atlassian MCP server (now under `support.atlassian.com/atlassian-ai-gateway/`;
the old `atlassian-rovo-mcp-server` paths redirect there) is the primary setup
source. Its current getting started page specifies the v2 endpoint
`https://mcp.atlassian.com/v2/mcp`. The security and access policies
collection supplies organization-admin controls. Live endpoint and OAuth
metadata corroborate the endpoint and establish that the discovered issuer
supports Client ID Metadata Documents (CIMD) and Dynamic Client Registration
(DCR). The marketing site is corroborative only. Re-verified
`2026-09-30`.

## Server facts

- **Remote URL:** `https://mcp.atlassian.com/v2/mcp`. Atlassian's getting
  started page lists it under "Other MCP-compatible clients" and in every
  client example. The previous `https://mcp.atlassian.com/v1/mcp/authv2`
  endpoint is v1; Atlassian says: "On March 1, 2027 any existing utilization
  of v1 will automatically start to expose and utilize v2 tools. Any
  incompatible clients will need to clear cached clientIds or .well-known
  credentials to support continued authentication." Servers added from the
  earlier version of this Guide on v1 may need their identity re-created
  after that date.
- **Gateway override (not rendered):** the same page says "If you're
  utilising an MCP gateway, you may want to expose all tools available in
  Atlassian MCP, rather than utilising the discovery and execute methods",
  using `https://mcp.atlassian.com/v2/mcp?tools=all`. Whether the Speakeasy
  AI Control Plane should use this override is an open question; the Guide
  renders the base URL.
- **Transport:** `streamable-http`. Atlassian's current examples configure the
  URL with HTTP transport. The older SSE endpoint
  `https://mcp.atlassian.com/v1/sse` is unsupported after June 30, 2026.
- **Authentication Option documented here:** OAuth 2.1 with Dynamic Client
  Registration. OAuth is Atlassian's primary and recommended mechanism for an
  interactive user-driven connection. No Client ID or Client Secret is created
  in Atlassian Administration for this option.
- **OAuth discovery (probed 2026-09-30):** an unauthenticated JSON-RPC
  `initialize` POST to `https://mcp.atlassian.com/v2/mcp` returns HTTP 401
  with `WWW-Authenticate: Bearer
  resource_metadata="https://mcp.atlassian.com/.well-known/oauth-protected-resource/v2/mcp"`.
  That PRM names resource `https://mcp.atlassian.com/v2/mcp` and one
  authorization server, the path issuer
  `https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3`. Its
  `scopes_supported` lists 38 scopes (`read:me`, `read:account`,
  `offline_access`, `email`, and `*:agent-interface` / `*:twg` scopes across
  Jira, Confluence, Rovo, code, Goals, Projects, Bitbucket, Loom, Talent,
  Jira Align, Teams, artifacts, capacity planning, Focus, and Assets). The
  path issuer's metadata
  (`https://auth.atlassian.com/.well-known/oauth-authorization-server/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3`)
  advertises `client_id_metadata_document_supported: true`, registration
  endpoint
  `https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3/dcr/register`,
  authorization endpoint `https://auth.atlassian.com/authorize`, token
  endpoint `https://auth.atlassian.com/oauth/token`, and token endpoint auth
  methods `none`, `client_secret_post`, `client_secret_basic`, and
  `private_key_jwt`. An anonymous DCR registration with the hosted callback
  as redirect URI returned HTTP 201 with a `client_id`. The base issuer
  `https://auth.atlassian.com` also advertises CIMD but no
  `registration_endpoint`; it is not the issuer the PRM names.
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
  the **Hosted remotely** path unless a catalog result clearly identifies the
  current v2 remote endpoint above.

## Credential flow

The selected Authentication Option does not require an Atlassian developer app
or pre-created credentials. The Speakeasy AI Control Plane follows the remote's
protected-resource metadata to the path issuer
`https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3` and registers
its own client automatically (**Auto-Configure**, CIMD by default, DCR also
advertised). Do not construct or substitute a registration endpoint, and do
not use the base issuer `https://auth.atlassian.com` in its place. The
registered client uses the hosted callback `{{ gram.oauth.callback_url }}`;
the reader does not create an OAuth app or paste the callback into an
Atlassian app registration.

At first use, the intended user completes Atlassian's browser authorization
flow, grants access to the relevant Atlassian Cloud site, and enables the
intended Atlassian apps. The user must already have product access and the
necessary permissions; OAuth does not expand them.

Before connecting, an organization admin must ensure that the hosted OAuth
callback is allowed if it is not already covered by the organization's
Atlassian-supported or custom domain rules. Atlassian's current published
supported-domain list does not name the Speakeasy AI Control Plane. Add the
exact hosted callback `{{ gram.oauth.callback_url }}` as a
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
  `{{ gram.oauth.callback_url }}`. Atlassian requires a
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

Canonical source: `doctrine/speakeasy-setup.md` (gram `main`
`68b3f78`), observed `2026-09-30`.

Per-guide values:

- Remote URL: `https://mcp.atlassian.com/v2/mcp` (shared public URL, not
  tenanted)
- `speakeasy_add_server`: `auto`; Pulse catalog presence ambiguous, so both
  add-server bullets are kept, with the catalog bullet gated on a result
  that clearly identifies the v2 URL
- Authentication Option: OAuth, no provider credentials. Identity mode:
  **User Identity**
- Probe outcome: 401 with a `resource_metadata` challenge, so **Hosted
  remotely** preselects **User Identity** after **Verify connectivity**
- PRM issuer: `https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3`.
  A provider already in the project for the base issuer
  `https://auth.atlassian.com` is the wrong provider; the Guide tells readers
  to choose the one for the path issuer
- CIMD / DCR: the path issuer advertises both; anonymous DCR returned 201.
  CIMD was not exercised end to end, so no registration method is named
- Registration choice: **Auto-Configure** (dashboard default); creation
  normally configures the identity, so the credential section is a
  confirmation plus the fallback
- Scope: none entered. **Auto-Configure** has no **Scope** control; the PRM
  advertises 38 scopes and Atlassian's consent screen determines the granted
  apps
- External credential fields: none. External governance step when required:
  {#allow-speakeasy-domain}
- Server Availability: rendered as a conditional final step when creation
  left the server **Disabled**
- Further reading:
  `https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**.

- If an **Atlassian Rovo** result in the catalog clearly identifies the
  remote URL above: choose **From the catalog**. Find Atlassian using
  **Search MCP servers...**, open its catalog entry, and click **Add**. In
  **Add to Project**, select **User Identity**, then click **Add to
  Project** (click **Skip for now** if a **Guardrails** step appears). After
  **Server added successfully**, click **Configure MCP settings**.
- If it is not: choose **Hosted remotely**. On **New remote MCP server**,
  paste `https://mcp.atlassian.com/v2/mcp` into **MCP server URL**. Click
  **Verify connectivity**, keep the preselected **User Identity**, then
  click **Save**.

On save, Speakeasy configures the identity provider and registers a client
automatically. When that cannot complete, the server is kept **Disabled**
and the result says to finish setup in **Settings > Identity**.

Screenshot note: the **Add MCP server** choices, or the Atlassian catalog
entry with the **Identity** choice.

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. When
creation already configured the identity, confirm **User Identity**, the
Atlassian provider, and **Auto-Configure**, and keep only the Server
Availability step. Otherwise: select **User Identity**; under **Choose an
identity provider**, confirm the preselected provider is the path issuer
`https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3` (a new one is
badged **Will be created**), or open the picker (**Search identity
providers…**) and choose it when a base `auth.atlassian.com` provider is
preselected; keep **Auto-Configure**; click **Save**. There is no **Client
ID** or secret to paste. If the server shows **Disabled**, open **Settings >
Danger Zone > Server Availability** and turn on **Enable MCP server** so it
shows **Enabled**.

When first prompted for provider access, sign in with the intended Atlassian
account, authorize the intended Atlassian Cloud site, and enable the intended
Atlassian apps. If the flow is rejected by organization policy, complete
{#allow-speakeasy-domain} and retry.

Screenshot note: **Settings > Identity** with **User Identity** selected,
the Atlassian provider, and **Auto-Configure**; values redacted.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Atlassian's MCP documentation at
https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/."

## Open questions

- Does the Speakeasy MCP Catalog contain an exact result for the current
  Atlassian v2 remote MCP Server? The supplied lookup was ambiguous, so both
  add-server paths remain conditional.
- Should the Speakeasy AI Control Plane use Atlassian's gateway override
  `https://mcp.atlassian.com/v2/mcp?tools=all` (flat tool list) instead of
  the base URL (discovery and execute tools)? Atlassian suggests it for MCP
  gateways; this is a product decision.
- Does CIMD registration against the path issuer complete end to end? Only
  DCR was exercised (anonymous registration returned 201). If CIMD fails,
  the Guide should name **DCR** under **Advanced > Registration method**.
- When a base `https://auth.atlassian.com` provider already exists in the
  project, does the picker still offer the path issuer as **Will be
  created**? The rendered picker was not spot-checked.

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
  to validate the endpoint, OAuth resource discovery, and CIMD/DCR support.
- **Workflow operator observations:** used for Speakeasy-specific facts that
  Atlassian cannot publish: the hosted callback URL and the ambiguous current
  catalog lookup.

Sources drawn from:

- Workflow operator notes for assignment `atlassian` — observed
  `2026-08-07T21:49:51Z`. Back the hosted callback URL
  (`{{ gram.oauth.callback_url }}`), the unresolved current
  catalog presence, and the absence of published exact hosted outbound IP
  ranges.

- `https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/`
  ("Get started with the Atlassian MCP server") — observed
  `2026-09-30`. Backs the v2 remote URL, the v1-to-v2 cutover on March 1, 2027, the MCP gateway `?tools=all` override, broad MCP-client support,
  OAuth 2.1 primary authentication, API-token availability, sign-in flow, and
  permissions warning.
- `https://support.atlassian.com/atlassian-ai-gateway/docs/set-up-clients/`
  ("Set up clients") — observed `2026-09-30`. Backs standing
  Cloud-site, product-access, browser, and OAuth requirements; API-token admin
  gate; and the legacy SSE retirement date.
- `https://support.atlassian.com/atlassian-ai-gateway/docs/authentication-and-authorization/`
  ("Authentication and authorization") — observed `2026-09-30`.
  Backs OAuth recommendation, interactive consent, API-token alternatives,
  header methods, and organization-admin enablement.
- `https://support.atlassian.com/atlassian-ai-gateway/docs/configure-oauth-2-1/`
  ("Configure OAuth 2.1") — observed `2026-09-30`. Backs OAuth
  bearer presentation, app/scope consent, site binding, permission enforcement,
  and first-connect OAuth recovery.
- `https://support.atlassian.com/atlassian-ai-gateway/docs/configure-authentication-via-api-token/`
  ("Configure authentication via API token") — observed
  `2026-09-30`. Backs excluded Basic/Bearer alternatives, their
  non-interactive purpose, admin gate, and reduced tool availability.
- `https://support.atlassian.com/atlassian-ai-gateway/docs/use-atlassian-rovo-mcp-server/`
  ("Use Atlassian Rovo MCP Server") — observed
  `2026-09-30`. Backs custom-client requirements, OAuth login, site
  authorization, app enablement, and the possible app-management-policy gate.
- `https://support.atlassian.com/security-and-access-policies/docs/control-atlassian-mcp-server-settings/`
  ("Control Atlassian Rovo MCP server settings") — observed
  `2026-09-30`. Backs **Rovo** > **Rovo MCP server**, **Add domain**,
  **Allow Atlassian supported domains**, IP-allowlist behavior, `*.atlassian.net`
  egress, and the **API token** toggle.
- `https://support.atlassian.com/security-and-access-policies/docs/specify-ip-addresses-for-product-access/`
  ("Specify IP addresses for product access") — observed
  `2026-09-30`. Backs the Atlassian Administration URL, **Security** >
  **IP allowlists** route, **Create IP allowlist**, source-address/CIDR entry,
  and selection of the sites and apps to which an allowlist applies.
- `https://support.atlassian.com/security-and-access-policies/docs/available-atlassian-mcp-server-domains/`
  ("Available Atlassian Rovo MCP server domains") — observed
  `2026-09-30`. Backs the published default-domain list, domain-rule
  purpose, and protocol/host/pattern requirements; Speakeasy is not named.
- `https://support.atlassian.com/atlassian-ai-gateway/docs/troubleshoot-and-verify-your-setup/`
  ("Troubleshoot and verify your setup") — observed
  `2026-09-30`. Backs first-connect symptoms and recovery for access,
  scopes, redirects, browser pop-ups, and network filters.
- `https://www.atlassian.com/platform/remote-mcp-server` — observed
  `2026-09-30`. Corroborates that Atlassian operates the Rovo MCP
  Server for external AI clients.
- `https://mcp.atlassian.com/v2/mcp` — direct unauthenticated JSON-RPC
  `initialize` POST at `2026-09-30`. Returned HTTP 401 with a Bearer
  challenge naming the protected-resource metadata URL. (The v1
  `https://mcp.atlassian.com/v1/mcp/authv2` still returns 401 with its own
  PRM; not used.)
- `https://mcp.atlassian.com/.well-known/oauth-protected-resource/v2/mcp`
  — observed `2026-09-30`. Backs exact resource URL, the path authorization
  issuer, the 38 advertised scopes, bearer header method, and resource
  documentation URL.
- `https://auth.atlassian.com/.well-known/oauth-authorization-server/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3`
  — observed `2026-09-30`. Backs the path issuer, CIMD support, the
  registration endpoint, authorization and token endpoints, and token
  endpoint auth methods. An anonymous DCR POST to the registration endpoint
  returned 201 with a `client_id`.
- `https://auth.atlassian.com/.well-known/oauth-authorization-server` — observed
  `2026-09-30`. Backs the base issuer: CIMD advertised, no registration
  endpoint. Not the issuer the PRM names.
- `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`) — observed
  `2026-09-30`. Backs the transcluded Speakeasy flow, fixed anchors, exact
  product labels, the **Identity** section, **Auto-Configure**, Server
  Availability, dual conditional under ambiguous catalog presence, and
  closing-pointer form.
