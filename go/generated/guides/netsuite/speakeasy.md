# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste the account-specific endpoint you formed in [Record the account-specific MCP URL](external.md#record-account-mcp-url) into **MCP server URL**.
5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, select **User Identity** if it is not already selected.
8. If **Guardrails** appears, leave it off.
9. Click **Save**.

If Speakeasy keeps the new server **Disabled** and says to finish setup in **Settings > Identity**, that is expected; the next section finishes it.

<!-- screenshot: New remote MCP server after Verify connectivity, with the NetSuite endpoint (account ID redacted) and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Create a NetSuite provider for your account, add the integration's client to it, then select it on the server. In each value below, replace `<accountid>` with the same domain-form account ID you used in [Record the account-specific MCP URL](external.md#record-account-mcp-url).

1. Open the server's **Settings** and find the **Identity** section.
2. Select **User Identity**.
3. Open **Choose an identity provider** and click **Create a custom identity provider**. This opens **Remote Identity Providers**.
4. Click **New Remote Identity Provider**.
5. In **Issuer URL**, enter:

   ```text
   https://<accountid>.suitetalk.api.netsuite.com
   ```

6. Under **Endpoints**, in **Authorization Endpoint**, enter:

   ```text
   https://<accountid>.app.netsuite.com/app/login/oauth2/authorize.nl
   ```

7. In **Token Endpoint**, enter:

   ```text
   https://<accountid>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token
   ```

8. Keep the derived **Slug** and click **Create**.
9. On the new provider, click **Add Client**.
10. Set **Client Type** to **Manual**.
11. Paste the **Client ID** from [Create the OAuth integration](external.md#create-oauth-integration) into **Client ID**.
12. Leave **Client Secret (optional)** empty. The integration is a public client.
13. In **Scope (override)**, enter `mcp`. NetSuite accepts `mcp` only on its own, so add no other scope.
14. Confirm that the displayed **Redirect URI** matches the callback you registered in [Create the OAuth integration](external.md#create-oauth-integration), then click **Create**.
15. Return to the server's **Settings > Identity** and select **User Identity**.
16. In **Choose an identity provider**, select the NetSuite provider you created.
17. Choose **Existing client** and pick the new client under **Client**.
18. Click **Save**. If Speakeasy asks you to confirm, click **Save changes**.
19. Open **Settings > Danger Zone > Server Availability**.
20. Turn on **Enable MCP server** so the switch shows **Enabled**.

When a person first uses the server, NetSuite's browser sign-in appears. Sign in with the scoped non-Administrator role assigned in [Configure a scoped non-admin role](external.md#configure-scoped-role), review the allow/deny prompt, and allow access only after reviewing your organization's data-sharing controls.

<!-- screenshot: New Remote Identity Provider with the NetSuite issuer and endpoints (account ID redacted), then Settings > Identity with the NetSuite provider and Existing client selected; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [NetSuite's MCP documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html).
