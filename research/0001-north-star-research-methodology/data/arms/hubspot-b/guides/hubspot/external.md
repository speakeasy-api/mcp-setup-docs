---
setup_version: 1
---

# Set up HubSpot

Use the HubSpot account containing the CRM data you want to connect. HubSpot does not specify a required subscription or seat. You need **Developer tools access** to manage the app; if you do not have it, ask a super admin to grant it or perform these steps. The user who later authorizes the connection needs access to the HubSpot data and operations users expect to use.

Sign in to the HubSpot account that the connection will use. If the account has Sensitive Data enabled, the MCP server blocks calls, emails, meetings, notes, and tasks.

### Open MCP Auth Apps {#open-mcp-auth-apps}

1. In the main navigation bar, select **Development**.
2. In the left sidebar, select **MCP Auth Apps**.

<!-- screenshot: HubSpot with Development in the main navigation and MCP Auth Apps selected in the left sidebar; exclude unrelated account data -->

### Create the MCP auth app {#create-mcp-auth-app}

1. In the upper right, click **Create MCP auth app**.
2. In **App name**, enter `Speakeasy AI Control Plane` or another recognizable name.
3. Optional: complete **Description** according to your organization's application-record policy.
4. Optional: complete **Icon** according to your organization's application-record policy.
5. In **Redirect URL**, enter `{{ gram.oauth.callback_url }}`. Do not enter the localhost callback from HubSpot's MCP Inspector example.
6. Click **Create**. HubSpot opens the app details page.
7. Copy **Client ID** to an approved password manager.
8. Copy **Client secret** to an approved password manager.

If you mistyped **Redirect URL**, click **Edit info** and correct it before connecting the credentials in the Speakeasy AI Control Plane.

<!-- screenshot: the Create MCP auth app dialog with App name, Description, Redirect URL, and Icon visible; if capturing the resulting details page too, redact all credential values -->
