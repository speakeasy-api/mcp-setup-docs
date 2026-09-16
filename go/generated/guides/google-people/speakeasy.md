# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.

- If **Google People** is in the catalog:
  1. Choose **3rd-party server**.
  2. On the **MCP Catalog** page, find Google People in **Search MCP servers...**.
  3. Open the matching entry with **View**.
  4. Click **Add**.
  5. In **Add to Project**, click **Add to Project**.
- If no matching catalog entry is available:
  1. Choose **Custom remote server**.
  2. On **Add a custom remote MCP server**, paste this URL into **Remote MCP server URL**:

     ```
     https://people.googleapis.com/mcp/v1
     ```

  3. Click **Add server**.

Either path creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the matching provider catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually** or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` entered when you [created the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from the [OAuth credentials](external.md#copy-oauth-credentials).
6. Paste the **Client Secret (optional)** from the [OAuth credentials](external.md#copy-oauth-credentials). Google requires this secret even though the field is labeled optional.
7. In **Scope (override)**, enter these three identifiers using the field's visible or equivalent multi-scope format:

   ```
   https://www.googleapis.com/auth/directory.readonly
   https://www.googleapis.com/auth/userinfo.profile
   https://www.googleapis.com/auth/contacts.readonly
   ```

8. Click **Attach Identity Provider**.
9. At first connection, follow Google's visible or equivalent browser authorization controls with an account that has [MCP Tool User access](external.md#grant-mcp-tool-user).

<!-- screenshot: Attach Remote Identity Provider showing Manual client type, redirect URI, credential labels, and scopes, with secrets redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's People API MCP documentation](https://developers.google.com/people/v1/configure-mcp-server).
