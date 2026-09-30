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
- Launch stage: **Developer Preview**. The People setup page (last updated
  2026-09-18 UTC, re-verified 2026-09-30T21:25:46Z) lists **Membership in the
  Google Workspace Developer Preview Program** as the first prerequisite, and
  the program page lists **People MCP server** under **MCP SERVERS**. The
  program requires an application, a Google Workspace account that can be
  added to Google Groups, account verification, and Google Cloud project
  registration before use.
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
  inspection found no confident Google People match. A reviewed-catalogue
  search for `google people` on 2026-09-30 returned no candidates, but the
  same tool was rate-limited before a control query could confirm it was
  searching the full catalog, so presence stays unresolved. With no tenanted
  remote and no `speakeasy_add_server` override, preserve both add-server
  paths.

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

### Join the Google Workspace Developer Preview Program {#join-developer-preview}

- Open `https://developers.google.com/workspace/preview` and review the
  **Developer Preview Program Terms** with the organization's application or
  security owner.
- Confirm that the submitted Google Workspace account can be added to Google
  Groups, as the program requires.
- Click **Apply to join the Developer Preview Program**. In the current
  application form, provide the requested Google Workspace account and Google
  Cloud project information, agree to the terms only with organizational
  approval, and submit. Google does not publish the form's field labels.
- Google verifies the Workspace account, adds it to the program group, and
  registers the Cloud project. Wait for the final confirmation at the
  submitted email address; Google says this should take a couple of days.
- Values entered: organization-specific account and project information.
  Values copied: none.
- Screenshot note: the program page with **People MCP server** listed under
  **MCP SERVERS**; do not capture application-form data.
- Source: `https://developers.google.com/workspace/preview` and the People
  setup page's prerequisites, observed 2026-09-30T21:25:46Z.

Sign in at `https://console.cloud.google.com`. In the toolbar resource
selector, select the project registered in the Developer Preview Program.
Keep it selected throughout the Google steps.

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

Transcluded from `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`),
observed at `2026-09-30T21:25:46Z`. These anchors are fixed and carried
verbatim.

Per-guide values:

- Remote URL `https://people.googleapis.com/mcp/v1`; `streamable-http`;
  shared, not tenanted; `speakeasy_add_server: auto`.
- Add-server path: catalog presence unresolved, so both bullets (dual
  conditional) remain.
- Authentication Option `oauth-client` (OAuth) → **User Identity**.
- Probe outcome (`2026-09-30T21:25:46Z`): an unauthenticated JSON-RPC
  `initialize` POST with `Accept: application/json, text/event-stream`
  returns **200** with no challenge, so the create form preselects **No
  Identity**. A catalog entry would also preselect **No Identity** because
  Google offers no client registration. The reader must select **User
  Identity** on either path.
- PRM `https://people.googleapis.com/.well-known/oauth-protected-resource/mcp/v1`
  names issuer `https://accounts.google.com/` and advertises exactly the three
  required scopes.
- Issuer metadata (`https://accounts.google.com/.well-known/oauth-authorization-server`
  and `/.well-known/openid-configuration`): no `registration_endpoint`, no
  `client_id_metadata_document_supported`. Authorization endpoint
  `https://accounts.google.com/o/oauth2/v2/auth`, token endpoint
  `https://oauth2.googleapis.com/token`.
- Creation result: automatic configuration cannot register a client, so the
  server is kept **Disabled** and the result points to **Settings >
  Identity**. Expected.
- Provider picker: PRM is served, so the picker preselects the Google issuer
  (badged **Will be created** when absent). No custom identity provider route.
- Registration choice: **Manual**.
- **Client ID** and **Client secret** from {#copy-oauth-credentials}; the
  secret is required despite the "Optional" placeholder.
- **Advanced > Scope**, space-separated on one line:
  `https://www.googleapis.com/auth/directory.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/contacts.readonly`.
  Because the PRM advertises only these three, a blank value would request the
  same set; the guide still enters them explicitly.
- Registered callback `{{ gram.oauth.callback_url }}` in {#create-oauth-client};
  the Identity section does not display a redirect URI.
- Server Availability: required after the Identity save.
- Further reading: `https://developers.google.com/people/v1/configure-mcp-server`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**.

- If **Google People** is in the catalog, choose **From the catalog**. On the
  **MCP Catalog** page, find Google People using **Search MCP servers...**,
  open its entry, and click **Add**. In **Add to Project**, select **User
  Identity**, click **Add to Project** (click **Skip for now** if a
  **Guardrails** step appears), then after **Server added successfully** click
  **Configure MCP settings**.
- If it is not, choose **Hosted remotely**. On **New remote MCP server**,
  paste `https://people.googleapis.com/mcp/v1` into **MCP server URL**, leave
  **User session issuer** at its default, click **Verify connectivity**,
  change the preselected **No Identity** to **User Identity**, leave
  **Guardrails** off, and click **Save**.

Either way the server is kept **Disabled** and the result says to finish
setup in **Settings > Identity**; this is expected.

<!-- screenshot: the Add MCP server page, or the matching provider catalog entry with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** > **Identity** and select **User Identity**.
In **Choose an identity provider**, confirm the preselected Google issuer
`https://accounts.google.com/` (or choose it via **Search identity
providers…**). Choose **Manual** (switch from **Existing client** if
preselected). Paste **Client ID** and **Client secret** from
{#copy-oauth-credentials}. Under **Advanced > Scope**, enter the scope string
above on one line. Click **Save** (**Save changes** if asked to confirm).
Open **Settings > Danger Zone > Server Availability** and turn on **Enable
MCP server** so it shows **Enabled**. At first connection, authorize with an
account granted **MCP Tool User** in {#grant-mcp-tool-user}.
Provider-specific prompt labels are not documented.

Screenshot note: **Settings > Identity** with **User Identity**, the Google
provider, and **Manual** selected; values redacted.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see [Google's People API MCP documentation](https://developers.google.com/people/v1/configure-mcp-server).

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

All sources were observed at `2026-08-29T15:13:24Z` unless noted. The People
setup page, PRM, and Google authorization-server metadata were re-verified at
`2026-09-30T21:25:46Z`:

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
- `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`, observed
  2026-09-30T21:25:46Z) — unresolved-catalog dual add-server paths, Identity
  section, **Manual** client, **Advanced > Scope**, and **Server
  Availability**.
- `https://developers.google.com/workspace/preview` — observed
  2026-09-30T21:25:46Z; Developer Preview application, terms, Google Groups
  requirement, verification and project-registration sequence, and **People
  MCP server** listing.
- `https://people.googleapis.com/mcp/v1` — probed 2026-09-30T21:25:46Z;
  unauthenticated `initialize` returns 200.
- `doctrine/personas/it-admin.md` — browser-only achievability requirements.
