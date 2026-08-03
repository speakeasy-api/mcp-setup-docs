---
research_version: 1
slug: google-sheets
researched_at: 2026-07-31T20:48:39Z
---

# Google Sheets — Research Dossier

Authoritative-source ruling: current MCP and console facts come from Google
Workspace developer documentation at `developers.google.com`. The Google
Workspace Developer Preview Program page governs preview access. The
`support.google.com` property was swept for administrator guidance, but no
Sheets-MCP-specific setup page was found. Direct endpoint metadata was used to
confirm the remote resource and OAuth discovery behavior.

## Server facts

- **Remote URL:** `https://sheetsmcp.googleapis.com/mcp/v1`.
- **Transport:** `streamable-http`. Google labels the transport **HTTP** and
  documents a hosted remote server URL. The endpoint accepts MCP over HTTPS;
  an unauthenticated GET returned HTTP 405 during this run, confirming that it
  is live but does not accept GET as an MCP operation.
- **Launch stage and access gate:** Developer Preview, available only through
  the Google Workspace Developer Preview Program. An applicant must accept the
  program terms and submit a Google Workspace account plus Google Cloud project
  information. Google registers the project after approval, normally within a
  couple of days. Preview features cannot be included in public applications
  before GA, and access generally must remain within the participant's domain
  or company under the program terms.
- **Project and service enablement:** the registered Google Cloud project must
  have both **Google Sheets API** (`sheets.googleapis.com`) and **Google Sheets
  MCP API** (`sheetsmcp.googleapis.com`) enabled.
- **Authentication:** OAuth 2.0 with a manually registered **Web application**
  client. Google documents an OAuth client ID and client secret for remote MCP
  clients. Dynamic Client Registration is not available: Google's authorization
  metadata does not advertise a registration endpoint.
- **Discovery:** the live protected-resource document at
  `https://sheetsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  returned the resource URL, `https://accounts.google.com/` as the authorization
  server, and bearer-token authentication in the HTTP header. Therefore the
  Speakeasy AI Control Plane can offer **Use Discovered**, but client
  registration remains manual.
- **OAuth consent scopes documented by the provider:**
  `https://www.googleapis.com/auth/drive.readonly`,
  `https://www.googleapis.com/auth/drive.file`,
  `https://www.googleapis.com/auth/spreadsheets.readonly`, and
  `https://www.googleapis.com/auth/spreadsheets`.
- **Permission model:** calls inherit the connecting Google user's permissions
  and data-governance controls. The provider warns that the server can read,
  modify, and delete data available to that account.
- **Security gate:** Google says prompts and responses must be screened for
  malicious content or prompt injection. Organizations can use Model Armor or
  their own documented solution accepted by users. This is an organizational
  prerequisite, not an extra credential field.

## Credential flow

A Google Workspace/Google Cloud administrator uses a project already approved
and registered in the Google Workspace Developer Preview Program. If approval
and registration are not complete, apply at
`https://developers.google.com/workspace/preview` with the Workspace account and
Cloud project, then wait for registration approval before continuing. Confirm
the approved Model Armor configuration or documented screening alternative with
the application or cloud security owner before continuing. The admin enables
the two APIs, configures the Google Auth consent screen and four
provider-documented scopes, and creates one OAuth 2.0 client with **Application
type** set to **Web application**.

The Speakeasy AI Control Plane needs:

| Value | Provider origin |
| --- | --- |
| Client ID | The dialog shown after **Create** in {#create-oauth-client} |
| Client Secret | The same dialog in {#create-oauth-client} |
| Scopes | The four scope URLs configured in {#configure-oauth-consent} |

In {#create-oauth-client}, paste `{{ gram.oauth.callback_url }}` directly into
**Authorized redirect URIs** > **URIs**. The Speakeasy AI Control Plane's
**Attach Remote Identity Provider** sheet later shows the same **Redirect URI**
for confirmation; no Speakeasy-first detour is required.

## Console walkthrough

Start at `https://console.cloud.google.com/`. In the toolbar, use the project
selector to select the Google Cloud project that Google registered for the
Developer Preview Program. All following provider steps use that project.

### Enable the Google Sheets API {#enable-sheets-api}

- Open Google's documented console link
  `https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com`.
  If prompted, select the registered project.
- Enable **Google Sheets API**. The MCP guide names the console button leading
  to this flow **Enable the APIs**, but does not publish the final flow's exact
  confirmation-control label.
- Result and transition: the Sheets API is enabled. Next open the separate MCP
  service-enablement link.
- Values entered or copied: none.
- Screenshot note: the API enablement flow with **Google Sheets API** and the
  selected project visible.

### Enable the Google Sheets MCP API {#enable-sheets-mcp-api}

- Open Google's documented console link
  `https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com`.
  Keep the same registered project selected.
- Enable **Google Sheets MCP API**. The MCP guide names the console button
  leading to this flow **Enable the MCP services**, but does not publish the
  final flow's exact confirmation-control label.
- Result and transition: the hosted Sheets MCP components are enabled for the
  project. Next open **Google Auth Platform** > **Branding**.
- Values entered or copied: none.
- Screenshot note: the service enablement flow with **Google Sheets MCP API**
  and the selected project visible.

### Configure the OAuth consent screen {#configure-oauth-consent}

- In the Google Cloud console, open **Google Auth Platform** > **Branding**.
- If **Google Auth Platform not configured yet** appears, click **Get Started**:
  1. Under **App Information**, enter `Sheets MCP Server` in **App name**.
  2. In **User support email**, select your email address or an appropriate
     Google group, then click **Next**.
  3. Under **Audience**, select **Internal**. If **Internal** is unavailable,
     select **External**, then click **Next**.
  4. Under **Contact Information**, enter an **Email address** that receives
     project-change notices, then click **Next**.
  5. Under **Finish**, review the Google API Services User Data Policy. If your
     application or cloud security owner has approved it, select **I agree to
     the Google API Services: User Data Policy**, click **Continue**, then
     click **Create**.
- If the platform was already configured, use the existing **Branding**,
  **Audience**, and **Data Access** pages instead of the first-time wizard.
- If **Audience** is **External**, and the app uses **Test users**, open
  **Audience**. Under **Test users**, click **Add users**, enter your email
  address and every other user authorized to connect during the preview, then
  click **Save**.
- Open **Data Access** > **Add or Remove Scopes**. Under **Manually add scopes**,
  paste these four values:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`
- Click **Add to Table**, click **Update**, then on **Data Access** click
  **Save**.
- Result and transition: the consent configuration allows the Sheets MCP
  scopes. Next open **Google Auth Platform** > **Clients** > **Create Client**.
- Values entered: app name, support and contact addresses, audience, optional
  test users, and four scope URLs. Values copied: none.
- Screenshot note: **Data Access** with the four manually added scopes visible.

### Create the OAuth client {#create-oauth-client}

- In the Google Cloud console, open **Google Auth Platform** > **Clients** >
  **Create Client** (documented direct URL:
  `https://console.cloud.google.com/auth/clients/create`).
- Select **Web application** as the application type.
- Enter a recognizable **Name**, such as `Speakeasy AI Control Plane`.
- In **Authorized redirect URIs**, click **+ Add URI**, then enter
  `{{ gram.oauth.callback_url }}` in **URIs**.
- Click **Create**. In the resulting dialog, copy **Client ID** and **Client
  Secret** into an approved password manager, then keep them ready for
  {#connect-speakeasy-credentials}.
- Result and transition: provider setup is complete. Return to the Speakeasy AI
  Control Plane and connect the copied credentials.
- Values entered: client name and callback URL. Values copied: Client ID and
  Client Secret to the Speakeasy AI Control Plane.
- Screenshot exception: do not capture the resulting credentials dialog because
  it contains a secret. The preceding client form is safe to capture with the
  redirect value redacted.
- Recovery: the fetched Sheets MCP page does not document whether this dialog is
  a one-time secret display or name a recovery control. Store the secret before
  closing the dialog; if it is missed, stop and follow the current controls on
  the client's detail page rather than guessing or creating an undocumented
  rotation flow.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md`; fixed anchors
`{#add-server-in-speakeasy}` and `{#connect-speakeasy-credentials}` are carried
verbatim. Provenance: `doctrine/speakeasy-setup.md`, observed at
`2026-07-31T20:48:39Z`.

Operator notes force the Custom remote path because the Speakeasy MCP Catalog
mapping is unreliable or unsuitable. Only the Custom remote server path is
rendered. This override was observed at `2026-07-31T20:48:39Z`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**. Choose **Custom remote server**. On the
**Add a custom remote MCP server** page, paste
`https://sheetsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL** and
click **Add server**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page -->

Per-guide values:

- Remote URL: `https://sheetsmcp.googleapis.com/mcp/v1`.
- Transport: `streamable-http`; the add form's **Transport** field is read-only.
- Authentication Option: `oauth-client`, OAuth with a manually registered
  client.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Use Discovered** when offered; otherwise click **Configure Manually**.
In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
Confirm that the sheet's **Redirect URI** matches the
`{{ gram.oauth.callback_url }}` value registered in {#create-oauth-client}.
Paste **Client ID** and **Client Secret (optional)** from
{#create-oauth-client}.

In **Scope (override)**, enter the provider-documented scopes as a
comma-separated list:
`https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/spreadsheets.readonly,https://www.googleapis.com/auth/spreadsheets`.
Click **Attach Identity Provider**. When a user first connects, complete
Google's browser authorization prompts with an account included in the
configured audience and, for an External testing app, the **Test users** list.

<!-- screenshot: the Manual Attach Remote Identity Provider sheet with values redacted -->

Further-reading URL:
`https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server`.

Canonical closing sentence:

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Google's Sheets MCP documentation at
https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server.

## Open questions

- **Scope metadata conflict:** Google's current Sheets MCP setup page requires
  `drive.readonly`, `drive.file`, `spreadsheets.readonly`, and `spreadsheets`.
  The live protected-resource metadata instead advertises `drive.readonly`,
  the broader `drive`, `spreadsheets.readonly`, and `spreadsheets`. This dossier
  follows the product setup page for consent and scope override, but a live
  first connection should confirm that the server does not request the broader
  Drive scope.
- **API flow confirmation labels:** the provider publishes direct links and the
  API names, but not the exact final confirmation-control label inside either
  API enablement flow. The Writer should say “Enable” without bolding an
  inferred control label.
- **Client-secret recovery:** the provider tells the reader to copy the secret
  but does not state on this page whether it is shown once or document the
  exact recovery controls. The safe first-connect path is to store it before
  closing the creation dialog.

## Provenance

Documentation-property sweep:

- **Google Workspace developer docs — `developers.google.com/workspace`**
  (drawn from): primary Sheets MCP setup, shared Workspace MCP configuration,
  Developer Preview Program, Cloud-project creation, authentication overview,
  and MCP security guidance. `/llms.txt` and `/workspace/llms.txt` returned
  404 during this run.
- **Google Codelabs — `codelabs.developers.google.com`** (swept, not drawn
  from): Google MCP getting-started and Workspace MCP examples. Current product
  docs were preferred for normative setup facts.
- **Google Workspace product site — `workspace.google.com`** (swept, not drawn
  from): no MCP setup property found; `/llms.txt` returned 404.
- **Google Help / admin support — `support.google.com`** (swept, not drawn
  from): no Sheets-MCP-specific setup article found. `/llms.txt` redirected to
  the Help portal rather than returning an index.

All observations below use `2026-07-31T20:48:39Z`:

- `https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server`
  — preview status, prerequisites, API/service names and enablement links,
  consent-screen labels and values, four scopes, OAuth-client labels, endpoint,
  HTTP transport, OAuth model, permissions inheritance, and security warning.
- `https://developers.google.com/workspace/guides/configure-mcp-servers` —
  corroborating endpoint, transport, OAuth model, API/service enablement,
  consent flow, and scopes.
- `https://developers.google.com/workspace/preview` — application requirements,
  project registration, expected approval timing, Sheets MCP listing, and
  Developer Preview use restrictions.
- `https://developers.google.com/workspace/guides/create-project` — Cloud
  project role and console project-creation context; swept to confirm the
  prerequisite, not rendered as a setup step because an approved registered
  project is already required.
- `https://developers.google.com/workspace/guides/configure-mcp-security` —
  mandatory prompt/response screening and Model Armor or documented-alternative
  requirement.
- `https://developers.google.com/workspace/guides/auth-overview` — OAuth 2.0
  background corroboration.
- `https://sheetsmcp.googleapis.com/mcp/v1` — live endpoint observation: GET
  returned HTTP 405.
- `https://sheetsmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — protected resource, authorization server, bearer-header method, and live
  supported-scope list.
- `https://accounts.google.com/.well-known/openid-configuration` — issuer,
  authorization and token endpoints, and absence of a registration endpoint.
- `doctrine/speakeasy-setup.md` — all Speakeasy-side labels and fixed anchors.
