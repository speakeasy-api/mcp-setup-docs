# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Select **Add new** to open the **Add MCP server** page.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, find **Asana** using **Search MCP servers...**.
5. Open the **Asana** entry.
6. Select **Add**.
7. In **Add to Project**, select **Add to Project**.

After installation, select **Configure MCP settings** on the completion screen to open the server, then open **Settings**.

<!-- screenshot: the Add MCP server page, or Asana's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Select **Configure MCP settings** on the completion screen, then open the server’s **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only, confirm **Issuer URL**, the auto-derived **Slug**, and **Endpoints**. Discovery runs automatically for a seeded issuer; after typing or changing the URL, select **Discover** only if offered.

For a new provider, enter **Issuer URL** `https://app.asana.com` and keep the auto-derived **Slug**. If discovery does not populate **Endpoints**, enter:

Authorization endpoint:

```text
https://app.asana.com/-/oauth_authorize
```

Token endpoint:

```text
https://app.asana.com/-/oauth_token
```

<!-- source: https://app.asana.com/.well-known/oauth-authorization-server; public metadata checked 2026-09-17 -->

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Verify the callback and attach** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

Do not enter a scope during this setup.

1. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
1. Paste the **Client ID** saved in [Create the MCP app](external.md#create-mcp-app) into **Client ID**.
1. Paste the **Client secret** saved in [Create the MCP app](external.md#create-mcp-app) into **Client Secret (optional)**.

#### Verify the callback and attach

1. Confirm that the callback URL registered with the provider is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

For the provider-side callback setting, see [Configure the OAuth redirect](external.md#configure-oauth-redirect).

<!-- screenshot: Attach Remote Identity Provider with the Redirect URI and credential fields visible and all credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Asana's MCP documentation](https://developers.asana.com/docs/using-asanas-mcp-server).
