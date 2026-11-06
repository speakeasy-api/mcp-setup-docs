---
research_version: 1
slug: microsoft-365
---

# Microsoft 365 — Research Dossier

## Evidence boundary and provenance

This guide was written by hand, not drafted by the factory. Its facts come from Speakeasy's own server source and a local end-to-end test, plus Microsoft's public Entra and Graph documentation. The server is Speakeasy-hosted, so its behavior is documented by the server's source and README rather than by provider documentation.

- **Server source:** [speakeasy-api/customer-mcps#54](https://github.com/speakeasy-api/customer-mcps/pull/54), `src/shared/m365`, inspected 2026-11-06. It covers the tool list, authorization behavior, published metadata, and required scopes.
- **Local end-to-end test, 2026-11-06:** an MCP client signed in through a locally run AI Control Plane, with a tenant-specific custom identity provider and a manually registered single-tenant Entra client. These tools succeeded: `get_granted_scopes`, `get_me`, `outlook_email_search`, `outlook_calendar_search`, `outlook_find_available_time`, `teams_list_teams`, `teams_list_chats`, `sharepoint_folder_search`, `search_people`, and `outlook_create_draft` followed by `outlook_delete_draft`. Production was not tested, and the production endpoint was not yet deployed when this was written.
- **Entra discovery, fetched 2026-11-06:** `https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration`. It returned `issuer` `https://login.microsoftonline.com/{tenantid}/v2.0` and no `code_challenge_methods_supported`. `/.well-known/oauth-authorization-server` at that authority returned 404.
- **Inherited evidence:** native UI labels come from `doctrine/speakeasy-setup.md` (revision `68b3f78f…`, 2026-09-30) and client capabilities from `doctrine/ai-control-plane-oauth.md` (revision `4e1fef38…`, 2026-09-15). The Entra console steps, consent and assignment behavior, and the `client_secret_post` finding come from `guides/work-iq` (research dated 2026-10-29). These are inherited dates, not new validation.

## Server facts

- **Product:** Speakeasy-hosted Microsoft 365 MCP server, with the same 50 tool names as Anthropic's Microsoft 365 connector. It is not Microsoft's Work IQ server.
- **Remote:** `https://catalog.speakeasy.com/m365/mcp`, `streamable-http`, one shared endpoint (`tenanted: false`). The URL is derived from the production catalog domain and the `m365` route in `infra/prod`.
- **Stateless:** each request's bearer token, a delegated Entra access token for Microsoft Graph, is forwarded to `graph.microsoft.com`. The server stores, refreshes, and validates nothing.
- **Probe outcome:** a tool call without a token returns `401` with `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource/m365/mcp"`. Listing tools needs no token.
- **Protected-resource metadata:**
  - `authorization_servers` is `["https://login.microsoftonline.com/organizations/v2.0"]`.
  - `scopes_supported` lists every Graph scope below plus `offline_access`.
  - `bearer_methods_supported` is `["header"]`.
- **Auth errors:** Graph 401 becomes `401 invalid_token`. A Graph 403 that names missing permissions becomes `403 insufficient_scope` with the tool's scopes. Other Graph errors are tool errors.
- **`speakeasy_add_server: custom-remote`:** the server is Speakeasy-hosted, and no catalog lookup was performed.

## Credential flow

- `register-entra-application` produces the **Directory (tenant) ID** and **Application (client) ID**. It registers `{{ gram.oauth.callback_url }}` as a **Web** redirect URI.
- `add-graph-permissions` adds these delegated Graph permissions and grants tenant-wide admin consent:
  - **Sign-in:** `openid`, `profile`, `offline_access`
  - **Profile and people:** `User.Read`, `User.ReadBasic.All`, `People.Read`
  - **Mail:** `Mail.ReadWrite`, `Mail.Read.Shared`, `Mail.Send`, `MailboxSettings.ReadWrite`
  - **Calendar:** `Calendars.ReadWrite`, `Calendars.Read.Shared`
  - **Teams:** `Chat.Read`, `Chat.Create`, `ChatMessage.Send`, `Channel.ReadBasic.All`, `ChannelMessage.Read.All`, `ChannelMessage.Send`, `Team.ReadBasic.All`
  - **Files:** `Files.ReadWrite.All`, `Sites.Read.All`
  - **Meetings:** `OnlineMeetings.Read`, `OnlineMeetingTranscript.Read.All`
- `create-client-secret` produces the client secret **Value**.
- `restrict-app-access` is optional: it requires assignment and assigns users or groups.

## Speakeasy setup values

- **Remote URL:** `https://catalog.speakeasy.com/m365/mcp`. Path: **Custom remote** (`custom-remote`).
- **Identity mode:** OAuth → **User Identity**.
- **Issuer named by the metadata:** `https://login.microsoftonline.com/organizations/v2.0`.
  - The Control Plane requires an exact issuer match on discovery. Entra's multi-tenant document publishes the placeholder issuer `{tenantid}`, so the provider the picker would create from the metadata fails.
  - Use the custom identity provider route instead, with **Issuer URL** `https://login.microsoftonline.com/<TENANT_ID>/v2.0` and the tenant-specific authorization and token endpoints.
  - Entra advertises neither CIMD nor a `registration_endpoint`. Registration: **Manual**.
- **Scope (override), comma-separated:** `openid,profile,offline_access` plus each Graph permission as `https://graph.microsoft.com/<Scope>`. Blank is not safe, because the metadata advertises every scope, which may exceed what the customer consented.
- **Token endpoint authentication:** `client_secret_post` resolved `invalid_client` in the Work IQ pilot. It was not separately confirmed for this server.
- **Further reading:** [Microsoft Graph overview](https://learn.microsoft.com/en-us/graph/overview).

## Provider steps

### Register the Entra application {#register-entra-application}

Single-tenant (**Accounts in this organizational directory only**) app with a **Web** redirect URI of `{{ gram.oauth.callback_url }}`. Produces **Application (client) ID** and **Directory (tenant) ID**. Source: [app registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app); console labels as validated in `guides/work-iq`.

### Add the Microsoft Graph permissions {#add-graph-permissions}

The delegated permissions listed under Credential flow, then **Grant admin consent**. Source: [Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference), [admin consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent).

### Create a client secret {#create-client-secret}

**Certificates & secrets → New client secret**; copy the **Value**, shown once. Source: `guides/work-iq`.

### Restrict who can connect {#restrict-app-access}

Optional. **Enterprise applications → Properties → Assignment required? → Yes**, then **Users and groups**. Group assignment needs Entra ID P1/P2 and does not expand nested groups; Global Administrators bypass the requirement. Source: [assignment](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal).

### Test the connection {#test-connection}

Read-only smoke test with `get_me`, `outlook_email_search`, `teams_list_teams`, and `outlook_find_available_time`, matching the local end-to-end test. Speakeasy anchors `add-server-in-speakeasy` and `connect-speakeasy-credentials` are carried from `doctrine/speakeasy-setup.md`.

## Open questions

- **Resource indicator.** The Control Plane sends the RFC 8707 `resource` parameter by default and retries without it only on `invalid_target`. It has not been confirmed which error Entra v2 returns for an unexpected `resource`. The guide gives a troubleshooting line rather than a step, because `doctrine/speakeasy-setup.md` carries no label for this setting.
- **Production.** The production endpoint, the production callback URL, and catalog routing were not tested.
- **Multi-tenant pattern.** Each customer needs its own tenant-specific identity provider, because of exact issuer matching. Whether the Control Plane should accept Entra's placeholder issuer, allowing one shared multi-tenant application, is undecided.
