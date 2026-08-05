---
setup_version: 1
---

# Set up Google Drive

Use a Google Cloud project where you can enable services, configure the Google Auth platform, create credentials, and grant project roles. You need **Service Usage Admin** or **Owner** to enable the APIs and appropriate IAM administration access to grant **MCP Tool User**. Every connecting user needs a Google Account with access to the intended Drive files.

Sign in at [console.cloud.google.com](https://console.cloud.google.com) and select the project that will own the APIs and credentials. If your organization restricts high-risk Drive scopes, arrange access to a **Service Settings administrator** and obtain an approved app-access setting from the application or cloud security owner.

### Enable the Google Drive API {#enable-drive-api}

1. Open [console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com](https://console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com).
2. Confirm the intended project if prompted.
3. Click **Enable**. If the API is already enabled, continue to the next section.

<!-- screenshot: Google Drive API with Enable, or its enabled state -->

### Enable the Google Drive MCP API {#enable-drive-mcp-api}

1. Open [console.cloud.google.com/flows/enableapi?apiid=drivemcp.googleapis.com](https://console.cloud.google.com/flows/enableapi?apiid=drivemcp.googleapis.com).
2. Confirm the intended project if prompted.
3. Click **Enable**. If the API is already enabled, continue to the next section.

<!-- screenshot: Google Drive MCP API with Enable, or its enabled state -->

### Grant the MCP Tool User role {#grant-mcp-tool-user}

1. Open [console.cloud.google.com/iam-admin/iam](https://console.cloud.google.com/iam-admin/iam).
2. Select the same project.
3. Click **Grant access**.
4. In **New principals**, enter the Google Account email of a user who will connect from the Speakeasy AI Control Plane.
5. Click **Select a role**.
6. Search for `MCP Tool User`.
7. Select **MCP Tool User**.
8. Click **Save**.
9. Repeat these steps for every connecting user.

Existing Drive sharing and Workspace policy determine which files each user can access.

<!-- screenshot: Grant access with the principal and MCP Tool User -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Google does not permit an OAuth consent screen to be removed after it is configured.

Open [console.cloud.google.com/auth/branding](https://console.cloud.google.com/auth/branding).

If **Google Auth platform not configured yet** appears, complete the first-time configuration:

1. Click **Get Started**.
2. Under **App Information**, enter `Drive MCP Server` in **App name**.
3. Select an approved **User support email**.
4. Click **Next**.
5. Under **Audience**, select **Internal** if every connecting account belongs to the project's Workspace organization. Otherwise, select **External**.
6. Click **Next**.
7. Under **Contact Information**, enter an approved **Email address**.
8. Click **Next**.
9. Under **Finish**, review the Google API Services User Data Policy.
10. After obtaining organizational approval, select **I agree to the Google API Services: User Data Policy**.
11. Click **Continue**.
12. Click **Create**.

If the Google Auth platform was already configured, use its existing **Branding**, **Audience**, and **Data Access** pages.

1. Open **Data Access**.
2. Click **Add or Remove Scopes**.
3. Under **Manually add scopes**, paste these two scopes:

   ```
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   ```

4. Click **Add to Table**.
5. Click **Update**.
6. Click **Save**.

If you selected **External** and the publishing status is **Testing**, add every connecting user:

1. Open **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter every connecting user's email.
4. Click **Save**.

Testing authorizations expire after seven days. For durable External use, hand publication, verification, and any required security assessment to the application or cloud security owner.

<!-- screenshot: Data Access with both Drive scopes selected -->

### Create the OAuth client {#create-oauth-client}

1. Open [console.cloud.google.com/auth/clients/create](https://console.cloud.google.com/auth/clients/create).
2. Set **Application type** to **Web application**.
3. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
4. Under **Authorized redirect URIs**, click **+ Add URI**.
5. Paste this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

Do not add **Authorized JavaScript origins**. Before the next action, prepare an approved secret store: the next dialog permits the client secret to be copied only once.

6. Click **Create**.

<!-- screenshot: Create client with the Web application type and redirect URI populated -->

### Copy the client credentials {#copy-client-credentials}

1. In **OAuth 2.0 client created**, copy the **Client ID** to your approved secret store.
2. Under **Client secrets**, copy the **Client secret** to the same location.
3. Keep both values ready for [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

If you lose the client secret before connecting, delete it and create a new one.

<!-- screenshot-exception: do not capture live credentials -->

### Permit the OAuth app under Workspace policy if required {#permit-workspace-app}

Complete this section only if Workspace app-access restrictions require approval of the OAuth client.

1. Sign in at [admin.google.com](https://admin.google.com) as a **Service Settings administrator**.
2. Go to **Security** > **Access and data control** > **API controls**.
3. Click **Manage App Access**.
4. Under **Configured apps**, click **Configure new app**.
5. Enter the Client ID from [Copy the client credentials](#copy-client-credentials).
6. Click **Search**.
7. Select the matching result.
8. Under **Scope**, keep the top-level organization selected, or use **Select org units** > **Include organizations** to select the covered units.
9. Click **Continue**.
10. Under **Access to Google data**, have the application or cloud security owner choose the approved setting. **Trusted** permits all requested services, **Specific Google data** limits access to selected scopes, and **Limited** cannot permit the required `drive.readonly` scope.
11. Click **Continue**.
12. Review the setting.
13. Click **Finish**.

<!-- screenshot: the review screen with client identity, covered units, and approved access setting, without credential values -->
