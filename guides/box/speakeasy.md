# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open the **Add MCP server** page.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, use **Search MCP servers...** to find **Box**.
5. Open the **Box** entry.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

After installation, select **Configure MCP settings** on the completion screen to open the server, then open **Settings**.

<!-- screenshot: the Add MCP server page with From the catalog visible, or the Box catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Select **Configure MCP settings** on the completion screen, then open the server’s **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only, confirm **Issuer URL**, the auto-derived **Slug**, and **Endpoints**. Discovery runs automatically for a seeded issuer; after typing or changing the URL, select **Discover** only if offered.

For **Identity Provider > Add new**, use **Issuer URL** `https://api.box.com/`, authorization endpoint `https://account.box.com/api/oauth2/authorize`, and token endpoint `https://api.box.com/oauth2/token`. Keep the auto-derived **Slug**.

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Verify the callback and attach** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

1. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
1. Paste the [Box Client ID](external.md#copy-client-credentials) into
   **Client ID**.
1. Paste the [Box Client Secret](external.md#copy-client-credentials) into
   **Client Secret (optional)**.

#### Verify the callback and attach

1. Confirm that the callback URL registered with the provider is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

For the provider-side callback setting, see [Redirect URIs](external.md#set-redirect-uri).

<!-- verify(operator): the template key substitutes this same Redirect URI value -->
<!-- screenshot: the Attach Remote Identity Provider sheet with Client Type set to Manual, the Redirect URI visible, and credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Box's MCP documentation](https://docs.box.com/en/box-mcp/about-box-mcp-server).
