---
setup_version: 1
---

# Google Calendar setup

Use a Google Cloud project where you can enable services, grant project roles, configure **Google Auth platform**, and create OAuth credentials. Enabling services requires **Service Usage Admin** or **Owner**; granting project roles requires **Project IAM Admin**. Each connecting user must have access to the calendars and events they will use.

Before you begin, have the application or security owner configure prompt and response screening for malicious content or prompt injection.

1. Sign in at `https://console.cloud.google.com`.
2. In the console toolbar, use the resource selector to select the project that will own this configuration.

Keep that project selected throughout the Google Cloud steps.

### Enable the Google Calendar APIs {#enable-google-calendar-apis}

1. Open **APIs & Services** > **API Library**.
2. In **Search for APIs & Services**, search for `Google Calendar API`.
3. Open **Google Calendar API**.
4. Click **Enable**. If the API is already enabled, continue.
5. Reopen **APIs & Services** > **API Library**.
6. In **Search for APIs & Services**, search for `Google Calendar MCP API`.
7. Open **Google Calendar MCP API**.
8. Click **Enable**. If the API is already enabled, continue.
9. Open the project's **IAM** page.

<!-- screenshot: Google Calendar MCP API showing its enabled state -->

### Grant MCP Tool User access {#grant-mcp-tool-user}

1. Go to `https://console.cloud.google.com/iam-admin/iam`.
2. Confirm that the same project is selected.
3. Click **Grant access**.
4. In **New principals**, enter a connecting user's Google Account email.
5. Click **Select a role**.
6. Search for `MCP Tool User`.
7. Select **MCP Tool User**.
8. Click **Save**.
9. Repeat these steps for each connecting user.

<!-- screenshot: Grant access with the principal and role visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Google says an OAuth consent screen cannot be removed after you configure it. Obtain approval from the application or security owner before accepting the user data policy.

1. Open **Google Auth platform** > **Branding**.
2. If you see **Google Auth platform not configured yet**, click **Get Started**. Otherwise, retain the approved **Branding** and **Audience**, then continue at **Data Access** below.
3. Under **App Information**, enter `Calendar MCP Server` in **App name**.
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
16. Under **Manually add scopes**, paste `https://www.googleapis.com/auth/calendar.calendarlist.readonly`, `https://www.googleapis.com/auth/calendar.events.freebusy`, and `https://www.googleapis.com/auth/calendar.events.readonly`.
17. Click **Add to Table**.
18. Click **Update**.
19. Click **Save**.

If you selected **External** and the app is in **Testing**, add every connecting account:

1. Open **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter each connecting user's email.
4. Click **Save**.

**Testing** permits at most 100 test users. Each authorization expires seven days after consent; when it expires, the user must complete browser authorization again.

<!-- screenshot: Data Access with all three scopes selected -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth platform** > **Clients**.
2. Click **Create client**.
3. In **Application type**, select **Web application**.
4. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
5. Under **Authorized redirect URIs**, click **+ Add URI**.
6. In **URIs**, enter `{{ gram.oauth.callback_url }}`.

Prepare an approved secret store before the next step. The dialog that opens after you create the client permits the client secret to be copied only once.

7. Click **Create**.

This opens **OAuth 2.0 client created**.

<!-- screenshot: Create client with the callback template populated -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. In **OAuth 2.0 client created**, copy **Client ID** to the approved secret store.
2. Under **Client secrets**, copy **Client secret** to the same store.

Keep both values for [connecting your credentials](speakeasy.md#connect-speakeasy-credentials). If you miss the one-time secret, delete it and create a new one before continuing.

<!-- screenshot-exception: do not capture a one-time secret -->

### Permit the OAuth app under Workspace policy if required {#permit-workspace-app}

Complete this step only if your organization restricts Google Calendar access for unconfigured or limited apps.

1. Sign in at `https://admin.google.com` with the **Service Settings administrator** privilege.
2. Open **Security** > **Access and data control** > **API controls**.
3. Click **Manage App Access**.
4. Under **Configured apps**, click **Configure new app**.
5. Enter the **Client ID** you copied in [Copy the OAuth credentials](#copy-oauth-credentials).
6. Click **Search**.
7. Select the matching app.
8. Select the organizational units whose users will connect.
9. Click **Continue**.
10. Under **Access to Google data**, have the application or security owner choose **Trusted** or **Specific Google data**.
11. Click **Continue**.
12. Review the settings.
13. Click **Finish**.

Return to the Speakeasy AI Control Plane.

<!-- screenshot: the review screen without credential values -->
