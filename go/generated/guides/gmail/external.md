---
setup_version: 1
---

# Gmail setup

You need a Google Workspace account enrolled in the Google Workspace Developer Preview Program and a Google Cloud project registered through that program. If you do not already have a project, ask your organization's Google Cloud administrator for an existing project, its project number, and permission to enable services. Open the [Google Workspace Developer Preview Program page](https://developers.google.com/workspace/preview), submit its enrollment form with your Google Workspace account and the Google Cloud project number, and wait for Google to verify the account, add you to the program Google Group, and register the project before continuing. In the project, you need permission to enable services, such as the **Service Usage Admin** role; a project creator already has the required permission. Sign in at [console.cloud.google.com](https://console.cloud.google.com/) and select the registered project in the resource selector.

### Enable the Gmail API {#enable-gmail-api}

1. Open **APIs & Services** > **API Library**.
2. Confirm that the registered project is selected in the resource selector.
3. In **Search for APIs & Services**, enter `Gmail API`.
4. Select **Gmail API**.
5. Click **Enable**.

<!-- screenshot: the Gmail API detail page with the selected project visible and Enable ready to click -->

### Enable the Gmail MCP API {#enable-gmail-mcp-api}

1. Return to **APIs & Services** > **API Library**.
2. In **Search for APIs & Services**, enter `Gmail MCP API`.
3. Select **Gmail MCP API**.
4. Click **Enable**.

If the service is unavailable, confirm that the selected project is the project registered through the Google Workspace Developer Preview Program.

<!-- screenshot: the Gmail MCP API detail page with Enable and the selected project visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

1. Open **Google Auth Platform** > **Branding**.
2. If **Google Auth Platform not configured yet** appears, click **Get Started**.
3. Under **App Information**, enter `Gmail MCP Server` in **App name**.
4. In **User support email**, choose your email address or an appropriate Google group.
5. Click **Next**.
6. Under **Audience**, choose **Internal**. If **Internal** is unavailable, choose **External**.
7. Click **Next**.
8. Under **Contact Information**, enter an **Email address** for project notifications.
9. Click **Next**.
10. Under **Finish**, review the Google API Services User Data Policy.
11. If you accept the policy, select **I agree to the Google API Services: User Data Policy**.
12. Click **Continue**.
13. Click **Create**. This returns you to the configured Google Auth Platform.
14. If you selected **External**, open **Audience**.
15. Under **Test users**, click **Add users**.
16. Enter the email addresses that will authorize the first connection.
17. Click **Save**.
18. Open **Data Access**.
19. Click **Add or Remove Scopes**.
20. Under **Manually add scopes**, paste these scopes:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.compose
```

21. Click **Add to Table**.
22. Click **Update** to return to **Data Access**.
23. Click **Save**.

If Google Auth Platform is already configured, retain your organization's approved branding and audience. Use **Audience** to add test users when applicable, then use **Data Access** to add the required scopes.

<!-- screenshot: the Data Access scope panel with the two Gmail scope rows selected and user email addresses excluded -->

### Create the OAuth client {#create-oauth-client}

1. From Google Auth Platform, open **Clients**.
2. Click **Create Client**.
3. Set **Application type** to **Web application**.
4. Enter an organization-approved **Name**, such as `Speakeasy Gmail MCP`.
5. Under **Authorized redirect URIs**, click **+ Add URI**.
6. Enter:

```text
{{ gram.oauth.callback_url }}
```

Before you click **Create**, prepare to save the secret in an approved secret manager. Google shows and permits downloading the full client secret only at creation.

7. Click **Create**.
8. Copy the **Client ID** for the [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).
9. Copy the **Client Secret** for the [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials), and store it securely before closing the creation result.

If you closed the creation result without saving the full secret:

1. Reopen **Google Auth Platform** > **Clients**.
2. Confirm that the same project is selected.
3. Under **OAuth 2.0 Client IDs**, click the client you created.
4. Under **Client secrets**, find the missed secret.
5. Click **Disable**.
6. Click the delete button next to the disabled secret.

Prepare the approved secret manager before the next action. The new secret is visible only when it is created.

7. Click **Add Secret**.
8. Immediately copy the new secret to the approved secret manager.
9. Use the new value in Speakeasy.

<!-- screenshot: the client form showing Web application and the Authorized redirect URIs row, with organization-specific values redacted -->
