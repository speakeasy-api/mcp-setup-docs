---
research_version: 1
slug: x
researched_at: 2026-11-13T01:09:36Z
---

# X — Research Dossier

## Revalidation 2026-11-13

The catalogue worker revalidated this Guide for Linear GRW-449; the factory
pipeline did not redraft it. The Guide was first researched
2026-08-06T23:21:18Z and partly re-verified 2026-09-30.

- **Re-fetched and compared:** all ten `docs.x.com` and xurl sources in
  Provenance, unauthenticated probes of the remote URL and its OAuth
  metadata, `doctrine/speakeasy-setup.md`, and the Speakeasy dashboard source
  at `speakeasy-api/gram` main `af2eebf06a02239c680c251584fc2ac1adad24a1`
  (2026-11-12).
- **Unchanged:** the remote URL, transport, app-only Bearer route, read-only
  limitation, no DCR or CIMD, enrollment and app-creation steps, one-time
  credential display, regeneration, and the credits prerequisite. External
  setup needed no wording change.
- **Changed upstream:** the PRM and issuer metadata now advertise more scopes
  (recorded under Speakeasy setup). This does not affect the app-only Guide.
- **Changed in Speakeasy:** gram #7296 (2026-10-08) renamed the **No
  Identity** mode to **Manual**. gram #8037 (2026-10-29) renamed **Service
  Account** to **Shared credential**, with format groups **Static
  credential** (**Bearer**, **Basic**, **Manual**) and **Service account**.
  gram #8250 (2026-10-28) replaced the **Server added successfully** banner
  and **Configure MCP settings** with an **Added to your project** card that
  links to the server with **View server**, and changed the Guardrails step's
  dismiss control to **Skip**. `speakeasy.md` now uses the current labels.
  `doctrine/speakeasy-setup.md` still carries the old ones and needs a
  human-approved refresh.
- **Not re-checked:** the Speakeasy MCP Catalog record
  `com.pulsemcp.mirror/xdevplatform-xmcp`. This run had no catalog or Pulse
  access (the public Pulse API needs a key), so its observation stays at
  2026-09-30. The live authenticated X Developer Console and a live Speakeasy
  dashboard were not used; labels come from public docs and product source.

## Server facts

- **Remote URL:** `https://api.x.com/mcp`.
- **Transport:** hosted Streamable HTTP. X documents MCP protocol version
  `2025-06-18` and server information name `xmcp`.
- **Authentication options exposed by X:**
  - **App-only Bearer Token:** connect directly to the remote URL with an
    `Authorization: Bearer <token>` header. This has no user context and is
    limited to read-only endpoints. This is the Authentication Option selected
    for this Guide because it can be presented directly by a hosted Speakeasy
    source.
  - **OAuth 2.0 user context through `xurl mcp`:** full access, including
    writes and user-context operations, requires X's local
    `@xdevplatform/xurl` stdio bridge. The bridge uses an X developer app's
    `CLIENT_ID` and `CLIENT_SECRET`, performs Authorization Code with PKCE,
    injects and refreshes Bearer tokens, and relays to the hosted URL. The
    default registered callback is `http://localhost:8080/callback`. X's MCP
    page still states that the server does not advertise native MCP OAuth
    discovery and that there is no dynamic client registration. Live probes
    on 2026-09-30 and 2026-11-13 show the first half is stale: `https://api.x.com/mcp`
    answers 401 with a `resource_metadata` challenge, and the protected-resource
    metadata names issuer `https://api.x.com` (authorize
    `https://x.com/i/oauth2/authorize`, token
    `https://api.x.com/2/oauth2/token`). That issuer advertises neither a
    `registration_endpoint` nor CIMD, so no client can be registered
    automatically. X documents only the local `xurl` bridge for user-context
    OAuth, and does not document a hosted-client callback. This Guide
    therefore documents the app-only Bearer Token and does not ask for Client
    ID or Client Secret.
- **Authorization behavior:** an app-only token provides public-data reads
  only and cannot act as a user. X describes the hosted server as spanning
  search, users, bookmarks, trends, news, and Articles, but user-context
  operations and writes—including bookmark changes and drafting or publishing
  Articles—require the excluded `xurl` OAuth route. The advertised runtime
  tool list is the source of truth; this Dossier does not catalog tools.
- **Optional read-only mode (not rendered):** X's MCP page now documents
  `?read_only=true` on the MCP URL, which limits the offered tools to read
  tools. It is optional and not needed for first connection. The Guide keeps
  the catalog's `https://api.x.com/mcp` URL.
