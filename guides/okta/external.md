---
setup_version: 1
---

# Okta Managed MCP Server setup

Use an Okta organization with **IT Products - Okta Managed MCP Server** and at least one of these subscriptions:

- **Okta Managed MCP Server - Core Identity** requires an existing Universal Directory, Single Sign-On, Multifactor Authentication, Adaptive Multifactor Authentication, or Lifecycle Management subscription.
- **Okta Managed MCP Server - Identity Governance** requires an existing Okta Identity Governance subscription.

Contact Okta Support if you need subscription information. The server is not available in Okta for Government Moderate (FedRAMP Moderate, HIPAA), Okta for US Military (DoD IL4), or Okta for Government High (FedRAMP High).

Sign in to your organization's Okta Admin Console. A Super Administrator must enable the features and grant API scopes. An Application Administrator with access to the app can create and configure it. Users must have app access and permission for the required Okta actions.

### Enable MCP access {#enable-mcp-access}

A Super Administrator must do these steps for the organization.

1. Go to **Settings > Features**.
2. Click **Edit**.
3. Select the features for the required tools:
   - For IAM tools, select **Okta Managed MCP Server - Core Identity**.
   - For OIG tools, select **Okta Managed MCP Server - Identity Governance**.
4. Check the dependencies and limitations for each selected feature.
5. Remove listed restrictions if necessary.
6. Click **Save**.

<!-- screenshot: Settings > Features with the applicable MCP features selected -->

### Create the app integration {#create-app-integration}

An Application Administrator must do these steps. If user types need different permission levels, create a separate app for each type. Assign each group to the applicable app. Grant the applicable scopes in the next section. Give each group the client ID for its app.

1. Go to **Applications and resources > Applications**.
2. Click **Create App Integration**.
3. Select **OIDC - OpenID Connect**.
4. Select **Web app**.
5. Click **Next**.
6. Enter `Okta Managed MCP Server` in **App integration name**, or use your organization's app name.
7. In **Grant type**, select **Authorization code**.
8. Enter this value in **Sign-in redirect URIs**:

   ```text
   {{ gram.oauth.callback_url }}
   ```

9. In **Assignments**, select the users or groups that need this app.
10. Click **Save**.
11. On the **General** tab, click **Edit** in **General Settings**.
12. Select **Refresh Token** as a **Grant type**.
13. Click **Save**.

A user or group must be assigned before connection. API scope grants do not give app access.

<!-- screenshot: Web app settings with Authorization code, Refresh Token, and Sign-in redirect URIs -->

### Grant API scopes {#grant-api-scopes}

Only a Super Administrator can grant Okta API scopes to the app. Scopes control which tools load. They do not give the user more Okta permissions.

1. Use the scope-to-tool table at [help.okta.com/mcp/en-us/content/topics/mcpserver/scope-based-tool-loading.htm](https://help.okta.com/mcp/en-us/content/topics/mcpserver/scope-based-tool-loading.htm) to select scopes for the required tools.
2. Open the app's **Okta API Scopes** tab.
3. Click **Grant** for each selected scope.
4. Save the list of granted scopes for the Speakeasy **Scope (override)** field.
5. Ask the authorized organization administrator to check that each user has permission for the required actions and resources.

If a user needs an administrator role, ask a Super Administrator to assign the least-privileged role for the required resources. The user does not need Super Administrator access for every connection.

<!-- screenshot: Okta API Scopes tab with selected scopes granted -->

### Save connection values {#save-connection-values}

An Application Administrator must configure the app credentials.

1. Open the app's **General** tab.
2. In **Client Credentials**, select **Client secret** under **Client authentication**.
3. Select **Proof Key for Code Exchange (PKCE)**.
4. Click **Save** to generate the client secret.
5. Copy the client secret to your password manager.
6. Copy **Client ID** to your password manager.
7. Click your username in the upper-right corner of the Admin Console.
8. Copy the organization domain from the menu.
9. Use that domain in place of `{yourOktaDomain}` in these addresses:

   | Connection value | Address |
   |---|---|
   | Remote MCP server URL | `https://{yourOktaDomain}/mcp` |
   | Issuer URL | `https://{yourOktaDomain}` |

   Authorization endpoint:

   ```text
   https://{yourOktaDomain}/oauth2/v1/authorize
   ```

   Token endpoint:

   ```text
   https://{yourOktaDomain}/oauth2/v1/token
   ```

Use the organization authorization server. Do not add `/oauth2/default` to the issuer.

<!-- screenshot: General tab with Client secret authentication and PKCE selected; credentials redacted -->

Continue with [Speakeasy setup](speakeasy.md#add-server-in-speakeasy).
