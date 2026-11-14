# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Select **Add new** to open the **Add MCP server** page.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, enter `Zapier` in **Search MCP servers...**.
5. Open the **Zapier** entry.
6. Select **Add**.
7. In the **Add to Project** dialog, under **Identity**, select **User Identity** if it is not already selected.
8. Select **Add to Project**. If the button reads **Continue** instead, select it, then select **Skip** on the **Guardrails** step.
9. When the dialog shows **Added to your project**, select **View server** to open the server.

When it adds the server, Speakeasy discovers Zapier's authorization server and registers a client automatically. There is no **Client ID** or secret to paste. If that cannot complete, the server is kept **Disabled** and the dialog reads "Added, but disabled until identity is set up." Select **Finish setup** to open the server's **Settings**.

<!-- screenshot: the Zapier catalog entry with the Identity choice -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. It normally shows **User Identity** with the `mcp.zapier.com` authorization server and **Auto-Configure** already set; skip to step 5.

1. Select **User Identity**.
2. Confirm the authorization server shown is `mcp.zapier.com`. One that does not exist yet shows **Will be created**. If a different one is shown, open it, search for `mcp.zapier.com` in **Search authorization servers…**, and choose it.
3. Keep **Auto-Configure** selected.
4. Select **Save**.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability**, turn on **Enable MCP server**, and select **Continue** to confirm, so it shows **Enabled**.

When a person first uses the server, they sign in to Zapier with the account whose app connections should be available and complete Zapier's on-screen authorization prompts.

<!-- screenshot: Settings > Identity with User Identity selected, the Zapier authorization server, and Auto-Configure; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Zapier's MCP documentation](https://docs.zapier.com/mcp/get-started/quickstart).
