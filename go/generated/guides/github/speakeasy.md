# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, find GitHub using **Search MCP servers...**.
5. Open its entry with **View**.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: GitHub's catalog entry with View and Add visible, excluding unrelated catalog results -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**.

If **Use Discovered** is offered under **Authentication**, click it. Otherwise, click **Configure Manually**.

1. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
2. Paste the **Client ID** saved in [Generate the OAuth credentials](external.md#generate-oauth-credentials) into **Client ID**.
3. Paste the saved client secret into **Client Secret (optional)** — although the field is labeled optional, this OAuth connection requires it.
4. Click **Attach Identity Provider**.
5. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value entered in [Register the OAuth app](external.md#register-oauth-app).

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
