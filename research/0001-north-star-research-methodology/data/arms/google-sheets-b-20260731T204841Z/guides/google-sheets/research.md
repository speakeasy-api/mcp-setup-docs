---
research_version: 1
slug: google-sheets
researched_at: 2026-07-31T20:48:45Z
---

# Google Sheets — Research Dossier

## Server facts

- Remote URL: `https://sheetsmcp.googleapis.com/mcp/v1`.
- Transport: `streamable-http`. Google labels it **HTTP**. An MCP
  `initialize` request over HTTPS POST returned HTTP 200 and protocol version
  `2025-03-26` during this run.
- Launch stage: **Developer Preview**, announced July 13, 2026. Access is part
  of the Google Workspace Developer Preview Program. The current application
  requires one individual email in a Workspace domain (not Gmail, a service
  account, or a Google Group) and one or more Google Cloud project numbers;
  its confirmation says to allow about one week for processing. Program terms
  prohibit including preview features in public applications before general
  availability.
- Enable **Google Sheets API** (`sheets.googleapis.com`) and **Google Sheets MCP
  API** (`sheetsmcp.googleapis.com`) in the registered Google Cloud project.
- Authentication Option: OAuth 2.0 with a manually registered **Web
  application** client, **Client ID**, and **Client secret**. Google remote MCP
  servers do not support Dynamic Client Registration or OAuth Client ID
  Metadata Documents.
- Each connecting user needs **MCP Tool User** (`roles/mcp.toolUser`) on the
  project, which includes `mcp.tools.call`, and access to the intended
  spreadsheets.
- Google's Sheets setup page requires these consent and connection scopes:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`
- Live protected-resource metadata identifies Google as the authorization
  server and advertises Drive and Sheets read/write scopes. It advertises
  `drive` rather than the setup page's narrower `drive.file`; this dossier uses
  the purpose-built setup page's four scopes.
- Google requires prompt and response screening for malicious content or
  prompt injection. Model Armor is one option; another solution can be used if
  the risk is documented for users.
- If Workspace sets applicable Google service access to **Restricted**, the
  OAuth app must be configured as **Trusted** or **Specific Google data** in
  **API controls**; **Limited** apps can access only unrestricted services.
- Operator override: use only **Custom remote server** because the Speakeasy
  MCP Catalog mapping is unreliable or unsuitable for this Guide. Keep
  `speakeasy_add_server: custom-remote`; catalog presence is not an open
  question.

## Credential flow

A Google Workspace/Cloud administrator first ensures every Workspace account
that will connect and the Cloud project are admitted to the Developer Preview
Program. The application accepts one Workspace-domain email, so repeat the
application for each connecting account. In that registered project, an
administrator enables both APIs, grants every connecting user
**MCP Tool User**, configures Google Auth platform, and creates one OAuth 2.0
**Web application** client. The operator enabling services needs
`serviceusage.services.enable`; **Service Usage Admin** and **Owner** normally
provide it, though another predefined or custom role can provide the
permission. Google's IAM console procedure names **Project IAM Admin** for
project role grants.

