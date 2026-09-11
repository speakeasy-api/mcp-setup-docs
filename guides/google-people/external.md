---
setup_version: 1
---

# Set up Google People

Use an existing Google Cloud project and an individual Google Workspace account. Sign in to the [Google Cloud console](https://console.cloud.google.com). This guide uses the Google Workspace Developer Preview Program. Keep access within your domain or company unless Google permits an exception. Do not include preview features in a public application. Government and regulatory entities, except educational institutions, must use test or experimental data, not live or production data.

For API activation, use **Service Usage Admin** or equivalent permission in the project. For consent settings and OAuth credentials, use **OAuth Config Editor** (Beta). For Model Armor settings, use **Model Armor Floor Setting Admin**. Ask an authorized administrator to do the applicable work if you do not have these permissions. An authorized organization representative must approve terms and policy acceptance.

Each connecting user needs access to the required profile, contacts, and directory data. You also need permission to add a source and attach credentials in the Speakeasy AI Control Plane.

### Join the preview program {#join-preview}

1. Obtain the Google Cloud project number from the project administrator.
2. Open [How to join the Developer Preview Program](https://developers.google.com/workspace/preview#how_to_join_the_program).
3. Review the program terms with your authorized organization representative.
4. Make sure that your applicant account can be added to Google Groups.
5. Open the application form linked in the program instructions.
6. Sign in with your individual Google Workspace account. Do not use a Gmail address, a service account, or a group address.
7. Enter your account information and the Google Cloud project number. Separate multiple project numbers with a comma and a space.
8. Submit the application with the required approval.
9. Wait for Google's final registration confirmation before you continue.

<!-- screenshot: Preview application with account information and project numbers hidden -->

### Enable the People API {#enable-people-api}

1. Open the [People API activation page](https://console.cloud.google.com/flows/enableapi?apiid=people.googleapis.com).
2. Select the registered project.
3. Enable the People API. If it is already enabled, continue to the next section.

<!-- screenshot: People API activation page with project information hidden -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Use **Internal** when it is available for the intended users. Internal access is limited to members of the Google Cloud organization associated with the project. Otherwise, use **External** with **Testing** status for permitted domain or company users.

**External Testing** permits up to 100 test users. Their authorization and refresh tokens expire seven days after consent. Users must then sign in and give consent again. This guide does not publish the application.

1. In the registered project, open **Google Auth Platform** > **Branding**.
2. For a new configuration, select **Get Started**. If a configuration already exists, check its **Branding** and **Audience**, then continue with the test users and scopes below.
3. Under **App Information**, enter `People API MCP Server` in **App name**.
4. Select **User support email**. Obtain the support and contact addresses from the application owner.
5. Select **Next**.
6. Under **Audience**, select **Internal**. If it is not available, select **External**.
7. Select **Next**.
8. Under **Contact Information**, enter the email address for project notices.
9. Select **Next**.
10. Review the Google API Services User Data Policy with the authorized organization representative.
11. With their approval, select **I agree to the Google API Services: User Data Policy**.
12. Select **Continue**.
13. Select **Create**.

For **External Testing**, add each permitted connecting user:

1. Open **Audience**.
2. Under **Test users**, select **Add users**.
3. Enter the users' email addresses.
4. Select **Save**.

For either audience, add the People scopes:

1. Open **Data Access**.
2. Select **Add or Remove Scopes**.
3. Under **Manually add scopes**, enter these values:

   ```
   https://www.googleapis.com/auth/directory.readonly
   https://www.googleapis.com/auth/userinfo.profile
   https://www.googleapis.com/auth/contacts.readonly
   ```

4. Select **Add to Table**.
5. Select **Update**.
6. Select **Save** on **Data Access**.

<!-- screenshot: Branding, Audience, and Data Access with account information hidden -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth Platform** > **Clients**.
2. Select **Create Client**.
3. Select **Web application** as the application type.
4. Enter a **Name** for the client.
5. Under **Authorized redirect URIs**, select **+ Add URI**.
6. Enter this callback value:

   ```
   {{ gram.oauth.callback_url }}
   ```

7. Select **Create**.

<!-- screenshot: Web application client form with callback field and no secret values -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. Copy **Client ID** to your approved secret store.
2. Copy **Client Secret** to the same store.
3. Keep both values for [the Speakeasy connection](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: OAuth credential field labels with all credential values hidden -->

### Approve user access {#approve-user-access}

If Workspace app controls block the application or its required access, ask an administrator with the **Service Settings administrator privilege** to do these steps:

1. In the Google Admin console, open **Security** > **Access and data control** > **API controls**.
2. Select **Manage App Access**.
3. Under **Configured apps**, select **Configure new app**.
4. Search by the OAuth client ID from [the credentials](#copy-oauth-credentials).
5. Select the application.
6. Under **Scope**, select the organizational units that contain the connecting users.
7. Select **Continue**.
8. Under **Access to Google data**, select **Specific Google data** for access limited to approved scopes.
9. Include the three People scopes from [the consent configuration](#configure-oauth-consent) and the required Google Sign-in scopes.
10. Select **Continue**.
11. Review the configuration.
12. Select **Finish**.

If users need organization directory data, ask an administrator with the **Directory settings administrator privilege** to do these steps:

1. Open **Directory** > **Directory settings** in the Google Admin console.
2. Select **Sharing settings** > **External Directory Sharing**.
3. Select **Organization data and authenticated user basic profile fields**.
4. Select **Save**.

Directory changes can take up to 24 hours. This setting does not share users' personal contacts or private profile data. Each user keeps their underlying data-access limits.

<!-- screenshot: App access controls and External Directory Sharing with user details hidden -->

### Configure Model Armor {#configure-model-armor}

Google requires screening of prompts and responses for malicious content or prompt injection. This guide uses Google's Model Armor integration. It checks supported MCP payloads, not every MCP message.

**Before you continue:** People MCP traffic can cross jurisdictions for Model Armor screening. Ask your security owner to approve the processing locations if data-residency rules apply. Review inherited floor settings before you replace them with project settings.

1. With **Service Usage Admin** permission, open the [Model Armor API activation page](https://console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com).
2. Enable the API in the registered project.
3. With **Model Armor Floor Setting Admin** permission, open **Model Armor** in the Google Cloud console.
4. Select the registered project.
5. Open **Floor settings** > **Configure floor settings**.
6. Select **Custom** unless inherited settings already provide the required protection.
7. Enable malicious URL detection, as in Google's Workspace example.
8. Set **Responsible AI – Dangerous** to **Medium and above**.
9. If the MCP traffic carries natural-language data, enable prompt injection and jailbreak detection at **High**. Do not enable this filter for traffic without natural-language data.
10. Under **Services**, select **Google MCP Server**.
11. Enable floor-setting enforcement with `INSPECT_AND_BLOCK`, as in Google's Workspace configuration.

Cloud Logging is optional. It records the entire payload and can expose sensitive data. Leave it off unless your security owner approves it. If residency rules apply and you enable logging, first ask the logging administrator to configure an approved log sink. Use [Google's log-sink procedure](https://docs.cloud.google.com/logging/docs/export/configure_export_v2). This needs **Logs Configuration Writer** on the source project and an authorized destination administrator for destination access.

12. If logging is approved and its destination is ready, select **Logs** > **Enable Cloud Logging**.
13. Select **Save floor settings**.
14. Allow a few minutes for the change before you [connect in Speakeasy](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot: Model Armor floor settings, detection values, and Google MCP Server selection -->
