---
setup_version: 1
---

# Connect Okta to Speakeasy

You’ll need:

- An Okta subscription eligible for Managed MCP Server, currently an Early Access feature.
- A super admin who can enable it in the org you want to connect.
- Permission to configure an OIDC app and grant its API scopes in that org.

Each person connects using their own Okta account.

## Choose a setup method

- [**Guided setup (recommended)**](speakeasy.md#guided-setup) walks you through the connection in Speakeasy and shows you what to configure in Okta.
- **Manual setup**. Start with [Okta feature and app configuration](#enable-okta-mcp), then [add the server and configure its identity](speakeasy.md#add-server-in-speakeasy).

### Enable Okta Managed MCP Server {#enable-okta-mcp}

1. Sign in to the target org’s Okta Admin Console.
2. Open **Settings > Features**. Enable **Core Identity** for users, groups, apps, policies, devices, and logs, or **Identity Governance** for access requests, reviews, entitlements, and resource ownership. Enable both if you need both sets of tools.
3. Record the public org URL, such as `https://example.okta.com`. Use the org host ending in `okta.com`, `oktapreview.com`, or `okta-emea.com`. Speakeasy guided setup uses these public org domains.
4. Append `/mcp` to the org URL for the MCP server URL.

If a feature is missing, confirm the subscription and org with your Okta admin. See [Okta’s guide to enabling Early Access features](https://help.okta.com/oie/en-us/content/Topics/security/manage-ea-and-beta-features.htm).

<!-- screenshot: Okta Settings > Features with the available Managed MCP Server options visible -->

### Configure an OIDC app {#configure-oidc-app}

1. Open **Applications and resources > Applications**.
2. For a new app, click **Create App Integration**, select **OIDC - OpenID Connect**, and choose **Web Application** or **Native Application**. Web is recommended for Speakeasy. Click **Next** and enter an **App integration name**.
3. To reuse an existing Web or Native Application, open the app, select **General**, and click **Edit** in **General Settings**.
4. Select **Authorization code** under **Grant type**.
5. Add the following value under **Sign-in redirect URIs**. Keep any redirects the existing application still uses.

   ```text
   {{ gram.oauth.callback_url }}
   ```

   In guided setup, use the redirect URI displayed there.

6. Save the app. On its **General** tab, confirm **Proof Key for Code Exchange (PKCE)** is selected. Use a client secret for a Web Application. For a Native Application, use PKCE with no client secret.

<!-- screenshot: Okta app General settings with Authorization code, the redirect URI, and PKCE visible -->

### Assign users and grant scopes {#grant-app-access}

1. Assign the people or groups who will use the MCP connection. For a new app, set **Assignments** during creation. For an existing app, open its **Assignments** tab and add the intended users or groups.
2. Open the **Okta API Scopes** tab. Click **Grant** for the minimum scopes required by the tools you intend to use. For example, follow Okta’s scope table to choose the read scopes for the resources you want to view. [Okta’s tool and scope reference](https://help.okta.com/mcp/en-us/content/topics/mcpserver/scope-based-tool-loading.htm).
3. Confirm that the connecting user has the underlying Okta permissions the tools require. App assignment gives a user access to sign in. API grants govern the scopes the app can request.

<!-- screenshot: Okta app Assignments and Okta API Scopes tabs, with user names redacted -->

### Copy the client credentials {#copy-client-credentials}

On the app’s **General** tab, copy its **Client ID**. For a Web Application, also copy its **Client Secret**. A Native Application uses only the Client ID. Continue to [manual setup in Speakeasy](speakeasy.md#add-server-in-speakeasy) or return to the guided setup to save the credentials.

<!-- screenshot: Okta app General tab showing Client Credentials, with both values redacted -->
