# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Select **Custom remote server**.
4. On **Add a custom remote MCP server**, paste the organization-specific URL from [Save connection values](external.md#save-connection-values) into **Remote MCP server URL**.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page with Custom remote server selected -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In **Attach Remote Identity Provider**, enter the organization **Issuer URL** from [Save connection values](external.md#save-connection-values).
4. Under **Endpoints**, use the authorization and token addresses from [Save connection values](external.md#save-connection-values) in the corresponding fields.
5. Set **Client Type** to **Manual**.
6. Confirm that **Redirect URI** matches the callback value registered in [Create the app integration](external.md#create-app-integration).
7. Paste **Client ID** from [Save connection values](external.md#save-connection-values).
8. Paste the client secret from [Save connection values](external.md#save-connection-values) into **Client Secret (optional)**. This setup requires the secret.
9. Set **Token Endpoint Auth Method** to `client_secret_basic`.
10. In **Scope (override)**, enter `offline_access` followed by the API scopes saved in [Grant API scopes](external.md#grant-api-scopes). Separate the values with spaces.
11. Click **Attach Identity Provider**.
12. When the client first needs Okta access, sign in with the assigned Okta account.
13. If Okta shows consent prompts, complete them for the required access.

The **Refresh Token** grant in Okta and `offline_access` in **Scope (override)** are both required to obtain refresh tokens. Speakeasy sends PKCE and uses the refresh tokens automatically.

<!-- verify(operator): the template key substitutes this same Redirect URI value -->
<!-- screenshot: the Attach Remote Identity Provider sheet with Manual selected and Redirect URI visible; values redacted -->

This guide covers setup only. For billing, tool behavior, and limits, see [Okta's MCP documentation](https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcp-client-configuration-overview.htm).
