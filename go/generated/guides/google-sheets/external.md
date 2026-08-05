---
setup_version: 1
---

# Set up Google Sheets

Use a Google Cloud project where you can enable services, grant project IAM roles, configure the **Google Auth platform**, and create OAuth credentials. You normally need **Service Usage Admin** or **Owner** to enable the APIs and **Project IAM Admin** to grant access. Each person who will connect needs access to the intended spreadsheets. Before setup, have the application or security owner configure prompt and response screening for malicious content or prompt injection.

Sign in to the [Google Cloud console](https://console.cloud.google.com). In the console toolbar, use the resource selector to choose the project that will own this configuration. Keep the same project selected throughout setup.

### Enable the Google Sheets APIs {#enable-google-sheets-apis}

1. Open **APIs & Services** > **API Library**.
2. In **Search for APIs & Services**, enter `Google Sheets API`.
3. Open **Google Sheets API**.
4. Click **Enable**. If the service is already enabled, leave it enabled.
5. Reopen **APIs & Services** > **API Library**.
6. In **Search for APIs & Services**, enter `Google Sheets MCP API`.
7. Open **Google Sheets MCP API**.
8. Click **Enable**. If the service is already enabled, leave it enabled.

<!-- screenshot: Google Sheets MCP API showing its enabled state -->

### Grant MCP Tool User access {#grant-mcp-tool-user}

1. Go to [IAM](https://console.cloud.google.com/iam-admin/iam).
2. Confirm that the same project is selected.
3. Click **Grant access**.
4. In **New principals**, enter the Google Account email address of a person who will connect through the Speakeasy AI Control Plane.
5. Click **Select a role**.
6. Search for `MCP Tool User`.
7. Select **MCP Tool User**.
8. Click **Save**.
9. Repeat these steps for every person who will connect.

<!-- screenshot: Grant access with New principals and MCP Tool User visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Google does not allow you to remove the OAuth consent screen after you configure it. Before continuing, confirm that you are working in the correct project.

1. Open **Google Auth platform** > **Branding**.
2. If **Google Auth platform not configured yet** appears, click **Get Started**.
3. Under **App Information**, enter `Sheets MCP Server` in **App name**.
4. In **User support email**, select a monitored email address. Obtain the correct value from the application or security owner if needed.
5. Click **Next**.
6. Under **Audience**, select **Internal** if every connecting user belongs to the project's organization. Otherwise, select **External**.
7. Click **Next**.
8. Under **Contact Information**, enter a monitored **Email address**.
9. Click **Next**.
10. Under **Finish**, review the Google API Services User Data Policy with the application or security owner.
11. If the owner approves the policy, select **I agree to the Google API Services: User Data Policy**.
12. Click **Continue**.
13. Click **Create**.

If the Google Auth platform was already configured, retain the approved **Branding** and **Audience** settings.

14. Open **Data Access**.
15. Click **Add or Remove Scopes**.
16. Under **Manually add scopes**, paste these four URLs:

    ```
    https://www.googleapis.com/auth/drive.readonly
    https://www.googleapis.com/auth/drive.file
    https://www.googleapis.com/auth/spreadsheets.readonly
    https://www.googleapis.com/auth/spreadsheets
    ```

17. Click **Add to Table**.
18. Click **Update**.
19. Click **Save**.
20. If you selected an **External** audience in **Testing**, open **Audience**.
21. Under **Test users**, click **Add users**.
22. Enter each connecting user's email address.
23. Click **Save**.

An **External** audience in **Testing** supports up to 100 test users. Each authorization expires seven days after consent. When it expires, the user must complete browser authorization again.

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

Before you click **Create**, prepare an approved secret store. The next dialog displays a client secret that can be copied only once.

7. Click **Create**.

This opens **OAuth 2.0 client created**.

<!-- screenshot: Create client with Web application and the callback template under Authorized redirect URIs -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. In **OAuth 2.0 client created**, copy the **Client ID** to your approved secret store.
2. Under **Client secrets**, copy the **Client secret** to the same store.

If you miss the one-time **Client secret**, delete it and create a new one before continuing.

Keep both values available, then [connect your credentials in the Speakeasy AI Control Plane](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot-exception: do not capture a dialog containing a one-time secret -->
