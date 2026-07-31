# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, use **Search MCP servers...** to find **HubSpot**.
5. Open the **HubSpot** entry with **View**.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the HubSpot catalog result or entry with View or Add visible -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Use Discovered** when offered; otherwise click **Configure Manually**.
3. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**.
4. Paste the [HubSpot **Client ID**](external.md#copy-client-credentials) into **Client ID**.
5. Paste the [HubSpot **Client secret**](external.md#copy-client-credentials) into **Client Secret (optional)**.
6. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value entered in HubSpot's **Redirect URL** field when you [created the MCP auth app](external.md#create-mcp-auth-app).
7. Leave the scope override empty.
8. Click **Attach Identity Provider**.
9. When HubSpot authorization opens, use the intended HubSpot account administrator.
10. Select the HubSpot account.
11. Grant the requested permissions.
12. Authorize the connection.

<!-- screenshot: the Manual Attach Remote Identity Provider sheet with Redirect URI, Client ID, and Client Secret (optional) visible; all values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see HubSpot's MCP documentation at https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server.
