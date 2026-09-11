# Google Drive research dossier

Status: complete for the selected path. Observed: 2026-09-11.

Provider: Google. Service: Google Drive. Mode: update. Slug: google-drive. Destination: /workspace/guides/google-drive/. Persona: doctrine/personas/it-admin.md. Client: Speakeasy AI Control Plane.

The endpoint gate passed before Topics 1-4 started. The authentication follow-up passed before the final Topic 1 authority audit. The audit passed. No automated post-draft review is authorized.

# Selected setup actions

Select the Google Drive server only, with Manual OAuth and refresh-token support. Use Internal organization access where eligible. Keep External Testing as a conditional path for approved users within preview terms. Do not include public production publication, DCR, API keys, service accounts, or new Model Armor deployment.

| Action and anchor | Topic findings | Selected action |
|---|---|---|
| A1 enroll-preview | T1-05, T2-01/02, T3-07, T5-03 | An authorized person enrolls the Workspace account and Cloud project, accepts terms, permits Google Groups membership, and waits for confirmation. Keep public/outside-company and government data limits. |
| A2 confirm-screening | T1-07, T2-08, T5-07 | Require an existing custom application screening solution for prompts and responses. The security/application owner documents it so users can accept its risk. Do not claim automatic client screening. Google explicitly permits this alternative. |
| A3 enable-drive-services | T1-01, T2-03, T5-02 | In the registered project, enable drive.googleapis.com and drivemcp.googleapis.com with Service Usage Admin. Use an existing suitable project. |
| A4 configure-consent | T1-02, T2-04/05, T3-04/05, T4-03/07 | Configure Branding, audience, contact information and terms; use Internal where eligible, otherwise External Testing for authorized users. Add drive.readonly and drive.file. Add test users when applicable. OAuth Config Editor is the narrower documented role. |
| A5 create-oauth-client | T1-02, T2-06, T4-02 | Create a Web application client in Google Auth Platform; register {{ gram.oauth.callback_url }}; copy Client ID and Client Secret securely. |
| A6 confirm-user-access | T1-06, T2-07, T3-01/02/03/06 | Users need Drive and file access. A Service Settings administrator helps when Workspace API controls require approval. File owners or authorized sharing managers grant necessary file access. Keep CAA/DLP/CSE and other file restrictions. Do not require MCP Tool User without current Drive-specific evidence. |
| A7 add-server-in-speakeasy | T5-01, client doctrine | Use custom remote due to unverified catalog mapping for this preview service. URL https://drivemcp.googleapis.com/mcp/v1. |
| A8 connect-speakeasy-credentials | T4-01/02/10, client doctrine | Use discovered OAuth metadata and Manual client credentials. Confirm callback. Upstream offline/consent parameters are automatic, not user entry steps. |

Sources for each action are in the corresponding complete topic reports. All were observed 2026-09-11. Exact setup instructions and quotes remain in those reports.

All provider anchors above receive a screenshot placeholder for the applicable page. confirm-screening receives a screenshot exception because the existing security solution is organization-specific.
# Client evidence

Observed: 2026-09-11. Repository: https://github.com/speakeasy-api/gram. Commit: 496e62ca5d5ebd99f0c189f2614fc9c707e44659.

## Upstream Google OAuth

The live protected-resource metadata at https://drivemcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1 identifies `https://accounts.google.com/` as the authorization server. It lists drive, drive.readonly, and drive.file. Select only the two scopes in the provider's setup procedure: drive.readonly and drive.file.

- https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google.go#L26-L55: `strings.EqualFold(u.Hostname(), "accounts.google.com")`; `q.Set("access_type", "offline")`; consent is merged into prompt. This is automatic upstream behavior when the issuer host matches Google.
- https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L250-L264: `interceptors.NewGoogle(logger)` is registered in the challenge manager. No feature flag occurs at this registration.
- https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L766-L795: the request uses `client.ExternalClientID`, the redirect URI, scopes, and matching authorize interceptors. This code does not restrict the interceptor to DCR. Manual registration supplies the external client ID. This is the upstream authorization request, not downstream client registration.
- https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L950-L965: `m.enc.Encrypt([]byte(tok.RefreshToken))` stores the upstream refresh token in encrypted form.
- https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/tokenservice.go#L537-L590: `form.Set("grant_type", "refresh_token")` sends an upstream refresh grant.
- https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google_test.go#L13-L76: tests check the Google host, reject other hosts, require offline and consent, preserve other prompt values, and avoid duplicate consent.
- https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge_issuer_strategy_e2e_test.go#L63-L90: tests check scope handling and storage of an upstream refresh token.
- https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/tokenservice_concurrent_refresh_test.go#L75-L95: the test handler checks the upstream refresh grant.

The tests were read, not run. No concrete release mismatch was found. These implementation facts do not add a user setup action. Keep documented client setup paths from doctrine/speakeasy-setup.md.

## Security and policy conditions

Google permits an existing custom screening solution if its use is documented for user risk acceptance. Use this as a required application prerequisite; do not claim that the Control Plane automatically provides the required screening. No new Model Armor deployment is selected. The application/security owner must supply screening for prompts and responses and document it. The exact deployment depends on that existing solution.

Source: https://developers.google.com/workspace/guides/configure-mcp-security, opening requirements, observed 2026-09-11: "You must screen prompts and responses for malicious content or prompt injection attacks. You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk."

CAA remains conditional. Do not assert device-context support. Tell readers that files are ineligible when policy blocks the client context or required context is missing, including offline use. Keep DLP, CSE, abuse, and trash restrictions. These are file eligibility conditions, not evidence that the whole server is unsupported.

## Canonical source reports

Each requirement ID maps to a setup action above. The reports retain source quotes, dates, recipients, conditions, and non-blocking questions. T4-08 describes an unused production alternative, not a guide action. The final Topic 1 audit supersedes broader initial actor claims. No old guide setup is used as evidence.

## Topic and status

**Topic 1: Setup permissions and administrative access — complete.**

The selected provider setup actions have documented permission options. The reader can use **Service Usage Admin** and **OAuth Config Editor** on the existing registered Cloud project. Separate Workspace privileges apply when Drive service access or application access needs a change.

The person who accepts organizational terms must have authority to do so. Cloud configuration roles do not establish that authority.

**Observation date for all sources: 2026-09-11.**

### Changes from the previous report

- **Updated T1-02:** Covers the selected Internal or External Testing audience, test-user assignment, Web application client, and callback configuration.
- **Updated T1-05:** Includes the consent-screen policy agreement and preview use limits.
- **Replaced T1-07:** The selected path uses an existing custom screening solution. No new Model Armor deployment is selected.
- **Added T1-08:** Establishes the privilege needed to enable Drive for users.
- **Added T1-09:** Establishes file and shared-drive sharing authority.
- **Added T1-10:** Separates user consent from application setup authority.
- **Added the final A1–A8 authority check.**
- T1-01, T1-03, T1-04, and T1-06 retain their requirements and sources. T1-03 is not an action for the selected existing-project path.

## Findings

### T1-01 — Permission to enable the two Drive services

- **Status:** Required.
- **Actor and scope:** A person with service enablement permission on the selected Google Cloud project. The project receives access to the services.
- **Documented permission:** `serviceusage.services.enable`.
- **Documented role option:** **Service Usage Admin**, `roles/serviceusage.serviceUsageAdmin`.
- **Action and values:** Enable:
  - `drive.googleapis.com`
  - `drivemcp.googleapis.com`
- Obtain the project ID from the Cloud project owner. Use the project registered for Developer Preview.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
  - **Locations:** “Enable the APIs”; “Enable the MCP services.”
  - **Exact quotations:**
    - “To use the Google Drive MCP server, you must enable the following API in your Google Cloud project”
    - “To enable the MCP components for Google Drive, you must enable the following service in your Google Cloud project”
    - “Replace `PROJECT_ID` with your Google Cloud project ID.”
- **Source:** https://cloud.google.com/service-usage/docs/access-control
  - **Locations:** Permission table for `services.enable`; “Predefined roles” → “Service Usage Admin.”
  - **Exact quotations:**
    - “On the project: `serviceusage.services.enable`”
    - “On the service: `servicemanagement.services.bind`”
    - “Ability to enable, disable, and inspect service states, inspect operations, and consume quota and billing for a consumer project.”
- **Interpretation:** Use the service-specific role instead of defaulting to project Owner or Editor. This role does not replace preview approval.

### T1-02 — Permission to configure OAuth and create the client

- **Status:** Required. Test-user assignment is conditional on the External Testing path.
- **Actor and scope:** The application setup operator needs write access to OAuth configuration in the selected Cloud project. The OAuth application receives the configuration.
- **Documented role option:** **OAuth Config Editor**, `roles/oauthconfig.editor`. The role page marks it **Beta**.
- **Selected actions and values:**
  - Configure **Branding**, audience, support contact, and project contact information.
  - Select **Internal** where eligible. Otherwise, use **External** with authorized test users.
  - Add these scopes through **Data Access > Add or Remove Scopes**:
    - `https://www.googleapis.com/auth/drive.readonly`
    - `https://www.googleapis.com/auth/drive.file`
  - For External Testing, use **Audience > Test users > Add users**. Enter the approved Google Account email addresses and select **Save**.
  - Create a **Web application** client through **Google Auth Platform > Clients > Create Client**.
  - Register the supplied client callback, `{{ gram.oauth.callback_url }}`, under **Authorized redirect URIs**.
  - Copy the **Client ID** and **Client Secret** securely.
- Obtain the contact addresses, approved user list, and client name from the application owner. The callback comes from the supplied client context, not from Google's example.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
  - **Locations:** “Set up the OAuth consent screen”; “Configure your MCP client” → OAuth client creation instructions.
  - **Exact quotations:**
    - “You must configure the OAuth consent screen before you can create an OAuth client ID.”
    - “Under Audience, select Internal. If you can't select Internal, select External.”
    - “Enter your email address and any other authorized test users, then click Save.”
    - “Select Web application as the application type.”
    - “Click Create and copy your Client ID and Client Secret.”
  - The scope section lists the two values above.
