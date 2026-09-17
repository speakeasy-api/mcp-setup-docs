---
setup_version: 1
---

# Slack setup

Sign in to [Slack's app settings](https://api.slack.com/apps) with permission
to create an internal app in the workspace you want to connect, or to manage
an existing one. Obtain any required workspace-admin approval before connecting.

For a new app, use the [JSON manifest](#create-app-from-manifest) below. For an
existing internal app, skip to [Enable MCP access](#enable-mcp-access) and
follow the manual steps.
Slack permits internal apps and apps published in the Slack Marketplace;
unlisted distributed apps cannot use its MCP server. This guide uses an
internal app, not a bot token or a personal API key. Each connecting user
authorizes access with their own Slack account.

If your app restricts allowed IP addresses, ask your network administrator to
include the Control Plane's outbound addresses before connecting. Do not
remove the restriction to work around a failed connection.

### Create an app from JSON {#create-app-from-manifest}

Use this option for a new internal app. The manifest enables MCP access and
sets the same user permissions and callback as the manual steps below.

1. Start creating an app in [Slack's app settings](https://api.slack.com/apps).
2. Select **From a manifest**.
3. Click **Continue**.
4. Replace the JSON manifest with the following:

```json
{
  "display_information": {
    "name": "Slack MCP Control Plane"
  },
  "oauth_config": {
    "redirect_urls": [
      "{{ gram.oauth.callback_url }}"
    ],
    "scopes": {
      "user": [
        "channels:read",
        "groups:read",
        "im:read",
        "mpim:read"
      ]
    }
  },
  "settings": {
    "is_mcp_enabled": true
  }
}
```

5. Select the workspace where the app will live.
6. Click **Next**.
7. Click **Create**.

These permissions allow listing the user's channels, not message search,
message history, or sending messages. Keep the app internal; creating it does
not bypass workspace approval or authorize access for other users.

Continue to [Copy the app credentials](#copy-client-credentials). You do not
need to repeat the next three manual configuration steps.

<!-- screenshot: Slack's manifest editor with the JSON configuration before app creation -->

### Enable MCP access {#enable-mcp-access}

1. Open your internal app in [Slack's app settings](https://api.slack.com/apps).
2. Select **Agents** in the sidebar.
3. Toggle **Slack Model Context Protocol (MCP) Server** to **On**.

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
