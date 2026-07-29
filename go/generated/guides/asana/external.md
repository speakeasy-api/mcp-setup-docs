---
setup_version: 1
---

# Set up Asana

Sign in to Asana. Before you begin, make sure you have:

- An Asana account with access to the developer console.
- Membership in every Asana workspace you plan to select under **Specific workspaces**.
- If your Enterprise+ or Legacy Enterprise organization uses App management, confirmation from an organization super admin that the V2 MCP client is allowed before users authorize it.
- Access to your organization's approved password manager.

### Open the developer console {#open-developer-console}

1. Select your profile photo in the top-right corner.
2. Select **Settings**.
3. Select **Apps**.
4. Select **View developer console**.

This opens the developer console, where you create the app. You can also open it directly at `https://app.asana.com/0/my-apps`.

<!-- screenshot: the Asana Apps settings page with View developer console visible, followed by the developer console with Create new app visible -->

### Create the MCP app {#create-mcp-app}

1. Select **Create new app**.
2. Enter a recognizable app name, such as `Speakeasy AI Control Plane`.
3. Select **MCP app** as the app type.
4. Select **Create app**.
5. Copy the generated **Client ID** into your approved password manager.
6. Copy the generated **Client secret** into your approved password manager.

<!-- screenshot: the creation screen immediately before Create app, with the app name and MCP app type visible; do not capture generated credential values -->

### Configure the OAuth redirect {#configure-oauth-redirect}

1. Select **OAuth** in the left sidebar.
2. Under **Redirect URLs**, select **+ Add redirect URL**.
3. In **Add redirect URL**, enter `{{ gram.oauth.callback_url }}` in **Redirect URL**.
4. Select **Add**.

<!-- screenshot: the app's OAuth page with the Redirect URL setting visible and credential values excluded or redacted -->

### Configure workspace distribution {#configure-workspace-distribution}

Select **Manage distribution** in the left sidebar.

For an internal deployment limited to named workspaces:

1. Under **Distribution method**, select **Specific workspaces**.
2. Select **+ Add workspace**.
3. Choose an intended workspace from the dropdown.
4. Select **Add**.
5. Repeat the workspace steps for every workspace whose users should connect.
6. Select **Save changes**.

To let users from any Asana workspace authorize the app:

1. Under **Distribution method**, select **Any workspace**.
2. Select **Save changes**.

<!-- screenshot: Manage distribution with Distribution method and both choices visible; for Specific workspaces, also show the selected workspace list without exposing unrelated organization data -->

If authorization says the app is explicitly blocked, an organization super admin must unblock it:

1. Return to Asana.
2. Select your profile photo.
3. Select **Admin console**.
4. Select **Apps**.
5. Select **Manage apps**.
6. Select **Connected apps**.
7. Select the associated MCP client app.
8. Select **Unblock**.

<!-- screenshot: Connected apps with the selected app's Unblock control; exclude user activity and unrelated apps -->
