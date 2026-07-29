---
research_version: 1
slug: google-docs
researched_at: 2026-07-29T20:37:14Z
---

# Google Docs — Research Dossier

## Server facts

- **Remote URL**: `https://docsmcp.googleapis.com/mcp/v1`.
- **Transport**: `streamable-http`. Google calls it HTTP; a direct HTTPS
  JSON-RPC `tools/list` request returned HTTP 200 JSON during this run.
- **Enablement**: enable **Google Docs API** (`docs.googleapis.com`) and
  **Google Docs MCP API** (`docsmcp.googleapis.com`) in one Google Cloud
  project.
- **Authentication Option**: OAuth 2.0 with a manually registered web client.
  Google documents a Client ID and Client Secret and states that its remote MCP
  servers do not support Dynamic Client Registration.
- **OAuth discovery**: the server publishes protected-resource metadata at
  `https://docsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`.
  It names `https://accounts.google.com/` as the authorization server. The
  Speakeasy AI Control Plane can use discovered endpoints, but registration
  remains manual.
- **Documented scopes**:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/documents.readonly`
  - `https://www.googleapis.com/auth/documents`
- The product-specific setup page instructs administrators to add all four
  scopes. The Docs scope inventory classifies `drive.file` as non-sensitive,
  the two `documents` scopes as sensitive, and `drive.readonly` as restricted.
- Live protected-resource metadata instead advertises `drive.readonly`,
  `drive`, `documents.readonly`, and `documents`. The walkthrough follows the
  product-specific setup page and records this conflict under Open questions.
- **Requirements and gates**:
  - A Google Cloud project and an administrator who can enable APIs, configure
    the Google Auth platform, and create OAuth credentials.
  - Enabling APIs requires `serviceusage.services.enable`, normally through
    **Service Usage Admin** or **Owner**.
  - Choose **Internal** when all connecting users belong to the project's
    Google Workspace organization; otherwise choose **External**.
  - An External app in **Testing** permits up to 100 listed test users. Their
    authorizations expire after seven days.
  - Workspace API controls can block the high-risk Docs and Drive scopes. If
    the organization restricts them or blocks unconfigured apps, a **Service
    Settings administrator** must allow the OAuth client.
- Google warns that documents can contain indirect prompt injection and says
  prompts and responses must be screened with Model Armor or an
  organization-documented alternative. This is a deployment requirement, not a
  technical first-connection transition.
- No Google Docs MCP-specific paid plan or license gate is documented.

## Credential flow

Create one OAuth 2.0 client with **Application type** set to **Web
application**. Enter `{{ gram.oauth.callback_url }}` directly in **Authorized
redirect URIs**.

