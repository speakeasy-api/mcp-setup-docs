---
research_version: 1
slug: google-slides
researched_at: 2026-09-11T20:13:00Z
---

# Google Slides — Research Dossier

## Research status

Complete for the selected setup path. The saved Topics 1, 2, 3, and 5 establish completed initial research. The interrupted Topic 4 report did not complete authentication research. Recovery follow-up round 1 completed that report. The coordinator then selected authentication and checked the official client implementation. Recovery follow-up round 2 completed the final Topic 1 authority audit for actions A1–A7. No blocking question remains. The topic reports below retain their source quotations and conditions. Where an initial report asks for a later check, the final audit and central client check give the result. Do not treat those earlier requests as open blockers.

This is a recovery of a local draft trial, not the integrated factory. The destination is `/workspace/guides/google-slides/`; mode is `update`. Google / Google Slides and slug `google-slides` match the existing identity. No alias is created. The persona is `doctrine/personas/it-admin.md`. The client is the Speakeasy AI Control Plane. STE takes priority over conflicting voice rules. Existing guide instructions are not research evidence.

## Server facts

- Remote endpoint: `https://slidesmcp.googleapis.com/mcp/v1`. It is shared, not tenanted. T5-01 gives official MCP endpoint evidence. No local process or bridge is selected. A specific HTTP transport need not be proved for the endpoint gate.
- Google Workspace Developer Preview enrollment and project registration are required. Google documents eight product servers. T5-03 records their names, addresses and purposes. Connect only Slides; do not add other servers or their service prerequisites.
- Authentication: OAuth 2.0 with a pre-registered Web application client. Use the four documented Slides scopes. A Drive data scope does not require a Drive MCP connection.
- Initial offline access and consent are automatic for the Google upstream issuer in the inspected client implementation. The client stores and can use refresh tokens. No automatic behavior becomes an extra user setup step.
- The user needs a Workspace account and access to the presentations for the intended operations. Internal OAuth users must belong to the associated organization. External Testing users must be on the test-user list. Preview audience limits still apply.
- An External app in Testing permits up to 100 test users. Authorization and refresh tokens expire after seven days for these data scopes. Another sign-in is required. Other application states do not guarantee permanent access; revocation, six months without use, administrator restrictions, time-based grants and token limits can end access. Do not include renewal procedures.
- Required prompt and response screening: select the documented project-level Model Armor path. Google also permits a documented customer solution, but that alternative is not selected here. Do not claim that Speakeasy OAuth provides screening.

## Credential flow

The administrator uses an existing suitable Cloud project registered for the preview. Service Usage Admin can enable the selected services. OAuth Config Editor can configure consent, scopes, test users and the client. Model Armor Floor Setting Admin can configure the selected floor setting. Company approval and Workspace application policy approval remain separate from those Cloud roles. The final audit below establishes the actors and scopes.

Create the Web application client under Google Auth Platform. Paste `{{ gram.oauth.callback_url }}` into Authorized redirect URIs. The guide renderer supplies the actual callback value. Copy the Client ID and Client Secret when created and store them securely. The client secret is visible and downloadable only at creation in the current Google web-server procedure. In Speakeasy, attach those values to the remote identity provider with Client Type Manual. Confirm the displayed Redirect URI matches the registered value. When the connection requests provider access, the eligible user completes Google authorization.

The four requested scopes are:

```text
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/presentations.readonly
https://www.googleapis.com/auth/presentations
```

## Console walkthrough

The following actions are canonical. The appendix reports are evidence, not additional duplicate setup steps. Source identifiers refer to the topic reports below. Use documented detail; do not invent missing UI labels.

### Register the project for Developer Preview {#register-developer-preview}

A1; T2-01, T2-02, T3-03 and final T1-03/T1-08. Entry: https://developers.google.com/workspace/preview, How to join the program. An authorized company representative reviews the program terms and submits the linked application with the Workspace account and existing Cloud project information. Use the project number for registration. Permit Google Groups membership for the applicant account. Wait for the final project-registration confirmation. Keep preview applications inside the domain or company unless Google explicitly grants an exception. Do not include preview features in public applications before general availability. Government or regulatory use is limited to test or experimental data, except for the stated educational-institution exception.

Screenshot note: Developer Preview Program page, How to join the program, and the application link; no private application data.

### Enable the Google Slides APIs {#enable-google-slides-apis}

A2; T2-03, T5-02 and final T1-01. Entry: https://developers.google.com/workspace/slides/api/guides/configure-mcp-server, Enable the APIs and Enable the MCP services. Select the same registered project in Google Cloud. Use the documented console enablement links or have the authorized Cloud administrator run the documented service commands. The project ID is the selected project's ID, not its number. Enable `slides.googleapis.com` and `slidesmcp.googleapis.com`. Do not add an MCP Tool User role from the old guide; current sourced reports do not establish that assignment for this Workspace procedure.

Screenshot note: Google Cloud service page for the Slides MCP API in the selected project, with project-specific values hidden.

### Configure prompt and response screening {#configure-mcp-security}

A3; T2-08 and final T1-05. Entry: https://developers.google.com/workspace/guides/configure-mcp-security, Enable Model Armor and Configure protection for Google and Google Cloud remote MCP servers. Before configuration, the security owner must assess entire-payload logging, routing and data-residency effects, and effects on other integrated services. Use Service Usage Admin for API enablement and Model Armor Floor Setting Admin for the project floor setting. If the reader lacks these permissions or approval authority, the appropriate authorized administrator must perform this action.

Enable `modelarmor.googleapis.com` for the selected project. The maintained source gives this command; a browser-focused guide can assign it to the Cloud administrator and link to the documented procedure rather than invent a console equivalent:

```sh
gcloud model-armor floorsettings update \
--full-uri='projects/PROJECT_ID/locations/global/floorSetting' \
--enable-floor-setting-enforcement=TRUE \
--add-integrated-services=GOOGLE_MCP_SERVER \
--google-mcp-server-enforcement-type=INSPECT_AND_BLOCK \
--enable-google-mcp-server-cloud-logging \
--malicious-uri-filter-settings-enforcement=ENABLED \
--add-rai-settings-filters='[{"confidenceLevel": "MEDIUM_AND_ABOVE", "filterType": "DANGEROUS"}]'
```

Replace PROJECT_ID with the registered project's ID. Do not execute this command during research or guide writing. This path selects one project. The source also notes that if floor settings are configured in both client and resource projects, Model Armor is invoked twice. This does not require a second project in this setup.

Screenshot exception: The provider documents this selected floor-setting action as a command.

### Configure the OAuth consent screen {#configure-oauth-consent}

A4; T2-04 through T2-06, T4-03/T4-06/T4-07 and final T1-02. Entry: https://console.cloud.google.com/auth/branding in the selected project. The shared setup source https://developers.google.com/workspace/guides/configure-mcp-servers gives Google Auth Platform > Branding. If unconfigured, select Get Started. Under App Information, set App name to `Workspace MCP Servers` and select an appropriate User support email. Under Audience, select Internal; if unavailable, select External. Enter a Contact Information email. At Finish, an authorized person must review and accept the user-data policy. Select Continue, then Create. Existing configurations use Branding, Audience and Data Access.

If External applies, use Audience > Test users > Add users. Add the setup user's email address and other authorized test users, then Save. Warn before authorization: External Testing requires another sign-in after seven days. Do not publish the app to avoid that limit. Internal users must be members of the associated organization.

In Data Access > Add or Remove Scopes > Manually add scopes, add the four scope values above. Select Add to Table, Update, then Save on Data Access. The OAuth Config Editor role does not grant presentation access or Workspace policy approval.

Screenshot note: Google Auth Platform Audience and Data Access with the four Slides scopes and no user addresses shown.

### Create the OAuth client {#create-oauth-client}

A5; T4-02 and final T1-02. Entry: https://console.cloud.google.com/auth/clients, in the same project. Select Clients > Create Client. Select Web application, enter a Name, then Authorized redirect URIs > + Add URI. Enter `{{ gram.oauth.callback_url }}`. It must exactly match the rendered callback. Select Create. Use the product-specific client ID and secret procedure; do not copy the Claude or Antigravity redirect URI.

Screenshot note: Create OAuth client ID with Web application and the authorized redirect URI field; no secret values.

### Copy the OAuth credentials {#copy-oauth-credentials}

Continuation of A5; T4-02 and Google Identity web-server, Create authorization credentials. Copy the Client ID and Client Secret from the creation result. Store them securely before closing it. The secret is only visible and downloadable at creation. Supply these values in Speakeasy's manual identity-provider sheet. No renewal or rotation procedure is in scope.

Screenshot note: OAuth creation result with both credential values fully hidden.

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

A6; final T1-06/T1-07, T3-01/T3-02. Conditional: if Workspace policy blocks or limits required access. Entry: https://admin.google.com, Security > Access and data control > API controls > Manage App Access. A Workspace administrator with the Service Settings administrator privilege selects the application and applicable organizational unit, then sets the approved access level. Obtain the client ID from the previous step. Specific Google data can limit access to the required scopes. Include Google Sign-in scopes required by the app when they apply; do not invent extra Slides data scopes. Do not default to Trusted or disable controls. The top organizational unit applies to the entire organization by default; check the selected scope before changing access. Follow https://support.google.com/a/answer/7281227?hl=en for the documented application-approval procedure.

The connecting user must already have the presentation permissions for the intended operation. If those permissions are missing, obtain help from the person who controls the presentation's access. Cloud setup roles do not grant that data access.

Screenshot note: Workspace Manage App Access with the application and organizational-unit scope; hide user and client identifiers.

## Speakeasy setup

A7. Select custom remote only to connect the exact Slides endpoint, independent of catalog mapping. Set `speakeasy_add_server: custom-remote`. No catalog presence claim is made.

