# Speakeasy setup

Complete [Google Calendar setup](external.md#confirm-preview-access), including the organization-owned screening prerequisite, before you connect.

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Select **Custom remote server**.
4. On **Add a custom remote MCP server**, enter this value in **Remote MCP server URL**:

   ```text
   https://calendarmcp.googleapis.com/mcp/v1
   ```

5. Select **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: Show the Add Source menu and the custom remote server URL field. -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, select **Configure Manually**, or **Use Discovered** if it is available.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. If the form needs an issuer URL, enter this Google issuer:

   ```text
   https://accounts.google.com
   ```

5. Confirm that **Redirect URI** matches the callback value registered in [Google setup](external.md#create-oauth-client).
6. Enter the [Client ID](external.md#create-oauth-client) in **Client ID**.
7. Enter the [Client Secret](external.md#create-oauth-client) in **Client Secret (optional)**. Supply the Google secret even though the field label says optional.
8. If the form asks for scopes, enter the three required values separately:

   ```text
   https://www.googleapis.com/auth/calendar.calendarlist.readonly
   https://www.googleapis.com/auth/calendar.events.freebusy
   https://www.googleapis.com/auth/calendar.events.readonly
   ```

9. Select **Attach Identity Provider**.

**Warning:** An **External** application in **Testing** has a seven-day refresh-token limit. Another sign-in will be necessary after expiration. Do not publish the preview application to remove this limit.

When the client first requests Google access:

1. Complete the Google browser sign-in with the intended eligible account. For **External Testing**, use an assigned test user.
2. Give consent for the selected read and availability access.

The Speakeasy AI Control Plane automatically requests offline access and consent on this Google OAuth connection. It stores the initial refresh token and uses it to refresh access tokens. You do not need to configure authorization parameters. Refresh tokens do not guarantee permanent access. User revocation, administrator restrictions, and Google token limits can stop access.

<!-- screenshot: Show Attach Remote Identity Provider with Client Type set to Manual. Hide credential values. -->

This guide covers setup only. For tool behavior and limits, see [Google's MCP documentation](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server).
