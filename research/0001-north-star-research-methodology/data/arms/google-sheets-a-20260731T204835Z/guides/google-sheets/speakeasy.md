# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://sheetsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL**. The **Transport** field is read-only.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Use Discovered** when offered; otherwise click **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}`, which you registered when you [created the OAuth client](external.md#create-oauth-client).
5. In **Client ID**, paste the **Client ID** you stored when you [created the OAuth client](external.md#create-oauth-client).
6. In **Client Secret (optional)**, paste the **Client Secret** from the same step.
7. In **Scope (override)**, enter `https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/spreadsheets.readonly,https://www.googleapis.com/auth/spreadsheets`.
8. Click **Attach Identity Provider**.
9. When you first connect, complete Google's browser authorization prompts with an account included in the configured audience and, for an **External** testing app, the **Test users** list.

<!-- screenshot: the Manual Attach Remote Identity Provider sheet with values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Google's Sheets MCP documentation at https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server.
