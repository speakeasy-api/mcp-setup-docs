---
setup_version: 1
---

# Set up Asana

## Prerequisites

Before you begin, make sure you have:

- An Asana account with access to the developer console.
- Membership in every Asana workspace you plan to select under **Specific workspaces**.
- If your Enterprise+ or Legacy Enterprise organization blocks unapproved apps through App management, an organization super admin who can allow this V2 MCP client before users authorize it.
- Access to your organization's approved password manager.

## Provider setup

### Open the developer console {#open-developer-console}

Open `https://app.asana.com/0/my-apps`. This opens the developer console, where you create the app. Stay in the app area; this setup does not use a personal access token.

<!-- screenshot: the Asana Apps settings page with View developer console visible, followed by the developer console with Create new app visible -->

### Create the MCP app {#create-mcp-app}

1. Select **Create new app**.
2. Enter a recognizable app name, such as `Speakeasy AI Control Plane`.
3. Select **MCP app** as the app type.
4. Select **Create app**.
5. Copy the **Client ID** into your approved password manager.
6. Copy the **Client secret** into your approved password manager.

<!-- screenshot: the creation screen immediately before Create app, with the app name and MCP app type visible; do not capture generated credential values -->

### Configure the OAuth redirect {#configure-oauth-redirect}

1. Select **OAuth** in the left sidebar.
2. Under **Redirect URLs**, select **+ Add redirect URL**.
3. In **Add redirect URL**, enter `{{ gram.oauth.callback_url }}`.
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

## Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.

If Asana is in the catalog:

1. Select **3rd-party server**.
2. On the **MCP Catalog** page, find `Asana` using **Search MCP servers...**.
3. Select **View**.
4. Select **Add**.
5. In the **Add to Project** dialog, select **Add to Project**.

If Asana is not in the catalog:

1. Select **Custom remote server**.
2. On **Add a custom remote MCP server**, paste `https://mcp.asana.com/v2/mcp` into **Remote MCP server URL**.
3. Select **Add server**.

Either path creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu on Sources, or Asana's catalog entry if present -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**.

When **Use Discovered** is offered:

Under **Authentication**, select **Use Discovered**.

When **Use Discovered** is not offered:

Under **Authentication**, select **Configure Manually**.

The **Attach Remote Identity Provider** sheet shows **Redirect URI** with a copy button.

Do not enter a scope.

1. Set **Client Type** to **Manual**.
2. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value you entered in [Configure the OAuth redirect](#configure-oauth-redirect).
3. Paste the **Client ID** saved in [Create the MCP app](#create-mcp-app) into **Client ID**.
4. Paste the **Client secret** saved in [Create the MCP app](#create-mcp-app) into **Client Secret (optional)**.
5. Select **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider with the Redirect URI and credential fields visible and all credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Asana's MCP documentation at https://developers.asana.com/docs/using-asanas-mcp-server.
