---
research_version: 1
slug: google-slides
researched_at: 2026-08-29T15:17:05Z
---

# Google Slides — Research Dossier

## Server facts

- Remote URL: `https://slidesmcp.googleapis.com/mcp/v1`.
- Transport: `streamable-http`. Google labels it **HTTP**. A direct MCP
  `initialize` request over HTTPS POST returned HTTP 200 and protocol version
  `2025-03-26` during this run.
- Launch stage: Developer Preview, announced in Google's July 13, 2026
  Workspace developer release notes. No separate preview enrollment is
  documented.
- Enable **Google Slides API** (`slides.googleapis.com`) and
  **Google Slides MCP API** (`slidesmcp.googleapis.com`) in one Google Cloud
  project.
- Authentication Option: OAuth 2.0 using a manually registered
  **Web application** client, **Client ID**, and **Client secret**. Google
  remote MCP servers do not support Dynamic Client Registration or OAuth
  Client ID Metadata Documents.
- Each connecting principal needs **MCP Tool User** (`roles/mcp.toolUser`) on
  the project and access to the intended presentations.
- Google's Slides setup page requires these scopes:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/presentations.readonly`
  - `https://www.googleapis.com/auth/presentations`
- Protected-resource metadata is published at
  `https://slidesmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  and names `https://accounts.google.com/` as the authorization server.
  Speakeasy can discover OAuth endpoints, but registration remains manual.
- The Slides scope inventory classifies `drive.file` as non-sensitive, both
  presentation scopes as sensitive, and `drive.readonly` as restricted.
  Workspace API controls classify `drive.readonly` and both presentation
  scopes as high-risk.
- An **External** app in **Testing** permits up to 100 listed test users, and
  each authorization expires seven days after consent. Select **Internal**
  only when every connecting user belongs to the organization and the project
  is associated with that Google Cloud organization; otherwise select
  **External**.
- Google requires Workspace MCP applications to screen prompts and responses
  for malicious content or prompt injection. Model Armor or another documented
  organizational solution can satisfy this requirement.
- No Google Slides MCP-specific paid plan or license gate is documented.
- The shared endpoint is not tenanted. The credential-free `pulsemcp` tenant
  lookup supplied to this run returned an ambiguous result at
  `2026-08-29T15:17:05Z`: no confident Google Slides match. Catalog presence
  is unknown, so keep both safe add-server paths under
  `speakeasy_add_server: auto`.

## Credential flow

An administrator uses one Google Cloud project for API enablement, IAM grants,
the OAuth consent screen, and the OAuth client. They need permission to enable
services, grant project roles, configure Google Auth platform, and create OAuth
credentials.

Create a **Web application** OAuth client. Enter
`{{ gram.oauth.callback_url }}` directly under **Authorized redirect URIs**.

