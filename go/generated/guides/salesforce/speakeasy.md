# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Choose **Custom remote server**.
4. On the **Add a custom remote MCP server** page, paste the URL recorded in [Enable the selected SObject server](external.md#enable-sobject-server) into **Remote MCP server URL**.
5. Select **Add server**.

This creates the hosted MCP Server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page with Custom remote server visible -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, select **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` registered in [Configure OAuth settings](external.md#configure-oauth-settings).

The Consumer Key-only mapping below is an unverified candidate configuration. Salesforce documents it for compatible public clients but not for the Speakeasy AI Control Plane. Validate it end to end before treating it as confirmed.

5. Paste the [**Consumer Key**](external.md#copy-consumer-key) into **Client ID**.
6. Leave **Client Secret (optional)** empty.
7. Select **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider with Client Type, Redirect URI, and the credential labels visible; redact the Client ID -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Salesforce's MCP documentation](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html).
