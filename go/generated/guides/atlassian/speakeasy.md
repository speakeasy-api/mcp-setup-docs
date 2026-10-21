# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.

If an **Atlassian Rovo** result in the catalog clearly identifies the remote URL shown below:

1. Choose **From the catalog**.
2. On the **MCP Catalog** page, enter `Atlassian` in **Search MCP servers...**.
3. Open that result.
4. Click **Add**.
5. In **Add to Project**, under **Identity**, select **User Identity**.
6. Click **Add to Project**. If the dialog offers a **Guardrails** step, click **Skip for now**.
7. After **Server added successfully**, click **Configure MCP settings**.

If no such result appears, use the custom remote path:

1. Choose **Hosted remotely**.
2. On **New remote MCP server**, paste this value into **MCP server URL**:

   ```
   https://mcp.atlassian.com/v2/mcp
   ```

3. Click **Verify connectivity**.
4. Under **Identity**, keep **User Identity** selected.
5. Click **Save**.

On save, Speakeasy discovers Atlassian's identity provider and registers a client automatically. When that works, the server is ready. When it cannot, the server is kept **Disabled** and the result says to finish setup in **Settings > Identity**.

<!-- screenshot: the Add MCP server choices, or the Atlassian catalog entry with the Identity choice -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. If creation already configured the identity, **User Identity** is selected with the Atlassian provider and **Auto-Configure**; skip to step 6.

1. Select **User Identity**.
2. Under **Choose an identity provider**, confirm the preselected provider uses this issuer. A provider that does not exist yet shows **Will be created**.

   ```
   https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3
   ```

3. If the picker preselects a different provider on `auth.atlassian.com`, open the picker with **Search identity providers…** and choose the one for the issuer above.
4. Keep **Auto-Configure** selected. There is no **Client ID** or secret to paste.
5. Click **Save**.
6. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

When a person first uses the server, Atlassian prompts them in the browser:

1. Sign in with the intended Atlassian account.
2. Authorize the intended Atlassian Cloud site.
3. Enable the intended Atlassian apps.

If organization policy rejects the flow, complete [Allow the Speakeasy OAuth domain](external.md#allow-speakeasy-domain), then retry the connection.

<!-- screenshot: Settings > Identity with User Identity selected, the Atlassian provider, and Auto-Configure; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Atlassian's MCP documentation](https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/).
