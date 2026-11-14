---
research_version: 1
slug: zapier
researched_at: 2026-11-14T09:12:52Z
---

# Zapier — Research Dossier

## Revalidation 2026-11-14

The catalogue worker revalidated this Guide for Linear GRW-459; the factory
pipeline did not redraft it. The Guide was first researched
2026-08-11T18:36:07Z and partly re-verified 2026-09-30.

- **Re-fetched and compared:** `docs.zapier.com/llms.txt`, every
  `docs.zapier.com/mcp/` page cited in Provenance (following redirects),
  `zapier.com/llms.txt`, `zapier.com/mcp`, the retired support article,
  unauthenticated probes of the remote URL and its OAuth metadata, and the
  Speakeasy dashboard source at `speakeasy-api/gram` main
  `121c3bfba8734c7c5ba49d44870bb8c76c4c9768` (2026-11-14).
- **Unchanged:** the remote URL, Streamable HTTP only (no SSE), the 401
  `resource_metadata` challenge, the PRM issuer and scopes, the DCR
  registration endpoint with no CIMD, OAuth as Zapier's default connection
  model, availability on every Zapier plan, two tasks per successful tool
  call, default MCP enablement and workspace controls, and auto-provisioning
  from the authorizing user's own app connections. External setup needed no
  wording change.
- **Changed upstream (no effect on the rendered route):** Zapier restructured
  its MCP docs. `mcp/get-started/connect` now redirects (308) to
  `mcp/get-started/quickstart`; `mcp/get-started/authentication` redirects to
  `mcp/overview/how-connections-work`; `mcp/features/usage` redirects to
  `mcp/overview/usage`. The support article
  `help.zapier.com/hc/en-us/articles/36265392843917-Use-Zapier-MCP-with-your-client`
  is retired: it redirects (301) to the docs connect page and from there to
  the quickstart. Provenance now cites the destination pages, and the support
  article entry is removed because its facts are covered by them. The pages
  now agree that an OAuth client needs no pre-created server; they still say
  unlisted clients use a connection token (see Server facts and Open
  questions). Dynamic discovery is now called **agentic mode**, and the
  task-limit behavior depends on pay-per-task billing. These facts are
  recorded below and are not rendered.
- **Changed in Speakeasy:** at gram main `121c3bf`, catalog completion shows
  an **Added to your project** card with **View server** instead of the
  **Server added successfully** banner and **Configure MCP settings**. When a
  Guardrails step is offered, the configure button reads **Continue** and the
  step's dismiss control is **Skip**. The identity picker now says
  authorization server (**Search authorization servers…**) and shows the
  issuer without its scheme (`mcp.zapier.com`). Turning on **Enable MCP
  server** opens an **Enable MCP server?** confirmation with **Continue**.
  `speakeasy.md` now uses these labels. `doctrine/speakeasy-setup.md` still
  carries the older ones and needs a human-approved refresh (constitution
  I8); where the two differ, this Dossier follows the product source.
- **Not re-checked:** the PulseMCP catalog record
  `com.pulsemcp.mirror/zapier`. This run had no PulseMCP tenant credential or
  catalog snapshot, so its observation stays at 2026-08-11T18:36:07Z and the
  Guide's oldest observation does not advance. The anonymous DCR registration
  probe was not repeated, because it creates a client registration at Zapier;
  the registration endpoint was re-read from live metadata, and the 201
  result is still dated 2026-09-30. No browser authorization was completed,
  and neither a live Speakeasy dashboard nor the authenticated
  `mcp.zapier.com` UI was used.

## Server facts

- Remote URL: `https://mcp.zapier.com/api/v1/connect`. Zapier says every MCP
  client connects to this same endpoint.
- Transport: Streamable HTTP only. Zapier says a client that can only use SSE
  cannot connect.
- Authentication Option documented by this Guide: OAuth with Dynamic Client
  Registration (DCR). The remote's RFC 9728 protected-resource metadata names
  `https://mcp.zapier.com` as its authorization server. That server's RFC 8414
  metadata publishes authorization, token, registration, revocation, and
  userinfo endpoints; supports authorization-code and refresh-token grants
  with S256 PKCE; and advertises `openid`, `profile`, and `email` scopes.
- The remote is a shared public URL, not a region-, instance-, or
  organization-specific URL.
