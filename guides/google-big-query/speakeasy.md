# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste this shared URL into **Remote MCP server URL**:

   ```
   https://bigquery.googleapis.com/mcp
   ```

5. Select **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: Show Add Source and the custom remote URL field. -->

### Connect your credentials {#connect-speakeasy-credentials}

The Google Web application client requires its secret. Supply it even though the field is **Client Secret (optional)**.

1. From **Overview**, open **Settings**.
2. Under **Authentication**, select **Configure Manually**, or **Use Discovered** if offered.
3. In **Attach Remote Identity Provider**, enter `https://accounts.google.com` in **Issuer URL** if needed.
4. Under **Endpoints**, select **Discover** to fill the provider endpoints.
5. Set **Client Type** to **Manual**.
6. In **Scope (override)**, enter this value:

   ```
   https://www.googleapis.com/auth/bigquery
   ```

7. Leave **Audience (optional)** empty.
8. Paste the client ID from [Copy the client credentials](external.md#copy-client-credentials) into **Client ID**.
9. Paste the **Client secret** from [Copy the client credentials](external.md#copy-client-credentials) into **Client Secret (optional)**.
10. Make sure that **Redirect URI** exactly matches the callback registered in [Create the OAuth client](external.md#create-oauth-client) with `{{ gram.oauth.callback_url }}`.
11. Select **Attach Identity Provider**.
12. Complete Google browser authorization with the intended user when the connection requests access.

<!-- screenshot: Show Attach Remote Identity Provider with Manual, issuer, scope, and Redirect URI. Hide credential values. -->

This guide covers setup only. For billing, tool behavior, and limits, see [Google's BigQuery MCP documentation](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp).
