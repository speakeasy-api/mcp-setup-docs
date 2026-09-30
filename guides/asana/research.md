---
research_version: 1
slug: asana
researched_at: "2026-08-06T23:24:28Z"
---

# Asana — Research Dossier

Source ruling for this guide: Asana's developer-docs page **Integrating
with Asana's MCP Server** is the primary source for the V2 MCP app flow,
endpoint, authentication, and distribution labels. **Manage your app**
supplies the transition from Asana's main app to the developer console.
The Help Center's app-management and admin-console articles supply the
Enterprise+ admin governance gate and its complete navigation path. Live
endpoint metadata corroborates the server and OAuth facts. The older V1
server is outside this guide.

## Server facts

- **Remote URL:** `https://mcp.asana.com/v2/mcp`.
- **Transport:** `streamable-http`. Asana calls this **Streamable HTTP**
  and says V2 consolidates all traffic at the remote URL.
- **Authentication Option:** OAuth 2.0 authorization code with PKCE
  (`S256`) and a manually pre-registered Asana **MCP app**. The
  Speakeasy AI Control Plane needs the generated **Client ID** and
  **Client secret**. Dynamic client registration is not supported.
- **OAuth discovery:** Asana publishes protected-resource metadata at
  `https://mcp.asana.com/.well-known/oauth-protected-resource/v2` and
  authorization-server metadata at
  `https://app.asana.com/.well-known/oauth-authorization-server`.
  The latter advertises authorization, token, and revocation endpoints,
  authorization-code and refresh-token grants, `client_secret_post` and
  `client_secret_basic`, and PKCE method `S256`; it has no dynamic
  registration endpoint.
- **Scope:** only `default`. The integration guide says MCP apps do not
  require specific scopes: use `default` or omit `scope`.
  Its Common issues section more narrowly says an explicit `scope`
  parameter can produce **Invalid scope(s) requested** and should be
  removed. The live resource metadata advertises `default`.
- **Access model:** authorization is user-based. Every MCP action appears
  as the user who authorized it, and access is limited to that user's
  existing Asana permissions. An authorization can use any MCP tool
  available then or added later; there is no tool-by-tool scope selection.
  The user selects one workspace while authorizing, and an MCP session can
  access only that workspace.
- **Token separation:** tokens issued to an MCP app work only with the MCP
  Server, not the standard Asana API.
- **Availability:** V2 is generally available. No plan gate is documented
  for creating an MCP app or using V2.
- **Speakeasy MCP Catalog:** present. The matched registry record is
  `com.pulsemcp.mirror/asana-mcp`, titled **Asana**, so this Guide uses
  only the catalog add-server path.
- **Organization governance gate:** the MCP client app must not be blocked
  by the user's organization. On Enterprise+ and Legacy Enterprise,
  organization super admins can use Asana App management to allow, block,
  or require approval for individual V2 MCP clients. Division admins and
  non-super-admins cannot access App management. This governs whether
  users can authorize the app; it is not required merely to create the
  developer app. Other tiers do not have the self-service App management
  feature documented by the Help Center.

## Credential flow

What gets created: an **MCP app** in Asana's developer console. Asana
generates a **Client ID** and **Client secret**. The app's **OAuth** page
holds those credentials and the redirect URL.

The app creator needs an Asana account, access to the developer console,
and membership in every workspace selected under **Specific workspaces**.
Asana's public docs do not state that an organization-admin role is needed
to create an app.

Values the Speakeasy AI Control Plane needs:

| Value | Origin |
| --- | --- |
| Client ID | Generated when the MCP app is created; shown for the app and on its **OAuth** page ({#create-mcp-app}) |
| Client secret | Generated when the MCP app is created; shown for the app and on its **OAuth** page ({#create-mcp-app}) |

Paste `{{ gram.oauth.callback_url }}` into the app's **Redirect URL**
setting on the **OAuth** page ({#configure-oauth-redirect}). Asana requires
the redirect URL in the app settings to match the URL in the authorization
request exactly. The only scope value is `default`.

Before users connect, set the app's **Distribution method**. For an
internal deployment, **Specific workspaces** limits authorization to the
selected workspaces; the app creator can select only workspaces they
belong to. **Any workspace** permits users from any Asana workspace to
authorize the app. Publication in Asana's App Directory is a separate,
optional process and is not part of setup.

## Console walkthrough

The documented path is Asana main app > profile photo > **Settings** >
**Apps** > **View developer console**. The direct entry URL is
`https://app.asana.com/0/my-apps`. The developer-console sequence is
**Create new app** > create app > **OAuth** > **Manage distribution**.

### Open the developer console {#open-developer-console}

- Sign in to Asana and open `https://app.asana.com/0/my-apps`.
- Documented in-product path: click the profile photo in the top-right
  corner, then select **Settings** > **Apps** > **View developer
  console**.
- This opens the developer console, where apps and personal access tokens
  are managed. Stay in the app area; a personal access token is not used
  for this MCP Server.
- Values entered or copied: none.
- Screenshot note: the Asana **Apps** settings page with **View developer
  console** visible, followed by the developer console with **Create new
  app** visible.

### Create the MCP app {#create-mcp-app}

- Click **Create new app**.
- Enter a recognizable app name, such as `Speakeasy AI Control Plane`.
  Asana's general OAuth documentation says users see this name when the
  app requests account access.
- Select **MCP app** as the app type.
- Click **Create app**.
- The resulting app view shows the **Client ID** and **Client secret**.
  Copy both into an approved password manager for entry in the Speakeasy
  AI Control Plane. The general OAuth documentation also says the app's
  **OAuth** tab includes both values.
- Values entered: app name and **MCP app** type. Values copied:
  **Client ID** and **Client secret** for
  {#connect-speakeasy-credentials}.
- Screenshot note: the creation screen immediately before **Create app**,
  with the app name and **MCP app** type visible. Do not capture generated
  credential values.

### Configure the OAuth redirect {#configure-oauth-redirect}

- From the created app, click **OAuth** in the left sidebar.
- Under **Redirect URLs**, click **+ Add redirect URL**. In the **Add
  redirect URL** dialog, enter `{{ gram.oauth.callback_url }}`, then
  click **Add**. It is the callback URL where Asana sends the
  authorization result.
- The redirect URL must match exactly when the connection is authorized.
- Values entered: `{{ gram.oauth.callback_url }}` in **Redirect URL**.
  Values copied: none.
- Screenshot note: the app's **OAuth** page with the **Redirect URL**
  setting visible and credential values excluded or redacted.

### Configure workspace distribution {#configure-workspace-distribution}

- From the same app, click **Manage distribution** in the left sidebar.
- Under **Distribution method**, choose:
  - **Specific workspaces** for an internal deployment limited to named
    workspaces. Add at least one intended workspace; only workspaces the
    app creator belongs to are available.
  - **Any workspace** only when the app should be authorizable from any
    Asana workspace.
- If using **Specific workspaces**, add every workspace whose users should
  connect. Asana's sharing documentation describes selecting **+ Add
  workspace**, choosing a workspace from the dropdown, and selecting
  **Add**.
- Click **Save changes** after the distribution selection is complete.
- Values entered: distribution method and, for **Specific workspaces**,
  workspace selections. Values copied: none.
- Screenshot note: **Manage distribution** with **Distribution method**
  and the two choices visible; for the internal path, also show the
  selected workspace list without exposing unrelated organization data.
- Plan/permission caveat at authorization time: if the organization uses
  Enterprise+ or Legacy Enterprise App management, an organization super
  admin must ensure this V2 client is allowed under the organization's app
  policy before users authorize it.
- If authorization says the app is explicitly blocked: as an
  organization super admin, return to Asana, click the profile photo, and
  select **Admin console** > **Apps** > **Manage apps** > **Connected
  apps**. Select the associated MCP client app, then click **Unblock**.
  Division admins and non-super-admins cannot perform this action.
- Screenshot note for the conditional unblock: **Connected apps** with
  the selected app's **Unblock** control; exclude user activity and
  unrelated apps.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram main `68b3f78`),
observed `2026-09-30T21:30:00Z`.

Per-guide values:

- Remote URL: `https://mcp.asana.com/v2/mcp` (shared, not tenanted)
- Add-server path: catalog only (**From the catalog**), resolved by the
  Speakeasy MCP Catalog record `com.pulsemcp.mirror/asana-mcp`.
- Authentication Option: `oauth-mcp-app`, mapped to **User Identity**.
  **Client ID** and **Client secret** come from {#create-mcp-app}; the
  redirect `{{ gram.oauth.callback_url }}` is registered at
  {#configure-oauth-redirect}.
- Probe outcome (2026-09-30): an unauthenticated JSON-RPC `initialize` POST
  returned 401 with `resource_metadata=
  "https://mcp.asana.com/.well-known/oauth-protected-resource/v2"`.
- PRM issuer: `https://app.asana.com`. PRM `scopes_supported`: `default`.
- Issuer metadata: `https://app.asana.com/.well-known/oauth-authorization-server`
  (issuer matches the PRM byte for byte) advertises no
  `registration_endpoint` and no `client_id_metadata_document_supported`.
  Neither CIMD nor DCR is available.
- Registration choice: **Manual**. The dashboard defaults to **Manual** here
  because nothing automatic is advertised. Creation with **User Identity**
  cannot register a client, so the server is kept **Disabled** and the
  result points to **Settings > Identity**; the guide says this is expected
  and ends with **Server Availability**.
- Scope string for **Advanced > Scope**: `default`. Asana's integration
  guide says to use `default` or omit `scope`; its Common issues section
  says other scope values produce "Invalid scope(s) requested". A blank
  **Scope** would request the PRM list, which is also only `default`.
- Further reading: `https://developers.asana.com/docs/using-asanas-mcp-server`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **From
the catalog**. On the **MCP Catalog** page, find **Asana** using **Search
MCP servers...**, open its catalog entry, and click **Add**. In **Add to
Project**, select **User Identity** under **Identity** (the dialog
preselects **No Identity** unless the entry supports client registration),
then click **Add to Project**. Finish or **Skip for now** any
**Guardrails** step. Because Asana needs a hand-registered client, the
result says to finish setup in **Settings > Identity** and the server stays
**Disabled**.

Screenshot note: Asana's catalog entry in **Add to Project** with **User
Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

In the server's **Settings**, open the **Identity** section and select
**User Identity**. In **Choose an identity provider**, confirm
`https://app.asana.com` (badged **Will be created** when new), or choose it
with **Search identity providers…**. Choose **Manual**, paste the **Client
ID** and **Client secret** from {#create-mcp-app} (Asana requires the
secret despite the "Optional" placeholder), enter `default` under
**Advanced > Scope**, and click **Save**. This surface shows no redirect
URI; {#configure-oauth-redirect} carries the callback check. Then open
**Danger Zone > Server Availability** and turn on **Enable MCP server** so
it shows **Enabled**.

Screenshot note: **Settings > Identity** with **User Identity**, the
`app.asana.com` provider, and **Manual** selected; credential values
redacted.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Asana's MCP documentation at
https://developers.asana.com/docs/using-asanas-mcp-server."

## Open questions

- Public docs do not state which Asana account permission, if any, gates
  app creation in the developer console. They establish only that the app
  creator must belong to a workspace to add it under **Specific
  workspaces**.
- The integration page documents protected-resource metadata at
  `https://mcp.asana.com/v2/.well-known/oauth-protected-resource`, which
  returned 404 this run and again on 2026-09-30. The live MCP challenge points to
  `https://mcp.asana.com/.well-known/oauth-protected-resource/v2`, which
  returned valid metadata naming the exact MCP resource. This discrepancy
  does not change the browser setup path and should be rechecked during
  fidelity review.

## Provenance

Source inventory from the sweep:

- **Developer documentation — `developers.asana.com`:** primary MCP,
  OAuth, developer-console, and app-distribution documentation. Its
  `/llms.txt` index was available and was searched before fetching the
  relevant pages.
- **Product/admin Help Center — `help.asana.com`:** account navigation
  and organization App management. Targeted Help Center search and direct
  article fetches were used.
- **Asana Forum — `forum.asana.com`:** official V2 GA changelog post,
  used to corroborate V2 status, Streamable HTTP, and workspace-scoped
  authorization.
- **Marketing site — `asana.com`:** targeted MCP search found no setup
  page needed for this Guide; not drawn from.

Sources drawn from:

- `https://developers.asana.com/docs/integrating-with-asanas-mcp-server`
  ("Integrating with Asana's MCP Server") — observed
  `2026-08-06T23:24:28Z`. Backs V2 GA status, endpoint, OAuth/manual
  registration, **Create new app** flow, **MCP app** type, generated
  credentials, **OAuth** and **Redirect URL**, **Manage distribution**,
  **Distribution method**, **Specific workspaces**, **Any workspace**,
  **Save changes**, the requirement to select at least one workspace when
  using **Specific workspaces**, no MCP scopes, user-permission model, token
  separation, and the documented discovery URLs.
- `https://developers.asana.com/docs/using-asanas-mcp-server` ("Using
  Asana's MCP Server") — observed `2026-08-06T23:24:28Z`. Backs endpoint,
  Streamable HTTP, user authorization, the requirement that the client app
  not be blocked, and Enterprise+/Legacy Enterprise app-management
  availability.
- `https://developers.asana.com/docs/manage-and-share-your-app` ("Manage
  your app") — observed `2026-08-06T23:24:28Z`. Backs direct developer
  console URL and main-app navigation: profile photo > **Settings** >
  **Apps** > **View developer console**.
- `https://developers.asana.com/docs/share-your-app` ("Share your app")
  — observed `2026-08-06T23:24:28Z`. Backs private-by-default app
  behavior, membership requirement for **Specific workspaces**, **+ Add
  workspace**, workspace dropdown and **Add**, and **Any workspace**
  semantics.
- `https://developers.asana.com/docs/oauth` ("OAuth") — observed
  `2026-08-06T23:24:28Z`. Backs visibility of **Client ID** and **Client
  secret** on the **OAuth** tab, the official console screenshot showing
  **Redirect URLs** and **+ Add redirect URL**, exact-match redirect
  requirement, app-name visibility to authorizing users, and OAuth
  endpoint semantics.
- `https://developers.asana.com/docs/connecting-mcp-clients-to-asanas-v2-server`
  ("Connecting Coding Clients to Asana's V2 server") — observed
  `2026-08-06T23:24:28Z`. Corroborates V2 endpoint, OAuth pre-registration,
  required client ID/secret, Streamable HTTP, and exact redirect matching.
- `https://help.asana.com/s/article/app-management-and-integrations?language=en_US`
  ("App management and integrations") — observed
  `2026-08-06T23:24:28Z`. Backs Enterprise+/Legacy Enterprise gate,
  super-admin-only App management, **Apps** > **Manage apps** >
  **Connected apps**, app selection and **Unblock**, allow/block/approval
  modes, and division-admin/non-super-admin exclusion.
- `https://help.asana.com/s/article/what-is-the-admin-console?language=en_US`
  ("What is the admin console?") — observed `2026-08-06T23:24:28Z`.
  Backs profile photo > **Admin console** and the **Apps** tab.
- `https://help.asana.com/s/article/api?language=en_US` ("API") —
  observed `2026-08-06T23:24:28Z`. Corroborates the profile/settings/apps
  route into developer app management.
- `https://forum.asana.com/t/new-v2-mcp-server-now-generally-available/1122647`
  ("V2 MCP server now generally available") — observed
  `2026-08-06T23:24:28Z`. Backs V2 GA status, self-service
  pre-registration, Streamable HTTP, and one-workspace-per-session
  authorization.
- `https://mcp.asana.com/v2/mcp` — direct unauthenticated JSON-RPC
  observation at `2026-08-06T23:24:28Z`. Returned HTTP 401 with a Bearer
  challenge naming resource metadata at
  `https://mcp.asana.com/.well-known/oauth-protected-resource/v2`.
- `https://mcp.asana.com/.well-known/oauth-protected-resource/v2` —
  observed `2026-08-06T23:24:28Z`. Backs resource
  `https://mcp.asana.com/v2/mcp`, authorization server
  `https://app.asana.com`, `default` scope, header bearer method, and
  official resource documentation.
- `https://app.asana.com/.well-known/oauth-authorization-server` —
  observed `2026-08-06T23:24:28Z`. Backs OAuth endpoints, supported
  grants, client-secret authentication methods, and PKCE `S256`; no
  dynamic registration endpoint is advertised.
- Speakeasy MCP Catalog record
  `com.pulsemcp.mirror/asana-mcp` (title **Asana**) — observed
  `2026-08-06T23:24:28Z`, `source: pulsemcp`. Backs catalog presence and
  the catalog-only add-server path.
- `doctrine/speakeasy-setup.md` — observed `2026-09-30T21:30:00Z` (gram
  main `68b3f78`). Backs the transcluded Speakeasy-side flow, fixed
  anchors, exact product labels, callback-template behavior, and
  closing-pointer form.
- Live re-probe on `2026-09-30T21:30:00Z` of `https://mcp.asana.com/v2/mcp`,
  its PRM, and `https://app.asana.com/.well-known/oauth-authorization-server`
  confirmed the 401 challenge, issuer, `default` scope, and absence of
  registration and CIMD support recorded above.
