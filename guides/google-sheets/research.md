# Google Sheets research dossier

Status: complete for the selected setup path. Observation date: 2026-09-11.

## Run context

Provider: Google. Service: Google Sheets. Slug: google-sheets. Mode: update. Destination: /workspace/guides/google-sheets/. Reader: doctrine/personas/it-admin.md. Client: Speakeasy AI Control Plane. Existing metadata was used only to confirm identity. No existing instructions or reports were used as evidence.

## Consolidation and source rules

The action table below is the canonical setup sequence. Topic reports supply requirements, exact quotations, conditions, access recipients, and sources. Use the final Topic 1 audit to resolve broad administrator labels. Use the final Topic 4 report for authentication. Initial Topic 4 blocking findings are superseded. Topic 2 records an alternative screening solution; it is not selected. Use Model Armor only in this guide. Topic 2 test-user configuration belongs to connecting-user access. Each repeated requirement maps to one action in the table. No material setup blocker remains.

# Selected setup actions

Authentication selection is resolved by Topic 4 follow-up 1. Use a manually registered Web application OAuth client. Use Internal where eligible; otherwise External Testing for eligible users in the same organization only. Google offline access and consent are automatic in the current client implementation. No External production, DCR, service account, or static token alternative is selected.

| Action / anchor | Required action | Source and topic |
|---|---|---|
| A1 / select-project | Select a suitable project; create one only if needed. Obtain help for project IAM grants only if needed. | T2-01; T1-03/04; https://developers.google.com/workspace/guides/create-project and https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects |
| A2 / register-preview | Review and accept applicable preview terms with authority to bind the organization. Apply using an eligible individual Workspace account and project number. Wait for Google confirmation. Keep use within the organization and program restrictions. Government/regulatory entities other than educational institutions must use test data. | T2-02/03; T3-01/06; https://developers.google.com/workspace/preview and linked application |
| A3 / enable-services | Enable sheets.googleapis.com and sheetsmcp.googleapis.com in the registered project. | T2-04; T5-02; https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server |
| A4 / configure-security | Select Google Model Armor for a concrete supported screening path. Enable modelarmor.googleapis.com; configure Model Armor floor settings with MCP sanitization enabled. Select Google MCP Server under Services. Security owner chooses filters and logging policy. Preserve payload logging warning. Do not include setup for an unused alternative. | T2-09/10; T1-07; https://developers.google.com/workspace/guides/configure-mcp-security and https://docs.cloud.google.com/model-armor/configure-floor-settings |
| A5 / configure-oauth | Configure branding, audience, and consent. Add the four Sheets scopes: drive.readonly, drive.file, spreadsheets.readonly, spreadsheets (full URLs as in T4). Use Internal where eligible; otherwise External Testing for same-organization users. | T2-05; T4-02/03; Sheets MCP setup page and https://support.google.com/cloud/answer/15549945 |
| A6 / grant-user-access | If External Testing, add eligible users under Audience > Test users. If Workspace policy blocks access, ask the administrator with Service Settings privilege to permit the app for the required scopes and organizational units. A file owner or authorized editor provides spreadsheet viewing or editing access as required. | T3 report; T2-06/08; https://support.google.com/a/answer/7281227 and https://support.google.com/drive/answer/2494822 |
| A7 / create-oauth-client | Create Web application client under Google Auth Platform > Clients. Register {{ gram.oauth.callback_url }} as an authorized redirect URI. Copy Client ID and Client Secret. | T2-07; T4; Sheets MCP setup page |
| A8 / add-server-in-speakeasy | Add the fixed remote URL https://sheetsmcp.googleapis.com/mcp/v1. Catalog presence is unverified, so use both conditional add paths per doctrine. | T5-01; doctrine/speakeasy-setup.md |
| A9 / connect-speakeasy-credentials | Attach the manual client credentials, use Google issuer/discovery as documented, and sign in with the eligible user. Preserve External Testing seven-day expiry warning. No manual offline-access parameters or refresh-token maintenance. | T4 follow-up 1; doctrine/speakeasy-setup.md |

The final Topic 1 authority audit checked all selected provider actions and is complete. Use its documented narrower roles instead of earlier broad administrator claims. No additional MCP Tool User role is established for this selected Sheets user-OAuth procedure; do not import old guide facts.

## Provider action anchors

These headings declare the IDs already assigned in the selected-action table. They do not change the selected actions or their authority audit.

### Select the project {#select-project}

Use action A1 and its sources in the table above.

### Register for the preview {#register-preview}

Use action A2 and its sources in the table above.

### Enable the Google Sheets APIs {#enable-services}

Use action A3 and its sources in the table above.

### Configure Model Armor {#configure-security}

Use action A4 and its sources in the table above.

### Configure the OAuth consent screen {#configure-oauth}

Use action A5 and its sources in the table above.

### Grant user access {#grant-user-access}

Use action A6 and its sources in the table above.

### Create the OAuth client {#create-oauth-client}

Use action A7 and its sources in the table above.

## Rendering contract

Use each action anchor exactly. Each provider section has a screenshot placeholder for its documented settings with values redacted. Do not invent a UI label. A6 may follow A7 because Workspace policy uses the client ID. Client credential fields: client-id and client-secret, both produced by external.md#create-oauth-client. Remote: fixed shared https://sheetsmcp.googleapis.com/mcp/v1. Manual OAuth option ID: oauth-client. Protocol transport is not an endpoint gate; do not infer transport from an old guide. Catalog presence was not checked; render both conditional add paths under auto. Use Configure Manually and Manual for the registered OAuth client. Use the supplied Google discovery evidence when relevant. For this manual path, use the transcluded issuer, discovery, and scope controls with the Google values in final Topic 4. If a control differs, describe its documented function without an invented label or scope separator. Keep the callback template as documented. Source UI procedures below are authoritative for user actions; client automatic behavior is not an extra action.

## Remaining non-blocking questions

Catalog presence was not checked. Exact deployed UI was not observed. Current upstream source has legacy callback compatibility, while UI doctrine has July source dates; no incompatible deployed behavior was established. Client tests were read, not run. No fixed client-secret lifetime or separate Sheets invocation role was established. Do not state these are unnecessary. No paid edition was established. Preview applicant registration does not prove every connecting user must apply separately. Model Armor pricing exists; do not say it is free. Obtain help if a separate billing change is needed. Speakeasy setup requires access to Sources and Authentication; no exact named Speakeasy role is established. See individual reports for all non-blocking questions.

## Execution record

Research began at 2026-09-11T18:42:08Z. Topics 1 and 3 initially failed with provider in-flight budget errors. Exact errors were saved immediately to .factory/dispatch-errors.jsonl. Both succeeded on one retry after other calls settled. No recoverable complete report existed for either failed attempt. No private session store or raw log was read. Authentication follow-up 1 completed before Topic 1 final audit follow-up 1. No third follow-up round was used. Native per-dispatch deadlines are unavailable. All work stayed in the foreground. No reviewer agents were used.

## Canonical client setup source

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

## Central client implementation evidence

# Central client evidence

Observed: 2026-09-11. Official source commit: `496e62ca5d5ebd99f0c189f2614fc9c707e44659` in https://github.com/speakeasy-api/gram.

Base for each pinned citation: https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/

- `server/internal/remotesessions/interceptors/google.go#L26-L52`: issuer hostname must equal `accounts.google.com`, case-insensitive. Excerpts: `q.Set("access_type", "offline")`; `prompts = append(prompts, "consent")`. The interceptor requests offline access and consent automatically.
- `server/internal/remotesessions/challenge.go#L261-L263`: `interceptors.NewGoogle(logger)` is registered in the challenge manager without a provider feature flag in this constructor.
- `server/internal/remotesessions/challenge.go#L650-L795`: `BuildAuthorizationUrl` calls `mintAuthorization`. The path sets `client_id` from `client.ExternalClientID`, uses `client.RequestedScopes()`, and applies every matching authorize interceptor at lines 789–792. This is the outgoing upstream request to Google, not the downstream client authorization response. The interceptor is not conditional on DCR.
- `server/internal/remotesessions/clienthandlers.go#L157-L230`: `CreateRemoteSessionClient` is the manual create path. The separate CIMD path is distinguished explicitly: `Unlike the manual create path the caller supplies no client_id`.
- `server/internal/remotesessions/challenge.go#L950-L1060`: the callback encrypts `tok.RefreshToken` and stores `RefreshTokenEncrypted`. It records token lifetime and scope values from the upstream response.
- `server/internal/remotesessions/tokenservice.go#L128-L151`: `ResolveAccessToken` returns the stored upstream token and refreshes it when it expires and a refresh token is present. On-demand refresh is not a user setup action. Proactive refresh has separate AutoRefresh state; do not confuse it with this path.
- `server/internal/remotesessions/refreshservice.go#L355-L404`: the refresh service checks that a refresh token exists and calls the token-refresher path for the stored grant.
- `server/internal/remotesessions/interceptors/google_test.go#L13-L77`: tests match the Google issuer, reject other issuers, assert `access_type=offline` and `prompt=consent`, and preserve an existing `select_account` prompt.
- `server/internal/remotesessions/challenge_issuer_strategy_e2e_test.go#L56-L141`: tests scope behavior, including `TestRemoteLogin_ScopeOverrideIsRequestedVerbatim` and storage of response scopes.

Assessment: current upstream implementation establishes automatic Google offline access and consent for manually registered remote clients whose issuer is Google. Do not add a manual authorization-parameter step. Google can still expire or revoke refresh tokens. The setup UI source remains doctrine/speakeasy-setup.md, not this implementation trace.

Release note: this source uses a remote-session architecture with explicit legacy callback compatibility. The supplied UI doctrine cites July commits, while the current source is from September. The trace establishes current source behavior but is not a deployed UI observation. No credential or provider setting was changed. Tests were read, not executed.

## Topic 1 final authority report

## Topic and status

**Topic 1: Setup permissions and administrative access — complete.**

The final authority audit covers all selected Google setup actions. No material authority gap prevents the documented setup.

Use the narrower roles below. Do not describe every person as an administrator. A project role does not give authority to accept terms for an organization, change Workspace app policy, or share spreadsheets.

**Observation date for all sources: 2026-09-11.**

### Changes to the previous report

