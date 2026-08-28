---
research_version: 1
slug: box
researched_at: 2026-08-28T15:35:57Z
---

# Box — Research Dossier

## Source ruling

Box publishes current product and Admin Console guidance at `docs.box.com`,
indexed by `https://docs.box.com/llms.txt`; those pages are primary for UI
labels and setup order. `developer.box.com` is primary for endpoint, OAuth,
and scope strings. `support.box.com` supplies the documented Admin/Co-Admin
eligibility, no-DCR statement, and an alternate credential-creation surface.
Where those properties disagree on UI, this dossier uses the product-doc flow
and records the support flow as a documented alternative rather than merging
the labels. All public sources below were observed on
`2026-08-28T15:35:57Z` through Exa MCP.

## Server facts

- **Remote URL:** `https://mcp.box.com`. Box calls this its hosted MCP
  endpoint and tells clients to connect to it; users do not self-host the
  standard remote. [About Box MCP Server; Set up the MCP server]
- **Transport:** `streamable-http`. The Pulse catalog record for the shared
  remote classifies it this way, and Box's current client examples configure
  the endpoint as HTTP. The URL is shared, not region-, organization-, or
  instance-specific, so the remote is not tenanted. [Pulse snapshot supplied
  by the coordinator; Claude Code]
- **Authentication:** OAuth 2.0 with a pre-registered client. A Box Admin or
  Co-Admin creates **Integration Credentials**; Box provides a **Client ID**
  and **Client Secret**, and each user authorizes with their Box identity.
  Box explicitly says its MCP server does not support Dynamic Client
  Registration, so Metadata uses `client_registration: manual`. [Managing
  Box MCP Servers; Adding Integration Credentials; Claude Code]
- **OAuth endpoints:** authorization
  `https://account.box.com/api/oauth2/authorize`; token exchange
  `https://api.box.com/oauth2/token`. Box's protected-resource metadata names
  `https://api.box.com/` as the authorization server and bearer headers as
  supported. [Set up the MCP server; protected-resource metadata]
- **OAuth scope strings:** `root_readwrite`, `ai.readwrite`, and
  `docgen.readwrite`. These are API-level strings; Box's product setup pages
  name the UI section **Access scopes** but do not publish checkbox-to-string
  mappings. `docgen.readwrite` requires Enterprise Advanced. [Set up the MCP
  server]
- **Plan and billing:** the MCP Server is available on all Box plans, but a
  client using additional Integration Credentials is a charged use case.
  Tool availability remains limited by the enterprise's plan. Box AI, Doc
  Gen, and Sign have their own plan availability and usage charges. [Pricing]
- **Permissions:** scopes cap possible actions, while each user can access
  only content that their Box permissions permit. [Set up the MCP server;
  About Box MCP Server]
- **Catalog path:** the coordinator's ready Pulse snapshot at this run's
  timestamp has one exact match for Box (`com.pulsemcp.mirror/box`, title
  **Box**). `speakeasy_add_server: catalog` therefore selects only the
  catalog path. This remote is not tenanted. [Pulse snapshot supplied by the
  coordinator]

## Credential flow

A **Box Admin or Co-Admin** signs in to `https://app.box.com/master`, opens
**Integrations**, finds **Custom Box MCP Server**, and adds one set of
**Integration Credentials**. The provider generates both values needed by the
Speakeasy AI Control Plane:

| Speakeasy value | Box origin | External anchor |
| --- | --- | --- |
| **Client ID** | Generated in the Box credential entry | `copy-client-credentials` |
| **Client Secret** | Generated in the same entry | `copy-client-credentials` |

The admin enters `{{ gram.oauth.callback_url }}` directly in Box's
**Redirect URIs** field at `set-redirect-uri`. The canonical Speakeasy attach
sheet later shows the same **Redirect URI** for confirmation; the reader does
not need a Speakeasy-first detour. Box's Claude Code localhost redirect is
client-specific and must not be copied into this guide. [Claude Code;
Anthropic Messages API; canonical Speakeasy setup]

## Console walkthrough