Paste `{{ gram.oauth.callback_url }}` directly into **Authorized redirect
URIs** in {#create-oauth-client}. The Speakeasy AI Control Plane later shows the
same **Redirect URI** for confirmation.

| Value | Google origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** dialog in {#copy-oauth-credentials} |
| Client Secret | **Client secrets** in {#copy-oauth-credentials}; copyable once |

For an **External** audience in **Testing**, add every connecting account under
**Test users**. Google documents a maximum of 100 test users and seven-day
Testing authorizations. **Internal** is available only to a project associated
with a Google Cloud organization.

## Console walkthrough

Start at `https://console.cloud.google.com`. In the toolbar resource selector,
select the Developer Preview-registered project and keep it selected.

### Enroll the project in Developer Preview if needed {#enroll-developer-preview}

- If the Workspace account and project have not already been accepted, first
  select the project in Google Cloud console, then open **Navigation menu** >
  **Cloud overview** > **Dashboard**. In the **Project info** card, copy the
  numeric **Project number**.
- Open `https://developers.google.com/workspace/preview`, read the **Program
  Terms**, and click **Apply to join the Developer Preview Program**.
- Sign in to the form as the individual Workspace-domain account that should
  receive preview access. The current form rejects Gmail addresses, service
  accounts, and Google Groups. Because the form grants access to the one email
  entered, repeat this enrollment process for every account that will authorize
  a connection.
- Enter **Given name**, **Surname**, **Company name**, **Company website**, the
  individual Workspace-domain email in **What Email should we grant access to
  Developer Preview features?**, and the target project's numeric value in
  **Google Cloud Project number**. Select **Sheets** under the optional product
  interests if useful.
- Under **By checking the boxes below, you accept the terms of participation in
  this program**, accept the terms only with organizational approval and submit
  the form. The confirmation says to allow about one week for processing.
- Do not continue until Google confirms access for the submitted account and
  project.
- Values entered: identity/company details, one individual Workspace-domain
  email, and one or more target Cloud project numbers. Values copied: none.
- Screenshot note: the preview-program page with the application button and no
  organization-specific values.
- Recovery: if enrollment has a problem, use the program-account contact path
  on the same preview page rather than submitting unapproved alternate project
  details.
- Transition: sign in to Google Cloud console and select the confirmed project.

### Enable the Google Sheets APIs {#enable-google-sheets-apis}

- Open **APIs & Services** > **API Library**.
- In **Search for APIs & Services**, search for `Google Sheets API`, open
  **Google Sheets API**, and click **Enable**. Continue if it is already
  enabled.
- Reopen **API Library**, search for `Google Sheets MCP API`, open **Google
  Sheets MCP API**, and click **Enable**. Continue if it is already enabled.
- Permission gate: `serviceusage.services.enable`; **Service Usage Admin** and
  **Owner** normally provide it, but another predefined or custom role can
  provide it.
- Values entered: both API names. Values copied: none.
- Screenshot note: **Google Sheets MCP API** in its enabled state.
- Transition: open the project's **IAM** page.

### Grant MCP Tool User access {#grant-mcp-tool-user}

- Go to `https://console.cloud.google.com/iam-admin/iam` and confirm the same
  project is selected.
- Click **Grant access**.
- In **New principals**, enter a connecting user's Google Account email.
- Click **Select a role**, search for `MCP Tool User`, select **MCP Tool User**,
  and click **Save**.
- Repeat for every connecting user. Each user must separately have access to
  the intended spreadsheets.
- Values entered: user emails and **MCP Tool User**. Values copied: none.
- Screenshot note: **Grant access** with the principal and role visible.
- Transition: open **Google Auth platform**.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Warning: Google says the consent screen cannot be removed after it is
  configured.
- Open **Google Auth platform** > **Branding**. If **Google Auth platform not
  configured yet** appears, click **Get Started**.
- In the first-time wizard:
  1. Under **App Information**, enter `Sheets MCP Server` in **App name**,
     choose a monitored **User support email**, and click **Next**.
  2. Under **Audience**, select **Internal** when all connecting users belong to
     the project's organization; otherwise select **External**. Click **Next**.
  3. Under **Contact Information**, enter a monitored **Email address** and
     click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. With
     organizational approval, select **I agree to the Google API Services: User
     Data Policy**, click **Continue**, and click **Create**.
- For an existing configuration, retain approved **Branding** and **Audience**
  values.
- Open **Data Access** and click **Add or Remove Scopes**. Under **Manually add
  scopes**, paste all four scopes from Server facts. Click **Add to Table**,
  **Update**, and **Save**.
- For an External app in Testing, open **Audience**. Under **Test users**, click
  **Add users**, enter each connecting user's email, and click **Save**.
- Values entered: app/contact details, audience, four scopes, and applicable
  test users. Values copied: none.
- Screenshot note: **Data Access** with all four scopes in the table.
- Recovery: after a Testing authorization expires, the user must authorize
  again.
- Transition: open **Google Auth platform** > **Clients**.

### Create the OAuth client {#create-oauth-client}

- Click **Create client** (Google's Sheets page also renders this as **Create
  Client**).
- Set **Application type** to **Web application**.
- In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter
  `{{ gram.oauth.callback_url }}` in **URIs**. No **Authorized JavaScript
  origin** is required by Google's Sheets MCP procedure.
- Warning: prepare an approved secret store before clicking **Create** because
  the next dialog permits the client secret to be copied only once.
- Click **Create** to open **OAuth 2.0 client created**.
- Values entered: application type, name, and callback URL.
- Screenshot note: **Create client** with the callback template populated.

### Copy the OAuth credentials {#copy-oauth-credentials}

- Copy **Client ID** to the approved secret store.
- Under **Client secrets**, copy **Client secret** to the same store.
- Keep both for {#connect-speakeasy-credentials}.
- Screenshot exception: do not capture a one-time secret.
- Recovery: if the secret is missed, reopen **Google Auth platform** >
  **Clients**, open the client, and use the current client-secret management
  controls to delete the missed secret and create a replacement; copy the new
  secret immediately. Google's MCP authentication page confirms replacement
  is required but does not consistently name the current control.
- Transition: if Workspace policy restricts the relevant Google services,
  complete the conditional step; otherwise return to the Speakeasy AI Control
  Plane.

### Permit the OAuth app under Workspace policy if required {#permit-workspace-app}

- Confirm with the Workspace security owner whether an applicable service is
  **Restricted**. Skip this step when current policy already permits the app.
- Sign in at `https://admin.google.com` with **Service Settings administrator**
  privilege.
- Go to **Security** > **Access and data control** > **API controls**.
- Click **Manage App Access**. Under **Configured apps**, click **Configure new
  app**.
- Enter the Client ID from {#copy-oauth-credentials}, click **Search**, and
  select the matching app.
- Under **Scope**, keep the top organizational unit or click **Select org
  units** > **Include organizations**, select the covered units, click
  **Select**, and click **Continue**.
- Under **Access to Google data**, have the security owner choose **Trusted**
  when organizational policy permits. **Limited** cannot access restricted
  services.
- Click **Continue**, review the settings, and click **Finish**.
- Screenshot note: the review screen without credential values.
- Transition: return to the Speakeasy AI Control Plane.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md`, observed at
`2026-07-31T20:48:45Z`. Fixed anchors are carried verbatim.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On the **Add a custom remote MCP server**
page, paste `https://sheetsmcp.googleapis.com/mcp/v1` into **Remote MCP server
URL** and click **Add server**. This creates the hosted MCP server and opens its
**Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

Per-guide values: remote URL `https://sheetsmcp.googleapis.com/mcp/v1`;
transport `streamable-http` (the **Transport** field is read-only);
Authentication Option `oauth-client`; Custom remote only because the operator
forced `speakeasy_add_server: custom-remote` when catalog mapping was unreliable
or unsuitable.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually** (or **Use Discovered** when offered). In the
**Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**.
The sheet shows the **Redirect URI** with a copy button — the callback URL
registered in {#create-oauth-client} (`{{ gram.oauth.callback_url }}`).

Confirm the sheet's **Redirect URI** matches the template entered in
{#create-oauth-client}. Paste **Client ID** and **Client Secret (optional)**
from {#copy-oauth-credentials}; Google's web client requires the generated
secret despite the optional Speakeasy label.

In **Scope (override)**, enter these comma-separated values:
`https://www.googleapis.com/auth/drive.readonly`,
`https://www.googleapis.com/auth/drive.file`,
`https://www.googleapis.com/auth/spreadsheets.readonly`,
`https://www.googleapis.com/auth/spreadsheets`. Click **Attach Identity
Provider**.

At first connection, authorize with an account granted **MCP Tool User**,
included as a test user when applicable, admitted to Developer Preview, and
permitted by Workspace policy. Google does not document the provider-specific
authorization-prompt labels.

Screenshot note: the Manual identity-provider sheet with credential values
redacted.

Further-reading URL:
`https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server`.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Google's MCP documentation at
https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server.

## Open questions

- Google's purpose-built setup page requires `drive.file`, while live
  protected-resource metadata advertises the broader `drive` scope and omits
  `drive.file`. Public documentation does not explain this discovery mismatch;
  the documented four-scope manual override is used here.
- The Sheets MCP page does not say whether every already-admitted Developer
  Preview project automatically receives Sheets MCP access or whether Google
  must separately enable this feature after project registration. API
  enablement in a registered project is the documented path.

## Provenance

Source inventory:

- `developers.google.com`: purpose-built Sheets MCP setup (north star), shared
  Workspace MCP and OAuth/security docs, Developer Preview program, and release
  notes. Drawn from. `/llms.txt` returned 404.
- `docs.cloud.google.com` and `cloud.google.com`: shared MCP authentication,
  Service Usage, IAM procedures, and project-number retrieval. Drawn from.
- `support.google.com/cloud`: Auth platform Audience, Data Access, and OAuth
  client management. Drawn from.
- `knowledge.workspace.google.com`: Workspace API controls. Drawn from.
- Google Workspace Codelabs and Google Cloud Blog were not needed; current
  product/admin documentation supplied the setup facts.
- Pipeline operator note: Custom remote override because catalog mapping is
  unreliable or unsuitable. Drawn from.

Conflict: the purpose-built Sheets setup page requires `drive.file`; live
protected-resource metadata advertises `drive`. The setup page wins for the
manual scope override because it is the current product-specific procedure.

All entries were observed at `2026-07-31T20:48:45Z`:

- `https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server`
  — endpoint, HTTP transport, preview status, APIs, OAuth client flow, exact
  scopes, consent labels, and security requirement.
- `https://developers.google.com/workspace/guides/configure-mcp-servers` —
  shared Workspace MCP enablement and authentication context.
- `https://developers.google.com/workspace/preview` — enrollment entry point,
  project registration, and preview terms.
- `https://docs.google.com/forms/d/e/1FAIpQLSd7BiMXXHDlUDkF7G0TSY5zfJbQwFNH3m6K_ZYFi3vCHLFbng/viewform?resourcekey=0-1uHeVg8junj3PPTLNcn7WQ`
  — current enrollment field labels, account restrictions, project-number
  input, and processing estimate. Where it conflicts with the preview page's
  older Google Group and timing prose, the live application form wins.
- `https://developers.google.com/workspace/release-notes#July_13_2026` — July
  13, 2026 Sheets MCP Developer Preview announcement.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  consent wizard, audience, test users, and irreversibility.
- `https://developers.google.com/workspace/guides/configure-mcp-security` —
  prompt and response screening requirement.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` — MCP
  Tool User, manual registration, one-time secret, and DCR limitation.
- `https://docs.cloud.google.com/service-usage/docs/enable-disable` — API
  Library labels and enablement permission.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — IAM role-grant
  labels and administration requirement.
- `https://cloud.google.com/resource-manager/docs/creating-managing-projects#identifying_projects`
  — **Cloud overview** > **Dashboard**, **Project info**, and **Project number**
  retrieval.
- `https://support.google.com/cloud/answer/15549945` — Audience and Testing.
- `https://support.google.com/cloud/answer/15549135` — Data Access controls.
- `https://support.google.com/cloud/answer/15549257` — OAuth client and secret
  management.
- `https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data`
  — restricted-service behavior and app-access controls.
- `https://sheetsmcp.googleapis.com/mcp/v1` — successful MCP initialize.
- `https://sheetsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — protected-resource metadata and advertised scopes.
- `https://accounts.google.com/.well-known/oauth-authorization-server` — OAuth
  endpoints and absence of a registration endpoint.
- Pipeline operator note — `speakeasy_add_server: custom-remote` and the
  unreliable-or-unsuitable catalog-mapping rationale.
- `doctrine/speakeasy-setup.md` — canonical Speakeasy labels and anchors.
- `doctrine/personas/it-admin.md` — click-through and voice requirements used
  to shape this dossier.
