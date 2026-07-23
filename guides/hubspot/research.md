---
research_version: 1
slug: hubspot
researched_at: 2026-07-22T23:59:17Z
---

# HubSpot — Research Dossier

Authoritative source ruling for this guide: the developer-docs setup page
**"Integrate AI tools with the HubSpot MCP server"** on
developers.hubspot.com is the source of truth for console UI facts
(navigation, button and field labels, step order) and for endpoint/auth
facts. The marketing overview at `developers.hubspot.com/ai-tools/mcp`
(the canonical target of `developers.hubspot.com/mcp`, which 301-redirects
to it — observed this run) carries partially stale content ("Supports
OAuth 2.0; OAuth 2.1 support ... coming later in 2025", "create a
user-level application with read scopes" — the pre-MCP-auth-apps flow) and
is used only for two facts no other source states: the
admin-connects-first behavior and the Sensitive Data Properties
restriction, both flagged where used. The developer changelog is used for
product status and for capability changes newer than the setup page.
Every load-bearing fact was fetched live this run (2026-07-22/23,
~23:55–00:15Z).

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
  "authenticated via OAuth 2.1 with PKCE." The OAuth client (here, the
  Speakeasy AI Control Plane) presents the **Client ID** and **Client
  secret** of an **MCP auth app** created in the HubSpot account (see
  credential flow). PKCE parameters per the setup page's troubleshooting
  section: `code_verifier` 43–128 characters, `code_challenge` via S256,
  `code_challenge_method=S256`.
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
  - Token lifecycle (setup page, Troubleshooting): access tokens expire
    after a set period; clients refresh with the `refresh_token` from
    the initial flow; an expired/invalidated refresh token requires
    re-running the full OAuth flow. Handled by the connecting client,
    not a console step.
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
  the current setup page carries no beta badge (observed this run) — see
  open questions.
- **Permissions model** (setup page, verbatim): "All actions respect
  your existing HubSpot user permissions. Users can only view and modify
  records they have access to in HubSpot."
- **Data access** (setup page, "Supported data and permissions",
  verbatim lists):
  - Read access — "CRM records: contacts, companies, deals, tickets,
    users, carts, invoices, orders, line items, products, quotes,
    subscriptions, and segments (lists)"; "Activities: calls, emails,
    meetings, notes, and tasks"; "Content and marketing: blog posts,
    landing pages, site pages, campaigns, and marketing events."
  - Write access — "CRM records: contacts, companies, deals, tickets,
    line items, and products"; "Activities: calls, emails, meetings,
    notes, and tasks."
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
- **Sensitive data** (setup page warning, verbatim): "If your HubSpot
  account has Sensitive Data turned on, activity objects (such as calls,
  emails, meetings, notes, and tasks) will be blocked from access
  through the MCP server." The overview page adds: "The HubSpot MCP
  server doesn't allow access to custom Sensitive Data Properties,
  including Personal Health Information." See
  {#sensitive-data-blocks-activities}.
- **Adjacent products, not this server** (recorded to prevent
  mis-navigation): the **developer MCP server** is a separate local tool
  — setup page note, verbatim: "The HubSpot MCP server documented on
  this page is separate from the developer MCP server. The developer MCP
  server helps developers build apps and CMS content assets locally on
  HubSpot's developer platform." The knowledge base's "HubSpot MCP
  Client" articles cover HubSpot's Breeze agents consuming *other*
  vendors' MCP servers — the reverse direction; also unrelated. The KB's
  "HubSpot connector for Claude" / "for ChatGPT" articles cover
  HubSpot-managed partner connectors, not the MCP auth app flow this
  guide documents.

## Credential flow

Who acts: a user in the HubSpot account who can open the **Development**
workspace from the main navigation bar — that is where **MCP Auth Apps**
lives. No HubSpot source names the exact permission that gates this UI.
The KB's user-permissions guide documents a **Developer tools access**
permission (Account tab > Settings access) that "lets users access and
manage developer features, including: app management, developer
projects, development sandboxes, personal access keys for CLI
authentication, and developer test accounts" — a flagged inference that
this is the gate; MCP Auth Apps is not named there (see open questions).

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
  field; how additional URLs are added is not documented (see open
  questions). Keep the Speakeasy AI Control Plane callback as the first
  (or only) entry.
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
re-authorize to grant the new permission scope."

### Sensitive Data blocks activity objects {#sensitive-data-blocks-activities}

Setup page warning, verbatim: "If your HubSpot account has Sensitive
Data turned on, activity objects (such as calls, emails, meetings,
notes, and tasks) will be blocked from access through the MCP server."
The overview page adds that "The HubSpot MCP server doesn't allow access
to custom Sensitive Data Properties, including Personal Health
Information." An account using HubSpot's Sensitive Data features loses
MCP access to all activity records.

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
  Whether Super Admin is required is unknown.
- **MCP Auth Apps beta status.** The MCP Auth Apps UI was announced as
  public beta (changelog 2026-01-20) and still labeled "Public Beta" in
  the Spring 2026 Spotlight (2026-04-14), but the current setup page
  shows no beta badge or label anywhere (checked explicitly this run),
  and no MCP-auth-apps GA announcement was found in the changelog
  through July 2026. Current status is ambiguous; the draft should not
  assert "public beta" as current fact.
- **How multiple redirect URLs are added.** The creation dialog
  documents a single **Redirect URL** field, yet the page says "If
  you're including multiple redirect URLs, the first redirect URL will
  be used as the default redirect" and the details page shows "redirect
  URLs" plural. Presumably added via **Edit info** on the details page;
  not documented. Needs console verification at capture time.
- **Admin-connects-first mechanics.** Only the overview page states the
  admin must connect first; no source defines which admin role
  qualifies, or what error/experience a non-admin user gets when
  connecting before any admin has. Needs console verification or
  provider confirmation.
- **"New HubSpot Developer Platform" prerequisite.** The overview page
  says the remote server requires being "on the new HubSpot Developer
  Platform"; the setup page and GA changelog state no such prerequisite
  ("generally available to all HubSpot accounts"). Whether older,
  non-migrated accounts lack the **Development** navigation entry is
  undocumented. The overview's statement may be stale beta-era text.
- **Client secret rotation.** No source documents whether an MCP auth
  app's Client secret can be regenerated or rotated from the details
  page. Not load-bearing for setup (the secret stays viewable), recorded
  for completeness.

## Provenance

Source inventory from the sweep. HubSpot publishes three documentation
properties, all checked this run:

- **Developer docs — developers.hubspot.com** (source of truth for this
  guide): the setup page, the `ai-tools/mcp` overview, and the developer
  changelog. No machine-readable index (`/llms.txt` returns 404,
  observed this run).
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
  ("Integrate AI tools with the HubSpot MCP server") — observed this run
  (2026-07-22/23). Also served verbatim at
  `.../build-apps/integrate-with-hubspot-mcp-server` (same page,
  confirmed this run). Backs: endpoint `https://mcp.hubspot.com`, PKCE
  requirement and troubleshooting detail, the full MCP-auth-app creation
  flow (navigation "main navigation bar ... **Development**", "left
  sidebar menu ... **MCP Auth Apps**", "**Create MCP auth app**", dialog
  fields **App name** / **Description** / **Redirect URL** / **Icon**,
  "**Create**"), multiple-redirect default behavior, details-page
  redirect and **Edit info**, general client connection values (Client
  ID / Client secret / Redirect URL) and the three-step end-user OAuth
  flow, supported-data read/write lists, permissions model, automatic
  scopes and re-install behavior, Sensitive Data warning, CRM-search/no
  vector search callout, developer-MCP-server distinction note,
  Streamable HTTP transport (MCP Inspector section), token
  refresh/expiry behavior. Explicitly checked this run: no beta badge
  anywhere on the page.
- `https://developers.hubspot.com/ai-tools/mcp` ("HubSpot MCP Server"
  overview; canonical target of `https://developers.hubspot.com/mcp`,
  which 301-redirects here — redirect observed this run) — observed this
  run. Backs (flagged, single-source): "The admin of the HubSpot account
  needs to connect first, to allow other users in the account to connect
  thereafter"; "The HubSpot MCP server doesn't allow access to custom
  Sensitive Data Properties, including Personal Health Information";
  remote-vs-developer server split. **Conflict**: page elsewhere says
  "Supports OAuth 2.0" with OAuth 2.1 "coming later in 2025" and
  describes creating "a user-level application with read scopes" — stale
  relative to the setup page and GA changelog; not used for auth or
  console-UI facts.
- `https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available`
  (2026-04-13, updated 2026-04-15) — observed this run. Backs: "The
  remote HubSpot MCP server is graduating from beta and is now generally
  available to all HubSpot accounts"; "authenticated via OAuth 2.1 with
  PKCE"; "Connect any MCP client that supports OAuth with PKCE to
  `https://mcp.hubspot.com` using your app's client ID and secret";
  GA-era read/write lists.
- `https://developers.hubspot.com/changelog/public-beta-self-service-mcp-auth-apps-for-the-hubspot-remote-mcp-server`
  (2026-01-20; beta live 2026-01-13) — observed this run. Backs: MCP
  Auth Apps UI launch as public beta, self-service lifecycle management,
  "End-user installation permissions for these apps are now managed
  automatically."
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
  new permission scope."
- `https://knowledge.hubspot.com/user-management/hubspot-user-permissions-guide`
  — observed this run. Backs (flagged inference only): the **Developer
  tools access** permission (Account tab > Settings access) covering
  "app management" and other developer features; MCP Auth Apps not
  named.
- Pulse mirror `com.pulsemcp.mirror/hubspot` version 0.0.1 (private
  tenant export snapshot 2026-07-18T04:42:42Z; upstream record updated
  2026-07-17) — backs: remote URL and `streamable-http` transport,
  OAuth metadata mirror (authorization/token endpoints, S256,
  `client_secret_post`), dynamic client registration `supported: false`,
  official-server flag.
- `https://mcp.hubspot.com` +
  `https://mcp.hubspot.com/.well-known/oauth-protected-resource` +
  `https://mcp.hubspot.com/.well-known/oauth-authorization-server` —
  direct endpoint observation this run (2026-07-23T00:03Z). Backs:
  401/Bearer behavior with `resource_metadata` pointer, protected-
  resource metadata (resource `https://mcp.hubspot.com`, authorization
  server `https://mcp.hubspot.com`, `scopes_supported: []`,
  `resource_documentation: https://developers.hubspot.com/mcp`), and
  authorization-server metadata (endpoints, grant types, S256,
  `client_secret_post`, no `registration_endpoint`).