Box product pages currently repeat this seven-part provider flow: sign in,
find **Custom Box MCP Server**, open **Configuration** > **Add Integration
Credentials**, set **Redirect URIs**, copy **Client ID** and **Client Secret**,
check **Access scopes**, and click **Save**. Box Support also documents an
alternate **Additional Configuration** > **+ Add Integration Credentials**
surface with an initial credential-name save. The sources do not say which
enterprise sees which surface. [Claude Code; Anthropic Messages API; Adding
Integration Credentials]

### Sign in to the Box Admin Console {#open-admin-console}

- Open `https://app.box.com/master` and sign in as a Box Admin or Co-Admin.
- Values entered: Box sign-in credentials only; never record them in the
  guide. Values copied: none.
- Screenshot exception: the sign-in page has no MCP-specific state; capture
  the next step instead.
- Provenance: [Claude Code; Adding Integration Credentials].

### Find Custom Box MCP Server under Integrations {#find-custom-box-mcp-server}

- In the Admin Console, select **Integrations**. Use the **MCP Category**
  filter or the search bar at the top of the page to find **Custom Box MCP
  Server**.
- Use that exact tile. **Box MCP Server** is also the name of the separate
  enterprise tool-governance tab, and named partner integrations have their
  own tiles.
- Values entered: the search term `Custom Box MCP Server` when searching.
  Values copied: none.
- Screenshot note: **Integrations** with the MCP filter or search result and
  the **Custom Box MCP Server** tile visible.
- Provenance: [Claude Code; Manage tool access; Managing Box MCP Servers].

### Add Integration Credentials {#add-integration-credentials}

- Product-doc path: open **Configuration**, then select **Add Integration
  Credentials**.
- Documented support alternative: hover over **Custom Box MCP Server**, click
  **Configure**, open **Additional Configuration**, click **+ Add Integration
  Credentials**, retain or edit the pre-filled credential name, click
  **Save**, then open the new entry.
- These paths are alternatives. Do not combine **Configuration** and
  **Additional Configuration** into one invented screen.
- Values entered: only a credential name on the support alternative. Values
  copied: none yet.
- Screenshot note: the visible credential-add control on whichever documented
  surface the enterprise presents.
- Provenance: [Claude Code; Managing Box MCP Servers; Adding Integration
  Credentials].

### Set the Redirect URI {#set-redirect-uri}

- In **Redirect URIs**, replace the existing Box redirect URI value or values
  with `{{ gram.oauth.callback_url }}`. Box says to change the Box redirect
  URIs to the redirect URI supplied by the external MCP client.
- Values entered: the callback template above, supplied by the Speakeasy AI
  Control Plane. Values copied: none.
- Screenshot note: **Redirect URIs** containing the callback URL, with any
  surrounding tenant or credential details redacted.
- Provenance: [Claude Code; Anthropic Messages API].

### Copy the Client ID and Client Secret {#copy-client-credentials}

- Copy the generated **Client ID** and **Client Secret** for
  `connect-speakeasy-credentials`. Store the secret as a password and redact
  both values from screenshots.
- Box documents copying both values during setup but does not say whether the
  secret remains visible later. The safe first-connect hedge is to copy it
  while Box shows it; no later reset or rotation procedure belongs here.
- Screenshot exception: the unique content is secret-bearing text, so use no
  screenshot unless every credential value is redacted.
- Provenance: [Claude Code; Managing Box MCP Servers].

### Check the Access scopes {#check-access-scopes}

- In the credential entry, check the desired **Access scopes**. Scopes set the
  maximum actions; users remain constrained by their own Box permissions.
- Box's API documentation publishes `root_readwrite`, `ai.readwrite`, and
  `docgen.readwrite`, but no current product page publishes the exact checkbox
  labels or maps them to those strings. Use only the documented section label
  in rendered instructions.
- Select AI or Doc Gen access only when the enterprise has enabled and licensed
  those features. `docgen.readwrite` requires Enterprise Advanced. Public docs
  do not state whether enabling a feature later makes a saved credential's
  scopes editable, so do not invent a reopen-and-edit recovery.
