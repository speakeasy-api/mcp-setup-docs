# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste the remote URL from [Identify the workspace region](external.md#identify-workspace-region) into **Remote MCP server URL**.
5. Click **Add server**. This opens the server's **Overview** page.

<!-- screenshot: the Add Source menu and the Add a custom remote MCP server page with the matching Intercom remote URL -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Locate **Authentication**.

**Use Discovered** should be unavailable. If it appears, stop here. Do not continue with manual configuration.

3. Click **Configure Manually**.
4. In **Attach Remote Identity Provider**, enter the issuer URL from [Identify the workspace region](external.md#identify-workspace-region) in **Issuer URL**.
5. Keep the auto-derived **Slug** unless your project naming policy requires a different value.
6. Keep **Display name (optional)** unless your project naming policy requires a different value.
7. Under **Endpoints**, click **Discover**.
8. Under **Session Client**, keep **Client Type** set to **Dynamic Client Registration (DCR)**.
9. Keep **Token Endpoint Auth Method** set to `client_secret_basic`.
10. Leave **Scope (override)** empty.
11. Leave **Audience (optional)** empty.
12. Click **Attach Identity Provider**.

The Speakeasy AI Control Plane dynamically registers with Intercom. You do not need a Client ID or Client Secret.

<!-- screenshot: Attach Remote Identity Provider after Discover, showing the regional issuer and endpoints with Client Type set to Dynamic Client Registration (DCR) -->

When a client initiates Intercom access, complete the on-screen browser prompts with the intended workspace account.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Intercom's MCP documentation at https://developers.intercom.com/docs/guides/mcp.