- **Account and billing gates:** setup requires an X account accepted into the
  Developer Platform and an X developer app. The current X API is
  pay-per-usage, and API credits are required before connecting. Use the
  billing and credits area of the Developer Console to obtain and monitor
  credits; X does not publish a stable click-through purchase flow. API
  requests are blocked when the credit balance is zero or negative. Current
  endpoint prices and limits belong in X's live pricing page, not this Guide.
- **Credential safety:** X calls tokens passwords. X's getting-access and
  Developer Console documentation warn that generated credentials are shown
  once; copy the Bearer Token while it is displayed and save it immediately
  in a password manager or secure vault.

## Credential flow

The selected flow creates an X developer app and obtains its app-only
**Bearer Token**. The administrator needs an X account, authority to accept the
Developer Agreement and describe the organization's API use, and access to the
organization's secure credential store. The X developer account must also have
API credits available through the Developer Console's billing and credits
area. The app and API consumption belong to that account's pay-per-usage
billing.

Value the Speakeasy AI Control Plane needs:

| Value | Origin | Speakeasy destination |
| --- | --- | --- |
| Bearer Token | Generated for the new X app and shown with its credentials ({#copy-bearer-token}) | **Shared credential** identity, **Static credential** format **Bearer**, field **Token** (raw token; **Prefix** defaults to `Bearer`, and Speakeasy sends `Bearer <token>` as the `Authorization` header) |

There is no provider callback field in this app-only flow, so
`{{ gram.oauth.callback_url }}` is not used. The OAuth callback
`http://localhost:8080/callback` belongs only to the excluded local `xurl`
route and must not be substituted into this Guide.

## Console walkthrough

### Enroll in the X Developer Platform {#enroll-developer-account}

- Entry: go to `https://console.x.com` and sign in with the X account that
  will own the developer app.
- For a first-time developer account, review and accept the Developer
  Agreement and Policy, then provide the requested information about how the
  organization will use the API. X's public documentation does not publish the
  exact field or final submission labels.
- Transition: successful enrollment opens the **Developer Console**
  dashboard, where the next documented control is **New App**.
- Values entered: X sign-in credentials and organization-specific API-use
  information. Obtain the use-case wording from the application or cloud
  security owner when needed. Values copied: none.
- Screenshot note: the Developer Console dashboard after enrollment, with
  **New App** visible. Do not capture account identifiers.

### Create an X app {#create-x-app}

- On the Developer Console dashboard, click **New App**.
- Enter an app name, description, and use case. X does not prescribe their
  values; use organization-approved values.
- Before submitting, have the organization's password manager or secure vault
  ready. X displays the generated credentials only once.
- Submit the form to create the app. The exact create/submit control label is
  not published in the public documentation.
- Transition: X generates the app's API keys and tokens and displays its
  credentials. The next step copies the **Bearer Token** from that generated
  credential view.
- Values entered: organization-approved app name, description, and use case.
  Values copied: none yet.
- Screenshot note: the new-app form showing the app name, description, and
  use-case fields, with entered organization details redacted if necessary.

### Copy the Bearer Token {#copy-bearer-token}

- While the generated credential view is open, copy **Bearer Token** into the
  organization's password manager or secure vault. X identifies this as the
  app-only credential for reading public data. This is a copy-now step; do not
  leave the view before saving the token.
- Destination: later paste this token into **Token** under the **Shared
  credential** identity with the **Bearer** format in the Speakeasy AI Control
  Plane.
- Recovery: if the generated credential view was closed before the token was
  saved, reopen the app from the Developer Console dashboard, open **Keys and
  tokens**, and select **Regenerate** for the **Bearer Token**. Regeneration
  replaces the existing token. Save the newly displayed token before leaving
  the view. X's MCP page calls this the app's "Keys and tokens" page, and its
  OAuth page refers to the app's Keys and Tokens section; the xurl README
  shows a `Keys & Tokens` tab. The Guide keeps **Keys and tokens** from the
  primary MCP page. X documents regeneration as a verb ("regenerate"), not as
  a quoted button label.
- Screenshot exception: the only useful state contains a live secret; do not
  capture the credential value.

## Speakeasy setup

Per-guide values rendered into the canonical
`doctrine/speakeasy-setup.md` skeleton (gram `main` `68b3f78`), with labels
re-checked against gram `main` `af2eebf` (2026-11-12). Where the two differ,
the product source governs:

- Provider: X.
- Remote URL: `https://api.x.com/mcp` (shared public endpoint; not tenanted).
- Add-server path: `speakeasy_add_server: catalog`. The Speakeasy MCP Catalog
  search for `X` on 2026-09-30 returned `com.pulsemcp.mirror/xdevplatform-xmcp`,
  title `X`. Render only the catalog path; enter `X` in the catalog search
  box.
- Authentication Option: app-only Bearer Token (`api_key` in Metadata) →
  identity mode **Shared credential** (the doctrine's **Service Account**,
  renamed in gram #8037), **Static credential** format **Bearer**.
- Credential origin: **Bearer Token** from {#copy-bearer-token}, pasted raw
  into **Token**. The **Bearer** format shows a **Prefix** field that
  defaults to `Bearer` (`EMPTY_AGENT_CREDENTIAL` in
  `lib/remote-identity/model/credential.ts`), and the header value is
  `<Prefix> <Token>` (`drafts/useCredentialDraft.ts`). The reader leaves
  **Prefix** at `Bearer` and must not type the prefix into **Token** (that
  produces `Bearer Bearer <token>`).
- Probe outcome (2026-09-30, re-run 2026-11-13 with the same result):
  `POST https://api.x.com/mcp` `initialize` without credentials → 401 with
  `WWW-Authenticate: Bearer resource_metadata="https://api.x.com/.well-known/oauth-protected-resource"`.
- PRM issuer: `https://api.x.com`; `bearer_methods_supported`: `header`.
  PRM `scopes_supported` on 2026-11-13: `tweet.read tweet.write users.read
  users.email follows.read space.read mute.read like.read list.read
  list.write block.read block.write bookmark.read bookmark.write dm.read
  dm.write calls.read calls.write broadcast.read broadcast.write
  developer.billing.write developer.write media.write offline.access`. That
  adds `tweet.write`, `users.email`, `calls.read`, `calls.write`,
  `broadcast.read`, `broadcast.write` and `media.write` to the 2026-09-30
  list. Not used by this Guide.
- Issuer metadata (`https://api.x.com/.well-known/oauth-authorization-server`,
  2026-11-13): authorize `https://x.com/i/oauth2/authorize`, token
  `https://api.x.com/2/oauth2/token`, token auth methods `none` and
  `client_secret_basic`, code challenge method `S256`, grant types
  `authorization_code` and `refresh_token`. Its `scopes_supported` also lists
  `ads.read` and `ads.write`. No `registration_endpoint`, no
  `client_id_metadata_document_supported`. Not used by this Guide.
- Registration choice: not applicable (Shared credential, no OAuth client).
- Scope string: not applicable.
- Identity default at creation: the catalog dialog preselects **User
  Identity** only when the entry supports OAuth client registration; X does
  not, so the dialog starts on **Manual** (the doctrine's **No Identity**,
  renamed in gram #7296). The Guide tells readers to select **Shared
  credential** explicitly.
- Add-dialog flow at gram `af2eebf` (`pages/catalog/AddServerDialog.tsx`,
  `pages/catalog/CatalogGuardrailsPhase.tsx`): the configure step's primary
  button reads **Add to Project**, or **Continue** when a Guardrails step is
  offered (feature-flagged and limited to organization admins). The
  Guardrails step offers **Skip** and **Add to Project**. On success the
  dialog is titled **Added to Project** and shows a card reading **Added to
  your project** with **View server**, which opens the server. **Server added
  successfully** and **Configure MCP settings** no longer exist (gram #8250).
- Server Availability: a Shared credential entered at creation leaves the
  server enabled (`configureCreatedIdentity.ts`). A server created without it
  is held **Disabled** ("Added, but disabled until identity is set up." with
  **Finish setup**), and saving the identity later does not enable it. So
  {#connect-speakeasy-credentials} ends with the conditional **Settings >
  Danger Zone > Server Availability** step: turn on **Enable MCP server**,
  then confirm with **Continue** in the **Enable MCP server?** dialog
  (`DangerZoneSection.tsx`).
- Further-reading URL: `https://docs.x.com/tools/mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **From the
catalog**. On the **MCP Catalog** page, enter `X` in **Search MCP
servers...**, open the X catalog entry, and click **Add**. In the **Add to
Project** dialog, under **Identity**, select **Shared credential**. Under
**Static credential**, select **Bearer**, leave **Prefix** at `Bearer`, and
paste the Bearer Token from {#copy-bearer-token} into **Token** without a
`Bearer ` prefix. Speakeasy sends it as the `Authorization` header. Click
**Add to Project**; when the button reads **Continue**, click it, then on
the **Guardrails** step click **Skip**, or set up the guardrail and click
**Add to Project**. When the dialog shows **Added to your project**, click
**View server** to open the server.

Screenshot note: the X **Add to Project** dialog with **Shared credential**
and **Bearer** selected; redact the token.

### Connect your credentials {#connect-speakeasy-credentials}

Creation already configured the identity. To confirm it, or for an X server
created without the credential: open the server's **Settings**, find the
**Identity** section, select **Shared credential**, choose **Bearer** under
**Static credential** with **Prefix** left at `Bearer`, paste the raw Bearer
Token into **Token**, and click **Save**. If the server shows **Disabled**,
open **Settings > Danger Zone > Server Availability**, turn on **Enable MCP
server**, and click **Continue** to confirm, so it shows **Enabled**. Do not
add the token under **Custom Headers**.

Screenshot note: **Settings > Identity** with **Shared credential** and
**Bearer** selected; redact the token.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see X's MCP documentation at
`https://docs.x.com/tools/mcp`.

## Open questions

- X's public Developer Console documentation does not publish the exact field
  labels or final submit-button label in the first-time developer enrollment
  flow.
- X's public documentation says to enter an app name, description, and use
  case after clicking **New App**, but does not publish the exact field labels
  or the final create-button label.
- X's pages disagree on the create-app control. Getting Access and Developer
  Console say **New App**; the Apps page says "Click Create App". The Guide
  keeps **New App**, which two pages name.
- X's MCP page sends app creation to the "X Developer Portal"
  (`developer.x.com`), while Getting Access, Developer Console, Apps and the
  xurl README use `console.x.com`. The Guide keeps `console.x.com`.
- X's MCP troubleshooting table and the xurl README document
  `client-forbidden` / `client-not-enrolled` after an OAuth login. The fix
  they give is to move the app to the **Pay-per-use** package and the
  **Production** environment (`Apps` → `Manage apps` → open the app → `Move
  to package`). Neither page says whether app-only Bearer requests can hit the
  same gate, so the Guide does not render it. Reviewers with a live X
  developer account could confirm whether a new app needs this step.

## Provenance

### Source inventory

- **Developer documentation:** `docs.x.com`, with machine-readable index at
  `https://docs.x.com/llms.txt`. The canonical docs host and raw Markdown
  pages were reachable during this run; current facts below use this property.
- **Developer product/admin documentation:** X's Developer Console at
  `https://console.x.com`, documented by the Developer Console, Getting
  Access, and Apps pages. The live authenticated console was not accessed.
- **Support KB:** `help.x.com` was identified and swept; no MCP-specific or
  more detailed Developer Console setup page was found. No facts were drawn
  from it.
- **Official open-source project:** `github.com/xdevplatform/xurl`, used to
  corroborate the local-bridge architecture and callback requirement. It is
  not a substitute for the primary MCP page.
- **Speakeasy product doctrine:** `doctrine/speakeasy-setup.md`, read locally and
  used only for the fixed Speakeasy-side flow and anchors.
- **Live endpoint probes:** the remote URL and its OAuth metadata, probed
  without credentials on 2026-09-30 and again on 2026-11-13.
- **Speakeasy product source:** `speakeasy-api/gram` main `af2eebf`
  (2026-11-12), `client/dashboard/src`, read to check the labels
  `doctrine/speakeasy-setup.md` carries.

### Fact sources

- `https://docs.x.com/tools/mcp.md` — observed
  `2026-11-13T01:09:36Z` (earlier observations `2026-08-06T23:21:18Z` and
  `2026-09-30T00:00:00Z`). Primary MCP source. Backs the X MCP URL, hosted
  Streamable HTTP transport, protocol/server information, direct app-only
  Bearer route, read-only limitation, `Authorization` header shape, the
  app's "Keys and tokens" page, local `xurl mcp` OAuth route, the documented
  (now stale) statement of no native MCP OAuth discovery, no dynamic
  registration, callback value, the server's search, users, bookmarks,
  trends, news, and Articles capability areas, the optional `read_only`
  parameter, and the `client-not-enrolled` troubleshooting row. Also supplies
  the further-reading URL.
- `https://docs.x.com/llms.txt` — observed `2026-11-13T01:09:36Z`. Backs the
  documentation-property sweep and discovery of the MCP, authentication,
  Developer Console, app, access, and pricing pages.
- `https://docs.x.com/x-api/getting-started/getting-access.md` — observed
  `2026-11-13T01:09:36Z`. Backs first-time developer enrollment (sign in at
  `console.x.com`, accept the Developer Agreement and Policy, provide API-use
  information), the 'New App' control, app name/description/use-case inputs,
  generated credentials, the Bearer Token's read-only purpose, the one-time
  display warning, and that regenerating invalidates the old credential.
- `https://docs.x.com/fundamentals/developer-portal.md` — observed
  `2026-11-13T01:09:36Z`. Backs the `console.x.com` entry, **New App** label,
  name and description inputs, generated-credential behavior, regeneration
  invalidating old credentials, secure storage, and the pay-per-usage billing
  and credit-purchase role of the console. The page does not name **Keys and
  tokens**; that label comes from the MCP page.
- `https://docs.x.com/fundamentals/developer-apps.md` — observed
  `2026-11-13T01:09:36Z`. Backs app credential types, OAuth 2.0 client types,
  callback behavior, and generated-credential warning. It says "Click Create
  App" where other pages say **New App** (see Open questions). Its general
  local callback guidance says to use `127.0.0.1`, while the MCP-specific X
  page and official xurl project require `http://localhost:8080/callback`;
  the MCP-specific value governs the excluded xurl route.
- `https://docs.x.com/fundamentals/authentication/overview.md` and
  `https://docs.x.com/fundamentals/authentication/oauth-2-0/application-only.md`
  — observed `2026-11-13T01:09:36Z`. Back the app-only model, no-user-context
  limitation, token secrecy ("Tokens are passwords"), and Bearer header
  presentation.
- `https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code.md`
  — observed `2026-11-13T01:09:36Z`. Backs X's Authorization Code with PKCE
  behavior, confidential-client Client ID/Secret, the app's Keys and Tokens
  section, refresh-token scope, and exact callback matching; used only to
  validate the excluded full-access route.
- `https://docs.x.com/x-api/getting-started/pricing.md` — observed
  `2026-11-13T01:09:36Z`. Backs the API-credit prerequisite, credits bought
  upfront in the Developer Console, and the blocking caveat (add credits
  before the balance reaches zero; requests are blocked while it is
  negative). Exact rates, spending limits, auto-recharge, free-credit offers
  and the purchase walkthrough are intentionally not carried into the Guide.
- `https://raw.githubusercontent.com/xdevplatform/xurl/main/README.md` —
  observed `2026-11-13T01:09:36Z`. Official xdevplatform repository. Backs the
  stdio-to-Streamable-HTTP bridge architecture, `CLIENT_ID` /
  `CLIENT_SECRET`, token caching and refresh, browser/headless behavior,
  default `http://localhost:8080/callback`, the `Keys & Tokens` tab label,
  and the package/environment enrollment fix.
- `https://api.x.com/mcp`, `https://api.x.com/.well-known/oauth-protected-resource`,
  and `https://api.x.com/.well-known/oauth-authorization-server` — live
  probes observed `2026-11-13T01:10:40Z` (first `2026-09-30T00:00:00Z`).
  Back the 401 `resource_metadata` challenge, the PRM issuer and scope list,
  the authorize and token endpoints, and the absence of DCR and CIMD.
- `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`) — re-read
  `2026-11-13T01:12:00Z`; unchanged since 2026-09-30. Backs the fixed
  {#add-server-in-speakeasy} and {#connect-speakeasy-credentials} anchors,
  the add-server navigation, resolved catalog path, the identity-at-creation
  rules, the Server Availability step, and closing pointer form. Its
  **Service Account**, **No Identity**, **Server added successfully** and
  **Configure MCP settings** labels are stale; see the next entry.
- `speakeasy-api/gram` main `af2eebf06a02239c680c251584fc2ac1adad24a1`
  (2026-11-12) — observed `2026-11-13T01:18:00Z`.
  `client/dashboard/src/components/app-sidebar.tsx`, `routes.tsx`,
  `pages/mcp/MCP.tsx`, `pages/mcp/add/AddMcpServer.tsx`,
  `pages/catalog/{Catalog.tsx,AddServerDialog.tsx,CatalogGuardrailsPhase.tsx}`,
  `lib/remote-identity/components/{IdentityModeCards.tsx,ServiceAccountPanel.tsx,CredentialFields.tsx}`,
  `lib/remote-identity/{model/credential.ts,drafts/useCredentialDraft.ts}`,
  `pages/sources/remote-mcp/configureCreatedIdentity.ts`, and
  `pages/mcp/x/tabs/settings/sections/{authentication/AuthenticationSection.tsx,authentication/RemoteMcpIdentitySection.tsx,DangerZoneSection.tsx}`.
  Backs every Speakeasy label in `speakeasy.md`, the **Prefix** default, the
  add-dialog flow, and the creation outcome.
- Speakeasy MCP Catalog record `com.pulsemcp.mirror/xdevplatform-xmcp`
  (title `X`) — observed `2026-09-30T00:00:00Z`, `source: pulsemcp`; not
  re-checked on 2026-11-13 (no catalog access). Backs catalog presence and
  the catalog-only add-server path.
