# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, enter `HubSpot` in **Search MCP servers...**.
5. Open the HubSpot entry with **View**.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or HubSpot's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Use Discovered** when it is offered; otherwise click **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. In **Client ID**, paste the value copied [when you created the MCP auth app](external.md#create-mcp-auth-app).
5. In **Client Secret (optional)**, paste the value copied [when you created the MCP auth app](external.md#create-mcp-auth-app).
6. Leave **Scope (override)** empty.
7. Click **Attach Identity Provider**.
8. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value entered in HubSpot [when you created the MCP auth app](external.md#create-mcp-auth-app).
9. When a user first needs HubSpot access, complete HubSpot's browser authorization flow with the intended user.
10. Select the HubSpot account.
11. Grant the presented permissions.
12. Authorize the connection.

<!-- screenshot: Attach Remote Identity Provider with Redirect URI and credential fields visible; redact every credential value -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see HubSpot's MCP documentation at https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-hubspot-mcp-server.