- Remote URL: `https://slidesmcp.googleapis.com/mcp/v1`.
- Authentication option: `oauth-client`, OAuth, manual registration, provider steps.
- Client ID and Client Secret source: `external.md#copy-oauth-credentials`.
- Callback registration source: `external.md#create-oauth-client`.
- Issuer: `https://accounts.google.com/`; discoverable from the remote protected-resource metadata. Authorization and token URLs are established in the central client evidence.
- Request only the four documented scope values above. Use Scope (override) when needed to avoid the additional broad Drive scope in public resource metadata. Audience has no selected override. Google metadata advertises both client_secret_post and client_secret_basic. Do not invent an authentication-method requirement.
- Further reading: https://developers.google.com/workspace/slides/api/guides/configure-mcp-server.
- Fixed anchors: `add-server-in-speakeasy` and `connect-speakeasy-credentials`.
- User actions come from `doctrine/speakeasy-setup.md`, observed 2026-09-11. Its skeleton is transcluded below. Use only the selected custom-remote/manual variant. Stop after credentials; do not add toolset, playground, or downstream-client setup.

## Research limitations

### Operator-approved transport normalization

The saved official endpoint source states `Transport: HTTP`. The operator has approved mapping documented HTTP to `streamable-http` for these MCP guides, so `remotes[0].transport` now uses that schema value. This resolves the earlier missing-field blocker without changing the schema or endpoint gate. This is an operator-approved interpretation, not new fetched source evidence, a universal statement about HTTP, or live transport verification. Provider quotations remain unchanged.

Both permitted factual follow-up rounds were used for authentication and the final authority audit. No third research round was started. Normal human review and CI remain required before merge or publication.

No authenticated connection or provider change was made. No screenshot was captured. The client tests were inspected, not executed. A separate release-note check was not completed; maintained pages showed no replacement notice in the checked passages. Existing report dates and quotations are retained. Some earlier requests timed out; they do not establish that a feature is unsupported. The final reports identify which facts were confirmed live and which source excerpts were retained.

Public evidence cannot establish current organization-specific app policy or presentation permissions. Handle these as conditional administrator actions, not invented universal access grants. Separate preview enrollment for each connecting user is not established. The service-level `servicemanagement.services.bind` requirement is listed in the general reference, but the documented preview registration procedure supplies access; no additional customer role-assignment action was found. Use the documented procedure.

The selected path uses an existing suitable project. Project creation and billing changes are not selected or audited. A Speakeasy role name is not established by the setup doctrine; use the documented connection procedure without inventing a role.

## Operator decisions

None blocks this draft. The administrator must supply environment values and obtain the documented approvals. No publication, commit, PR, or provider operation is authorized in this trial.

## Provenance and execution record

Official source families: Google Workspace developer setup and preview pages; Google Identity OAuth documentation; Google Cloud IAM and Model Armor references; Google Workspace administrator support; Google Auth Platform support; public Google OAuth metadata; and the official Speakeasy implementation repository. The reports below give source URLs, sections, observation dates and exact quotations. The central check supplies commit-pinned implementation sources. Repository writing sources are doctrine/constitution.md, doctrine/shared.md, doctrine/roles/writer.md, doctrine/personas/it-admin.md and doctrine/speakeasy-setup.md. The local trial and recovery instructions override conflicting pipeline and voice requirements.

The original dispatch failures and exact prompts remain in `.factory/google-slides-trial/` and `.factory/dispatch-errors.jsonl`. Recovery prompts and complete reports are in `.factory/google-slides-recovery/`. Dispatch records identify document hash and follow-up index. Two factual follow-up rounds were used; no third research round is permitted. Old session handles were not resumed. No automated post-draft reviewer was run.

The following appendices preserve complete evidence reports. They do not create extra setup actions or preserve superseded open checks.

## Appendix: Central client check and selected actions

# Client check and setup-path selection

Observation date: 2026-09-11. Status: complete for the selected upstream manual OAuth path.

## Client evidence

The user-action source is `doctrine/speakeasy-setup.md`, sections Per-guide values, Add-server path selection, Add the server in Speakeasy, and Connect your credentials. Select custom remote server and manual OAuth. Register `{{ gram.oauth.callback_url }}` in Google. The rendered value must match the Redirect URI in Attach Remote Identity Provider. Do not add a trip to this sheet during provider setup.

The official implementation source is https://github.com/speakeasy-api/gram at commit `5827550fca19b50c27e06fcabd384cae62963aa9`. This is implementation evidence, not a new source of user actions.

