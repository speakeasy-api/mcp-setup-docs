---
research_version: 1
slug: google-big-query
researched_at: 2026-07-23T19:36:30Z
---

# Google BigQuery — Research Dossier

Authoritative-source ruling: current product and console facts come from
Google Cloud documentation at `docs.cloud.google.com`; Google Auth platform
details come from `developers.google.com` and the Google Cloud Console Help
property at `support.google.com/cloud`. `cloud.google.com` is a redirecting
front door for the same Google Cloud documentation. The documentation sweep
and direct endpoint observations were performed at
`2026-07-23T19:36:30Z`.

## Server facts

- **Remote URL**: `https://bigquery.googleapis.com/mcp`. Google's BigQuery MCP
  guide gives this value as **Server URL or Endpoint**, the BigQuery MCP
  reference lists it as the server endpoint, and the Supported products table
  repeats it. A direct JSON-RPC `tools/list` request returned HTTP 200 from this
  URL during this run.
- **Transport**: `streamable-http`. Google labels it **HTTP**. The reference
  sends JSON-RPC by HTTPS POST with `accept: application/json,
  text/event-stream`, and the endpoint returned a JSON response to that request
  during this run; this is the schema's `streamable-http` transport.
- **Protocol and launch stage**: Google's overview says its servers support MCP
  version 2025-11-25. Google announced Google and Google Cloud remote MCP
  servers as generally available on May 1, 2026, while noting that individual
  products can remain in Preview. BigQuery has no Preview marker in the current
  Supported products table or on its MCP guide, so this dossier treats the
  hosted BigQuery server as GA.
- **Enablement**: the BigQuery remote MCP server is enabled with the
  **BigQuery API**; no separate MCP switch is required. New projects enable the
  BigQuery API automatically. Google's March 17, 2026 release note says remote
  MCP endpoints are available by default when the supported product is enabled.
- **Authentication**: OAuth 2.0 with Google Cloud IAM. All Google Cloud
  identities are supported, but the hosted BigQuery server explicitly does not
  accept API keys.
  - The guide documents the OAuth 2.0 client ID and secret method because it is
    Google's documented method for a web-based third-party application.
    Application Default Credentials are environment credentials for supported
    applications, and a static bearer-token header is unsuitable for a durable
    hosted connection because such tokens normally expire after one hour.
  - Client registration is manual. Google states that its remote MCP servers do
    not support Dynamic Client Registration or OAuth Client ID Metadata
    Documents. The live Google authorization-server metadata also has no
    `registration_endpoint`.
  - OAuth discovery metadata is available. During this run,
    `https://bigquery.googleapis.com/.well-known/oauth-protected-resource/mcp`
    reported the resource `https://bigquery.googleapis.com/mcp`, authorization
    server `https://accounts.google.com/`, bearer method `header`, and supported
    scope `https://www.googleapis.com/auth/bigquery`. Google's authorization
    metadata reports the authorization endpoint
    `https://accounts.google.com/o/oauth2/v2/auth`, token endpoint
    `https://oauth2.googleapis.com/token`, and client-secret authentication by
    `client_secret_post` or `client_secret_basic`.
  - Discovery is anonymous, while tool calls require authentication. Google
    documents that `tools/list` needs no authentication. Direct observation
    during this run returned HTTP 200 for unauthenticated `tools/list` and HTTP
    401 for an unauthenticated `tools/call`, with a protected-resource metadata
    link in `WWW-Authenticate`.
- **OAuth scope**: `https://www.googleapis.com/auth/bigquery` — “View and
  manage your data in BigQuery and see the email address for your Google
  Account.” The BigQuery MCP guide and live protected-resource metadata agree.
  Google notes that resources reached by a tool call can require additional
  scopes.
- **Required IAM access** for every identity that connects:
  - **MCP Tool User** (`roles/mcp.toolUser`) on the project, providing
    `mcp.tools.call`.
  - **BigQuery Job User** (`roles/bigquery.jobUser`) on the project, providing
    `bigquery.jobs.create`.
  - **BigQuery Data Viewer** (`roles/bigquery.dataViewer`) on the project in
    Google's MCP setup recipe, providing `bigquery.tables.getData`. The role can
    technically be granted on narrower BigQuery resources, but the provider's
    BigQuery MCP page expressly asks for all three roles on the project.
  - Additional BigQuery permissions are required for operations beyond those
    covered by these roles. The authenticated user's permissions cap what the
    MCP client can do, and actions are attributed to that user.
