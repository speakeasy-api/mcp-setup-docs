---
setup_version: 1
---

# Set up Google Slides

The Google Slides MCP server is in Developer Preview. Use a Google Workspace account and an existing Google Cloud project. Each connecting user must have permission to read or change the intended presentations. If access is missing, ask the person who controls presentation access for help. Cloud setup roles do not give presentation access.

Use **Service Usage Admin** to enable services, **OAuth Config Editor** to configure OAuth, and **Model Armor Floor Setting Admin** to configure project protection. If you do not have these roles, ask the authorized administrator to do the applicable steps. Company approval and Workspace application approval are separate from these Cloud roles.

Sign in to the [Google Cloud console](https://console.cloud.google.com). Use the same project for all Cloud setup steps.

### Register the project for Developer Preview {#register-developer-preview}

Keep preview applications inside your domain or company unless Google explicitly permits an exception. Do not include preview features in public applications before general availability. For government or regulatory use, use only test or experimental data. The program terms give an exception for educational institutions.

An authorized company representative must accept the program terms.

1. Open [developers.google.com/workspace/preview](https://developers.google.com/workspace/preview).
2. Read the **Developer Preview Program Terms**.
3. Under **How to join the program**, open the application link.
4. Submit the application with your Workspace account information and the existing Cloud project's **project number**.
5. Make sure the applicant's email account permits Google Groups membership. Use the **Manage your global settings** link in the program instructions if necessary.
6. Wait for the final project-registration confirmation from Google before you continue.

<!-- screenshot: Developer Preview Program page with How to join the program and the application link; hide private application data -->

### Enable the Google Slides APIs {#enable-google-slides-apis}

The person who enables these services needs **Service Usage Admin** on the registered project.

1. Select the registered project in Google Cloud.
2. Open [developers.google.com/workspace/slides/api/guides/configure-mcp-server](https://developers.google.com/workspace/slides/api/guides/configure-mcp-server).
3. Under **Enable the APIs**, use the console enablement link to enable the Google Slides API, `slides.googleapis.com`.
4. Under **Enable the MCP services**, use the console enablement link to enable the Google Slides MCP API, `slidesmcp.googleapis.com`.

If you use an administrator for service enablement, ask that person to use the documented service commands. The commands use the registered project's **project ID**, not its project number. Enable only the Slides services for this connection.

<!-- screenshot: Google Slides MCP API in the selected project; hide project-specific values -->

### Configure prompt and response screening {#configure-mcp-security}

**Warning:** Model Armor logs the entire payload. Request routing can break data-residency compliance for data in use and in transit. Floor-setting changes can affect traffic screening and safety controls across all integrated services in the project, not only MCP. The security owner must approve these effects before configuration.

This guide uses project-level Model Armor to screen prompts and responses. OAuth does not supply this protection. An authorized Cloud administrator must do the following actions. API enablement needs **Service Usage Admin**. The floor-setting change needs **Model Armor Floor Setting Admin**.

1. Ask the security owner to approve payload logging, request routing, data residency, and effects on other integrated services.
2. Ask the Cloud administrator to enable `modelarmor.googleapis.com` in the registered project.
3. Ask the Cloud administrator to apply the command under **Configure protection for Google and Google Cloud remote MCP servers** in [developers.google.com/workspace/guides/configure-mcp-security](https://developers.google.com/workspace/guides/configure-mcp-security).

Use the registered project's ID in this project floor-setting resource:

```text
projects/PROJECT_ID/locations/global/floorSetting
```

The command must use these settings:

- Floor-setting enforcement: `TRUE`.
- Integrated service: `GOOGLE_MCP_SERVER`.
- MCP enforcement: `INSPECT_AND_BLOCK`.
- Google MCP server Cloud Logging: enabled.
- Malicious-URI filtering: `ENABLED`.
- Responsible AI filter: `DANGEROUS`, with confidence level `MEDIUM_AND_ABOVE`.

Use the project-level resource, not an organization-level resource. If both client and resource projects already have floor settings, Model Armor runs twice. This setup does not require a second project.

<!-- screenshot-exception: The provider documents this selected floor-setting action as a command. -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Use **OAuth Config Editor** on the registered project. Obtain approved support and contact email addresses from the application owner. An authorized person must accept the user-data policy.

1. Open [console.cloud.google.com/auth/branding](https://console.cloud.google.com/auth/branding) in the registered project. This opens **Google Auth Platform** > **Branding**.
2. If the platform is not configured, select **Get Started**.
3. Under **App Information**, enter `Workspace MCP Servers` in **App name**.
4. Select the approved **User support email**.
5. Under **Audience**, select **Internal**. If this option is not available, select **External**.
6. Under **Contact Information**, enter the approved contact email address.
7. Under **Finish**, review the Google API Services User Data Policy.
8. With company approval, select **I agree to the Google API Services: User Data Policy**.
9. Select **Continue**.
10. Select **Create**.

For an existing configuration, use **Branding** and **Audience** to set these values. Internal users must belong to the associated organization.

For an **External** app in **Testing**, add authorized test users:

1. Open **Audience**.
2. Under **Test users**, select **Add users**.
3. Enter your email address and the email addresses of other authorized test users.
4. Select **Save**.

**Warning:** External Testing permits up to 100 listed test users. Authorization and refresh tokens expire after seven days. Another sign-in is required. Do not publish the app to avoid this limit. The Developer Preview audience limits still apply.

Set the four Slides scopes:

1. Open **Data Access**.
2. Select **Add or Remove Scopes**.
3. Under **Manually add scopes**, enter these four values:

   ```text
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/presentations.readonly
   https://www.googleapis.com/auth/presentations
   ```

4. Select **Add to Table**.
5. Select **Update**.
6. On **Data Access**, select **Save**.

The Drive scopes are part of the Slides setup. Do not add a Drive MCP connection.

<!-- screenshot: Google Auth Platform Audience and Data Access with the four Slides scopes; hide user addresses -->

### Create the OAuth client {#create-oauth-client}

1. Open [console.cloud.google.com/auth/clients](https://console.cloud.google.com/auth/clients) in the same project.
2. Under **Clients**, select **Create Client**.
3. Select **Web application** as the application type.
4. Enter a **Name** for this client.
5. Under **Authorized redirect URIs**, select **+ Add URI**.
6. Enter this value in the redirect URI field:

   ```text
   {{ gram.oauth.callback_url }}
   ```

The rendered callback URL must match exactly. Speakeasy setup confirms this value later.

**Warning:** Google shows the client secret only at creation. You cannot view or download it again. Prepare a secure store before you create the client.

Select **Create**.

<!-- screenshot: OAuth client creation with Web application and Authorized redirect URIs; hide credentials -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. Copy **Client ID** from the creation result to your secure store.
2. Copy **Client Secret** to the same store before you close the result.

Use these values in [Connect your credentials](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: OAuth creation result with both credential values fully hidden -->

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

Use this step only if Workspace policy blocks or limits the required application access. Ask a Workspace administrator with the **Service Settings administrator privilege** to do this step.

**Warning:** The top organizational unit is selected by default. A change at that level applies to the entire organization. Check the selected organizational unit before you change access.

1. Sign in to [admin.google.com](https://admin.google.com).
2. Open **Security** > **Access and data control** > **API controls** > **Manage App Access**.
3. Select the application with the **Client ID** from [Copy the OAuth credentials](#copy-oauth-credentials). Follow the [Google application-approval procedure](https://support.google.com/a/answer/7281227?hl=en).
4. Select the applicable organizational unit.
5. Set the access level approved by the application owner. Use **Specific Google data** when the required scopes meet the approved access need.

Include the Google Sign-in scopes required by the app when applicable. Do not add other Slides data scopes. Do not select **Trusted** by default or disable access controls.

Continue to [Add the server in Speakeasy](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot: Application access and selected organizational unit; hide the client ID and user data -->
