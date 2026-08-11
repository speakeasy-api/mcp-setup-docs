# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste the remote URL from [Identify the workspace region](external.md#identify-workspace-region) into **Remote MCP server URL**.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu or the Add a custom remote MCP server page with the matching Intercom remote URL -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**.
4. Paste the **Client ID** from [Copy the client credentials](external.md#copy-client-credentials).
5. Paste the **Client Secret (optional)** from [Copy the client credentials](external.md#copy-client-credentials).
6. Click **Attach Identity Provider**.
7. Confirm that the sheet's **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value registered in [Configure OAuth](external.md#configure-oauth).

<!-- screenshot: the Attach Remote Identity Provider sheet with Client Type set to Manual and Redirect URI visible; fully redact the Client ID and Client Secret -->

When a client initiates Intercom access, complete the on-screen browser prompts with the intended workspace account.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Intercom's MCP documentation](https://developers.intercom.com/docs/guides/mcp).
