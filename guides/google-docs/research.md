---
research_version: 1
slug: google-docs
researched_at: 2026-09-11T19:52:38Z
---

# Google Docs — Research Dossier

## Run status

Research and reconciliation are complete for the selected trial path. The endpoint gate passed in the interrupted run. Reused reports: Topic 5, Topic 3, and the unchanged findings in Topics 1, 2, and 4. Recovery round 1 completed the Model Armor procedure and the OAuth compatibility assessment. Round 2 completed the final Topic 1 authority audit. No third factual round ran.

Provider: Google. Service: Google Docs. Slug: `google-docs`. Mode: update. Output: `/workspace/guides/google-docs/`. Reader: `doctrine/personas/it-admin.md`. Client: Speakeasy AI Control Plane. Original guide instructions were not used as evidence. Only identity metadata was read. The saved sourced trial reports are the provider evidence.

Write all guide text in ASD-STE100 Simplified Technical English. Use the provider's documented level of detail. Missing screenshots or incidental UI transitions do not block the draft. Keep technical labels unchanged.

## Server facts

- Remote MCP URL: `https://docsmcp.googleapis.com/mcp/v1`. Fixed address; do not substitute a general Docs API URL or add a project ID. Source: T5-01.
- Server name: `docs`. Google documents HTTP and OAuth 2.0. No local process, proxy, or bridge is selected. Cloud Shell is only an administration surface for the security configuration.
- The Docs-only path enables `docs.googleapis.com` and `docsmcp.googleapis.com`. Do not enable every Workspace MCP service. Sources: T2-04, T5-02.
- This is a Developer Preview trial. Use the registered Google Workspace account and Google Cloud project. Wait for final registration confirmation. Keep the terms and use restrictions in T2-02/03. Other Workspace service endpoints are evidence only, not additional connections in this guide.
- Each connecting user needs document permissions for the intended operation. OAuth consent does not grant document access. The trial uses the registered account; separate preview admission for every additional user is not established. Source: T3.

## Credential flow

Selected path: manual OAuth registration with refresh tokens. Create a **Web application** in the registered project. Select **Internal** where available and applicable. Otherwise, use **External** in **Testing** and add named test users. Production External publication is not selected.

Register `{{ gram.oauth.callback_url }}` directly in **Authorized redirect URIs**. Copy **Client ID** and **Client secret** when shown. Store the secret securely. Do not add renewal or rotation instructions. In the Control Plane, select **Client Type > Manual**, supply both credentials, and confirm the displayed **Redirect URI** matches the registered value.

Google issuer: `https://accounts.google.com`. Discovery: `https://accounts.google.com/.well-known/openid-configuration`. Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`. Token endpoint: `https://oauth2.googleapis.com/token`. Select `client_secret_post` for **Token Endpoint Auth Method**. The pinned implementation supports this method on initial exchange and refresh.

Use these four documented scopes in the consent screen and as the space-separated **Scope (override)** value:

```text
https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/documents
```

Leave **Audience (optional)** empty: no separate audience override is established for the selected path. Do not confuse this client field with the Google Auth Platform **Audience** user-type selection.

The client automatically requests `access_type=offline` and `prompt=consent` for the Google issuer. It encrypts, stores, and uses returned refresh tokens. Do not turn these implementation behaviors into setup steps. Sources: updated T4 and central client evidence.

Warning: With External Testing, refresh tokens expire after seven days. Another sign-in can be necessary. Other revocation and time-based access limits can also end access; do not promise permanent access. Keep the initial sign-in and consent steps. Do not add credential-maintenance procedures.

## Canonical setup actions and authority

This table is the single action plan. Evidence sections below preserve quotations and topic findings. Repeated source procedures are not extra setup actions.

| Anchor | Action and applicability | Actor and authority | Evidence |
| --- | --- | --- | --- |
| select-project | Use the registered project; create a project only if needed. Obtain missing setup permissions. | Existing task permissions; Project Creator only for creation; Project IAM Admin only for role grants. | T2-01; T1-04/05 |
| register-preview | Submit Workspace account and project; accept terms; wait for Google confirmation. | Applicant; a person authorized to bind the entity accepts terms. | T2-02/03; T1-03 |
| enable-services | Enable Docs API and Docs MCP API in the project. | Service Usage Admin or equivalent service enablement permission. | T2-04; T1-01; T5-02 |
| configure-screening | Use the selected Model Armor project floor setting; enable its API, configure detection, and enforce MCP inspection and blocking. | Service Usage Admin for API; Model Armor Floor Setting Admin for floor setting; security owner approves policy effect. | Updated T2-08/10/11; T1-01/06 |
| configure-oauth | Configure Branding, user type, and the four scopes. | OAuth Config Editor; authorized person accepts data policy. | T2-05; T4-02; T1-02/03 |
| grant-user-access | Add External test users if applicable; arrange missing document access. | OAuth Config Editor for test list; document owner or authorized editor for sharing. | T3; T1-02/08 |
| create-oauth-client | Create Web application; register callback; copy ID and secret. | OAuth Config Editor. | T4-03; T2-06; T1-02 |
| permit-application | Only if Workspace policies block the OAuth client or scopes, configure access for the applicable users. | Administrator with Service Settings privilege. Do not require a super administrator merely for this action. | T2-07; T3; T1-07 |

The final audit covers all these actions, including conditional project creation and IAM grants. The Control Plane configuration needs project write access independently of Google roles. Do not invent a reader-facing Control Plane role name from that implementation permission.

## Console walkthrough

Use the current procedural details in the corresponding complete evidence sections below. All eight anchors must appear in `external.md`. Do not add duplicate steps for the same operation.

### Select the project {#select-project}

Use T2-01 and audited T1-04/05. Preserve the conditional nature of project creation and IAM grants. A suitable existing project is sufficient. Screenshot note: Project selection and the selected project ID; no private identifiers.

### Register for Developer Preview {#register-preview}

Use T2-02/03. Keep the application form source, group acceptance condition, account verification, project registration confirmation, and applicable trial restrictions. Screenshot note: Developer Preview application entry; no personal information.

### Enable the Google Docs services {#enable-services}

Use T2-04 and T5-02. Enable only the two Docs services. Screenshot note: The selected project and the Docs API activation controls.

### Configure security screening {#configure-screening}

Use updated T2-08/10/11 and audited T1-06. Model Armor is the selected option, not the only permitted solution. The guide can state that Google permits a documented alternative, but it must not switch to an unverified alternative path.

Use the project floor-setting console controls for malicious URL detection and prompt injection/jailbreak detection. Docs natural-language content meets the documented condition for prompt injection detection. Use **High** confidence for that detection and the documented Dangerous filter at Medium and above. Select **Google MCP Server**, save the floor setting, and allow a few minutes.

Use the documented Cloud Shell global endpoint override and MCP `floorsettings update` settings to set enforcement and `INSPECT_AND_BLOCK`. Do not invent a prompt injection CLI flag. Do not include `--enable-google-mcp-server-cloud-logging` from the optional logging example. Keep payload logging disabled in the selected console setting. Explain that project settings can affect other integrated services. Keep cost, Preview, inherited-policy, and data-location conditions; do not claim that the global control endpoint determines inspection location.

Screenshot note: Model Armor floor settings with selected detections and Google MCP Server; Cloud Shell command with an example project placeholder, not credentials.

### Configure the OAuth consent screen {#configure-oauth}

Use T2-05 and T4-02. Preserve the documented navigation and four scopes. Use Internal where applicable; otherwise External Testing. Screenshot note: Branding, Audience, and Data Access with no personal email addresses.

### Arrange user access {#grant-user-access}

Use T3 and T4-02. Add named External test users when needed. Use the registered Workspace account for this trial. Users need the underlying permissions to read or edit the target documents. Screenshot note: Test users and document access, with identities removed.

### Create the OAuth client {#create-oauth-client}

Use T4-03 and T2-06. Both credential metadata fields must link to this anchor. Register the callback template; copy and securely store credentials when shown. Screenshot note: Web application type and authorized redirect URI; client secret fully hidden.

### Permit the application if access is blocked {#permit-application}

Use T2-07, T3, and audited T1-07. Keep this conditional. Do not require broad Trusted access if a documented narrower policy permits the required scopes. Use the OAuth client ID to identify the correct application. Screenshot note: Admin API controls for the selected client and organizational unit; identities hidden.

## Speakeasy setup

Use custom remote only, with `speakeasy_add_server: custom-remote`. A catalog lookup is not needed for this explicit documented remote route. The final guide must use both fixed anchors below and end with the provider documentation pointer.

### Add the server in Speakeasy {#add-server-in-speakeasy}

Render the custom-remote variant of the canonical doctrine below with URL `https://docsmcp.googleapis.com/mcp/v1`.

### Connect your credentials {#connect-speakeasy-credentials}

Render the manual OAuth variant. Both credential fields come from `external.md#create-oauth-client`. Configure the Google issuer and use **Endpoints > Discover** for Google authorization-server metadata if it is not already filled. Remote resource discovery is not assumed. Set Manual, the ID and secret, `client_secret_post`, and the scope override above. Follow the provider browser authorization prompts as the eligible registered account when the connection needs access. Confirm callback match. Do not name provider consent buttons that the evidence does not establish.