- Zapier MCP is included in every Zapier plan and uses the account's existing
  task allowance. Each successful tool call consumes two tasks; failed calls,
  authentication and setup, listing available tools, and viewing history do
  not. At the task limit, tool calls continue up to a usage cap when
  pay-per-task billing is on; otherwise they stop until the billing cycle
  resets, the plan is upgraded, or pay-per-task billing is turned on.
- Zapier MCP is enabled by default for all accounts, including Enterprise.
  Workspace administrators can have Zapier enable or disable MCP per workspace
  through their account manager and can restrict access through workspace
  membership. The account used to authorize the connection must belong to an
  MCP-enabled account or workspace.
- OAuth is Zapier's default connection model. During the OAuth sign-in,
  Zapier connects the client to the user's default Zapier MCP server and
  creates that server the first time; Zapier's docs say not to create a
  server at `mcp.zapier.com` first. New servers default to agentic mode, in
  which Zapier auto-provisions actions from app connections owned by the
  authorizing user. Connections shared by another Zapier user are not
  auto-provisioned. The agent can discover and enable further actions later;
  no fixed tool inventory belongs in this Guide.

Zapier's current docs agree that OAuth clients need no pre-created server,
which resolves the conflict recorded on 2026-09-30. They still frame OAuth as
the path for clients on Zapier's supported-client list and the connection
token as the path for a client that "is not on the supported list"; the
Speakeasy AI Control Plane is not on that list. The docs index
(`docs.zapier.com/llms.txt`) describes the connection token as a fallback
"only when the client cannot complete OAuth, is not listed, or you are
writing code". This Guide keeps the direct OAuth path because the shared
remote returns an RFC 9728 challenge and publishes a DCR registration
endpoint that the Speakeasy AI Control Plane can complete, and because the
forced Speakeasy MCP Catalog entry maps to that shared remote. The
connection-token path is therefore not rendered.

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
   201 with a `client_id`; it was not repeated on `2026-11-14`. The reader
   does not paste `{{ gram.oauth.callback_url }}` into Zapier and does not
   handle the generated client ID or secret.
5. When provider access is first requested, the intended user signs in to
   Zapier and completes Zapier's browser authorization prompts. Their own
   existing app connections are eligible for auto-provisioning.

Zapier also documents a connection token for unlisted MCP clients and for
code (Python, TypeScript, and the Anthropic and OpenAI APIs). That path
requires creating a server at `mcp.zapier.com` and generating a long-lived
token, and is not the Authentication Option selected for this catalog Guide.

## Console walkthrough

There is no provider-side console walkthrough before adding the catalog server.
The selected DCR path creates no credential in `mcp.zapier.com`; provider
sign-in and authorization happen on demand after the Speakeasy-side identity
is configured, and Zapier creates the user's default server during that
sign-in. Consequently, there are no provider-step anchors or provider
screenshots to mint. Screenshot exception: there is no provider console state
in the pre-connection path.

The user needs a Zapier account in an MCP-enabled account or workspace. Having
at least one app connection owned by that user allows OAuth auto-provisioning
to make actions available immediately, but it is not required to establish the
MCP connection itself.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
observed `2026-09-30`. Labels re-checked against the product source at gram
`main` `121c3bf` (2026-11-14): `client/dashboard/src/pages/catalog/AddServerDialog.tsx`,
`pages/catalog/CatalogGuardrailsPhase.tsx`,
`pages/catalog/useRemoteMcpInstallWorkflow.ts`,
`pages/catalog/hooks/serverMetadata.ts`,
`pages/mcp/x/tabs/settings/sections/authentication/CreationIdentityChoice.tsx`,
`pages/mcp/x/tabs/settings/sections/authentication/AuthenticationSection.tsx`,
`pages/mcp/x/tabs/settings/sections/DangerZoneSection.tsx`, and
`lib/remote-identity/` (`components/IdentityModeCards.tsx`,
`components/ProviderRow.tsx`, `drafts/useIdentityDraft.ts`). Where doctrine
and the product source differ, the product source governs.

Per-guide values:

- Remote URL: `https://mcp.zapier.com/api/v1/connect` (shared, not tenanted)
- `speakeasy_add_server`: `catalog`; catalog lookup present, matched
  registry `com.pulsemcp.mirror/zapier`, title **Zapier** (observed
  2026-08-11, not re-checked). Speakeasy's code-defined registry seed
  (`server/internal/mcpregistry/oktaseed/oktaseed.go` at gram `main`
  `121c3bf`, not a rendered fact) also lists
  `com.zapier/mcp`, title **Zapier**, with `SupportsDCR: true` and the same
  remote URL.
