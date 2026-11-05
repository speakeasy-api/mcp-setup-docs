# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Select **Add new** to open **Add MCP server**.

If a **Sentry** catalog entry for `https://mcp.sentry.dev/mcp` is listed:

1. Choose **From the catalog**.
2. On the **MCP Catalog** page, enter `Sentry` in **Search MCP servers...**.
3. Open the **Sentry** entry.
4. Select **Add**.
5. In the **Add to Project** dialog, under **Identity**, keep **User Identity** selected.
6. Select **Add to Project**. If the dialog offers a **Guardrails** step, select **Skip for now**.
7. Open the created Sentry server from the result.

If it is not listed, use the custom remote path:

1. Choose **Hosted remotely**.
2. On **New remote MCP server**, paste this value into **MCP server URL**:

   ```
   https://mcp.sentry.dev/mcp
   ```

3. Select **Verify connectivity**.
4. Under **Identity**, keep **User Identity** selected.
5. Select **Save**. This opens the server's **Overview** page.

When it adds the server, Speakeasy discovers Sentry's identity provider and registers a client automatically. There is no **Client ID** or secret to paste. If that cannot complete, the server is kept **Disabled** and the result says to finish setup in **Settings > Identity**; on the catalog path it reads "Added, but disabled until identity is set up." with **Finish setup**.

<!-- screenshot: the Add MCP server choices, or the Sentry catalog entry in Add to Project with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. It normally shows **User Identity** with the `https://mcp.sentry.dev` provider and **Auto-Configure** already set; skip to step 5.

1. Select **User Identity**.
2. Confirm the preselected provider is `https://mcp.sentry.dev`. A provider that does not exist yet shows **Will be created**. If a different provider is selected, open the picker, search for `mcp.sentry.dev` in **Search authorization servers…**, and choose it.
3. Keep **Auto-Configure** selected.
4. Select **Save**.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

The first time each person uses the server, they approve Sentry's MCP consent screen, sign in to Sentry, and authorize access. They can only reach what their Sentry account already can.

<!-- screenshot: Settings > Identity with User Identity selected, the mcp.sentry.dev provider, and Auto-Configure; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Sentry's MCP documentation](https://mcp.sentry.dev).