- Screenshot note: **Access scopes** with the intended non-secret selections
  visible and all credential values redacted.
- Provenance: [Claude Code; Set up the MCP server; Pricing; MCP FAQ].

### Save the credential entry {#save-credentials}

- Click **Save** after setting redirect URIs and access scopes on the
  product-doc path. On the support alternative, the preliminary name save is
  already part of `add-integration-credentials`; use the submission control
  shown for the edited credential entry.
- The product docs do not publish a confirmation-message label or a required
  reopen transition for this credential flow. Do not invent either.
- Values entered or copied: none.
- Screenshot exception: a standard submission action adds little once the
  configured fields are captured.
- Provenance: [Claude Code; Adding Integration Credentials].

### Enable the Box AI API (AI tools only) {#enable-box-ai-api}

- This is conditional setup for enterprises that need Box AI tools. In the
  Admin Console, go to **Box AI** > **Settings** and enable the AI API. Box's
  MCP FAQ names the control **Enable AI API**.
- Box AI APIs require an eligible Box AI plan or purchased Box AI Units; Box
  AI usage is additionally metered according to the plan. If the enterprise
  cannot enable this setting, its Box entitlement must be resolved rather than
  guessed around.
- Values entered: the enterprise setting selection. Values copied: none.
- Screenshot note: **Box AI** > **Settings** with the AI API setting visible;
  do not show user or tenant identifiers.
- Provenance: [MCP FAQ; Configuring Box AI; Pricing].

### Enable Box Doc Gen (Doc Gen tools only) {#enable-doc-gen}

- This is conditional setup for enterprises that need Doc Gen tools. Box's
  MCP FAQ gives the route **Admin Console** > **Enterprise Settings** >
  **Content and Sharing** > **Doc Gen** > **Enable Doc Gen**.
- The Content & Sharing reference calls the section **Box Doc Gen** and the
  control **Box Doc Gen Permissions**. Its choices include disabling all
  managed users, enabling all managed users, or selecting included/excluded
  users and groups. The documented default is disabled.
- Doc Gen and `docgen.readwrite` require Enterprise Advanced.
- Values entered: the intended permissions selection. Values copied: none.
- Screenshot note: **Content and Sharing** at **Box Doc Gen**, with the
  permissions control visible and identities redacted.
- Provenance: [MCP FAQ; Enterprise Settings: Content & Sharing; Set up the MCP
  server; Pricing].

### Manage tool access before rollout (optional) {#manage-tool-access}

- Use this setup branch only when enterprise policy requires restrictions or
  when an admin must enable a setup-relevant tool that Box disables by default.
  Open **Admin Console** > **Integrations** > **Box MCP Server**.
- Each category has an **Enablement** control and **Configure**. Documented
  options are **Disable all tools**, **Enable read only tools**, **Enable read
  & write tools**, and **Custom configuration**. **Configure** groups toggles
  under **Read only MCP tools** and **Write MCP tools**; click **Save** in that
  dialog.
- The four external-sharing tools listed by Box are off by default. File
  preview additionally requires a client with MCP Apps support, and upload or
  download URL tools require an agentic client able to make network requests.
  These are setup-affecting restrictions, not a tool inventory.
- If a client caches an old tool list during first connection, Box recommends
  refreshing it, starting a new chat, or disconnecting and reconnecting.
- Values entered: policy selections. Values copied: none.
- Screenshot note: the **Box MCP Server** category table with an
  **Enablement** menu or category configuration visible.
- Provenance: [Manage tool access; Available tools; MCP FAQ].

## Setup-affecting constraints

### Custom Integration Credentials are metered {#metered-api-calls}

Box says API calls are free only for a published Box Integrations Center app
when a user logs in with their own OAuth account. Additional Integration
Credentials are explicitly a charged case. Session initialization and listing
tools are also API calls; feature-specific AI, Doc Gen, and Sign usage is
charged under the applicable plan. Do not carry forward stale model names or
runtime-cost assumptions: the current Pricing page is the fact ceiling.
[Pricing]

### Plan and feature gates change available tools {#plan-gated-tools}

