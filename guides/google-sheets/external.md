---
setup_version: 1
---

# Set up Google Sheets

Use an eligible Google Workspace account and a Google Cloud project registered for the Google Workspace Developer Preview Program. Keep this preview application within your organization. Do not include it in a public application before general availability.

For service enablement, you need **Service Usage Admin** on the project, or equivalent permission. For OAuth setup, you need **OAuth Config Editor**. For the selected security setup, you need **Model Armor Floor Setting Admin** on the applicable floor settings. If you lack access, ask an authorized person to do the applicable steps or grant the required access. A project role does not give authority to accept terms for your organization.

Each connecting user needs access to the intended spreadsheets. Workspace policy can require separate application approval. Use [Grant user access](#grant-user-access) for these conditions.

Sign in to the [Google Cloud console](https://console.cloud.google.com). Keep the same project selected throughout setup.

### Select the project {#select-project}

Obtain the project and location from your organization's cloud owner. Use an existing suitable project if one is available. If you need project role grants, ask a person with **Project IAM Admin** to grant them.

Select an existing suitable project in the Google Cloud console.

If no suitable project is available, a person with **Project Creator** at the applicable organization or folder must create one. The project ID cannot be changed after creation.

1. Open **IAM & Admin > Create a Project**.
2. Enter a descriptive **Project Name**.
3. In **Location**, select **Browse**.
4. Select the approved location.
5. Select **Create**.

<!-- screenshot: Selected project or Create a Project settings; values redacted -->

### Register for the preview {#register-preview}

The application accepts one individual Workspace-domain email address. Do not use a Gmail address, service account, or Google Group address. Make sure the account can be added to Google Groups.

Obtain the company information, project number, and terms approval from the applicable owners. The project number is not the project ID. Accept terms for your organization only if you have authority to bind it.

If you act for a government or regulatory entity, use only test or experimental data. Do not use live or production data. This condition does not apply to educational institutions.

1. Open [developers.google.com/workspace/preview](https://developers.google.com/workspace/preview).
2. Read the **Developer Preview Program Terms**.
3. Select **Apply to join the Developer Preview Program** while signed in with the eligible account.
4. Complete **Given name**, **Surname**, **Company name**, and **Company website** with the applicant and company information.
5. Enter the individual access email address in the application.
6. Enter the selected project's number in **Google Cloud Project number**.
7. Accept the program terms if you have the required authority.
8. Submit the application with its submission control.
9. Wait for the final project registration confirmation at the registered email address before use.

<!-- screenshot: Preview application with account and project number fields; values redacted -->

### Enable the Google Sheets APIs {#enable-services}

Use the project registered for preview access.

1. Open [console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com](https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com).
2. Enable **Google Sheets API**, `sheets.googleapis.com`, in the registered project with the page's enablement control.
3. Open [console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com](https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com).
4. Enable **Google Sheets MCP API**, `sheetsmcp.googleapis.com`, in the same project with the page's enablement control.

<!-- screenshot: Google Sheets API and Google Sheets MCP API enablement settings; project values redacted -->

### Configure Model Armor {#configure-security}

Google requires screening of MCP prompts and responses for malicious content and prompt injection. This guide uses Model Armor with project-level floor settings.

Obtain the filters and logging policy from the security owner. Model Armor payload logs can expose sensitive information. Do not enable payload logging without the security owner's approval. If the project needs a billing change, obtain help from the person authorized to make that change.

1. Open [console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com](https://console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com).
2. Enable the Model Armor API, `modelarmor.googleapis.com`, in the selected project with the page's enablement control.
3. In the Google Cloud console, open **Model Armor > Floor settings > Configure floor settings**.
4. Select the approved configuration option and detection settings.
5. Enable MCP sanitization with the applicable floor-setting control. Use the [documented floor-setting procedure](https://docs.cloud.google.com/model-armor/configure-floor-settings) if the visible control differs.
6. Under **Services**, select **Google MCP Server**.
7. In **Logs**, set **Enable Cloud Logging** only as approved. This option logs all user prompts, model responses, and floor-setting detector results.
8. Select **Save floor settings**.

<!-- screenshot: Project floor settings with MCP sanitization, Google MCP Server, filters, and logging settings; values redacted -->

### Configure the OAuth consent screen {#configure-oauth}

Obtain the support and contact addresses from the application owner. Use **Internal** when the project belongs to a Google Cloud Organization and the connecting users are members of that organization. If **Internal** is not available, use **External** with publishing status **Testing**. Keep test users within the same organization under the preview terms.

For **External Testing**, each authorization and refresh token expires seven days after consent. Another sign-in is then necessary. A refresh token does not remove this limit. **Testing** permits up to 100 listed test users.

If the platform is already configured, apply the settings below with its existing **Branding** and **Audience** controls. Otherwise, complete the initial setup:

1. Open **Google Auth Platform > Branding**.
2. Select **Get Started**.
3. Under **App Information**, enter `Sheets MCP Server` in **App name**.
4. In **User support email**, select the approved email address or Google group.
5. Continue to **Audience** with the visible navigation control.
6. Select **Internal**, or **External** if **Internal** is not available.
7. Continue to **Contact Information** with the visible navigation control.
8. Enter the approved email address for project notices.
9. Under **Finish**, review the Google API Services User Data Policy.
10. If you agree and have authority to accept it, select **I agree to the Google API Services: User Data Policy**.
11. Select **Continue**.
12. Select **Create**.

If you selected **External**, confirm that the publishing status in **Audience** is **Testing**. Do not publish this preview application for public use.

13. Open **Data Access**.
14. Select **Add or Remove Scopes**.
15. Under **Manually add scopes**, paste these four URLs:

    ```text
    https://www.googleapis.com/auth/drive.readonly
    https://www.googleapis.com/auth/drive.file
    https://www.googleapis.com/auth/spreadsheets.readonly
    https://www.googleapis.com/auth/spreadsheets
    ```

16. Select **Add to Table**.
17. Select **Update**.
18. On **Data Access**, select **Save**.

<!-- screenshot: Branding, Audience, and Data Access with the four Sheets scopes; account values redacted -->

### Create the OAuth client {#create-oauth-client}

Obtain the client name from the application owner. The callback must match exactly, including its scheme, case, and trailing slash.

1. Open **Google Auth Platform > Clients**.
2. Select **Create Client**.
3. Select **Web application** as the application type.
4. In **Name**, enter the approved client name.
5. Under **Authorized redirect URIs**, select **+ Add URI**.
6. In **URIs**, enter this value:

   ```text
   {{ gram.oauth.callback_url }}
   ```

7. Select **Create**.
8. Copy the **Client ID** for the [Speakeasy credential setup](speakeasy.md#connect-speakeasy-credentials).
9. Copy the **Client Secret** for the same setup.

<!-- screenshot: Web application client settings and credential labels; callback and credential values redacted -->

### Grant user access {#grant-user-access}

For **External Testing**, the person with **OAuth Config Editor** must add each eligible connecting user:

1. In **Google Auth Platform**, open **Audience**.
2. Under **Test users**, select **Add users**.
3. Enter the email addresses of the eligible users in the same organization.
4. Select **Save**.

If Workspace policy blocks the application or required data access, ask a Workspace administrator with the **Service Settings** privilege to do the following steps. Obtain the approved organizational units and data access policy from the Workspace security owner. Use the [client ID created above](#create-oauth-client).

1. In the **Google Admin console**, open **Security > Access and data control > API controls > Manage App Access**.
2. Under **Configured apps**, select **Configure new app**.
3. Enter the OAuth client ID in the app search field.
4. Select **Search**.
5. Select the application.
6. Under **Scope**, use **Select org units > Include organizations > Select** to select the approved organizational units.
7. Select **Continue**.
8. Under **Access to Google data**, select the approved setting that permits the [four Sheets scopes](#configure-oauth). Use **Specific Google data** if the approved policy limits access to specified scopes. Include any Google Sign-in scopes required by the application.
9. Select **Continue**.
10. Review the settings.
11. Select **Finish**.

If the connecting user lacks spreadsheet access, ask the file owner or another person permitted to share the file to do these steps:

1. In Google Drive, select the spreadsheet.
2. Select **Share**.
3. Enter the connecting user's email address.
4. Select **Viewer** for read tasks or **Editor** for changes.
5. Complete sharing with the visible confirmation control.

An editor can share a file only when the file controls permit it. Existing file and folder permissions still apply. OAuth consent does not grant access to an otherwise inaccessible spreadsheet.

<!-- screenshot: Test users, conditional app access settings, and spreadsheet sharing settings; user and client values redacted -->
