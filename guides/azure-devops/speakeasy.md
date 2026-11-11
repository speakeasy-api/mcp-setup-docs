# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this into **MCP server URL**, replacing `<organization>` with your Azure DevOps organization name, for example `contoso`:

   ```text
   https://mcp.dev.azure.com/<organization>
   ```

   Use the organization name only, not the full `dev.azure.com` address.

5. Optionally enter **Display name (optional)**, for example **Azure DevOps**.
6. Leave **User session issuer** at its default.
7. Click **Verify connectivity**. The server answers with a sign-in challenge, so **Identity** preselects **User Identity**. Keep it selected.
8. Leave **Guardrails** off unless your organization requires one, then click **Save**.

Speakeasy is expected to report that the server was added but kept disabled, and to open the server's **Settings** at the identity section. Microsoft does not support automatic client registration, so the client from [Register the Entra application](external.md#register-entra-application) is added by hand below.

<!-- screenshot: New remote MCP server with the Azure DevOps URL and User Identity selected; organization name redacted -->

### Connect your credentials {#connect-speakeasy-credentials}

The server's metadata names Microsoft's multi-tenant sign-in address (`https://login.microsoftonline.com/organizations/v2.0`). Its published issuer is a placeholder, so Speakeasy cannot discover it as named. Point the new authorization server at your own tenant instead.

1. In the server's **Settings > Identity**, confirm **User Identity** is selected.
2. Under the authorization server badged **Will be created**, find the error that the metadata document advertises a different issuer than the one requested, and the **Issuer URL** field below it.
3. Replace the **Issuer URL** value with the following, replacing `<TENANT_ID>` with the **Directory (tenant) ID** from [Register the Entra application](external.md#register-entra-application):

   ```text
   https://login.microsoftonline.com/<TENANT_ID>/v2.0
   ```

4. Click **Discover** and wait for "OAuth metadata discovered. Save to finish setup."
5. Choose **Manual**.
6. Paste the **Application (client) ID** into **Client ID**.
7. Paste the secret **Value** from [Create a client secret](external.md#create-client-secret) into **Client secret**. Microsoft requires the secret despite the field's "Optional" placeholder.
8. Open **Advanced**. In **Scope**, select or type each of these values:

   ```text
   openid
   profile
   offline_access
   https://mcp.dev.azure.com/.default
   ```

   Do not leave it blank. A blank scope requests only `https://mcp.dev.azure.com/.default`, so people have to sign in again about every hour. The `.default` value requests the permissions you consented in [Add the Azure DevOps MCP permissions](external.md#add-azure-devops-permissions).

9. Click **Save**. If prompted, confirm with **Save changes**.
10. Open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

If the picker preselects an existing Microsoft authorization server instead and no **Issuer URL** field appears, check its address. Keep it if it is your tenant address from step 3, and continue from step 5. Otherwise, open the picker and choose your tenant's authorization server. If none is listed, an organization admin clicks **Create a custom authorization server**, clicks **New Authorization Server**, enters your tenant address in **Issuer URL**, clicks **Discover**, then clicks **Create**. Return to **Settings > Identity**, choose the new authorization server, and continue from step 5.

The first time each person uses the server, Microsoft's sign-in page appears in their browser. They sign in with their own work account.

If sign-in fails, Entra shows an `AADSTS` error code:

- `AADSTS50011`: the **Web** redirect URI does not exactly match the callback in [Register the Entra application](external.md#register-entra-application).
- `AADSTS7000218` or `invalid_client`: check the **Client ID**, and that the secret **Value** is current and not the **Secret ID**.
- `AADSTS65001`: admin consent was not granted in [Add the Azure DevOps MCP permissions](external.md#add-azure-devops-permissions).
- `AADSTS700016`: check that the tenant ID in the **Issuer URL** is the tenant where you registered the application.

If sign-in fails with an error about the `resource` parameter, ask your Speakeasy administrator to stop sending the resource indicator for this authorization server. If tools return no data, check that the person is a member of the project and has access to the resources they asked about.

<!-- screenshot: Settings > Identity with User Identity, the corrected tenant Issuer URL, and Manual selected; values redacted -->

This guide covers setup only. For anything beyond it, such as tools, toolsets, and limits, see [Microsoft's Azure DevOps MCP Server documentation](https://learn.microsoft.com/en-us/azure/devops/mcp-server/remote-mcp-server?view=azure-devops).
