# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**.

Choose **3rd-party server**. On the **MCP Catalog** page, enter `X` in **Search MCP servers...**, open the X result with **View**, and click **Add**. If the **Add to Project** dialog requests headers during installation, configure its **Upstream headers** section before continuing — follow steps 3–6 under [Connect your credentials](#connect-speakeasy-credentials). In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP Server and opens its **Overview** page.

<!-- screenshot: the X catalog entry with View and Add visible, without credentials -->

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

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [X's MCP documentation](https://docs.x.com/tools/mcp).
