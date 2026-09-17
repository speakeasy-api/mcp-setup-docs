---
setup_version: 1
---

# Slack setup

Use an internal Slack app in the workspace you want to connect. Sign in to
[Slack's app settings](https://api.slack.com/apps) with an account that can
manage that app. If you do not have one, ask your Slack app owner to provide
an internal app using [Slack's app setup instructions](https://docs.slack.dev/ai/slack-mcp-server/developing/).
Obtain any required workspace-admin approval before connecting.

Slack permits internal apps and apps published in the Slack Marketplace;
unlisted distributed apps cannot use its MCP server. This guide uses an
internal app, not a bot token or a personal API key. Each connecting user
authorizes access with their own Slack account.

### Enable MCP access {#enable-mcp-access}

1. Open your internal app in [Slack's app settings](https://api.slack.com/apps).
2. Select **Agents** in the sidebar.
3. Toggle **Slack Model Context Protocol (MCP) Server** to **On**.

If your app restricts allowed IP addresses, ask your network administrator to
include the Control Plane's outbound addresses before connecting. Do not
remove the restriction to work around a failed connection.

<!-- screenshot: the Agents section with Slack Model Context Protocol (MCP) Server enabled -->

### Set user permissions {#set-user-permissions}

1. Select **OAuth & Permissions** in the sidebar.
2. Scroll to **Scopes**.
3. Add `channels:read`, `groups:read`, `im:read`, and `mpim:read` to the
   user-token scopes, not the bot-token scopes.

These permissions let the server list the user's channels. They do not enable
message search, message history, or sending messages. If you need those tools,
ask your app owner to select their user-token scopes from
[Slack's tool-to-scope table](https://docs.slack.dev/ai/slack-mcp-server/#oauth-scopes-needed-on-user-token-for-different-tools).
Use the same selected scopes when configuring the Control Plane.

<!-- screenshot: OAuth & Permissions showing the selected user-token scopes -->

### Register the callback {#register-callback}

1. On **OAuth & Permissions**, scroll to **Redirect URLs**.
2. Add `{{ gram.oauth.callback_url }}` as a redirect URL.
3. Save the redirect URL.

<!-- screenshot: Redirect URLs with the Control Plane callback registered -->

### Copy the app credentials {#copy-client-credentials}

1. Open **Basic Information** in the app settings.
2. Copy the app's **Client ID** to your password manager.
3. Reveal and copy its **Client Secret** to your password manager.

Keep this app's identity fixed for the integration. Do not substitute its App ID,
a bot token, or a user access token for these credentials. Continue to
[Speakeasy setup](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot: Basic Information showing Client ID and Client Secret labels with all credential values redacted -->
