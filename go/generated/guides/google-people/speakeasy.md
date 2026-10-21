# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.

- If **Google People** is in the catalog:
  1. Choose **From the catalog**.
  2. On the **MCP Catalog** page, find Google People in **Search MCP servers...**.
  3. Open the matching entry.
  4. Click **Add**.
  5. In **Add to Project**, under **Identity**, select **User Identity**.
  6. Click **Add to Project**. If a **Guardrails** step appears, click **Skip for now**.
  7. When the dialog finishes, the result reads "Added, but disabled until identity is set up." Click **Finish setup** to open the server's **Settings**.
- If no matching catalog entry is available:
  1. Choose **Hosted remotely**.
  2. On **New remote MCP server**, paste this URL into **MCP server URL**:

     ```text
     https://people.googleapis.com/mcp/v1
     ```

  3. Leave **User session issuer** at its default.
  4. Click **Verify connectivity**.
  5. Under **Identity**, select **User Identity**. The page preselects **No Identity** for this server, so change it.
  6. If **Guardrails** appears, leave it off.
  7. Click **Save**.

Either way, Speakeasy keeps the new server **Disabled** and says to finish setup in **Settings > Identity**. This is expected for Google People; the next section finishes it.

<!-- screenshot: the Add MCP server page, or the matching provider catalog entry with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section.

1. Select **User Identity**.
2. In **Choose an identity provider**, confirm that the preselected provider is Google's issuer, `https://accounts.google.com/`. It is badged **Will be created** when the project has no Google provider yet. If another provider is selected, open the picker, search in **Search identity providers…**, and choose the Google provider.
3. Under the provider, choose **Manual**. If **Existing client** is preselected, switch to **Manual**.
4. Paste the **Client ID** from the [OAuth credentials](external.md#copy-oauth-credentials) into **Client ID**.
5. Paste the **Client Secret** from the [OAuth credentials](external.md#copy-oauth-credentials) into **Client secret**. Google requires the secret even though the field shows "Optional".
6. Open **Advanced**. In **Scope**, enter this value on one line:

   ```text
   https://www.googleapis.com/auth/directory.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/contacts.readonly
   ```

7. Click **Save**. If Speakeasy asks you to confirm, click **Save changes**.
8. Open **Settings > Danger Zone > Server Availability**.
9. Turn on **Enable MCP server** so the switch shows **Enabled**.

The callback Speakeasy uses is the `{{ gram.oauth.callback_url }}` value you registered in [Create the OAuth client](external.md#create-oauth-client).

At first connection, follow Google's visible or equivalent browser authorization controls with an account that has [MCP Tool User access](external.md#grant-mcp-tool-user).

<!-- screenshot: Settings > Identity with User Identity, the Google provider, and Manual selected; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's People API MCP documentation](https://developers.google.com/people/v1/configure-mcp-server).