| Speakeasy field | Google origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** in {#copy-oauth-credentials} |
| Client Secret | **Client secrets** in {#copy-oauth-credentials}; copyable once |
| Scope override | The four scopes configured in {#configure-oauth-consent} |

The callback template is the same **Redirect URI** later displayed with a
copy button in Speakeasy's **Attach Remote Identity Provider** sheet. Each
connecting user then authorizes with the Google Account whose Slides permissions
should apply.

## Console walkthrough

If Workspace API controls restrict high-risk Drive and Slides scopes or block
unconfigured apps, a **Service Settings administrator** and the Google Workspace
security owner's approved access setting are also required. If applicability is
unclear, ask that owner before starting.

### Select the Google Cloud project {#select-google-cloud-project}

- Sign in at `https://console.cloud.google.com`.
- Use the console toolbar's resource selector to select the project that will
  own this configuration.
- Keep that project selected throughout the Google Cloud steps.
- Next, enable the Google Slides APIs.
- Values entered: none. Values copied: none.
- Screenshot note: the console toolbar with the selected project visible.

### Enable the Google Slides APIs {#enable-google-slides-apis}

- Prerequisite: the administrator needs `serviceusage.services.enable`,
  normally through **Service Usage Admin** or **Owner**.
- Open **APIs & Services** > **API Library**.
- In **Search for APIs & Services**, search for `Google Slides API`.
- Open **Google Slides API**, then click **Enable**.
- Return to **API Library** and search for `Google Slides MCP API`.
- Open **Google Slides MCP API**, then click **Enable**.
- Next, open the project's **IAM** page.
- Values entered: the two API names. Values copied: none.
- Screenshot note: **Google Slides MCP API** showing its enabled state.

### Grant MCP Tool User access {#grant-mcp-tool-user}

- Go to `https://console.cloud.google.com/iam-admin/iam` and confirm the same
  project is selected.
- Click **Grant access**.
- In **New principals**, enter a connecting user's Google Account email.
- Click **Select a role**, search for `MCP Tool User`, select
  **MCP Tool User**, and click **Save**.
- Repeat the **Grant access** through **Save** actions for each additional
  connecting user. Google's IAM procedure names **Project IAM Admin** as the
  role required to grant project roles.
- Next, open **Google Auth platform** > **Branding**.
- Values entered: connecting-user emails and **MCP Tool User**. Values copied:
  none.
- Screenshot note: **Grant access** with **New principals** and
  **MCP Tool User** visible.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Warning: Google says the OAuth consent screen cannot be removed after
  configuration. Obtain approved support and contact addresses first.
- Open **Google Auth platform** > **Branding**. If the page says
  **Google Auth Platform not configured yet**, click **Get Started**.
- Before choosing an audience, note that an **External** app in **Testing**
  permits up to 100 listed test users, and each authorization expires seven
  days after consent.
- In the first-time wizard:
  1. Under **App Information**, enter `Slides MCP Server` in **App name**,
     choose an approved **User support email**, and click **Next**.
  2. Under **Audience**, select **Internal** only when every connecting user
     belongs to the organization and the selected project is associated with
     that Google Cloud organization; otherwise select **External**. Click
     **Next**.
  3. Under **Contact Information**, enter an approved monitored
     **Email address**, then click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. With
     organizational approval, select **I agree to the Google API Services: User
     Data Policy**, click **Continue**, and click **Create**.
- If Google Auth platform was already configured, retain its approved
  **Branding**, then open **Google Auth platform** > **Audience** and verify that
  its audience meets the conditions above. If it does not, stop and ask the
  Google Cloud project owner for a fresh project with the appropriate audience;
  do not continue in the current project.
- Open **Data Access**, then click **Add or Remove Scopes**.
- Under **Manually add scopes**, paste all four scope URLs from Server facts.
  Click **Add to Table**, **Update**, and **Save**.
- For an External app in **Testing**, open **Audience**. Under **Test users**,
  click **Add users**, enter every connecting user's email, and click **Save**.
- Next, open **Google Auth platform** > **Clients**.
- Values entered: app and contact information, audience, four scopes, and
  applicable test-user emails. Values copied: none.
- Screenshot note: **Data Access** with all four scopes selected.

### Create the OAuth client {#create-oauth-client}

- Open **Google Auth platform** > **Clients**, then click **Create client**.
- Set **Application type** to **Web application**.
- In **Name**, enter a recognizable name such as
  `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter
  `{{ gram.oauth.callback_url }}` in **URIs**. Do not add an
  **Authorized JavaScript origins** value.
- Warning: prepare an approved secret store before clicking **Create**. The
  next dialog permits the client secret to be copied only once.
- Click **Create**. This opens **OAuth 2.0 client created**.
- Values entered: application type, name, and callback URL.
- Screenshot note: **Create client** with **Web application** and the callback
  template under **Authorized redirect URIs**.

### Copy the OAuth credentials {#copy-oauth-credentials}

- In **OAuth 2.0 client created**, copy **Client ID** to the approved secret
  store.
- Under **Client secrets**, copy **Client secret** to the same store.
- If the one-time dialog closes before both values are stored, do not continue
  with an incomplete pair. Return to {#create-oauth-client} and repeat that
  documented create-client path to create a new OAuth client, then copy both
  values from the new **OAuth 2.0 client created** dialog.
- If Workspace API controls restrict high-risk Drive and Slides scopes or
  block unconfigured apps, continue to {#allow-workspace-oauth-client}.
  Otherwise continue to {#add-server-in-speakeasy}.
- Values copied: Client ID and Client Secret to the matching Speakeasy fields.
- Screenshot exception: do not capture a dialog containing a one-time secret.

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

Use this step only when Workspace API controls restrict high-risk Drive and
Slides scopes or block unconfigured apps. If applicability is unclear, ask the
Google Workspace security owner before continuing. Obtain that owner's approved
access setting before starting this step.

- Sign in at `https://admin.google.com` with **Service Settings administrator**
  access. Open **Security** > **Access and data control** > **API controls**.
- Click **Manage App Access**. Under **Configured apps**, click
  **Configure new app**.
- Enter the Client ID from {#copy-oauth-credentials}, click **Search**, and
  select the matching app.
- Select the organizational units whose users will connect and click
  **Continue**.
- Select the access setting approved by the Google Workspace security owner.
- Click **Continue**, review the settings, and click **Finish**. Authorization
  can remain blocked for up to 24 hours while the change propagates, though it
  usually applies sooner. Wait for propagation and retry before changing
  credentials.
- Continue to {#add-server-in-speakeasy}.
- Screenshot note: the access review with the Client ID redacted.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md`, observed at
`2026-08-29T15:17:05Z`. Fixed anchors are carried verbatim.

The credential-free `pulsemcp` tenant lookup supplied to this run returned
`ambiguous` at `2026-08-29T15:17:05Z`: no confident Google Slides match.
Catalog presence is unknown. Because the remote is shared rather than tenanted
and no override applies, render both safe add-server paths under
`speakeasy_add_server: auto`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If **Google Slides** is in the catalog, choose **3rd-party server**. On the
  **MCP Catalog** page, find Google Slides with **Search MCP servers...**, open
  its entry with **View**, and click **Add**. In **Add to Project**, click
  **Add to Project**.
- If it is not in the catalog, choose **Custom remote server**. On the
  **Add a custom remote MCP server** page, paste
  `https://slidesmcp.googleapis.com/mcp/v1` into
  **Remote MCP server URL** and click **Add server**.

Either branch creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

Per-guide values:

- Remote URL: `https://slidesmcp.googleapis.com/mcp/v1`.
- Transport: `streamable-http`; **Transport** is read-only.
- Authentication Option: `oauth-client`, manually registered OAuth.
- Catalog decision: unknown; `auto` with both safe add-server paths.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually**, or **Use Discovered** when offered. In the
**Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**.
The sheet shows the **Redirect URI** with a copy button — the callback URL
registered in {#create-oauth-client}.
<!-- verify(operator): the template key substitutes this same Redirect URI value -->

Confirm the sheet's **Redirect URI** matches `{{ gram.oauth.callback_url }}`
entered in {#create-oauth-client}. Paste the **Client ID** and
**Client Secret (optional)** from {#copy-oauth-credentials}. Google requires
the generated secret even though the Speakeasy label says optional.

In **Scope (override)**, enter the four required scopes from
{#configure-oauth-consent}, then click **Attach Identity Provider**.

Complete Google's browser authorization with an account granted
**MCP Tool User** in {#grant-mcp-tool-user} and access to the intended
presentations. An External app in **Testing** also requires that account under
**Test users**.

<!-- screenshot: the Attach Remote Identity Provider sheet (Manual with Redirect URI, or DCR after Discover with Client Type Dynamic Client Registration), or the Upstream Headers editor; values redacted -->

Further-reading URL:
`https://developers.google.com/workspace/slides/api/guides/configure-mcp-server`.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Google's Slides MCP documentation at
https://developers.google.com/workspace/slides/api/guides/configure-mcp-server.

## Research limitations

- Source `pulsemcp`: the credential-free tenant lookup supplied to this run
  returned `ambiguous` at `2026-08-29T15:17:05Z`; it produced no confident
  Google Slides match. Catalog presence is therefore unknown, not absent.
  Under the catalog decision rules, this is a recorded research limitation,
  not public provenance or an operator question. The resilient `auto` setup
  keeps both add-server paths.
- Public documentation reviewed for this dossier does not establish a complete
  **Specific Google data** selection for this OAuth client. The walkthrough
  delegates the organization-specific access setting to the Google Workspace
  security owner instead of guessing additional Google sign-in scopes.
- The product-specific setup page requires four scopes, while the live
  protected-resource metadata advertises those four plus the broader
  `https://www.googleapis.com/auth/drive` scope. The walkthrough follows the
  explicit setup page for the manual override. Public documentation does not
  explain the additional discovered scope, but the operator need not choose
  between scope sets.

Presentation-only console uncertainty is handled with resilient navigation
wording in the walkthrough rather than an operator question.

## Operator decisions

None.

## Provenance

Documentation-property sweep:

- `developers.google.com` — primary Workspace developer property; Slides MCP
  setup, shared MCP setup, OAuth, scopes, security, and release notes were
  used. `/llms.txt` returned 404.
- `docs.cloud.google.com` and `cloud.google.com` — MCP authentication, Service
  Usage, and IAM documentation were used.
- `support.google.com/cloud` — Auth platform Audience and Data Access behavior
  was used.
- `support.google.com/a` — Workspace API controls and high-risk scope policy
  were used.
- `doctrine/speakeasy-setup.md` supplies Speakeasy labels and fixed anchors.

All public sources and endpoint observations were observed at
`2026-08-29T15:17:05Z`:

- `https://developers.google.com/workspace/slides/api/guides/configure-mcp-server`
  — endpoint, transport, APIs, OAuth, consent, scopes, client creation,
  security warning, and further-reading URL.
- `https://developers.google.com/workspace/guides/configure-mcp-servers` —
  corroborating Workspace endpoint, enablement, scopes, and OAuth flow.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  consent wizard, audience, scopes, test users, and irreversibility.
- `https://developers.google.com/workspace/slides/api/scopes` — scope
  descriptions and classifications.
- `https://developers.google.com/workspace/guides/configure-mcp-security` —
  prompt and response screening requirement.
- `https://developers.google.com/workspace/release-notes` — July 13, 2026
  Developer Preview announcement.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` —
  MCP Tool User, manual registration, one-time secret, and no DCR.
- `https://cloud.google.com/service-usage/docs/enable-disable` — API Library
  labels and required permission.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — IAM grant
  labels and required Project IAM Admin role.
- `https://support.google.com/cloud/answer/15549945` — audience, Testing cap,
  and seven-day expiry.
- `https://support.google.com/cloud/answer/15549135` — Data Access controls.
- `https://support.google.com/a/answer/7281227?hl=en` — Workspace app controls,
  high-risk scopes, and allowlisting labels.
- `https://slidesmcp.googleapis.com/mcp/v1` — MCP `initialize` returned HTTP
  200 with protocol version `2025-03-26`.
- `https://slidesmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — authorization server, resource URL, and advertised scopes.
- `https://accounts.google.com/.well-known/oauth-authorization-server` —
  authorization/token endpoints and no registration endpoint.
- `doctrine/speakeasy-setup.md` — dual add-server and Manual OAuth flow.
- `doctrine/personas/it-admin.md` — browser-only achievability requirements.
