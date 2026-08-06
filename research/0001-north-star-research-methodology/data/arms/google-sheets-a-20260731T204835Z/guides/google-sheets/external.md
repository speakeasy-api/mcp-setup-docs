---
setup_version: 1
---

# Google Sheets setup

Use a Google Workspace account and Google Cloud project approved and registered for the [Google Workspace Developer Preview Program](https://developers.google.com/workspace/preview). If they are not approved and registered, apply with the Workspace account and Cloud project, then wait for registration approval before continuing. During the Developer Preview, authorized accounts generally must remain within the program participant's domain or company. Choose the connecting Google account carefully: the MCP server receives that account's permissions and can read, modify, and delete data available to it. You need permission to enable APIs, configure **Google Auth Platform**, and create OAuth clients in that project. Confirm the approved Model Armor configuration or documented screening alternative with the application or cloud security owner before continuing. Sign in at https://console.cloud.google.com/, then select the registered project from the toolbar's project selector.

### Enable the Google Sheets API {#enable-sheets-api}

1. Open https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com.
2. If prompted, select the registered project.
3. Enable **Google Sheets API**.

<!-- screenshot: the API enablement flow with Google Sheets API and the selected project visible -->

### Enable the Google Sheets MCP API {#enable-sheets-mcp-api}

1. Open https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com.
2. Keep the registered project selected.
3. Enable **Google Sheets MCP API**.

<!-- screenshot: the service enablement flow with Google Sheets MCP API and the selected project visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Open **Google Auth Platform** > **Branding**.

If **Google Auth Platform not configured yet** appears, complete the first-time wizard:

1. Click **Get Started**.
2. Under **App Information**, enter `Sheets MCP Server` in **App name**.
3. In **User support email**, select your email address or an appropriate Google group.
4. Click **Next**.
5. Under **Audience**, select **Internal**. If **Internal** is unavailable, select **External**.
6. Click **Next**.
7. Under **Contact Information**, enter an **Email address** that receives project-change notices.
8. Click **Next**.
9. Under **Finish**, review the Google API Services User Data Policy with your application or cloud security owner.
10. If they approve it, select **I agree to the Google API Services: User Data Policy**.
11. Click **Continue**.
12. Click **Create**.

If **Google Auth Platform** was already configured, use the existing **Branding**, **Audience**, and **Data Access** pages instead of the first-time wizard.

If **Audience** is **External**, and the app uses **Test users**, add only accounts that comply with the Developer Preview requirement that access generally remain within the program participant's domain or company:

1. Open **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter your email address and every other compliant user authorized to connect during the preview.
4. Click **Save**.

Add the required access:

1. Open **Data Access** > **Add or Remove Scopes**.
2. Under **Manually add scopes**, paste these four values:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/spreadsheets.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
3. Click **Add to Table**.
4. Click **Update**.
5. On **Data Access**, click **Save**.

<!-- screenshot: Data Access with the four manually added scopes visible -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth Platform** > **Clients** > **Create Client**, or go directly to https://console.cloud.google.com/auth/clients/create.
2. For **Application type**, select **Web application**.
3. In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
4. Under **Authorized redirect URIs**, click **+ Add URI**.
5. In **URIs**, enter `{{ gram.oauth.callback_url }}`.
6. Before continuing, have an approved password manager ready. The provider documentation does not specify whether the next dialog shows the secret only once or provide an exact recovery path.
7. Click **Create**.
8. In the resulting dialog, copy **Client ID** and **Client Secret** into the password manager.
9. If you close the dialog without storing the secret, stop and follow the current controls on the client's detail page rather than creating an undocumented replacement.
10. Continue to [connect your credentials in the Speakeasy AI Control Plane](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot-exception: do not capture the credentials dialog because it contains a secret; the preceding client form is safe to capture with the redirect value redacted -->
