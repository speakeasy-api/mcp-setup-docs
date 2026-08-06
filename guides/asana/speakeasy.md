# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, find **Asana** using **Search MCP servers...**.
5. Select **View**.
6. Select **Add**.
7. In **Add to Project**, select **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu on Sources, or Asana's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Do not enter a scope during this setup.

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, select **Use Discovered** when offered; otherwise, select **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value entered in [Configure the OAuth redirect](external.md#configure-oauth-redirect).
5. Paste the **Client ID** saved in [Create the MCP app](external.md#create-mcp-app) into **Client ID**.
6. Paste the **Client secret** saved in [Create the MCP app](external.md#create-mcp-app) into **Client Secret (optional)**.
7. Select **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider with the Redirect URI and credential fields visible and all credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Asana's MCP documentation](https://developers.asana.com/docs/using-asanas-mcp-server).
