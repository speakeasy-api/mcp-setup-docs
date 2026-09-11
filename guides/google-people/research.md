# Google People research dossier

Status: complete for the selected setup path. Observation date: 2026-09-11.
Research started at 18:42:07 UTC. Consolidation finished at approximately 19:07 UTC.

## Resolved context

- Provider: Google. Service: Google People. Slug: `google-people`.
- Mode: update. Output: `/workspace/guides/google-people/`.
- Reader: `doctrine/personas/it-admin.md`. Client: Speakeasy AI Control Plane.
- Existing title and slug establish identity only. Previous setup choices are not evidence.
- Official starting source: https://developers.google.com/workspace. Topic 5 followed current service-specific documentation and passed the remote endpoint gate.
- Selected path: manual OAuth, Internal when available, otherwise External Testing for permitted domain or company users. Use Google Model Armor project floor settings. No public production app or unused credential method is selected.
- OAuth compatibility was resolved before the final Topic 1 audit. The audit is complete. Topic 1 actors replace generic administrator references in other reports.
- Speakeasy source-management access is a prerequisite. The supplied documented procedure is sufficient; an exact client role name is not established. Ask an authorized project administrator for access if the controls are unavailable. Do not infer a Google role for this action.
- Catalog presence was not checked. Use the two documented add-server branches. The remote is shared, not tenanted.

## Canonical actions and anchors

Each action below combines repeated procedures from the topic reports. Each topic report retains source locations, dates, quotations, conditions, recipients, and permission checks. The final Topic 1 table is the canonical actor map.

| Action | Provider heading anchor | Requirements and sources | Screenshot note |
|---|---|---|---|
| A1 | `join-preview` | T2-01–03; T3 preview findings; T1-05. Use an existing project and the documented preview application. | Preview application without personal values. |
| A2 | `enable-people-api` | T5-03; T2-04; T1-01. Enable People API. | API activation page with project hidden. |
| A3 | `configure-oauth-consent` | T2-05–06; T3 test-user findings; T4-01–09; T1-02. Configure audience, three scopes, and conditional test users. | Branding, Audience, and Data Access without user details. |
| A4 | `create-oauth-client` | T2-07; T4; T1-02. Create a Web application client with the Speakeasy callback. | Client form with secret hidden. |
| A4 | `copy-oauth-credentials` | T4 credential handling. Obtain client ID and client secret during setup. | Credential values hidden. |
| A5 | `approve-user-access` | T2-08; T3; T1-06 and T1-09. Conditional app controls and directory sharing. | App access and directory settings without user data. |
| A6 | `configure-model-armor` | Updated T2-09–12; T1-07 and T1-10. Enable API and project floor settings for Google MCP Server; prompt injection detection; preserve regional and logging conditions. | Floor settings and Google MCP Server selection. |
| A7 | `add-server-in-speakeasy` and `connect-speakeasy-credentials` | T5; updated T4; central client evidence; canonical client source below. | Add Source menu and identity-provider sheet, credentials hidden. |

Do not duplicate consent, test-user, or role-assignment procedures. Put conditional user approval in A5. Do not add a manual offline parameter step. Do not include credential renewal or rotation. Warn that External Testing refresh tokens expire after seven days and that Google can end access.

## Research limitations and execution record

- No blocking gap remains for the selected setup path. Organization-specific grants, legal approval, log destinations, and data-residency decisions remain with the authorized owner.
- Separate release-note confirmation, catalog presence, exact client role names, and separate preview enrollment for each OAuth end user are non-blocking unknowns. Do not state that undocumented requirements are absent.
- Topic 3 first dispatch failed with `HOST_FAILURE_0`, provider code 402. Its retry completed. The actual error and elapsed time are saved in `.factory/dispatch-errors.jsonl`.
- First Topic 2 and Topic 4 follow-up dispatches failed input validation with `RL5208`. Corrected session handles succeeded. Complete initial reports were retained.
- Native per-dispatch deadlines are unavailable. Tasks stayed in the foreground. Research used two follow-up rounds. No automated reviewer or revision loop ran.
- Complete reports and actual dispatch prompts, topic IDs, hashes, and follow-up indexes are in `.factory/google-people-trial/`. No secret is saved. The initial Topic 5 result was reduced to its report and session handle; no raw tool updates are required.
- Tests in the client repository were inspected, not executed. Go is not installed. No concrete deployed-client mismatch was found.

## Canonical setup actions supplied for authority audit

# Selected setup actions

- A1: Use an existing Google Cloud project. Apply for the Workspace Developer Preview with an individual Workspace-domain email. Register the project and People MCP feature. Accept terms only with authority. Limit use to the permitted domain or company. Sources: T2-01 through T2-03 and T3 preview findings.
- A2: Enable `people.googleapis.com` in that project. Source: T5-03 and T2-04.
- A3: Configure Google Auth Platform Branding and policy acceptance, Internal audience when available, otherwise External Testing and permitted test users. Add the three People scopes. Sources: T2-05, T2-06; T3; T4-01 through T4-09.
- A4: Create a Web application OAuth client. Register `{{ gram.oauth.callback_url }}` as the redirect URI. Copy client ID and client secret. Do not select a production/public app path. Source: T2-07 and T4. Automatic offline access and consent are established by central client evidence. No extra user parameter step.
- A5: Apply conditional Workspace app-access approval and directory sharing for the connecting users. Keep underlying data limits. Sources: T2-08 and Topic 3.
- A6: Use Google Model Armor. Enable its API and configure project floor settings, including Google MCP Server and prompt injection/jailbreak detection. Use documented defaults where the provider permits. Keep logging optional; warn before enabling full-payload logging, and require a compliant log sink if residency rules apply. Sources: updated T2-09 through T2-12. No separate Speakeasy screening feature is required.
- A7: Add the remote `https://people.googleapis.com/mcp/v1` to Speakeasy. Attach manual OAuth with Google issuer `https://accounts.google.com`, discovered endpoints, the registered credentials and the three scopes. Complete browser consent with an eligible user. Sources: T5, updated T4, and doctrine/speakeasy-setup.md. Use catalog/custom options because catalog lookup is not complete. No renewal or rotation procedure.

Authentication selection is complete before this audit. Review only the selected path. Reconcile narrower roles from the initial Topic 1 report with actors in other reports. Do not demand Owner or super administrator by default. Record any missing authority evidence.

## Central client implementation evidence

# Central client evidence

Observed: 2026-09-11. Official repository commit: `496e62ca5d5ebd99f0c189f2614fc9c707e44659`.
Base: https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/

- `server/internal/remotesessions/interceptors/google.go`, lines 24–50: `strings.EqualFold(u.Hostname(), "accounts.google.com")`; `q.Set("access_type", "offline")`; `prompts = append(prompts, "consent")`. This upstream authorization interceptor matches the Google issuer and adds offline access and consent. It does not add a setup step.
- `server/internal/remotesessions/challenge.go`, lines 261–263 and 790–791: `interceptors.NewGoogle(logger)` is registered; `if ic.Match(client.IssuerURL) { ic.ModifyAuthorize(ctx, q) }`. This is the remote-session upstream authorization path, not downstream OAuth or dashboard sign-in. The issuer match is the condition. No feature flag is present at this registration or invocation.
- `server/internal/remotesessions/challenge.go`, lines 952–960 and 1053 onward: `m.enc.Encrypt([]byte(tok.AccessToken))`; `m.enc.Encrypt([]byte(tok.RefreshToken))`. The callback stores encrypted tokens.
- `server/internal/remotesessions/refreshservice.go`, lines 175–187, 354–410, 478–489: the remote-session service implements refresh and checks the encrypted refresh grant. `RefreshNow` uses the stored session and client.
- Tests: `server/internal/remotesessions/interceptors/google_test.go`, lines 13–75, cover issuer matching, offline access, consent, and existing prompt preservation. `server/internal/remotesessions/refreshservice_concurrent_test.go`, test `TestRefreshNow_RacingLazyResolves_SingleUpstreamCall`, covers refresh. `refreshservice_invalid_grant_test.go` covers expired grants. Tests were inspected, not executed; Go is not installed in this container.
- Manual client registration is the selected mode. The interceptor runs on the resolved remote client issuer, not on a DCR-only branch. No concrete deployment mismatch was found. Do not require a new manual parameter step or infer downstream behavior from this evidence.

Selected security path: Google-provided Model Armor, with the project API enabled and Google MCP Server floor settings. Use the provider procedure in Topic 2 T2-09. Do not assume that Speakeasy screening is sufficient. This provider-side path does not need a new client feature.

## Topic evidence and final authority audit

## Topic and status

**Topic 5: MCP endpoint and connection configuration — complete.**

Google documents a remote People API MCP server. It gives a fixed URL and a direct remote connection procedure. This path does not require a local proxy or bridge. Other topics must check the preview program, project setup, permissions, and authentication requirements.

**Observation date for all sources: 2026-09-11.**

## Findings

### T5-01 — Use the remote People API MCP endpoint

- **Status:** Required.
- **Actor and scope:** The administrator configures the remote server connection in the client. The connecting user gives the client access to permitted profile and contact data.
- **Documented values:**
  - Server name: `people`
  - Server URL: `https://people.googleapis.com/mcp/v1`
  - Transport: HTTP
  - Authentication: OAuth 2.0
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#configure-mcp-client\
  Location: **Configure your MCP client > Others**.
- **Exact quotations:**
  - “Server name: people”
  - “Server URL: https://people.googleapis.com/mcp/v1”
  - “Transport: HTTP”
  - “Authentication: The People API remote MCP server uses OAuth 2.0.”
- **Interpretation:** Use the fixed URL as documented. It is an MCP endpoint, not only a general API address. The connection example has no tenant, project, region, or environment variable in this URL.

### T5-02 — The documented remote path does not need a local bridge

- **Status:** A local bridge is **explicitly not required for the documented direct remote connection path**.
- **Actor and scope:** The administrator enters the remote connection details in the client.
- **Documented action:** The Claude example uses a custom connector with the remote URL and OAuth client credentials. The **Others** section gives direct remote connection values.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#configure-mcp-client\
  Location: **Claude** and **Others**.
- **Exact quotations:**
  - “To add the People API remote MCP server to Claude, configure a custom connector with an OAuth client ID and secret.”
  - “Remote MCP server URL: https://people.googleapis.com/mcp/v1”
  - “Many AI applications have ways to connect to a remote MCP server.”
- **Interpretation:** The local CLI prerequisites apply to commands on the page. They do not make the documented direct remote connection a local-server setup. The coordinator must adapt the remote connection to Speakeasy.

### T5-03 — Enable the service in the selected Google Cloud project

- **Status:** Required.
- **Actor and scope:** A person with the required project authority enables the service. Topic 1 must establish that authority. The requirement applies to the Google Cloud project used for setup.
- **Documented action and value:** Enable `people.googleapis.com`. The service-specific page provides an **Enable the APIs** console link:
  https://console.cloud.google.com/flows/enableapi?apiid=people.googleapis.com
- **Environment value:** Select the reader’s Google Cloud project. The CLI alternative calls this value `PROJECT_ID`. It is not part of the MCP URL.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#enable-api-mcp\
  Location: **Configure the People API MCP server > Enable the API and MCP service**.
