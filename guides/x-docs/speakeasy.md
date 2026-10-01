# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, enter `X Docs` in **Search MCP servers...**.
5. Open the **X Docs** entry and click **Add**. This opens the **Add to Project** dialog.
6. Under **Identity**, keep **No Identity** selected, and add no **Upstream headers**.
7. Click **Add to Project**.
8. If the dialog shows a **Guardrails** step, finish it or click **Skip for now**.
9. After **Server added successfully**, click **Configure MCP settings** to open the server.

<!-- screenshot: the X Docs Add to Project dialog with No Identity selected; no credential values need redaction -->

### Connect your credentials {#connect-speakeasy-credentials}

X Docs is public, so there is no credential to connect. In the server's **Settings**, the **Identity** section stays on **No Identity**.

<!-- screenshot-exception: there is no credential form to complete for this open Authentication Option -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [X's MCP documentation](https://docs.x.com/tools/mcp).
