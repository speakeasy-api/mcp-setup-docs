# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://calendarmcp.googleapis.com/mcp/v1` into **Remote MCP server URL**.
5. Click **Add server**.

This opens the server's **Overview** page. **Transport** is read-only.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually** or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` entered when you [created the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from [Copy the OAuth credentials](external.md#copy-oauth-credentials).
6. Paste the **Client secret** into **Client Secret (optional)**. Google requires this value despite the optional Speakeasy label.
7. In **Scope (override)**, enter `https://www.googleapis.com/auth/calendar.calendarlist.readonly,https://www.googleapis.com/auth/calendar.events.freebusy,https://www.googleapis.com/auth/calendar.events.readonly`.
8. Click **Attach Identity Provider**.
9. At first connection, authorize with an account granted **MCP Tool User**, included as a test user when applicable, and permitted by Workspace policy.

<!-- screenshot: the Manual identity-provider sheet with secrets redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Google's Calendar MCP documentation at https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server.
