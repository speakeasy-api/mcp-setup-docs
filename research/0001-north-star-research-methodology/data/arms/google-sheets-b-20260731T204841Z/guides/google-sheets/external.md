---
setup_version: 1
---

# Set up Google Sheets

You need every connecting Google Workspace-domain account and the Google Cloud project accepted into the Google Workspace Developer Preview Program. Google asks you to allow about one week for an application to be processed. Use a project administrator who can enable APIs, grant project IAM roles, configure Google Auth platform, and create OAuth credentials. The administrator enabling APIs needs `serviceusage.services.enable`; **Service Usage Admin** and **Owner** normally include this permission. The project role grants require **Project IAM Admin**.

Each connecting user needs **MCP Tool User** on the project, access to the intended spreadsheets, and permission under applicable Workspace app-access policy. An application or security owner must also configure prompt and response screening for malicious content or prompt injection. This can use Model Armor or another solution that documents the risk for users.

Sign in at `https://console.cloud.google.com`. In the toolbar resource selector, select the Developer Preview-registered project and keep it selected throughout setup.

### Enroll the project in Developer Preview if needed {#enroll-developer-preview}

If Google has already accepted the Workspace account and project, continue to [Enable the Google Sheets APIs](#enable-google-sheets-apis).

Repeat this section for every account that will authorize a connection. The application grants access to the one Workspace-domain email entered.

1. In Google Cloud console, select the target project.
2. Open **Navigation menu** > **Cloud overview** > **Dashboard**.
3. In the **Project info** card, copy the numeric **Project number**.
4. Open `https://developers.google.com/workspace/preview`.
5. Read the **Program Terms**.
6. Select **Apply to join the Developer Preview Program**.
7. Sign in to the form with the individual Workspace-domain account that should receive preview access. Do not use a Gmail address, service account, or Google Group.
8. Enter the account holder's **Given name**.
9. Enter the account holder's **Surname**.
10. Enter your **Company name**.
11. Enter your **Company website**.
12. Enter the individual Workspace-domain email in **What Email should we grant access to Developer Preview features?**.
13. Enter the copied **Project number** in **Google Cloud Project number**.
14. Select **Sheets** under the optional product interests if useful.
15. Under **By checking the boxes below, you accept the terms of participation in this program**, accept the terms only after obtaining organizational approval.
16. Submit the form.
17. Wait until Google confirms access for the submitted account and project before continuing.

If enrollment has a problem, use the program-account contact path on the same preview page instead of submitting unapproved alternate project details.

<!-- screenshot: the preview-program page with the application button and no organization-specific values -->

### Enable the Google Sheets APIs {#enable-google-sheets-apis}

1. In the selected project, open **APIs & Services** > **API Library**.
2. In **Search for APIs & Services**, enter `Google Sheets API`.
3. Open **Google Sheets API**.
4. Select **Enable**. If it is already enabled, continue.
5. Reopen **API Library**.
6. In **Search for APIs & Services**, enter `Google Sheets MCP API`.
7. Open **Google Sheets MCP API**.
8. Select **Enable**. If it is already enabled, continue.

<!-- screenshot: Google Sheets MCP API in its enabled state -->

### Grant MCP Tool User access {#grant-mcp-tool-user}

Repeat this section for every connecting user. Each user must also have access to the intended spreadsheets.

1. Open `https://console.cloud.google.com/iam-admin/iam`.
2. Confirm that the Developer Preview-registered project remains selected.
3. Select **Grant access**.
4. In **New principals**, enter the connecting user's Google Account email.
5. Select **Select a role**.
6. Search for `MCP Tool User`.
7. Select **MCP Tool User**.
8. Select **Save**.

<!-- screenshot: Grant access with the principal and MCP Tool User role visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Google does not allow the consent screen to be removed after it is configured. Confirm the project before starting this section.

1. Open **Google Auth platform** > **Branding**.
2. If **Google Auth platform not configured yet** appears, select **Get Started**. Otherwise, retain the approved **Branding** and **Audience** values and continue with the scope steps below.
3. Under **App Information**, enter `Sheets MCP Server` in **App name**.
4. Choose a monitored **User support email**.
5. Select **Next**.
6. Under **Audience**, select **Internal** if all connecting users belong to the project's organization; otherwise, select **External**. **Internal** is available only to a project associated with a Google Cloud organization.
7. Select **Next**.
8. Under **Contact Information**, enter a monitored **Email address**.
9. Select **Next**.
10. Under **Finish**, review the Google API Services User Data Policy.
11. After obtaining organizational approval, select **I agree to the Google API Services: User Data Policy**.
12. Select **Continue**.
13. Select **Create**.
14. Open **Data Access**.
15. Select **Add or Remove Scopes**.
16. Under **Manually add scopes**, paste these four scopes: `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/drive.file`, `https://www.googleapis.com/auth/spreadsheets.readonly`, and `https://www.googleapis.com/auth/spreadsheets`.
17. Select **Add to Table**.
18. Select **Update**.
19. Select **Save**.

For an **External** app in **Testing**, add every connecting account as a test user. Google allows up to 100 test users, and Testing authorizations last seven days.

1. Open **Audience**.
2. Under **Test users**, select **Add users**.
3. Enter each connecting user's email.
4. Select **Save**.

After a Testing authorization expires, the user must authorize again.

<!-- screenshot: Data Access with all four required scopes in the table -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth platform** > **Clients**.
2. Select **Create client**. This may appear as **Create Client**.
3. Set **Application type** to **Web application**.
4. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
5. Under **Authorized redirect URIs**, select **+ Add URI**.
6. Enter `{{ gram.oauth.callback_url }}` in **URIs**. Leave **Authorized JavaScript origin** empty.

Prepare an approved secret store before the next action. The following dialog permits the client secret to be copied only once.

7. Select **Create** to open **OAuth 2.0 client created**.

<!-- screenshot: Create client with the callback template populated -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. Copy **Client ID** to the approved secret store.
2. Under **Client secrets**, copy **Client secret** to the same store.
3. Keep both values for [Connect your credentials](speakeasy.md#connect-speakeasy-credentials).

If you miss the secret, reopen **Google Auth platform** > **Clients**, open the client, and use the current client-secret management controls to delete the missed secret and create a replacement. Copy the new secret immediately.

<!-- screenshot-exception: do not capture a one-time secret -->

### Permit the OAuth app under Workspace policy if required {#permit-workspace-app}

Ask the Workspace security owner whether an applicable Google service is **Restricted**. Skip this section when current policy already permits the app. Otherwise, use an account with **Service Settings administrator** privilege.

1. Sign in at `https://admin.google.com`.
2. Open **Security** > **Access and data control** > **API controls**.
3. Select **Manage App Access**.
4. Under **Configured apps**, select **Configure new app**.
5. Enter the **Client ID** copied in [Copy the OAuth credentials](#copy-oauth-credentials).
6. Select **Search**.
7. Select the matching app.
8. Under **Scope**, keep the top organizational unit, or select **Select org units** > **Include organizations**.
9. If selecting organization units, select the covered units.
10. If selecting organization units, select **Select**.
11. Select **Continue**.
12. Under **Access to Google data**, have the security owner choose **Trusted** when organizational policy permits. Do not choose **Limited**, which cannot access restricted services.
13. Select **Continue**.
14. Review the settings.
15. Select **Finish**.

<!-- screenshot: the Workspace app-access review screen without credential values -->

Continue to [Speakeasy setup](speakeasy.md#add-server-in-speakeasy).
