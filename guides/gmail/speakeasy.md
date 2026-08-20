# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On the **Add a custom remote MCP server** page, paste this value into **Remote MCP server URL**:

```text
https://gmailmcp.googleapis.com/mcp/v1
```

5. Click **Add server**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**.
4. Locate the displayed **Redirect URI** and its copy button.
5. Paste the **Client ID** from [Create the OAuth client](external.md#create-oauth-client) into **Client ID**.
6. Paste the **Client Secret** from [Create the OAuth client](external.md#create-oauth-client) into **Client Secret (optional)**. The Gmail setup requires this value despite the generic optional label.
7. Click **Attach Identity Provider**.
8. Confirm that the sheet's **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value registered under **Authorized redirect URIs**.

<!-- screenshot: the manual Attach Remote Identity Provider sheet with the Redirect URI visible and credentials redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Gmail's MCP documentation](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server).
