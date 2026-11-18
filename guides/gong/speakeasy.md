# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this value into **MCP server URL**:

   ```
   https://mcp.gong.io/mcp
   ```

5. Click **Verify connectivity**.
6. Under **Identity**, keep **User Identity** selected.
7. Click **Save**. This opens the server's **Overview** page.

Speakeasy discovers Gong's identity provider and attempts to register the OAuth client. There is no client ID or secret to paste. If registration does not complete, Speakeasy leaves the server **Disabled** until you finish setup in **Settings > Identity**.

<!-- screenshot: New remote MCP server with the Gong URL and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find **Identity**. If the server already shows **User Identity** with the Gong provider and automatic configuration is complete, skip to step 5.

1. Select **User Identity**.
2. Under **Choose an identity provider**, confirm that `https://mcp.gong.io` is selected. If a different provider is selected, open the picker, search for `mcp.gong.io`, and select it.
3. Select **Auto-Configure**.
4. Click **Save**. If registration fails, check the **Redirect URI** and **Automatic** registration type in [your Gong integration](external.md#register-speakeasy-integration), then try again.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server**.

The first time each person uses the server, they sign in to Gong in their browser and authorize access. To verify the connection without spending Gong credits, run `get_session_context` and check that it lists the Gong workspaces the signed-in user can access.

<!-- screenshot: Settings > Identity with User Identity, the Gong provider, and Auto-Configure selected -->

For tool behavior and access details, see [About Gong MCP server](https://help.gong.io/docs/about-gong-mcp-server).
