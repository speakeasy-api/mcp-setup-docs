---
setup_version: 1
---

# Set up Google People

You need a Google Cloud project and access to the [Google Cloud console](https://console.cloud.google.com). To enable the People API, you need `serviceusage.services.enable`, normally through **Service Usage Admin** or **Owner**. To grant project roles, you need **Project IAM Admin**. Before you begin, have the application or security owner configure prompt and response screening for malicious content or prompt injection; Model Armor is one option.

### Enable the People API {#enable-people-api}

1. Sign in to the [Google Cloud console](https://console.cloud.google.com).
2. In the console toolbar, use the resource selector to select the project that will own this configuration.
3. Open **APIs & Services** > **API Library**.
4. In **Search for APIs & Services**, search for `People API`.
5. Open **People API**.
6. Click **Enable**. If the API is already enabled, continue to the next section.

<!-- screenshot: People API showing Enable or its enabled state -->

### Grant MCP Tool User access {#grant-mcp-tool-user}

Repeat these steps for every person who will connect Google People.

1. Open the project's [IAM](https://console.cloud.google.com/iam-admin/iam) page.
2. Confirm that the same project is selected.
3. Click **Grant access**.
4. In **New principals**, enter the connecting user's Google Account email.
5. Click **Select a role**.
6. Search for `MCP Tool User`.
7. Select **MCP Tool User**.
8. Click **Save**.

<!-- screenshot: Grant access with New principals and MCP Tool User visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Google does not allow an OAuth consent screen to be removed after it is configured. Confirm that you are using the intended project before continuing.

1. Open **Google Auth platform** > **Branding**.
2. If the page shows **Google Auth platform not configured yet**, click **Get Started**.
3. Under **App Information**, enter `People API MCP Server` in **App name**.
4. Select a monitored **User support email**.
5. Click **Next**.
6. Under **Audience**, select **Internal**. If **Internal** is unavailable, select **External**.
7. Click **Next**.
8. Under **Contact Information**, enter a monitored **Email address**.
9. Click **Next**.
10. Under **Finish**, review the Google API Services User Data Policy with the application or security owner.
11. With their approval, select **I agree to the Google API Services: User Data Policy**.
12. Click **Continue**.
13. Click **Create**.

If Google Auth platform was already configured, retain its approved **Branding** and **Audience**.

14. Open **Data Access**.
15. Click **Add or Remove Scopes**.
16. Under **Manually add scopes**, paste these three scope URLs:
    - `https://www.googleapis.com/auth/directory.readonly`
    - `https://www.googleapis.com/auth/userinfo.profile`
    - `https://www.googleapis.com/auth/contacts.readonly`
17. Click **Add to Table**.
18. Click **Update**.
19. Click **Save**.

If you selected **External** and the app is in **Testing**, add every connecting account:

20. Open **Audience**.
21. Under **Test users**, click **Add users**.
22. Enter each connecting user's email.
23. Click **Save**.

<!-- screenshot: Data Access with all three required scopes selected -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth platform** > **Clients**.
2. Click **Create client**.
3. In **Application type**, select **Web application**.
4. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
5. Under **Authorized redirect URIs**, click **+ Add URI**.
6. In **URIs**, enter `{{ gram.oauth.callback_url }}`.

Prepare an approved secret store before the next step. The next dialog allows the client secret to be copied only once.

7. Click **Create**. This opens **OAuth 2.0 client created**.

<!-- screenshot: Create client with Web application and the callback template under Authorized redirect URIs -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. In **OAuth 2.0 client created**, copy **Client ID** to the approved secret store.
2. Under **Client secrets**, copy **Client secret** to the same store.
3. Keep both values for [connecting your credentials](speakeasy.md#connect-speakeasy-credentials).
4. Return to the Speakeasy AI Control Plane.

If you miss the one-time secret, delete it and create a new one before continuing.

<!-- screenshot-exception: do not capture a dialog containing a one-time secret -->
