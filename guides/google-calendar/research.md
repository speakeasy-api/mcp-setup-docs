# Google Calendar research dossier

Status: complete for the selected private read-access setup path. Observation date: 2026-09-11.
Provider: Google. Service: Google Calendar remote MCP server. Slug: google-calendar. Mode: update. Destination: /workspace/guides/google-calendar/.
Reader: doctrine/personas/it-admin.md. Client: Speakeasy AI Control Plane.
This dossier uses current official sources. Existing guide metadata was used only to confirm identity. Existing instructions and research were not used as evidence.

## Selected setup path

Use an existing Google Cloud project that Google has registered for the Workspace Developer Preview Program. Use the fixed Calendar remote URL and a manually registered Web application OAuth client. Use Internal audience when the organization is eligible. Otherwise use External Testing and assign test users. Keep all use within the preview terms. Do not publish a public app. Do not promise write operations with the documented read and availability scopes.

The application or security owner must supply prompt and response screening with an organization-owned solution. Document this solution so users can accept the risk. This is a setup prerequisite. No Speakeasy screening capability is asserted. Model Armor is a documented alternative, but it is not selected. Do not add its actions to this path.

Google OAuth offline access and consent parameters are automatic on the applicable upstream client path. Do not add user steps for these parameters. Keep the initial Google sign-in and consent action. Warn that External Testing refresh tokens expire after seven days. Do not give credential renewal or rotation procedures.

## Canonical setup actions and anchor contract

Each section combines duplicate actions. Topic reports below retain the full values, source quotations, dates, actors, access recipients, and conditions. The final Topic 1 report is the authority audit for these selected actions.

### Confirm preview access {#confirm-preview-access}

- Requirements: T1-05, T2-01, T2-02, T2-09, T3-06, T5-06.
- Actor and condition: An authorized organization representative applies. Google verifies the account and registers the project. Keep users in the permitted domain or company. Request added registrations when needed. Do not state that every connecting user must enroll separately.
- Screenshot note: Preview program application links.

### Prepare security screening {#prepare-security-screening}

- Requirements: T1-07, T2-07, T5-06.
- Actor and condition: The application or security owner supplies and documents organization-owned screening before use.
- Screenshot exception: The organization-owned implementation has no common provider screen.

### Enable the Calendar services {#enable-calendar-services}

- Requirements: T1-01, T2-03, T5-02.
- Actor and condition: Service Usage Admin, or the required service enablement permission, on the registered project. Enable both Calendar API and Calendar MCP API.
- Screenshot note: Selected project and API enablement page.

### Configure the OAuth application {#configure-oauth-application}

- Requirements: T1-02, T2-04, T2-05, T2-06, T4-02, T4-03.
- Actor and condition: OAuth Config Editor on the project. Configure branding, audience, contact details, required scopes, and conditional test users.
- Screenshot note: Google Auth Platform audience and Data Access.

### Create the OAuth client {#create-oauth-client}

- Requirements: T1-02, T2-06, T4-04.
- Actor and condition: OAuth Config Editor. Create a Web application. Register the supplied callback. Copy the Client ID and Client Secret.
- Screenshot note: Web application client and Authorized redirect URIs. Hide secrets.

### Confirm user access {#confirm-user-access}

- Requirements: T1-06, T1-08, T1-09, T1-10, T3-01 through T3-06.
- Actor and condition: Obtain Workspace help for Calendar service or app controls when needed. The calendar owner grants missing calendar access. Users need eligible accounts and must give consent.
- Screenshot note: Workspace app controls or calendar sharing. Hide private values.

Do not add other external anchors. Use the fixed client anchors `add-server-in-speakeasy` and `connect-speakeasy-credentials`.

## Speakeasy setup values

- Remote URL: https://calendarmcp.googleapis.com/mcp/v1 (T5-01).
- Shared endpoint; no tenant variables. Provider documents HTTP. The client setup doctrine uses streamable-http for remote proxies. Do not imply that a separate transport verification was performed.
- Add-server path: custom remote only. Set `speakeasy_add_server: custom-remote`. This explicit override avoids dependence on unverified catalog mapping. No Pulse catalog lookup was made.
- Authentication option: `oauth-client`; kind `oauth`; `client_registration: manual`; `upstream_setup: provider-steps`.
- Fields: `client-id` / Client ID and `client-secret` / Client Secret. Both come from `external.md#create-oauth-client`.
- Google publishes discovery metadata (T4-08). Use the documented discovered/manual sheet path. Keep Client Type Manual. Use the supplied callback template during provider registration. Confirm the same Redirect URI later.
- Required scopes: https://www.googleapis.com/auth/calendar.calendarlist.readonly ; https://www.googleapis.com/auth/calendar.events.freebusy ; https://www.googleapis.com/auth/calendar.events.readonly . Enter these as separate values where required, not as a semicolon-delimited field.
- Closing source: https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server .
- Use the setup actions from the following canonical client source. It contains alternatives; render only the selected custom remote/manual OAuth path. The final Google sign-in and consent action is supported by T4-05 and T1-10.

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

## Client implementation check

# Client implementation evidence
Observed: 2026-09-11. Repository: https://github.com/speakeasy-api/gram. Commit: 496e62ca5d5ebd99f0c189f2614fc9c707e44659.
This evidence concerns upstream Google authorization, not downstream client registration.
- server/internal/remotesessions/interceptors/google.go, lines 26–52: `strings.EqualFold(u.Hostname(), "accounts.google.com")`; `q.Set("access_type", "offline")`; the code adds `consent` to `prompt`.
- server/internal/remotesessions/interceptors/google_test.go, TestGoogleMatchesGoogleIssuer, TestGoogleMatchesGoogleIssuerCaseInsensitively, and authorization-parameter tests: check issuer matching and offline access with consent.
- server/internal/remotesessions/challenge.go, lines 261–263: `interceptors.NewGoogle(logger)` is in the default interceptor list. Lines 718–797 construct the upstream authorization URL with `client.ExternalClientID`, configured scopes, and the redirect URI. Lines 789–792 apply each matching interceptor. This path has no registration-mode condition around the interceptor. It applies to the selected manually registered client as well as other modes that use this path. Lines 957–965 encrypt a returned refresh token; line 1055 persists it.
- server/internal/remotesessions/tokenservice.go, lines 537–600: the upstream refresh path decrypts the saved token and sends `form.Set("grant_type", "refresh_token")` and `form.Set("refresh_token", refreshToken)` to the upstream token endpoint. Lines 622–635 keep the current refresh token when no new one is returned.
- server/internal/remotesessions/refreshsession_test.go, TestRefreshSession at lines 89–145: checks the refresh response and stored session. Other tests check missing tokens, upstream rejection, and access control.
Commit-pinned link prefix: https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/
Condition: Google issuer hostname must be accounts.google.com and the connection must use the remote-session OAuth path. No feature flag surrounds the observed interceptor installation or call. Source review only; tests were not run. No concrete evidence of a deployed-version mismatch was found. Do not add a user action for the automatic offline-access or consent parameters. Use doctrine/speakeasy-setup.md for user actions.

## Research status and limitations

All five topics returned complete reports for the selected path. Topic 2 and Topic 4 completed reconciliation round 1. Topic 1 completed the final selected-action authority audit in round 2. No further research rounds were used. Non-blocking questions remain in the reports below: write scopes, individual preview registrations, exact Speakeasy role, organization-specific screening details, and separate release-note confirmation. No live OAuth sign-in or upstream test suite was run. No concrete deployed-version mismatch was found. These limits do not establish unsupported behavior.

Topic 3 initial dispatch failed with an upstream credit-limit error. Its return had no recoverable partial report. A new native session completed the same topic after the other initial calls settled. Prompt preparation also failed once because python3 was unavailable; the saved error is not provider evidence. Exact errors and timing are in `.factory/dispatch-errors.jsonl`. Actual prompts, document hashes, reports, and session handles are in `.factory/google-calendar-trial/`. No credentials were collected.


---

## Topic and status

**Topic 1 — Setup permissions and administrative access: complete.**

The final authority check supports the selected private read-access trial. Use **Service Usage Admin** and **OAuth Config Editor** on the existing Google Cloud project. Different administrators must help if Calendar service settings or Workspace app access controls need changes. A calendar owner must grant missing calendar access.

**Changes in this report:**
- **T1-02 expanded:** Covers the selected audience, test users, read scopes, web client, callback, and client credentials.
- **T1-04 retained as conditional, but not selected:** No new project is needed.
- **T1-05 corrected and expanded:** The linked Google APIs Terms establish authority to accept terms for an organization.
- **T1-06 confirmed:** Workspace API controls require the **Service Settings administrator privilege**.
- **T1-07 updated:** Organization-owned screening is selected. Model Armor permissions are outside this path.
- **T1-08 through T1-11 added:** Cover Calendar service access, calendar sharing, user consent, and the client setup action.

All observations are dated **2026-09-11**. Selected-action sources were checked again during this follow-up. Unchanged findings retain their sources. No provider settings or files were changed.

## Findings

### T1-01 — Enable both Calendar services in the existing project

