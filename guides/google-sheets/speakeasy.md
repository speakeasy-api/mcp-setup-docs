# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste this URL into **Remote MCP server URL**:

   ```
   https://sheetsmcp.googleapis.com/mcp/v1
   ```

5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually** or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` from [Create the OAuth client](external.md#create-oauth-client).
5. In **Client ID**, paste the **Client ID** from [Copy the OAuth credentials](external.md#copy-oauth-credentials).
6. In **Client Secret (optional)**, paste the **Client secret** from the same step. Google requires this generated secret.
7. In **Scope (override)**, enter this value:

   ```
   https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/spreadsheets.readonly,https://www.googleapis.com/auth/spreadsheets
   ```

8. Click **Attach Identity Provider**.

At first connection, complete Google's browser authorization with an account granted [MCP Tool User](external.md#grant-mcp-tool-user) and access to the intended spreadsheets.

<!-- screenshot: Attach Remote Identity Provider showing Manual client type, redirect URI, credential labels, and scopes, with secrets redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's Sheets MCP documentation](https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server).
