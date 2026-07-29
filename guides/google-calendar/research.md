---
research_version: 1
slug: google-calendar
researched_at: 2026-07-29T21:55:53Z
---

# Google Calendar — Research Dossier

## Server facts

- Remote URL: `https://calendarmcp.googleapis.com/mcp/v1`.
- Transport: `streamable-http`. Google labels it **HTTP**. An MCP
  `initialize` request over HTTPS POST returned HTTP 200 and protocol version
  `2025-03-26` during this run.
- Launch stage: **Developer Preview**, announced in Google's April 22, 2026
  Workspace developer release notes. No separate preview-enrollment step is
  documented.
- Enable **Google Calendar API** (`calendar-json.googleapis.com`) and
  **Google Calendar MCP API** (`calendarmcp.googleapis.com`) in one Google
  Cloud project.
- Authentication Option: OAuth 2.0 with a manually registered
  **Web application** client, **Client ID**, and **Client secret**. Google MCP
  servers do not support Dynamic Client Registration or OAuth Client ID
  Metadata Documents.
- Each connecting user needs **MCP Tool User** (`roles/mcp.toolUser`) on the
  project and access to the intended calendars.
- Google's setup page requires:
  - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
  - `https://www.googleapis.com/auth/calendar.events.freebusy`
  - `https://www.googleapis.com/auth/calendar.events.readonly`
- Protected-resource metadata identifies Google as the authorization server
  and advertises those scopes among a broader set of Calendar scopes.
- Google requires prompt and response screening for malicious content or
  prompt injection. Model Armor is one option; another solution can be used if
  the risk is documented for users.
- If Workspace sets Calendar access to **Restricted**, configure the OAuth
  client as **Trusted** or **Specific Google data** in **API controls**.
- Speakeasy MCP Catalog lookup was absent for `google-calendar` and
  `google calendar`. Render only **Custom remote server**; catalog presence is
  not an open question.

## Credential flow

A Google Cloud project administrator enables both APIs, grants connecting
users **MCP Tool User**, configures Google Auth platform, and creates one OAuth
2.0 **Web application** client. Enabling APIs requires
`serviceusage.services.enable`, normally through **Service Usage Admin** or
**Owner**. Google's IAM procedure names **Project IAM Admin** for granting
project roles.