- **Billing and limits that affect setup**:
  - Billing is optional for initial setup because BigQuery offers a sandbox.
    The sandbox has the free-tier limits and does not support DML, so it cannot
    support every operation available through the write-capable SQL tool.
  - BigQuery queries are ordinary query jobs and are charged to the project
    passed to the SQL tool. Google recommends the read-only SQL tool where
    possible; the general SQL tool can run mutations and other statements and
    is the server's only non-read-only tool. This matters when deciding which
    users receive access and whether to apply an IAM deny policy to the write
    tool.
  - Both SQL tools cancel processing after three minutes by default, return at
    most 3,000 rows, and cannot query Google Drive external tables. The
    read-only SQL tool rejects DML, DDL, and Python UDFs.
  - The MCP server has no separate call quota. BigQuery API quotas and query
    charges still apply.

## Credential flow

Who acts: a Google Cloud project administrator who can select the target
project, enable APIs, grant project IAM roles, configure the Google Auth
platform, and create OAuth credentials. Enabling the API requires
`serviceusage.services.enable` (available through **Service Usage Admin** or
**Owner**). Granting roles requires suitable IAM administration access, such as
**Project IAM Admin**. Each person who later connects also needs the three
BigQuery MCP roles listed above.

What gets created: one OAuth 2.0 client with **Application type** set to
**Web application**. Google creates a **Client ID** and **Client secret**. The
secret is copyable only once from the **OAuth 2.0 client created** dialog and
must be stored securely.

Values needed by the Speakeasy AI Control Plane:

