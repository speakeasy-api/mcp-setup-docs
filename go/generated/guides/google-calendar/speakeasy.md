# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste this URL into **Remote MCP server URL**:

   ```
   https://calendarmcp.googleapis.com/mcp/v1
   ```

5. Click **Add server**.

This creates the hosted MCP server and opens its Overview page.

<!-- screenshot: the Add Source menu open on the Sources page -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually** or **Use Discovered** when offered.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**. The sheet shows **Redirect URI** with a copy button.
4. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` entered when you [created the OAuth client](external.md#create-oauth-client).
5. Paste the **Client ID** from [Copy the OAuth credentials](external.md#copy-oauth-credentials).
6. Paste the **Client Secret** from [Copy the OAuth credentials](external.md#copy-oauth-credentials) into **Client Secret (optional)**. Google requires this value despite the optional Speakeasy label.
7. Make **Scope (override)** contain all three required scopes below. Speakeasy's public setup material does not document how the field separates multiple values, so follow the current field guidance rather than assuming a delimiter:

   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events.freebusy`
   - `https://www.googleapis.com/auth/calendar.events.readonly`

8. Click **Attach Identity Provider**.
9. At first connection, authorize the requested access with an intended Google account that is eligible under the Developer Preview terms, has `mcp.tools.call` on the project, access to the required calendars, applicable **Test user** status, and Workspace API-control approval when required. **MCP Tool User** is the normal predefined grant for `mcp.tools.call`, but another role containing the permission can suffice. Use the visible controls on Google's authorization screen.

<!-- screenshot: the Attach Remote Identity Provider sheet with Client Type Manual and Redirect URI visible; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's MCP documentation](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server).
