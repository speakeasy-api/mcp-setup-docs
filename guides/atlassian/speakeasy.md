# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, find **Connect** and select **Sources**.
2. Click **Add Source**.

If **Atlassian** appears in the catalog:

1. Choose **3rd-party server**.
2. On the **MCP Catalog** page, enter `Atlassian` in **Search MCP servers...**.
3. Open the Atlassian entry with **View**.
4. Click **Add**.
5. In **Add to Project**, click **Add to Project**.

If **Atlassian** does not appear in the catalog:

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
2. Under **Authentication**, select **Use Discovered** when offered; otherwise, select **Configure Manually**.
3. In **Attach Remote Identity Provider**, if **Issuer URL** is empty, paste:

   ```
   https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3
   ```

4. Keep the automatically derived **Slug**.
5. Keep the automatically derived **Display name (optional)**.
6. Under **Endpoints**, click **Discover** so the authorization, token, and registration endpoints fill from Atlassian's authorization-server metadata.
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
