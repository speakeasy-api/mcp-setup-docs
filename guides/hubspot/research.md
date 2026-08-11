---
research_version: 1
slug: hubspot
researched_at: 2026-08-11T15:40:29Z
---

# HubSpot — Research Dossier

Authoritative source ruling for this guide: the developer-docs setup page
**"Integrate AI tools with the HubSpot MCP server"** on
developers.hubspot.com is the source of truth for console UI facts
(navigation, button and field labels, step order) and for endpoint/auth
facts. The marketing overview at `developers.hubspot.com/ai-tools/mcp`
(the canonical target of `developers.hubspot.com/mcp`, which 301-redirects
to it — observed this run) carries partially stale content ("HubSpot MCP
server supports OAuth 2.0. Later in 2025, we will align with MCP
specification requirements for OAuth 2.1 support"; "Create a user-level
application with read scopes" — the pre-MCP-auth-apps flow) and is used
only for two facts no other source states: the admin-connects-first
behavior and the Sensitive Data Properties restriction, both flagged
where used. The developer changelog is used for product status and for
capability changes newer than the setup page. The primary setup page, its
documentation index, the permissions guide, and the live OAuth metadata were
reverified at `2026-08-11T15:40:29Z`.
The operator forced the Speakeasy MCP Catalog path and supplied the matched
record `com.pulsemcp.mirror/hubspot`, titled **HubSpot**, so this Guide renders
only the catalog add-server path.

## Server facts

- **Remote URL**: `https://mcp.hubspot.com`. Setup page, Implementation
  overview: "Configuring your MCP client to connect to the HubSpot MCP
  server at `https://mcp.hubspot.com` using your app's OAuth
  credentials"; General connection instructions: "you can connect your
  MCP client to `https://mcp.hubspot.com` using your app's credentials."
  GA changelog: "Connect any MCP client that supports OAuth with PKCE to
  `https://mcp.hubspot.com` using your app's client ID and secret."
- **Transport**: `streamable-http`. Setup page's MCP Inspector
  walkthrough configures "**Transport Type:** Streamable HTTP" with
  "**URL:** `https://mcp.hubspot.com/`". Pulse mirror
  `com.pulsemcp.mirror/hubspot` v0.0.1 records remote type
  `streamable-http`. Corroborated by direct observation this run: an
  unauthenticated JSON-RPC POST to `https://mcp.hubspot.com` returns
  `HTTP 401` with `WWW-Authenticate: Bearer
  resource_metadata="https://mcp.hubspot.com/.well-known/oauth-protected-resource"`.
- **Authentication**: OAuth 2.1 authorization code with PKCE, required.
  Setup page: "you can use it with any MCP client that supports OAuth
  authentication with PKCE (Proof Key for Code Exchange). PKCE is
  required for authenticating with HubSpot's MCP server." GA changelog:
  "OAuth 2.1 with PKCE is required for all connections." The OAuth
  client (here, the Speakeasy AI Control Plane) presents the **Client
  ID** and **Client secret** of an **MCP auth app** created in the
  HubSpot account (see credential flow). PKCE parameters per the setup
  page's troubleshooting section: "Generate a random `code_verifier`
  (43-128 characters)", "Derive the `code_challenge` from the verifier
  using the S256 method", "Include the `code_challenge` and
  `code_challenge_method=S256` in the authorization request. Include the
  `code_verifier` in the token exchange request."
  - Client registration is manual: the live authorization-server
    metadata (observed this run) advertises no `registration_endpoint`,
    and the Pulse mirror records dynamic client registration
    `supported: false`. This backs `client_registration: manual` in the
    Metadata; the MCP-auth-app flow below is the required path, so it is
    a server fact, not a gotcha.
  - Live authorization-server metadata
    (`https://mcp.hubspot.com/.well-known/oauth-authorization-server`,
    observed this run): issuer `https://mcp.hubspot.com`, authorization
    endpoint `https://mcp.hubspot.com/oauth/authorize/user`, token
    endpoint `https://mcp.hubspot.com/oauth/v3/token`, grant types
    `authorization_code` / `refresh_token` / `client_credentials`,
    `token_endpoint_auth_methods_supported: ["client_secret_post"]`,
    `code_challenge_methods_supported: ["S256"]`, introspection endpoint
    `https://mcp.hubspot.com/oauth/v3/token/introspect`.
  - Live protected-resource metadata (observed this run): resource
    `https://mcp.hubspot.com`, authorization server
    `https://mcp.hubspot.com`, `scopes_supported: []`,
    `resource_documentation: https://developers.hubspot.com/mcp`.
  - Token lifecycle (setup page, Troubleshooting): "OAuth access tokens
    expire after a set period"; clients refresh with the
    `refresh_token` from the initial flow; an expired/invalidated
    refresh token requires re-running the full OAuth flow. Handled by
    the connecting client, not a console step.
- **Scopes are automatic** (setup page, verbatim): "you don't explicitly
  define the app's scopes. Instead, available scopes are automatically
  determined by two factors: The tools available in the MCP server at
  the time of installation. The permissions that the user chooses to
  grant during installation." There is no scope-selection field anywhere
  in the MCP auth app UI (see {#scopes-are-automatic}).
- **Plan/licensing**: GA changelog, verbatim: "The remote HubSpot MCP
  server is graduating from beta and is now generally available to all
  HubSpot accounts." No plan-tier gate is documented anywhere for the
  remote server. The **MCP Auth Apps** UI itself was announced as public
  beta (changelog 2026-01-20; beta live 2026-01-13) and was still
  labeled "Public Beta" in the Spring 2026 Spotlight (2026-04-14), but
  the current setup page carries no beta badge (checked explicitly this
  run) — see open questions.
- **Permissions model** (setup page, verbatim): "All actions respect
  your existing HubSpot user permissions. Users can only view and modify
  records they have access to in HubSpot."
- **Data access** (setup page, "Supported data and permissions",
  verbatim lists):
  - Read access — "CRM records: contacts, companies, deals, tickets,
    users, carts, invoices, orders, line items, products, quotes,
    subscriptions, and segments (lists)"; "Activities: calls, emails,
    meetings, notes, and tasks"; "Content and marketing: blog posts,
    landing pages, site pages, campaigns, and marketing events";
    conversations in supported inbox/help-desk channels, subject to inbox
    access restrictions; and marketing-email drafts, previews, analytics,
    account health diagnostics, and per-contact delivery/engagement details.
  - Write access — "CRM records: contacts, companies, deals, tickets,
    line items, and products"; "Activities: calls, emails, meetings,
    notes, and tasks"; and marketing-email draft creation and updates.
  - **Recorded conflict / newer capability**: the June 2026 developer
    rollup (2026-06-29) adds landing-page write: "Starting from an
    existing template or a clone of a page you already have, AI
    assistants can create, edit, and publish landing pages", with "an
    explicit confirmation step before the page goes live", and adds
    content analytics for standalone (non-campaign) web assets. The
    setup page's Supported-data table (observed this run) still lists
    landing pages under read access only; the changelog is newer and is
    preferred for this fact. See {#content-write-limits}.
- **Search behavior** (setup page callout, verbatim): "Behind the
  scenes, the HubSpot MCP server is based on the CRM search API, which
  currently doesn't include vector search capabilities." See
  {#keyword-search-only}.
- **Sensitive data** (setup page warning, verbatim): "if your HubSpot
  account has Sensitive Data turned on, activity objects (such as calls,
  emails, meetings, notes, and tasks) and conversation data will be blocked
  from access through the MCP server." The page states this restriction is
  MCP-specific and does not apply to the standard CRM APIs. The overview
  page adds: "The HubSpot MCP server doesn't allow access to custom
  Sensitive Data Properties, including Personal Health Information and
  other forms of Highly Sensitive Data." See
  {#sensitive-data-blocks-activities}.
- **Adjacent products, not this server** (recorded to prevent
  mis-navigation): the **developer MCP server** is a separate local tool
  — setup page note, verbatim: "The HubSpot MCP server documented on
  this page is separate from the developer MCP server. The developer MCP
  server helps developers build apps and CMS content assets locally on
  HubSpot's developer platform." (Its own GA changelog entry exists;
  different product.) The knowledge base's "HubSpot MCP Client" articles
  cover HubSpot's Breeze agents consuming *other* vendors' MCP servers —
  the reverse direction; also unrelated. The KB's "HubSpot connector for
  Claude" / "for ChatGPT" articles cover HubSpot-managed partner
  connectors, not the MCP auth app flow this guide documents. The Pulse
  mirror also records an npm package `@hubspot/mcp-server` (stdio, a
  `PRIVATE_APP_ACCESS_TOKEN` env var) — the legacy local server, not
  this remote server; not documented in this guide.

## Credential flow

Who acts: a user in the HubSpot account who can open the **Development**
workspace from the main navigation bar — that is where **MCP Auth Apps**
lives. The current setup page also links directly to
`https://app.hubspot.com/l/mcp-auth-apps/`. No HubSpot source names the exact
permission that gates this UI.
The KB's user-permissions guide documents a **Developer tools access**
permission (Account tab > Settings access) that lets users "access and
manage developer features, including: app management, developer
projects, development sandboxes, personal access keys for CLI
authentication, and developer test accounts" — a flagged inference that
this is the gate; MCP Auth Apps is not named there. That Account tab
sits within the screen for editing an individual user's permissions:
the same guide states, verbatim, "On the Account tab, you can set more
granular permissions for account administration," reached from the
settings icon in the top navigation bar via **Users & Teams**, then
selecting a user. The same guide's Super Admin requirement ("you must
be a Super Admin to access private apps") is scoped to *private apps*,
a different app type — not evidence about MCP auth apps (see open
questions).

What gets created: one **MCP auth app** in the account's Development
workspace. HubSpot generates a **Client ID** and **Client secret** for
it; both stay viewable on the app's details page (no one-time display).

Values the Speakeasy AI Control Plane needs, and where they come from:

| Value | Origin |
| --- | --- |
| Client ID | Generated by HubSpot; shown on the MCP auth app's details page ({#copy-client-credentials}) |
| Client secret | Generated by HubSpot; shown on the same details page ({#copy-client-credentials}) |

Where `{{ gram.oauth.callback_url }}` gets pasted: into the **Redirect
URL** field of the **Create MCP auth app** dialog
({#create-mcp-auth-app}). The setup page describes the field as "the URL
to use for OAuth authentication" and notes app details "you can update
later as needed" via **Edit info** on the details page. If multiple
redirect URLs are configured, "the first redirect URL will be used as
the default redirect" — keep the Speakeasy AI Control Plane callback URL
first (or the only entry). The page's
`http://localhost:6274/oauth/callback/debug` redirect applies only to
local testing with the MCP Inspector, not to this flow.

After setup, each end user connects through HubSpot's OAuth flow (setup
page, verbatim): "1. Select the HubSpot account to connect. 2. Grant
permissions to the app. These permissions are based on the user's
permissions in HubSpot and determine what data the app can access. 3.
Authorize the connection." The overview page states the account admin
must connect before other users can (see {#admin-connects-first}).

## Console walkthrough

Primary source: the setup page's "Create an MCP auth app" section
(developers.hubspot.com; fetched live this run). The flow is short: main
navigation > Development > MCP Auth Apps > Create MCP auth app dialog >
Create > auto-redirect to the app's details page. Every transition below
is documented except where flagged.

### Open MCP Auth Apps in the Development workspace {#open-mcp-auth-apps}

- Entry: sign in at `app.hubspot.com`. Setup page, verbatim: "In the
  main navigation bar of your HubSpot account, navigate to
  **Development**." Then: "In the left sidebar menu, navigate to **MCP
  Auth Apps**."
- If navigation is unavailable, the setup page's direct account link is
  `https://app.hubspot.com/l/mcp-auth-apps/`; opening it still requires a
  signed-in account with access to this developer feature.
- Where **Development** sits within the main navigation bar (position,
  icon, whether behind a "More" overflow) is not documented; if the item
  is missing, the signed-in user likely lacks developer-tools access
  (flagged inference — see credential flow and open questions).
- Values entered: HubSpot sign-in only. Values copied: none.
- Screenshot note: the HubSpot main navigation bar with **Development**
  visible, and the resulting Development workspace with **MCP Auth
  Apps** highlighted in the left sidebar menu.

### Create the MCP auth app {#create-mcp-auth-app}

- Setup page, verbatim: "In the upper right, click **Create MCP auth
  app**."
- "In the dialog box, enter your app details, which you can update later
  as needed" — fields, with the page's own descriptions:
  - **App name**: "the name of your app" — a recognizable name such as
    `Speakeasy AI Control Plane`.
  - **Description**: "an optional description of your app."
  - **Redirect URL**: "the URL to use for OAuth authentication" — paste
    `{{ gram.oauth.callback_url }}` here. Ignore the page's note about
    including `http://localhost:6274/oauth/callback/debug`; that
    redirect is only for local testing with the MCP Inspector.
  - **Icon**: "an optional icon for your app."
- "Click **Create**."
- Multiple redirect URLs (setup page, verbatim): "If you're including
  multiple redirect URLs, the first redirect URL will be used as the
  default redirect." The dialog steps document a single **Redirect URL**
  field. Keep the Speakeasy AI Control Plane callback as the first (or
  only) entry; this setup does not require adding another URL.
- Values entered: **App name**, `{{ gram.oauth.callback_url }}` into
  **Redirect URL**, optional **Description**/**Icon**. Values copied:
  none yet.
- Screenshot note: the **MCP Auth Apps** page with the **Create MCP auth
  app** button in the upper right and the creation dialog open, showing
  the **App name**, **Description**, **Redirect URL**, and **Icon**
  fields.
- Recovery: nothing bites — "you can update later as needed"; app
  details are editable afterward via **Edit info** on the details page
  ({#copy-client-credentials}).

### Copy the client credentials {#copy-client-credentials}

- Setup page, verbatim: "You'll then be redirected to the app's details
  page, where you can view its client credentials, redirect URLs, and
  more. To edit your app details, you can click **Edit info** in the
  upper right."
- Copy the **Client ID** and **Client secret** into the matching
  Speakeasy AI Control Plane fields; treat the Client secret like a
  password.
- Values copied: **Client ID** and **Client secret** → Speakeasy AI
  Control Plane credential fields.
- Screenshot exception: the credential values are plain text fields
  whose appearance adds nothing beyond the copied values.
- Recovery: none needed — the credentials remain viewable on the details
  page on later visits ("where you can view its client credentials"),
  so there is no one-time display to miss.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md`, observed
`2026-08-11T15:40:29Z`.

Per-guide values:

- Remote URL: `https://mcp.hubspot.com`
- Transport: `streamable-http` (the add form's **Transport** field is
  read-only)
- Authentication Option: OAuth with a manually registered client; HubSpot
  requires PKCE
- Client ID and Client Secret: generated in
  {#copy-client-credentials}
- Redirect callback: `{{ gram.oauth.callback_url }}`, registered in HubSpot's
  **Redirect URL** field in {#create-mcp-auth-app}
- Scopes to type: none; HubSpot determines scopes automatically
- OAuth discovery: HubSpot publishes protected-resource metadata pointing to
  issuer `https://mcp.hubspot.com`, plus authorization-server metadata, but
  does not publish a dynamic client-registration endpoint
- Further reading:
  `https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **3rd-party server**. On the **MCP Catalog** page, find **HubSpot**
(the search box reads **Search MCP servers...**), open its entry with
**View**, and click **Add**. In the **Add to Project** dialog, click
**Add to Project**. This creates the hosted MCP server and opens its
**Overview** page.

Screenshot note: capture the **Add Source** menu or the **HubSpot** catalog
entry. Catalog presence was resolved by the operator's Pulse lookup:
`com.pulsemcp.mirror/hubspot`, title **HubSpot**.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually**, or **Use Discovered** if HubSpot's published
metadata makes that control available. In **Attach Remote Identity Provider**:

1. Set **Client Type** to **Manual**.
2. Confirm the sheet's **Redirect URI** matches the
   `{{ gram.oauth.callback_url }}` value registered in HubSpot's
   **Redirect URL** field in {#create-mcp-auth-app}.
3. Paste the **Client ID** and **Client Secret (optional)** copied in
   {#copy-client-credentials}.
4. Leave any scope override empty; HubSpot determines scopes automatically.
5. Click **Attach Identity Provider**.

Screenshot note: capture **Attach Remote Identity Provider** with
**Client Type** set to **Manual** and all credential values redacted.

When HubSpot authorization opens, use the intended account, grant the
permissions offered, and authorize the connection. HubSpot documents the
sequence but not the current exact labels for these authorization controls.

Closing pointer: "This guide covers setup only. For anything beyond it —
billing, tool behavior, limits — see HubSpot's MCP documentation at
https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server."

## Gotchas

### No scope selection — access follows tools and user permissions {#scopes-are-automatic}

There is no scopes step anywhere in the MCP auth app flow; do not hunt
for one. Setup page, verbatim: "you don't explicitly define the app's
scopes. Instead, available scopes are automatically determined by two
factors: The tools available in the MCP server at the time of
installation. The permissions that the user chooses to grant during
installation." And access is always capped per user: "All actions
respect your existing HubSpot user permissions. Users can only view and
modify records they have access to in HubSpot" — connecting through the
app never widens what an individual user can see or edit.

### Scope updates require users to re-install {#scope-updates-require-reinstall}

Setup page, verbatim: "As the MCP server's tools are updated, the
available scopes may change. In the event of scope updates, users who
have already installed the app will need to re-install to grant any new
scopes." This happens in practice: when HubSpot shipped landing-page
tools (June 2026 rollup), existing connected users had to "reconnect or
re-authorize to grant the new permission scope. New connections prompt
for it automatically."

### Sensitive Data blocks activities and conversations {#sensitive-data-blocks-activities}

Setup page warning, verbatim: "if your HubSpot account has Sensitive
Data turned on, activity objects (such as calls, emails, meetings,
notes, and tasks) and conversation data will be blocked from access
through the MCP server." This MCP-specific restriction does not apply to
the standard CRM APIs. The overview page adds that "The HubSpot MCP server
doesn't allow access to custom Sensitive Data Properties, including
Personal Health Information and other forms of Highly Sensitive Data."

### Most content and marketing objects are read-only {#content-write-limits}

Campaigns, website pages, blog posts, and marketing events can be read
but not modified through the MCP server (setup page: content and
marketing objects appear only under read access). The one exception,
added June 2026: landing pages — "AI assistants can create, edit, and
publish landing pages", starting "from an existing template or a clone
of a page you already have", with "an explicit confirmation step before
the page goes live". The landing-page release excludes "bulk operations,
custom module creation, A/B test setup, or first-time site/account
setup." (The setup page's supported-data table still lists landing pages
as read-only; the June 2026 changelog is newer and preferred.)

### Keyword search only {#keyword-search-only}

Setup page callout, verbatim: "Behind the scenes, the HubSpot MCP server
is based on the CRM search API, which currently doesn't include vector
search capabilities." Searches match keywords and property filters, not
semantic similarity — set expectations accordingly.

### Admin connects first {#admin-connects-first}

Overview page, verbatim: "The admin of the HubSpot account needs to
connect first, to allow other users in the account to connect
thereafter." Plan for an account admin to complete the first OAuth
connection before rolling the connection out to other users.
Single-source fact: only the overview page states this, and that page
carries stale content elsewhere (see the source ruling above); the
mechanics — which admin role qualifies, what a non-admin sees if no
admin has connected — are undocumented (see open questions).

## Open questions

- **Which permission gates the Development workspace / MCP Auth Apps.**
  No HubSpot source names the permission required to see **Development**
  in the main navigation or to create an MCP auth app. The KB
  user-permissions guide's **Developer tools access** (Account tab >
  Settings access; covers "app management" among "developer features")
  is the closest documented candidate — recorded as a flagged inference.
  The guide's only Super Admin requirement in this area is scoped to
  private apps, a different app type; whether Super Admin is required
  for MCP auth apps is unknown.
- **MCP Auth Apps beta status.** The MCP Auth Apps UI was announced as
  public beta (changelog 2026-01-20) and still labeled "Public Beta" in
  the Spring 2026 Spotlight (2026-04-14), but the current setup page
  shows no beta badge or label anywhere (checked explicitly this run),
  and no MCP-auth-apps GA announcement was found in the changelog
  through July 2026 (targeted search this run; newest MCP entry remains
  the June 2026 rollup, 2026-06-29). Current status is ambiguous; the
  draft should not assert "public beta" as current fact.
- **Admin-connects-first mechanics.** Only the overview page states the
  admin must connect first; no source defines which admin role
  qualifies, or what error/experience a non-admin user gets when
  connecting before any admin has. Needs console verification or
  provider confirmation.
- **"New HubSpot Developer Platform" prerequisite.** The overview page
  says "To use the HubSpot MCP Server, you must be on the new HubSpot
  Developer Platform"; the setup page and GA changelog state no such
  prerequisite ("generally available to all HubSpot accounts"). Whether
  older, non-migrated accounts lack the **Development** navigation entry
  is undocumented. The overview's statement may be stale beta-era text.
- **End-user authorization control labels.** HubSpot documents that the
  user selects an account, grants permissions, and authorizes the
  connection, but the public setup page does not name the current buttons
  or show extractable labels for those controls. The Guide must direct the
  reader to complete HubSpot's on-screen prompts without inventing labels.

## Provenance

Source inventory from the sweep. HubSpot publishes three documentation
properties, all checked on `2026-08-11T15:40:29Z`:

- **Developer docs — developers.hubspot.com** (source of truth for this
  guide): the setup page, the `ai-tools/mcp` overview, and the developer
  changelog. `https://developers.hubspot.com/docs/llms.txt` now exists and
  was searched this run; it lists the remote-server setup page and the
  separate local developer-server pages.
- **Product/admin KB — knowledge.hubspot.com**: no remote-MCP-server
  setup article exists; the MCP-adjacent articles there cover different
  products (HubSpot MCP Client for Breeze agents; HubSpot connectors for
  Claude/ChatGPT/Copilot — partner connectors, not the MCP auth app
  flow). Drawn from only for the user-permissions guide. No `/llms.txt`
  (404, observed this run).
- **Community forums — community.hubspot.com**: announcement mirror
  threads only; found in the sweep, not drawn from.
- (`www.hubspot.com/llms.txt` exists but indexes marketing content only;
  not drawn from.)

One entry per source drawn from:

- `https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server`
  ("Integrate AI tools with the HubSpot MCP server") — reobserved at
  `2026-08-11T15:40:29Z`. The former alternate path
  `.../build-apps/integrate-with-hubspot-mcp-server` now 308-redirects
  here (redirect observed this run; the prior run saw it serve the page
  verbatim). Backs: endpoint `https://mcp.hubspot.com`, PKCE
  requirement and troubleshooting detail, the full MCP-auth-app creation
  flow (navigation "main navigation bar ... **Development**", "left
  sidebar menu ... **MCP Auth Apps**", "**Create MCP auth app**", dialog
  fields **App name** / **Description** / **Redirect URL** / **Icon**,
  "**Create**"), multiple-redirect default behavior, details-page
  redirect and **Edit info**, general client connection values (Client
  ID / Client secret / Redirect URL) and the three-step end-user OAuth
  flow, supported-data read/write lists (including conversations and
  marketing emails), permissions model, automatic scopes and re-install
  behavior, Sensitive Data warning (including conversation-data blocking),
  CRM-search/no vector search callout, developer-MCP-server distinction note,
  Streamable HTTP transport (MCP Inspector section), token
  refresh/expiry behavior. Explicitly checked this run: no beta badge
  anywhere on the page.
- `https://developers.hubspot.com/docs/llms.txt` — observed
  `2026-08-11T15:40:29Z`. Backs the developer-documentation sweep and
  confirms the current remote-server setup page as the indexed MCP guide.
- `https://developers.hubspot.com/ai-tools/mcp` ("HubSpot MCP Server"
  overview; canonical target of `https://developers.hubspot.com/mcp`,
  which 301-redirects here — redirect observed this run) — observed this
  run. Backs (flagged, single-source): "The admin of the HubSpot account
  needs to connect first, to allow other users in the account to connect
  thereafter"; "The HubSpot MCP server doesn't allow access to custom
  Sensitive Data Properties, including Personal Health Information and
  other forms of Highly Sensitive Data"; remote-vs-developer server
  split. **Conflict**: page elsewhere says "HubSpot MCP server supports
  OAuth 2.0. Later in 2025, we will align with MCP specification
  requirements for OAuth 2.1 support" and describes creating "a
  user-level application with read scopes" — stale relative to the setup
  page and GA changelog; not used for auth or console-UI facts.
- `https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available`
  (2026-04-13, updated 2026-04-15) — observed this run. Backs: "The
  remote HubSpot MCP server is graduating from beta and is now generally
  available to all HubSpot accounts"; "OAuth 2.1 with PKCE is required
  for all connections"; "Connect any MCP client that supports OAuth with
  PKCE to `https://mcp.hubspot.com` using your app's client ID and
  secret"; GA-era read/write lists.
- `https://developers.hubspot.com/changelog/public-beta-self-service-mcp-auth-apps-for-the-hubspot-remote-mcp-server`
  (2026-01-20; beta live 2026-01-13; initial remote server launch
  2025-09-01) — observed this run. Backs: MCP Auth Apps UI launch as
  public beta, self-service lifecycle management, "End-user installation
  permissions for these apps are now managed automatically."
- `https://developers.hubspot.com/changelog/spring-2026-spotlight`
  (2026-04-14) — observed this run. Backs: remote MCP server GA and
  write-capability list; **MCP Auth Apps still labeled "Public Beta"**
  as of this post (the beta-status ambiguity in open questions).
- `https://developers.hubspot.com/changelog/june-2026-rollup`
  (2026-06-29) — observed this run. Backs: landing-page create/edit/
  publish ("an explicit confirmation step before the page goes live"),
  standalone content analytics, exclusions ("bulk operations, custom
  module creation, A/B test setup, or first-time site/account setup"),
  and existing users needing to "reconnect or re-authorize to grant the
  new permission scope. New connections prompt for it automatically."
  Reobserved this run; the current setup page now also documents newer
  conversation and marketing-email access directly.
- `https://knowledge.hubspot.com/user-management/hubspot-user-permissions-guide`
  — observed this run. Backs (flagged inference only): the **Developer
  tools access** permission (Account tab > Settings access) covering
  "app management" and other developer features; MCP Auth Apps not
  named; "you must be a Super Admin to access private apps" (private
  apps only — a different app type). Also backs, as a direct fact: the
  **Account** tab sits within the per-user permissions editing screen
  ("On the Account tab, you can set more granular permissions for
  account administration"), reached via the settings icon > **Users &
  Teams** > selecting a user.
- Pulse catalog record `com.pulsemcp.mirror/hubspot`, title **HubSpot** —
  observed `2026-08-11T15:40:29Z` from the operator's forced-catalog match.
  Backs the catalog-only add-server path and catalog identity. Prior research
  on this record also corroborated the remote URL, `streamable-http`, and
  absence of dynamic client registration.
- `https://mcp.hubspot.com` +
  `https://mcp.hubspot.com/.well-known/oauth-protected-resource` +
  `https://mcp.hubspot.com/.well-known/oauth-authorization-server` —
  direct endpoint observation reverified at
  `2026-08-11T15:40:29Z`. Backs:
  401/Bearer behavior with `resource_metadata` pointer, protected-
  resource metadata (resource `https://mcp.hubspot.com`, authorization
  server `https://mcp.hubspot.com`, `scopes_supported: []`,
  `resource_documentation: https://developers.hubspot.com/mcp`), and
  authorization-server metadata (endpoints, grant types, S256,
  `client_secret_post`, no `registration_endpoint`).
- `doctrine/speakeasy-setup.md` — observed
  `2026-08-11T15:40:29Z`. Backs the catalog add-server and manual OAuth
  attachment labels, fixed Speakeasy anchors, and closing pointer.
