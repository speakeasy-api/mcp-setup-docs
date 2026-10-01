# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this URL into **MCP server URL**:

   ```text
   https://mcp.slack.com/mcp
   ```

5. Optionally enter a **Display name (optional)**.
6. Leave **User session issuer** at its default.
7. Click **Verify connectivity**.
8. Under **Identity**, confirm that **User Identity** is selected.
9. If **Guardrails** appears, leave it off.
10. Click **Save**.

Speakeasy keeps the new server **Disabled** and says to finish setup in **Settings > Identity**. This is expected for Slack; the next section finishes it.

<!-- screenshot: New remote MCP server after Verify connectivity, with Slack's endpoint entered and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section.

1. Select **User Identity**.
2. In **Choose an identity provider**, confirm that the preselected provider is Slack's issuer, `https://mcp.slack.com`. It is badged **Will be created** when the project has no Slack provider yet. If another provider is selected, open the picker, search in **Search identity providers…**, and choose the Slack provider.
3. Under the provider, choose **Manual**. If **Existing client** is preselected, switch to **Manual**.
4. Paste the [Slack Client ID](external.md#copy-client-credentials) into **Client ID**.
5. Paste the [Slack Client Secret](external.md#copy-client-credentials) into **Client secret**. Slack requires the secret even though the field shows "Optional".
6. Open **Advanced**. In **Scope**, enter the scopes from [Set user permissions](external.md#set-user-permissions) on one line. Do not leave **Scope** blank: a blank value requests every scope the Slack server advertises, which your app does not grant, and Slack consent fails.

   ```text
   channels:read groups:read im:read mpim:read
   ```

   If your app owner added more user-token scopes, add them to this line, separated by spaces.

7. Click **Save**. If Speakeasy asks you to confirm, click **Save changes**.
8. Open **Settings > Danger Zone > Server Availability**.
9. Turn on **Enable MCP server** so the switch shows **Enabled**.

When a person first uses the server, Slack's browser authorization prompt appears. Each person authorizes with their own Slack account; saving the client does not grant access to anyone's Slack data.

<!-- screenshot: Settings > Identity with User Identity, the Slack provider, and Manual selected; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Slack's MCP documentation](https://docs.slack.dev/ai/slack-mcp-server/).
