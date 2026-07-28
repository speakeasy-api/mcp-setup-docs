# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select
   **Sources**.
2. Click **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, use **Search MCP servers...** to find
   **HubSpot**.
5. Open the **HubSpot** entry with **View**.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu or the HubSpot catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**, or click
   **Use Discovered** if it is available.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}`
   value registered in HubSpot's **Redirect URL** field.
5. Paste the **Client ID** copied in
   [Copy the client credentials](external.md#copy-client-credentials).
6. Paste the **Client Secret (optional)** copied in
   [Copy the client credentials](external.md#copy-client-credentials).
7. Leave any scope override empty.
8. Click **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider with Client Type set to Manual and all credential values redacted -->

For the HubSpot account's first connection, use an account admin. HubSpot does
not document which admin role qualifies.

1. When HubSpot authorization opens, select the intended account.
2. Grant the permissions offered.
3. Authorize the connection.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see HubSpot's MCP documentation at https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server.
