---
research_version: 1
slug: x
researched_at: 2026-07-24T23:32:15Z
---

# X — Research Dossier

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
    default registered callback is `http://localhost:8080/callback`. X states
    that the MCP Server does not advertise native MCP OAuth discovery and that
    there is no dynamic client registration. The Speakeasy AI Control Plane
    canonical flow hosts a remote Streamable HTTP source; it cannot run this
    local stdio bridge. Therefore this Guide does not offer the full OAuth
    route as a connectable Authentication Option and does not ask for Client ID
    or Client Secret.
- **Authorization behavior:** an app-only token provides public-data reads
  only and cannot act as a user. X describes the hosted server as spanning
  search, users, bookmarks, trends, news, and Articles, but user-context
  operations and writes—including bookmark changes and drafting or publishing
  Articles—require the excluded `xurl` OAuth route. The advertised runtime
  tool list is the source of truth; this Dossier does not catalog tools.
- **Account and billing gates:** setup requires an X account accepted into the
  Developer Platform and an X developer app. The current X API is
  pay-per-usage, and API credits are required before connecting. Use the
  billing and credits area of the Developer Console to obtain and monitor
  credits; X does not publish a stable click-through purchase flow. API
  requests are blocked when the credit balance is zero or negative. Current
  endpoint prices and limits belong in X's live pricing page, not this Guide.
