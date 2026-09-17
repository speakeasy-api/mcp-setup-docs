---
research_version: 1
slug: salesforce
researched_at: 2026-09-17T16:15:46Z
---

# Salesforce — Research Dossier

## Server facts

- **Guide scope:** two alternative OAuth setup methods: install Speakeasy's
  Salesforce application and contact Speakeasy support, or create your own
  External Client App. Cover all four standard SObject endpoints plus the
  currently cataloged Data 360, Headless 360 (Beta), and Tableau Next endpoints.
  Select the endpoint and org type explicitly; SObject Reads is not a universal
  URL. Custom servers and legacy product endpoints are outside this refresh.
  Sources: operator instruction and current `servers-reference.html`, observed
  on the refresh date recorded below.
- **Production MCP Servers:**
  - SObject Reads:
    `https://api.salesforce.com/platform/mcp/v1/platform/sobject-reads`
  - SObject Mutations:
    `https://api.salesforce.com/platform/mcp/v1/platform/sobject-mutations`
  - SObject Deletes:
    `https://api.salesforce.com/platform/mcp/v1/platform/sobject-deletes`
  - SObject All:
    `https://api.salesforce.com/platform/mcp/v1/platform/sobject-all`
- **Sandbox MCP Servers:** insert `/sandbox` after `/v1` in each production
  URL:
  - `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-reads`
  - `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-mutations`
  - `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-deletes`
  - `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-all`
- **Transport:** `streamable-http`. Salesforce's Postman setup explicitly
  selects **HTTP**, not STDIO, for these remote URLs. The endpoint implements
  protected-resource discovery and returns `401 Unauthorized` without OAuth.
- **Authentication:** per-user OAuth 2.0 Authorization Code with PKCE. For the self-created method, an
  administrator manually registers an **External Client App** and the MCP
  client uses its **Consumer Key** as the client ID. Salesforce says Connected
  Apps are not supported for Hosted MCP authentication. The documented public
  client setup does not require a client secret.
- **OAuth scopes:** **Access MCP servers** (`mcp_api`) and **Perform requests
  at any time** (`refresh_token`). Live protected-resource metadata for the
  SObject Reads production URL advertises the same two scopes.
- **Authorization model:** every call runs as the signed-in Salesforce user and
  remains constrained by that user's field-level security, object permissions,
  and sharing rules.
- **Availability:** standard servers are disabled by default. An administrator
  must enable each selected server. Activation can take up to two minutes.
  A new External Client App can take up to 30 minutes to become operational.
- **Org gate:** the org must have API access and expose Hosted MCP Servers in
  **Setup**. Salesforce's April 2026 GA announcement describes availability
  as Enterprise Edition and above. Its current connection troubleshooting
  separately lists Developer, Enterprise, and Professional with API access as
  examples of API-eligible orgs, but does not explicitly promise Hosted MCP
  availability for every lower-edition org. A lower-edition org may be
  eligible when it has API access; before beginning setup, use **Quick Find**
  in **Setup** to look for **MCP Servers** under **API Catalog** and confirm
  that Hosted MCP Servers are available in the target org.
- **Server choice affects setup and risk:**
  - **SObject Reads** permits discovery, query, search, and relationship
    traversal but no record changes. Salesforce describes it as the safest
    SObject option.
  - **SObject Mutations** permits reading, creating, and updating, but not
    deleting.
  - **SObject Deletes** permits identifying and deleting records, but not
    creating or updating. Salesforce warns that deletion is the highest-risk
    mutation.
  - **SObject All** permits create, read, update, delete, query, and search.
  The Setup Guide should tell the admin to choose the least-privileged server
  that meets the team's need; it must not catalog individual tools. If the
  ticket does not specify whether the team needs read, write, or delete access,
  direct the admin to obtain the approved server choice from the application
  or cloud security owner.
- **Supported org types:** this Guide covers production and sandbox orgs, where
  the External Client App can be created through **Setup**. It does not cover
  scratch orgs because Salesforce says External Client Apps can't be created
  directly in a scratch org through **Setup**; the documented alternative
  requires creating the app in a developer hub, adding it to a package, and
  installing that package in the scratch org, but the Hosted MCP documentation
  does not provide an executable browser workflow for those packaging steps.

