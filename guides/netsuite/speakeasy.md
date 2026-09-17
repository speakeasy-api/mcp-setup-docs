# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open the **Add MCP server** page.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste the account-specific endpoint you formed in [Record the account-specific MCP URL](external.md#record-account-mcp-url) into **MCP server URL**. **Transport** is read-only.
5. Click **Verify connectivity**, then **Save**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add MCP server page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only, confirm **Issuer URL**, the auto-derived **Slug**, and **Endpoints**. Discovery runs automatically for a seeded issuer; after typing or changing the URL, select **Discover** only if offered.

If no matching provider or complete discovered configuration is available, ask your administrator for the documented **Issuer URL** and authorization and token **Endpoints** before continuing. Do not infer them from the MCP server URL.

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Verify the callback and attach** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

1. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
1. Use the displayed **Redirect URI** and its copy button to confirm that the value matches the callback registered in [Create the OAuth integration](external.md#create-oauth-integration).
1. Paste the **Client ID** copied in that step.
1. Leave **Client Secret (optional)** empty.

#### Verify the callback and attach

1. Confirm that the callback URL registered with the provider is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

When a client first requests access, sign in to NetSuite with the scoped non-Administrator role assigned in [Configure a scoped non-admin role](external.md#configure-scoped-role). Review the allow/deny prompt, then allow access only after reviewing your organization's data-sharing controls.

<!-- screenshot: Attach Remote Identity Provider before credential entry, with Client Type: Manual, the Redirect URI and its copy button, Client ID, and the empty optional secret visible; redact the URI and any entered ID -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [NetSuite's MCP documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html).