- **Credential safety:** X calls tokens passwords. X's getting-access and
  Developer Console documentation warn that generated credentials are shown
  once; save the Bearer Token immediately in a password manager or secure
  vault.

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
| Bearer Token | Generated for the new X app and shown with its credentials ({#copy-bearer-token}) | Static secret value for the `Authorization` upstream header, prefixed with `Bearer ` |

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

- Before leaving the generated credential view, copy **Bearer Token** into the
  organization's password manager or secure vault. X identifies this as the
  app-only credential for reading public data.
- Destination: later enter this token in the Speakeasy AI Control Plane as the
  secret static value `Bearer <Bearer Token>` for an upstream header named
  `Authorization`.
- Screenshot exception: the only useful state contains a live secret; do not
  capture the credential value.

## Speakeasy setup

Per-guide values rendered into the canonical
`doctrine/speakeasy-setup.md` skeleton:

- Provider: X.
- Remote URL: `https://api.x.com/mcp`.
- Transport: `streamable-http`; the **Transport** field is read-only.
- Catalog status: not established by provider documentation. Render the
  canonical conditional: use the X entry if present; otherwise choose
  **Custom remote server** and supply the remote URL.
- Authentication Option: app-only Bearer Token (`api_key` in Metadata).
- Credential origin: **Bearer Token** from {#copy-bearer-token}.
- Upstream header: name `Authorization`; **Value source** **Static value**;
  value `Bearer <Bearer Token>`; mark **Secret**.
- Further-reading URL:
  `https://x-preview.mintlify.app/tools/mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If X is in the catalog: choose **3rd-party server**. On the **MCP Catalog**
  page, enter `X` in **Search MCP servers...**, open the result with **View**,
  click **Add**, then click **Add to Project** in the **Add to Project**
  dialog.
- If X is not in the catalog: choose **Custom remote server**. On
  **Add a custom remote MCP server**, paste `https://api.x.com/mcp` into
  **Remote MCP server URL**, then click **Add server**.

Either path creates the hosted MCP Server and opens its **Overview** page.

Screenshot note: capture the **Add Source** menu or the X catalog entry. Do
not include credentials.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Upstream Headers**,
click **Add header**. Enter `Authorization` as **Header name**, leave
**Value source** as **Static value**, paste
`Bearer <Bearer Token from copy-bearer-token>` as the value, check **Secret**,
then click **Save**. If a catalog install collects headers in the
**Add to Project** dialog instead, use its **Upstream headers** section with
the same name, value, and secret setting.

Screenshot note: capture the **Upstream Headers** editor with
`Authorization`, **Static value**, and **Secret** visible; redact the value.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see X's MCP documentation at
`https://x-preview.mintlify.app/tools/mcp`.

## Open questions

- X's public Developer Console documentation does not publish the exact field
  labels or final submit-button label in the first-time developer enrollment
  flow.
- X's public documentation says to enter an app name, description, and use
  case after clicking **New App**, but does not publish the exact field labels
  or the final create-button label.
- Provider documentation cannot establish whether X is currently present in
  the Speakeasy MCP Catalog; the canonical add-source conditional must remain
  until the catalog is observed.

## Provenance

### Source inventory

- **Developer documentation:** `docs.x.com`, with machine-readable index at
  `https://docs.x.com/llms.txt`. The canonical docs host returned HTTP 403 to
  this research fetch; the same official pages were available from X's
  Mintlify preview property at `https://x-preview.mintlify.app`.
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

### Fact sources

- `https://x-preview.mintlify.app/tools/mcp` — observed
  `2026-07-24T23:32:15Z`. Primary MCP source. Backs the X MCP URL, hosted
  Streamable HTTP transport, protocol/server information, direct app-only
  Bearer route, read-only limitation, `Authorization` header shape, local
  `xurl mcp` OAuth route, no dynamic registration or native MCP OAuth
  discovery, callback value, and the server's search, users, bookmarks, trends,
  news, and Articles capability areas. Also supplies the further-reading URL.
- `https://docs.x.com/llms.txt` (retrieved through the official index surfaced
  by X's preview property) — observed `2026-07-24T23:32:15Z`. Backs the
  documentation-property sweep and discovery of the MCP, authentication,
  Developer Console, app, access, and pricing pages.
- `https://x-preview.mintlify.app/x-api/getting-started/getting-access` —
  observed `2026-07-24T23:32:15Z`. Backs first-time developer enrollment,
  app creation inputs, generated credentials, the Bearer Token's read-only
  purpose, and the one-time display warning.
- `https://x-preview.mintlify.app/fundamentals/developer-portal` — observed
  `2026-07-24T23:32:15Z`. Backs the `console.x.com` entry, **New App** label,
  name and description inputs, generated-credential behavior, secure storage,
  and pay-per-usage console role.
- `https://x-preview.mintlify.app/fundamentals/developer-apps` — observed
  `2026-07-24T23:32:15Z`. Backs app credential types, OAuth 2.0 client types,
  callback behavior, and generated-credential warning. Its general local
  callback guidance says to use `127.0.0.1`, while the MCP-specific X page and
  official xurl project require `http://localhost:8080/callback`; the
  MCP-specific value governs the excluded xurl route.
- `https://x-preview.mintlify.app/fundamentals/authentication/overview` and
  `https://x-preview.mintlify.app/fundamentals/authentication/oauth-2-0/application-only`
  — observed `2026-07-24T23:32:15Z`. Back the app-only model, no-user-context
  limitation, token secrecy, and Bearer header presentation.
- `https://x-preview.mintlify.app/fundamentals/authentication/oauth-2-0/authorization-code`
  — observed `2026-07-24T23:32:15Z`. Backs X's Authorization Code with PKCE
  behavior, confidential-client Client ID/Secret, refresh-token scope, and
  exact callback matching; used only to validate the excluded full-access
  route.
- `https://x-preview.mintlify.app/x-api/getting-started/pricing` — observed
  `2026-07-24T23:32:15Z`. Backs the API-credit prerequisite, the Developer
  Console as the billing and credits locus, and the zero/negative balance
  blocking caveat. Exact rates and the purchase walkthrough are intentionally
  not carried into the Guide.
- `https://raw.githubusercontent.com/xdevplatform/xurl/main/README.md` —
  observed `2026-07-24T23:32:15Z`. Official xdevplatform repository. Backs the
  stdio-to-Streamable-HTTP bridge architecture, `CLIENT_ID` /
  `CLIENT_SECRET`, token caching and refresh, browser/headless behavior, and
  default `http://localhost:8080/callback`.
- `doctrine/speakeasy-setup.md` — observed `2026-07-24T23:32:15Z`. Backs the fixed
  {#add-server-in-speakeasy} and {#connect-speakeasy-credentials} anchors,
  exact Speakeasy labels, catalog/custom conditional, upstream-header flow,
  and closing pointer form.
