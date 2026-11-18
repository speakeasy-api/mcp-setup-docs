---
research_version: 1
slug: gong
researched_at: 2026-11-18T00:20:00Z
---

# Gong — Research Dossier

## Server facts

- Gong hosts the MCP server at `https://mcp.gong.io/mcp`. The guide uses the Streamable HTTP remote path. An unauthenticated JSON-RPC `initialize` POST returned HTTP 401 with a Bearer challenge pointing to [protected resource metadata][resource]. The metadata identifies the same resource URL and the issuer `https://mcp.gong.io`.
- A Gong tech admin creates the integration. Any Gong plan is eligible, but each user needs a paid Gong seat; Collaborators cannot connect. AI analysis tools consume credits, while `get_session_context` lists the signed-in user's workspaces without consuming credits. [Integration setup][setup] · [Credit consumption][credits] · [Tools][tools]
- Gong documents the current tools as read-only. The metadata advertises `mcp:read` and `mcp:write`; this is not evidence that the server exposes write tools. [Overview][overview] · [Protected resource metadata][resource]

## Credential flow

Use Gong **Automatic** registration with **Personal access**. Automatic registration still requires a Gong integration with the client's approved redirect URI. Speakeasy registers its OAuth client dynamically; the admin does not manually copy a client ID or secret. Each user signs in to Gong and can only access data their own Gong permissions allow. Shared access uses a company-wide token and is not part of this guide. Registration type and authorization context cannot be changed after creation, but the redirect URI can be edited. [Integration setup][setup] · [Overview][overview] · [Manage integrations][manage]

The [issuer metadata][issuer] advertises:

| Field | Value |
| --- | --- |
| Authorization endpoint | `https://app.gong.io/oauth2/authorize` |
| Token endpoint | `https://app.gong.io/oauth2/generate-mcp-token` |
| Registration endpoint | `https://app.gong.io/oauth2/register` |
| Grants and PKCE | `authorization_code`, `refresh_token`; `S256` |
| Token endpoint authentication | `client_secret_basic`, `client_secret_post` |

The issuer advertises dynamic client registration, not CIMD. Automatic registration is not secretless token exchange: Gong advertises confidential-client authentication methods, both covered by the [Speakeasy OAuth capability reference](../../doctrine/ai-control-plane-oauth.md). Use the MCP discovery metadata, not the separate public API's token endpoint.

## Console walkthrough

### Register the Speakeasy integration {#register-speakeasy-integration}

In Gong, open **Admin center > Settings > Ecosystem > MCP > MCP servers** and click **New MCP server integration**. Set **Integration name** to `Speakeasy AI Control Plane`. Paste `{{ gram.oauth.callback_url }}` into **Redirect URI** on its own line. Select **Automatic** under **Registration type** and **Personal access** under **Authorization context**, then click **Save**. For a callback mismatch, edit the redirect URI on the saved integration. A screenshot can show the redirect field and the two selected settings. [Integration setup][setup] · [Manage integrations][manage]

## Speakeasy setup

Use **Hosted remotely** with `https://mcp.gong.io/mcp`, **User Identity**, the discovered `https://mcp.gong.io` identity provider, and **Auto-Configure**. Gong's approved-redirect requirement applies even though Speakeasy handles client registration. This follows the [Speakeasy setup doctrine](../../doctrine/speakeasy-setup.md) and the dynamic registration and provider-approval pattern from the [Egnyte guide](../egnyte/speakeasy.md).

The guide uses the exact Gong-hosted URL to avoid similarly named third-party servers. A public MCP Registry search for `gong` returned no match for that URL, and no Speakeasy catalog entry was verified, so no alias is recorded.

## Research limitations

Public discovery was verified, but dynamic registration, authenticated MCP initialization, and end-to-end sign-in were not tested in a Gong tenant. The guide does not cover the provider's Manual or Shared access options, Gong acting as an MCP client, or client-specific marketplace connectors.

## Operator decisions

None.

## Provenance

Observed 2026-11-18: Gong Help Center integration setup, server overview, integration management, tool reference, and credit usage pages; Gong's protected resource and authorization server metadata; and the [public MCP Registry search](https://registry.modelcontextprotocol.io/v0.1/servers?search=gong&version=latest).

[setup]: https://help.gong.io/docs/create-an-integration-to-connect-to-the-mcp-server
[overview]: https://help.gong.io/docs/about-gong-mcp-server
[manage]: https://help.gong.io/docs/manage-mcp-server-integrations
[tools]: https://help.gong.io/docs/gong-mcp-server-tools
[credits]: https://help.gong.io/docs/how-mcp-server-tools-and-apis-consume-credits
[resource]: https://mcp.gong.io/.well-known/oauth-protected-resource/mcp
[issuer]: https://mcp.gong.io/.well-known/oauth-authorization-server
