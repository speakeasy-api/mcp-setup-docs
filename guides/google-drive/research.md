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
URIs** in {#create-oauth-client}. The Speakeasy AI Control Plane later shows
the same value as **Redirect URI** for confirmation.

Each user who connects must have **MCP Tool User**, access to the intended
Drive files, permission under Workspace app-access policy, and—when the
audience is External and Testing—membership in **Test users**.

## Console walkthrough

Sign in at `https://console.cloud.google.com` and select the project that will
own the APIs and OAuth client.

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

Transcluded from `doctrine/speakeasy-setup.md`, observed at
`2026-07-29T20:37:22Z`. The fixed anchors are carried verbatim.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On **Add a custom remote MCP server**, paste
`https://drivemcp.googleapis.com/mcp/v1` into **Remote MCP server URL** and
click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: Add Source with Custom remote server selected -->

Only this path is rendered because operator notes record both catalog queries,
`google-drive` and `google drive`, as absent. There is no catalog open
question.

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, click
**Configure Manually** or **Use Discovered** when offered. In **Attach Remote
Identity Provider**, set **Client Type** to **Manual**.

Confirm **Redirect URI** matches the value registered in
{#create-oauth-client}. Paste **Client ID** and **Client Secret (optional)**
from {#copy-client-credentials}; Google's Web application flow requires the
generated secret despite the optional Speakeasy label. Configure both required
Drive scopes, then click **Attach Identity Provider**.

Screenshot note: the identity-provider sheet with credentials redacted.

Further reading:
`https://developers.google.com/workspace/drive/api/guides/configure-mcp-server`.

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
