# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open the **Add MCP server** page.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, use **Search MCP servers...** to find
   **HubSpot**.
5. Open the **HubSpot** entry.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

After installation, select **Configure MCP settings** on the completion screen to open the server, then open **Settings**.

<!-- screenshot: the Add MCP server page or the HubSpot catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Select **Configure MCP settings** on the completion screen, then open the server’s **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only, confirm **Issuer URL**, the auto-derived **Slug**, and **Endpoints**. Discovery runs automatically for a seeded issuer; after typing or changing the URL, select **Discover** only if offered.

For **Identity Provider > Add new**, use **Issuer URL** `https://mcp.hubspot.com`, authorization endpoint `https://mcp.hubspot.com/oauth/authorize/user`, and token endpoint `https://mcp.hubspot.com/oauth/v3/token`. Keep the auto-derived **Slug**.

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Verify the callback and attach** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

1. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
1. Paste the **Client ID** copied in
   [Copy the client credentials](external.md#copy-client-credentials).
1. Paste the **Client Secret (optional)** copied in
   [Copy the client credentials](external.md#copy-client-credentials).
1. Leave any scope override empty.

#### Verify the callback and attach

1. Confirm that the callback URL registered with the provider is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider with Client Type set to Manual and all credential values redacted -->

For the HubSpot account's first connection, use an account admin. HubSpot does
not document which admin role qualifies.

1. When HubSpot authorization opens, select the intended account.
2. Grant the permissions offered.
3. Authorize the connection.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [HubSpot's MCP documentation](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server).
