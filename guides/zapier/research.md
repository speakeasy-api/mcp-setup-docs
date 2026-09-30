---
research_version: 1
slug: zapier
researched_at: 2026-08-11T18:36:07Z
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
shared URL with “no server setup required,” while the documentation index,
quickstart, authentication page, and support article still describe creating a
client-specific server first. This Guide uses the direct OAuth path because the
shared remote currently returns an RFC 9728 challenge and publishes a DCR
registration endpoint, and because the forced Speakeasy MCP Catalog entry maps
to that shared remote. The older connection-token path is therefore not
rendered.

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
   client details (**Auto-Configure**; the issuer advertises DCR only, no
   CIMD). An anonymous DCR registration probe on `2026-09-30` returned HTTP
   201 with a `client_id`. The reader does not paste `{{ gram.oauth.callback_url }}`
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
provider is configured. Consequently, there are no provider-step anchors or
provider screenshots to mint. Screenshot exception: there is no provider
console state in the pre-connection path.

The user needs a Zapier account in an MCP-enabled account or workspace. Having
at least one app connection owned by that user allows OAuth auto-provisioning
to make actions available immediately, but it is not required to establish the
MCP connection itself.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
observed `2026-09-30`.

Per-guide values:

- Remote URL: `https://mcp.zapier.com/api/v1/connect` (shared, not tenanted)
- `speakeasy_add_server`: `catalog`; catalog lookup present, matched
  registry `com.pulsemcp.mirror/zapier`, title **Zapier**
- Authentication Option: OAuth with DCR (`oauth-dcr`). Identity mode:
  **User Identity**
- External credential fields: none
- Probe outcome (`2026-09-30`): JSON-RPC `initialize` POST returns 401 with
  `WWW-Authenticate: Bearer
  resource_metadata="https://mcp.zapier.com/.well-known/oauth-protected-resource/api/v1/connect"`
- PRM issuer: `https://mcp.zapier.com`; PRM `scopes_supported`: `openid`,
  `profile`, `email`
- CIMD / DCR: no `client_id_metadata_document_supported`; registration
  endpoint `https://mcp.zapier.com/api/v1/oauth/register`; anonymous DCR
  returned 201
- Registration choice: **Auto-Configure** (DCR, the only method offered).
  The catalog entry supports client registration, so **Add to Project**
  preselects **User Identity** and creation normally configures the
  identity; the credential section is a confirmation plus the fallback
- Scope: none entered; **Auto-Configure** has no **Scope** control
- Server Availability: rendered as a conditional final step when creation
  left the server **Disabled**
- Further reading: `https://docs.zapier.com/mcp/get-started/connect`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **From the
catalog**. On the **MCP Catalog** page, find Zapier using **Search MCP
servers...**, open its catalog entry, and click **Add**. In **Add to
Project**, keep **User Identity**, then click **Add to Project** (click
**Skip for now** if a **Guardrails** step appears). After **Server added
successfully**, click **Configure MCP settings**.

Speakeasy registers a client with Zapier automatically. There is no
**Client ID** or secret to paste. If that cannot complete, the server is
kept **Disabled** and the result says to finish setup in **Settings >
Identity**.

Screenshot note: the Zapier catalog entry with the **Identity** choice.

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. Creation
normally already shows **User Identity**, the `https://mcp.zapier.com`
provider, and **Auto-Configure**; keep only the Server Availability step.
Otherwise: select **User Identity**, confirm the preselected provider is
`https://mcp.zapier.com` (a new one is badged **Will be created**), keep
**Auto-Configure**, and click **Save**. If the server shows **Disabled**,
open **Settings > Danger Zone > Server Availability** and turn on **Enable
MCP server** so it shows **Enabled**.

When provider access is first needed, complete Zapier's on-screen browser
sign-in and authorization prompts with the account whose app connections
should be available.

Screenshot note: **Settings > Identity** with **User Identity** selected,
the Zapier provider, and **Auto-Configure**; values redacted.

The closing pointer is: This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Zapier's MCP documentation at
https://docs.zapier.com/mcp/get-started/connect.

## Open questions

- Zapier's public documentation does not publish the exact labels or content
  of the browser sign-in and authorization prompts presented after
  registration. The
  Setup Guide should direct the reader to complete Zapier's on-screen prompts
  without inventing labels.
