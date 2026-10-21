# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this URL into **MCP server URL**:

   ```
   https://docsmcp.googleapis.com/mcp/v1
   ```

5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, select **User Identity**. The page preselects **No Identity** for this server, so change it.
8. If **Guardrails** appears, leave it off.
9. Click **Save**.

Speakeasy saves the server as **Disabled** and says to finish setup in **Settings > Identity**. This is expected; the next section completes it.

<!-- screenshot: New remote MCP server with the URL verified and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

1. Open the server's **Settings** and find the **Identity** section.
2. Confirm that **User Identity** is selected.
3. In **Choose an identity provider**, confirm that the preselected provider is Google (`https://accounts.google.com/`). If another provider is shown, open the picker, search in **Search identity providers…**, and choose the Google provider. A provider badged **Will be created** is created when you save.
4. Choose **Manual**.
5. In **Client ID**, paste the **Client ID** from [Copy the client credentials](external.md#copy-client-credentials).
6. In **Client secret**, paste the **Client secret** from the same section. Google requires it even though the field says "Optional".
7. Open **Advanced**. In **Scope**, enter this value on one line:

   ```
   https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/documents
   ```

   Do not leave **Scope** blank. A blank value requests every scope the server advertises, including full Drive access, which the consent screen does not grant.

8. Click **Save**.
9. Open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

When a person first uses the server, Google's browser authorization prompt appears. They must sign in with an account granted [MCP Tool User](external.md#grant-mcp-tool-user). If the app's audience is **External** and in **Testing**, the account must also be listed under **Test users**.

<!-- screenshot: Settings > Identity with User Identity, the Google provider, and Manual selected; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's Docs MCP documentation](https://developers.google.com/workspace/docs/api/guides/configure-mcp-server).