- **Source:** https://cloud.google.com/iam/docs/roles-permissions/oauthconfig
  - **Location:** “OAuth Config Editor.”
  - **Exact quotations:**
    - “Read/write access to OAuth config resources”
    - `clientauthconfig.brands.create`
    - `clientauthconfig.brands.update`
    - `clientauthconfig.clients.create`
    - `clientauthconfig.clients.createSecret`
    - `clientauthconfig.clients.update`
    - `oauthconfig.testusers.update`
    - `oauthconfig.verification.submit`
- **Interpretation:** This role supports the selected OAuth configuration, credential creation, and test-user actions. Its verification permission does not make verification an action for this selected path. The role does not grant Drive file access, Workspace policy authority, or authority to accept organizational terms.

### T1-03 — Permission to create a project

- **Status:** Conditional. Applies only if a suitable project is unavailable. **Not selected for this setup.**
- **Actor and scope:** A project creator creates the project in the applicable Cloud resource location.
- **Documented permission:** `resourcemanager.projects.create`.
- **Documented role option:** **Project Creator**, `roles/resourcemanager.projectCreator`.
- **Action:** Create a Cloud project. Obtain the organization or folder choice from the Cloud resource owner.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
  - **Location:** “Prerequisites.”
  - **Exact quotation:** “A Google Cloud project. To create a project, see Create a project.”
- **Source:** https://cloud.google.com/resource-manager/docs/creating-managing-projects
  - **Location:** “Create a project.”
  - **Exact quotation:** “To create a project, you must have the `resourcemanager.projects.create` permission. This permission is included in roles like the Project Creator role (`roles/resourcemanager.projectCreator`).”
- **Interpretation:** Do not request this role for the selected existing-project path.

### T1-04 — Another authorized person must grant missing project roles

- **Status:** Conditional. Applies when the setup operator lacks the required project permissions.
- **Actor and scope:** A person authorized to change the project's IAM allow policy grants the missing role to the setup operator.
- **Documented permission:** `resourcemanager.projects.setIamPolicy`.
- **Documented role option for the person who grants access:** **Project IAM Admin**, `roles/resourcemanager.projectIamAdmin`.
- **Action:** Grant the missing role through the Google Cloud console. Obtain the setup operator's account identifier from the organization.
- **Source:** https://cloud.google.com/resource-manager/docs/access-control-proj
  - **Locations:** Permission table; “Project IAM Admin”; “Access control at the project level.”
  - **Exact quotations:**
    - “Provides permissions to administer allow policies on projects.”
    - `resourcemanager.projects.setIamPolicy`
    - “You can grant roles to users at the project level using the Google Cloud console, the Cloud Resource Manager API, and the Google Cloud CLI.”
    - “the `setIamPolicy` permission for organization, folder, and project resources allows the user to grant all other permissions, and so should be assigned with care.”
- **Interpretation:** Ask an existing authorized person to grant the narrow setup roles. Do not give the setup operator Project IAM Admin only to permit self-assignment.

### T1-05 — Authority to enroll and accept organizational terms

- **Status:** Required. The government data limit is conditional.
- **Actor and scope:** The applicant supplies the Workspace account and Cloud project information. A person who acts for an organization must have authority to bind it to the applicable terms.
- **Actions:**
  - Read the preview terms and submit the linked application.
  - Supply the account and project information from their owners.
  - Ensure that the applicant's account accepts Google Group membership.
  - Wait for Google's final project registration confirmation.
  - During consent-screen configuration, have an authorized person accept the Google API Services User Data Policy.
- **Source:** https://developers.google.com/workspace/preview
  - **Locations:** “How to join the program”; “Developer Preview Program Terms.”
  - **Exact quotations:**
    - “Read through the Program Terms before applying. We will ask you if you agree with the terms in the application form.”
    - “You need to provide us with your Google Workspace account and Google Cloud project information.”
    - “Make sure that your email account accepts getting added to Google Groups.”
    - “After verifying your Google Workspace account, we will register your Google Cloud project.”
    - “When it is done, you will receive a final confirmation to your registered email address.”
    - “I agree to the Google APIs Terms of Service.”
- **Source:** https://developers.google.com/terms
  - **Location:** Section 1, “b. Entity Level Acceptance.”
  - **Exact quotation:** “If you are using the APIs on behalf of an entity, you represent and warrant that you have authority to bind that entity to the Terms”.
  - **Location:** Opening definition of Terms.
  - **Exact quotation:** “any applicable policies and guidelines as the ‘Terms.’”
  - **Location:** Section 3, user privacy provisions.
  - **Exact quotation:** “You will comply with (1) all applicable privacy laws and regulations including those applying to personal data and (2) the Google API Services User Data Policy”.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
  - **Location:** “Set up the OAuth consent screen” → “Finish.”
  - **Exact quotation:** “review the Google API Services User Data Policy and if you agree, select I agree to the Google API Services: User Data Policy.”
- **Preview limits — same preview source, clauses (ii), (iv), and (vii):**
  - “program features may not be included in public applications prior to the General Availability (GA) announcement.”
  - “I may not grant end users access, outside my domain or company”
  - “unless Google specifically states that I can request such permission and such permission has been granted to my Workspace account for that feature.”
  - For a government or regulatory entity, “excluding educational institutions”: “I may only use test or experimental data”.
- **Interpretation:** OAuth Config Editor does not establish authority to accept these terms. Selecting External Testing does not permit use outside the preview limits.

### T1-06 — Authority to approve application access under Workspace policy

- **Status:** Conditional. Applies when Workspace API controls require an application access change.
- **Actor and scope:** A Workspace administrator with the **Service Settings administrator privilege** changes access for the OAuth application and selected organizational units.
- **Action:** Use **Security > Access and data control > API controls > Manage App Access**. Configure a new application or change an existing application's access.
- Use the client ID from T1-02. Obtain the organizational units and approved access setting from the Workspace security owner.
- **Source:** https://support.google.com/a/answer/7281227
  - **Locations:** Configured application instructions; “Configure a new app”; change-access instructions.
  - **Exact quotations:**
    - “Requires having the Service Settings administrator privilege.”
    - “Enter the app's name or client ID, then click Search.”
    - “Select the organizational units to configure access for”
    - “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
    - “Blocked—Can't access any Google service.”
- **Interpretation:** This approval is separate from Cloud OAuth configuration and user consent. Do not require organization-wide **Trusted** access by default.

### T1-07 — Existing custom screening is a required application prerequisite

- **Status:** Required for the selected path.
- **Actor and scope:** The application or security owner supplies an existing solution that screens MCP prompts and responses. Users receive its documentation so they can accept the risk.
- **Action:** Confirm that the existing solution covers the application. Document the solution for user risk acceptance. Obtain that documentation from its owner.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security
  - **Location:** Opening requirements.
  - **Exact quotation:** “You must screen prompts and responses for malicious content or prompt injection attacks. You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Retained conditional source fact:** The same page, “Enable Model Armor,” states: “You must enable Model Armor APIs before you can use Model Armor.”
- **Interpretation:** Google permits the selected custom solution. The selected action does not include a new security deployment. Do not add Model Armor roles or claim that Speakeasy automatically provides the screening. The provider does not name a Google administrator role for documentation of an existing custom solution.

### T1-08 — Authority to enable Drive for connecting users

- **Status:** Drive availability is required. A configuration change is conditional on Drive being disabled for the applicable users.
- **Actor and scope:** A Workspace administrator with the **Drive & Docs administrator privilege** enables the service for the applicable organization, organizational unit, or access group.
- **Action:** Open **Apps > Google Workspace > Drive and Docs > Service status**. Enable the service for the approved user scope. Obtain that scope from the Workspace owner.
- **Source:** https://developers.google.com/workspace/drive/api/guides/drive-mcp-server-file-eligibility
  - **Location:** “Eligibility requirements” → “Service availability.”
  - **Exact quotation:** “The Google Drive service must be enabled for the user's organization in the Google Workspace Admin console.”
- **Source:** https://knowledge.workspace.google.com/admin/users/access/turn-google-drive-and-docs-on-or-off-for-users
  - **Location:** Service on/off instructions.
  - **Exact quotations:**
    - “Requires having the Drive & Docs administrator privilege.”
    - “Click Service status.”
    - “To change the Service status, select On or Off.”
    - “To turn on a service for a set of users across or within organizational units, select an access group.”
- **Source notice:** The earlier support URL, https://support.google.com/a/answer/6115117, redirects to this current official page.
- **Interpretation:** Service Usage Admin on the Cloud project does not establish authority for this Workspace service setting.

### T1-09 — Authority to grant file access

- **Status:** Conditional. Applies when the connecting user lacks the required file or folder access.
- **Actor and scope:** A person with sharing authority for the item grants access to the connecting user's Google Account.
- **Required access:** At least `reader` for file eligibility. Write operations need the applicable additional permission.
- **Source:** https://developers.google.com/workspace/drive/api/guides/drive-mcp-server-file-eligibility
  - **Location:** “Eligibility requirements” → “ACL check.”
  - **Exact quotation:** “The requesting user must have at least read permissions (`reader` access) on the file or folder.”
- **Source:** https://developers.google.com/workspace/drive/api/guides/manage-sharing
  - **Location:** “Scenarios for sharing Drive resources.”
  - **Exact quotations:**
    - “To share a file in My Drive, the user must have `role=writer` or `role=owner`.”
    - “If the `writersCanShare` boolean value is set to `false` for the file, the user must have `role=owner`.”
    - “To share a file in a shared drive, the user must have `role=writer`, `role=fileOrganizer`, or `role=organizer`.”
    - “To share a folder in a shared drive, the user must have `role=organizer`.”
    - If `sharingFoldersRequiresOrganizerPermission` is false, “users with `role=fileOrganizer` can share folders in that shared drive.”
    - “To manage shared drive membership, the user must have `role=organizer`.”