- Authentication Option: OAuth with DCR (`oauth-dcr`). Identity mode:
  **User Identity**
- External credential fields: none
- Probe outcome (`2026-11-14`, unchanged from `2026-09-30`): JSON-RPC
  `initialize` POST returns 401 with `WWW-Authenticate: Bearer
  resource_metadata="https://mcp.zapier.com/.well-known/oauth-protected-resource/api/v1/connect"`
- PRM issuer: `https://mcp.zapier.com`; PRM `scopes_supported`: `openid`,
  `profile`, `email`
- CIMD / DCR: no `client_id_metadata_document_supported`; registration
  endpoint `https://mcp.zapier.com/api/v1/oauth/register`; anonymous DCR
  returned 201 on `2026-09-30` (not repeated)
- Registration choice: **Auto-Configure** (DCR, the only method offered).
  The **Add to Project** dialog preselects **User Identity** when the
  catalog entry advertises DCR or CIMD (`supportsAutomaticOAuth`); otherwise
  it preselects **Manual**. The flag on the PulseMCP entry was not
  re-checked, so the Guide tells the reader to select **User Identity** if it
  is not already selected. Creation normally configures the identity; the
  credential section is a confirmation plus the fallback.
- Scope: none entered; **Auto-Configure** has no **Scope** control
- Server Availability: rendered as a conditional final step when creation
  left the server **Disabled**
- Further reading: `https://docs.zapier.com/mcp/get-started/quickstart` (the
  destination of the former `mcp/get-started/connect` link)

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **From the
catalog**. On the **MCP Catalog** page, find Zapier using **Search MCP
servers...**, open its catalog entry, and click **Add**. In **Add to
Project**, under **Identity**, select **User Identity** if it is not already
selected, then click **Add to Project**. When a Guardrails step is offered,
that button reads **Continue**; on the **Guardrails** step, click **Skip**
(guardrails are out of guide scope). When the dialog shows **Added to your
project**, click **View server** to open the server.

Speakeasy registers a client with Zapier automatically. There is no
**Client ID** or secret to paste. If that cannot complete, the server is
kept **Disabled** and the dialog reads "Added, but disabled until identity
is set up."; **Finish setup** opens the server's **Settings**.

Screenshot note: the Zapier catalog entry with the **Identity** choice.

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. Creation
normally already shows **User Identity**, the `mcp.zapier.com`
authorization server, and **Auto-Configure**; keep only the Server
Availability step. Otherwise: select **User Identity**, confirm the
authorization server shown is `mcp.zapier.com` (one that does not exist yet
is badged **Will be created**; if a different one is shown, open the picker
and search **Search authorization servers…** for `mcp.zapier.com`), keep
**Auto-Configure**, and click **Save**. If the server shows **Disabled**,
open **Settings > Danger Zone > Server Availability**, turn on **Enable MCP
server**, and confirm with **Continue** in the **Enable MCP server?** dialog
so it shows **Enabled**.

When provider access is first needed, complete Zapier's on-screen browser
sign-in and authorization prompts with the account whose app connections
should be available.

Screenshot note: **Settings > Identity** with **User Identity** selected,
the Zapier authorization server, and **Auto-Configure**; values redacted.

The closing pointer is: This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Zapier's MCP documentation at
https://docs.zapier.com/mcp/get-started/quickstart.

## Open questions

- Zapier's public documentation does not publish the exact labels or content
  of the browser sign-in and authorization prompts presented after
  registration. The Setup Guide should direct the reader to complete Zapier's
  on-screen prompts without inventing labels.
- Zapier's docs say OAuth applies to clients on its supported-client list and
  send unlisted clients to the connection-token path, while its docs index
  limits that fallback to clients that cannot complete OAuth. The Speakeasy
  AI Control Plane is unlisted but completes DCR. Anonymous registration
  succeeded on `2026-09-30`, but no browser authorization has been completed
  end to end, because that requires authorizing a Zapier account. A person
  with a Zapier account could confirm that sign-in from the Speakeasy AI
  Control Plane completes and creates or reuses the default server.
- The PulseMCP catalog record `com.pulsemcp.mirror/zapier` was not
  re-observed (no PulseMCP access in this run). Until someone re-observes it,
  the Guide's oldest observation stays at 2026-08-11.

## Provenance

### Source inventory