- **Exact quotations:**
  - “To use the People API MCP server, you must enable it in your Google Cloud project and then configure your MCP client to connect to it.”
  - “To use the People API MCP server, you must enable the following service in your Google Cloud project: People API”
  - “gcloud services enable people.googleapis.com --project=PROJECT_ID”
- **Supporting source:** https://developers.google.com/workspace/guides/configure-mcp-servers\
  Location: **Enable the MCP services**.
- **Exact quotation:** Its command includes `people.googleapis.com`.
- **Interpretation:** The shared page calls this entry “People MCP API,” but its service value remains `people.googleapis.com`. Do not invent a separate `peoplemcp.googleapis.com` service or endpoint. The documented action enables project access to the remote service; it does not create a tenant-specific URL.

### T5-04 — Google Workspace has separate product MCP servers

- **Status:** Conditional. These other servers apply only when the requested work includes their products. The Google People request uses the People API server.
- **Actor and scope:** The administrator selects the product server or servers for the required work.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers\
  Locations: **Introduction**, **Configure your MCP client**, and **Supported products**.
- **Exact quotation:** “Each Google Workspace product has its own dedicated MCP server.”

The same page documents these servers:

| Server | Documented URL | Documented tool examples and use |
|---|---|---|
| Gmail | `https://gmailmcp.googleapis.com/mcp/v1` | `create_draft`, `get_message`, `search_threads`: work with email drafts and messages. |
| Google Drive | `https://drivemcp.googleapis.com/mcp/v1` | `copy_file`, `create_file`, `search_files`: find and manage files. |
| Google Docs | `https://docsmcp.googleapis.com/mcp/v1` | `read_doc`, `update_doc`: read and change documents. |
| Google Sheets | `https://sheetsmcp.googleapis.com/mcp/v1` | `get_values`, `update_values`, `update_formulas`: read and change spreadsheets. |
| Google Slides | `https://slidesmcp.googleapis.com/mcp/v1` | `read_presentation`, `update_presentation`: read and change presentations. |
| Google Calendar | `https://calendarmcp.googleapis.com/mcp/v1` | `create_event`, `list_events`, `suggest_time`: read and manage calendar events. |
| Google Chat | `https://chatmcp.googleapis.com/mcp/v1` | `search_conversations`, `send_message`: find conversations and send messages. |
| People API | `https://people.googleapis.com/mcp/v1` | `get_user_profile`, `search_contacts`, `search_directory_people`: read profile, contact, and directory data. |

- **Quotation evidence:** The URL cells reproduce the server URL entries in **Configure your MCP client**. The tool names reproduce entries in **Supported products**.
- **Interpretation:** These are separate product servers, not tenant or environment variants of People API. The requested task does not call for a connection to all eight servers.
- **Server-specific difference:** The shared page requires Chat app configuration for Google Chat.
  - Location: **Configure the Chat app**.
  - Exact quotation: “To use the Google Chat MCP server, you must configure a Chat app in your Google Cloud project.”
- Do not apply the Chat app requirement to People API. Do not copy another server’s API service name or scope list into the People setup.

### T5-05 — Use the People-specific OAuth configuration

- **Status:** Required for the documented setup.
- **Actor and scope:** The application owner configures OAuth access in the selected project. The user grants access to their permitted data.
- **Documented scope values:**
  - `https://www.googleapis.com/auth/directory.readonly`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `https://www.googleapis.com/auth/contacts.readonly`
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#configure-consent-screen\
  Location: **Set up the OAuth consent screen**.
- **Exact quotation:** “Under Manually add scopes, paste the scopes for the People API MCP server:” followed by the three values above.
- **Interpretation:** Topic 4 must use this service-specific list. The endpoint is fixed, but access depends on the application and user configuration.

### T5-06 — The service is in Developer Preview

- **Status:** Required access-program check.
- **Actor and scope:** The organization or application owner must meet the applicable preview requirements. Topics 1–3 must establish the details.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server\
  Location: Opening notice.
- **Exact quotation:** “Developer Preview: Available as part of the Google Workspace Developer Preview Program, which grants early access to certain features.”
- **Linked source:** https://developers.google.com/workspace/preview
- **Interpretation:** The remote URL is established. Preview eligibility remains a separate setup requirement, not an endpoint variable.

### T5-07 — Screen prompts and responses

- **Status:** Required. Model Armor is one documented option, not the only option.
- **Actor and scope:** The client or application owner provides the screening solution. The organization owner manages any project security configuration.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security\
  Location: Introduction.
- **Exact quotation:** “You must screen prompts and responses for malicious content or prompt injection attacks. You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Interpretation:** This requirement does not change the documented People MCP URL. The coordinator must check the client solution. Topics 1 and 2 must check any selected organization or project configuration.

## Unresolved questions

### Non-blocking — Additional connection headers or parameters

The service-specific **Others** section gives the server name, URL, HTTP transport, and OAuth 2.0 authentication. It does not specify a separate non-authentication header, URL parameter, region, or tenant identifier.

This is not proof that every other setting is unnecessary. The documented connection procedure is sufficient for endpoint configuration.

### Non-blocking — Requirements for unrelated product servers

The shared page establishes the eight Workspace servers. This research did not establish every permission and scope for the seven servers outside the Google People request. They do not block the People setup.

### Non-blocking — Release-note confirmation

The People setup page states **“Last updated 2026-09-03 UTC.”** The shared security page states **“Last updated 2026-09-10 UTC.”** No replacement notice was found in the checked setup content. Separate release-note confirmation was not completed within the research limit.

### Blocking gaps

**None for the remote endpoint and documented connection values.** Other topic findings can still identify setup blockers.

## Cross-topic dependencies

- **Topic 1:** Establish authority to enable `people.googleapis.com`, configure OAuth access, and make any selected security changes.
- **Topic 2:** Use the service-specific project enablement requirement. Do not create an undocumented People MCP service name. Check preview enrollment and security configuration.
- **Topic 3:** Check preview eligibility and the user permissions for profiles, contacts, and directory searches.
- **Topic 4:** Use OAuth 2.0 and the three People-specific scopes in T5-05. Check the client credential, consent, and refresh-token requirements.
- **Coordinator:** Use the remote URL `https://people.googleapis.com/mcp/v1`. Select the Speakeasy catalog or Custom remote server path. Check manual OAuth behavior, callback handling, and the required prompt and response screening solution. Do not require a local proxy or configure the other Workspace servers for this People-only task.


## Topic and status

**Topic 2: Organization-level setup — complete.**

The selected Model Armor path supports the People API remote MCP server. Google documents automatic screening through project floor settings. The documented setup does not require a new Speakeasy screening feature.

**Observation date for all sources: 2026-09-11.**

**Updated findings:** T2-09 replaces the earlier security finding. T2-10 through T2-12 add detection settings, regional limits, and logging controls. T2-01 through T2-08 retain the earlier findings and sources.

No files or provider settings were changed.

## Findings

### T2-01 — Use a Google Cloud project

- **Status:** Required. Project creation is conditional if a suitable project already exists.
- **Actor and scope:** The project owner supplies the project for API activation, preview registration, OAuth configuration, and the selected Model Armor configuration.
- **Documented action:** For a new project, open **IAM & Admin > Create a Project**. Enter **Project Name**. In **Location**, select **Browse**, choose the location, and select **Select**. Select **Create**.
- **Environment values:** Obtain the project and organization from the Google Cloud owner. Keep the project ID and project number separate. Preview registration requires the project number.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#prerequisites\
  Location: **Prerequisites**.
  - **Quotation:** “A Google Cloud project.”
- **Source:** https://developers.google.com/workspace/guides/create-project\
  Location: **Create a Cloud project > Google Cloud console**.
  - **Quotation:** “In the Project Name field, enter a descriptive name for your project.”
  - **Quotation:** “In the Location field, click Browse to display potential locations for your project. Then, click Select.”
- **Interpretation:** Use the same selected project for the documented configuration. Topic 1 must verify authority.

### T2-02 — Register the account and project for Developer Preview

- **Status:** Required.
- **Actor and scope:** Each participant applies with an individual Google Workspace account. Google verifies the account and registers the supplied project.
- **Documented action:** Review the program terms. Open the application form linked under **How to join the program**. Sign in with the applicant account. Supply the individual email address and Google Cloud project number. Submit the application. Google sends final registration confirmation.
- **Required values:** An individual Workspace-domain email address and one or more project numbers. Separate multiple project numbers with a comma and a space.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server\
  Location: Opening notice.
  - **Quotation:** “Developer Preview: Available as part of the Google Workspace Developer Preview Program, which grants early access to certain features.”
- **Source:** https://developers.google.com/workspace/preview#how_to_join_the_program\
  Location: **How to join the program**.
  - **Quotation:** “You need to provide us with your Google Workspace account and Google Cloud project information.”
  - **Quotation:** “After verifying your Google Workspace account, we will register your Google Cloud project.”
  - **Quotation:** “When it is done, you will receive a final confirmation to your registered email address.”
