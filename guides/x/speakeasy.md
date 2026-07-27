# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.

If X appears in the catalog:

1. Select **3rd-party server**.
2. On the **MCP Catalog** page, enter `X` in **Search MCP servers...**.
3. Select **View** for X.
4. Select **Add**.

If the **Add to Project** dialog requests headers during installation, configure its **Upstream headers** section before continuing. Follow steps 3–6 under [Connect your credentials](#connect-speakeasy-credentials).

5. In the **Add to Project** dialog, select **Add to Project**.

If X does not appear in the catalog:

1. Select **Custom remote server**.
2. On **Add a custom remote MCP server**, paste `https://api.x.com/mcp` into **Remote MCP server URL**.
3. Confirm that the read-only **Transport** field shows `streamable-http`.
4. Select **Add server**.

Either path creates the hosted MCP Server and opens its **Overview** page.

<!-- screenshot: the Add Source menu or the X catalog entry, without credentials -->

### Connect your credentials {#connect-speakeasy-credentials}

If you configured headers in the **Add to Project** dialog, skip this section. Otherwise, from the server's **Overview** page:

1. Open **Settings**.
2. Under **Upstream Headers**, select **Add header**.
3. Enter `Authorization` in **Header name**.
4. Leave **Value source** set to **Static value**.
5. In the value field, enter `Bearer ` followed by the [**Bearer Token**](external.md#copy-bearer-token) you saved.
6. Select **Secret**.
7. Select **Save**.

<!-- screenshot: the Upstream Headers editor with Authorization, Static value, and Secret visible, with the value redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [X's MCP documentation](https://x-preview.mintlify.app/tools/mcp).
