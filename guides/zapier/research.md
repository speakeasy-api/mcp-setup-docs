---
research_version: 1
slug: zapier
researched_at: 2026-07-28T18:22:42Z
---

# Zapier — Research Dossier

## Server facts

- Remote URL: `https://mcp.zapier.com/api/v1/connect`.
- Transport: Streamable HTTP. Zapier explicitly says SSE is not supported.
- Authentication Option documented by this Guide: OAuth with Dynamic Client
  Registration (DCR). The remote's RFC 9728 protected-resource metadata names
  `https://mcp.zapier.com` as its authorization server. That server's RFC 8414
  metadata publishes authorization, token, registration, and revocation
  endpoints; supports authorization-code and refresh-token grants; and
  advertises `openid`, `profile`, and `email` scopes.
- The remote is a shared public URL, not a region-, instance-, or
  organization-specific URL.
- Zapier MCP is available on all Zapier plans and uses the account's existing
  task allowance. Each successful tool call consumes two tasks; authentication,
  setup, failed calls, and listing available tools do not consume tasks. Tool
  calls stop when the allowance is exhausted and resume after reset or upgrade.
- Zapier MCP is enabled by default, including on Enterprise accounts. Workspace
  administrators can have Zapier enable or disable MCP per workspace through
  their account manager and can restrict access through workspace membership.
  The account used to authorize the connection must belong to an MCP-enabled
  account or workspace.
- OAuth is Zapier's current default connection model. In dynamic-discovery
  mode, OAuth auto-provisions actions from app connections owned by the
  authorizing user. Connections merely shared by another Zapier user are not
  auto-provisioned. The agent can discover and enable further actions later;
  no fixed tool inventory belongs in this Guide.

Zapier's current public documentation is internally inconsistent about whether
a user must first create a named server at `mcp.zapier.com`. The current
**Connect your AI client** page says OAuth clients connect directly to the
shared URL with “no server setup required,” while the quickstart, first-workflow
page, authentication page, and support article still describe creating a
client-specific server first. This Guide uses the direct OAuth path because the
shared remote currently returns an RFC 9728 challenge and publishes a DCR
registration endpoint, and because the Speakeasy MCP Catalog entry maps to that
shared remote. The older connection-token path is therefore not rendered.

## Credential flow

No provider-side client ID, client secret, API key, connection token, callback
registration, or issuer value must be collected for the selected path.

The Speakeasy AI Control Plane can discover OAuth from the remote:

1. An unauthenticated request to the remote returns a `WWW-Authenticate`
   challenge whose `resource_metadata` value is
   `https://mcp.zapier.com/.well-known/oauth-protected-resource/api/v1/connect`.
2. That document identifies `https://mcp.zapier.com` as the authorization
   server.
3. `https://mcp.zapier.com/.well-known/oauth-authorization-server` publishes
   `https://mcp.zapier.com/api/v1/oauth/register` as its DCR endpoint and
   advertises the `openid`, `profile`, and `email` scopes.
4. The Speakeasy AI Control Plane registers and retains the resulting OAuth
   client details. The reader does not paste `{{ gram.oauth.callback_url }}`
   into Zapier and does not handle the generated client ID or secret.
5. When provider access is first requested, the intended user signs in to
   Zapier and completes Zapier's browser authorization prompts. Their own
   existing app connections are eligible for auto-provisioning.

Zapier also documents connection tokens for unlisted clients that cannot
complete OAuth and API keys for its TypeScript and Python SDKs. Those
alternatives require a pre-created Zapier MCP server and are not the
Authentication Option selected for this catalog Guide.

## Console walkthrough

There is no provider-side console walkthrough before adding the catalog server.
The selected DCR path creates no credential in `mcp.zapier.com`; provider
sign-in and authorization happen on demand after the Speakeasy-side identity
provider is attached. Consequently, there are no provider-step anchors or
provider screenshots to mint. Screenshot exception: there is no provider
console state in the pre-connection path.

The user needs a Zapier account in an MCP-enabled account or workspace. Having
at least one app connection owned by that user allows OAuth auto-provisioning
to make actions available immediately, but it is not required to establish the
MCP connection itself.

## Speakeasy setup

Per-guide values:

- Remote URL: `https://mcp.zapier.com/api/v1/connect`
- Transport: `streamable-http`
- Authentication Option: OAuth with DCR (`oauth-dcr`)
- External credential fields: none
- OAuth discovery: available through protected-resource and authorization
  server metadata; no Issuer URL needs to be pasted manually
- Scopes: discovered as `openid`, `profile`, and `email`; no scope override
  should be entered
- Catalog lookup: present; matched registry
  `com.pulsemcp.mirror/zapier`, title **Zapier**
- Further reading:
  `https://docs.zapier.com/mcp/get-started/connect`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**. Choose **3rd-party server**. On the
**MCP Catalog** page, find Zapier using **Search MCP servers...**, open its
entry with **View**, and click **Add**. In the **Add to Project** dialog, click
**Add to Project**. This creates the hosted MCP server and opens its
**Overview** page.

