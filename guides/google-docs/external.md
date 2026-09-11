---
setup_version: 1
---

# Google Docs setup

Use a Google Workspace account and a Google Cloud project registered for the Google Workspace Developer Preview Program. This guide configures Google's remote Docs MCP server for a trial with the registered account. Sign in to [console.cloud.google.com](https://console.cloud.google.com/) with the account that has the required project permissions.

Use existing permissions where sufficient. **Service Usage Admin** permits API activation. **OAuth Config Editor** (Beta) permits consent-screen, test-user, and OAuth client configuration. **Model Armor Floor Setting Admin** permits the security configuration below. A person with authority to bind your organization must accept the applicable terms. Obtain security-policy approval separately from technical access.

### Select the project {#select-project}

1. Select the project that you will register for the trial. Use a suitable existing project if available.
2. If you need a new project, ask a person with **Project Creator** or equivalent project-creation permission to create it. Open **IAM & Admin > Create a Project**. Enter a **Project Name**. Under **Location**, click **Browse**. Select the approved organization or location. Click **Select**, then **Create**.
3. Record the project ID for registration and the security commands below.
4. If setup permissions are missing, ask the project access administrator to grant only the applicable roles on this project. **Project IAM Admin** permits these grants. Alternatively, ask an authorized person to do the applicable setup steps.

Do not request project-creation or IAM administration permissions if you do not perform those actions. Do not request organization-wide access for this trial.

<!-- screenshot: Project selection and the selected project ID; no private identifiers. -->

### Register for Developer Preview {#register-preview}