- Developer documentation: `https://docs.zapier.com`; its index is
  `https://docs.zapier.com/llms.txt`. Used. The MCP section now lives under
  `mcp/get-started/` and `mcp/overview/`.
- Product and admin surface: `https://mcp.zapier.com`; authentication is
  required for dashboard UI, while the remote endpoint and OAuth metadata are
  public. Public metadata used; authenticated UI not probed.
- Product site: `https://zapier.com`; its machine-readable root index is
  `https://zapier.com/llms.txt`. The MCP product page is
  `https://zapier.com/mcp`. Used for plan availability.
- Support knowledge base: `https://help.zapier.com/hc/en-us`. The MCP client
  article previously cited now redirects to the developer docs; not used.
- Speakeasy setup doctrine: `doctrine/speakeasy-setup.md` (gram `main`
  `68b3f78`). Used for the fixed Speakeasy-side flow and anchors.
- Speakeasy product source: `speakeasy-api/gram` `client/dashboard` at
  `main` `121c3bf`. Used for current Speakeasy labels.

### Source records

- `https://docs.zapier.com/llms.txt` — observed `2026-11-14T09:12:52Z`;
  documentation-property sweep, current MCP page inventory, and the
  connection-token fallback wording.
- `https://docs.zapier.com/mcp/overview/how-connections-work` (formerly
  `mcp/get-started/authentication`) — observed `2026-11-14T09:12:52Z`; shared
  endpoint, Streamable HTTP only, OAuth versus connection token, and Zapier
  creating the server during OAuth sign-in.
- `https://docs.zapier.com/mcp/get-started/quickstart` (also the destination
  of `mcp/get-started/connect`) — observed `2026-11-14T09:12:52Z`; OAuth as
  the default, no pre-created server, the supported-client list,
  auto-provisioning after authentication, and the closing-pointer page.
- `https://docs.zapier.com/mcp/overview/how-servers-work` — observed
  `2026-11-14T09:13:25Z`; default server created at first sign-in.
- `https://docs.zapier.com/mcp/get-started/connect/other` — observed
  `2026-11-14T09:13:25Z`; the unlisted-client connection-token path.
- `https://docs.zapier.com/mcp/overview/how-tools-work` — observed
  `2026-11-14T09:12:52Z`; agentic and managed modes, auto-provisioning,
  and the ownership limitation for app connections.
- `https://docs.zapier.com/mcp/overview/usage` (formerly
  `mcp/features/usage`) — observed `2026-11-14T09:12:52Z`; task billing,
  non-billable setup and authentication, and task-limit behavior.
- `https://docs.zapier.com/mcp/manage/security` — observed
  `2026-11-14T09:12:52Z`; default account enablement, workspace controls,
  user permissions, and account-level restrictions.
- `https://zapier.com/llms.txt` — observed `2026-11-14T09:12:52Z`;
  product-property sweep and pointer to the developer documentation index.
- `https://zapier.com/mcp` — observed `2026-11-14T09:12:52Z`; included in
  every Zapier plan and use of the existing task quota.
- `https://mcp.zapier.com/api/v1/connect` — observed
  `2026-11-14T09:13:41Z`; live `401` response and RFC 9728
  `WWW-Authenticate` challenge.
- `https://mcp.zapier.com/.well-known/oauth-protected-resource/api/v1/connect`
  — observed `2026-11-14T09:13:41Z`; resource identifier, authorization
  server, and supported scopes.
- `https://mcp.zapier.com/.well-known/oauth-authorization-server` — observed
  `2026-11-14T09:13:41Z`; issuer, OAuth endpoints, DCR endpoint, no CIMD,
  grants, token authentication methods, PKCE methods, and scopes. The
  anonymous registration result (201) dates from `2026-09-30`.
- Pulse MCP Catalog record `com.pulsemcp.mirror/zapier`, title `Zapier` —
  observed `2026-08-11T18:36:07Z`; catalog presence and catalog add-server
  path. Source: `pulsemcp`. Not re-checked on `2026-11-14`.
- `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`) — observed
  `2026-09-30`; fixed Speakeasy-side flow, **Identity** section, anchors,
  **Auto-Configure**, Server Availability, and screenshot notes.
- `https://github.com/speakeasy-api/gram/tree/121c3bfba8734c7c5ba49d44870bb8c76c4c9768/client/dashboard`
  — observed `2026-11-14T09:12:00Z`; current catalog add, Guardrails,
  completion, identity, authorization-server, and Server Availability
  labels.