- **T1-01 clarified:** Service enablement now includes the selected Model Armor API.
- **T1-02 clarified:** The selected OAuth path is a manually registered **Web application** client. OAuth Config Editor covers configuration and test-user changes. External production is not selected.
- **T1-05 expanded:** Organizational acceptance authority also applies when the setup person accepts the Google API Services User Data Policy.
- **T1-07 corrected:** Model Armor is now required for the selected setup, not an undecided option. Its floor-setting role covers the selected configuration.
- **T1-08 expanded:** Added official evidence for spreadsheet sharing authority.
- **T1-09 added:** Final action-to-authority audit.
- The previous question about selection of a security solution is resolved.

## Findings

### T1-01 — Enable the selected services with project-level service authority

- **Status:** Required.
- **Who acts:** The setup person with service-enablement permission, or another person who has that permission.
- **Access recipient and scope:** The setup person receives access on the registered Google Cloud project.
- **Required permission:** `serviceusage.services.enable`.
- **Documented role:** Service Usage Admin (`roles/serviceusage.serviceUsageAdmin`).
- **Documented action and values:** Enable:
  - `sheets.googleapis.com`
  - `sheetsmcp.googleapis.com`
  - `modelarmor.googleapis.com` for the selected security path.
- **Environment value:** Use the Google Cloud project selected for setup and registered for preview access. Obtain its project ID from Google Cloud.

**Sources and exact quotations:**

- https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server — **Enable the APIs** and **Enable the MCP services**:
  > `gcloud services enable sheets.googleapis.com --project=PROJECT_ID`

  > `gcloud services enable sheetsmcp.googleapis.com --project=PROJECT_ID`

- https://cloud.google.com/service-usage/docs/enable-disable — **Required roles**:
  > “ask your administrator to grant you the Service Usage Admin (`roles/serviceusage.serviceUsageAdmin`) IAM role on your project.”

- https://docs.cloud.google.com/model-armor/configure-floor-settings — **Before you begin > Enable APIs**:
  > “You must enable the Model Armor API before you can use Model Armor.”

  Under **Roles required to enable APIs**:
  > “To enable APIs, you need the `serviceusage.services.enable` permission.”

**Interpretation:** OAuth configuration permission does not establish API-enablement permission. If the reader lacks this permission, an authorized project person must enable the services or grant the required access.

### T1-02 — Use OAuth Config Editor for the selected application setup

- **Status:** Required for the person who creates or changes the OAuth configuration.
- **Who acts:** The authorized OAuth setup person. This person need not hold a broad administrator role.
- **Access recipient and scope:** Grant the person OAuth configuration access on the setup project.
- **Documented role:** OAuth Config Editor (`roles/oauthconfig.editor`). The role reference marks it **Beta**.
- **Selected actions:**
  - Configure **Branding**, **Audience**, and **Data Access**.
  - Select **Internal** where eligible; otherwise use **External Testing** for eligible users within the organization.
  - Add eligible test users when External Testing applies.
  - Configure the four Sheets scopes.
  - Create a **Web application** OAuth client.
  - Register the authorized redirect URI.
  - Obtain the client ID and client secret.
- **Environment values:** Obtain support and contact addresses from the application owner. Use `{{ gram.oauth.callback_url }}` from the supplied client context for the redirect URI.

**Required scope values:**

```text
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/spreadsheets.readonly
https://www.googleapis.com/auth/spreadsheets
```

**Sources and exact quotations:**

- https://docs.cloud.google.com/iam/docs/roles-permissions/oauthconfig — **OAuth Config Editor**:
  > “Read/write access to OAuth config resources”

  Listed permissions include:

  ```text
  clientauthconfig.brands.create
  clientauthconfig.brands.update
  clientauthconfig.clients.create
  clientauthconfig.clients.createSecret
  clientauthconfig.clients.getWithSecret
  clientauthconfig.clients.update
  oauthconfig.testusers.update
  ```

- https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server — **Set up the OAuth consent screen**:
  > “You must configure the OAuth consent screen before you can create an OAuth client ID.”

  > “Under Audience, select Internal. If you can't select Internal, select External.”

  > “Enter your email address and any other authorized test users, then click Save.”

  > “Under Manually add scopes, paste the scopes for the Google Sheets MCP server”

  The source then lists the four values above.

- Same page — **Configure your MCP client**:
  > “Select Web application as the application type.”

**Interpretation:** OAuth Config Editor supports the selected configuration, test-user, and client actions. It is narrower than project Editor or Owner. It does not establish organizational terms authority or Workspace app-policy authority. External production and its verification actions are not selected.

### T1-03 — Obtain help to grant project roles

- **Status:** Conditional. Applies when the reader lacks the required project roles.
- **Who acts:** A person authorized to manage IAM access on the project.
- **Access recipient and scope:** The setup person receives the required roles on the selected project.
- **Documented role for the person who grants access:** Project IAM Admin (`roles/resourcemanager.projectIamAdmin`).
- **Documented action:** Grant the required project roles, or have people who already hold them complete the relevant actions.

**Source and exact quotation:**

- https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access — **Required roles**:
  > “To manage access to a project: Project IAM Admin (`roles/resourcemanager.projectIamAdmin`)”

**Interpretation:** Do not give the setup reader Project IAM Admin only so that they can assign themselves the other roles. Obtain help from an existing project access administrator when needed.

### T1-04 — Project creation needs separate permission

- **Status:** Conditional. Applies only if a suitable project is not available.
- **Who acts:** A person permitted to create a project at the applicable organization or folder.
- **Access recipient and scope:** The project creator receives project-creation permission at the applicable parent resource.
- **Documented role:** Project Creator (`roles/resourcemanager.projectCreator`).
- **Required permission:** `resourcemanager.projects.create`.
- **Documented action:** Select an existing suitable project, or have an authorized person create one.
- **Environment values:** Obtain the project location and proposed project name from the organization's cloud owner.

**Sources and exact quotations:**

- https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server — **Prerequisites**:
  > “A Google Cloud project.”

- https://cloud.google.com/service-usage/docs/enable-disable — **Roles required to select or create a project**:
  > “To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission.”

  > “Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.”

**Interpretation:** Project creation is not mandatory when a suitable project exists. Permission to select a project does not establish permission to change its services.

### T1-05 — Accept applicable terms with organizational authority

- **Status:** Required for preview enrollment and the documented consent-screen setup. Organizational acceptance authority applies when acting for an organization.
- **Who acts:** The preview applicant submits the application. A person with authority to bind the organization accepts the applicable terms. Google verifies the account and registers the project.
- **Access recipient and scope:** The submitted Workspace account and Google Cloud project receive preview access. Terms apply to the person or entity using the APIs.
- **Documented actions:**
  - Read the preview terms.
  - Submit the requested Workspace account and project information.
  - Make sure the account can be added to Google Groups.
  - Receive final project-registration confirmation.
  - During OAuth setup, review and accept the Google API Services User Data Policy only with the required authority.
- **Environment values:** Obtain the account, project number, company information, and organizational approval from the relevant owners. The preview application uses a project number, not the project ID used in service commands.

**Sources and exact quotations:**

- https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server — opening notice:
  > “Developer Preview: Available as part of the Google Workspace Developer Preview Program”

- https://developers.google.com/workspace/preview — **How to join the program**:
  > “Read through the Program Terms before applying. We will ask you if you agree with the terms in the application form.”

  > “You need to provide us with your Google Workspace account and Google Cloud project information.”

  > “After verifying your Google Workspace account, we will register your Google Cloud project.”

  > “When it is done, you will receive a final confirmation to your registered email address.”

- Same page — **Developer Preview Program Terms**, item (iii):
  > “I agree to the Google APIs Terms of Service.”

- https://developers.google.com/terms — **Section 1 > b. Entity Level Acceptance**:
  > “If you are using the APIs on behalf of an entity, you represent and warrant that you have authority to bind that entity to the Terms”

- Sheets setup page — **Set up the OAuth consent screen**:
  > “Under Finish, review the Google API Services User Data Policy and if you agree, select I agree to the Google API Services: User Data Policy.”

- https://developers.google.com/terms/api-services-user-data-policy — introduction:
  > “The policy below, as well as the Google APIs Terms of Service, govern the use of Google API Services when you request access to Google user data.”

**Interpretation:** A Cloud IAM role does not establish authority to bind the organization. Obtain help from an authorized organizational representative if the reader lacks that authority. The preview procedure does not name a required Workspace administrator role for the applicant.

The applicant and application owner must also preserve the preview limits. The preview terms prohibit public applications before general availability and restrict access outside the domain or company. Term (vii) permits only test or experimental data for government or regulatory entities, excluding educational institutions. Topics 2 and 3 own those use restrictions.

### T1-06 — Workspace application controls can require a separate administrator

- **Status:** Conditional. Applies when Workspace policy blocks the application or its required data access.
- **Who acts:** A Workspace administrator with the **Service Settings** administrator privilege.
- **Access recipient and scope:** The OAuth application receives the approved access setting for the relevant organizational units.
- **Documented action:** Use **Security > Access and data control > API controls > Manage App Access**. Configure the app with its client ID and select the intended organizational units and access setting.
- **Environment values:** Obtain the client ID from the OAuth setup person. Obtain the organizational units and approved data access from the Workspace security owner.

**Source and exact quotations:**

- https://support.google.com/a/answer/7281227 — **Manage app access to Google services & add apps** and **Configure a new app**:
  > “Requires having the Service Settings administrator privilege.”

  > “For Configured apps, click Configure new app.”

  > “Enter the app's name or client ID, then click Search.”

  > “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”

**Interpretation:** Do not default to **Trusted** or organization-wide access. Use the approved setting that permits the required scopes for the intended users. Google Cloud OAuth Config Editor does not grant Workspace policy authority.

### T1-07 — Configure the selected Model Armor protection with Floor Setting Admin

- **Status:** Required for the selected security path.
- **Who acts:** A person authorized to manage the applicable Model Armor floor settings. A person with API-enablement permission enables the API.
- **Access recipient and scope:** Grant the security setup person access to the applicable floor settings. The selected procedure uses project-level floor settings.
- **Documented role:** Model Armor Floor Setting Admin (`roles/modelarmor.floorSettingsAdmin`).
- **Documented actions:**
  - Enable `modelarmor.googleapis.com`.
  - Configure floor settings with MCP sanitization enabled.
  - Under **Services**, select **Google MCP Server**.
  - Set the approved filters and logging option.
  - Save the floor settings.
