---
research_version: 1
slug: github
researched_at: "2026-07-24T23:32:15Z"
---

# GitHub — Research Dossier

Source ruling for this guide: the official `github/github-mcp-server`
repository is the primary source for the hosted MCP Server, host OAuth
requirements, and governance. GitHub Docs supplies the OAuth-app console
path and exact registration labels. Direct endpoint observation corroborates
the hosted URL and OAuth protected-resource metadata. This guide uses the
hosted server and an organization-owned OAuth app; the local Docker deployment
and PAT authentication are supported alternatives but are outside its
walkthrough.

## Server facts

- **Remote URL:** `https://api.githubcopilot.com/mcp/`.
- **Transport:** `streamable-http`. GitHub's remote examples identify the
  connection as HTTP and the endpoint implements the current remote MCP
  request/challenge flow. Some GitHub product UI labels the combined choice
  **HTTP/SSE**; that is a host UI label, not a separate endpoint.
- **Selected Authentication Option:** OAuth 2.0 authorization-code flow with
  a manually pre-registered GitHub OAuth app. The Speakeasy AI Control Plane
  needs the app's **Client ID** and **Client secret**. GitHub's host-integration
  guide says dynamic client registration is not supported.
- **Other supported Authentication Option:** a GitHub personal access token
  (PAT) sent as `Authorization: Bearer <token>`. GitHub says PATs work with
  remote-compatible hosts, recommends fine-grained PATs over classic PATs,
  and limits access to the token's permissions and repository selection.
  This guide does not render the PAT path because OAuth is the preferred
  hosted-server path.
- **OAuth discovery:** an unauthenticated request to the remote URL returned
  HTTP 401 with a Bearer challenge pointing to
  `https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/`.
  That document names `https://github.com/login/oauth` as the authorization
  server, lists supported scopes, and requires header bearer tokens. The
  corresponding RFC authorization-server metadata URL returned 404 during
  this run, so the server has protected-resource discovery but not a complete
  discoverable authorization-server metadata chain.
- **Scopes:** there is no single fixed scope set for setup. The remote server
  uses OAuth scope challenges and requests additional scopes when a selected
  tool needs them. The protected-resource metadata advertises `repo`,
  `read:org`, `read:user`, `user:email`, `read:packages`, `write:packages`,
  `read:project`, `project`, `gist`, `notifications`, `workflow`, and
  `codespace`. Do not pre-grant all of them merely because they are
  advertised; users approve the scopes requested for their work.
- **Authorization boundary:** GitHub's native permission model still applies.
  The server cannot access resources the signed-in user cannot normally
  access through GitHub's APIs.
- **Availability:** GitHub hosts the remote server for GitHub Enterprise Cloud.
  GitHub Enterprise Server does not support the hosted remote deployment.
  The standard URL in this guide is for GitHub.com; GitHub Enterprise Cloud
  with data residency uses a tenant-specific URL and is outside this guide.
- **Local alternative:** GitHub also publishes the public Docker image
  `ghcr.io/github/github-mcp-server` for a local deployment. The local
  deployment is a separate setup path and is outside this hosted-server
  Guide.
- **Organization gates:** an organization may restrict OAuth app access.
  For a third-party host using an OAuth app, an organization owner must grant
  the app access before it can access restricted organization data. A request
  cannot be made before the app exists and a user has authorized it for their
  personal account. The user then requests organization access from their
  authorized-app settings, and an organization owner reviews the pending
  request and grants access. SSO enforcement also overlays OAuth: users need
  a valid SSO session for protected organization resources.
  GitHub's **MCP servers in Copilot** policy governs listed first-party Copilot
  hosts, not the GitHub MCP Server in third-party hosts such as the Speakeasy
  AI Control Plane.

## Credential flow

Create an organization-owned **OAuth App** in GitHub. GitHub allows OAuth apps
under a personal account or an organization for which the creator has
administrative access. Organization ownership fits an IT-managed deployment
and keeps the registration under the organization's control.

Values the Speakeasy AI Control Plane needs:

| Value | Origin |
| --- | --- |
| Client ID | Shown next to **Client ID** on the registered OAuth app's settings page ({#generate-oauth-credentials}) |
| Client secret | Created with **Generate a new client secret** under **Client secrets** on the app's settings page ({#generate-oauth-credentials}) |

