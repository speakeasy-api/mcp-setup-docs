# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open the **Add MCP server** page.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste the remote URL from [Identify the workspace region](external.md#identify-workspace-region) into **MCP server URL**.
5. Click **Verify connectivity**, then **Save**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add MCP server page or the New remote MCP server page with the matching Intercom remote URL -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only, confirm **Issuer URL**, the auto-derived **Slug**, and **Endpoints**. Discovery runs automatically for a seeded issuer; after typing or changing the URL, select **Discover** only if offered.

1. Enter `https://mcp.intercom.com` as **Issuer URL**.
1. Under **Endpoints**, set the authorization endpoint to `https://app.intercom.com/oauth`.
1. Set the token endpoint to this URL:

   ```
   https://api.intercom.io/auth/eagle/token
   ```

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Verify the callback and attach** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

1. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
1. Paste the **Client ID** from [Copy the client credentials](external.md#copy-client-credentials).
1. Paste the **Client Secret (optional)** from [Copy the client credentials](external.md#copy-client-credentials).
1. Leave **Scope (override)** empty.
1. Leave **Audience (optional)** empty.

#### Verify the callback and attach

1. Confirm that the callback URL registered with the provider is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

For the provider-side callback setting, see [Configure OAuth](external.md#configure-oauth).

<!-- screenshot: Attach Remote Identity Provider with Client Type set to Manual and the issuer, authorization, and token endpoint fields visible; fully redact the Client ID and Client Secret -->

When a client initiates Intercom access, complete the on-screen browser prompts with the intended workspace account.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Intercom's MCP documentation](https://developers.intercom.com/docs/guides/mcp).