- **Environment values:** The security owner selects the filters and logging policy for the setup project.

**Sources and exact quotations:**

- https://developers.google.com/workspace/guides/configure-mcp-security — opening section:
  > “You must screen prompts and responses for malicious content or prompt injection attacks.”

- Same page — **Configure protection for Google and Google Cloud remote MCP servers**:
  > “Set up a Model Armor floor setting with MCP sanitization enabled.”

- Same page — **Use Model Armor**:
  > “Model Armor logs the entire payload. This might expose sensitive information in your logs.”

- https://docs.cloud.google.com/model-armor/configure-floor-settings — **Before you begin > Obtain the required permissions**:
  > “ask your administrator to grant you the Model Armor Floor Setting Admin (`roles/modelarmor.floorSettingsAdmin`) IAM role on Model Armor floor settings.”

- Same page — **Configure floor settings**:
  > “In the Logs section, select Enable Cloud Logging to log all user prompts, model responses, and the floor settings detector results.”

- Same page — **Define where floor settings are applied**:
  > “Google MCP Server: Floor settings check requests sent to or from Google or Google Cloud remote MCP servers”

- https://docs.cloud.google.com/iam/docs/roles-permissions/modelarmor — **Model Armor Floor Setting Admin**:
  > “Grants full access to all Model Armor Floor Setting resources.”

  Listed permission:
  > `modelarmor.floorSettings.update`

**Interpretation:** The documented role covers the selected floor-setting changes, including the service and logging settings within that configuration. Do not substitute the broader Model Armor Editor role: its name alone does not establish permission to update floor settings. API enablement remains a separate permission under T1-01.

The security owner must approve the logging choice before payload logging is enabled. Viewing logs is not a selected setup action.

### T1-08 — Spreadsheet access requires data authority, not project authority

- **Status:** Required for the connecting user. A sharing change is conditional on missing access.
- **Who acts:** The spreadsheet owner or another person permitted to share the file. The connecting user completes Google sign-in and consent.
- **Access recipient and scope:** The connecting Google account receives the spreadsheet access needed for the selected tools.
- **Documented action:** Share the spreadsheet with the connecting user's email address. Use viewing access for read work and editing access for changes.
- **Environment values:** Obtain the intended Google account and spreadsheet from the application or data owner.

**Sources and exact quotations:**

- https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server — **Respect security**:
  > “Inherit the same permissions and data governance controls as the user.”

- https://support.google.com/drive/answer/2494822?hl=en — **Understand share permissions**:
  > “Important: The roles below apply to files in My Drive.”

  The table permits sharing for owners and editors, subject to owner controls.

- Same page — sharing permission notes:
  > “To let editors change permissions and share a file, owners can click Share Settings and check the box.”

- Same page — **Share with specific people**:
  > “Enter the email address you want to share with.”

  > “Decide how people can use your file. Select one: Viewer Commenter Editor”.

**Interpretation:** Not every editor can share every spreadsheet. The owner can restrict editor sharing, and the cited role table applies to My Drive. For other storage or inherited controls, use a person who has the applicable sharing authority. OAuth consent and Cloud IAM roles do not grant access to an otherwise inaccessible spreadsheet.

### T1-09 — Final authority audit of the selected actions

- **Status:** Required audit; complete.
- **Scope:** Selected actions A1–A9 supplied by the coordinator.
- **Evidence:** Findings T1-01–T1-08 and their official sources establish the provider-side authority below.

| Selected action | Person who must act | Required authority or condition |
|---|---|---|
| **A1 — Select or create project** | Project user; project creator only if needed | Existing project access. Project Creator for a new project. Project IAM Admin help for role grants when needed. |
| **A2 — Register preview** | Eligible applicant and authorized organizational representative | Documented application process; authority to bind the organization when accepting terms for it. Google confirms registration. |
| **A3 — Enable Sheets services** | Person with service-enablement permission | Service Usage Admin on the registered project, or equivalent permission. |
| **A4 — Configure Model Armor** | API setup person and floor-setting setup person | Service Usage Admin for API enablement; Model Armor Floor Setting Admin for the selected settings. Security owner approves filters and logging. |
| **A5 — Configure OAuth** | OAuth setup person | OAuth Config Editor. Obtain organizational authority for terms acceptance. |
| **A6 — Grant user access** | OAuth setup person, Workspace policy administrator, or file-sharing authority, as applicable | OAuth Config Editor for test users; Service Settings privilege for conditional app-policy changes; applicable file-sharing permission for spreadsheets. |
| **A7 — Create OAuth client** | OAuth setup person | OAuth Config Editor. Use the supplied callback and selected Web application type. |
| **A8 — Add server in Speakeasy** | Authorized Speakeasy setup person | Client-side authority is owned by the coordinator. Adding the URL is not a Google organization-setting change. |
| **A9 — Attach credentials and sign in** | Authorized Speakeasy setup person and eligible connecting user | Client-side authority is owned by the coordinator. The user grants access subject to preview, OAuth audience, Workspace policy, and data permissions. |

**Interpretation:** The required help is conditional on the reader's existing authority. A single person can hold several narrow roles, but the guide must not assume that a general “administrator” title covers all actions.

The selected client handles offline access, consent parameters, and token refresh. No additional reader action to configure these parameters is selected. Client implementation verification remains with the coordinator and Topic 4.

## Unresolved questions

### Non-blocking — No named Workspace administrator role for preview enrollment

The preview procedure does not name a Workspace administrator role for the applicant. It gives a concrete application and verification process. The API terms establish organizational acceptance authority.

**Sources checked:** Preview page, **How to join the program** and **Developer Preview Program Terms**; Google APIs Terms, **Entity Level Acceptance**.

Do not invent a super-administrator requirement.

### Non-blocking — No separate Sheets MCP invocation role established

The selected Sheets user-OAuth procedure does not name a separate MCP Tool User role. Its documented controls are preview access, OAuth configuration and consent, Workspace policy, and inherited data permissions.

**Sources checked:** Current Sheets MCP setup page; Workspace app access documentation.

Do not import a role from a different MCP service or an old guide. This is not evidence that all unmentioned roles are explicitly unnecessary.

### Non-blocking — Model Armor billing authority

The Model Armor overview describes pricing. The inspected floor-setting procedure does not identify a billing-account change as a required action in this setup.

**Sources checked:** https://docs.cloud.google.com/model-armor/overview — **Pricing**; Model Armor floor-setting prerequisites. A quickstart lookup did not supply usable additional evidence.

Do not claim that Model Armor is free or that billing is unnecessary. If the project needs a billing change, send that action for a separate authority check. This does not prevent the documented API and floor-setting actions.

### Non-blocking — Client-side administrative authority

The supplied action list includes adding the source and attaching credentials in Speakeasy. Google documentation cannot establish the Speakeasy role needed for those actions.

**Affected actions:** A8 and the client configuration part of A9.

**Disposition:** The coordinator owns this check. No additional Google administrative permission is established merely from these client actions.

### Non-blocking — Independent release-note confirmation

This topic retained the live setup-page evidence and did not independently complete a new release-note check. The checked Sheets page still identifies Developer Preview. No replacement notice appeared in the inspected setup material.

## Cross-topic dependencies

- **Topic 2:** Use T1-01, T1-02, and T1-07 for the selected service, OAuth, and Model Armor actions. Model Armor selection is resolved. Keep the payload-logging warning.
- **Topic 3:** Use T1-02 for test-user changes, T1-06 for conditional Workspace policy changes, and T1-08 for spreadsheet sharing. Do not call every connecting user an administrator.
- **Topic 4:** Authority is established for branding, audience, scopes, test users, Web application creation, callback registration, and client-secret access. No external-production action is selected.
- **Topic 5:** The Sheets service-enablement actions have applicable project authority. No additional MCP invocation role is established for this selected procedure.
- **Coordinator:** Use T1-09 as the final authority mapping. Preserve conditional help and organizational terms authority. Verify Speakeasy-side access for A8–A9. Do not add manual offline-access, consent-parameter, or refresh-token maintenance steps.
- **Topic 1:** Recheck authority only if a new action is added, such as a billing-account change, shared-drive administration, or a broader organization-level security setting.

## Topic 2 organization report

## Topic and status

**Topic 2: Organization-level setup — complete.**

The official Sheets page gives the project, API, OAuth application, and security requirements. The linked preview application gives the account and project registration requirements.

The coordinator must select the security path and check the client requirements. No provider-side setup action in this topic has a blocking evidence gap.

**Observation date for all sources: 2026-09-11.** No provider settings were changed. No credentials were created.

## Sources