Screenshot note: capture the **Add Source** menu open on the **Sources** page,
or the Zapier catalog entry.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
use **Use Discovered** when offered; otherwise click **Configure Manually**.
In the **Attach Remote Identity Provider** sheet, Zapier's protected-resource
metadata allows discovery without a pasted issuer. Keep the auto-derived
**Slug** and **Display name (optional)**. Under **Endpoints**, click
**Discover** so the authorization, token, and registration endpoints fill
from Zapier's authorization-server metadata. Under **Session Client**, keep
**Client Type** set to **Dynamic Client Registration (DCR)** and keep **Token
Endpoint Auth Method** at its discovered default. Leave **Scope (override)**
and **Audience (optional)** empty. Click **Attach Identity Provider**.

The Speakeasy AI Control Plane registers the OAuth client with Zapier. There is
no **Client ID** or **Client Secret** for the reader to paste and no provider
callback field to configure. When provider access is first needed, complete
Zapier's on-screen browser sign-in and authorization prompts with the account
whose app connections should be available.

Screenshot note: capture the **Attach Remote Identity Provider** sheet after
discovery, showing **Dynamic Client Registration (DCR)** and the discovered
endpoints, with any account-specific values redacted.

The closing pointer is: This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Zapier's MCP documentation at
https://docs.zapier.com/mcp/get-started/connect.

## Open questions

- Zapier's public documentation does not publish the exact labels or content
  of the browser sign-in and authorization prompts presented after DCR. The
  Setup Guide should direct the reader to complete Zapier's on-screen prompts
  without inventing labels.
- Zapier has not reconciled its direct-connect page with its server-creation
  quickstart and support pages. The direct DCR route is selected from live
  discovery metadata, but it was not completed end to end because doing so
  requires registering a client and authorizing a Zapier account.

## Provenance

### Source inventory

- Developer documentation: `https://docs.zapier.com`; its MCP index is
  available at `https://docs.zapier.com/llms.txt`. Used.
- Product and admin surface: `https://mcp.zapier.com`; authentication is
  required for dashboard UI, while the remote endpoint and OAuth metadata are
  public. Public metadata used; authenticated UI not probed.
- Product site: `https://zapier.com/mcp`. Used for plan availability and
  enterprise positioning.
- Support knowledge base: `https://help.zapier.com/hc/en-us`. Used to compare
  the older server/token setup path and confirm plan availability.
- Speakeasy setup doctrine: `doctrine/speakeasy-setup.md`. Used for the fixed
  Speakeasy-side flow, labels, and anchors.

### Source records

- `https://docs.zapier.com/llms.txt` — observed
  `2026-07-28T18:22:42Z`; documentation-property sweep and current MCP page
  inventory.
- `https://docs.zapier.com/mcp/get-started/connect` — observed
  `2026-07-28T18:22:42Z`; shared remote URL, Streamable HTTP, no SSE,
  direct OAuth connection, and no-server-setup statement.
- `https://docs.zapier.com/mcp/get-started/authentication` — observed
  `2026-07-28T18:22:42Z`; documented authentication alternatives and the
  older connection-token path.
- `https://docs.zapier.com/mcp/quickstart` — observed
  `2026-07-28T18:22:42Z`; conflicting named-server setup flow and OAuth as
  the normal flow for listed clients.
- `https://docs.zapier.com/mcp/overview/how-tools-work` — observed
  `2026-07-28T18:22:42Z`; dynamic discovery, OAuth auto-provisioning,
  ownership limitation for app connections, and manual-mode distinction.
- `https://docs.zapier.com/mcp/usage` — observed
  `2026-07-28T18:22:42Z`; task billing, non-billable setup/authentication,
  and task-limit behavior.
- `https://docs.zapier.com/mcp/security` — observed
  `2026-07-28T18:22:42Z`; default account enablement, workspace controls,
  user permissions, and account-level restrictions.
- `https://zapier.com/mcp` — observed `2026-07-28T18:22:42Z`; availability
  on all plans and use of the existing plan quota.
- `https://help.zapier.com/hc/en-us/articles/36265392843917-Use-Zapier-MCP-with-your-client`
  — observed `2026-07-28T18:22:42Z`; support-site requirements, all-plan
  availability, and the older unlisted-client token flow.
- `https://mcp.zapier.com/api/v1/connect` — observed
  `2026-07-28T18:22:42Z`; live `401` response and RFC 9728
  `WWW-Authenticate` challenge.
- `https://mcp.zapier.com/.well-known/oauth-protected-resource/api/v1/connect`
  — observed `2026-07-28T18:22:42Z`; resource identifier, authorization
  server, and supported scopes.
- `https://mcp.zapier.com/.well-known/oauth-authorization-server` — observed
  `2026-07-28T18:22:42Z`; issuer, OAuth endpoints, DCR endpoint, grants,
  token authentication methods, PKCE methods, and scopes.
- Pulse MCP Catalog record `com.pulsemcp.mirror/zapier`, title `Zapier` —
  observed `2026-07-28T18:22:42Z`; catalog presence and catalog add-server
  path. Source: `pulsemcp`.
- `doctrine/speakeasy-setup.md` — observed `2026-07-28T18:22:42Z`; fixed
  Speakeasy-side flow, labels, screenshot notes, and anchors.