## Current endpoint catalog and setup gates

Sources observed on the refresh date: `servers-reference.html`, the three
product reference pages listed under Refresh provenance, and `postman.html`.
The four SObject URLs above are retained from the earlier endpoint-specific
research; the current catalog reconfirms all four server identities and access
boundaries, and Postman reconfirms the platform production/sandbox form.

| Server | Production URL | Sandbox URL | Setup-relevant boundary / gate |
| --- | --- | --- | --- |
| Data 360 | `https://api.salesforce.com/platform/mcp/v1/data/data360` | `https://api.salesforce.com/platform/mcp/v1/data/sandbox/data360` | Data 360 license; API v66.0+; `Manage Data 360` for configuration, `View Data 360` for read-only operations. Can change customer-data configuration, not merely query SQL. Calls count against underlying Connect API limits and Flex Credit usage. |
| Headless 360 (Beta) | `https://api.salesforce.com/platform/mcp/v1/platform/headless-360` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/headless-360` | Beta, available starting July 2026 under Beta Services Terms; API v67.0+; ECA with `mcp_api` and OAuth client. Broad Setup/platform operations, not a read-only records endpoint. |
| Tableau Next | `https://api.salesforce.com/platform/mcp/v1/analytics/tableau-next` | `https://api.salesforce.com/platform/mcp/v1/sandbox/analytics/tableau-next` | Semantic-model and analytics access. The reference does not specify a license SKU or named permission set; do not invent one or promise access without the org's Tableau Next capabilities. |

Data 360's documented sandbox position is **after `/data`**, unlike the
platform and analytics endpoints. Preserve each literal URL; do not normalize
it using the generic Postman template. Product references also label these
sandbox URLs for scratch orgs, but this guide retains its production/sandbox
scope because scratch-org app creation needs a separate packaging workflow.
Data 360's page says it replaces a previous server, now called Data 360 Legacy;
that legacy endpoint is not researched or offered here. The current general
catalog describes Data 360 narrowly as querying data; prefer the dedicated
reference's broader capability and permission requirements.

All standard servers enforce user-level field security, object permissions,
and sharing. Choose only approved capabilities. System Administrator or
equivalent permission is needed to create an ECA (`setup-overview.html`);
server activation requires an administrator (`activate-mcp-servers.html`).
These are not grants of data access to every connecting user.

## Credential flow

Who acts: a Salesforce System Administrator (or equivalent permissions for
creating the ECA, per the current setup overview). Salesforce's Hosted MCP docs
require an administrator to enable servers, and Salesforce's External Client
App documentation states that a Salesforce administrator creates the app.

For method 2, what gets created: one local **External Client App** with OAuth enabled. The
candidate Speakeasy configuration uses the generated **Consumer Key** as
**Client ID** and leaves **Client Secret (optional)** empty. Salesforce
documents that Consumer Key-only PKCE configuration for Postman and Cursor,
and says other clients supporting OAuth 2.0 Authorization Code with PKCE
should work. Salesforce does not name the Speakeasy AI Control Plane as a
tested client, so this mapping is a standards-based compatibility inference,
not a verified end-to-end result.

| Speakeasy value | Salesforce origin |
| --- | --- |
| Client ID | **Consumer Key** revealed from the app's **Settings** tab under **OAuth Settings** ({#copy-consumer-key}) |

`{{ gram.oauth.callback_url }}` is entered directly in the External Client
App's **Callback URL** field ({#configure-oauth-settings}). Salesforce
documents that other clients must use the callback URL supplied by the client;
the canonical Speakeasy setup defines this template as the Speakeasy AI Control
Plane callback URL.

After the app is attached, each connecting user completes Salesforce sign-in.
Salesforce warns that its multitenant sign-in can choose the wrong org: before
authorization, the user should log out of other Salesforce orgs, sign in to the
target org in the default browser, and keep that browser open. This is a
connection-time user action, not an administrator credential-creation step.

### Setup-method decision

