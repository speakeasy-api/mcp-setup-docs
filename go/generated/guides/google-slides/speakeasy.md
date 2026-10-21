# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this URL into **MCP server URL**:

   ```
   https://slidesmcp.googleapis.com/mcp/v1
   ```

5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. After verification succeeds, select **User Identity** under **Identity**. The page preselects **No Identity** for this server, so change it.
8. Click **Save**.

Speakeasy keeps the new server **Disabled** and says to finish setup in **Settings > Identity**. This is expected for Google Slides; continue with the next section.

<!-- screenshot: New remote MCP server after Verify connectivity, with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section.

1. Confirm **User Identity** is selected.
2. Under **Choose an identity provider**, confirm the preselected Google provider (`https://accounts.google.com`). A new provider shows **Will be created**. If a different provider is preselected, open the picker, search in **Search identity providers…**, and choose the Google provider.
3. Choose **Manual**. If **Existing client** is preselected, switch to **Manual** unless that client is the one created in [Create the OAuth client](external.md#create-oauth-client) with the four scopes below.
4. Paste the **Client ID** from [Copy the OAuth credentials](external.md#copy-oauth-credentials) into **Client ID**.
5. Paste the **Client secret** from [Copy the OAuth credentials](external.md#copy-oauth-credentials) into **Client secret**. Google requires this secret even though the field shows "Optional".
6. Under **Advanced > Scope**, enter this value on one line:

   ```
   https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/presentations.readonly https://www.googleapis.com/auth/presentations
   ```

   Do not leave **Scope** blank. A blank value also requests full Google Drive access (`https://www.googleapis.com/auth/drive`), which the consent screen does not grant.

7. Click **Save**. If asked to confirm, click **Save changes**.

Turn the server on:

1. Open **Settings > Danger Zone > Server Availability**.
2. Turn on the switch (**Enable MCP server**) so it shows **Enabled**.

At first connection, complete Google's browser authorization with an account granted **MCP Tool User** in [Grant MCP Tool User access](external.md#grant-mcp-tool-user) and access to the intended presentations. An **External** app in **Testing** also requires that account under **Test users**.

<!-- screenshot: Settings > Identity with User Identity, the Google provider, and Manual selected; credentials redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's Slides MCP documentation](https://developers.google.com/workspace/slides/api/guides/configure-mcp-server).
