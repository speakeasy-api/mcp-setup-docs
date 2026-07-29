# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://drivemcp.googleapis.com/mcp/v1` into **Remote MCP server URL**.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: Add Source with Custom remote server selected -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**. If **Use Discovered** is offered, you may select it instead.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value registered in [Create the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from [Copy the client credentials](external.md#copy-client-credentials).
6. Paste the **Client Secret (optional)** from the same section. Google's Web application flow requires the generated secret despite the optional field label.
7. Configure `https://www.googleapis.com/auth/drive.readonly` as a required scope.
8. Configure `https://www.googleapis.com/auth/drive.file` as a required scope.
9. Click **Attach Identity Provider**.

<!-- screenshot: the identity-provider sheet with credentials redacted -->

For more information, see Google's Drive MCP documentation at https://developers.google.com/workspace/drive/api/guides/configure-mcp-server.
