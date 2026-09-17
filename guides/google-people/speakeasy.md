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

<!-- screenshot: Add Source menu or Google People catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Complete [Model Armor setup](external.md#configure-model-armor) before the first connection. If you cannot add a source or attach credentials, ask an authorized Speakeasy project administrator for access.

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Issuer URL** to `https://accounts.google.com` if it is not already set.
4. Under **Endpoints**, click **Discover** to load Google's OAuth endpoints.
5. Set **Client Type** to **Manual**.
6. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` from [the OAuth client setup](external.md#create-oauth-client).
7. Paste **Client ID** from [the OAuth credentials](external.md#copy-oauth-credentials).
8. Paste **Client Secret (optional)** from [the OAuth credentials](external.md#copy-oauth-credentials). Use the Google client secret for this connection.
9. In **Scope (override)**, enter the three scopes from [the consent configuration](external.md#configure-oauth-consent):

   ```
   https://www.googleapis.com/auth/directory.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/contacts.readonly
   ```

10. Click **Attach Identity Provider**.
11. At the first connection, complete Google's browser sign-in and consent with an eligible account from [user setup](external.md#approve-user-access).

The Speakeasy AI Control Plane requests offline access and consent automatically for this Google issuer. No extra authorization-parameter setup is needed. **External Testing** authorization and refresh tokens expire after seven days. The user must then sign in and give consent again. Google can also end access for other reasons; refresh tokens do not guarantee permanent access.

<!-- screenshot: Manual identity provider with Google issuer, scopes, and credential labels; credential values hidden -->

This guide covers setup only. For billing, tool behavior, and limits, see [Google's People API MCP documentation](https://developers.google.com/people/v1/configure-mcp-server).
