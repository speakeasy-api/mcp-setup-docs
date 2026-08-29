---
research_version: 1
slug: google-calendar
researched_at: 2026-08-29T15:13:24Z
---

# Google Calendar — Research Dossier

## Server facts

- Google publishes a hosted Google Calendar MCP server at
  `https://calendarmcp.googleapis.com/mcp/v1`. This is a single shared public
  endpoint, not a region-, organization-, or instance-specific endpoint, so
  the remote is not tenanted.
- Google describes the transport as **HTTP**. Map this to the guide schema's
  `streamable-http` transport.
- The Calendar MCP server remains in the Google Workspace Developer Preview
  Program. The program page lists **Calendar MCP server** under **Latest
  features** and requires program application, a Google Workspace account that
  can be added to Google Groups, account verification, and Google Cloud project
  registration before use. The Developer Preview Program Terms restrict access
  to pre-GA offerings outside the applicant's domain or company unless Google
  permits otherwise; every connecting user must pass this eligibility gate.
- The registered Google Cloud project must have **Google Calendar API**
  (`calendar-json.googleapis.com`) and **Calendar MCP API**
  (`calendarmcp.googleapis.com`) enabled.
- For Speakeasy, use OAuth 2.0 with a manually registered **Web application**
  client, **Client ID**, and **Client Secret**. Google's shared MCP
  authentication documentation supports OAuth client ID and secret for
  third-party applications and states that Google remote MCP servers do not
  support Dynamic Client Registration or OAuth Client ID Metadata Documents.
- Each connecting user must have `mcp.tools.call` on the project and access to
  the Calendar resources they will use. **MCP Tool User**
  (`roles/mcp.toolUser`) is the normal predefined grant, but another predefined
  or custom role is sufficient if it contains `mcp.tools.call`.
- Google's Calendar setup procedure requires these OAuth scopes:
  - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
  - `https://www.googleapis.com/auth/calendar.events.freebusy`
  - `https://www.googleapis.com/auth/calendar.events.readonly`
- Google requires prompts and responses to be screened for malicious content
  or prompt injection. Google Model Armor is one option; an organization's own
  solution is acceptable when its use is documented so users can accept the
  risk.
- If a Google Workspace administrator has set Calendar access to
  **Restricted**, only apps configured as **Trusted** or **Specific Google
  data** can access Calendar data. **Limited** is insufficient in that case.
- The coordinator's credential-free Pulse snapshot was `ready` at
  `2026-08-29T15:13:24Z` and contained no Google Calendar catalog entry. With
  the non-tenanted remote and `speakeasy_add_server: auto`, the snapshot
  resolves the current guide to the **Custom remote server** path. This is
  snapshot evidence, not a permanent claim that the catalog cannot gain an
  entry and not a reason to force `speakeasy_add_server: custom-remote`.

## Credential flow

An administrator first registers the intended Google Cloud project for the
Google Workspace Developer Preview Program and waits for Google's confirmation.
In that registered project, the administrator enables both services, grants
each connecting user `mcp.tools.call`—normally through **MCP Tool User**—configures
**Google Auth Platform**, and creates one OAuth 2.0 **Web application** client.

The service-enabling operator needs `serviceusage.services.enable`; Google
documents **Service Usage Admin** as the role to request and notes that project
**Owner** commonly has the permission. The role-granting operator needs
permission to change project IAM policy; Google's console procedure uses
**Project IAM Admin**.