- **Additional limit:** The same section states that a My Drive writer with temporary access cannot share the file.
- **Interpretation:** Ask the existing owner or authorized sharing manager for access. Do not grant broad administrator access or weaken CAA, DLP, CSE, or other file controls to complete setup.

### T1-10 — The connecting user grants OAuth consent

- **Status:** Required.
- **Actor and scope:** The connecting user authorizes the application to access permitted Google data. The application receives the OAuth grant.
- **Action:** The user completes Google's consent process during connection. Use an eligible Internal user or an approved External test user.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
  - **Location:** Authorization flow overview.
  - **Exact quotations:**
    - “The user decides whether to grant the permissions to your application.”
    - “If the user granted the requested permissions, your application retrieves tokens needed to make API requests on the user's behalf.”
- **Interpretation:** Application configuration, administrator approval, and user consent are separate actions. The supplied client implementation handles offline and consent parameters automatically. That implementation check remains with the coordinator.

## Final authority check for A1–A8

| Action | Actor and authority | Result |
|---|---|---|
| **A1 — Enroll in preview** | Applicant with authority to accept organizational terms; Google verifies the account and registers the project. T1-05. | Established. Ask an authorized representative for help if needed. |
| **A2 — Confirm screening** | Existing application/security solution owner supplies screening and documentation. T1-07. | Established for the provider-permitted alternative. No new deployment roles selected. |
| **A3 — Enable Drive services** | Service Usage Admin on the registered project. T1-01. | Established. Project IAM administrator helps only if a role grant is needed. |
| **A4 — Configure consent** | OAuth Config Editor configures the application and test users. An authorized representative accepts organizational policy terms. T1-02 and T1-05. | Established. Keep the two authorities separate. |
| **A5 — Create OAuth client** | OAuth Config Editor creates the Web application client and credentials. T1-02. | Established. Use the supplied callback and handle the secret securely. |
| **A6 — Confirm user access** | Drive & Docs administrator for service enablement; Service Settings administrator for API controls; item sharing authority for file access. T1-06, T1-08, T1-09. | Established. These changes are conditional on missing access. |
| **A7 — Add server in Speakeasy** | The designated Speakeasy connection operator performs the client action. | Client-side authority belongs to the coordinator. Google project roles do not establish Speakeasy access. |
| **A8 — Connect credentials** | The authorized connection operator supplies application credentials; the eligible Google user grants consent. T1-02 and T1-10. | Google-side authority established. Speakeasy access and automatic token handling remain coordinator checks. |

## Unresolved questions

- **Blocking gaps:** None for the selected provider authority actions.
- **Non-blocking — exact Speakeasy role:** The supplied client evidence establishes connection behavior, not a named client role. The coordinator owns this client-side check. Do not invent a Speakeasy role or infer it from Google permissions.
- **Non-blocking — existing screening access:** Public Google documentation cannot identify the organization's custom solution or its internal access rules. Its owner must confirm coverage and provide the required documentation. No deployment action is selected.
- **Non-blocking — organization-specific restrictions:** The current Workspace policy, user assignments, and file sharing settings are environment-specific. The documented conditional procedures and authority options are sufficient.
- **Non-blocking — release notes:** This follow-up checked only the requested authority gaps. It did not repeat the release-note check. The supplied reports retain current release-note evidence. No conflicting replacement notice was found in the checked authority sources.

## Cross-topic dependencies

- **Topic 2:** Use the existing registered project. Retain both Cloud roles and the separate authority to accept terms. Add the Drive & Docs privilege only when service access needs a change.
- **Topic 3:** Use T1-08 for Drive service authority and T1-09 for file sharing authority. Do not treat `reader` access as permission for every write operation.
- **Topic 4:** OAuth Config Editor covers the selected configuration, test-user, and client-creation actions. No publication or verification action is selected. Keep user consent separate.
- **Topic 5:** Both Drive service enablement actions have documented authority. Do not add MCP Tool User without applicable Drive-specific evidence.
- **Coordinator:** The provider authority check passes for A1–A8. Retain the existing custom screening prerequisite. Check Speakeasy-side access through the client setup process. Do not add manual offline-parameter steps or a new Model Armor deployment.


## Topic and status

**Topic 2: Organization-level setup — complete.**

The current official pages give a concrete setup procedure. It requires preview enrollment, a registered Google Cloud project, two enabled services, and OAuth application configuration. Organization access controls can require an additional approval. Prompt and response screening is required.

Authority checks belong to Topic 1. Client compatibility checks belong to the coordinator.

**Observation date for all sources: 2026-09-11.** No provider settings or local files were changed.

## Findings

### T2-01 — Enroll the account and project in Developer Preview