- **Status:** Required.
- **Actor and scope:** The setup administrator needs service enablement permission on the selected Google Cloud project.
- **Required permission:** `serviceusage.services.enable`.
- **Narrower documented role:** **Service Usage Admin**, `roles/serviceusage.serviceUsageAdmin`.
- **Documented action and values:** Enable:
  - **Google Calendar API:** `calendar-json.googleapis.com`
  - **Google Calendar MCP API:** `calendarmcp.googleapis.com`
- **Value source:** Obtain the existing registered project from its owner.
- **Sources and quotations:**
  - [Configure the Google Calendar MCP server](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Enable the APIs** and **Enable the MCP services**:
    - “Google Calendar API”
    - “Google Calendar MCP API”
    - “enable the following service in your Google Cloud project”
  - [Configure security for Google Workspace MCP servers](https://developers.google.com/workspace/guides/configure-mcp-security), **Enable Model Armor > Console > Roles required to enable APIs**:
    - “To enable APIs, you need the `serviceusage.services.enable` permission.”
    - “you can get this permission through the Service Usage Admin role (`roles/serviceusage.serviceUsageAdmin`).”
- **Interpretation:** The shared page states the general API enablement permission. It applies to both required service enablement actions. Do not default to **Owner**.

### T1-02 — Configure OAuth and create the web client

**Expanded finding.**

- **Status:** Required. Test-user assignment is conditional on the **External** audience.
- **Actor and scope:** The application configuration administrator acts on the OAuth application in the existing project.
- **Narrower documented role:** **OAuth Config Editor**, `roles/oauthconfig.editor`. Google marks this role **Beta**.
- **Documented actions covered:**
  - Configure **Google Auth Platform > Branding**, **Audience**, and **Data Access**.
  - Use **Internal** when available under the documented setup. Otherwise, use **External** and the selected **Testing** path.
  - Add authorized test users under **Audience > Test users > Add users**.
  - Configure the three Calendar read and availability scopes.
  - Create a **Web application** OAuth client.
  - Register `{{ gram.oauth.callback_url }}` under **Authorized redirect URIs**.
  - Copy the generated **Client ID** and **Client Secret**.
- **Required scope values:**
  - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
  - `https://www.googleapis.com/auth/calendar.events.freebusy`
  - `https://www.googleapis.com/auth/calendar.events.readonly`
- **Value sources:** Google supplies the client credentials. The supplied client context supplies the Speakeasy callback. Obtain support, contact, and authorized test-user email addresses from the application owner.
- **Sources and quotations:**
  - [OAuthConfig roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/oauthconfig), **OAuth Config Editor**:
    - “Read/write access to OAuth config resources”
    - `clientauthconfig.brands.create`
    - `clientauthconfig.brands.update`
    - `clientauthconfig.clients.create`
    - `clientauthconfig.clients.createSecret`
    - `clientauthconfig.clients.getWithSecret`
    - `clientauthconfig.clients.update`
    - `oauthconfig.testusers.update`
    - `resourcemanager.projects.get`
    - `resourcemanager.projects.list`
  - [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Set up the OAuth consent screen**:
    - “You must configure the OAuth consent screen before you can create an OAuth client ID.”
    - “Under Audience, select Internal. If you can't select Internal, select External.”
    - “If you selected External for user type, add test users”
    - “Under Manually add scopes, paste the scopes for the Google Calendar MCP server”
  - Same page, **Configure your MCP client > Claude**:
    - “Select Web application as the application type.”
    - “Click Create and copy your Client ID and Client Secret.”
- **Interpretation:** The role description supports the selected OAuth configuration actions. Test-user assignment has explicit permission evidence. This role does not replace authority to accept terms, change Workspace access policy, or grant Calendar data access.

### T1-03 — Obtain missing project roles from an access administrator

- **Status:** Conditional. Applies if the setup administrator lacks T1-01 or T1-02 permissions.
- **Actor and scope:** An existing project access administrator grants the applicable roles to the setup administrator on the selected project.
- **Documented role:** **Project IAM Admin**, `roles/resourcemanager.projectIamAdmin`.
- **Documented action:** Grant the missing project roles, or arrange for an authorized person to perform the restricted setup actions.
- **Value sources:** Obtain the project and setup account from the project owner.
- **Source:** [Grant, change, and revoke access to resources](https://cloud.google.com/iam/docs/granting-changing-revoking-access), **Required roles** and **Required permissions**:
  - “To manage access to a project: Project IAM Admin (`roles/resourcemanager.projectIamAdmin`)”
  - `resourcemanager.projects.getIamPolicy`
  - `resourcemanager.projects.setIamPolicy`
- **Interpretation:** Do not give the reader IAM administration only to complete Calendar setup. Ask the existing access administrator for help.

### T1-04 — Project creation authority

**Retained conditional finding; not selected.**

- **Status:** Conditional. Applies only if a new project is created.
- **Actor and scope:** A project creator acts under the selected parent organization or folder.
- **Requirement:** `resourcemanager.projects.create`, included in **Project Creator**, `roles/resourcemanager.projectCreator`.
- **Documented action:** In **Manage resources**, select **Create project**, enter the project details and parent resource, then select **Create**.
- **Value sources:** Obtain the project name, parent resource, and any applicable billing account from the Google Cloud owner.
- **Sources and quotations:**
  - [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Prerequisites**: “A Google Cloud project.”
  - [Creating and managing projects](https://cloud.google.com/resource-manager/docs/creating-managing-projects), **Create a project**:
    - “To create a project, you must have the `resourcemanager.projects.create` permission.”
    - “This permission is included in roles like the Project Creator role (`roles/resourcemanager.projectCreator`).”
- **Interpretation:** The selected path uses an existing project. Do not add this role or project-creation steps to that path.

### T1-05 — Preview approval, permitted users, and acceptance authority

**Corrected and expanded finding.**

- **Status:** Required.
- **Actors and scope:**
  - An authorized organization representative submits the preview application and accepts applicable terms.
  - Google verifies the Workspace account and registers the Cloud project.
  - The application owner limits trial access to permitted users.
- **Documented actions:**
  - Read the Program Terms and submit the linked application form.
  - Supply the Workspace account and existing Cloud project information.
  - Ensure that the registration email account can be added to Google Groups.
  - Obtain Google’s final registration confirmation.
  - Keep preview access within the company or domain unless Google grants the documented exception.
  - Review and accept the Google API Services User Data Policy during initial Auth Platform configuration.
- **Value sources:** Obtain account and project details from their owners. Obtain acceptance authority from the organization.
- **Sources and quotations:**
  - [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), opening notice:
    - “Available as part of the Google Workspace Developer Preview Program”
  - Same page, **Set up the OAuth consent screen**:
    - “Under Finish, review the Google API Services User Data Policy”
    - “I agree to the Google API Services: User Data Policy”
  - [Developer Preview Program](https://developers.google.com/workspace/preview), **How to join the program**:
    - “Read through the Program Terms before applying.”
    - “You need to provide us with your Google Workspace account and Google Cloud project information.”
    - “After verifying your Google Workspace account, we will register your Google Cloud project.”
    - “When it is done, you will receive a final confirmation to your registered email address.”
  - Same page, **Developer Preview Program Terms**, paragraphs (iii) and (iv):
    - “I agree to the Google APIs Terms of Service.”
    - “I may not grant end users access, outside my domain or company”
    - “unless Google specifically states that I can request such permission and such permission has been granted to my Workspace account for that feature.”
  - [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), opening section:
    - “The policy below, as well as the Google APIs Terms of Service, govern the use of Google API Services”
  - [Google APIs Terms of Service](https://developers.google.com/terms), **Section 1 > b. Entity Level Acceptance**:
    - “If you are using the APIs on behalf of an entity, you represent and warrant that you have authority to bind that entity to the Terms”
- **Interpretation:** Organization acceptance authority is established by the linked terms. An IAM role alone does not establish that authority. If the reader lacks it, an authorized representative must help. Google does not name a required Workspace administrator role for the preview applicant. External OAuth audience selection does not remove the preview access restriction.

### T1-06 — Permit the application through Workspace API controls when needed

**Confirmed against the live source.**

- **Status:** Conditional. Applies if existing controls block the OAuth application or its required scopes.
- **Actor and scope:** A Workspace administrator with the **Service Settings administrator privilege** configures application access for the trial users’ organizational units.
- **Documented action:** Open **Security > Access and data control > API controls > Manage App Access**. Configure or change the application’s access for the applicable organizational units.
- **Required values:** Obtain the OAuth client ID from the application owner and the trial users’ organizational units from the Workspace administrator. Use the approved scope list when selecting **Specific Google data**.
- **Source:** [Control which third-party and internal apps access Google Workspace data](https://support.google.com/a/answer/7281227?hl=en), **Manage app access to Google services & add apps**:
  - “Requires having the Service Settings administrator privilege.”
  - “Click Manage App Access.”
  - “To apply to specific organizational units, click Select org units”
  - “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
- **Interpretation:** Topic 3’s authority claim is correct. This is a Workspace privilege, not a Cloud project role. Do not require a policy change when current policy permits the application. Do not default to organization-wide **Trusted** access.

### T1-07 — Supply and document organization-owned screening

**Updated for the selected path.**

- **Status:** Required.
- **Actor and scope:** The application and security owners supply protection for the application’s MCP prompts and responses.
- **Documented action:** Screen prompts and responses for malicious content or prompt injection. Document the organization-owned solution so users can accept the risk. Complete this prerequisite before connection and use.
- **Required values:** The owners supply the solution and its documentation. Google does not give universal configuration values for this option.
- **Source:** [Configure security for Google Workspace MCP servers](https://developers.google.com/workspace/guides/configure-mcp-security), opening requirements:
  - “You must screen prompts and responses for malicious content or prompt injection attacks.”
  - “You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Interpretation:** Actual screening and documentation are both required. Google permits this option without naming a universal administrator role for an organization-owned solution. Model Armor is not selected; its API and policy permissions are not part of this authority check. Do not claim that Speakeasy supplies screening.

### T1-08 — Enable Calendar for managed trial users when needed

**New finding.**

- **Status:** Calendar service access is required for managed Workspace users. A setting change is conditional on the service being off.
- **Actor and scope:** A Workspace administrator with the **Calendar administrator privilege** changes service access for the applicable organizational unit or access group.
- **Documented action:** Open **Apps > Google Workspace > Calendar > Service status**. Select the applicable unit and set **On**. Use **Override** or **Save** as the inherited state requires. Google also documents access groups.
- **Value source:** Obtain the trial users’ unit or group from the Workspace administrator.
- **Source:** [Turn Calendar on or off for users](https://knowledge.workspace.google.com/admin/users/access/turn-calendar-on-or-off-for-users), **To control who uses Calendar in your organization**:
  - “Requires having the Calendar administrator privilege.”
  - “To change the Service status, select On or Off.”
  - “To turn on a service for a set of users across or within organizational units, select an access group.”
- **Interpretation:** Topic 3’s privilege claim is correct. Use this privilege for Calendar service access. The **Service Settings administrator privilege** in T1-06 concerns API controls. Do not substitute one for the other without further evidence.

### T1-09 — Obtain underlying calendar access from the calendar owner

**New finding.**

- **Status:** User access to the selected data is required. Sharing changes are conditional on missing access.
- **Actors and scope:** The calendar owner grants access to the connecting user. A non-owner who manages sharing needs **Make changes and manage sharing**.
- **Documented action:** The owner opens the calendar’s **Settings and sharing**, adds the user under **Shared with**, selects the permitted access, and sends the invitation. The user follows the invitation link to add the calendar.
- **Required values:** Use the connecting user’s Google account email. For the selected read trial, obtain event-detail access if those details are needed. Availability-only sharing does not give general event-detail access.
- **Sources and quotations:**
  - [Share your calendar with someone](https://support.google.com/calendar/answer/37082?hl=en), sharing permission notice and invitation procedure:
    - “If you want to share a calendar that someone else owns, that person must give you the ‘Make changes and manage sharing’ permission.”
    - “To give others access, click Send.”
    - “To add your calendar, they must click the link in the email.”
  - [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), opening feature list:
    - “Inherit the same permissions and data governance controls as the user.”
- **Interpretation:** Cloud roles, OAuth scopes, and Workspace app approval do not replace Calendar sharing permissions. Use the connecting user’s own calendar for the first check when suitable.

### T1-10 — Each connecting user gives OAuth consent

**New finding.**

- **Status:** Required.
- **Actor and scope:** Each permitted user authorizes the application to access that user’s Calendar data.
- **Documented action:** Complete Google’s browser authorization with the intended account and grant the selected read and availability access.
- **Required values:** Use an eligible Internal account or an assigned External test-user account, within the preview access limits.
- **Source:** [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2), **Basic steps > Obtain an access token from the Google Authorization Server**:
  - “If the user grants at least one permission, the Google Authorization Server sends your application an access token”
  - “If the user does not grant the permission, the server returns an error.”
- **Interpretation:** An administrator’s application configuration does not replace each user’s consent. Offline access and refresh-token handling are client actions resolved by Topic 4 and the coordinator. They do not add a selected administrative action.

### T1-11 — Add the remote server and manual OAuth client in Speakeasy

**New finding; based on supplied client evidence.**

- **Status:** Required.
- **Actor and scope:** The reader adds the source and attaches its identity provider in the intended Speakeasy project.
- **Documented action and values:**
  - Use **Connect > Sources > Add Source > Custom remote server**.
  - Enter `https://calendarmcp.googleapis.com/mcp/v1` in **Remote MCP server URL**.
  - Attach the manually registered OAuth client with its Google client ID and secret.
  - Use the callback registered under T1-02.
- **Sources and quotations:**
  - [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Configure your MCP client > Others**:
    - “Server URL: `https://calendarmcp.googleapis.com/mcp/v1`”
  - Supplied client reference, `doctrine/speakeasy-setup.md`, **Add the server in Speakeasy**, lines 73–86; **Connect your credentials**, lines 117–125. The reference cites product-source commits `96f7f73` and `f1d60da`:
    - “choose Custom remote server”
    - “set Client Type to Manual”
    - “Paste the Client ID and Client Secret (optional)”
    - “click Attach Identity Provider”
- **Interpretation:** The supplied procedure establishes the client action. It does not name a required Speakeasy role. Client role checks remain with the coordinator. No Google full-administrator role is established for the act of adding a source in Speakeasy.

## Unresolved questions

- **Non-blocking — Internal delegation of acceptance authority.**\
  The Google APIs Terms establish the required authority to bind the organization. They cannot identify which employee has that authority. Obtain an authorized representative. The previous uncertainty about the applicable legal requirement is closed.

- **Non-blocking — Exact Speakeasy role.**\
  The supplied client procedure does not name a role for source creation or identity-provider attachment. The operation and values are concrete. The coordinator owns client access checks.

- **Non-blocking — Organization-owned screening permissions.**\
  Google permits this solution but cannot establish roles for the organization’s selected system. The application and security owners must supply it. Do not invent a Google IAM role or a Speakeasy screening capability.

- **Non-blocking — Individual preview registration.**\
  The preview page establishes account and project registration. It does not clearly require separate registration for every connecting user. Do not describe individual registration as universally required or explicitly unnecessary.

- **Non-blocking — Separate MCP invocation role.**\
  The checked Calendar setup and preview pages do not establish a separate MCP invocation IAM role. The documented selected procedure remains sufficient. Do not invent such a role or claim that all unmentioned entitlements are unnecessary.

- **Non-blocking — Separate release-note confirmation.**\
  The maintained setup pages showed no replacement notice. Separate release-note confirmation remains incomplete.

**No blocking authority gap remains for the selected actions.**

## Cross-topic dependencies

- **Topic 2:** Use T1-01 for both API enablement actions, T1-02 for Auth Platform configuration, T1-05 for preview and acceptance authority, and T1-07 for organization-owned screening. Do not add Model Armor or new-project permissions.
- **Topic 3:** The **Calendar** privilege for Calendar service access and **Service Settings** privilege for API controls are confirmed. Use the calendar owner or an authorized sharing manager for missing data access.
- **Topic 4:** OAuth Config Editor supports the selected configuration, test-user assignment, and web-client credential actions. Acceptance authority is separate under T1-05. No further administrative action is added by automatic offline access or token refresh.
- **Topic 5:** Both required Calendar services have permission support. The fixed remote URL does not add a Google organization-wide administration requirement.
- **Coordinator:** The final selected-action authority check is complete. Keep the private read-access path. Prefer project-scoped **Service Usage Admin** and **OAuth Config Editor**. Obtain help from the applicable Workspace administrator, calendar owner, or authorized organization representative when needed. Retain the non-blocking client-role limit; do not invent a Speakeasy role.

---

## Topic and status

**Topic 2 — Organization-level setup: complete.**

The selected path preserves Google's security requirement. The application and security owners must supply a solution that screens prompts and responses. They must document it so that users can accept the risk. Google permits this option. The guide must not state that Speakeasy supplies screening.

No blocking compatibility check remains within this topic. The provider gives no universal implementation procedure for an organization-owned screening solution. Its documented operation is sufficient at that level of detail.

**Changes in this report:**
- **T2-01 clarified:** Account and project registration are required. The evidence does not establish separate preview enrollment for each connecting user.
- **T2-02 expanded:** Preview access must remain within the company or domain, subject to Google's stated exception.
- **T2-07 corrected:** The selected screening prerequisite satisfies the documented setup requirement. The previous open screening-method check is closed.
- **T2-08 retained as conditional:** Model Armor is not selected.
- **T2-09 added:** Google provides a process to register additional email addresses or projects when needed.

All source observations below are dated **2026-09-11**. Unchanged findings retain their original sources. The security and preview findings were checked again against the live sources for this follow-up.

## Findings

### T2-01 — Register the account and project for Developer Preview

- **Status:** Required.
- **Who acts:** The organization or application owner applies. Google verifies the account and registers the project.
- **Access and scope:** The supplied Google Workspace account and Google Cloud project receive preview access.
- **Documented action:**
  - Read the Program Terms.
  - Open the application form from **How to join the program**.
  - Supply the requested Google Workspace account and Google Cloud project information. Obtain these values from the account and project owners.
  - Submit the application.
  - Make sure the applicant's email account permits addition to Google Groups.
  - Use the final email confirmation to confirm project registration.
- **Sources and exact quotations:**
  - [Configure the Google Calendar MCP server](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), opening notice: “Developer Preview: Available as part of the Google Workspace Developer Preview Program”.
  - [Google Workspace Developer Preview Program](https://developers.google.com/workspace/preview), **How to join the program**:
    - “You need to provide us with your Google Workspace account and Google Cloud project information.”
    - “When we verify your Google Workspace account information, we will add you to a Google Group for the program and you should receive a notification.”
    - “After verifying your Google Workspace account, we will register your Google Cloud project.”
    - “When it is done, you will receive a final confirmation to your registered email address.”
    - “The whole process should be done within a couple of days.”
- **Interpretation:** API activation does not replace preview registration. The Google Group instruction applies to the registration contact described in this procedure. It does not establish mandatory, separate preview enrollment for every connecting user.

### T2-02 — Keep preview use private and within the company or domain

- **Status:** Required while the feature is in Developer Preview. The exception for outside users applies only under Google's stated conditions.
- **Who acts:** The application owner controls distribution and user access.
- **Access and scope:** The application and its test users.
- **Documented action:** Keep the trial private. Do not grant access outside the company or domain unless Google permits an application for that access and grants the permission for the feature.
- **Source:** [Developer Preview Program](https://developers.google.com/workspace/preview), opening note and **Developer Preview Program Terms**, paragraphs (ii) and (iv).
- **Exact quotations:**
  - “features in Developer Preview may not be included in public applications prior to the General Availability announcement.”
  - “I may not grant end users access, outside my domain or company, to developer applications that have been built using APIs prior to their GA announcement”
  - “unless Google specifically states that I can request such permission and such permission has been granted to my Workspace account for that feature.”
- **Interpretation:** The local trial must obey both restrictions. Selection of **External** in the OAuth application does not remove the preview company or domain restriction.

### T2-03 — Enable both Calendar services in the project

- **Status:** Required.
- **Who acts:** A project administrator with API activation permission.
- **Access and scope:** The selected Google Cloud project.
- **Documented action and values:**
  - Enable **Google Calendar API**, service `calendar-json.googleapis.com`.
  - Enable **Google Calendar MCP API**, service `calendarmcp.googleapis.com`.
  - Use the project registered for the trial. Obtain the project identity from the project owner.
- **Browser links supplied by Google:**
  - [Enable Google Calendar API](https://console.cloud.google.com/flows/enableapi?apiid=calendar-json.googleapis.com)
  - [Enable Google Calendar MCP API](https://console.cloud.google.com/flows/enableapi?apiid=calendarmcp.googleapis.com)
- **Source:** [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Enable the APIs** and **Enable the MCP services**.
- **Exact quotations:**
  - “To use the Google Calendar MCP server, you must enable the following API in your Google Cloud project”
  - “Google Calendar API”
  - “To enable the MCP components for Google Calendar, you must enable the following service in your Google Cloud project”
  - “Google Calendar MCP API”
- **Authority source:** [Workspace MCP security](https://developers.google.com/workspace/guides/configure-mcp-security), **Enable Model Armor > Console > Roles required to enable APIs**:
  - “To enable APIs, you need the `serviceusage.services.enable` permission.”
  - “you can get this permission through the Service Usage Admin role (`roles/serviceusage.serviceUsageAdmin`).”
- **Interpretation:** The setup has two service activation actions. Topic 1 must confirm the applicable project authority.

### T2-04 — Configure the OAuth consent screen

- **Status:** Required. The new-configuration sequence applies only if Google Auth Platform is not configured.
- **Who acts:** The application configuration owner. Topic 1 must check the authority.
- **Access and scope:** The OAuth application in the selected project.
- **Documented action:**
  - Open **Google Auth Platform > Branding**.
  - If the platform is not configured, select **Get Started**.
  - Under **App Information**, set **App name** to `Calendar MCP Server`.
  - Select the operator's email address or an appropriate Google group for **User support email**.
  - Select **Next**.
  - Under **Audience**, select **Internal**. If unavailable, select **External**.
  - Select **Next**.
  - Under **Contact Information**, enter an **Email address** for project change notices. Obtain it from the application owner.
  - Select **Next**.
  - Under **Finish**, review the linked policy. If authorized and in agreement, select **I agree to the Google API Services: User Data Policy**.
  - Select **Continue**, then **Create**.
  - For an existing configuration, use **Branding**, **Audience**, and **Data Access**.
- **Source:** [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Set up the OAuth consent screen**.
- **Exact quotations:**
  - “You must configure the OAuth consent screen before you can create an OAuth client ID.”
  - “Under App Information, in App name, type `Calendar MCP Server`.”
  - “Under Audience, select Internal. If you can't select Internal, select External.”
- **Interpretation:** Use the Calendar-specific settings. Do not assume that application configuration authority includes authority to accept terms.

### T2-05 — Add users for an External trial

- **Status:** Conditional. Applies when **External** is selected in the documented trial setup.
- **Who acts:** The application configuration owner.
- **Access and scope:** The named test users receive access to the test application.
- **Documented action:** Open **Audience**. Under **Test users**, select **Add users**. Enter the operator's email address and other authorized test users. Select **Save**.
- **Source:** [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Set up the OAuth consent screen**.
- **Exact quotations:**
  - “If you selected External for user type, add test users”
  - “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** OAuth test-user assignment is separate from preview program registration. The preview company or domain restriction still applies.

### T2-06 — Configure Calendar scopes and a web OAuth client

- **Status:** Required for the documented manual OAuth connection.
- **Who acts:** The application configuration owner.
- **Access and scope:** The OAuth application requests Calendar access from the connecting user.
- **Documented action and values:**
  - Open **Data Access > Add or Remove Scopes**.
  - Under **Manually add scopes**, use:
    - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
    - `https://www.googleapis.com/auth/calendar.events.freebusy`
    - `https://www.googleapis.com/auth/calendar.events.readonly`
  - Open **Google Auth Platform > Clients > Create Client**.
  - Select **Web application**. Enter an application **Name**.
  - Under **Authorized redirect URIs**, select **+ Add URI** and register the client callback.
  - Select **Create** and copy the **Client ID** and **Client Secret**.
- **Source:** [Calendar MCP setup](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Set up the OAuth consent screen** and **Configure your MCP client > Claude**.
- **Exact quotations:**
  - “Under Manually add scopes, paste the scopes for the Google Calendar MCP server”.
  - “Select Web application as the application type.”
  - “Click Create and copy your Client ID and Client Secret.”
- **Interpretation:** Do not copy the Claude callback. The supplied Speakeasy client context gives `{{ gram.oauth.callback_url }}` as the callback value. Topic 4 and the coordinator own the OAuth connection checks.

### T2-07 — Supply and document the selected screening solution

- **Status:** Required. The selected path uses an organization-owned solution.
- **Who acts:** The application and security owners.
- **Access and scope:** Prompts and responses for the application that uses the Workspace MCP server.
- **Documented action:** Supply screening for malicious content or prompt injection attacks. Document the solution so that users can accept the risk.
- **Sources and exact quotations:**
  - [Configure security for Google Workspace MCP servers](https://developers.google.com/workspace/guides/configure-mcp-security), opening requirements:
    - “You must screen prompts and responses for malicious content or prompt injection attacks.”
    - “You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
  - [Google Workspace user data and developer policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy), security-measures list, item on prompt injection:
    - “Protecting against prompt injection techniques by either using Google Cloud Platform's Model Armor or other prompt injection protection.”
- **Interpretation:** The coordinator's selected prerequisite preserves the required action and the documentation condition. It does not claim a Speakeasy capability. Google does not specify a universal UI procedure or configuration values for an organization-owned solution on these pages.
- **Correction:** The previous open screening-method check is closed. Actual screening remains a prerequisite; documentation alone is not screening. No source evidence found in this check requires a further client compatibility test for this permitted choice.

### T2-08 — Configure Model Armor only if that option is selected

- **Status:** Conditional. **Not selected for this path.**
- **Who acts:** The project and security administrators.
- **Access and scope:** The selected Google Cloud project and its MCP calls and responses.
- **Documented action, if selected:**
  - Enable `modelarmor.googleapis.com` through the supplied [Enable the API link](https://console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com).
  - Select the project.
  - Set a Model Armor floor setting with MCP sanitization enabled.
  - Follow [Configure Model Armor floor settings](https://docs.cloud.google.com/model-armor/configure-floor-settings).
- **Source:** [Workspace MCP security](https://developers.google.com/workspace/guides/configure-mcp-security), **Enable Model Armor** and **Configure protection for Google and Google Cloud remote MCP servers**.
- **Exact quotations:**
  - “You must enable Model Armor APIs before you can use Model Armor.”
  - “Select the project where you want to activate Model Armor.”
  - “Set up a Model Armor floor setting with MCP sanitization enabled.”
- **Interpretation:** Do not add Model Armor activation, floor settings, or region checks to the selected organization-owned screening path.

### T2-09 — Request additional preview registrations when needed

- **Status:** Conditional. Applies when the program participant wants to register more email addresses or projects.
- **Who acts:** The preview program participant submits the applicable request.
- **Access and scope:** Additional program email addresses or Google Cloud projects.
- **Documented action:** Open **Questions and Requests** on the preview page. Use **Request to add or remove email addresses** or **Request to add or remove your Google Cloud project**. Obtain the requested values from the relevant account or project owner.
- **Source:** [Developer Preview Program](https://developers.google.com/workspace/preview), **Questions and Requests**.
- **Exact quotation:** “When you want to register more email addresses or Google Cloud projects to the program, submit a request using one of the forms.”
- **Interpretation:** This is a documented additional-registration process. The statement does not establish that each connecting user must have an individually registered preview email address. Do not turn it into a universal user prerequisite.

## Unresolved questions

- **Non-blocking — Individual preview email registration.**\
  **How to join the program**, **Questions and Requests**, and the Program Terms were checked. They establish account and project registration and a process for additional registrations. They do not clearly require individual preview enrollment for every connecting user. Do not claim that individual enrollment is either universally required or explicitly unnecessary.

- **Non-blocking — Screening implementation details.**\
  The official security page and linked developer policy permit another screening solution. They give no universal implementation procedure. The selected prerequisite retains the full documented operation. No extra procedure or Speakeasy screening capability should be invented.

- **Non-blocking — Authority for application configuration and preview application.**\
  The service page gives the actions but does not establish all applicable roles or authority to accept terms. Topic 1 retains this check. Missing exact role names do not invalidate the documented procedure.

- **Non-blocking — Existing organization policies.**\
  This research does not establish whether the organization has an existing policy that blocks the application. It does not prove that such policies are absent.

- **Non-blocking — Separate release-note confirmation.**\
  The preview page links [Google Workspace developer release notes](https://developers.google.com/workspace/release-notes). Separate release-note confirmation remains incomplete. The checked live pages showed no replacement notice. The preview page states “Last updated 2026-09-11 UTC.”

**No blocking gap remains in Topic 2 for the selected path.**

## Cross-topic dependencies

- **Topic 1:** Confirm API activation authority, OAuth configuration authority, preview application authority, and authority to accept applicable terms. Model Armor authority is not needed for the selected path.
- **Topic 3:** Apply the preview company or domain restriction. Keep OAuth test-user assignment separate from preview registration. Do not require individual preview enrollment without further evidence.
- **Topic 4:** Retain the Calendar-specific scopes and web OAuth client procedure. Check callback registration, test-state limits, and refresh-token requirements.
- **Topic 5:** Retain both Calendar service activation values and the preview registration prerequisite.
- **Coordinator:** The selected organization-owned screening prerequisite is supported. Require actual prompt and response screening and its documentation before use. Do not claim that Speakeasy supplies screening. Do not add Model Armor setup to this path. Keep the trial private and within the permitted company or domain.

---

## Topic and status

**Topic 3 — Connecting-user setup: complete.**

The official instructions establish the user access path for a Calendar read-access trial. Conditional actions apply to external test users, restricted applications, and shared calendars. No blocking gap remains for this path.

All sources below were observed on **2026-09-11**. Research used live official pages. No provider settings or files were changed.

## Findings

### T3-01 — The user must have access to the Calendar data

- **Status:** Required.
- **Actor and scope:** The connecting user needs access to each calendar and event that the MCP tools use. The calendar owner grants missing access.
- **Source statement:** The MCP server does not give the user more Calendar access.
- **Documented action and values:** Use the connecting user's existing Calendar permissions. For another person's calendar, the calendar owner grants the applicable sharing permission. Select access for the intended operation:
  - `freeBusyReader`: availability, without event details.
  - `reader`: read events.
  - `writer`: read and write events.
- **Interpretation:** OAuth access does not replace Calendar sharing permissions. Private event settings and domain sharing limits can further restrict visible data.
- **Sources and exact quotations:**
  - [Configure the Google Calendar MCP server](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), opening feature list:
    > “Respect security: Inherit the same permissions and data governance controls as the user.”
  - [Share calendars and events](https://developers.google.com/workspace/calendar/api/concepts/sharing), **Share calendars**:
    > “The owners of a calendar can share the calendar by giving access to other users.”
    > “By default, each user has owner access to their primary calendar, and this access cannot be relinquished.”
    > “For Google Workspace users, there are also domain settings that might restrict the maximum allowed access.”
  - Same page, role table:
    > “Lets the grantee read events on the calendar.”
    > “Lets the grantee read and write events on the calendar.”
  - Same page, **Event visibility**, `private`:
    > “The details of this event are only visible to users with at least writer access to the calendar.”

### T3-02 — Add shared calendars when the trial needs them

- **Status:** Conditional. Applies when the trial uses another person's calendar and the user does not already have the required access.
- **Actor and scope:** The calendar owner, or a person with permission to manage sharing, grants access to the connecting user's email address. The connecting user adds the calendar.
- **Documented browser action:**
  1. The owner opens Google Calendar on a computer.
  2. Under **My calendars**, the owner selects the calendar's **More > Settings and sharing**.
  3. The owner selects **Shared with > Add people and groups**.
  4. The owner enters the connecting user's email address.
  5. The owner selects the required permission and clicks **Send**.
  6. The connecting user clicks the link in the email to add the calendar.
- **Required values:** Get the connecting user's Google account email address from that user. For a read trial, select **See event details** if event details are needed. **See only free/busy (hide details)** does not give general access to event details.
- **Authority:** The source establishes the calendar owner's authority. A person who does not own the calendar needs **Make changes and manage sharing**.
- **Sources and exact quotations:**
  - [Share your calendar with someone](https://support.google.com/calendar/answer/37082?hl=en), introductory notice:
    > “If you want to share a calendar that someone else owns, that person must give you the ‘Make changes and manage sharing’ permission.”
  - Same page, **Step 2: Choose who to share your calendar with**:
    > “Under ‘Shared with,’ click Add people and groups.”
    > “Add the email address of the person or Google group.”
  - Same page, **Step 3: Choose what people can do with your calendar**:
    > “See only free/busy (hide details)”
    > “See event details”
  - Same page, **Step 4: Send the calendar invite**:
    > “To give others access, click Send.”
    > “To add your calendar, they must click the link in the email.”
- **Interpretation:** Do not make a calendar public to complete this trial. The documented person-specific sharing action is sufficient.

### T3-03 — Calendar service access must be on for the user

- **Status:** Required for a managed Google Workspace user. A change is conditional on Calendar being off.
- **Actor and scope:** A Google Workspace administrator with the **Calendar** administrator privilege enables Calendar for the user's organizational unit or access group.
- **Documented action:** In Google Admin console, open **Apps > Google Workspace > Calendar > Service status**. For a selected organizational unit, select **On**. Use **Override** or **Save**, as the documented inherited state requires. Google also supports access groups for selected users.
- **Required environment values:** Get the user's organizational unit or access group from the Workspace administrator.
- **Source:** [Turn Calendar on or off for users](https://knowledge.workspace.google.com/admin/users/access/turn-calendar-on-or-off-for-users), opening paragraph and **To control who uses Calendar in your organization**.
- **Exact quotations:**
  > “People who have Calendar turned on can use it to manage and share schedules from their account.”
  > “Requires having the Calendar administrator privilege.”
  > “To change the Service status, select On or Off.”
  > “Changes can take up to 24 hours but typically happen more quickly.”
- **Interpretation:** Enable access for the trial users. The source does not require an organization-wide change.

### T3-04 — Add external trial users to the OAuth test-user list

- **Status:** Conditional. Applies when the application uses the Calendar page's **External** audience setup.
- **Actor and scope:** The OAuth application configuration owner adds the connecting users to the application's test-user list. Topic 1 must confirm the applicable configuration authority.
- **Documented action:** In Google Auth Platform, select **Audience**. Under **Test users**, select **Add users**. Enter the authorized trial users' email addresses, then click **Save**.
- **Required values:** Use the Google account email addresses that the trial users will connect.
- **Source:** [Configure the Google Calendar MCP server](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Set up the OAuth consent screen**.
- **Exact quotations:**
  > “If you selected External for user type, add test users”
  > “Under Test users, click Add users.”
  > “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** This is application access for the named users. It is separate from Calendar sharing and preview-program access.

### T3-05 — Workspace application controls must permit access for the user

- **Status:** Conditional. Applies when Workspace application controls would otherwise block the OAuth application or its Calendar scopes.
- **Actor and scope:** A Workspace administrator with the **Service Settings** administrator privilege configures the OAuth application's access for the trial users' organizational units.
- **Documented action:**
  1. Open **Security > Access and data control > API controls** in Google Admin console.
  2. Select **Manage App Access**.
  3. Under **Configured apps**, select **Configure new app**.
  4. Enter the application name or OAuth client ID and select **Search**.
  5. Select the application.
  6. Under **Scope**, select the applicable organizational units, then select **Continue**.
  7. Under **Access to Google data**, choose the approved access setting.
  8. Select **Continue**, review the settings, then select **Finish**.
- **Required values:** Get the OAuth client ID from the application owner. Get the trial users' organizational units from the Workspace administrator.
- **Access setting:** **Specific Google data** limits access to specified scopes. **Trusted** allows all Google services. The administrator must select the setting permitted by organizational policy. If **Specific Google data** is used, Topic 4 must supply the complete required scope list.
- **Source:** [Control which third-party and internal apps access Google Workspace data](https://support.google.com/a/answer/7281227?hl=en), **Restrict or unrestrict Google services**, and **Manage app access to Google services & add apps**.
- **Exact quotations:**
  > “For example, if you set Calendar access as Restricted, only internal and third-party apps configured with a Trusted or Specific Google data access setting can access Calendar data.”
  > “Requires having the Service Settings administrator privilege.”
  > “For Configured apps, click Configure new app.”
  > “Enter the app's name or client ID, then click Search.”
  > “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
  > “You must include the Google Sign-in scopes required by the app to allow users to sign in with their Google Account.”
- **Interpretation:** Do not require a new application-control entry when the user's current policy already permits the application.

### T3-06 — Preview access limits the trial's users

- **Status:** Required for the current Developer Preview. Additional email registration is conditional.
- **Actor and scope:** The preview applicant supplies their Workspace account and Cloud project information. Google verifies the account and registers the project. The application owner limits access to permitted trial users.
- **Documented action:** Use the application form linked under **How to join the program**. The registered account must accept Google Group membership. Existing members can use **Request to add or remove email addresses** under **Questions and Requests** when they need more registered addresses.
- **Required values:** Get the applicant's Workspace account and project information from the project owner.
- **Sources and exact quotations:**
  - [Configure the Google Calendar MCP server](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), opening notice:
    > “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
  - [Google Workspace Developer Preview Program](https://developers.google.com/workspace/preview), **How to join the program**:
    > “You need to provide us with your Google Workspace account and Google Cloud project information.”
    > “Make sure that your email account accepts getting added to Google Groups.”
    > “After verifying your Google Workspace account, we will register your Google Cloud project.”
  - Same page, **Questions and Requests**:
    > “When you want to register more email addresses or Google Cloud projects to the program, submit a request using one of the forms.”
  - Same page, **Developer Preview Program Terms**, term (iv):
    > “I may not grant end users access, outside my domain or company, to developer applications that have been built using APIs prior to their GA announcement”
- **Interpretation:** Keep this trial within the applicant's domain or company unless Google grants the documented exception. External OAuth audience selection does not remove this preview restriction.

## Unresolved questions

- **Non-blocking — Registration of each connecting user in the preview program.**\
  The preview page establishes account and project registration. It also provides a form for additional email addresses. It does not clearly state that every Calendar MCP connecting user must register separately. Sources checked: Calendar MCP setup page and preview program page. Topic 2 must retain this distinction. Do not state that project registration alone proves eligibility for every user.

- **Non-blocking — Separate MCP user role or paid feature license.**\
  The checked Calendar MCP and preview pages do not identify a separate MCP invocation role or a Calendar MCP-specific paid license. This does not establish that all unmentioned entitlements are unnecessary. The documented trial procedure remains concrete.

- **Non-blocking for a read trial — Write access.**\
  The Calendar MCP page lists write tools but prescribes `calendar.calendarlist.readonly`, `calendar.events.freebusy`, and `calendar.events.readonly`. Calendar `writer` permission alone does not resolve this scope question. Do not promise write operations until Topic 4 resolves it.

- **Non-blocking — Separate release-note confirmation.**\
  The maintained Calendar page and preview feature list still identify Calendar MCP as Developer Preview. No replacement notice was observed. Separate release notes were not read within the research time limit.

## Cross-topic dependencies

- **Topic 1:** Use the established **Calendar** administrator privilege for service enablement and **Service Settings** administrator privilege for application controls. Confirm authority to add OAuth test users and complete preview actions.
- **Topic 2:** Complete account and project preview registration. Apply the restriction on trial users outside the domain or company. Check whether the selected audience fits the trial users.
- **Topic 4:** Keep OAuth test-user assignment separate from later sign-in. Supply all required scopes for **Specific Google data**. Resolve write scopes before promising write tools.
- **Topic 5:** The user permission findings do not change the documented remote endpoint.
- **Coordinator:** Select a read-access trial unless write scope support is established. Use a user-owned calendar for the initial check, or complete shared-calendar access first. Do not present application access approval as a replacement for Calendar permissions.

---

## Topic and status

**Topic 4 — Authentication: complete.**

The selected setup is a manually registered **Web application** OAuth client with the Calendar service-specific read and availability scopes. Use **Internal** when the organization is eligible. Otherwise, use **External**, keep the application in **Testing**, and add test users. Do not publish the preview application.

The supplied coordinator evidence satisfies Google’s offline-access and refresh-token requirements for the remote-session OAuth path when the issuer hostname is `accounts.google.com`. No blocking authentication gap remains.

**Changes from the first report:**
- **T4-05 is updated:** The supplied client implementation evidence resolves the offline-access and refresh-token check.
- **T4-09 is added:** It records the evidence and its conditions.
- The previous blocking client question is closed.
- Findings T4-01 through T4-04 and T4-06 through T4-08 remain unchanged in substance.

All source observations are dated **2026-09-11**. Google’s offline-access and expiration statements were checked again during this follow-up. The client evidence was supplied by the coordinator; no independent client implementation research or test run was performed.

## Findings

### T4-01 — Use the documented OAuth 2.0 connection

- **Status:** Required for the documented setup.
- **Actor and scope:** The application owner configures the OAuth application. The connecting user gives that application access to Calendar data.
- **Documented action:** Configure the OAuth consent screen before creating the OAuth client.
- **Source:** [Configure the Google Calendar MCP server](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Set up the OAuth consent screen**.
- **Observation date:** 2026-09-11.
- **Exact quotation:** “The Google Calendar MCP server uses OAuth 2.0 for authentication and authorization. You must configure the OAuth consent screen before you can create an OAuth client ID.”
- **Interpretation:** Use the documented manual OAuth registration path. The page does not establish an API-key, service-account, or static-token setup for this MCP connection.

### T4-02 — Configure the audience and test users

- **Status:** Required. Test-user entry is conditional on an **External** audience.
- **Actor and scope:** The application owner configures the project’s OAuth consent settings. Named test users receive access to the test application.
- **Documented action:**
  - Open **Google Auth Platform > Branding**.
  - If the platform is not configured, select **Get Started**.
  - Under **App Information**, enter `Calendar MCP Server` in **App name**.
  - Select a suitable **User support email**.
  - Under **Audience**, select **Internal**. Select **External** if **Internal** is not available.
  - Enter the contact email address under **Contact Information**.
  - Review the Google API Services User Data Policy. If authorized to accept it, select the agreement, then **Continue**, then **Create**.
  - For **External**, open **Audience > Test users > Add users**. Enter the authorized test-user email addresses, then select **Save**.
- **Environment-specific values:** Obtain the support address, contact address, and test-user addresses from the application owner.
- **Source:** Calendar setup page, **Set up the OAuth consent screen**.
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “If you selected External for user type, add test users”.
  - “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** Follow the documented trial procedure. For the selected External path, keep **Testing** status and apply T4-06. Topic 1 owns authority to configure these settings and accept the policy.

### T4-03 — Add the Calendar MCP scopes

- **Status:** Required for the service-specific documented setup.
- **Actor and scope:** The application owner configures OAuth data access. The connecting user authorizes the requested access.
- **Documented action:** Open **Data Access > Add or Remove Scopes**. Under **Manually add scopes**, enter:
  ```text
  https://www.googleapis.com/auth/calendar.calendarlist.readonly
  https://www.googleapis.com/auth/calendar.events.freebusy
  https://www.googleapis.com/auth/calendar.events.readonly
  ```
  Select **Add to Table**, then **Update**. On **Data Access**, select **Save**.
- **Source:** Calendar setup page, **Set up the OAuth consent screen**.
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “Under Manually add scopes, paste the scopes for the Google Calendar MCP server”.
  - “After selecting the scopes required by your app, on the Data Access page, click Save.”
  - The three scope values above are exact source values.
- **Interpretation:** Use these Calendar-specific values. The selected setup covers read and availability access. Do not promise event creation, change, or deletion.

### T4-04 — Register a Web application client and the correct callback

- **Status:** Required for the selected manual registration path.
- **Actor and scope:** The application owner creates the OAuth client in the selected Google Cloud project. Speakeasy receives the client ID and secret.
- **Documented action:** Open **Google Auth Platform > Clients > Create Client**. Select **Web application**. Enter a **Name**. Under **Authorized redirect URIs**, select **+ Add URI**. Enter the client callback. Select **Create**, then copy the **Client ID** and **Client Secret**.
- **Required callback for this client:**
  ```text
  {{ gram.oauth.callback_url }}
  ```
- **Environment-specific values:** Google supplies the client ID and secret. The supplied client context provides the Speakeasy callback value. Do not copy the Claude or Antigravity callback from Google’s examples.
- **Sources:**
  - Calendar setup page, **Configure your MCP client > Claude**.
  - [Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server), **Step 1: Set authorization parameters**, `redirect_uri`.
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “Select Web application as the application type.”
  - “Click Create and copy your Client ID and Client Secret.”
  - “The value must exactly match one of the authorized redirect URIs”.
  - “Note that the http or https scheme, case, and trailing slash ('/') must all match.”
- **Interpretation:** Google’s manual registration procedure applies. Use the supplied Speakeasy callback in that procedure.

### T4-05 — Obtain refresh tokens through offline access

**Updated finding.**

- **Status:** Required for the selected refresh-token setup.
- **Actor and scope:** Speakeasy sets the authorization parameters. The connecting user completes Google’s consent process. The refresh token applies to that user’s authorization of the application.
- **Required authorization value:**
  ```text
  access_type=offline
  ```
- **Consent condition:** Google returns the refresh token on the first authorization. Google documents `prompt=consent` to show the consent screen.
- **Documented action:** Complete the Google browser authorization when Speakeasy requests it. No separate reader action is needed to set offline access or the consent parameter; T4-09 establishes automatic client handling.
- **Source:** [Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server), **Step 1: Set authorization parameters**, `access_type` and `prompt`; **Refresh an access token (offline access)**.
- **Observation date:** 2026-09-11; checked again during this follow-up.
- **Exact quotations:**
  - “Valid parameter values are online, which is the default value, and offline.”
  - “This value instructs the Google authorization server to return a refresh token and an access token the first time that your application exchanges an authorization code for tokens.”
  - “The refresh_token is only returned on the first authorization.”
  - For `consent`: “Prompt the user for consent.”
  - “Requesting offline access is a requirement for any application that needs to access a Google API when the user is not present.”
- **Interpretation:** Google requires an authorization parameter for offline access. The supplied client evidence shows that Speakeasy adds that parameter and consent automatically for the selected Google OAuth path.

### T4-06 — External Testing refresh tokens expire after seven days

- **Status:** Conditional. Applies when the OAuth audience is External and the publishing status is Testing.
- **Actor and scope:** The application owner selects the application status. The limit affects the connecting user’s refresh token.
- **Documented condition:** Calendar scopes do not meet the profile-only exception.
- **Source:** [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2), **Refresh token expiration**.
- **Observation date:** 2026-09-11; checked again during this follow-up.
- **Exact quotation:** “A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of "Testing" is issued a refresh token expiring in 7 days, unless the only OAuth scopes requested are a subset of name, email address, and user profile”.
- **Interpretation:** Automatic refresh does not remove the seven-day Testing limit. Keep the selected trial setup; do not publish the preview application to avoid this limit.
- **Warning:** **For an External application in Testing, the refresh token expires after seven days. Another sign-in will be required.**
- **Limit:** This finding does not establish an indefinite token lifetime for Internal applications.

### T4-07 — Tokens have other access limits

- **Status:** Conditional. Applies when an expiration or access-control condition occurs.
- **Actor and scope:** These limits affect the connecting user’s application authorization.
- **Documented limits:**
  - Access tokens expire.
  - Refresh tokens can stop working after access is revoked.
  - An unused refresh token can stop working after six months.
  - Time-based access ends when its approved period ends.
  - An administrator can restrict a requested service.
  - Google limits refresh tokens to 100 per Google Account per OAuth client ID.
- **Sources:**
  - OAuth overview, **Refresh token expiration**.
  - Web-server OAuth page, **Refresh an access token (offline access)** and **Step 5: Exchange authorization code for refresh and access tokens**.
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “Access tokens periodically expire and become invalid credentials for a related API request.”
  - “The refresh token has not been used for six months.”
  - “There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.”
  - “If the limit is reached, creating a new refresh token automatically invalidates the oldest refresh token without warning.”
  - For `refresh_token_expires_in`: “This value is only set when the user grants time-based access.”
- **Interpretation:** Refresh tokens reduce repeated sign-ins. They do not guarantee permanent access. Do not add credential-maintenance procedures to the setup guide.

### T4-08 — Google publishes OAuth endpoint metadata

- **Status:** Conditional. Applies if manual endpoint configuration or discovery checks are needed.
- **Actor and scope:** The coordinator checks Speakeasy’s OAuth identity-provider configuration.
- **Source:** [Google OpenID configuration](https://accounts.google.com/.well-known/openid-configuration), JSON fields.
- **Observation date:** 2026-09-11.
- **Exact source values:**
  ```text
  issuer: https://accounts.google.com
  authorization_endpoint: https://accounts.google.com/o/oauth2/v2/auth
  token_endpoint: https://oauth2.googleapis.com/token
  ```
  The document lists these supported values:
  ```text
  token_endpoint_auth_methods_supported:
  client_secret_post
  client_secret_basic

  grant_types_supported:
  authorization_code
  refresh_token
  ```
- **Interpretation:** Google publishes support for authorization-code and refresh-token flows. The issuer hostname also meets the client condition in T4-09. This metadata does not, by itself, establish discovery from the Calendar MCP endpoint or Dynamic Client Registration. Keep the selected manual registration path.

### T4-09 — The supplied client evidence satisfies the refresh-token check

**New finding.**

- **Status:** Required compatibility condition; satisfied by the supplied coordinator evidence.
- **Actor and scope:** Speakeasy performs upstream Google authorization and token refresh through its remote-session OAuth path.
- **Conditions:** The Google issuer hostname is `accounts.google.com`. The connection uses the remote-session OAuth path.
- **Documented implementation actions:**
  - Add offline access and consent to the Google authorization request.
  - Apply the Google interceptor when the remote-session path builds the upstream authorization URL.
  - Encrypt and save the returned refresh token.
  - Use the saved token for an upstream refresh-token request.
  - Keep the current refresh token when the response does not contain a new one.
- **Evidence source:** Coordinator-supplied source review of the official [Speakeasy Gram repository](https://github.com/speakeasy-api/gram), commit `496e62ca5d5ebd99f0c189f2614fc9c707e44659`.
- **Observation date:** 2026-09-11.
- **Exact locations and supplied code quotations:**
  - [`google.go`, lines 26–52](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google.go#L26-L52):
    - `strings.EqualFold(u.Hostname(), "accounts.google.com")`
    - `q.Set("access_type", "offline")`
    - The supplied review also identifies the addition of `consent` to `prompt`.
  - [`challenge.go`](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go), lines 261–263:
    - `interceptors.NewGoogle(logger)`
    - Lines 718–797 build the upstream authorization URL and apply matching interceptors. The supplied review found no registration-mode condition around this call.
    - Lines 957–965 encrypt the returned refresh token; line 1055 saves it.
  - [`tokenservice.go`, lines 537–635](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/tokenservice.go#L537-L635):
    - `form.Set("grant_type", "refresh_token")`
    - `form.Set("refresh_token", refreshToken)`
    - The supplied review identifies retention of the current refresh token when no new token is returned.
- **Comparison with Google requirements:** The automatic `offline` parameter and consent handling meet T4-05. Saving and using the refresh token support continued access after an access token expires. This implementation applies to the selected manually registered client on the stated path.
- **Limit:** This is source-review evidence, not a live connection test. No concrete deployed-version mismatch was reported. That limit does not prevent the selected setup.

## Unresolved questions

### Closed — Speakeasy offline access and refresh-token compatibility

T4-09 resolves the previous blocking check. The evidence covers initial offline access, consent, token storage, and upstream refresh-token use. Do not add a reader step to configure automatic authorization parameters.

### Non-blocking — Write operations

The selected path uses Google’s documented read and availability scopes. The setup will not promise write operations. The scope requirements for write tools remain outside this selected path.

**Sources checked:** Calendar MCP setup page, including its scope list and client instructions.

### Non-blocking — Other credential methods

The Calendar setup page does not establish an API-key, static-token, or service-account setup for this remote connection. The documented OAuth path is sufficient. Do not claim that unmentioned methods are supported or prohibited.

### Non-blocking — Runtime verification

The coordinator supplied source review and identified relevant tests. Tests were not run, and this research did not perform a live sign-in. No evidence of a deployed-version mismatch was supplied. No required compatibility check remains unresolved on that basis.

### Non-blocking — Separate release-note confirmation

The Calendar page showed “Last updated 2026-09-11 UTC.” No replacement notice was observed. Separate release-note confirmation remains incomplete.

## Cross-topic dependencies

- **Topic 1:** Establish authority to configure consent settings, add scopes, create the OAuth client, and accept the Google API Services User Data Policy.
- **Topic 2:** Keep the selected trial setup. Use Internal when eligible; otherwise use External Testing. Do not publish the preview application.
- **Topic 3:** Confirm Internal-user eligibility or External test-user entries. Keep the selected access description limited to read and availability operations.
- **Topic 5:** Use OAuth with the documented remote Calendar MCP endpoint.
- **Coordinator:** Use the manual Web application OAuth path and the Speakeasy callback. Use the Google issuer identified in T4-08. Treat offline access, consent parameters, and token refresh as automatic client actions under T4-09. Include the seven-day warning for External Testing.

---

## Topic and status

**Topic 5 — MCP endpoint and connection configuration: complete.**

Google documents a remote Google Calendar MCP server. The documented URL supports the requested connection method. A local server, proxy, or bridge is not part of this connection path.

All sources below were observed on **2026-09-11**. The Calendar setup page states: “Last updated 2026-09-11 UTC.”

## Findings

### T5-01 — Remote Calendar server address

- **Status:** Required.
- **Actor and scope:** The IT administrator adds the remote server to the client. The connecting user gives the application access to Calendar data.
- **Documented values:**
  - Server name: `calendar`
  - Server URL: `https://calendarmcp.googleapis.com/mcp/v1`
  - Transport: HTTP
  - Authentication: OAuth 2.0
- **Source:** [Configure the Google Calendar MCP server](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server), **Configure your MCP client > Others**.
- **Exact quotations:**
  - “Server URL: `https://calendarmcp.googleapis.com/mcp/v1`”
  - “Transport: HTTP”
  - “The Google Calendar remote MCP server uses OAuth 2.0.”
- **Interpretation:** Use the fixed URL as written. This is an MCP endpoint, not a general Calendar API address. The source gives no tenant, region, workspace, or project variable in this URL.

### T5-02 — Enable services in the selected project

- **Status:** Required.
- **Actor and scope:** An administrator with suitable authority enables services in the Google Cloud project. Topic 1 must confirm the authority.
- **Documented action:** Enable **Google Calendar API** and **Google Calendar MCP API**.
- **Required service values:**
  - `calendar-json.googleapis.com`
  - `calendarmcp.googleapis.com`
- **Browser links supplied by the documentation:**
  - [Enable Google Calendar API](https://console.cloud.google.com/flows/enableapi?apiid=calendar-json.googleapis.com)
  - [Enable Google Calendar MCP API](https://console.cloud.google.com/flows/enableapi?apiid=calendarmcp.googleapis.com)
- **Source:** Calendar setup page, **Configure the Google Calendar MCP server**, **Enable the APIs**, and **Enable the MCP services**.
- **Exact quotations:**
  - “To use the Google Calendar MCP server, you must enable it in your Google Cloud project and then configure your MCP client to connect to it.”
  - “Google Calendar API”
  - “Google Calendar MCP API”
- **Interpretation:** Google hosts the endpoint. Project-level enablement is required before use. The reader does not create a separate tenant URL. The page supplies Console options; the CLI examples do not establish a requirement to run a local MCP process.

### T5-03 — OAuth client connection

- **Status:** Required.
- **Actor and scope:** The application owner configures an OAuth client. The connecting user authorizes access.
- **Documented action:** The browser-based Claude example creates a **Web application** OAuth client, registers a redirect URI, and supplies the client ID and client secret in the remote connector.
- **Source:** Calendar setup page, **Configure your MCP client > Claude**.
- **Exact quotations:**
  - “Select Web application as the application type.”
  - “Remote MCP server URL: `https://calendarmcp.googleapis.com/mcp/v1`”
  - “In Advanced settings, enter your OAuth client ID and OAuth client secret.”
- **Interpretation:** This example confirms a direct remote connection with a manually registered OAuth client. Do not copy the Claude callback into Speakeasy. Topic 4 and the coordinator must use the supplied Speakeasy callback value.

### T5-04 — Separate Google Workspace MCP servers

- **Status:** Conditional. Connect another server only if the requested application needs that product.
- **Actor and scope:** The administrator selects the product servers for the client. Each server gives access to its own product.
- **Source:** [Configure Google Workspace MCP servers](https://developers.google.com/workspace/guides/configure-mcp-servers), **Configure your MCP client** and **Supported products**.
- **Exact quotation:** “Each Google Workspace product has its own dedicated MCP server.”

The page documents these servers:

| Server | Documented URL | Documented tool functions |
|---|---|---|
| Gmail | `https://gmailmcp.googleapis.com/mcp/v1` | Search threads, read messages, create drafts, and change labels |
| Google Drive | `https://drivemcp.googleapis.com/mcp/v1` | Search, read, create, copy, and download files; read permissions |
| Google Docs | `https://docsmcp.googleapis.com/mcp/v1` | Read and update documents |
| Google Sheets | `https://sheetsmcp.googleapis.com/mcp/v1` | Read spreadsheets and values; update spreadsheets, values, and formulas |
| Google Slides | `https://slidesmcp.googleapis.com/mcp/v1` | Read and update presentations |
| **Google Calendar** | **`https://calendarmcp.googleapis.com/mcp/v1`** | List calendars; read, create, change, delete, and respond to events; suggest times |
| Google Chat | `https://chatmcp.googleapis.com/mcp/v1` | Search conversations and messages, send messages, change read status, and list memberships |
| People API | `https://people.googleapis.com/mcp/v1` | Read profiles and search contacts and directory people |

- **Exact source values:** The URL column reproduces the server URLs from **Configure your MCP client**.
- **Exact tool quotations:** The inventory includes `create_draft`, `search_files`, `read_doc`, `update_values`, `read_presentation`, `list_events`, `send_message`, and `search_directory_people`.
- **Interpretation:** These are separate product servers, not tenant or environment variants. Only Calendar applies to the requested setup.
- **Documented differences:** The shared page specifies HTTP and OAuth 2.0. It lists separate service enablement values for the products. It also states: “To use the Google Chat MCP server, you must configure a Chat app in your Google Cloud project.”
- **Limit:** Do not apply Calendar scopes or setup to another product. The detailed access requirements for these other products are outside this Calendar research.

### T5-05 — Calendar scope values need server-specific treatment

- **Status:** Required for the documented Calendar setup.
- **Actor and scope:** The application owner configures OAuth data access for the application.
- **Documented action:** Under **Manually add scopes**, add:
  - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
  - `https://www.googleapis.com/auth/calendar.events.freebusy`
  - `https://www.googleapis.com/auth/calendar.events.readonly`
- **Source:** Calendar setup page, **Set up the OAuth consent screen**.
- **Exact quotation:** “Under Manually add scopes, paste the scopes for the Google Calendar MCP server”.
- **Interpretation:** These are the service-specific documented values. They must not be replaced with the broader shared Workspace scope list without a stated reason.

### T5-06 — Preview access and security controls

- **Status:** Required.
- **Actor and scope:** The organization or application owner completes the applicable preview and security setup.
- **Sources:**
  - Calendar setup page, opening notice and **Important security consideration: Indirect prompt injection**.
  - [Configure security for Google Workspace MCP servers](https://developers.google.com/workspace/guides/configure-mcp-security), opening section.
- **Exact quotations:**
  - “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
  - “You must screen prompts and responses for malicious content or prompt injection attacks.”
  - “You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Interpretation:** A remote URL alone does not complete setup. Topic 2 must establish the applicable preview and security configuration. Model Armor is one documented option, not the only option.

## Unresolved questions

- **Non-blocking — Additional connection headers or URL parameters.**\
  The Calendar **Others** configuration lists the URL, HTTP, and OAuth 2.0. The remote Claude example adds client credentials. These examples do not specify additional headers or URL parameters. No additional setting is established by this research. This does not prove that all unmentioned settings are unnecessary.

- **Non-blocking for endpoint setup — Write tools and read-only scopes.**\
  The service page lists event creation, update, and deletion tools, but its scope instructions list read-only and availability scopes. The URL and documented read-access setup remain concrete. Topic 3 and Topic 4 must check the permissions if the final guide promises write access.

- **Non-blocking — Complete requirements for other product servers.**\
  Their URLs and functions are documented. This research did not establish every product-specific permission or scope. Those servers are not part of the requested Calendar setup.

- **Non-blocking — Separate release-note confirmation.**\
  The live Calendar page shows an update date of 2026-09-11 and no replacement notice was observed. Separate release notes were not checked before the research time ended.

**No blocking endpoint gap remains.**

## Cross-topic dependencies

- **Topic 1:** Confirm authority to enable the Calendar API and Calendar MCP API. Confirm authority for any preview and security setup.
- **Topic 2:** Use the Calendar-only service enablement path. Check the linked [Developer Preview Program](https://developers.google.com/workspace/preview) and the mandatory security-screening requirement.
- **Topic 3:** Check user access to Calendar data. Resolve the scope question before a guide promises write operations.
- **Topic 4:** Use the Calendar-specific OAuth instructions and scopes. Register the Speakeasy callback, not the callback from a provider client example. Check token and refresh-token requirements.
- **Coordinator:** Select the direct remote URL path. Confirm that Speakeasy can complete Google's required OAuth flow. Confirm how the required prompt and response screening will operate. Other Workspace servers do not need to be added for this Calendar-only request.

Research phase completed at 1326 elapsed seconds.
