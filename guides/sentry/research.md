---
research_version: 1
slug: sentry
researched_at: "2026-11-05T00:23:41Z"
---

# Sentry — Research Dossier

Source ruling for this Guide: Sentry's hosted MCP service page,
`https://mcp.sentry.dev` (also published as `https://mcp.sentry.dev/llms.txt`),
is the primary setup source. Sentry's product docs link
`https://docs.sentry.io/product/sentry-mcp/` redirects to it. The open-source
server repository (`getsentry/sentry-mcp`, now served as `getsentry/toolkit`)
supplies the OAuth architecture behind that page. Live endpoint and OAuth
metadata corroborate the endpoint and establish that the issuer supports
Client ID Metadata Documents (CIMD) and Dynamic Client Registration (DCR).
Observed `2026-11-05`.

## Server facts

- **Remote URL:** `https://mcp.sentry.dev/mcp`. The service page calls it
  "The base MCP server address".
- **Optional scoped URLs (not rendered):** the same page documents
  `https://mcp.sentry.dev/mcp/{organizationSlug}` (scoped to one organization)
  and `https://mcp.sentry.dev/mcp/{organizationSlug}/{projectSlug}` (scoped to
  one project), and says "Scoping to a project is recommended when possible."
  It also documents `?experimental=1` for experimental tool variants. A scoped
  URL is per-organization, so it is a tenanted remote that skips the catalog.
  This Guide renders only the shared base URL, which is also the URL in the
  Speakeasy MCP Catalog entry; it fits a gateway that serves users across
  several Sentry organizations and projects.
- **Transport:** `streamable-http`. The page says "Any MCP-compatible client can
  connect using the HTTP transport at the endpoint URL above", and its
  examples use `--transport http`.
- **Authentication Option documented here:** OAuth with automatic client
  registration. The page says "All connections use OAuth. The first connection
  will trigger an authentication flow to connect to your Sentry account." No
  Sentry developer app, internal integration, or auth token is created for
  this option.
- **OAuth discovery (probed 2026-11-05T00:23:41Z):** an unauthenticated
  JSON-RPC `initialize` POST to `https://mcp.sentry.dev/mcp` returned HTTP 401
  with `WWW-Authenticate: Bearer realm="OAuth",
  resource_metadata="https://mcp.sentry.dev/.well-known/oauth-protected-resource/mcp"`.
  That protected-resource metadata (PRM) names resource
  `https://mcp.sentry.dev/mcp`, one authorization server
  `https://mcp.sentry.dev`, `scopes_supported` `org:read`, `project:write`,
  `team:write`, `event:write`, `alerts:write`, and bearer method `header`. The
  issuer metadata at
  `https://mcp.sentry.dev/.well-known/oauth-authorization-server` (issuer
  `https://mcp.sentry.dev`, matching the PRM) advertises
  `registration_endpoint` `https://mcp.sentry.dev/oauth/register`,
  `client_id_metadata_document_supported: true`, authorization endpoint
  `https://mcp.sentry.dev/oauth/authorize`, token endpoint
  `https://mcp.sentry.dev/oauth/token`, grants `authorization_code` and
  `refresh_token`, token endpoint auth methods `client_secret_basic`,
  `client_secret_post`, and `none`, and PKCE method `S256`.
- **Two OAuth hops:** Sentry's architecture doc says the MCP server runs its
  own OAuth provider for MCP clients, shows "MCP consent screen" for the user to
  "Approve MCP permissions", then redirects to Sentry's OAuth at `sentry.io`
  for the Sentry login and API grant. The MCP access token carries the Sentry
  token; calls run as the authorizing Sentry user.
- **Consent skills:** the approval form lists skills as checkboxes. With no
  remembered choice for the client, all active approvable skills are
  preselected; an empty skill selection is rejected. Remembered choices never
  skip the approval form. Exact on-screen labels are not published on the
  service page.
- **Standing requirements:** a Sentry account on sentry.io with access to the
  organizations and projects users need. The service page documents no plan
  gate. The repository points self-hosted Sentry deployments to its separate
  stdio package, so the hosted remote is for sentry.io.
- **Speakeasy MCP Catalog:** the Speakeasy product seeds a catalog entry named
  `io.sentry/mcp` (title **Sentry**) with remote `https://mcp.sentry.dev/mcp`
  and `supportsDcr: true`
  (`speakeasy-api/gram`, `server/internal/mcpregistry/oktaseed/oktaseed.go`,
  commit `9d881a6d40ef0b4b3dd67b88009e8d3cbc9f3bee`). No Pulse tenant lookup
  was run, and whether that entry is listed depends on the organization's
  selected catalog source, so presence is unresolved and both add-server
  branches are kept.

