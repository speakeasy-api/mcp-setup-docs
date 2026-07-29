# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://docsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL**.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page. The **Transport** field is read-only.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**, or click **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}`, which you entered when you [created the OAuth client](external.md#create-oauth-client).
5. In **Client ID**, paste the value you [copied from Google](external.md#copy-client-credentials).
6. In **Client Secret (optional)**, paste the secret you copied from Google. Google requires this value.
7. In **Scope (override)**, enter `https://www.googleapis.com/auth/drive.readonly, https://www.googleapis.com/auth/drive.file, https://www.googleapis.com/auth/documents.readonly, https://www.googleapis.com/auth/documents`.
8. Click **Attach Identity Provider**.

Complete Google's browser authorization with the intended Google Account. If the app is **External** and in **Testing**, that account must be under **Test users**.

<!-- screenshot: the manual identity-provider sheet with credentials redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Google's Docs MCP documentation at https://developers.google.com/workspace/docs/api/guides/configure-mcp-server.
