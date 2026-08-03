# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On the **Add a custom remote MCP server** page, paste `https://sheetsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL**.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**.
4. Confirm that the sheet's **Redirect URI** matches the value substituted for `{{ gram.oauth.callback_url }}` in [Create the OAuth client](external.md#create-oauth-client).
5. Paste the [**Client ID**](external.md#create-oauth-client) into **Client ID**.
6. Paste the [**Client Secret**](external.md#create-oauth-client) into **Client Secret (optional)**.
7. Click **Attach Identity Provider**.

<!-- screenshot: the Attach Remote Identity Provider sheet (Manual with Redirect URI); values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Google's MCP documentation at https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server.