During app registration, paste `{{ gram.oauth.callback_url }}` into
**Authorization callback URL** ({#register-oauth-app}). GitHub OAuth apps
allow only one callback URL. **Homepage URL** is also required; use the
organization-approved public page for this connection. GitHub warns that
OAuth app registration details are public, so do not put internal or
sensitive information in the name, homepage URL, or description.

GitHub's host-integration guide requires the host to supply the OAuth app's
client secret and recommends a dedicated app for the host. It also directs
hosts to follow the authorization-server locator from the MCP server's
`WWW-Authenticate` response instead of hard-coding GitHub OAuth endpoints.

## Console walkthrough

For an organization-owned app, the documented transition from GitHub's main
site is profile picture > **Your organizations** > the organization's
**Settings** > **Developer settings** > **OAuth apps**. The creation sequence
is **New OAuth App** (or **Register a new application** when no app exists) >
**Register application** > app settings > **Generate a new client secret**.

### Open organization developer settings {#open-organization-developer-settings}

- Sign in at `https://github.com`.
- Click the profile picture in the upper-right corner, then click
  **Your organizations**.
- To the right of the organization that should own the app, click
  **Settings**.
- In the left sidebar, click **Developer settings**, then **OAuth apps**.
- The creator needs administrative access to that organization. If the app
  should instead be personally owned, GitHub documents profile picture >
  **Settings** > **Developer settings** > **OAuth apps**.
- Values entered or copied: none.
- Screenshot note: the organization's **Developer settings** with
  **OAuth apps** selected and the create control visible; exclude unrelated
  organization settings.

### Register the OAuth app {#register-oauth-app}

- Click **New OAuth App**. If this is the first OAuth app under the owner,
  GitHub labels the control **Register a new application**.
- In **Application name**, enter a recognizable public name, such as
  `Speakeasy AI Control Plane – GitHub MCP`.
- In **Homepage URL**, enter the full organization-approved public URL for
  this connection. Obtain it from the application or cloud security owner;
  GitHub requires a full URL.
- Optionally enter a public-safe **Application description**. Do not include
  internal URLs or sensitive details in any app-registration field.
- In **Authorization callback URL**, enter
  `{{ gram.oauth.callback_url }}`.
- Leave **Enable Device Flow** off; this hosted callback path uses the web
  authorization-code flow.
- Click **Register application**. This opens the app's settings page.
- Values entered: application name, homepage URL, optional description, and
  `{{ gram.oauth.callback_url }}`. Values copied: none.
- Screenshot note: the OAuth app registration form immediately before
  **Register application**, showing the field labels and the callback
  template but no organization-sensitive homepage value.
- Organization caveat: if the target organization restricts OAuth apps,
  complete the organization approval flow after attaching credentials at
  {#connect-speakeasy-credentials}.

### Generate the OAuth credentials {#generate-oauth-credentials}

- On the registered app's settings page, copy the value next to
  **Client ID** into an approved password manager for later entry in the
  Speakeasy AI Control Plane.
- Under **Client secrets**, click **Generate a new client secret**.
- Copy the generated client secret into the approved password manager. GitHub
  requires client secrets to be stored securely; do not put it in source
  control or this Guide.
- Values copied: **Client ID** and client secret for
  {#connect-speakeasy-credentials}. Values entered: none unless GitHub asks
  the signed-in administrator to reconfirm access; public documentation does
  not name that interstitial.
- Screenshot note: the app settings page with **Client ID**,
  **Client secrets**, and **Generate a new client secret** visible. Capture
  before generating, or fully redact every credential value.
- Recovery: if no usable secret is available before the first connection,
  return to this app settings page and use **Generate a new client secret**.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md`, observed
`2026-07-24T23:32:15Z`.

Per-guide values:

- Remote URL: `https://api.githubcopilot.com/mcp/`
- Transport: `streamable-http` (the add form's **Transport** field is
  read-only)
- Authentication Option: OAuth with a manually pre-registered client
- OAuth discovery: GitHub publishes protected-resource metadata, but its
  advertised authorization-server metadata URL did not resolve this run;
  use **Use Discovered** only when the Speakeasy AI Control Plane offers it,
  otherwise use **Configure Manually**
- **Client ID** and **Client secret**: produced at
  {#generate-oauth-credentials}
- Redirect URI registered with GitHub:
  `{{ gram.oauth.callback_url }}` at {#register-oauth-app}
- Provider scopes: no fixed upfront list; the server uses OAuth scope
  challenges to request additional scopes as tools need them
- Further reading:
  `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If GitHub is in the catalog: choose **3rd-party server**. On the
  **MCP Catalog** page, find GitHub using **Search MCP servers...**, open its
  entry with **View**, and click **Add**. In the **Add to Project** dialog,
  click **Add to Project**.
- If it is not: choose **Custom remote server**. On the
  **Add a custom remote MCP server** page, paste
  `https://api.githubcopilot.com/mcp/` into **Remote MCP server URL** and
  click **Add server**.

Either path creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the **Add Source** menu on **Sources**, or GitHub's
catalog entry if present.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under
**Authentication**, click **Use Discovered** when offered; otherwise click
**Configure Manually**. In **Attach Remote Identity Provider**, set
**Client Type** to **Manual**. Confirm the sheet's **Redirect URI** matches
the `{{ gram.oauth.callback_url }}` value registered at
{#register-oauth-app}. Paste the **Client ID** and **Client Secret
(optional)** saved at {#generate-oauth-credentials}, then click
**Attach Identity Provider**.

If the target organization restricts OAuth apps, have a user authorize the
connection after **Attach Identity Provider**, then complete the request and
owner-approval flow:

- User request path: profile picture > **Settings** > **Applications** in the
  **Integrations** section of the sidebar > the **Authorized OAuth Apps** tab,
  open the app, click **Request access** next to the organization, and click
  **Request approval from owners**.
- Owner approval path: profile picture > **Organizations** > the
  organization > the **Settings** tab under the organization name >
  **OAuth app policy** under **Third-party Access**, click **Review** next to
  the app, and click **Grant access**.

Flagged recovery inference: if the user's first authorization attempt was
blocked before approval, retry authorization after the owner grants access.

Screenshot note: capture **Attach Remote Identity Provider** with the
Redirect URI and credential fields visible and all credential values
redacted.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see GitHub's MCP documentation at
https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md."

## Open questions

- The exact Speakeasy control that launches GitHub user authorization after
  **Attach Identity Provider** in {#connect-speakeasy-credentials}; name that
  control in the restricted-organization branch once canonical doctrine or
  Speakeasy docs confirm it.
- GitHub's protected-resource metadata was live and pointed to
  `https://github.com/login/oauth`, but the corresponding standard
  authorization-server metadata request returned 404. Confirm during
  fidelity review whether the Speakeasy AI Control Plane offers
  **Use Discovered** for this endpoint or requires **Configure Manually**.
- GitHub documents on-demand OAuth scope challenges for the remote server.
  Public Speakeasy doctrine does not state whether post-connection scope
  challenges are surfaced to users; validate this behavior before claiming
  that every scope-gated tool can be authorized on demand.

## Provenance

Source inventory from the sweep:

- **Official server repository — `github.com/github/github-mcp-server`:**
  primary remote-server, host-integration, scope, installation, and
  governance documentation. GitHub's `/llms.txt` was available as a broad
  site index; repository search and direct raw-file fetches located the
  specific pages.
- **Developer and product/admin documentation — `docs.github.com`:**
  OAuth app creation, credential retrieval, API authentication, MCP setup,
  Enterprise configuration, and policy documentation. Its `/llms.txt` index
  was available and targeted search located the relevant pages.
- **Support knowledge base:** GitHub publishes product support content within
  `docs.github.com`; no separate public support property with a distinct
  setup path was found.
- **Live hosted service — `api.githubcopilot.com`:** used only for
  unauthenticated endpoint and OAuth metadata observations.

Sources drawn from:

- `https://github.com/github/github-mcp-server` ("GitHub MCP Server") —
  observed `2026-07-24T23:32:15Z`. Backs official ownership, hosted and local
  deployment choices, remote prerequisites, OAuth and PAT support, and the
  requirement for a host-registered GitHub App or OAuth app.
- `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`
  ("Remote GitHub MCP Server") — observed `2026-07-24T23:32:15Z`. Backs the
  default hosted URL, HTTP remote configuration, default endpoint, and
  optional read-only/toolset variants. No tool inventory is carried into
  this Guide.
- `https://github.com/github/github-mcp-server/blob/main/docs/host-integration.md`
  ("GitHub Remote MCP Integration Guide for MCP Host Authors") — observed
  `2026-07-24T23:32:15Z`. Backs required bearer authentication, preferred
  OAuth flow, PAT alternative, no dynamic client registration, OAuth App or
  GitHub App registration, client-secret requirement, organization access
  restrictions, and `WWW-Authenticate`-driven endpoint discovery.
- `https://github.com/github/github-mcp-server/blob/main/docs/scope-filtering.md`
  ("Scope Filtering") — observed `2026-07-24T23:32:15Z`. Backs on-demand
  OAuth scope challenges and the distinction from PAT scope handling.
- `https://github.com/github/github-mcp-server/blob/main/docs/policies-and-governance.md`
  ("Policies & Governance for the GitHub MCP Server") — observed
  `2026-07-24T23:32:15Z`. Backs GitHub Enterprise Cloud availability,
  GitHub Enterprise Server exclusion, OAuth app restrictions, SSO overlay,
  third-party host governance, native permission boundaries, and PAT policy
  behavior.
- `https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/README.md`
  ("GitHub MCP Server Installation Guides") — observed
  `2026-07-24T23:32:15Z`. Corroborates the hosted URL, OAuth/PAT host support,
  official Docker image, and the requirement that OAuth-capable hosts
  register an app.
- `https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app`
  ("Creating an OAuth app") — observed `2026-07-24T23:32:15Z`. Backs personal
  or organization ownership, administrative access, the GitHub navigation
  path, **New OAuth App** alternate label, exact registration fields,
  one-callback limit, public-information warning, and **Register
  application**.
- `https://docs.github.com/en/account-and-profile/how-tos/organization-membership/requesting-organization-approval-for-oauth-apps`
  ("Requesting organization approval for OAuth apps") — observed
  `2026-07-24T23:32:15Z`. Backs the requirement to authorize an OAuth app for
  a personal account before requesting organization approval, plus the
  **Integrations** sidebar section, **Applications**, the **Authorized OAuth
  Apps** tab, **Request access**, and **Request approval from owners**.
- `https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization`
  ("Approving OAuth apps for your organization") — observed
  `2026-07-24T23:32:15Z`. Backs the organization-owner role, organization
  **Settings** tab under the organization name, **Third-party Access** >
  **OAuth app policy**, **Review**, and **Grant access**.
- `https://docs.github.com/en/apps/oauth-apps/using-oauth-apps/authorizing-oauth-apps`
  ("Authorizing OAuth apps") — observed `2026-07-24T23:32:15Z`. Backs the
  authorization-time organization restriction, personal authorization,
  organization approval request, and active SAML-session requirement.
- `https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api?apiVersion=2026-03-10`
  ("Authenticating to the REST API") — observed `2026-07-24T23:32:15Z`.
  Backs the organization-owned app navigation path, **Client ID**,
  **Client secrets**, **Generate a new client secret**, secure credential
  role, and GitHub's fine-grained-PAT recommendation.
- `https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server`
  ("Setting up the GitHub MCP Server") — observed
  `2026-07-24T23:32:15Z`. Corroborates the hosted URL, default OAuth option,
  PAT alternative, authorization header form, and organization policy
  boundaries.
- `https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/enterprise-configuration`
  ("Configuring the GitHub MCP Server for GitHub Enterprise") — observed
  `2026-07-24T23:32:15Z`. Backs the tenant-specific remote URL for GitHub
  Enterprise Cloud with data residency and its separation from the standard
  URL documented here.
- `https://api.githubcopilot.com/mcp/` — unauthenticated endpoint observation
  at `2026-07-24T23:32:15Z`. Returned HTTP 401 with a Bearer challenge naming
  the protected-resource metadata URL.
- `https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/`
  — observed `2026-07-24T23:32:15Z`. Backs the exact MCP resource,
  authorization-server locator, supported scopes, header bearer method, and
  resource name.
- `https://github.com/login/oauth/.well-known/oauth-authorization-server` —
  observed `2026-07-24T23:32:15Z`. Returned HTTP 404; backs the discovery
  caveat and open question.
- `doctrine/speakeasy-setup.md` — observed `2026-07-24T23:32:15Z`. Backs the
  transcluded Speakeasy-side flow, fixed anchors, exact product labels,
  callback-template behavior, and closing-pointer form.
