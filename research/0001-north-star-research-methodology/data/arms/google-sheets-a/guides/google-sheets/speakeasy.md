# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://sheetsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL**.
5. Click **Add server**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: Add a custom remote MCP server page with the Google Sheets remote URL entered -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that the displayed **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value registered in [Create the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from [Create the OAuth client](external.md#create-oauth-client).
6. Paste the **Client Secret (optional)** from [Create the OAuth client](external.md#create-oauth-client).
7. Click **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider with Client Type set to Manual and all credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Google's MCP documentation at https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server.
