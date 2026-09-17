# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**, then click **Add new** to open the **Add MCP server** page.

Choose **From the catalog**. On the **MCP Catalog** page, enter `X` in **Search MCP servers...**, open the X result, and click **Add**. If the **Add to Project** dialog requests headers during installation, enter `Bearer ` followed by your saved [**Bearer Token**](external.md#copy-bearer-token) in the provided `Authorization` value field under **Upstream headers**. The dialog supplies the header name and secret handling; it does not show the Settings editor's controls. If no header field is offered, follow [Connect your credentials](#connect-speakeasy-credentials) after installation. In the **Add to Project** dialog, click **Add to Project**.

After installation, select **Configure MCP settings** on the completion screen to open the server, then open **Settings**.

<!-- screenshot: the X catalog entry with Add visible, without credentials -->

### Connect your credentials {#connect-speakeasy-credentials}

If you configured headers in the **Add to Project** dialog, skip this section. Otherwise, select **Configure MCP settings** on the completion screen:

1. Open **Settings**.
2. Under **Upstream Headers**, select **Add header**.
3. Enter `Authorization` in **Header name**.
4. Leave **Value source** set to **Static value**.
5. In the value field, enter `Bearer ` followed by the [**Bearer Token**](external.md#copy-bearer-token) you saved.
6. Select **Secret**.
7. Select **Save**.

<!-- screenshot: the Upstream Headers editor with Authorization, Static value, and Secret visible, with the value redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [X's MCP documentation](https://docs.x.com/tools/mcp).
