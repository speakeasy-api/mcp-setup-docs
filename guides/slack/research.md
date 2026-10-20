---
research_version: 1
slug: slack
researched_at: 2026-10-20T07:50:00Z
---

# Slack — Research Dossier

## Source ruling and operator decision

Official Slack documentation controls provider requirements. The operator
requested a prefilled app-creation flow with all 30 supported user scopes
selected by default, followed by optional permission narrowing. This replaces
the former four-scope channel-listing default. Full functionality is the
intentional default; it must not be described as least privilege.

This is a guide-only update. The primary creation link lives in `external.md`
and uses Slack's documented prefilled manifest flow. It does not depend on a
new Control Plane setup panel or a client branch. Existing manual identity
configuration remains necessary after app creation. No authenticated Slack
creation or consent test was performed.

## Sources

- **Overview:** https://docs.slack.dev/ai/slack-mcp-server/ — hosted endpoint,
  Streamable HTTP, app eligibility, internal app approval, IP restrictions,
  user OAuth, and tool-to-user-scope table. Rechecked 2026-10-20.
- **Developing:** https://docs.slack.dev/ai/slack-mcp-server/developing/ —
  **Agents**, **Slack Model Context Protocol (MCP) Server**, **OAuth &
  Permissions**, **Scopes**, **Redirect URLs**, and **Basic Information**
  client credentials. Rechecked 2026-10-20. Sample Bolt, OpenAI, event, and
  local server instructions are not prerequisites for the hosted connection.
- **Manifest reference:** https://docs.slack.dev/reference/app-manifest/ —
  `display_information.name`, `oauth_config.redirect_urls`,
  `oauth_config.scopes.user`, `settings.is_mcp_enabled`. Rechecked 2026-10-20.
- **Manifest creation links:**
  https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests/ —
  `https://api.slack.com/apps?new_app=1&manifest_json=` followed by URL-encoded
  JSON opens a prefilled creation flow. This is not app-creation API access
  and does not require an app configuration token.
- **Authorization metadata:**
  https://mcp.slack.com/.well-known/oauth-authorization-server — live JSON
  fetched 2026-10-20; issuer `https://mcp.slack.com`, authorization endpoint
  `https://slack.com/oauth/v2_user/authorize`, token endpoint
  `https://slack.com/api/oauth.v2.user.access`, `client_secret_post`, S256 PKCE,
  authorization-code and refresh-token grants. No registration endpoint.
- **Resource metadata:**
  https://mcp.slack.com/.well-known/oauth-protected-resource — live JSON
  fetched 2026-10-20. Both metadata documents advertise exactly the same 30
  scopes listed below.
- **OAuth installation:** https://docs.slack.dev/authentication/installing-with-oauth/
  — app installation, user consent, and approval when permissions change.
- **Guide rendering:** `go/render.go` — replaces the existing
  `{{ gram.oauth.callback_url }}` key with the deployment callback before
  serving Markdown. The creation link URL-encodes its JSON and leaves only this
  canonical callback key for substitution. Its Markdown destination uses angle
  brackets so the raw template's spaces are preserved. No new template keys,
  client code, or runtime APIs are required. The expected deployment callback
  is an HTTPS URL without query parameters or fragments.
- **Standard Control Plane route:** `doctrine/speakeasy-setup.md` — custom
  remote creation, fixed anchors, callback template, and server availability.

## Server, authentication, and scope policy

- Remote: `https://mcp.slack.com/mcp`, shared, not tenanted, Streamable HTTP.
  Slack does not support SSE or Dynamic Client Registration. No CIMD support
  is advertised. An internal Slack app supplies fixed OAuth client credentials.
- Only internal apps and Slack Marketplace apps can use Slack MCP; unlisted
  distributed apps cannot. Workspace approval and app IP restrictions remain
  effective. No paid-plan requirement was established; do not invent one.
- Each person authorizes with their own Slack account. Use confidential user
  OAuth, not bot OAuth, a pasted bearer token, or the app ID. Never expose the
  Client Secret in links, screenshots, chat, or source control.
- Default scopes, verified against both live metadata documents:

```text
canvases:read canvases:write channels:history channels:read channels:write chat:write emoji:read files:read files:write groups:history groups:read groups:write im:history im:read im:write lists:read lists:write mpim:history mpim:read mpim:write reactions:read reactions:write search:read.files search:read.im search:read.mpim search:read.private search:read.public search:read.users users:read users:read.email
```

- The manifest uses **user-token** scopes only. Requested OAuth scopes must
  match the app's granted scopes; the selected set must stay consistent across
  the app manifest and Control Plane OAuth configuration. Blank manual scope configuration must
  not request permissions absent from the app.
- Users may remove scopes from the manifest before creation. Removing permissions makes
  tools requiring them unavailable; consult the Overview's tool-to-scope table.
  User-scoped access does not bypass workspace policies or channel membership.
- Changing scopes in the Control Plane does not change Slack. Update the app
  too; complete any required reinstallation, approval, and user authorization.
  Do not imply that the creation link creates the app without confirmation.

## Provider steps and stable anchors

