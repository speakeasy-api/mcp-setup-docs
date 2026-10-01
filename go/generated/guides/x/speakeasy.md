# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, enter `X` in **Search MCP servers...**.
5. Open the X catalog entry and click **Add**. This opens the **Add to Project** dialog.
6. Under **Identity**, select **Service Account**.
7. Select **Bearer**.
8. In **Token**, paste the [**Bearer Token**](external.md#copy-bearer-token) you saved. Paste the token only, without `Bearer ` in front of it. Speakeasy adds the prefix and sends the value as the `Authorization` header.
9. Click **Add to Project**.
10. If the dialog shows a **Guardrails** step, finish it or click **Skip for now**.
11. After **Server added successfully**, click **Configure MCP settings** to open the server.

<!-- screenshot: the X Add to Project dialog with Service Account and Bearer selected, token redacted -->

### Connect your credentials {#connect-speakeasy-credentials}

The Bearer Token you entered in the **Add to Project** dialog is already the server's credential. To confirm it, or to add it to an X server created without it:

1. Open the server's **Settings** and find the **Identity** section.
2. Select **Service Account**.
3. Under **Service Account credential**, select **Bearer**.
4. In **Token**, paste the [**Bearer Token**](external.md#copy-bearer-token), without `Bearer ` in front of it.
5. Click **Save**.

Do not add the token under **Custom Headers**.

<!-- screenshot: Settings > Identity with Service Account and Bearer selected, token redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [X's MCP documentation](https://docs.x.com/tools/mcp).
