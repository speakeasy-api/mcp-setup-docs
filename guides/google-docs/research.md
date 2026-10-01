---
research_version: 1
slug: google-docs
researched_at: 2026-08-29T15:13:21Z
---

# Google Docs — Research Dossier

## Server facts

- **Remote URL:** `https://docsmcp.googleapis.com/mcp/v1`. Google publishes
  one shared public endpoint; it is not region-, instance-, or
  organization-specific, so the remote is not tenanted.
- **Transport:** Google labels the remote transport **HTTP**. Metadata uses the
  schema's `streamable-http` value for this remote HTTP MCP endpoint.
- **Enablement:** Enable **Google Docs API** (`docs.googleapis.com`) and
  **Google Docs MCP API** (`docsmcp.googleapis.com`) in the Google Cloud
  project that owns the OAuth client. Enabling services requires the
  `serviceusage.services.enable` permission; **Service Usage Admin**
  (`roles/serviceusage.serviceUsageAdmin`) provides it.
- **Authentication Option:** OAuth 2.0 with a manually registered client. The
  Speakeasy AI Control Plane is internet-hosted, so create a **Web
  application** client. Google states that its remote MCP servers do not
  support Dynamic Client Registration or OAuth Client ID Metadata Documents.
- **Access:** Google documents **MCP Tool User** (`roles/mcp.toolUser`) as the
  role that provides `mcp.tools.call`. The connecting user also needs access to
  the Docs resources they will use; the server inherits that user's permissions
  and data-governance controls.
- **OAuth discovery:** Protected-resource metadata is published at
  `https://docsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`.
  It names `https://accounts.google.com/` as the authorization server, so the
  Control Plane can offer discovered endpoints. Client registration remains
  manual.
- **Scopes required by the Docs MCP setup page:**
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/documents.readonly`
  - `https://www.googleapis.com/auth/documents`
- The Docs API scope inventory classifies `drive.file` as non-sensitive, both
  `documents` scopes as sensitive, and `drive.readonly` as restricted.
- **Audience and testing:** Select **Internal** when available for the Google
  Workspace organization; otherwise select **External**. For an External app
  in **Testing**, add every account that will connect under **Test users**.
  Testing permits up to 100 listed test users, and their authorizations for
  these scopes expire seven days after consent. Unverified apps that present
  the warning screen also have a lifetime cap of 100 new users.
- **Workspace policy gate:** Workspace API controls can restrict high-risk
  scopes or block unconfigured apps. When those controls apply, a **Service
  Settings administrator** must configure access for the OAuth client.
- No Google Docs MCP-specific paid plan or license requirement is stated in the
  public provider documentation.
- Google requires deployments to screen prompts and responses for indirect
  prompt injection with Model Armor or an organization-documented alternative.
  This is a deployment safeguard rather than a first-connection console step.

## Credential flow

Create one OAuth 2.0 client with **Application type** set to **Web
application**. Enter the callback template directly under **Authorized
redirect URIs**:

```
{{ gram.oauth.callback_url }}
```