- **S1:** https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server
- **S2:** https://developers.google.com/workspace/preview
- **S3:** [Developer Preview Program application](https://docs.google.com/forms/d/e/1FAIpQLSd7BiMXXHDlUDkF7G0TSY5zfJbQwFNH3m6K_ZYFi3vCHLFbng/viewform?resourcekey=0-1uHeVg8junj3PPTLNcn7WQ)
- **S4:** https://developers.google.com/workspace/guides/create-project
- **S5:** https://developers.google.com/workspace/guides/configure-mcp-security
- **S6:** https://docs.cloud.google.com/model-armor/configure-floor-settings
- **S7:** https://support.google.com/a/answer/7281227?hl=en
- **S8:** https://developers.google.com/workspace/release-notes
- **S9:** https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects

The starting page, https://developers.google.com/workspace, links to Sheets and the Developer Preview Program. The research used public documentation, not existing guides.

## Findings

### T2-01 — Use a Google Cloud project

- **Status:** Required. Create a project only if a suitable project is not available.
- **Actor, access, and scope:** An authorized project administrator supplies the Google Cloud project for API enablement and the OAuth application.
- **Documented action:** S4 gives this browser path:
  - **IAM & Admin > Create a Project**.
  - Enter a descriptive **Project Name**.
  - In **Location**, select **Browse**, then select the location.
  - Select **Create**.
- **Environment values:** Obtain the project and location from the organization's cloud owner. Use this project for preview registration and Sheets setup.
- **Source statement:** S1, **Prerequisites**: “A Google Cloud project.”
- **Source statement:** S4, introduction: “A Google Cloud project is required to use Google Workspace APIs”.
- **Source statement:** S4, **Create a Cloud project**: “The project ID can't be changed after the project is created”.
- **Interpretation:** The administrator can use an existing project. The documentation does not require a new project for every connection.

### T2-02 — Register for the Developer Preview Program

- **Status:** Required for the documented preview service.
- **Actor, access, and scope:** The applicant registers one eligible individual account and one or more Google Cloud projects. Google verifies the account and registers the projects.
- **Documented action:**
  - Read the program terms.
  - Open S3 while signed in with the account used for the application.
  - Supply **Given name**, **Surname**, **Company name**, **Company website**, the access email address, and **Google Cloud Project number**.
  - Accept the program terms only with the required organizational authority.
  - Submit the application.
  - Wait for the final project registration confirmation before use.
- **Environment values:** Obtain the company information and project number from the organization. A project number is not the project ID.
- **Source statement:** S1, opening notice: “Developer Preview: Available as part of the Google Workspace Developer Preview Program”.
- **Source statement:** S2, **How to join the program**: “You need to provide us with your Google Workspace account and Google Cloud project information.”
- **Source statement:** S2, same section: “After verifying your Google Workspace account, we will register your Google Cloud project.”
- **Source statement:** S2, same section: “you will receive a final confirmation to your registered email address.”
- **Source statement:** S3, introduction: “Each application allows for the registration of only one individual email address”.
- **Source statement:** S3, **Google Cloud Project number**: “You can register one or more project numbers.”
- **Source statement:** S3, same field: “If you enter multiple project numbers, please separate them with a comma plus a space”.
- **Source statement:** S9, project identifiers: “A project number is an automatically generated unique identifier for your project.”
- **Interpretation:** API enablement alone does not replace preview registration. Registration includes both an individual account and project numbers.

### T2-03 — Keep preview use within the program terms

- **Status:** Required. The production-data restriction is conditional on use for a government or regulatory entity, other than an educational institution.
- **Actor, access, and scope:** The applicant and organization control who can use the preview application and what data it can use.
- **Documented action:** Review the terms before application. Keep preview use within the permitted organization and use conditions.
- **Source statement:** S2, **Developer Preview Program Terms**, clause ii: “program features may not be included in public applications prior to the General Availability (GA) announcement.”
- **Source statement:** S2, clause iv: “I may not grant end users access, outside my domain or company”.
- **Source statement:** S2, clause iv gives an exception only where Google permits a request and grants permission to the Workspace account for that feature.
- **Source statement:** S2, clause vii: “I may only use test or experimental data with Pre-GA APIs”.
- **Interpretation:** A shared external service must not assume that preview approval permits use by customers outside the approved company. The coordinator must check the intended use against these terms.

### T2-04 — Enable the two Sheets services

- **Status:** Required.
- **Actor, access, and scope:** An authorized project administrator enables services in the registered Google Cloud project.
- **Documented action and values:**
  - Enable **Google Sheets API**, `sheets.googleapis.com`, through the [Sheets API enablement page](https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com).
  - Enable **Google Sheets MCP API**, `sheetsmcp.googleapis.com`, through the [Sheets MCP API enablement page](https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com).
- **Source statement:** S1, **Enable the APIs**: “you must enable the following API in your Google Cloud project”, followed by “Google Sheets API”.
- **Source statement:** S1, **Enable the MCP services**: “you must enable the following service in your Google Cloud project”, followed by “Google Sheets MCP API”.
- **Source location:** The two **Console** tabs supply the browser URLs above. The **CLI** tabs confirm the service names.
- **Interpretation:** A browser path is documented. A local shell is not necessary for these enablement actions.

### T2-05 — Configure the OAuth consent screen and Sheets scopes

- **Status:** Required.
- **Actor, access, and scope:** The authorized application administrator configures the Google Auth Platform in the selected project. The application requests access from connecting users.
- **Documented action:**
  - Open **Google Auth Platform > Branding**.
  - If not configured, select **Get Started**.
  - Under **App Information**, set **App name** to `Sheets MCP Server`.
  - Select the administrator's email address or an appropriate Google group for **User support email**.
  - Under **Audience**, select **Internal**. Select **External** if **Internal** is not available.
  - Under **Contact Information**, enter an email address for project notices.
  - Review and, if authorized, accept the Google API Services User Data Policy.
  - Select **Continue**, then **Create**.
  - Open **Data Access > Add or Remove Scopes > Manually add scopes**.
  - Add these exact scopes:

```text
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/spreadsheets.readonly
https://www.googleapis.com/auth/spreadsheets
```

- Select **Add to Table**, then **Update**, then **Save** on **Data Access**.
- **Environment values:** Obtain the support and contact addresses from the application owner.
- **Source statement:** S1, **Set up the OAuth consent screen**: “You must configure the OAuth consent screen before you can create an OAuth client ID.”
- **Source statement:** S1, same section: “Under Audience, select Internal. If you can't select Internal, select External.”
- **Source statement:** S1, same section: “Under Manually add scopes, paste the scopes for the Google Sheets MCP server”, followed by the four values above.
- **Interpretation:** The source gives a Sheets-specific scope list. Do not substitute the list for another Workspace server.

### T2-06 — Add test users for an External audience

- **Status:** Conditional. Applies when **External** is selected in the documented setup.
- **Actor, access, and scope:** The application administrator adds eligible connecting users to the OAuth application's test-user list.
- **Documented action:** Open **Audience**. Under **Test users**, select **Add users**. Enter the setup user's email and the other authorized test users. Select **Save**.
- **Source statement:** S1, **Set up the OAuth consent screen**: “If you selected External for user type, add test users”.
- **Interpretation:** This is an individual user access requirement, although an administrator makes the change. It does not replace preview admission.

### T2-07 — Create a pre-registered OAuth web application

- **Status:** Required for the documented manual OAuth connection path.
- **Actor, access, and scope:** An authorized application administrator creates the OAuth client in the project. The MCP client uses its client ID and secret.
- **Documented action:** S1 gives **Google Auth Platform > Clients > Create Client**, application type **Web application**, **Name**, and **Authorized redirect URIs > + Add URI**. After **Create**, copy the **Client ID** and **Client Secret**.
- **Environment values:** Obtain the name from the application owner. The supplied client context gives `{{ gram.oauth.callback_url }}` as the Speakeasy redirect value.
- **Source statement:** S1, **Configure your MCP client > Claude**: “configure a custom connector with an OAuth client ID and secret.”
- **Source statement:** S1, same section: “Select Web application as the application type.”
- **Interpretation:** The source uses the callback for each example client. The coordinator must use the Speakeasy callback, not the Claude or Antigravity callback. Topic 4 owns the remaining OAuth settings.

### T2-08 — Permit the OAuth application where Workspace policy restricts access

- **Status:** Conditional. Applies if organizational app controls block the application or the required Google data.
- **Actor, access, and scope:** A Workspace administrator with the **Service Settings** administrator privilege configures access for the applicable organizational units.
- **Documented action:** S7 gives **Security > Access and data control > API controls > Manage App Access > Configure new app**.
  - Search with the OAuth client ID.
  - Select the application.
  - Under **Scope**, select the applicable organizational units.
  - Under **Access to Google data**, select an access setting that permits the required scopes.
  - Select **Continue**, review the settings, then select **Finish**.
- **Environment values:** Use the OAuth client ID from T2-07. Obtain the organizational units and access policy from the Workspace security owner.
- **Source statement:** S7, **Manage app access to Google services & add apps**: “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
- **Source statement:** S7, same section: “Trusted—App has access to all Google Workspace services (OAuth scopes), including restricted services.”
- **Source statement:** S7, **Configure a new app**: “Enter the app's name or client ID, then click Search.”
- **Source statement:** S7, API controls navigation: “Requires having the Service Settings administrator privilege.”
- **Interpretation:** Do not require **Trusted** for every installation. It grants broader access than **Specific Google data**. Use an approved setting that permits the required access.

### T2-09 — Screen MCP prompts and responses

- **Status:** Required.
- **Actor, access, and scope:** The application or security owner supplies protection for MCP traffic.
- **Documented action:** Use Google Model Armor, or document another screening solution so users can accept the risk.
- **Source statement:** S5, opening section: “You must screen prompts and responses for malicious content or prompt injection attacks.”
- **Source statement:** S5, same section: “You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Interpretation:** Screening is mandatory. Model Armor is one permitted method, not the only permitted method.

### T2-10 — Configure Model Armor if it is the selected screening method

- **Status:** Conditional. Applies when the organization selects Model Armor.
- **Actor, access, and scope:** An authorized cloud security administrator enables the API and configures project floor settings. These settings apply to project MCP calls and responses.
- **Documented action:**
  - Enable `modelarmor.googleapis.com` in the selected project through the [Model Armor API enablement page](https://console.cloud.google.com/apis/enableflow?apiid=modelarmor.googleapis.com).
  - Open **Model Armor > Floor settings > Configure floor settings**.
  - Select the configuration option and detection settings.
  - Under **Services**, select **Google MCP Server**.
  - Select **Save floor settings**.
- **Source statement:** S5, **Enable Model Armor**: “You must enable Model Armor APIs before you can use Model Armor.”
- **Source statement:** S5, **Configure protection for Google and Google Cloud remote MCP servers**: “Set up a Model Armor floor setting with MCP sanitization enabled.”
- **Source statement:** S6, **Define where floor settings are applied**: “Google MCP Server: Floor settings check requests sent to or from Google or Google Cloud remote MCP servers”.
- **Source statement:** S6, required access: “Model Armor Floor Setting Admin (`roles/modelarmor.floorSettingsAdmin`)”.
- **Source statement:** S5, example configuration: `INSPECT_AND_BLOCK` “inspects content for the Google MCP server and blocks prompts and responses that match the filters.”
- **Source statement:** S5, **Use Model Armor**: “Model Armor logs the entire payload. This might expose sensitive information in your logs.”
- **Interpretation:** The security owner must choose the filters and logging policy. The example is not proof that every example filter or logging option is mandatory.

## Unresolved questions

### Non-blocking — Authority for project and OAuth actions

S1 and S4 document the actions, but do not establish all applicable permissions for project creation, OAuth configuration, and preview terms acceptance.

**Sources checked:** S1, S2, S4.

**Disposition:** Topic 1 must verify authority. The documented actions and values are clear.

### Non-blocking — Account admission versus program Google Group membership

S2 says Google adds an approved applicant to a program Google Group. S3 says an application cannot use a Google Group address.

**Disposition:** These statements concern different actions. Submit an individual Workspace-domain address; permit Google to add that account to the program group. Topic 3 must use the individual-account restrictions. No conflict prevents application.

### Non-blocking — Billing

S4 calls billing optional and says it depends on the APIs and features used. The reviewed Sheets setup does not establish a Sheets-specific billing prerequisite.

**Disposition:** Do not state that billing is required or explicitly unnecessary for Sheets. Check the selected security service separately if Model Armor is used.

### Non-blocking within Topic 2 — Security method selection

S5 permits Model Armor or a documented alternative. The supplied client context does not identify a screening solution.

**Disposition:** The coordinator must select and confirm the security method before final setup. The provider-side action is documented; this is not a missing provider instruction.

### Non-blocking — Current release confirmation

S8 contains the Sheets MCP preview announcement and links to S1. Its statement is: “The Model Context Protocol (MCP) server for Google Sheets is now available in developer preview.”

The live setup page still shows Developer Preview. No replacement notice was found in the inspected material.

## Cross-topic dependencies

- **Topic 1:** Verify authority for project creation, service enablement, OAuth application configuration, preview terms acceptance, and the selected security method. Use the Service Settings privilege evidence for Workspace app controls and the Model Armor Floor Setting Admin role evidence for floor settings.
- **Topic 3:** The preview form accepts one individual Workspace-domain email per application. It rejects Gmail addresses, service accounts, and Google Groups. Check connecting-user admission and the External test-user list.
- **Topic 4:** Use the Sheets scopes and the pre-registered web application. Check publication state, verification, refresh tokens, and authorization parameters. Keep preview terms separate from OAuth audience settings.
- **Topic 5:** Use the same registered project for the two documented service enablement actions. The project number used for preview registration is not part of the remote URL.
- **Coordinator:** Use the supplied Speakeasy callback. Confirm manual OAuth client compatibility. Select prompt and response screening. Check that the intended use complies with the preview restriction on access outside the company.

## Topic 3 connecting-user report

## Topic and status

**Topic 3: Connecting-user setup — complete.**

The official instructions establish user access through the preview program, the OAuth test-user list when applicable, Google Workspace app access controls, and spreadsheet permissions. No missing evidence prevents the documented setup actions.

The sources do not clearly state that each connecting user must submit a separate preview application. This is a non-blocking question. Do not present separate enrollment for each user as a requirement.

**Observation date for all sources: 2026-09-11.**

## Findings

### T3-01 — Use the registered preview account and project

- **Status:** Required for preview access. Separate enrollment for each connecting user is not established.
- **Actor and scope:** The preview applicant supplies the Google Workspace account and Google Cloud project details. Google verifies the account and registers the project.
- **Documented action:** Use **Apply to join the Developer Preview Program** on the preview page. Supply the requested account and project information. The applicant must be able to receive Google Group membership. Google sends a final confirmation after project registration.
- **Source:** https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server — opening notice.
- **Exact quotation:** “Developer Preview: Available as part of the Google Workspace Developer Preview Program”.
- **Source:** https://developers.google.com/workspace/preview — **How to join the program**.
- **Exact quotations:**
  - “You need to provide us with your Google Workspace account and Google Cloud project information.”
  - “When we verify your Google Workspace account information, we will add you to a Google Group for the program and you should receive a notification.”
  - “Make sure that your email account accepts getting added to Google Groups.”
  - “After verifying your Google Workspace account, we will register your Google Cloud project.”
  - “When it is done, you will receive a final confirmation to your registered email address.”
- **Interpretation:** The documented access process registers an account and a project. These statements do not establish a separate preview application for every user who later connects.

### T3-02 — Keep preview users within the permitted test audience

- **Status:** Required. Access for users outside the applicant’s domain or company is conditional on specific Google permission.
- **Actor and scope:** The application owner controls which end users receive access to the preview application.
- **Documented action:** Do not give users outside the domain or company access unless Google permits such a request and grants that permission for the feature. Do not include the preview feature in a public application before general availability.
- **Source:** https://developers.google.com/workspace/preview — **Program Terms**, clauses (ii) and (iv).
- **Exact quotations:**
  - “program features may not be included in public applications prior to the General Availability (GA) announcement.”
  - “I may not grant end users access, outside my domain or company, to developer applications that have been built using APIs prior to their GA announcement”
  - “unless Google specifically states that I can request such permission and such permission has been granted to my Workspace account for that feature.”
- **Interpretation:** The documented **External** OAuth audience option does not cancel the preview audience restriction. An external OAuth configuration is not proof that outside-company users are eligible.

### T3-03 — Add connecting users to the OAuth test-user list when applicable

- **Status:** Conditional. Applies when the setup uses **External**, as specified in the Sheets procedure.
- **Actor and scope:** The authorized OAuth application administrator adds the connecting users to the application’s test-user list.
- **Documented action and values:** In **Google Auth Platform**, select **Audience**. Under **Test users**, select **Add users**. Enter the email addresses of the authorized test users. Select **Save**. Obtain these addresses from the intended connecting users or the application owner.
- **Source:** https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server — **Set up the OAuth consent screen**.
- **Exact quotations:**
  - “Under Audience, select Internal. If you can't select Internal, select External.”
  - “If you selected External for user type, add test users”
  - “Under Test users, click Add users.”
  - “Enter your email address and any other authorized test users, then click Save.”
- **Supporting source:** https://developers.google.com/workspace/guides/configure-oauth-consent — **Configure OAuth consent**.
- **Exact quotation:** “If you selected External for user type, add test users”.
- **Interpretation:** This is an application access action for the administrator. It is not the later user sign-in procedure. Topic 1 must confirm the administrator’s authority. Topic 4 must use the selected audience and publishing state when it checks token behavior.

### T3-04 — Permit the application for the connecting user’s organizational unit when policy restricts access

- **Status:** Conditional. Applies when Google Workspace app access policy does not permit the application or the required Google data access.
- **Actor and scope:** An administrator with the **Service Settings administrator privilege** configures access for the organizational units that contain the connecting users.
- **Documented action and values:**
  - Open **Google Admin console > Security > Access and data control > API controls > Manage App Access**.
  - Under **Configured apps**, select **Configure new app**.
  - Search with the application name or OAuth client ID. Obtain the client ID from the OAuth application administrator.
  - Select the application.
  - Under **Scope**, select the organizational units that need access. The source provides **Select org units > Include organizations > Select**.
  - Select **Continue**.
  - Under **Access to Google data**, select the applicable access policy. **Specific Google data** permits only the scopes specified for the application. **Trusted** permits all Google services. **Limited** permits only unrestricted services.
  - Select **Continue**, review the settings, and select **Finish**.
- **Source:** https://support.google.com/a/answer/7281227?hl=en — **Configure a new app**.
- **Exact quotations:**
  - “Requires having the Service Settings administrator privilege.”
  - “Enter the app's name or client ID, then click Search.”
  - “For Scope, select who to configure access for”
  - “Specific Google data—Can request data access only to scopes that you specify when configuring the app.”
  - “Blocked—Can't access any Google service.”
- **Source:** Same URL — section about restricting access to Google services.
- **Exact quotation:** “Restricted—Only internal and third-party apps configured with a Trusted or Specific Google data access setting can access data.”
- **Interpretation:** This is not evidence that every installation needs a new access policy. It establishes the action when the current policy prevents access. Do not recommend **Trusted** as the default when a narrower approved policy meets the requirement.
- **Scope dependency:** Use the Sheets scope values from Topic 4. The support page also states: “You must include the Google Sign-in scopes required by the app to allow users to sign in with their Google Account.” The coordinator and Topic 4 must identify those scopes from the selected client configuration.

### T3-05 — Give each user the spreadsheet access needed for their tools

- **Status:** Required. A new sharing action is conditional on the user not already having the necessary access.
- **Actor and scope:** The spreadsheet owner, or another person permitted to share it, gives the connecting Google account access. Access applies to the spreadsheet and can also come from its parent folder.
- **Documented action and values:** In Google Drive, select the file and **Share**. Enter the connecting user’s email address. Select **Viewer**, **Commenter**, or **Editor**, as appropriate for the intended work.
- **Source:** https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server — introduction, **Respect security**.
- **Exact quotation:** “Inherit the same permissions and data governance controls as the user.”
- **Source:** Same URL — introduction.
- **Exact quotations:**
  - “Read data: Retrieve cell values, sheet names, grid properties, and other spreadsheet metadata.”
  - “Take action: Update cell values, set formulas, insert rows/columns, and execute spreadsheet structural batch updates.”
- **Source:** https://support.google.com/drive/answer/2494822?hl=en — **Share with specific people**.
- **Exact quotations:**
  - “Enter the email address you want to share with.”
  - “Decide how people can use your file. Select one: Viewer Commenter Editor”.
- **Interpretation:** OAuth consent does not give the user access to an otherwise inaccessible spreadsheet. Give read access for read tasks and edit access for change tasks. Existing file and folder controls still apply.

### T3-06 — Use only permitted data for government or regulatory preview use

- **Status:** Conditional. Applies when a user acts for a government or regulatory entity, excluding educational institutions.
- **Actor and scope:** The application owner and connecting users control the data used with the preview APIs.
- **Documented action:** Use test or experimental data. Do not use live or production data.
- **Source:** https://developers.google.com/workspace/preview — **Program Terms**, clause (vii).
- **Exact quotation:** “if I am using the Pre-GA APIs on behalf of a government or regulatory entity (excluding educational institutions), I may only use test or experimental data with Pre-GA APIs”.
- **Exact quotation:** “am prohibited from using any ‘live’ or production data in connection with Pre-GA APIs.”
- **Interpretation:** This is a user and resource eligibility limit. It is not a token setting.

## Unresolved questions

### Non-blocking — Separate preview registration for every connecting user

**Sources checked:** The Sheets setup page; the preview page, **How to join the program**, **Latest features**, and **Program Terms**.

The sources establish account verification, Google Group membership, project registration, and limits on end-user access. They do not clearly require each connecting user to submit a separate application.

The documented applicant-and-project process remains usable. Do not add a per-user application requirement without more evidence.

### Non-blocking — A specific paid license or edition

**Sources checked:** The Sheets setup page, its prerequisites, and the preview program page.

These sources do not name a required paid Workspace edition or a separate Sheets MCP user license. They also do not establish general eligibility for consumer Google accounts. Do not claim either that a paid license is required or that consumer accounts are supported.

### Non-blocking — A separate MCP invocation role or application assignment

**Sources checked:** The Sheets setup page and Google Workspace app access control documentation.

The sources checked do not name a separate Sheets MCP user role or a standard application assignment. The documented controls are preview access, OAuth audience/test users, app access policy, and inherited data permissions. Do not invent another assignment.

### Non-blocking — Release-note confirmation

The live Sheets setup page still identifies the service as Developer Preview. The preview page lists **Sheets MCP server** under **Latest features**. No replacement notice was found in those pages. This topic did not independently confirm the release-note entry.

## Cross-topic dependencies

- **Topic 1:** Confirm authority to add OAuth test users. Use the official **Service Settings administrator privilege** evidence for Workspace app access policy changes.
- **Topic 2:** Use the preview account-and-project registration process. Keep public access and outside-company test access within the program terms.
- **Topic 4:** Use the actual OAuth audience and test-user list. Supply the Sheets scopes and any Google Sign-in scopes required by the selected client. Check token behavior for the selected publishing state.
- **Topic 5:** Retain the inherited-user-permissions statement. The endpoint does not give additional spreadsheet access.
- **Coordinator:** Use an eligible internal test audience unless Google grants the required exception. Do not equate **External** OAuth configuration with permission for outside-company preview users. Include conditional app-policy and spreadsheet-sharing actions. Apply the government-data restriction when relevant.

## Topic 4 final authentication report

## Topic and status

**Topic 4: Authentication — complete.**

The pinned Speakeasy implementation resolves the previous blocking check. For the Google issuer, the client automatically requests offline access and consent. It stores the returned refresh token and uses it when the access token expires. This behavior applies to the manual OAuth path.

**Selected authentication path:** A pre-registered **Web application** OAuth client. Select **Internal** where eligible. If **Internal** is not available, use **External Testing** only for eligible test users in the same organization, within the preview program conditions.

Do not select external production, Dynamic Client Registration, or another credential method for this setup.

**Observation date for all sources: 2026-09-11.**

### Changes to the previous report

- **T4-04 and T4-05 corrected:** The client automatically supplies the Google offline-access and consent parameters. The reader does not need a manual parameter step.
- **T4-06 clarified:** External Testing does not remove the preview restriction on access outside the domain or company.
- **T4-08 replaced:** External production is not a selected path. The applicable finding now records the preview restrictions.
- **T4-11 added:** The pinned client source establishes refresh-token storage and use.
- **Previous blocking question resolved:** Current source establishes compatibility. A deployed UI observation remains a non-blocking evidence limit.

## Sources

### Google sources

- **S1:** https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server\
  Page date: “Last updated 2026-09-03 UTC.”
- **S2:** https://developers.google.com/identity/protocols/oauth2/web-server
- **S3:** https://developers.google.com/identity/protocols/oauth2
- **S4:** https://support.google.com/cloud/answer/15549945
- **S5:** https://developers.google.com/workspace/guides/auth-overview
- **S6:** https://developers.google.com/workspace/release-notes
- **S7:** https://developers.google.com/workspace/preview
- **S8:** https://accounts.google.com/.well-known/openid-configuration

S1 and S6 establish the Sheets MCP preview release. No replacement notice was found in the checked material.

### Speakeasy source

The following links use official repository commit `496e62ca5d5ebd99f0c189f2614fc9c707e44659`. The source was read directly. Tests were read, not run.

- **C1:** [Google authorization interceptor, lines 26–52](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google.go#L26-L52)
- **C2:** [Interceptor registration, lines 261–263](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L261-L263)
- **C3:** [Upstream authorization request, lines 650–795](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L650-L795)
- **C4:** [Manual client creation, lines 157–230](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/clienthandlers.go#L157-L230)
- **C5:** [Token callback and storage, lines 950–1060](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L950-L1060)
- **C6:** [Access-token resolution, lines 128–151](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/tokenservice.go#L128-L151)
- **C7:** [Token refresh, lines 355–404](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/refreshservice.go#L355-L404)
- **C8:** [Google interceptor tests, lines 13–77](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google_test.go#L13-L77)

## Findings

### T4-01 — Use the documented OAuth method

**Unchanged.**

- **Status:** Required for the selected Sheets MCP setup.
- **Actor and scope:** The application administrator configures OAuth in the Google Cloud project. The connecting user grants access to Google data.
- **Documented action:** Configure the consent screen. Create an OAuth client ID and secret. Use these values in the remote MCP client.
- **Source statement:** S1, **Set up the OAuth consent screen**:
  > “The Google Sheets MCP server uses OAuth 2.0 for authentication and authorization.”
  > “You must configure the OAuth consent screen before you can create an OAuth client ID.”
- **Source statement:** S1, **Configure your MCP client > Claude**:
  > “configure a custom connector with an OAuth client ID and secret.”
- **Interpretation:** Manual OAuth registration is the documented path selected here. It includes user sign-in.

### T4-02 — Create a web application client with the correct callback

**Unchanged.**

- **Status:** Required.
- **Actor and scope:** An authorized application administrator creates credentials in the Google Cloud project.
- **Documented action:** Open **Google Auth Platform > Clients > Create Client**. Select **Web application**. Enter a **Name**. Under **Authorized redirect URIs**, select **+ Add URI**. Enter the callback in **URIs**. Select **Create** and copy **Client ID** and **Client Secret**.
- **Environment-specific value:** Use `{{ gram.oauth.callback_url }}` from the supplied client context. Do not copy an Antigravity or Claude callback.
- **Source statement:** S1, **Configure your MCP client**, client examples:
  > “Select Web application as the application type.”
  > “Click Create and copy your Client ID and Client Secret.”
- **Source statement:** S2, **Step 1: Set authorization parameters**, `redirect_uri`:
  > “The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client”
  > “the http or https scheme, case, and trailing slash (' / ') must all match.”
- **Interpretation:** The registered callback must match the callback sent by the client. The supplied client context provides the Speakeasy value.
- **Authority dependency:** Topic 1 must establish authority to create the OAuth client.

### T4-03 — Configure the four Sheets MCP scopes

**Unchanged.**

- **Status:** Required by the service-specific setup procedure.
- **Actor and scope:** The application administrator configures the OAuth application. The connecting user grants the requested access.
- **Documented action:** Open **Data Access > Add or Remove Scopes**. Under **Manually add scopes**, add:
  ```text
  https://www.googleapis.com/auth/drive.readonly
  https://www.googleapis.com/auth/drive.file
  https://www.googleapis.com/auth/spreadsheets.readonly
  https://www.googleapis.com/auth/spreadsheets
  ```
  Select **Add to Table**, then **Update**. On **Data Access**, select **Save**.
- **Source statement:** S1, **Set up the OAuth consent screen**:
  > “Under Manually add scopes, paste the scopes for the Google Sheets MCP server”

  The source then lists the four values above.
- **Source statement:** Same section:
  > “After selecting the scopes required by your app, on the Data Access page, click Save.”
- **Interpretation:** Use the Sheets-specific list. Google application configuration and the client's requested scopes are separate settings. C3 shows that the upstream request sets its `scope` value from the client's requested scopes.
- **Authority dependency:** Topic 1 must check authority to configure scopes. Topic 3 must check user consent restrictions.

### T4-04 — The client automatically requests offline access

**Corrected: the previous compatibility gap is resolved.**

- **Status:** Required for the selected refresh-token setup.
- **Actor and scope:** The Speakeasy client sends the authorization request for the application and connecting user.
- **Required provider value:** `access_type=offline`.
- **Documented provider requirement:** S2, **Step 1: Set authorization parameters**, `access_type`:
  > “Valid parameter values are online, which is the default value, and offline.”
  > “Set the value to offline if your application needs to refresh access tokens when the user is not present at the browser.”
- **Source statement:** S2, **Step 5: Exchange authorization code for refresh and access tokens**:
  > “the refresh token is only returned if your application set the access_type parameter to offline in the initial request”
- **Verified client statement:** C1:
  ```go
  q.Set("access_type", "offline")
  ```
  Its issuer match is:
  ```go
  return strings.EqualFold(u.Hostname(), "accounts.google.com")
  ```
- **Applicable issuer evidence:** S8:
  ```json
  "issuer": "https://accounts.google.com"
  ```
- **Interpretation:** The Google issuer matches the client interceptor. The client supplies the required parameter. Do not add a manual authorization-parameter step or substitute an `offline_access` scope.

### T4-05 — The client automatically requests consent

**Corrected: the initial-consent compatibility gap is resolved.**

- **Status:** Required client behavior in the selected Google path. Its refresh-token benefit is important when consent already exists.
- **Actor and scope:** The client sends the consent parameter. The connecting user completes Google's consent screen.
- **Source statement:** S2, **Step 1: Set authorization parameters**, Node.js note:
  > “The refresh_token is only returned on the first authorization.”
- **Source statement:** Same section, `prompt`:
  > “If you don't specify this parameter, the user will be prompted only the first time your project requests access.”

  For `consent`:
  > “Prompt the user for consent.”
- **Verified client statement:** C1:
  ```go
  if !slices.Contains(prompts, "consent") {
      prompts = append(prompts, "consent")
  }
  q.Set("prompt", strings.Join(prompts, " "))
  ```
- **Supporting evidence:** C8 asserts `access_type=offline` and `prompt=consent`. It also checks that an existing `select_account` prompt is retained.
- **Interpretation:** The reader does not need to configure `prompt=consent`. The client adds it automatically.

### T4-06 — Select Internal where eligible; otherwise use restricted External Testing

**Clarified.**

- **Status:** Conditional on organization and user eligibility.
- **Actor and scope:** The application administrator selects the OAuth audience. The selection limits which users can authorize the application.
- **Documented action:** Select **Internal** where available. If **Internal** is not available, select **External**. For External Testing, open **Audience > Test users > Add users**, enter eligible users' email addresses, and select **Save**.
- **Source statement:** S1, **Set up the OAuth consent screen**:
  > “Under Audience, select Internal. If you can't select Internal, select External.”
  > “If you selected External for user type, add test users”
- **Source statement:** S4, **Internal**:
  > “Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization.”
- **Interpretation:** Select Internal for eligible organization users. External Testing is a fallback only when Internal is not available. Its test users must still meet the preview restrictions in T4-08. The External label does not permit access outside the company.

### T4-07 — External Testing access expires after seven days

**Unchanged.**

- **Status:** Conditional. Applies to an External application with publishing status **Testing**.
- **Actor and scope:** The application administrator selects the status. The limit affects test-user authorization.
- **Required warning:** Access expires after seven days and requires another sign-in. A refresh token does not remove this limit.
- **Source statement:** S3, **Refresh token expiration**:
  > “A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of ‘Testing’ is issued a refresh token expiring in 7 days”
- **Source statement:** S4, **Testing**:
  > “Authorizations by a test user will expire seven days from the time of consent.”
  > “If your OAuth client requests an offline access type and receives a refresh token, that token will also expire.”
- **Additional limit:** Same section:
  > “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”
- **Interpretation:** The exception for basic name, email, and profile scopes does not apply to the four Sheets MCP scopes.

### T4-08 — Preserve the preview restrictions

**Replaces the previous external-production finding. External production is not selected.**

- **Status:** Required for this preview setup. The government-data condition below applies only to the specified entities.
- **Actor and scope:** The program applicant, application owner, and connecting users must meet the program conditions. Google registers the submitted Cloud project.
- **Documented setup condition:** Use the admitted Workspace account and registered project. Restrict test-user access to the permitted domain or company. Topics 1–3 must verify admission and eligible users.
- **Source statement:** S1, opening notice:
  > “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
- **Source statement:** S7, application procedure:
  > “You need to provide us with your Google Workspace account and Google Cloud project information.”
  > “After verifying your Google Workspace account, we will register your Google Cloud project.”
- **Source statement:** S7, **Developer Preview Program Terms**, term (ii):
  > “program features may not be included in public applications prior to the General Availability (GA) announcement.”
- **Source statement:** Term (iv):
  > “I may not grant end users access, outside my domain or company”

  The term permits an exception only where Google offers that permission and grants it for the account and feature.
- **Source statement:** Term (vii):
  > “on behalf of a government or regulatory entity (excluding educational institutions), I may only use test or experimental data”
- **Interpretation:** This selected path does not rely on an exception for users outside the organization. Do not publish the application for public use. Do not treat OAuth audience selection as preview admission.

### T4-09 — Tokens do not guarantee permanent access

**Unchanged.**

- **Status:** Required information for the OAuth setup.
- **Actor and scope:** The client manages tokens for the application and user.
- **Source statement:** S2, token response fields:
  > “expires_in — The remaining lifetime of the access token in seconds.”
  > “refresh_token_expires_in — The remaining lifetime of the refresh token in seconds. This value is only set when the user grants time-based access.”
- **Source statement:** S3, **Refresh token expiration**, lists these limits:
  > “The refresh token has not been used for six months.”
  > “The user granted time-based access to your app and the access expired.”
  > “There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.”
  > “creating a new refresh token automatically invalidates the oldest refresh token without warning.”
- **Additional evidence:** The same section lists user revocation and administrator restrictions as reasons a refresh token can stop working.
- **Interpretation:** Access can expire or be withdrawn. Another sign-in can be necessary. No later token-renewal or rotation procedure is needed in the setup guide.

### T4-10 — Use Google's identity endpoints if explicit values are needed

**Unchanged; issuer evidence added.**

- **Status:** Conditional. Applies if the client needs explicit identity-provider values.
- **Actor and scope:** The client administrator configures Google OAuth.
- **Documented values:**
  ```text
  Issuer: https://accounts.google.com
  Authorization endpoint: https://accounts.google.com/o/oauth2/v2/auth
  Token endpoint: https://oauth2.googleapis.com/token
  ```
- **Source statement:** S2, **Step 1: Set authorization parameters > HTTP/REST**:
  > “Google's OAuth 2.0 endpoint is at https://accounts.google.com/o/oauth2/v2/auth.”
- **Source statement:** S2, **Step 5**:
  > “call the https://oauth2.googleapis.com/token endpoint”
- **Additional evidence:** S8 returns these exact values in `issuer`, `authorization_endpoint`, and `token_endpoint`.
- **Interpretation:** These identity endpoints are not the remote MCP URL. Google metadata establishes the issuer that activates the client behavior in T4-04.

### T4-11 — Manual clients receive the refresh-token behavior

**New finding.**

- **Status:** Required compatibility condition; established by the pinned implementation.
- **Actor and scope:** The Speakeasy backend creates the authorization request, stores the user's grant, and obtains usable access tokens.
- **Verified source statements:**
  - C2 registers `interceptors.NewGoogle(logger)` in the challenge manager.
  - C3 sets:
    ```go
    q.Set("client_id", client.ExternalClientID)
    ```
    It then applies matching interceptors:
    ```go
    if ic.Match(client.IssuerURL) {
        ic.ModifyAuthorize(ctx, q)
    }
    ```
  - C4 identifies the separate CIMD path:
    > “Unlike the manual create path the caller supplies no client_id”
  - C5 encrypts the received refresh token:
    ```go
    v, eerr := m.enc.Encrypt([]byte(tok.RefreshToken))
    ```
    It stores the result in `RefreshTokenEncrypted`.
  - C6 states:
    > “refreshing via the upstream /token endpoint when the stored access_expires_at has passed”

    This applies when a refresh token is present.
  - C7 contains the stored-grant refresh path.
- **Interpretation:** This is the outgoing request to Google, not a response to a downstream client. The interceptor is not conditional on Dynamic Client Registration. The manual path therefore supports automatic offline access, consent, token storage, and on-demand refresh.
- **Setup effect:** Do not add a manual refresh-token field, authorization-parameter step, or scheduled-refresh step. Scheduled refresh is separate from the on-demand behavior established here.

## Unresolved questions

### Resolved — Manual Google refresh-token compatibility

The previous blocking check is resolved by C1–C7 and Google's issuer metadata, S8. The evidence establishes the required authorization parameters and subsequent refresh-token use.

### Non-blocking — Deployed version and UI observation

The pinned September source establishes implementation behavior. It is not an observation of the deployed UI. The supplied UI doctrine cites July commits.

This difference does not contradict the verified source or prevent the documented manual setup. The coordinator must use the supplied UI doctrine for navigation and must not describe the source review as a live connection test.

### Non-blocking — Preview admission and authority

Topic 1 must verify authority and admission. Topics 2 and 3 must verify the registered project and eligible users. These are cross-topic conditions, not unresolved OAuth compatibility checks.

### Non-blocking — Dynamic Client Registration and other credentials

S1 documents pre-registered OAuth clients. It does not establish Dynamic Client Registration as the selected method.

S5 describes API keys and service accounts for Google APIs in general. This does not establish them as alternative Sheets MCP setup paths. They are not selected. Do not state that they are unsupported without service-specific evidence.

### Non-blocking — OAuth client-secret lifetime

The checked Sheets setup and shared OAuth pages do not state a fixed client-secret lifetime. Their creation procedure is sufficient for initial setup. Do not describe the secret as permanent.

## Cross-topic dependencies

- **Topic 1:** Verify authority to configure consent and scopes, create the OAuth client, and enroll the account and project in the preview program. External production is not selected.
- **Topic 2:** Use a manual **Web application** client and the four Sheets MCP scopes. Select Internal where eligible. Otherwise retain External Testing, subject to preview eligibility.
- **Topic 3:** Verify Internal membership or eligible same-organization test-user assignment. Apply preview access restrictions and Workspace consent controls.
- **Topic 5:** Retain the established Sheets MCP URL. Keep it separate from Google's issuer and token endpoints.
- **Coordinator:** Close the offline-access blocker. Use manual OAuth with the Google issuer and `{{ gram.oauth.callback_url }}`. Do not add manual `access_type` or `prompt` steps. Ensure the selected scope configuration requests the four Sheets MCP scopes. Preserve the seven-day warning for External Testing and all applicable preview restrictions.

## Topic 5 endpoint report

## Topic and status

**Topic 5: MCP endpoint and connection configuration — complete.**

Google documents a remote Google Sheets MCP server. Its fixed URL is:

`https://sheetsmcp.googleapis.com/mcp/v1`

The documented connection does not need a local bridge. The endpoint finding permits the other research to continue. The coordinator must still check the client authentication and security requirements.

**Observation date for all sources: 2026-09-11.**

### Sources

- **S1:** https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server
- **S2:** https://developers.google.com/workspace/guides/configure-mcp-servers
- **S3:** https://developers.google.com/workspace/guides/configure-mcp-security
- **S4:** https://docs.cloud.google.com/mcp/configure-mcp-ai-application
- **S5:** https://developers.google.com/workspace/release-notes

## Findings

### T5-01 — Use the Google Sheets remote MCP endpoint

- **Status:** Required.
- **Actor and scope:** The person who configures the client adds a connection to Google Sheets. The connecting user grants access to their Google data.
- **Documented action and values:** Enter `https://sheetsmcp.googleapis.com/mcp/v1` as the remote MCP server URL.
- **Source:** S1, **Configure your MCP client > Claude**.
- **Exact quotation:** “Remote MCP server URL: `https://sheetsmcp.googleapis.com/mcp/v1`”
- **Additional source:** S1, introduction.
- **Exact quotation:** “Google Sheets offers a remote Model Context Protocol (MCP) server”.
- **Interpretation:** This is an MCP endpoint, not a general Sheets API address. The documented URL has no tenant, project, region, or environment variable. It is the fixed address for the documented setup.

### T5-02 — Enable the services in a Google Cloud project

- **Status:** Required.
- **Actor and scope:** An authorized project administrator enables the services in the Google Cloud project used for setup. Topic 1 must establish the applicable authority.
- **Documented action and values:** Enable:
  - Google Sheets API: `sheets.googleapis.com`
  - Google Sheets MCP API: `sheetsmcp.googleapis.com`
- **Source:** S1, **Configure the Google Sheets MCP server**.
- **Exact quotation:** “you must enable it in your Google Cloud project and then configure your MCP client to connect to it.”
- **Source:** S1, **Enable the APIs** and **Enable the MCP services**.
- **Exact quotations:**
  - `gcloud services enable sheets.googleapis.com --project=PROJECT_ID`
  - `gcloud services enable sheetsmcp.googleapis.com --project=PROJECT_ID`
  - “Replace `PROJECT_ID` with your Google Cloud project ID.”
- **Browser paths supplied by the source:**
  - **Enable the APIs:** https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com
  - **Enable the MCP services:** https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com
- **Interpretation:** The endpoint is Google-hosted. The documented provisioning action is service enablement in a project. The project ID is not part of the MCP URL. A browser setup path exists; the guide need not require a local shell.

### T5-03 — Use OAuth authentication

- **Status:** Required.
- **Actor and scope:** The application administrator configures OAuth. The connecting user signs in and grants access.
- **Documented action and values:** Configure the consent screen before creating an OAuth client ID. The remote client examples use a pre-registered client ID and client secret.
- **Source:** S1, **Set up the OAuth consent screen**.
- **Exact quotation:** “The Google Sheets MCP server uses OAuth 2.0 for authentication and authorization.”
- **Source:** S1, **Configure your MCP client > Antigravity**, configuration example.
- **Exact quotation:**
  ```json
  "serverUrl": "https://sheetsmcp.googleapis.com/mcp/v1",
  "oauth": {
    "clientId": "OAUTH_CLIENT_ID",
    "clientSecret": "OAUTH_CLIENT_SECRET"
  }
  ```
- **Source:** S1, **Configure your MCP client > Claude**.
- **Exact quotation:** “configure a custom connector with an OAuth client ID and secret.”
- **Interpretation:** Manual OAuth client registration is a documented remote setup path. The client examples use different callback URLs. The coordinator must use the supplied Speakeasy callback value, not an Antigravity or Claude callback.

### T5-04 — Apply the Sheets-specific scopes

- **Status:** Required by the documented configuration procedure.
- **Actor and scope:** The application administrator configures the scopes for the OAuth application. Topic 1 must establish authority. Topic 4 must verify the authorization setup.
- **Documented values:**
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`
- **Source:** S1, **Set up the OAuth consent screen**.
- **Exact quotation:** “Under Manually add scopes, paste the scopes for the Google Sheets MCP server”, followed by the four values above.
- **Interpretation:** Do not copy the scope list for another Workspace MCP server.

### T5-05 — Distinguish the separate Workspace servers

- **Status:** Conditional. Add another server only if its service is in the requested setup.
- **Actor and scope:** The client administrator selects the required product connections. Each connection accesses the applicable product through the user’s permissions.
- **Source:** S2, introduction.
- **Exact quotation:** “Each Google Workspace product has its own dedicated MCP server.”
- **URL source:** S2, **Configure your MCP client > Antigravity**, `mcpServers` configuration.
- **Function source:** S2, **Supported products**.

| Server | Exact documented remote URL | Function shown by documented tools |
|---|---|---|
| Gmail | `https://gmailmcp.googleapis.com/mcp/v1` | Read and search mail; create drafts; change labels. |
| Google Drive | `https://drivemcp.googleapis.com/mcp/v1` | Find, read, copy, create, and download files; read metadata and permissions. |
| Google Docs | `https://docsmcp.googleapis.com/mcp/v1` | Read and update documents. |
| **Google Sheets** | **`https://sheetsmcp.googleapis.com/mcp/v1`** | **Read spreadsheet data; update values, formulas, and structure.** |
| Google Slides | `https://slidesmcp.googleapis.com/mcp/v1` | Read and update presentations. |
| Google Calendar | `https://calendarmcp.googleapis.com/mcp/v1` | Find calendars and events; create, update, delete, and respond to events. |
| Google Chat | `https://chatmcp.googleapis.com/mcp/v1` | Search conversations and messages; send messages; change read state; list memberships. |
| People API | `https://people.googleapis.com/mcp/v1` | Read user profiles; search contacts and directory people. |

**Exact tool quotations supporting the function summaries:**

- Gmail: `create_draft`, `get_message`, `search_threads`, `label_message`
- Drive: `copy_file`, `create_file`, `download_file_content`, `get_file_permissions`
- Docs: `read_doc`, `update_doc`
- Sheets: `get_values`, `get_spreadsheet`, `update_spreadsheet`, `update_values`, `update_formulas`, `insert_dimension`
- Slides: `read_presentation`, `update_presentation`
- Calendar: `create_event`, `delete_event`, `respond_to_event`, `update_event`
- Chat: `search_conversations`, `send_message`, `mark_as_read`, `list_memberships`
- People: `get_user_profile`, `search_contacts`, `search_directory_people`

**Interpretation:** These are separate product servers, not tenant variants. Google Sheets is the applicable server for this request. The Sheets-specific setup procedure supplies a complete Sheets connection without adding the other product connections.

### T5-06 — Keep server-specific setup and scopes separate

- **Status:** Conditional. Applies if the setup includes another Workspace server.
- **Actor and scope:** The application administrator configures each selected product.
- **Source:** S2, **Set up the OAuth consent screen**.
- **Exact quotation:** “paste the scopes for the MCP servers you want to use”.
- **Documented scope differences:** The source lists the following suffixes under the fixed prefix `https://www.googleapis.com/auth/`:

| Server | Scope suffixes |
|---|---|
| Gmail | `gmail.readonly`, `gmail.compose` |
| Drive | `drive.readonly`, `drive.file` |
| Docs | `drive.readonly`, `drive.file`, `documents.readonly`, `documents` |
| Sheets | `drive.readonly`, `drive.file`, `spreadsheets.readonly`, `spreadsheets` |
| Slides | `drive.readonly`, `drive.file`, `presentations.readonly`, `presentations` |
| Calendar | `calendar.calendarlist.readonly`, `calendar.events.freebusy`, `calendar.events.readonly` |
| Chat | `chat.spaces.readonly`, `chat.memberships.readonly`, `chat.messages.readonly`, `chat.messages.create`, `chat.users.readstate` |
| People | `directory.readonly`, `userinfo.profile`, `contacts.readonly` |

- **Additional setup difference:** S2, **Configure the Chat app**.
- **Exact quotation:** “To use the Google Chat MCP server, you must configure a Chat app in your Google Cloud project.”
- **Authentication evidence:** S2 supplies `clientId` and `clientSecret` for each server in its connection example.
- **Interpretation:** Do not apply Chat application setup to Sheets. The shared example establishes remote URLs and OAuth settings for these servers. It does not require all servers for a Sheets connection.

### T5-07 — Check Developer Preview access

- **Status:** Required access condition for the documented service.
- **Actor and scope:** The setup administrator and connecting user must meet the preview program conditions. Topics 1–3 must establish the details.
- **Source:** S1, opening notice.
- **Exact quotation:** “Developer Preview: Available as part of the Google Workspace Developer Preview Program”.
- **Linked source:** https://developers.google.com/workspace/preview
- **Current-service confirmation:** S5, entry that announces the Sheets MCP server.
- **Exact quotation:** “The Model Context Protocol (MCP) server for Google Sheets is now available in developer preview.”
- **Interpretation:** The live setup page and release notes agree that the service is in Developer Preview. No replacement notice was found in the inspected material.

### T5-08 — Screen prompts and responses

- **Status:** Required.
- **Actor and scope:** The application or security administrator provides protection for MCP prompts and responses.
- **Documented action:** Use Model Armor, or use and document another solution so that users can accept the risk.
- **Source:** S1, **Important security consideration: Indirect prompt injection**; S3, opening section.
- **Exact quotation:** “You must screen prompts and responses for malicious content or prompt injection attacks.”
- **Exact quotation:** “You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Interpretation:** This is a setup dependency, not a change to the Sheets endpoint. Topic 2 and the coordinator must select a documented security path.

## Unresolved questions

### Non-blocking — Extra headers or URL parameters

The Sheets-specific remote examples show the endpoint and OAuth client settings. They do not show an extra header, tenant value, or URL parameter.

S4 includes `x-goog-user-project` in a separate Gemini CLI example that uses Google credentials. That example does not establish that this header is required for the Sheets manual OAuth connection.

**Sources checked:** S1, **Configure your MCP client**; S4, client configuration examples.

**Disposition:** Do not add a project header as a Sheets requirement without applicable evidence. This uncertainty does not prevent the documented manual OAuth connection action.

### Non-blocking — Dynamic Client Registration

The reviewed Sheets setup page documents pre-registered OAuth clients. It does not establish Dynamic Client Registration support.

**Source checked:** S1, **Configure your MCP client**.

**Disposition:** Use the documented manual registration path. Do not claim that Dynamic Client Registration is unsupported.

### Non-blocking within Topic 5 — Preview admission details

The preview page did not yield usable program details in the bounded extraction. The Sheets page clearly identifies the preview condition.

**Sources checked:** S1 opening notice; linked preview page; S5 Sheets announcement.

**Disposition:** Topics 1–3 must verify admission, project registration, and user eligibility. The remote endpoint itself is established.

## Cross-topic dependencies

- **Topic 1:** Verify authority to enable `sheets.googleapis.com` and `sheetsmcp.googleapis.com`, configure OAuth scopes, and configure the selected security solution. Verify preview enrollment authority.
- **Topic 2:** Use the Sheets-specific two-service setup. Check preview project registration and mandatory prompt/response screening. Do not require all Workspace services or Chat application setup.
- **Topic 3:** Verify preview user eligibility and spreadsheet access. S1 states that the server will “Inherit the same permissions and data governance controls as the user.”
- **Topic 4:** Use the Sheets OAuth scope list and manual client registration evidence. Verify refresh-token settings and any required authorization parameters. Do not infer Dynamic Client Registration support.
- **Coordinator:** Use `https://sheetsmcp.googleapis.com/mcp/v1` for the remote source. Use `{{ gram.oauth.callback_url }}` for the client-specific redirect value. Verify manual OAuth compatibility and the required security path. A local process is not part of the documented browser connector path.

Research dossier completed: 2026-09-11T19:07:42Z.