Enter `{{ gram.oauth.callback_url }}` directly under **Authorized redirect
URIs** while creating the OAuth client in {#create-oauth-client}. The
Speakeasy AI Control Plane later displays the same **Redirect URI** for
confirmation; there is no Speakeasy-first callback-copy detour.

| Speakeasy value | Google origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** after {#create-oauth-client} |
| Client Secret | **OAuth 2.0 client created** after {#create-oauth-client}; copy it in {#copy-oauth-credentials} because Google says it is shown only after creation and cannot be viewed again |

For an **External** audience, add each eligible connecting account under **Test
users** while the app is in **Testing**. Do not add a user outside the Developer
Preview applicant's domain or company unless Google has permitted that access.
Because the Calendar scopes are outside the profile-only exception, Testing
authorizations expire after seven days and the user must authorize again. An
**Internal** audience is available only when the users belong to the Google
Cloud project's organization.

## Console walkthrough

### Join the Google Workspace Developer Preview Program {#join-developer-preview}

- Open Google's **Google Workspace Developer Preview Program** page and review
  the published **Developer Preview Program Terms** with the organization's
  application or security owner. The terms restrict access to pre-GA offerings
  outside the applicant's domain or company unless Google permits otherwise.
- Before applying, confirm that the submitted Google Workspace account can be
  added to Google Groups, as required by the program.
- Click **Apply to join the Developer Preview Program**. In the current
  application form, provide the requested Google Workspace account and Google
  Cloud project information, agree to the terms only with organizational
  approval, and submit the form. Google does not publish the form's exact field
  labels on the program page.
- Google verifies the Workspace account, adds it to the program group, and then
  registers the Cloud project; the source documents no post-submission
  Google Groups acceptance action.
- Wait for the final project-registration confirmation at the submitted email
  address before continuing. Google says the process should complete within a
  couple of days.
- Values entered: organization-specific Workspace account and Cloud project
  information requested by Google's current form. Values copied: none.
- Screenshot note: the program page with **Calendar MCP server** listed under
  **Latest features**; do not capture application-form account or project data.
- Transition: open the provider-documented Google Cloud console entry URL,
  `https://console.cloud.google.com/`, sign in, and select the registered project
  in the toolbar resource selector. Keep that project selected.

### Enable the Google Calendar APIs {#enable-google-calendar-apis}

- Open **APIs & Services** > **API Library**.
- In **Search for APIs & Services**, search for `Google Calendar API`, open
  **Google Calendar API**, and click **Enable**. Continue if it is already
  enabled.
- Reopen **API Library**, search for `Calendar MCP API`, open **Calendar MCP
  API**, and click **Enable**. Continue if it is already enabled.
- Permission gate: `serviceusage.services.enable`; request **Service Usage
  Admin** if the operator does not already have that permission.
- Values entered: the two API names. Values copied: none.
- Screenshot note: **Calendar MCP API** in its enabled state.
- Transition: open the registered project's **IAM** page at
  `https://console.cloud.google.com/iam-admin/iam`.

### Grant MCP Tool User access {#grant-mcp-tool-user}

- On the project's **IAM** page, click **Grant access**.
- In **New principals**, enter a connecting user's Google Account email.
- Click **Select a role**, search for `MCP Tool User`, select **MCP Tool User**,
  and click **Save**.
- Repeat for every connecting user. A custom or other predefined role is also
  sufficient only if it contains `mcp.tools.call`; the documented path uses
  **MCP Tool User**.
- Values entered: connecting-user email addresses and **MCP Tool User**. Values
  copied: none.
- Screenshot note: **Grant access** with a non-sensitive test principal and the
  role visible.
- Transition: open **Google Auth Platform** > **Branding** for the same project.

### Configure the OAuth consent screen {#configure-oauth-consent}

- If **Google Auth Platform not configured yet** appears, click **Get Started**.
- In the first-time wizard, under **App Information**, enter a recognizable
  **App name** such as `Calendar MCP Server`, select a monitored **User support
  email**, and click **Next**.
- Under **Audience**, select **Internal** only when all connecting users belong
  to the project's organization; otherwise select **External**, then click
  **Next**.
- Under **Contact Information**, enter a monitored **Email address** and click
  **Next**.
- Under **Finish**, review the Google API Services User Data Policy. With
  organizational approval, select **I agree to the Google API Services: User
  Data Policy**, click **Continue**, and click **Create**.
- For a project whose Google Auth platform is already configured, retain the
  organization's approved **Branding** and **Audience** values rather than
  replacing them.
- Open **Data Access** and click **Add or Remove Scopes**. Under **Manually add
  scopes**, enter all three scopes from Server facts, click **Add to Table**,
  click **Update**, and on **Data Access** click **Save**.
- If the audience is **External** and the app is in **Testing**, open
  **Audience**. Under **Test users**, click **Add users**, enter each eligible
  connecting user's email address, and click **Save**. Do not add users outside
  the Developer Preview applicant's domain or company unless Google has
  permitted their access.
- Values entered: organization-approved app/contact details, audience, the
  three documented scopes, and applicable test-user emails. Values copied:
  none.
- Screenshot note: **Data Access** with the three documented Calendar scopes
  selected.
- Transition: open **Google Auth Platform** > **Clients**.

### Create the OAuth client {#create-oauth-client}

- Click **Create Client**.
- Set **Application type** to **Web application**.
- In **Name**, enter a recognizable name such as
  `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter
  `{{ gram.oauth.callback_url }}` in **URIs**. The Calendar procedure does not
  require an **Authorized JavaScript origin** for this server connection.
- Before clicking **Create**, prepare an approved secret store: Google says the
  client secret is visible only after creation and is not accessible again.
- Click **Create**. This opens **OAuth 2.0 client created**.
- Values entered: application type, client name, and callback URL. Values
  copied: none.
- Screenshot note: **Create Client** immediately before creation with the
  callback template populated.

### Copy the OAuth credentials {#copy-oauth-credentials}

- In **OAuth 2.0 client created**, copy **Client ID** to the approved credential
  handoff or password manager.
- Copy **Client Secret** to the approved secret store before closing the
  dialog. Never place the secret in the guide or a screenshot.
- If the dialog was closed before the secret was stored, return to **Google
  Auth Platform** > **Clients** and repeat {#create-oauth-client} to create a new
  web client with the same callback URL. Store the new **Client ID** and newly
  shown **Client Secret**, and use that pair in Speakeasy; Google does not make
  the original secret visible again.
- Values copied: **Client ID** and **Client Secret**. Values entered: none.
- Screenshot note: omit this secret-bearing dialog; use the client list with
  identifiers redacted if a screenshot is required.
- Transition: when Workspace policy permits the app, return to Speakeasy; when
  Calendar is restricted, continue to {#permit-workspace-app}.

### Permit the OAuth app under Workspace policy if required {#permit-workspace-app}

- Before skipping this conditional step, confirm with the Workspace security
  owner whether Calendar is **Restricted** or the new app requires approval. The
  step requires the Google Workspace **Service Settings** administrator
  privilege.
- Open the Google Admin console at `https://admin.google.com/`, then go to
  **Security** > **Access and data control** > **API controls** and click
  **Manage App Access**. Under **Configured apps**,
  click **Configure new app**.
- Enter the **Client ID** from {#copy-oauth-credentials}, click **Search**, and
  select the matching OAuth app.
- Select the organizational units that contain the connecting users and click
  **Continue**.
- Under **Access to Google data**, have the application or security owner choose
  **Trusted**. Do not choose **Limited** for a restricted Calendar service. This
  walkthrough omits the alternate **Specific Google data** branch rather than
  prescribing its required scope-selection flow without recorded support.
- Click **Continue**, review the settings, and click **Finish**.
- Values entered: Client ID, covered organizational units, and the
  organization-approved access setting. Values copied: Client ID.
- Screenshot note: the review screen with identifiers and user data redacted.
- Transition: return to the Speakeasy AI Control Plane.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md`, observed at
`2026-08-29T15:13:24Z`. Fixed anchors are carried verbatim.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On the **Add a custom remote MCP server**
page, paste the following value into **Remote MCP server URL**, then click
**Add server**:

```text
https://calendarmcp.googleapis.com/mcp/v1
```

This creates the hosted MCP server and opens its Overview page.

<!-- screenshot: the Add Source menu open on the Sources page -->

Per-guide values: remote URL
`https://calendarmcp.googleapis.com/mcp/v1`; transport `streamable-http`;
Authentication Option `oauth-client`; `speakeasy_add_server: auto`. The
Custom remote path is resolved by the coordinator's ready Pulse snapshot with
no Google Calendar entry, not by a tenanted remote or forced override.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually** (or **Use Discovered** when offered). Google
publishes protected-resource and authorization-server metadata, but does not
support dynamic client registration, so in **Attach Remote Identity Provider**
set **Client Type** to **Manual**. The sheet shows **Redirect URI** with a copy
button.

Confirm **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value
entered in {#create-oauth-client}. Paste **Client ID** and **Client Secret
(optional)** from {#copy-oauth-credentials}; despite the optional label in the
Control Plane, this manual Google web client uses the generated secret.

**Scope (override)** must contain these three provider-documented scopes.
Speakeasy's public setup material does not document how the field separates
multiple values, so follow the current field guidance rather than assuming a
delimiter, then click **Attach Identity Provider**:

- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
- `https://www.googleapis.com/auth/calendar.events.freebusy`
- `https://www.googleapis.com/auth/calendar.events.readonly`

At first connection, authorize with an intended Google account that has
`mcp.tools.call` on the project, access to the required calendars, applicable
**Test user** status, and Workspace API-control approval when required. The
normal predefined grant for `mcp.tools.call` is **MCP Tool User**. Google does not document
the exact Calendar authorization-prompt button labels, so the Writer must name
the purpose and use the labels shown rather than inventing chrome.

<!-- screenshot: the Attach Remote Identity Provider sheet with Client Type Manual and Redirect URI visible; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's MCP documentation](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server).

## Research limitations

- The public Developer Preview page documents the application action, required
  Workspace account and Cloud project information, Google Groups precondition,
  verification sequence, and expected confirmation, but not the current
  application form's exact field or final-button labels. It documents no
  post-submission Google Groups acceptance control. The walkthrough preserves
  the documented identifiers and tells the reader to complete the current form
  without inventing UI chrome.
- The Calendar MCP page says the server can create, update, and delete events,
  but its setup procedure lists only calendar-list read, event free/busy, and
  event read scopes. Public documentation does not explain how write
  authorization is obtained. This does not block first connection: use the
  three scopes in the product-specific setup procedure and do not promise write
  behavior.
- Protected-resource metadata advertises a broader set of Calendar scopes than
  the product-specific setup page. Use the product-specific three-scope set for
  setup; do not guess that **Use Discovered** will narrow it.
- Google does not publish the exact labels of the end-user Calendar OAuth
  authorization prompt. Use a resilient instruction to authorize the requested
  access with the intended account.
- Speakeasy's public setup material names **Scope (override)** but does not
  document the accepted syntax for multiple scope values. Present the required
  values separately and direct the reader to use the current multi-value
  control rather than inventing a delimiter.
- The Pulse result proves only that the ready credential-free snapshot at
  `2026-08-29T15:13:24Z` had no Google Calendar entry. It does not establish
  permanent catalog absence; `auto` preserves future catalog resolution.

## Operator decisions

None. The public documentation and supplied snapshot resolve every material
first-connection decision. The documentation gaps above are presentation or
provider-behavior limitations that an operator cannot resolve with private
organizational knowledge.

## Provenance

### Source inventory

- Google for Developers (`developers.google.com`): Calendar MCP setup, the
  Google Workspace Developer Preview Program, shared Workspace MCP guidance,
  OAuth consent guidance, Calendar scopes, and MCP security guidance. The
  Calendar setup and preview pages were primary. Exa could not retrieve a
  Workspace `/llms.txt` index.
- Google Cloud Documentation (`cloud.google.com` and
  `docs.cloud.google.com`): shared MCP authentication, Service Usage, and IAM
  administration. These pages supplied the cross-product MCP role, registration
  limitation, API-enablement permission, and IAM console labels. Exa could not
  retrieve the tested Cloud `/llms.txt` index.
- Google Cloud Platform Console Help (`support.google.com/cloud`): Google Auth
  platform audience, data-access, and OAuth-client administration. Drawn from
  for Testing behavior and one-time client-secret visibility.
- Google Workspace Admin Help (`support.google.com/a`): Workspace OAuth app
  access controls. Drawn from for the conditional restricted-Calendar path.
- Google Help's root `https://support.google.com/llms.txt` was available as a
  broad product index but did not replace the product-specific support pages.
- Google Workspace Codelabs and Google Cloud Blog were represented in search
  results but not drawn from because current product, admin, and support
  documentation was available.

### Sources

All public sources below were observed at `2026-08-29T15:13:24Z`.

- `https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server`
  — hosted endpoint; HTTP transport label; required services and scopes; exact
  Google Auth platform and OAuth-client labels; manual client ID/secret
  configuration; first-connection test; and mandatory prompt-injection
  screening.
- `https://developers.google.com/workspace/preview` — current Developer Preview
  status for **Calendar MCP server**, program terms, application action, account
  and project verification, Google Groups requirement, project registration,
  eligible-user terms, and confirmation sequence.
- `https://docs.cloud.google.com/mcp/authenticate-mcp` — OAuth client ID/secret
  support and lack of Dynamic Client Registration and OAuth Client ID Metadata
  Documents.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` —
  **MCP Tool User**, `mcp.tools.call`, and the connecting user's separate
  resource-access requirement.
- `https://cloud.google.com/service-usage/docs/enable-disable` — **Service
  Usage Admin**, `serviceusage.services.enable`, project selection, **APIs &
  Services** > **API Library**, search, service selection, and **Enable**.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — **Project IAM
  Admin**, **Grant access**, **New principals**, **Select a role**, and **Save**.
- `https://support.google.com/cloud/answer/15549945?hl=en` — **Internal** and
  **External** audiences, **Testing**, test users, 100-user cap, and seven-day
  authorization expiry outside the profile-only exception.
- `https://support.google.com/cloud/answer/15549135?hl=en` — Auth platform
  **Data Access** and scope administration.
- `https://support.google.com/cloud/answer/15549257?hl=en` — **Google Auth
  Platform** > **Clients**, **Create Client**, application types, and the warning
  that a client secret is shown only after creation and cannot be viewed again.
- `https://support.google.com/a/answer/7281227?hl=en` — **Security** > **Access
  and data control** > **API controls**, **Manage App Access**, **Configured
  apps**, **Configure new app**, **Trusted**,
  **Specific Google data**, **Limited**, Calendar's Restricted behavior, and the
  **Service Settings** privilege.
- `https://calendarmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — protected-resource metadata for the remote endpoint, Google authorization
  server, bearer-header support, and the broader advertised Calendar scope set.
- `https://accounts.google.com/.well-known/oauth-authorization-server` — Google
  authorization and token endpoint metadata and supported client-secret token
  authentication methods.
- `https://support.google.com/llms.txt` — broad Google Help source inventory.
- `doctrine/speakeasy-setup.md` — observed 2026-08-29T15:13:24Z; fixed
  Speakeasy anchors, Custom remote and manual-OAuth labels, transitions, and
  closing-pointer contract.
- Coordinator operator note — observed 2026-08-29T15:13:24Z; credential-free
  Pulse snapshot status `ready` with no Google Calendar catalog entry.
