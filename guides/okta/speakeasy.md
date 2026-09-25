# Speakeasy setup

Draft compatibility note: verify this connection against an Early Access-enabled Okta org before rollout. Okta requires MCP **2025-11-25** and OAuth with PKCE; this guide has not been tested end to end in Speakeasy.

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste your [organization's MCP URL](external.md#find-mcp-url) into **Remote MCP server URL**.
5. Select **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: Add a custom remote MCP server with the tenant-specific URL field visible -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, select **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Paste the [Client ID](external.md#grant-scopes-copy-client-id) from Okta into **Client ID**.
5. Leave **Client Secret (optional)** empty for this public-client PKCE app.
6. Confirm that **Redirect URI** matches the value registered in [Sign-in redirect URIs](external.md#create-app-integration).
7. Select **Attach Identity Provider**.

<!-- verify(operator): confirm discovery of the tenant issuer/endpoints, public-client token authentication, PKCE, requested scopes, and MCP 2025-11-25 negotiation before publishing; do not invent endpoint or scope overrides -->
<!-- screenshot: Attach Remote Identity Provider with Client Type Manual and Redirect URI visible; redact credential values -->

When a client first needs Okta access, complete the browser authorization prompts with an account assigned to the app. Test with a read-only request appropriate to your granted scopes, such as asking for the current account status of a known test user. Confirm the result against Okta before attempting changes. If authorization fails, check the app's assignments and granted scopes with your Okta administrator.

This guide covers setup only. For anything beyond it — tool behavior, limits, and access policies — see [Okta's Managed MCP Server documentation](https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm).
