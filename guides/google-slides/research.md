---
research_version: 1
slug: google-slides
researched_at: 2026-07-29T21:55:52Z
---

# Google Slides — Research Dossier

## Server facts

- Remote URL: `https://slidesmcp.googleapis.com/mcp/v1`.
- Transport: `streamable-http`. Google labels it **HTTP**. A direct MCP
  `initialize` request over HTTPS POST (with
  `Accept: application/json, text/event-stream`) returned HTTP 200
  unauthenticated and protocol version `2025-06-18` on
  `2026-09-30T21:25:42Z`.
- Launch stage: Developer Preview, announced in Google's July 13, 2026
  Workspace developer release notes. Re-verified `2026-09-30`: the Slides
  setup page's banner reads "Developer Preview: Available as part of the
  Google Workspace Developer Preview Program" and its first prerequisite is
  "Membership in the Google Workspace Developer Preview Program". The
  earlier note that no enrollment was documented is superseded; see
  {#join-developer-preview}.
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
  each authorization expires seven days after consent. **Internal** is
  available only to projects associated with a Google Cloud organization and
  limits authorization to organization members.
- Google requires Workspace MCP applications to screen prompts and responses
  for malicious content or prompt injection. Model Armor or another documented
  organizational solution can satisfy this requirement.
- No Google Slides MCP-specific paid plan or license gate is documented.
- The Speakeasy MCP Catalog lookup was **absent** for `google-slides` and
  `google slides` (re-checked `2026-09-30` with `Google Slides` and
  `slides`; no Google Slides entry). `meta.yaml` sets
  `speakeasy_add_server: custom-remote`. Render only the **Hosted remotely**
  path; the shared URL is not tenanted.

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
| Scope | The four scopes configured in {#configure-oauth-consent}, space-separated on one line under **Advanced > Scope** |

The Speakeasy **Identity** section does not display the redirect URI, so
{#create-oauth-client} carries the callback check by entering
`{{ gram.oauth.callback_url }}` directly. Each connecting user then authorizes
with the Google Account whose Slides permissions should apply.

## Console walkthrough

### Join the Google Workspace Developer Preview Program {#join-developer-preview}

Source: `https://developers.google.com/workspace/preview` and the Slides setup
page's Prerequisites, observed `2026-09-30T21:25:42Z`. Same flow as the
Google Calendar guide's {#join-developer-preview}.

- Skip when Google has already registered the project in the program.
- Open Google's **Google Workspace Developer Preview Program** page and review
  the **Developer Preview Program Terms** with the organization's application
  or security owner.
- Click **Apply to join the Developer Preview Program**. In the current
  application form, provide the requested Google Workspace account and Google
  Cloud project information, agree to the terms only with organizational
  approval, and submit the form. Google does not publish the form's exact
  field labels on the program page.
- The submitted email must accept being added to Google Groups; Google adds
  the verified account to the program's Google Group, then registers the Cloud
  project.
- Wait for the final confirmation at the registered email address. Google
  says the process should be done within a couple of days.
- Then sign in at `https://console.cloud.google.com` and use the console
  toolbar's resource selector to select the registered project; keep it
  selected throughout the Google Cloud steps.
- Values entered: organization-specific Workspace account and Cloud project
  information. Values copied: none.
- Screenshot note: the program page with **Apply to join the Developer
  Preview Program**.

### Enable the Google Slides APIs {#enable-google-slides-apis}

- Open **APIs & Services** > **API Library**.
- In **Search for APIs & Services**, search for `Google Slides API`, open it,
  and click **Enable**.
- Return to **API Library**, search for `Google Slides MCP API`, open it, and
  click **Enable**.
- The administrator needs `serviceusage.services.enable`, normally through
  **Service Usage Admin** or **Owner**.
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
- Repeat for each connecting user. Google's IAM procedure names
  **Project IAM Admin** as the role required to grant project roles.
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
- In the first-time wizard:
  1. Under **App Information**, enter `Slides MCP Server` in **App name**,
     choose an approved **User support email**, and click **Next**.
  2. Under **Audience**, select **Internal** when all connecting users belong
     to the project's Workspace organization; otherwise select **External**.
     Click **Next**.
  3. Under **Contact Information**, enter an approved monitored
     **Email address**, then click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. With
     organizational approval, select **I agree to the Google API Services: User
     Data Policy**, click **Continue**, and click **Create**.
- If Google Auth platform was already configured, retain its approved
  **Branding** and **Audience** and continue to **Data Access**.
- Open **Data Access**, then click **Add or Remove Scopes**.
- Under **Manually add scopes**, paste all four scope URLs from Server facts.
  Click **Add to Table**, **Update**, and **Save**.
- For an External app in **Testing**, open **Audience**. Under **Test users**,
  click **Add users**, enter every connecting user's email, and click **Save**.
- Next, open **Google Auth platform** > **Clients**.
- Values entered: app and contact information, audience, four scopes, and
  applicable test-user emails. Values copied: none.
- Screenshot note: **Data Access** with all four scopes selected.
- Recovery: after a Testing authorization expires, the account remains a test
  user but must complete browser authorization again.

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
- If Workspace API controls restrict high-risk Drive and Slides scopes or
  block unconfigured apps, continue to {#allow-workspace-oauth-client}.
  Otherwise continue to {#add-server-in-speakeasy}.
- Values copied: Client ID and Client Secret to the matching Speakeasy fields.
- Screenshot exception: do not capture a dialog containing a one-time secret.
- Recovery: if the secret is missed, delete it and create a new one before
  continuing.

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

Use this step only when Workspace API controls restrict high-risk Drive and
Slides scopes or block unconfigured apps.

- Sign in at `https://admin.google.com` with **Service Settings administrator**
  access. Open **Security** > **Access and data control** > **API controls**.
- Click **Manage App Access**. Under **Configured apps**, click
  **Configure new app**.
- Enter the Client ID from {#copy-oauth-credentials}, click **Search**, and
  select the matching app.
- Select the organizational units whose users will connect and click
  **Continue**.
- Choose the approved access: **Trusted**, or **Specific Google data** with the
  four Slides MCP scopes and any required Google sign-in scopes.
- Click **Continue**, review the settings, and click **Finish**. Changes can
  take up to 24 hours, though they usually apply sooner.
- Continue to {#add-server-in-speakeasy}.
- Screenshot note: the access review with the Client ID redacted.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md` (product source
`speakeasy-api/gram`, `client/dashboard`, `main` @ `68b3f78`), observed
`2026-09-30T21:25:42Z`. Fixed anchors are carried verbatim.

Per-guide values:

- Remote URL: `https://slidesmcp.googleapis.com/mcp/v1` (not tenanted).
- Add-server path: `speakeasy_add_server: custom-remote`; catalog lookup
  absent. Render only **Hosted remotely**.
- Authentication Option: `oauth-client` → **User Identity**.
- Probe outcome: `initialize` POST returned **200 unauthenticated**, so the
  create form preselects **No Identity**; the reader must select
  **User Identity**.
- PRM: `https://slidesmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  names issuer `https://accounts.google.com/` and advertises
  `drive.readonly`, `presentations.readonly`, `drive`, `drive.file`,
  `presentations`.
- Issuer metadata (`https://accounts.google.com/.well-known/oauth-authorization-server`):
  issuer `https://accounts.google.com`, authorization endpoint
  `https://accounts.google.com/o/oauth2/v2/auth`, token endpoint
  `https://oauth2.googleapis.com/token`, no `registration_endpoint`, no
  `client_id_metadata_document_supported`. Discovery works, so the provider
  picker can preselect or create the Google provider; no custom provider
  route is needed.
- Registration choice: **Manual** (neither CIMD nor DCR advertised; the
  dashboard default is also Manual unless the provider already has a
  client). Creation with **User Identity** leaves the server **Disabled**
  with a note to finish in **Settings > Identity**; this is expected, and
  **Server Availability** must be turned on afterwards.
- Credential fields: **Client ID** and **Client secret** from
  {#copy-oauth-credentials}; Google requires the secret despite the
  "Optional" placeholder.
- Scope under **Advanced > Scope**, space-separated on one line:
  `https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/presentations.readonly https://www.googleapis.com/auth/presentations`.
  Blank is not safe: the PRM also advertises full
  `https://www.googleapis.com/auth/drive`, which the consent screen does not
  configure.
- Redirect URI: not displayed on the Identity section; {#create-oauth-client}
  registers `{{ gram.oauth.callback_url }}`.
- First connection: an account with **MCP Tool User** ({#grant-mcp-tool-user})
  and access to the presentations; an External app in **Testing** also needs
  the account under **Test users**.
- Screenshot notes: **New remote MCP server** after **Verify connectivity**
  with **User Identity** selected; **Settings > Identity** with the Google
  provider and **Manual**, credentials redacted.
- Further-reading URL:
  `https://developers.google.com/workspace/slides/api/guides/configure-mcp-server`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

Hosted remotely path with **User Identity** selected at creation, per the
values above.

### Connect your credentials {#connect-speakeasy-credentials}

**Settings > Identity** > **User Identity** > Google provider > **Manual**
with the values above, **Save**, then **Settings > Danger Zone > Server
Availability** > **Enable MCP server**.

## Open questions

- The product-specific setup page requires four scopes, while live
  protected-resource metadata advertises those four plus the broader
  `https://www.googleapis.com/auth/drive` scope. This Dossier follows the
  explicit setup page for the manual override. Public documentation does not
  explain the additional discovered scope.

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
- Google Codelabs was swept but not used because its application-development
  flow is not the browser-only first-connection path.
- `doctrine/speakeasy-setup.md` supplies Speakeasy labels and fixed anchors.

All sources were observed at `2026-07-29T21:55:52Z`:

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

- `doctrine/personas/it-admin.md` — browser-only achievability requirements.

Re-observed at `2026-09-30T21:25:42Z`:

- `https://developers.google.com/workspace/slides/api/guides/configure-mcp-server`
  — Developer Preview Program membership prerequisite; endpoint, scopes, and
  Web application client unchanged.
- `https://developers.google.com/workspace/preview` — program terms,
  application button, Google Groups requirement, and couple-of-days timing.
- `https://slidesmcp.googleapis.com/mcp/v1` — MCP `initialize` returned HTTP
  200 unauthenticated with protocol version `2025-06-18`.
- `https://slidesmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — authorization server `https://accounts.google.com/`, resource URL, and
  five advertised scopes including full `drive`.
- `https://accounts.google.com/.well-known/oauth-authorization-server` —
  authorization/token endpoints; no registration endpoint and no CIMD.
- Speakeasy MCP Catalog search (`Google Slides`, `slides`) — no Google Slides
  entry.
- `doctrine/speakeasy-setup.md` (gram `68b3f78`) — Hosted remotely, Identity
  section, Manual registration, and Server Availability.
