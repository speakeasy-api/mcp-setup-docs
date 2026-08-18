---
research_version: 1
slug: intercom
researched_at: 2026-08-18T20:24:38Z
---

# Intercom — Research Dossier

Source ruling for this revision: Intercom's public MCP guide remains
authoritative for regional server URLs, transport, and server availability.
Intercom's current Developer Hub guides are authoritative for creating an app,
enabling OAuth, exact permission labels, callback requirements, and the
authorization and token endpoints. The operator's current connection
validation overrides the prior DCR recommendation: DCR fails when Intercom has
not allowlisted the Speakeasy callback, so this Guide documents a manually
registered Intercom OAuth app as the recommended, deterministic path. The
operator's Speakeasy MCP Catalog result is `overridden-tenanted`; because the
reader chooses a region-specific remote URL, only the Custom remote server path
is rendered.

## Server facts

- **Remote URLs:** choose the endpoint matching the Intercom workspace:
  - US: `https://mcp.intercom.com/mcp`
  - EU: `https://mcp.eu.intercom.com/mcp`
  Intercom says `app.intercom.com` identifies a US-hosted workspace and
  `app.eu.intercom.com` identifies an EU-hosted workspace.
- **Region availability:** Intercom documents its MCP server for US- and
  EU-hosted workspaces. Australian-hosted workspaces are not supported.
  Requests to the EU endpoint are processed within the EU.
- **Transport:** `streamable-http`, called **Streamable HTTP** by Intercom and
  recommended over its deprecated SSE URLs.
- **Authentication Option documented by this Guide:** OAuth with a
  pre-registered Intercom Developer Hub app. The Speakeasy AI Control Plane
  receives the app's **Client ID** and **Client secret**. The US manual
  attachment flow was validated by the operator.
- **Why manual registration is recommended:** Intercom's live MCP
  authorization-server metadata advertises a DCR endpoint, but the operator
  observed that registration fails unless Intercom has allowlisted the
  callback `https://app.getgram.ai/mcp/remote_login_callback`. Manually
  registering the callback in the Developer Hub avoids that dependency.
  Organizations that prefer DCR can ask Intercom to allowlist the callback;
  Intercom does not publish a self-service allowlisting procedure or
  turnaround time.
- **OAuth redirect requirement:** Intercom requires HTTPS redirect URLs and
  allows more than one through **Add redirect URL**. Register
  `{{ gram.oauth.callback_url }}`; operator validation confirms that it
  resolves to `https://app.getgram.ai/mcp/remote_login_callback`.
- **Minimum permissions for the validated read-only setup:**
  - **Read and list users and companies**
  - **Read conversations**
  - **Read one admin**
  - **Read and List articles**
  These are exact Developer Hub checkbox labels, and each exists in Intercom's
  current OAuth-scope documentation. The operator validated this least-
  privilege set. Intercom's MCP guide instead broadly says **Read and write
  articles** is required because the server also advertises article creation
  and update operations. With the minimum set above, article write operations
  are intentionally unavailable; select **Read and Write Articles** instead
  only when the organization intends to permit those operations.
- **Authorization behavior:** the user sees the permissions requested by the
  app and, after approval, Intercom redirects to the registered callback with
  an authorization code. Actual access remains subject to that user's Intercom
  permissions.
- **Plan and role gates:** Intercom's public MCP and OAuth pages do not name an
  MCP-specific paid plan or exact administrator role. Its app-creation guide
  says apps are created in the Developer Hub and that public-app developers
  use a development workspace. The person following this Guide therefore
  needs access to the Developer Hub and permission to create an app for the
  intended workspace.
- **Other supported authentication:** Intercom's MCP server also supports a
  Bearer access token. This Guide does not use it because Intercom says a
  private-app Access Token is password-equivalent and must not be given to a
  third-party app provider.

## Credential flow

An Intercom administrator creates one app in the Developer Hub, enables OAuth,
registers the Speakeasy callback, and grants the minimum permissions. Intercom
then exposes a **Client ID** and **Client secret** on the app's **Basic
Information** page.

