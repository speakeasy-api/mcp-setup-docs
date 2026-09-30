---
research_version: 1
slug: github
researched_at: "2026-08-06T23:22:50Z"
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
  RFC 8414 path-inserted metadata URL
  `https://github.com/.well-known/oauth-authorization-server/login/oauth`
  returned 200 on 2026-09-30 with issuer `https://github.com/login/oauth`,
  authorization endpoint `https://github.com/login/oauth/authorize`, and
  token endpoint `https://github.com/login/oauth/access_token`, with no
  `registration_endpoint` and no CIMD support. (The earlier run probed the
  suffix form `https://github.com/login/oauth/.well-known/oauth-authorization-server`,
  which still returns 404.) Discovery is therefore complete.
- **Scopes:** there is no single fixed scope set for setup. The remote server
  uses OAuth scope challenges and requests additional scopes when a selected
  tool needs them. On 2026-09-30 the protected-resource metadata advertised
  `repo`, `read:org`, `read:user`, `user:email`, `read:packages`,
  `write:packages`, `read:project`, `project`, `gist`, and `notifications`
  (`workflow` and `codespace`, listed in the earlier run, are no longer
  advertised). GitHub OAuth apps do not restrict which scopes they may
  request, so every advertised scope is grantable; users approve the scopes
  requested. GitHub's docs publish no minimal scope set for hosts.
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
  complete the organization approval flow after saving credentials at
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

Canonical source: `doctrine/speakeasy-setup.md` (gram main `68b3f78`),
observed `2026-09-30T21:30:00Z`.

Per-guide values:

- Remote URL: `https://api.githubcopilot.com/mcp/` (shared, not tenanted)
- Add-server path: catalog only (**From the catalog**), resolved by the
  Speakeasy MCP Catalog record `io.github.github/github-mcp-server`, title
  `GitHub`. Do not offer the Custom remote path.