## Credential flow

The selected Authentication Option needs no provider-side credentials. The
Speakeasy AI Control Plane follows the remote's PRM to the issuer
`https://mcp.sentry.dev` and registers its own client automatically
(**Auto-Configure**; CIMD and DCR are both advertised). The registered client
uses the hosted callback `{{ gram.oauth.callback_url }}`; the reader does not
paste the callback anywhere at Sentry.

At first use, each person approves the MCP consent screen (choosing skills),
then signs in to Sentry and authorizes access. Access is limited to what that
person can already reach in Sentry.

## Console walkthrough

None. No Sentry console step is needed before adding the server. The only
provider-side interaction is each user's browser authorization at first use,
which happens after Speakeasy setup.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
observed `2026-11-05T00:23:41Z`. Labels were re-checked against
`speakeasy-api/gram` `client/dashboard` at commit
`9d881a6d40ef0b4b3dd67b88009e8d3cbc9f3bee`: **Add new**, **Add MCP server**,
**From the catalog**, **Hosted remotely**, **Search MCP servers...**,
**New remote MCP server**, **MCP server URL**, **Verify connectivity**,
**Add to Project**, **Skip for now**, **User Identity**, **Will be created**,
**Auto-Configure**, **Danger Zone**, **Server Availability**, **Enable MCP
server**, and the result text "Added, but disabled until identity is set up."
with **Finish setup** are present. The doctrine labels **Server added
successfully**, **Configure MCP settings**, **Choose an identity provider**,
and **Search identity providers…** are not present at that commit; the
provider picker's search box now reads **Search authorization servers…**. This
Guide avoids the absent labels.

Per-guide values:

- Remote URL: `https://mcp.sentry.dev/mcp` (shared public URL, not tenanted)
- `speakeasy_add_server`: `auto`; catalog presence unresolved, so both
  add-server bullets are kept
- Authentication Option: OAuth, no provider credentials. Identity mode:
  **User Identity**
- Probe outcome: 401 with a `resource_metadata` challenge, so **Hosted
  remotely** preselects **User Identity** after **Verify connectivity**. The
  catalog entry records `supportsDcr: true`, so **Add to Project** preselects
  **User Identity** too.
- PRM issuer: `https://mcp.sentry.dev`
- CIMD / DCR: both advertised. Neither was exercised end to end in this run;
  no anonymous registration was attempted. No registration method is named.
- Registration choice: **Auto-Configure** (dashboard default); creation
  normally configures the identity, so the credential section is a
  confirmation plus the fallback
- Scope: none entered. **Auto-Configure** has no **Scope** control. The PRM
  lists five scopes; the consent screen's skill choices determine what each
  user grants.
- External credential fields: none
- Server Availability: rendered as a conditional final step when creation
  left the server **Disabled**
- Further reading: `https://mcp.sentry.dev`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**.

- If a **Sentry** catalog entry for `https://mcp.sentry.dev/mcp` is listed:
  choose **From the catalog**, find **Sentry** using **Search MCP
  servers...**, open its entry, and click **Add**. In **Add to Project**, keep
  **User Identity** under **Identity**, then click **Add to Project**. Finish
  or **Skip for now** any **Guardrails** step, then open the created server.
- If it is not: choose **Hosted remotely**. On **New remote MCP server**, paste
  `https://mcp.sentry.dev/mcp` into **MCP server URL**, click **Verify
  connectivity**, keep **User Identity**, then click **Save**. This opens the
  server's **Overview** page.

