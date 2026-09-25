---
setup_version: 1
---

# Set up Okta

This draft covers the **Okta Managed MCP Server**, an Early Access service, not the locally installed Okta Open Source MCP Server. Sign in to your organization's Okta Admin Console with permission to create app integrations, assign users, and grant Okta API scopes. Confirm with your Okta administrator that the managed server is available for your org before you begin.

Your MCP client must support protocol version **2025-11-25**. The Speakeasy connection below needs an operator test with an enabled Okta org before this draft is treated as verified.

### Find your organization's MCP URL {#find-mcp-url}

1. Obtain your Okta org URL from your Okta administrator, for example `https://yourorg.okta.com`.
2. Append `/mcp` to that org URL: `https://yourorg.okta.com/mcp`.
3. Save the resulting URL for [Speakeasy setup](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot-exception: the MCP URL is assembled from the organization's Okta URL, not copied from a documented MCP console field -->

### Create an app integration {#create-app-integration}

1. In the Admin Console, go to **Applications and resources** > **Applications**.
2. Select **Create App Integration**.
3. Select **OIDC - OpenID Connect**.
4. Select **Native app** for the public-client PKCE flow used in this draft.
5. Select **Next**.
6. Enter `Speakeasy AI Control Plane` in **App integration name**.
7. Under **Grant type**, select **Authorization code**.
8. In **Sign-in redirect URIs**, enter:

   ```
   {{ gram.oauth.callback_url }}
   ```

9. Under **Assignments**, select the users or groups permitted to connect.
10. Select **Save**.

An intended user must be assigned to this app before connecting, even when you have granted the required API scopes.

<!-- screenshot: app integration creation with Native app, Authorization code, Sign-in redirect URIs, and Assignments visible; exclude organization-specific user data -->

### Grant scopes and copy the client ID {#grant-scopes-copy-client-id}

1. Open the app's **Okta API Scopes** tab.
2. Select **Grant** beside each scope approved by your Okta administrator for the tasks you need. Start with read-only access; grant only what your team requires.
3. Save the list of granted scopes with your setup notes.
4. Open the **General** tab.
5. Confirm that **Proof Key for Code Exchange (PKCE)** is selected.
6. Copy the **Client ID** into your approved password manager.

Scopes determine which tools are available. The signed-in user's permissions also limit what the server can do.

<!-- screenshot: Okta API Scopes with the intended grants and General with PKCE visible; redact credential values and unrelated organization data -->
