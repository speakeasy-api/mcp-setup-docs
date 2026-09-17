# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, find **MCP Gateway** and select **MCP**.
2. Click **Add new** to open the **Add MCP server** page.

If an **Atlassian Rovo** result in the catalog clearly identifies the current remote URL shown below:

1. Choose **From the catalog**.
2. On the **MCP Catalog** page, enter `Atlassian` in **Search MCP servers...**.
3. Open that result.
4. Click **Add**.
5. In **Add to Project**, click **Add to Project**.

If no clearly current **Atlassian Rovo** result appears in the catalog, use the custom remote path:

1. Choose **Hosted remotely**.
2. On **New remote MCP server**, paste this value into **MCP server URL**:

   ```
   https://mcp.atlassian.com/v1/mcp/authv2
   ```

3. Click **Verify connectivity**, then **Save**.

After catalog installation, select **Configure MCP settings** on the completion screen to open the server, then open **Settings**. Saving a custom remote server opens **Overview**; open **Settings** from there.

<!-- screenshot: the Add MCP server page, or the Atlassian catalog entry if an exact entry is present -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server’s **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only, confirm **Issuer URL**, the auto-derived **Slug**, and **Endpoints**. Discovery runs automatically for a seeded issuer; after typing or changing the URL, select **Discover** only if offered.

1. In **Attach Remote Identity Provider**, confirm that the issuer/base auth URL is:

   ```
   https://auth.atlassian.com
   ```
1. Keep the automatically derived **Slug**.
1. Keep the automatically derived **Display name (optional)**.
1. Under **Endpoints**, wait for automatic discovery of the seeded issuer. After typing or changing **Issuer URL**, click **Discover** only if offered, then confirm the authorization, token, and registration endpoints.

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Attach the provider** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

1. Under **Session Client**, keep **Client Type** set to **Dynamic Client Registration (DCR)**.
1. Keep the discovered **Token Endpoint Auth Method**.
1. Leave **Scope (override)** and **Audience (optional)** empty.

#### Attach the provider

Click **Attach Identity Provider**. DCR handles client registration; you do not need to register a callback URL manually.

You do not need to paste a **Client ID** or **Client Secret**.

When Atlassian prompts you for access:

1. Sign in with the intended Atlassian account.
2. Authorize the intended Atlassian Cloud site.
3. Enable the intended Atlassian apps.

If organization policy rejects the flow, complete [Allow the Speakeasy OAuth domain](external.md#allow-speakeasy-domain), then retry the connection.

<!-- screenshot: Attach Remote Identity Provider after discovery, with Dynamic Client Registration (DCR) selected and no secret values visible -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Atlassian's MCP documentation](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/).