- C1: [Google interceptor, lines 26–52](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/interceptors/google.go#L26-L52). Excerpts: `strings.EqualFold(u.Hostname(), "accounts.google.com")`; `q.Set("access_type", "offline")`; `prompts = append(prompts, "consent")`. The interceptor matches the Google issuer hostname. It requests offline access and adds consent without removing an existing prompt value.
- C2: [Challenge manager registration, lines 272–289](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/challenge.go#L272-L289) and [upstream authorization, lines 790–819](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/challenge.go#L790-L819). Excerpts: `interceptors.NewGoogle(logger)`; `q.Set("client_id", client.ExternalClientID)`; `if ic.Match(client.IssuerURL) { ic.ModifyAuthorize(ctx, q) }`. The constructor installs the interceptor. The upstream authorization URL uses the external client ID. No DCR-only condition or Google feature flag appears on this path. This is not downstream client registration or the administrator login flow.
- C3: [Manual client creation, lines 179–222](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/clienthandlers.go#L179-L222). Excerpts: `clientID := strings.TrimSpace(payload.ClientID)`; `ClientSecretEncrypted: secretCiphertext`. Manual registration stores the external client ID and encrypted client secret for the remote issuer. [Manual registration tests, lines 24–75](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/clienthandlers_test.go#L24-L75) test this mode. Manual registration is applicable; DCR and CIMD are not selected.
- C4: [Token storage, lines 988–1003](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/challenge.go#L988-L1003) and [session storage, lines 1080–1105](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/challenge.go#L1080-L1105). Excerpt: `m.enc.Encrypt([]byte(tok.RefreshToken))`. The callback encrypts and stores an issued refresh token. [Upstream refresh, lines 559–612](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/tokenservice.go#L559-L612) decrypts it and sends `form.Set("grant_type", "refresh_token")` and `form.Set("refresh_token", refreshToken)` to the upstream token endpoint. A usable stored refresh token and configured token endpoint are necessary. This does not establish permanent access or unconditional background refresh.
- C5: [Google tests, lines 13–75](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/interceptors/google_test.go#L13-L75) test issuer matching, rejection of other issuers, offline access, consent, prompt preservation, and no duplicate consent. Excerpts: `require.Equal(t, "offline", q.Get("access_type"))`; `require.Equal(t, "consent", q.Get("prompt"))`. [Refresh tests, lines 89–235](https://github.com/speakeasy-api/gram/blob/5827550fca19b50c27e06fcabd384cae62963aa9/server/internal/remotesessions/refreshsession_test.go#L89-L235) cover refresh and missing, unreadable, or rejected tokens. Tests were inspected, not executed in this trial.

Public metadata was read on 2026-09-11:

- https://slidesmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1: `authorization_servers` contains `https://accounts.google.com/`; `resource` is `https://slidesmcp.googleapis.com/mcp/v1`. This issuer satisfies C1. Its advertised scopes include the four documented Slides setup scopes and the broader Drive scope. Use only the four setup scopes, not the extra broad Drive scope.
- https://accounts.google.com/.well-known/oauth-authorization-server: issuer `https://accounts.google.com`; authorization endpoint `https://accounts.google.com/o/oauth2/v2/auth`; token endpoint `https://oauth2.googleapis.com/token`; grant types include `authorization_code` and `refresh_token`; token endpoint authentication includes `client_secret_post` and `client_secret_basic`. No registration endpoint is present. This supports discovery with a pre-registered client, not a DCR setup claim.

The inspected implementation establishes the required Google behavior for the matching upstream issuer. There is no concrete evidence here of a deployed-version difference. This is not a live authenticated connection test. Do not require a manual offline-access parameter step; the client adds it. Do not infer prompt screening from OAuth support.

## Selected actions for the final authority audit

Select the shared Google Slides endpoint, custom remote server, and pre-registered Web application OAuth client. Prefer Internal as Google documents. If Internal is unavailable, use External Testing with authorized test users and the seven-day access warning. Do not change publishing status only to avoid that limit. Keep preview access inside the domain or company unless Google expressly permits an exception.

Select Google's documented project-level Model Armor option for required prompt and response screening. Do not assume Speakeasy provides that screening. The security owner must consider entire-payload logging, routing and data-residency effects, and effects on other integrated services before setup.

| Action | Required operation | Sources and topic findings |
| --- | --- | --- |
| A1 | Accept Developer Preview terms with company authority; submit Workspace account and Cloud project number; permit Google Group membership; wait for project registration confirmation. Keep preview audience and government-data limits. | T2-01, T2-02, T1-03, T3-03; https://developers.google.com/workspace/preview |
| A2 | Select the registered project. Enable `slides.googleapis.com` and `slidesmcp.googleapis.com`. Obtain its project ID for commands. | T2-03, T5 endpoint report, T1-01; https://developers.google.com/workspace/slides/api/guides/configure-mcp-server |
| A3 | Enable `modelarmor.googleapis.com`; configure a project floor setting with enforcement, `GOOGLE_MCP_SERVER`, `INSPECT_AND_BLOCK`, malicious-URI filtering, and the documented DANGEROUS filter at MEDIUM_AND_ABOVE. Use `projects/PROJECT_ID/locations/global/floorSetting`. Review logging, residency and project-wide effects. | T2-08, T1-05; https://developers.google.com/workspace/guides/configure-mcp-security; https://docs.cloud.google.com/model-armor/configure-floor-settings |
| A4 | Configure Google Auth Platform Branding, Audience, Contact Information and policy acceptance. App name `Workspace MCP Servers`. Select Internal, or External if unavailable. Add authorized External test users. Add the four documented Slides scopes in Data Access. | T2-04 through T2-06, T3-02, T4-03 and T4-06; https://developers.google.com/workspace/guides/configure-mcp-servers |
| A5 | Create a Web application OAuth client. Register the Speakeasy callback URI. Copy and securely store the Client ID and Client Secret at creation. | T4-02; https://developers.google.com/workspace/slides/api/guides/configure-mcp-server; https://developers.google.com/identity/protocols/oauth2/web-server |
| A6 | If Workspace policy blocks the OAuth application, have the authorized Workspace administrator manage application access for the needed users and scopes. Do not make broad trust or disabling controls the default. Users need the presentation permissions for the intended tools. | T1-06, T3-01 and T3-02; https://support.google.com/a/answer/7281227?hl=en; Slides setup page |
| A7 | Add only `https://slidesmcp.googleapis.com/mcp/v1` as a custom remote source in Speakeasy. Attach the pre-registered manual OAuth client. Use discovered Google endpoints and the four selected scopes. Complete the Google consent flow with the intended eligible user when access is requested. | T5, T4, C1–C5; doctrine/speakeasy-setup.md |

Four selected scopes: `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/drive.file`, `https://www.googleapis.com/auth/presentations.readonly`, `https://www.googleapis.com/auth/presentations`.

No unused authentication alternative or credential renewal procedure belongs in the guide.

## Appendix: Evidence report — .factory/google-slides-trial/topic-5-report.md

## Topic and status

**Topic 5: MCP endpoint and connection configuration — complete.**

Google documents a remote Google Slides MCP server at:

`https://slidesmcp.googleapis.com/mcp/v1`

This is an MCP endpoint, not the general Slides API endpoint. The documented connection does not use a local proxy or bridge. No blocking endpoint gap remains.

All sources below were observed on **2026-09-11**. The Slides setup page and the shared Workspace setup page show **Last updated 2026-09-03 UTC**.

## Findings

### T5-01 — Remote Slides endpoint

- **Status:** Required.
- **Actor and scope:** The connection administrator sets the server address in the MCP client. The client connects to Google Slides for the signed-in user.
- **Documented values:**
  - Server name: `slides`
  - Server URL: `https://slidesmcp.googleapis.com/mcp/v1`
  - Transport: `HTTP`
  - Authentication: OAuth 2.0
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Location:** “Configure your MCP client” → “Others.”
- **Exact quotation:** “Server URL: https://slidesmcp.googleapis.com/mcp/v1”
- **Exact quotation:** “Transport: HTTP”
- **Exact quotation:** “The Google Slides remote MCP server uses OAuth 2.0.”
- **Interpretation:** The fixed URL is suitable for the supplied remote-URL connection path. The documented address has no tenant, project, region, or environment variable.

### T5-02 — Enable services in the Google Cloud project

- **Status:** Required.
- **Actor and scope:** A person with applicable Google Cloud authority enables services in the project used for setup. Topic 1 must establish that authority.
- **Documented action:** Enable:
  - Google Slides API: `slides.googleapis.com`
  - Google Slides MCP API: `slidesmcp.googleapis.com`
- **Environment value:** The CLI examples use `PROJECT_ID`. The source defines it as the Google Cloud project ID. Console enablement links are also available.
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Locations:** “Configure the Google Slides MCP server”; “Enable the APIs”; “Enable the MCP services.”
- **Exact quotation:** “To use the Google Slides MCP server, you must enable it in your Google Cloud project and then configure your MCP client to connect to it.”
- **Exact quotation:** “gcloud services enable slides.googleapis.com”
- **Exact quotation:** “gcloud services enable slidesmcp.googleapis.com”
- **Exact quotation:** “Replace PROJECT_ID with your Google Cloud project ID.”
- **Interpretation:** The customer enables access to the service. The customer does not create a tenant-specific MCP URL. Project-specific setup does not change the documented endpoint.

### T5-03 — Workspace has separate product servers

- **Status:** Conditional. Select another server only when the requested connection includes that product.
- **Actor and scope:** The connection administrator selects each product server. Each server accesses its own product data.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers
- **Locations:** Introduction; “Configure your MCP client” → “Claude”; “Supported products.”
- **Exact quotation:** “Each Google Workspace product has its own dedicated MCP server.”
- **Exact quotation:** “Repeat these steps for each Google Workspace product you want to add.”

The official connection list documents these servers:

| Server | Remote MCP URL | Function shown by the tool list |
|---|---|---|
| Gmail | `https://gmailmcp.googleapis.com/mcp/v1` | Read and search mail; create drafts; manage labels. |
| Google Drive | `https://drivemcp.googleapis.com/mcp/v1` | Search, read, create, and copy files; read metadata and permissions. |
| Google Docs | `https://docsmcp.googleapis.com/mcp/v1` | Read and update documents. |
| Google Sheets | `https://sheetsmcp.googleapis.com/mcp/v1` | Read and update spreadsheets, values, formulas, and dimensions. |
| **Google Slides** | **`https://slidesmcp.googleapis.com/mcp/v1`** | **Read and update presentations.** |
| Google Calendar | `https://calendarmcp.googleapis.com/mcp/v1` | Read, search, create, update, and delete events; find meeting times. |
| Google Chat | `https://chatmcp.googleapis.com/mcp/v1` | Read and search conversations; send messages; manage read state. |
| People API | `https://people.googleapis.com/mcp/v1` | Read profiles; search contacts and directory people. |

- **Exact quotation for Slides tools:** “Google Slides read_presentation update_presentation”
- **Exact quotation for People tools:** “People API get_user_profile search_contacts search_directory_people”
- **Interpretation:** These are separate product servers, not tenant variants. Only the Slides server applies to the requested setup. Drive scopes in the Slides setup do not mean that the user must also connect the Drive MCP server.

### T5-04 — Server configuration differs by product

- **Status:** Required for Slides; conditional for other product connections.
- **Actor and scope:** The application administrator configures the OAuth application. The connecting user grants access.
- **Slides scopes documented in the shared setup:**
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/presentations.readonly`
  - `https://www.googleapis.com/auth/presentations`
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers
- **Location:** “Set up the OAuth consent screen” → “Manually add scopes.”
- **Exact quotation:** “paste the scopes for the MCP servers you want to use”
- **Exact quotation:** “Google Slides: https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/presentations.readonly https://www.googleapis.com/auth/presentations”
- **Other material differences:**
  - Other products have separate scope lists. Do not apply those lists to Slides.
  - Chat requires a Chat app.
  - People uses `people.googleapis.com` as both its API service and its MCP endpoint host.
- **Source location for Chat:** “Configure the Chat app.”
- **Exact quotation:** “To use the Google Chat MCP server, you must configure a Chat app in your Google Cloud project.”
- **Interpretation:** The shared examples use OAuth client IDs and secrets for these product servers. Product-specific scopes and enablement still apply. The Chat app requirement must not be copied into the Slides setup.

### T5-05 — Pre-registered OAuth connection example

- **Status:** Required for the documented manual OAuth path.
- **Actor and scope:** The application administrator creates an OAuth client. The MCP client uses its client ID and client secret.
- **Documented action:** Create an OAuth client with application type `Web application`. Register the callback URL for the chosen client.
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Location:** “Configure your MCP client” → “Claude.”
- **Exact quotation:** “configure a custom connector with an OAuth client ID and secret”
- **Exact quotation:** “Select Web application as the application type.”
- **Exact quotation:** “In Advanced settings, enter your OAuth client ID and OAuth client secret.”
- **Interpretation:** Google provides a direct remote-URL example with a pre-registered OAuth client. The example supports investigation of the supplied manual OAuth path. Its Claude callback URL is not the callback URL for Speakeasy.

### T5-06 — Preview access and security apply

- **Status:** Required.
- **Actor and scope:** The organization and application owners must check preview eligibility and required security controls.
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Location:** Opening notice.
- **Exact quotation:** “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
- **Linked source:** https://developers.google.com/workspace/preview
- **Source location:** “Important security consideration: Indirect prompt injection.”
- **Exact quotation:** “you must screen prompts and responses for malicious content or prompt injection attacks”
- **Exact quotation:** “You can use the Google-provided Model Armor or you can use your own solution if you document it in order for users to accept that risk.”
- **Linked source:** https://developers.google.com/workspace/guides/configure-mcp-security
- **Interpretation:** Endpoint availability alone does not complete preview enrollment or security setup. These requirements need checks by the other owners.

## Unresolved questions

### Non-blocking — Additional headers or URL parameters

The Slides “Others” section and direct connection examples specify the URL and OAuth configuration. They do not specify an extra static header or URL parameter.

This is not proof that every possible header is unnecessary. It does not prevent use of the documented connection procedure.

### Non-blocking — DCR support

The checked Slides page documents pre-registered OAuth clients. It does not establish dynamic client registration support. The coordinator can select manual OAuth if its required client checks pass.

### Non-blocking — Release-change confirmation

The live Workspace release-notes page was reachable:

https://developers.google.com/workspace/release-notes

The bounded review did not establish a separate release notice for the Slides MCP setup. The maintained setup pages showed no replacement notice. This does not block the documented endpoint connection.

### Non-blocking — Other product details

The shared page establishes the eight Workspace endpoints and their separate configuration. Full permission and access checks for the seven unrequested servers were not completed. They are not part of this Slides-only setup.

## Cross-topic dependencies

- **Topic 1:** Establish authority to enable `slides.googleapis.com` and `slidesmcp.googleapis.com`. Check preview enrollment authority and authority for required security configuration.
- **Topic 2:** Use the Slides-specific service list. Check Developer Preview enrollment. Do not require all Workspace services or a Chat app.
- **Topic 3:** Check connecting-user eligibility and presentation permissions. The Slides page says the server inherits “the same permissions and data governance controls as the user.”
- **Topic 4:** Use the four Slides scopes above. Check the pre-registered Web application OAuth path, token settings, and refresh-token requirements.
- **Coordinator:** Use `https://slidesmcp.googleapis.com/mcp/v1` as the remote server URL. Select only the Slides server. Check manual OAuth support with the supplied Speakeasy callback value. Do not copy an Antigravity or Claude callback.
- **Coordinator:** Check whether the client meets the required prompt-and-response security procedure, or whether a documented alternative is needed.
- **Coordinator:** The remote endpoint check passes. No local process, proxy, or bridge is needed by the documented connection example.

## Appendix: Evidence report — .factory/google-slides-trial/topic-2-attempt-2-report.md

## Topic and status

**Topic 2: Organization-level setup — complete.**

The official sources establish preview registration, project service enablement, OAuth application configuration, and required security screening. Google documents a security configuration that can apply at the project level.

No blocking organization-configuration gap remains. Topic 1 must check setup authority. The coordinator must select the security method and check client compatibility.

**Observation date for all sources: 2026-09-11.** This report uses public documentation only. No provider settings were changed.

## Findings

### T2-01 — Register the Workspace account and Cloud project for Developer Preview

- **Status:** Required.
- **Actor, recipient, and scope:** The applicant submits a Google Workspace account and Google Cloud project. Google verifies the account and registers the project. Topic 1 must check who can accept the program terms for the organization.
- **Documented action:**
  1. Read the Developer Preview Program Terms.
  2. Submit the application form linked under **How to join the program**.
  3. Supply the Google Workspace account information and Google Cloud project information. The FAQ specifies the **project number**.
  4. Make sure the applicant's email account permits addition to Google Groups.
  5. Receive the group notification and final project-registration confirmation.
- **Environment values:** Use the Workspace account and Cloud project intended for this connection. Do not confuse the project number used for registration with the project ID used in service commands.
- **Sources:**
  - https://developers.google.com/workspace/guides/configure-mcp-servers — opening notice.
    - **Quotation:** “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
  - https://developers.google.com/workspace/preview — **How to join the program**.
    - **Quotation:** “You need to provide us with your Google Workspace account and Google Cloud project information.”
    - **Quotation:** “After verifying your Google Workspace account, we will register your Google Cloud project.”
    - **Quotation:** “When it is done, you will receive a final confirmation to your registered email address.”
  - Same preview URL — **FAQ**, project-number question.
    - **Quotation:** “We provide you access to the program API features through your Google Cloud project(s).”
- **Interpretation:** Enabling the APIs is not a substitute for preview registration. Registration applies to the account and project.

### T2-02 — Keep preview use within the permitted audience and data limits

- **Status:** Required. The government-data restriction is conditional.
- **Actor, recipient, and scope:** The application owner controls who can use the preview application and which data it processes.
- **Documented action and limits:**
  - Do not include preview features in public applications before general availability.
  - Do not give users outside the domain or company access to a preview application, except when Google explicitly permits a request and grants that permission.
  - For use on behalf of a government or regulatory entity, use only test or experimental data. The stated exception covers educational institutions.
- **Source:** https://developers.google.com/workspace/preview — **Developer Preview Program Terms**, items (ii), (iv), and (vii).
  - **Quotation:** “program features may not be included in public applications prior to the General Availability (GA) announcement.”
  - **Quotation:** “I may not grant end users access, outside my domain or company”
  - **Quotation:** “I may only use test or experimental data with Pre-GA APIs”
- **Interpretation:** OAuth audience settings do not remove these program limits. An `External` OAuth audience is not permission for public preview distribution.

### T2-03 — Use a Cloud project and enable the Slides services

- **Status:** Required.
- **Actor, recipient, and scope:** A person with service-enablement authority enables services in the Cloud project used for the connection. Topic 1 owns the authority check.
- **Documented action and values:** Enable:
  - Google Slides API: `slides.googleapis.com`
  - Google Slides MCP API: `slidesmcp.googleapis.com`
- **Environment value:** Use the project ID of the selected, preview-registered project.
- **Sources:**
  - https://developers.google.com/workspace/guides/configure-mcp-servers — **Prerequisites**.
    - **Quotation:** “A Google Cloud project.”
  - Same URL — **Configure the Google Workspace MCP servers**.
    - **Quotation:** “you must enable them in your Google Cloud project and then configure your MCP client to connect to them.”
  - https://developers.google.com/workspace/slides/api/guides/configure-mcp-server — **Enable the APIs** and **Enable the MCP services**. These Slides-specific quotations come from the supplied Topic 5 evidence.
    - **Quotation:** “gcloud services enable slides.googleapis.com”
    - **Quotation:** “gcloud services enable slidesmcp.googleapis.com”
    - **Quotation:** “Replace PROJECT_ID with your Google Cloud project ID.”
- **Interpretation:** Use the Slides-specific service list. Do not copy the shared page's service list for all Workspace products into this Slides-only setup.

### T2-04 — Configure the OAuth consent screen

- **Status:** Required.
- **Actor, recipient, and scope:** The application administrator configures Google Auth Platform in the selected project. Connecting users receive the consent screen. Topic 1 must check configuration authority.
- **Documented action and values:**
  - Open **Google Auth Platform > Branding**.
  - If the platform is not configured, select **Get Started**.
  - Under **App Information**, set **App name** to `Workspace MCP Servers`.
  - Set **User support email** to the administrator's email address or an appropriate Google group.
  - Under **Audience**, select **Internal**. If that option is not available, select **External**.
  - Under **Contact Information**, enter an email address for project notices.
  - Under **Finish**, review the user-data policy. An authorized person must accept it to continue.
  - Select **Continue**, then **Create**.
  - For an existing configuration, use **Branding**, **Audience**, and **Data Access**.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers — **Set up the OAuth consent screen**.
  - **Quotation:** “You must configure the OAuth consent screen before you can create an OAuth client ID.”
  - **Quotation:** “Under App Information, in App name, type Workspace MCP Servers.”
  - **Quotation:** “Under Audience, select Internal. If you can't select Internal, select External.”
- **Interpretation:** Google documents the project-level consent configuration before client registration.

### T2-05 — Add test users for an External audience

- **Status:** Conditional — required by this procedure when **External** is selected.
- **Actor, recipient, and scope:** The application administrator adds authorized test-user email addresses to the OAuth application.
- **Documented action:** Open **Audience**. Under **Test users**, select **Add users**. Enter the administrator's email address and other authorized test users. Select **Save**.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers — **Set up the OAuth consent screen**.
  - **Quotation:** “If you selected External for user type, add test users”
  - **Quotation:** “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** This is an application configuration action. User eligibility and testing-mode token effects belong to Topics 3 and 4.

### T2-06 — Add the four documented Slides scopes

- **Status:** Required for the documented Slides configuration.
- **Actor, recipient, and scope:** The application administrator sets the OAuth application's requested data access. The connecting user later authorizes access. Topic 1 must check scope-configuration authority.
- **Documented action:** Open **Data Access > Add or Remove Scopes**. Under **Manually add scopes**, enter:
  ```text
  https://www.googleapis.com/auth/drive.readonly
  https://www.googleapis.com/auth/drive.file
  https://www.googleapis.com/auth/presentations.readonly
  https://www.googleapis.com/auth/presentations
  ```
  Select **Add to Table**, then **Update**. On **Data Access**, select **Save**.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers — **Set up the OAuth consent screen**, **Manually add scopes**, Google Slides list.
  - **Quotation:** “paste the scopes for the MCP servers you want to use”
  - **Quotation:** “After selecting the scopes required by your app, on the Data Access page, click Save.”
  - **Exact scope values:** As listed above.
- **Interpretation:** The Drive scopes are part of the documented Slides setup. They do not establish a need for a separate Drive MCP connection.

### T2-07 — Register an OAuth Web application for manual OAuth

- **Status:** Required for the documented manual OAuth path.
- **Actor, recipient, and scope:** The application administrator creates an OAuth client in the selected project. The MCP client receives its client ID and client secret.
- **Documented action:** Create an OAuth client with application type **Web application**. Register the callback URI for the selected MCP client.
- **Required client-specific value:** The supplied Speakeasy context gives `{{ gram.oauth.callback_url }}`. This is client input, not a Google-documented fixed URI.
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server — **Configure your MCP client > Claude**. These quotations come from the supplied Topic 5 evidence.
  - **Quotation:** “configure a custom connector with an OAuth client ID and secret”
  - **Quotation:** “Select Web application as the application type.”
- **Interpretation:** Do not copy the Claude callback URI into Speakeasy. Topic 4 and the coordinator must complete the authentication checks.

### T2-08 — Configure prompt and response screening

- **Status:** Required. Model Armor is conditional on the selected security method.
- **Actor, recipient, and scope:** The organization security owner selects the screening method. For Model Armor, a Cloud administrator configures protection in the applicable project.
- **Documented requirement:** Screen prompts and responses. Use Google Model Armor, or document another solution so that users can accept its risk.
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-security — introduction.
  - **Quotation:** “You must screen prompts and responses for malicious content or prompt injection attacks.”
  - **Quotation:** “You can use the Google-provided Model Armor, or you can use your own solution if you document it in order for users to accept that risk.”
- **Model Armor configuration:**
  - Enable the Model Armor API in the selected project.
  - Configure a Model Armor floor setting with MCP sanitization enabled.
  - The documented example enables floor-setting enforcement, adds `GOOGLE_MCP_SERVER`, and uses `INSPECT_AND_BLOCK`.
  - The floor-setting resource is `projects/PROJECT_ID/locations/global/floorSetting`.
  - The example enables malicious-URI filtering and the Responsible AI `DANGEROUS` filter at `MEDIUM_AND_ABOVE`.
- **Same source — Enable Model Armor; Configure protection for Google and Google Cloud remote MCP servers.**
  - **Quotation:** “You must enable Model Armor APIs before you can use Model Armor.”
  - **Quotation:** “Set up a Model Armor floor setting with MCP sanitization enabled.”
  - **Quotation:** “A floor setting defines the minimum security filters that apply across the project.”
- **Important configuration effects:**
  - **Source location:** **Use Model Armor**.
    - **Quotation:** “Model Armor logs the entire payload.”
  - **Source location:** **MCP request routing to Model Armor**.
    - **Quotation:** “might break data residency compliance for in-use and in-transit data.”
  - **Source location:** final floor-settings warning.
    - **Quotation:** “changes you make to floor settings can affect traffic scanning and safety behaviors across all integrated services, not just MCP.”
- **Interpretation:** Do not present all Model Armor settings as harmless defaults. The security owner must consider logging, data residency, and effects on other integrated services.

## Unresolved questions

- **Non-blocking — Organization-specific access policies.** The checked MCP setup and security pages do not establish whether this organization already blocks the OAuth application or requested data access. Topic 3 must check applicable Workspace app-access controls. Do not state that administrator approval is unnecessary.
- **Non-blocking for this topic — Setup authority.** This report does not establish authority for preview-term acceptance, OAuth configuration, or floor-setting changes. Topic 1 must verify these actions. The security page does establish `serviceusage.services.enable`, with **Service Usage Admin** as an applicable role for API enablement.
- **Non-blocking — Security method not selected.** Google supplies a concrete Model Armor configuration and permits a documented alternative. The coordinator must select the method and resolve any required client or data-residency checks. Do not claim that Speakeasy already meets this requirement.
- **Non-blocking — Release-change confirmation.** A separate release-note review was not completed within the research period. The live setup, preview, and security pages showed no replacement notice. This does not prove that no relevant changes exist.
- **Non-blocking — Application-form fields.** The linked application form was not inspected. The maintained preview page gives the required account and project information and the registration sequence. Exact additional form labels do not prevent drafting.

## Cross-topic dependencies

- **Topic 1:** Verify authority for preview enrollment and terms, service enablement, OAuth settings and scopes, and Model Armor configuration.
- **Topic 3:** Use the preview audience limits and External test-user requirement. Check connecting-user eligibility, Workspace app-access controls, and presentation permissions.
- **Topic 4:** Use the four Slides scopes, Web application registration, and audience configuration. Check refresh tokens, testing-mode limits, and exact OAuth registration details.
- **Topic 5:** Use only the Slides services and endpoint. No separate Chat application belongs in this setup.
- **Coordinator:** Select manual OAuth using the supplied Speakeasy callback value. Select and verify the required security method. Keep the setup within Developer Preview audience and data limits.

## Appendix: Evidence report — .factory/google-slides-trial/topic-3-attempt-2-report.md

## Topic and status

**Topic 3: Connecting-user setup — complete.**

The official Slides setup page establishes inherited user permissions and the required test-user assignment for an External OAuth application. The preview page also establishes an account setting for the preview applicant. The checked sources do not establish a separate enrollment requirement for each connecting user.

All observations below are dated **2026-09-11**. The Slides setup page shows **Last updated 2026-09-03 UTC**.

## Findings

### T3-01 — The server uses the connecting user’s permissions

- **Status:** Required.
- **Actor and scope:** The connecting user needs access to each presentation that the server will use. The person who controls presentation access must give the user the applicable access.
- **Documented action and values:** Google states that the server inherits the user’s permissions. Use an account with the permissions needed for the intended presentation operation. Presentation identifiers and existing access come from the user’s environment.
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Location:** Introduction, capability list, “Respect security.”
- **Observation date:** 2026-09-11.
- **Exact quotation:** “Respect security: Inherit the same permissions and data governance controls as the user.”
- **Source statement:** MCP access follows the user’s permissions and data governance controls.
- **Interpretation:** An MCP connection does not give the user additional presentation permissions. Read and change operations depend on the user’s existing access. This source does not give a separate MCP role or a detailed presentation-sharing procedure.

### T3-02 — Add authorized test users for an External OAuth application

- **Status:** Conditional. This action applies when the application owner selects **External** as the user type in the documented setup procedure.
- **Actor and scope:** The person who configures the OAuth application adds the connecting users. The assignment applies to that application.
- **Documented action:**
  1. Click **Audience**.
  2. Under **Test users**, click **Add users**.
  3. Enter the setup user’s email address and the email addresses of other authorized test users.
  4. Click **Save**.
- **Required values:** Use the Google Account email addresses of the people who will test the connection.
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Location:** “Set up the OAuth consent screen.”
- **Observation date:** 2026-09-11.
- **Exact quotation:** “If you selected External for user type, add test users:”
- **Exact quotation:** “Click Audience.”
- **Exact quotation:** “Under Test users, click Add users.”
- **Exact quotation:** “Enter your email address and any other authorized test users, then click Save.”
- **Source statement:** The documented External setup includes a test-user list.
- **Interpretation:** The application owner must include each authorized connecting test user in this list. This is an individual access assignment, not the later sign-in procedure.
- **Authority:** The page gives the procedure. Topic 1 must establish the applicable authority to manage the application’s audience.

### T3-03 — The preview applicant’s email account must accept Google Group membership

- **Status:** Conditional. This requirement applies to the person whose account is used for Developer Preview Program enrollment. The checked source does not state that every connecting user must apply separately.
- **Actor and scope:** The preview applicant checks their email account setting. Google verifies the account, adds the applicant to the program group, and registers the project.
- **Documented action and values:** Apply with the applicant’s Google Workspace account and Google Cloud project information. Make sure that the applicant’s email account accepts addition to Google Groups. The source links to **Manage your global settings** for this account setting.
- **Source:** https://developers.google.com/workspace/preview
- **Location:** “How to join the program.”
- **Observation date:** 2026-09-11.
- **Exact quotation:** “You need to provide us with your Google Workspace account and Google Cloud project information.”
- **Exact quotation:** “Make sure that your email account accepts getting added to Google Groups.”
- **Exact quotation:** “If your email address cannot be added to the Google Group, you won't be able to access the dedicated client library, and you won't get access to some of the features.”
- **Exact quotation:** “After verifying your Google Workspace account, we will register your Google Cloud project.”
- **Applicability source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Location:** Opening preview notice.
- **Observation date:** 2026-09-11.
- **Exact quotation:** “Developer Preview: Available as part of the Google Workspace Developer Preview Program”
- **Source statement:** Program enrollment includes account verification, group membership, and project registration.
- **Interpretation:** This is a documented individual account condition for the preview applicant. Do not turn it into a separate enrollment requirement for all connecting users.

## Unresolved questions

### Non-blocking — Separate preview enrollment for each connecting user

The Slides setup page and the program’s “How to join the program” section do not establish whether each connecting user must enroll separately. They establish enrollment for an applicant and registration of a project.

The documented enrollment procedure remains usable. This uncertainty does not prevent a concrete setup action. Do not state that separate user enrollment is required or explicitly unnecessary.

### Non-blocking — Additional licenses, assignments, or individual settings

The checked Slides setup and preview pages do not establish a Slides-specific MCP license, a separate MCP invocation role, an additional access-group assignment, or an individual MCP enablement switch.

This is not evidence that such conditions cannot apply. No documented requirement of this type remains unsatisfied in the checked procedure.

### Non-blocking — Detailed resource-permission rules and administrator controls

The Slides page establishes inherited permissions but does not give a detailed permission matrix for each MCP tool. This research did not verify presentation-sharing instructions or Google Workspace administrator controls for third-party application access.

Use the established inherited-permission rule. Do not promise that an OAuth grant can bypass a resource permission or an organization control.

### Non-blocking — Research coverage limit

The Exa fetch and search calls timed out. Direct public retrieval then confirmed the Slides setup and Developer Preview Program passages above. The shared setup page and additional linked access documentation were not independently reviewed before the research time limit.

No release-change confirmation was obtained. The retrieved Slides page shows a recent update date; the checked passages did not identify a replacement procedure.

## Cross-topic dependencies

- **Topic 1:** Establish authority to manage the OAuth application’s **Audience** and **Test users**. Check authority for any administrator-controlled third-party application access policy that applies.
- **Topic 2:** Complete Developer Preview Program enrollment and project registration. Keep the applicant’s group-membership condition separate from any unconfirmed enrollment requirement for all users.
- **Topic 4:** Keep the External test-user assignment consistent with the selected OAuth audience and publication state. The assignment must precede connection testing by those users.
- **Coordinator:** State that the server uses the connecting user’s presentation permissions. Do not describe the OAuth scopes as a replacement for presentation access.
- **Coordinator:** Do not add a separate MCP license, invocation role, or individual enrollment requirement without further official evidence.

## Appendix: Evidence report — .factory/google-slides-recovery/topic-4-report.md

## Topic and status

**Topic 4: Authentication — complete.**

The live Google sources confirm the OAuth registration procedure, the initial refresh-token requirements, and the External Testing limits.

**Updated findings:** T4-01 and T4-02 now have independent live-source confirmation. T4-03 retains the supplied official evidence. New findings T4-04 through T4-08 replace the previous missing Google authentication evidence.

No blocking Google authentication gap remains. The coordinator must check whether Speakeasy implements the required OAuth parameters and token handling. This report does not establish that client compatibility.

**Observation date:** 2026-09-11. All quotations below were read from live sources on this date, except T4-03, which retains the supplied Topic 5 evidence from the same date. No provider settings were changed.

## Findings

### T4-01 — Use OAuth 2.0

- **Status:** Required.
- **Actor, recipient, and scope:** The application administrator configures authentication. The connecting user grants the application access to Google Slides.
- **Documented action:** Configure OAuth 2.0 for the Google Slides remote MCP connection.
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Location:** **Configure your MCP client > Others**.
- **Exact quotation:** “The Google Slides remote MCP server uses OAuth 2.0.”
- **Interpretation:** OAuth is the documented method. This statement does not establish API-key authentication, static access-token configuration, or dynamic client registration.

### T4-02 — Register a Web application OAuth client

- **Status:** Required for the documented manual OAuth path.
- **Actor, recipient, and scope:** The application administrator creates the OAuth client in the setup project. The MCP client receives the client ID and client secret.
- **Documented action:**
  1. Configure the OAuth consent screen before client creation, as recorded by Topic 2.
  2. Open **Google Auth Platform > Clients > Create Client**.
  3. Select **Web application**.
  4. Enter a **Name**.
  5. Under **Authorized redirect URIs**, select **+ Add URI**.
  6. Enter the selected MCP client's callback URI.
  7. Select **Create**.
  8. Copy the **Client ID** and **Client Secret**.
- **Environment-specific value:** Use the actual Speakeasy callback URI represented by `{{ gram.oauth.callback_url }}`. The coordinator must confirm where the reader obtains that value. Do not use the Claude or Antigravity callback URI.
- **Source:** https://developers.google.com/workspace/slides/api/guides/configure-mcp-server
- **Location:** **Configure your MCP client > Claude**, OAuth client creation steps.
- **Exact quotations:**
  - “Select Web application as the application type.”
  - “In the Authorized redirect URIs section, click + Add URI”
  - “Click Create and copy your Client ID and Client Secret.”
- **Interpretation:** The product-specific procedure establishes a pre-registered client ID and secret. Only the callback value changes for the selected client; the Google example does not establish Speakeasy UI labels.

**Callback matching and initial secret storage**

- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Locations:** **Step 1: Set authorization parameters**, `redirect_uri`; **Create authorization credentials**.
- **Exact quotations:**
  - “The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client”
  - “Your application's client secret will only be shown after you create the client.”
  - “You won't be able to view or download the client secret again.”
- **Interpretation:** Register the exact callback URI. Store the secret securely when Google first shows it. Do not assume that it can be retrieved later.

### T4-03 — Configure the four documented Slides scopes

- **Status:** Required by the documented Slides setup procedure.
- **Actor, recipient, and scope:** The application administrator configures the application scopes. The connecting user grants access.
- **Documented action:** Under **Manually add scopes**, add:
  ```text
  https://www.googleapis.com/auth/drive.readonly
  https://www.googleapis.com/auth/drive.file
  https://www.googleapis.com/auth/presentations.readonly
  https://www.googleapis.com/auth/presentations
  ```
- **Source:** https://developers.google.com/workspace/guides/configure-mcp-servers
- **Location:** **Set up the OAuth consent screen > Manually add scopes**, Google Slides list.
- **Observation:** Retained from the supplied Topic 5 report, observed 2026-09-11.
- **Exact quotations:**
  - “paste the scopes for the MCP servers you want to use”
  - “Google Slides: https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/presentations.readonly https://www.googleapis.com/auth/presentations”
- **Interpretation:** Use the Slides list. These scopes alone do not cause Google to issue a refresh token.

### T4-04 — Request offline access during initial authorization

- **Status:** Conditional — required for the preferred setup with refresh tokens.
- **Actor, recipient, and scope:** The MCP client sends the authorization request for the registered OAuth application. Google issues tokens after the user grants access.
- **Documented action and values:**
  - Send the authorization request to `https://accounts.google.com/o/oauth2/v2/auth`.
  - Set `access_type=offline` in the initial authorization request.
  - Use the registered client ID, exact callback URI, and required Slides scopes.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Locations:** **Step 1: Set authorization parameters > HTTP/REST**, `access_type`; **Step 5: Exchange authorization code for refresh and access tokens**.
- **Exact quotations:**
  - “Google's OAuth 2.0 endpoint is at https://accounts.google.com/o/oauth2/v2/auth.”
  - “Valid parameter values are online, which is the default value, and offline.”
  - “Set the value to offline if your application needs to refresh access tokens when the user is not present at the browser.”
  - “Note that the refresh token is only returned if your application set the access_type parameter to offline in the initial request to Google's authorization server.”
- **Interpretation:** Google documents offline access as an authorization parameter. Do not substitute an assumed `offline_access` scope for `access_type=offline`.
- **Client check:** The coordinator must confirm that Speakeasy sends this parameter. A client ID and secret alone do not establish refresh-token support.

### T4-05 — Obtain user consent and account for earlier authorization

- **Status:** Required — the user must grant access. A new consent request is conditional when the application already has permission but did not receive a refresh token.
- **Actor, recipient, and scope:** The connecting user grants the OAuth application access. The MCP client controls the authorization request.
- **Documented action and values:**
  - Complete the initial consent flow with `access_type=offline`.
  - Google documents `prompt=consent` to show the consent prompt.
  - If the application already received permission without the settings needed for a refresh token, Google says that the application must be authorized again.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Locations:** **Step 1: Set authorization parameters**, `access_type` and `prompt`; **Refreshing an access token**, Node.js subsection.
- **Exact quotations:**
  - “This value instructs the Google authorization server to return a refresh token and an access token the first time that your application exchanges an authorization code for tokens.”
  - “If you don't specify this parameter, the user will be prompted only the first time your project requests access.”
  - For `consent`: “Prompt the user for consent.”
  - “If you have already given your app the requisiste permissions without setting the appropriate constraints for receiving a refresh token, you will need to re-authorize the application to receive a fresh refresh token.”
- **Interpretation:** Do not state that every authorization-code exchange returns a refresh token. `prompt=consent` is a documented consent control; Google does not make it mandatory for every first authorization.
- **Client check:** The coordinator must check the initial consent flow and the case where the application already has permission. No later credential-maintenance procedure is included here.

### T4-06 — Account for External Testing limits

- **Status:** Conditional — applies when the OAuth application has an **External** audience and publishing status **Testing**.
- **Actor, recipient, and scope:** The application administrator adds authorized test users. Google applies the limits to their authorization for the project.
- **Documented action:** Follow Topic 2's **Audience > Test users > Add users** procedure. Use this path only with its access-expiration warning.
- **Limits:**
  - Testing permits up to 100 listed test users.
  - Test-user authorization expires seven days after consent.
  - A refresh token obtained with offline access also expires.
  - The exception for basic name, email, and profile scopes does not cover the documented Slides scopes.
- **Source:** https://support.google.com/cloud/answer/15549945?hl=en
- **Location:** **Publishing status > Testing**.
- **Exact quotations:**
  - “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”
  - “Authorizations by a test user will expire seven days from the time of consent.”
  - “If your OAuth client requests an offline access type and receives a refresh token, that token will also expire.”
  - “If your app requests any other OAuth scopes, then this exception does not apply.”
- **Supporting source:** https://developers.google.com/identity/protocols/oauth2
- **Location:** **Refresh token expiration**.
- **Exact quotation:** “A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of ‘Testing’ is issued a refresh token expiring in 7 days”
- **Interpretation:** Offline access does not remove the Testing limit. For this Slides setup, warn: **An External app in Testing requires another sign-in after seven days.**

### T4-07 — Keep application audience and status separate from preview permission

- **Status:** Conditional — applies when the administrator selects **Internal** or considers a change from **Testing** to **In production**.
- **Actor, recipient, and scope:** The application administrator selects the OAuth audience and status. The settings control who can request authorization.
- **Documented facts:**
  - An Internal application limits authorization to members of the associated organization.
  - Google documents **Publish app** as the action that changes publishing status to **In production**.
  - Production status can require verification and does not by itself remove warnings for unverified sensitive or restricted scopes.
- **Source:** https://support.google.com/cloud/answer/15549945?hl=en
- **Locations:** **Internal**; **Publishing status > In Production**.
- **Exact quotations:**
  - “Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization.”
  - “A project's publishing status is considered In production after selecting the Publish app button.”
  - “Your project's configuration may be subject to verification”
  - “Google will display an Unverified apps warning message if your project's OAuth clients request authorization of scopes considered sensitive or restricted before your project has completed verification for those scopes.”
- **Interpretation:** The seven-day rule is expressly tied to External Testing. Do not claim that other application states guarantee permanent access. Do not prescribe publication only to avoid the Testing limit. Topic 2's Developer Preview audience limits still apply.
- **Authority:** Topic 1 must check authority before any application-status change.

### T4-08 — Refresh tokens do not guarantee permanent access

- **Status:** Required for the access-lifetime warning. Individual expiration causes are conditional.
- **Actor, recipient, and scope:** Google controls token validity. The MCP client must retain the refresh token securely and use the token lifetime returned by Google.
- **Documented requirements and limits:**
  - The access-token response gives the remaining access-token lifetime in `expires_in`.
  - For user-granted time-based access, `refresh_token_expires_in` gives the remaining refresh-token lifetime.
  - Refresh tokens can stop working after revocation, six months without use, applicable administrator restrictions, or token-count limits.
  - Google currently limits each Google Account to 100 refresh tokens per OAuth client ID. A new token above this limit invalidates the oldest token without warning.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Location:** **Step 5: Exchange authorization code for refresh and access tokens**, response fields and storage notice.
- **Exact quotations:**
  - For `expires_in`: “The remaining lifetime of the access token in seconds.”
  - For `refresh_token_expires_in`: “This value is only set when the user grants time-based access.”
  - “Your application should store both tokens in a secure, long-lived location”
- **Source:** https://developers.google.com/identity/protocols/oauth2
- **Location:** **Refresh token expiration**.
- **Exact quotations:**
  - “The refresh token has not been used for six months.”
  - “There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.”
  - “creating a new refresh token automatically invalidates the oldest refresh token without warning.”
- **Interpretation:** Do not promise indefinite access. A concise general warning is sufficient: **Google can expire or invalidate access. The user can need another sign-in.** Use the specific seven-day warning when External Testing applies.

## Unresolved questions

### Blocking Google authentication gaps — none

The live sources now provide the facts that retrieval timeouts prevented in the previous report.

### Non-blocking for this topic — Speakeasy implementation

The supplied client context does not establish that Speakeasy sends `access_type=offline`, handles consent for an earlier authorization, stores the refresh token, or uses it to obtain access tokens.

These are coordinator checks. They remain necessary before the coordinator describes manual OAuth as a verified refresh-token setup.

### Non-blocking — Conflicting generic client-secret note

The shared credential page contains this statement:

- **Source:** https://developers.google.com/workspace/guides/create-credentials
- **Location:** **OAuth client ID > Web application**.
- **Observation date:** 2026-09-11.
- **Exact quotation:** “Note that client secrets aren't used for Web applications.”

This conflicts with the Slides-specific procedure, which explicitly requires a client ID and secret, and with the Google Identity web-server procedure, which documents client-secret creation and storage.

**Resolution for this setup:** Use the product-specific Slides procedure, supported by the applicable web-server OAuth procedure. The generic note does not prevent the documented action. Its intended scope remains unclear.

### Non-blocking — Other authentication methods and DCR

The checked sources do not establish API-key authentication, a static-token setup for this MCP server, or dynamic client registration. These unknowns do not block the documented pre-registered OAuth path.

### Non-blocking — Setup authority

Topic 1 must establish authority to create the OAuth client, configure consent and scopes, and change application status. This report does not infer that authority from access to the console.

### Non-blocking — Release-change confirmation

The live Slides setup page shows **Last updated 2026-09-03 UTC**. The Google Identity web-server page shows **Last updated 2026-08-07 UTC**. No replacement notice was found in the checked setup material. A separate release-note review was not completed during this follow-up.

## Cross-topic dependencies

- **Topic 1:** Check authority for OAuth client creation, consent configuration, scope configuration, and any publishing-status change.
- **Topic 2:** Keep the documented Internal-first audience procedure. If External Testing applies, include the seven-day limit. Do not publish the application only to avoid token expiration without checking preview and verification rules.
- **Topic 3:** Check Internal organization membership, External test-user inclusion, Workspace app-access controls, and presentation permissions.
- **Topic 5:** Keep OAuth 2.0 as the documented authentication method. Do not infer DCR or static-header support.
- **Coordinator:** Confirm the exact Speakeasy callback URI. Check `access_type=offline`, initial consent behavior, refresh-token storage and use, and token-expiration handling.
- **Coordinator:** Manual OAuth with a pre-registered Web application client is the documented candidate. Google-side refresh-token research is complete; client compatibility remains your check.
- **Coordinator:** Include the seven-day sign-in warning for External Testing. For other supported application states, do not promise permanent access.
## Appendix: Evidence report — .factory/google-slides-recovery/topic-1-final-audit-report.md

## Topic and status

**Topic 1: Setup permissions and administrative access — complete.**

The final authority audit covers selected actions **A1–A7**. The official sources establish applicable permissions for service enablement, OAuth configuration, preview terms, project IAM assignments, Model Armor floor settings, and Workspace application access controls.

Use an existing suitable project and the narrower roles below. Do not make project Owner, Workspace super administrator, or Project IAM Admin a general prerequisite.

**Observation date:** 2026-09-11.

**Updates to the previous report:**

- T1-01 through T1-04 and T1-07 remain applicable.
- T1-02 now includes policy acceptance and the selected audience actions.
- T1-05 now applies to the **selected Model Armor path**, not an unselected alternative.
- T1-06 now includes scope-specific application approval and organization-unit scope.
- T1-08 adds the applicant’s Google Groups setting and connecting-user eligibility.
- The final authority audit replaces the previous open question about actions from other topics.

No provider settings or files were changed.

## Findings

### T1-01 — Permission to enable the required services

- **Status:** Required.
- **Who acts:** A person with `serviceusage.services.enable` on the selected Google Cloud project.
- **Recipient and scope:** The project used for preview registration and the Slides connection.
- **Applicable role:** **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`).
- **Setup action:** Enable:
  - `slides.googleapis.com`
  - `slidesmcp.googleapis.com`
  - `modelarmor.googleapis.com` for the selected security path.
- **Environment value:** Obtain the project ID from the selected project. Preview registration uses the project number; do not substitute one value for the other.
- **Help:** A person with this permission can enable the services for the reader. Alternatively, an authorized project IAM administrator can grant the applicable role.

**Sources**

1. https://developers.google.com/workspace/slides/api/guides/configure-mcp-server\
   **Location:** “Enable the APIs”; “Enable the MCP services.”\
   **Evidence retained from the supplied report, observed 2026-09-11:**
   - “gcloud services enable slides.googleapis.com”
   - “gcloud services enable slidesmcp.googleapis.com”
   - “Replace PROJECT_ID with your Google Cloud project ID.”

2. https://docs.cloud.google.com/service-usage/docs/access-control\
   **Location:** “IAM permissions,” `services.enable`; “Predefined roles.”\
   **Live observation:** 2026-09-11.\
   **Quotations:**
   - “On the project: serviceusage.services.enable”
   - “On the service: servicemanagement.services.bind”

3. https://developers.google.com/workspace/guides/configure-mcp-security\
   **Location:** “Enable Model Armor”; “Roles required to enable APIs.”\
   **Evidence retained from the previous report, observed 2026-09-11:**
   - “You must enable Model Armor APIs before you can use Model Armor.”
   - “Otherwise, you can get this permission through the Service Usage Admin role (roles/serviceusage.serviceUsageAdmin).”

**Interpretation:** Service Usage Admin supplies the project permission for enablement. It does not establish authority to configure OAuth, assign roles, or accept company terms. The separate service-access permission is recorded under unresolved questions.

### T1-02 — Authority to configure the OAuth application

- **Status:** Required for the selected pre-registered OAuth path.
- **Who acts:** A person with OAuth configuration write access on the selected project.
- **Recipient and scope:** The project’s OAuth configuration, client, and test-user list.
- **Applicable role:** **OAuth Config Editor** (`roles/oauthconfig.editor`). Google labels the role **Beta**.
- **Setup actions:**
  - Configure **Google Auth Platform > Branding**.
  - Set **App name** to `Workspace MCP Servers`.
  - Configure **Audience**, **Contact Information**, and **Data Access**.
  - Select **Internal**, or **External** if Internal is unavailable.
  - Add authorized test users when External applies.
  - Add the four documented Slides scopes.
  - Create a **Web application** OAuth client.
  - Register the actual callback URI represented by `{{ gram.oauth.callback_url }}`.
  - Copy and securely store the client ID and client secret.
- **Approval action:** A person with authority to act for the company must review and accept the user-data policy. The technical role does not, by itself, give company approval authority.
- **Help:** An OAuth Config Editor can perform the technical actions. Obtain company approval if the reader cannot accept the applicable terms or policy.

**Sources**

1. https://cloud.google.com/iam/docs/roles-permissions/oauthconfig?hl=en\
   **Location:** “OAuthConfig roles” → “OAuth Config Editor.”\
   **Live observation:** 2026-09-11.\
   **Quotations:**
   - “Read/write access to OAuth config resources”
   - `clientauthconfig.brands.create`
   - `clientauthconfig.brands.update`
   - `clientauthconfig.clients.create`
   - `clientauthconfig.clients.createSecret`
   - `clientauthconfig.clients.update`
   - `oauthconfig.testusers.update`
   - `oauthconfig.verification.submit`

2. https://developers.google.com/workspace/guides/configure-mcp-servers\
   **Location:** “Set up the OAuth consent screen.”\
   **Live observation:** 2026-09-11.\
   **Quotations:**
   - “Under Audience, select Internal. If you can't select Internal, select External.”
   - “Under Finish, review the Google API Services User Data Policy and if you agree, select I agree to the Google API Services: User Data Policy.”
   - “Enter your email address and any other authorized test users, then click Save.”

3. https://developers.google.com/workspace/slides/api/guides/configure-mcp-server\
   **Location:** “Configure your MCP client” → “Claude.”\
   **Evidence retained from the supplied Topic 4 report, observed 2026-09-11:**
   - “Select Web application as the application type.”
   - “Click Create and copy your Client ID and Client Secret.”

**Interpretation:** The role description supports the documented application configuration procedure. This includes consent configuration, scopes, audience, client creation, and test users. It does not establish Workspace application-approval authority. **Publication is not a selected action** and is not a prerequisite for this path.

### T1-03 — Authority to accept preview terms

- **Status:** Required. Authority to bind the company applies when the applicant acts for the company.
- **Who acts:** An applicant who can accept the applicable terms.
- **Recipient and scope:** The applicant’s Workspace account and the Cloud project submitted for preview access.
- **Setup action:** Read the Program Terms and submit the linked application form. Supply the Workspace account information and Cloud project number. Permit Google Group membership and wait for final project-registration confirmation.
- **Access limits:** Keep preview access within the domain or company unless Google expressly permits an exception. Keep the applicable government-data restriction.
- **Help:** An authorized company representative must help if the reader cannot bind the company. A Cloud IAM role does not establish this authority.

**Sources**

1. https://developers.google.com/workspace/preview\
   **Locations:** “How to join the program”; FAQ; “Developer Preview Program Terms,” item (iv).\
   **Live observation:** 2026-09-11.\
   **Quotations:**
   - “Read through the Program Terms before applying.”
   - “You need to provide us with your Google Workspace account and Google Cloud project information.”
   - “Why do I have to provide a Google Cloud project number?”
   - “I may not grant end users access, outside my domain or company”

   **Retained quotation from the same source and observation date:**
   - “When it is done, you will receive a final confirmation to your registered email address.”

2. https://developers.google.com/terms\
   **Location:** Section 1(b), “Entity Level Acceptance.”\
   **Live observation:** 2026-09-11.\
   **Quotation:** “If you are using the APIs on behalf of an entity, you represent and warrant that you have authority to bind that entity to the Terms”

**Interpretation:** Google supplies an application procedure. It does not name a required Workspace administrator role for the applicant.

### T1-04 — Authority to assign project IAM roles

- **Status:** Conditional. Applies when a new project role assignment is necessary.
- **Who acts:** A person authorized to manage access to the project.
- **Recipient:** The person who will enable services, configure OAuth, or configure Model Armor.
- **Scope:** The selected project.
- **Applicable role:** **Project IAM Admin** (`roles/resourcemanager.projectIamAdmin`).
- **Setup action:** Grant only the applicable setup roles on the selected project.
- **Help:** Use an existing IAM administrator when the reader lacks the roles. The authorized service or application administrator can instead perform the setup action.

**Source**

https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access?hl=en\
**Location:** Required roles and required permissions for access management.\
**Live observation:** 2026-09-11.\
**Quotations:**
- “To manage access to a project: Project IAM Admin (roles/resourcemanager.projectIamAdmin)”
- `resourcemanager.projects.getIamPolicy`
- `resourcemanager.projects.setIamPolicy`

**Interpretation:** The reader does not need Project IAM Admin only to complete MCP setup.

### T1-05 — Authority to configure the selected Model Armor protection

- **Status:** Required for the selected Model Armor path. Model Armor remains conditional in Google’s general procedure because Google permits a documented alternative.
- **Who acts:** A person with service-enablement permission and a person with Model Armor floor-setting write access. These can be the same person.
- **Recipient and scope:** The selected project’s floor setting:
  `projects/PROJECT_ID/locations/global/floorSetting`
- **Applicable roles:**
  - **Service Usage Admin** for API enablement.
  - **Model Armor Floor Setting Admin** (`roles/modelarmor.floorSettingsAdmin`) for floor-setting changes.
- **Setup action:** Apply the documented project floor-setting configuration. It enables enforcement, adds `GOOGLE_MCP_SERVER`, and uses `INSPECT_AND_BLOCK`. It also enables Google MCP server Cloud Logging, malicious-URI filtering, and the `DANGEROUS` filter at `MEDIUM_AND_ABOVE`.
- **Review:** The security owner must consider payload logging, routing and data-residency effects, and changes to other integrated services.
- **Help:** Obtain help from the security administrator if the reader lacks floor-setting authority or cannot approve these effects. Obtain role-assignment help from the project IAM administrator if necessary.

**Sources**

1. https://docs.cloud.google.com/iam/docs/roles-permissions/modelarmor\
   **Location:** “Model Armor Floor Setting Admin.”\
   **Live observation:** 2026-09-11.\
   **Quotations:**
   - “Grants full access to all Model Armor Floor Setting resources.”
   - `modelarmor.floorSettings.update`

2. https://docs.cloud.google.com/model-armor/configure-floor-settings\
   **Location:** Required access to manage floor settings.\
   **Evidence retained from the previous report, observed 2026-09-11:**
   - “ask your administrator to grant you the Model Armor Floor Setting Admin (roles/modelarmor.floorSettingsAdmin) IAM role on Model Armor floor settings.”

3. https://developers.google.com/workspace/guides/configure-mcp-security?hl=en\
   **Location:** “Configure protection for Google and Google Cloud remote MCP servers.”\
   **Live observation:** 2026-09-11.\
   **Exact command values:**
   - `--full-uri='projects/PROJECT_ID/locations/global/floorSetting'`
   - `--add-integrated-services=GOOGLE_MCP_SERVER`
   - `--google-mcp-server-enforcement-type=INSPECT_AND_BLOCK`
   - `--enable-google-mcp-server-cloud-logging`

   **Quotation:** “changes you make to floor settings can affect traffic scanning and safety behaviors across all integrated services, not just MCP.”

   **Retained quotations from the same page, observed 2026-09-11:**
   - “You must screen prompts and responses for malicious content or prompt injection attacks.”
   - “Model Armor logs the entire payload.”
   - “might break data residency compliance for in-use and in-transit data.”

**Interpretation:** The documented action changes a project floor setting. It does not require an organization-level floor-setting change. Use the floor-setting role, not broad Model Armor Admin access. Google does not name a separate company role for approval of logging or residency effects.

### T1-06 — Authority to approve Workspace application access

- **Status:** Conditional. Applies when Workspace policy blocks or limits the application’s required access.
- **Who acts:** A Workspace administrator with the **Service Settings administrator privilege**.
- **Recipient and scope:** The OAuth application and the users in the selected organizational units.
- **Setup action:** Open **Security > Access and data control > API controls > Manage App Access**. Select the application and the applicable organizational unit. Set the approved access level.
- **Least-access option:** Google documents **Specific Google data** for access limited to specified scopes. Use it when it satisfies the approved access need. Do not make broad **Trusted** access or disabled controls the default.
- **Environment values:** Obtain the OAuth client ID from the application configuration and the approved users and scopes from the application owner.
- **Help:** The OAuth Config Editor needs help from the authorized Workspace administrator if organization policy prevents authorization.

**Source**

https://support.google.com/a/answer/7281227?hl=en\
**Locations:** “Review apps for your organization”; application access levels; “Change access from the app information page.”\
**Live observation:** 2026-09-11.\
**Quotations:**
- “Requires having the Service Settings administrator privilege.”
- “Click Manage App Access”
- “Specific Google data —Can request data access only to scopes that you specify when configuring the app.”
- “By default, the top organizational unit is selected, and the change applies to your entire organization.”
- “You must include the Google Sign-in scopes required by the app to allow users to sign in with their Google Account.”

**Interpretation:** Application approval has its own administrative authority. Project OAuth write access does not supply it. Check the organizational-unit scope before a change. The sign-in-scope note does not establish an additional Slides data scope.

### T1-07 — Setup authority is separate from presentation access

- **Status:** Required distinction.
- **Who acts:** The setup administrator configures the project and application. The connecting user grants consent and must have access to the intended presentations.
- **Recipient and scope:** The application receives access within the connecting user’s permissions.
- **Setup action:** Use a connecting account with permission for the intended read or change operation. If access is missing, the person who controls the presentation’s access must help.
- **Values:** Presentation identifiers and existing access come from the user’s environment.

**Source**

https://developers.google.com/workspace/slides/api/guides/configure-mcp-server\
**Location:** Introduction, “Respect security.”\
**Evidence retained from Topic 3, observed 2026-09-11:**\
**Quotation:** “Inherit the same permissions and data governance controls as the user.”

**Interpretation:** Cloud setup roles and OAuth scopes do not grant presentation access. Do not assign setup IAM roles to every connecting user only because they will use MCP.

### T1-08 — Applicant settings and connecting-user eligibility

- **Status:** Required for the selected audience. The Google Groups condition applies to the preview applicant.
- **Who acts:**
  - The preview applicant checks their Google Groups account setting.
  - The OAuth Config Editor adds authorized External test users.
  - The connecting user signs in with an eligible account and grants consent.
- **Scope:** The applicant’s account, the OAuth application, and its associated organization.
- **Setup actions:**
  - Permit addition to the preview Google Group.
  - For Internal, use an account in the associated organization.
  - For External Testing, add authorized test users before they connect.
  - Keep all users within the preview audience limits.
- **Help:** The application administrator handles test-user assignments. A Workspace administrator handles applicable application-access restrictions.

**Sources**

1. https://developers.google.com/workspace/preview\
   **Location:** “How to join the program.”\
   **Live observation:** 2026-09-11.\
   **Quotation:** “Make sure that your email account accepts getting added to Google Groups.”

2. https://support.google.com/groups/answer/9792489?hl=en\
   **Location:** “Manage your global settings.”\
   **Live observation:** 2026-09-11.\
   **Quotation:** “At the top right, click Settings Global settings.”

3. https://support.google.com/cloud/answer/15549945?hl=en\
   **Locations:** “Internal”; “Publishing status” → “Testing.”\
   **Live observation:** 2026-09-11.\
   **Quotations:**
   - “Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization.”
   - “User authorization of scopes associated with restricted Google Workspace services, including high-risk Gmail and Drive scopes, might require additional configuration by your organization's administrators.”
   - “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”

**Interpretation:** Internal status does not bypass Workspace access controls. The sources do not establish separate preview enrollment for every connecting user.

## Final authority audit

| Selected action | Authority and scope | Result |
|---|---|---|
| **A1 — Preview enrollment and terms** | Authorized company representative accepts terms. Applicant supplies the account and project number and permits group membership. Google registers the project. T1-03 and T1-08 apply. | **Covered.** No general Workspace super administrator requirement established. |
| **A2 — Select project and enable Slides services** | Service Usage Admin on the selected project. Project IAM administrator helps only if access must be assigned. T1-01 and T1-04 apply. | **Covered.** Use the registered project. |
| **A3 — Enable and configure Model Armor** | Service Usage Admin plus Model Armor Floor Setting Admin for the selected project floor setting. Security owner reviews configuration effects. T1-05 applies. | **Covered.** No organization-level change is selected. |
| **A4 — Branding, audience, policy, test users, scopes** | OAuth Config Editor on the project. Authorized company representative supplies approval where necessary. T1-02 and T1-03 apply. | **Covered.** Internal-first or External Testing; no publication action. |
| **A5 — Web application client and credentials** | OAuth Config Editor on the project. Register the supplied Speakeasy callback URI. T1-02 applies. | **Covered.** No new Google role is needed for offline-access parameters sent by the client. |
| **A6 — Application approval and user access** | Workspace Service Settings administrator privilege when policy requires an approval change. Connecting user needs presentation access. T1-06 through T1-08 apply. | **Covered.** Organization policy and presentation access remain environment-specific. |
| **A7 — Speakeasy source, manual OAuth, user consent** | Connection operator follows the supplied Speakeasy procedure. Eligible Google user grants consent. T1-07 and T1-08 apply. | **Covered for Google authority.** The coordinator owns Speakeasy access and client implementation checks. No new Google administrator action is established for consent itself. |

## Unresolved questions

### Blocking gaps — none

No missing authority evidence prevents a selected Google setup action.

### Non-blocking — Service-level access permission

The Service Usage reference lists `servicemanagement.services.bind` on the service in addition to the project enablement permission. Preview registration is the documented provider access procedure. The reviewed sources do not give a separate customer role-assignment action for the preview service.

Do not invent such an assignment. If Google denies service access after registration, that concrete failure will require investigation.

### Non-blocking — New project or billing setup

The selected path uses an existing suitable project. Project creation and billing-account assignment are not selected actions. Their organization-specific authority was not established. A later decision to create a project or change billing requires another authority check.

### Non-blocking — Environment-specific approval and sharing

Public documentation cannot establish whether this organization currently blocks the OAuth application or whether the intended user can change a particular presentation.

T1-06 establishes authority and a procedure for application approval. T1-07 establishes inherited presentation permissions. A detailed presentation-sharing procedure was not checked.

### Non-blocking — Separate preview enrollment for each user

The preview page establishes applicant enrollment and project registration. It does not establish whether each connecting user must enroll separately. Do not state that separate enrollment is required or explicitly unnecessary.

### Non-blocking — Speakeasy role name

The supplied client procedure establishes the connection actions but does not name a Speakeasy role. This does not prevent the documented procedure. The coordinator must keep client access requirements separate from Google roles.

### Non-blocking — Retrieval and release confirmation

Some Cloud documentation requests timed out or returned no usable text. The OAuth role reference was later confirmed live. The Model Armor role reference and the project floor-setting command were also confirmed live; the earlier floor-settings access quotation is retained.

A separate release-note review was not completed in this final follow-up. No replacement notice was observed in the retrieved setup passages.

## Cross-topic dependencies

- **Topic 2:** Use the same registered project for Slides service enablement, OAuth, and the selected Model Armor configuration. Keep the project number separate from the project ID.
- **Topic 3:** Apply T1-06 when Workspace policy needs a change. Check organizational-unit scope. Keep Internal membership, External test-user assignment, preview limits, and presentation access separate.
- **Topic 4:** OAuth Config Editor covers the selected application actions. No publishing-status change is selected. Retain the External Testing seven-day warning.
- **Topic 5:** T1-01 establishes project authority for the two Slides services.
- **Coordinator:** The final Google authority audit is complete. Use the narrower roles and identify the authorized person who must help when the reader lacks access.
- **Coordinator:** Keep the selected project-level Model Armor path. Include the security review before configuration. The documented example enables Cloud Logging.
- **Coordinator:** Keep Speakeasy permissions and client implementation checks under coordinator ownership. Do not infer prompt screening from OAuth support.
## Appendix: Canonical Speakeasy setup skeleton

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