**Method 1 — Speakeasy application:** follow {#install-speakeasy-application}
then {#contact-speakeasy-support}. This method ends in a mandatory support
handoff; do not tell the admin to create another app, copy an unknown client
ID/secret, or apply the self-created app's security settings to this package.

**Method 2 — Your own External Client App:** follow the existing Setup,
app-creation, OAuth, and Consumer Key steps below. Both methods require an
approved endpoint and administrator activation of the selected server.
The package method's exact activation/OAuth sequencing is not supplied;
coordinate it with support rather than inventing a completed connection.

Operator provenance for method 1: explicit task instruction, observed on the
refresh date; installer locator below. This is not independently verified
package contents, installation UI, org compatibility, or OAuth behavior.

## Console walkthrough

### Install Speakeasy's Salesforce application {#install-speakeasy-application}

- Method 1 only: as an administrator, install Speakeasy's Salesforce application
  into the intended org using the operator-supplied URL:
  `https://login.salesforce.com/packaging/installPackage.apexp?p0=04tdM000000cNGXQA2`.
- The operator supplied this exact URL; no sandbox installer alternative,
  installation audience, approval sequence, package password, or package
  contents were supplied or independently verified. Do not invent them.
- Values copied: none specified.
- Screenshot exception: no verified installation screen is available; use the
  exact installation link rather than a fabricated UI description.

### Contact Speakeasy support to finish OAuth {#contact-speakeasy-support}

- After installation, administrators **must contact Speakeasy support to finish
  OAuth setup**. Installation alone does not complete OAuth setup.
- No support URL, channel, credential exchange, SLA, or follow-up console steps
  were supplied. State the mandatory handoff plainly; do not invent them and
  do not request or publish secret values.
- Screenshot exception: this is a support handoff, not a documented console UI.
- Provenance for both method-1 steps: operator instruction, refresh date.

### Open Salesforce Setup {#open-salesforce-setup}

- Entry: sign in to the Salesforce org that will expose its records. At the top
  of any Salesforce page, click the setup gear icon, then click **Setup**.
  Salesforce's generic Setup documentation confirms this transition; Hosted
  MCP pages begin from **Setup**.
- Requirement: use the production org when creating production credentials.
  For this Guide, use a production or sandbox org; scratch-org setup is outside
  the supported path because Salesforce's public Hosted MCP documentation does
  not provide the complete browser packaging workflow.
- Values entered or copied: none beyond Salesforce sign-in.
- Screenshot note: the Salesforce page with the setup gear menu open and
  **Setup** visible.

### Start an External Client App {#start-external-client-app}

- Method 2 only; do not repeat this flow after installing the Speakeasy app.

- From **Setup**, enter `external client` in **Quick Find**, then select
  **External Client App Manager**.
- Click **New External Client App**.
- Under **Basic Information**, enter:
  - **App Name**: a descriptive name, such as `Speakeasy MCP`.
  - **API Name**: accept the generated value.
  - **Contact Email**: the responsible administrator or application owner's
    email address.
  Salesforce's Hosted MCP page says to fill **Basic Information**; its May 2026
  Hosted MCP walkthrough and general External Client App guide confirm these
  exact field labels.
- Keep the app local to this org. The general External Client App guide names
  **Distribution State** and says to select **Local** for an app used only in
  the current org.
- Values copied: none.
- Screenshot note: **New External Client App** with **Basic Information**
  filled and **Distribution State** set to **Local**.

### Configure OAuth settings {#configure-oauth-settings}

- Expand **API (Enable OAuth Settings)** and select **Enable OAuth**.
- In **Callback URL**, enter `{{ gram.oauth.callback_url }}`.
- Under **OAuth Scopes**, add each required scope with the dual-list controls:
  - In **Available OAuth Scopes**, select **Access MCP servers** (`mcp_api`),
    then select the right-arrow control to move it to **Selected OAuth Scopes**.
  - In **Available OAuth Scopes**, select **Perform requests at any time**
    (`refresh_token`), then select the right-arrow control to move it to
    **Selected OAuth Scopes**.
- Under **Security**, select **Issue JSON Web Token (JWT)-based access tokens
  for named users**.
- Under **Security**, leave **Require Secret for Web Server Flow** and
  **Require Secret for Refresh Token Flow** deselected. The current Hosted MCP
  setup page directs admins to deselect every other option that can be changed
  without Salesforce support. OAuth PKCE remains the client flow; the current
  setup page does not instruct the admin to enable the separate **Require Proof
  Key for Code Exchange (PKCE) extension for Supported Authorization Flows**
  enforcement option. A May 2026 Salesforce developer blog appears to show
  that option selected for Claude, so this Guide follows the current Hosted
  MCP setup page rather than the client-specific blog.
- Values entered: the callback URL and scope/security selections. Values
  copied: none.
- Screenshot note: the expanded **API (Enable OAuth Settings)** section with
  **Callback URL**, both selected OAuth scopes, and the security selections
  visible.

### Create the External Client App {#create-external-client-app}

- Click **Create**.
- The app can take up to 30 minutes to become available and operational. If
  attaching it immediately fails even though the settings are correct, wait
  for that window before changing the configuration.
- Values entered or copied: none.
- Screenshot exception: **Create** is a standard action with no distinct
  configuration state to capture.

### Copy the Consumer Key {#copy-consumer-key}

- On the saved External Client App, click **Settings**.
- Under **OAuth Settings**, click **Consumer Key and Secret**.
- Complete Salesforce's verification prompt if it appears.
- Copy **Consumer Key**. This is the **Client ID** for the Speakeasy AI Control
  Plane. Salesforce's own Hosted MCP client examples configure only this key
  for PKCE.
- Do not copy or require the Consumer Secret for this documented path.
- Screenshot exception: the credential is sensitive and the screen adds no
  setup information beyond the exact label. Do not capture the key.

### Enable the selected MCP server {#enable-sobject-server}

- Return to **Setup**. In **Quick Find**, enter `MCP Servers`, then select
  **MCP Servers** under **API Catalog**.
- Review the available servers and enable the server chosen for the team.
  Salesforce's current activation page says to toggle needed servers on, but
  does not publish the exact list-row names or the toggle's label or state.
  Use the selected server's confirmed API ID to distinguish among
  `sobject-reads`, `sobject-mutations`, `sobject-deletes`, `sobject-all`,
  `data360`, `platform/headless-360`, and `analytics/tableau-next`;
  do not infer additional UI labels from those IDs.
- If the ticket does not specify the team's approved records, data-platform,
  admin, or analytics requirements, obtain the server choice from the application or cloud
  security owner before enabling one.
- Match the selected server to the remote URL in **Server facts** or **Current endpoint catalog and setup gates**, and match
  the URL variant to the org type (production versus sandbox).
- Wait up to two minutes for the server to become active.
- Recovery: if the client returns a connection failure with valid OAuth,
  confirm that the exact server is enabled and that the URL uses the correct
  production or sandbox form. Also confirm the org has API access.
- Screenshot note: **MCP Servers** under **API Catalog**, showing the available
  server list and the control used to enable the chosen MCP server. The
  capture pass must record the rendered row and control labels rather than
  assuming labels from the server API IDs.

For Headless 360, the dedicated reference supplies a more specific activation
transition: **Setup** > **Quick Find**: `MCP Servers` > **MCP Servers** > find
`headless-360` > **Activate**. Other standard servers use the general activation
page's toggle instructions. The existing {#enable-sobject-server} anchor is
retained for the shared endpoint-selection/activation step, even when the
chosen server is not an SObject server. Source: Headless 360 reference and
activation page, refresh date.

## Speakeasy setup

The manual credential-entry skeleton below applies to **method 2 only**.
For method 1, the administrator must contact Speakeasy support to finish OAuth;
no public self-service credential-entry procedure is established for this
package. Metadata models its OAuth registration as manual (not DCR), with no
invented credential fields. Do not derive a package Client ID or secret from
the self-created-app instructions.


Per-guide values rendered into the canonical
`doctrine/speakeasy-setup.md` skeleton:

- Provider: Salesforce.
- Remote URL: the production or sandbox URL selected in
  {#enable-sobject-server}; all fourteen cataloged choices are in Metadata.
- Transport: `streamable-http`; the **Transport** field is read-only.
- Add-server path: use **Custom remote server** only. The operator forced
  `speakeasy_add_server: custom-remote` because the catalog mapping is
  unreliable or unsuitable for this Guide's selection among distinct
  production and sandbox URLs. Pasting the selected URL preserves the
  server and org-type choice made in {#enable-sobject-server}. Do not render a
  catalog path or a catalog-presence open question.
- Authentication Option: OAuth with a manually registered client.
- OAuth scopes: `mcp_api` and `refresh_token`.
- Discovery: Salesforce publishes RFC 9728 protected-resource metadata for the
  SObject endpoint, including its authorization server and required scopes.
  Salesforce still requires a manually created External Client App, so use
  **Configure Manually** for this Guide; whether the Speakeasy sheet also
  offers **Use Discovered** is not required for this path.
- **Client ID** origin: Salesforce **Consumer Key** from
  {#copy-consumer-key}.
- Client Secret: the standards-based candidate configuration leaves
  **Client Secret (optional)** empty because Salesforce documents Consumer
  Key-only PKCE for public MCP clients. This exact configuration remains
  unverified in the Speakeasy AI Control Plane.
- Redirect URI registered in Salesforce: `{{ gram.oauth.callback_url }}` in
  **Callback URL** at {#configure-oauth-settings}.
- Further-reading URL:
  `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On the **Add a custom remote MCP server**
page, paste the selected MCP URL into **Remote MCP server URL** and click
**Add server**.

This creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the **Add Source** menu open on the **Sources** page
with **Custom remote server** visible.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually**. In the **Attach Remote Identity Provider** sheet,
set **Client Type** to **Manual**. The sheet shows the **Redirect URI** with a
copy button — the callback URL registered in Salesforce as
`{{ gram.oauth.callback_url }}`. For the unverified candidate configuration,
paste the **Consumer Key** from {#copy-consumer-key} into **Client ID**, leave
**Client Secret (optional)** empty, and click **Attach Identity Provider**.
Confirm the sheet's **Redirect URI** matches the
`{{ gram.oauth.callback_url }}` value registered under Salesforce's **Callback
URL** field at {#configure-oauth-settings}. Salesforce documents this Consumer
Key-only PKCE pattern for compatible public clients but does not document the
Speakeasy AI Control Plane, so the mapping is unverified. If attaching still
fails after Salesforce's documented 30-minute app propagation window, stop and
escalate instead of changing the candidate configuration.

Screenshot note: capture the **Attach Remote Identity Provider** sheet with
**Client Type**, **Redirect URI**, and the credential labels visible; redact
the Client ID.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see [Salesforce's MCP documentation](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html).

## Research limitations

- This refresh read ten unique public primary pages, starting with the supplied
  setup overview and necessary setup/client/catalog references. No authenticated
  org, app installation, OAuth exchange, or compatibility test was performed.
- Tableau Next entitlement details are absent from the fetched reference;
  Data 360 Legacy and custom-server creation are outside this bounded research.
  Endpoint listings document provider URLs, not tested Speakeasy compatibility
  or availability in the Speakeasy MCP Catalog.
- The operator resolved the setup-method scope: publish both alternatives.
  Missing package internals are not a reason to block the explicitly authorized
  install-plus-support route; its mandatory handoff is the documented outcome.
- OAuth details for method 2: Postman documents production authorization/token
  URLs `https://login.salesforce.com/services/oauth2/authorize` and
  `https://login.salesforce.com/services/oauth2/token`; sandbox uses
  `https://test.salesforce.com/services/oauth2/authorize` and
  `https://test.salesforce.com/services/oauth2/token`. It uses Authorization
  Code with PKCE, SHA-256, scopes `mcp_api refresh_token`, Consumer Key as
  Client ID, and blank Client Secret. These are provider reference facts, not
  additional verified Speakeasy input fields (source: `postman.html`, refresh date).
- The current ECA page separately offers optional production hardening:
  requiring a secret for web-based clients, permission-set preauthorization,
  IP restrictions, and token/session policies. Do not silently enable these or
  claim the baseline secretless flow satisfies every organization's policies.
  Policy-specific Speakeasy compatibility is untested. The setup overview's
  broad PKCE instruction does not override the ECA page's precise baseline
  Security checkbox instructions retained above.

## Open questions

- The Hosted MCP activation page says to toggle servers on but does not publish
  the exact row labels or the enabled-toggle label/state for the four SObject
  servers. The stable server IDs are confirmed by the server reference pages.
- Salesforce documents standards-compatible clients using OAuth 2.0
  Authorization Code with PKCE, but does not name the Speakeasy AI Control
  Plane as a tested client. Compatibility is inferred from the canonical
  Speakeasy OAuth flow. The Consumer Key-to-**Client ID** mapping with **Client
  Secret (optional)** empty is unverified; if attaching still fails after
  Salesforce's documented 30-minute app propagation window, stop and escalate
  instead of changing the candidate configuration.
- Salesforce's April 2026 GA announcement promises Hosted MCP Servers for
  Enterprise Edition and above. Current connection troubleshooting names
  Developer and Professional-with-API-access orgs only as examples of orgs
  with API eligibility, not as an explicit Hosted MCP availability promise.
  Treat lower-edition availability as conditional and confirm the feature is
  available in the target org before setup; do not infer a Setup label beyond
  the documented **MCP Servers** navigation path.
- The canonical Speakeasy setup ends when the administrator clicks **Attach
  Identity Provider** and does not document which Speakeasy control starts the
  Salesforce user-authorization prompt. Do not invent that transition in the
  Setup Guide; the canonical doctrine needs an explicit authorization step
  before a later guide can document the Salesforce sign-in sequence.

## Provenance

### Source inventory

- **Developer documentation — `developer.salesforce.com`:** primary Hosted MCP
  guide, server references, client setup, troubleshooting, External Client App
  documentation, and a current Salesforce Developers Blog walkthrough. This is
  the source of all load-bearing setup facts.
- **Product/admin help — `help.salesforce.com`:** searched for Hosted MCP and
  External Client App setup. Search did not surface a readable Hosted MCP
  walkthrough; Salesforce Help pages are JavaScript/binary-shaped through the
  available fetcher and did not add facts beyond the developer documentation.
- **Support KB:** Salesforce Help is the support property; no separate public
  Hosted MCP support KB was found.
- **Machine-readable indexes:** prior research successfully reached
  `https://developer.salesforce.com/docs/llms.txt` and its linked Hosted MCP
  index at `https://developer.salesforce.com/docs/llms-hosted-mcp-servers.txt`;
  they enumerated the guide and reference pages used below. During the August
  research, developer documentation and index requests returned HTTP 403.
  The September refresh successfully read the ten primary pages listed below;
  older facts not revisited retain their original observation date.
  `https://help.salesforce.com/llms.txt` had previously timed out.

### Retained August provenance

Records below retain observation date `2026-08-06T23:23:14Z`; endpoint
observations are historical, not tests rerun in September.

- `https://developer.salesforce.com/docs/llms-hosted-mcp-servers.txt`
  — machine-readable Hosted MCP source inventory; backs documentation-property
  coverage and the current Markdown locators.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html`
  — primary overview; backs per-user OAuth 2.0 with PKCE, permissions behavior,
  and setup sequence.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/client-connection-overview.html`
  — backs manual External Client App registration, no Connected Apps,
  Consumer Key use, PKCE-compatible client requirement, and tested-client
  scope.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/create-external-client-app.html`
  — backs console path, OAuth fields and scopes, security selection, **Create**,
  30-minute propagation window, **Settings** > **Consumer Key and Secret**,
  and scratch-org limitation.
- `https://developer.salesforce.com/blogs/2026/05/connect-claude-with-salesforce-hosted-mcp-servers`
  — current official developer-property walkthrough; backs exact **Basic
  Information** labels, the client-specific PKCE example, secret checkboxes,
  JWT setting, saved-app transition, and verification prompt. Its apparent
  selection of the PKCE enforcement option conflicts with the current Hosted
  MCP setup page's instruction to deselect all mutable options except JWT; the
  Guide follows the current setup page.
- `https://developer.salesforce.com/blogs/2026/04/salesforce-hosted-mcp-servers-are-now-generally-available`
  — official GA announcement; backs the Enterprise Edition-and-above
  availability statement and creates the documented edition conflict.
- `https://developer.salesforce.com/docs/platform/mobile-sdk/guide/eca-create.html`
  — backs administrator ownership, **API Name**, **Contact Email**,
  **Distribution State** = **Local**, and the exact secret/JWT security labels.
- `https://developer.salesforce.com/docs/ai/automate-resume-processing/guide/aes-create-external-client-app.html`
  — backs the **Available OAuth Scopes** and **Selected OAuth Scopes**
  dual-list controls used to add OAuth scopes.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/activate-mcp-servers.html`
  — backs **Quick Find** > **MCP Servers** under **API Catalog**, disabled by
  default, toggle enablement, and two-minute activation.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/servers-reference.html`
  and
  `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/products-supporting-mcp.html`
  — back standard server IDs, fixed tool-set boundaries, admin activation, and
  permissions enforcement.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/sobject-reads.html`,
  `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/sobject-mutations.html`,
  `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/sobject-deletes.html`,
  and
  `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/sobject-all.html`
  — back all production and sandbox/scratch URLs and the setup-relevant
  capability/risk distinction among the four servers.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/postman.html`
  and
  `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/cursor.html`
  — back HTTP remote configuration, production/sandbox URL forms, PKCE, and
  Consumer Key-only public-client configuration.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/connection-issues.html`
  — backs URL diagnostics, API-eligible org requirement, and activation
  recovery.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/log-into-org.html`
  — backs the multitenant pre-authentication browser procedure.
- `https://developer.salesforce.com/docs/analytics/sdk/guide/sdk-setup-settings.html`
  — backs the transition from any Salesforce page through the setup gear to
  **Setup**.
- `https://api.salesforce.com/.well-known/oauth-protected-resource/platform/mcp/v1/platform/sobject-reads`
  — live endpoint observation; backs protected resource URL and advertised
  `mcp_api` / `refresh_token` scopes.
- All eight URLs in **Server facts** — live unauthenticated endpoint
  observations returned HTTP 401 in the August research, backing the URLs' existence
  and OAuth protection. The protected-resource metadata request for production
  SObject Reads returned HTTP 200 and advertised `mcp_api` and `refresh_token`.
- `doctrine/speakeasy-setup.md` — observed `2026-08-06T23:23:14Z`; backs the
  fixed Speakeasy-side anchors, labels, OAuth attach flow, callback template
  semantics, forced Custom remote path behavior, and closing pointer.
- Operator note `Speakeasy MCP Catalog: overridden-custom-remote` with query
  `salesforce` — observed `2026-08-06T23:23:14Z`; backs the decision not to
  render or investigate a catalog path because the Guide-level
  `speakeasy_add_server: custom-remote` override controls path selection.

### Refresh provenance

Observed at `2026-09-17T16:15:46Z` (current system date, 2026-09-17). Every
new or revalidated fact above cites these locators by page name; retained
August-only facts and probes keep their earlier provenance.

- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/setup-overview.html` — Set Up Your Org; backs setup prerequisites, ECA, scopes, PKCE/JWT overview.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/create-external-client-app.html` — Create an External Client App; backs baseline OAuth settings, creation flow, propagation and optional production hardening.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html` — Salesforce Hosted MCP Servers; backs per-user OAuth and platform/product scope.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/client-connection-overview.html` — Connecting an MCP Client; backs ECA requirement, no Connected Apps, tested-client list excluding Speakeasy.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/servers-reference.html` — Standard MCP Servers Reference; backs seven current standard server families and user permissions.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/activate-mcp-servers.html` — Activate MCP Servers; backs administrator activation navigation, default disabled, two-minute wait.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/references/reference/data360-mcp.html` — Data 360 MCP Server; backs exact URL forms, license/API/permission gates, broader capabilities and usage accounting.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/references/reference/headless-360-mcp.html` — Headless 360 MCP Server (Beta); backs exact URL forms, beta/API prerequisites and Activate action.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/references/reference/tableau-next.html` — Tableau Next; backs exact URL forms, semantic analytics scope and absence of entitlement details.
- `https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/postman.html` — Configure Postman; backs HTTP transport, platform URL forms, authorization/token URLs, PKCE and credential mapping.
- Operator instruction in this delegated task — backs the two-method scope,
  Speakeasy application identity, exact installation locator
  `https://login.salesforce.com/packaging/installPackage.apexp?p0=04tdM000000cNGXQA2`,
  and mandatory contact with Speakeasy support to finish OAuth. Not a claim
  that the package installation or OAuth flow was independently tested.