On save, Speakeasy discovers Sentry's issuer and registers a client
automatically. When it cannot, the server is kept **Disabled** and the result
says to finish setup in **Settings > Identity** ("Added, but disabled until
identity is set up." with **Finish setup** on the catalog path).

Screenshot note: the **Add MCP server** choices, or the Sentry catalog entry
in **Add to Project** with **User Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. When creation
configured the identity, **User Identity** shows the `https://mcp.sentry.dev`
provider with **Auto-Configure**; only the availability check remains.
Otherwise select **User Identity**, confirm the provider is
`https://mcp.sentry.dev` (badged **Will be created** when new) or find it with
**Search authorization servers…**, keep **Auto-Configure**, and click
**Save**. If the server shows **Disabled**, open **Danger Zone > Server
Availability** and turn on **Enable MCP server** so it shows **Enabled**.

At first use, each person approves the Sentry MCP consent screen, signs in to
Sentry, and authorizes access.

Screenshot note: **Settings > Identity** with **User Identity**, the
`mcp.sentry.dev` provider, and **Auto-Configure**; values redacted.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Sentry's MCP documentation at
https://mcp.sentry.dev."

## Research limitations

- The service page does not publish the consent screen's labels or the Sentry
  authorization prompt's labels, so the Guide names neither.
- The service page documents no plan gate, organization-level control, or
  admin approval for the hosted MCP server. None is rendered.
- CIMD and DCR were confirmed from metadata only. No registration was
  attempted, because it would create a client at Sentry.
- Catalog presence is unresolved (no Pulse lookup; native catalog visibility
  depends on the organization's catalog source).
- Sentry data-residency regions are not discussed on the service page.

## Operator decisions

None.

## Provenance

Source inventory from the sweep:

- **Hosted service page — `mcp.sentry.dev`:** primary setup source, with an
  `/llms.txt` copy.
- **Product docs — `docs.sentry.io`:** `/llms.txt` was searched. Its MCP
  entry (`/product/mcp-servers`) covers monitoring a customer's own MCP
  servers, not this hosted server; not drawn from. `/product/sentry-mcp/`
  redirects to `https://mcp.sentry.dev/`.
- **Repository — `github.com/getsentry/sentry-mcp` (redirects to
  `getsentry/toolkit`):** README and OAuth architecture docs.
- **Speakeasy product source — `speakeasy-api/gram`:** native catalog entry
  and current dashboard labels.

Sources drawn from:

- `https://mcp.sentry.dev` ("Sentry MCP Server") — observed
  `2026-11-05T00:23:41Z`. Backs the base and scoped URLs, the scoping
  recommendation, `?experimental=1`, HTTP transport, and OAuth-only
  connections with first-connection authentication.
- `https://mcp.sentry.dev/llms.txt` — observed `2026-11-05T00:23:41Z`. Same
  content as the service page.
- `https://docs.sentry.io/product/sentry-mcp/` — observed
  `2026-11-05T00:23:41Z`. Redirects to `https://mcp.sentry.dev/`.
- `https://github.com/getsentry/toolkit/blob/7d8a26a0a73de7e73adeff314b2a85af62deb254/README.md`
  — observed `2026-11-05T00:23:41Z`. Backs the hosted-service pointer and the
  stdio package for self-hosted Sentry.
- `https://github.com/getsentry/toolkit/blob/7d8a26a0a73de7e73adeff314b2a85af62deb254/docs/cloudflare/oauth-architecture.md`
  — observed `2026-11-05T00:23:41Z`. Backs the two OAuth hops, DCR and CIMD,
  the MCP consent screen, and Sentry login at `sentry.io`.
- `https://github.com/getsentry/toolkit/blob/7d8a26a0a73de7e73adeff314b2a85af62deb254/docs/specs/remembered-oauth-skills.md`
  — observed `2026-11-05T00:23:41Z`. Backs the skill checkboxes, their
  defaults, and that remembered choices never skip approval.
- `https://mcp.sentry.dev/mcp` — unauthenticated JSON-RPC observation at
  `2026-11-05T00:23:41Z`. Returned 401 with the `resource_metadata` challenge.
- `https://mcp.sentry.dev/.well-known/oauth-protected-resource/mcp` — observed
  `2026-11-05T00:23:41Z`. Backs resource, issuer, scopes, and bearer method.
- `https://mcp.sentry.dev/.well-known/oauth-authorization-server` — observed
  `2026-11-05T00:23:41Z`. Backs issuer, endpoints, CIMD and DCR support,
  grants, auth methods, and PKCE.
- `speakeasy-api/gram` `server/internal/mcpregistry/oktaseed/oktaseed.go` and
  `client/dashboard` at commit `9d881a6d40ef0b4b3dd67b88009e8d3cbc9f3bee` —
  observed `2026-11-05T00:23:41Z`. Backs the `io.sentry/mcp` catalog entry and
  the current dashboard labels listed above.
- `doctrine/speakeasy-setup.md` — observed `2026-11-05T00:23:41Z` (gram main
  `68b3f78`). Backs the transcluded Speakeasy-side flow, fixed anchors, and
  closing-pointer form.
