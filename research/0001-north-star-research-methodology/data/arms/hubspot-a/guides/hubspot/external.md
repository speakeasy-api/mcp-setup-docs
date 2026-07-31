---
setup_version: 1
---

# Set up HubSpot

Use the HubSpot account in which users will authorize the connection. The account must use HubSpot's latest Developer Platform. You need access to **Development** through a **Developer Seat** on a seat-based account, **Developer tools access** on an account without seat-based pricing, or a super admin or partner admin role. You also need a HubSpot account administrator for the first connection and a password manager for the credentials. Sign in to HubSpot before you begin.

### Open MCP Auth Apps {#open-mcp-auth-apps}

If **Development** is unavailable, ask a super admin to provide a **Developer Seat** or enable **Developer tools access**, as applicable to the account.

1. In the main navigation bar, select **Development**.
2. In the left sidebar, select **MCP Auth Apps**. This opens the MCP auth apps page.
3. In the upper right, click **Create MCP auth app**. This opens the app-details dialog.

You can also open `https://app.hubspot.com/l/mcp-auth-apps/` directly if you cannot find the navigation entry.

<!-- screenshot: the HubSpot Development area with MCP Auth Apps selected and Create MCP auth app visible -->

### Create the MCP auth app {#create-mcp-auth-app}

1. In **App name**, enter a name recognizable to your organization.
2. If your organization requires them, complete **Description** and **Icon** according to its policy.
3. In **Redirect URL**, paste `{{ gram.oauth.callback_url }}`.
4. Click **Create**. HubSpot creates the app and opens its details page.

<!-- screenshot: the Create MCP auth app dialog with App name, Description, Redirect URL, Icon, and Create visible; organization-specific values redacted -->

### Copy the client credentials {#copy-client-credentials}

1. On the app details page, copy **Client ID** into your organization's password manager.
2. Copy **Client secret** into the password manager.

If the callback URL needs correction before the first connection, click **Edit info** to reopen the app information.

You will enter both values in the Speakeasy AI Control Plane when you [connect your credentials](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: the MCP auth app details page with the client-credential and redirect-URL areas visible; credential values fully redacted -->
