# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If Box is in the catalog: choose **3rd-party server**. On the **MCP Catalog**
  page, find Box (the search box reads **Search MCP servers...**), open its
  entry with **View**, and click **Add**. In the **Add to Project** dialog,
  click **Add to Project**.
- If it is not: choose **Custom remote server**. On the **Add a custom remote
  MCP server** page, paste `https://mcp.box.com` into **Remote MCP server URL**
  and click **Add server**.

Either branch creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu with 3rd-party server visible, or the Box catalog entry and its View control -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**, or click
   **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that the sheet's **Redirect URI**, shown with a copy button,
   matches the `{{ gram.oauth.callback_url }}` value registered in Box under
   [Redirect URIs](external.md#set-redirect-uri).
5. Paste the [Box Client ID](external.md#copy-client-credentials) into
   **Client ID**.
6. Paste the [Box Client Secret](external.md#copy-client-credentials) into
   **Client Secret (optional)**.
7. Click **Attach Identity Provider**.

<!-- verify(operator): the template key substitutes this same Redirect URI value -->
<!-- screenshot: the Attach Remote Identity Provider sheet with Client Type set to Manual, the Redirect URI visible, and credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Box's MCP documentation](https://docs.box.com/en/box-mcp/about-box-mcp-server).
