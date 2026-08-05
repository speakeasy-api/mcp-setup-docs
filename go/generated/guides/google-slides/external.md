---
setup_version: 1
---

# Set up Google Slides

The Google Slides MCP Server is in Developer Preview. Google does not document a Google Slides MCP-specific paid plan or license requirement.

Use a Google Cloud project where you can enable services, grant project roles, configure **Google Auth platform**, and create OAuth credentials. Each connecting user needs access to the intended presentations. An application or security owner must also configure prompt and response screening for malicious content or prompt injection.

Sign in to the [Google Cloud console](https://console.cloud.google.com). In the console toolbar, select the project that will own this configuration, and keep it selected throughout the Google Cloud steps.

### Enable the Google Slides APIs {#enable-google-slides-apis}

1. Open **APIs & Services** > **API Library**.
2. In **Search for APIs & Services**, search for `Google Slides API`.
3. Open **Google Slides API**.
4. Click **Enable**. If the API is already enabled, continue.
5. Reopen **APIs & Services** > **API Library**.
6. In **Search for APIs & Services**, search for `Google Slides MCP API`.
7. Open **Google Slides MCP API**.
8. Click **Enable**. If the API is already enabled, continue.

You need `serviceusage.services.enable`, normally through **Service Usage Admin** or **Owner**.

<!-- screenshot: Google Slides MCP API showing its enabled state -->

### Grant MCP Tool User access {#grant-mcp-tool-user}

You need **Project IAM Admin** to grant project roles.

1. Open [**IAM**](https://console.cloud.google.com/iam-admin/iam).
2. Confirm that the same project is selected.
3. Click **Grant access**.
4. In **New principals**, enter a connecting user's Google Account email.
5. Click **Select a role**.
6. Search for `MCP Tool User`.
7. Select **MCP Tool User**.
8. Click **Save**.
9. Repeat these steps for each connecting user.

The server will apply each user's existing Slides and Drive permissions and governance controls.

<!-- screenshot: Grant access with New principals and MCP Tool User visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Before configuring the consent screen, obtain approved support and contact addresses. Google says an OAuth consent screen cannot be removed after it is configured.

1. Open **Google Auth platform** > **Branding**.
2. If the page says **Google Auth Platform not configured yet**, click **Get Started**.
3. Under **App Information**, enter `Slides MCP Server` in **App name**.
4. Choose an approved **User support email**.
5. Click **Next**.
6. Under **Audience**, select **Internal** when all connecting users belong to the project's Workspace organization; otherwise select **External**.
7. Click **Next**.
8. Under **Contact Information**, enter an approved monitored **Email address**.
9. Click **Next**.
10. Under **Finish**, review the Google API Services User Data Policy.
11. With organizational approval, select **I agree to the Google API Services: User Data Policy**.
12. Click **Continue**.
13. Click **Create**.

If **Google Auth platform** was already configured, retain its approved **Branding** and **Audience**.

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

An **External** app in **Testing** permits up to 100 listed test users. Each authorization expires seven days after consent; after it expires, the account remains a test user but must complete browser authorization again.

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

Click **Create**. This opens **OAuth 2.0 client created**.

<!-- screenshot: Create client with Web application and the callback template under Authorized redirect URIs -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. In **OAuth 2.0 client created**, copy **Client ID** to the approved secret store.
2. Under **Client secrets**, copy **Client secret** to the same store.

If you miss the one-time secret, delete it and create a new one before continuing.

If Workspace API controls restrict high-risk Drive and Slides scopes or block unconfigured apps, complete [Allow the OAuth client in restricted organizations](#allow-workspace-oauth-client). Otherwise, continue to [Add the server in Speakeasy](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot-exception: do not capture a dialog containing a one-time secret -->

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

Use this step only when Workspace API controls restrict high-risk Drive and Slides scopes or block unconfigured apps. You need **Service Settings administrator** access.

1. Sign in to the [Google Admin console](https://admin.google.com).
2. Open **Security** > **Access and data control** > **API controls**.
3. Click **Manage App Access**.
4. Under **Configured apps**, click **Configure new app**.
5. Enter the **Client ID** from [Copy the OAuth credentials](#copy-oauth-credentials).
6. Click **Search**.
7. Select the matching app.
8. Select the organizational units whose users will connect.
9. Click **Continue**.
10. Choose the access approved by the security owner: **Trusted**, or **Specific Google data** with the four Slides MCP scopes and any required Google sign-in scopes.
11. Click **Continue**.
12. Review the settings.
13. Click **Finish**.

Google says changes can take up to 24 hours, though they usually apply sooner. Continue to [Add the server in Speakeasy](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot: the access review with the Client ID redacted -->
