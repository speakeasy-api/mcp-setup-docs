---
setup_version: 1
---

# Set up Google Docs

Sign in to [console.cloud.google.com](https://console.cloud.google.com) with an account that can select a Google Cloud project, enable APIs, configure the **Google Auth platform**, and create OAuth credentials. Google does not document a Google Docs MCP-specific paid plan or license requirement. Enabling APIs requires `serviceusage.services.enable`; **Service Usage Admin** provides this permission. Each account that will connect needs **MCP Tool User** (`roles/mcp.toolUser`) on the project and access to the Google Docs it will use. Obtain the approved support and contact addresses before you begin. If your organization restricts high-risk Drive and Docs scopes or unconfigured apps, you also need a Google Workspace administrator with the **Service Settings administrator** privilege.

### Enable the Docs MCP APIs {#enable-docs-mcp-apis}

1. In the toolbar, open the resource selector.
2. Select the Google Cloud project that will own the credentials.
3. Open **APIs & Services** > **Library**.
4. Open **Google Docs API**.
5. Click **Enable**.
6. Return to **Library**.
7. Open **Google Docs MCP API**.
8. Click **Enable**.

If **Enable** is unavailable, ask the project administrator for `serviceusage.services.enable`.

Open **Google Auth platform** > **Branding**.

<!-- screenshot: Google Docs MCP API showing its enabled state -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Google says an OAuth consent screen cannot be removed after it is configured. Confirm the approved app name, support address, contact address, and audience before you click **Get Started**.

If the page says **Google Auth Platform not configured yet**:

1. Click **Get Started**.
2. Under **App Information**, enter `Docs MCP Server` in **App name**.
3. Choose the approved **User support email**.
4. Click **Next**.
5. Under **Audience**, select **Internal** when it is available for your Google Workspace organization; otherwise select **External**.
6. Click **Next**.
7. Under **Contact Information**, enter the approved monitored address in **Email address**.
8. Click **Next**.
9. Under **Finish**, review the Google API Services User Data Policy.
10. With organizational approval, select **I agree to the Google API Services: User Data Policy**.
11. Click **Continue**.
12. Click **Create**.

If the Google Auth platform is already configured, review the equivalent settings on **Branding**, **Audience**, and **Data Access**.

Add the required access:

1. Open **Data Access**.
2. Click **Add or Remove Scopes**.
3. Under **Manually add scopes**, paste these four values:

   ```
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/documents.readonly
   https://www.googleapis.com/auth/documents
   ```

4. Click **Add to Table**.
5. Click **Update**.
6. Click **Save**.

If **Audience** is **External** and the app is in **Testing**, add every account that will make the first connection:

1. Open **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter the connecting accounts.
4. Click **Save**.

**Testing** supports at most 100 test users, and each authorization expires after seven days.

<!-- screenshot: Data Access showing the four configured scopes -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth platform** > **Clients**.
2. Click **Create client**.
3. Set **Application type** to **Web application**.
4. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
5. Under **Authorized redirect URIs**, click **+ Add URI**.
6. In **URIs**, enter this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

Prepare secure password storage before the next action. Google says the client secret in the next dialog can be copied only once.

7. Click **Create**.

Keep **OAuth 2.0 client created** open.

<!-- screenshot: Create client with Web application and the callback template in Authorized redirect URIs -->

### Copy the client credentials {#copy-client-credentials}

1. In **OAuth 2.0 client created**, copy **Client ID** to secure storage.
2. Under **Client secrets**, copy **Client secret**.
3. Store the secret as a password alongside the Client ID.

If you lost the one-time secret, delete it and create a new secret before continuing.

If your organization restricts high-risk Drive and Docs scopes or blocks unconfigured apps, continue to [Allow the OAuth client in restricted organizations](#allow-workspace-oauth-client). Otherwise, continue to [Speakeasy setup](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot-exception: do not capture a dialog containing a secret -->

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

Complete this step only when your organization's Workspace API controls restrict high-risk Drive and Docs scopes or block unconfigured apps.

1. Sign in to [admin.google.com](https://admin.google.com) with **Service Settings administrator** access.
2. Open **Security** > **Access and data control** > **API controls**.
3. Click **Manage App Access**.
4. Under **Configured apps**, click **Configure new app**.
5. Enter the Client ID copied in [Copy the client credentials](#copy-client-credentials).
6. Click **Search**.
7. Select the matching app.
8. Select the organizational units whose users will connect.
9. Click **Continue**.
10. Choose the access approved by the security owner:
    - **Trusted**
    - **Specific Google data**, with the Docs MCP scopes and any Google sign-in scopes the app requests
11. Click **Continue**.
12. Review the settings.
13. Click **Finish**.

Changes can take up to 24 hours, though they usually apply sooner. Continue to [Speakeasy setup](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot: the access review with the Client ID redacted -->