The provider guide separates **Automatic setup (recommended)**
(`{#automatic-setup}`) and **Manual setup** (`{#manual-setup}`). Readers complete one
path, then **Finish app setup** (`{#finish-app-setup}`) and connect in the Control
Plane. Manual configuration is collapsed by default; the full JSON manifest
has its own disclosure. Existing step anchors are preserved.

The creation CTA is a native navigation link displayed as a button, opening
Slack in a new tab with `noopener noreferrer`. Plain Markdown guides cannot
import the website's React/MDX Button component. Instead, this guide reuses the
utility styles already shipped by `marketing-site/src/components/ui/button.tsx`
(primary colors, pill shape, mono uppercase label, spacing, and focus ring).
A `not-content` block keeps the CTA outside prose-link styling. There is no
new component, stylesheet, script, or website code change. HTML-capable
Markdown consumers may omit the styling but retain a usable navigation link.

## Automatic setup (recommended) {#automatic-setup}

### Create your Slack app {#create-app-from-manifest}

Primary path: the guide's **Create app in Slack** link opens Slack's supported
`new_app=1&manifest_json=...` creation flow. The manifest contains
`display_information.name = Speakeasy Slack MCP`, MCP enablement, all 30 user
scopes, and the deployment callback. JSON is URL-encoded; the existing callback
template key is substituted by the guide renderer. There are no credentials in
the link. In Slack, choose a workspace, review the manifest, optionally remove
unneeded scopes, and create the app. Obtain approval where required, then
continue to `copy-client-credentials`. Do not repeat manual MCP, callback, or
scope configuration after using the manifest.

## Manual setup {#manual-setup}

### Create an app from JSON {#create-app-manually}

Under **Manual setup**, **Show manual setup instructions** reveals the
alternative. **From a manifest** in Slack's app settings accepts the full JSON
shown under **View the full app manifest (30 user scopes)**. If the callback key has not been rendered, replace it with
the actual deployment callback before creation. Existing unconfigured apps use
the three manual anchors below. A suitable existing app needs no replacement.
No bot, events, Socket Mode, app configuration token, or token-rotation setup is
required for this path.

Screenshot: Slack app creation with prefilled manifest and workspace selection.
For `create-app-manually`: Slack's From a manifest flow with full configuration.

### Enable MCP access for an existing app {#enable-mcp-access}

Only for existing apps without the manifest configuration: open the app in
`https://api.slack.com/apps`; **Agents** → **Slack Model Context Protocol (MCP)
Server** → **On**. Retain app IP restrictions.

Screenshot: Agents with MCP enabled.

### Set user permissions for an existing app {#set-user-permissions}

**OAuth & Permissions** → **Scopes**; configure all 30 user scopes above by
default, or the deliberately restricted selection. Never use bot scopes. Keep
Control Plane scope configuration aligned with the Slack app.

Screenshot: OAuth & Permissions with selected user-token scopes.

### Register the callback for an existing app {#register-callback}

**OAuth & Permissions** → **Redirect URLs**; add
`{{ gram.oauth.callback_url }}` and save. The manifest path already does this.

Screenshot: Redirect URLs with deployment callback registered.

## Finish app setup {#finish-app-setup}

### Copy the app credentials {#copy-client-credentials}

**Basic Information** → **App Credentials**; reveal and copy **Client ID** and
**Client Secret** for the Control Plane identity settings. Use **Save** there;
confirm with **Save changes** if prompted. App ID and bearer
tokens are not substitutes for these credentials.

Screenshot: Basic Information credential labels, values redacted.

## Control Plane rendering and fixed anchors

The Control Plane instructions have a **Connect in the Control Plane** H2 so
the website's concatenated guide clearly separates app setup from connection.

- Catalog presence is not established. Preserve `speakeasy_add_server:
  custom-remote`; do not invent a catalog tile.
- `{#add-server-in-speakeasy}`: **MCP Gateway** → **MCP** → **Add new** →
  **Hosted remotely**; enter **MCP server URL**; optional display name;
  default **User session issuer**; **Verify connectivity**; **User Identity**;
  leave **Guardrails** off if shown; **Save**. Slack's confidential client
  setup is still required, so initial creation leaves the server **Disabled**.
  Screenshot: new remote form with Slack URL and User Identity.
- `{#connect-speakeasy-credentials}`: **Settings > Identity** → **User Identity** → **Choose an identity provider** →
  `https://mcp.slack.com` (badge **Will be created** for a new provider) →
  **Manual**; credentials; **Advanced** → **Scope**, exact space-separated
  app scopes; **Save**, **Save changes** if asked. Secret is required despite
  an **Optional** field label. No Redirect URI is displayed in Identity.
- Finish with **Settings > Danger Zone > Server Availability** →
  **Enable MCP server**. Each user completes Slack OAuth on first use; saving
  credentials is not consent. Do not invent a dashboard test button.
- Screenshot: Identity with User Identity, Slack provider, Manual credentials,
  full scopes, and credential values redacted.
- Final guide line links to https://docs.slack.dev/ai/slack-mcp-server/.

## Verification limits

Guide lint, callback substitution, and creation-link/manifest/scope equality
are appropriate checks. They do not prove Slack workspace approval or successful OAuth consent.
No authenticated Slack console, production app mutation, paid factory run, or
end-to-end OAuth session was exercised for this update. No Control Plane client changes are part of it.
