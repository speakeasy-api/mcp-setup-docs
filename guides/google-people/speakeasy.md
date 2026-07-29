# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://people.googleapis.com/mcp/v1` into **Remote MCP server URL**.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually** or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` entered when you [created the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from the [OAuth credentials](external.md#copy-oauth-credentials).
6. Paste the **Client Secret (optional)** from the [OAuth credentials](external.md#copy-oauth-credentials). Google requires this secret even though the field is labeled optional.
7. In **Scope (override)**, enter `https://www.googleapis.com/auth/directory.readonly,https://www.googleapis.com/auth/userinfo.profile,https://www.googleapis.com/auth/contacts.readonly`.
8. Click **Attach Identity Provider**.
9. At first connection, complete Google's browser authorization with an account that has [MCP Tool User access](external.md#grant-mcp-tool-user).

<!-- screenshot: Attach Remote Identity Provider showing Manual client type, redirect URI, credential labels, and scopes, with secrets redacted -->

For billing, tool behavior, limits, and other details, see [Google's People API MCP documentation](https://developers.google.com/people/v1/configure-mcp-server).