Final line: For more detail, see [Google Docs's MCP documentation](https://developers.google.com/workspace/docs/api/guides/configure-mcp-server).

## Research limitations

- No authenticated end-to-end Google connection was tested. Preview enrollment and actual organization permissions remain reader-specific actions.
- Client implementation tests were read, not run. No concrete deployed-release mismatch was identified.
- Additional users' individual preview admission is not fully documented. This guide limits the trial to the registered account.
- External production publication is outside this path. External Testing has a seven-day refresh-token limit.
- Model Armor region, billing, policy inheritance, and data location need the reader's environment review. The evidence does not assert a numeric price or a fixed inspection region. Do not omit this review.
- Client-native screening was not established. The selected Model Armor path resolves Google's screening requirement without claiming lack of client support.
- Screenshot images were not captured. Draft placeholders are permitted. Missing presentation details are non-blocking.
- The copied workspace has no Git metadata. No commits, publication, or PR actions are authorized. No automated reviewer agents ran.

## Operator decisions

None prevents this documented trial path. Select the reader's project, eligible account, permitted document access, and approved security settings during setup. Do not assume approval has already occurred.

## Provenance

The official starting site was https://developers.google.com/workspace. The service-specific source is https://developers.google.com/workspace/docs/api/guides/configure-mcp-server. Evidence includes Google Workspace developer documentation, Google Cloud product and IAM documentation, Google Admin and Docs support pages, Google OAuth documentation and discovery metadata, and the pinned official client implementation. Exact locations, dates, and quotations follow. Source statements are separate from interpretations.


## Topic 1 evidence

## Topic and status

**Topic 1: Setup permissions and administrative access — complete.**

The final audit covers the selected Developer Preview trial, manual OAuth application, Model Armor project floor setting, and conditional Workspace application approval. Official Google sources establish a concrete authority path for these actions.

Use the limited project roles below. Do not require project Owner access. If the reader already has the required permissions, another role grant is not necessary.

**Observation date:** 2026-09-11. Unchanged findings retain their original observation date of 2026-09-11. This follow-up checked live official sources for the selected additional actions. No provider settings, credentials, or files were changed.

### Changes from the previous report

- **T1-01:** Retained and extended to Model Armor API enablement.
- **T1-02:** Retained. The final audit confirms coverage for audience, scopes, and test users.
- **T1-03:** Retained and extended to the consent-screen User Data Policy action.
- **T1-04:** Retained.
- **T1-05:** Retained and extended to the Model Armor floor-setting role grant.
- **T1-06:** New. Establishes Model Armor project floor-setting authority.
- **T1-07:** New. Resolves the earlier Workspace application access-policy authority question.
- **T1-08:** New. Separates document-sharing authority from project setup authority.
- The earlier questions about optional security-service authority and the final selected actions are replaced by the findings and audit below.

## Findings

### T1-01 — Enable the selected APIs with service enablement permission

- **Status:** Required for the selected path. Model Armor API enablement applies because Model Armor is selected.
- **Who acts:** A person with service enablement permission.
- **Who receives access and scope:** The selected Google Cloud project receives access to the services.
- **Action and values:** Enable:
  - `docs.googleapis.com`
  - `docsmcp.googleapis.com`
  - `modelarmor.googleapis.com`
- **Environment value:** Use the Google Cloud project selected and registered for the trial.
- **Authority:** **Service Usage Admin**, `roles/serviceusage.serviceUsageAdmin`, supplies `serviceusage.services.enable`. A person who already has that permission can perform the action.

**Sources and exact quotations**

1. https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
   Locations: **Enable the APIs** and **Enable the MCP services**.  
   Observed: 2026-09-11.
   - “Google Docs API”
   - “Google Docs MCP API”
   - “Replace PROJECT_ID with your Google Cloud project ID.”

2. https://cloud.google.com/service-usage/docs/access-control  
   Locations: service enablement permission table and **Service Usage Admin**.  
   Original observation retained: 2026-09-11.
   - “On the project: serviceusage.services.enable”
   - “On the service: servicemanagement.services.bind”
   - `roles/serviceusage.serviceUsageAdmin`

3. https://docs.cloud.google.com/model-armor/configure-floor-settings  
   Location: **Enable APIs > Roles required to enable APIs**.  
   Live check: 2026-09-11.
   - “You must enable the Model Armor API before you can use Model Armor.”
   - “To enable APIs, you need the serviceusage.services.enable permission.”
   - “Otherwise, you can get this permission through the Service Usage Admin role (roles/serviceusage.serviceUsageAdmin).”

**Interpretation:** The project role covers enablement of all three selected APIs. The service-side permission in the shared table does not establish a separate customer grant action for these Google services. Follow the documented enablement procedures. API enablement does not give the connecting user document access.

### T1-02 — Use OAuth configuration write access for the application

- **Status:** Required for the selected manual OAuth application.
- **Who acts:** A person with OAuth configuration write access.
- **Who receives access and scope:** The OAuth application in the selected Google Cloud project receives its configuration and credentials.
- **Authority:** **OAuth Config Editor**, `roles/oauthconfig.editor`. The current role reference marks this role **Beta**.
- **Covered actions:**
  - Configure Branding, support email, contact email, and audience.
  - Select **Internal** where available and applicable; otherwise use the selected **External Testing** trial.
  - Add the documented scopes.
  - Add named test users for External Testing.
  - Create and configure the **Web application** OAuth client.
  - Register the authorized redirect URI.
  - Obtain the client ID and client secret.
- **Required scope values:**
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/documents.readonly`
  - `https://www.googleapis.com/auth/documents`
- **Environment values:** The application owner supplies email addresses and test-user addresses. Speakeasy supplies the actual callback represented by `{{ gram.oauth.callback_url }}`. Google supplies the client ID and secret.

**Sources and exact quotations**

1. https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
   Locations: **Set up the OAuth consent screen** and **Configure your MCP client > Claude**.  
   Observed: 2026-09-11.
   - “You must configure the OAuth consent screen before you can create an OAuth client ID.”
   - “Under Audience, select Internal. If you can't select Internal, select External.”
   - “Under Test users, click Add users.”
   - “Under Manually add scopes, paste the scopes for the Google Docs MCP server”
   - “Select Web application as the application type.”
   - “Click Create and copy your Client ID and Client Secret.”

2. https://cloud.google.com/iam/docs/roles-permissions/oauthconfig  
   Location: **OAuth Config Editor**.  
   Live check: 2026-09-11.
   - “Read/write access to OAuth config resources”
   - `roles/oauthconfig.editor`
   - `clientauthconfig.brands.create`
   - `clientauthconfig.brands.update`
   - `clientauthconfig.clients.create`
   - `clientauthconfig.clients.createSecret`
   - `clientauthconfig.clients.update`
   - `oauthconfig.testusers.update`
   - `oauthconfig.verification.submit`

**Interpretation:** The documented read/write role supports the selected OAuth configuration actions, including scopes and test users. This conclusion uses the role description and its listed permissions, not an assumption that client creation permits all administration. Verification submission remains in the retained role evidence, but External production verification is not selected.

The role does not establish authority to accept terms for an organization, change Workspace application access policy, or grant project roles.

### T1-03 — Separate terms acceptance from technical administration

- **Status:** Required. Entity-level authority applies when the setup is for an organization.
- **Who acts:** The applicant submits the preview application. A person with authority to bind the organization accepts the applicable terms.
- **Scope:** The organization’s use of the APIs and the application’s access to Google user data.
- **Actions:**
  - Read and accept the Developer Preview Program Terms.
  - Submit the Workspace account and Google Cloud project information.
  - During consent-screen setup, review the Google API Services User Data Policy. Select its agreement check box only with the applicable authority and agreement.
- **Environment values:** Use the approved Workspace account and registered trial project.

**Sources and exact quotations**

1. https://developers.google.com/workspace/preview  
   Locations: **How to join the program** and **Developer Preview Program Terms**.  
   Live check: 2026-09-11.
   - “Read through the Program Terms before applying. We will ask you if you agree with the terms in the application form.”
   - “You need to provide us with your Google Workspace account and Google Cloud project information.”
   - “I agree to the Google APIs Terms of Service”

2. https://developers.google.com/terms  
   Location: **Section 1: Account and Registration > b. Entity Level Acceptance**.  
   Live check: 2026-09-11.
   - “If you are using the APIs on behalf of an entity, you represent and warrant that you have authority to bind that entity to the Terms”

3. https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
   Location: **Set up the OAuth consent screen > Finish**.  
   Live check: 2026-09-11.
   - “review the Google API Services User Data Policy and if you agree, select I agree to the Google API Services: User Data Policy.”

4. https://developers.google.com/terms/api-services-user-data-policy  
   Location: opening policy text.  
   Live check: 2026-09-11.
   - “The policy below, as well as the Google APIs Terms of Service”

**Interpretation:** A Cloud IAM role does not prove legal authority to accept terms for an organization. The API terms establish entity-level acceptance authority. The consent-screen procedure separately requires policy agreement. Ask an authorized person to help if the reader lacks that authority. The checked preview procedure does not name a required Workspace administrator role for the applicant.

### T1-04 — Require project creation permission only for a new project

- **Status:** Conditional — only if a suitable project is not available.
- **Who acts:** A person with project creation permission.
- **Scope:** The parent organization or other applicable parent resource.
- **Action:** Create the trial project. Otherwise, use the selected existing project.
- **Authority:** `resourcemanager.projects.create`, included in **Project Creator**, `roles/resourcemanager.projectCreator`.
- **Environment values:** Obtain the approved parent organization or location from the Cloud administrator.

**Source and exact quotation**

https://cloud.google.com/resource-manager/docs/creating-managing-projects  
Location: **Create a project**.  
Live check: 2026-09-11.

> “To create a project, you must have the resourcemanager.projects.create permission. This permission is included in roles like the Project Creator role (roles/resourcemanager.projectCreator).”

**Interpretation:** Do not require Project Creator for an existing project. Project creation permission does not establish all later setup permissions.

### T1-05 — Use a project access administrator for required role grants

- **Status:** Conditional — if the setup person lacks the required permissions and an administrator will grant them.
- **Who acts:** A project access administrator.
- **Who receives access and scope:** The setup person receives the applicable roles on the selected project.
- **Action and values:** Grant only the applicable roles:
  - `roles/serviceusage.serviceUsageAdmin`
  - `roles/oauthconfig.editor`
  - `roles/modelarmor.floorSettingsAdmin`
- **Authority:** **Project IAM Admin**, `roles/resourcemanager.projectIamAdmin`, supports project access management.

**Source and exact quotations**

https://cloud.google.com/iam/docs/granting-changing-revoking-access  
Locations: **Required roles** and **Required permissions**.  
Live check: 2026-09-11.
- “To manage access to a project: Project IAM Admin (roles/resourcemanager.projectIamAdmin)”
- `resourcemanager.projects.getIamPolicy`
- `resourcemanager.projects.setIamPolicy`

**Interpretation:** Use a project-level grant for the selected project configuration. Do not grant organization-wide access only for this trial. The reader does not need project IAM administration if another authorized administrator grants the roles or performs the setup.

### T1-06 — Use Model Armor Floor Setting Admin for project screening controls

- **Status:** Required for the selected Model Armor path.
- **Who acts:** A person with floor-setting administration permission. The organization’s security owner approves the intended security effect.
- **Who receives access and scope:** The administrator can manage the selected project’s floor setting. The filters apply to traffic covered by that setting.
- **Authority:** **Model Armor Floor Setting Admin**, `roles/modelarmor.floorSettingsAdmin`.
- **Selected actions covered:**
  - Read the project floor setting and review inherited settings.
  - Select **Custom** and configure the selected detection controls.
  - Select **Google MCP Server**.
  - Save the floor setting.
  - Update `projects/PROJECT_ID/locations/global/floorSetting`.
  - Set enforcement to `TRUE` and MCP enforcement to `INSPECT_AND_BLOCK`.
  - Keep payload logging disabled.
- **Environment value:** Use the registered project ID.
- **Separate action:** Model Armor API enablement uses T1-01. Role grants use T1-05.

**Sources and exact quotations**

1. https://docs.cloud.google.com/model-armor/configure-floor-settings  
   Locations: **Obtain the required permissions**, **Floor settings application**, and **Define how floor settings are inherited**.  
   Live check: 2026-09-11.
   - “ask your administrator to grant you the Model Armor Floor Setting Admin (roles/modelarmor.floorSettingsAdmin) IAM role on Model Armor floor settings.”
   - “For more information about granting roles, see Manage access to projects, folders, and organizations.”
   - “Project level Applies only to that one specific project.”
   - “Custom: Define floor settings for this project.”
   - “Custom settings that you define for a project override any inherited floor settings.”

2. https://docs.cloud.google.com/iam/docs/roles-permissions/modelarmor  
   Location: **Model Armor Floor Setting Admin**.  
   Live check: 2026-09-11.
   - “Grants full access to all Model Armor Floor Setting resources.”
   - `roles/modelarmor.floorSettingsAdmin`
   - `modelarmor.floorSettings.get`
   - `modelarmor.floorSettings.update`
   - `modelarmor.floorSettings.computeEffectiveFloorSetting`

3. https://docs.cloud.google.com/model-armor/configure-floor-settings  
   Location: **Set the API endpoint override using the gcloud CLI**.  
   Live check: 2026-09-11.
   - “Run the following command to use the global API endpoint”
   - `gcloud config set api_endpoint_overrides/modelarmor "https://modelarmor.googleapis.com/"`

**Interpretation:** The floor-setting role covers the selected console and API updates, including detection, enforcement, inheritance selection, and logging configuration. Use it rather than broad project Owner access. The endpoint override changes the CLI configuration; it does not grant API access.

The technical ability to override inherited settings does not establish approval to weaken organization security controls. Review existing controls before selecting **Custom**. The selected path does not require an organization- or folder-level floor-setting change.

### T1-07 — Use the Service Settings administrator privilege for a blocked application

- **Status:** Conditional — when Workspace policy blocks the selected OAuth client or required access.
- **Who acts:** A Workspace administrator with the **Service Settings administrator privilege**.
- **Who receives access and scope:** The selected OAuth application receives permitted access for users in the approved organizational units.
- **Action:** Open **Security > Access and data control > API controls > Manage App Access**. Select **Configure new app**. Search by application name or OAuth client ID. Select the approved organizational units and access setting. Review and finish the configuration.
- **Environment values:** Obtain the OAuth client ID from the application owner. Obtain approved organizational units and scopes from the Workspace security owner.

**Source and exact quotations**

https://support.google.com/a/answer/7281227?hl=en  
Locations: **Manage app access to Google services & add apps > Configure a new app** and access-setting descriptions.  
Live check: 2026-09-11.
- “Requires having the Service Settings administrator privilege.”
- “Enter the app's name or client ID, then click Search.”
- “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
- “You must include the Google Sign-in scopes required by the app”
- “Review settings for the new app, then click Finish.”

**Interpretation:** This action needs Workspace authority, not OAuth Config Editor or Project IAM Admin. Use an administrator who already has the stated privilege. Do not require **Trusted** access by default. **Specific Google data** is the documented scope-specific option when it satisfies the approved access requirement.

### T1-08 — Use the document owner or an authorized editor for document sharing

- **Status:** Conditional setup action — only if the connecting user lacks the required document access. Suitable document access is required for use.
- **Who acts:** The document owner, or an editor whose sharing permission is enabled.
- **Who receives access and scope:** The connecting user receives access to the selected document.
- **Action:** Select the file and **Share**. Enter the connecting user’s email address. Select the applicable permission, then **Send** or **Share**.
- **Values:** Use **Viewer** for a read-only trial document or **Editor** for an update test. Obtain the document and user address from their owners.

**Source and exact quotations**

https://support.google.com/docs/answer/2494822?hl=en  
Locations: sharing permissions table, sharing tips, and **Share with specific people**.  
Observed and live checked: 2026-09-11.
- “Enter the email address you want to share with.”
- “Click Send or Share.”
- “To let editors change permissions and share a file, owners can click Share Settings and check the box.”
- Editor sharing permission: “Yes, by default. The owner can control it.”

**Interpretation:** Project IAM roles do not give document-sharing authority. Workspace application approval also does not give the connecting user document access. Use a document that the registered trial account can already access where possible.

## Final action-by-action authority audit

| Selected action | Authorized actor and authority | Result |
|---|---|---|
| **select-project** | Use an existing project with the required task permissions. For creation only, use a person with `resourcemanager.projects.create`; see T1-04. | Covered. Project Creator is conditional. |
| **register-preview** | Applicant supplies account and project details. A person with entity-level acceptance authority accepts the terms; see T1-03. Google confirms registration. | Covered. Technical administrator status alone is insufficient for terms acceptance. |
| **enable-services** | Service Usage Admin, or a person with `serviceusage.services.enable`, on the selected project; see T1-01. | Covered for Docs API and Docs MCP API. |
| **configure-screening** | Service enablement authority for Model Armor API; Model Armor Floor Setting Admin for project floor-setting reads and updates; see T1-01 and T1-06. | Covered for the selected console and Cloud Shell actions. Review inherited controls before changes. |
| **configure-oauth** | OAuth Config Editor for Branding, audience, and scopes; an authorized person for policy acceptance; see T1-02 and T1-03. | Covered. Separate configuration authority from terms acceptance. |
| **grant-user-access** | OAuth Config Editor adds External test users. Document owner or authorized editor supplies missing document access; see T1-02 and T1-08. | Covered. Test-user status does not replace document access. |
| **create-oauth-client** | OAuth Config Editor creates the Web application client and registers its callback; see T1-02. | Covered. Use the actual Speakeasy callback value. |
| **permit-application** | Workspace administrator with Service Settings administrator privilege; see T1-07. | Covered when policy blocks access. Broad Trusted status is not the default. |
| **connect-control-plane** | The supplied central client check establishes project write access for manual OAuth client binding. The connecting user signs in and gives consent. | Provider-side authority is covered. Control Plane project access remains coordinator-owned. |
| **Grant missing project roles** | Project IAM Admin, or a person with the required project IAM permissions; see T1-05. | Covered as a separate conditional action. |

**Actor-label correction:** In the other reports, “Cloud administrator” means a person with the applicable task permissions above. It does not mean project Owner. “Application administrator” means OAuth Config Editor for these selected Google OAuth actions. “Workspace administrator” means an administrator with the stated Service Settings privilege for application access controls.

## Unresolved questions

### Blocking questions

**None remain for the selected provider-side authority actions.**

### Non-blocking — Environment-specific approval and existing permissions

Public documentation cannot establish who in the organization holds the required permissions or legal authority. It also cannot establish the organization’s internal security approval process.

The documented path remains concrete: use a person who has the applicable authority, or ask the project access administrator to grant the limited project roles. Do not grant the reader all administrative roles by default.

### Non-blocking — Model Armor policy, cost, and data location

The role evidence establishes technical authority to configure the project floor setting. It does not establish internal approval for the resulting security policy, cost, or data location.

Topic 2’s stated reviews remain applicable. If the organization requires a specific inspection location, the coordinator must resolve that condition before approval. This is not a missing IAM role.

### Non-blocking — Workspace privilege assignment

The official application-control procedure names the required Service Settings administrator privilege. This audit selects an existing authorized Workspace administrator to perform the conditional change. It does not select creation or assignment of a new Workspace administrator role.

### Non-blocking — Control Plane access

The supplied central evidence identifies a project write-access check for manual OAuth binding:

https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/clienthandlers.go#L156-L227

This audit did not repeat client implementation research or map that check to a reader-facing Control Plane role. The coordinator owns that mapping. Google Cloud and Workspace roles do not establish Control Plane access.

## Cross-topic dependencies

- **Topic 2:** Use T1-01 and T1-06 for Model Armor. Replace broad Cloud administrator labels with the applicable service and floor-setting permissions. Keep internal security approval separate.
- **Topic 3:** T1-02 confirms test-user administration authority. T1-07 confirms Workspace application-control authority. T1-08 confirms document-sharing authority.
- **Topic 4:** T1-02 covers Branding, audience, scopes, test users, client creation, and redirect configuration. T1-03 separately covers policy acceptance.
- **Topic 5:** T1-01 covers project enablement authority for the fixed Docs remote service.
- **Coordinator:** The selected provider-side action authority audit is complete. Use the limited roles and conditional helper actions above. Retain the separate Control Plane access check and the stated Model Armor security, cost, and data-location conditions.
## Topic 2 evidence

## Topic and status

**Topic 2: Organization-level setup — complete.**

Google documents the required project, Developer Preview registration, API activation, and OAuth configuration.

The follow-up research establishes a documented Model Armor setup path. An administrator can configure detection settings in the Google Cloud console. The administrator can then use Cloud Shell to enable MCP inspection and blocking.

**Updated finding:** T2-08 replaces the earlier, incomplete Model Armor finding. T2-10 and T2-11 add scope, availability, and cost information. T2-01 through T2-07 and T2-09 retain the earlier findings and sources.

**Observation date:** 2026-09-11. The unchanged findings retain their earlier observation date of 2026-09-11. New research was limited to Model Armor. No files, provider settings, or credentials were changed.

## Findings

### T2-01 — Use a Google Cloud project

- **Status:** Required. Create a project only if a suitable project is not available.
- **Actor and scope:** The Google Cloud project administrator acts. The project contains the enabled services and OAuth configuration.
- **Documented action:** To create a project, open **IAM & Admin > Create a Project**. Enter a **Project Name**. Use **Location > Browse** to select the applicable organization or location. Click **Select**, then **Create**.
- **Environment values:** Obtain the project and organization selection from the Cloud administrator. Use the project ID supplied by Google Cloud.
- **Sources, locations, and exact quotations:**
  - https://developers.google.com/workspace/docs/api/guides/configure-mcp-server — **Prerequisites**: “A Google Cloud project.”
  - https://developers.google.com/workspace/guides/create-project — **Create a Cloud project > Google Cloud console**: “In the Project Name field, enter a descriptive name for your project.”
  - Same location: “The project ID can't be changed after the project is created”.
- **Interpretation:** An existing suitable project satisfies this requirement. Topic 1 must establish project creation authority.

### T2-02 — Obtain Developer Preview account verification and project registration

- **Status:** Required while Google Docs MCP is in Developer Preview.
- **Actor and scope:** An authorized applicant submits the application. Google verifies the Workspace account and registers the Cloud project.
- **Documented action:**
  1. Read the **Developer Preview Program Terms**.
  2. Open the **application form** under **How to join the program**.
  3. Supply the Google Workspace account and Google Cloud project information.
  4. Make sure that the account accepts Google Groups membership.
  5. Wait for the group notification and the final project registration confirmation.
- **Environment values:** Use the applicant’s Workspace account and the project from T2-01.
- **Sources, locations, and exact quotations:**
  - https://developers.google.com/workspace/docs/api/guides/configure-mcp-server — opening notice: “Developer Preview: Available as part of the Google Workspace Developer Preview Program”.
  - https://developers.google.com/workspace/preview — **How to join the program**:
    - “You need to provide us with your Google Workspace account and Google Cloud project information.”
    - “After verifying your Google Workspace account, we will register your Google Cloud project.”
    - “When it is done, you will receive a final confirmation to your registered email address.”
    - “Make sure that your email account accepts getting added to Google Groups.”
- **Interpretation:** API activation does not replace preview registration.

**Linked application form:**

https://docs.google.com/forms/d/e/1FAIpQLSd7BiMXXHDlUDkF7G0TSY5zfJbQwFNH3m6K_ZYFi3vCHLFbng/viewform?resourcekey=0-1uHeVg8junj3PPTLNcn7WQ

### T2-03 — Keep preview use within the program terms

- **Status:** Required. The government data restriction applies only to use for a government or regulatory entity, excluding an educational institution.
- **Actor and scope:** The person who accepts the terms and the organization that operates the application act. The terms apply to preview applications and their data.
- **Documented action:** Accept the terms only with the applicable authority. Do not include preview features in public applications before general availability. Do not give users outside the domain or company access unless Google gives the stated permission.
- **Source:** https://developers.google.com/workspace/preview — **Developer Preview Program Terms**.
- **Exact quotations:**
  - Term (ii): “program features may not be included in public applications prior to the General Availability (GA) announcement.”
  - Term (iv): “I may not grant end users access, outside my domain or company”.
  - The exception requires permission that “has been granted to my Workspace account for that feature.”
  - Term (vii): “I may only use test or experimental data” and “am prohibited from using any ‘live’ or production data”. This clause applies to the government and regulatory entities stated above.
- **Interpretation:** These terms do not establish permission for a public customer deployment. Topic 1 must check authority to accept them.

### T2-04 — Enable the Google Docs API and Google Docs MCP API

- **Status:** Required.
- **Actor and scope:** A person with service activation permission acts in the registered Cloud project.
- **Documented action and values:** Enable:
  - `docs.googleapis.com`
  - `docsmcp.googleapis.com`
- **Documented browser links:**
  - https://console.cloud.google.com/flows/enableapi?apiid=docs.googleapis.com
  - https://console.cloud.google.com/flows/enableapi?apiid=docsmcp.googleapis.com
- **Environment values:** Select the project from T2-01 and T2-02.
- **Source:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server — **Configure the Google Docs MCP server**, **Enable the APIs**, and **Enable the MCP services**.
- **Exact quotations:**
  - “you must enable it in your Google Cloud project”
  - “Google Docs API”
  - “Google Docs MCP API”
  - “Enable the MCP services in the Google Cloud console”
- **Interpretation:** Use the Docs-specific service list. Do not enable all Workspace MCP services for this connection. Topic 1 must confirm authority.

### T2-05 — Configure Google Auth Platform branding, audience, and data access

- **Status:** Required. Test-user registration is conditional on **External** audience selection.
- **Actor and scope:** The application configuration owner acts in the Cloud project.
- **Documented action:**
  1. Open **Google Auth Platform > Branding**.
  2. If configuration does not exist, click **Get Started**.
  3. Under **App Information**, set **App name** to `Docs MCP Server`.
  4. Select the **User support email**, then click **Next**.
  5. Under **Audience**, select **Internal**. If this is unavailable, select **External**. Click **Next**.
  6. Under **Contact Information**, enter the project notice email address. Click **Next**.
  7. Under **Finish**, review the Google API Services User Data Policy. If authorized and in agreement, select the agreement check box. Click **Continue**, then **Create**.
  8. For **External**, open **Audience > Test users > Add users**. Add the authorized test-user addresses. Click **Save**.
  9. Open **Data Access > Add or Remove Scopes**. Under **Manually add scopes**, add the values below.
  10. Click **Add to Table**, then **Update**. On **Data Access**, click **Save**.
- **Required values in the documented procedure:**
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/documents.readonly`
  - `https://www.googleapis.com/auth/documents`
- **Environment values:** The application owner supplies the support address, contact address, and authorized test-user addresses.
- **Source:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server — **Set up the OAuth consent screen**.
- **Exact quotations:**
  - “You must configure the OAuth consent screen before you can create an OAuth client ID.”
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “If you selected External for user type, add test users”
  - “Under Manually add scopes, paste the scopes for the Google Docs MCP server”
- **Interpretation:** Topic 4 must check runtime scopes and token behavior. Topic 3 must check user eligibility. Topic 1 must establish configuration and policy acceptance authority.

### T2-06 — Register an OAuth client for the selected remote client path

- **Status:** Required for the supplied manual, pre-registered OAuth path.
- **Actor and scope:** The application configuration owner registers the OAuth application in the project.
- **Documented action:** The remote connector example uses **Google Auth Platform > Clients > Create Client**. Select **Web application**. Enter a **Name**. Under **Authorized redirect URIs**, click **+ Add URI**. Enter the callback URI. Click **Create** and obtain the **Client ID** and **Client Secret**.
- **Environment values:** The client supplies its callback URI. The supplied Speakeasy value is `{{ gram.oauth.callback_url }}`.
- **Source:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server — **Configure your MCP client > Claude**.
- **Exact quotations:**
  - “Select Web application as the application type.”
  - “In the Authorized redirect URIs section, click + Add URI”
  - “Click Create and copy your Client ID and Client Secret.”
- **Interpretation:** The provider example is for Claude. Do not copy its callback URI into Speakeasy. Topic 4 and the coordinator must verify the applicable callback and client settings. Topic 1 must confirm authority.

### T2-07 — Permit the OAuth application when organization controls restrict access

- **Status:** Conditional. Applies when organization policy does not permit the application or its required scopes.
- **Actor and scope:** A Workspace administrator with the **Service Settings administrator privilege** acts. The setting can apply to the whole organization or selected organizational units.
- **Documented action:**
  1. Open **Security > Access and data control > API controls > Manage App Access**.
  2. For **Configured apps**, click **Configure new app**.
  3. Search by application name or OAuth client ID. Select the application.
  4. Under **Scope**, select the organization or applicable organizational units. Click **Continue**.
  5. Under **Access to Google data**, select the approved access setting.
  6. Click **Continue**. Review the configuration. Click **Finish**.
- **Documented access settings:**
  - **Specific Google data:** Only the specified scopes.
  - **Trusted:** All Google services, including restricted services.
  - **Limited:** Unrestricted services only.
  - **Blocked:** No access.
- **Environment values:** Use the client ID from T2-06. Obtain approved organizational units and scopes from the Workspace security owner. Include required Google Sign-in scopes when using **Specific Google data**.
- **Source:** https://support.google.com/a/answer/7281227?hl=en — **Manage app access to Google services & add apps > Configure a new app**.
- **Exact quotations:**
  - “Requires having the Service Settings administrator privilege.”
  - “Enter the app's name or client ID, then click Search.”
  - “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
  - “You must include the Google Sign-in scopes required by the app”
  - “Review settings for the new app, then click Finish.”
- **Interpretation:** Do not require broad **Trusted** access by default. This setting does not replace user consent or document permissions.

### T2-08 — Provide screening through the documented Model Armor option

**Replaced and completed finding.**

- **Status:** Screening is required. Model Armor configuration is conditional on selection of Model Armor. This follow-up establishes that option; it does not establish a client-native screening solution.
- **Actor and scope:** The application security owner approves detection settings. An authorized Cloud administrator enables Model Armor and configures the project floor setting.
- **Access effect:** Model Armor inspects MCP tool calls and responses. With blocking enabled, it blocks content that matches the configured filters.

#### Requirement and coverage

- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security — opening text and **Configure protection for Google and Google Cloud remote MCP servers**.
- **Exact quotations:**
  - “You must screen prompts and responses for malicious content or prompt injection attacks.”
  - “You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
  - “This configuration applies a consistent set of filters to all MCP tool calls and responses within the project.”
  - “Set up a Model Armor floor setting with MCP sanitization enabled.”
- **Interpretation:** Google documents Model Armor as a permitted screening solution. The MCP integration covers calls and responses. A separate client-native screening function is not the selected option in this report.

#### Enable the API

- **Documented action:** Open the Model Armor API activation link. Select the project where Model Armor will apply. Enable `modelarmor.googleapis.com`.
- **Browser link:** https://console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com
- **Source:** Same Workspace security page — **Enable Model Armor > Console**.
- **Exact quotations:**
  - “You must enable Model Armor APIs before you can use Model Armor.”
  - “Select the project where you want to activate Model Armor.”

#### Configure detection settings in the console

- **Documented action:**
  1. Open the **Model Armor** page.
  2. Select the project.
  3. Open **Floor settings > Configure floor settings**.
  4. Select **Custom** to define project settings.
  5. Under **Detections**, configure **Malicious URL detection** and **Prompt injection and jailbreak detection**.
  6. For prompt injection and jailbreak detection, the linked detection instructions recommend **High** confidence.
  7. Under **Responsible AI**, configure the required content filters. The Workspace MCP example uses **Dangerous**, with **Medium and above** confidence.
  8. Under **Services**, select **Google MCP Server**.
  9. Review logging and language settings.
  10. Click **Save floor settings**. Allow a few minutes for the changes to take effect.
- **Browser link:** https://console.cloud.google.com/projectselector2/security/modelarmor?supportedpurview=organizationId,folder,project
- **Sources, locations, and exact quotations:**
  - https://docs.cloud.google.com/model-armor/configure-floor-settings — **Configure floor settings**:
    - “Select a project.”
    - “On the Model Armor page, go to the Floor settings tab and click Configure floor settings.”
    - “Click Save floor settings.”
    - “Allow a few minutes for the changes to the floor settings to take effect.”
  - Same page — **Define how floor settings are inherited**:
    - “Custom: Define floor settings for this project.”
  - Same page — **Define where floor settings are applied**:
    - “Google MCP Server: Floor settings check requests sent to or from Google or Google Cloud remote MCP servers”.
  - https://docs.cloud.google.com/model-armor/manage-templates#configure-detections — **Configure detections**:
    - “Model Armor performs the following detection checks on prompts and responses”.
    - “Malicious URL detection”
    - “Prompt injection and jailbreak detection”
    - “We recommend that you set the confidence level to High to minimize false positives and ensure consistent detection behavior.”
- **Interpretation:** The floor-setting page links to the template page for detection controls. These are documented controls for the floor-setting procedure, not a requirement to create a separate template.

**Important correction to the earlier finding:** The Workspace example enables malicious URI and Dangerous content filters. It does **not** include a prompt injection filter flag. The linked detection controls supply that missing configuration.

- **Source:** Workspace security page — **Configure protection for Google and Google Cloud remote MCP servers**.
- **Exact quotation:** “Don't enable the prompt injection and jailbreak filter unless your MCP traffic carries natural language data.”
- **Interpretation:** For a Docs trial that reads or updates natural-language document content, this condition applies. Enable the detection for that trial. Do not infer that the Dangerous filter also enables prompt injection detection.

#### Set MCP inspection and blocking through Cloud Shell

The console procedure establishes detection and service selection. The Workspace procedure gives an explicit command for MCP blocking.

- **Documented Cloud Shell action:** In the Google Cloud console, activate Cloud Shell.
- **Source:** https://docs.cloud.google.com/model-armor/configure-floor-settings — **Enable APIs > gcloud**.
- **Exact quotations:**
  - “In the Google Cloud console, activate Cloud Shell.”
  - “Cloud Shell is a shell environment with the Google Cloud CLI already installed and with values already set for your current project.”
- **Cloud Shell link:** https://console.cloud.google.com/?cloudshell=true

**Exact MCP settings from the Workspace example:**

| Setting | Documented value |
|---|---|
| Floor-setting resource | `projects/PROJECT_ID/locations/global/floorSetting` |
| `--enable-floor-setting-enforcement` | `TRUE` |
| `--add-integrated-services` | `GOOGLE_MCP_SERVER` |
| `--google-mcp-server-enforcement-type` | `INSPECT_AND_BLOCK` |
| `--malicious-uri-filter-settings-enforcement` | `ENABLED` |
| `--add-rai-settings-filters` | `'[{"confidenceLevel": "MEDIUM_AND_ABOVE", "filterType": "DANGEROUS"}]'` |

- **Documented command:** `gcloud model-armor floorsettings update` with the settings above.
- **Environment value:** Replace `PROJECT_ID` with the selected Google Cloud project ID.
- **Source:** Workspace security page — **Configure protection for Google and Google Cloud remote MCP servers**.
- **Exact quotation:** “INSPECT_AND_BLOCK: The enforcement type that inspects content for the Google MCP server and blocks prompts and responses that match the filters.”
- **Additional source:** https://docs.cloud.google.com/sdk/gcloud/reference/model-armor/floorsettings/update — `--google-mcp-server-enforcement-type`.
- **Exact quotation:** “Default is ‘INSPECT_ONLY’.”
- **Interpretation:** Set `INSPECT_AND_BLOCK` explicitly. Do not rely on the default to block matching content.

For the global floor-setting resource, the shared procedure documents this endpoint setting:

```text
gcloud config set api_endpoint_overrides/modelarmor "https://modelarmor.googleapis.com/"
```

- **Source:** https://docs.cloud.google.com/model-armor/configure-floor-settings — **Set the API endpoint override using the gcloud CLI**.
- **Exact quotation:** “Run the following command to use the global API endpoint”.
- **Interpretation:** This is the floor-setting control endpoint. It does not establish the location where MCP content is inspected.

### T2-09 — Use the current Developer Preview procedure

- **Status:** Required source selection.
- **Source:** https://developers.google.com/workspace/release-notes — **Google Docs API v1**, MCP Developer Preview entry.
- **Exact quotation:** “The Model Context Protocol (MCP) server for Google Docs is now available in developer preview.”
- **Interpretation:** The earlier research confirmed the preview launch. No replacement notice was found in that research.
- **New source check:** The Workspace security page footer states: “Last updated 2026-09-10 UTC.” Its live instructions still identify Workspace MCP as Developer Preview.

### T2-10 — Review project scope, inherited settings, and logging

- **Status:** Required review when Model Armor is selected. A second project configuration and payload logging are conditional.
- **Actor and scope:** The Cloud security owner selects the project and reviews existing floor settings. The selected floor setting can affect more than Docs MCP.
- **Project selection:**
  - Enable Model Armor and configure the floor setting in the selected customer project.
  - For this setup, the registered project contains the customer’s OAuth application and enabled Docs services.
  - Use its project ID in the floor-setting resource.
  - The documentation also permits settings in both the client project and resource project when they differ.
- **Sources, locations, and exact quotations:**
  - Workspace security page — **Configure protection for Google and Google Cloud remote MCP servers**:
    - “A floor setting defines the minimum security filters that apply across the project.”
    - “If the agent and the MCP server are in different projects, you can create floor settings in both projects (the client project and the resource project).”
    - “In this case, Model Armor is invoked twice, once for each project.”
    - “any changes you make to floor settings can affect traffic scanning and safety behaviors across all integrated services, not just MCP.”
  - https://docs.cloud.google.com/model-armor/configure-floor-settings — **Define how floor settings are inherited**:
    - “Custom settings that you define for a project override any inherited floor settings.”
- **Interpretation:** Do not treat this as a Docs-only security control. Review inherited settings before selection of **Custom**. Do not weaken an existing policy to reproduce the example. A second project is not an unconditional requirement.

**Logging**

- The Workspace command example includes `--enable-google-mcp-server-cloud-logging`.
- **Source:** Workspace security page — **Use Model Armor**.
- **Exact quotation:** “When Model Armor is enabled with logging enabled, Model Armor logs the entire payload. This might expose sensitive information in your logs.”
- **Additional source:** gcloud `floorsettings update` reference — `--enable-google-mcp-server-cloud-logging`.
- **Documented option:** The reference supports both the enable flag and `--no-enable-google-mcp-server-cloud-logging`.
- **Interpretation:** Payload logging needs security-owner review. Logging is not the same operation as content inspection or blocking. Do not enable it without explaining the payload exposure.

### T2-11 — Review regional availability and cost

- **Status:** Conditional on Model Armor selection. Data residency review applies when the organization has such requirements.
- **Actor and scope:** The Cloud security and billing owners review the selected use.
- **Availability evidence:**
  - https://docs.cloud.google.com/model-armor/configure-floor-settings — **Define where floor settings are applied** identifies the linked MCP integration as “Preview”.
  - https://docs.cloud.google.com/model-armor/locations — **Regions** and **Multi-regions** lists supported regions and the `eu` and `us` multi-regions.
  - Same page: “Feature availability varies by region to comply with data residency and other regional requirements.”
  - Workspace security page — **MCP request routing to Model Armor**:
    - “Model Armor is available in certain regions.”
    - Routing “might break data residency compliance for in-use and in-transit data.”
- **Interpretation:** The global floor-setting resource does not prove global inspection availability or a data residency guarantee.

**Cost evidence**

- **Source:** https://docs.cloud.google.com/model-armor/overview — **Tokens**.
- **Exact quotation:** “Model Armor uses the total number of tokens in AI prompts and responses for pricing purposes.”
- **Official linked pricing sources:**
  - https://cloud.google.com/security/products/model-armor#pricing
  - https://cloud.google.com/security-command-center/pricing#model-armor-in-security-command-center
- **Interpretation:** Model Armor has usage-based pricing considerations. Do not describe it as free. This research did not establish the current price, allowance, or applicable Security Command Center entitlement.

## Unresolved questions

### Non-blocking — Exact preview application form fields

The earlier research established the application link, account and project information, and confirmation process. It did not inspect the form. This does not prevent the documented application action.

### Non-blocking — General Docs MCP billing

The earlier project source states that billing can depend on the APIs and features used. The Docs MCP setup page does not establish a Docs MCP billing requirement. This is not proof that billing is unnecessary.

### Non-blocking — Model Armor price and billing activation conditions

The overview establishes token-based pricing and links to official pricing pages. The pricing pages did not yield usable price details during this research.

The checked floor-setting procedure does not give a separate billing activation action. Do not invent one or promise free use. The billing owner must review the current price before paid use.

### Non-blocking — Prompt injection CLI value wording

The floor-setting guide uses enum-style values such as `ENABLED`. The gcloud reference describes prompt injection enforcement values as “enable” or “disable”. Its confidence description uses “high”, “medium-and-above”, and “low-and-above”.

The report therefore uses the documented console controls for prompt injection detection and **High** confidence. The Workspace command supplies the separate MCP inspection and blocking settings. This avoids an unverified CLI value choice and does not block setup.

**Sources checked:** The floor-setting guide, linked detection controls, and gcloud `floorsettings update` reference.

### Non-blocking — Exact Google Docs inspection routing

The Workspace source explicitly supports its Model Armor option. The linked supported-products page did not establish a Docs-specific inspection jurisdiction in the checked content.

This does not prevent the documented configuration. If the organization requires a particular in-use or in-transit data location, that location check must be resolved before approval.

**Sources checked:**
- https://developers.google.com/workspace/guides/configure-mcp-security
- https://docs.cloud.google.com/mcp/model-armor-supported-products
- https://docs.cloud.google.com/model-armor/locations

### Non-blocking — Additional organization restrictions

The checked sources do not establish every organization policy. Apply the documented app access procedure when the organization restricts the OAuth client.

### Non-blocking, Topic 1 dependency — Administrative authority

The Model Armor sources establish:

- API activation requires `serviceusage.services.enable`.
- **Service Usage Admin**, `roles/serviceusage.serviceUsageAdmin`, supplies that permission.
- The floor-setting guide names **Model Armor Floor Setting Admin**, `roles/modelarmor.floorSettingsAdmin`.

**Sources and quotations:**

- Workspace security page — **Enable Model Armor > Roles required to enable APIs**: “To enable APIs, you need the serviceusage.services.enable permission.”
- https://docs.cloud.google.com/model-armor/configure-floor-settings — **Obtain the required permissions**: “Model Armor Floor Setting Admin (roles/modelarmor.floorSettingsAdmin) IAM role on Model Armor floor settings.”

Topic 1 must verify the applicable grants and who can make them. This report does not assume that OAuth configuration authority includes these permissions.

## Cross-topic dependencies

- **Topic 1:** Verify project creation, service activation, OAuth configuration, and terms acceptance authority. Add Model Armor API activation and floor-setting administration. Check who can grant `roles/modelarmor.floorSettingsAdmin`. Review authority to change inherited security controls and logging.
- **Topic 3:** Retain checks for preview eligibility, Google Groups membership, test-user status, and document permissions.
- **Topic 4:** Retain the Docs-specific consent configuration. Verify runtime scopes, client registration, refresh tokens, audience effects, and callback requirements.
- **Topic 5:** The registered project and Model Armor settings do not change the fixed Docs MCP URL.
- **Coordinator:** The earlier incomplete Model Armor procedure is replaced. A documented console and Cloud Shell option is available. Select and approve that option if it satisfies the trial’s security, cost, and data residency conditions. No client implementation research was performed in this follow-up.
- **Coordinator:** Keep preview use within the program terms. Do not require broad OAuth app trust. Do not treat Model Armor as unconditional when another documented screening solution is selected.
## Topic 3 evidence

## Topic and status

**Topic 3: Connecting-user setup — complete.**

Google documents user permissions, test-user access, and administrator controls for application access. The trial can use the registered Google Workspace account. The available sources do not clearly state whether each additional MCP user must join the preview program.

**Observation date for all sources: 2026-09-11.** Research used live public Google pages. No provider settings or files were changed.

## Findings

### T3-01 — MCP access uses the connecting user’s permissions

- **Status:** Required.
- **Who and scope:** Each connecting user needs access to the documents that the MCP tools will use. The document owner, or another person with sharing permission, gives this access.
- **Source statement:** The Docs MCP server will “Inherit the same permissions and data governance controls as the user.”
- **Interpretation:** MCP access does not replace document permissions. A user needs read access to read a document and edit access to change it.
- **Documented action:** In Google Drive, select the file and **Share**. Enter the connecting user’s email address. Select **Viewer**, **Commenter**, or **Editor**. Select **Send** or **Share**. Obtain the document and user email address from the document owner and connecting user.
- **Authority:** The sharing permissions table says that an owner can share a file. An editor can share by default, but the owner can control this permission.
- **Sources and exact quotations:**
  - https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
    Location: introduction, **Respect security**.  
    Quote: “Inherit the same permissions and data governance controls as the user.”
  - https://support.google.com/docs/answer/2494822  
    Locations: permissions table and **Share with specific people**.  
    Quotes:
    - “Enter the email address you want to share with.”
    - “Decide how people can use your file. Select one:”
    - “Viewer”, “Commenter”, “Editor”
    - “Click Send or Share.”
    - “If you use a Google Account through work or school, you might not be able to share files outside of your organization.”

### T3-02 — Add connecting users to the test-user list for the External setup

- **Status:** Conditional. Applies when the administrator selects **External** in the documented Docs MCP consent-screen procedure.
- **Who and scope:** The person who configures the Google Auth Platform adds the connecting users. The access applies to the application in the selected Google Cloud project.
- **Documented action:** Open **Audience**. Under **Test users**, select **Add users**. Enter the connecting users’ email addresses. Select **Save**.
- **Required values:** Use the Google Account email address of each authorized test user. Obtain these addresses from the users.
- **Source:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
  Location: **Set up the OAuth consent screen**.
- **Exact quotations:**
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “If you selected External for user type, add test users:”
  - “Click Audience.”
  - “Under Test users, click Add users.”
  - “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** For the documented External trial, adding the application administrator alone does not give all intended users test access. Add each intended test user.
- **Authority dependency:** Topic 1 must confirm who can change the application’s audience and test-user list. The page supplies the action, but does not name the required role.

### T3-03 — Organization policy must permit the application’s access for the user

- **Status:** Conditional. An administrator must act if the current application or service policy blocks the required access.
- **Who and scope:** An administrator with the **Service Settings administrator privilege** configures application access for the connecting user’s organizational unit.
- **Documented action:** In the Google Admin console, go to **Security > Access and data control > API controls**. Open **Manage App Access**. For a new application, select **Configure new app**. Search by application name or OAuth client ID. Select the application. Under **Scope**, select the applicable organizational units. Select **Continue**. Under **Access to Google data**, select the applicable access setting.
- **Required values:**
  - Obtain the OAuth client ID from the application configuration owner.
  - Select the organizational units that contain the connecting users.
  - **Specific Google data** permits only the scopes that the administrator specifies.
  - **Trusted** permits all Google services, including restricted services.
  - **Limited** permits only unrestricted services. It is not sufficient when the application needs a restricted service.
- **Source:** https://support.google.com/a/answer/7281227  
  Locations: **Before you begin: Review apps for your organization**, **Restrict or unrestrict Google services**, and **Manage app access to Google services & add apps**.
- **Exact quotations:**
  - “Requires having the Service Settings administrator privilege.”
  - “Restricted—Only internal and third-party apps configured with a Trusted or Specific Google data access setting can access data.”
  - “Enter the app's name or client ID, then click Search.”
  - “For Scope, select who to configure access for:”
  - “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
  - “You must include the Google Sign-in scopes required by the app to allow users to sign in with their Google Account.”
  - “Blocked—Can't access any Google service.”
- **Interpretation:** Do not prescribe **Trusted** for every installation. The administrator must permit the selected scopes for the intended users. Application permission does not give those users additional document access.

### T3-04 — The preview applicant needs a Google Workspace account that can join the program group

- **Status:** Required for the preview applicant. The rule for each additional connecting user is not clear.
- **Who and scope:** The applicant supplies their Google Workspace account details. Google verifies the account, adds it to a Google Group, and registers the Google Cloud project.
- **Documented action:** Follow the preview application procedure. Make sure that the applicant’s email account accepts addition to Google Groups. Wait for the final confirmation email before the trial.
- **Required values:** Use the applicant’s Google Workspace account and the trial’s Google Cloud project details.
- **Sources and exact quotations:**
  - https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
    Location: opening preview notice.  
    Quote: “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
  - https://developers.google.com/workspace/preview  
    Location: **How to join the program**.  
    Quotes:
    - “You need to provide us with your Google Workspace account and Google Cloud project information.”
    - “When we verify your Google Workspace account information, we will add you to a Google Group for the program and you should receive a notification.”
    - “Make sure that your email account accepts getting added to Google Groups.”
    - “After verifying your Google Workspace account, we will register your Google Cloud project.”
    - “When it is done, you will receive a final confirmation to your registered email address.”
- **Interpretation:** Use the registered Workspace account for the first trial. Do not claim that a personal Gmail account meets this prerequisite.

### T3-05 — Google Workspace for Education accounts can join the preview

- **Status:** Conditional. Applies when the applicant uses a Google Workspace for Education account.
- **Who and scope:** The account holder applies through the same preview program.
- **Source:** https://developers.google.com/workspace/preview  
  Location: **FAQ**, question about previously denied Education accounts.
- **Exact quotation:** “any Google Workspace for Education account holders can now join the program.”
- **Interpretation:** Do not exclude Education accounts on the basis of the earlier program restriction. This statement does not remove other organization policies.

## Unresolved questions

- **Non-blocking — Preview registration for additional users.**  
  The preview page says that API feature access is provided through registered projects. It also provides a process to register more email addresses:
  - Location: **FAQ**. Quote: “We provide you access to the program API features through your Google Cloud project(s).”
  - Location: **Questions and Requests**. Quote: “When you want to register more email addresses or Google Cloud projects to the program, submit a request using one of the forms.”
  
  The Docs MCP page and preview page do not clearly state that every connecting user must register separately. This does not block a trial with the registered account. Do not state that project registration automatically admits every user.

- **Non-blocking — Separate MCP license, user role, or individual switch.**  
  The checked Docs MCP setup page and preview page do not identify a separate Docs MCP license, an MCP invocation role, or an individual MCP enablement switch. This is not proof that these requirements are absent.

- **Non-blocking — Authority to add OAuth test users.**  
  The Docs procedure gives the necessary action and values. Topic 1 must confirm the applicable configuration authority.

## Cross-topic dependencies

- **Topic 1:** Use the documented **Service Settings administrator privilege** for application access controls. Confirm authority to change the OAuth test-user list and to accept preview terms.
- **Topic 2:** Complete preview account verification and project registration. Keep organization-wide policy configuration separate from access for the users’ organizational units.
- **Topic 4:** Use the same connecting-user email addresses in the External test-user list. Supply the selected OAuth scopes, including required Google Sign-in scopes, if the administrator selects **Specific Google data**.
- **Topic 5:** The remote server inherits user permissions. Endpoint configuration does not grant document access.
- **Coordinator:** Use the registered Workspace account for the first trial. Test a document that this account can read. For an update test, use a document that this account can edit. Do not state that each additional user needs preview registration, or that such registration is unnecessary, without further evidence.
## Topic 4 evidence

## Topic and status

**Topic 4: Authentication — complete.**

Select **manual OAuth registration with refresh tokens**:

- Google OAuth client type: **Web application**
- Issuer: `https://accounts.google.com`
- Token endpoint authentication method: `client_secret_post`
- Scopes: the four scopes in T4-02
- Audience: **Internal** where available and applicable; otherwise **External**, with **Testing** status and named test users
- Authorized redirect URI: the actual value represented by `{{ gram.oauth.callback_url }}`

The supplied central client evidence resolves the previous refresh-token compatibility gap. The selected client path sends `access_type=offline` and requests consent. It stores and uses refresh tokens. **Do not add a manual offline-access or token-storage step.**

**Observation date: 2026-09-11.** Google requirements were checked against live official sources. Client implementation findings use the supplied central check of official repository commit `99d626d8a8e314b6a1c1db6283af5f088e035bc1`. The client was not researched again. No files or provider settings were changed.

### Changes from the previous report

- **T4-01, T4-02, T4-03, T4-07, and T4-08:** Requirements and sources retained.
- **T4-04 and T4-05:** Google requirements retained. The supplied client evidence resolves the implementation checks.
- **T4-06:** Select `client_secret_post` and issuer `https://accounts.google.com`.
- **Previous blocking gap:** Replaced with a completed compatibility finding. No concrete Topic 4 blocker remains.

## Findings

### T4-01 — Use OAuth 2.0

- **Status:** Required.
- **Actor and scope:** The application administrator configures the OAuth client. The connecting user grants the application access to Google Docs.
- **Documented action:** Configure the OAuth consent screen, create an OAuth client, and use OAuth 2.0 for the remote connection.
- **Source:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server
- **Locations:** “Set up the OAuth consent screen”; “Configure your MCP client > Others.”
- **Observed:** 2026-09-11.
- **Exact quotations:**
  - “The Google Docs MCP server uses OAuth 2.0 for authentication and authorization.”
  - “You must configure the OAuth consent screen before you can create an OAuth client ID.”
- **Interpretation:** Use the documented OAuth procedure. The checked service-specific instructions do not give an API-key or static-token setup procedure. This does not establish that all other methods are unsupported.

### T4-02 — Configure the consent screen and four Docs scopes

- **Status:** Required for the selected documented setup.
- **Actor and scope:** The application administrator configures the Google Cloud project’s OAuth consent screen. Eligible users authorize the application.
- **Documented action and values:**
  1. Open **Google Auth Platform > Branding**.
  2. If the platform is not configured, select **Get Started**.
  3. Set **App name** to `Docs MCP Server`.
  4. Select the applicable **User support email**.
  5. Under **Audience**, select **Internal**. If Internal is not available, select **External**.
  6. Supply the contact email and complete the documented policy acceptance and creation steps.
  7. For External, open **Audience > Test users > Add users**. Add the connecting user and other authorized test users. Select **Save**.
  8. Open **Data Access > Add or Remove Scopes**.
  9. Under **Manually add scopes**, enter:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/documents.readonly`
     - `https://www.googleapis.com/auth/documents`
  10. Select **Add to Table**, then **Update**. On **Data Access**, select **Save**.
- **Environment-specific values:** The administrator supplies the support email, contact email, and authorized test-user email addresses.
- **Source:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server
- **Location:** “Set up the OAuth consent screen.”
- **Observed:** 2026-09-11.
- **Exact quotations:**
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “If you selected External for user type, add test users.”
  - “Under Manually add scopes, paste the scopes for the Google Docs MCP server.”
  - “After selecting the scopes required by your app, on the Data Access page, click Save.”
- **Interpretation:** Retain all four documented scopes for this setup. The source does not establish that each scope is separately necessary for every Docs operation. For the External trial, use Testing and retain the seven-day warning in T4-07.

### T4-03 — Register a Web application client with the correct callback

- **Status:** Required for the selected manual OAuth procedure.
- **Actor and scope:** The application administrator creates an OAuth client in the selected Google Cloud project. Speakeasy receives the client ID and client secret.
- **Documented action and values:**
  - Open **Google Auth Platform > Clients > Create Client**.
  - Select **Web application**.
  - Enter a **Name**.
  - Under **Authorized redirect URIs**, select **+ Add URI**.
  - Register the actual Speakeasy callback value represented by `{{ gram.oauth.callback_url }}`.
  - Select **Create**. Copy the **Client ID** and **Client Secret** to the client’s authentication settings.
- **Environment-specific values:** Google supplies the client ID and client secret. Speakeasy supplies the callback. Do not use a Claude or Antigravity callback.
- **Provider sources, observed 2026-09-11:**
  1. https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
     **Locations:** “Configure your MCP client > Claude”; “Antigravity.”
  2. https://developers.google.com/identity/protocols/oauth2/web-server  
     **Location:** Authorization request parameters, `redirect_uri`.
- **Exact quotations:**
  - “Select Web application as the application type.”
  - “Click Create and copy your Client ID and Client Secret.”
  - “The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client.”
  - “Note that the http or https scheme, case, and trailing slash ('/') must all match.”

**Supplied client evidence**

- **Source:** [AttachRemoteIdentityProviderSheet.tsx, lines 410–439](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/AttachRemoteIdentityProviderSheet.tsx#L410-L439).
- **Observed by the central check:** 2026-09-11.
- **Exact code quotations:** `clientId: clientId.trim()`, `clientSecret: clientSecret.trim() || undefined`, `client.remoteSessionClients.create`.
- **Source:** [challenge.go, lines 700–710](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/challenge.go#L700-L710), [lines 1158–1175](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/challenge.go#L1158-L1175).
- **Exact code quotation:** `/remote_login_callback`.
- **Interpretation:** The Manual UI uses the remote-session OAuth client path. New clients use the current callback, not the legacy callback. Use the documented callback value; do not construct a fixed host or use the old `/oauth/callback` path. Dynamic Client Registration is not needed for this selected path.

### T4-04 — Obtain and use refresh tokens

- **Status:** Required for the selected refresh-token setup.
- **Actor and scope:** The MCP client sends the authorization request. The connecting user grants access. The client receives, stores, and uses the tokens.
- **Google requirement:**
  - Use the authorization-code flow.
  - Send authorization request parameter `access_type=offline`.
  - Store the tokens securely.
  - Use the refresh token to obtain later access tokens.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Locations:** Authorization request parameter `access_type`; token response; “Refreshing an access token.”
- **Observed:** 2026-09-11.
- **Exact quotations:**
  - “Valid parameter values are online, which is the default value, and offline.”
  - “Set the value to offline if your application needs to refresh access tokens when the user is not present at the browser.”
  - “This value instructs the Google authorization server to return a refresh token and an access token the first time that your application exchanges an authorization code for tokens.”
  - “Your application should store both tokens in a secure, long-lived location that is accessible between different invocations of your application.”

**Supplied client evidence — previous gap resolved**

- **Sources:**
  - [challenge.go, lines 250–263](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/challenge.go#L250-L263) and [lines 770–795](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/challenge.go#L770-L795).
  - [google.go, lines 26–54](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/interceptors/google.go#L26-L54).
  - [challenge.go, lines 953–962](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/challenge.go#L953-L962) and [lines 1048–1058](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/challenge.go#L1048-L1058).
  - [tokenservice.go, lines 551–660](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/tokenservice.go#L551-L660).
- **Observed by the central check:** 2026-09-11.
- **Exact code quotations:**
  - `interceptors.NewGoogle(logger)`
  - `strings.EqualFold(u.Hostname(), "accounts.google.com")`
  - `q.Set("access_type", "offline")`
  - `m.enc.Encrypt([]byte(tok.RefreshToken))`
  - `RefreshTokenEncrypted: conv.PtrToPGText(refreshEnc)`
  - `refresh_token`
- **Interpretation:** With issuer `https://accounts.google.com`, the selected manual-client path requests offline access. The client encrypts and stores the returned refresh token. It uses the refresh-token grant and retains the previous refresh token if Google does not return a replacement. These findings satisfy the previous implementation check.
- **Reader action:** Configure the selected issuer and manual OAuth client. No separate manual `access_type` setting, `offline_access` scope, or token-storage step is needed.

### T4-05 — Request consent during initial authorization

- **Status:** Conditional Google requirement when initial setup needs a new grant for a previously authorized application. The selected client automatically requests consent.
- **Actor and scope:** The client sets the authorization parameter. The connecting user gives consent.
- **Documented value:** `prompt=consent`, with `access_type=offline`.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Location:** Authorization request parameter `prompt`.
- **Observed:** 2026-09-11.
- **Exact quotations:**
  - “If you don't specify this parameter, the user will be prompted only the first time your project requests access.”
  - “Prompt the user for consent.”

**Supplied client evidence — previous gap resolved**

- **Sources:**
  - [google.go, lines 26–54](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/interceptors/google.go#L26-L54).
  - [google_test.go, lines 44–75](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/interceptors/google_test.go#L44-L75).
- **Observed by the central check:** 2026-09-11.
- **Exact code quotations:**
  - `prompts = append(prompts, "consent")`
  - `require.Equal(t, "consent", q.Get("prompt"))`
- **Interpretation:** The selected path requests consent and offline access automatically. This resolves the previous initial-consent check. Do not add a manual parameter step or promise that every authorization attempt must succeed.

### T4-06 — Select the Google issuer and `client_secret_post`

- **Status:** Required configuration for the selected path. Manual endpoint entry is conditional on whether discovery supplies the values.
- **Actor and scope:** The administrator configures the application’s Google authorization-server connection.
- **Selected values:**
  - Issuer: `https://accounts.google.com`
  - Discovery URL: `https://accounts.google.com/.well-known/openid-configuration`
  - Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
  - Token endpoint: `https://oauth2.googleapis.com/token`
  - Token endpoint authentication method: `client_secret_post`
- **Source:** https://accounts.google.com/.well-known/openid-configuration
- **Location:** JSON fields `issuer`, `authorization_endpoint`, `token_endpoint`, and `token_endpoint_auth_methods_supported`.
- **Observed:** 2026-09-11.
- **Exact quotation:**
  ```json
  "token_endpoint_auth_methods_supported": [
    "client_secret_post",
    "client_secret_basic"
  ]
  ```

**Supplied client evidence**

- **Sources:**
  - [AttachRemoteIdentityProviderSheet.tsx, lines 410–439](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/AttachRemoteIdentityProviderSheet.tsx#L410-L439).
  - [challenge.go, lines 900–933](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/challenge.go#L900-L933).
  - [tokenservice_authmethod_test.go, lines 154–169](https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/server/internal/remotesessions/tokenservice_authmethod_test.go#L154-L169).
- **Observed by the central check:** 2026-09-11.
- **Exact code quotations:**
  - `tokenEndpointAuthMethod: tokenEndpointAuthMethod || undefined`
  - `TestResolveAccessToken_RefreshUsesClientSecretPost`
- **Interpretation:** Google supports `client_secret_post`. The client saves the selected method and uses it for token exchange and refresh. Select this method. The Google discovery document establishes authorization-server settings; it does not establish Docs MCP resource-discovery behavior.

### T4-07 — Account for the seven-day Testing limit

- **Status:** Conditional. Applies to an External OAuth application with publishing status **Testing** that requests the selected Docs scopes.
- **Actor and scope:** The administrator selects the application audience and status. The limit affects connecting users’ refresh tokens.
- **Setup effect:** Prefer Internal where available and applicable. Otherwise, use the documented External test-user procedure for the trial.
- **Source:** https://developers.google.com/identity/protocols/oauth2
- **Location:** “Refresh token expiration.”
- **Observed:** 2026-09-11.
- **Exact quotation:**
  > “A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of ‘Testing’ is issued a refresh token expiring in 7 days, unless the only OAuth scopes requested are a subset of name, email address, and user profile.”
- **Interpretation:** The four selected Docs scopes are outside this exception.
- **Required warning:** **For an External application in Testing, the refresh token expires after seven days. Another sign-in can be necessary.**

### T4-08 — Do not describe refresh tokens as permanent

- **Status:** Conditional. Applies when a documented expiration or invalidation condition occurs.
- **Actor and scope:** User actions, administrator policy, and Google token limits can end the application’s access.
- **Documented limits:**
  - Six months without refresh-token use can end access.
  - User revocation can end access.
  - Time-based access can expire.
  - An administrator can restrict a requested service.
  - Google permits 100 refresh tokens per Google Account per OAuth client ID. At that limit, a new token invalidates the oldest token.
- **Sources, observed 2026-09-11:**
  1. https://developers.google.com/identity/protocols/oauth2  
     **Location:** “Refresh token expiration.”
  2. https://developers.google.com/identity/protocols/oauth2/web-server  
     **Location:** Token response field `refresh_token_expires_in`.
- **Exact quotations:**
  - “The refresh token has not been used for six months.”
  - “The user granted time-based access to your app and the access expired.”
  - “There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.”
  - “The remaining lifetime of the refresh token in seconds. This value is only set when the user grants time-based access.”
- **Interpretation:** Do not promise permanent access, including for Internal applications. This report does not include credential renewal or rotation procedures.

## Unresolved questions

### Blocking questions

**None remain for Topic 4.**

The supplied central evidence resolves offline access, initial consent, refresh-token storage and use, and the selected token authentication method.

### Non-blocking — Deployment confirmation

The central check examined a pinned official repository commit. Tests were read, not run, and no authenticated Google connection was made. No concrete deployed-release difference was identified. This is a limit of the evidence, not an established compatibility failure.

### Non-blocking — Other authentication methods

The service-specific page documents OAuth 2.0. It does not give an API-key, service-account, or static bearer-token procedure for this MCP server. These methods are not selected. Their absence from the instructions does not prove that they are unsupported.

### Non-blocking — External production publication

The selected External path is a trial in Testing. Production publication and verification requirements remain outside this selection. Topic 2 must establish those requirements if production External access is selected later.

### Non-blocking — Administrative authority

The Docs page gives concrete OAuth configuration steps. Topic 1 must establish the applicable authority to configure the application, add scopes and test users, and accept the user-data policy. This report does not infer that authority from application creation alone.

### Non-blocking — Release-note confirmation

The live Docs setup page states “Last updated 2026-09-03 UTC.” No replacement notice was found in the checked content. This follow-up did not independently recheck release notes.

## Cross-topic dependencies

- **Topic 1:** Confirm authority to configure Google Auth Platform, create OAuth clients, add scopes and test users, and accept the user-data policy.
- **Topic 2:** Use the four-scope consent procedure. Select Internal where available and applicable; otherwise External Testing. Retain the seven-day warning. Production External publication is not selected.
- **Topic 3:** Confirm audience eligibility, test-user assignment where required, and underlying document access.
- **Topic 5:** Use OAuth 2.0 for `https://docsmcp.googleapis.com/mcp/v1`.
- **Coordinator:** The previous refresh-token compatibility check is resolved by the supplied central evidence. Use manual Web application registration, issuer `https://accounts.google.com`, `client_secret_post`, the four scopes, and the actual Speakeasy callback. Add no manual offline-access, consent-parameter, or token-storage step. Keep the separate provider security-screening requirement in the final setup review; it is not an authentication blocker established by this report.
## Topic 5 evidence

## Topic and status

**Topic 5: MCP endpoint and connection configuration — complete.**

Google documents a remote Google Docs MCP server. Its fixed URL is:

`https://docsmcp.googleapis.com/mcp/v1`

The documented connection does not need a local process, proxy, or bridge. Google Docs MCP is in Developer Preview. Project registration, API enablement, OAuth setup, and security checks apply.

**Observation date for all sources: 2026-09-11.** No provider settings or files were changed.

## Findings

### T5-01 — Use the Google Docs remote MCP endpoint

- **Status:** Required.
- **Actor and scope:** The IT administrator configures the client connection. The MCP client receives access to Google Docs through the signed-in user.
- **Documented values:**
  - Server name: `docs`
  - Server URL: `https://docsmcp.googleapis.com/mcp/v1`
  - Transport: HTTP
  - Authentication: OAuth 2.0
- **Source:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server#others  
  Location: **Configure your MCP client > Others**.
- **Exact quotations:**
  - “Server name: docs”
  - “Server URL: https://docsmcp.googleapis.com/mcp/v1”
  - “Transport: HTTP”
  - “The Google Docs remote MCP server uses OAuth 2.0.”
- **Interpretation:** This is an official remote MCP URL, not a general REST API address. The URL has no tenant, project, region, or environment variable. Use it unchanged. The “Others” instructions apply to clients other than the named Google and Claude clients.

### T5-02 — Enable the service in the customer’s Google Cloud project

- **Status:** Required.
- **Actor and scope:** A person with the applicable authority enables services in the Google Cloud project. Topic 1 must confirm that authority.
- **Documented action and values:** Enable both:
  - Google Docs API: `docs.googleapis.com`
  - Google Docs MCP API: `docsmcp.googleapis.com`
- **Environment-specific value:** `PROJECT_ID` is the customer’s Google Cloud project ID. It is used for service enablement, not in the MCP URL.
- **Source:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
  Locations: **Configure the Google Docs MCP server**, **Enable the APIs**, and **Enable the MCP services**.
- **Exact quotations:**
  - “To use the Google Docs MCP server, you must enable it in your Google Cloud project and then configure your MCP client to connect to it.”
  - “Google Docs API”
  - “Google Docs MCP API”
  - “Replace PROJECT_ID with your Google Cloud project ID.”
  - “Enable the MCP services in the Google Cloud console:”
- **Interpretation:** Google provides the remote address. The customer enables access in a project; the procedure does not create a tenant-specific endpoint. The service-specific page supports a Docs-only configuration. Do not copy the full Workspace API list into that configuration.

### T5-03 — Obtain Developer Preview access

- **Status:** Required while this server remains in Developer Preview.
- **Actor and scope:** The applicant supplies Google Workspace account and Google Cloud project information. Google verifies the account and registers the project.
- **Documented action:** Follow the linked Developer Preview application procedure. Topic 2 owns the application details. Topic 1 must check the authority to accept terms.
- **Sources:**
  1. https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
     Location: opening notice.
  2. https://developers.google.com/workspace/preview  
     Location: **How to join the program**.
- **Exact quotations:**
  - “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
  - “You need to provide us with your Google Workspace account and Google Cloud project information.”
  - “After verifying your Google Workspace account, we will register your Google Cloud project.”
  - “When it is done, you will receive a final confirmation to your registered email address.”
- **Interpretation:** The documented endpoint is established. Access to it is conditional on the required project and preview setup.

### T5-04 — Configure OAuth for this server

- **Status:** Required.
- **Actor and scope:** The application administrator configures OAuth. The connecting user authorizes access.
- **Documented action:** Configure the consent screen before creating an OAuth client ID. The official remote connector example uses a client ID and client secret.
- **Sources:** https://developers.google.com/workspace/docs/api/guides/configure-mcp-server  
  Locations: **Set up the OAuth consent screen**, **Configure your MCP client > Claude**, and **Others**.
- **Exact quotations:**
  - “You must configure the OAuth consent screen before you can create an OAuth client ID.”
  - “Select Web application as the application type.”
  - “In Advanced settings, enter your OAuth client ID and OAuth client secret.”
- **Docs scope values listed in the consent-screen procedure:**
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/documents.readonly`
  - `https://www.googleapis.com/auth/documents`
- **Interpretation:** Topic 4 must select and verify the applicable OAuth configuration. Do not copy a Claude or Antigravity callback URL into the Speakeasy setup. The coordinator must check the supplied Speakeasy callback and OAuth implementation.

### T5-05 — Select the Docs server, not all Workspace servers

- **Status:** Required selection for this task. Other servers are conditional on a separate need for their tools.
- **Actor and scope:** The IT administrator selects the service connection. Each server gives the client access to its own product tools.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers  
  Locations: introduction, **Configure your MCP client > Antigravity**, and **Supported products**.
- **Exact quotation:** “Each Google Workspace product has its own dedicated MCP server.”
- **Documented servers:**

| Server | Exact remote URL in the official configuration | Function, from listed tools |
|---|---|---|
| Gmail | `https://gmailmcp.googleapis.com/mcp/v1` | Read and search email; create drafts; change labels. |
| Google Drive | `https://drivemcp.googleapis.com/mcp/v1` | Search, read, create, copy, and download files; read file permissions. |
| **Google Docs** | **`https://docsmcp.googleapis.com/mcp/v1`** | Read and update documents. |
| Google Sheets | `https://sheetsmcp.googleapis.com/mcp/v1` | Read and update spreadsheets, values, formulas, and dimensions. |
| Google Slides | `https://slidesmcp.googleapis.com/mcp/v1` | Read and update presentations. |
| Google Calendar | `https://calendarmcp.googleapis.com/mcp/v1` | Read calendars; search, create, update, and delete events; respond to events. |
| Google Chat | `https://chatmcp.googleapis.com/mcp/v1` | Search conversations and messages; send messages; change read state; list memberships. |
| People API | `https://people.googleapis.com/mcp/v1` | Read user profiles; search contacts and directory people. |

- **Exact tool-name quotations from Supported products:**  
  Docs: “read_doc”, “update_doc”.  
  Drive: “get_file_permissions”, “search_files”.  
  People API: “get_user_profile”, “search_contacts”, “search_directory_people”.
- **Interpretation:** These are separate product servers, not tenant or environment variants. Only Docs is needed for the requested connection. Google lists Drive-related OAuth scopes for Docs, but that does not mean the client must also connect to the Drive MCP server.

**Server-specific differences**

- The shared configuration uses separate OAuth configuration entries for the servers. It also lists different scopes by product.
- Chat has an additional application configuration action.
  - **Source:** same shared page, **Configure the Chat app**.
  - **Exact quotation:** “To use the Google Chat MCP server, you must configure a Chat app in your Google Cloud project.”
- **Interpretation:** Do not apply Chat application setup or another product’s scopes to Docs. Separate server-specific permission and transport reviews are outside the Docs connection path.

### T5-06 — Apply the documented security requirement

- **Status:** Required; the choice of screening solution is conditional.
- **Actor and scope:** The application operator must provide prompt and response screening. This applies to the client’s use of Workspace MCP.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security  
  Location: opening text, before **Optional security and safety configurations**.
- **Exact quotation:** “You must screen prompts and responses for malicious content or prompt injection attacks. You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Interpretation:** Model Armor is not the only documented option. The coordinator must check whether the proposed Speakeasy setup meets this requirement. Topic 2 owns any required Google-side configuration.

### T5-07 — Use the current service-specific instructions

- **Status:** Required source selection.
- **Sources:**
  - https://developers.google.com/workspace/docs/api/guides/configure-mcp-server — page footer.
  - https://developers.google.com/workspace/release-notes — Google Docs MCP Developer Preview entry.
- **Exact quotations:**
  - “Last updated 2026-09-03 UTC.”
  - “The Model Context Protocol (MCP) server for Google Docs is now available in developer preview.”
- **Interpretation:** The live release notes confirm the Docs MCP launch. The maintained setup page gives the remote URL and contains no replacement notice in the checked content.

## Unresolved questions

- **Non-blocking — Additional endpoint settings:** The Docs connection instructions do not specify extra URL parameters, a tenant identifier, or non-authentication headers. This is not proof that all such settings are unnecessary. The documented URL and OAuth procedure are sufficient for the endpoint action.
- **Non-blocking for Topic 5 — Service enablement authority:** The service-specific setup page gives the enablement procedure, but this research did not establish the applicable administrator role. Topic 1 must check it.
- **Required compatibility check, owned by the coordinator — Security screening:** Google explicitly requires screening. The supplied client context does not establish that behavior. The coordinator must resolve this check before final setup-path approval.
- **Non-blocking — Other product servers:** The shared source establishes all eight Workspace addresses and their functions. A full review of each optional server’s scopes, permissions, and transport was not completed. Those servers are not required for the Docs-only path.

## Cross-topic dependencies

- **Topic 1:** Confirm authority to enable `docs.googleapis.com` and `docsmcp.googleapis.com`, configure OAuth, and accept preview terms.
- **Topic 2:** Use the Docs-only service list. Confirm preview account verification and project registration. Check Google-side security configuration if selected.
- **Topic 3:** Check connecting-user preview eligibility and document permissions. The Docs page says that the server will “Inherit the same permissions and data governance controls as the user.”
- **Topic 4:** Use OAuth 2.0 and the service-specific scope list. Verify manual client registration, refresh-token setup, and the required client authentication method.
- **Coordinator:** Use `https://docsmcp.googleapis.com/mcp/v1` for the custom remote connection. Verify the Speakeasy redirect URI, OAuth implementation, and required security screening. No endpoint blocker was found.
## Central client implementation evidence

# Central client checks — complete

Observed: 2026-09-11. Official repository: https://github.com/speakeasy-api/gram. Commit checked: `99d626d8a8e314b6a1c1db6283af5f088e035bc1`.

This check concerns upstream OAuth to Google for a remote source. It does not concern downstream OAuth to the Control Plane. The selected mode is a manually registered client. DCR and CIMD are not selected.

All file references below have this prefix:
https://github.com/speakeasy-api/gram/blob/99d626d8a8e314b6a1c1db6283af5f088e035bc1/

## C-01 — Manual client binding

- `client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/AttachRemoteIdentityProviderSheet.tsx#L410-L439`: `clientId: clientId.trim()`, `clientSecret: clientSecret.trim() || undefined`, `tokenEndpointAuthMethod: tokenEndpointAuthMethod || undefined`, then `client.remoteSessionClients.create`.
- `server/internal/remotesessions/clienthandlers.go#L156-L227`: `CreateRemoteSessionClient` checks project write access and stores the client ID, encrypted secret, scope, and token authentication method. New clients use `LegacyCallbackUrl: false`.
- `server/internal/remotesessions/challenge.go#L374-L412`: `ListClients` reads the stored binding, including `ExternalClientID`, issuer URL, scope, and token endpoint. This is the client record used for remote authorization.
- Interpretation: The Manual UI feeds the remote-session client path. DCR is not necessary for this path. Project write access applies to the configuration operation.

## C-02 — Google offline access and initial consent

- `server/internal/remotesessions/challenge.go#L250-L263` installs `interceptors.NewGoogle(logger)`.
- `server/internal/remotesessions/challenge.go#L770-L795` sets `client_id` from `client.ExternalClientID`, then calls `ic.ModifyAuthorize(ctx, q)` when the interceptor matches `client.IssuerURL`.
- `server/internal/remotesessions/interceptors/google.go#L26-L54`: `strings.EqualFold(u.Hostname(), "accounts.google.com")`, `q.Set("access_type", "offline")`, `prompts = append(prompts, "consent")`.
- `server/internal/remotesessions/interceptors/google_test.go#L44-L75`: `require.Equal(t, "offline", q.Get("access_type"))` and `require.Equal(t, "consent", q.Get("prompt"))`. Tests also retain other prompt values.
- Interpretation: With issuer `https://accounts.google.com`, the selected manual-client path automatically requests offline access and consent. Do not add a manual parameter-setting step. No separate feature flag occurs in this applicable path.

## C-03 — Callback and token exchange

- `server/internal/remotesessions/challenge.go#L700-L710` selects the canonical callback for new clients; legacy clients use a separate branch.
- Same file `#L770-L774`: `q.Set("redirect_uri", redirectURI)`.
- Same file `#L1158-L1175`: the callback is the configured server URL plus the route base and `/remote_login_callback`; the legacy callback is `/oauth/callback`.
- Same file `#L900-L933`: the callback decrypts the client secret, resolves the saved token authentication method, and exchanges the authorization code.
- Interpretation: Use the documented `{{ gram.oauth.callback_url }}` in the guide. Do not invent a fixed host. The documented Redirect URI comparison protects against a mismatch. New manual registration is not the legacy-client branch.

## C-04 — Refresh-token storage and use

- `server/internal/remotesessions/challenge.go#L953-L962`: `m.enc.Encrypt([]byte(tok.RefreshToken))` when a refresh token is returned.
- Same file `#L1048-L1058`: session storage includes `RefreshTokenEncrypted: conv.PtrToPGText(refreshEnc)`.
- `server/internal/remotesessions/tokenservice.go#L131-L165` provides `ResolveAccessToken`; its documented behavior refreshes a token near expiry if a refresh token is present.
- Same file `#L551-L603`: decrypts `sess.RefreshTokenEncrypted`, resolves the stored token authentication method, sets `grant_type` to `refresh_token`, and posts the grant to the upstream token endpoint.
- Same file `#L622-L660`: stores a new encrypted refresh token when returned; otherwise retains the previous token.
- `server/internal/remotesessions/tokenservice_authmethod_test.go#L154-L169`: `TestResolveAccessToken_RefreshUsesClientSecretPost` checks the refreshed access token and the client ID and secret in the request body. It checks that the Authorization header is empty for `client_secret_post`.
- Interpretation: Select `client_secret_post`, which Google discovery supports. The client stores and uses refresh tokens. This is automatic behavior, not a credential-maintenance procedure for the reader.

## C-05 — Conditions and limits

The Google issuer match, saved client binding, returned refresh token, and permitted upstream token endpoint must apply. Tests were read, not run. No authenticated provider connection was made. No concrete deployed-release difference was found; no release blocker is asserted. The current commit differs from the earlier partial check, so this recovery records a new pin rather than silently extending the old one.

Client-native screening was not established. Select the provider's documented Model Armor option from Topic 2 instead. This does not assert that the Control Plane lacks screening support.

Use `doctrine/speakeasy-setup.md` for all reader actions. These implementation facts add no manual offline-access or token-storage step.

## Canonical client doctrine — source transclusion

```markdown
# Speakeasy setup — canonical file

The single source for every Guide's `speakeasy.md`: the steps a reader
follows in the Speakeasy AI Control Plane after finishing External setup
(`external.md`). This file is doctrine — maintained by a human, read-only
to pipeline agents (constitution I7), changed only per invariant I8.
Technical Research transcludes the skeleton below into each guide's
Research Dossier and records the per-guide values it renders with; the
Writer renders `speakeasy.md` from the Dossier like any other facts.
Consumers may omit this file when Speakeasy setup is already in context
(for example an installed MCP server's detail page showing only
`external.md`).

UI facts below are drawn from the product source
(`speakeasy-api/gram`, `client/dashboard`, branch `main`): add-server and
Manual OAuth / Upstream Headers labels from commit `96f7f73` (observed
2026-07-23); Dynamic Client Registration (DCR) attach-sheet labels from
commit `f1d60da` (observed 2026-07-27). Labels are verbatim code-level
strings; a rendered-UI spot check on first use is still worthwhile. No
role may invent a label this file does not carry.

## Per-guide values (recorded in the Dossier's Speakeasy setup section)

- `<remote URL>` — from `meta.yaml` `remotes`. (The Control Plane
  proxies remote servers over streamable-http; the add form's
  **Transport** field is read-only.) Mark each remote
  `tenanted: true` when the reader must paste a region, instance, or
  org-specific URL rather than a single shared public endpoint. When the
  URL is shared but the guide must still skip the catalog (unreliable
  mapping, multi-endpoint selection), set guide-level
  `speakeasy_add_server: custom-remote` instead of mislabeling remotes
  as tenanted.
- Optional `speakeasy_add_server`: `auto` (default), `catalog`, or
  `custom-remote`.
- The Authentication Option the guide documents, which External-setup
  step produced each credential field, and — for OAuth options — any
  scopes the provider requires. For DCR, also record the **Issuer URL**
  (often the remote origin) when the Control Plane cannot discover it
  from protected-resource metadata alone.
- `<further-reading URL>` — the provider's primary MCP documentation
  page, for the closing pointer.

## Add-server path selection

There are two add-server paths. Pick **exactly one** when the path is
resolved; keep both only when Pulse presence is unresolved **and** no
override applies.

1. **Tenanted** — any `remotes[].tenanted: true` → **Custom remote only**
   (treat as non-registry), even if Pulse lists the provider.
2. Else **`speakeasy_add_server`**:
   - `custom-remote` → Custom remote only
   - `catalog` → catalog only
   - `auto` / omitted → Pulse catalog presence in operator notes:
     - **present** → catalog (3rd-party server) only
     - **absent** → Custom remote only
     - **ambiguous** / **skipped** / no lookup → both bullets + soft
       catalog-presence open question

Do not keep the alternate path or a catalog-presence open question when
the path is resolved (tenanted, `speakeasy_add_server` override, present,
or absent).

## The skeleton (anchors are fixed; carry them verbatim)

Both bullets below are **source material**. Research emits only the
matching imperative path (or both when unresolved). Writer renders what
the Dossier chose — not the conditional "If … is in the catalog" framing
when presence is known.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

**Catalog path** (Pulse **present** with `auto`, or
`speakeasy_add_server: catalog`; never when tenanted or
`custom-remote`): choose **3rd-party server**. On the **MCP Catalog**
page, find <Provider> (the search box reads **Search MCP servers...**),
open its entry with **View**, and click **Add**. In the **Add to
Project** dialog, click **Add to Project**.

**Custom remote path** (tenanted, `speakeasy_add_server: custom-remote`,
or Pulse **absent**): choose **Custom remote server**. On the **Add a
custom remote MCP server** page, paste `<remote URL>` into **Remote MCP
server URL** and click **Add server**.

**Dual conditional** (Pulse **ambiguous** / **skipped** only, `auto`,
and not tenanted / not forced) — keep both as bullets:

- If <Provider> is in the catalog: choose **3rd-party server**. On the
  **MCP Catalog** page, find <Provider> (the search box reads
  **Search MCP servers...**), open its entry with **View**, and click
  **Add**. In the **Add to Project** dialog, click **Add to Project**.
- If it is not: choose **Custom remote server**. On the
  **Add a custom remote MCP server** page, paste `<remote URL>` into
  **Remote MCP server URL** and click **Add server**.

Either resolved path (or either dual branch) creates the hosted MCP
server and opens its **Overview** page. When only one path is emitted,
close with: This creates the hosted MCP server and opens its
**Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. The Writer renders
only the variant matching the guide's Authentication Option, names the
guide's actual fields, and cross-links each value to the External-setup
step that produced it (or, for DCR with no External credentials, to the
step that produced the issuer / region URL).

- OAuth with a pre-registered client: under **Authentication**, click
  **Configure Manually** (or **Use Discovered** when offered — the
  Dossier records whether the provider publishes discoverable OAuth
  metadata). In the **Attach Remote Identity Provider** sheet, set
  **Client Type** to **Manual**. The sheet shows the **Redirect URI**
  with a copy button — the callback URL the guide had the reader
  register in External setup (`{{ gram.oauth.callback_url }}`).
  <!-- verify(operator): the template key substitutes this same Redirect URI value -->
  Paste the **Client ID** and **Client Secret (optional)** from
  External setup, then click **Attach Identity Provider**. Confirm the
  sheet's **Redirect URI** matches the `{{ gram.oauth.callback_url }}`
  value registered under the provider's redirect/callback field in
  External setup — readers paste that template key directly there; they
  do not visit this sheet mid–External-setup only to copy the URI.
- OAuth with Dynamic Client Registration (DCR): under **Authentication**,
  click **Configure Manually** (or **Use Discovered** when offered — the
  Dossier records whether protected-resource metadata makes discovery
  available without a pasted issuer). In the **Attach Remote Identity
  Provider** sheet, when the issuer is not already known, paste the
  provider **Issuer URL** from External setup (typically the remote MCP
  origin). Keep the auto-derived **Slug** and **Display name (optional)**
  unless the Dossier records a project naming requirement. Under
  **Endpoints**, click **Discover** so authorization, token, and
  registration endpoints fill from the provider's authorization-server
  metadata. Under **Session Client**, keep **Client Type** set to
  **Dynamic Client Registration (DCR)** (the default when a registration
  endpoint is discovered). Keep **Token Endpoint Auth Method** at the
  discovered default unless the Dossier records a required override.
  Leave **Scope (override)** and **Audience (optional)** empty unless
  the Dossier records values to enter. Click **Attach Identity
  Provider**. The Control Plane registers the OAuth client at the
  provider's registration endpoint — there is no **Client ID** or
  **Client Secret** to paste, and readers do not register
  `{{ gram.oauth.callback_url }}` on the provider for this path. When a
  client first needs provider access, complete the provider's on-screen
  browser authorization prompts with the intended account (exact prompt
  labels are provider-specific; do not invent them).
- API key / token: under **Upstream Headers**, click **Add header**,
  enter the **Header name** (for example `Authorization`), leave
  **Value source** as **Static value**, paste the value from External
  setup, check **Secret**, and click **Save**. (Catalog installs may
  collect the same headers earlier, in the **Add to Project** dialog's
  **Upstream headers** section.)
<!-- screenshot: the Attach Remote Identity Provider sheet (Manual with Redirect URI, or DCR after Discover with Client Type Dynamic Client Registration), or the Upstream Headers editor; values redacted -->

## The closing pointer

The guide's final line — plain prose after the last Speakeasy step in
`speakeasy.md`:

> This guide covers setup only. For anything beyond it — billing, tool
> behavior, limits — see [<Provider>'s MCP documentation](<further-reading URL>).

Rendered as a normal sentence, not a blockquote; the quote above is
template text.

## Out of scope (operator note)

The server's Settings also carry the hosted **Server URL**, publishing,
and plugin surfaces (the dashboard's readiness checklist runs Server URL
→ Authentication → Source → Included in Plugin). Guides stop after
credentials; extend this file deliberately if distribution steps should
ever join guide scope.

```

## Final draft checks and schema limitation

Observed: 2026-09-11. The source check confirms the exact command argument `--full-uri='projects/PROJECT_ID/locations/global/floorSetting'`. Sources: Workspace **Configure protection for Google and Google Cloud remote MCP servers**, https://developers.google.com/workspace/guides/configure-mcp-security; and gcloud **SYNOPSIS / REQUIRED FLAGS**, https://docs.cloud.google.com/sdk/gcloud/reference/model-armor/floorsettings/update. Exact excerpts: `gcloud model-armor floorsettings update --full-uri=FULL_URI`; “Full uri of the floor setting”. The draft uses this flag, not a positional resource argument. This correction does not change the action or audited authority.

Google's maintained Docs page, **Configure your MCP client > Others**, states “Transport: HTTP”. It does not name Streamable HTTP. The unchanged repository schema requires a transport value and accepts only `sse` or `streamable-http`. Metadata uses `streamable-http` as its HTTP classification, not as a verified transport claim. The metadata comment makes this limitation explicit. The official remote URL passes this trial's endpoint gate without transport-specific proof. Do not infer an unsupported endpoint from this schema limitation. No schema or safeguard was changed. Normal review must retain this distinction or authorize a schema representation for unspecified HTTP.
