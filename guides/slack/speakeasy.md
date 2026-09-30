# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open the **Add MCP server** page.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste this value into **MCP server URL**:

   ```
   https://mcp.slack.com/mcp
   ```

5. Optionally enter a **Display name (optional)**.
6. Click **Verify connectivity**, then, after verification succeeds, click **Save**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: New remote MCP server with Slack's endpoint entered -->

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**.

Under **Authentication**, if unconfigured, select **Use Discovered** when available; otherwise select **Configure Manually**. If configured but no provider is attached, use **Connected services > Add provider**. If the intended provider is already attached, use its existing controls and skip the provider/client creation and attachment steps below; do not add a duplicate.

#### Select the identity provider

In **Attach Remote Identity Provider**, **Identity Provider** defaults to **Select existing** when project issuers are available. Select the matching provider and skip the new-provider fields below. Otherwise choose **Add new** (or use the new-provider form shown when none exist).

For a new provider only:

1. Enter `https://mcp.slack.com` as the **Issuer URL** if it is not already populated, and keep the auto-derived **Slug**.
1. Under **Endpoints**, wait for automatic discovery. After typing or changing the **Issuer URL**, click **Discover** only if offered.
1. Confirm the discovered endpoints are Slack's user-token endpoints, not the bot-token OAuth endpoints. If discovery does not populate them, enter:

   Authorization endpoint:

   ```text
   https://slack.com/oauth/v2_user/authorize
   ```

   Token endpoint:

   ```text
   https://slack.com/api/oauth.v2.user.access
   ```

#### Select the session client

Under **Session Client**, choose **Select existing** only for a client whose saved credentials, scopes, and audience match the requirements below; otherwise choose **Add new**. When reusing a matching client, skip directly to **Verify the callback and attach** below. Do not create credentials or register the client again. Otherwise choose **Add new** (or use the new-client form shown when no clients exist) and complete these new-client-only steps:

1. Set **Client Type** to **Manual**. Slack does not support Dynamic Client Registration.
1. Paste the [Slack Client ID](external.md#copy-client-credentials) into **Client ID**.
1. Paste the [Slack Client Secret](external.md#copy-client-credentials) into **Client Secret (optional)**. Slack requires this secret.
1. Set **Token Endpoint Auth Method** to `client_secret_post`. Do not use `client_secret_basic`.
1. In **Scope (override)**, enter the scopes that match your [Slack user permissions](external.md#set-user-permissions), comma-separated: `channels:read`, `groups:read`, `im:read`, and `mpim:read` for listing channels. If an issuer-level scope override is configured, make it match this selection.

#### Verify the callback and attach

1. Confirm that the callback URL registered under Slack's [Redirect URLs](external.md#register-callback) is `{{ gram.oauth.callback_url }}`. For a new manual client, also compare it with the sheet's displayed **Redirect URI**. The existing-client selection does not display that field; check the registered callback in the provider's app settings instead.
2. Click **Attach Identity Provider**.

Each user must complete Slack consent when connecting; attaching the client credentials does not grant access to everyone's Slack data.

If your deployment does not expose the authentication-method or scope controls, ask the Control Plane administrator to configure these values before connecting. This configuration is based on Slack's documentation and the Control Plane's OAuth implementation; it has not been tested end to end with a Slack workspace.

<!-- verify(operator): the template key substitutes this same Redirect URI value -->
<!-- screenshot: Attach Remote Identity Provider with Manual selected, user-token endpoints and client_secret_post configured, and credentials redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Slack's MCP documentation](https://docs.slack.dev/ai/slack-mcp-server/).
