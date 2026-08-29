# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.

- If **Google Slides** is in the catalog:
  1. Choose **3rd-party server**.
  2. On the **MCP Catalog** page, find Google Slides with **Search MCP servers...**.
  3. Open its entry with **View**.
  4. Click **Add**.
  5. In **Add to Project**, click **Add to Project**.
- If it is not in the catalog:
  1. Choose **Custom remote server**.
  2. On **Add a custom remote MCP server**, paste this URL into **Remote MCP server URL**:

     ```
     https://slidesmcp.googleapis.com/mcp/v1
     ```

  3. Click **Add server**.

Either branch creates the hosted MCP server and opens its **Overview** page. **Transport** is read-only.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**, or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**. The sheet shows the **Redirect URI** with a copy button.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` entered in [Create the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from [Copy the OAuth credentials](external.md#copy-oauth-credentials).
6. Paste the **Client Secret** from [Copy the OAuth credentials](external.md#copy-oauth-credentials) into **Client Secret (optional)**. Google requires this generated secret.
7. In **Scope (override)**, enter the four required scopes listed in [Configure the OAuth consent screen](external.md#configure-oauth-consent).
8. Click **Attach Identity Provider**.

9. At first connection, complete Google's browser authorization with an account granted **MCP Tool User** in [Grant MCP Tool User access](external.md#grant-mcp-tool-user) and access to the intended presentations.

An **External** app in **Testing** also requires that account under **Test users**.

<!-- screenshot: the Attach Remote Identity Provider sheet (Manual with Redirect URI, or DCR after Discover with Client Type Dynamic Client Registration), or the Upstream Headers editor; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's Slides MCP documentation](https://developers.google.com/workspace/slides/api/guides/configure-mcp-server).
