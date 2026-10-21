# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste the account-specific URL retained in [Create the Cortex Agent MCP server](external.md#create-cortex-agent-mcp-server) into **MCP server URL**.
5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, select **User Identity** if it is not already selected.
8. Click **Save**.

Snowflake does not support automatic client registration, so Speakeasy keeps the server **Disabled** and says to finish setup in **Settings > Identity**. This is expected.

<!-- screenshot: New remote MCP server after Verify connectivity, with User Identity selected under Identity -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section.

1. Confirm that **User Identity** is selected.
2. Under **Choose an identity provider**, confirm the preselected provider is on your Snowflake account hostname (`<account_url>`). A provider badged **Will be created** is expected. If no Snowflake provider is offered, follow the custom provider steps below instead.
3. Under the provider, choose **Manual**.
4. Paste the [**Client ID**](external.md#copy-oauth-credentials) into **Client ID**.
5. Paste the [**Client Secret**](external.md#copy-oauth-credentials) into **Client secret**. The secret is required even though the field says "Optional".
6. Open **Advanced** and enter `session:role:all` in **Scope**. Do not leave it blank.
7. Click **Save**. If asked to confirm, click **Save changes**.

If no Snowflake provider is offered, create one:

1. Open the picker and click **Create a custom identity provider**. This opens **Remote Identity Providers**.
2. Click **New Remote Identity Provider**.
3. Enter `https://<account_url>` in **Issuer URL**, using the public account hostname from [Create the Cortex Agent MCP server](external.md#create-cortex-agent-mcp-server).
4. Under **Endpoints**, enter this value in **Authorization Endpoint**:

   ```
   https://<account_url>/oauth/authorize
   ```

5. Enter this value in **Token Endpoint**:

   ```
   https://<account_url>/oauth/token-request
   ```

6. Keep the derived **Slug** and click **Create**.
7. On the new provider, click **Add Client**.
8. Set **Client Type** to **Manual**.
9. Paste the **Client ID** into **Client ID** and the **Client Secret** into **Client Secret (optional)**.
10. Enter `session:role:all` in **Scope (override)**.
11. Confirm the displayed **Redirect URI** matches the `OAUTH_REDIRECT_URI` you set in [Create the OAuth integration](external.md#create-oauth-integration).
12. Click **Create**.
13. Return to the server's **Settings > Identity** and select that provider.
14. Choose **Existing client**, pick the new client under **Client**, and click **Save**.

Turn the server on:

1. In **Settings > Danger Zone > Server Availability**, turn on **Enable MCP server**.
2. Confirm it shows **Enabled**.

When a person first uses the server, Snowflake's OAuth flow opens in a browser. Each user signs in with their own Snowflake credentials and consents to the non-privileged default role. The resulting session uses that user's `DEFAULT_ROLE`.

<!-- screenshot: Settings > Identity with User Identity selected, the Snowflake provider, Manual, and Advanced > Scope filled; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Snowflake's MCP documentation](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp).
