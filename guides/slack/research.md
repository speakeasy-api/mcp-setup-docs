---
research_version: 1
slug: slack
researched_at: 2026-09-17T00:05:11Z
---

# Slack — Research Dossier

## Source ruling

Official Slack documentation is authoritative for provider requirements. Public
pages and metadata were read on 2026-09-16; no authenticated workspace or consent
flow was exercised. The sample app's Bolt, OpenAI, event subscription, and local
server instructions are not prerequisites for a hosted remote MCP connection.
This guide supports either an existing internal app or creation from a minimal
JSON manifest. The manifest excludes unrelated sample-app bot features. The
operator explicitly requested this copy-paste configuration alternative.

### Sources

- **Manifest reference:** https://docs.slack.dev/reference/app-manifest/ —
  `display_information.name` (required, maximum 35 characters),
  `oauth_config.redirect_urls`, `oauth_config.scopes.user`, and the boolean
  `settings.is_mcp_enabled` (supported in manifest v1 and v2). Observed 2026-09-17.
  The separate `mcp_servers` field declares servers consumed by an app and is
  not needed to enable this app for Slack's hosted MCP server.

- **Overview:** https://docs.slack.dev/ai/slack-mcp-server/ — endpoint, transport,
  eligibility, app identity, confidential OAuth, user-token endpoints, scope table,
  IP allowlist, and consent. Observed 2026-09-16.
- **Developing:** https://docs.slack.dev/ai/slack-mcp-server/developing/ — app
  settings, **Agents**, **Slack Model Context Protocol (MCP) Server**, **On**,
  **OAuth & Permissions**, **Scopes**, **Redirect URLs**, saving the redirect,
  and **Basic Information** for credentials. Observed 2026-09-16.
- **User access:** https://docs.slack.dev/reference/methods/oauth.v2.user.access/
  — exchange using user scopes without bot scopes; client credentials and
  authorization-code/refresh-token parameters. Observed 2026-09-16.
- **OAuth:** https://docs.slack.dev/authentication/installing-with-oauth/ —
  OAuth installation, consent, and secure credential storage. Observed 2026-09-16.
- **Authorization metadata:**
  https://mcp.slack.com/.well-known/oauth-authorization-server — fetched public
  JSON on 2026-09-16. Issuer `https://mcp.slack.com`; authorization endpoint
  `https://slack.com/oauth/v2_user/authorize`; token endpoint
  `https://slack.com/api/oauth.v2.user.access`; token authentication
  `client_secret_post`; S256 PKCE; authorization-code and refresh-token grants.
  No registration endpoint. Scope list includes the four channel-list scopes.
- **Client setup:** `doctrine/speakeasy-setup.md`, read 2026-09-16 — canonical
  Control Plane UI, callback template, custom-remote route, and manual client.
- **Client capabilities:** `doctrine/ai-control-plane-oauth.md`, read 2026-09-16,
  verified upstream revision `4e1fef388aa0f5b498f5d35400780ff2b99815e4` on
  2026-09-15 — source-inspected support, not a Slack acceptance test.

## Server and authentication facts

- Shared remote `https://mcp.slack.com/mcp`, JSON-RPC 2.0 over Streamable HTTP;
  not tenanted. SSE and Dynamic Client Registration are explicitly unsupported.
  [Overview]
- Only internal apps and Slack Marketplace/directory-published apps may use
  MCP. Unlisted distributed apps are prohibited. Workspace admins retain their
  standard app approval controls. No paid-plan requirement was established by
  these sources; do not invent one. [Overview]
- Slack says clients must be backed by a registered app with a fixed, hardcoded
  app ID. Reuse one internal app and its associated Client ID and Client Secret;
  do not imply dynamic app creation or that an App ID replaces the OAuth client
  ID. No separate app-ID header/configuration is specified in these sources.
  [Overview]
- Confidential OAuth requires `client_id` and `client_secret`; users authorize
  the app with their own Slack accounts. Use the user-token endpoints above,
  not the bot-token exchange. Do not ask the administrator to paste a bot or
  user bearer token. [Overview; User access]
- Minimal selected operation: list user channels. Required user-token scopes
  are `channels:read`, `groups:read`, `im:read`, `mpim:read`. These do not grant
  search, message-history, or write tools. Additional tool scopes must come
  from the Overview's **OAuth scopes needed on user token for different tools**
  table and be configured on both sides. [Overview]
- App IP restrictions also apply to MCP. Have the network administrator allow
  the actual client egress addresses; do not invent an IP range or disable the
  allowlist. [Overview]

## Client compatibility and limits

