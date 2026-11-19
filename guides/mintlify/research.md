---
research_version: 1
slug: mintlify
researched_at: 2026-11-19T18:25:00Z
---

# Mintlify — Research Dossier

## Server facts

- Mintlify hosts its **admin MCP** server at `https://mcp.mintlify.com`. Every client connects to the same endpoint and authenticates with a Mintlify account. The guide uses the Streamable HTTP remote. An unauthenticated JSON-RPC `initialize` POST returned HTTP 401 with `WWW-Authenticate: Bearer resource_metadata="https://mcp.mintlify.com/.well-known/oauth-protected-resource"`. The [protected resource metadata][resource] names the resource `https://mcp.mintlify.com` and the authorization server `https://mcp.mintlify.com`. [Admin MCP][admin]
- The admin MCP is distinct from the per-site **search MCP** at `/mcp` on a customer's docs domain, which only reads one site's published pages. This guide covers only the admin MCP. [Admin MCP][admin] · [Search MCP][search]
- The admin MCP has write access: it can edit pages, restructure navigation, update `docs.json`, open pull requests, publish, create automations, and change project settings. Content edits land on a branch and ship on `publish` or a merged pull request; project management changes apply immediately to the live project. One connection can access every project in the organization the grant covers. [Admin MCP][admin] · [Tools][tools]
- The OAuth session inherits the user's dashboard permissions. Viewers can only use read tools; admin-only actions, such as `update_config` on protected settings, need an admin role on the project. Mintlify checks the user's current role on every call; a user whose role is raised must reconnect to get the added write access. [Admin MCP][admin] · [Roles][roles]
- Publishing requires the project's GitHub, GitLab, or Bitbucket connection to have write access to the deploy branch's repository. [Admin MCP][admin]
- Mintlify documents no plan requirement for the admin MCP. Role-based access control (viewer/editor/admin) is an Enterprise feature; without RBAC every member has full dashboard access. [Roles][roles]
- The public MCP Registry lists this server as `com.mintlify/adminmcp` with remote `https://mcp.mintlify.com`; recorded as the Guide's alias. [Registry][registry]

## Credential flow

Use OAuth with dynamic client registration. The [issuer metadata][issuer] advertises:

| Field | Value |
| --- | --- |
| Issuer | `https://mcp.mintlify.com` |
| Authorization endpoint | `https://mcp.mintlify.com/oauth/authorize` |
| Token endpoint | `https://mcp.mintlify.com/oauth/token` |
| Registration endpoint | `https://mcp.mintlify.com/oauth/register` |
| Grants and PKCE | `authorization_code`, `refresh_token`; `S256` |
| Token endpoint authentication | `none` |
| Scopes | `docs:read docs:write nav:write config:write session:write deployment:read deployment:write members:read members:write billing:read integrations:write analytics:read offline_access` |

The issuer does not advertise CIMD. An anonymous registration POST with `token_endpoint_auth_method: none` returned HTTP 201 with a `client_id` and no secret, so dynamic registration works as a public client, which the [Speakeasy OAuth capability reference](../../doctrine/ai-control-plane-oauth.md) supports. The PRM and issuer advertise the same scope list, so leaving scope at the default is safe; the effective permissions are bounded by the user's dashboard role. [Resource][resource] · [Issuer][issuer]

**Redirect allowlist.** Mintlify always lets popular clients such as Claude, ChatGPT, Cursor, and Devin complete sign-in. Other clients cannot complete authentication unless their redirect domain is in the **Redirect URIs** section of the dashboard's MCP **Configure** settings. A redirect domain is the hostname the client returns to after sign-in; entries default to `https://`. The list applies to both the admin MCP and the search MCP. Speakeasy is not on the always-allowed list, so the hostname of `{{ gram.oauth.callback_url }}` must be added. [Admin MCP — Redirect URIs][admin-redirect] · [Search MCP — Enable authenticated MCP][search-auth]

Mintlify also offers MCP **Credentials** for gateways that cannot complete an interactive sign-in. They can read content but cannot edit, comment, branch, publish, or discard content. This guide documents the OAuth option only. [Admin MCP — Credentials][admin]

## Console walkthrough

### Allow the Speakeasy redirect domain {#allow-speakeasy-redirect-domain}

In the Mintlify dashboard, open [MCP settings](https://app.mintlify.com/products/mcp) and go to **Configure**. In the **Redirect URIs** section, enter the hostname of `{{ gram.oauth.callback_url }}` (no scheme or path) in **Allowed domains** and click **Add domain**. The list is shared with the search MCP. A screenshot can show the Redirect URIs section with the domain added. [Admin MCP — Redirect URIs][admin-redirect] · [Search MCP — Enable authenticated MCP][search-auth]

## Speakeasy setup

- Add-server path: **Hosted remotely** (`speakeasy_add_server: custom-remote`; no Pulse catalog lookup was available for this run).
- `<remote URL>`: `https://mcp.mintlify.com`.
- Identity: **User Identity** (OAuth). Probe outcome: 401 with a `resource_metadata` challenge, so **User Identity** is preselected.
- Identity provider: discovered issuer `https://mcp.mintlify.com`.
- Registration: **Auto-Configure** (DCR; CIMD not advertised). No client ID or secret.
- Scope: default; PRM and issuer advertise the same list.
- Further reading: [Admin Model Context Protocol (MCP) server][admin].

This follows the [Speakeasy setup doctrine](../../doctrine/speakeasy-setup.md) and the dynamic-registration-plus-provider-allowlist pattern from the [Gong guide](../gong/speakeasy.md).

## Research limitations

Public discovery and anonymous dynamic registration were verified. Authenticated MCP initialization and end-to-end sign-in through Speakeasy were not tested against a Mintlify organization. Mintlify does not document which dashboard role can edit MCP **Configure** settings, so the guide says to use an account that can open them. The guide does not cover the search MCP, Mintlify MCP Credentials, the `x-mintlify-toolset: knowledge` read-only header, or client-specific connectors.

## Operator decisions

None.

## Provenance

Observed 2026-11-19: Mintlify admin MCP, search MCP, admin MCP tools, roles, and CLI command reference pages; Mintlify's protected resource and authorization server metadata; an anonymous registration request to the registration endpoint; and the [public MCP Registry search][registry].

[admin]: https://www.mintlify.com/docs/ai/mintlify-mcp
[admin-redirect]: https://www.mintlify.com/docs/ai/mintlify-mcp#redirect-uris
[search]: https://www.mintlify.com/docs/ai/model-context-protocol
[search-auth]: https://www.mintlify.com/docs/ai/model-context-protocol#enable-authenticated-mcp
[tools]: https://www.mintlify.com/docs/ai/admin-mcp-tools
[roles]: https://www.mintlify.com/docs/dashboard/roles
[resource]: https://mcp.mintlify.com/.well-known/oauth-protected-resource
[issuer]: https://mcp.mintlify.com/.well-known/oauth-authorization-server
[registry]: https://registry.modelcontextprotocol.io/v0.1/servers?search=mintlify&version=latest
