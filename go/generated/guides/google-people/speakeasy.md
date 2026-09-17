# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.

- If **Google People** is in the catalog:
  1. Choose **From the catalog**.
  2. On the **MCP Catalog** page, find Google People in **Search MCP servers...**.
  3. Open the matching entry.
  4. Click **Add**.
  5. In **Add to Project**, click **Add to Project**.
- If no matching catalog entry is available:
  1. Choose **Hosted remotely**.
  2. On **New remote MCP server**, paste this URL into **MCP server URL**:

     ```
     https://people.googleapis.com/mcp/v1
     ```

  3. Click **Verify connectivity**, then **Save**.

For the catalog path, click **Configure MCP settings** on the completion screen to open the server, then open **Settings**. The **Hosted remotely** path opens **Overview** after **Save**; open **Settings** there.

<!-- screenshot: the Add MCP server page, or the matching provider catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** (from **Overview** for a hosted remote server, or **Configure MCP settings** after a catalog addition).

#### Choose an authentication provider

- If **Authentication** is unconfigured, choose **Use Discovered** when available; otherwise choose **Configure Manually**.
- If authentication is configured but no provider is attached, use **Connected services** > **Add provider**.
- If the intended provider is already attached, use its existing controls. Do not attach a duplicate; check its client against the requirements below and skip **Verify and attach**.

In **Attach Remote Identity Provider**, the provider selector defaults to **Select existing** when the project has issuers. Select the appropriate existing Google provider and skip new-provider setup.

#### New provider only

1. Choose **Add new** and enter **Issuer URL**:

   ```text
   https://accounts.google.com/
   ```

2. Confirm the auto-derived **Slug** is unique in the project.
3. Discovery runs automatically for a seeded issuer URL. After typing or changing the URL, click **Discover** only if offered.
4. Review the endpoints, or enter these Google OAuth values if discovery does not populate them.

   Authorization endpoint:

   ```text
   https://accounts.google.com/o/oauth2/v2/auth
   ```

   Token endpoint:

   ```text
   https://oauth2.googleapis.com/token
   ```

#### Choose a session client

- **Reuse:** Under **Session Client**, choose **Select existing** when available and select the appropriate Google OAuth client. Skip credential entry; continue to **Check client requirements**.
- **Create:** Choose **Add new** when available and set **Client Type** to **Manual**. For a new provider, complete the new-client form below.

#### New session client only

1. Paste the **Client ID** from the [OAuth credentials](external.md#copy-oauth-credentials).
1. Paste the **Client Secret (optional)** from the [OAuth credentials](external.md#copy-oauth-credentials). Google requires this secret even though the field is labeled optional.

#### Check client requirements

For both new and reused clients, verify the Google app's approved audience and publishing status. An **External** app in **Testing** must list each connecting account under **Test users**. Reusing a client does not require entering its credentials again.

Confirm the selected client includes the required scopes below. For a new client, configure **Scope (override)**; for a reused client, inspect the read-only **Scope** value. If it does not match, choose **Add new** to create a correctly scoped client; the attach sheet cannot edit a reused client.

For a new client, enter these three identifiers using the field's visible or equivalent multi-scope format:

   ```
   https://www.googleapis.com/auth/directory.readonly
   https://www.googleapis.com/auth/userinfo.profile
   https://www.googleapis.com/auth/contacts.readonly
   ```

#### Verify and attach

1. Confirm that the callback URL registered with the provider is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

For the provider-side callback setting, see [created the OAuth client](external.md#create-oauth-client).

At first connection, follow Google's visible or equivalent browser authorization controls with an account that has [MCP Tool User access](external.md#grant-mcp-tool-user).

<!-- screenshot: Attach Remote Identity Provider showing Manual client type, redirect URI, credential labels, and scopes, with secrets redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's People API MCP documentation](https://developers.google.com/people/v1/configure-mcp-server).
