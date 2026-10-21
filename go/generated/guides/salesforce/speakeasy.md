# Speakeasy setup

Follow these steps after [creating your own Salesforce app](external.md#create-your-own-salesforce-app) and [enabling your selected MCP server](external.md#enable-sobject-server). If you installed Speakeasy's Salesforce app instead, [contact Speakeasy support to finish OAuth](external.md#contact-speakeasy-support).

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste the URL recorded in [Enable the selected MCP server](external.md#enable-sobject-server) into **MCP server URL**.
5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, select **User Identity**. The page preselects **No Identity** for Salesforce URLs, so change it.
8. Click **Save**.

Speakeasy cannot register a Salesforce client automatically. It keeps the server **Disabled** and says to finish setup in **Settings > Identity**. This is expected.

<!-- screenshot: New remote MCP server after Verify connectivity, with User Identity selected under Identity -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section.

1. Confirm that **User Identity** is selected.
2. Under **Choose an identity provider**, confirm the preselected provider is `https://login.salesforce.com` for a production URL or `https://test.salesforce.com` for a sandbox URL. A provider badged **Will be created** is expected. If a sandbox URL shows `https://login.salesforce.com`, open the picker (**Search identity providers…**) and choose `https://test.salesforce.com`.
3. Under the provider, choose **Manual**. The dashboard preselects **Auto-Configure**, which fails for Salesforce. If an earlier Salesforce server already uses this app, **Existing client** is preselected instead: pick that client under **Client** and skip to step 7.
4. Paste the [**Consumer Key**](external.md#copy-consumer-key) into **Client ID**.
5. Leave **Client secret** empty.
6. Open **Advanced** and enter this value in **Scope**. Do not leave it blank.

   ```
   mcp_api refresh_token
   ```

7. Click **Save**. If asked to confirm, click **Save changes**.

If a sandbox URL offers no `https://test.salesforce.com` provider, create one, then return to step 7:

1. Open the picker and click **Create a custom identity provider**. This opens **Remote Identity Providers**.
2. Click **New Remote Identity Provider**.
3. Enter `https://test.salesforce.com` in **Issuer URL**.
4. Click **Discover** and keep the derived **Slug**.
5. Click **Create**.
6. On the new provider, click **Add Client**.
7. Set **Client Type** to **Manual**.
8. Paste the **Consumer Key** into **Client ID** and leave **Client Secret (optional)** empty.
9. Enter `mcp_api,refresh_token` in **Scope (override)**.
10. Confirm the displayed **Redirect URI** matches the **Callback URL** you [entered in Salesforce](external.md#configure-oauth-settings).
11. Click **Create**.
12. Return to the server's **Settings > Identity** and select that provider.
13. Choose **Existing client** and pick the new client under **Client**.

Turn the server on:

1. In **Settings > Danger Zone > Server Availability**, turn on **Enable MCP server**.
2. Confirm it shows **Enabled**.

When a person first uses the server, Salesforce asks them to sign in and allow access. If sign-in fails right after you created the app, wait out Salesforce's 30-minute activation window before retrying. Do not change the OAuth settings.

<!-- screenshot: Settings > Identity with User Identity selected, the Salesforce provider, Manual, and Advanced > Scope filled; redact the Client ID -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Salesforce's MCP documentation](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html).
