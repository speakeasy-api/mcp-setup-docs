# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Select **Add new** to open the **Add MCP server** page.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, enter `Zapier` in **Search MCP servers...**.
5. Open the **Zapier** entry.
6. Select **Add**.
7. In the **Add to Project** dialog, under **Identity**, keep **User Identity** selected.
8. Select **Add to Project**. If the dialog offers a **Guardrails** step, select **Skip for now**.
9. After **Server added successfully**, select **Configure MCP settings**.

When it adds the server, Speakeasy discovers Zapier's identity provider and registers a client automatically. There is no **Client ID** or secret to paste. If that cannot complete, the server is kept **Disabled** and the result says to finish setup in **Settings > Identity**.

<!-- screenshot: the Zapier catalog entry with the Identity choice -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. It normally shows **User Identity** with the `https://mcp.zapier.com` provider and **Auto-Configure** already set; skip to step 5.

1. Select **User Identity**.
2. Under **Choose an identity provider**, confirm the preselected provider is `https://mcp.zapier.com`. A provider that does not exist yet shows **Will be created**.
3. Keep **Auto-Configure** selected.
4. Select **Save**.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

When a person first uses the server, they sign in to Zapier with the account whose app connections should be available and complete Zapier's on-screen authorization prompts.

<!-- screenshot: Settings > Identity with User Identity selected, the Zapier provider, and Auto-Configure; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Zapier's MCP documentation](https://docs.zapier.com/mcp/get-started/connect).
