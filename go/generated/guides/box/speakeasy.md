# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select
   **Sources**.
2. Click **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, use **Search MCP servers...** to find **Box**.
5. Click **View** on the Box entry.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu with 3rd-party server visible, or the Box catalog entry and its View control -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**, or click
   **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Before entering credentials, verify that `{{ gram.oauth.callback_url }}` has
   rendered as a concrete Speakeasy **Redirect URI** in the sheet. Do not enter
   the literal template marker in Box.
5. Paste the [Box Client ID](external.md#copy-client-credentials) into
   **Client ID**.
6. Paste the [Box Client Secret](external.md#copy-client-credentials) into
   **Client Secret (optional)**.
7. Click **Attach Identity Provider**.
8. Confirm that the attached identity provider's **Redirect URI** matches the
   value registered in Box under [Redirect URIs](external.md#set-redirect-uri).

<!-- verify(operator): the template key substitutes this same Redirect URI value -->
<!-- screenshot: the Attach Remote Identity Provider sheet with Client Type set to Manual, the Redirect URI visible, and credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Box's MCP documentation](https://docs.box.com/en/box-mcp/about-box-mcp-server).