Before you apply, read the [Developer Preview Program Terms](https://developers.google.com/workspace/preview). Do not include Preview features in public applications before general availability. Do not give users outside your domain or company access unless Google grants the stated permission to your Workspace account.

For a government or regulatory entity, use only test or experimental data. Do not use live or production data. This restriction excludes educational institutions.

1. Open the [Developer Preview program page](https://developers.google.com/workspace/preview).
2. Under **How to join the program**, open the **application form**.
3. Enter the Google Workspace account and Google Cloud project information. Accept the terms only if you agree and have the applicable authority.
4. Make sure that the account accepts Google Groups membership.
5. Wait for Google to verify the account and send the group notification.
6. Wait for final project registration confirmation at the registered email address before you continue.

API activation does not replace Preview registration. Use the registered account for this trial. Preview admission requirements for additional users are not established.

<!-- screenshot: Developer Preview application entry; no personal information. -->

### Enable the Google Docs services {#enable-services}

1. Open [console.cloud.google.com/flows/enableapi?apiid=docs.googleapis.com](https://console.cloud.google.com/flows/enableapi?apiid=docs.googleapis.com). Select the registered project and enable **Google Docs API** (`docs.googleapis.com`).
2. Open [console.cloud.google.com/flows/enableapi?apiid=docsmcp.googleapis.com](https://console.cloud.google.com/flows/enableapi?apiid=docsmcp.googleapis.com). Select the same project and enable **Google Docs MCP API** (`docsmcp.googleapis.com`).

Enable only these two Docs services for this connection.

<!-- screenshot: The selected project and the Docs API activation controls. -->

### Configure security screening {#configure-screening}

Google requires screening of prompts and responses for malicious content and prompt injection. This guide uses Model Armor. Google also permits your own documented solution if users accept its risk. That alternative is not part of this procedure.

**Before you change the floor setting:** Ask the security owner to review existing and inherited settings. A floor setting defines minimum project security filters. **Custom** settings replace inherited floor settings. Do not weaken an existing policy to match this example. Changes can affect all integrated services in the project, not only Docs MCP.

The Model Armor MCP integration is Preview. Ask the billing owner to review [Model Armor pricing](https://cloud.google.com/security/products/model-armor#pricing). Pricing depends on prompt and response tokens. This guide does not establish a price, allowance, or entitlement.

If your organization has data-location requirements, obtain security approval before you continue. Feature availability varies by region. MCP routing can violate data residency requirements for data in use or in transit. The global configuration endpoint below does not establish the inspection location.

1. Open [console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com](https://console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com). Select the registered project and enable the Model Armor API.
2. Open the [Model Armor page](https://console.cloud.google.com/projectselector2/security/modelarmor?supportedpurview=organizationId,folder,project). Select the same project.
3. Open **Floor settings > Configure floor settings**.
4. Select **Custom** after the security owner approves the project policy.
5. Under **Detections**, enable **Malicious URL detection**.
6. Enable **Prompt injection and jailbreak detection**. Select **High** confidence. Docs natural-language content requires this detection.
7. Under **Responsible AI**, select **Dangerous** with **Medium and above** confidence.
8. Under **Services**, select **Google MCP Server**.
9. Review the language settings with the security owner. Keep payload logging disabled. If enabled, it records the entire payload and can expose sensitive information.
10. Click **Save floor settings**. Allow a few minutes for the changes to take effect.
11. Open [Cloud Shell](https://console.cloud.google.com/?cloudshell=true) in the Google Cloud console. Cloud Shell supplies the Google Cloud CLI. It is an administration tool, not a local MCP server.
12. Run this command to select the global floor-setting control endpoint:

    ```sh
    gcloud config set api_endpoint_overrides/modelarmor "https://modelarmor.googleapis.com/"
    ```

13. Replace `PROJECT_ID` with the registered project ID. Run this command to enforce inspection and block matching MCP content:

    ```sh
    gcloud model-armor floorsettings update \
      --full-uri='projects/PROJECT_ID/locations/global/floorSetting' \
      --enable-floor-setting-enforcement=TRUE \
      --add-integrated-services=GOOGLE_MCP_SERVER \
      --google-mcp-server-enforcement-type=INSPECT_AND_BLOCK \
      --malicious-uri-filter-settings-enforcement=ENABLED \
      --add-rai-settings-filters='[{"confidenceLevel": "MEDIUM_AND_ABOVE", "filterType": "DANGEROUS"}]'
    ```

`INSPECT_AND_BLOCK` blocks tool calls and responses that match the filters. The default `INSPECT_ONLY` does not provide this blocking. The console steps above configure prompt injection detection; the command does not replace that selection.

If the client and resource use different projects, Google permits floor settings in both. This causes two Model Armor inspections. A second project configuration is not required for every setup.

<!-- screenshot: Model Armor floor settings with selected detections and Google MCP Server; Cloud Shell command with an example project placeholder, not credentials. -->

### Configure the OAuth consent screen {#configure-oauth}

Obtain the support email and project notice email from the application owner. Use **Internal** where available and applicable. Otherwise, use **External** with **Testing** status. This guide does not select External production publication.

1. In the registered project, open **Google Auth Platform > Branding**.
2. If no configuration exists, click **Get Started**.
3. Under **App Information**, enter `Docs MCP Server` in **App name**.
4. Select the **User support email**. Click **Next**.
5. Under **Audience**, select **Internal**. If unavailable, select **External**. Click **Next**.
6. Under **Contact Information**, enter the project notice email address. Click **Next**.
7. Under **Finish**, review the Google API Services User Data Policy. If authorized and in agreement, select **I agree to the Google API Services: User Data Policy**. Click **Continue**, then **Create**.
8. If you selected **External**, add the test users as specified in [Arrange user access](#grant-user-access).
9. Open **Data Access > Add or Remove Scopes**.
10. Under **Manually add scopes**, enter all four documented scopes:

    ```text
    https://www.googleapis.com/auth/drive.readonly
    https://www.googleapis.com/auth/drive.file
    https://www.googleapis.com/auth/documents.readonly
    https://www.googleapis.com/auth/documents
    ```

11. Click **Add to Table**, then **Update**.
12. On **Data Access**, click **Save**.

**Testing limit:** For an External app in Testing with these scopes, Google refresh tokens expire after seven days. Offline access does not remove this limit.

<!-- screenshot: Branding, Audience, and Data Access with no personal email addresses. -->

### Arrange user access {#grant-user-access}

For **External**, an **OAuth Config Editor** must add named test users:

1. Open **Google Auth Platform > Audience > Test users > Add users**.
2. Add the authorized test-user email addresses. Include the registered Workspace account used for this trial.
3. Click **Save**.

OAuth consent does not grant document access. The connecting account needs read permission to read a document and edit permission to change it. If access is missing, ask the document owner or an editor with sharing permission to do these steps:

1. In Google Drive, select the document and **Share**.
2. Enter the connecting user's email address.
3. Select **Viewer** for read access or **Editor** for edit access.
4. Select **Send** or **Share**.

Organization rules can restrict sharing outside the organization. An owner can also restrict an editor's sharing permission.

<!-- screenshot: Test users and document access, with identities removed. -->

### Create the OAuth client {#create-oauth-client}

1. In the registered project, open **Google Auth Platform > Clients > Create Client**.
2. Select **Web application** as the application type.
3. Enter a **Name** for the client.
4. Under **Authorized redirect URIs**, click **+ Add URI**.
5. Enter this value:

    ```text
    {{ gram.oauth.callback_url }}
    ```

6. Prepare secure storage for the client credentials before you create the client. Copy the secret when Google shows it.
7. Click **Create**.
8. Copy **Client ID** and **Client secret**. Store them securely for [Connect your credentials](speakeasy.md#connect-speakeasy-credentials).

The callback must match exactly, including the scheme, case, and trailing slash. Do not use another client's callback.

<!-- screenshot: Web application type and authorized redirect URI; client secret fully hidden. -->

### Permit the application if access is blocked {#permit-application}

Do this only if Workspace policy blocks the OAuth client or its required scopes. Ask an administrator with the **Service Settings administrator privilege** to make the change. This action does not require a super administrator.

Obtain the approved organizational units and scope policy from the Workspace security owner. Use the client ID from [Create the OAuth client](#create-oauth-client) to identify the application.

1. In the Google Admin console, open **Security > Access and data control > API controls > Manage App Access**.
2. For **Configured apps**, click **Configure new app**.
3. Enter the OAuth client ID. Click **Search** and select the application.
4. Under **Scope**, select the approved organization or organizational units. Click **Continue**.
5. Under **Access to Google data**, select the approved setting. Use **Specific Google data** if the approved scopes are sufficient. Include the required Google Sign-in scopes. Do not select **Trusted** by default; it permits all Google services, including restricted services. **Limited** permits only unrestricted services. **Blocked** permits no access.
6. Click **Continue**.
7. Review the configuration. Click **Finish**.

This policy change does not replace user consent or document permissions. Continue with [Speakeasy setup](speakeasy.md#add-server-in-speakeasy).

<!-- screenshot: Admin API controls for the selected client and organizational unit; identities hidden. -->