- Authentication Option: `oauth-app`, mapped to **User Identity**.
  **Client ID** and client secret come from {#generate-oauth-credentials};
  `{{ gram.oauth.callback_url }}` is registered as **Authorization callback
  URL** at {#register-oauth-app}.
- Probe outcome (2026-09-30): 401 with `resource_metadata=
  "https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/"`.
- PRM issuer: `https://github.com/login/oauth`; issuer metadata matches it
  byte for byte, so the provider picker can create the provider from
  metadata ("Will be created").
- CIMD / DCR: neither advertised; GitHub's host-integration guide also says
  DCR is not supported.
- Registration choice: **Manual** (also the dashboard default here).
  Creation with **User Identity** cannot register a client, so the server is
  kept **Disabled** and the result points to **Settings > Identity**; the
  guide says this is expected and ends with **Server Availability**.
- Scope string for **Advanced > Scope**: the organization's approved subset
  of the advertised list, space-separated on one line. The guide shows the
  full advertised string
  `repo read:org read:user user:email read:packages write:packages read:project project gist notifications`
  and tells readers to delete what their organization does not allow. A
  blank **Scope** requests that full list, including `repo`,
  `write:packages`, and `gist`.
- Fallback endpoints if discovery ever fails (custom identity provider
  route): issuer `https://github.com/login/oauth`, authorization
  `https://github.com/login/oauth/authorize`, token
  `https://github.com/login/oauth/access_token`. Not rendered, because
  discovery works.
- Further reading:
  `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **From
the catalog**. On the **MCP Catalog** page, find GitHub using **Search MCP
servers...**, open its entry, and click **Add**. In **Add to Project**,
select **User Identity** under **Identity**, then click **Add to Project**.
Finish or **Skip for now** any **Guardrails** step. The result says to
finish setup in **Settings > Identity** and the server stays **Disabled**.

Screenshot note: GitHub's catalog entry in **Add to Project** with **User
Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

In the server's **Settings**, open the **Identity** section and select
**User Identity**. In **Choose an identity provider**, confirm
`https://github.com/login/oauth` (badged **Will be created** when new), or
choose it with **Search identity providers…**. Choose **Manual**, paste the
**Client ID** and client secret from {#generate-oauth-credentials} (GitHub
requires the secret despite the "Optional" placeholder), enter the scope
string above under **Advanced > Scope**, and click **Save**. This surface
shows no redirect URI; {#register-oauth-app} carries the callback check.
Then open **Danger Zone > Server Availability** and turn on **Enable MCP
server** so it shows **Enabled**.

If the target organization restricts OAuth apps, have a user authorize the
connection, then complete the request and owner-approval flow:

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

Screenshot note: **Settings > Identity** with **User Identity**, the
`github.com/login/oauth` provider, and **Manual** selected; credential
values redacted.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see GitHub's MCP documentation at
https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md."

## Open questions

- The exact Speakeasy control that launches GitHub user authorization after
  **Save** in {#connect-speakeasy-credentials}; name that control in the
  restricted-organization branch once canonical doctrine or Speakeasy docs
  confirm it.
- GitHub documents on-demand OAuth scope challenges for the remote server.
  Public Speakeasy doctrine does not state whether post-connection scope
  challenges are surfaced to users, so a scope removed from **Advanced >
  Scope** may not be requestable later. Validate this behavior before
  claiming that every scope-gated tool can be authorized on demand.

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
- **Speakeasy MCP Catalog (Pulse tenant lookup):** matched
  `name="io.github.github/github-mcp-server"`, title `GitHub`; used only to
  resolve the add-server path.

Sources drawn from:

- `https://github.com/github/github-mcp-server` ("GitHub MCP Server") —
  observed `2026-08-06T23:22:50Z`. Backs official ownership, hosted and local
  deployment choices, remote prerequisites, OAuth and PAT support, and the
  requirement for a host-registered GitHub App or OAuth app.
- `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`
  ("Remote GitHub MCP Server") — observed `2026-08-06T23:22:50Z`. Backs the
  default hosted URL, HTTP remote configuration, default endpoint, and
  optional read-only/toolset variants. No tool inventory is carried into
  this Guide.
- `https://github.com/github/github-mcp-server/blob/main/docs/host-integration.md`
  ("GitHub Remote MCP Integration Guide for MCP Host Authors") — observed
  `2026-08-06T23:22:50Z`. Backs required bearer authentication, preferred
  OAuth flow, PAT alternative, no dynamic client registration, OAuth App or
  GitHub App registration, client-secret requirement, organization access
  restrictions, and `WWW-Authenticate`-driven endpoint discovery.
- `https://github.com/github/github-mcp-server/blob/main/docs/scope-filtering.md`
  ("Scope Filtering") — observed `2026-08-06T23:22:50Z`. Backs on-demand
  OAuth scope challenges and the distinction from PAT scope handling.
- `https://github.com/github/github-mcp-server/blob/main/docs/policies-and-governance.md`
  ("Policies & Governance for the GitHub MCP Server") — observed
  `2026-08-06T23:22:50Z`. Backs GitHub Enterprise Cloud availability,
  GitHub Enterprise Server exclusion, OAuth app restrictions, SSO overlay,
  third-party host governance, native permission boundaries, and PAT policy
  behavior.
- `https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/README.md`
  ("GitHub MCP Server Installation Guides") — observed
  `2026-08-06T23:22:50Z`. Corroborates the hosted URL, OAuth/PAT host support,
  official Docker image, and the requirement that OAuth-capable hosts
  register an app.
- `https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app`
  ("Creating an OAuth app") — observed `2026-08-06T23:22:50Z`. Backs personal
  or organization ownership, administrative access, the GitHub navigation
  path, **New OAuth App** alternate label, exact registration fields,
  one-callback limit, public-information warning, and **Register
  application**.
- `https://docs.github.com/en/account-and-profile/how-tos/organization-membership/requesting-organization-approval-for-oauth-apps`
  ("Requesting organization approval for OAuth apps") — observed
  `2026-08-06T23:22:50Z`. Backs the requirement to authorize an OAuth app for
  a personal account before requesting organization approval, plus the
  **Integrations** sidebar section, **Applications**, the **Authorized OAuth
  Apps** tab, **Request access**, and **Request approval from owners**.
- `https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization`
  ("Approving OAuth apps for your organization") — observed
  `2026-08-06T23:22:50Z`. Backs the organization-owner role, organization
  **Settings** tab under the organization name, **Third-party Access** >
  **OAuth app policy**, **Review**, and **Grant access**.
- `https://docs.github.com/en/apps/oauth-apps/using-oauth-apps/authorizing-oauth-apps`
  ("Authorizing OAuth apps") — observed `2026-08-06T23:22:50Z`. Backs the
  authorization-time organization restriction, personal authorization,
  organization approval request, and active SAML-session requirement.
- `https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api?apiVersion=2026-03-10`
  ("Authenticating to the REST API") — observed `2026-08-06T23:22:50Z`.
  Backs the organization-owned app navigation path, **Client ID**,
  **Client secrets**, **Generate a new client secret**, secure credential
  role, and GitHub's fine-grained-PAT recommendation.
- `https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server`
  ("Setting up the GitHub MCP Server") — observed
  `2026-08-06T23:22:50Z`. Corroborates the hosted URL, default OAuth option,
  PAT alternative, authorization header form, and organization policy
  boundaries.
- `https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/enterprise-configuration`
  ("Configuring the GitHub MCP Server for GitHub Enterprise") — observed
  `2026-08-06T23:22:50Z`. Backs the tenant-specific remote URL for GitHub
  Enterprise Cloud with data residency and its separation from the standard
  URL documented here.
- `https://api.githubcopilot.com/mcp/` — unauthenticated endpoint observation
  at `2026-08-06T23:22:50Z`. Returned HTTP 401 with a Bearer challenge naming
  the protected-resource metadata URL.
- `https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/`
  — observed `2026-08-06T23:22:50Z`, re-observed `2026-09-30T21:30:00Z`. Backs the exact MCP resource,
  authorization-server locator, supported scopes, header bearer method, and
  resource name.
- `https://github.com/.well-known/oauth-authorization-server/login/oauth` —
  observed `2026-09-30T21:30:00Z`. Returned 200 with issuer
  `https://github.com/login/oauth`, authorization and token endpoints, no
  `registration_endpoint`, and no CIMD support. The suffix-form URL probed
  on 2026-08-06 still returns 404.
- Speakeasy MCP Catalog record
  `io.github.github/github-mcp-server` (title `GitHub`; source: `pulsemcp`) —
  observed `2026-08-06T23:22:50Z`. Backs catalog presence and the catalog-only
  add-server path.
- `doctrine/speakeasy-setup.md` — observed `2026-09-30T21:30:00Z` (gram main
  `68b3f78`). Backs the transcluded Speakeasy-side flow, fixed anchors, exact product labels,
  callback-template behavior, and closing-pointer form.
