---
setup_version: 1
---

# Set up Google Sheets

You need access to the Google Workspace Developer Preview Program and a Google Cloud project. If you do not already have a suitable project, obtain the project name from the Google Cloud project owner before continuing. Use an **Internal** audience only when every intended user belongs to the Google Workspace organization associated with the project; otherwise use **External** and add those users as test users. Sign in to the [Google Cloud console](https://console.cloud.google.com/) with an account that can open Google Auth Platform and enable services. The account needs `serviceusage.services.enable` on the project and `servicemanagement.services.bind` on each service. If you do not have this access, involve the Google Cloud project owner.

Before opening the Google Cloud project:

1. Open the [Google Workspace Developer Preview Program](https://developers.google.com/workspace/preview) page.
2. Select **Join the program**.
3. Sign in with the Google Workspace account that will participate.
4. Complete and submit the enrollment form.
5. Wait for Google's acceptance email before continuing. This email confirms that the account has program access.

### Open the Google Cloud project {#open-google-cloud-project}

1. Sign in to the [Google Cloud console](https://console.cloud.google.com/).
2. In the console header, open the project selector.
3. Select the Google Cloud project that will own this configuration.
4. Confirm that you can enable services and open **Google Auth Platform**.

Keep this project selected throughout setup.

<!-- screenshot: the Google Cloud console header with the intended project selected; omit project identifiers -->

### Enable the Google Sheets API {#enable-sheets-api}

1. Open Google's [Google Sheets API enable flow](https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com).
2. Confirm that the intended project is selected.
3. Complete the enable flow for **Google Sheets API**.

<!-- screenshot: the enable-API flow showing Google Sheets API and the selected project before confirmation -->

### Enable the Google Sheets MCP API {#enable-sheets-mcp-api}

1. Open Google's [Google Sheets MCP API enable flow](https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com).
2. Confirm that the same project is selected.
3. Complete the enable flow for **Google Sheets MCP API**.
4. Open [Google Auth Platform Branding](https://console.cloud.google.com/auth/branding).

<!-- screenshot: the enable-API flow showing Google Sheets MCP API and the selected project before confirmation -->

### Configure the OAuth consent screen {#configure-oauth-consent}

At **Google Auth Platform** > **Branding**, check whether the page says **Google Auth Platform not configured yet**.

If Google Auth Platform is not configured:

1. Click **Get Started**.
2. Under **App Information**, enter `Sheets MCP Server` in **App name**.
3. In **User support email**, select an appropriate email address or Google group.
4. Click **Next**.
5. Under **Audience**, select **Internal** only if every intended user belongs to the Google Workspace organization associated with the project.
6. Otherwise, select **External**.
7. Click **Next**.
8. Under **Contact Information**, enter an **Email address** that should receive project-change notifications.
9. Click **Next**.
10. Under **Finish**, review the **Google API Services User Data Policy**.
11. If your organization accepts the policy, select **I agree to the Google API Services: User Data Policy**.
12. Click **Continue**.
13. Click **Create**.

Obtain the support and notification contacts from the application or cloud-security owner.

If Google Auth Platform is already configured:

1. Review the existing settings on **Branding**, **Audience**, and **Data Access**.
2. Confirm that the audience includes the intended users.

If you selected **External**:

1. Click **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter every user who must complete the first connection.
4. Click **Save**.

To continue:

1. Click **Data Access**.
2. Click **Add or Remove Scopes**.

This opens the scopes panel.

<!-- screenshot: the Audience screen showing Internal or External and, when applicable, the Test users section; redact email addresses -->

### Add the Google Sheets scopes {#add-google-sheets-scopes}

1. Under **Manually add scopes**, paste these four scope URLs:

   ```text
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/spreadsheets.readonly
   https://www.googleapis.com/auth/spreadsheets
   ```

2. Click **Add to Table**.
3. Click **Update**.
4. Back on **Data Access**, click **Save**.
5. Open [Create Client](https://console.cloud.google.com/auth/clients/create).

<!-- screenshot: the Manually add scopes area with all four Sheets and Drive scope URLs entered, before Add to Table -->

### Create the OAuth client {#create-oauth-client}

The direct link opens **Google Auth Platform** > **Clients** > **Create Client** in the selected project.

1. In **Application type**, select **Web application**.
2. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
3. Under **Authorized redirect URIs**, click **+ Add URI**.
4. In **URIs**, enter `{{ gram.oauth.callback_url }}`.
5. Prepare to save the generated **Client ID** and **Client Secret** in a password manager or paste them directly into the Speakeasy AI Control Plane.
6. Click **Create**.
7. Copy the displayed **Client ID**.
8. Copy the displayed **Client Secret**.

If you dismiss the result before copying the secret, reopen the client from **Google Auth Platform** > **Clients**. Do not rotate or create another secret unless the console requires it.

You will use both values in [Connect your credentials](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: the Create Client form showing Web application, Name, and Authorized redirect URIs, with the callback value redacted -->