| Speakeasy field | Provider origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** in {#copy-client-credentials} |
| Client Secret | **Client secrets** in {#copy-client-credentials}; copy immediately and store as a password |
| Scope override | The four scopes configured in {#configure-oauth-consent}, comma-separated |

The callback template is the same **Redirect URI** later displayed in the
Speakeasy AI Control Plane's **Attach Remote Identity Provider** sheet. Each
connecting user then authorizes with the Google Account whose Docs permissions
should apply; the server inherits that user's permissions and governance
controls.

## Console walkthrough

Sign in at `https://console.cloud.google.com`, select the intended project,
enable both services, configure **Google Auth platform**, create and copy the
web client, conditionally allow it in Google Workspace Admin, then continue to
the Speakeasy AI Control Plane.

### Enable the Docs MCP APIs {#enable-docs-mcp-apis}

- On the Google Cloud console toolbar, open the resource selector and select
  the project that will own the OAuth client.
- Open **APIs & Services** > **API Library**. In **Search for APIs & Services**,
  search for `Google Docs API`, open it, and click **Enable**.
- Return to **API Library**, search for `Google Docs MCP API`, open it, and
  click **Enable**.
- If **Enable** is unavailable, ask the project owner for
  `serviceusage.services.enable`.
- Next, open **Google Auth platform** > **Branding**.
- Values entered: the two API names. Values copied: none.
- Screenshot note: **Google Docs MCP API** showing its enabled state.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Warning: Google says an OAuth consent screen cannot be removed after
  configuration. Obtain approved support and contact addresses first.
- Open **Google Auth platform** > **Branding**. If the page says **Google Auth
  Platform not configured yet**, click **Get Started**.
- In the first-time wizard:
  1. Under **App Information**, enter `Docs MCP Server` in **App name**, choose
     an approved **User support email**, and click **Next**.
  2. Under **Audience**, select **Internal** when all users belong to the
     project's Workspace organization; otherwise select **External**. Click
     **Next**.
  3. Under **Contact Information**, enter an approved monitored **Email
     address**, then click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. With
     organizational approval, select **I agree to the Google API Services: User
     Data Policy**, click **Continue**, and click **Create**.
- If the platform was already configured, review **Branding**, **Audience**,
  and **Data Access** instead of repeating the wizard.
- Open **Data Access**, click **Add or Remove Scopes**, and paste all four scope
  URLs under **Manually add scopes**. Click **Add to Table**, **Update**, then
  **Save**.
- For an External app in **Testing**, open **Audience**. Under **Test users**,
  click **Add users**, enter each connecting account, and click **Save**.
- Next, open **Google Auth platform** > **Clients**.
- Values entered: app name, support email, audience, contact email, four
  scopes, and conditional test-user addresses.
- Screenshot note: **Data Access** showing the four configured scopes.

### Create the OAuth client {#create-oauth-client}

- Open **Google Auth platform** > **Clients**, then click **Create client**.
- Set **Application type** to **Web application** and enter a recognizable
  **Name**, such as `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter
  `{{ gram.oauth.callback_url }}` in **URIs**. Do not add an **Authorized
  JavaScript origins** value.
- Warning: prepare secure password storage before clicking **Create**. Google
  says the next dialog's client secret can be copied only once.
- Click **Create** and keep **OAuth 2.0 client created** open.
- Screenshot note: **Create client** with **Web application** and the callback
  template in **Authorized redirect URIs**.

### Copy the client credentials {#copy-client-credentials}

- Copy the **Client ID** from **OAuth 2.0 client created**.
- Under **Client secrets**, copy the **Client secret** and store it as a
  password alongside the Client ID.
- If Workspace API controls restrict Docs/Drive scopes or unconfigured apps,
  continue to {#allow-workspace-oauth-client}. Otherwise continue to
  {#add-server-in-speakeasy}.
- Values copied: Client ID and Client Secret to the matching Speakeasy fields.
- Screenshot exception: do not capture a dialog containing a secret.
- Recovery: if the one-time secret is lost, delete it and create a new secret
  before continuing.

### Allow the OAuth client in restricted organizations {#allow-workspace-oauth-client}

Use this step only when Workspace API controls restrict high-risk Drive & Docs
scopes or block unconfigured apps.

- Sign in at `https://admin.google.com` with **Service Settings administrator**
  access. Open **Security** > **Access and data control** > **API controls**.
- Click **Manage App Access**. Under **Configured apps**, click **Configure new
  app**.
- Enter the Client ID from {#copy-client-credentials}, click **Search**, and
  select the matching app.
- Select the organizational units whose users will connect and click
  **Continue**.
- Choose the access approved by the security owner: **Trusted**, or **Specific
  Google data** with the four Docs MCP scopes and any required Google sign-in
  scopes.
- Click **Continue**, review the settings, and click **Finish**. Google says
  changes can take up to 24 hours, though they usually apply sooner.
- Continue to {#add-server-in-speakeasy}.
- Screenshot note: the access review with the Client ID redacted.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md`, observed at
`2026-07-29T20:37:14Z`. Its fixed anchors are carried verbatim.

The Speakeasy MCP Catalog lookup was **absent** for `google-docs` and
`google docs`. Render only the Custom remote server path.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On **Add a custom remote MCP server**, paste
`https://docsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL** and click
**Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

Per-guide values:

- Remote URL: `https://docsmcp.googleapis.com/mcp/v1`
- Transport: `streamable-http`; **Transport** is read-only.
- Authentication Option: `oauth-client`, manual OAuth.

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, click
**Configure Manually**, or **Use Discovered** when offered. In **Attach Remote
Identity Provider**, set **Client Type** to **Manual**.

Confirm **Redirect URI** matches the callback registered in
{#create-oauth-client}. Paste the **Client ID** and **Client Secret (optional)**
from {#copy-client-credentials}; Google requires its generated secret.

In **Scope (override)**, enter:
`https://www.googleapis.com/auth/drive.readonly, https://www.googleapis.com/auth/drive.file, https://www.googleapis.com/auth/documents.readonly, https://www.googleapis.com/auth/documents`.
Click **Attach Identity Provider**.

Complete Google's browser authorization with the intended account. An External
app in **Testing** requires that account under **Test users**.

Screenshot note: the manual identity-provider sheet with credentials redacted.

Further-reading URL:
`https://developers.google.com/workspace/docs/api/guides/configure-mcp-server`.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Google's Docs MCP documentation at
https://developers.google.com/workspace/docs/api/guides/configure-mcp-server.

## Open questions

- Google's Docs MCP setup page requires `drive.file`, while live
  protected-resource metadata advertises broad `drive` instead and omits
  `drive.file`. The guide follows the explicit setup page; confirm which source
  Google intends to update.

## Provenance

Source inventory: Google Workspace developer documentation
(`developers.google.com`, drawn from); Google Cloud documentation
(`docs.cloud.google.com`, drawn from); Google Workspace Admin Help
(`support.google.com/a`, drawn from); Google Cloud Console Help
(`support.google.com/cloud`, drawn from); Google Codelabs
(`codelabs.developers.google.com`, swept but not drawn from).
`https://developers.google.com/llms.txt` returned 404.

All sources were observed at `2026-07-29T20:37:14Z`:

- `https://developers.google.com/workspace/docs/api/guides/configure-mcp-server`
  — endpoint, HTTP transport, APIs, scopes, consent, client credentials, and
  security warning.
- `https://developers.google.com/workspace/guides/configure-mcp-servers` —
  corroborating Workspace MCP endpoint, APIs, scopes, and OAuth flow.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  consent wizard, audience, scopes, and test users.
- `https://developers.google.com/workspace/guides/create-credentials` —
  web-client controls and redirect URI.
- `https://developers.google.com/workspace/guides/enable-apis` — API Library
  and Docs API enablement.
- `https://developers.google.com/workspace/docs/api/auth` — scope descriptions
  and classifications.
- `https://developers.google.com/workspace/guides/configure-mcp-security` —
  prompt-injection screening requirement.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` —
  manual registration, one-time secret, and OAuth configuration.
- `https://docs.cloud.google.com/service-usage/docs/enable-disable` — API
  enablement labels and permission requirement.
- `https://support.google.com/a/answer/7281227?hl=en` — Workspace API controls,
  high-risk scopes, and app access.
- `https://support.google.com/cloud/answer/15549945` — Audience testing limits
  and expiry.
- `https://support.google.com/cloud/answer/15549135` — Data Access controls.
- `https://docsmcp.googleapis.com/mcp/v1` — direct JSON-RPC transport
  observation.
- `https://docsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — live protected-resource metadata.
- `https://accounts.google.com/.well-known/oauth-authorization-server` — live
  authorization-server metadata.
- `doctrine/speakeasy-setup.md` — Speakeasy labels and fixed anchors.
