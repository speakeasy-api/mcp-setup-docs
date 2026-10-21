# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste the remote URL from [Identify the workspace region](external.md#identify-workspace-region) into **MCP server URL**.
5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, select **User Identity**. The page preselects **No Identity** for this server, so change it.
8. If **Guardrails** appears, leave it off.
9. Click **Save**.

Speakeasy keeps the new server **Disabled** and says to finish setup in **Settings > Identity**. This is expected for Intercom; the next section finishes it.

<!-- screenshot: New remote MCP server after Verify connectivity, with the Intercom remote URL entered and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Intercom's server does not publish metadata the provider picker can use, so create the Intercom provider and its client first. Use the values for the region you recorded in [Identify the workspace region](external.md#identify-workspace-region).

1. Open the server's **Settings** and find the **Identity** section.
2. Select **User Identity**.
3. Open **Choose an identity provider** and click **Create a custom identity provider**. This opens **Remote Identity Providers**.
4. Click **New Remote Identity Provider**.
5. In **Issuer URL**, enter `https://mcp.intercom.com` for a US workspace or `https://mcp.eu.intercom.com` for an EU workspace.

6. Under **Endpoints**, in **Authorization Endpoint**, enter the value for your region.

   US workspace:

   ```text
   https://app.intercom.com/oauth
   ```

   EU workspace:

   ```text
   https://app.eu.intercom.com/oauth
   ```

   Do not click **Discover**: it fills in Intercom's MCP `/authorize` and `/token` endpoints, which do not work with the app you created.

7. In **Token Endpoint**, enter this value for either region:

   ```text
   https://api.intercom.io/auth/eagle/token
   ```

8. Keep the derived **Slug** and click **Create**.
9. On the new provider, click **Add Client**.
10. Set **Client Type** to **Manual**.
11. Paste the **Client ID** from [Copy the client credentials](external.md#copy-client-credentials) into **Client ID**.
12. Paste the **Client secret** from [Copy the client credentials](external.md#copy-client-credentials) into **Client Secret (optional)**. Intercom requires the secret.
13. Leave **Scope (override)** empty. The permissions you selected in [Configure OAuth](external.md#configure-oauth) apply.
14. Confirm that the displayed **Redirect URI** matches the callback you registered in [Configure OAuth](external.md#configure-oauth), then click **Create**.
15. Return to the server's **Settings > Identity** and select **User Identity**.
16. In **Choose an identity provider**, select the Intercom provider you created.
17. Choose **Existing client** and pick the new client under **Client**.
18. Click **Save**. If Speakeasy asks you to confirm, click **Save changes**.
19. Open **Settings > Danger Zone > Server Availability**.
20. Turn on **Enable MCP server** so the switch shows **Enabled**.

When a person first uses the server, Intercom's browser authorization prompt appears. Complete it with an account in the intended workspace.

<!-- screenshot: New Remote Identity Provider with the Intercom issuer and endpoints entered, then Settings > Identity with the Intercom provider and Existing client selected; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Intercom's MCP documentation](https://developers.intercom.com/docs/guides/mcp).
