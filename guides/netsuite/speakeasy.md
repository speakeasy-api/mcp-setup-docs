# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste the account-specific endpoint you formed in [Record the account-specific MCP URL](external.md#record-account-mcp-url) into **Remote MCP server URL**. **Transport** is read-only.
5. Click **Add server**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Paste the **Client ID** copied in [Create the OAuth integration](external.md#create-oauth-integration).
5. Leave **Client Secret (optional)** empty.
6. Click **Attach Identity Provider**.
7. Confirm that **Redirect URI** matches the value registered in that step.

When a client first requests access, sign in to NetSuite with the scoped non-Administrator role assigned in [Configure a scoped non-admin role](external.md#configure-scoped-role). Review the allow/deny prompt, then allow access only after reviewing your organization's data-sharing controls.

<!-- screenshot: Attach Remote Identity Provider with Client Type: Manual, Client ID, empty optional secret, and Redirect URI visible; redact the ID and URI -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [NetSuite's MCP documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html).
