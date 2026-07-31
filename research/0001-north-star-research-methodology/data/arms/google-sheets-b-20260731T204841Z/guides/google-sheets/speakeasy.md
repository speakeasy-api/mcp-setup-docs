# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://sheetsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL**.
5. Select **Add server**. This creates the hosted MCP server and opens its **Overview** page. The read-only **Transport** is `streamable-http`.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, select **Configure Manually**. If offered, you can select **Use Discovered** instead.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**. The sheet shows **Redirect URI** with a copy button.
4. Confirm that **Redirect URI** matches the value entered in [Create the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from [Copy the OAuth credentials](external.md#copy-oauth-credentials) into **Client ID**.
6. Paste the **Client secret** from [Copy the OAuth credentials](external.md#copy-oauth-credentials) into **Client Secret (optional)**. Google's web client requires this value despite the optional label.
7. In **Scope (override)**, enter `https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/spreadsheets.readonly,https://www.googleapis.com/auth/spreadsheets`.
8. Select **Attach Identity Provider**.
9. At first connection, authorize with an account granted **MCP Tool User**, included as a test user when applicable, admitted to Developer Preview, and permitted by Workspace policy.

<!-- screenshot: the Manual identity-provider sheet with credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Google's MCP documentation at https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server.
