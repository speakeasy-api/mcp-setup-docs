# Speakeasy setup

You need write access to the Speakeasy AI Control Plane project. Google roles do not provide this access.

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Select **Custom remote server**.
4. On **Add a custom remote MCP server**, enter this value in **Remote MCP server URL**:

    ```text
    https://docsmcp.googleapis.com/mcp/v1
    ```

5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page. This setup does not use a local MCP process.

<!-- screenshot: The Add Source menu and custom remote server URL. -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In **Attach Remote Identity Provider**, enter this **Issuer URL** if it is not already set:

    ```text
    https://accounts.google.com
    ```

4. Keep the derived **Slug** and **Display name (optional)**.
5. Under **Endpoints**, click **Discover** if the Google authorization-server endpoints are not already filled.
6. Under **Session Client**, set **Client Type** to **Manual**.
7. Paste **Client ID** from [Create the OAuth client](external.md#create-oauth-client).
8. Paste **Client Secret (optional)** from [Create the OAuth client](external.md#create-oauth-client). Supply the secret for this setup despite the optional field label.
9. Confirm that **Redirect URI** exactly matches the value registered under **Authorized redirect URIs** in Google.
10. Set **Token Endpoint Auth Method** to `client_secret_post`.
11. Enter all four scopes as one space-separated value in **Scope (override)**:

    ```text
    https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/documents
    ```

12. Leave **Audience (optional)** empty. This field is separate from the Google **Audience** user-type setting.
13. Click **Attach Identity Provider**.
14. When the connection needs Google access, follow the browser authorization prompts with the registered Workspace account. Give consent for the requested access.

For the Google issuer, the Speakeasy AI Control Plane automatically requests `access_type=offline` and `prompt=consent`. You do not need to add these parameters. It encrypts and stores returned refresh tokens and uses them for offline access.

For an External app in Testing with these scopes, Google refresh tokens expire after seven days. Refresh tokens are not permanent. The account must also have the required document permissions.

<!-- screenshot: Attach Remote Identity Provider with Manual client, Google issuer, token method, scopes, and Redirect URI; credentials hidden. -->

For more detail, see [Google Docs's MCP documentation](https://developers.google.com/workspace/docs/api/guides/configure-mcp-server).
