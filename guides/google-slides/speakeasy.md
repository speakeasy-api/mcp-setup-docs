# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste this URL into **Remote MCP server URL**:

   ```text
   https://slidesmcp.googleapis.com/mcp/v1
   ```

5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**, or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches the rendered callback URL entered in [Create the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from [Copy the OAuth credentials](external.md#copy-oauth-credentials).
6. Paste the **Client Secret** from [Copy the OAuth credentials](external.md#copy-oauth-credentials) into **Client Secret (optional)**.
7. Set **Scope (override)** to only these four scopes:

   ```text
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/presentations.readonly
   https://www.googleapis.com/auth/presentations
   ```

8. Leave **Audience (optional)** empty.
9. Click **Attach Identity Provider**.

Use the discovered Google endpoints. The Google issuer is `https://accounts.google.com/`. Do not add the broader Drive scope from the discovered resource metadata.

**Warning:** An **External** app in **Testing** requires another sign-in after seven days. Its authorization and refresh tokens expire. Google can also end access for other reasons. Access is not permanent.

When Google requests authorization, complete the browser prompts with the intended Workspace account. Internal users must belong to the associated organization. External Testing users must be on the [authorized test-user list](external.md#configure-oauth-consent). The account must have permission for the intended presentation operations and meet the [preview audience limits](external.md#register-developer-preview).

The Speakeasy AI Control Plane automatically requests Google offline access and consent. No manual authorization parameter is required.

<!-- screenshot: Attach Remote Identity Provider with Manual client type, Redirect URI, and scope fields; hide credentials -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's MCP documentation](https://developers.google.com/workspace/slides/api/guides/configure-mcp-server).
