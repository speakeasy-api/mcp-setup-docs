# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, enter `GitHub` in **Search MCP servers...**.
5. Open the GitHub entry with **View**.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the GitHub entry on the MCP Catalog page with View or Add visible -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server’s **Overview**, open **Settings**.
2. Under **Upstream Headers**, click **Add header**.
3. Enter `Authorization` as the **Header name**.
4. Leave **Value source** set to **Static value**.
5. In the value field, enter `Bearer ` followed immediately by the [personal access token](external.md#generate-personal-access-token).
6. Check **Secret**.
7. Click **Save**.

<!-- screenshot: the Upstream Headers editor with Authorization, Static value, and Secret visible and the value redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see GitHub's MCP documentation at https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md.
