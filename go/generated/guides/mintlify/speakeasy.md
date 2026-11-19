# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this value into **MCP server URL**:

   ```
   https://mcp.mintlify.com
   ```

5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, keep **User Identity** selected.
8. Click **Save**. This opens the server's **Overview** page.

Speakeasy discovers Mintlify's identity provider and registers an OAuth client automatically. There is no client ID or secret to paste. If registration does not complete, Speakeasy keeps the server **Disabled** until you finish setup in **Settings > Identity**.

<!-- screenshot: New remote MCP server with the Mintlify URL and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find **Identity**. If the server already shows **User Identity** with the Mintlify provider and **Auto-Configure**, skip to step 5.

1. Select **User Identity**.
2. Under **Choose an identity provider**, confirm that `https://mcp.mintlify.com` is selected. If a different provider is selected, open the picker, search for `mcp.mintlify.com`, and select it.
3. Keep **Auto-Configure** selected.
4. Click **Save**.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

The first time each person uses the server, they sign in to Mintlify in their browser and authorize access. If sign-in does not return to Speakeasy, check that the Speakeasy hostname is listed in [Mintlify's allowed redirect domains](external.md#allow-speakeasy-redirect-domain).

If edit tools return `insufficient_scope`, the person's Mintlify role does not allow that action. Raising their role later does not update an existing connection: Mintlify applies the added access only to a new connection.

<!-- screenshot: Settings > Identity with User Identity, the Mintlify provider, and Auto-Configure selected -->

This guide covers setup only. For tool behavior, publishing, and anything else beyond setup, see [Mintlify's admin MCP documentation](https://www.mintlify.com/docs/ai/mintlify-mcp).
