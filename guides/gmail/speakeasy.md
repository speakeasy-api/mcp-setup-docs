# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this URL into **MCP server URL**:

   ```text
   https://gmailmcp.googleapis.com/mcp/v1
   ```

5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, select **User Identity**. The page preselects **No Identity** for this server, so change it.
8. If **Guardrails** appears, leave it off.
9. Click **Save**.

Speakeasy keeps the new server **Disabled** and says to finish setup in **Settings > Identity**. This is expected for Gmail; the next section finishes it.

<!-- screenshot: New remote MCP server after Verify connectivity, with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section.

1. Select **User Identity**.
2. In **Choose an identity provider**, confirm that the preselected provider is Google's issuer, `https://accounts.google.com/`. It is badged **Will be created** when the project has no Google provider yet. If another provider is selected, open the picker, search in **Search identity providers…**, and choose the Google provider.
3. Under the provider, choose **Manual**. If **Existing client** is preselected, switch to **Manual**.
4. Paste the **Client ID** from [Create the OAuth client](external.md#create-oauth-client) into **Client ID**.
5. Paste the **Client Secret** from [Create the OAuth client](external.md#create-oauth-client) into **Client secret**. Gmail requires the secret even though the field shows "Optional".
6. Open **Advanced**. In **Scope**, enter this value on one line. Do not leave **Scope** blank: a blank value requests every scope the Gmail server advertises, including `https://mail.google.com/`, which your Google app does not grant.

   ```text
   https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose
   ```

7. Click **Save**. If Speakeasy asks you to confirm, click **Save changes**.
8. Open **Settings > Danger Zone > Server Availability**.
9. Turn on **Enable MCP server** so the switch shows **Enabled**.

When a person first uses the server, Google's browser authorization prompt appears.

<!-- screenshot: Settings > Identity with User Identity, the Google provider, and Manual selected; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Gmail's MCP documentation](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server).