- **Source:** [Official program application form](https://docs.google.com/forms/d/e/1FAIpQLSd7BiMXXHDlUDkF7G0TSY5zfJbQwFNH3m6K_ZYFi3vCHLFbng/viewform?resourcekey=0-1uHeVg8junj3PPTLNcn7WQ)\
  Locations: Introduction; email field; **Google Cloud Project number**.
  - **Quotation:** “The email address has to be in a workspace domain (we cannot accept Gmail addresses nor a Service Account).”
  - **Quotation:** “Each application allows for the registration of only one individual email address, ensuring every member understands the Program Terms. Use of Google Groups is no longer allowed for the same reason.”
  - **Quotation:** “You can register one or more project numbers.”
- **Interpretation:** Individual enrollment and project registration are separate requirements. A Google Group cannot be the applicant.

### T2-03 — Permit program group membership and observe preview limits

- **Status:** Required for enrollment. Government data limits are conditional.
- **Actor and scope:** The applicant permits program group membership. The organization owner controls application access and permitted data.
- **Documented action:** Make sure the applicant can be added to Google Groups. Review and accept the program terms through the application.
- **Source:** https://developers.google.com/workspace/preview#how_to_join_the_program\
  Location: Step 3.
  - **Quotation:** “Make sure that your email account accepts getting added to Google Groups.”
  - **Quotation:** “If your email address cannot be added to the Google Group, you won't be able to access the dedicated client library, and you won't get access to some of the features.”
- **Source:** https://developers.google.com/workspace/preview#dpp-terms\
  Location: **Developer Preview Program Terms**, clauses ii, iv, and vii.
  - **Quotation:** “program features may not be included in public applications prior to the General Availability (GA) announcement.”
  - **Quotation:** “I may not grant end users access, outside my domain or company” to applications built with Pre-GA APIs, subject to the permission exception in clause iv.
  - **Quotation:** Government or regulatory entities, excluding educational institutions, “may only use test or experimental data” and may not use “‘live’ or production data.”
- **Interpretation:** Program group membership does not conflict with the ban on a group as the applicant. Keep the trial within the permitted company or domain.

### T2-04 — Enable People API

- **Status:** Required.
- **Actor and scope:** A person with API activation authority enables People API in the registered project.
- **Documented action:** Use the People MCP page’s **Console > Enable the APIs** link:
  https://console.cloud.google.com/flows/enableapi?apiid=people.googleapis.com
- **Required value:** `people.googleapis.com`.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#enable-api-mcp\
  Location: **Enable the API and MCP service**.
  - **Quotation:** “To use the People API MCP server, you must enable the following service in your Google Cloud project:”
  - **Quotation:** “People API”
  - **Quotation:** `gcloud services enable people.googleapis.com --project=PROJECT_ID`
- **Interpretation:** Do not replace the documented service value with an invented People MCP service name.

### T2-05 — Configure the OAuth consent screen

- **Status:** Required.
- **Actor and scope:** The OAuth application owner configures Google Auth Platform in the selected project.
- **Documented action and values:**
  - Open **Google Auth Platform > Branding**.
  - For a new configuration, select **Get Started**.
  - Set **App name** to `People API MCP Server`.
  - Select the owner’s email or an appropriate Google Group for **User support email**.
  - Select **Next**.
  - Under **Audience**, select **Internal**. If unavailable, select **External**.
  - Select **Next**.
  - Under **Contact Information**, enter an email address for project notices.
  - Select **Next**.
  - Review the Google API Services User Data Policy. If accepted, select **I agree to the Google API Services: User Data Policy**, then **Continue**, then **Create**.
  - For an existing configuration, use **Branding**, **Audience**, and **Data Access**.
- **Environment values:** The application owner supplies support and contact addresses.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#configure-consent-screen\
  Location: **Set up the OAuth consent screen**.
  - **Quotation:** “You must configure the OAuth consent screen before you can create an OAuth client ID.”
  - **Quotation:** “Under App Information, in App name, type People API MCP Server.”
  - **Quotation:** “Under Audience, select Internal. If you can't select Internal, select External.”
- **Interpretation:** The **External** option does not remove preview account or audience restrictions.

### T2-06 — Add People scopes and applicable test users

- **Status:** Scopes are required. Test users are required for **External** in the documented procedure.
- **Actor and scope:** The application owner configures application scopes and test-user access.
- **Documented action:**
  - For **External**, open **Audience > Test users > Add users**. Enter authorized test-user email addresses. Select **Save**.
  - Open **Data Access > Add or Remove Scopes**.
  - Under **Manually add scopes**, enter:
    - `https://www.googleapis.com/auth/directory.readonly`
    - `https://www.googleapis.com/auth/userinfo.profile`
    - `https://www.googleapis.com/auth/contacts.readonly`
  - Select **Add to Table**, then **Update**, then **Save** on **Data Access**.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#configure-consent-screen\
  Location: **Set up the OAuth consent screen**.
  - **Quotation:** “If you selected External for user type, add test users”
  - **Quotation:** “Under Manually add scopes, paste the scopes for the People API MCP server:” followed by the three values above.
- **Interpretation:** Application scopes do not replace connecting-user data permissions.

### T2-07 — Register an OAuth web application for manual OAuth

- **Status:** Required for the selected manual OAuth path.
- **Actor and scope:** The application owner creates the OAuth client in the selected project.
- **Documented action:** Open **Google Auth Platform > Clients > Create Client**. Select **Web application**. Enter a **Name**. Under **Authorized redirect URIs**, select **+ Add URI** and enter the client callback. Select **Create**. Copy **Client ID** and **Client Secret**.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server#configure-mcp-client\
  Location: **Claude**.
  - **Quotation:** “Select Web application as the application type.”
  - **Quotation:** “Click Create and copy your Client ID and Client Secret.”
- **Interpretation:** The Google example uses the Claude callback. For Speakeasy, the coordinator supplies the callback from `{{ gram.oauth.callback_url }}`. Do not copy the Claude callback. Topic 4 owns token behavior.

### T2-08 — Approve application access when organization policy requires it

- **Status:** Conditional. Applies when Workspace app controls block the application or its required access.
- **Actor and scope:** An administrator with the **Service Settings administrator privilege** configures access for the organization or selected organizational units.
- **Documented action:** Open **Security > Access and data control > API controls > Manage App Access**. Under **Configured apps**, select **Configure new app**. Search by OAuth client ID. Select the app and applicable organizational units. Select **Continue**. Under **Access to Google data**, select the approved access setting. Select **Continue**, review, and select **Finish**.
- **Required values:** Use the OAuth client ID from T2-07. With **Specific Google data**, include the required application scopes and required Google Sign-in scopes.
- **Source:** https://support.google.com/a/answer/7281227?hl=en\
  Locations: **Restrict or unrestrict Google services**; **Configure a new app**.
  - **Quotation:** “Restricted—Only internal and third-party apps configured with a Trusted or Specific Google data access setting can access data.”
  - **Quotation:** “Requires having the Service Settings administrator privilege.”
  - **Quotation:** “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
- **Interpretation:** App approval is conditional, not a universal extra step. Broad **Trusted** access requires an organization decision.

### T2-09 — Enable Model Armor and project MCP floor settings

**Replaces the earlier T2-09.**

- **Status:** Required for the selected Model Armor path.
- **Actor and scope:** The project security administrator configures screening in the Google Cloud project used for the People connection.
- **Documented actions and values:**
  - Enable `modelarmor.googleapis.com` in the selected project through:
    https://console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com
  - Open **Model Armor** and select the project.
  - Open **Floor settings > Configure floor settings**.
  - Select **Custom** to define project settings, unless applicable inherited settings already provide the selected protection.
  - Configure the detection settings in T2-10.
  - Under **Services**, select **Google MCP Server**.
  - The Workspace example enables floor-setting enforcement and uses `INSPECT_AND_BLOCK`.
  - Apply the logging controls in T2-12.
  - Select **Save floor settings**. Allow a few minutes for the change.

- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security\
  Locations: Introduction; **Enable Model Armor**; **Configure protection for Google and Google Cloud remote MCP servers**.
  - **Quotation:** “You must screen prompts and responses for malicious content or prompt injection attacks.”
  - **Quotation:** “You must enable Model Armor APIs before you can use Model Armor.”
  - **Quotation:** “Set up a Model Armor floor setting with MCP sanitization enabled.”
  - **Quotation:** `--google-mcp-server-enforcement-type=INSPECT_AND_BLOCK`
- **Source:** https://docs.cloud.google.com/model-armor/configure-floor-settings\
  Locations: **Obtain the required permissions**; **Configure floor settings**; **Define where floor settings are applied**.
  - **Quotation:** “Model Armor Floor Setting Admin (`roles/modelarmor.floorSettingsAdmin`) IAM role on Model Armor floor settings.”
  - **Quotation:** “On the Model Armor page, go to the Floor settings tab and click Configure floor settings.”
  - **Quotation:** “Google MCP Server: Floor settings check requests sent to or from Google or Google Cloud remote MCP servers”.
  - **Quotation:** “Custom settings that you define for a project override any inherited floor settings.”
- **API activation authority:** The same sources state that API activation needs `serviceusage.services.enable`. They identify **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`) as a role that supplies it.
- **Interpretation:** The selected path is provider-side configuration. A separate client screening feature is not part of this procedure. Review existing inherited settings before replacing them.

### T2-10 — Use the documented detection settings

- **Status:** Required for the selected configuration. Additional filters are conditional.
- **Actor and scope:** The security owner selects project detection settings.
- **Documented configuration:**
  - Enable malicious URL detection.
  - Use the **Responsible AI – Dangerous** filter at **Medium and above**.
  - The Workspace example uses `INSPECT_AND_BLOCK` to block matching content.
  - Enable prompt injection and jailbreak detection when MCP traffic carries natural-language data. Google recommends **High** for this detection.
  - Sensitive Data Protection is optional. If selected, configure its additional settings.

- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security\
  Location: **Configure protection for Google and Google Cloud remote MCP servers**, example and setting descriptions.
  - **Quotation:** `--malicious-uri-filter-settings-enforcement=ENABLED`
  - **Quotation:** `{"confidenceLevel": "MEDIUM_AND_ABOVE", "filterType": "DANGEROUS"}`
  - **Quotation:** “Don't enable the prompt injection and jailbreak filter unless your MCP traffic carries natural language data.”
  - **Quotation:** “INSPECT_AND_BLOCK: The enforcement type that inspects content for the Google MCP server and blocks prompts and responses that match the filters.”
- **Source:** https://docs.cloud.google.com/model-armor/configure-floor-settings\
  Location: **Configure floor settings**.
  - **Quotation:** “If you don't specify a confidence level, it defaults to Medium and above.”
  - **Quotation:** “Optional: If you select Sensitive Data Protection detection, configure the Sensitive Data Protection settings.”
- **Source:** https://docs.cloud.google.com/model-armor/manage-templates#configure-detections\
  Location: **Configure detections**, linked by the floor-settings procedure.
  - **Quotation:** “Prompt injection and jailbreak detection: Detects malicious content and jailbreak attempts in a prompt.”
  - **Quotation:** “We recommend that you set the confidence level to High to minimize false positives and ensure consistent detection behavior.”
- **Interpretation:** The malicious URL and Dangerous settings are Google’s documented example, not a claim that every filter is mandatory. Use its **Medium and above** value for Dangerous. Use the specific **High** recommendation if prompt injection detection is selected.

### T2-11 — People is supported, with automatic cross-jurisdictional routing

- **Status:** Required compatibility check, resolved. Regional risk review is conditional on organization requirements.
- **Actor and scope:** The security owner checks the permitted processing locations. The administrator retains the documented People endpoint.
- **Source:** https://docs.cloud.google.com/mcp/model-armor-supported-products\
  Locations: **Products with Model Armor support**, **People API** row; **Cross-jurisdictional routing**.
  - **Quotation:** The People API row states: “Cross-jurisdictional routing. Model Armor is always called when enabled.”
  - **Quotation:** “If Model Armor isn't present in the jurisdiction where the MCP request is sent, then the request is sent to Model Armor in another jurisdiction.”
  - **Quotation:** “These cross-jurisdictional calls might impact your data residency compliance for in-use data.”
- **Source:** https://docs.cloud.google.com/model-armor/model-armor-mcp-google-cloud-integration\
  Locations: **Supported MCP servers**; **Configure protection**; **Disable scanning MCP traffic with Model Armor**.
  - **Quotation:** “Model Armor floor settings won't apply if you call unsupported Google and Google Cloud MCP servers.”
  - **Quotation:** “To stop Model Armor from automatically scanning traffic to and from Google MCP servers based on the project's floor settings”.
- **Source:** https://docs.cloud.google.com/model-armor/locations\
  Locations: **Regions**, **Multi-regions**, final note.
  - **Quotation:** “Model Armor is available in the following zones, regions, and multi-regions.”
  - **Quotation:** “Feature availability varies by region to comply with data residency and other regional requirements.”
- **Documented locations:** The page lists regions in Asia Pacific, North America, and Europe, plus the `eu` and `us` multi-regions. It identifies feature limits in `asia-south1` and `northamerica-northeast2`.
- **Interpretation:** People support is explicit. Google automatically routes supported People MCP traffic to Model Armor when enabled. The setup does not require a new Speakeasy feature, a local bridge, or a different People endpoint. Do not claim that the fixed People URL keeps screening in a chosen jurisdiction.

**Screening coverage limit**

- **Source:** https://docs.cloud.google.com/model-armor/model-armor-mcp-google-cloud-integration\
  Location: **Supported and unsupported MCP payloads**.
- **Quotation:** “Model Armor sanitizes only the following MCP payloads:” followed by `tools/call` request and response, `prompts/get` request and response, and MCP tool execution errors.
- **Quotation:** “Model Armor allows the following payloads without sanitization:” followed by `tools/list`, `resources/*`, `notifications/*`, “Streamable HTTP/SSE for MCP”, and MCP protocol errors.
- **Interpretation:** Do not describe this as screening every MCP message or all client activity. The supported-product statement and documented integration procedure establish the selected People path.

### T2-12 — Review full-payload logging and log location

- **Status:** Required warning for the selected procedure. A compliant log sink is required if data-residency requirements apply and Cloud Logging is enabled.
- **Actor and scope:** The project security or logging administrator controls storage and access to logs.
- **Documented action:** The Workspace example enables Google MCP Server Cloud Logging. The console procedure uses **Logs > Enable Cloud Logging**. Review the data exposure before enabling it. If residency requirements apply, configure the log sink first.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security\
  Locations: **Use Model Armor**; configuration example.
  - **Quotation:** “When Model Armor is enabled with logging enabled, Model Armor logs the entire payload. This might expose sensitive information in your logs.”
  - **Quotation:** `--enable-google-mcp-server-cloud-logging`
- **Source:** https://docs.cloud.google.com/model-armor/configure-floor-settings\
  Location: **Configure floor settings**.
  - **Quotation:** “In the Logs section, select Enable Cloud Logging to log all user prompts, model responses, and the floor settings detector results.”
- **Source:** https://docs.cloud.google.com/model-armor/model-armor-mcp-google-cloud-integration\
  Location: **Before you begin**.
  - **Quotation:** “If you have data residency requirements, you must configure a log sink to route logs to a compliant storage location before you enable Cloud Logging in the next procedure.”
- **Interpretation:** Full-payload logging can create another copy of contact and profile data. The owner must approve the log destination and access controls. Do not present logging as necessary to make the client compatible.

## Unresolved questions

### Non-blocking — Organization-specific residency and logging rules

Public documentation cannot establish the organization’s permitted processing jurisdictions or log locations. The provider gives a concrete procedure and an explicit People routing rule.

If the organization requires processing only within a jurisdiction that the automatic route cannot guarantee, the security owner must resolve that requirement before enabling the selected path.

### Non-blocking — Billing

The linked project page labels billing **“Optional: Enable billing for your Cloud project”** and says that the need depends on selected APIs and features. This does not establish that Model Armor has no cost or billing requirement. Billing was not a requested follow-up check.

### Non-blocking — Exact authority for the retained OAuth actions

The People setup page gives concrete OAuth actions but does not name every applicable role. Topic 1 must verify OAuth configuration and policy-acceptance authority.

For Model Armor, current sources explicitly establish API activation permission and the floor-settings administrator role.

### Non-blocking — Existing organization controls

Existing Workspace restrictions, inherited floor settings, and Context-Aware Access rules remain environment-specific. Review them before changing access or replacing inherited settings.

### Resolved — Selected screening solution

The earlier uncertainty about the selected solution is resolved. Model Armor is selected. Current official sources explicitly list People API support and automatic screening.

### Current-source check

The original observed update dates remain:

- People setup: **2026-09-03 UTC**
- Workspace preview: **2026-09-11 UTC**
- Workspace MCP security: **2026-09-10 UTC**

The follow-up checked the live security, floor-settings, supported-products, integration, locations, and detection pages. No replacement notice was found in the checked setup content.

**Blocking gaps for Topic 2: None.**

## Cross-topic dependencies

- **Topic 1:** Verify project, OAuth, and Workspace app-control authority. For Model Armor, use `serviceusage.services.enable` and `roles/modelarmor.floorSettingsAdmin`. Check authority for any required log sink.
- **Topic 3:** Retain the individual preview enrollment restrictions, program group membership, test-user access, and underlying data permissions.
- **Topic 4:** Retain the three People scopes and selected manual OAuth client registration. The supplied central refresh findings belong to Topic 4 and the coordinator; they do not add organization setup steps.
- **Topic 5:** Retain `https://people.googleapis.com/mcp/v1`. Model Armor does not require a replacement endpoint. State the coverage and routing limits without changing the endpoint.
- **Coordinator:** Use the selected provider-side Model Armor path. No new Speakeasy screening feature is needed for this documented path. Include the malicious URL and Dangerous example settings, the conditional prompt injection filter, and the full-payload logging warning. Do not claim that Model Armor screens every MCP message or guarantees a chosen processing jurisdiction.

## Topic and status

**Topic 3: Connecting-user setup — complete.**

The official instructions establish user-data access, test-user access, preview limits, and applicable administrator controls. They support a trial within the approved domain or company. They do not establish a separate People MCP license or a mandatory MCP role for each user.

**Observation date for all sources: 2026-09-11.**

## Findings

### T3-01 — MCP access uses the connecting user’s permissions

- **Status:** Required.
- **Who and scope:** Each connecting user. Access applies to that user’s profile, contacts, and permitted directory data.
- **Documented action:** Use a Google account that has access to the required data. An administrator must change the underlying access controls if the user needs more access.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server\
  **Location:** Introduction, list of server functions.
- **Exact quotations:**
  - “Read data: Retrieve user profiles and search contacts or directory people.”
  - “Respect security: Inherit the same permissions and data governance controls as the user.”
- **Interpretation:** The MCP connection does not give the user wider data access. Do not assign an administrator role only to obtain wider MCP results.

### T3-02 — Add connecting users as test users for the documented External setup

- **Status:** Conditional. Applies when the application owner selects **External** in the documented consent-screen procedure.
- **Who and scope:** The application owner adds the connecting users to the OAuth application. Topic 1 must confirm the applicable project authority.
- **Documented action:**
  1. Open **Audience**.
  2. Under **Test users**, select **Add users**.
  3. Enter the connecting users’ Google account email addresses.
  4. Select **Save**.
- **Value source:** Obtain the account email addresses from the intended users.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server\
  **Location:** **Set up the OAuth consent screen**.
- **Exact quotations:**
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “If you selected External for user type, add test users:”
  - “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** For this documented External setup, add every intended trial user. An External audience does not remove the preview limits in T3-03.

### T3-03 — Keep preview users within the permitted domain or company

- **Status:** Required while the People MCP server is in Developer Preview.
- **Who and scope:** The application owner controls access to the preview application. The restriction applies to its end users.
- **Documented action:** Limit trial access to users within the owner’s domain or company. Do not make the application public before General Availability. An exception for outside users needs the specific Google permission described in the terms.
- **Sources:**
  - https://developers.google.com/people/v1/configure-mcp-server\
    **Location:** Opening notice.
  - https://developers.google.com/workspace/preview\
    **Location:** **Developer Preview Program Terms**, items (ii) and (iv).
- **Exact quotations:**
  - “Developer Preview: Available as part of the Google Workspace Developer Preview Program, which grants early access to certain features.”
  - “program features may not be included in public applications prior to the General Availability (GA) announcement.”
  - “I may not grant end users access, outside my domain or company, to developer applications that have been built using APIs prior to their GA announcement”
  - The exception continues: “unless Google specifically states that I can request such permission and such permission has been granted to my Workspace account for that feature.”
- **Interpretation:** The supported trial is not a public application release. A test-user entry alone does not authorize an outside customer to use the preview.

### T3-04 — Register the preview account and project

- **Status:** Required for preview enrollment. Additional account registration is conditional on the accounts that the owner needs to register.
- **Who and scope:** The program applicant submits their Google Workspace account and Google Cloud project details. Google verifies the account and registers the project.
- **Documented action:** Submit the application linked under **How to join the program**. Make sure the applicant’s email account accepts Google Group membership. Use the **Request to add or remove email addresses** form when more registered email addresses are needed.
- **Value source:** Obtain the Workspace account email and project information from the application owner.
- **Source:** https://developers.google.com/workspace/preview\
  **Locations:** **How to join the program**, **Questions and Requests**, and **FAQ**.
- **Exact quotations:**
  - “You need to provide us with your Google Workspace account and Google Cloud project information.”
  - “Make sure that your email account accepts getting added to Google Groups.”
  - “After verifying your Google Workspace account, we will register your Google Cloud project.”
  - “When you want to register more email addresses or Google Cloud projects to the program, submit a request using one of the forms.”
  - “We provide you access to the program API features through your Google Cloud project(s).”
- **Interpretation:** The source establishes account and project enrollment. It does not clearly require separate program enrollment for every OAuth end user. Do not state that all connecting users must enroll separately.

### T3-05 — Permit external directory access when users need directory searches

- **Status:** Conditional. Applies when users need domain directory data through the third-party MCP client.
- **Who and scope:** A domain administrator with the **Directory settings administrator privilege** changes the domain setting. Connecting users receive access only to permitted directory information.
- **Documented action:**
  1. In the Google Admin console, open **Directory > Directory settings**.
  2. Select **Sharing settings > External Directory Sharing**.
  3. To share organization directory data, select **Organization data and authenticated user basic profile fields**.
  4. Select **Save**.
- **Required value:** The option above permits organization directory data. **Authenticated user basic profile fields** shares only the authenticated user’s basic profile, not other users’ profiles.
- **Sources:**
  - https://developers.google.com/people/v1/directory\
    **Location:** Important notice before **List the directory people**.
  - https://knowledge.workspace.google.com/admin/users/let-third-party-apps-access-directory-data\
    **Locations:** **Allow or restrict access to Directory data**, **Affected apps and APIs**.\
    The linked legacy URL, https://support.google.com/a/answer/6343701, redirects to this maintained page.
- **Exact quotations:**
  - “Reading domain data requires that the domain admin must have enabled external contact and profile sharing of domain-scoped data for their domain.”
  - “Requires having the Directory settings administrator privilege.”
  - “Organization data and authenticated user basic profile fields—Share all Directory information that is shared within your organization.”
  - “Changes can take up to 24 hours but typically happen more quickly.”
  - The affected API list includes “Google People API”.
- **Interpretation:** This is a domain configuration dependency for directory searches. It is not permission to read all users’ personal contacts. The source states: “The information shared with external apps never includes users' personal contacts or private profile data.”

### T3-06 — Permit the OAuth application for the connecting users where access controls require it

- **Status:** Conditional. Applies when Google Workspace application controls prevent the selected users from giving the application the required access.
- **Who and scope:** An administrator with the **Service Settings administrator privilege** configures application access for the organizational units that contain the connecting users.
- **Documented action for a new application:**
  1. Open **Security > Access and data control > API controls** in the Admin console.
  2. Select **Manage App Access**.
  3. Under **Configured apps**, select **Configure new app**.
  4. Search by the application name or OAuth client ID.
  5. Select the application.
  6. Under **Scope**, select the required organizational units.
  7. Select **Continue**.
  8. Under **Access to Google data**, select an access level that permits the required scopes.
  9. Select **Continue**, review the settings, and select **Finish**.
- **Value source:** Obtain the OAuth client ID from the application owner. Obtain the user organizational units from the Workspace administrator.
- **Source:** https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data\
  **Location:** **Manage app access to Google services & add apps > Configure a new app**.\
  The legacy URL, https://support.google.com/a/answer/7281227, redirects to this maintained page.
- **Exact quotations:**
  - “Requires having the Service Settings administrator privilege.”
  - “Enter the app's name or client ID, then click Search.”
  - “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
  - “You must include the Google Sign-in scopes required by the app to allow users to sign in with their Google Account.”
  - “Blocked—Can't access any Google service.”
- **Interpretation:** This is access for users through their organizational units. Do not require **Trusted** for every installation. The documented **Specific Google data** option can restrict access to selected scopes. Topic 4 must supply the full required scope list.

## Unresolved questions

### Non-blocking — Separate preview enrollment for every end user

The preview page describes registered accounts, project registration, and forms to add email addresses. It does not clearly state that each connecting OAuth user must join separately.

**Sources checked:** People MCP setup page; Workspace Developer Preview page, enrollment instructions, member requests, and FAQ.

The documented account-and-project enrollment procedure remains usable. Topic 2 must carry this uncertainty into the preview findings.

### Non-blocking — Separate license, MCP role, or user enablement switch

The checked People MCP instructions do not identify a separate People MCP license, an individual MCP role, or a per-user MCP switch.

**Sources checked:** People MCP setup page; shared MCP security page; preview page; People directory documentation.

This is not evidence that these requirements are explicitly absent. The documented setup remains sufficient without an invented assignment.

### Non-blocking — Exact project authority to add OAuth test users

The People setup page gives the complete test-user action, but this research did not establish the project role that permits it.

**Affected action:** Add users under **Audience > Test users**.

Topic 1 must verify the authority. The missing exact role name does not prevent use of the documented procedure.

### Non-blocking — Separate release-note confirmation

The live People setup and preview pages still identify the server as Developer Preview. The preview feature list includes **People MCP server**. No replacement notice was found in the checked content. Separate release-note confirmation was not completed within the research limit.

### Blocking gaps

**None for this topic’s documented same-domain or same-company trial path.**

## Cross-topic dependencies

- **Topic 1:** Confirm authority to add OAuth test users. Use the documented **Directory settings administrator privilege** and **Service Settings administrator privilege** for the applicable administrator actions.
- **Topic 2:** Verify preview enrollment and project approval. Include the domain directory-sharing action when directory searches are required.
- **Topic 4:** Use the People-specific scopes when configuring test access and any **Specific Google data** policy. Keep authentication and token setup separate from these eligibility findings.
- **Coordinator:** Limit the preview trial to permitted users within the domain or company. Do not treat an External OAuth audience as permission for a public or customer release. Do not state that each user must enroll in the preview separately without further evidence.
- **Coordinator:** Explain that profile, contact, and directory results remain limited by the connecting user’s permissions.

## Topic and status

**Topic 4: Authentication — complete.**

Google documents OAuth 2.0 for the People API remote MCP server. The checked Speakeasy implementation supports offline authorization, consent, encrypted token storage, and token refresh for the selected manual OAuth connection with issuer `https://accounts.google.com`.

**The previous blocking refresh-compatibility gap is resolved.** No concrete authentication gap remains for this setup path.

**Observation date for all sources: 2026-09-11.**

### Changes from the previous report

- Changed the topic status from **unresolved** to **complete**.
- Retained provider findings T4-01 through T4-09 and their sources.
- Added T4-10 for the checked, commit-pinned client implementation.
- Replaced the unresolved client checks in T4-04 and T4-05 with the verified behavior in T4-10.
- Removed the blocking question about offline authorization and refresh support.
- Did not research credential maintenance.

## Findings

### T4-01 — Use OAuth 2.0 for the documented People MCP connection

- **Status:** Required.
- **Actor and scope:** The application owner configures the OAuth application. The connecting user grants access to permitted Google data.
- **Documented action:** Configure the OAuth consent screen before creating the OAuth client ID.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server
- **Location:** **Set up the OAuth consent screen**.
- **Exact quotation:** “The People API MCP server uses OAuth 2.0 for authentication and authorization. You must configure the OAuth consent screen before you can create an OAuth client ID.”
- **Interpretation:** Use the documented user OAuth connection. The checked service-specific instructions do not establish an API-key or service-account connection for this MCP server.

### T4-02 — Configure the People-specific OAuth scopes

- **Status:** Required for the documented setup.
- **Actor and scope:** The application owner configures scopes in the selected Google Cloud project. The connecting user grants access.
- **Documented action:**
  1. Open **Google Auth Platform > Branding**.
  2. Complete the consent configuration if necessary.
  3. Open **Data Access > Add or Remove Scopes**.
  4. Under **Manually add scopes**, enter:
     - `https://www.googleapis.com/auth/directory.readonly`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/contacts.readonly`
  5. Select **Add to Table**, then **Update**.
  6. On **Data Access**, select **Save**.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server
- **Location:** **Set up the OAuth consent screen**.
- **Exact quotations:**
  - “Under Manually add scopes, paste the scopes for the People API MCP server:” followed by the three values above.
  - “Click Add to Table.”
  - “Click Update.”
  - “After selecting the scopes required by your app, on the Data Access page, click Save.”
- **Interpretation:** Use these service-specific scopes. Google’s documented web-server flow uses an authorization parameter for offline access, not an additional scope in this list.
- **Authority:** Topic 1 must establish authority to configure OAuth data access.

### T4-03 — Use a web application OAuth client and the client’s callback URL

- **Status:** Required for the selected manual OAuth setup.
- **Actor and scope:** The application owner creates credentials in the selected Google Cloud project. Speakeasy uses the client ID and client secret.
- **Documented action:** Open **Google Auth Platform > Clients > Create Client**. Select **Web application**. Enter a **Name**. Under **Authorized redirect URIs**, select **+ Add URI**. Enter the callback URL for the connecting application. Select **Create** and copy the **Client ID** and **Client Secret**.
- **Environment-specific values:** Google supplies the client ID and client secret. Use the rendered Speakeasy callback URL from `{{ gram.oauth.callback_url }}`. Do not use a Claude or Antigravity callback for Speakeasy.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server
- **Location:** **Configure your MCP client > Claude**, OAuth client creation.
- **Exact quotations:**
  - “Select Web application as the application type.”
  - “In the Authorized redirect URIs section, click + Add URI”
  - “Click Create and copy your Client ID and Client Secret.”
- **Supporting source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Location:** **Step 1: Set authorization parameters**, HTTP/REST, `redirect_uri`.
- **Exact quotation:** “The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client”
- **Interpretation:** The service page establishes the application type and credential procedure. Google requires an exact callback match.
- **Authority:** Topic 1 must establish authority to create the OAuth client.

### T4-04 — Request offline access to obtain a refresh token

- **Status:** Conditional. Required for the selected connection that refreshes access without the user present.
- **Actor and scope:** Speakeasy sends the authorization request for the connecting user and OAuth application.
- **Required value:** `access_type=offline`.
- **Documented action:** Include this parameter in the initial authorization request. The user completes sign-in and consent. The client exchanges the authorization code for tokens.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Location:** **Step 1: Set authorization parameters**, HTTP/REST, `access_type`.
- **Exact quotations:**
  - “Valid parameter values are online, which is the default value, and offline.”
  - “Set the value to offline if your application needs to refresh access tokens when the user is not present at the browser.”
  - “This value instructs the Google authorization server to return a refresh token and an access token the first time that your application exchanges an authorization code for tokens.”
- **Supporting location:** **Step 5: Exchange authorization code for refresh and access tokens**, token response.
- **Exact quotation:** “Again, this field is only present in this response if you set the access_type parameter to offline in the initial request to Google's authorization server.”
- **Updated interpretation:** Speakeasy supplies this parameter for the Google issuer. T4-10 resolves the previous client check. No manual parameter-entry step is needed for this behavior.

### T4-05 — Initial consent affects refresh-token issuance

- **Status:** Conditional. Applies when the same user has already authorized the OAuth application, or when initial setup must show consent again.
- **Actor and scope:** Speakeasy controls the authorization request. The connecting user gives consent.
- **Documented value:** `prompt=consent` displays the consent prompt.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Locations:** **Step 1: Set authorization parameters**, Node.js note and HTTP/REST `prompt` parameter.
- **Exact quotations:**
  - “The refresh_token is only returned on the first authorization.”
  - “If you don't specify this parameter, the user will be prompted only the first time your project requests access.”
  - For `consent`: “Prompt the user for consent.”
- **Updated interpretation:** Do not assume that every authorization-code exchange returns a refresh token. The checked Speakeasy implementation includes `consent` in the Google authorization request. T4-10 resolves the previous initial-consent check.

### T4-06 — Use Google’s OAuth endpoints if manual configuration needs them

- **Status:** Conditional. Applies when Speakeasy requires explicit OAuth connection values.
- **Actor and scope:** The administrator configures the OAuth connection. Speakeasy sends authorization and token requests.
- **Values:**
  - Issuer for the selected connection: `https://accounts.google.com`
  - Authorization URL: `https://accounts.google.com/o/oauth2/v2/auth`
  - Token URL: `https://oauth2.googleapis.com/token`
  - Authorization request: `response_type=code`
  - Authorization-code exchange: `grant_type=authorization_code`
- **Environment-specific values:** Use the credentials and registered callback from T4-03. Use the scopes from T4-02.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Locations:** **Step 1**, HTTP/REST; **Step 2**, sample redirect; **Step 5**, HTTP/REST.
- **Exact quotations:**
  - “Google's OAuth 2.0 endpoint is at https://accounts.google.com/o/oauth2/v2/auth.”
  - The sample authorization request contains `response_type=code`.
  - “To exchange an authorization code for an access token, call the https://oauth2.googleapis.com/token endpoint”
  - For `grant_type`: “this field's value must be set to authorization_code.”
- **Issuer evidence:** T4-10 establishes the client behavior for the selected issuer.
- **Interpretation:** The OAuth URLs are not the People MCP endpoint.

### T4-07 — External Testing access expires after seven days

- **Status:** Conditional. Applies to an **External** application with **Testing** publishing status.
- **Actor and scope:** The application owner selects the audience and adds test users. The limit applies to user authorization and refresh tokens.
- **Documented setup action:** Select **Internal**, if available. Otherwise, select **External**. For External setup, open **Audience > Test users > Add users**, enter authorized users, and select **Save**.
- **Source:** https://developers.google.com/people/v1/configure-mcp-server
- **Location:** **Set up the OAuth consent screen**.
- **Exact quotations:**
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “If you selected External for user type, add test users”
- **Supporting source:** https://developers.google.com/identity/protocols/oauth2
- **Location:** **Refresh token expiration**.
- **Exact quotation:** “A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of "Testing" is issued a refresh token expiring in 7 days”
- **Supporting source:** https://support.google.com/cloud/answer/15549945
- **Location:** **Publishing status > Testing**.
- **Exact quotations:**
  - “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”
  - “Authorizations by a test user will expire seven days from the time of consent.”
  - “If your OAuth client requests an offline access type and receives a refresh token, that token will also expire.”
  - “If your app requests any other OAuth scopes, then this exception does not apply.”
- **Interpretation:** The exception for only name, email, and profile scopes does not apply. People MCP also requests directory and contacts scopes.
- **Warning:** **External Testing access expires after seven days. The user must sign in and give consent again.**
- **Setup choice:** Prefer the documented Internal setup when it applies. Refresh support does not remove the External Testing limit.

### T4-08 — Internal and production status have separate conditions

- **Status:** Conditional. Applies when selecting Internal access or publishing an External application.
- **Actor and scope:** The application owner selects the application audience and publishing status.
- **Source:** https://support.google.com/cloud/answer/15549945
- **Locations:** **User type > Internal** and **Publishing status > In production**.
- **Exact quotations:**
  - “Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization.”
  - “A project's publishing status is considered In production after selecting the Publish app button.”
  - “Your project's configuration may be subject to verification”
- **Interpretation:** Do not select Internal for users outside the organization. Do not describe **Publish app** as a substitute for applicable verification.
- **Dependencies:** Topic 2 must check the selected audience and publishing path. Topic 3 must check user eligibility. Topic 1 must establish the applicable setup authority.

### T4-09 — Refresh tokens do not guarantee indefinite access

- **Status:** Required access-lifetime warning for the refresh-token path.
- **Actor and scope:** Speakeasy handles token expiration. The limits apply to each user and OAuth client.
- **Source:** https://developers.google.com/identity/protocols/oauth2
- **Location:** **Refresh token expiration**.
- **Exact quotations:**
  - “A refresh token might stop working”
  - “The refresh token has not been used for six months.”
  - “There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.”
  - “creating a new refresh token automatically invalidates the oldest refresh token without warning.”
- **Other documented causes:** User revocation, expired time-based access, and administrator restrictions can end access.
- **Supporting source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Location:** **Step 5**, token response fields.
- **Exact quotations:**
  - `expires_in`: “The remaining lifetime of the access token in seconds.”
  - `refresh_token_expires_in`: “The remaining lifetime of the refresh token in seconds. This value is only set when the user grants time-based access.”
- **Interpretation:** Use the token response for the access-token lifetime. Do not state that every access token has a fixed one-hour lifetime.
- **Warning:** **Google can end access. Another sign-in can be necessary, even when refresh tokens are enabled.**

### T4-10 — Speakeasy supports the selected Google refresh-token connection

**New finding. This resolves the previous blocking client question.**

- **Status:** Conditional. Applies to the selected manual OAuth connection when the resolved client issuer is `https://accounts.google.com`.
- **Actor and scope:** Speakeasy adds the Google authorization parameters, stores returned tokens, and performs token refresh. The user completes Google sign-in and consent.
- **Setup action:** Use manual OAuth with the Google issuer and the client credentials. No separate manual entry of `access_type` or `prompt` is required for the checked implementation.
- **Checked official commit:** `496e62ca5d5ebd99f0c189f2614fc9c707e44659`.

#### A. Google issuer matching adds offline access and consent

- **Source:** https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google.go#L24-L50
- **Location:** `Match` and `ModifyAuthorize`.
- **Exact code quotations:**
  - `return strings.EqualFold(u.Hostname(), "accounts.google.com")`
  - `q.Set("access_type", "offline")`
  - `prompts = append(prompts, "consent")`
  - `q.Set("prompt", strings.Join(prompts, " "))`
- **Interpretation:** The selected issuer matches. Speakeasy sets offline access and includes consent. It preserves other existing prompt values.

#### B. The remote authorization path applies this behavior

- **Source:** https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L261-L263
- **Location:** Authorization interceptor registration.
- **Exact code quotation:** `interceptors.NewGoogle(logger)`
- **Supporting source:** https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L667-L795
- **Location:** `mintAuthorization`, especially lines 789–792.
- **Exact code quotations:**
  - `if ic.Match(client.IssuerURL) {`
  - `ic.ModifyAuthorize(ctx, q)`
- **Interpretation:** This is the upstream remote-session authorization path. The checked invocation depends on the resolved issuer, not on DCR registration. No DCR-only condition or feature flag appears at this registration or invocation. Manual registration does not prevent this behavior.

#### C. The callback encrypts and stores returned tokens

- **Source:** https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L952-L963
- **Location:** Remote login callback token encryption.
- **Exact code quotations:**
  - `m.enc.Encrypt([]byte(tok.AccessToken))`
  - `m.enc.Encrypt([]byte(tok.RefreshToken))`
- **Supporting location:** Same file, lines 1053–1059.
- **Exact code quotations:**
  - `AccessTokenEncrypted:  accessEnc,`
  - `RefreshTokenEncrypted: conv.PtrToPGText(refreshEnc),`
  - `RefreshExpiresAt:    conv.PtrToPGTimestamptz(refreshExpires),`
- **Interpretation:** The callback stores encrypted access and refresh tokens. It also stores expiration values.

#### D. The remote-session service implements refresh

- **Source:** https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/refreshservice.go#L175-L187
- **Location:** `RefreshNow`.
- **Supporting locations:** Same file, lines 361–365, 387–405, and 478–498.
- **Exact code quotations:**
  - `if !hasRefreshToken(current) {`
  - `if !refreshTokenUsable(current, time.Now()) {`
  - `updated, tok, refreshErr := s.refreshSessionTokens(ctx, q, client, sess, resource)`
  - `return sess.RefreshTokenEncrypted.Valid && sess.RefreshTokenEncrypted.String != ""`
- **Interpretation:** The service checks the stored refresh grant and uses the stored session and client to refresh access. Together with the central client evidence, this satisfies the required refresh implementation check. It does not remove Google’s expiration or revocation limits.

#### E. Tests support the authorization behavior

- **Source:** https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google_test.go#L13-L75
- **Locations:** Issuer matching, offline access, consent, and prompt-preservation tests.
- **Exact code quotations:**
  - `require.True(t, ic.Match("https://accounts.google.com"))`
  - `require.Equal(t, "offline", q.Get("access_type"))`
  - `require.Equal(t, "consent", q.Get("prompt"))`
  - `require.Equal(t, "select_account consent", q.Get("prompt"))`
- **Interpretation:** These tests support the source inspection. They were read, not executed. No live provider connection was performed.

## Unresolved questions

### Blocking gaps

**None remain for Topic 4 on the selected manual OAuth path with issuer `https://accounts.google.com`.**

### Non-blocking — Deployment confirmation

The checked official commit establishes the required client behavior. This research did not test the deployed service. No concrete deployment mismatch was identified. This is not a reason to require another setup step or reject the documented connection.

### Non-blocking — Alternative authentication methods

The checked People MCP setup page documents OAuth 2.0. It does not establish API-key authentication, a static-token setup, service-account access, or DCR for this server. These alternatives are not needed for the selected manual OAuth path.

### Non-blocking — Setup authority

The service-specific page provides the OAuth configuration procedure. Topic 1 must establish the applicable authority for consent, scopes, audience, client creation, and any publication action. This report does not assign an undocumented role.

### Non-blocking — Separate release-note confirmation

The checked People setup page states **“Last updated 2026-09-03 UTC.”** No replacement notice was found in the checked setup content. Separate release-note confirmation was not completed. No material authentication action depends on that missing confirmation.

## Cross-topic dependencies

- **Topic 1:** Establish authority for OAuth consent configuration, scope configuration, audience selection, client creation, and any production publication.
- **Topic 2:** Use the People scope list and web application client type. Check Internal eligibility, External Testing status, and any selected production verification path. Keep the selected Model Armor setup separate from OAuth configuration.
- **Topic 3:** Check organization membership for Internal access. Check test-user assignment and administrator restrictions for External access.
- **Topic 5:** Keep Google OAuth URLs separate from `https://people.googleapis.com/mcp/v1`.
- **Coordinator:** Use the selected manual OAuth path with issuer `https://accounts.google.com`. The offline authorization, consent, encrypted token storage, and refresh checks are satisfied by the checked implementation. Do not add a manual authorization-parameter step. Preserve the seven-day warning for External Testing and the general warning that Google can end access.

## Topic and status

**Topic 1: Setup permissions and administrative access — complete.**

The official sources establish authority for the selected Google-side actions in A1–A7. Use the documented task-specific roles. Do not require project Owner or Workspace super administrator by default.

The coordinator must retain responsibility for Speakeasy access permissions. No Google-side blocking authority gap remains.

**Observation date for all sources: 2026-09-11.**

### Changes to the previous report

- **T1-01, T1-03, T1-04, and T1-08 retained**, with their sources.
- **T1-02 expanded:** Confirms test-user assignment, web client creation, redirect configuration, and secret access.
- **T1-05 expanded:** Adds individual preview enrollment and policy-acceptance authority.
- **T1-06 updated:** Uses the maintained Workspace app-control page.
- **T1-07 replaced:** Model Armor is now the selected path, not an undecided option. Its floor-setting role covers detection and logging settings.
- **T1-09 added:** Directory-sharing authority.
- **T1-10 added:** Conditional log-sink and destination permissions.
- **T1-11 added:** Boundary between Google setup authority and client access.
- Added the final **action-to-actor audit table**.

No files or provider settings were changed.

## Findings

### T1-01 — Enable People API with project service-management permission

- **Status:** Required.
- **Who acts:** A person with `serviceusage.services.enable`.
- **Who receives access:** The selected, registered Google Cloud project.
- **Scope:** Project.
- **Documented role:** **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`).
- **Action and values:** Select the existing project and enable `people.googleapis.com`. Use the **Enable the APIs** console link on the People setup page. Obtain the project from its administrator.

**Sources**
- https://developers.google.com/people/v1/configure-mcp-server\
  **Enable the API and MCP service:** “To use the People API MCP server, you must enable the following service in your Google Cloud project: People API”.
- https://cloud.google.com/service-usage/docs/enable-disable\
  **Required roles:** “ask your administrator to grant you the Service Usage Admin (`roles/serviceusage.serviceUsageAdmin`) IAM role on your project.”
- https://developers.google.com/workspace/guides/configure-mcp-security\
  **Enable Model Armor > Roles required to enable APIs:** “To enable APIs, you need the `serviceusage.services.enable` permission.”

**Interpretation:** An authorized person can enable the API for the reader. The reader does not need Owner for this action.

### T1-02 — Use OAuth Config Editor for the selected OAuth configuration

- **Status:** Required.
- **Who acts:** The application owner or another authorized OAuth configuration editor.
- **Who receives access:** The OAuth application and its permitted test users.
- **Scope:** OAuth resources in the selected project.
- **Documented role:** **OAuth Config Editor** (`roles/oauthconfig.editor`). The role reference marks it **Beta**.
- **Actions and values:**
  - Configure **Branding**, **Audience**, and **Data Access**.
  - Use app name `People API MCP Server`.
  - Select **Internal** when available; otherwise use the documented **External Testing** path.
  - Add permitted test users under **Audience > Test users > Add users**.
  - Add:
    - `https://www.googleapis.com/auth/directory.readonly`
    - `https://www.googleapis.com/auth/userinfo.profile`
    - `https://www.googleapis.com/auth/contacts.readonly`
  - Create a **Web application** OAuth client.
  - Register the rendered callback from `{{ gram.oauth.callback_url }}` under **Authorized redirect URIs**.
  - Copy the client ID and client secret into the approved client configuration.
- **Environment values:** The application owner supplies contact addresses and test-user emails. Google supplies the credentials. Speakeasy supplies the callback.

**Sources**
- https://developers.google.com/people/v1/configure-mcp-server\
  **Set up the OAuth consent screen:** “You must configure the OAuth consent screen before you can create an OAuth client ID.”
- Same section: “If you selected External for user type, add test users”.
- Same section: “Under Manually add scopes, paste the scopes for the People API MCP server:” followed by the three scopes above.
- **Configure your MCP client > Claude:** “Select Web application as the application type.”
- Same section: “Click Create and copy your Client ID and Client Secret.”
- https://cloud.google.com/iam/docs/roles-permissions/oauthconfig\
  **OAuth Config Editor:** “Read/write access to OAuth config resources”.
- The role lists `clientauthconfig.brands.create`, `clientauthconfig.brands.update`, `clientauthconfig.clients.create`, `clientauthconfig.clients.update`, `clientauthconfig.clients.getWithSecret`, and `oauthconfig.testusers.update`.

**Interpretation:** This applicable role description supports consent configuration, audience and scope configuration, test-user assignment, client creation, redirect changes, and credential access. It does not grant Workspace app approval, project IAM administration, or legal acceptance authority. No production publication action is selected.

### T1-03 — A project access administrator makes any necessary IAM grants

- **Status:** Conditional. Applies when the setup person lacks the required project permissions.
- **Who acts:** An administrator who can change project IAM policy.
- **Who receives access:** The setup person or other designated operator.
- **Scope:** The project where access is needed.
- **Documented role:** **Project IAM Admin** (`roles/resourcemanager.projectIamAdmin`).
- **Action:** Grant the applicable task-specific roles. The administrator can instead perform the setup action.

**Sources**
- https://cloud.google.com/iam/docs/granting-changing-revoking-access\
  **Required roles and permissions:** “To manage access to a project: Project IAM Admin (`roles/resourcemanager.projectIamAdmin`)”.
- Maintained page checked in this follow-up:\
  https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access\
  The project permission list includes `resourcemanager.projects.getIamPolicy` and `resourcemanager.projects.setIamPolicy`.

**Interpretation:** Keep role assignment separate from API, OAuth, and security configuration. Do not give Project IAM Admin to every setup operator.

### T1-04 — Project creation has separate authority; it is outside this selected path

- **Status:** Conditional. Applies only if a new project must be created. **A1 selects an existing project.**
- **Who acts:** A person with project-creation authority at the applicable organization or folder.
- **Who receives access:** The new project and its setup owner.
- **Documented role and permission:** **Project Creator** (`roles/resourcemanager.projectCreator`), with `resourcemanager.projects.create`.
- **Action:** Create a project only when necessary. Obtain the permitted parent location from the organization administrator.

**Sources**
- https://developers.google.com/people/v1/configure-mcp-server\
  **Prerequisites:** “A Google Cloud project.”
- https://cloud.google.com/service-usage/docs/enable-disable\
  **Roles required to select or create a project:** “To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission.”

**Interpretation:** Do not add Project Creator to the permission list for A1–A7.

### T1-05 — Preview enrollment and policy acceptance need an authorized applicant

- **Status:** Required.
- **Who acts:** An individual applicant with a Workspace-domain account. A person acting for an organization must have authority to bind that organization to the terms. Google approves registration.
- **Who receives access:** The registered applicant account and Cloud project.
- **Scope:** Preview program and organization terms.
- **Actions and values:**
  - Read the program terms.
  - Submit the linked application with the individual Workspace email and Cloud project number.
  - Permit program Google Group membership.
  - Obtain Google’s final registration confirmation.
  - Keep use within the permitted domain or company.
  - Accept the Google API Services User Data Policy during OAuth setup only with the applicable authority.
- **Environment values:** Obtain the project number from the project administrator. The applicant supplies their individual account.

**Sources**
- https://developers.google.com/people/v1/configure-mcp-server\
  **Opening notice:** “Developer Preview: Available as part of the Google Workspace Developer Preview Program”.
- https://developers.google.com/workspace/preview\
  **How to join the program:** “Read through the Program Terms before applying.”
- Same section: “After verifying your Google Workspace account, we will register your Google Cloud project.”
- Same section: “When it is done, you will receive a final confirmation to your registered email address.”
- [Official application form](https://docs.google.com/forms/d/e/1FAIpQLSd7BiMXXHDlUDkF7G0TSY5zfJbQwFNH3m6K_ZYFi3vCHLFbng/viewform?resourcekey=0-1uHeVg8junj3PPTLNcn7WQ)\
  **Introduction:** “The email address has to be in a workspace domain (we cannot accept Gmail addresses nor a Service Account).”
- Same location: “Each application allows for the registration of only one individual email address”.
- Same location: “Use of Google Groups is no longer allowed for the same reason.”
- https://developers.google.com/workspace/preview\
  **Program Terms, clause (iii):** “I agree to the Google APIs Terms of Service.”
- **Clause (iv):** “I may not grant end users access, outside my domain or company”, subject to the stated Google permission exception.
- https://developers.google.com/terms\
  **Section 1(b), Entity Level Acceptance:** “you represent and warrant that you have authority to bind that entity to the Terms”.
- https://developers.google.com/terms/api-services-user-data-policy\
  **Introduction:** “The policy below, as well as the Google APIs Terms of Service, govern the use of Google API Services when you request access to Google user data.”

**Interpretation:** IAM permissions do not establish legal authority. Obtain help from an authorized organization representative if necessary. The ban on a group as the applicant does not prevent the individual from joining the program group. Do not infer that every OAuth end user must submit a separate application.

### T1-06 — Workspace app approval needs the Service Settings administrator privilege

- **Status:** Conditional. Applies when Workspace app controls block the application or its required scopes.
- **Who acts:** A Workspace administrator with the **Service Settings administrator privilege**.
- **Who receives access:** The OAuth application for the selected organizational units.
- **Scope:** Workspace app-access policy.
- **Action:** Open **Security > Access and data control > API controls > Manage App Access**. Configure or change access for the application. Identify it with the OAuth client ID. Apply the approved scope-limited access policy where suitable.
- **Environment values:** Obtain the client ID from the application owner and the organizational units from the Workspace administrator.

**Sources**
- Original source: https://support.google.com/a/answer/7281227
- Maintained source: https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data\
  **Manage app access** and **Configure a new app:** “Requires having the Service Settings administrator privilege.”
- **Access settings:** “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
- Same section: “You must include the Google Sign-in scopes required by the app to allow users to sign in with their Google Account.”

**Interpretation:** OAuth Config Editor does not authorize Workspace app approval. Do not require **Trusted** access or super administrator by default.

### T1-07 — Use the floor-setting role for the selected Model Armor configuration

**Replaces the previous conditional security-path finding.**

- **Status:** Required for the selected Model Armor path. Full-payload logging remains conditional.
- **Who acts:** A project service administrator enables the API. A floor-setting administrator configures protection.
- **Who receives access:** The project’s Model Armor integration and floor settings.
- **Scope:** The selected project.
- **Roles:**
  - **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`) for API enablement.
  - **Model Armor Floor Setting Admin** (`roles/modelarmor.floorSettingsAdmin`) for floor-setting management.
- **Actions and values:**
  - Enable `modelarmor.googleapis.com`.
  - Open **Model Armor > Floor settings > Configure floor settings**.
  - Review inherited settings before selecting **Custom**.
  - Configure the selected detection settings, including malicious URL detection, Dangerous content, and applicable prompt injection and jailbreak detection.
  - Select **Google MCP Server**.
  - Apply the selected `INSPECT_AND_BLOCK` enforcement.
  - Make the approved logging choice.
  - Select **Save floor settings**.

**Sources**
- https://developers.google.com/workspace/guides/configure-mcp-security\
  **Introduction:** “You must screen prompts and responses for malicious content or prompt injection attacks.”
- **Enable Model Armor:** “You must enable Model Armor APIs before you can use Model Armor.”
- **Configure protection:** “Set up a Model Armor floor setting with MCP sanitization enabled.”
- https://docs.cloud.google.com/model-armor/configure-floor-settings\
  **Obtain the required permissions:** “Model Armor Floor Setting Admin (`roles/modelarmor.floorSettingsAdmin`) IAM role on Model Armor floor settings.”
- **Configure floor settings:** “In the Detections section, configure the detection settings.”
- Same section: “In the Logs section, select Enable Cloud Logging to log all user prompts, model responses, and the floor settings detector results.”
- **Define where floor settings are applied:** “Google MCP Server: Floor settings check requests sent to or from Google or Google Cloud remote MCP servers”.
- https://docs.cloud.google.com/iam/docs/roles-permissions/modelarmor\
  **Model Armor Floor Setting Admin:** “Grants full access to all Model Armor Floor Setting resources.”
- The role includes `modelarmor.floorSettings.get`, `modelarmor.floorSettings.update`, and `modelarmor.floorSettings.computeEffectiveFloorSetting`.

**Interpretation:** The floor-setting role supports detection, enforcement, inheritance, service selection, and the logging toggle in this procedure. The linked detection instructions do not require the reader to create a separate template. Do not add Model Armor Admin or a template role without a selected action that needs it. Sink creation and destination grants remain separate.

### T1-08 — Setup permissions do not replace user data permissions

- **Status:** Required distinction.
- **Who acts:** The eligible connecting user completes Google sign-in and consent.
- **Who receives access:** The application receives access authorized by that user.
- **Scope:** The user’s permitted profile, contact, and directory data.
- **Action:** Use an eligible account with the required underlying data access.

**Source**
- https://developers.google.com/people/v1/configure-mcp-server\
  **Introduction > Respect security:** “Inherit the same permissions and data governance controls as the user.”

**Interpretation:** Cloud setup roles do not give the connecting user wider People data access. Do not assign an administrator role to obtain more MCP results.

### T1-09 — Directory sharing needs the Directory settings administrator privilege

- **Status:** Conditional. Applies when users need organization directory data through the third-party client.
- **Who acts:** A Workspace administrator with the **Directory settings administrator privilege**.
- **Who receives access:** Authorized third-party applications and users, within the documented directory limits.
- **Scope:** Domain directory-sharing settings.
- **Action and value:** Open **Directory > Directory settings > Sharing settings > External Directory Sharing**. Select **Organization data and authenticated user basic profile fields**, then **Save**, if the organization approves this sharing.

**Sources**
- https://developers.google.com/people/v1/directory\
  **Important notice before List the directory people:** “Reading domain data requires that the domain admin must have enabled external contact and profile sharing of domain-scoped data for their domain.”
- https://knowledge.workspace.google.com/admin/users/let-third-party-apps-access-directory-data\
  **Allow or restrict access to Directory data:** “Requires having the Directory settings administrator privilege.”
- Same section: “Organization data and authenticated user basic profile fields—Share all Directory information that is shared within your organization.”
- Same section: “The information shared with external apps never includes users' personal contacts or private profile data.”

**Interpretation:** This privilege is separate from Service Settings and project OAuth permissions. The setting does not give access to all users’ personal contacts.

### T1-10 — Conditional log routing needs logging and destination permissions

- **Status:** Conditional. Applies when logging is enabled and a sink must be created or changed. A compliant sink is required before logging when data-residency requirements apply.
- **Who acts:** A logging configuration operator and, where necessary, an administrator for the destination project.
- **Who receives access:** The sink’s writer identity receives permission to write to the approved destination.
- **Scope:** Source project, sink, and destination.
- **Actions and permissions:**
  - Use **Logs Configuration Writer** (`roles/logging.configWriter`) on the source project to create or change the sink.
  - Use an existing approved destination, or have its administrator create one.
  - Where the sink has a writer identity, grant its destination permissions.
  - For a Cloud Logging log bucket destination, the current procedure specifies **Logs Writer** (`roles/logging.logWriter`) and **Logs Bucket Writer** (`roles/logging.bucketWriter`).
  - An authorized destination **Project IAM Admin** can make project IAM grants. The setup operator does not need Owner merely to receive those grants.
- **Environment values:** The security or logging owner supplies the approved destination and location. Obtain the writer identity from **Log Router > View sink details**.

**Sources**
- https://docs.cloud.google.com/model-armor/model-armor-mcp-google-cloud-integration\
  **Before you begin:** “If you have data residency requirements, you must configure a log sink to route logs to a compliant storage location before you enable Cloud Logging”.
- https://docs.cloud.google.com/logging/docs/export/configure_export_v2\
  **Before you begin:** “To get the permissions that you need to create, modify, or delete a sink,” request “Logs Configuration Writer (`roles/logging.configWriter`) IAM role on your project.”
- Same section: “the destination must exist before you create the sink.”
- **Set destination permissions:** “For all destinations, grant the Logs Writer role (`roles/logging.logWriter`).”
- Same section: “Log bucket: Grant the Logs Bucket Writer role (`roles/logging.bucketWriter`).”
- Same section: “When the value is None, you don't need to configure destination permissions for the sink.”
- https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access\
  **Required roles:** “To manage access to a project: Project IAM Admin (`roles/resourcemanager.projectIamAdmin`)”.
- https://developers.google.com/workspace/guides/configure-mcp-security\
  **Use Model Armor:** “Model Armor logs the entire payload. This might expose sensitive information in your logs.”

**Interpretation:** Permission to enable logging in a floor setting does not establish permission to create a sink or grant destination access. Use an existing authorized logging administrator when necessary. Other destination types require their documented destination-specific permissions; they are not selected here.

### T1-11 — Keep client access authority separate from Google authority

- **Status:** Required separation.
- **Who acts:** A person authorized to add a Speakeasy source and attach credentials; then the eligible connecting user.
- **Scope:** Speakeasy configuration and the user’s Google authorization.
- **Action:** Add `https://people.googleapis.com/mcp/v1`, attach the selected manual OAuth configuration, and complete browser consent. The coordinator owns the exact Speakeasy permission check.

**Source**
- https://developers.google.com/people/v1/configure-mcp-server\
  **Configure your MCP client > Others:** “Many AI applications have ways to connect to a remote MCP server.”
- Same section: “Authentication: The People API remote MCP server uses OAuth 2.0.”

**Interpretation:** The provider procedure establishes the Google connection. It does not define Speakeasy roles. No additional Google administrative role is established merely for entering the endpoint or completing user consent.

## Action-to-actor audit

| Action | Authorized actor and scope | Audit result |
|---|---|---|
| **A1 — Existing project and preview enrollment** | Individual Workspace applicant; organization representative with terms authority; Google approves account and project registration. | Supported by T1-05. No project-creation role is needed for this selected action. |
| **A2 — Enable People API** | Project Service Usage Admin, or equivalent `serviceusage.services.enable` permission. | Supported by T1-01. |
| **A3 — Branding, audience, scopes, test users, policy acceptance** | Project OAuth Config Editor; authorized organization representative for terms and policy acceptance. | Supported by T1-02 and T1-05. Test-user assignment is explicit in the role permissions. |
| **A4 — Web OAuth client, callback, credentials** | Project OAuth Config Editor. | Supported by T1-02. Coordinator supplies the rendered callback. No production publication action is included. |
| **A5 — Conditional app approval** | Workspace administrator with Service Settings privilege, scoped to the selected organizational units. | Supported by T1-06. Broad Trusted access is not the default. |
| **A5 — Conditional directory sharing** | Workspace administrator with Directory settings privilege. | Supported by T1-09. Underlying data limits remain. |
| **A6 — Enable Model Armor API** | Project Service Usage Admin. | Supported by T1-07. |
| **A6 — Detection, enforcement, service and logging settings** | Model Armor Floor Setting Admin for the selected project settings. | Supported by T1-07. Review inherited settings first. |
| **A6 — Conditional compliant log sink** | Source-project Logs Configuration Writer; authorized destination administrator for writer grants. | Supported by T1-10. This is separate from the floor-setting logging toggle. |
| **A7 — Add source and manual OAuth; user consent** | Authorized Speakeasy operator; eligible Google user. | Google-side authority is sufficient under T1-02 and T1-08. Coordinator owns Speakeasy permissions under T1-11. |

## Unresolved questions

### Non-blocking — Speakeasy role name

Google documentation does not establish the Speakeasy role needed to add a source or attach credentials. The selected client procedure is supplied by the coordinator. The coordinator must retain this client access check; it is not a reason to request more Google permissions.

### Non-blocking — Environment-specific grants and approval

Public sources cannot show whether the named people already hold the required roles or legal authority. The documented procedures remain usable. If they lack authority, an authorized administrator or organization representative must help.

### Non-blocking — Log destination

The selected actions make logging optional and do not name a destination. If logging and residency controls are selected, the logging owner must supply the approved destination before the sink is configured. The sources establish sink creation and a Cloud Logging bucket grant path. Do not invent a destination or add unrelated storage roles.

### Non-blocking — Separate preview enrollment for every OAuth user

The application requires one individual applicant per application. This does not establish that every connecting OAuth end user must enroll separately. Retain the account-and-project enrollment procedure and the permitted-domain restriction.

### Non-blocking — Separate release-note confirmation

The checked maintained pages show no replacement notice that changes these authority findings. Separate release-note confirmation was not completed. No concrete authority action depends on it.

### Blocking gaps

**None for the selected Google-side A1–A7 authority audit.**

## Cross-topic dependencies

- **Topic 2:** Replace generic “project owner” requirements with the applicable task-specific actors in the audit table. Retain the selected Model Armor path and conditional logging.
- **Topic 3:** Test-user assignment is supported by `oauthconfig.testusers.update` in OAuth Config Editor. Use Directory settings and Service Settings privileges for their separate Workspace actions.
- **Topic 4:** OAuth Config Editor supports the selected configuration and web-client actions. No production publication or unused authentication alternative is part of this audit.
- **Topic 5:** Keep the fixed People endpoint. No authority finding requires a different endpoint.
- **Coordinator:** Use the A1–A7 audit table. Confirm Speakeasy source-management access. Do not require Owner or super administrator by default. If log routing is needed, involve the logging and destination administrators before enabling full-payload logging.


## Speakeasy setup source and selected values

Remote URL: `https://people.googleapis.com/mcp/v1`. Issuer: `https://accounts.google.com`. Authentication: manual OAuth. Fields: client ID and client secret from A4. Scope override: the three T5-05 scope values separated by spaces. Callback: `{{ gram.oauth.callback_url }}`. Further reading: https://developers.google.com/people/v1/configure-mcp-server. Catalog lookup: skipped; retain both documented branches.

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

## Recovery drafting record

The recovery used the saved, complete Topic 5 report, Topic 3 retry report,
Topic 2 and Topic 4 follow-up 1 retry reports, and Topic 1 final audit report.
The report contents establish completion. File existence alone was not used.
The final audit follows the selected authentication path. The two factual
follow-up rounds were already used. No new research round was started.

The old setup files did not match this dossier. In particular, the old
MCP Tool User action had no requirement in the selected sourced path.
The recovery replaced the old setup and metadata from this dossier. It did
not use the old instructions or old endpoint observations as evidence.

Metadata uses `2026-09-11T00:00:00Z` to encode the reports' observation date.
This is a date-only normalization for the required date-time field. It does
not claim that a source was observed at midnight.

Topic 5 T5-01 quotes the provider's transport value as `HTTP`. The metadata
schema requires either `streamable-http` or `sse`. This bundle uses
`streamable-http` as the schema representation of the documented remote
HTTP connection. This is not a new wire-level transport observation. The
endpoint gate relies on the official remote MCP URL, as the trial permits.
A live connection was not tested. No old endpoint probe is reused.

The following headings put the canonical action IDs into the dossier's
heading syntax. They do not change the actions or the final authority audit.

### Join the preview program {#join-preview}

Action A1. Use the existing project and individual Workspace application.
Keep the account, group membership, terms, project number, confirmation,
and preview restrictions in T2-01–03 and T1-05. Screenshot: application with
account and project values hidden.

### Enable the People API {#enable-people-api}

Action A2. Use the documented activation link in T2-04. Select the registered
project and enable People API. T1-01 establishes activation authority.
Screenshot: activation page with project values hidden.

### Configure the OAuth consent screen {#configure-oauth-consent}

Action A3. Use T2-05–06, T3 test-user findings, and T4-01–09. Select Internal
when applicable; otherwise use External Testing within preview limits.
Keep the three scopes, test users, policy approval, and seven-day warning.
T1-02 and T1-05 establish authority. Screenshot: Branding, Audience, and
Data Access without account values.

### Create the OAuth client {#create-oauth-client}

Action A4. Use T2-07 and T4-03. Create a Web application client and register
`{{ gram.oauth.callback_url }}`. T1-02 establishes authority. Screenshot:
client form without secrets.

### Copy the OAuth credentials {#copy-oauth-credentials}

Action A4. Use T2-07 and T4-03. Copy the Client ID and Client Secret for the
manual connection. Store them in an approved secret store. Do not add the
old draft's deletion or credential-replacement procedure. Screenshot:
credential field labels with all values hidden.

### Approve user access {#approve-user-access}

Action A5. Use T2-08 and T3-05–06 for conditional app approval and directory
sharing. T1-06 and T1-09 establish the applicable delegated privileges.
Keep the scopes, organizational-unit scope, underlying data limits, and
24-hour directory propagation warning. Screenshot: app access and directory
settings without user data.

### Configure Model Armor {#configure-model-armor}

Action A6. Use updated T2-09–12 and T1-07/T1-10. Enable the API, then configure
project floor settings for Google MCP Server. Keep Google's example filters,
the natural-language condition for prompt injection detection, enforcement,
and the inherited-settings check. Keep the cross-jurisdiction and optional
full-payload logging warnings. Ask the authorized logging owner to prepare
an approved sink when residency rules apply. Screenshot: floor settings,
detection values, and Google MCP Server selection.

The Speakeasy actions keep their fixed anchors from the client setup source.
A7 uses the saved selected Google issuer, manual client, discovered endpoints,
three scopes, credentials, and browser consent. Offline access and consent
parameters are automatic client behavior, not extra user actions.

Client setup doctrine also establishes the client-side transport selection:
`doctrine/speakeasy-setup.md`, **Per-guide values**, observed 2026-09-11:
“The Control Plane proxies remote servers over streamable-http; the add
form's Transport field is read-only.” This supports the selected client
configuration. It is separate from the provider's `HTTP` statement.

Recovery checks used the installed `/usr/local/bin/lint-guide` executable.
The Go toolchain is not installed in this recovery workspace. Git repository
metadata is also absent. The normal PR generator validation and other CI
checks are still required before merge. They were not bypassed or changed.
No provider configuration or live connection was tested. No secret was used.
