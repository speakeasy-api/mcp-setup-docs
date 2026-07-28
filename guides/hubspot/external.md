---
setup_version: 1
---

# HubSpot

You need a HubSpot account and a user who can open the **Development**
workspace from the main navigation bar. The remote MCP server is available to
all HubSpot accounts. Sign in at [app.hubspot.com](https://app.hubspot.com).

### Open MCP Auth Apps in the Development workspace {#open-mcp-auth-apps}

1. Sign in at [app.hubspot.com](https://app.hubspot.com).
2. In the main navigation bar, select **Development**.
3. In the left sidebar menu, select **MCP Auth Apps**.

If **Development** is unavailable, use the direct
[MCP Auth Apps page](https://app.hubspot.com/l/mcp-auth-apps/). If you still
cannot open it, ask your HubSpot administrator to confirm your access to this
developer feature.

<!-- screenshot: the HubSpot main navigation bar with Development visible, and the resulting Development workspace with MCP Auth Apps highlighted in the left sidebar menu -->

### Create the MCP auth app {#create-mcp-auth-app}

1. In the upper right, click **Create MCP auth app**.
2. In **App name**, enter a recognizable name, such as
   `Speakeasy AI Control Plane`.
3. Optionally, enter a **Description**.
4. In **Redirect URL**, paste `{{ gram.oauth.callback_url }}`.
5. Optionally, add an **Icon**.
6. Click **Create**.

If you configure multiple redirect URLs, keep
`{{ gram.oauth.callback_url }}` first because HubSpot uses the first URL as
the default.

<!-- screenshot: the MCP Auth Apps page with the Create MCP auth app button in the upper right and the creation dialog open, showing the App name, Description, Redirect URL, and Icon fields -->

### Copy the client credentials {#copy-client-credentials}

HubSpot opens the app's details page.

1. Copy the **Client ID**.
2. Copy the **Client secret**.

Treat the **Client secret** like a password. Both values remain available on
this page. Continue to
[Connect your credentials](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot-exception: the credential values are plain text fields whose appearance adds nothing beyond the copied values -->
