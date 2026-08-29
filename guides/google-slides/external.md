---
setup_version: 1
---

# Set up Google Slides

The Google Slides MCP Server is in Developer Preview. Google does not document a Google Slides MCP-specific paid plan or license requirement.

Use a Google Cloud project where you can enable services, grant project roles, configure **Google Auth platform**, and create OAuth credentials. Every connecting user needs **MCP Tool User** on the selected project and access to the intended presentations. An application or security owner must also configure prompt and response screening for malicious content or prompt injection.

If Workspace API controls restrict high-risk Drive and Slides scopes or block unconfigured apps, you also need **Service Settings administrator** access and the Google Workspace security owner's approved access setting. If you do not know whether these controls apply, ask that owner before starting.

### Select the Google Cloud project {#select-google-cloud-project}

1. Sign in at [console.cloud.google.com](https://console.cloud.google.com).
2. In the console toolbar, select the project that will own this configuration.

Keep that project selected throughout the Google Cloud steps.

<!-- screenshot: the console toolbar with the selected project visible -->

### Enable the Google Slides APIs {#enable-google-slides-apis}

Before enabling the APIs, make sure your account has `serviceusage.services.enable`, normally through **Service Usage Admin** or **Owner**.

1. Open **APIs & Services** > **API Library**.
2. In **Search for APIs & Services**, search for `Google Slides API`.
3. Open **Google Slides API**.
4. Click **Enable**. If the API is already enabled, continue.
5. Reopen **APIs & Services** > **API Library**.
6. In **Search for APIs & Services**, search for `Google Slides MCP API`.
7. Open **Google Slides MCP API**.
8. Click **Enable**. If the API is already enabled, continue.

<!-- screenshot: Google Slides MCP API showing its enabled state -->

### Grant MCP Tool User access {#grant-mcp-tool-user}

You need **Project IAM Admin** to grant project roles.

1. Open [console.cloud.google.com/iam-admin/iam](https://console.cloud.google.com/iam-admin/iam).
2. Confirm that the same project is selected.
3. Click **Grant access**.
4. In **New principals**, enter a connecting user's Google Account email.
5. Click **Select a role**.
6. Search for `MCP Tool User`.
7. Select **MCP Tool User**.
8. Click **Save**.
9. Repeat steps 3–8 for each additional connecting user.

<!-- screenshot: Grant access with New principals and MCP Tool User visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Before configuring the consent screen, obtain approved support and contact addresses. Google says an OAuth consent screen cannot be removed after it is configured.

Open **Google Auth platform** > **Branding**.

Before choosing an audience, note that an **External** app in **Testing** permits up to 100 listed test users, and each authorization expires seven days after consent.

If the page says **Google Auth Platform not configured yet**:

1. Click **Get Started**.
2. Under **App Information**, enter `Slides MCP Server` in **App name**.
3. Choose an approved **User support email**.
4. Click **Next**.
5. Under **Audience**, select **Internal** only when every connecting user belongs to the organization and the selected project is associated with that Google Cloud organization; otherwise select **External**.
6. Click **Next**.
7. Under **Contact Information**, enter an approved monitored **Email address**.
8. Click **Next**.
9. Under **Finish**, review the Google API Services User Data Policy.
10. With organizational approval, select **I agree to the Google API Services: User Data Policy**.
11. Click **Continue**.
12. Click **Create**.

If **Google Auth platform** was already configured, retain its approved **Branding**, then open **Google Auth platform** > **Audience** and verify that its audience meets the conditions above. If it does not, stop and ask the Google Cloud project owner for a fresh project with the appropriate audience. Do not continue in the current project.

1. Open **Data Access**.
2. Click **Add or Remove Scopes**.
3. Under **Manually add scopes**, paste these four scope URLs:

   ```
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/presentations.readonly
   https://www.googleapis.com/auth/presentations
   ```

4. Click **Add to Table**.
5. Click **Update**.
6. Click **Save**.

For an **External** app in **Testing**:

1. Open **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter every connecting user's email.
4. Click **Save**.

<!-- screenshot: Data Access with all four scopes selected -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth platform** > **Clients**.
2. Click **Create client**.
3. In **Application type**, select **Web application**.
4. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
5. Under **Authorized redirect URIs**, click **+ Add URI**.
6. In **URIs**, enter this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

Do not add an **Authorized JavaScript origins** value.

Before clicking **Create**, prepare an approved secret store. The next dialog permits the client secret to be copied only once.

7. Click **Create**.

This opens **OAuth 2.0 client created**.

<!-- screenshot: Create client with Web application and the callback template under Authorized redirect URIs -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. In **OAuth 2.0 client created**, copy **Client ID** to the approved secret store.
2. Under **Client secrets**, copy **Client secret** to the same store.

If the one-time dialog closes before both values are stored, do not continue with an incomplete pair. Return to [Create the OAuth client](#create-oauth-client) and repeat that entire create-client path to create a new OAuth client. Then copy both values from the new **OAuth 2.0 client created** dialog.

If Workspace API controls restrict high-risk Drive and Slides scopes or block unconfigured apps, complete [Allow the OAuth client in restricted organizations](#allow-workspace-oauth-client). Otherwise, continue to [Add the server in Speakeasy](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot-exception: do not capture a dialog containing a one-time secret -->

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

Complete this step only when Workspace API controls restrict high-risk Drive and Slides scopes or block unconfigured apps.

1. Sign in at [admin.google.com](https://admin.google.com).
2. Open **Security** > **Access and data control** > **API controls**.
3. Click **Manage App Access**.
4. Under **Configured apps**, click **Configure new app**.
5. Enter the **Client ID** from [Copy the OAuth credentials](#copy-oauth-credentials).
6. Click **Search**.
7. Select the matching app.
8. Select the organizational units whose users will connect.
9. Click **Continue**.
10. Select the access setting approved by the Google Workspace security owner.
11. Click **Continue**.
12. Review the settings.
13. Click **Finish**.

Authorization can remain blocked for up to 24 hours while the change propagates, though it usually applies sooner. Wait for propagation and retry before changing credentials. Then continue to [Add the server in Speakeasy](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot: the access review with the Client ID redacted -->
