# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Select **Add new** to open the **Add MCP server** page.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, enter `Zapier` in **Search MCP servers...**.
5. Open the **Zapier** entry.
6. Select **Add**.
7. In the **Add to Project** dialog, select **Add to Project**.

After installation, select **Configure MCP settings** on the completion screen to open the server, then open **Settings**.

<!-- screenshot: the Add MCP server page, or the Zapier catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Select **Configure MCP settings** on the completion screen, then open the server’s **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only, confirm **Issuer URL**, the auto-derived **Slug**, and **Endpoints**. Discovery runs automatically for a seeded issuer; after typing or changing the URL, select **Discover** only if offered.

For a new provider, enter **Issuer URL** `https://mcp.zapier.com` and keep the auto-derived **Slug**. If discovery does not populate **Endpoints**, enter:

Authorization endpoint:

```text
https://mcp.zapier.com/oauth/authorize
```

Token endpoint:

```text
https://mcp.zapier.com/api/v1/oauth/token
```

Registration endpoint:

```text
https://mcp.zapier.com/api/v1/oauth/register
```

<!-- source: https://mcp.zapier.com/.well-known/oauth-authorization-server; public metadata checked 2026-09-17 -->

1. Keep the auto-derived **Slug**.
1. Keep the auto-derived **Display name (optional)**.
1. Under **Endpoints**, wait for automatic discovery of the seeded issuer. After typing or changing **Issuer URL**, select **Discover** only if offered, then confirm the authorization, token, and registration endpoints.

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Attach the provider** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

1. Under **Session Client**, keep **Client Type** set to **Dynamic Client
   Registration (DCR)**.
1. Keep **Token Endpoint Auth Method** at its discovered default.
1. Leave **Scope (override)** empty.
1. Leave **Audience (optional)** empty.

#### Attach the provider

Click **Attach Identity Provider**. DCR handles client registration; you do not need to register a callback URL manually.

For a new DCR client, the Speakeasy AI Control Plane registers the OAuth client with Zapier. You do
not need to paste a **Client ID** or **Client Secret**.

1. When provider access is first requested, sign in to Zapier with the account
   whose app connections should be available.
2. Complete Zapier's on-screen authorization prompts.

<!-- screenshot: the Attach Remote Identity Provider sheet after discovery, showing Dynamic Client Registration (DCR) and the discovered endpoints, with account-specific values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Zapier's MCP documentation](https://docs.zapier.com/mcp/get-started/connect).
