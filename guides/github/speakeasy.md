# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open the **Add MCP server** page.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, find GitHub using **Search MCP servers...**.
5. Open its entry.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

After installation, select **Configure MCP settings** on the completion screen to open the server, then open **Settings**.

<!-- screenshot: GitHub's catalog entry with Add visible, excluding unrelated catalog results -->

### Connect your credentials {#connect-speakeasy-credentials}

Select **Configure MCP settings** on the completion screen, then open the server’s **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only, confirm **Issuer URL**, the auto-derived **Slug**, and **Endpoints**. Discovery runs automatically for a seeded issuer; after typing or changing the URL, select **Discover** only if offered.

For a new provider, use the authorization-server issuer `https://github.com/login/oauth` identified by GitHub’s protected-resource metadata. If discovery does not supply the endpoints, ask your administrator for the documented authorization and token endpoints before continuing; do not infer them from the MCP URL.

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Verify the callback and attach** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

1. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
1. Paste the **Client ID** saved in [Generate the OAuth credentials](external.md#generate-oauth-credentials) into **Client ID**.
1. Paste the saved client secret into **Client Secret (optional)** — although the field is labeled optional, this OAuth connection requires it.

#### Verify the callback and attach

1. Confirm that the callback URL registered with the provider is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

For the provider-side callback setting, see [Register the OAuth app](external.md#register-oauth-app).

If the target organization restricts OAuth apps, have a user authorize the connection, then complete the following:

1. Have the user click their profile picture.
2. Have the user click **Settings**.
3. Under **Integrations**, have the user click **Applications**.
4. Have the user click **Authorized OAuth Apps**.
5. Have the user open this OAuth app.
6. Next to the target organization, have the user click **Request access**.
7. Have the user click **Request approval from owners**.

Then have an organization owner approve the pending request:

1. Click the profile picture.
2. Click **Organizations**.
3. Select the target organization.
4. Under the organization name, click **Settings**.
5. Under **Third-party Access**, click **OAuth app policy**.
6. Next to the app, click **Review**.
7. Click **Grant access**.

If the user's first authorization attempt was blocked before approval, have the user retry it after access is granted.

<!-- screenshot: Attach Remote Identity Provider with the Redirect URI and credential fields visible and all credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [GitHub's MCP documentation](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md).
