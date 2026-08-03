# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, enter `GitHub` in **Search MCP servers...**.
5. Open the GitHub entry with **View**.
6. Select **Add**.
7. In the **Add to Project** dialog, select **Add to Project**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the GitHub catalog result or entry with View and Add visible -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Upstream Headers**, select **Add header**.
3. Enter `Authorization` as the **Header name**.
4. Leave **Value source** as **Static value**.
5. Paste `Bearer <personal-access-token>` as the value, replacing `<personal-access-token>` with the token copied in [Configure and generate the token](external.md#configure-and-generate-token).
6. Check **Secret**.
7. Select **Save**.

A catalog install may show the same header fields earlier in the **Add to Project** dialog's **Upstream headers** section. Enter the same values there if shown.

<!-- screenshot: the Upstream Headers editor with Authorization, Static value, and Secret visible and the value fully redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [GitHub's MCP documentation](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md).