Paste `{{ gram.oauth.callback_url }}` directly into **Authorized redirect
URIs** in {#create-oauth-client}. The Speakeasy AI Control Plane later shows
the same **Redirect URI** for confirmation.

| Value | Google origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** in {#copy-oauth-credentials} |
| Client Secret | **Client secrets** in {#copy-oauth-credentials}; copyable once |

For an **External** audience in **Testing**, add each connecting account under
**Test users**. Testing permits at most 100 test users and authorizations
expire seven days after consent. **Internal** is limited to the project's
Google Cloud organization.

## Console walkthrough

Sign in at `https://console.cloud.google.com`. Use the toolbar resource
selector to select the project that will own the configuration and keep it
selected.

### Enable the Google Calendar APIs {#enable-google-calendar-apis}

- Open **APIs & Services** > **API Library**.
- In **Search for APIs & Services**, search for `Google Calendar API`, open
  **Google Calendar API**, and click **Enable**. Continue if already enabled.
- Reopen **API Library**, search for `Google Calendar MCP API`, open
  **Google Calendar MCP API**, and click **Enable**. Continue if already
  enabled.
- Permission gate: `serviceusage.services.enable`, normally through
  **Service Usage Admin** or **Owner**.
- Values entered: both API names. Values copied: none.
- Screenshot note: **Google Calendar MCP API** in its enabled state.
- Transition: open the project's **IAM** page.

### Grant MCP Tool User access {#grant-mcp-tool-user}

- Go to `https://console.cloud.google.com/iam-admin/iam` and confirm the same
  project.
- Click **Grant access**.
- In **New principals**, enter a connecting user's Google Account email.
- Click **Select a role**, search for `MCP Tool User`, select
  **MCP Tool User**, and click **Save**.
- Repeat for every connecting user.
- Values entered: user emails and **MCP Tool User**. Values copied: none.
- Screenshot note: **Grant access** with the principal and role visible.
- Transition: open **Google Auth platform**.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Warning: Google says the consent screen cannot be removed after
  configuration.
- Open **Google Auth platform** > **Branding**. If
  **Google Auth platform not configured yet** appears, click **Get Started**.
- In the first-time wizard:
  1. Under **App Information**, enter `Calendar MCP Server` in **App name**,
     choose a monitored **User support email**, and click **Next**.
  2. Under **Audience**, select **Internal** when all connecting users belong
     to the project's organization; otherwise select **External**. Click
     **Next**.
  3. Under **Contact Information**, enter a monitored **Email address** and
     click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. With
     approval, select **I agree to the Google API Services: User Data Policy**,
     click **Continue**, and click **Create**.
- For an existing configuration, retain approved **Branding** and
  **Audience** values.
- Open **Data Access** and click **Add or Remove Scopes**. Under
  **Manually add scopes**, paste all three scopes from Server facts. Click
  **Add to Table**, **Update**, and **Save**.
- For an External app in Testing, open **Audience**. Under **Test users**,
  click **Add users**, enter each connecting user's email, and click **Save**.
- Values entered: app/contact details, audience, scopes, and applicable test
  users. Values copied: none.
- Screenshot note: **Data Access** with all three scopes selected.
- Recovery: after a Testing authorization expires, the user must authorize
  again.
- Transition: open **Google Auth platform** > **Clients**.

### Create the OAuth client {#create-oauth-client}

- Click **Create client**.
- Set **Application type** to **Web application**.
- In **Name**, enter a recognizable name such as
  `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter
  `{{ gram.oauth.callback_url }}` in **URIs**. The Calendar procedure does not
  require an **Authorized JavaScript origin**.
- Warning: prepare an approved secret store before clicking **Create** because
  the next dialog permits the secret to be copied only once.
- Click **Create** to open **OAuth 2.0 client created**.
- Values entered: application type, name, and callback URL.
- Screenshot note: **Create client** with the callback template populated.

### Copy the OAuth credentials {#copy-oauth-credentials}

- Copy **Client ID** to the approved secret store.
- Under **Client secrets**, copy **Client secret** to the same store.
- Keep both for {#connect-speakeasy-credentials}.
- Screenshot exception: do not capture a one-time secret.
- Recovery: if the secret is missed, Google says to delete it and create a
  new one before continuing.
- Transition: if Workspace restricts Calendar access, complete the conditional
  step; otherwise return to the Speakeasy AI Control Plane.

### Permit the OAuth app under Workspace policy if required {#permit-workspace-app}

- Sign in at `https://admin.google.com` with **Service Settings
  administrator** privilege.
- Go to **Security** > **Access and data control** > **API controls**.
- Click **Manage App Access**. Under **Configured apps**, click
  **Configure new app**.
- Enter the Client ID from {#copy-oauth-credentials}, click **Search**, and
  select the matching app.
- Select covered organizational units and click **Continue**.
- Under **Access to Google data**, have the application or security owner
  choose **Trusted** or **Specific Google data**. **Limited** cannot access a
  restricted Calendar service.
- Click **Continue**, review the settings, and click **Finish**.
- Screenshot note: the review screen without credential values.
- Transition: return to the Speakeasy AI Control Plane.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md`, observed at
`2026-07-29T21:55:53Z`. Fixed anchors are carried verbatim.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On **Add a custom remote MCP server**, paste
`https://calendarmcp.googleapis.com/mcp/v1` into **Remote MCP server URL** and
click **Add server**. This opens the server's **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

Per-guide values: remote URL
`https://calendarmcp.googleapis.com/mcp/v1`; transport `streamable-http`
(the **Transport** field is read-only); Authentication Option `oauth-client`;
Custom remote only because both catalog queries were absent.

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, click
**Configure Manually** or **Use Discovered** when offered. In **Attach Remote
Identity Provider**, set **Client Type** to **Manual**.

Confirm **Redirect URI** matches the template entered in
{#create-oauth-client}. Paste **Client ID** and **Client Secret (optional)**
from {#copy-oauth-credentials}; Google requires the generated secret despite
the optional Speakeasy label.

In **Scope (override)**, enter these comma-separated values:
`https://www.googleapis.com/auth/calendar.calendarlist.readonly`,
`https://www.googleapis.com/auth/calendar.events.freebusy`,
`https://www.googleapis.com/auth/calendar.events.readonly`. Click
**Attach Identity Provider**.

At first connection, authorize with an account granted **MCP Tool User**,
included as a test user when applicable, and permitted by Workspace policy.
Google does not document the provider-specific authorization-prompt labels.

Screenshot note: the Manual identity-provider sheet with secrets redacted.

Further-reading URL:
`https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server`.

## Open questions

- Google's Calendar MCP page describes mutating event behavior but requires
  only calendar-list read, event free/busy, and event read scopes. Public
  documentation does not explain how mutating operations receive write
  authorization.
- Protected-resource metadata advertises more Calendar scopes than the
  product-specific setup page. Public documentation does not confirm whether
  **Use Discovered** narrows the request automatically; the documented
  three-scope manual override is used here.

## Provenance

Documentation-property sweep:

- `developers.google.com`: Calendar and shared Workspace MCP setup, Calendar
  scopes, OAuth consent, MCP security, and release notes. Drawn from.
  `/llms.txt` returned 404.
- `docs.cloud.google.com` and `cloud.google.com`: MCP authentication, Service
  Usage, and IAM. Drawn from.
- `support.google.com/cloud`: Auth platform Audience and Data Access. Drawn
  from.
- `support.google.com/a`: Workspace API controls. Drawn from.
- Google Workspace Codelabs and Google Cloud Blog: swept, not drawn from;
  current product/admin documentation was preferred.

All entries were observed at `2026-07-29T21:55:53Z`:

- `https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server`
  — endpoint, APIs, OAuth, scopes, client creation, and security requirement.
- `https://developers.google.com/workspace/guides/configure-mcp-servers` —
  shared endpoints, enablement, scopes, and authentication.
- `https://developers.google.com/workspace/calendar/api/auth` — scope meanings.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  consent wizard, audience, test users, and irreversibility.
- `https://developers.google.com/workspace/guides/configure-mcp-security` —
  screening requirement.
- `https://developers.google.com/workspace/release-notes` — April 22, 2026
  Developer Preview announcement.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` —
  MCP Tool User, manual registration, one-time secret, and DCR limitation.
- `https://cloud.google.com/service-usage/docs/enable-disable` — API Library,
  enablement labels, and permission.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — IAM labels.
- `https://support.google.com/cloud/answer/15549945` — Audience and Testing.
- `https://support.google.com/cloud/answer/15549135` — Data Access controls.
- `https://support.google.com/a/answer/7281227` — Workspace API controls.
- `https://calendarmcp.googleapis.com/mcp/v1` — successful MCP initialize.
- `https://calendarmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — protected-resource metadata.
- `https://accounts.google.com/.well-known/oauth-authorization-server` —
  OAuth endpoints and no registration endpoint.
- `doctrine/speakeasy-setup.md` — canonical Speakeasy labels and anchors.
- `doctrine/personas/it-admin.md` — achievability requirements.
