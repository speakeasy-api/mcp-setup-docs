---
setup_version: 1
---

# Connect Intercom to the Speakeasy AI Control Plane

You need an Intercom workspace hosted in the US or EU. You also need access to the Intercom Developer Hub and permission to create and configure an OAuth app for that workspace. Intercom does not name a required plan or administrator role.

Sign in to the intended workspace. The app setup starts in the [Intercom Developer Hub](https://app.intercom.com/a/apps/_/developer-hub).

### Identify the workspace region {#identify-workspace-region}

1. Open the intended Intercom workspace.
2. Inspect its hostname in the browser address bar.
3. Record the matching remote URL:
   - For `app.intercom.com`, record `https://mcp.intercom.com/mcp`.
   - For `app.eu.intercom.com`, record `https://mcp.eu.intercom.com/mcp`.
4. If the hostname is `app.au.intercom.com`, stop. Intercom does not support its MCP server for Australian-hosted workspaces.

If Intercom cannot find the workspace:

1. Return to [Intercom's sign-in page](https://app.intercom.com/admins/sign_in).
2. Under **Your account region**, select the region matching the workspace URL: **United States**, **Europe**, or **Australia**.
3. Sign in again.

<!-- screenshot: the intended workspace URL with tenant-identifying path details obscured, or the sign-in page with Your account region expanded -->

### Create the OAuth app {#create-oauth-app}

1. Open the [Intercom Developer Hub](https://app.intercom.com/a/apps/_/developer-hub). This opens **Your Apps**.
2. Select **New App**.
3. Obtain the organization-approved app name from the application or cloud security owner.
4. In the modal, enter that app name.
5. Select the workspace this connection will access.
6. Select **Create app**.

Intercom creates the app, installs it in the selected workspace, and opens its configuration.

<!-- screenshot: Your Apps with the new-app control and creation modal showing the app-name and workspace choices, with identifying values obscured -->

### Configure OAuth {#configure-oauth}

1. In the created app, open **Authentication**.
2. Select **Use OAuth**. This reveals **Redirect URLs** and **Permissions**.
3. Under **Redirect URLs**, select **Add redirect URL**.
4. Enter this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

5. Under **Permissions**, select:
   - **Read and list users and companies**
   - **Read conversations**
   - **Read one admin**
   - **Read and List articles**
6. Obtain the article-access choice from the application or cloud security owner. Unless they require article creation or updates through the MCP server, keep **Read and List articles**. If they require those operations, select **Read and Write Articles** instead.
7. Complete the page's save or confirmation control.

<!-- screenshot: Authentication with Use OAuth enabled, Redirect URLs showing the callback, and the four minimum permission checkboxes selected; do not include a token or secret -->

### Copy the client credentials {#copy-client-credentials}

1. Open the app's **Basic Information** page.
2. Copy the **Client ID** into a password manager.
3. Copy the **Client secret** into the password manager.

<!-- screenshot: Basic Information with the Client ID and Client secret locations visible and both values fully redacted -->
