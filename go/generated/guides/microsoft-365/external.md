---
setup_version: 1
---

# Microsoft 365

Speakeasy hosts this Microsoft 365 MCP server. It gives each person's MCP client the same 50 tools as Anthropic's Microsoft 365 connector: Outlook mail and calendar, Teams chats and channels, SharePoint and OneDrive files, and people search. The server stores no credentials. Each person signs in with their own Microsoft account, and every call runs as that person through Microsoft Graph with delegated permissions.

You need a Microsoft 365 work or school account for each person who connects. Personal Microsoft accounts are not supported. Mail and calendar tools need an Exchange Online mailbox. Teams and SharePoint or OneDrive tools need access to those services. An Entra administrator registers one application in your tenant and grants admin consent once. Keep the client secret out of source control, screenshots, and support transcripts.

### Register the Entra application {#register-entra-application}

<!-- screenshot: Entra app registration with "Accounts in this organizational directory only" and a Web redirect URI; tenant and client identifiers redacted -->

In the [Microsoft Entra admin center](https://entra.microsoft.com), open **App registrations** and select **New registration**. See Microsoft's [app registration guide](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app).

1. Enter a name, for example **Speakeasy Microsoft 365 MCP**.
2. Under **Supported account types**, select **Accounts in this organizational directory only**.
3. Under **Redirect URI**, select the **Web** platform and enter the callback for your Speakeasy deployment:

   ```text
   {{ gram.oauth.callback_url }}
   ```

   Use this exact value. Do not use an MCP client's localhost callback.

4. Select **Register**.
5. On the app's **Overview**, record the **Application (client) ID** and the **Directory (tenant) ID**. The object ID is not the client ID.

### Add the Microsoft Graph permissions {#add-graph-permissions}

<!-- screenshot: API permissions list with the Microsoft Graph delegated permissions and admin consent granted; tenant name redacted -->

In the app, open **API permissions**, select **Add a permission → Microsoft Graph → Delegated permissions**, and add these permissions. See the [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference) for what each one grants.

| Area | Delegated permissions |
| --- | --- |
| Sign-in | `openid`, `profile`, `offline_access` |
| Profile and people | `User.Read`, `User.ReadBasic.All`, `People.Read` |
| Mail | `Mail.ReadWrite`, `Mail.Read.Shared`, `Mail.Send`, `MailboxSettings.ReadWrite` |
| Calendar | `Calendars.ReadWrite`, `Calendars.Read.Shared` |
| Teams | `Chat.Read`, `Chat.Create`, `ChatMessage.Send`, `Channel.ReadBasic.All`, `ChannelMessage.Read.All`, `ChannelMessage.Send`, `Team.ReadBasic.All` |
| Files | `Files.ReadWrite.All`, `Sites.Read.All` |
| Meetings | `OnlineMeetings.Read`, `OnlineMeetingTranscript.Read.All` |

`offline_access` lets Speakeasy refresh sessions without asking people to sign in again every hour.

You can leave out permissions for tools you do not want to offer. For example, omit `Mail.Send`, `ChatMessage.Send`, and `ChannelMessage.Send` to prevent sending on people's behalf. A tool that needs a missing permission fails and asks the client to request it; it does not fall back to broader access.

Then select **Grant admin consent for** your tenant and confirm. See Microsoft's [admin consent guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent). `ChannelMessage.Read.All`, `Files.ReadWrite.All`, and `OnlineMeetingTranscript.Read.All` always need admin consent. Tenant-wide delegated consent approves the permissions; it does not sign anyone in or share a session. Each person still signs in individually, and access stays limited to what that person can already reach in Microsoft 365.

### Create a client secret {#create-client-secret}

<!-- screenshot: Certificates & secrets with a new client secret; the secret value redacted -->

**Before you start:** Entra shows the secret **Value** only once. Have your approved password manager ready.

1. In the app, open **Certificates & secrets** and select **New client secret**.
2. Enter a description and choose an approved expiry.
3. Select **Add**, then copy the **Value**, not the **Secret ID**, into your password manager.

Record the expiry date and assign an owner. Sign-in stops working when the secret expires, so rotate it beforehand and update the client in Speakeasy.

### Restrict who can connect {#restrict-app-access}

<!-- screenshot: Enterprise application Properties with Assignment required set to Yes, and Users and groups with approved assignments; names redacted -->

Optional, but recommended before broad rollout.

1. Open **Enterprise applications** and select the app you registered.
2. Under **Properties**, set **Assignment required?** to **Yes** and save.
3. Under **Users and groups**, assign the people or groups who should connect. See Microsoft's [assignment guide](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal). Group assignment requires Entra ID P1 or P2 and does not include nested groups.

Global Administrators can bypass the assignment requirement, so test with an ordinary account that unassigned people are denied.
