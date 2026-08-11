# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**.

1. Choose **Custom remote server**.
2. On the **Add a custom remote MCP server** page, paste this URL into **Remote MCP server URL**:

   ```
   https://bigquery.googleapis.com/mcp
   ```

3. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu with Custom remote server, or the Add a custom remote MCP server page -->

### Connect your credentials {#connect-speakeasy-credentials}

Google's web client requires its generated secret even though the Speakeasy AI Control Plane field is labeled **Client Secret (optional)**.

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually** or, if offered, **Use Discovered**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.

The sheet shows **Redirect URI** with a copy button. It is the callback URL registered in [Create the OAuth client](external.md#create-oauth-client) with `{{ gram.oauth.callback_url }}`.

4. Paste the **Client ID** from [Copy the client credentials](external.md#copy-client-credentials) into **Client ID**.
5. Paste the **Client secret** from [Copy the client credentials](external.md#copy-client-credentials) into **Client Secret (optional)**.
6. In **Scope (override)**, enter this value:

   ```
   https://www.googleapis.com/auth/bigquery
   ```

7. Click **Attach Identity Provider**.
8. Confirm that the sheet's **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value registered under **Authorized redirect URIs** in [Create the OAuth client](external.md#create-oauth-client). You entered that template directly during provider setup; do not visit this sheet midway through provider setup only to copy the URI.

<!-- screenshot: Attach Remote Identity Provider showing Client Type: Manual, Redirect URI, credential labels, and scope configuration, with credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's BigQuery MCP documentation](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp).
