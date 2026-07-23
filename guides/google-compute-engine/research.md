---
research_version: 1
slug: google-compute-engine
researched_at: 2026-07-23T15:15:19Z
---

# Google Compute Engine — Research Dossier

Authoritative source ruling for this guide: Google Cloud's documentation
property `docs.cloud.google.com` is the source of truth for both product
facts and console UI facts. Two page families matter: the
Compute-Engine-specific MCP page ("Use the Compute Engine MCP server",
`/compute/docs/use-compute-engine-mcp`) and the shared Google Cloud MCP
docs set (`/mcp/*` — overview, supported products, authentication,
release notes, quotas). The OAuth consent-screen walkthrough lives on a
third property, `developers.google.com` (the Google Auth platform is
shared across Google products). `cloud.google.com` paths 301-redirect to
`docs.cloud.google.com` (redirect observed this run). Every load-bearing
fact was fetched live this run (2026-07-23, ~15:18–15:30Z), and endpoint
behavior was corroborated by direct observation against
`https://compute.googleapis.com/mcp`.

## Server facts

- **Remote URL**: `https://compute.googleapis.com/mcp`. Compute MCP page,
  "Configure an MCP client" section, verbatim: "**Server URL or
  Endpoint:** `https://compute.googleapis.com/mcp`". The MCP reference
  states "The Compute Engine API MCP server has the following global MCP
  endpoint: `https://compute.googleapis.com/mcp`" (global only — no
  regional endpoints are listed, unlike some other Google Cloud servers).
  Same URL in the Supported products table and the Pulse mirror.
  Corroborated by direct observation this run: a JSON-RPC `tools/list`
  POST to the URL returns HTTP 200 with the tool list.
- **Transport**: `streamable-http`. The compute MCP page's client
  configuration lists "**Transport:** HTTP"; the MCP reference's example
  request is a JSON POST with `accept: application/json,
  text/event-stream` (the streamable-HTTP content negotiation); the
  Pulse mirror records remote type `streamable-http`; and the direct
  observation this run (JSON-RPC POST answered with a JSON body over
  plain HTTPS) matches streamable-http.
- **Protocol version**: the MCP overview states "Our MCP servers support
  version 2025-11-25 of MCP", and the authentication concept page states
  the servers "implement the requirements of the MCP authorization
  specification version 2025-11-25 for HTTP-based transports."
- **Enablement**: no separate MCP switch. Compute MCP page, verbatim:
  "The Compute Engine remote MCP server is enabled when you enable the
  Compute Engine API." Release notes (March 17, 2026), verbatim:
  "Starting March 17, 2026, you no longer need to separately enable
  Model Context Protocol (MCP) servers. Remote MCP endpoints are
  available by default when you enable a supported product in your
  project."
- **Launch stage**: generally available. Release notes (May 1, 2026):
  "Google and Google Cloud remote MCP servers are generally available
  (GA). Individual MCP servers might be in Preview or GA—to check the
  launch status of a product, search for the product in Supported
  products." The Compute Engine row in Supported products carries no
  "(Preview)" marker (checked explicitly this run; many sibling rows do),
  and the compute MCP page shows no Preview badge. The Pulse mirror
  records the server as official, version 1.0.0, first published
  2026-04-21, record last updated 2026-07-17.
- **Authentication**: OAuth 2.0 with IAM. Compute MCP page, verbatim:
  "Compute Engine MCP servers use the OAuth 2.0 protocol with Identity
  and Access Management (IAM) for authentication and authorization. All
  Google Cloud identities are supported for authentication to MCP
  servers."
  - **Client registration is manual.** Both the authentication concept
    page and the setup page state, verbatim: "Google and Google Cloud
    remote MCP servers don't support Dynamic Client Registration or
    OAuth Client ID Metadata Documents." Corroborated this run: the
    authorization-server metadata at
    `https://accounts.google.com/.well-known/oauth-authorization-server`
    advertises no `registration_endpoint`. This backs
    `client_registration: manual` in the Metadata; an OAuth client must
    be created in the Google Cloud console (see credential flow).
  - **Discoverable OAuth metadata is published.** Live
    protected-resource metadata (observed this run) at
    `https://compute.googleapis.com/.well-known/oauth-protected-resource/mcp`:
    resource `https://compute.googleapis.com/mcp`, authorization servers
    `["https://accounts.google.com/"]`, bearer methods `["header"]`,
    `scopes_supported:
    ["https://www.googleapis.com/auth/compute"]`. (The path without the
    `/mcp` suffix returns 404.) Live authorization-server metadata at
    accounts.google.com (observed this run): authorization endpoint
    `https://accounts.google.com/o/oauth2/v2/auth`, token endpoint
    `https://oauth2.googleapis.com/token`,
    `token_endpoint_auth_methods_supported: ["client_secret_post",
    "client_secret_basic"]`, `code_challenge_methods_supported` present.
  - **Anonymous discovery, authenticated calls.** Compute MCP page,
    verbatim: "The tools/list method doesn't require authentication."
    Observed this run: unauthenticated `tools/list` returns HTTP 200;
    an unauthenticated `tools/call` returns HTTP 401 with "Request is
    missing required authentication credential. Expected OAuth 2 access
    token, login cookie or other valid authentication credential."
  - **Excluded alternatives** (recorded so the guide documents one
    Authentication Option deliberately): the setup page's other methods
    are an `Authorization` header carrying a gcloud-minted bearer token
    — "By default, bearer tokens expire after 1 hour. You can extend
    the lifetime of a token up to 12 hours" — which cannot serve as a
    static header value; and API keys, which do not apply because
    "Services that require a principal for Identity and Access
    Management (IAM) don't support Standard API key credentials for
    authentication" (Compute Engine uses IAM). ADC applies to
    Google-owned or locally running applications, not a hosted control
    plane. The OAuth 2.0 client ID and secret method is the documented
    fit: "Connecting from a Google-owned or third-party application."
