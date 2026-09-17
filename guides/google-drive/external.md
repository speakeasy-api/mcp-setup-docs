---
setup_version: 1
---

# Google Drive setup

Use Google's remote Drive MCP server with the Speakeasy AI Control Plane. This service is in the **Google Workspace Developer Preview Program**. Use an existing Google Cloud project and a Google Workspace account approved for the program.

Sign in to the [Google Cloud console](https://console.cloud.google.com/). You need **Service Usage Admin** on the project to enable services and **OAuth Config Editor** (Beta) to configure OAuth. Ask the project IAM administrator for missing roles. These roles do not give authority to accept terms for your organization.

Do not include preview features in a public application. Do not give access outside your domain or company unless Google expressly permits the request and grants permission for this feature. Government and regulatory entities, except educational institutions, must use only test or experimental data, not live or production data.

### Enroll in Developer Preview {#enroll-preview}

1. Open the [Developer Preview Program page](https://developers.google.com/workspace/preview).
2. Read **Program Terms**. Ask an authorized representative to accept organizational terms if you cannot do so.
3. Open **Apply to join the Developer Preview Program**.
4. Supply the requested Workspace account and Cloud project information. Obtain these values from their owners.
5. Make sure the submitted email account can be added to Google Groups.
6. Wait for Google's final project registration confirmation at that email address before you continue.

<!-- screenshot: the Developer Preview Program application link and enrollment requirements -->

### Confirm security screening {#confirm-screening}

Ask the application or security owner to confirm that your existing solution screens MCP prompts and responses for malicious content and prompt injection. Require documentation so users can accept its risk. Do not continue without this screening. This guide does not configure a new screening service or claim that the Control Plane supplies it automatically. See [Google's MCP security requirements](https://developers.google.com/workspace/guides/configure-mcp-security).

<!-- screenshot-exception: the existing screening solution is specific to the organization -->

### Enable the Drive services {#enable-drive-services}

1. Select the registered project in the [Google Cloud console](https://console.cloud.google.com/).
2. Enable the [Google Drive API](https://console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com) for that project.
3. Enable the [Google Drive MCP API](https://console.cloud.google.com/flows/enableapi?apiid=drivemcp.googleapis.com) for the same project.

<!-- screenshot: the Google Drive MCP API enablement page with the selected project -->

### Configure the consent screen {#configure-consent}

Obtain the support email address, project contact address, and approved user addresses from the application owner.

1. Open **Google Auth Platform > Branding** in the selected project.
2. If Google Auth Platform is not configured, select **Get Started**.
3. Under **App Information**, enter `Drive MCP Server` in **App name**.
4. Select the appropriate **User support email**.
5. Select **Next**.
6. Under **Audience**, select **Internal**. If unavailable, select **External**.
7. Select **Next**.
8. Under **Contact Information**, enter the project contact **Email address**.
9. Select **Next**.
10. Under **Finish**, review the linked policy. An authorized person must select **I agree to the Google API Services: User Data Policy**.
11. Select **Continue**.
12. Select **Create**.

For an existing configuration, use **Branding**, **Audience**, and **Data Access** to set the applicable values.

For **External**, keep this setup in **Testing**. Add only users permitted by the preview terms:

1. Open **Audience**.
2. Under **Test users**, select **Add users**.
3. Enter your email address and the other authorized test-user addresses.
4. Select **Save**.

**Testing is limited to 100 listed test users. With these Drive scopes, test authorization and refresh tokens expire after seven days. Users must then sign in again.** Internal users must belong to the application's Google Cloud organization. An External audience does not remove the preview limits.

Add the two documented Drive scopes:

1. Open **Data Access**.
2. Select **Add or Remove Scopes**.
3. Under **Manually add scopes**, enter:

   ```text
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   ```

4. Select **Add to Table**.
5. Select **Update**.
6. On **Data Access**, select **Save**.

<!-- screenshot: Data Access with the two Drive scopes and Audience with approved test users -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth Platform > Clients**.
2. Select **Create Client**.
3. Select **Web application** as the application type.
4. Enter a **Name** for this connection.
5. Under **Authorized redirect URIs**, select **+ Add URI**.
6. Enter:

   ```text
   {{ gram.oauth.callback_url }}
   ```

7. Select **Create**.
8. Copy the **Client ID** and **Client Secret** to an approved secure store. Do not put the secret in a ticket or shared document. You need both values in [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

The callback address must match exactly, including its scheme, case, and final slash. The Control Plane requests offline access and consent automatically. Do not add an `offline_access` scope.

Google or your organization can end access. Users might need to sign in again.

<!-- screenshot: the Web application client and redirect URI; hide the secret -->

### Confirm user access {#confirm-user-access}

1. Confirm that each connecting user has Google Drive service access. If access is off, ask an administrator with the **Drive & Docs administrator privilege** to enable it under **Apps > Google Workspace > Drive and Docs > Service status** for the approved user scope.
2. Confirm that users have access to the required files and folders. Ask the file owner or a person with sharing authority for missing access. A shared-drive **Manager** can manage shared-drive membership. At least reader access is needed for file eligibility; it does not permit every write operation.
3. If Workspace API controls block the application or its Drive scopes, ask an administrator with the **Service Settings administrator privilege** to configure application access in **API controls**. Supply the OAuth client ID from [Create the OAuth client](#create-oauth-client). Approval must permit the two requested Drive scopes for the applicable users.

File access alone is not sufficient. DLP policies that block download, copy, or print can make files ineligible. Context-Aware Access can block the client context, including offline operations when context is missing. Client-side encrypted files, spam or malware, and items in the trash are ineligible. Folder contents and shortcut targets must each pass the checks.

An ineligible file can be absent from search results even when the user can see it in Drive. See [Drive MCP file eligibility](https://developers.google.com/workspace/drive/api/guides/drive-mcp-server-file-eligibility).

<!-- screenshot: Workspace application access settings for the client ID; hide user-specific values -->
