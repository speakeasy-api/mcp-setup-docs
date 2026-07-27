---
setup_version: 1
---

# Box

You need a Box Admin or Co-Admin account for the enterprise you are
connecting — Box Admins and Co-Admins are the roles that can add
Integration Credentials in the Admin Console. Everything below happens
in the **Box Admin Console**, which you open by signing in at
[app.box.com/master](https://app.box.com/master).

Box hosts the MCP Server itself at `https://mcp.box.com`; you point the
Speakeasy AI Control Plane at that address rather than installing or
running anything yourself. The MCP Server is available on all Box plans,
but you can only use MCP tools that are included in your current plan:
AI tools require a Box AI-enabled plan, and the Doc Gen scope requires
an Enterprise Advanced license. For the full plan and licensing picture,
see [Tools are gated by plan and licensing](#plan-gated-tools).

When people connect from the Speakeasy AI Control Plane, each user signs
in with their own Box account. To allow that, a Box admin creates one
set of **Integration Credentials** on the **Custom Box MCP Server**
integration in the Admin Console; Box generates the **Client ID** and
**Client Secret** the Speakeasy AI Control Plane needs. The steps below
create the credential entry, point it at the Speakeasy AI Control Plane,
and copy out its values.

One decision to make before you start: if your users will call the Box
AI tools or the Doc Gen tools, complete
[Enable the Box AI API](#enable-box-ai-api) or
[Enable Box Doc Gen](#enable-doc-gen) first, then come back here. The AI
and Doc Gen scopes only appear in the credential entry once those
features are enabled for your enterprise.

### Sign in to the Box Admin Console {#open-admin-console}

Sign in to the **Box Admin Console** at
[app.box.com/master](https://app.box.com/master) with your Box Admin or
Co-Admin account.

<!-- screenshot-exception: a sign-in page with no MCP-specific state; the Admin Console landing view is captured in the next step -->

### Find Custom Box MCP Server under Integrations {#find-custom-box-mcp-server}

1. In the left sidebar of the Admin Console, select **Integrations**.
2. Find **Custom Box MCP Server**, either by using the **MCP Category**
   filter or by typing `Custom Box MCP Server` into the search bar at
   the top of the page.

Two look-alikes on this page do not apply here: the **Box MCP Server**
tab (enterprise tool governance, used later in
[Restrict which tools are exposed](#manage-tool-access)) and named
partner tiles such as **Claude**. The tile you want is
**Custom Box MCP Server** — it holds credentials for custom clients like
the Speakeasy AI Control Plane.

<!-- screenshot: the Integrations page with the MCP Category filter applied (or "Custom Box MCP Server" in the search bar) and the Custom Box MCP Server tile visible in the results -->

### Add Integration Credentials {#add-integration-credentials}

Two things to know before you create credentials: use of the credentials
you are about to create is metered and billed by Box (see
[Custom-credential use is metered and billed](#metered-api-calls)), and
Box's documentation does not describe what happens to an unsaved entry
if you leave the page — plan to finish this step through
[Save the credential entry](#save-credentials) in one sitting.

1. Select the **Custom Box MCP Server** tile you found in the previous
   step. This opens the integration's own page, where the
   **Configuration** view lives.
2. Go to **Configuration**.
3. Select **Add Integration Credentials** to generate new credentials.
   Box generates the entry's **Client ID** and **Client Secret** for
   you; the next steps configure the entry and copy those values out.

<!-- screenshot: the Custom Box MCP Server Configuration view with the Add Integration Credentials control visible, and the new credential entry it creates -->

### Set the Redirect URI {#set-redirect-uri}

In **Redirect URIs**, change the existing Box redirect URI value(s) to
`{{ gram.oauth.callback_url }}`, the callback URL from the Speakeasy AI
Control Plane.

Do not use the `http://localhost:PORT/callback` example that appears in
some Box documentation — that value is specific to a different client
(Claude Code), not the Speakeasy AI Control Plane.

<!-- screenshot: the credential entry's Redirect URIs field containing the pasted Speakeasy AI Control Plane callback URL -->

### Copy the Client ID and Client Secret {#copy-client-credentials}

Copy both values now, before you leave this page, and store the Client
Secret in your password manager: Box's documentation does not say
whether the Client Secret stays viewable when you come back later.

1. Copy the **Client ID** into the Speakeasy AI Control Plane's Client
   ID field.
2. Copy the **Client Secret** into the Speakeasy AI Control Plane's
   Client Secret field.

If you return later and cannot view the Client Secret, generate a fresh
credential set: repeat
[Add Integration Credentials](#add-integration-credentials),
[Set the Redirect URI](#set-redirect-uri), and
[Check the Access scopes](#check-access-scopes), click **Save** in
[Save the credential entry](#save-credentials), and paste the new values
into the Speakeasy AI Control Plane instead.

<!-- screenshot-exception: the credential values are plain text fields whose appearance adds nothing beyond the copied values -->

### Check the Access scopes {#check-access-scopes}

In the **Access scopes** section of the credential entry, confirm the
selected scopes cover the tool areas your users need, and select any
needed scope that is not already checked. A scope defines
the maximum set of actions the connection can perform; it never widens
what an individual user can already see or edit in Box (see
[Scopes cap actions; user permissions still govern](#scopes-vs-permissions)).

Box's documentation does not list the individual checkbox labels in this
section, so match the options you see to the three tool areas the server
supports: content tools (scope string `root_readwrite`), Box AI tools
(`ai.readwrite`), and Doc Gen tools (`docgen.readwrite`, which requires
an Enterprise Advanced license).

If an AI or Doc Gen option is missing, that feature is not yet enabled
for your enterprise — the scope stays hidden until it is. Do not leave
this unsaved entry to go enable it. Instead, click **Save**
([Save the credential entry](#save-credentials)), enable the feature in
[Enable the Box AI API](#enable-box-ai-api) or
[Enable Box Doc Gen](#enable-doc-gen), then re-open the credential
entry, select the newly visible scope, and click **Save** again. If the
re-opened entry does not let you change its scopes, generate a fresh
credential set instead and reconfigure it — the same recovery described
in [Copy the Client ID and Client Secret](#copy-client-credentials).

<!-- screenshot: the credential entry's Access scopes section with its checkboxes visible — capture the exact labels, since the documentation does not name them -->

### Save the credential entry {#save-credentials}

1. Click **Save**. The credential entry does not save automatically —
   this click is what stores the Redirect URI and scope selections you
   made above.
2. Re-open the credential entry.
3. Confirm the **Redirect URIs** value you pasted persisted. If the
   value is missing, repeat [Set the Redirect URI](#set-redirect-uri)
   and click **Save** again.

That completes the credential setup. When people connect from the
Speakeasy AI Control Plane, each user signs in with their own Box
account and approves access; what they can reach is capped by the
scopes you selected and further limited by their own Box permissions. The remaining
three steps are only needed for AI tools, Doc Gen tools, or tool-level
governance.

<!-- screenshot-exception: a standard button click with no unique state beyond the views captured in the prior steps -->

### Enable the Box AI API (AI tools only) {#enable-box-ai-api}

Follow this step only if your users will call the Box AI tools
(`ai_qa_*` and `ai_extract_*`) — enabling it is also what makes the AI
scope appear in [Check the Access scopes](#check-access-scopes).

Two notes before you click anything below. First-time enablement may
require you to review and accept the Box AI Product Addendum for your
organization before Box AI can be enabled; if a **Review Agreement
Offline** message appears instead, your organization has specific
restrictions — contact the Box Account Team. And on Business, Business
Plus, and Enterprise plans, toggling **Enable Box AI** covers only Box
AI for Documents and Notes; the **Box AI APIs** setting the MCP AI tools
depend on is a paid add-on on those plans, available upon purchase of
Box AI Units. To purchase Box AI Units, contact your Box account
manager or the Box sales team at `sales@box.com`.

1. In the Admin Console, go to the **Box AI** section.
2. Open the **Settings** tab.
3. If your organization has not fully enabled Box AI, click **Enable Box
   AI** to do so for all services.
4. For the **Box AI APIs** setting, click **configure**.
5. Select **Enable for all**.

Once Box AI is enabled, the AI scope appears in the credential entry's
**Access scopes** section — select it in
[Check the Access scopes](#check-access-scopes). If you had already
saved the credential entry, re-open it, select the AI scope, and click
**Save** again.

<!-- screenshot: the Box AI > Settings tab showing the Box AI APIs configuration set to Enable for all -->

### Enable Box Doc Gen (Doc Gen tools only) {#enable-doc-gen}

Follow this step only if your users will call the Doc Gen tools —
enabling it is also what makes the Doc Gen scope appear in
[Check the Access scopes](#check-access-scopes). The Doc Gen scope
requires an Enterprise Advanced license (see
[Tools are gated by plan and licensing](#plan-gated-tools)).

1. In the Admin Console, go to **Enterprise Settings**.
2. Open the **Content and Sharing** tab.
3. Scroll to the **Box Doc Gen** section.
4. Under **Box Doc Gen Permissions**, click **Configure**.
5. Select who gets access: **Enable for all managed users**, **Enable
   for select users and groups**, or **Enable for everyone except select
   users and groups**. The default is **Disable for all managed users
   (default)**, so Doc Gen stays off until you change it.

Once Doc Gen is enabled, the Doc Gen scope appears in the credential
entry's **Access scopes** section — select it in
[Check the Access scopes](#check-access-scopes). If you had already
saved the credential entry, re-open it, select the Doc Gen scope, and
click **Save** again.

<!-- screenshot: Enterprise Settings > Content and Sharing scrolled to the Box Doc Gen section with its permissions options visible -->

### Restrict which tools are exposed (optional) {#manage-tool-access}

Follow this step if you need to turn on the off-by-default
external-sharing tools, or want tools restricted before rollout. Two
things to know before changing anything here: tool enablement applies to
the entire enterprise — per-client, user-level, or group-level controls
are not supported — and category-level changes take effect immediately.

1. Open the **Admin Console**.
2. In the left sidebar, select **Integrations**.
3. Select the **Box MCP Server** tab. This opens a table of tool
   categories — for example, **Files and Folders**, **Search**, **Box
   Hubs** — with an **Enablement** control and a **Configure** button
   on each row.

Set access one of two ways:

- **A whole category at once:** use its **Enablement** control, which
  offers exactly four options: **Disable all tools**, **Enable
  read-only tools**, **Enable read & write tools**, and **Custom
  configuration**.
- **Individual tools:** click the category's **Configure** button. This
  opens a configuration window with the category's tools grouped under
  **Read only MCP tools** and **Write MCP tools**, with a toggle for
  each tool. Click **Save**; a confirmation message appears.

The per-tool toggles and the **Enablement** selection stay in sync: only
read tools on shows **Enable read-only tools**, all on shows **Enable
read & write tools**, all off shows **Disable all tools**, and any other
mix shows **Custom configuration**. You can also jump straight to a
category: enter a tool keyword in the search bar at the top of any Admin
Console page and select a result — the Admin Console navigates to the
**Box MCP Server** page and opens the relevant category configuration.
Four external-sharing tools are off by default and must be deliberately
enabled here before agents can use them (see
[External-sharing tools are off by default](#sharing-tools-off-by-default)).

A disabled tool is removed from the tool list the server returns to
clients. If a tool is disabled after a client already discovered it,
calls to it fail with "Tool has been disabled by the enterprise admin.
Contact your enterprise admin for more information." Some clients cache
the tool list; after you enable or disable a tool, close and reopen the
client so it fetches an updated list (refreshing the tool list, starting
a new chat, or disconnecting and reconnecting also work). Even if an
agent attempts to call a disabled tool, the call fails — there is no
security risk.

<!-- screenshot: the Box MCP Server tab showing the category table with an Enablement dropdown open, its four options visible -->

## Gotchas

### Custom-credential use is metered and billed {#metered-api-calls}

The MCP Server is available on all Box plans, and API calls are free
only when both conditions hold: the app is published in the **Box
Integrations Center**, and users log in with their own Box accounts.
API calls are charged in other cases — explicitly including use
of additional integration credentials from the Box MCP Server, which is
exactly the setup this guide creates. Metering: any tool invocation is 1
API call; an AI tool invocation is 1 API call plus AI Units (based on
model tier and document length); a Doc Gen tool invocation is 1 API call
plus a cost per document generated beyond the included allowance; a Sign
request is 1 API call plus Sign usage (per request; plan limits apply);
and session initialization and listing tools each cost 1 API call, once
per session.

### Tools are gated by plan and licensing {#plan-gated-tools}

You can only use MCP tools that are included in your current Box plan.
AI tools require a Box AI-enabled plan — and on Business, Business Plus,
and Enterprise plans, Box AI APIs are available upon purchase of Box AI
Units. DocGen and Sign depend on plan availability, and the Doc Gen
scope (`docgen.readwrite`) requires an Enterprise Advanced license. Tool
categories such as Hubs or AI might not be available for every
enterprise — check your subscription for details.

### AI and Doc Gen scopes and tools are hidden until enabled {#ai-docgen-tools-hidden-until-enabled}

If you do not see AI or Doc Gen scopes or tools while setting up the MCP
Server, those features are not yet enabled for your enterprise. Enable
them in the Admin Console — see
[Enable the Box AI API](#enable-box-ai-api) and
[Enable Box Doc Gen](#enable-doc-gen) — then select the newly visible
scopes in [Check the Access scopes](#check-access-scopes); if a
credential entry is open and unsaved when you notice, click **Save**
before you leave it. Box Doc Gen Permissions default to **Disable for
all managed users**.

### Scopes cap actions; user permissions still govern {#scopes-vs-permissions}

Scopes define the maximum set of actions. Users can only access content
they already have permission to view or edit in Box — all actions follow
your organization's existing permissions, sharing settings, and security
policies. Granting a scope never widens what an individual user can see
or edit.

### Externally shared items block many write tools {#external-sharing-restrictions}

Fifteen write tools — `copy_file`, `copy_folder`, `create_folder`,
`move_file`, `move_folder`, `set_file_metadata`, `set_folder_metadata`,
`update_file_properties`, `update_folder_properties`, `upload_file`,
`upload_file_version`, `create_file_comment`, `add_items_to_hub`,
`copy_hub`, and `update_hub` — only work on items that meet all of the
following: no external collaborators on the item itself, no shared link
on the item itself, and no external collaborators or shared links on any
parent folder, up to the root.

### External-sharing tools are off by default {#sharing-tools-off-by-default}

Four tools that can create open shared links or add collaborators from
outside your organization — `add_file_shared_link`,
`add_folder_shared_link`, `create_collaboration`, and
`update_collaboration` — are off by default. An admin must deliberately
enable them (see
[Restrict which tools are exposed](#manage-tool-access)) before agents
can use them.

### Upload/download URL tools need an agentic client {#url-tools-agentic-only}

`get_upload_url` and `get_download_url` require the AI agent to make a
direct network request to transfer the file. Declarative agents can't
make these requests, so these tools work only in agentic
(code-executing) environments. Some clients also require allowlisting
Box domains first — the default list outside Box Zones is
`upload.box.com`, `upload.app.box.com`, `upload.ent.box.com`,
`dl.boxcloud.com`, and `public.boxcloud.com`, with wildcard alternatives
`upload.*.box.com`, `*.boxcloud.com`, and `*.box.com`; Box Zones
customers need their zone-specific list.

### File preview tool requires MCP Apps support {#file-preview-requires-mcp-apps}

The file preview tool (`get_file_preview`) only works with clients that
support MCP apps. In a client without MCP Apps support, the call
reports a UI widget, but that widget never appears.

### Shield classification labels ride the metadata tools {#shield-classification-via-metadata}

Retrieving and applying classification labels to files and folders is
handled through the existing metadata tools, and creating new
classifications is handled through the existing create metadata template
tool. Applying access policies to classification labels is not supported
through MCP and needs to be done in the Admin Console.