| Speakeasy field | Provider origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** in {#copy-client-credentials} |
| Client Secret | **Client secrets** in {#copy-client-credentials}; copy when shown and store securely |

The Control Plane's **Identity** section does not display the redirect URI,
so this registration is the only callback check. Each connecting user completes
Google's browser authorization using the account whose Docs permissions should
apply.

## Console walkthrough

Sign in to the Google Cloud console, select the project that will own the OAuth
client, enable both APIs, configure **Google Auth platform**, create the client,
copy its credentials, and conditionally allow it in the Google Admin console.

### Join the Google Workspace Developer Preview Program {#join-developer-preview}

- Re-verified at `2026-09-30T21:25:45Z`: Google's Docs MCP setup page lists "Membership in
  the Google Workspace Developer Preview Program" as the first prerequisite,
  and the program page lists the **Docs MCP server** among its preview
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
- Screenshot note: the program page with **Docs MCP server** listed under
  **Latest features**; do not capture application-form data.

### Enable the Docs MCP APIs {#enable-docs-mcp-apis}

- Open [console.cloud.google.com](https://console.cloud.google.com). On the
  toolbar, open the resource selector and select the intended project.
- Open **APIs & Services** > **Library**. Open **Google Docs API**, then click
  **Enable**.
- Return to **Library**. Open **Google Docs MCP API**, then click **Enable**.
- If **Enable** is unavailable, obtain `serviceusage.services.enable` from the
  project administrator before continuing.
- Continue to **IAM** to grant **MCP Tool User**.
- Values entered: none. Values copied: none.
- Screenshot note: **Google Docs MCP API** showing its enabled state.

### Grant the MCP Tool User role {#grant-mcp-tool-user}

- Added `2026-09-30T21:25:45Z` per the setup-docs audit: the prerequisites
  already required **MCP Tool User** but no step granted it. Google Cloud's MCP
  authentication page says: "ask your administrator to grant you the MCP Tool
  User (roles/mcp.toolUser) IAM role", which contains `mcp.tools.call`.
- Open `https://console.cloud.google.com/iam-admin/iam` and select the same
  project. Click **Grant access**.
- In **New principals**, enter a connecting user's Google Account email.
- Click **Select a role**, search for `MCP Tool User`, select **MCP Tool
  User**, and click **Save**. Repeat for each connecting user.
- Result and transition: continue to **Google Auth platform** > **Branding**.
- Values entered: user emails and **MCP Tool User**. Values copied: none.
- Screenshot note: **Grant access** with the principal and **MCP Tool User**.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Before starting, obtain approved support and contact email addresses. Google
  says the OAuth consent screen cannot be removed after configuration.
- Open **Google Auth platform** > **Branding**. If **Google Auth Platform not
  configured yet** appears, click **Get Started**.
- Under **App Information**, enter `Docs MCP Server` in **App name**, select an
  approved **User support email**, and click **Next**.
- Under **Audience**, select **Internal**. If **Internal** is unavailable,
  select **External**. Click **Next**.
- Under **Contact Information**, enter an approved monitored **Email address**,
  then click **Next**.
- Under **Finish**, review the Google API Services User Data Policy. With the
  organization's approval, select **I agree to the Google API Services: User
  Data Policy**, click **Continue**, and click **Create**.
- If Google Auth platform was already configured, review **Branding**,
  **Audience**, and **Data Access** instead of repeating the wizard.
- Open **Data Access** > **Add or Remove Scopes**. Under **Manually add
  scopes**, enter the four scope URLs listed under Server facts, click **Add to
  Table**, click **Update**, and then click **Save**.
- If the app is External and in **Testing**, open **Audience**. Under **Test
  users**, click **Add users**, enter every account that will connect, and click
  **Save**.
- Continue to **Google Auth platform** > **Clients**.
- Values entered: app name, support email, audience, contact email, four scopes,
  and conditional test-user addresses. Values copied: none.
- Screenshot note: **Data Access** showing the four configured scopes.

### Create the OAuth client {#create-oauth-client}

- Open **Google Auth platform** > **Clients**, then click **Create client**.
- Set **Application type** to **Web application**. In **Name**, enter a
  recognizable name such as `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI**. In **URIs**, enter:

  ```
  {{ gram.oauth.callback_url }}
  ```

- Before clicking **Create**, prepare secure storage. Google's MCP
  authentication documentation says the client secret can be copied only once.
- Click **Create** and keep **OAuth 2.0 client created** open.
- Values entered: client name and callback template. Values copied: none.
- Screenshot note: **Create client** with **Web application** and the callback
  template under **Authorized redirect URIs**.

### Copy the client credentials {#copy-client-credentials}

- Copy **Client ID** from **OAuth 2.0 client created** to secure storage.
- Under **Client secrets**, copy **Client secret** when it is shown and store it
  securely beside the Client ID.
- If the one-time secret is lost during setup, delete that secret and create a
  new one before continuing.
- If Workspace API controls restrict the requested data or unconfigured apps,
  continue to {#allow-workspace-oauth-client}. Otherwise continue to
  {#add-server-in-speakeasy}.
- Values copied: Client ID and Client Secret for
  {#connect-speakeasy-credentials}.
- Screenshot exception: do not capture a dialog that contains a secret.

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

Use this step only when Workspace API controls restrict high-risk Drive and
Docs scopes or block unconfigured apps.

- Sign in to [admin.google.com](https://admin.google.com) with **Service
  Settings administrator** access. Open **Security** > **Access and data
  control** > **API controls**.
- Click **Manage App Access**. Under **Configured apps**, click **Configure new
  app**.
- Enter the Client ID from {#copy-client-credentials}, click **Search**, and
  select the matching app.
- Select the organizational units whose users will connect, then click
  **Continue**.
- Choose the access approved by the security owner: **Trusted**, or **Specific
  Google data** with the Docs MCP scopes and any Google sign-in scopes the app
  requests.
- Click **Continue**, review the settings, and click **Finish**. Google says
  changes can take up to 24 hours, though they usually apply sooner.
- Continue to {#add-server-in-speakeasy}.
- Values entered: Client ID, organizational units, and approved access level.
  Values copied: none.
- Screenshot note: the access review with the Client ID redacted.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
re-rendered at `2026-09-30T21:25:45Z`. The fixed anchors are carried verbatim. This replaces
the retired **Authentication** / **Attach Remote Identity Provider** flow.

Per-guide values:

- Remote URL: `https://docsmcp.googleapis.com/mcp/v1` (shared public endpoint, not tenanted).
- Add-server path: Custom remote only (**Hosted remotely**). `speakeasy_add_server: custom-remote` is preserved (Pulse
  snapshot had no confident exact catalog match).
- Authentication Option: `oauth-client` (OAuth) → **User Identity**. Client
  ID and Client secret come from {#copy-client-credentials}.
- Probe outcome (`2026-09-30T21:25:45Z`): an unauthenticated JSON-RPC `initialize` POST with
  `Accept: application/json, text/event-stream` returned HTTP 200 with a
  result (protocol `2025-06-18`), not a 401. The create form therefore
  preselects **No Identity**; the reader must select **User Identity**.
- PRM: `https://docsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
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
- PRM `scopes_supported`: `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/documents.readonly`, `https://www.googleapis.com/auth/drive`, `https://www.googleapis.com/auth/documents`. This is
  broader than the consent-screen configuration (full `drive`), so **Scope**
  must not be left blank.
- Scope string for **Advanced > Scope** (space-separated, one line):
  `https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/documents`
- Further-reading URL: the provider's MCP setup page listed in Provenance.

### Add the server in Speakeasy {#add-server-in-speakeasy}

Under **MCP Gateway**, select **MCP**, click **Add new**, and choose **Hosted
remotely**. On **New remote MCP server**, paste `https://docsmcp.googleapis.com/mcp/v1` into **MCP server
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

## Research limitations

- The product-specific setup page requires `drive.file`, while live
  protected-resource metadata advertises broad `drive` and omits `drive.file`.
  The guide follows the explicit Docs MCP setup page because it is the
  task-specific provider instruction. This is safely hedgeable and not an
  operator decision.
- Google's MCP authentication page requires copying a client secret for a web
  client, while the generic Workspace credentials page says web applications do
  not use client secrets. The guide follows the MCP-specific sources.
- Google calls the transport HTTP but does not name the MCP transport revision
  on the product page. The metadata value uses the schema-supported
  `streamable-http` normalization for the remote HTTP MCP endpoint.
- Exa could read the public OAuth metadata but could not perform a fresh POST
  handshake against the MCP endpoint. The provider's current product page is
  therefore the source for the endpoint and transport facts.
- The provider documentation does not state a Google Docs MCP-specific paid
  plan or license gate. `https://developers.google.com/llms.txt` was not
  available during the documentation sweep.

## Operator decisions

None.

## Provenance

Source inventory from the sweep: Google Workspace developer documentation
(`developers.google.com`, drawn from); Google Cloud documentation
(`docs.cloud.google.com`, drawn from); Google Workspace Admin Help
(`support.google.com/a`, drawn from); Google Auth Platform Help
(`support.google.com/cloud`, drawn from); Google Codelabs
(`codelabs.developers.google.com`, swept but not drawn from). The
`developers.google.com` machine-readable index was unavailable.

All sources below were observed at `2026-08-29T15:13:21Z`:

- `https://developers.google.com/workspace/docs/api/guides/configure-mcp-server`
  — endpoint, HTTP transport, API enablement, OAuth flow, four scopes, audience,
  client registration, and security warning.
- `https://developers.google.com/workspace/guides/configure-mcp-servers` —
  corroborating Workspace MCP endpoint, services, scopes, and OAuth labels.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  consent configuration, audience, data access, and test users.
- `https://developers.google.com/workspace/guides/create-credentials` — generic
  Workspace OAuth client labels and the documented client-secret conflict.
- `https://developers.google.com/workspace/guides/enable-apis` — API Library
  navigation and enablement labels.
- `https://developers.google.com/workspace/docs/api/auth` — scope meanings and
  sensitivity classifications.
- `https://developers.google.com/workspace/guides/configure-mcp-security` —
  indirect prompt-injection safeguards.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` — DCR
  limitation, required MCP role, web-client flow, callback requirement, and
  one-time client secret.
- `https://docs.cloud.google.com/service-usage/docs/enable-disable` — Service
  Usage Admin role and service enablement.
- `https://support.google.com/a/answer/7281227?hl=en` — Service Settings
  administrator privilege, API controls, and app access levels.
- `https://support.google.com/cloud/answer/15549945` — External testing,
  seven-day authorization expiry, and user cap.
- `https://docsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — resource URL, authorization server, bearer method, and advertised scopes.
- `https://accounts.google.com/.well-known/oauth-authorization-server` —
  authorization and token endpoints; no dynamic registration endpoint.
- `doctrine/speakeasy-setup.md` — Control Plane labels and fixed anchors.
- Credential-free Pulse snapshot — no confident exact Google Docs MCP catalog
  match; safe Custom remote override retained.

Re-observed at `2026-09-30T21:25:45Z` (identity-section refresh): the product MCP setup page,
`https://developers.google.com/workspace/guides/configure-mcp-servers`,
`https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers`, the MCP
endpoint `initialize` probe, the path-suffixed PRM, Google's
authorization-server metadata, and `doctrine/speakeasy-setup.md` (gram
`68b3f78`). Newly drawn from:

- `https://developers.google.com/workspace/preview` — Developer Preview
  Program terms, apply action, form contents, timeline, and listed MCP servers.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — IAM
  **Grant access**, **New principals**, role selection, and **Save**.
