# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.

If Asana is in the catalog:

1. Select **3rd-party server**.
2. On the **MCP Catalog** page, find `Asana` using **Search MCP servers...**.
3. Select **View**.
4. Select **Add**.
5. In the **Add to Project** dialog, select **Add to Project**.

If Asana is not in the catalog:

1. Select **Custom remote server**.
2. On **Add a custom remote MCP server**, paste `https://mcp.asana.com/v2/mcp` into **Remote MCP server URL**.
3. Select **Add server**.

Either path creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu on Sources, or Asana's catalog entry if present -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**.

When **Use Discovered** is offered:

Under **Authentication**, select **Use Discovered**.

When **Use Discovered** is not offered:

Under **Authentication**, select **Configure Manually**.

The **Attach Remote Identity Provider** sheet shows **Redirect URI** with a copy button.

Do not enter a scope.

1. Set **Client Type** to **Manual**.
2. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value you entered in [Configure the OAuth redirect](external.md#configure-oauth-redirect).
3. Paste the **Client ID** saved in [Create the MCP app](external.md#create-mcp-app) into **Client ID**.
4. Paste the **Client secret** saved in [Create the MCP app](external.md#create-mcp-app) into **Client Secret (optional)**.
5. Select **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider with the Redirect URI and credential fields visible and all credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Asana's MCP documentation at https://developers.asana.com/docs/using-asanas-mcp-server.
