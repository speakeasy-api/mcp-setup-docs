# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste `https://mcp.slack.com/mcp`
   into **Remote MCP server URL**.
5. Click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: Add a custom remote MCP server with Slack's endpoint entered -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**, or **Use Discovered**
   when offered.
3. If the issuer is not already known, enter `https://mcp.slack.com` as the
   **Issuer URL**. Under **Endpoints**, click **Discover**.
4. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
5. Paste the [Slack Client ID](external.md#copy-client-credentials) into **Client ID**.
6. Paste the [Slack Client Secret](external.md#copy-client-credentials) into
   **Client Secret (optional)**. Slack requires this secret.
7. Set the token-endpoint authentication method to `client_secret_post` using
   the authentication-method control. Do not use `client_secret_basic`.
8. Configure the scopes to match your [Slack user permissions](external.md#set-user-permissions):
   `channels:read`, `groups:read`, `im:read`, and `mpim:read` for listing channels.
   If an issuer-level scope override is configured, make it match this selection.
9. Click **Attach Identity Provider**.
10. Confirm that the sheet's **Redirect URI** matches
    `{{ gram.oauth.callback_url }}`, registered under Slack's
    [Redirect URLs](external.md#register-callback).

Slack's discovered authorization endpoint is
`https://slack.com/oauth/v2_user/authorize` and its token endpoint is
`https://slack.com/api/oauth.v2.user.access`. Use these user-token endpoints,
not the bot-token OAuth endpoints. Slack does not support Dynamic Client
Registration. Each user must complete Slack consent when connecting; attaching
the client credentials does not grant access to everyone's Slack data.

If your deployment does not expose the authentication-method or scope controls,
ask the Control Plane administrator to configure these values before connecting.
This configuration is based on Slack's documentation and the Control Plane's
OAuth implementation; it has not been tested end to end with a Slack workspace.

<!-- verify(operator): the template key substitutes this same Redirect URI value -->
<!-- screenshot: Attach Remote Identity Provider with Manual selected, user-token endpoints and client_secret_post configured, and credentials redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Slack's MCP documentation](https://docs.slack.dev/ai/slack-mcp-server/).
