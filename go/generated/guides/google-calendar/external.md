---
setup_version: 1
---

# Google Calendar setup

The Calendar MCP server is in the Google Workspace Developer Preview Program. Use a Google Workspace account that can be added to Google Groups and a Google Cloud project that your organization can register in the program. Under the Developer Preview Program Terms, each connecting user must belong to the applicant's domain or company unless Google permits otherwise. You need permission to enable services, grant project roles, configure **Google Auth Platform**, and create OAuth credentials. Enabling services requires `serviceusage.services.enable`, normally provided by **Service Usage Admin** or **Owner**. Google's IAM procedure uses **Project IAM Admin** for granting project roles. Each connecting user must have `mcp.tools.call` on the project and access to the calendars and events they will use. **MCP Tool User** (`roles/mcp.toolUser`) is the normal predefined grant, but another predefined or custom role is sufficient if it contains `mcp.tools.call`. If Calendar is **Restricted** or the new app requires approval, you also need a Google Workspace administrator with the **Service Settings** privilege.

Before you begin, have the application or security owner configure prompt and response screening for malicious content or prompt injection. If the organization does not use Google Model Armor, document the alternative screening and the accepted risk. You will open the Google Cloud console after Google confirms project registration.

### Join the Google Workspace Developer Preview Program {#join-developer-preview}

1. Open [developers.google.com/workspace/preview](https://developers.google.com/workspace/preview).
2. Review the **Developer Preview Program Terms** with the application or security owner.
3. Click **Apply to join the Developer Preview Program**.
4. In the current application form, enter the requested Google Workspace account and Google Cloud project information.
5. Agree to the terms only with organizational approval.
6. Submit the form with the visible or equivalent submission control. Google verifies the Workspace account, adds it to the program group, and then registers the Cloud project; no post-submission Google Groups acceptance action is documented.
7. Wait for the final project-registration confirmation at the submitted email address. Google says this should complete within a couple of days.
8. After confirmation, open the [Google Cloud console](https://console.cloud.google.com/) and sign in.
9. In the toolbar resource selector, select the registered project.

Keep that project selected throughout the Google Cloud steps.

<!-- screenshot: the program page with Calendar MCP server listed under Latest features -->

### Enable the Google Calendar APIs {#enable-google-calendar-apis}

1. Open **APIs & Services** > **API Library**.
2. In **Search for APIs & Services**, search for `Google Calendar API`.
3. Open **Google Calendar API**.
4. Click **Enable**. If the API is already enabled, continue.
5. Reopen **APIs & Services** > **API Library**.
6. In **Search for APIs & Services**, search for `Calendar MCP API`.
7. Open **Calendar MCP API**.
8. Click **Enable**. If the API is already enabled, continue.
9. Open [console.cloud.google.com/iam-admin/iam](https://console.cloud.google.com/iam-admin/iam) for the project's **IAM** page.

<!-- screenshot: Calendar MCP API showing its enabled state -->

### Grant MCP Tool User access {#grant-mcp-tool-user}

1. On the project's **IAM** page, confirm that the same project is selected.
2. Click **Grant access**.
3. In **New principals**, enter a connecting user's Google Account email.
4. Click **Select a role**.
5. Search for `MCP Tool User`.
6. Select **MCP Tool User**.
7. Click **Save**.
8. Repeat these steps for each connecting user.

<!-- screenshot: Grant access with a non-sensitive test principal and the role visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Obtain approval from the application or security owner before accepting the user data policy.

1. Open **Google Auth Platform** > **Branding**.
2. If you see **Google Auth platform not configured yet**, click **Get Started**. Otherwise, retain the approved **Branding** and **Audience**, then continue at **Data Access** below.
3. Under **App Information**, enter a recognizable app name, such as `Calendar MCP Server`, in **App name**.
4. In **User support email**, choose a monitored address.
5. Click **Next**.
6. Under **Audience**, select **Internal** if every connecting user belongs to the project's organization. Otherwise, select **External**.
7. Click **Next**.
8. Under **Contact Information**, enter a monitored **Email address**.
9. Click **Next**.
10. Under **Finish**, review the Google API Services User Data Policy.
11. With approval, select **I agree to the Google API Services: User Data Policy**.
12. Click **Continue**.
13. Click **Create**.
14. Open **Data Access**.
15. Click **Add or Remove Scopes**.
16. Under **Manually add scopes**, paste these three scope URLs:

    ```
    https://www.googleapis.com/auth/calendar.calendarlist.readonly
    https://www.googleapis.com/auth/calendar.events.freebusy
    https://www.googleapis.com/auth/calendar.events.readonly
    ```

17. Click **Add to Table**.
18. Click **Update**.
19. Click **Save**.

If you selected **External** and the app is in **Testing**, add each eligible connecting account. Do not add a user outside the Developer Preview applicant's domain or company unless Google has permitted that access:

1. Open **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter each connecting user's email.
4. Click **Save**.

Each **Testing** authorization expires seven days after consent. When it expires, the user must complete browser authorization again.

<!-- screenshot: Data Access with all three scopes selected -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth Platform** > **Clients**.
2. Click **Create Client**.
3. In **Application type**, select **Web application**.
4. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
5. Under **Authorized redirect URIs**, click **+ Add URI**.
6. In **URIs**, enter this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

Prepare an approved secret store before the next step. Google shows the client secret after creation and does not make it accessible again.

7. Click **Create**.

This opens **OAuth 2.0 client created**.

<!-- screenshot: Create Client immediately before creation with the callback template populated -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. In **OAuth 2.0 client created**, copy **Client ID** to the approved credential handoff or password manager.
2. Copy **Client Secret** to the approved secret store before closing the dialog.

Keep both values for [connecting your credentials](speakeasy.md#connect-speakeasy-credentials).

If you close the dialog before storing the secret, return to **Google Auth Platform** > **Clients** and repeat [Create the OAuth client](#create-oauth-client) to create a new web client with the same callback URL. Store and use the new **Client ID** and newly shown **Client Secret**; Google will not make the original secret accessible again. If Workspace app approval is required, approve the new Client ID in the next step.

<!-- screenshot: the client list with identifiers redacted; do not capture the secret-bearing dialog -->

### Permit the OAuth app under Workspace policy if required {#permit-workspace-app}

Before skipping this step, confirm with the Workspace security owner whether Calendar is **Restricted** or the new app requires approval. To complete it, you need the Google Workspace **Service Settings** administrator privilege.

1. Open [admin.google.com](https://admin.google.com/) and sign in to the Google Admin console.
2. Open **Security** > **Access and data control** > **API controls**.
3. Click **Manage App Access**.
4. Under **Configured apps**, click **Configure new app**.
5. Enter the **Client ID** you copied in [Copy the OAuth credentials](#copy-oauth-credentials).
6. Click **Search**.
7. Select the matching OAuth app.
8. Select the organizational units that contain the connecting users.
9. Click **Continue**.
10. Under **Access to Google data**, have the application or security owner choose **Trusted**. Do not choose **Limited** for restricted Calendar access.
11. Click **Continue**.
12. Review the settings.
13. Click **Finish**.

Return to the Speakeasy AI Control Plane.

<!-- screenshot: the review screen with identifiers and user data redacted -->
