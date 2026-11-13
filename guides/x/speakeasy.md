# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, enter `X` in **Search MCP servers...**.
5. Open the X catalog entry and click **Add**. This opens the **Add to Project** dialog.
6. Under **Identity**, select **Shared credential**.
7. Under **Static credential**, select **Bearer**. Leave **Prefix** set to `Bearer`.
8. In **Token**, paste the [**Bearer Token**](external.md#copy-bearer-token) you saved. Paste the token only, without `Bearer ` in front of it. Speakeasy adds the prefix and sends the value as the `Authorization` header.
9. Click **Add to Project**. If the button reads **Continue** instead, click it to open the **Guardrails** step, then click **Skip**, or set up the guardrail and click **Add to Project**.
10. When the dialog shows **Added to your project**, click **View server** to open the server.

<!-- screenshot: the X Add to Project dialog with Shared credential and Bearer selected, token redacted -->

### Connect your credentials {#connect-speakeasy-credentials}

The Bearer Token you entered in the **Add to Project** dialog is already the server's credential. To confirm it, or to add it to an X server created without it:

1. Open the server's **Settings** and find the **Identity** section.
2. Select **Shared credential**.
3. Under **Static credential**, select **Bearer**. Leave **Prefix** set to `Bearer`.
4. In **Token**, paste the [**Bearer Token**](external.md#copy-bearer-token), without `Bearer ` in front of it.
5. Click **Save**.
6. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability**, turn on **Enable MCP server**, and click **Continue** to confirm. The server then shows **Enabled**.

Do not add the token under **Custom Headers**.

<!-- screenshot: Settings > Identity with Shared credential and Bearer selected, token redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [X's MCP documentation](https://docs.x.com/tools/mcp).
