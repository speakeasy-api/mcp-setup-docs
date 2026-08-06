---
setup_version: 1
---

# Google Sheets setup

You need a Google Workspace account enrolled in the Google Workspace Developer Preview Program and access to manage APIs and Google Auth Platform configuration in the Google Cloud project registered for the preview. Google documents no paid plan requirement. Open the [Developer Preview page](https://developers.google.com/workspace/preview); the application asks for the intended Google Workspace account. Sign in to the [Google Cloud console](https://console.cloud.google.com/) with an account that can manage the project. Connect the intended Google account: the MCP Server inherits that account's existing permissions and data-governance controls, which must provide the required Google Sheets access.

### Open the registered Google Cloud project {#open-cloud-project}

1. Open the [Google Cloud console](https://console.cloud.google.com/).
2. Select the project you will register from the project selector.

If you need to create a project:

1. Open [New Project](https://console.cloud.google.com/projectcreate).
2. Enter the project name.
3. Choose the required organization or parent location.
4. Click **Create**.
5. Select the new project.

Use this project's information in the Developer Preview application.

<!-- screenshot: Google Cloud console header with the project's name in the project selector; exclude identifiers if required by capture policy -->

### Join the Developer Preview Program {#join-developer-preview}

1. Open the [Developer Preview page](https://developers.google.com/workspace/preview).
2. Select **Apply to join the Developer Preview Program**.
3. Read and accept the linked **Program Terms**.
4. Submit the application form with the requested Google Workspace account and the Google Cloud project information from the previous step. The account must be able to accept an invitation to a Google Group.
5. Wait for Google's final confirmation that it verified the Workspace account and registered the Cloud project. Google says this normally takes a couple of days. Do not continue until you receive confirmation.
6. Return to the [Google Cloud console](https://console.cloud.google.com/) and select the now-registered project from the project selector.

<!-- screenshot: Developer Preview page with the Sheets MCP Server listed under MCP SERVERS and the Apply to join the Developer Preview Program button visible; exclude application answers -->

### Enable the Google Sheets API {#enable-sheets-api}

1. With the registered project selected, open [Enable the APIs](https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com).
2. Confirm that the selected project is the Developer Preview-registered project.
3. Enable the **Google Sheets API** by clicking **Enable**.

<!-- screenshot: Google Sheets API enablement page with the project name and Enable control visible -->

### Enable the Google Sheets MCP API {#enable-sheets-mcp-api}

1. Open [Enable the MCP services](https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com).
2. Confirm that the selected project is the Developer Preview-registered project.
3. Enable the **Google Sheets MCP API** by clicking **Enable**.
4. Open [Google Auth Platform > Branding](https://console.cloud.google.com/auth/branding) for the same project.

<!-- screenshot: Google Sheets MCP API enablement page with the project name and Enable control visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

If **Google Auth Platform not configured yet** appears, complete the first-time configuration:

1. Click **Get Started**.
2. Under **App Information**, enter `Sheets MCP Server` in **App name**.
3. In **User support email**, select your email address or an appropriate Google group.
4. Click **Next**.
5. Under **Audience**, select **Internal**. If **Internal** is unavailable, select **External**.
6. Click **Next**.
7. Under **Contact Information**, enter an **Email address** for project-change notifications.
8. Click **Next**.
9. Under **Finish**, review the Google API Services User Data Policy.
10. If you accept it, select **I agree to the Google API Services: User Data Policy**.
11. Click **Continue**.
12. Click **Create**.

If you selected **External** during first-time configuration:

1. Open **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter the intended users' email addresses.
4. Click **Save**.

If Google Auth Platform is already configured:

1. Open **Audience**.
2. Check **User type** and **Publishing status**.
3. If **User type** is **External** and **Publishing status** is **Testing**:
   1. Under **Test users**, click **Add users**.
   2. Enter the intended Google account's email address.
   3. Click **Save**.
4. Whether or not you added a test user, continue at **Add the Google Sheets scopes**.

<!-- screenshot: first-time Google Auth Platform not configured yet state with Get Started, or the configured Branding page; exclude email addresses -->

### Add the Google Sheets scopes {#add-google-sheets-scopes}

1. In Google Auth Platform, select **Data Access**.
2. Select **Add or Remove Scopes**.
3. Under **Manually add scopes**, paste these four values:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/spreadsheets.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
4. Click **Add to Table**.
5. Click **Update**.
6. Back on **Data Access**, click **Save**.
7. Open **Clients > Create Client** or go directly to [Create Client](https://console.cloud.google.com/auth/clients/create).

<!-- screenshot: scope panel with Manually add scopes, Add to Table, and the four entered scope rows visible -->

### Create the OAuth client {#create-oauth-client}

1. Set the application type to **Web application**.
2. Enter an administrator-chosen **Name**, such as `Speakeasy Google Sheets`.
3. In **Authorized redirect URIs**, click **+ Add URI**.
4. Enter `{{ gram.oauth.callback_url }}` in the **URIs** field.
5. Click **Create**.
6. Copy the resulting **Client ID** and **Client Secret** for [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: create-client form with Web application, Authorized redirect URIs, and the template callback visible; redact any created credential values -->
