# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.

Use a Salesforce catalog listing only if it explicitly identifies the selected Hosted MCP SObject server, matches the URL recorded in [Enable the selected SObject server](external.md#enable-sobject-server), and supports this guide's manual OAuth configuration. The mapping of Salesforce catalog listings to these servers is unverified.

1. Choose **3rd-party server**.
2. On the **MCP Catalog** page, enter `Salesforce` in **Search MCP servers...**.
3. Open the Salesforce entry with **View**.
4. Select **Add**.
5. In the **Add to Project** dialog, select **Add to Project**.

Otherwise, use a custom remote server:

1. Choose **Custom remote server**.
2. On the **Add a custom remote MCP server** page, paste the URL recorded in [Enable the selected SObject server](external.md#enable-sobject-server) into **Remote MCP server URL**.
3. Select **Add server**.

Either path creates the hosted MCP Server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or Salesforce's catalog entry -->

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
