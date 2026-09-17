# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On the **New remote MCP server** page, paste this value into **MCP server URL**:

```text
https://gmailmcp.googleapis.com/mcp/v1
```

5. Click **Verify connectivity**, then **Save**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add MCP server page, or the provider's catalog entry -->

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

1. Paste the **Client ID** from [Create the OAuth client](external.md#create-oauth-client) into **Client ID**.
1. Paste the **Client Secret** from [Create the OAuth client](external.md#create-oauth-client) into **Client Secret (optional)**. The Gmail setup requires this value despite the generic optional label.

#### Check client requirements

For both new and reused clients, verify the Google app's approved audience and publishing status. An **External** app in **Testing** must list each connecting account under **Test users**. Reusing a client does not require entering its credentials again.

For a new client, enter these comma-separated scopes in **Scope (override)**. For a reused client, inspect its read-only **Scope** value; if it does not include both scopes, choose **Add new** instead. The scopes must also match the Google app's **Data Access** configuration:

```text
https://www.googleapis.com/auth/gmail.readonly, https://www.googleapis.com/auth/gmail.compose
```

#### Verify and attach

1. Confirm that the callback URL registered with the provider is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

<!-- screenshot: the manual Attach Remote Identity Provider sheet with the Redirect URI visible and credentials redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Gmail's MCP documentation](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server).
