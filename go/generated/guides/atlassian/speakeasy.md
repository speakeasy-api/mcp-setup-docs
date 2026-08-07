# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, find **Connect** and select **Sources**.
2. Click **Add Source**.

If an **Atlassian Rovo** result in the catalog clearly identifies the current remote URL shown below:

1. Choose **3rd-party server**.
2. On the **MCP Catalog** page, enter `Atlassian` in **Search MCP servers...**.
3. Open that result with **View**.
4. Click **Add**.
5. In **Add to Project**, click **Add to Project**.

If no clearly current **Atlassian Rovo** result appears in the catalog, use the custom remote path:

1. Choose **Custom remote server**.
2. On **Add a custom remote MCP server**, paste this value into **Remote MCP server URL**:

   ```
   https://mcp.atlassian.com/v1/mcp/authv2
   ```

3. Click **Add server**.

Either path opens the server's **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the Atlassian catalog entry if an exact entry is present -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, select **Use Discovered**.
3. In **Attach Remote Identity Provider**, confirm that the issuer/base auth URL is:

   ```
   https://auth.atlassian.com
   ```

4. Keep the automatically derived **Slug**.
5. Keep the automatically derived **Display name (optional)**.
6. Under **Endpoints**, click **Discover** so the authorization, token, and registration endpoints fill from Atlassian's discovery chain.
7. Under **Session Client**, keep **Client Type** set to **Dynamic Client Registration (DCR)**.
8. Keep the discovered **Token Endpoint Auth Method**.
9. Leave **Scope (override)** and **Audience (optional)** empty.
10. Click **Attach Identity Provider**.

You do not need to paste a **Client ID** or **Client Secret**.

When Atlassian prompts you for access:

1. Sign in with the intended Atlassian account.
2. Authorize the intended Atlassian Cloud site.
3. Enable the intended Atlassian apps.

If organization policy rejects the flow, complete [Allow the Speakeasy OAuth domain](external.md#allow-speakeasy-domain), then retry the connection.

<!-- screenshot: Attach Remote Identity Provider after discovery, with Dynamic Client Registration (DCR) selected and no secret values visible -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Atlassian's MCP documentation](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/).
