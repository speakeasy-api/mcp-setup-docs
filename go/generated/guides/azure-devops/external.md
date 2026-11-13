---
setup_version: 1
---

# Azure DevOps

Microsoft hosts the remote Azure DevOps MCP server. It gives each person's MCP client tools for work items, repositories, pull requests, pipelines, wikis, test plans, and advanced security in one Azure DevOps organization. Each person signs in with their own Microsoft Entra account. A call succeeds only when both the permissions you grant the application and that person's own Azure DevOps permissions allow it.

You need an Azure DevOps Services organization that is backed by a Microsoft Entra tenant; organizations that use standalone Microsoft accounts are not supported. Note the organization name, for example `contoso` from `https://dev.azure.com/contoso`. An Entra administrator registers one application in that tenant and grants admin consent once. Each person who connects needs membership in the projects they will use. Keep the client secret out of source control, screenshots, and support transcripts.

### Confirm the Azure DevOps MCP application {#confirm-enterprise-application}

<!-- screenshot: Enterprise applications search showing Azure DevOps MCP with Application type set to All applications; tenant name redacted -->

Microsoft's Azure DevOps MCP application must exist in your tenant before you can grant permissions to it.

1. In the [Azure portal](https://portal.azure.com), open **Microsoft Entra ID > Enterprise applications**.
2. Set **Application type** to **All applications**.
3. Search for **Azure DevOps MCP** or this application ID:

   ```text
   2a72489c-aab2-4b65-b93a-a91edccf33b8
   ```

If it is listed, continue to the next section. If it is not, an Application Administrator, Cloud Application Administrator, or Global Administrator creates it with the [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli), replacing `<TENANT_ID>` with your tenant ID:

```text
az login --tenant <TENANT_ID> --allow-no-subscriptions
az ad sp create --id 2a72489c-aab2-4b65-b93a-a91edccf33b8
```

Then search again. See Microsoft's [troubleshooting steps](https://learn.microsoft.com/en-us/azure/devops/mcp-server/remote-mcp-server-troubleshooting?view=azure-devops#cant-find-the-azure-devops-mcp-enterprise-application-in-the-tenant) for how to check the result.

### Register the Entra application {#register-entra-application}

<!-- screenshot: Entra app registration with "Accounts in this organizational directory only" and a Web redirect URI; tenant and client identifiers redacted -->

In the [Microsoft Entra admin center](https://entra.microsoft.com), open **App registrations** and select **New registration**. See Microsoft's [app registration guide](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app).

1. Enter a name, for example **Speakeasy Azure DevOps MCP**.
2. Under **Supported account types**, select **Accounts in this organizational directory only**.
3. Under **Redirect URI**, select the **Web** platform and enter the callback for your Speakeasy deployment:

   ```text
   {{ gram.oauth.callback_url }}
   ```

   Use this exact value. Do not use the localhost callbacks from Microsoft's Cursor or Claude Code instructions.

4. Select **Register**.
5. On the app's **Overview**, record the **Application (client) ID** and the **Directory (tenant) ID**. The object ID is not the client ID.

Leave **Allow public client flows** off. Microsoft's Cursor desktop instructions turn it on, but Speakeasy signs in with a client secret instead.

### Add the Azure DevOps MCP permissions {#add-azure-devops-permissions}

<!-- screenshot: API permissions list with Azure DevOps MCP delegated permissions and admin consent granted; tenant name redacted -->

1. In the app, open **API permissions** and select **Add a permission**.
2. Select **APIs my organization uses**, then search for **Azure DevOps MCP** or the application ID from [Confirm the Azure DevOps MCP application](#confirm-enterprise-application), and select it.
3. Select the delegated permissions for the work people will do, then select **Add permissions**.
4. Select **Grant admin consent** for your tenant and confirm. Depending on your role, a tenant administrator might need to do this.

Grant only what people need. Choose read permissions if they only read, and add write or manage permissions only for the operations that need them. Some permissions include others, so avoid adding both. Microsoft's [OAuth scopes reference](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth?view=azure-devops#oauth-scopes) lists what each one grants. Turning on more MCP tools later does not widen these permissions.

### Create a client secret {#create-client-secret}

<!-- screenshot: Certificates & secrets with a new client secret; the secret value redacted -->

**Before you start:** Entra shows the secret **Value** only once. Have your approved password manager ready.

1. In the app, open **Certificates & secrets** and select **New client secret**.
2. Enter a description and choose an approved expiry.
3. Select **Add**, then copy the **Value**, not the **Secret ID**, into your password manager.

Record the expiry date and assign an owner. Sign-in stops working when the secret expires, so create a replacement beforehand and update the client in Speakeasy.
