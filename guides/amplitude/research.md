---
research_version: 1
slug: amplitude
researched_at: "2026-11-02T07:00:00Z"
---

# Amplitude — Research Dossier

Source ruling for this Guide: Amplitude's public MCP page
(`https://amplitude.com/docs/amplitude-ai/amplitude-mcp`) is authoritative
for the regional server URLs, transport, authentication, organization admin
controls, and MCP role actions. Amplitude's access and session-replay
reference pages supply how a reader tells US from EU. Live endpoint and
OAuth metadata for both regions corroborate the URLs and establish that each
region's issuer advertises Client ID Metadata Documents (CIMD) and Dynamic
Client Registration (DCR). Observed `2026-11-02`.

## Server facts

- **Remote URLs (region-specific):** Amplitude's "Remote server" table lists
  "United States Server (Default)" `https://mcp.amplitude.com/mcp` and "EU
  Residency Server" `https://mcp.eu.amplitude.com/mcp`, and says "Use the
  Standard Server URL unless your Amplitude data resides in the EU region."
  The other-clients page repeats both URLs. Both remotes are marked
  `tenanted: true` because the reader must pick the URL for their region.
- **Region identification:** Amplitude's access and SSO FAQ says "If you
  signed up with EU data storage, log in at app.eu.amplitude.com/login." The
  replay link reference says to check the URL when logged in: "EU accounts
  use `app.eu.amplitude.com`." US organizations use `app.amplitude.com`.
  Third-party claims of an organization "Data Center" setting were not used:
  they are not provider documentation.
- **Transport:** `streamable-http` ("Streaming HTTP (Remote)" on the MCP page).
- **Authentication Option documented here:** OAuth 2.0 with automatic client
  registration. Amplitude requires OAuth for remote clients and the server
  uses the connecting user's existing Amplitude permissions. No app, client,
  or API key is created in Amplitude.
- **Availability:** "Any existing Amplitude customer can use Amplitude MCP."
  No plan gate is documented.
- **Organization admin control:** "Amplitude enables MCP server access by
  default for all users in your organization." Org admins can opt out or
  restrict it at **Settings > Content Access > MCP**, using the content access
  controls to allow or block the server. The setting is admin-only, applies to
  all MCP clients and users, and individual users can't override it.
- **Role actions:** two RBAC actions, **Use MCP (read)** (`USE_MCP_READ`) and
  **Use MCP (write)** (`USE_MCP_WRITE`), under **Org Settings > Role
  Management**, category **AI Features**. "Every role grants read access, and
  the Member, Manager, and Admin roles also grant write access, so nothing
  changes until an admin adjusts a role." Enforced per tool call and per
  project; a disallowed tool still appears in the tool list and fails at call
  time. Create, update, delete, and restore calls need **Use MCP (write)**.
- **OAuth discovery (probed 2026-11-02, both regions):** an unauthenticated
  request to each `/mcp` URL returns HTTP 401 with `WWW-Authenticate: Bearer
  realm="OAuth", resource_metadata="https://mcp[.eu].amplitude.com/.well-known/oauth-protected-resource"`.
  Each PRM names resource `https://mcp[.eu].amplitude.com`, one authorization
  server on the same host, and `scopes_supported` `all:read`, `all:write`.
  Each issuer's metadata at `/.well-known/oauth-authorization-server` has
  issuer `https://mcp.amplitude.com` (US) or `https://mcp.eu.amplitude.com`
  (EU), a `registration_endpoint` at `/register` on the same host,
  `client_id_metadata_document_supported: true`, PKCE `S256`, and token
  endpoint auth methods `client_secret_post` and `none`.
- **Not rendered:** Amplitude's Enterprise-only service accounts and their
  regional token endpoints. They are for non-interactive use; the assigned
  setup is per-user OAuth.
- **Speakeasy MCP Catalog:** the catalogue already has `com.amplitude/mcp`
  with the US remote only. The guide does not use it: the remotes are
  tenanted, and the operator assignment settles **Hosted remotely** for both
  regions.

## Credential flow

The selected Authentication Option needs no provider-side credential. The
Speakeasy AI Control Plane follows the region's PRM to the issuer on the same
host and registers its own client (**Auto-Configure**; CIMD by default, DCR
also advertised). Readers do not register `{{ gram.oauth.callback_url }}` with
Amplitude.

At first use, each user signs in to Amplitude in the browser and approves
access. Amplitude's troubleshooting section says to be signed in to only one
Amplitude organization during the OAuth flow, and that the authorization page
may appear to spin; close the tab after authentication. Access is limited to
the user's existing project permissions and the MCP role actions above.

## Console walkthrough

Provider-side work is a region lookup plus two conditional admin checks.
With Amplitude's defaults (MCP allowed, every role granting read) no
Amplitude change is needed.

### Find your Amplitude region {#find-amplitude-region}

- Sign in and read the hostname: `app.amplitude.com` → US URL;
  `app.eu.amplitude.com` → EU URL.
- Value recorded: the MCP server URL for that region.
- Screenshot note: the address bar with organization and project identifiers
  obscured.

### Check organization MCP access {#check-mcp-access}

- Org admin: **Settings** > **Content Access** > **MCP**; allow the server for
  the connecting users if it is blocked.
- The public docs do not name the individual allow/block control labels; the
  Guide says "content access controls" as Amplitude does.
- Screenshot note: the MCP content access page with user and group names
  obscured.

### Check MCP role actions {#check-mcp-role-actions}