- **Status:** Required.
- **Actor and scope:** The application owner submits the enrollment request for the Google Workspace account and Google Cloud project. Google verifies the account and registers the project.
- **Documented action:**
  - Open the [Developer Preview Program page](https://developers.google.com/workspace/preview).
  - Read **Program Terms**.
  - Open **Apply to join the Developer Preview Program**.
  - Supply the requested Google Workspace account and Google Cloud project information. Obtain these values from the Workspace and Cloud project owners.
  - Make sure the submitted email account can be added to Google Groups.
  - Wait for the final project registration confirmation at the registered email address.
- **Sources and exact quotations:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server — opening notice:
    > “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
  - https://developers.google.com/workspace/preview — **How to join the program**:
    > “You need to provide us with your Google Workspace account and Google Cloud project information.”
    > “After verifying your Google Workspace account, we will register your Google Cloud project.”
    > “When it is done, you will receive a final confirmation to your registered email address.”
    > “The whole process should be done within a couple of days.”
  - Same page, same section:
    > “If your email address cannot be added to the Google Group, you won't be able to access the dedicated client library, and you won't get access to some of the features.”
  - Same page, **Features in Developer Preview → Latest features → MCP SERVERS**:
    > “Drive MCP server”
- **Interpretation:** API enablement alone does not satisfy preview enrollment. Use the project that Google registers. Do not present the Drive MCP server as generally available.

### T2-02 — Keep use within the preview terms

- **Status:** Required. The government data restriction is conditional.
- **Actor and scope:** The application owner applies the terms to the application and its users. Topic 1 must check who can accept the terms for the organization.
- **Documented action and limits:**
  - Do not include preview features in a public application before general availability.
  - Do not grant access to users outside the domain or company unless Google expressly permits an application for this access and grants permission for the feature.
  - For a government or regulatory entity, other than an educational institution, use only test or experimental data.
- **Source:** https://developers.google.com/workspace/preview — **Developer Preview Program Terms**, clauses (ii), (iv), and (vii).
- **Exact quotations:**
  > “program features may not be included in public applications prior to the General Availability (GA) announcement.”

  > “I may not grant end users access, outside my domain or company, to developer applications that have been built using APIs prior to their GA announcement”

  > “unless Google specifically states that I can request such permission and such permission has been granted to my Workspace account for that feature.”

  > “excluding educational institutions”

  > “I may only use test or experimental data with Pre-GA APIs and am prohibited from using any "live" or production data in connection with Pre-GA APIs.”
- **Interpretation:** Selecting **External** for the OAuth audience does not remove the preview limits. The coordinator must keep the selected use within these limits.

### T2-03 — Enable both Drive services in the Cloud project

- **Status:** Required.
- **Actor and scope:** An authorized Cloud project administrator enables the services in the registered project.
- **Documented action and values:**
  - Have a Google Cloud project.
  - Enable **Google Drive API**: `drive.googleapis.com`.
  - Enable **Google Drive MCP API**: `drivemcp.googleapis.com`.
  - The Drive setup page supplies Console actions for both services:
    - **Enable the APIs**
    - **Enable the MCP services**
  - Select the registered project. Obtain its project ID from the Cloud project owner.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server — **Prerequisites**, **Configure the Google Drive MCP server**, **Enable the APIs**, and **Enable the MCP services**.
- **Exact quotations:**
  > “A Google Cloud project.”

  > “To use the Google Drive MCP server, you must enable it in your Google Cloud project and then configure your MCP client to connect to it.”

  > “Google Drive API”

  > “Google Drive MCP API”

  > “Replace `PROJECT_ID` with your Google Cloud project ID.”
- **Direct Console target confirmed in the source:**\
  https://console.cloud.google.com/flows/enableapi?apiid=drivemcp.googleapis.com
- **Interpretation:** The browser procedure is documented. The page requires the gcloud CLI only to run its commands. Do not add a CLI installation requirement to the browser setup path.

### T2-04 — Configure the OAuth consent screen

- **Status:** Required. Test-user configuration applies when the audience is **External**.
- **Actor and scope:** The application administrator configures Google Auth Platform in the selected Cloud project. Connecting users receive the consent request.
- **Documented action and values:**
  - Open **Google Auth Platform > Branding**.
  - If Google Auth Platform is not configured, select **Get Started**.
  - Under **App Information**, enter **App name**: `Drive MCP Server`.
  - For **User support email**, select the administrator’s email address or an appropriate Google group. Select **Next**.
  - Under **Audience**, select **Internal**. If unavailable, select **External**. Select **Next**.
  - Under **Contact Information**, enter an **Email address** for project notices. Select **Next**.
  - Under **Finish**, review the linked data policy. An authorized person can select **I agree to the Google API Services: User Data Policy**, then **Continue**, then **Create**.
  - If the audience is **External**, open **Audience > Test users > Add users**. Enter the authorized test-user email addresses and select **Save**.
  - For an existing configuration, use **Branding**, **Audience**, and **Data Access**.
- **Environment-specific values:** Obtain the support contact, project notice address, and authorized test-user addresses from the application owner.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server — **Set up the OAuth consent screen**.
- **Exact quotations:**
  > “You must configure the OAuth consent screen before you can create an OAuth client ID.”

  > “Under App Information, in App name, type Drive MCP Server.”

  > “Under Audience, select Internal. If you can't select Internal, select External.”

  > “If you selected External for user type, add test users”

  > “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** The product page provides an Internal-first procedure. Individual test-user eligibility and test-mode token limits require Topics 3 and 4.

### T2-05 — Add the two Drive scopes

- **Status:** Required for the documented Drive setup.
- **Actor and scope:** The application administrator configures the application’s requested access. The connecting user grants access through OAuth.
- **Documented action and values:**
  - Open **Data Access > Add or Remove Scopes**.
  - Under **Manually add scopes**, add:
    - `https://www.googleapis.com/auth/drive.readonly`
    - `https://www.googleapis.com/auth/drive.file`
  - Select **Add to Table**, then **Update**.
  - On **Data Access**, select **Save**.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server — **Set up the OAuth consent screen**.
- **Exact quotations:**
  > “Under Manually add scopes, paste the scopes for the Google Drive MCP server”

  > “https://www.googleapis.com/auth/drive.readonly”

  > “https://www.googleapis.com/auth/drive.file”

  > “After selecting the scopes required by your app, on the Data Access page, click Save.”
- **Interpretation:** These application settings do not grant new file permissions to users. Topic 3 must check underlying access. Topic 4 must check scope classification and any applicable OAuth verification conditions.

### T2-06 — Create the shared OAuth client

- **Status:** Required for the supplied manual OAuth setup path.
- **Actor and scope:** The application administrator creates a Web application OAuth client in the selected project. The Speakeasy connection uses the resulting credentials.
- **Documented provider action:**
  - Open **Google Auth Platform > Clients > Create Client**.
  - Select **Web application**.
  - Enter a **Name** chosen by the application owner.
  - Under **Authorized redirect URIs**, select **+ Add URI**.
  - Enter the client callback address in **URIs**.
  - Select **Create** and copy **Client ID** and **Client Secret**.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server — **Configure your MCP client → Antigravity** and **Claude**, under **Create an OAuth 2.0 client ID and secret**.
- **Exact quotations:**
  > “Select Web application as the application type.”

  > “In the Authorized redirect URIs section, click + Add URI”

  > “Click Create and copy your Client ID and Client Secret.”
- **Interpretation for the supplied client:** Use `{{ gram.oauth.callback_url }}`, not the Antigravity or Claude example address. This value comes from the supplied client context, not Google’s page. Topic 4 and the coordinator must confirm the final authentication path.

### T2-07 — Approve application access when organization policy requires it

- **Status:** Conditional. Applies when Workspace API controls block the application or restrict the requested Drive access.
- **Actor and scope:** A Workspace administrator with the **Service Settings administrator privilege** configures access for the organization or selected organizational units. The OAuth application receives the configured access.
- **Documented action:**
  - Open **Security > Access and data control > API controls** in the Google Admin console.
  - Select **Manage App Access**.
  - Under **Configured apps**, select **Configure new app**.
  - Enter the application name or OAuth client ID, then select **Search** and the application.
  - For **Scope**, retain the top organizational unit or select the required organizational units.
  - Select **Continue**.
  - Under **Access to Google data**, select the access setting approved by the security owner.
  - Select **Continue**, review the settings, then select **Finish**.
- **Required value sources:** Use the OAuth client ID from T2-06. Obtain the organizational units and approved access setting from the Workspace security owner.
- **Source:** https://support.google.com/a/answer/7281227 — **Restrict or unrestrict Google services** and **Configure a new app**.
- **Exact quotations:**
  > “Restricted—Only internal and third-party apps configured with a Trusted or Specific Google data access setting can access data.”

  > “Requires having the Service Settings administrator privilege.”

  > “Enter the app's name or client ID, then click Search.”

  > “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”

  > “Trusted—Can access all Google services (both restricted and unrestricted).”

  > “Review settings for the new app, then click Finish.”
- **Interpretation:** Do not require organization-wide **Trusted** access for every installation. **Specific Google data** can limit access to approved scopes. The same source says this setting must include the Google Sign-in scopes required by the application. Topic 4 must identify those scopes from the selected authentication flow; do not invent them.

### T2-08 — Provide prompt and response screening

- **Status:** Required. Google Model Armor is one option.
- **Actor and scope:** The application or security owner supplies screening for MCP prompts and responses.
- **Documented action:** Use Model Armor, or use an organization solution and document it so that users can accept the risk.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security — opening requirements, **Optional security and safety configurations**, and **Enable Model Armor**.
- **Exact quotations:**
  > “You must screen prompts and responses for malicious content or prompt injection attacks.”

  > “You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”

  > “You must enable Model Armor APIs before you can use Model Armor.”
- **Conditional authority evidence for API enablement:**
  > “To enable APIs, you need the serviceusage.services.enable permission.”

  > “Service Usage Admin role (roles/serviceusage.serviceUsageAdmin).”
- **Interpretation:** Screening is required; Model Armor is not the only permitted solution. Do not require Model Armor service activation unless that solution is selected. The coordinator must check the client or the selected screening solution.

### T2-09 — Current sources retain the documented setup

- **Status:** Required evidence check; complete.
- **Sources and exact quotations:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server — footer:
    > “Last updated 2026-09-03 UTC.”
  - https://developers.google.com/workspace/preview — footer:
    > “Last updated 2026-09-11 UTC.”
  - https://developers.google.com/workspace/release-notes — Google Drive API, Developer Preview feature entry:
    > “The copy_file tool is now available for the Google Drive MCP server.”
- **Interpretation:** The live setup page, preview list, and release note agree that the Drive MCP server is available through Developer Preview. No replacement notice was found in the checked sections.

## Unresolved questions

- **Blocking gaps within Topic 2:** None. The documented procedures support the organization and application configuration actions.
- **Non-blocking — administrative authority:** The checked pages do not establish all authority needed to accept preview terms, configure Google Auth Platform, or create OAuth credentials. Topic 1 must verify these actions. Missing exact role names do not invalidate the documented procedure.
- **Non-blocking — enrollment form fields:** The preview page establishes the required account and project information and links the application form. The form’s full field list was not inspected. Use the linked form and its requested fields; do not invent additional labels.
- **Non-blocking within Topic 2 — OAuth deployment conditions:** External audience test mode, verification, and token duration need Topic 4’s findings. The Drive page’s test-user procedure is clear, but it does not itself establish a durable refresh-token setup.
- **Non-blocking within Topic 2 — screening implementation:** The provider requirement is clear. The supplied client context does not establish a screening implementation. The coordinator must check this required capability before final path approval.
- **Non-blocking — additional organization policies:** The checked sources do not prove that other environment-specific controls are absent. Apply existing security policy; do not add undocumented blanket enablement steps.

## Cross-topic dependencies

- **Topic 1:** Verify authority for preview enrollment and terms, Cloud service enablement, OAuth configuration, credential creation, and any selected security service. Use the explicit **Service Settings administrator privilege** evidence for Workspace app access controls.
- **Topic 3:** Use the preview access limits and External test-user assignment. Check account eligibility and Drive file eligibility separately from application approval.
- **Topic 4:** Use the two documented Drive scopes and Web application client configuration. Check OAuth verification, test-mode limits, required Google Sign-in scopes, refresh-token parameters, and token refresh.
- **Topic 5:** Use the registered project and enable both Drive services. Organization configuration does not create a project-specific MCP URL.
- **Coordinator:** Use the Speakeasy callback value. Check manual OAuth compatibility and screening. Keep the selected use within preview terms. Do not copy another client’s callback or require organization-wide trust without a policy reason.


## Topic and status

**Topic 3: Connecting-user setup — complete.**

The official instructions establish the user access requirements, test-user assignment, and file eligibility rules. No blocking gap was found for this topic. Other owners must check the dependencies below.

**Observation date for all sources: 2026-09-11.**

## Findings

### T3-01 — The user must have access to Google Drive

- **Status:** Required.
- **Actor and scope:** The Google Workspace administrator enables Drive for the organization that contains the connecting user.
- **Documented action:** Make sure that Google Drive is enabled in the Google Workspace Admin console. The file eligibility page links to the service administration instructions.
- **Required values:** The applicable organization and user. Obtain these from the Workspace administrator.
- **Source:** https://developers.google.com/workspace/drive/api/guides/drive-mcp-server-file-eligibility
- **Location:** “Eligibility requirements” → “Service availability.”
- **Exact quotation:** “The Google Drive service must be enabled for the user's organization in the Google Workspace Admin console.”
- **Interpretation:** A Cloud project with the APIs enabled is not sufficient evidence that the user has Drive access.
- **Authority dependency:** Topic 1 must confirm the authority for service enablement. Topic 2 owns the organization configuration.

### T3-02 — The user must have file or folder permission

- **Status:** Required.
- **Actor and scope:** The file owner or another person with sharing authority gives the connecting user access to each required file or folder.
- **Documented action and value:** Make sure that the user has at least `reader` access. Use the connecting user's Google Account and the required files or folders.
- **Source:** https://developers.google.com/workspace/drive/api/guides/drive-mcp-server-file-eligibility
- **Location:** “Eligibility requirements” → “ACL check.”
- **Exact quotation:** “The requesting user must have at least read permissions (`reader` access) on the file or folder.”
- **Additional source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
- **Location:** Opening description → “Respect security.”
- **Exact quotation:** “Inherit the same permissions and data governance controls as the user.”
- **Interpretation:** MCP does not give the user more file access. The `reader` requirement is a minimum eligibility check. It is not permission to perform every write operation.
- **Authority dependency:** Topic 1 must check sharing authority if the setup must grant new file access.

### T3-03 — File security and policy checks apply separately from user permission

- **Status:** Required for every file or folder that the MCP server uses.
- **Actor and scope:** The connecting user selects eligible files. The data owner and security administrator manage the applicable policies. Do not remove security controls only to make a file available to MCP.
- **Documented checks:**
  - Information Rights Management (IRM) controls must not prevent download, copy-paste, or printing.
  - Context-Aware Access (CAA) requirements must be satisfied in the client context.
  - Client-side encrypted content is not eligible.
  - Items marked as spam or malware are not eligible.
  - Items in the trash are not eligible.
  - Folder and shortcut metadata can be eligible. Each nested file or shortcut target must pass its own checks.
- **Source:** https://developers.google.com/workspace/drive/api/guides/drive-mcp-server-file-eligibility
- **Locations:** “Eligibility requirements” → “Item-level constraints,” “Special item types,” and “Undesirable item states.”
- **Exact quotations:**
  - “only policies that enforce Information Rights Management (IRM) controls restrict eligibility.”
  - “If the item has IRM controls preventing downloading, copy-pasting, or printing (including controls enforced by administrator-configured DLP policies), AI agents cannot access it.”
  - “If CAA policies block access in the client's context (or if context data is missing during offline or background operations), the item is ineligible.”
  - “Content encrypted with CSE cannot be parsed by AI agents and is ineligible.”
  - “nested files within folders or target files referenced by shortcuts must independently satisfy all eligibility checks.”
  - “Items marked as spam or malware are ineligible.”
  - “Items in the trash bin are ineligible.”
- **Interpretation:** Access in the Drive website does not prove that MCP can use the same item. CAA can also affect background operations.
- **Documented result when a check fails:** Single-file operations return an error. Search and list operations remove ineligible items from the results.
- **Same source, location:** “MCP server behavior for ineligible items.”
- **Exact quotation:** “This may cause discrepancies where a user can view or edit a file in the Google Drive web interface, but the AI agent cannot find or see the file.”

### T3-04 — Internal application users must belong to the applicable organization

- **Status:** Conditional. This applies when the OAuth application uses the `Internal` audience.
- **Actor and scope:** The application administrator selects the audience. Each connecting user must belong to the applicable Google Cloud organization.
- **Documented action:** The Drive setup page says to select **Internal**. If that option is not available, select **External**.
- **Sources:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
  - https://support.google.com/cloud/answer/15549945
- **Locations:** Drive setup → “Set up the OAuth consent screen”; Google Auth Platform audience documentation → “Internal.”
- **Exact quotations:**
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “can configure Internal users to limit authorization requests to members of the organization.”
- **Interpretation:** A user outside the organization cannot use the Internal audience path. External audience eligibility does not remove the separate Developer Preview conditions.
- **Authority dependency:** Topic 1 must confirm application configuration authority. Topic 2 owns audience selection.

### T3-05 — Add connecting users as test users for the documented External setup

- **Status:** Conditional. The Drive instructions require this step when **External** is selected. The shared platform instructions limit applications in **Testing** to listed test users.
- **Actor and scope:** The authorized application administrator adds the connecting users to the project's OAuth application.
- **Documented action:**
  1. In Google Auth Platform, click **Audience**.
  2. Under **Test users**, click **Add users**.
  3. Enter your email address and the other authorized test-user email addresses.
  4. Click **Save**.
- **Required values:** The Google Account email address for each connecting user. Obtain the addresses from the approved user list.
- **Sources:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
  - https://support.google.com/cloud/answer/15549945
- **Locations:** Drive setup → “Set up the OAuth consent screen”; audience documentation → “Testing.”
- **Exact quotations:**
  - “If you selected External for user type, add test users.”
  - “Enter your email address and any other authorized test users, then click Save.”
  - “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”
- **Interpretation:** Test-user assignment is application access. It does not give the user access to Drive files.
- **Authority dependency:** Topic 1 must confirm the authority to manage the application. Topic 4 must check the other effects of the Testing status.

### T3-06 — Workspace application access policy must permit the connection

- **Status:** Conditional. This applies when Workspace API controls restrict the application or the required Drive data.
- **Actor and scope:** A Workspace administrator manages the application's access policy for the applicable organization or organizational unit.
- **Documented action:** Use the application access configuration in **API controls**. Identify the application by its OAuth2 client ID. Configure access that permits the required Drive scopes under the organization's policy.
- **Required values:** Obtain the OAuth client ID from the application owner. Topic 4 supplies the required scope values.
- **Source:** https://support.google.com/a/answer/7281227
- **Locations:** “Manage whether your app can access Google services”; Google service access restrictions; application details.
- **Exact quotations:**
  - “Requires having the Service Settings administrator privilege.”
  - “Restricted—Only internal and third-party apps configured with a Trusted or Specific Google data access setting can access data.”
  - “Shows the full OAuth2 client ID of the app”
  - “If you change the access configuration, click Save.”
- **Additional source:** https://support.google.com/cloud/answer/15549945
- **Location:** “Internal.”
- **Exact quotation:** “User authorization of scopes associated with restricted Google Workspace services, including high-risk Gmail and Drive scopes, might require additional configuration by your organization's administrators.”
- **Interpretation:** Application audience and file permission do not override Workspace API controls. Do not require **Trusted** for every installation. The source also permits **Specific Google data**, subject to the applicable policy.
- **Authority dependency:** Topic 1 must use the documented **Service Settings administrator privilege** when it checks this action.

### T3-07 — Developer Preview account registration is a setup dependency

- **Status:** Required for the preview setup. The reviewed sources do not establish a separate enrollment requirement for every connecting user.
- **Actor and scope:** The program applicant supplies a Google Workspace account and Cloud project information. Google verifies and registers them.
- **Documented action:** Read the program terms and submit the application. Make sure that the applicant's email account permits addition to Google Groups. Use the registered account and project information.
- **Sources:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
  - https://developers.google.com/workspace/preview
- **Locations:** Drive setup → opening preview notice; Preview Program → “How to join the program.”
- **Exact quotations:**
  - “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
  - “You need to provide us with your Google Workspace account and Google Cloud project information.”
  - “Make sure that your email account accepts getting added to Google Groups.”
  - “After verifying your Google Workspace account, we will register your Google Cloud project.”
  - “When it is done, you will receive a final confirmation to your registered email address.”
- **Interpretation:** Include preview approval as a prerequisite. Do not state that each end user must submit a separate program application without more evidence.

## Unresolved questions

- **Blocking gaps:** None within Topic 3.

- **Non-blocking — separate preview enrollment for each user:** The preview page describes account verification, Google Group membership, and project registration. It does not clearly state whether every connecting user needs separate enrollment. The documented enrollment procedure remains sufficient. Topic 1 and Topic 2 must retain the program approval requirement.

- **Non-blocking — MCP-specific license or user role:** The Drive setup and file eligibility pages do not identify a separate Drive MCP license, MCP user role, or individual enablement switch. Do not claim that these are explicitly unnecessary. The Claude plan requirement applies to Claude, not to the supplied client.

- **Non-blocking — exact write permissions:** The file eligibility page establishes minimum `reader` access. It does not give a complete permission matrix for each write tool. Use files and operations that the connecting user can already access. Do not describe reader access as sufficient for all operations.

- **Non-blocking — policy administration details:** The linked service administration page was checked, but no complete Drive-specific service enablement sequence was captured. The operation and required service are clear. Topic 1 and Topic 2 own the detailed administration evidence.

- **Non-blocking — release-note confirmation:** This topic did not independently check release notes. The live Drive pages showed the Developer Preview setup and no replacement notice in the material reviewed. This does not prove that no relevant changes exist.

## Cross-topic dependencies

- **Topic 1:** Confirm authority to enable Drive, manage test users, configure application access, and grant file access. Use the documented **Service Settings administrator privilege** for Workspace API controls.
- **Topic 2:** Configure the applicable audience. Keep organization service enablement and preview account/project registration as prerequisites.
- **Topic 4:** Use the approved connecting-user accounts. Check Testing status, token restrictions, and required scopes. File permission and test-user assignment do not replace OAuth authorization.
- **Topic 5:** Keep the Drive endpoint selected. File eligibility rules apply to that server.
- **Coordinator:** Check whether the client can satisfy applicable CAA conditions, particularly for offline or background use. Explain that ineligible files can be absent from search results. Do not copy Claude license requirements into the Speakeasy setup.


## Topic and status

**Topic 4: Authentication — complete.**

Use **Manual OAuth** with a registered Google **Web application** client and both documented Drive scopes. Use **Internal** organization access where eligible. Keep **External / Testing** as a conditional test path with a seven-day access warning.

The upstream refresh-token compatibility check now passes. The checked Speakeasy implementation automatically requests Google offline access and consent. It stores the upstream refresh token in encrypted form and supports the upstream refresh grant.

**Observation date for all sources: 2026-09-11.**

### Changes from the previous report

- **Replaced:** The unresolved topic status and blocking refresh-token question. The checked implementation resolves that question.
- **Updated:** T4-04, T4-05, and T4-06 now include the confirmed client behavior.
- **Clarified:** T4-08 remains conditional research. Do not add publication or verification actions for an unused External production application.
- **Added:** T4-10 records the implementation evidence.
- Other findings and their sources remain applicable.

## Findings

### T4-01 — Use OAuth 2.0 for the Drive MCP connection

- **Status:** Required.
- **Actor and scope:** The application administrator configures the OAuth client. The connecting user grants the application access to their Drive data.
- **Documented action:** Configure the OAuth consent screen before creating an OAuth client ID. Use OAuth 2.0 for the remote Drive MCP connection.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server\
  **Locations:** “Set up the OAuth consent screen”; “Configure your MCP client” → “Others.”
- **Exact quotations:**
  - “The Google Drive MCP server uses OAuth 2.0 for authentication and authorization.”
  - “You must configure the OAuth consent screen before you can create an OAuth client ID.”
- **Interpretation:** Manual OAuth is the documented registered-client path that matches the supplied client capabilities. The Drive MCP instructions do not document an API-key or service-account setup path.

### T4-02 — Register a Web application client with the client’s callback address

- **Status:** Required for the selected Manual OAuth path.
- **Actor and scope:** An authorized application administrator creates the OAuth client in the selected Google Cloud project. The Speakeasy connection receives its client ID and client secret.
- **Documented action and values:**
  1. Open **Google Auth Platform > Clients > Create Client**.
  2. Select **Web application**.
  3. Enter a **Name**.
  4. Under **Authorized redirect URIs**, select **+ Add URI**.
  5. Enter the connecting client’s callback address.
  6. Select **Create** and copy the **Client ID** and **Client Secret**.
- **Environment-specific value:** Use `{{ gram.oauth.callback_url }}` from the supplied client context. Do not use the Claude or Antigravity example address.
- **Sources:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server\
    **Location:** “Configure your MCP client” → “Claude.”
  - https://developers.google.com/identity/protocols/oauth2/web-server\
    **Locations:** “Create authorization credentials”; authorization parameter `redirect_uri`.
- **Exact quotations:**
  - “Select Web application as the application type.”
  - “Click Create and copy your Client ID and Client Secret.”
  - “The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client.”
  - “Note that the http or https scheme, case, and trailing slash ('/') must all match.”
- **Interpretation:** Apply the Google client-registration procedure with the Speakeasy callback value. Topic 1 retains ownership of authority checks.

### T4-03 — Capture the client secret during initial creation

- **Status:** Required for the documented client-ID-and-secret path.
- **Actor and scope:** The application administrator stores the OAuth client secret securely and supplies it to the Speakeasy connection.
- **Documented action:** Copy or download the secret when Google creates the client. Store it securely.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server\
  **Location:** “Create authorization credentials.”
- **Exact quotations:**
  - “Your application's client secret will only be shown after you create the client.”
  - “You won't be able to view or download the client secret again.”
  - “Securely store the file in a location that only your application can access.”
- **Interpretation:** Put the one-time-display warning before client creation. Although the general Speakeasy secret field is optional, the Google MCP examples use both a client ID and a client secret. The checked instructions do not state a fixed secret lifetime.

### T4-04 — Configure both documented Drive scopes

- **Status:** Required by the Drive MCP setup procedure.
- **Actor and scope:** The application administrator configures the OAuth application and connection scopes. The connecting user grants access.
- **Documented action and values:**
  - Open **Data Access > Add or Remove Scopes**.
  - Under **Manually add scopes**, add:
    - `https://www.googleapis.com/auth/drive.readonly`
    - `https://www.googleapis.com/auth/drive.file`
  - Select **Add to Table**, then **Update**.
  - On **Data Access**, select **Save**.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server\
  **Location:** “Set up the OAuth consent screen.”
- **Exact quotations:**
  - “Under Manually add scopes, paste the scopes for the Google Drive MCP server”
  - “https://www.googleapis.com/auth/drive.readonly”
  - “https://www.googleapis.com/auth/drive.file”
  - “After selecting the scopes required by your app, on the Data Access page, click Save.”
- **Additional sources:**
  - https://developers.google.com/identity/protocols/oauth2/web-server\
    **Location:** Authorization parameter `scope`.
  - https://drivemcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1\
    **Location:** `scopes_supported`.
- **Exact quotations:**
  - “A space-delimited list of scopes that identify the resources that your application could access on the user's behalf.”
  - `"scopes_supported":["https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/drive.readonly","https://www.googleapis.com/auth/drive.file"]`
- **Updated interpretation:** Select only the two scopes in the provider’s setup procedure. Do not add the broader `drive` scope merely because metadata lists it. T4-10 confirms that the client sends configured scopes in the upstream authorization request.

### T4-05 — Request offline access during initial authorization

- **Status:** Required for the selected refresh-token path.
- **Actor and scope:** The client sends the authorization request. The connecting user grants consent. The client receives and stores the refresh token.
- **Documented values:**
  - Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
  - Authorization request: `response_type=code`
  - Refresh-token parameter: `access_type=offline`
  - Token endpoint: `https://oauth2.googleapis.com/token`
- **Documented action:** Include `access_type=offline` in the initial authorization request.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server\
  **Locations:** “Step 1: Set authorization parameters”; parameter `access_type`; “Step 5: Exchange authorization code for refresh and access tokens.”
- **Exact quotations:**
  - “Valid parameter values are online, which is the default value, and offline.”
  - “Set the value to offline if your application needs to refresh access tokens when the user is not present at the browser.”
  - “This value instructs the Google authorization server to return a refresh token and an access token the first time that your application exchanges an authorization code for tokens.”
- **Updated interpretation:** Speakeasy adds this parameter automatically for the Google issuer; see T4-10. No extra administrator parameter-entry action is needed. Do not substitute an `offline_access` scope.

### T4-06 — Request consent, including when the user has an existing grant

- **Status:** Required automatic behavior for the selected client path. Existing grants make renewed consent important during initial connection setup.
- **Actor and scope:** The client requests consent. The connecting user authorizes the OAuth application.
- **Documented value:** `prompt=consent`.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server\
  **Locations:** Authorization parameter `prompt`; “Refreshing an access token (offline access)” → Node.js.
- **Exact quotations:**
  - “consent” — “Prompt the user for consent.”
  - “This tokens event only occurs in the first authorization”
  - “If you have already given your app the requisiste permissions without setting the appropriate constraints for receiving a refresh token, you will need to re-authorize the application to receive a fresh refresh token.”
- **Updated interpretation:** Speakeasy automatically includes `consent` in the Google prompt parameter. It preserves other prompt values and avoids duplicate `consent` values. The user completes the browser consent process. Do not add a separate parameter-entry action or a later token-maintenance procedure.

### T4-07 — Use Internal access where eligible; External Testing expires after seven days

- **Status:** Conditional on the organization and selected audience.
- **Actor and scope:** The application administrator sets the audience. Connecting users must meet its conditions.
- **Documented action:**
  - Select **Internal** when available.
  - If **Internal** is unavailable, select **External**.
  - For the documented External test setup, open **Audience > Test users > Add users**. Add the authorized users and select **Save**.
- **Sources:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server\
    **Location:** “Set up the OAuth consent screen.”
  - https://support.google.com/cloud/answer/15549945\
    **Locations:** “Internal”; “Publishing status” → “Testing.”
  - https://developers.google.com/identity/protocols/oauth2\
    **Location:** “Refresh token expiration.”
- **Exact quotations:**
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization.”
  - “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”
  - “Authorizations by a test user will expire seven days from the time of consent.”
  - “If your OAuth client requests an offline access type and receives a refresh token, that token will also expire.”
- **Interpretation:** Use Internal organization access where eligible. External Testing remains a supported conditional test path. The Drive scopes do not meet the exception for basic identity-only scopes.
- **Warning:** **External applications in Testing lose authorization after seven days, including refresh-token access. Another sign-in is needed.**

### T4-08 — Keep External production review requirements conditional

- **Status:** Conditional. Applies only if an External production application is selected and meets Google’s verification criteria. It is not an action for the selected Internal or External Testing setup.
- **Actor and scope:** The application owner handles applicable verification and security assessment for an External production application.
- **Sources:**
  - https://developers.google.com/workspace/drive/api/guides/api-specific-auth\
    **Locations:** “Non-sensitive scopes”; “Restricted scopes”; scope-category requirements.
  - https://developers.google.com/workspace/guides/configure-oauth-consent\
    **Location:** Scope selection instructions.
  - https://support.google.com/cloud/answer/15549945\
    **Location:** “In Production.”
- **Exact quotations:**
  - Under “Non-sensitive scopes”: “https://www.googleapis.com/auth/drive.file”
  - Under “Restricted scopes”: “https://www.googleapis.com/auth/drive.readonly”
  - “Restricted: These scopes provide wide access to Google user data and require restricted scope OAuth App Verification.”
  - “If you store restricted scope data on servers (or transmit), then you must go through a security assessment.”
  - “For apps used only internally by your Google Workspace organization, scopes aren't listed on the consent screen and use of restricted or sensitive scopes doesn't require further review by Google.”
  - “A project's publishing status is considered In production after selecting the Publish app button.”
- **Clarified interpretation:** Retain these conditions as research, not as setup actions for an unused public application. Internal-only use has a documented review exception. Do not add publication, verification submission, or public-production security-assessment actions to the selected setup.

### T4-09 — Refresh tokens do not guarantee indefinite access

- **Status:** Required lifetime warning.
- **Actor and scope:** The user, organization policies, and Google token limits affect continued access.
- **Documented limits:**
  - `expires_in` gives the access-token lifetime.
  - Six months without use can invalidate a refresh token.
  - Revocation, expired time-based access, or administrator restrictions can stop access.
  - Each Google Account has a limit of 100 refresh tokens per OAuth client ID. A new token above this limit invalidates the oldest token.
- **Sources:**
  - https://developers.google.com/identity/protocols/oauth2/web-server\
    **Location:** Token response fields.
  - https://developers.google.com/identity/protocols/oauth2\
    **Location:** “Refresh token expiration.”
- **Exact quotations:**
  - “The remaining lifetime of the access token in seconds.”
  - “Refresh tokens are valid until the user revokes access or the refresh token expires.”
  - “The refresh token has not been used for six months.”
  - “There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.”
  - “If the limit is reached, creating a new refresh token automatically invalidates the oldest refresh token without warning.”
- **Interpretation:** Automatic token refresh does not remove these limits. Do not apply the separate Gmail password-change rule or Cloud Platform session rule to this Drive-only setup without evidence.
- **Warning:** **Google or your organization can end access. You might need to sign in again.**

### T4-10 — Speakeasy supports the required upstream Google refresh-token flow

- **Status:** Required compatibility check; complete.
- **Actor and scope:** The Speakeasy implementation handles upstream Google authorization and tokens for the configured remote connection. This adds no administrator setup action.
- **Checked revision:** `speakeasy-api/gram`, commit `496e62ca5d5ebd99f0c189f2614fc9c707e44659`.

**Issuer match**

- **Source:** https://drivemcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1\
  **Location:** `authorization_servers`.
- **Exact quotation:** `"authorization_servers":["https://accounts.google.com/"]`
- **Source:** [google.go, lines 26–55](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google.go#L26-L55)
- **Exact quotations:**
  - `strings.EqualFold(u.Hostname(), "accounts.google.com")`
  - `q.Set("access_type", "offline")`
  - `prompts = append(prompts, "consent")`
- **Interpretation:** The live Drive issuer matches the client’s Google-specific authorization handling.

**Manual OAuth and configured scopes**

- **Sources:**
  - [challenge.go, lines 250–264](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L250-L264)
  - [challenge.go, lines 766–795](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L766-L795)
- **Exact quotations:**
  - `interceptors.NewGoogle(logger)`
  - `q.Set("client_id", client.ExternalClientID)`
  - `q.Set("scope", strings.Join(scopes, " "))`
  - `if ic.Match(client.IssuerURL) {`
  - `ic.ModifyAuthorize(ctx, q)`
- **Interpretation:** The upstream request uses the registered external client ID and configured scopes. Matching authorization handling is not restricted to DCR. Manual OAuth therefore receives the automatic offline and consent parameters.

**Encrypted storage and upstream refresh**

- **Sources:**
  - [challenge.go, lines 950–965](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L950-L965)
  - [challenge.go, lines 1049–1075](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L1049-L1075)
  - [tokenservice.go, lines 537–590](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/tokenservice.go#L537-L590)
- **Exact quotations:**
  - `m.enc.Encrypt([]byte(tok.RefreshToken))`
  - `RefreshTokenEncrypted: conv.PtrToPGText(refreshEnc)`
  - `s.enc.Decrypt(sess.RefreshTokenEncrypted.String)`
  - `form.Set("grant_type", "refresh_token")`
  - `form.Set("refresh_token", refreshToken)`
- **Interpretation:** The client stores and uses the upstream refresh token. This resolves the previous blocking question.

**Supporting tests**

- **Source:** [google_test.go, lines 13–76](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google_test.go#L13-L76)
- **Exact quotations:**
  - `require.Equal(t, "offline", q.Get("access_type"))`
  - `require.Equal(t, "select_account consent", q.Get("prompt"))`
- **Interpretation:** The tests support the code reading. Tests were read, not run.

## Unresolved questions

### Blocking gaps

**None for Topic 4.** The supplied central evidence was checked against the live Google metadata and the pinned client source. The upstream refresh-token compatibility check passes.

### Non-blocking — Other credential methods

- The [Workspace authentication overview](https://developers.google.com/workspace/guides/auth-overview), “Credentials,” states: “Google supports these authentication credentials: API key, OAuth 2.0 Client ID, and service accounts.”
- This is general Workspace API evidence. It does not establish these methods for the remote Drive MCP server.
- No MCP-specific API-key, service-account, static-token, or DCR setup was established in the checked instructions. This does not block Manual OAuth.

### Non-blocking — Authority

- Topic 1 must retain its checks for authority to configure Google Auth Platform and create the OAuth client.
- The concrete provider procedure is available. Missing exact role names in this topic do not make authentication unresolved.

### Non-blocking — Runtime confirmation

- The implementation was checked at the stated commit. Tests were not run, and no production sign-in was performed.
- No conflicting release evidence was supplied or found. This is a verification limit, not an unresolved setup action.

### Non-blocking — Current documentation and secret lifetime

- The Drive MCP page states: “Last updated 2026-09-03 UTC.”
- The web-server OAuth page states: “Last updated 2026-08-07 UTC.”
- The prior live Workspace release-note check found no replacement notice for this path.
- The checked client-creation instructions do not state a fixed client-secret lifetime. Do not infer indefinite validity.

## Cross-topic dependencies

- **Topic 1:** Retain authority checks for consent configuration, OAuth client creation, and any required organization controls.
- **Topic 2:** Configure a **Web application** client and both documented Drive scopes. Use Internal access where eligible. Keep External Testing conditional. Do not add actions for an unused External production application.
- **Topic 3:** Check organization membership, test-user assignment where applicable, user consent, and administrator restrictions.
- **Topic 5:** Retain the documented Drive endpoint. Its live metadata identifies the Google issuer and supports both selected scopes.
- **Coordinator:** The upstream refresh-token check passes. Select Manual OAuth with both documented Drive scopes and the supplied callback value. Keep the documented client UI path. Do not add offline or consent parameter-entry steps. Keep the seven-day Testing warning and the general access-expiration warning. This finding does not establish prompt-screening or device-context support.


## Topic and status

**Topic 5: MCP endpoint and connection configuration — complete.**

Google documents a remote Google Drive MCP endpoint. The endpoint meets the supplied remote URL requirement. A local process, proxy, or bridge is not part of the documented connection.

**Observation date for all sources: 2026-09-11.**

## Findings

### T5-01 — Google Drive remote endpoint

- **Status:** Required.
- **Actor and scope:** The administrator configures the client connection. The connection gives the client access to Google Drive through the connecting user.
- **Documented values:**
  - Server name: `drive`
  - Server URL: `https://drivemcp.googleapis.com/mcp/v1`
  - Transport: HTTP
  - Authentication: OAuth 2.0
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server\
  **Location:** “Configure your MCP client” → “Others.”
- **Exact quotations:**
  - “Server URL: `https://drivemcp.googleapis.com/mcp/v1`”
  - “Transport: HTTP”
  - “The Google Drive remote MCP server uses OAuth 2.0.”
- **Interpretation:** Use this fixed, shared address. The documented address has no tenant, project, region, or environment variable. Do not replace it with the general Drive API address.
- **Additional evidence:** The “Claude” section labels the same address “Remote MCP server URL.” This is direct evidence of a remote MCP connection, not only an API address.

### T5-02 — Enable the service in the Google Cloud project

- **Status:** Required.
- **Actor and scope:** An authorized project administrator enables services in the Google Cloud project that supports the application. Topic 1 must confirm the required authority.
- **Documented action and values:**
  - Enable Google Drive API: `drive.googleapis.com`.
  - Enable Google Drive MCP API: `drivemcp.googleapis.com`.
  - The setup page provides Console options for both actions.
  - The CLI examples use `PROJECT_ID`, which the page identifies as the Google Cloud project ID. This value is not part of the MCP URL.
- **Source:** https://developers.google.com/workspace/drive/api/guides/configure-mcp-server\
  **Locations:** “Configure the Google Drive MCP server,” “Enable the APIs,” and “Enable the MCP services.”
- **Exact quotations:**
  - “To use the Google Drive MCP server, you must enable it in your Google Cloud project and then configure your MCP client to connect to it.”
  - “Google Drive API”
  - “Google Drive MCP API”
  - “Replace `PROJECT_ID` with your Google Cloud project ID.”
- **Console targets from the source:**
  - https://console.cloud.google.com/flows/enableapi?apiid=drivemcp.googleapis.com
- **Interpretation:** Google hosts the endpoint. The reader enables its use in the project; the reader does not create a tenant-specific server address.

### T5-03 — Developer Preview access applies

- **Status:** Required.
- **Actor and scope:** The organization or application owner must meet the preview access conditions. Topics 1–3 must confirm the applicable enrollment and user conditions.
- **Documented action:** Use the linked Google Workspace Developer Preview Program instructions.
- **Sources:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server — opening notice.
  - https://developers.google.com/workspace/preview — “Features in Developer Preview” → “MCP SERVERS.”
- **Exact quotations:**
  - “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
  - “Drive MCP server”
- **Interpretation:** Do not present this endpoint as generally available.

### T5-04 — Google offers separate Workspace MCP servers

- **Status:** Conditional. Configure another server only if the selected setup needs that product.
- **Actor and scope:** The administrator selects the required server connections for the application.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers\
  **Locations:** Opening description; “Configure your MCP client” → “Others”; “Supported products.”
- **Exact quotations:**
  - “Each Google Workspace product has its own dedicated MCP server.”
  - “Repeat these steps for each Google Workspace product you want to add.”
  - “Transport: HTTP”
  - “The Google Workspace remote MCP server uses OAuth 2.0.”

The source gives the following addresses. The address text in each row is an exact source value. The tool names are exact quotations from “Supported products.”

| Server | Documented URL | Function supported by quoted tools |
|---|---|---|
| Gmail | `https://gmailmcp.googleapis.com/mcp/v1` | Read messages, search threads, and create drafts: `get_message`, `search_threads`, `create_draft`. |
| Google Drive | `https://drivemcp.googleapis.com/mcp/v1` | Search, read, create, copy, and download files: `search_files`, `read_file_content`, `create_file`, `copy_file`, `download_file_content`. |
| Google Docs | `https://docsmcp.googleapis.com/mcp/v1` | Read and update documents: `read_doc`, `update_doc`. |
| Google Sheets | `https://sheetsmcp.googleapis.com/mcp/v1` | Read and update spreadsheets: `get_spreadsheet`, `get_values`, `update_values`, `update_formulas`. |
| Google Slides | `https://slidesmcp.googleapis.com/mcp/v1` | Read and update presentations: `read_presentation`, `update_presentation`. |
| Google Calendar | `https://calendarmcp.googleapis.com/mcp/v1` | Find and manage events: `search_events`, `create_event`, `update_event`, `delete_event`. |
| Google Chat | `https://chatmcp.googleapis.com/mcp/v1` | Search conversations and send messages: `search_conversations`, `search_messages`, `send_message`. |
| People API | `https://people.googleapis.com/mcp/v1` | Read profiles and find contacts: `get_user_profile`, `search_contacts`, `search_directory_people`. |

**Interpretation:** These are separate product servers, not tenant or environment variants. Google Drive is the direct match for this request. The presence of the other servers does not make their connection a Drive prerequisite.

### T5-05 — Universal Search is a separate optional server

- **Status:** Conditional. This server applies if the selected task needs search across Workspace products.
- **Actor and scope:** The administrator configures a separate connection. The connecting user grants access to the products to search.
- **Documented values:**
  - Server name: `Universal Search MCP Server`
  - URL: `https://workspacemcp.googleapis.com/mcp/v1`
  - Authentication: OAuth 2.0, with a client ID and client secret in the documented connection example.
  - Enable `workspacemcp.googleapis.com` and the APIs for the products to search.
- **Source:** https://developers.google.com/workspace/guides/universal-search-mcp\
  **Locations:** Opening description; “Enable the APIs”; “Set up the OAuth consent screen”; “Configure your MCP client.”
- **Exact quotations:**
  - “including Gmail messages, Google Drive files, Google Calendar events, and Google Chat spaces and messages, using a single tool.”
  - “Remote MCP server URL: `https://workspacemcp.googleapis.com/mcp/v1`”
  - “The server respects these choices and only searches across the products for which access has been granted.”
  - “enable the Google Workspace MCP API and the APIs for the products that you want to search”
- **Interpretation:** This is not another address for the Drive server. It provides cross-product search. The Drive server remains the direct choice for Drive file operations. Do not require both connections.

### T5-06 — Scopes and setup differ by server

- **Status:** Conditional. Each set applies to its named server.
- **Actor and scope:** The application administrator configures scopes; the user grants access. Topics 1 and 4 must confirm authority and authentication requirements.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers\
  **Location:** “Set up the OAuth consent screen” → “Manually add scopes.”
- **Exact quotation:** “paste the scopes for the MCP servers you want to use”
- **Documented scope values:** Each suffix below follows the exact prefix `https://www.googleapis.com/auth/`.
  - Drive: `drive.readonly`, `drive.file`
  - Gmail: `gmail.readonly`, `gmail.compose`
  - Docs: Drive scopes plus `documents.readonly`, `documents`
  - Sheets: Drive scopes plus `spreadsheets.readonly`, `spreadsheets`
  - Slides: Drive scopes plus `presentations.readonly`, `presentations`
  - Calendar: `calendar.calendarlist.readonly`, `calendar.events.freebusy`, `calendar.events.readonly`
  - Chat: `chat.spaces.readonly`, `chat.memberships.readonly`, `chat.messages.readonly`, `chat.messages.create`, `chat.users.readstate`
  - People: `directory.readonly`, `userinfo.profile`, `contacts.readonly`
- **Additional setup difference:** The same source, “Configure the Chat app,” states: “To use the Google Chat MCP server, you must configure a Chat app in your Google Cloud project.”
- **Universal Search difference:** Its separate setup page lists `gmail.readonly`, `drive.readonly`, `calendar.readonly`, and `chat.messages.readonly`, and permits a subset.
- **Interpretation:** Do not copy the Drive configuration to all servers. Do not add other product scopes or Chat app configuration to the Drive-only setup.

### T5-07 — Prompt and response screening is required

- **Status:** Required. Model Armor is one permitted solution, not the only solution.
- **Actor and scope:** The application or security owner provides screening for MCP prompts and responses.
- **Sources:**
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server — “Important security consideration: Indirect prompt injection.”
  - https://developers.google.com/workspace/guides/configure-mcp-security — opening requirements.
- **Exact quotation:** “You must screen prompts and responses for malicious content or prompt injection attacks. You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Interpretation:** This is a setup dependency, but it does not change the documented Drive MCP URL. The coordinator must check the client or selected security solution.

### T5-08 — Current official pages still support this setup path

- **Status:** Required evidence check; completed.
- **Sources:**
  - https://developers.google.com/workspace/release-notes — May 21, 2026, Google Drive API entry.
  - https://developers.google.com/workspace/guides/configure-mcp-servers — page footer.
  - https://developers.google.com/workspace/guides/configure-mcp-security — page footer.
- **Exact quotations:**
  - “The `copy_file` tool is now available for the Google Drive MCP server.”
  - “Last updated 2026-09-03 UTC.”
  - “Last updated 2026-09-10 UTC.”
- **Interpretation:** The live setup pages and release notes remain consistent with the remote Drive server. No replacement notice was found in the checked material.

## Unresolved questions

- **Blocking gaps:** None for the endpoint and remote connection requirement.
- **Non-blocking — additional headers or URL parameters:** The Drive connection examples do not specify non-authentication headers, query parameters, region selection, or tenant discovery. The documented URL and connection values are sufficient for the connection action. This is not proof that all unmentioned settings are unnecessary.
- **Non-blocking — other server details:** The report records the Workspace servers found in the shared documentation and preview list. Full permission checks for optional servers were not performed. Those checks do not block a Drive-only setup.
- **Non-blocking within Topic 5 — authority and security implementation:** Other owners must check the project enablement authority, preview access, and required screening solution. The endpoint evidence itself is complete.

## Cross-topic dependencies

- **Topic 1:** Confirm authority to enable `drive.googleapis.com` and `drivemcp.googleapis.com`. Confirm preview enrollment authority and any security configuration authority.
- **Topic 2:** Use the two Drive services in the selected Cloud project. Do not require all Workspace services. Include the preview and screening dependencies.
- **Topic 3:** Check preview user eligibility and Drive file eligibility. The Drive page links to https://developers.google.com/workspace/drive/api/guides/drive-mcp-server-file-eligibility.
- **Topic 4:** Use OAuth 2.0 and verify the Drive scopes `drive.readonly` and `drive.file`. Keep Universal Search authentication separate if it is selected.
- **Coordinator:** The remote URL check passes. Select the Drive server unless the task specifically needs cross-product search. Use the client’s own callback value, not the Claude or Antigravity callback examples. Check required prompt and response screening, OAuth implementation, and refresh behavior before final setup-path approval.



## Speakeasy setup source

Selected values: custom-remote; https://drivemcp.googleapis.com/mcp/v1; Manual OAuth; Client ID and Client Secret from create-oauth-client. Discoverable issuer: https://accounts.google.com/. Requested scopes: drive.readonly and drive.file. Use Scope (override) only to keep the two documented scopes, not the broader drive scope in metadata. Authentication endpoints come from discovery. No extra offline parameter action. The following doctrine is source material, not alternate selected guide actions.

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

## Execution and limitations

Research ran from 2026-09-11T18:41:59Z to 2026-09-11T19:06:53Z

The first prompt preparation failed. Topics 2 and 3 each failed once with provider code 402 and succeeded on one retry. Actual errors are in .factory/dispatch-errors.jsonl. Failed calls returned no report or reusable handle. No private logs were read. Complete reports were saved on return. Prompts and document hashes are in .factory/. No per-dispatch deadline was available. Tests cited as evidence were read, not run. No credentials were created or collected.

Non-blocking limits: no live sign-in, screenshot capture, organization-specific policy test, or catalog lookup. Existing screening coverage must be confirmed by its owner. No automatic screening or CAA context support is asserted. An operator with permission to add a source must perform the documented client setup; no named client role is inferred.

## Provider step anchor declarations

These declarations are the canonical action IDs from the setup table. They do not add actions after the authority audit.

### Enroll in Developer Preview {#enroll-preview}

A1. T1-05, T2-01/02, T3-07, T5-03. Screenshot: the preview program application and enrollment requirements.

### Confirm security screening {#confirm-screening}

A2. T1-07, T2-08, T5-07. Screenshot exception: the existing solution is organization-specific.

### Enable the Drive services {#enable-drive-services}

A3. T1-01, T2-03, T5-02. Screenshot: the MCP API enablement page and selected project.

### Configure the consent screen {#configure-consent}

A4. T1-02/05, T2-04/05, T3-04/05, T4-03/07. Screenshot: Data Access and applicable test users.

### Create the OAuth client {#create-oauth-client}

A5. T1-02, T2-06, T4-02/10. Screenshot: Web application callback; hide credentials.

### Confirm user access {#confirm-user-access}

A6. T1-06/08/09, T2-07, T3-01/02/03/06. Screenshot: application access controls; hide user data.

## Final evidence checks

Observed 2026-09-11T19:08:26Z: a public, unauthenticated MCP initialize POST to https://drivemcp.googleapis.com/mcp/v1 returned HTTP 200 with `content-type: application/json; charset=UTF-8`. The request used protocol version `2025-03-26` and Accept `application/json, text/event-stream`. The result included `"protocolVersion":"2025-03-26"` and `"tools":{"listChanged":false}`. This supports the `streamable-http` metadata value. It does not establish authenticated tool access. No user data or credential was sent.

The client field is confirmed at https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/IssuerFormFields.tsx#L395-L420. Exact label: `Scope (override)`. Use the two setup scopes rather than the broader Drive scope listed in resource metadata. This retains A8, not a new authorization path.

The same `IssuerFormFields.tsx` source, lines 409–412, says: `Comma-separated. When provided, the platform requests these scopes during the OAuth dance; otherwise it falls back to the issuer's scopes_supported.` Thus the Scope (override) input is comma-separated. This UI format is different from the space-separated upstream OAuth scope parameter. The guide uses the UI format. No setup actor or selected scope changed.

## Local validation result

The bundled `/usr/local/bin/lint-guide guides/google-drive` check passed after the anchor declarations were added. This checks the guide grammar and metadata. The Go generator validation in `.github/workflows/go-module-guide-validate.yml` could not run locally because the Go toolchain is unavailable. No Git checkout metadata is present for a local diff. These checks remain required in the authorized normal review workflow. No safeguards were changed. No PR was opened.