- **OAuth scopes — recorded conflict.** The compute MCP page's
  "Compute Engine MCP OAuth scopes" table (column header "Scope URI for
  gcloud CLI") lists exactly two scopes, verbatim:
  - `https://www.googleapis.com/auth/compute.read-only` — "Only allows
    access to read data."
  - `https://www.googleapis.com/auth/compute.read-write` — "Allows
    access to read and modify data."
  The live protected-resource metadata (observed this run) instead
  advertises `scopes_supported:
  ["https://www.googleapis.com/auth/compute"]` — the classic Compute
  Engine scope, matching the pattern where BigQuery's MCP page and live
  metadata agree on `https://www.googleapis.com/auth/bigquery`. The
  documented `.read-only`/`.read-write` strings appear nowhere else in
  the fetched sources. The guide should use
  `https://www.googleapis.com/auth/compute` (the endpoint-advertised
  scope; read-write, covering the server's write tools) — flagged
  decision, see open questions. The page adds: "Additional scopes might
  be required on the resources accessed during a tool call."
- **IAM requirements**: two layers, both on the Google Cloud project.
  - MCP layer, compute MCP page verbatim: "Make MCP tool calls: MCP
    Tool User (`roles/mcp.toolUser`)", containing the `mcp.tools.call`
    permission. Same role stated on the setup page.
  - Product layer, compute MCP page verbatim: "You also need the roles
    and permissions required to perform the Compute Engine operations.
    For more information, see Compute Engine roles and permissions."
    The page's own "Before you begin" tells the admin: "Make sure that
    you have the following role or roles on the project: Compute
    Instance Admin (v1), Compute Security Admin, Service Account User,
    Service Usage Admin." The Compute Engine IAM page supplies the role
    IDs and pairing rule: Compute Instance Admin (v1) is
    `roles/compute.instanceAdmin.v1` ("Full control of Compute Engine
    instances, instance groups, disks, snapshots, and images"), and
    "granting `roles/iam.serviceAccountUser` and
    `roles/compute.instanceAdmin.v1` together gives members permission
    to ... Create an instance that runs as a service account" — the
    Service Account User role is what lets a user manage VMs that run
    as a service account. Compute Security Admin is
    `roles/compute.securityAdmin` (per the same IAM page).
  - Access is capped per user: the authentication concept page states
    "the MCP client has the same permissions as you do on Google and
    Google Cloud resources, and actions taken by the MCP client are
    attributed to you." Google recommends a separate agent identity for
    production ("We recommend that you create a separate identity for
    agents that are using MCP tools so that access to resources can be
    controlled and monitored") — recorded as context; the guide's OAuth
    flow authenticates each connecting user as themselves.
- **Billing**: the "Before you begin" flow requires "Verify that
  billing is enabled for your Google Cloud project." Resources managed
  through the server are ordinary Compute Engine resources billed to
  the project; the `create_instance` tool provisions real VMs and
  "If machine_type is not provided, it defaults to `e2-medium`. If
  image_project and image_family are not provided, it defaults to
  `debian-12` image from `debian-cloud` project" (MCP reference tool
  description — named here because silent defaults on a billable
  create are setup-relevant). No MCP-specific charge is documented.
- **Quotas**: the shared quotas page states, verbatim: "There are no
  quotas or system limits associated with Google Cloud MCP servers.
  Quotas and system limits might apply to Google or Google Cloud
  products you use through Google Cloud MCP servers."
- **Regional routing**: compute MCP page note, verbatim: "The
  Compute Engine remote MCP server doesn't support full regional
  isolation and it might route calls to MCP tools through any region."
  Relevant to admins with data-residency constraints.
- **Write tools exist**: the server's tool list includes
  create/delete/start/stop/reset instance and set-machine-type
  operations alongside read-only listings (MCP reference; corroborated
  by the live `tools/list`, where `create_instance` carries
  `destructiveHint: true`). Recorded because it makes the read-write
  scope and role choices consequential; the inventory itself is
  runtime truth and is not cataloged here.
- **Optional org-level controls** (context, not guide steps): IAM deny
  policies can block MCP tool access — since July 2, 2026 "You can use
  the tool.name attribute to control access to specific MCP tools in
  your Identity and Access Management (IAM) allow and deny policies" —
  and Model Armor can screen MCP calls after enabling the Model Armor
  API (compute MCP page, "Optional security and safety configurations").
  Toolsets (per-toolset endpoints) exist for "some" servers per the MCP
  overview; the Compute Engine MCP reference lists only the single
  global endpoint and no toolsets.

## Credential flow

Who acts: a Google Cloud project administrator. The tasks below need,
on the project: permission to enable APIs (the Service Usage Admin
role, `roles/serviceusage.serviceUsageAdmin`, per the Service Usage
doc's "Required roles"), permission to grant IAM roles, and access to
the Google Auth platform pages to configure the consent screen and
create the OAuth client. Project Owner covers all of these — flagged
inference from the compute MCP page's role note pattern ("If you
created the project, then you likely already have this permission
through the Owner role (`roles/owner`)", stated there for API
enablement) and the bigquery guide precedent; no single page states
Owner suffices for the full set.

What gets created: one OAuth 2.0 **Web application** client in the
project's Google Auth platform. Google generates a **Client ID** and a
**Client secret** for it. The secret is shown once, in the
**OAuth 2.0 client created** dialog — setup page, verbatim: "In the
Client secrets section, copy the Client secret and save it in a secure
place. You can only copy it once. If you lose it, delete the secret
and create a new one." and "treat client secrets like passwords and
store them in a secure place."

Values the Speakeasy AI Control Plane needs, and where they come from:

| Value | Origin |
| --- | --- |
| OAuth client ID | Generated by Google; shown in the **OAuth 2.0 client created** dialog ({#copy-client-credentials}) |
| OAuth client secret | Same dialog, **Client secrets** section — copyable once ({#copy-client-credentials}) |
| Scopes | `https://www.googleapis.com/auth/compute` (endpoint-advertised; see the scope conflict in Server facts) |

Where `{{ gram.oauth.callback_url }}` gets pasted: into the
**Authorized redirect URIs** field of the **Create client** page
({#create-oauth-client}). The compute MCP page's "Redirect URIs"
section: "For web-based applications, and some desktop applications,
you must allowlist a redirect URI when you create a client ID and
secret for authentication. Redirect URIs are used by the authorization
server to send tokens to your application. Your application's
documentation should specify the redirect URI that you must use.
Custom redirect URIs aren't supported." (Here "custom" means
non-HTTPS custom URI schemes — the June 15, 2026 release note about
Cursor's `cursor://` callback is the documented example; a normal
HTTPS callback URL is the supported case.)

After setup, each end user connecting from the Speakeasy AI Control
Plane signs in through Google's OAuth flow with their own Google
account. For them to succeed: the account must hold **MCP Tool User**
plus the Compute Engine roles on the project ({#grant-iam-roles}),
and — while an External-audience consent screen is in **Testing**
status — the account must be listed as a test user
({#consent-screen}).

## Console walkthrough

Primary sources: the compute MCP page (roles, IAM steps, redirect-URI
rule), the Service Usage doc (API enablement steps), the Workspace
consent-screen guide (Google Auth platform wizard, verbatim labels),
and the MCP authentication setup page (client creation, verbatim
labels). Flow: enable the API → grant roles → configure consent →
create the client → copy the credentials. The consent-before-client
order is documented: the consent guide ends "Next step: Create access
credentials for your app", and its own flow notes the **Get Started**
gate ("If you see a message that says Google Auth platform not
configured yet, click Get Started").

Entry into the console: sign in at
[console.cloud.google.com](https://console.cloud.google.com) and pick
the project — "In the Google Cloud console, on the project selector
page, select or create a Google Cloud project" and "Verify that
billing is enabled for your Google Cloud project" (compute MCP page,
Before you begin). The project selector sits on the console toolbar;
all steps below happen inside this one project.

### Enable the Compute Engine API {#enable-compute-engine-api}

- Navigation (Service Usage doc, "Enable a service > Console"): "In
  the Google Cloud console, go to the **APIs & Services** > **API
  Library** page." The doc names the path as a group > page pair
  without spelling out how to reach it; reading it as the console
  navigation-menu path **APIs & Services** > **API Library** is a
  flagged inference matching the IAM-path pattern below — see open
  questions. Then "Select a recent project or use the resource
  selector on the console toolbar to select the Google Cloud project
  where you want to enable an API", "Click the API you want to enable
  or search for it using the **Search for APIs & Services** box", and
  "Click **Enable**." The API to enable is the **Compute Engine API**
  (`compute.googleapis.com` — service name per the shared quotas page's
  example: "the service name for Compute Engine is
  compute.googleapis.com"). The compute MCP page's own "Enable the
  Compute Engine API" button deep-links to the API's console overview
  page (`https://console.cloud.google.com/apis/api/compute.googleapis.com/overview`,
  link target observed this run), which shows the same Enable control.
- Role gate recorded in this step: enabling needs the Service Usage
  Admin role (`roles/serviceusage.serviceUsageAdmin`) or equivalent
  (Service Usage doc, Required roles; project creators have it via
  Owner).
- The MCP server comes with the API: "The Compute Engine remote MCP
  server is enabled when you enable the Compute Engine API." There is
  no separate MCP toggle to hunt for (release note, March 17, 2026).
- Values entered: the search term `Compute Engine API`. Values copied:
  none.
- Screenshot note: the API Library page showing the **Compute Engine
  API** entry with the **Enable** button visible (or the API's overview
  page showing it already enabled).
- Recovery: none — if the page shows the API as already enabled,
  there is nothing to do; enabling is idempotent.

### Grant IAM roles {#grant-iam-roles}

- Do this for every user who will connect from the Speakeasy AI
  Control Plane (each end user authorizes as themselves; their IAM
  roles cap what the server will do for them).
- Navigation: the compute MCP page links "go to the **IAM** page"
  (console target `iam-admin/iam`, link observed this run — the
  navigation-menu path **IAM & Admin** > **IAM** is a flagged
  inference from that URL and the sibling quotas page's spelled-out
  "IAM & Admin > Quotas & System Limits" pattern; see open questions).
  Then "Select the project."
- Steps (compute MCP page, "Grant the roles", verbatim): "Click
  person_add **Grant access**." — "In the **New principals** field,
  enter your user identifier. This is typically the email address for
  a Google Account." — "Click **Select a role**, then search for the
  role." — "To grant additional roles, click add **Add another role**
  and add each additional role." — "Click **Save**."
- Roles to grant, with sources:
  - **MCP Tool User** (`roles/mcp.toolUser`) — required to "Make MCP
    tool calls" (compute MCP page, Required roles).
  - **Compute Instance Admin (v1)** (`roles/compute.instanceAdmin.v1`)
    — "Full control of Compute Engine instances, instance groups,
    disks, snapshots, and images" (Compute Engine IAM page); the
    server's tools operate on exactly these resource types.
  - **Service Account User** (`roles/iam.serviceAccountUser`) — needed
    together with Instance Admin to "Create an instance that runs as a
    service account" (Compute Engine IAM page); most projects' default
    VM setup attaches a service account, so omitting this breaks VM
    creation. The IAM page recommends granting it on a specific
    service account rather than project-wide ("Recommended. Grant the
    role to a member on a specific service account.").
  - The compute MCP page's fuller admin list adds **Compute Security
    Admin** (`roles/compute.securityAdmin`) and **Service Usage
    Admin**; these serve the admin running the whole setup, not every
    connecting user. Narrower or broader Compute role sets are
    legitimate — the docs' rule is "the roles and permissions required
    to perform the Compute Engine operations" (see open questions).
- Values entered: each connecting user's Google Account email; role
  names into the role search. Values copied: none.
- Screenshot note: the **Grant access** panel with a principal entered
  and **MCP Tool User** plus **Compute Instance Admin (v1)** visible in
  the role list.
- Recovery: nothing bites — roles can be re-edited from the same IAM
  page at any time.

### Configure the consent screen {#consent-screen}

- One-way door recorded up front (consent guide, verbatim): "For
  security reasons, you can't remove the OAuth 2.0 consent screen
  after you've configured it." Nothing else here is destructive.
- Navigation (consent guide, verbatim): "In the Google API Console, go
  to Menu menu > **Google Auth platform** > **Branding**." (The same
  Google Auth platform section is reachable in the Google Cloud
  console; the MCP setup page uses the spelling "Google Auth Platform"
  for the sibling Clients page — recorded verbatim per source.)
- First-time gate: "If you see a message that says **Google Auth
  platform not configured yet**, click **Get Started**."
  Already-configured state (consent guide, verbatim): "If you have already
  configured the Google Auth platform, you can configure the following
  OAuth Consent Screen settings in Branding, Audience, and Data
  Access." — the wizard only runs behind **Get Started**; a project
  whose platform is already configured (no not-configured message)
  goes straight to the **Data Access** scope step and, for External
  apps, the **Audience** test-user step. The wizard runs as follows
  (consent guide, verbatim labels):
  - "Under **App Information**, in **App name**, enter an App name" —
    a recognizable name such as `Speakeasy AI Control Plane`; "In
    **User support email**, choose a support email address"; "Click
    **Next**."
  - "Under **Audience**, select the user type for your app": choose
    **Internal** if every connecting user belongs to your Google
    Workspace organization; **External** otherwise. "Click **Next**."
  - "Under **Contact Information**, enter an **Email address**";
    "Click **Next**."
  - "Under **Finish**, review the Google API Services User Data Policy
    and if you agree, select **I agree to the Google API Services:
    User Data Policy**. Click **Continue**. Click **Create**."
- Scopes: "click **Data Access** > **Add or Remove Scopes**", select
  or manually add the scope, then "click **Save**." The support KB's
  Data Access page names the panel's controls: for an unlisted scope,
  "use the text box in the **Manually add scopes** section of the
  page to add a new unlisted scope", and click the **Update** button
  after selecting all scopes to add (Manage App Data Access; the KB
  prints console button labels in styled caps — "ADD OR REMOVE
  SCOPES", "UPDATE" — where the consent guide prints "Add or Remove
  Scopes"; same controls, and the guide follows the consent guide's
  mixed-case rendering). So both branches have named controls:
  select from the list, or type into **Manually add scopes**; then
  **Update** (panel), then **Save** (page). The scope to add is
  `https://www.googleapis.com/auth/compute` (the
  endpoint-advertised scope — see the recorded conflict in Server
  facts; whether it appears in the picker list or needs the
  **Manually add scopes** box is unverified, see open questions). The
  consent guide
  frames explicit scope listing as needed "for use outside of your
  Google Workspace organization"; recorded as documented — the guide
  should include the step unconditionally, matching the shipped
  BigQuery guide's pattern (drafting decision, flagged).
- Test users (External only): "If you selected External for user type,
  add test users: Click **Audience**. Under **Test users**, click
  **Add users**. Enter your email address and any other authorized
  test users, then click **Save**." Every Google account that will
  connect from the Speakeasy AI Control Plane must be listed while the
  app's publishing status is Testing.
- Caveat recorded in the step it bites (Google OAuth 2.0 policy doc,
  verbatim): "A Google Cloud Platform project with an OAuth consent
  screen configured for an external user type and a publishing status
  of 'Testing' is issued a refresh token expiring in 7 days" — an
  External app left in Testing drops every connection weekly; publish
  the app to production for persistent connections. Also relevant at
  scale: "There is currently a limit of 100 refresh tokens per Google
  Account per OAuth 2.0 client ID."
- Publish to production — the remedy's console surface (support KB):
  the publishing status is managed on the **Audience** page — "Manage
  your app publishing status in the Audience page of the Google Auth
  Platform" (Manage OAuth App Branding) — and the control is the
  **Publish app** button: "A project's publishing status is
  considered **In production** after selecting the **Publish app**
  button" (Manage App Audience). The same page corroborates the
  Testing expiry ("Authorizations by a test user will expire seven
  days from the time of consent") and caps Testing at 100 test
  users ("Projects configured with a publishing status of **Testing**
  are limited to up to 100 test users listed in the OAuth consent
  screen"). Verification caveat, verbatim: "Your project's
  configuration may be subject to verification before its name and
  logo are displayed on an authorization screen or before it may
  request authorization of sensitive or restricted scopes" — see the
  scope-classification open question.
- Values entered: App name, support email, audience choice, contact
  email, the compute scope, test-user emails. Values copied: none.
- Screenshot note: the **Data Access** page with the Compute Engine
  scope present in the selected-scopes table.

### Create the OAuth client {#create-oauth-client}

- Navigation (MCP setup page, verbatim): "In the Google Cloud console,
  go to **Google Auth Platform** > **Clients** > **Create client**."
  ("You are prompted to create a project if you don't have one
  selected.")
- Steps (MCP setup page, verbatim labels):
  - "In the **Application type** list, select **Web application**."
    (The Desktop-app variant is for applications running on a local
    machine; the Control Plane is web-based — the page's rule: "If you
    access your application through the internet, then select Web.")
  - "In the **Name** field, enter a name for your application."
  - "In the **Authorized redirect URIs** section, click **+ Add URI**,
    and then enter" the callback URL — paste
    `{{ gram.oauth.callback_url }}` (copied from the Speakeasy
    **Attach Remote Identity Provider** sheet, see Speakeasy setup).
  - The page also documents an "**Authorized JavaScript origins**"
    section for "Applications that use client-side JavaScript to
    access Google's APIs" — not this flow; leave it empty (flagged
    decision: the docs assign it to client-side-JS apps only).
  - "Click **Create**. The client is created. The **OAuth 2.0 client
    created** dialog opens."
- Warning that belongs in the step above the click: the next dialog
  shows the client secret exactly once — have a secure place ready
  before clicking **Create**.
- Values entered: client name, `{{ gram.oauth.callback_url }}`.
  Values copied: none yet (the dialog is the next step).
- Screenshot note: the **Create client** form with **Web application**
  selected and one **Authorized redirect URIs** entry filled.

### Copy the client credentials {#copy-client-credentials}

- Source (MCP setup page, verbatim): "In the **Client secrets**
  section, copy the **Client secret** and save it in a secure place.
  You can only copy it once. If you lose it, delete the secret and
  create a new one." Caution, verbatim: "treat client secrets like
  passwords and store them in a secure place."
- Copy the **Client ID** and the **Client secret** from the
  **OAuth 2.0 client created** dialog into the matching Speakeasy AI
  Control Plane fields ({#connect-speakeasy-credentials}).
- Values copied: Client ID and Client secret → Speakeasy AI Control
  Plane credential fields.
- Screenshot exception: the credential values are plain text fields
  whose appearance adds nothing beyond the copied values.
- Recovery: the Client ID remains visible on the client's page
  afterward; the secret does not. If the secret is lost, follow the
  documented recovery — delete the secret and create a new one. The
  docs do not name the exact surface for that action; it is on the
  client's detail page in the Clients list (flagged inference — needs
  console verification at capture time; see open questions).

## Speakeasy setup

Transcluded from `docs/speakeasy-setup.md` (canonical Speakeasy-side
flow; anchors `{#add-server-in-speakeasy}` and
`{#connect-speakeasy-credentials}` are fixed there and carried
verbatim — never re-minted). Provenance for the transcluded facts:
`docs/speakeasy-setup.md` (product source `speakeasy-api/gram`,
`client/dashboard`, `main` @ `96f7f73`), observed this run
(2026-07-23T15:15:19Z). Per-guide values the skeleton renders with:

- **Remote URL**: `https://compute.googleapis.com/mcp` (the add form's
  **Transport** field is read-only; the Control Plane proxies remote
  servers over streamable-http, matching this server's transport).
- Whether Google Compute Engine appears in the Speakeasy MCP Catalog
  is unverified — the Writer renders both skeleton branches
  (**3rd-party server** and **Custom remote server**) as the skeleton
  provides; the search term for the catalog branch is
  `Compute Engine`.
- **Authentication Option**: `oauth-client` (OAuth with a
  pre-registered client; `client_registration: manual`). The provider
  publishes discoverable OAuth metadata (protected-resource and
  authorization-server metadata, observed this run — so **Use
  Discovered** may be offered), but Dynamic Client Registration is
  unsupported, so a manually created client is required either way;
  the manual path (**Configure Manually**, **Client Type** →
  **Manual**) is the documented fit.
- The **Redirect URI** shown in the **Attach Remote Identity
  Provider** sheet (`{{ gram.oauth.callback_url }}`) is the value the
  reader registers under **Authorized redirect URIs** in
  {#create-oauth-client}. Sequence note for the Writer: the reader
  needs that value before finishing {#create-oauth-client}, so the
  guide must have them copy it from the sheet (or the template value)
  before the provider-side client-creation step completes.
- Credential fields and their producing steps:
  - **Client ID** ← {#copy-client-credentials}.
  - **Client Secret (optional)** ← {#copy-client-credentials} — for
    Google web-application clients the secret is required at token
    exchange (the authorization server supports `client_secret_post` /
    `client_secret_basic`; observed AS metadata), so the guide treats
    the field as required despite its "(optional)" label.
  - Scopes the provider requires:
    `https://www.googleapis.com/auth/compute` (see the scope conflict
    in Server facts and open questions).
- **Further-reading URL** for the closing pointer:
  `https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp`
  (the provider's primary MCP documentation page).

## Open questions

- **Which scope string the flow accepts.** The compute MCP page
  documents `https://www.googleapis.com/auth/compute.read-only` and
  `.../auth/compute.read-write` as the server's "MCP tool OAuth
  scopes", but the live protected-resource metadata advertises only
  the classic `https://www.googleapis.com/auth/compute` — and the
  documented strings appear in no other fetched source (BigQuery's
  equivalent table and metadata agree with each other, making the
  compute table the outlier). The Dossier directs the guide to the
  endpoint-advertised `auth/compute`. Whether Google's consent screen
  scope picker and authorization endpoint also accept the
  `.read-only`/`.read-write` strings — and whether a read-only-scoped
  connection is possible through them — needs console verification at
  capture time.
- **Whether the Data access scope declaration is required for this
  flow.** The consent guide frames the **Add or Remove Scopes** step
  as for apps "for use outside of your Google Workspace organization";
  for Internal apps, scopes "aren't listed on the consent screen". No
  source states whether the Control Plane's authorization request
  fails if the compute scope is not declared in **Data Access**. The
  drafting decision (matching the shipped BigQuery guide) is to
  include the step unconditionally — harmless if redundant.
- **Navigation-menu paths to the API Library and IAM pages.** The
  Service Usage doc says "go to the **APIs & Services** > **API
  Library** page" and the compute MCP page says "go to the IAM page"
  with a deep link (`.../iam-admin/iam`); neither spells out the
  console navigation menu. The spelled-out menu paths (**APIs &
  Services** > **API Library**; **IAM & Admin** > **IAM**) are
  inferred from those wordings, the deep-link URL, and the sibling
  quotas page's "IAM & Admin > Quotas & System Limits" pattern. Need
  console verification at capture time.
- **Where Google Auth platform sits in the console navigation — and
  how its internal navigation works.** The docs reach **Branding**,
  **Data Access**, **Audience**, and **Clients** through direct
  "Go to" links and a "Menu menu >" prefix; none of the fetched pages
  spells out the navigation-menu group the Google Auth platform entry
  lives under, where within the section the **Branding** /
  **Audience** / **Data Access** / **Clients** controls sit (so
  capture-time verification can anchor clicks like "Click **Data
  Access**" to their surface), which page the wizard's final
  **Create** click lands the admin on, or where an already-configured
  app's user type is displayed (the **Audience** page is the presumed
  surface, per the Manage App Audience KB). Needs console verification
  at capture time.
- **Sensitive/restricted classification of the compute scope.** The
  consent guide describes non-sensitive / sensitive / restricted scope
  categories with escalating review requirements for External apps,
  but no fetched source classifies
  `https://www.googleapis.com/auth/compute`. An External app
  publishing to production may face verification (the Manage App
  Audience caveat, recorded in the consent-screen step); whether this
  scope triggers it is undocumented.
- **Minimal Compute role set for read-only use.** The docs' rule is
  the open-ended "roles and permissions required to perform the
  Compute Engine operations". The Dossier records the documented
  admin set and the Instance Admin + Service Account User pairing;
  whether e.g. Compute Viewer alone suffices for the list/get tools is
  not stated anywhere fetched.
- **Client-secret recovery surface.** "Delete the secret and create a
  new one" is documented, but no fetched page names the console
  surface (the client's detail page is the presumed location). Needs
  console verification at capture time.
- **Speakeasy MCP Catalog presence.** Whether a Google Compute Engine
  entry exists in the catalog determines which add-server branch the
  reader lands in; verifiable only in the product at capture time.

## Provenance

Source inventory from the sweep. Google's documentation spans three
properties, all checked this run:

- **Product/developer docs — docs.cloud.google.com** (source of truth
  for this guide): the Compute Engine MCP page and reference, the
  shared `/mcp/*` set (overview, supported products, authenticate,
  set-up-authentication, release notes, quotas), the Service Usage
  doc, and the Compute Engine IAM doc. `cloud.google.com` 301-redirects
  here (observed this run). No machine-readable index —
  `docs.cloud.google.com/llms.txt` returns 404 (observed this run).
- **Google identity/Workspace developer docs — developers.google.com**:
  the OAuth consent-screen guide (the Google Auth platform is
  documented here, not on the Cloud property) and the OAuth 2.0 policy
  page (refresh-token expiry rules). Drawn from for those two pages.
- **Support KB — support.google.com/cloud** ("Google Cloud Platform
  Console Help"): documents the Google Auth platform console surfaces
  page by page (Branding, Audience, Data Access, Clients). Drawn from
  for the publish-to-production control and the **Manually add
  scopes** panel. (The initial sweep recorded this property as absent;
  corrected in revision round 1 — the MCP and Compute product docs
  live on docs.cloud.google.com, but the console-surface KB is real
  and separate.)
- Also in the sweep, not drawn from: the Google Cloud MCP GitHub
  repository (local stdio servers — different product family, linked
  from Supported products), and the `/mcp` product landing page
  (marketing shell over the doc links above).

One entry per source drawn from (all fetched live this run,
2026-07-23; `observed_at` recorded as this run's workflow timestamp):

- `https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp`
  ("Use the Compute Engine MCP server"; page footer "Last updated
  2026-07-20 UTC") — backs: endpoint URL and "Transport: HTTP",
  server-enabled-with-API, no-regional-isolation note, Before-you-begin
  (project selector, billing check, admin role list "Compute Instance
  Admin (v1), Compute Security Admin, Service Account User, Service
  Usage Admin", "Enable the Compute Engine API" deep link), Required
  roles ("MCP Tool User (roles/mcp.toolUser)", `mcp.tools.call`,
  "roles and permissions required to perform the Compute Engine
  operations"), Grant-the-roles console steps (Grant access / New
  principals / Select a role / Add another role / Save), OAuth-with-IAM
  authentication statement, the MCP scopes table
  (`compute.read-only` / `compute.read-write`), "Additional scopes
  might be required", Redirect URIs section ("Custom redirect URIs
  aren't supported"), unauthenticated `tools/list`, Model Armor and
  IAM-deny-policy sections. Checked explicitly this run: no Preview
  badge on the page.
- `https://docs.cloud.google.com/compute/docs/reference/mcp`
  ("Compute Engine MCP reference") — backs: "global MCP endpoint"
  `https://compute.googleapis.com/mcp`, the example `tools/list` curl
  with `accept: application/json, text/event-stream`, the tool list
  including write tools, `create_instance` defaults (`e2-medium`,
  `debian-12` from `debian-cloud`), no toolsets listed.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers`
  ("Set up authentication for Google and Google Cloud MCP servers";
  footer "Last updated 2026-07-17 UTC") — backs: DCR/Client-ID-
  Metadata-Documents limitation, MCP Tool User requirement, the
  authentication-methods table, full Web-application client creation
  steps ("Google Auth Platform > Clients > Create client",
  **Application type** / **Web application**, **Name**, **Authorized
  JavaScript origins**, **Authorized redirect URIs**, **+ Add URI**,
  **Create**, "OAuth 2.0 client created" dialog, **Client secrets**
  one-time copy and delete-and-recreate recovery, treat-like-passwords
  caution), Desktop-vs-Web selection rule, bearer-token lifetime
  (1 hour default, 12-hour max), API-key inapplicability to IAM
  services.
- `https://docs.cloud.google.com/mcp/authenticate-mcp` ("Authenticate
  to Google and Google Cloud MCP servers") — backs: MCP authorization
  spec version 2025-11-25, same-permissions-as-you and attribution
  statement, separate-agent-identity recommendation, DCR limitation
  (restated), OAuth client ID concept ("within the scopes that the
  user has authorized ... actual user credentials are never shared
  with or stored in the AI application").
- `https://docs.cloud.google.com/mcp/overview` ("Google Cloud MCP
  servers overview") — backs: MCP version 2025-11-25, toolsets
  concept, MCP-authorization compliance, feature list.
- `https://docs.cloud.google.com/mcp/supported-products` ("Supported
  products") — backs: Compute Engine row (endpoint, reference and
  guide links) with no "(Preview)" marker; the sibling-row Preview
  markers that make that absence meaningful.
- `https://docs.cloud.google.com/mcp/release-notes` ("Google Cloud MCP
  servers release notes"; footer "Last updated 2026-07-22 UTC") —
  backs: GA announcement (May 1, 2026), automatic enablement with the
  product API (Feb 17 / Mar 17, 2026), IAM `tool.name` control
  (July 2, 2026), the Cursor custom-URI-scheme redirect issue and fix
  (June 15 / July 22, 2026), Preview launch (Dec 10, 2025).
- `https://docs.cloud.google.com/mcp/quotas` ("Quotas and system
  limits") — backs: no MCP-specific quotas; product quotas apply;
  Compute service name `compute.googleapis.com` example.
- `https://docs.cloud.google.com/service-usage/docs/enable-disable`
  ("Enable and disable services") — backs: API Library console steps
  ("APIs & Services > API Library", resource selector, "Search for
  APIs & Services" box, "Click Enable"), Service Usage Admin
  requirement (`roles/serviceusage.serviceUsageAdmin`).
- `https://docs.cloud.google.com/compute/docs/access/iam` ("Compute
  Engine IAM roles and permissions") — backs: role IDs
  `roles/compute.instanceAdmin.v1` (with "Full control of Compute
  Engine instances, instance groups, disks, snapshots, and images"),
  `roles/compute.securityAdmin`, `roles/iam.serviceAccountUser`, the
  Instance Admin + Service Account User pairing for VMs that run as a
  service account, and the grant-on-specific-service-account
  recommendation.
- `https://developers.google.com/workspace/guides/configure-oauth-consent`
  ("Configure the OAuth consent screen and choose scopes"; footer
  "Last updated 2026-04-20 UTC") — backs: the full Google Auth
  platform wizard (Branding entry, "Google Auth platform not
  configured yet" / **Get Started**, App Information / Audience /
  Contact Information / Finish labels and clicks), the
  already-configured statement ("If you have already configured the
  Google Auth platform..."), **Data Access** >
  **Add or Remove Scopes** > **Save**, External test-user steps,
  consent-screen irrevocability, scope categories
  (non-sensitive/sensitive/restricted), external-apps-only framing of
  scope listing, "Next step: Create access credentials".
- `https://developers.google.com/identity/protocols/oauth2` ("Using
  OAuth 2.0 to Access Google APIs") — backs: 7-day refresh-token
  expiry for External apps in Testing, 100-refresh-tokens-per-account
  limit, other refresh-token invalidation causes.
- `https://support.google.com/cloud/answer/15549945` ("Manage App
  Audience"; fetched live this run, revision round 1) — backs: the
  **Publish app** button and the **Testing** / **In production**
  publishing statuses ("A project's publishing status is considered
  **In production** after selecting the **Publish app** button"), the
  100-test-user cap in Testing, the 7-day test-user authorization
  expiry, and the may-be-subject-to-verification caveat.
- `https://support.google.com/cloud/answer/15549049` ("Manage OAuth
  App Branding"; fetched live this run, revision round 1) — backs:
  publishing status is managed on the **Audience** page ("Manage your
  app publishing status in the Audience page of the Google Auth
  Platform").
- `https://support.google.com/cloud/answer/15549135` ("Manage App
  Data Access"; fetched live this run, revision round 1) — backs: the
  **Manually add scopes** text box for unlisted scopes and the
  **Update** button on the scopes panel, and the KB's styled-caps
  printing of those button labels.
- Pulse mirror `com.googleapis.compute/mcp` version 1.0.0 (private
  tenant export snapshot 2026-07-18T04:42:42Z; record published
  2026-04-21, last updated 2026-07-17; official-server flag) — backs:
  remote URL and `streamable-http` transport, header-auth option
  shape, `x-goog-user-project` billing-attribution header (bearer-
  token method only), documentation URL.
- `https://compute.googleapis.com/mcp` — direct endpoint observation
  this run (2026-07-23T15:24Z): unauthenticated `tools/list` → HTTP
  200 with tool list (`create_instance` carrying
  `destructiveHint: true`); unauthenticated `tools/call` → HTTP 401
  "Request is missing required authentication credential. Expected
  OAuth 2 access token, login cookie or other valid authentication
  credential."
- `https://compute.googleapis.com/.well-known/oauth-protected-resource/mcp`
  — direct observation this run: resource
  `https://compute.googleapis.com/mcp`, authorization servers
  `["https://accounts.google.com/"]`, `bearer_methods_supported:
  ["header"]`, `scopes_supported:
  ["https://www.googleapis.com/auth/compute"]`. (Path without `/mcp`
  → 404, observed.)
- `https://accounts.google.com/.well-known/oauth-authorization-server`
  — direct observation this run: authorization endpoint
  `https://accounts.google.com/o/oauth2/v2/auth`, token endpoint
  `https://oauth2.googleapis.com/token`, `client_secret_post` /
  `client_secret_basic`, no `registration_endpoint`.
- `https://bigquery.googleapis.com/.well-known/oauth-protected-resource/mcp`
  + `https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp` —
  fetched this run solely as the comparison point for the scope
  conflict (BigQuery's documented scope table and live metadata agree
  on `https://www.googleapis.com/auth/bigquery`); no Compute facts
  drawn from them.
- `docs/speakeasy-setup.md` (repo-canonical Speakeasy-side flow;
  product source `speakeasy-api/gram` `client/dashboard` `main` @
  `96f7f73`) — backs every Speakeasy-side label transcluded above;
  observed this run.
