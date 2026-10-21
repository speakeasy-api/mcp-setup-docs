# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open the **Add MCP server** page.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, use **Search MCP servers...** to find
   **HubSpot**.
5. Open the **HubSpot** entry.
6. Click **Add**.
7. In the **Add to Project** dialog, under **Identity**, select **User Identity**. The dialog preselects **No Identity** for HubSpot.
8. Click **Add to Project**. If the dialog offers a **Guardrails** step, click **Skip for now**.
9. When the dialog finishes, the result reads "Added, but disabled until identity is set up." Click **Finish setup** to open the server's **Settings**.

HubSpot needs a client registered by hand, so the server is kept **Disabled** and the result says to finish setup in **Settings > Identity**. This is expected.

<!-- screenshot: the HubSpot catalog entry with the Identity choice set to User Identity -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section.

1. Select **User Identity**.
2. Under **Choose an identity provider**, confirm the preselected provider is `https://mcp.hubspot.com`. A provider that does not exist yet shows **Will be created**.
3. Select **Manual**. It is the default for HubSpot unless the provider already has a client.
4. In **Client ID**, paste the **Client ID** copied in
   [Copy the client credentials](external.md#copy-client-credentials).
5. In **Client secret**, paste the **Client secret** copied in
   [Copy the client credentials](external.md#copy-client-credentials). HubSpot requires it, even though the field shows "Optional".
6. Leave **Advanced > Scope** blank. HubSpot determines scopes automatically and advertises none, so a blank field requests nothing extra.
7. Click **Save**.
8. Open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

This screen does not show the redirect URI. If authorization later fails with a redirect error, check that the connector's **Redirect URL** in HubSpot is `{{ gram.oauth.callback_url }}`, as set in [Create the MCP connector](external.md#create-mcp-auth-app).

<!-- screenshot: Settings > Identity with User Identity selected, the HubSpot provider, and Manual; all credential values redacted -->

For the HubSpot account's first connection, use an account admin. HubSpot does
not document which admin role qualifies.

1. When HubSpot authorization opens, select the intended account.
2. Grant the permissions offered.
3. Authorize the connection.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [HubSpot's MCP documentation](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server).