The MCP Server itself is on all Box plans, but only tools included in the
current plan can be used. Box AI tools require Box AI availability and the AI
API setting; Doc Gen needs Enterprise Advanced and enablement. [Pricing; MCP
FAQ]

### Scopes do not replace Box permissions {#scopes-vs-permissions}

The chosen OAuth scopes are only a ceiling. Every action still follows the
authorizing user's existing Box permissions. [Set up the MCP server; About Box
MCP Server]

### Tool-policy and client restrictions can block first use {#tool-policy-restrictions}

An enterprise-wide tool policy can disable tools, four external-sharing tools
start off, preview requires MCP Apps support, and direct upload/download URL
tools need an agentic client and sometimes domain allowlisting. Record only
these setup consequences; the server's advertised runtime list remains the
tool inventory. [Manage tool access; Available tools; MCP FAQ]

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md`, observed
`2026-08-28T15:35:57Z`. Per-guide values are remote
`https://mcp.box.com`, transport `streamable-http`, Authentication Option
`oauth-integration`, credential sources `copy-client-credentials`, and further
reading `https://docs.box.com/en/box-mcp/about-box-mcp-server`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

Render only the catalog path because `speakeasy_add_server: catalog` is an
explicit override and the remote is not tenanted. In the Speakeasy AI Control
Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**.
Choose **3rd-party server**. On the **MCP Catalog** page, find Box (the search
box reads **Search MCP servers...**), open its entry with **View**, and click
**Add**. In the **Add to Project** dialog, click **Add to Project**. This
creates the hosted MCP server and opens its **Overview** page. Do not render a
Custom remote alternative or a catalog-presence open question.

<!-- screenshot: the Add Source menu open on the Sources page, or the Box catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually** (or **Use Discovered** when offered by Box's
protected-resource metadata). In **Attach Remote Identity Provider**, set
**Client Type** to **Manual**. The sheet shows **Redirect URI** with a copy
button; confirm it matches the value substituted for
`{{ gram.oauth.callback_url }}` in Box at `set-redirect-uri`. Paste the
**Client ID** and **Client Secret (optional)** copied at
`copy-client-credentials`, then click **Attach Identity Provider**.

<!-- verify(operator): the template key substitutes this same Redirect URI value -->
<!-- screenshot: the Attach Remote Identity Provider sheet with Client Type Manual and all credentials redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Box's MCP documentation at
`https://docs.box.com/en/box-mcp/about-box-mcp-server`.

## Open questions

- Box's current product pages use **Configuration** > **Add Integration
  Credentials**; current Support pages use **Additional Configuration** >
  **+ Add Integration Credentials** and an initial name save. Public docs do
  not explain which enterprise receives which surface.
- Product docs name **Access scopes** but do not publish exact checkbox labels
  or map them to `root_readwrite`, `ai.readwrite`, and `docgen.readwrite`.
- Public docs do not state whether access scopes can be edited after saving a
  credential entry.
- Product docs say to change the existing Box redirect URIs but do not identify
  the pre-filled value.
- Public docs do not state whether **Client Secret** remains visible after the
  creation flow.
- Public docs do not say whether **Custom Box MCP Server** requires an
  availability-state change; the product flow documents none.
- Beyond the four sharing tools explicitly marked off by default, public docs
  do not state every category's initial enablement selection.
- Public docs describe **Save** inside a category's **Configure** dialog but do
  not say whether changing a row-level **Enablement** selection has a separate
  save action.

## Provenance

### Source inventory

- **Product/admin docs:** `https://docs.box.com` and its MCP index at
  `https://docs.box.com/llms.txt`. Used as primary UI authority.
- **Developer docs:** `https://developer.box.com`. Used for endpoint, OAuth,
  scopes, and license details, not to override product UI labels.
- **Support KB:** `https://support.box.com`. Used for administrator eligibility,
  no-DCR, and the alternate credential surface.
- No community, partner, issue, or researched-page claim was used as authority.
  The coordinator-supplied Pulse result contributes only the derived catalog
  match and transport fact allowed by doctrine.

### Source records

All records below were observed `2026-08-28T15:35:57Z`.

