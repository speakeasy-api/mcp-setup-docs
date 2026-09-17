# Speakeasy setup

Use an account that can add a source and configure authentication in the intended Speakeasy project. Manual client creation requires project write access. Complete [Google Compute Engine setup](external.md) first.

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, enter this value in **Remote MCP server URL**:

   ```text
   https://compute.googleapis.com/mcp
   ```

5. Select **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the custom remote source form with the Compute Engine endpoint -->

### Connect your credentials {#connect-speakeasy-credentials}

Use the [OAuth client ID and client secret](external.md#copy-client-credentials) from Google setup. Do not use Dynamic Client Registration for this server.

1. From **Overview**, open **Settings**.
2. Under **Authentication**, select **Configure Manually**, or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, enter this **Issuer URL** if it is not already known:

   ```text
   https://accounts.google.com
   ```

4. Under **Endpoints**, select **Discover** to fill the Google authorization and token endpoints if they are not already filled.
5. Set **Client Type** to **Manual**.
6. Paste the Google OAuth client ID into **Client ID**.
7. Paste the Google OAuth client secret into **Client Secret (optional)**. The secret is required for this Web client, despite the generic field label.
8. In **Scope (override)**, replace any discovered scope value with this comma-separated value:

   ```text
   https://www.googleapis.com/auth/compute.read-only, https://www.googleapis.com/auth/compute.readonly
   ```

9. Leave **Audience (optional)** empty.
10. Confirm that **Redirect URI** matches the value registered with `{{ gram.oauth.callback_url }}` in [Create the Web OAuth client](external.md#create-oauth-client). Do not continue if the values differ.
11. Select **Attach Identity Provider**.
12. When the application requests Google access, sign in with the intended read-only user's Google Account and complete the consent prompts. Do not use the more privileged setup helper's account.

If you reuse an identity provider with an administrator scope override, ask the Speakeasy administrator to confirm the two read-only scopes above. An issuer-level override takes priority over client scopes.

The Speakeasy AI Control Plane requests offline access and consent automatically. It stores and uses the refresh token. No separate offline-access setting is needed for this path.

For an External application in Testing, access requires another sign-in after seven days. Other token or access limits can also require another sign-in.

<!-- screenshot: the Manual identity provider sheet with credentials and environment-specific values redacted -->

This guide covers setup only. For billing, tool behavior, and limits, see [Google's Compute Engine MCP documentation](https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp).
