---
research_version: 1
slug: google-people
researched_at: 2026-08-29T15:13:24Z
---

# Google People — Research Dossier

## Server facts

- Remote URL: `https://people.googleapis.com/mcp/v1`.
- Transport: `streamable-http`. Google's setup page labels the transport
  **HTTP**, and its MCP reference shows JSON-RPC requests sent to the HTTPS
  endpoint with both JSON and event-stream response types.
- Launch stage: **Developer Preview** in Google's supported-products list.
- Enable **People API** (`people.googleapis.com`) in a Google Cloud project.
  The product page calls this the API and MCP service; it documents no second
  MCP-specific service.
- Authentication Option: OAuth 2.0 with a manually registered **Web
  application** client, **Client ID**, and **Client secret**. Google MCP
  servers do not support Dynamic Client Registration.
- Each connecting principal needs **MCP Tool User** (`roles/mcp.toolUser`) on
  the project. Access remains bounded by the signed-in user's permissions and
  data-governance controls.
- Required OAuth scopes:
  - `https://www.googleapis.com/auth/directory.readonly`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `https://www.googleapis.com/auth/contacts.readonly`
- Protected-resource metadata at
  `https://people.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  advertises these scopes and `https://accounts.google.com/` as the
  authorization server.
- Google documents that application developers are responsible for screening
  prompts and responses for malicious content or prompt injection. Model Armor
  is one documented option; an organization can use another solution.
- The URL is a shared global endpoint, not a region-, instance-, or
  organization-specific endpoint, so the remote is not tenanted.
- Speakeasy MCP Catalog presence is unknown: the coordinator's safe Pulse
  inspection found no confident Google People match. With no tenanted remote
  and no `speakeasy_add_server` override, preserve both add-server paths.

## Credential flow

Use one Google Cloud project for API enablement, IAM grants, Google Auth
platform, and the OAuth client. Enabling an API requires
`serviceusage.services.enable`, normally through **Service Usage Admin** or
**Owner**. Granting project roles requires suitable IAM administration access.

Create a **Web application** OAuth client. Enter
`{{ gram.oauth.callback_url }}` directly under **Authorized redirect URIs**.