- `https://docs.box.com/llms.txt` — Box public documentation index; backs the
  documentation-property sweep and discovery of current Box MCP pages.
- `https://docs.box.com/en/box-mcp/about-box-mcp-server` — backs the hosted
  endpoint, user authorization/permissions model, and primary further-reading
  locator.
- `https://docs.box.com/en/box-mcp/configuring-box-mcp-server/claude-code` —
  backs Admin Console URL, **Custom Box MCP Server**, **Configuration** > **Add
  Integration Credentials**, **Redirect URIs**, **Client ID**, **Client
  Secret**, **Access scopes**, **Save**, and HTTP endpoint configuration.
- `https://docs.box.com/en/box-mcp/configuring-box-mcp-server/anthropic-messages-api`
  — backs the same generic-client Box credential flow and confirms that the
  redirect URI comes from the external MCP client.
- `https://docs.box.com/en/box-mcp/supported-ai-platforms` — current product
  index of supported client-specific setup pages; used to verify that generic
  client flows are current rather than a single abandoned example.
- `https://docs.box.com/en/box-mcp/admin-controls` — backs **Integrations** >
  **Box MCP Server**, category-level **Enablement**, four policy choices,
  **Configure**, grouped read/write tool toggles, save behavior, enterprise
  defaults, and first-connect cache recovery.
- `https://docs.box.com/en/box-mcp/tools` — backs only setup-affecting tool
  restrictions: four sharing tools off by default, agentic transfer
  requirements, domain allowlisting, and relevant plan/feature markers. It is
  not used as a copied tool inventory.
- `https://docs.box.com/en/box-mcp/pricing` — backs all-plan server
  availability, paid additional Integration Credentials, API-call accounting,
  and plan-specific AI/Doc Gen/Sign usage.
- `https://docs.box.com/en/box-mcp/faq` — backs AI and Doc Gen enablement
  routes, MCP Apps preview requirement, default-disabled-tool warning, and
  first-connect tool-list refresh options.
- `https://docs.box.com/en/box-ai/admins/configuring-box-ai` — backs the
  **Box AI** > **Settings** area and Box AI API eligibility/enablement context.
- `https://docs.box.com/en/box-admin-tools/box-admin-reference/enterprise-settings-content-sharing-tab`
  — backs **Box Doc Gen**, **Box Doc Gen Permissions**, its choices, and its
  disabled default.
- `https://docs.box.com/en/box-admin-tools/reporting-and-insights/mcp-server-activity-report`
  — swept as current admin documentation; it concerns later usage reporting
  and contributes no rendered setup step.
- `https://developer.box.com/guides/box-mcp/` — backs the hosted Box MCP server
  and manual OAuth client-credential model.
- `https://developer.box.com/guides/box-mcp/remote/` — backs endpoint, OAuth
  authorization/token URLs, scope strings, scope semantics, and Enterprise
  Advanced requirement for `docgen.readwrite`; its older console sequence does
  not override product docs.
- `https://support.box.com/hc/en-us/articles/43847256139923` — backs hover
  **Custom Box MCP Server** > **Configure**, **Additional Configuration**,
  **+ Add Integration Credentials**, endpoint, OAuth client credentials, and
  the explicit no-DCR statement.
- `https://support.box.com/hc/en-us/articles/30900136778259` — backs Box Admin
  or Co-Admin eligibility and the alternate pre-filled-name/save/open flow.
- `https://mcp.box.com/.well-known/oauth-protected-resource` — live official
  metadata fetched through Exa; backs resource `https://mcp.box.com/`, resource
  name **Box Model Context Protocol Server**, authorization server
  `https://api.box.com/`, bearer-header support, and official resource docs.
- `doctrine/speakeasy-setup.md` — repository authority supplied in the parsed
  helper artifact; backs the transcluded Speakeasy labels, fixed anchors,
  catalog-only selection under the override, manual OAuth flow, and closing
  pointer form.
- Pulse snapshot supplied by the coordinator — `source: pulsemcp`; backs only
  the exact Box catalog match and `streamable-http` classification. No private
  catalog content is reproduced.