- Zapier has not reconciled its direct-connect page with its server-creation
  quickstart and support pages. The direct DCR route is selected from live
  discovery metadata. Anonymous registration succeeds (201 on
  `2026-09-30`), but the browser authorization was not completed end to end
  because that requires authorizing a Zapier account. As of `2026-09-30`
  the connect page states "Zapier creates and configures the server during
  that sign-in", which supports the direct path.

## Provenance

### Source inventory

- Developer documentation: `https://docs.zapier.com`; its MCP index is
  available at `https://docs.zapier.com/llms.txt`. Used. The index itself
  still recommends creating a server, while its current client-connection
  page says no server setup is required.
- Product and admin surface: `https://mcp.zapier.com`; authentication is
  required for dashboard UI, while the remote endpoint and OAuth metadata are
  public. Public metadata used; authenticated UI not probed.
- Product site: `https://zapier.com`; its machine-readable root index is
  `https://zapier.com/llms.txt`. The MCP product page is
  `https://zapier.com/mcp`. Used for plan availability and enterprise
  positioning.
- Support knowledge base: `https://help.zapier.com/hc/en-us`. Used to compare
  the older server/token setup path and confirm plan availability.
- Speakeasy setup doctrine: `doctrine/speakeasy-setup.md` (gram `main`
  `68b3f78`). Used for the fixed
  Speakeasy-side flow, labels, and anchors.

### Source records

- `https://docs.zapier.com/llms.txt` — observed
  `2026-08-11T18:36:07Z`; documentation-property sweep and current MCP page
  inventory.
- `https://docs.zapier.com/mcp/get-started/connect` — observed
  `2026-09-30`; shared remote URL, Streamable HTTP, no SSE,
  direct OAuth connection, and server created during sign-in.
- `https://docs.zapier.com/mcp/get-started/authentication` — observed
  `2026-08-11T18:36:07Z`; documented authentication alternatives and the
  older connection-token path.
- `https://docs.zapier.com/mcp/get-started/quickstart` — observed
  `2026-08-11T18:36:07Z`; conflicting named-server setup flow and OAuth as
  the normal flow for listed clients.
- `https://docs.zapier.com/mcp/overview/how-tools-work` — observed
  `2026-08-11T18:36:07Z`; dynamic discovery, OAuth auto-provisioning,
  ownership limitation for app connections, and manual-mode distinction.
- `https://docs.zapier.com/mcp/features/usage` — observed
  `2026-09-30`; task billing, non-billable setup/authentication,
  and task-limit behavior.
- `https://docs.zapier.com/mcp/manage/security` — observed
  `2026-09-30`; default account enablement, workspace controls,
  user permissions, and account-level restrictions.
- `https://zapier.com/llms.txt` — observed `2026-08-11T18:36:07Z`;
  product-property sweep and pointer to the developer documentation index.
- `https://zapier.com/mcp` — observed `2026-08-11T18:36:07Z`; availability
  on all plans and use of the existing plan quota.
- `https://help.zapier.com/hc/en-us/articles/36265392843917-Use-Zapier-MCP-with-your-client`
  — observed `2026-08-11T18:36:07Z`; support-site requirements, all-plan
  availability, and the older unlisted-client token flow.
- `https://mcp.zapier.com/api/v1/connect` — observed
  `2026-09-30`; live `401` response and RFC 9728
  `WWW-Authenticate` challenge.
- `https://mcp.zapier.com/.well-known/oauth-protected-resource/api/v1/connect`
  — observed `2026-09-30`; resource identifier, authorization
  server, and supported scopes.
- `https://mcp.zapier.com/.well-known/oauth-authorization-server` — observed
  `2026-09-30`; issuer, OAuth endpoints, DCR endpoint (anonymous
  registration returned 201), no CIMD, grants, token authentication methods,
  PKCE methods, and scopes.
- Pulse MCP Catalog record `com.pulsemcp.mirror/zapier`, title `Zapier` —
  observed `2026-08-11T18:36:07Z`; catalog presence and catalog add-server
  path. Source: `pulsemcp`.
- `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`) — observed
  `2026-09-30`; fixed Speakeasy-side flow, **Identity** labels,
  **Auto-Configure**, Server Availability, screenshot notes, and anchors.