| Value | Provider origin |
| --- | --- |
| Client ID | **OAuth 2.0 client created** dialog in {#copy-client-credentials} |
| Client Secret | **Client secrets** section of the same dialog in {#copy-client-credentials}; copyable once |
| OAuth scope | `https://www.googleapis.com/auth/bigquery` |

Paste `{{ gram.oauth.callback_url }}` into **Authorized redirect URIs** while
creating the OAuth client in {#create-oauth-client}. It is the **Redirect URI**
shown by the Speakeasy AI Control Plane's **Attach Remote Identity Provider**
sheet. Google requires web applications to allowlist the application's redirect
URI and does not accept custom URI schemes for this flow.

After setup, each connecting user signs in to Google and authorizes access.
That user's account must hold the required IAM roles. If an External-audience
OAuth app remains in **Testing**, the account must also be listed under
**Test users**, and its authorization expires after seven days.

## Console walkthrough

Overall transition: sign in at `https://console.cloud.google.com`. On the
Google Cloud console toolbar, click the resource selector. In the **Select a
resource** dialog, select the project that owns the OAuth client and will
enable the BigQuery API. Then enable the API → grant users' roles → configure
the consent screen and scope → add the server in the Speakeasy AI Control
Plane and copy its redirect URI → create the web client → copy its
credentials. All provider steps occur in the selected project.

### Enable the BigQuery API {#enable-bigquery-api}

- On the Google Cloud console toolbar, click the resource selector. In the
  **Select a resource** dialog, select the intended project.
- From the console navigation, open **APIs & Services** > **API Library**. The
  Service Usage documentation calls this the **APIs & Services** >
  **API Library** page.
- In **Search for APIs & Services**, search for `BigQuery API`, open
  **BigQuery API**, and click **Enable**. New projects normally already have
  it enabled; in that state no action is required.
- Permission gate: the admin needs `serviceusage.services.enable`, normally
  through **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`) or
  **Owner**.
- Result and transition: enabling `bigquery.googleapis.com` also makes the
  remote MCP endpoint available. Next, open the IAM page to give each
  connecting user permission to call it.
- Values entered: `BigQuery API`. Values copied: none.
- Screenshot note: the **BigQuery API** page showing **Enable**, or the enabled
  status if the API is already active.

### Grant the BigQuery MCP roles {#grant-bigquery-mcp-roles}

- Open the documented direct IAM URL,
  `https://console.cloud.google.com/iam-admin/iam`, while the intended project
  is selected. This opens the project's **IAM** page. The console navigation
  path **IAM & Admin** > **IAM** remains a flagged navigation inference, so the
  Setup Guide uses the documented direct URL.
- Click **Grant access**. In **New principals**, enter the Google Account email
  of a user who will connect from the Speakeasy AI Control Plane.
- Click **Select a role**, search for **MCP Tool User**, and select **MCP Tool
  User**. Click **Add another role**, click **Select a role**, search for
  **BigQuery Job User**, and select **BigQuery Job User**. Click **Add another
  role**, click **Select a role**, search for **BigQuery Data Viewer**, and
  select **BigQuery Data Viewer**. Click **Save**.
- Repeat for every connecting user. These project-level grants follow the
  provider's explicit BigQuery MCP recipe. Organizations that need narrower
  data access should have their cloud security owner review dataset-level
  grants and required discovery permissions rather than improvising in this
  setup flow.
- Result and transition: the users can make MCP calls, create query jobs, and
  read BigQuery data allowed by their roles. Next, open **Google Auth
  platform** to configure the authorization screen those users will see.
- Values entered: connecting-user email addresses and the three role names.
  Values copied: none.
- Screenshot note: the **Grant access** panel with **MCP Tool User**,
  **BigQuery Job User**, and **BigQuery Data Viewer** visible.
- Recovery: roles can be edited later from the same **IAM** page.

### Configure the OAuth consent screen {#configure-oauth-consent}

- Warning before starting: Google says an OAuth 2.0 consent screen cannot be
  removed after it is configured.
- Open the console navigation and go to **Google Auth platform** >
  **Branding**. If the page says **Google Auth platform not configured yet**,
  click **Get Started**.
- In the first-time wizard:
  - Before starting, obtain an approved, monitored contact address from the
    application owner or cloud security owner. Also obtain approval from the
    application owner, cloud security owner, or legal owner before accepting
    the Google API Services User Data Policy; the administrator must not make
    that organization-level decision during setup.
  1. Under **App Information**, enter an **App name** (for example,
     `Speakeasy AI Control Plane`) and choose a **User support email** that is
     regularly monitored for users' sign-in and authorization questions. The
     available choices are the signed-in Google Account or a Google Group that
     account manages. Click **Next**.
  2. Under **Audience**, select **Internal** when all connecting users belong
     to the project's Google Workspace organization; otherwise select
     **External**. Click **Next**.
  3. Under **Contact Information**, enter the application owner's approved,
     monitored **Email address** where Google can send project-change
     notifications, then click **Next**.
  4. Under **Finish**, review the Google API Services User Data Policy. If the
     application owner, cloud security owner, or legal owner has approved it,
     select **I agree to the Google API Services: User Data Policy**, click
     **Continue**, and click **Create**.
- If the Google Auth platform was already configured, use the existing
  **Branding**, **Audience**, and **Data Access** pages instead of looking for
  the first-time wizard.
- After either the first-time wizard or the existing-configuration path, open
  **Audience**. Under **User Type**, note whether the current setting is
  **Internal** or **External**. For an External app, also note whether the
  publishing status is **Testing** or **In production**, then use those values
  for the audience-specific branches below.
- For an External app, open **Data Access** and click **Add or Remove Scopes**.
  In the scope table's **API** column, search for `BigQuery API`, find the row
  whose scope is `https://www.googleapis.com/auth/bigquery`, and select that
  row. Only enabled-API scopes appear in the table; if the scope is absent,
  enter it under **Manually add scopes**. Click **Update**, then **Save**.
  Google's consent guide requires explicit scope listing for apps used outside
  the Workspace organization; Internal apps do not list scopes on the consent
  screen.
- For an External app still in **Testing**, open **Audience**. Under **Test
  users**, click **Add users**, enter every connecting user's email, and click
  **Save**. Testing supports at most 100 test users, and their authorizations
  expire after seven days.
- For persistent External use, first check the publishing status on
  **Audience**. If it is **Testing**, click **Publish app**, then click
  **Confirm** in the confirmation dialog. The publishing status changes to
  **In production**, and the app becomes available to Google Accounts outside
  the test-user list. If it is already **In production**, skip these publishing
  controls. Google can still show an unverified-app warning or limit
  authorization of sensitive or restricted scopes until the applicable
  verification is complete.
- Before production verification, obtain the approved branding and verification materials from the application owner or cloud security owner before the steps below.
- Production verification path:
  1. Open **Branding** and complete **App name**, **App logo**, **Developer
     contact information** using the application owner's monitored contact
     address, **App home page**, and **App privacy policy**. If no contact
     address was provided, obtain one from the application owner or cloud
     security owner before continuing. Enter the domains in **Authorized
     domains**, then click **Verify Branding**. The automated review normally
     completes in a few minutes; a successful result changes the branding
     status to **Ready to publish**.
  2. Click **Publish branding** within seven days of a successful branding
     review. After seven days, an unpublished result changes to **Need to
     re-verify**. If that happens, click **Verify Branding** on **Branding** to
     run brand verification again. After the status returns to **Ready to
     publish**, click **Publish branding** within seven days.
  3. If the app needs sensitive- or restricted-scope review, open
     **Verification Center**. The app must have published branding first.
     Click **Prepare for Verification** when that control is shown, review the
     configured app information, and click **Save and Continue**.
  4. Confirm that **Data Access** declares every requested scope. Provide up
     to three feature-documentation links. In **Scope Justification**, provide
     the approved justification for each sensitive or restricted scope and the
     approved explanation of why a narrower scope is insufficient. In
     **YouTube link**, provide the URL of an unlisted YouTube demonstration
     showing the English OAuth grant flow and how the app uses each requested
     scope.
  5. Click **Submit for Verification**. Google reviews the submission and can
     request more information through the support and developer-contact email
     addresses. **Branding** and **Verification Center** show the current
     review status, including whether review is paused for a response.
- Recovery after the seven-day Testing expiry: the user remains in **Test
  users** and does not need to be added again. The expired authorization and
  refresh token can no longer sustain the connection. The next time the user
  connects, they must complete Google's browser authorization flow again. This
  grants another seven-day Testing authorization. The durable alternative is
  the production and verification path above.
- Result and transition: the project can issue user authorizations for the
  BigQuery scope. Next, add the server in the Speakeasy AI Control Plane and
  copy its **Redirect URI** before opening **Clients**.
- Values entered: app name, support email, audience choice, contact email,
  BigQuery OAuth scope, and (when applicable) test-user emails.
- Screenshot note: the **Data Access** page with the BigQuery scope in the
  selected-scopes table.

### Create the OAuth client {#create-oauth-client}

- Follow {#add-server-in-speakeasy} to add the server. From the server's
  **Overview**, open **Settings**. Under **Authentication**, click **Configure
  Manually** or **Use Discovered** if offered. In **Attach Remote Identity
  Provider**, set **Client Type** to **Manual**, copy the **Redirect URI**, and
  return to the Google Cloud console.
- Open **Google Auth platform** > **Clients**, then click **Create client**.
- Set **Application type** to **Web application**. In **Name**, enter a
  recognizable name such as `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and paste
  the copied **Redirect URI**, shown in this guide as
  `{{ gram.oauth.callback_url }}`.
  **Authorized JavaScript origins** applies only to applications making Google
  API requests from client-side JavaScript and is not needed for this hosted
  server-side OAuth flow.
- Warning before clicking **Create**: have a secure location ready. The next
  dialog shows the client secret for one-time copying.
- Click **Create**. This opens **OAuth 2.0 client created**.
- Values entered: client name and the callback URL. Values copied: none until
  the next step.
- Screenshot note: **Create client** with **Web application** selected and the
  **Authorized redirect URIs** row populated.

### Copy the client credentials {#copy-client-credentials}

- In **OAuth 2.0 client created**, copy the **Client ID** and store it in the
  secure location prepared in {#create-oauth-client}.
- In **Client secrets**, copy the **Client secret** and store it as a password
  alongside the Client ID. Google states that the secret can be copied only
  once.
- Keep both values ready for the Speakeasy AI Control Plane. The provider-side
  setup is complete; return to the Speakeasy AI Control Plane, open the
  server's **Overview**, and then open **Settings**.
- Values copied: Client ID and Client secret → the matching Speakeasy
  credential fields.
- Screenshot exception: do not capture credential values; the dialog contains
  secrets and its visual state adds no safe setup information beyond the field
  labels.
- Recovery: the Client ID remains associated with the client. If the one-time
  secret is lost, open **Google Auth platform** > **Clients**, open the OAuth
  2.0 client, click **Reset secret** on the **Client ID** page, then click
  **Reset** in the confirmation dialog. This immediately revokes the old
  secret and creates a new one. Copy the new secret and store it as a password.
  Continue with the new secret at {#connect-speakeasy-credentials}.
  Recorded documentation conflict: the MCP authentication page says to
  “delete the secret and create a new one” but does not name controls; the
  current credential-management and security procedures name **Reset secret**
  and **Reset**, so this walkthrough uses those actionable controls.

## Speakeasy setup

Transcluded from `doctrine/speakeasy-setup.md`; its anchors
`{#add-server-in-speakeasy}` and `{#connect-speakeasy-credentials}` are fixed
and carried verbatim. Provenance: `doctrine/speakeasy-setup.md` (product source
`speakeasy-api/gram`, `client/dashboard`, branch `main`, commit `96f7f73`),
observed at `2026-07-23T19:36:30Z`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If Google BigQuery is in the catalog: choose **3rd-party server**. On the
  **MCP Catalog** page, find Google BigQuery (the search box reads
  **Search MCP servers...**), open its entry with **View**, and click
  **Add**. In the **Add to Project** dialog, click **Add to Project**.
- If it is not: choose **Custom remote server**. On the
  **Add a custom remote MCP server** page, paste
  `https://bigquery.googleapis.com/mcp` into **Remote MCP server URL** and
  click **Add server**.

Either path creates the hosted MCP server and opens its **Overview**
page.
<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

Sequence condition: the reader follows this section from
{#create-oauth-client}. After either branch opens the server's **Overview**,
return to {#create-oauth-client} to copy the **Redirect URI** before opening
Google Auth platform **Clients**.

Per-guide values:

- Remote URL: `https://bigquery.googleapis.com/mcp`.
- Transport: `streamable-http`; the add form's **Transport** field is read-only.
- Authentication Option: `oauth-client`, OAuth with a manually registered
  client.

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, click
**Configure Manually** (or **Use Discovered** if offered). In **Attach Remote
Identity Provider**, set **Client Type** to **Manual**.

The sheet's **Redirect URI** supplies `{{ gram.oauth.callback_url }}` for
{#create-oauth-client}. Paste the **Client ID** and **Client Secret (optional)**
from {#copy-client-credentials}; Google's web client requires its generated
secret even though the Control Plane label says optional. In **Scope
(override)**, enter `https://www.googleapis.com/auth/bigquery`. The field
accepts comma-separated scopes; this guide requires this single value. Click
**Attach Identity Provider**.

Sequence seam: the reader needs the sheet's **Redirect URI** before completing
{#create-oauth-client}. The Writer must direct the reader to copy that URI
before the provider-side client creation and return here with the resulting
credentials.

Screenshot note: **Attach Remote Identity Provider** showing **Client Type:
Manual**, **Redirect URI**, credential labels, and scope configuration, with
credential values redacted.

Further-reading URL for the closing pointer:
`https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp`.

Canonical closing sentence to render verbatim:

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Google's BigQuery MCP documentation at
https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp.

## Open questions

- **Speakeasy MCP Catalog presence**: whether Google BigQuery currently has a
  catalog entry determines which add-server branch is used. Verify in-product
  during screenshot capture; until then, retain both canonical branches.
- **Exact console menu grouping**: provider docs deep-link to **IAM** and
  **Google Auth platform** but do not spell out every navigation-menu group.
  **IAM & Admin** > **IAM** is inferred from the console URL and Google's
  sibling documentation. Verify navigation at capture time.
- **BigQuery scope classification and production verification**: the fetched
  scope inventory names `https://www.googleapis.com/auth/bigquery`, but its
  public table does not publish the scope's classification. **Data Access**
  classifies the added scope in-console and determines whether sensitive- or
  restricted-scope verification is required.
- **Verification Center documentation-link field labels**: Google's sensitive-
  and restricted-scope verification guides instruct admins to provide up to
  three feature-documentation links but do not publish the exact console field
  label(s) for those inputs; verify at capture time or escalate to the
  application owner if the **Verification Center** labels differ.
- **Narrower data grants**: **BigQuery Data Viewer** supports dataset-level
  grants, but the BigQuery MCP page asks for it on the project. The minimum
  dataset-level permissions that preserve all metadata-discovery tools are not
  specified. Organizations requiring least-privilege dataset isolation should
  validate a narrower policy separately.

## Provenance

Source inventory from the documentation-property sweep:

- **Google Cloud product/admin documentation — `docs.cloud.google.com`**
  (drawn from): BigQuery MCP guide and reference, shared MCP overview,
  authentication, supported-products, release-note, and quota pages; Service
  Usage, IAM, BigQuery IAM, and sandbox pages. This is the primary source of
  truth. `docs.cloud.google.com/llms.txt` returned 404 during this run.
- **Google identity/developer documentation — `developers.google.com`** (drawn
  from): OAuth consent-screen setup, OAuth token-lifetime policy, scope
  inventory, and production verification procedures.
- **Google Cloud Console Help — `support.google.com/cloud`** (drawn from):
  Google Auth platform Audience, Branding, and Data Access surfaces.
- **Google Codelabs — `codelabs.developers.google.com`** (swept, not drawn
  from): examples for Google MCP servers and BigQuery MCP. Product
  documentation above was preferred for normative setup facts.
- **Google Cloud Blog — `cloud.google.com/blog`** (swept, not drawn from):
  BigQuery managed MCP launch article. The current product docs and release
  notes supersede its January 2026 Preview-era framing.
- **Speakeasy product documentation — `speakeasy.com/docs`** (drawn from):
  dashboard entry and project-selection controls.

Unless another timestamp is stated, sources below were observed at
`2026-07-23T19:36:30Z`:

- `https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp` — endpoint,
  HTTP transport label, API enablement, required IAM roles and permissions,
  OAuth/IAM and no-API-key statements, scope, redirect-URI rule, anonymous
  `tools/list`, limitations, billing/sandbox note, write-tool caveat, and
  quotas.
- `https://docs.cloud.google.com/bigquery/docs/reference/mcp` — endpoint,
  streamable-HTTP request shape, query billing project, and setup-relevant SQL
  tool behavior.
- `https://docs.cloud.google.com/mcp/supported-products` — BigQuery endpoint
  and absence of a Preview marker.
- `https://docs.cloud.google.com/mcp/overview` — MCP version, remote HTTP
  model, IAM governance, and authentication/discovery behavior.
- `https://docs.cloud.google.com/mcp/authenticate-mcp` — supported identities,
  per-user attribution and permission ceiling, separate-identity
  recommendation, DCR limitation, and method comparison.
- `https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers` —
  required MCP role, OAuth method fit, web-client creation labels, one-time
  client-secret copy and recovery, bearer-token lifetime, and API-key
  applicability.
- `https://docs.cloud.google.com/docs/security/data-loss-prevention/revoking-user-access`
  — **Clients** detail recovery path, **Reset secret** and confirmation
  **Reset** controls, immediate old-secret revocation, and reauthentication
  effect.
- `https://docs.cloud.google.com/mcp/release-notes` — GA announcement,
  API-implies-MCP enablement, and current custom-redirect fix status.
- `https://docs.cloud.google.com/mcp/quotas` — no MCP-specific quota.
- `https://docs.cloud.google.com/service-usage/docs/enable-disable` — API
  Library path, search and enable labels, and Service Usage Admin requirement.
- `https://docs.cloud.google.com/capacity-planner/docs/create-future-reservations`
  — console-toolbar resource selector and **Select a resource** dialog;
  observed at `2026-07-23T19:36:30Z`.
- `https://docs.cloud.google.com/iam/docs/grant-role-console` — documented
  `https://console.cloud.google.com/iam-admin/iam` direct URL; **IAM**,
  **Grant access**, **New principals**, **Select a role**, **Add another role**,
  and **Save** labels; Project IAM Admin requirement.
- `https://docs.cloud.google.com/bigquery/docs/access-control` — scope and
  contents of **BigQuery Job User** and **BigQuery Data Viewer**, including
  grantable resource levels.
- `https://docs.cloud.google.com/bigquery/docs/sandbox` — no-billing sandbox
  availability and limits, including lack of DML.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` —
  **Google Auth platform** first-time wizard, audience choice, scope setup,
  test-user flow, and consent-screen irreversibility.
- `https://developers.google.com/health/codelabs/make-your-first-api-call` —
  scope-table **API** column search, scope selection, **Update**, and **Save**
  controls; observed at `2026-07-23T19:36:30Z`.
- `https://developers.google.com/identity/protocols/oauth2` — seven-day refresh
  token expiry for External apps in Testing and refresh-token limits.
- `https://developers.google.com/identity/protocols/oauth2/scopes` — BigQuery
  OAuth scope inventory and description.
- `https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification`
  — branding verification controls and statuses, authorized-domain
  requirements, Data Access review inputs, up to three documentation links,
  **Scope Justification**, **YouTube link**, demo-video requirements, and
  review-status locations; observed at `2026-07-23T19:36:30Z`.
- `https://support.google.com/cloud/answer/15549945` — **User Type** with
  **Internal** and **External** values, **Testing** versus **In production**,
  **Publish app**, 100-test-user cap, seven-day authorization expiry, and
  possible verification; observed at `2026-07-23T19:36:30Z`.
- `https://support.google.com/cloud/answer/13461325` — **Authorized domains**,
  **Prepare for Verification**, **Save and Continue**, **Scope Justification**,
  demo video, **Submit for Verification**, and review follow-up; observed at
  `2026-07-23T19:36:30Z`.
- `https://support.google.com/cloud/answer/15544987` — **Verification Center**
  as the production-app verification and status surface.
- `https://support.google.com/cloud/answer/15549049` — Branding and Audience
  page responsibilities, monitored **User support email** guidance, developer
  contact-notification purpose, and production-branding caveats.
- `doctrine/personas/it-admin.md` — administrative voice control requiring approved
  organization-specific values and escalation instead of asking the
  administrator to improvise a policy decision; observed at
  `2026-07-23T19:36:30Z`.
- `https://support.google.com/cloud/answer/15549135` — **Data Access**,
  **Add or Remove Scopes**, **Manually add scopes**, and **Update**.
- `https://bigquery.googleapis.com/mcp` — direct endpoint observation:
  unauthenticated `tools/list` returned HTTP 200; unauthenticated `tools/call`
  returned HTTP 401 with a missing-OAuth-credential error.
- `https://bigquery.googleapis.com/.well-known/oauth-protected-resource/mcp`
  and the per-tool metadata location returned in `WWW-Authenticate` — live
  resource URL, authorization server, bearer method, and BigQuery scope.
- `https://accounts.google.com/.well-known/oauth-authorization-server` — live
  authorization/token endpoints, client-secret methods, PKCE support, and no
  registration endpoint.
- `doctrine/speakeasy-setup.md` — every Speakeasy-side label and fixed anchor
  transcluded above; canonical product-source snapshot at
  `speakeasy-api/gram`, `client/dashboard`, `main` @ `96f7f73`; observed at
  `2026-07-23T19:36:30Z`.
- `speakeasy-api/gram`, commit `96f7f73`,
  `client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/IssuerFormFields.tsx`
  — **Scope (override)** label, comma-separated interaction, and fallback
  behavior.
- `speakeasy-api/gram`, commit `96f7f73`,
  `client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/AttachRemoteIdentityProviderSheet.tsx`
  — **Attach Identity Provider** submit label.
- `https://docs.cloud.google.com/contact-center/ccai-platform/docs/oauth-email-google`
  — **Publish app** followed by **Confirm** in the confirmation dialog.
