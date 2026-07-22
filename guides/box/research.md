---
research_version: 1
slug: box
researched_at: 2026-07-22T23:18:01Z
---

# Box — Research Dossier

Authoritative source ruling for this guide: Box's product-docs site
**docs.box.com** is the source of truth for Admin Console UI facts (tile
names, navigation, step order, field labels). Its Box MCP section
(`/en/box-mcp`, indexed at `https://docs.box.com/llms.txt`) was missed by
an early run and is the corrected primary source (see
`retro/notes/2026-07-22-box.md`). `developer.box.com` and
`support.box.com` remain valid for API-level facts (scope strings, OAuth
endpoints, endpoint URL, client-registration model) where docs.box.com is
silent — but every console-UI fact sourced only from them is flagged.
This run re-verified every load-bearing fact against the live pages on
2026-07-22 (fetches at ~23:19–23:21Z); all held, with one source-shape
change: `https://developer.box.com/guides/box-mcp/remote/` — still named
as the endpoint's official `resource_documentation` in the live
protected-resource metadata — now returns HTTP 308 and permanently
redirects to `https://developer.box.com/guides/box-mcp/setup` ("Set up
the MCP server"), which carries all the API-level facts previously
attributed to both pages. Conflicts are recorded inline and in
Provenance.

## Server facts

- **Remote URL**: `https://mcp.box.com`. docs.box.com (About Box MCP
  Server): "The AI platform sends requests to the Box MCP Server
  (`mcp.box.com`), which runs them against your Box account using your
  permissions." developer.box.com agrees: "Box hosts MCP at
  https://mcp.box.com. You connect your client or agent platform to this
  URL; you do not run Box's MCP server yourself for the standard
  integration."
- **Transport**: `streamable-http` (Pulse mirror `com.pulsemcp.mirror/box`
  v0.0.1, remote type `streamable-http`). Corroborated by direct
  observation 2026-07-22 (this run): an unauthenticated JSON-RPC POST to
  `https://mcp.box.com` returns `HTTP 401` with `WWW-Authenticate: Bearer`
  pointing at
  `https://mcp.box.com/.well-known/oauth-protected-resource`. The
  docs.box.com per-client pages configure the server client-side as
  `{"type":"http","url":"https://mcp.box.com", ...}`.
- **MCP name**: developer.box.com documents passing the MCP name
  `box-remote-mcp` on the client side (API-level fact; docs.box.com's
  Claude Code example names the client entry `box-mcp` — the entry name is
  the client's choice, not a server property).
- **Authentication**: OAuth 2.0 only. End users authorize with their own
  Box accounts; the OAuth client (here, the Speakeasy AI Control Plane)
  presents a Client ID and Client Secret that a Box admin generates in
  the Admin Console (see credential flow).
  - Authorization URL: `https://account.box.com/api/oauth2/authorize`
  - Token Exchange URL: `https://api.box.com/oauth2/token`
  - Box support: "OAuth endpoints: these are the same as for the Box
    Platform and also exposed according to RFC 8414."
  - Client registration is manual: "Note that the Box MCP Server
    currently does not support Dynamic Client Registration." (Box
    support.) This backs `client_registration: manual` in the Metadata;
    the credential flow below is the required path, so it is a server
    fact, not a gotcha — the flow's presence is the remedy.
  - Protected-resource metadata (observed live 2026-07-22, this run):
    resource `https://mcp.box.com/`, resource name "Box Model Context
    Protocol Server", authorization server `https://api.box.com/`,
    `bearer_methods_supported: ["header"]`, `resource_documentation:
    https://developer.box.com/guides/box-mcp/remote/` (that URL now 308-
    redirects to `/guides/box-mcp/setup` — see Provenance), and
    `resource_policy_uri` / `resource_tos_uri` both
    `https://www.box.com/legal/termsofservice`.
- **OAuth scopes** (API-level strings, from developer.box.com):
  `root_readwrite`, `ai.readwrite`, and `docgen.readwrite`. "The
  `docgen.readwrite` scope requires an Enterprise Advanced license." In the
  Admin Console UI these surface as the credential entry's **Access
  scopes** section (docs.box.com); the UI-label-to-string mapping is not
  documented (see open questions).
- **Plan/licensing**: "The MCP Server is available on **all Box plans**."
  (docs.box.com Pricing). "You can only use MCP tools that are included
  in your current Box plan." — AI tools require a Box AI-enabled plan,
  DocGen and Sign depend on plan availability. Tool categories "such as
  Hubs or AI might not be available for every enterprise."
- **Permissions model**: "All actions follow your organization's existing
  permissions, sharing settings, and security policies." "No files are
  permanently shared with the AI platform. The AI assistant queries your
  Box content in real time, and all actions are logged." (docs.box.com
  About Box MCP Server)
- **Product status**: generally available; "The self-hosted Box MCP
  server (open-source community project) is deprecated. Do not start new
  work on it." (developer.box.com)

