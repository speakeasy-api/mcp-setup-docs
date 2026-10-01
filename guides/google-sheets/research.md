---
research_version: 1
slug: google-sheets
researched_at: 2026-07-29T20:37:05Z
---

# Google Sheets — Research Dossier

## Server facts

- Remote URL: `https://sheetsmcp.googleapis.com/mcp/v1`.
- Transport: `streamable-http`. Google labels it **HTTP**. A direct MCP
  `initialize` request over HTTPS POST returned HTTP 200 and an MCP JSON
  response during this run.
- Launch stage: Developer Preview. Re-verified `2026-09-30T21:25:45Z`: the
  Sheets setup page lists "Membership in the Google Workspace Developer
  Preview Program" as a prerequisite, so enrollment is a setup step
  ({#join-developer-preview}). This supersedes the earlier note that no
  preview-enrollment step was documented.
- Enable both **Google Sheets API** (`sheets.googleapis.com`) and
  **Google Sheets MCP API** (`sheetsmcp.googleapis.com`) in one Google Cloud
  project. Enabling APIs requires `serviceusage.services.enable`, normally
  supplied by **Service Usage Admin** or **Owner**.
- Authentication Option: OAuth 2.0 with a manually registered
  **Web application** client, **Client ID**, and **Client secret**. Google and
  Google Cloud MCP servers do not support Dynamic Client Registration or OAuth
  Client ID Metadata Documents.
- Each connecting principal needs **MCP Tool User** (`roles/mcp.toolUser`) on
  the project. The Sheets server respects the signed-in user's existing Google
  Sheets and Drive permissions and governance controls.
- Google's Sheets setup page requires these scopes:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`
- Protected-resource metadata is available at
  `https://sheetsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  and names `https://accounts.google.com/` as the authorization server.
- Google requires Workspace MCP applications to screen prompts and responses
  for malicious content or prompt injection. Model Armor is one option; an
  organization can use another documented solution.
- Speakeasy MCP Catalog lookup: absent for `google-sheets` and `google sheets`.
  Render only **Custom remote server**. The URL is shared, not tenanted, and
  catalog presence is not an open question.

## Credential flow

An administrator uses one Google Cloud project for API enablement, IAM grants,
the OAuth consent screen, and the OAuth client. They need permission to enable
services, grant project roles, configure Google Auth platform, and create OAuth
credentials. Each connecting user needs **MCP Tool User** and access to the
intended spreadsheets.

Create a **Web application** OAuth client. Enter
`{{ gram.oauth.callback_url }}` directly under **Authorized redirect URIs**.
The resulting values for the Speakeasy AI Control Plane are:

| Value | Google origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** in {#copy-oauth-credentials} |
| Client Secret | **Client secrets** in {#copy-oauth-credentials}; copyable once |

For an **External** audience in **Testing**, add every connecting account under
**Test users**. Testing supports up to 100 test users, and each authorization
expires seven days after consent. **Internal** is available only to projects
associated with a Google Cloud organization and limits authorization to that
organization.

## Console walkthrough

Sign in at `https://console.cloud.google.com`. In the console toolbar, use the
resource selector to select the project that will own this configuration. Keep
that project selected throughout the Google steps.

### Join the Google Workspace Developer Preview Program {#join-developer-preview}

- Re-verified at `2026-09-30T21:25:45Z`: Google's Sheets MCP setup page lists "Membership in
  the Google Workspace Developer Preview Program" as the first prerequisite,
  and the program page lists the **Sheets MCP server** among its preview
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
- Screenshot note: the program page with **Sheets MCP server** listed under
  **Latest features**; do not capture application-form data.

### Enable the Google Sheets APIs {#enable-google-sheets-apis}

- Open **APIs & Services** > **API Library**.
- In **Search for APIs & Services**, search for `Google Sheets API`, open
  **Google Sheets API**, and click **Enable**. If already enabled, continue.
- Reopen **APIs & Services** > **API Library**. Search for
  `Google Sheets MCP API`, open **Google Sheets MCP API**, and click
  **Enable**. If already enabled, continue.
- Permission gate: the administrator needs
  `serviceusage.services.enable`, normally through **Service Usage Admin** or
  **Owner**.
- Result and transition: both required services are enabled. Next, open the
  project's **IAM** page.
- Values entered: the two API names. Values copied: none.
- Screenshot note: **Google Sheets MCP API** showing its enabled state.

### Grant MCP Tool User access {#grant-mcp-tool-user}

- Go to `https://console.cloud.google.com/iam-admin/iam` and confirm the same
  project is selected. This opens **IAM**.
- Click **Grant access**.
- In **New principals**, enter a connecting user's Google Account email.
- Click **Select a role**, search for `MCP Tool User`, select
  **MCP Tool User**, and click **Save**.
- Repeat for each connecting user. Google's IAM procedure names **Project IAM
  Admin** as the role required to grant project roles.
- Result and transition: users can make MCP calls subject to their existing
  Sheets and Drive access. Next, configure **Google Auth platform**.
- Values entered: user emails and **MCP Tool User**. Values copied: none.
- Screenshot note: **Grant access** with **New principals** and
  **MCP Tool User** visible.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Warning: Google says an OAuth consent screen cannot be removed after it is
  configured.
- Open **Google Auth platform** > **Branding**. If the page says
  **Google Auth platform not configured yet**, click **Get Started**.
- In the first-time wizard:
  1. Under **App Information**, enter `Sheets MCP Server` in **App name**,
     choose a monitored **User support email**, and click **Next**.
  2. Under **Audience**, select **Internal** if all connecting users belong to
     the project's organization. Otherwise select **External**. Click
     **Next**.
  3. Under **Contact Information**, enter a monitored **Email address**, then
     click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. With
     application or security-owner approval, select **I agree to the Google API
     Services: User Data Policy**, click **Continue**, and click **Create**.
- If Google Auth platform was already configured, retain its approved
  **Branding** and **Audience** and continue to **Data Access**.
- Open **Data Access** and click **Add or Remove Scopes**.
- Under **Manually add scopes**, paste the four scope URLs from Server facts.
  Click **Add to Table**, click **Update**, and then click **Save**.
- For an **External** app in **Testing**, open **Audience**. Under
  **Test users**, click **Add users**, enter each connecting user's email, and
  click **Save**.
- Result and transition: connecting users can authorize the required Sheets
  and Drive access. Next, create the OAuth client.
- Values entered: app and contact information, audience, four scopes, and
  applicable test-user emails. Values copied: none.
- Screenshot note: **Data Access** with all four scopes selected.
- Recovery: after a Testing authorization expires, the user remains a test
  user but must complete browser authorization again.

### Create the OAuth client {#create-oauth-client}

- Open **Google Auth platform** > **Clients**, then click **Create client**.
- In **Application type**, select **Web application**.
- In **Name**, enter a recognizable name such as
  `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter
  `{{ gram.oauth.callback_url }}` in **URIs**. **Authorized JavaScript
  origins** is not needed for this hosted server-side flow.
- Warning: prepare an approved secret store before clicking **Create**. The
  next dialog permits the client secret to be copied only once.
- Click **Create**. This opens **OAuth 2.0 client created**.
- Values entered: application type, name, and callback URL.
- Screenshot note: **Create client** with **Web application** and the callback
  template under **Authorized redirect URIs**.

### Copy the OAuth credentials {#copy-oauth-credentials}

- In **OAuth 2.0 client created**, copy **Client ID** to the secret store.
- Under **Client secrets**, copy **Client secret** to the same store. Google
  says it can be copied only once.
- Keep both values for {#connect-speakeasy-credentials}, then return to the
  Speakeasy AI Control Plane.
- Values copied: Client ID and Client secret to matching Speakeasy fields.
- Screenshot exception: do not capture a dialog containing a one-time secret.
- Recovery: if the secret is missed, Google says to delete it and create a new
  one before continuing.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
re-rendered at `2026-09-30T21:25:45Z`. The fixed anchors are carried verbatim. This replaces
the retired **Authentication** / **Attach Remote Identity Provider** flow.

Per-guide values:

- Remote URL: `https://sheetsmcp.googleapis.com/mcp/v1` (shared public endpoint, not tenanted).
- Add-server path: Custom remote only (**Hosted remotely**). Catalog lookup absent for `google-sheets` and `google sheets`.
- Authentication Option: `oauth-client` (OAuth) → **User Identity**. Client
  ID and Client secret come from {#copy-oauth-credentials}.
- Probe outcome (`2026-09-30T21:25:45Z`): an unauthenticated JSON-RPC `initialize` POST with
  `Accept: application/json, text/event-stream` returned HTTP 200 with a
  result (protocol `2025-06-18`), not a 401. The create form therefore
  preselects **No Identity**; the reader must select **User Identity**.
- PRM: `https://sheetsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
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
- PRM `scopes_supported`: `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/spreadsheets.readonly`, `https://www.googleapis.com/auth/drive`, `https://www.googleapis.com/auth/spreadsheets`. This is
  broader than the consent-screen configuration (full `drive`), so **Scope**
  must not be left blank.
- Scope string for **Advanced > Scope** (space-separated, one line):
  `https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/spreadsheets`
- Further-reading URL: the provider's MCP setup page listed in Provenance.

### Add the server in Speakeasy {#add-server-in-speakeasy}

Under **MCP Gateway**, select **MCP**, click **Add new**, and choose **Hosted
remotely**. On **New remote MCP server**, paste `https://sheetsmcp.googleapis.com/mcp/v1` into **MCP server
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
**Client ID** and **Client secret** from {#copy-oauth-credentials}; Google requires the
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

- The Sheets setup page requires `drive.readonly`, `drive.file`,
  `spreadsheets.readonly`, and `spreadsheets`, while the endpoint's current
  protected-resource metadata advertises `drive.readonly`, `drive`,
  `spreadsheets.readonly`, and `spreadsheets`. This Dossier follows the
  product-specific setup page for the manual override. Public documentation
  does not confirm whether the PRM scope set alone provides equivalent Drive
  access, so **Advanced > Scope** is set explicitly.

## Provenance

Documentation-property sweep:

- `developers.google.com` — primary Google Workspace developer property;
  Sheets MCP setup, shared Workspace MCP setup, OAuth consent, security, and
  release notes were used. `/llms.txt` returned 404.
- `docs.cloud.google.com` and `cloud.google.com` — Google MCP authentication,
  Service Usage, project, and IAM documentation were used.
- `support.google.com/cloud` — Google Auth platform Audience and Data Access
  behavior was used.
- `support.google.com/a` — Workspace app-access controls were swept; they can
  independently restrict OAuth access but are not a universal setup step.
- Google Cloud supported-products documentation was swept; the newer
  Workspace release note supplies the Sheets-specific preview status.
- `doctrine/speakeasy-setup.md` supplies Speakeasy labels and fixed anchors.

All sources were observed at `2026-07-29T20:37:05Z`:

- `https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server`
  — URL, HTTP transport, APIs, OAuth, consent values, scopes, client creation,
  security warning, and further-reading URL.
- `https://developers.google.com/workspace/guides/configure-mcp-servers` —
  shared Workspace endpoints, enablement, scopes, and authentication.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  consent wizard, audience, scopes, test users, and irreversibility.
- `https://developers.google.com/workspace/guides/configure-mcp-security` —
  prompt/response screening requirement.
- `https://developers.google.com/workspace/release-notes` — July 13, 2026
  Developer Preview announcement.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` —
  MCP Tool User, manual registration, web-client fields, and one-time secret.
- `https://cloud.google.com/service-usage/docs/enable-disable` — API Library,
  API search, **Enable**, resource selector, and required permission.
- `https://cloud.google.com/resource-manager/docs/creating-managing-projects`
  — project prerequisite and project-creation permission.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — IAM entry,
  **Grant access**, **New principals**, role selection, and **Save**.
- `https://support.google.com/cloud/answer/15549945` — Audience, Testing cap,
  and seven-day expiry.
- `https://support.google.com/cloud/answer/15549135` — **Data Access**,
  **Add or Remove Scopes**, manual scopes, and **Update**.
- `https://support.google.com/a/answer/7281227` — organization app controls.
- `https://sheetsmcp.googleapis.com/mcp/v1` — endpoint observation:
  MCP `initialize` over HTTPS POST returned HTTP 200.
- `https://sheetsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — authorization server, bearer method, resource URL, and advertised scopes.
- `https://accounts.google.com/.well-known/oauth-authorization-server` —
  authorization/token endpoints and no registration endpoint.
- `doctrine/speakeasy-setup.md` — Custom remote and Manual OAuth flow.
- `doctrine/personas/it-admin.md` — browser-only achievability requirements.

Re-observed at `2026-09-30T21:25:45Z` (identity-section refresh): the product MCP setup page,
`https://developers.google.com/workspace/guides/configure-mcp-servers`,
`https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers`, the MCP
endpoint `initialize` probe, the path-suffixed PRM, Google's
authorization-server metadata, and `doctrine/speakeasy-setup.md` (gram
`68b3f78`). Newly drawn from:

- `https://developers.google.com/workspace/preview` — Developer Preview
  Program terms, apply action, form contents, timeline, and listed MCP servers.
