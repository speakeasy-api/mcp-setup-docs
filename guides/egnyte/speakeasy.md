# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this value into **MCP server URL**:

   ```
   https://mcp-server.egnyte.com/mcp
   ```

5. Click **Verify connectivity**.
6. Under **Identity**, keep **User Identity** selected.
7. Click **Save**. This opens the server's **Overview** page.

On save, Speakeasy discovers Egnyte's identity provider and registers a client automatically. There is no **Client ID** or secret to paste. If that cannot complete, the server is kept **Disabled** and the result says to finish setup in **Settings > Identity**.

<!-- screenshot: New remote MCP server with the Egnyte URL and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. It normally shows **User Identity** with the Egnyte provider and **Auto-Configure** already set; skip to step 5.

1. Select **User Identity**.
2. Under **Choose an identity provider**, confirm the preselected provider is `https://mcp-oauth.egnyte.com/egnyte-connect`. A provider that does not exist yet shows **Will be created**. If a different provider is selected, open the picker, search for `mcp-oauth.egnyte.com` in **Search identity providers…**, and choose it.
3. Keep **Auto-Configure** selected.
4. Click **Save**.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

The first time each person uses the server, Egnyte asks for their Egnyte domain, then their Egnyte credentials, then approval of the requested permissions. They can only reach files and folders their Egnyte account already can. If Egnyte rejects the connection, recheck [Allow Speakeasy to connect](external.md#allow-speakeasy-app).

<!-- screenshot: Settings > Identity with User Identity selected, the Egnyte provider, and Auto-Configure; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Egnyte's MCP documentation](https://developers.egnyte.com/integration/cfs/api-docs/remote-mcp-server).
