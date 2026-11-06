# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this into **MCP server URL**:

   ```text
   https://catalog.speakeasy.com/m365/mcp
   ```

5. Optionally enter **Display name (optional)**, for example **Microsoft 365**.
6. Leave **User session issuer** at its default.
7. Click **Verify connectivity**. The server answers with a sign-in challenge, so **Identity** preselects **User Identity**. Keep it selected.
8. Leave **Guardrails** off unless your organization requires one, then click **Save** to open the server's **Overview**.

The server is expected to stay **Disabled** and ask you to finish setup in **Settings > Identity**. Microsoft does not support automatic client registration, so the client from [Register the Entra application](external.md#register-entra-application) is added by hand below.

<!-- screenshot: New remote MCP server with the Microsoft 365 URL and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

The server's metadata names Microsoft's multi-tenant sign-in address (`https://login.microsoftonline.com/organizations/v2.0`). Its published issuer is a placeholder (`https://login.microsoftonline.com/{tenantid}/v2.0`), so Speakeasy cannot create a provider from it. Create a provider for your own tenant instead. Do not reuse an identity provider shared by unrelated servers.

1. Open the server's **Settings > Identity** and select **User Identity**.
2. Open **Choose an identity provider** and click **Create a custom identity provider**. This opens **Remote Identity Providers**.
3. Click **New Remote Identity Provider**.
4. In **Issuer URL**, enter the following, replacing `<TENANT_ID>` with the **Directory (tenant) ID** from [Register the Entra application](external.md#register-entra-application):

   ```text
   https://login.microsoftonline.com/<TENANT_ID>/v2.0
   ```

5. Click **Discover**, then verify under **Endpoints** that **Authorization Endpoint** and **Token Endpoint** are:

   ```text
   https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/authorize
   https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token
   ```

6. Keep the derived **Slug** and click **Create**.
7. On the new provider, click **Add Client** and set **Client Type** to **Manual**.
8. Paste the **Application (client) ID** into **Client ID**.
9. Paste the secret **Value** from [Create a client secret](external.md#create-client-secret) into **Client Secret (optional)**. Microsoft requires the secret despite the field's optional label.
10. In **Scope (override)**, enter these scopes, comma-separated. Drop any you left out in [Add the Microsoft Graph permissions](external.md#add-graph-permissions):

    ```text
    openid,profile,offline_access,https://graph.microsoft.com/User.Read,https://graph.microsoft.com/User.ReadBasic.All,https://graph.microsoft.com/People.Read,https://graph.microsoft.com/Mail.ReadWrite,https://graph.microsoft.com/Mail.Read.Shared,https://graph.microsoft.com/Mail.Send,https://graph.microsoft.com/MailboxSettings.ReadWrite,https://graph.microsoft.com/Calendars.ReadWrite,https://graph.microsoft.com/Calendars.Read.Shared,https://graph.microsoft.com/Chat.Read,https://graph.microsoft.com/Chat.Create,https://graph.microsoft.com/ChatMessage.Send,https://graph.microsoft.com/Channel.ReadBasic.All,https://graph.microsoft.com/ChannelMessage.Read.All,https://graph.microsoft.com/ChannelMessage.Send,https://graph.microsoft.com/Team.ReadBasic.All,https://graph.microsoft.com/Files.ReadWrite.All,https://graph.microsoft.com/Sites.Read.All,https://graph.microsoft.com/OnlineMeetings.Read,https://graph.microsoft.com/OnlineMeetingTranscript.Read.All
    ```

    Do not leave it blank. Without `offline_access`, people have to sign in again about every hour.

11. If your deployment shows a token endpoint authentication control for the client, select `client_secret_post`. The [Work IQ guide](../work-iq/speakeasy.md#connect-speakeasy-credentials) found this resolves `invalid_client` errors from Entra.
12. Confirm the displayed **Redirect URI** matches the **Web** callback you registered in [Register the Entra application](external.md#register-entra-application), then click **Create**.
13. Return to the server's **Settings > Identity**, select **User Identity**, choose the new provider in **Choose an identity provider**, choose **Existing client**, and pick the client under **Client**.
14. Click **Save**. If prompted, confirm with **Save changes**.
15. Open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

The first time each person uses the server, Microsoft's sign-in page appears in their browser. They sign in with their own account. If assignment is required, they must be assigned in [Restrict who can connect](external.md#restrict-app-access).

If sign-in fails with `invalid_client`, check the client ID, the tenant in all three URLs, the **Web** callback, the secret **Value** and its expiry, and the selected `client_secret_post` method. If sign-in fails with an error about the `resource` parameter, ask your Speakeasy administrator to stop sending the resource indicator for this provider.

<!-- screenshot: Settings > Identity with User Identity, the tenant-specific custom provider, and Existing client selected; values redacted -->

### Test the connection {#test-connection}

Connect an MCP client to the server's Speakeasy endpoint, sign in, and run these read-only tools:

| Tool | Expected result |
| --- | --- |
| `get_me` | Your own name and email address |
| `outlook_email_search` with `order: "newest"` | Your latest messages, then a final `nextOffset` item when more exist |
| `teams_list_teams` | The teams you belong to |
| `outlook_find_available_time` for a short range | Open slots in your mailbox time zone |

An empty calendar or no SharePoint results can still be a successful, authorized read. A tool that fails with a request to add a permission means that permission was left out or not consented in Entra.

This guide covers setup only. For anything beyond it, such as tool behavior and limits, see the [Microsoft Graph documentation](https://learn.microsoft.com/en-us/graph/overview).