| Speakeasy value | Origin |
| --- | --- |
| Client ID | Intercom Developer Hub app, **Basic Information** ({#copy-client-credentials}) |
| Client Secret (optional) | Intercom Developer Hub app, **Basic Information** ({#copy-client-credentials}) |
| Redirect URI registered with Intercom | `{{ gram.oauth.callback_url }}` in the app's **Redirect URLs** ({#configure-oauth}) |

Intercom's OAuth guide calls the generated values `client_id` and
`client_secret`. It does not say the secret is shown only once, so no one-time
copy warning is warranted from public documentation.

## Console walkthrough

The transition-complete path starts at Intercom's documented Developer Hub URL.
The prior region-selection anchor remains stable because it still determines
which MCP Server URL the reader adds later.

### Identify the workspace region {#identify-workspace-region}

- Open the intended Intercom workspace and inspect its browser URL.
- If its host is `app.intercom.com`, record the US remote
  `https://mcp.intercom.com/mcp`.
- If its host is `app.eu.intercom.com`, record the EU remote
  `https://mcp.eu.intercom.com/mcp`.
- If its host is `app.au.intercom.com`, stop: Intercom says its MCP server is
  not supported for Australian-hosted workspaces.
- Recovery: if sign-in cannot find the workspace, return to Intercom's sign-in
  page and select the data-host region matching the workspace URL. Intercom's
  current sign-in page labels the selector **Your account region** and offers
  **United States**, **Europe**, and **Australia**.
- Screenshot note: capture the intended workspace URL with tenant-identifying
  path details obscured, or the sign-in page with **Your account region**
  expanded.

### Create the OAuth app {#create-oauth-app}

- Open `https://app.intercom.com/a/apps/_/developer-hub`. This opens the
  **Developer Hub** at **Your Apps**.
- Click **New App**. Intercom's prose uses **New App**; its current
  documentation screenshot describes the highlighted control as **Create new
  app**.
- In the modal, enter an organization-approved app name and select the
  workspace the connection will access.
- Click **Create app**. Intercom creates the app, pre-installs it in the
  selected workspace, and opens the app configuration.
- Screenshot note: capture **Your Apps** with the new-app control and the
  creation modal showing the app-name and workspace choices, with identifying
  values obscured.

### Configure OAuth {#configure-oauth}

- In the created app, open **Authentication**.
- Select **Use OAuth**. Intercom says this reveals **Redirect URLs** and
  **Permissions**.
- Under **Redirect URLs**, select **Add redirect URL**.
- Enter `{{ gram.oauth.callback_url }}`. Intercom
  requires HTTPS; this value resolves to the operator-validated callback
  `https://app.getgram.ai/mcp/remote_login_callback`.
- Under **Permissions**, select:
  - **Read and list users and companies**
  - **Read conversations**
  - **Read one admin**
  - **Read and List articles**
- If article creation or update through the MCP server is explicitly required,
  select **Read and Write Articles** instead of **Read and List articles**.
- Complete the page's save or confirmation control. Intercom's public guide
  names and shows the fields but does not name that control.
- Screenshot note: capture **Authentication** with **Use OAuth** enabled,
  **Redirect URLs** showing the callback, and the four minimum permission
  checkboxes selected. Do not include a token or secret.

### Copy the client credentials {#copy-client-credentials}

- From **Authentication**, open the app's **Basic Information** page.
  Intercom documents this page as the location of the `client_id` and
  `client_secret`.
- Copy the **Client ID** and **Client secret** into a password manager for the
  Speakeasy setup.
- Screenshot note: capture **Basic Information** with the locations of the
  **Client ID** and **Client secret**, with both values fully redacted.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md`, observed
`2026-08-18T20:24:38Z`.

Per-guide values:

- Remote URL: the US or EU URL selected in
  {#identify-workspace-region}
- Transport: `streamable-http`
- Add-server path: Custom remote only because both URLs are region-specific
  (`tenanted: true`); ignore catalog presence
- Authentication Option: OAuth with a pre-registered client
- Client ID and Client Secret: produced in
  {#copy-client-credentials}
- Redirect URI: registered in {#configure-oauth}
- Further reading:
  `https://developers.intercom.com/docs/guides/mcp`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On **Add a custom remote MCP server**, paste
the regional remote URL selected in {#identify-workspace-region} into
**Remote MCP server URL**, then click **Add server**. This creates the hosted
MCP server and opens its **Overview** page.

Screenshot note: capture the **Add Source** menu or the **Add a custom remote
MCP server** page with the matching Intercom remote URL.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually**. In **Attach Remote Identity Provider**:

1. Set **Client Type** to **Manual**.
2. Paste the **Client ID** and **Client Secret (optional)** from
   {#copy-client-credentials}.
3. Confirm that the sheet's **Redirect URI** matches the
   `{{ gram.oauth.callback_url }}` value registered in {#configure-oauth}.
4. Click **Attach Identity Provider**.

Screenshot note: capture **Attach Remote Identity Provider** with **Client
Type** set to **Manual** and the **Redirect URI** visible. Fully redact the
Client ID and Client Secret.

When a client first needs Intercom access, complete Intercom's browser
authorization prompts with the intended workspace account. Intercom says the
screen presents the requested permissions but does not publish the current
button labels.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see Intercom's MCP documentation at
https://developers.intercom.com/docs/guides/mcp."

## Open questions

- **App-creation field labels:** Intercom's public app-creation documentation
  requires an app name and workspace selection but does not publish the exact
  labels for those fields. The Guide must describe those inputs conceptually
  without inventing labels.
- **Intercom authorization-screen labels:** Intercom documents the browser
  authorization behavior but not the current sequence or exact approval-button
  labels. The Guide must direct the reader to complete the on-screen prompts
  without inventing labels.
- **OAuth page save control:** Intercom's public OAuth guide names and shows
  **Use OAuth**, **Redirect URLs**, **Add redirect URL**, and the permission
  checkboxes, but does not name the control that persists changes.
- **DCR allowlisting process:** prior operator validation established that DCR
  needs callback allowlisting, but Intercom publishes no request path,
  eligibility rule, or turnaround time. Manual OAuth remains the recommended
  path.

## Provenance

Source inventory from the sweep:

- **Developer documentation — `developers.intercom.com`:** primary MCP,
  Developer Hub, authentication, and OAuth-scope documentation.
  `https://developers.intercom.com/llms.txt` exists and was searched.
- **Product/admin support — `www.intercom.com/help/en`:** current regional
  hosting documentation. Its `/help/en/llms.txt` property is not published.
- **Intercom application — `app.intercom.com`:** public sign-in and Developer
  Hub entry URLs; authenticated configuration was not live-probed.
- **Official GitHub documentation mirror —
  `github.com/intercom/intercom-mcp-server`:** found in the prior sweep but
  not used because its README was stale relative to the live MCP guide.
- **Speakeasy setup doctrine — `doctrine/speakeasy-setup.md`:** canonical
  Speakeasy-side flow and fixed anchors.

Sources drawn from:

- `https://developers.intercom.com/docs/guides/mcp` ("Model Context Protocol
  (MCP)") — observed `2026-08-18T20:24:38Z`. Backs US/EU URLs and availability,
  Australian exclusion, Streamable HTTP, OAuth and Bearer alternatives, the
  browser authorization behavior, and the public MCP page's broader
  **Read and write articles** recommendation.
- `https://developers.intercom.com/docs/build-an-integration/getting-started`
  and its `.md` representation — observed `2026-08-18T20:24:38Z`. Back the
  Developer Hub URL and **Your Apps**, **New App**, **Create app**, app-name,
  workspace-selection, and pre-install behavior.
- `https://developers.intercom.com/docs/build-an-integration/learn-more/authentication/setting-up-oauth`
  and its `.md` representation — observed `2026-08-18T20:24:38Z`. Back **Use
  OAuth**, **Authentication**, **Redirect URLs**, HTTPS, **Add redirect URL**,
  permissions, **Basic Information**, Client ID/secret, the regional US/EU
  authorization endpoints, callback behavior, and the Eagle token endpoint.
- `https://developers.intercom.com/docs/build-an-integration/learn-more/authentication/oauth-scopes`
  — observed `2026-08-18T20:24:38Z`. Backs exact permission labels and their
  access meanings.
- `https://developers.intercom.com/docs/build-an-integration/learn-more/authentication`
  — observed `2026-08-18T20:24:38Z`. Backs the private Access Token warning and
  OAuth-versus-token distinction.
- `https://developers.intercom.com/llms.txt` — observed
  `2026-08-18T20:24:38Z`. Backs developer-property sweep coverage.
- `https://www.intercom.com/help/en/articles/6124430-regional-data-hosting`
  ("Regional Data Hosting") — observed `2026-08-18T20:24:38Z`. Backs the
  workspace-host mapping and wrong-region sign-in recovery.
- `https://app.intercom.com/admins/sign_in` — observed
  `2026-08-18T20:24:38Z`. Backs the current region-selector labels.
- `https://mcp.intercom.com/.well-known/oauth-authorization-server` —
  observed `2026-08-18T20:24:38Z`. Prior observation established that the MCP
  issuer advertises DCR and separate `/authorize` and `/token` endpoints; an
  unauthenticated automated refresh this run returned HTTP 403, so that prior
  result is retained rather than replaced.
- Prior operator validation retained in the Guide and reviewed this run —
  observed `2026-08-18T20:24:38Z`. Backs DCR callback-allowlist failure, the
  recommended manual OAuth path, callback URL, the validated US
  issuer/authorization/token values, and the least-privilege permission set.
  The current OAuth guide's regional endpoint table was rechecked this run; it
  explicitly confirms the EU authorization endpoint as
  `https://app.eu.intercom.com/oauth`.
- `doctrine/speakeasy-setup.md` — observed `2026-08-18T20:24:38Z`. Backs the
  canonical Speakeasy skeleton, fixed anchors, exact common labels, and
  tenanted Custom-remote path selection.
