# Speakeasy setup

## Guided setup (recommended) {#guided-setup}

Take the guesswork out of connecting Okta to your agents. Speakeasy guides you through the required configuration and helps you verify the connection, so you can get started with confidence.

In the MCP Catalog, find **Okta Managed MCP Server** and click **Add**. Select **User Identity** to start guided setup.

## Manual setup in Speakeasy

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** and choose **Hosted remotely**.
3. In **MCP server URL**, enter your [Okta MCP server URL](external.md#enable-okta-mcp), such as `https://example.okta.com/mcp`.
4. Leave **User session issuer** at its default.
5. Click **Verify connectivity**.
6. Select **User Identity**.
7. Click **Save**.
8. Open the server’s **Settings > Identity** to configure its credentials.

If you already added the server, open its **Settings > Identity** and continue below.

<!-- screenshot: New remote MCP server with the provider URL and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

1. Open the server’s **Settings > Identity** and confirm **User Identity** is selected.
2. In **Choose an authorization server**, select the issuer matching the public org URL. The issuer is the org origin, such as `https://example.okta.com`. If the correct issuer is missing, create it using the steps below.
3. Choose **Manual** and paste the [Client ID](external.md#copy-client-credentials). For a Web Application, paste its **Client secret**. For a Native Application, leave the secret empty so Speakeasy uses public-client authentication.
4. Leave **Advanced > Scope** blank to use discovered scopes. If setting an explicit override, request only scopes granted to the app and needed by the intended tools.
5. Click **Save** and confirm if prompted.
6. In **Settings > Danger Zone > Server Availability**, turn on **Enable MCP server** and confirm it shows **Enabled**.
7. When an assigned user first uses the server, have them sign in to the intended Okta org and authorize the app.

If the correct issuer is missing:

1. Open the provider picker and click **Create a custom authorization server**, then click **New Authorization Server**.
2. Set **Issuer URL** to your public Okta org URL, such as `https://example.okta.com`, and click **Discover**. Under **Endpoints**, verify **Authorization Endpoint** is the org URL followed by `/oauth2/v1/authorize` and **Token Endpoint** is the org URL followed by `/oauth2/v1/token`. Enter those values if discovery leaves them empty.
3. Keep the derived **Slug** and click **Create**.
4. Return to the server’s **Settings > Identity**, select the new provider, and continue with **Manual** credentials in step 3.

<!-- screenshot: Settings > Identity with User Identity, Okta org issuer, and Manual credentials, with the credential values redacted -->

## Troubleshoot sign-in and tool access

- If the server is unreachable, check the org hostname, the `/mcp` path, and the enabled Okta features.
- If the user can’t sign in, confirm the app is in that same org, the connecting user is assigned, and the registered redirect URI matches Speakeasy’s callback. Verify Authorization Code and PKCE and that the credentials match the app type.
- If tools are missing or return a permissions error, confirm the relevant features, app scope grants, granted token scopes, and the user’s Okta permissions. After changing scope grants, sign in again so Okta can issue a token with the updated scopes. Then test again. [Okta’s tool and scope reference](https://help.okta.com/mcp/en-us/content/topics/mcpserver/scope-based-tool-loading.htm).
