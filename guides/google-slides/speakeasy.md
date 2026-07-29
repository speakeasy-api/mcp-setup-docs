# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://slidesmcp.googleapis.com/mcp/v1` into **Remote MCP server URL**.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page. **Transport** is read-only.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**, or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` entered in [Create the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from [Copy the OAuth credentials](external.md#copy-oauth-credentials).
6. Paste the **Client Secret** from [Copy the OAuth credentials](external.md#copy-oauth-credentials) into **Client Secret (optional)**. Google's web client requires this generated secret.
7. In **Scope (override)**, enter `https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/presentations.readonly,https://www.googleapis.com/auth/presentations`.
8. Click **Attach Identity Provider**.

At first connection, complete Google's browser authorization with an account granted **MCP Tool User** in [Grant MCP Tool User access](external.md#grant-mcp-tool-user) and access to the intended presentations. An **External** app in **Testing** also requires that account under **Test users**.

<!-- screenshot: the manual identity-provider sheet showing Client Type, Redirect URI, credential labels, and scopes, with credentials redacted -->

For anything beyond setup — billing, tool behavior, or limits — see [Google's Slides MCP documentation](https://developers.google.com/workspace/slides/api/guides/configure-mcp-server).
