# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, find GitHub using **Search MCP servers...**.
5. Open its entry and click **Add**.
6. In the **Add to Project** dialog, under **Identity**, select **User Identity**. The dialog may preselect **No Identity**.
7. Click **Add to Project**. If the dialog offers a **Guardrails** step, finish it or click **Skip for now**.

GitHub needs a client registered by hand, so the result says to finish setup in **Settings > Identity**, and the server stays **Disabled** for now. This is expected. Click **Finish setup** on the server's result to open its **Settings**.

<!-- screenshot: GitHub's catalog entry in Add to Project with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

In the server's **Settings**, find the **Identity** section.

1. Select **User Identity**.
2. In **Choose an identity provider**, confirm the provider is `https://github.com/login/oauth`. It may be badged **Will be created**. If no provider or a different one is selected, open the picker, search for `github.com` in **Search identity providers…**, and choose the `github.com/login/oauth` provider.
3. Under the provider, choose **Manual**.
4. Paste the **Client ID** from [Generate the OAuth credentials](external.md#generate-oauth-credentials) into **Client ID**.
5. Paste the client secret from [Generate the OAuth credentials](external.md#generate-oauth-credentials) into **Client secret**. GitHub requires it, even though the field shows "Optional".
6. Open **Advanced** and enter the scopes users may grant in **Scope**, on one line. Start from the full list GitHub's server advertises and delete any your organization does not allow:

   ```text
   repo read:org read:user user:email read:packages write:packages read:project project gist notifications
   ```

   A blank **Scope** requests every scope in this list, including `repo`, `write:packages`, and `gist`.

7. Click **Save**.

This section does not show the redirect URI. GitHub accepts the connection only if [Register the OAuth app](external.md#register-oauth-app) set **Authorization callback URL** to `{{ gram.oauth.callback_url }}`.

Then turn the server on:

1. In **Settings**, open **Danger Zone**.
2. Under **Server Availability**, turn on **Enable MCP server** so it shows **Enabled**.

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

<!-- screenshot: Settings > Identity with User Identity, the github.com/login/oauth provider, and Manual selected; credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [GitHub's MCP documentation](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md).
