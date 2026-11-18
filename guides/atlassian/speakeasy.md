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

Open the server's **Settings** and find the **Identity** section. If Speakeasy already configured **User Identity** when you added the server, skip to step 5.

1. Select **User Identity**.
2. Use the authorization server Speakeasy discovers from the Atlassian Rovo MCP server. If it shows **Will be created**, Speakeasy will create it when you save. You do not need to create a provider manually or choose one by name.
3. Select **Auto-Configure**. There is no **Client ID** or secret to paste.
4. Click **Save**.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

If Speakeasy does not discover an authorization server, confirm the remote URL is `https://mcp.atlassian.com/v2/mcp` before retrying setup. If the picker shows multiple providers, use the one whose issuer matches `authorization_servers` in [Atlassian's OAuth discovery metadata](https://mcp.atlassian.com/.well-known/oauth-protected-resource/v2/mcp). A matching hostname alone is not enough.

When a person first uses the server, Atlassian prompts them in the browser:

1. Sign in with the intended Atlassian account.
2. Authorize the intended Atlassian Cloud site.
3. Enable the intended Atlassian apps.

If organization policy rejects the flow, complete [Allow the Speakeasy OAuth domain](external.md#allow-speakeasy-domain), then retry the connection.

<!-- screenshot: Settings > Identity with User Identity selected, the discovered authorization server, and Auto-Configure -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Atlassian's MCP documentation](https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/).