| Value | Google origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** in {#copy-oauth-credentials} |
| Client Secret | **Client secrets** in {#copy-oauth-credentials}; copyable once |
| Scopes | The three People API MCP scopes listed above |

The chosen **Audience** must cover every intended connecting account. Choose
**Internal** only when all those accounts are in the Google Cloud organization
associated with the project; otherwise use an approved **External**
configuration. Apply the same coverage check to an existing audience. For an
**External** audience in **Testing**, add every connecting account under **Test
users**. Testing supports no more than 100 test users, and these authorizations
expire seven days after consent.

## Console walkthrough

Sign in at `https://console.cloud.google.com`. In the toolbar resource
selector, select the project that will own this configuration. Keep it
selected throughout the Google steps.

### Enable the People API {#enable-people-api}

- Open **APIs & Services** > **API Library**.
- In **Search for APIs & Services**, search for `People API`, open **People
  API**, and click **Enable**. Continue if it is already enabled.
- Permission gate: the administrator needs
  `serviceusage.services.enable`, normally through **Service Usage Admin** or
  **Owner**.
- Result and transition: the API and MCP service are enabled. Next, open the
  project's **IAM** page.
- Values entered: `People API`. Values copied: none.
- Screenshot note: **People API** showing **Enable** or its enabled state.

### Grant MCP Tool User access {#grant-mcp-tool-user}

- Go to `https://console.cloud.google.com/iam-admin/iam` and confirm the same
  project is selected.
- Click **Grant access**.
- In **New principals**, enter a connecting user's Google Account email.
- Click **Select a role**, search for `MCP Tool User`, select **MCP Tool User**,
  and click **Save**.
- Repeat for each connecting user. Google's IAM procedure names **Project IAM
  Admin** as the role required to grant project roles.
- Result and transition: users can make MCP calls subject to their existing
  People data access. Next, configure **Google Auth platform**.
- Values entered: user emails and **MCP Tool User**. Values copied: none.
- Screenshot note: **Grant access** with **New principals** and **MCP Tool
  User** visible.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Warning: Google says an OAuth consent screen cannot be removed after it is
  configured.
- Open **Google Auth platform** > **Branding**. If the page says **Google Auth
  platform not configured yet**, click **Get Started**.
- In the first-time wizard:
  1. Under **App Information**, enter `People API MCP Server` in **App name**,
     select a monitored **User support email**, and click **Next**.
  2. Under **Audience**, select **Internal** only if every intended connecting
     account is in the Google Cloud organization associated with the project.
     Otherwise, use an approved **External** configuration. Click **Next**.
  3. Under **Contact Information**, enter a monitored **Email address** and
     click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. With
     application-owner approval, select **I agree to the Google API Services:
     User Data Policy**, click **Continue**, and click **Create**.
- If Google Auth platform was already configured, retain its approved
  **Branding**. Retain its **Audience** only if it covers every intended
  connecting account: **Internal** qualifies only when all those accounts are
  in the associated Google Cloud organization; otherwise use an approved
  **External** configuration. Then continue to **Data Access**.
- Open **Data Access** and click **Add or Remove Scopes**.
- Under **Manually add scopes**, paste the three scope URLs from Server facts.
  Click **Add to Table**, **Update**, then **Save**.
- An **External** app in **Testing** supports no more than 100 test users. Use
  this branch only when every intended connecting account fits within that
  ceiling. Open **Audience**. Under **Test users**, click **Add users**, enter
  every connecting user's email, and click **Save**.
- Result and transition: connecting users can authorize profile, contacts, and
  directory access. Next, create the OAuth client.
- Values entered: app/contact details, audience, three scopes, and applicable
  test-user emails. Values copied: none.
- Screenshot note: **Data Access** with all three scopes selected.
- Recovery: after a Testing authorization expires, the user must complete
  browser authorization again.

### Create the OAuth client {#create-oauth-client}

- Open **Google Auth platform** > **Clients**, then click **Create client**.
- In **Application type**, select **Web application**.
- In **Name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter
  `{{ gram.oauth.callback_url }}` in **URIs**. **Authorized JavaScript
  origins** is not needed for this hosted server-side flow.
- Warning: prepare an approved secret store before clicking **Create**. The
  next dialog permits the client secret to be copied only once.
- Click **Create**. This opens **OAuth 2.0 client created**.
- Values entered: application type, name, and callback URL.
- Screenshot note: **Create client** with **Web application** and the callback
  template under **Authorized redirect URIs**.

### Copy the OAuth credentials {#copy-oauth-credentials}

- In **OAuth 2.0 client created**, copy **Client ID** to the secret store.
- Under **Client secrets**, copy **Client secret** to the same store. Google
  says it can be copied only once.
- Keep both values for {#connect-speakeasy-credentials}, then return to the
  Speakeasy AI Control Plane.
- Values copied: Client ID and Client secret to their matching Speakeasy
  fields.
- Screenshot exception: do not capture a dialog containing a one-time secret.
- Recovery: if the secret is missed, delete the affected OAuth client using
  its visible or equivalent delete control, create the OAuth client again, and
  repeat this credential-copy step before continuing.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md`, observed at
`2026-08-29T15:13:24Z`. These anchors are fixed and carried verbatim.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If **Google People** is in the catalog, choose **3rd-party server**. On the
  **MCP Catalog** page, search for Google People in **Search MCP servers...**,
  open the matching entry with **View**, click **Add**, and then click **Add to
  Project** in **Add to Project**.
- If no matching catalog entry is available, choose **Custom remote server**.
  On **Add a custom remote MCP server**, paste
  `https://people.googleapis.com/mcp/v1` into **Remote MCP server URL** and
  click **Add server**.

Either path creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the matching provider catalog entry -->

Per-guide values: remote URL `https://people.googleapis.com/mcp/v1`;
`streamable-http` transport with read-only **Transport**; manually registered
`oauth-client`; shared non-tenanted endpoint; catalog presence unresolved, so
both add-server paths remain available.

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, click
**Configure Manually** or **Use Discovered** when offered. The endpoint
publishes protected-resource metadata. In **Attach Remote Identity Provider**,
set **Client Type** to **Manual**.

Confirm **Redirect URI** matches `{{ gram.oauth.callback_url }}` entered in
{#create-oauth-client}. Paste **Client ID** and **Client Secret (optional)**
from {#copy-oauth-credentials}. Google's Web application flow requires the
generated secret despite the optional Speakeasy label.

In **Scope (override)**, enter all three scope identifiers from Server facts
using the field's visible or equivalent multi-scope format, then click **Attach
Identity Provider**. At first connection, authorize with an account granted
**MCP Tool User** in {#grant-mcp-tool-user}.
Provider-specific prompt labels are not documented.

Screenshot note: **Attach Remote Identity Provider** showing Manual client
type, redirect URI, credential labels, and scopes, with secrets redacted.

Further-reading URL:
`https://developers.google.com/people/v1/configure-mcp-server`.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Google's People API MCP documentation at
https://developers.google.com/people/v1/configure-mcp-server.

## Research limitations

- Google public documentation cannot establish presence in the private
  Speakeasy MCP Catalog. The coordinator's safe Pulse inspection found no
  confident Google People match, so catalog presence remains unknown and both
  add-server paths are retained. This is not an operator decision.
- Google documents the OAuth client type, redirect-URI field, credential
  fields, scopes, and first authorization requirement, but not the exact
  provider-specific browser-consent prompt labels. The Writer should preserve
  the documented identifiers and refer to the visible or equivalent consent
  controls without inventing chrome.
- Google's generic Workspace credentials guide says Web applications do not
  use client secrets, while the People-specific setup and Google MCP
  authentication guide explicitly require a client ID and client secret for
  third-party MCP applications. This dossier follows the two MCP-specific
  sources.
- Google's MCP security documentation assigns application developers
  responsibility for prompt and response screening but does not establish a
  provider-independent minimum or acceptance test. This dossier therefore does
  not claim that an independently verifiable screening prerequisite has been
  completed.
- The dossier sources identify the three required scope identifiers but do not
  prescribe a delimiter for Speakeasy's **Scope (override)** field. The guide
  therefore directs the reader to the visible or equivalent multi-scope format.
- Google's MCP authentication documentation identifies the OAuth client as the
  object to delete when its one-time secret was missed, but does not name the
  exact delete control. The guide uses a bounded visible-control hedge.

## Operator decisions

None.

## Provenance

Documentation-property sweep:

- `developers.google.com` — People MCP setup/reference, Workspace API
  enablement, OAuth consent/credentials, and MCP security were used. No usable
  `developers.google.com/llms.txt` index was retrievable, so the named primary
  pages were fetched directly.
- `docs.cloud.google.com` and `cloud.google.com` — Google MCP authentication,
  supported products, Service Usage, and IAM documentation were used. No
  usable `cloud.google.com/llms.txt` index was retrievable, so the named
  primary pages were fetched directly.
- `support.google.com` — its broad `/llms.txt` Help index was swept; Google
  Cloud Platform Console Help pages for Audience and Data Access were used.
- `support.google.com/a` — Workspace app-access controls were swept but not
  used because the People setup page prescribes no app-access control step.
- `doctrine/speakeasy-setup.md` supplies Speakeasy labels and fixed anchors.

All sources were observed at `2026-08-29T15:13:24Z`:

- `https://developers.google.com/people/v1/configure-mcp-server` — endpoint,
  transport label, enablement, OAuth, consent values, scopes, client creation,
  and further reading.
- `https://developers.google.com/people/api/mcp` — endpoint and request shape.
- `https://developers.google.com/workspace/guides/enable-apis` — API Library
  navigation and People API service name.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  consent wizard, audience, scopes, test users, and irreversibility.
- `https://developers.google.com/workspace/guides/create-credentials` —
  general Web OAuth controls. Its generic statement that Web applications do
  not use client secrets conflicts with the newer People-specific and MCP
  authentication pages; the two MCP-specific pages explicitly require one.
- `https://developers.google.com/workspace/guides/configure-mcp-security` —
  prompt and response screening.
- `https://docs.cloud.google.com/mcp/supported-products` — Developer Preview.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` — MCP
  Tool User, DCR limitation, Web client fields, one-time secret, and recovery.
- `https://cloud.google.com/service-usage/docs/enable-disable` — API Library,
  labels, and enablement permission.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — IAM controls.
- `https://support.google.com/cloud/answer/15549945` — audiences, Testing cap,
  and seven-day expiry.
- `https://support.google.com/cloud/answer/15549135` — Data Access controls.
- `https://support.google.com/a/answer/7281227` — app controls; swept only.
- `https://people.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  — authorization server, bearer method, resource URL, and scopes.
- `https://accounts.google.com/.well-known/oauth-authorization-server` —
  OAuth endpoints and no registration endpoint.
- `doctrine/speakeasy-setup.md` — unresolved-catalog dual add-server paths and
  the Manual OAuth flow.
- `doctrine/personas/it-admin.md` — browser-only achievability requirements.