The maintained capability reference establishes manual registration, S256 PKCE,
`client_secret_post`, configurable scopes, discovery, and refresh-token grant
support. Token authentication defaults to Basic when a secret is present and no
recognized method is stored, so explicitly select Post; merely supplying the
secret is not enough. A nonempty issuer scope override wins over client scopes;
ensure it matches the selected Slack user scopes. Slack metadata does not
advertise OpenID scopes, so do not add `openid` or `offline_access` speculatively.

Relevant pinned sources retained from the reference:

- https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/types.go
- https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/challenge.go
- https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/tokenservice.go
- https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/client/dashboard/src/pages/remote-identity-providers/CreateRemoteSessionClientSheet.tsx

Refresh support does not establish refresh-token issuance, token lifetime, or
indefinite renewal for this app. No token-rotation change is prescribed. App-ID
binding, workspace approval, effective permissions, and first consent still need
a live acceptance test. This is unverified integration behavior, not evidence of
an unsupported client feature.

## Provider anchor contract

### Create an app from JSON {#create-app-from-manifest}

Optional alternative to configuring an existing internal app. In Slack app
settings choose **From a manifest**, **Continue**, replace the JSON, select
the workspace, then **Next** and **Create**. This order and these labels come
from Developing. The manifest sets `display_information.name` to the example
name `Slack MCP Control Plane`, `oauth_config.redirect_urls` to an array
containing `{{ gram.oauth.callback_url }}`, `oauth_config.scopes.user` to the
four channel-listing scopes, and `settings.is_mcp_enabled` to `true`.
[Manifest reference; Developing; Overview; Client setup]

The manifest replaces the manual MCP-enable, scope, and callback steps for a
new app. Continue to `copy-client-credentials` after creation. It does not
contain credentials, bypass approval, or grant user consent. Keep the app
internal. Existing-app readers skip this section and use the original manual
steps. No bot, events, Socket Mode, or token-rotation settings are needed for
this path. No live Slack manifest creation test has been performed.

Screenshot: Slack's manifest editor with JSON selected, before app creation.

### Enable MCP access {#enable-mcp-access}

Open the existing internal app at `https://api.slack.com/apps`; **Agents** → **Slack Model Context Protocol (MCP) Server** → **On**. Retain IP restrictions. [Developing; Overview]

Screenshot: Agents with MCP enabled.

### Set user permissions {#set-user-permissions}

**OAuth & Permissions** → **Scopes**; configure the four user scopes above, not bot scopes. [Developing; Overview]

Screenshot: Selected user-token scopes.

### Register callback {#register-callback}

**OAuth & Permissions** → **Redirect URLs**; add `{{ gram.oauth.callback_url }}` and save. [Developing; Client setup]

Screenshot: Registered callback.

### Copy client credentials {#copy-client-credentials}

**Basic Information**; copy **Client ID** and **Client Secret** securely, revealing the secret as needed. Keep the app fixed. [Developing; Overview; OAuth]

Screenshot: Credential labels with values redacted.

## Control Plane transclusion and anchor contract

Use `speakeasy_add_server: custom-remote` to target the official endpoint
unambiguously. Catalog presence was not checked, and no catalog absence is
claimed. No Pulse alias is invented.

- `{#add-server-in-speakeasy}`: **Connect** → **Sources** → **Add Source** →
  **Custom remote server** → **Add a custom remote MCP server**. Enter the remote
  in **Remote MCP server URL**, click **Add server**, arrive at **Overview**.
  Screenshot: custom-remote form with the Slack URL.
- `{#connect-speakeasy-credentials}`: **Overview** → **Settings** →
  **Authentication** → **Configure Manually** or **Use Discovered**.
  **Issuer URL** `https://mcp.slack.com`, **Endpoints** → **Discover** if needed;
  **Attach Remote Identity Provider**, **Client Type** **Manual**, **Client ID**,
  **Client Secret (optional)** (required by Slack), explicit `client_secret_post`,
  selected scopes, **Attach Identity Provider**. Match the displayed **Redirect
  URI** with the callback registered upstream. Screenshot: Manual, user-token
  endpoints, Post authentication, all credentials redacted.
- Preserve the canonical final pointer to Slack's MCP documentation. Setup ends
  after credentials; publishing and downstream-client distribution are out of
  scope. Explain user consent without inventing a dashboard test button.

## Research limitations and operator decisions

- No screenshots or authenticated console inspection. Exact user-scope,
  reveal-secret, token-authentication-method, and scope-control labels may vary;
  use action-oriented wording without inventing a label. If the deployment
  hides the latter controls, its administrator must configure the required values.
- No end-to-end Slack test, independent evidence of the current app's eligibility,
  or successful consent. Keep that limitation visible in the setup guide.
- The organization supplies an internal app, its administrator approval, any
  extra tool permissions, and any required outbound-IP allowlisting. These are
  reader prerequisites, not missing public protocol facts.
- No unresolved operator question blocks drafting. No secrets, private factory
  logs, or failed-run diagnostic contents belong in this bundle.
