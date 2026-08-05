# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**.

- If Google BigQuery is in the catalog: choose **3rd-party server**. On the **MCP Catalog** page, find Google BigQuery (the search box reads **Search MCP servers...**), open its entry with **View**, and click **Add**. In the **Add to Project** dialog, click **Add to Project**.
- If it is not: choose **Custom remote server**. On the **Add a custom remote MCP server** page, paste this URL into **Remote MCP server URL**, then click **Add server**:

  ```
  https://bigquery.googleapis.com/mcp
  ```

Either path creates the hosted MCP server and opens its **Overview** page.

If you came here from [Create the OAuth client](external.md#create-oauth-client), return there and continue with the next step.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Google's web client requires its generated secret even though the Speakeasy AI Control Plane field is labeled **Client Secret (optional)**.

If **Attach Remote Identity Provider** is not already open, repeat steps 2–5 from [Create the OAuth client](external.md#create-oauth-client).

1. Paste the **Client ID** from [Copy the client credentials](external.md#copy-client-credentials) into **Client ID**.
2. Paste the **Client secret** into **Client Secret (optional)**.
3. In **Scope (override)**, enter this value:

   ```
   https://www.googleapis.com/auth/bigquery
   ```

4. Click **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider showing Client Type: Manual, Redirect URI, credential labels, and scope configuration, with credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's BigQuery MCP documentation](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp).