- Conditional on custom roles or changed MCP actions.
- Org admin: **Org Settings** > **Role Management**; create or edit a role;
  **AI Features** → **Use MCP (read)**, and **Use MCP (write)** for write tools;
  assign to users or groups scoped to the relevant projects.
- Screenshot note: the **AI Features** category with both actions visible.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
read `2026-11-02`.

Per-guide values:

- Remote URL: the US or EU URL selected in {#find-amplitude-region}.
- Add-server path: Custom remote only, because both remotes are
  `tenanted: true`; catalog presence is ignored. Render **Hosted remotely**.
- Authentication Option: OAuth, no provider credentials. Identity mode:
  **User Identity**.
- Probe outcome: 401 with a `resource_metadata` challenge in both regions, so
  **Hosted remotely** preselects **User Identity** after **Verify
  connectivity**.
- PRM issuer: `https://mcp.amplitude.com` (US) or
  `https://mcp.eu.amplitude.com` (EU).
- CIMD / DCR: both advertised in both regions. Neither was exercised end to
  end; anonymous DCR registration was not attempted. No registration method is
  named.
- Registration choice: **Auto-Configure** (dashboard default); creation
  normally configures the identity, so the credential section is a
  confirmation plus the fallback.
- Scope: none entered. The PRM advertises `all:read` and `all:write`; access
  is bounded by the user's Amplitude permissions and MCP role actions.
- External credential fields: none. Conditional admin steps:
  {#check-mcp-access}, {#check-mcp-role-actions}.
- Server Availability: rendered as a conditional final step when creation
  left the server **Disabled**.
- Further reading: `https://amplitude.com/docs/amplitude-ai/amplitude-mcp`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **Hosted
remotely**. On **New remote MCP server**, paste the region's URL into **MCP
server URL**. Optionally enter **Display name (optional)**. Leave **User
session issuer** at its default. Click **Verify connectivity**, keep the
preselected **User Identity**, leave **Guardrails** off, then click **Save**.
This creates the server and opens its **Overview** page.

On save, Speakeasy configures the identity provider and registers a client
automatically. When that cannot complete, the server is kept **Disabled** and
the result says to finish setup in **Settings > Identity**.

Screenshot note: **New remote MCP server** after **Verify connectivity**,
with an Amplitude URL and **User Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. When
creation already configured the identity, confirm **User Identity**, the
Amplitude provider, and **Auto-Configure**, and keep only the Server
Availability step. Otherwise: select **User Identity**; under **Choose an
identity provider**, confirm the preselected provider is the region's issuer
(a new one is badged **Will be created**), or choose it with **Search
identity providers…**; keep **Auto-Configure**; click **Save**. There is no
**Client ID** or secret to paste. If the server shows **Disabled**, open
**Settings > Danger Zone > Server Availability** and turn on **Enable MCP
server** so it shows **Enabled**.

At first use, sign in to Amplitude while signed in to only one Amplitude
organization, approve access, and close the tab if the page keeps loading.
Amplitude suggests confirming with "What Amplitude projects can I access?".

Screenshot note: **Settings > Identity** with **User Identity**, the
Amplitude provider, and **Auto-Configure**; values redacted.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Amplitude's MCP documentation at
https://amplitude.com/docs/amplitude-ai/amplitude-mcp."

## Research limitations

- CIMD and DCR registration were not exercised end to end in either region;
  anonymous DCR was not attempted because it would register a client at the
  provider. If Auto-Configure fails, the Guide should name the working
  method under **Advanced > Registration method**.
- The rendered dashboard was not spot-checked for these URLs; labels come
  from the doctrine and the dashboard source.
- Amplitude's public docs do not name the individual controls on the
  **Content Access** > **MCP** page or the consent-screen button labels.

## Operator decisions

- Use **Hosted remotely** for both regions (assignment for this guide). The
  doctrine is unchanged.

## Provenance

- `https://amplitude.com/docs/amplitude-ai/amplitude-mcp` ("Amplitude MCP
  Server") — observed `2026-11-02`. Backs both regional URLs, transport,
  OAuth, availability, the admin content-access control, the MCP role
  actions and their defaults, per-call enforcement, and OAuth troubleshooting.
- `https://amplitude.com/docs/amplitude-ai/amplitude-mcp/other-clients` —
  observed `2026-11-02`. Corroborates both URLs and the OAuth requirement.
- `https://amplitude.com/docs/faq/access-and-sso` — observed `2026-11-02`.
  Backs the EU sign-in hostname.
- `https://amplitude.com/docs/session-replay/replay-link-reference` —
  observed `2026-11-02`. Backs reading the region from the signed-in URL.
- `https://mcp.amplitude.com/mcp` and `https://mcp.eu.amplitude.com/mcp` —
  unauthenticated requests at `2026-11-02`. Returned 401 with a
  `resource_metadata` challenge.
- `https://mcp.amplitude.com/.well-known/oauth-protected-resource` and the EU
  equivalent — observed `2026-11-02`. Back the resource, issuer, and scopes.
- `https://mcp.amplitude.com/.well-known/oauth-authorization-server` and the
  EU equivalent — observed `2026-11-02`. Back the issuers, CIMD support,
  registration endpoints, PKCE, and token endpoint auth methods.
- Operator assignment for `amplitude` — observed `2026-11-02`. Backs the
  **Hosted remotely** path for both regions.
- `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`) — observed
  `2026-11-02`. Backs the transcluded Speakeasy flow, fixed anchors, product
  labels, **Auto-Configure**, Server Availability, and the closing pointer.
