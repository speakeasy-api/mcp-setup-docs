---
research_version: 1
slug: google-drive
researched_at: 2026-07-29T20:37:22Z
---

# Google Drive — Research Dossier

## Server facts

- Remote URL: `https://drivemcp.googleapis.com/mcp/v1`.
- Transport: `streamable-http`. Google labels it **HTTP**; its MCP reference
  shows JSON-RPC over HTTPS with `application/json, text/event-stream`.
- Launch stage: **Developer Preview** in Google's supported-products table.
  Re-verified `2026-09-30T21:25:45Z`: the Drive setup page lists "Membership in
  the Google Workspace Developer Preview Program" as a prerequisite
  ({#join-developer-preview}).
- Enable both **Google Drive API** (`drive.googleapis.com`) and **Google Drive
  MCP API** (`drivemcp.googleapis.com`) in the same Google Cloud project.
- Authentication: OAuth 2.0 with a manually registered Web application
  client. Google remote MCP servers do not support Dynamic Client
  Registration. Live authorization-server metadata has no
  `registration_endpoint`.
- Required OAuth scopes:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
- The first scope is a restricted, high-risk Drive scope. The second is
  non-sensitive and grants per-file create/write access. Both are required by
  Google's Drive MCP setup guide.
- Every connecting identity needs **MCP Tool User**
  (`roles/mcp.toolUser`) on the Google Cloud project. Drive access remains
  bounded by that user's existing Drive permissions and Workspace governance.
- If Workspace restricts high-risk Drive scopes, a Service Settings
  administrator must approve the generated OAuth client under **Security** >
  **Access and data control** > **API controls**.
- An External OAuth app in **Testing** supports at most 100 test users and
  their authorizations expire after seven days. Durable External use of
  `drive.readonly` can require restricted-scope verification and, when data is
  transmitted through servers, a security assessment. Internal-only use does
  not require Google's external-app review.
- Direct observation during this run:
  - Unauthenticated `tools/list` returned HTTP 200 at the MCP URL.
  - Protected-resource metadata at
    `https://drivemcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
    identifies the MCP resource, Google authorization server, bearer-header
    method, and Drive scopes.

## Credential flow

A Google Cloud project administrator enables both APIs, grants connecting
users **MCP Tool User**, configures the Google Auth platform, and creates one
OAuth 2.0 **Web application** client. Enabling APIs requires
`serviceusage.services.enable`, normally through **Service Usage Admin** or
**Owner**. Granting roles requires appropriate IAM administration access.

Google generates:

| Value | Origin |
| --- | --- |
| OAuth client ID | **OAuth 2.0 client created** in {#copy-client-credentials} |
| OAuth client secret | **Client secrets** in the same dialog; copyable once |
| OAuth scopes | The two Drive scopes listed in Server facts |

Paste `{{ gram.oauth.callback_url }}` directly into **Authorized redirect
URIs** in {#create-oauth-client}. The Control Plane's **Identity** section
does not display the redirect URI, so this registration is the only callback
check.

Each user who connects must have **MCP Tool User**, access to the intended
Drive files, permission under Workspace app-access policy, and—when the
audience is External and Testing—membership in **Test users**.

## Console walkthrough

Sign in at `https://console.cloud.google.com` and select the project that will
own the APIs and OAuth client.

### Join the Google Workspace Developer Preview Program {#join-developer-preview}

- Re-verified at `2026-09-30T21:25:45Z`: Google's Drive MCP setup page lists "Membership in
  the Google Workspace Developer Preview Program" as the first prerequisite,
  and the program page lists the **Drive MCP server** among its preview
  features.
- Open `https://developers.google.com/workspace/preview` and review the
  **Developer Preview Program Terms** with the application or security owner.
- Click **Apply to join the Developer Preview Program**. The form requests
  "Google Workspace account and Google Cloud project information"; Google does
  not publish its exact field labels, so the submit control is rendered as
  "visible or equivalent". Agree to the terms only with organizational
  approval.
- Wait for the project-registration confirmation. Google says "The whole
  process should be done within a couple of days."
- Result and transition: the registered project is used for every Google
  Cloud step that follows.
- Values entered: organization-specific Workspace account and Cloud project
  information. Values copied: none.
- Screenshot note: the program page with **Drive MCP server** listed under
  **Latest features**; do not capture application-form data.

### Enable the Google Drive API {#enable-drive-api}

- Open Google's documented console flow:
  `https://console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com`.
- Confirm the project if prompted and click **Enable**. If already enabled,
  no action is needed.
- Screenshot note: **Google Drive API** with **Enable**, or its enabled state.
- Transition: continue to the separate MCP API flow.

### Enable the Google Drive MCP API {#enable-drive-mcp-api}

- Open
  `https://console.cloud.google.com/flows/enableapi?apiid=drivemcp.googleapis.com`.
- Confirm the project if prompted and click **Enable**. If already enabled,
  no action is needed.
- Screenshot note: **Google Drive MCP API** with **Enable**, or its enabled
  state.
- Transition: open project IAM.

### Grant the MCP Tool User role {#grant-mcp-tool-user}

- Open `https://console.cloud.google.com/iam-admin/iam` and select the project.
- Click **Grant access**.
- In **New principals**, enter a connecting user's Google Account email.
- Click **Select a role**, search for and select **MCP Tool User**, then click
  **Save**.
- Repeat for every connecting user.
- Screenshot note: **Grant access** with the principal and **MCP Tool User**.
- Transition: open the Google Auth platform.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Warning: Google says the consent screen cannot be removed after it is
  configured.
- Open `https://console.cloud.google.com/auth/branding`. If the page says
  **Google Auth platform not configured yet**, click **Get Started**.
- First-time wizard:
  1. Under **App Information**, enter `Drive MCP Server` in **App name**,
     select an approved **User support email**, and click **Next**.
  2. Under **Audience**, select **Internal** when all connecting users belong
     to the project's Workspace organization; otherwise select **External**.
     Click **Next**.
  3. Under **Contact Information**, enter an approved **Email address** and
     click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. With
     organizational approval, select **I agree to the Google API Services:
     User Data Policy**, click **Continue**, and click **Create**.
- For an existing configuration, use **Branding**, **Audience**, and
  **Data Access** directly.
- Open **Data Access** > **Add or Remove Scopes**. Under **Manually add
  scopes**, paste both required Drive scopes. Click **Add to Table**,
  **Update**, then **Save**.
- For an External app in **Testing**, open **Audience**. Under **Test users**,
  click **Add users**, enter all connecting-user emails, and click **Save**.
  Warn that Testing authorizations expire after seven days.
- Screenshot note: **Data Access** with both Drive scopes selected.
- Transition: create the OAuth client.

### Create the OAuth client {#create-oauth-client}

- Open `https://console.cloud.google.com/auth/clients/create`.
- Set **Application type** to **Web application**.
- In **Name**, enter a recognizable name such as
  `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and paste
  `{{ gram.oauth.callback_url }}`.
- Do not add **Authorized JavaScript origins**; Google's Drive MCP procedure
  requires only the redirect URI for this server-side flow.
- Warning before **Create**: prepare an approved secret store because the next
  dialog permits the secret to be copied only once.
- Click **Create**.
- Screenshot note: **Create client** with the Web application type and
  redirect URI populated.

### Copy the client credentials {#copy-client-credentials}

- In **OAuth 2.0 client created**, copy **Client ID**.
- Under **Client secrets**, copy **Client secret** and store it as a password.
- Keep both values for {#connect-speakeasy-credentials}.
- Screenshot exception: do not capture live credentials.
- Recovery: Google says to delete and recreate a lost secret, but the fetched
  pages do not name the current recovery buttons.
- Transition: if Workspace policy restricts high-risk Drive scopes, complete
  the conditional step below; otherwise provider setup is complete.

### Permit the OAuth app under Workspace policy if required {#permit-workspace-app}

- This step is conditional on Workspace app-access restrictions.
- Sign in at `https://admin.google.com` as a **Service Settings
  administrator**.
- Go to **Security** > **Access and data control** > **API controls**.
- Click **Manage App Access**. Under **Configured apps**, click **Configure
  new app**.
- Enter the Client ID, click **Search**, and select the matching result.
- Under **Scope**, keep the top-level organization selected or use **Select
  org units** > **Include organizations** to select covered units. Click
  **Continue**.
- Under **Access to Google data**, have the application or cloud security
  owner choose the approved setting. **Trusted** permits all requested
  services; **Specific Google data** limits access to selected scopes;
  **Limited** cannot permit restricted `drive.readonly`.
- Click **Continue**, review the setting, and click **Finish**.
- Screenshot note: the review screen with client identity, covered units, and
  approved access setting, without credential values.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
re-rendered at `2026-09-30T21:25:45Z`. The fixed anchors are carried verbatim. This replaces
the retired **Authentication** / **Attach Remote Identity Provider** flow.

Per-guide values:

- Remote URL: `https://drivemcp.googleapis.com/mcp/v1` (shared public endpoint, not tenanted).
- Add-server path: Custom remote only (**Hosted remotely**). Operator notes record catalog queries `google-drive` and `google drive` as
  absent.
- Authentication Option: `oauth-client` (OAuth) → **User Identity**. Client
  ID and Client secret come from {#copy-client-credentials}.
- Probe outcome (`2026-09-30T21:25:45Z`): an unauthenticated JSON-RPC `initialize` POST with
  `Accept: application/json, text/event-stream` returned HTTP 200 with a
  result (protocol `2025-06-18`), not a 401. The create form therefore
  preselects **No Identity**; the reader must select **User Identity**.
- PRM: `https://drivemcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  names issuer `https://accounts.google.com/`. The dashboard's discovery
  probes this path-suffixed location (the origin-root location returns an
  error), so the provider picker preselects the Google provider or badges it
  **Will be created**.
- Registration: `https://accounts.google.com/.well-known/oauth-authorization-server`
  advertises no `registration_endpoint` and no
  `client_id_metadata_document_supported`; Google states its remote MCP
  servers support neither DCR nor CIMD. The dashboard defaults to **Manual**
  (or **Existing client** when one exists). Registration choice: **Manual**.
  Automatic configuration at creation cannot register a client, so the server
  is saved **Disabled** and must be enabled under **Settings > Danger Zone >
  Server Availability** after the Identity section is saved.
- Token endpoint auth: the issuer advertises `client_secret_post` and
  `client_secret_basic`; the dashboard picks the method automatically.
- PRM `scopes_supported`: `https://www.googleapis.com/auth/drive`, `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/drive.file`. This is
  broader than the consent-screen configuration (full `drive`), so **Scope**
  must not be left blank.
- Scope string for **Advanced > Scope** (space-separated, one line):
  `https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file`
- Further-reading URL: the provider's MCP setup page listed in Provenance.

### Add the server in Speakeasy {#add-server-in-speakeasy}

Under **MCP Gateway**, select **MCP**, click **Add new**, and choose **Hosted
remotely**. On **New remote MCP server**, paste `https://drivemcp.googleapis.com/mcp/v1` into **MCP server
URL**, leave **User session issuer** at its default, and click **Verify
connectivity**. Under **Identity**, select **User Identity** (the page
preselects **No Identity** for this 200-unauthenticated server). Leave
**Guardrails** off if it appears, then click **Save**. The result keeps the
server **Disabled** and says to finish setup in **Settings > Identity**; this
is expected for Manual registration.

Screenshot note: **New remote MCP server** with the URL verified and **User
Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

Open **Settings** > **Identity**. Confirm **User Identity**. In **Choose an
identity provider**, confirm the Google provider (`https://accounts.google.com/`)
or pick it via **Search identity providers…**. Choose **Manual**. Paste
**Client ID** and **Client secret** from {#copy-client-credentials}; Google requires the
secret despite the "Optional" placeholder. Under **Advanced > Scope**, enter the
scope string above and do not leave it blank. Click **Save**. Then open
**Settings > Danger Zone > Server Availability** and turn on **Enable MCP
server** so it shows **Enabled**.

This surface does not display the redirect URI; {#create-oauth-client}
registers `{{ gram.oauth.callback_url }}` directly.

On first use, Google's browser authorization prompt appears. The account must
hold **MCP Tool User** ({#grant-mcp-tool-user}) and, for an External app in
**Testing**, be listed under **Test users**.

Screenshot note: **Settings > Identity** with **User Identity**, the Google
provider, and **Manual** selected; values redacted.

## Open questions

- Google's public pages do not name the current client-secret recovery
  buttons.
- Workspace Console Help names **Specific Google data** but does not publish
  the deeper scope-selection control labels.
- Public docs cannot determine a particular External app's restricted-scope
  verification and security-assessment outcome.

## Provenance

Documentation-property sweep:

- `developers.google.com`: Drive MCP setup/reference, Drive scopes and file
  eligibility, OAuth consent, credentials, and token lifetime. Drawn from.
  Root `/llms.txt` returned 404.
- `docs.cloud.google.com`: supported products, MCP authentication/management,
  Service Usage, and IAM procedures. Drawn from.
- `support.google.com/cloud`: Auth platform Audience and Data Access. Drawn
  from.
- `support.google.com/a`: Workspace API controls and high-risk Drive scopes.
  Drawn from.
- Google Codelabs and Google Cloud Blog: swept, not drawn from; current
  product docs were preferred.

All entries were observed at `2026-07-29T20:37:22Z`:

- `https://developers.google.com/workspace/drive/api/guides/configure-mcp-server`
  — endpoint, transport label, API enablement, scopes, consent, and client
  setup.
- `https://developers.google.com/workspace/drive/api/reference/mcp` — endpoint
  and HTTP request shape.
- `https://developers.google.com/workspace/drive/api/guides/api-specific-auth`
  — Drive scope descriptions, classifications, and assessment rules.
- `https://developers.google.com/workspace/drive/api/guides/drive-mcp-server-file-eligibility`
  — inherited file policy.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  consent wizard and test users.
- `https://developers.google.com/workspace/guides/create-credentials#oauth-client-id`
  — Web application client controls.
- `https://developers.google.com/identity/protocols/oauth2#expiration` —
  Testing refresh-token expiry.
- `https://docs.cloud.google.com/mcp/supported-products` — Developer Preview.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` — DCR
  limitation, role, client secret, and recovery statement.
- `https://docs.cloud.google.com/mcp/manage-mcp-servers` — MCP Tool User.
- `https://docs.cloud.google.com/service-usage/docs/enable-disable` — service
  enablement and required permissions.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — IAM controls.
- `https://support.google.com/cloud/answer/15549945` — Audience and Testing.
- `https://support.google.com/cloud/answer/15549135` — Data Access controls.
- `https://support.google.com/a/answer/7281227` — Workspace API controls.
- `https://drivemcp.googleapis.com/mcp/v1` — successful unauthenticated
  `tools/list` observation.
- `https://drivemcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — protected-resource metadata.
- `https://accounts.google.com/.well-known/oauth-authorization-server` —
  OAuth endpoints and no registration endpoint.
- `doctrine/speakeasy-setup.md` — canonical Speakeasy labels and anchors.

Re-observed at `2026-09-30T21:25:45Z` (identity-section refresh): the product MCP setup page,
`https://developers.google.com/workspace/guides/configure-mcp-servers`,
`https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers`, the MCP
endpoint `initialize` probe, the path-suffixed PRM, Google's
authorization-server metadata, and `doctrine/speakeasy-setup.md` (gram
`68b3f78`). Newly drawn from:

- `https://developers.google.com/workspace/preview` — Developer Preview
  Program terms, apply action, form contents, timeline, and listed MCP servers.