## Credential flow

Who acts: a **Box Admin or Co-Admin** ("Box Admins and Co-Admins can add
Integration Credentials for supported apps in the Admin Console" — Box
support; the Box MCP Server is on the documented supported-apps list). The
docs.box.com per-client pages label the whole flow with an **Admin**
badge.

What gets created: one set of **Integration Credentials** on the
**Custom Box MCP Server** integration, in the Admin Console under
**Integrations**. Box generates a **Client ID** and **Client Secret**.

Values the Speakeasy AI Control Plane needs, and where they come from:

| Value | Origin |
| --- | --- |
| Client ID | Generated by Box; shown in the credential entry ({#copy-client-credentials}) |
| Client Secret | Generated by Box; shown in the same entry ({#copy-client-credentials}) |

Where `{{ gram.oauth.callback_url }}` gets pasted: into the credential
entry's **Redirect URIs** field ({#set-redirect-uri}). docs.box.com's
generic-client pages phrase step 4 as: "In **Redirect URIs**, change the
Box redirect URIs to the redirect URI provided by the external MCP
Client." For this guide, the "external MCP Client" is the Speakeasy AI
Control Plane and the value is `{{ gram.oauth.callback_url }}` — not the
`http://localhost:PORT/callback` example shown on the Claude Code page,
which applies only to Claude Code's local OAuth listener.

After setup, each end user completes Box's OAuth consent when
connecting; access is capped by the selected scopes and further limited
by the user's own Box permissions (see {#scopes-vs-permissions}).

Post-setup administration, recorded for completeness but out of the
Setup Guide's scope (setup, not maintenance — see
`retro/notes/2026-07-22-setup-not-maintenance.md`): Box support notes
"Box displays the added Integration Credentials as a platform app,
visible in **Platform** > **Platform Apps**. This enables you to manage
the app's availability status. Please note that the Integration's
availability status does not affect the availability status of its
Integration Credentials platform apps." (Console-UI fact not confirmed
on docs.box.com.)

## Console walkthrough

Primary source: the admin flow on docs.box.com's per-client pages (Claude
Code, Anthropic Messages API, GitHub MCP Registry — all carry the
identical seven-step "Enable integration in Box" sequence, re-verified
live this run, 2026-07-22). The Claude Code page's rendering was
additionally human-verified against a screenshot of that page (Walker,
2026-07-22; `retro/notes/2026-07-22-box.md`).

**Recorded conflict — older console flow.** An earlier flow persists on
`developer.box.com/guides/box-mcp/setup` and Box support article
30900136778259: search for "Box MCP server", hover, click **Configure**,
then under an **Additional Configuration** section click **+ Add
Integration Credentials**, name it, **Save**, expand the entry, copy
credentials, enter a single **Redirect URI**, select **Access Scopes**.
That flow's tile name ("Box MCP server"), hover-then-Configure gesture,
"Additional Configuration" section, and step order conflict with
docs.box.com and are **not** carried into this walkthrough; docs.box.com
is preferred per the source ruling above.

### Sign in to the Box Admin Console {#open-admin-console}

- Entry: sign in to the **Box Admin Console** — docs.box.com links the
  words "Box Admin Console" to `https://app.box.com/master`. A Box Admin
  or Co-Admin account is required (see credential flow).
- Values entered: Box admin sign-in only. Values copied: none.
- Screenshot exception: a sign-in page with no MCP-specific state; the
  Admin Console landing view is captured in the next step.

### Find Custom Box MCP Server under Integrations {#find-custom-box-mcp-server}

- docs.box.com, verbatim: "Go to **Integrations** and find **Custom Box
  MCP Server** either by using the **MCP Category** filter, or by using
  the search bar at the top of the page."
- The tile name is definitively **Custom Box MCP Server** (consistent
  across all docs.box.com per-client pages). developer.box.com's "Box
  MCP server" spelling is the older, conflicting label — do not expect
  it.
- Do not confuse the **Custom Box MCP Server** integration tile (this
  step; holds credentials for custom clients like the Speakeasy AI
  Control Plane) with the **Box MCP Server** tab on the Integrations
  page (enterprise tool-access governance — see {#manage-tool-access}),
  or with named partner tiles (Claude, Runlayer, etc.), which are
  enabled by "setting its availability to **Available to all users**"
  and do not apply here.
- Values entered: search term `Custom Box MCP Server` (or filter by the
  **MCP** category). Values copied: none.
- Screenshot note: the Integrations page with the **MCP Category**
  filter applied (or `Custom Box MCP Server` in the search bar) and the
  **Custom Box MCP Server** tile visible in the results.

### Add Integration Credentials {#add-integration-credentials}

- docs.box.com, verbatim: "Go to **Configuration** > **Add Integration
  Credentials** to generate new credentials."
- Screen transition into this step: docs.box.com names no action
  between finding **Custom Box MCP Server**
  ({#find-custom-box-mcp-server}) and "Go to **Configuration**".
  Recorded reading, inferred from the step order: select the **Custom
  Box MCP Server** tile in the filter or search results — this opens
  the integration's own page, which is where the **Configuration**
  view lives. This is an inference, not a documented label; the exact
  gesture and view layout need console verification at capture time
  (see open questions).
- Box generates the credential pair for the new entry; the following
  steps configure and reveal it.
- Values entered: none documented (the older support-article flow
  mentions a pre-filled default name that can be changed; docs.box.com
  does not document a name field — flagged in open questions). Values
  copied: none yet.
- Screenshot note: the Custom Box MCP Server **Configuration** view with
  the **Add Integration Credentials** control visible, and the new
  credential entry it creates.

### Set the Redirect URI {#set-redirect-uri}

- docs.box.com (generic-client pages), verbatim: "In **Redirect URIs**,
  change the Box redirect URIs to the redirect URI provided by the
  external MCP Client."
- This is where `{{ gram.oauth.callback_url }}` goes: replace the
  existing Box redirect URI value(s) with the callback URL copied from
  the Speakeasy AI Control Plane. ("Change the Box redirect URIs"
  implies the field arrives pre-populated; the documentation does not
  show the pre-filled value.)
- Do not use the Claude Code page's `http://localhost:PORT/callback`
  example — that is specific to Claude Code's local listener. (The Claude
  Code page's step 4, verbatim: "In **Redirect URIs**, change the Box
  redirect URIs to `http://localhost:PORT/callback`. You can use any
  callback port for this.")
- Values entered: `{{ gram.oauth.callback_url }}` into **Redirect
  URIs**. Values copied: none.
- Screenshot note: the credential entry's **Redirect URIs** field
  containing the pasted Speakeasy AI Control Plane callback URL.

### Copy the Client ID and Client Secret {#copy-client-credentials}

- docs.box.com, verbatim: "Copy the **Client ID** and **Client Secret**
  for later use. These are required later for the external MCP Client to
  authorize the connection."
- Both paste into the matching fields in the Speakeasy AI Control
  Plane; the Client Secret should be stored like a password.
- Values copied: **Client ID** and **Client Secret** → Speakeasy AI
  Control Plane credential fields.
- Screenshot exception: the credential values are plain text fields
  whose appearance adds nothing beyond the copied values.
- Recovery: whether the Client Secret stays viewable on later visits is
  undocumented (see open questions). If it is not viewable when you
  return, generate a fresh credential set
  ({#add-integration-credentials}), reconfigure it ({#set-redirect-uri},
  {#check-access-scopes}), **Save** ({#save-credentials}), and use the
  new values instead.

### Check the Access scopes {#check-access-scopes}

- docs.box.com, verbatim: "Check the **Access scopes**." The generic
  per-client pages link "Access scopes" to the admin article
  "Understanding Requests to Authorize or Allow Applications →
  Reviewing Scopes", which explains scope review generically ("Most
  scopes are self-explanatory (for example, Manage Users, Read and Write
  files and folders)") but does not enumerate this entry's checkboxes.
- The corresponding API-level OAuth scope strings are `root_readwrite`
  (content), `ai.readwrite` (Box AI), and `docgen.readwrite` (Doc Gen;
  requires an Enterprise Advanced license). The exact checkbox labels
  shown in the console are not documented (see open questions).
- AI and Doc Gen scopes only appear once those features are enabled for
  the enterprise (see {#enable-box-ai-api}, {#enable-doc-gen}, and
  {#ai-docgen-tools-hidden-until-enabled}).
- Scope semantics: see {#scopes-vs-permissions}.
- Values entered: scope selections. Values copied: none.
- Screenshot note: the credential entry's **Access scopes** section with
  its checkboxes visible — capture the exact labels; documentation does
  not name them.
- Recovery — missing AI/Doc Gen scope (flagged inference, not a
  documented flow): if a needed scope is absent because the feature is
  not yet enabled, do not abandon the unsaved entry — first click
  **Save** ({#save-credentials}), then enable the feature
  ({#enable-box-ai-api} / {#enable-doc-gen}), re-open the saved
  credential entry, select the newly visible scope, and click **Save**
  again. The re-open-and-edit step is inferred: {#save-credentials}
  documents re-opening only to confirm the Redirect URI persisted, and
  no source states that a saved entry's **Access scopes** remain
  editable on re-open (see open questions; console verification needed
  at capture time). If the saved entry cannot be re-edited, fall back
  to generating a fresh credential set and reconfiguring it — the
  recovery recorded in {#copy-client-credentials}.

### Save the credential entry {#save-credentials}

- docs.box.com, verbatim: "Click **Save**." An explicit Save step ends
  the flow — the credential entry does not save automatically.
- Values entered: none. Values copied: none.
- Screenshot exception: a standard button click with no unique state
  beyond the views captured in the prior steps.
- Recovery: the documentation does not describe what happens if you
  leave the page before clicking **Save**; to be safe, complete
  {#set-redirect-uri} and {#check-access-scopes} and save in one sitting,
  and re-open the entry afterward to confirm the Redirect URI persisted.

### Enable the Box AI API (AI tools only) {#enable-box-ai-api}

Needed only if users will call the Box AI tools (`ai_qa_*`,
`ai_extract_*`) — and for the AI scope to appear during
{#check-access-scopes}. docs.box.com FAQ: "To enable AI & Agent Tools:
**Admin Console → Box AI → Settings → Enable AI API**."

- Per docs.box.com "Configuring Box AI": "Within the Admin Console, go
  to the **Box AI section** and then the **Settings** tab". "If your
  organization has not fully enabled Box AI, you can click **Enable Box
  AI** to do so for all services." The **Box AI APIs** setting ("Defines
  developer users who can extend Box AI capabilities via AI API") is
  configured by clicking **configure** and selecting **Enable for all**
  or **Disable for all**.
- Licensing note (docs.box.com "Configuring Box AI"): "Business,
  Business Plus, and Enterprise plans will only have access to Box AI
  for Documents and Notes when Enable Box AI is toggled. Box AI APIs
  are available upon purchase of Box AI Units for Business, Business
  Plus, and Enterprise plans." On those plans the **Box AI APIs**
  setting the MCP AI tools depend on is a paid add-on, not a toggle.
- Purchase path for Box AI Units (docs.box.com "Understanding AI Units
  In Box", under "How the entitlement resets"): "To purchase more:
  Contact your Box account manager or reach out directly to the sales
  team at sales@box.com for baseline pricing tiers and subscription
  blocks." The same page's AI-Units table lists the Business and
  Business Plus plans' included AI Units as "Available for purchase".
  What the **Box AI APIs** setting shows in the console when Units have
  not been purchased is not documented (see open questions).
- First-time enablement may require accepting legal terms: "you will
  need to review and accept the Box AI Product Addendum before enabling
  Box AI for your organization"; if a **Review Agreement Offline**
  message appears instead, the organization has specific restrictions and
  you must contact the Box Account Team.
- Conflict note: Box support article 43847256139923 words this step as
  ensuring "**AI API and Official Box Integrations is enabled for all
  users** is selected" — an older label set not present on docs.box.com;
  prefer the docs.box.com labels above.
- Values entered: setting selections only. Values copied: none.
- Screenshot note: the **Box AI** > **Settings** tab showing the **Box
  AI APIs** configuration set to **Enable for all**.
- Recovery: if the credential entry was already saved before this
  enablement, returning to it to select the newly visible AI scope
  follows the flagged Save-first recovery inference recorded in
  {#check-access-scopes} (fallback: a fresh credential set,
  {#copy-client-credentials}).

### Enable Box Doc Gen (Doc Gen tools only) {#enable-doc-gen}

Needed only if users will call the Doc Gen tools — and for the Doc Gen
scope to appear during {#check-access-scopes}. docs.box.com FAQ: "To
enable Doc Gen Tools: **Admin Console → Enterprise Settings → Content
and Sharing → Doc Gen → Enable Doc Gen**."

- The Content & Sharing tab reference documents the setting as **Box Doc
  Gen** > **Box Doc Gen Permissions**: "Defines who can create and
  manage Doc Gen templates. Click **Configure** and then select" one of
  **Disable for all managed users (default)**, **Enable for all managed
  users**, **Enable for select users and groups**, or **Enable for
  everyone except select users and groups**. Note the default is
  disabled.
- Licensing: the `docgen.readwrite` scope "requires an Enterprise
  Advanced license" (developer.box.com).
- Values entered: setting selections only. Values copied: none.
- Screenshot note: **Enterprise Settings** > **Content and Sharing**
  scrolled to the **Box Doc Gen** section with its permissions options
  visible.
- Recovery: if the credential entry was already saved before this
  enablement, returning to it to select the newly visible Doc Gen scope
  follows the flagged Save-first recovery inference recorded in
  {#check-access-scopes} (fallback: a fresh credential set,
  {#copy-client-credentials}).

### Restrict which tools are exposed (optional) {#manage-tool-access}

Enterprise-wide governance over the server's tool list, from
docs.box.com "Manage Tool Access": "Open the **Admin Console**. In the
left sidebar, select **Integrations**. Select the **Box MCP Server**
tab." Setup-relevant primarily when the enterprise needs the
off-by-default sharing tools turned on ({#sharing-tools-off-by-default})
or wants tools restricted before rollout.

- A table displays tool categories ("for example, Files and Folders,
  Search, Box Hubs"). Each row includes an **Enablement** control and a
  **Configure** button.
- The **Enablement** control offers exactly four options: **Disable all
  tools**, **Enable read-only tools**, **Enable read & write tools**,
  and **Custom configuration**.
- **Configure** opens a configuration window with the category name and
  description, **Enablement** options, tools grouped under **Read only
  MCP tools** and **Write MCP tools**, and a toggle for each tool.
  "After you click **Save**, a confirmation message appears."
- Toggles and the Enablement selection stay in sync (only read tools on
  → **Enable read-only tools**; all on → **Enable read & write tools**;
  all off → **Disable all tools**; any other mix → **Custom
  configuration**).
- Admin Console search can jump here: enter a tool keyword in "the
  search bar at the top of any Admin Console page" and select a result —
  "The Admin Console navigates to the **Box MCP Server** page and opens
  the relevant category configuration."
- Category-level changes take effect immediately and apply to the whole
  enterprise: "Tool enablement applies to the entire enterprise.
  Per-client, user-level, or group-level controls are not supported."
- Enforcement: a disabled tool is removed from the tool list returned to
  the MCP client; if disabled after discovery, the server returns "Tool
  has been disabled by the enterprise admin. Contact your enterprise
  admin for more information."
- Post-setup administration (out of Setup Guide scope): auditing
  enablement changes via **Reports** > **Create Report** > **Security
  Logs** (under **Integrations**, **Changed MCP Tools Enablement
  Status**) and usage monitoring via the **MCP Server Activity** report
  (columns include Integration ID/Name/Client ID, User Name, User
  Email).
- Values entered: enablement selections. Values copied: none.
- Screenshot note: the **Box MCP Server** tab showing the category table
  with an **Enablement** dropdown open, its four options visible.
- Recovery: "Some MCP clients cache the tool list. After a tool is
  enabled or disabled, an agent might still reference a cached version
  of the list... If this happens, close and reopen the MCP client so
  that it fetches an updated tool list." The FAQ adds: refresh the tool
  list, start a new chat, or disconnect and reconnect — and "even if the
  agent attempts to call the disabled tool, the call will fail so there
  is no security risk."

## Gotchas

### Custom-credential use is metered and billed {#metered-api-calls}

The MCP Server itself "is available on **all Box plans**", and API calls
are free only when both conditions hold: "You are using an app published
in the **Box Integrations Center**" and "You log in with your own Box
account (OAuth)". API calls are charged in other cases, explicitly
including "Use of additional integration credentials from the Box MCP
Server" — exactly the setup this guide creates. Metering: any tool
invocation = 1 API call; AI tool invocation = 1 API call + AI Units
"(based on model tier and document length)"; DocGen tool invocation = 1
API call + "cost per document generated beyond included allowance"; Sign
request = 1 API call + "Sign usage (per request; plan limits apply)";
session initialization and list-tools each = 1 API call (once per
session). (docs.box.com Pricing)

### Tools are gated by plan and licensing {#plan-gated-tools}

"You can only use MCP tools that are included in your current Box plan."
"AI tools require a Box AI-enabled plan, DocGen and Sign depend on plan
availability." The `docgen.readwrite` scope "requires an Enterprise
Advanced license". "Box AI APIs are available upon purchase of Box AI
Units for Business, Business Plus, and Enterprise plans." Tool
categories "such as Hubs or AI might not be available for every
enterprise. Check your subscription for details."

### AI and Doc Gen scopes and tools are hidden until enabled {#ai-docgen-tools-hidden-until-enabled}

docs.box.com FAQ, under "I don't see AI or Doc Gen scopes/tools when
setting up the MCP Server": "You need to enable AI and Doc Gen in the
Admin Console for your enterprise to make these tools available." See
{#enable-box-ai-api} and {#enable-doc-gen}. Box Doc Gen Permissions
default to **Disable for all managed users**.

### Scopes cap actions; user permissions still govern {#scopes-vs-permissions}

"Scopes define the maximum set of actions. Users can only access content
they already have permission to view or edit in Box."
(developer.box.com) docs.box.com agrees at both ends: "All actions
follow your organization's existing permissions, sharing settings, and
security policies" and every action respects folder permissions,
collaboration settings, Box Shield policies, and audit logging. Granting
a scope never widens what an individual user can see or edit.

### Externally shared items block many write tools {#external-sharing-restrictions}

Fifteen write tools — `copy_file`, `copy_folder`, `create_folder`,
`move_file`, `move_folder`, `set_file_metadata`, `set_folder_metadata`,
`update_file_properties`, `update_folder_properties`, `upload_file`,
`upload_file_version`, `create_file_comment`, `add_items_to_hub`,
`copy_hub`, and `update_hub` — "Only works on items that meet **all**
of the following: No external collaborators on the item itself; No
shared link on the item itself; No external collaborators or shared
links on any parent folder, up to the root." (Membership re-verified
against the live docs.box.com tools page footnote this run, 2026-07-22:
exactly these fifteen tools carry its mark.)

### External-sharing tools are off by default {#sharing-tools-off-by-default}

`add_file_shared_link`, `add_folder_shared_link`, `create_collaboration`,
and `update_collaboration` "Can create open shared links or add
collaborators from outside your organization. Off by default." The FAQ
confirms: "Certain tools are disabled by default and must be enabled by
an admin." An admin must deliberately enable them (see
{#manage-tool-access}) before agents can use them.

### Upload/download URL tools need an agentic client {#url-tools-agentic-only}

`get_upload_url` and `get_download_url` "require the AI agent to make a
direct network request to transfer the file. Declarative agents can't
make these requests, so these tools work only in agentic
(code-executing) environments." Some clients also require allowlisting
Box domains first (non-Box-Zones default list: `upload.box.com`,
`upload.app.box.com`, `upload.ent.box.com`, `dl.boxcloud.com`,
`public.boxcloud.com`; wildcard alternatives `upload.*.box.com`,
`*.boxcloud.com`, `*.box.com`; Box Zones customers need their
zone-specific list).

### File preview tool requires MCP Apps support {#file-preview-requires-mcp-apps}

FAQ: "The file preview tool only works with clients that support MCP
apps." Calling `get_file_preview` from a client without MCP Apps support
reports a UI widget that never appears.

### Shield classification labels ride the metadata tools {#shield-classification-via-metadata}

FAQ: "Retrieving and applying classification labels to files and folders
is handled through the existing metadata tools. Creating new
classifications is handled through the existing create metadata template
tool. However, applying access policies to classification labels is not
supported through MCP and needs to be done in the Admin Console."

## Open questions

- **Tile-to-Configuration transition.** docs.box.com's seven-step flow
  jumps from "find **Custom Box MCP Server**" (step 2) straight to "Go
  to **Configuration**" (step 3) without naming the action in between;
  the word "tile" appears nowhere on the page, and Walker's 2026-07-22
  screenshot verified the docs page, not the console. The Dossier
  records the inferred transition (select the tile; its page holds the
  **Configuration** view) in {#add-integration-credentials}; the
  actual gesture and view layout need console verification at capture
  time.
- **Exact Access-scopes checkbox labels.** docs.box.com names the
  section (**Access scopes**, step "Check the **Access scopes**") but
  never enumerates the checkbox labels inside the Custom Box MCP Server
  credential entry, and no source documents the mapping from UI labels
  to the OAuth strings `root_readwrite` / `ai.readwrite` /
  `docgen.readwrite`. (Older, conflicting sources offered "Content
  Actions" and "Manage AI" — untrusted per the source ruling.) Needs
  console verification at capture time.
- **Whether a saved entry's Access scopes are editable on re-open.**
  The Save-first recovery recorded in {#check-access-scopes} (Save,
  enable the feature, re-open the entry, select the newly visible
  scope, Save again) is an inference — {#save-credentials} documents
  re-opening only to confirm the Redirect URI persisted, and no source
  states that a saved credential entry's **Access scopes** can be
  edited afterward. Needs console verification at capture time; the
  fallback if re-editing fails is a fresh credential set
  ({#copy-client-credentials}).
- **Credential-entry name field.** The older support-article flow says a
  default integration-credentials name is pre-filled and changeable;
  docs.box.com's current seven-step flow shows no name field. Unconfirmed
  whether one exists.
- **Pre-filled Redirect URI value.** Step 4 says to "change the Box
  redirect URIs", implying a pre-populated value, but no source shows
  what it is.
- **Client Secret revisibility.** No documentation states whether the
  Client Secret remains viewable in the credential entry on later visits
  or is shown only once; the docs.box.com order (copy at step 5, before
  Save at step 7) implies it is visible at creation time at minimum.
- **Whether the Custom Box MCP Server integration needs its own
  availability state.** Predefined partner tiles are enabled by "setting
  its availability to **Available to all users**" (docs.box.com Claude /
  Runlayer pages); the Custom Box MCP Server seven-step flow documents
  no equivalent state change, and the related platform-app availability
  (Platform > Platform Apps, from the older support article) is not
  confirmed on docs.box.com.
- **Default tool-enablement state per category.** Beyond the four
  sharing tools documented "Off by default", no source says which
  Enablement option each category starts in.
- **Whether an Enablement-control change needs its own Save.**
  docs.box.com documents the Save-then-confirmation behavior only
  inside a category's **Configure** window ("After you click **Save**,
  a confirmation message appears") and separately states category-level
  changes take effect immediately; no source says whether selecting an
  option in a row's **Enablement** control involves a Save of its own.
  Needs console verification at capture time.
- **Box AI APIs setting appearance without purchased Units.** On
  Business, Business Plus, and Enterprise plans, no source documents
  what the **Box AI APIs** setting shows when Box AI Units have not
  been purchased (the purchase path itself is documented — see
  {#enable-box-ai-api}). Needs console verification at capture time.

## Provenance

Source inventory from the sweep. Box publishes three documentation
properties, all consulted this run:
- **Product/admin docs — docs.box.com** (source of truth for console UI;
  full Box MCP section under `/en/box-mcp`, machine-readable index
  `https://docs.box.com/llms.txt` observed 2026-07-22). Preferred for
  every console-UI fact.
- **Developer docs — developer.box.com** (API-level facts: scope strings,
  OAuth URLs, endpoint, MCP name, client-registration model). Its
  `/guides/box-mcp/setup` page carries an older, conflicting console
  flow — used for API-level facts only, never console UI.
- **Support KB — support.box.com** (Zendesk articles: no DCR, RFC 8414,
  who can add Integration Credentials, Platform > Platform Apps side
  effect). Console-UI facts drawn from it are flagged; conflicting flow
  not used.

All docs.box.com content was fetched via the site's markdown endpoints
(append `.md` to the page URL), discovered through the machine-readable
index `https://docs.box.com/llms.txt`. Every locator below was
re-fetched live this run (2026-07-22, ~23:19–23:21Z).

- `https://docs.box.com/llms.txt` — observed 2026-07-22. Backs: the
  source inventory of the Box MCP doc set (About, Manage Tool Access,
  per-client configuring pages, FAQ, Pricing, Supported AI Platforms,
  Available Tools).
- `https://docs.box.com/en/box-mcp/configuring-box-mcp-server/claude-code`
  — observed 2026-07-22. Backs: the seven-step "Enable integration in
  Box" admin flow (Admin Console URL `https://app.box.com/master`,
  **Custom Box MCP Server** tile name, **MCP Category** filter/search,
  **Configuration** > **Add Integration Credentials**, **Redirect
  URIs**, copy **Client ID**/**Client Secret**, "Check the **Access
  scopes**", **Save**), client-side `{"type":"http"}` config, the
  localhost redirect example (Claude Code-specific:
  `http://localhost:PORT/callback`). Human-verified against a screenshot
  of the page itself (Walker, 2026-07-22; `retro/notes/2026-07-22-box.md`).
  The page names no action between its steps 2 and 3 (see the
  tile-to-Configuration open question).
- `https://docs.box.com/en/box-mcp/configuring-box-mcp-server/anthropic-messages-api`
  and
  `https://docs.box.com/en/box-mcp/configuring-box-mcp-server/github-mcp-registry`
  — observed 2026-07-22. Back: the same seven-step flow with the
  generic-client step 4 wording "change the Box redirect URIs to the
  redirect URI provided by the external MCP Client", and the "Access
  scopes" link to the Reviewing Scopes article.
- `https://docs.box.com/en/box-mcp/about-box-mcp-server` — observed
  2026-07-22. Backs: `mcp.box.com` endpoint, capability overview,
  admin-enables-then-user-authorizes model ("In the Box Admin Console,
  your admin enables the Box MCP Server and the Box platform app for
  one or more AI platforms and configures access scopes"), "All actions
  follow your organization's existing permissions...", "No files are
  permanently shared...".
- `https://docs.box.com/en/box-mcp/tools` — observed 2026-07-22. Backs:
  external-sharing restrictions (fifteen tools), "Off by default"
  sharing tools (four), upload/download URL tool constraints and domain
  allowlists.
- `https://docs.box.com/en/box-mcp/admin-controls` ("Manage Tool
  Access") — observed 2026-07-22. Backs: **Box MCP Server** tab, four
  **Enablement** options, per-tool toggles and sync behavior, Admin
  Console search jump, enforcement and error text, tool-list caching,
  audit report path, enterprise-wide scope, category availability
  caveat.
- `https://docs.box.com/en/box-mcp/pricing` — observed 2026-07-22.
  Backs: all-plans availability, free-use conditions, charged cases
  including additional integration credentials, metering table,
  plan-gated tools note.
- `https://docs.box.com/en/box-mcp/faq` — observed 2026-07-22. Backs:
  AI/Doc Gen enablement paths ("Admin Console → Box AI → Settings →
  Enable AI API"; "Admin Console → Enterprise Settings → Content and
  Sharing → Doc Gen → Enable Doc Gen"), hidden-scopes symptom,
  disabled-by-default tools, tool-list caching remediation and
  no-security-risk note, file-preview MCP Apps requirement, Shield
  classification behavior, domain-allowlisting symptom.
- `https://docs.box.com/en/box-mcp/supported-ai-platforms` — observed
  2026-07-22. Backs: supported-platform list; per-client page index.
- `https://docs.box.com/en/box-mcp/configuring-box-mcp-server/claude`
  and `https://docs.box.com/en/box-mcp/configuring-box-mcp-server/runlayer`
  — observed 2026-07-22. Back: predefined partner tiles enabled via
  availability "**Available to all users**" (contrast with the custom
  credential flow).
- `https://docs.box.com/en/box-ai/admins/configuring-box-ai` — observed
  2026-07-22. Backs: Box AI section **Settings** tab, **Enable Box AI**
  button, **Box AI APIs** configure options (**Enable for all** /
  **Disable for all**), the AI-Units purchase requirement for Box AI
  APIs on Business / Business Plus / Enterprise plans, Box AI Product
  Addendum / Review Agreement Offline terms gates.
- `https://docs.box.com/en/box-ai/understanding-ai-units-in-box`
  ("Understanding AI Units In Box") — observed 2026-07-22. Backs: the
  Box AI Units purchase path ("To purchase more: Contact your Box
  account manager or reach out directly to the sales team at
  sales@box.com for baseline pricing tiers and subscription blocks")
  and the AI-Units table listing Business and Business Plus included
  units as "Available for purchase".
- `https://docs.box.com/en/box-admin-tools/box-admin-reference/enterprise-settings-content-sharing-tab`
  (`#box-doc-gen`) — observed 2026-07-22. Backs: **Box Doc Gen
  Permissions** options and disabled-by-default state.
- `https://docs.box.com/en/box-admin-tools/how-to-guides-for-admins/understanding-requests-to-authorize-or-allow-applications`
  (`#reviewing-scopes`) — observed 2026-07-22. Backs: generic
  scope-review guidance the "Access scopes" step links to; scopes-
  vs-user-permissions examples.
- `https://docs.box.com/en/box-admin-tools/reporting-and-insights/mcp-server-activity-report`
  — observed 2026-07-22. Backs: MCP Server Activity report columns and
  filters (post-setup administration; out of Setup Guide scope).
- `https://developer.box.com/guides/box-mcp/` — observed 2026-07-22.
  Backs (API-level): "Box hosts MCP at https://mcp.box.com. You connect
  your client or agent platform to this URL; you do not run Box's MCP
  server yourself for the standard integration", Integration
  Credentials described as "OAuth client ID and client secret",
  self-hosted server deprecation.
- `https://developer.box.com/guides/box-mcp/setup/` ("Set up the MCP
  server") — observed 2026-07-22. Also reachable as
  `https://developer.box.com/guides/box-mcp/remote/`, which the live
  protected-resource metadata names as the endpoint's official
  `resource_documentation` and which now returns HTTP 308 permanently
  redirecting here (redirect observed live this run; in the prior run
  the two URLs served distinct pages). Backs (API-level only): endpoint
  `https://mcp.box.com`, MCP name `box-remote-mcp`, OAuth authorization
  URL `https://account.box.com/api/oauth2/authorize` and token URL
  `https://api.box.com/oauth2/token`, scope strings `root_readwrite` /
  `ai.readwrite` / `docgen.readwrite`, Enterprise Advanced gate on
  `docgen.readwrite`, "Scopes define the maximum set of actions...".
  **Conflict**: this page's Admin Console walkthrough (search "Box MCP
  server" → hover → **Configure** → **Additional Configuration** → **+
  Add Integration Credentials** → name + **Save** → expand → copy →
  **Redirect URI** → **Access Scopes**) contradicts docs.box.com on
  tile name, gesture, section name, and step order; not used for any
  console-UI fact.
- `https://support.box.com/hc/en-us/articles/43847256139923` ("Managing
  Box MCP Servers") — observed 2026-07-22. Backs: no Dynamic Client
  Registration (server fact backing manual client registration), OAuth
  endpoints "same as for the Box Platform and also exposed according to
  RFC 8414". **Conflict**: its Box AI enablement labels ("AI API and
  Official Box Integrations is enabled for all users") don't match
  docs.box.com's current **Box AI APIs** settings; docs.box.com
  preferred.
- `https://support.box.com/hc/en-us/articles/30900136778259` ("Adding
  Integration Credentials for Customer-Instance Integrations") —
  observed 2026-07-22. Backs: "Box Admins and Co-Admins can add
  Integration Credentials", Box MCP Server in the supported-apps list,
  Platform > Platform Apps side effect (console-UI fact from a
  non-docs.box.com source — flagged; post-setup administration),
  default-name behavior (flagged as unconfirmed). **Conflict**: its
  hover-then-**Configure** / **Additional Configuration** flow
  contradicts docs.box.com; not used for the walkthrough.
- Pulse mirror `com.pulsemcp.mirror/box` version 0.0.1 (private tenant
  export snapshot 2026-07-18T04:42:42Z) — backs: remote URL and
  `streamable-http` transport.
- `https://mcp.box.com` +
  `https://mcp.box.com/.well-known/oauth-protected-resource` — direct
  endpoint observation 2026-07-22 (this run). Backs: 401/Bearer behavior
  (`WWW-Authenticate: Bearer ... resource_metadata=".../.well-known/oauth-protected-resource"`),
  resource metadata (resource `https://mcp.box.com/`, authorization
  server `https://api.box.com/`, bearer header method, resource name
  "Box Model Context Protocol Server", `resource_documentation`
  `https://developer.box.com/guides/box-mcp/remote/`,
  `resource_policy_uri` / `resource_tos_uri`
  `https://www.box.com/legal/termsofservice`).
