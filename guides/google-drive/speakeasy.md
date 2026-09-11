# Speakeasy setup

Complete [Google Drive setup](external.md) first. Use an account with permission to add a source in the Speakeasy AI Control Plane.

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.
3. Select **Custom remote server**.
4. On **Add a custom remote MCP server**, enter this value in **Remote MCP server URL**:

   ```text
   https://drivemcp.googleapis.com/mcp/v1
   ```

5. Select **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the custom remote server form with the Drive URL -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, select **Use Discovered** when offered. Otherwise, select **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Paste the **Client ID** from [Create the OAuth client](external.md#create-oauth-client).
5. Paste the **Client Secret** from that same step into **Client Secret (optional)**.
6. Confirm that **Redirect URI** matches the callback value registered in Google:

   ```text
   {{ gram.oauth.callback_url }}
   ```

7. In **Scope (override)**, enter the two documented scopes, separated by a comma:

   ```text
   https://www.googleapis.com/auth/drive.readonly, https://www.googleapis.com/auth/drive.file
   ```

8. Select **Attach Identity Provider**.

<!-- verify(operator): the template key must resolve to the same Redirect URI shown in the sheet -->
<!-- screenshot: Attach Remote Identity Provider with Manual selected; hide credential values -->

This guide covers setup only. For tool behavior and limits, see [Google's MCP documentation](https://developers.google.com/workspace/drive/api/guides/configure-mcp-server).
