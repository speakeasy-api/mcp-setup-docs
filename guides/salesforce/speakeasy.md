# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Choose **Custom remote server**.
4. On the **Add a custom remote MCP server** page, paste the URL recorded in [Enable the selected SObject server](external.md#enable-sobject-server) into **Remote MCP server URL**.
5. Select **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page with Custom remote server visible -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, select **Configure Manually**.
3. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**.

The sheet shows the **Redirect URI** with a copy button. It is the callback URL registered in Salesforce as `{{ gram.oauth.callback_url }}`.

The Consumer Key-only mapping below is unverified. Salesforce documents it for compatible public clients but not for the Speakeasy AI Control Plane.

4. Paste the [**Consumer Key**](external.md#copy-consumer-key) into **Client ID**.
5. Leave **Client Secret (optional)** empty.
6. Select **Attach Identity Provider**.
7. Confirm that the sheet's **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value registered in [**Callback URL**](external.md#configure-oauth-settings).

If attaching still fails after Salesforce's documented 30-minute app propagation window, stop and escalate instead of changing the candidate configuration.

<!-- screenshot: Attach Remote Identity Provider with Client Type, Redirect URI, and the credential labels visible; redact the Client ID -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Salesforce's MCP documentation](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html).
