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

The same callback appears later as **Redirect URI** in the Control Plane's
**Attach Remote Identity Provider** sheet. Each connecting user completes
Google's browser authorization using the account whose Docs permissions should
apply.

## Console walkthrough

Sign in to the Google Cloud console, select the project that will own the OAuth
client, enable both APIs, configure **Google Auth platform**, create the client,
copy its credentials, and conditionally allow it in the Google Admin console.

### Enable the Docs MCP APIs {#enable-docs-mcp-apis}

- Open [console.cloud.google.com](https://console.cloud.google.com). On the
  toolbar, open the resource selector and select the intended project.
- Open **APIs & Services** > **Library**. Open **Google Docs API**, then click
  **Enable**.
- Return to **Library**. Open **Google Docs MCP API**, then click **Enable**.
- If **Enable** is unavailable, obtain `serviceusage.services.enable` from the
  project administrator before continuing.
- Continue to **Google Auth platform** > **Branding**.
- Values entered: none. Values copied: none.
- Screenshot note: **Google Docs MCP API** showing its enabled state.

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

Transcluded from `doctrine/speakeasy-setup.md`, observed at
`2026-08-29T15:13:21Z`. Its fixed anchors are carried verbatim.

The credential-free Pulse snapshot observed at `2026-08-29T15:13:21Z` had no
confident exact Google Docs MCP catalog match. Preserve
`speakeasy_add_server: custom-remote` and render only the Custom remote path.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On the **Add a custom remote MCP server**
page, paste this value into **Remote MCP server URL**:

```
https://docsmcp.googleapis.com/mcp/v1
```

Click **Add server**. This creates the hosted MCP server and opens its
**Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

Per-guide values:

- Remote URL: `https://docsmcp.googleapis.com/mcp/v1`
- Transport: `streamable-http`; **Transport** is read-only.
- Authentication Option: `oauth-client`, manual OAuth.
- Required provider scopes: the four scope URLs listed under Server facts.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually**, or click **Use Discovered** when offered because
the provider publishes protected-resource and authorization-server metadata.

In the **Attach Remote Identity Provider** sheet, set **Client Type** to
**Manual**. Paste **Client ID** and **Client Secret (optional)** from
{#copy-client-credentials}, then click **Attach Identity Provider**. Google
requires the generated client secret for this MCP client path. Confirm that the
sheet's **Redirect URI** matches the callback registered in
{#create-oauth-client}.

When a client first needs access, complete Google's browser authorization with
the intended account. If the app is External and in **Testing**, that account
must be listed under **Test users**.

<!-- screenshot: the Attach Remote Identity Provider sheet with values redacted -->

Further-reading URL:
`https://developers.google.com/workspace/docs/api/guides/configure-mcp-server`.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Google's Docs MCP documentation at
https://developers.google.com/workspace/docs/api/guides/configure-mcp-server.

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
